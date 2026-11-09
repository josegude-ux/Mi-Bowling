/* MI BOWLING I22 · WebKit mobile emulation and Chromium desktop,
 * private HTTPS loopback only; file labels A/B/C are synthetic.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A,clone}=require('./i22-uncertainty-fixture.cjs');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i22-'));
let server;
const upload=(name,x)=>({name,mimeType:'application/json',
 buffer:Buffer.from(typeof x==='string'?x:JSON.stringify(x))});
async function start(){
 const key=path.join(TMP,'key.pem'),cert=path.join(TMP,'cert.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},
  (req,res)=>{
   if(req.url==='/__blank'){
    res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
    res.end('<!doctype html><title>I22</title>');return;
   }
   const file=path.resolve(ROOT,decodeURIComponent(
    new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
   if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||
    !fs.statSync(file).isFile()){res.writeHead(404);res.end('not found');return}
   res.writeHead(200,{'Content-Type':file.endsWith('.js')?
    'application/javascript':'text/html','Cache-Control':'no-store',
    'Referrer-Policy':'no-referrer'});res.end(fs.readFileSync(file));
  });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function run(engine,base,label,f){
 const browser=await engine.launch(label==='chromium'?{
  executablePath:cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),
  headless:true,args:['--no-sandbox']}:{headless:true});
 const ctx=await browser.newContext({locale:'es-ES',ignoreHTTPSErrors:true,
  acceptDownloads:true,viewport:{width:label==='webkit'?390:1280,height:844}});
 await ctx.route('**/*',route=>route.request().url().startsWith(base+'/')?
  route.continue():route.abort());
 try{
  const page=await ctx.newPage();
  await page.goto(base+'/__blank');
  await page.evaluate(()=>localStorage.setItem('__I22_PROTECTED__','untouched'));
  await page.goto(base+'/lab/integracion-main-auth-i22.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I22-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('#i22-download').isDisabled(),true);
  const wait=async phrase=>{
   await page.waitForFunction(p=>(document.querySelector('#i22-status')
    ?.textContent||'').includes(p),phrase,{timeout:60000});
   return page.locator('#i22-status').textContent();
  };
  async function source(d){
   await page.locator('#i22-source').setInputFiles(upload('case.doubt21',d));
  }
  async function offers(list){
   for(let i=0;i<3;i++){
    const slot=['A','B','C'][i],item=list[i];
    await page.locator('#i22-file-'+slot).setInputFiles(
     item?upload(slot+'.doubt21',item.caseFile):[]);
    await page.locator('#i22-sha-'+slot).fill(item?.claimedDigest||'');
    await page.locator('#i22-origin-'+slot).selectOption(item?.origin||'same-file');
   }
  }
  await source(f.baseline);await offers(f.duplicates);
  await page.locator('#i22-build').click();await wait('HOLD-DUPLICATE-CLAIMS');
  assert.equal(await page.locator('#i22-matrix tr').count(),8);
  assert.match(await page.locator('#i22-matrix').innerText(),/unproven/);
  assert.equal(await page.locator('#i22-request').isDisabled(),false);
  await page.locator('#i22-request').click();await wait('SOLICITUD DE REVISIÓN EXTERNA ANOTADA, NO ENVIADA');
  assert.equal(await page.locator('#i22-request').isDisabled(),true);
  const [download]=await Promise.all([
   page.waitForEvent('download',{timeout:20000}),
   page.locator('#i22-download').click()
  ]);
  assert.match(download.suggestedFilename(),/MI-BOWLING-I22-[a-f0-9]{12}\.uncert22/);
  const filename=path.join(TMP,label+'.uncert22');
  await download.saveAs(filename);
  const packet=JSON.parse(fs.readFileSync(filename,'utf8'));
  assert.equal(packet.status,'outside-review-recorded-not-sent');
  assert.equal(packet.authority,'none');
  assert.equal(packet.operationallyApproved,false);
  assert.equal(packet.custodianIndependenceProven,false);
  assert.equal(packet.externalReviewContacted,false);
  await page.locator('#i22-saved').setInputFiles(upload('saved.uncert22',packet));
  await page.locator('#i22-saved-digest').fill(packet.digest);
  await page.locator('#i22-check').click();
  assert.match(await wait('INTEGRIDAD INTERNA COMPROBADA'),/Custodia\/independencia NO demostradas/);
  const forged=clone(packet);forged.custodianIndependenceProven=true;
  await page.locator('#i22-saved').setInputFiles(upload('forged.uncert22',forged));
  await page.locator('#i22-check').click();await wait('I22 BLOQUEADO');
  await offers(f.competing);
  assert.equal(await page.locator('#i22-download').isDisabled(),true);
  await page.locator('#i22-build').click();await wait('QUARANTINE-PARALLEL-FORKS');
  // A complete change of source and all supplied digests is internally coherent.
  await source(f.replacement);
  await offers([
   f.offer('A',f.replacement),
   f.offer('B',f.replacement,f.replacement.digest,'claimed-separate'),
   f.offer('C',f.replacement)
  ]);
  await page.locator('#i22-build').click();await wait('HOLD-DUPLICATE-CLAIMS');
  assert.match(await page.locator('#i22-status').textContent(),/No se acredita custodia humana/);
  await page.locator('#i22-source-digest').fill(f.baseline.digest);
  assert.equal(await page.locator('#i22-download').isDisabled(),true);
  await page.locator('#i22-build').click();await wait('I22 BLOQUEADO');
  await page.locator('#i22-source-digest').fill('');
  await source(f.baseline);
  await offers([null,null,null]);
  await page.locator('#i22-build').click();await wait('HOLD-INSUFFICIENT-CLAIMS');
  await page.locator('#i22-request').click();await wait('SOLICITUD DE REVISIÓN EXTERNA ANOTADA, NO ENVIADA');
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I22_PROTECTED__')),'untouched');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(x=>x.length):0),0);
  console.log('PASS I22 '+label+' · uncertainty table distinguishes SHA from independent custody; duplicate and conflicting A/B/C retained; coherent joint replacement unproven; fake approvals blocked; local export only; no IDB/outside network');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 const f=await fixture(A),base=await start();
 try{await run(webkit,base,'webkit',f);await run(chromium,base,'chromium',f)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
