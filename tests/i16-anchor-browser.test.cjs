/* MI BOWLING I16 · WebKit/Chromium offline signed anchor references, A/B/C.
 * Keys generated ONLY in Node, never imported to browser's private key store.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),os=require('node:os'),https=require('node:https'),
 cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A,B,PASS,clone}=require('./i16-anchor-fixture.cjs');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i16-'));
let server;
const upload=(name,value)=>({name,mimeType:'application/json',
 buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
async function start(){
 const key=path.join(TMP,'key.pem'),crt=path.join(TMP,'cert.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',crt,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(crt)},(req,res)=>{
  if(req.url==='/__blank'){
   res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   res.end('<!doctype html><title>I16 fixture</title>');return;
  }
  const filename=path.resolve(ROOT,decodeURIComponent(
   new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
  if(!filename.startsWith(ROOT+path.sep)||!fs.existsSync(filename)||
   !fs.statSync(filename).isFile()){res.writeHead(404);res.end('not found');return}
  res.writeHead(200,{'Content-Type':filename.endsWith('.js')?
   'application/javascript':'text/html','Cache-Control':'no-store',
   'Referrer-Policy':'no-referrer'});res.end(fs.readFileSync(filename));
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function run(engine,base,label,fx){
 const browser=await engine.launch(label==='chromium'?{
  executablePath:cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),
  headless:true,args:['--no-sandbox']}:{headless:true});
 const context=await browser.newContext({ignoreHTTPSErrors:true,locale:'es-ES',
  viewport:{width:label==='webkit'?390:1280,height:840}});
 await context.route('**/*',route=>route.request().url().startsWith(base+'/')?
  route.continue():route.abort());
 try{
  const page=await context.newPage();
  await page.goto(base+'/__blank');
  await page.evaluate(()=>localStorage.setItem('__I16_PROTECTED__','preserve'));
  await page.goto(base+'/lab/integracion-main-auth-i16.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I16-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('script[src*="encrypted-store"]').count(),0);
  await page.locator('#i16-password').fill(PASS);
  const fields=[
   ['i16-history','history.anchor16',fx.history],
   ['i16-package15','recover.mr15',fx.package15],
   ['i16-source15','separate.refs15',fx.source],
   ['i16-root','genesis.gen16',fx.externalRoot],
   ['i16-watermark','high.mark16',fx.externalMark],
   ['i16-copy-A','slotA.copy16',fx.copies[0]],
   ['i16-copy-B','slotB.copy16',fx.copies[1]],
   ['i16-copy-C','slotC.copy16',fx.copies[2]]
  ];
  for(const [id,name,val] of fields)
   await page.locator('#'+id).setInputFiles(upload(name,val));
  await page.locator('#i16-verify').click();
  await page.waitForFunction(()=>document.querySelector('#i16-status')
   ?.textContent.includes('REFERENCIAS VERIFICADAS CON MARCA EXTERNA'),null,{timeout:35000});
  await page.locator('#i16-copy-B').setInputFiles([]);
  await page.locator('#i16-verify').click();
  await page.waitForFunction(()=>document.querySelector('#i16-status')
   ?.textContent.includes('2 copias válidas'),null,{timeout:35000});
  await page.locator('#i16-copy-C').setInputFiles([]);
  await page.locator('#i16-verify').click();
  await page.waitForFunction(()=>document.querySelector('#i16-status')
   ?.textContent.includes('I16 BLOQUEADO'),null,{timeout:35000});
  assert.match(await page.locator('#i16-status').textContent(),/CUÓRUM/);
  await page.locator('#i16-copy-B').setInputFiles(upload('slotB.copy16',fx.copies[1]));
  await page.locator('#i16-copy-C').setInputFiles(upload('slotC.copy16',fx.copies[2]));
  await page.locator('#i16-history').setInputFiles(upload('replay.anchor16',fx.older(1)));
  await page.locator('#i16-verify').click();
  await page.waitForFunction(()=>/I16 BLOQUEADO:.*(?:REPLAY|ROLLBACK)/
   .test(document.querySelector('#i16-status')?.textContent||''),null,{timeout:35000});
  assert.match(await page.locator('#i16-status').textContent(),/REPLAY|ROLLBACK/);
  await page.locator('#i16-history').setInputFiles(upload('history.anchor16',fx.history));
  const broken=clone(fx.externalMark);
  broken.latestStatementHash='f'.repeat(64);
  await page.locator('#i16-watermark').setInputFiles(upload('bad.mark16',broken));
  await page.locator('#i16-verify').click();
  await page.waitForFunction(()=>document.querySelector('#i16-status')
   ?.textContent.includes('I16 BLOQUEADO'),null,{timeout:35000});
  await page.locator('#i16-watermark').setInputFiles(upload('high.mark16',fx.externalMark));
  await page.locator('#i16-owner').selectOption(B);
  await page.locator('#i16-verify').click();
  await page.waitForFunction(()=>document.querySelector('#i16-status')
   ?.textContent.includes('I16 BLOQUEADO'),null,{timeout:35000});
  await page.locator('#i16-owner').selectOption(A);
  await page.locator('#i16-current').setInputFiles(upload('old.mae11',
   fx.previous.previous.rawFiles[0]));
  await page.locator('#i16-compare').click();
  await page.waitForFunction(()=>document.querySelector('#i16-status')
   ?.textContent.includes('rollback-or-suppression-detected'),null,{timeout:35000});
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I16_PROTECTED__')),'preserve');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(x=>x.length):0),0);
  console.log('PASS I16 '+label+' · signed anchors, lost 1/2 copies, real replay guard, tampered latest, A/B isolation, readonly local HTTPS/no-IDB/no-external-network');
 }finally{await context.close();await browser.close()}
}
(async()=>{
 const fx=await fixture(A),base=await start();
 try{await run(webkit,base,'webkit',fx);await run(chromium,base,'chromium',fx)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
