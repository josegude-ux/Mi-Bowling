/* MI BOWLING I23 · HTTPS localhost WebKit/Chromium synthetic A/B/C.
 * No external network, no application storage, no operational approval.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A,clone}=require('./i23-external-evidence-fixture.cjs');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i23-'));
let server;
const upload=(name,value)=>({name,mimeType:'application/json',
 buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
async function start(){
 const key=path.join(TMP,'key.pem'),crt=path.join(TMP,'cert.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',crt,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(crt)},
  (req,res)=>{
   if(req.url==='/__blank'){
    res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
    res.end('<!doctype html><title>I23</title>');return;
   }
   const file=path.resolve(ROOT,decodeURIComponent(
    new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
   if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||
    !fs.statSync(file).isFile()){res.writeHead(404);res.end('not found');return}
   res.writeHead(200,{'Content-Type':file.endsWith('.js')?
    'application/javascript':'text/html','Cache-Control':'no-store',
    'Referrer-Policy':'no-referrer'});res.end(fs.readFileSync(file));
  });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);server.listen(0,'127.0.0.1',resolve);
 });
 return 'https://127.0.0.1:'+server.address().port;
}
async function run(engine,base,label,fx){
 const browser=await engine.launch(label==='chromium'?{
  executablePath:cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),
  headless:true,args:['--no-sandbox']}:{headless:true});
 const ctx=await browser.newContext({ignoreHTTPSErrors:true,locale:'es-ES',
  acceptDownloads:true,viewport:{width:label==='webkit'?390:1280,height:844}});
 await ctx.route('**/*',route=>route.request().url().startsWith(base+'/')?
  route.continue():route.abort());
 try{
  const page=await ctx.newPage();
  await page.goto(base+'/__blank');
  await page.evaluate(()=>localStorage.setItem('__I23_PROTECTED__','unchanged'));
  await page.goto(base+'/lab/integracion-main-auth-i23.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I23-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('#i23-review').isDisabled(),true);
  assert.equal(await page.locator('#i23-download').isDisabled(),true);
  const wait=async phrase=>{
   await page.waitForFunction(q=>(document.querySelector('#i23-status')
    ?.textContent||'').includes(q),phrase,{timeout:65000});
   return page.locator('#i23-status').textContent();
  };
  const source=async packet=>page.locator('#i23-base').setInputFiles(
   upload('synthetic.uncert22',packet));
  async function records(list){
   for(let i=0;i<3;i++){
    const slot=['A','B','C'][i],r=list[i];
    await page.locator('#i23-file-'+slot).setInputFiles(
     r?upload(slot+'.uncert22',r.packet):[]);
    await page.locator('#i23-sha-'+slot).fill(r?.claim.packetDigest||'');
    await page.locator('#i23-group-'+slot).fill(
     r?.claim.retentionGroup||('group-'+slot.toLowerCase()));
    await page.locator('#i23-origin-'+slot).selectOption(
     r?.claim.origin||'unknown');
    await page.locator('#i23-before-'+slot).setChecked(
     r?.claim.preIncidentClaimed||false);
   }
  }
  await source(fx.base);await records(fx.matching);
  await page.locator('#i23-build').click();
  await wait('HOLD-CORRELATED-REFERENCE-CLAIMS');
  assert.equal(await page.locator('#i23-requirements tr').count(),6);
  assert.match(await page.locator('#i23-requirements').innerText(),
   /not-verifiable-in-lab/);
  assert.match(await page.locator('#i23-status').textContent(),
   /Requisitos externos acreditados: 0\/6/);
  assert.equal(await page.locator('#i23-download').isDisabled(),false);
  await page.locator('#i23-review').click();
  await wait('REVISIÓN EXTERNA ANOTADA LOCALMENTE, NO ENVIADA');
  assert.equal(await page.locator('#i23-review').isDisabled(),true);
  const [download]=await Promise.all([
   page.waitForEvent('download',{timeout:20000}),
   page.locator('#i23-download').click()
  ]);
  assert.match(download.suggestedFilename(),/MI-BOWLING-I23-[a-f0-9]{12}\.gate23/);
  const filename=path.join(TMP,label+'.gate23');
  await download.saveAs(filename);
  const saved=JSON.parse(fs.readFileSync(filename,'utf8'));
  assert.equal(saved.authority,'none');
  assert.equal(saved.operationalApproval,false);
  assert.equal(saved.outsideReviewContacted,false);
  assert.equal(saved.status,'manual-outside-review-recorded-not-sent');
  assert.equal(saved.requirements.length,6);
  await page.locator('#i23-saved').setInputFiles(upload('saved.gate23',saved));
  await page.locator('#i23-saved-pin').fill(saved.digest);
  await page.locator('#i23-check').click();
  assert.match(await wait('ESTRUCTURA INTERNA COMPROBADA'),
   /Sustitución conjunta NO descartada/);
  const fake=clone(saved);fake.humanIdentityProven=true;
  await page.locator('#i23-saved').setInputFiles(upload('forged.gate23',fake));
  await page.locator('#i23-check').click();await wait('I23 BLOQUEADO');
  // All files and all self-generated references can be replaced together.
  await source(fx.replaced);
  await records([
   fx.record('A',fx.replaced),
   fx.record('B',fx.replaced),
   fx.record('C',fx.replaced)
  ]);
  await page.locator('#i23-build').click();
  await wait('HOLD-CORRELATED-REFERENCE-CLAIMS');
  assert.match(await page.locator('#i23-status').textContent(),
   /Requisitos externos acreditados: 0\/6/);
  await page.locator('#i23-base-pin').fill(fx.base.digest);
  assert.equal(await page.locator('#i23-download').isDisabled(),true);
  await page.locator('#i23-build').click();await wait('I23 BLOQUEADO');
  await page.locator('#i23-base-pin').fill('');
  await source(fx.base);await records(fx.competing);
  await page.locator('#i23-build').click();
  await wait('QUARANTINE-COMPETING-VERSIONS');
  const invalid=clone(fx.matching);
  invalid[1].claim.packetDigest='f'.repeat(64);
  await records(invalid);
  await page.locator('#i23-build').click();
  await wait('QUARANTINE-INVALID-CLAIM');
  await records([null,null,null]);
  await page.locator('#i23-build').click();await wait('HOLD-NO-REFERENCE');
  await page.locator('#i23-review').click();
  await wait('REVISIÓN EXTERNA ANOTADA LOCALMENTE, NO ENVIADA');
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I23_PROTECTED__')),
   'unchanged');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(x=>x.length):0),0);
  console.log('PASS I23 '+label+' · 0/6 external proofs, false offline claims retained, coherent joint replacement still blocked, competing/invalid versions quarantined, explicit export, fake authority rejected, no IDB/outside network');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 const fx=await fixture(A),base=await start();
 try{await run(webkit,base,'webkit',fx);await run(chromium,base,'chromium',fx)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
