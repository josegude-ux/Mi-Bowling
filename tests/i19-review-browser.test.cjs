/* MI BOWLING I19 · synthetic manual review browser verification.
 * HTTPS loopback only; no real identities, application storage or external IO.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A,clone}=require('./i19-review-fixture.cjs');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i19-'));
let server;
const upload=(name,value)=>({name,mimeType:'application/json',
 buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
async function start(){
 const key=path.join(TMP,'key.pem'),crt=path.join(TMP,'crt.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',crt,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(crt)},(req,res)=>{
  if(req.url==='/__blank'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   res.end('<!doctype html><title>I19 isolated</title>');return}
  const filename=path.resolve(ROOT,decodeURIComponent(
   new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
  if(!filename.startsWith(ROOT+path.sep)||!fs.existsSync(filename)||
   !fs.statSync(filename).isFile()){
   res.writeHead(404);res.end('not found');return}
  res.writeHead(200,{'Content-Type':filename.endsWith('.js')?
   'application/javascript':'text/html','Cache-Control':'no-store',
   'Referrer-Policy':'no-referrer'});res.end(fs.readFileSync(filename));
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);server.listen(0,'127.0.0.1',resolve)
 });
 return 'https://127.0.0.1:'+server.address().port;
}
async function run(engine,base,label,fx){
 const browser=await engine.launch(label==='chromium'?{
  executablePath:cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),
  headless:true,args:['--no-sandbox']}:{headless:true});
 const context=await browser.newContext({ignoreHTTPSErrors:true,locale:'es-ES',
  acceptDownloads:true,viewport:{width:label==='webkit'?390:1280,height:844}});
 await context.route('**/*',route=>route.request().url().startsWith(base+'/')?
  route.continue():route.abort());
 try{
  const page=await context.newPage();
  await page.goto(base+'/__blank');
  await page.evaluate(()=>localStorage.setItem('__I19_PROTECTED__','unaltered'));
  await page.goto(base+'/lab/integracion-main-auth-i19.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I19-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('button:has-text("Aprobar")').count(),0);
  assert.equal(await page.locator('#i19-record').isDisabled(),true);
  const source=async d=>page.locator('#i19-dossier').setInputFiles(
   upload('fiction.hold18',d));
  const wait=async phrase=>{
   await page.waitForFunction(p=>document.querySelector('#i19-status')
    ?.textContent.includes(p),phrase,{timeout:45000});
   return page.locator('#i19-status').textContent();
  };
  await source(fx.conflict);
  await page.locator('#i19-prepare').click();
  await wait('REVISIÓN ABIERTA');
  assert.equal(await page.locator('#i19-escalate').isDisabled(),true);
  await page.locator('#i19-assessment').selectOption('disputed-evidence');
  await page.locator('#i19-basis').selectOption('signed-branch-comparison');
  await page.locator('#i19-record').click();await wait('OBSERVACIÓN REGISTRADA');
  await page.locator('#i19-record').click();await wait('I19 BLOQUEADO');
  assert.match(await page.locator('#i19-status').textContent(),/alias de revisión repetido/);
  await page.locator('#i19-reviewer').selectOption('B');
  await page.locator('#i19-assessment').selectOption('requires-independent-review');
  await page.locator('#i19-basis').selectOption('external-provenance-unverified');
  await page.locator('#i19-record').click();
  await page.waitForFunction(()=>document.querySelector('#i19-status')
   ?.textContent.includes('2 alias'),null,{timeout:45000});
  await page.locator('#i19-escalate').click();await wait('ESCALADA MANUAL PENDIENTE');
  assert.equal(await page.locator('#i19-record').isDisabled(),true);
  const [download]=await Promise.all([
   page.waitForEvent('download',{timeout:20000}),
   page.locator('#i19-download').click()
  ]);
  assert.match(download.suggestedFilename(),/MI-BOWLING-I19-.*\.review19$/);
  const outfile=path.join(TMP,label+'-review19.json');
  await download.saveAs(outfile);
  const saved=JSON.parse(fs.readFileSync(outfile,'utf8'));
  assert.equal(saved.authority,'none');
  assert.equal(saved.operationalApproval,false);
  assert.equal(saved.status,'escalated-unresolved');
  assert.equal(saved.events.length,3);
  await page.locator('#i19-saved').setInputFiles(upload('correct.review19',saved));
  await page.locator('#i19-verify').click();await wait('REGISTRO COMPROBADO');
  const fake=clone(saved);fake.operationalApproval=true;
  await page.locator('#i19-saved').setInputFiles(upload('changed.review19',fake));
  await page.locator('#i19-verify').click();await wait('I19 BLOQUEADO');
  const noRoots=fx.total;
  await source(noRoots);
  assert.equal(await page.locator('#i19-download').isDisabled(),true);
  await page.locator('#i19-prepare').click();await wait('REVISIÓN ABIERTA');
  await page.locator('#i19-reviewer').selectOption('A');
  await page.locator('#i19-assessment').selectOption('missing-originals');
  await page.locator('#i19-basis').selectOption('external-anchor-absent');
  await page.locator('#i19-record').click();await wait('OBSERVACIÓN REGISTRADA');
  await page.locator('#i19-reviewer').selectOption('C');
  await page.locator('#i19-record').click();
  await page.waitForFunction(()=>document.querySelector('#i19-status')
   ?.textContent.includes('2 alias'),null,{timeout:45000});
  await page.locator('#i19-escalate').click();await wait('missing-original-I15-trust');
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I19_PROTECTED__')),
   'unaltered');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(x=>x.length):0),0);
  console.log('PASS I19 '+label+' · fake reviewer-label duplication blocked, only manual unresolved escalation, local download explicit, tamper rejected, total lost I15 sources, no IndexedDB/outside network');
 }finally{await context.close();await browser.close()}
}
(async()=>{
 const f=await fixture(A),base=await start();
 try{await run(webkit,base,'webkit',f);await run(chromium,base,'chromium',f)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
