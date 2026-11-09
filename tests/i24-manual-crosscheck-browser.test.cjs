/* MI BOWLING I24 · WebKit/Chromium only on private HTTPS localhost.
 * A/B/C all fictitious. No outside requests, account data or app writes.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),os=require('node:os'),https=require('node:https'),
 cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A,clone}=require('./i24-manual-crosscheck-fixture.cjs');
const ROOT=path.resolve(__dirname,'..');
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i24-'));
let server;
const upload=(name,value)=>({name,mimeType:'application/json',
 buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
async function start(){
 const key=path.join(TMP,'key.pem'),cert=path.join(TMP,'cert.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},
  (req,res)=>{
   if(req.url==='/__blank'){
    res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
    res.end('<!doctype html><title>I24</title>');return;
   }
   const filename=path.resolve(ROOT,decodeURIComponent(
    new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
   if(!filename.startsWith(ROOT+path.sep)||!fs.existsSync(filename)||
    !fs.statSync(filename).isFile()){res.writeHead(404);res.end('not found');return}
   res.writeHead(200,{'Content-Type':filename.endsWith('.js')?
    'application/javascript':'text/html','Cache-Control':'no-store',
    'Referrer-Policy':'no-referrer'});
   res.end(fs.readFileSync(filename));
  });
 await new Promise((ok,no)=>{
  server.once('error',no);server.listen(0,'127.0.0.1',ok);
 });
 return 'https://127.0.0.1:'+server.address().port;
}
async function run(engine,base,label,f){
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
  await page.evaluate(()=>localStorage.setItem('__I24_PROTECTED__','untouched'));
  await page.goto(base+'/lab/integracion-main-auth-i24.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I24-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('#i24-note').isDisabled(),true);
  assert.equal(await page.locator('#i24-export').isDisabled(),true);
  const wait=async term=>{
   await page.waitForFunction(p=>(document.querySelector('#i24-status')
    ?.textContent||'').includes(p),term,{timeout:65000});
   return page.locator('#i24-status').textContent();
  };
  const source=async obj=>page.locator('#i24-source').setInputFiles(
   upload('source.gate23',obj));
  await source(f.source);
  assert.equal(await page.locator('#i24-axes .axis').count(),6);
  for(let i=0;i<6;i++){
   await page.locator('#i24-a-'+i).selectOption('claimed-match');
   await page.locator('#i24-origin-'+i).selectOption('claimed-independent');
  }
  await page.locator('#i24-b-0').selectOption('claimed-conflict');
  await page.locator('#i24-ref-0').fill(f.source.digest);
  await page.locator('#i24-build').click();
  await wait('QUARANTINE-MANUAL-DISAGREEMENT');
  assert.equal(await page.locator('#i24-matrix tr').count(),6);
  assert.match(await page.locator('#i24-matrix').innerText(),/not-verified-outside-lab/);
  assert.match(await page.locator('#i24-status').textContent(),/acreditados externamente 0\/6/);
  await page.locator('#i24-note').click();
  await wait('REVISIÓN EXTERNA ANOTADA LOCALMENTE, NO ENVIADA');
  assert.equal(await page.locator('#i24-note').isDisabled(),true);
  const [download]=await Promise.all([
   page.waitForEvent('download',{timeout:20000}),
   page.locator('#i24-export').click()
  ]);
  assert.match(download.suggestedFilename(),/MI-BOWLING-I24-[a-f0-9]{12}\.review24/);
  const savedPath=path.join(TMP,label+'.review24');await download.saveAs(savedPath);
  const packet=JSON.parse(fs.readFileSync(savedPath,'utf8'));
  assert.equal(packet.status,'outside-review-noted-not-sent');
  assert.equal(packet.operationalApproval,false);
  assert.equal(packet.requirements.length,6);
  assert.ok(packet.requirements.every(x=>x.satisfied===false));
  assert.equal(packet.outsideReviewContacted,false);
  await page.locator('#i24-saved').setInputFiles(upload('saved.review24',packet));
  await page.locator('#i24-saved-pin').fill(packet.digest);
  await page.locator('#i24-check').click();
  assert.match(await wait('INTEGRIDAD INTERNA COMPROBADA'),/sustitución conjunta no descartada/);
  const fake=clone(packet);fake.requirements[0].satisfied=true;
  await page.locator('#i24-saved').setInputFiles(upload('fake.review24',fake));
  await page.locator('#i24-check').click();await wait('I24 BLOQUEADO');
  // Replace entire source and reference: internal consistency does not prove custody.
  await source(f.replaced);
  assert.equal(await page.locator('#i24-export').isDisabled(),true);
  await page.locator('#i24-build').click();await wait('QUARANTINE-MANUAL-DISAGREEMENT');
  assert.match(await page.locator('#i24-status').textContent(),/acreditados externamente 0\/6/);
  await page.locator('#i24-source-pin').fill(f.source.digest);
  await page.locator('#i24-build').click();await wait('I24 BLOQUEADO');
  await page.locator('#i24-source-pin').fill('');
  await source(f.source);
  for(let i=0;i<6;i++){
   await page.locator('#i24-a-'+i).selectOption('none');
   await page.locator('#i24-b-'+i).selectOption('none');
  }
  await page.locator('#i24-build').click();await wait('HOLD-NO-INDEPENDENT-PROOF');
  await page.locator('#i24-a-3').selectOption('claimed-match');
  await page.locator('#i24-ref-3').fill('not-a-SHA');
  await page.locator('#i24-build').click();await wait('QUARANTINE-INVALID-CLAIMS');
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I24_PROTECTED__')),
   'untouched');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(x=>x.length):0),0);
  console.log('PASS I24 '+label+' · 6 manual requirements, untrusted A/B/C conflict/quarantine, 0 external proofs, joint replacement unproven, explicit export, corrupted claims preserved, no IDB/outside network');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 const f=await fixture(A),base=await start();
 try{await run(webkit,base,'webkit',f);await run(chromium,base,'chromium',f)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
