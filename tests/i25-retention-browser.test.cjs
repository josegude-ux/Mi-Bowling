/* MI BOWLING I25 · HTTPS localhost WebKit + Chromium, A/B/C fictional only.
 * No external network, IndexedDB writes, app data, services or approvals.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A,clone}=require('./i25-retention-fixture.cjs');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i25-'));
let server;
const upload=(name,value)=>({name,mimeType:'application/json',
 buffer:Buffer.from(value,'utf8')});
async function start(){
 const key=path.join(TMP,'key.pem'),cert=path.join(TMP,'crt.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
  if(req.url==='/__blank'){res.writeHead(200,{'Content-Type':'text/html'});
   res.end('<!doctype html><title>I25</title>');return;}
  const filename=path.resolve(ROOT,decodeURIComponent(
   new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
  if(!filename.startsWith(ROOT+path.sep)||!fs.existsSync(filename)||
   !fs.statSync(filename).isFile()){res.writeHead(404);res.end('not found');return}
  res.writeHead(200,{'Content-Type':filename.endsWith('.js')?
   'application/javascript':'text/html','Cache-Control':'no-store',
   'Referrer-Policy':'no-referrer'});res.end(fs.readFileSync(filename));
 });
 await new Promise((ok,no)=>{
  server.once('error',no);server.listen(0,'127.0.0.1',ok)});
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
  await page.evaluate(()=>localStorage.setItem('__I25_PROTECTED__','unchanged'));
  await page.goto(base+'/lab/integracion-main-auth-i25.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I25-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('#i25-note').isDisabled(),true);
  assert.equal(await page.locator('#i25-download').isDisabled(),true);
  const wait=async term=>{
   await page.waitForFunction(q=>(document.querySelector('#i25-status')
    ?.textContent||'').includes(q),term,{timeout:65000});
   return page.locator('#i25-status').textContent();
  };
  const stages=['I18','I19','I20','I21','I22','I23','I24'];
  async function files(raws){
   for(let i=0;i<stages.length;i++){
    await page.locator('#i25-file-'+stages[i]).setInputFiles(
     raws[i]===null?[]:upload(stages[i]+'.json',raws[i]));
   }
  }
  await files(fx.raws);
  assert.equal(await page.locator('#i25-files .stage').count(),7);
  await page.locator('#i25-build').click();
  await wait('HOLD-INTERNAL-CONSISTENCY-ONLY');
  assert.equal(await page.locator('#i25-table tr').count(),7);
  assert.equal(await page.locator('#i25-download').isDisabled(),false);
  await page.locator('#i25-note').click();
  await wait('REVISIÓN EXTERNA ANOTADA LOCALMENTE, NO ENVIADA');
  assert.equal(await page.locator('#i25-note').isDisabled(),true);
  const [download]=await Promise.all([
   page.waitForEvent('download',{timeout:20000}),
   page.locator('#i25-download').click()
  ]);
  assert.match(download.suggestedFilename(),/MI-BOWLING-I25-[a-f0-9]{12}\.audit25/);
  const p=path.join(TMP,label+'.audit25');
  await download.saveAs(p);
  const recorded=JSON.parse(fs.readFileSync(p,'utf8'));
  assert.equal(recorded.sources.length,7);
  assert.equal(recorded.sources[3],fx.raws[3]);
  assert.equal(recorded.operationalApproval,false);
  assert.equal(recorded.externalCustodyProven,false);
  assert.equal(recorded.status,'review-note-recorded-not-sent');
  await page.locator('#i25-saved').setInputFiles(upload('saved.audit25',
   JSON.stringify(recorded)));
  await page.locator('#i25-saved-sha').fill(recorded.digest);
  await page.locator('#i25-check').click();
  await wait('INTEGRIDAD INTERNA COMPROBADA');
  assert.match(await page.locator('#i25-status').textContent(),/Sin autoridad/);
  const forged=clone(recorded);forged.externalCustodyProven=true;
  await page.locator('#i25-saved').setInputFiles(upload('fake.audit25',
   JSON.stringify(forged)));
  await page.locator('#i25-check').click();await wait('I25 BLOQUEADO');
  // A pretty-printed file is internally valid, but differs at raw UTF-8 level.
  await page.locator('#i25-file-I22').setInputFiles(
   upload('pretty.json',JSON.stringify(fx.objects[4],null,2)));
  assert.equal(await page.locator('#i25-download').isDisabled(),true);
  await page.locator('#i25-build').click();await wait('HOLD-SERIALIZATION-AMBIGUITY');
  assert.match(await page.locator('#i25-table').innerText(),/Texto original ≠ JSON/);
  // Valid but competing I20: nested I21 no longer links to this copy.
  await page.locator('#i25-file-I22').setInputFiles(upload('i22.json',fx.raws[4]));
  await page.locator('#i25-file-I20').setInputFiles(
   upload('other-i20.json',JSON.stringify(fx.different)));
  await page.locator('#i25-build').click();await wait('QUARANTINE-CROSS-STAGE-DISAGREEMENT');
  // Corrupt JSON is retained but cannot verify.
  await page.locator('#i25-file-I20').setInputFiles(upload('i20.json',fx.raws[2]));
  await page.locator('#i25-file-I21').setInputFiles(upload('damaged.json','{"format":'));
  await page.locator('#i25-build').click();await wait('QUARANTINE-INVALID-STAGES');
  await page.locator('#i25-file-I21').setInputFiles(upload('i21.json',fx.raws[3]));
  await page.locator('#i25-pin-I24').fill('f'.repeat(64));
  await page.locator('#i25-build').click();await wait('QUARANTINE-UNTRUSTED-PIN-MISMATCH');
  // One missing original must not be reconstructed or treated as a custodian.
  await page.locator('#i25-pin-I24').fill('');
  await page.locator('#i25-file-I19').setInputFiles([]);
  await page.locator('#i25-build').click();await wait('HOLD-INCOMPLETE-STAGE-CHAIN');
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I25_PROTECTED__')),'unchanged');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(a=>a.length):0),0);
  console.log('PASS I25 '+label+' · raw-vs-JSON integrity, seven stages, competing/missing/corrupt files preserved, forged custody rejected, explicit download, no IndexedDB/outside requests');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 const f=await fixture(A),base=await start();
 try{await run(webkit,base,'webkit',f);await run(chromium,base,'chromium',f)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
