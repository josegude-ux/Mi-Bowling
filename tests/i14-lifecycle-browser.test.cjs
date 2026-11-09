/* MI BOWLING I14 · WebKit/Chromium isolated file-only controls A/B/C.
 * HTTPS loopback, all network except loopback aborted; keys Node fixture only.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {build,A,B,PASS,clone}=require('./i14-lifecycle-fixture.cjs');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i14-'));
let server;
const entry=(name,x)=>({name,mimeType:'application/json',
 buffer:Buffer.from(typeof x==='string'?x:JSON.stringify(x))});
async function start(){
 const key=path.join(TMP,'key.pem'),crt=path.join(TMP,'crt.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',crt,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(crt)},(req,res)=>{
  if(req.url==='/__blank'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   res.end('<title>I14 isolated inspector</title>');return}
  const f=path.resolve(ROOT,decodeURIComponent(
   new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
  if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){
   res.writeHead(404);res.end('Missing');return}
  res.writeHead(200,{'Content-Type':f.endsWith('.js')?'application/javascript':'text/html',
   'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end(fs.readFileSync(f));
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function run(engine,base,label,fx){
 const browser=await engine.launch(label==='chromium'?{headless:true,
  executablePath:cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),
  args:['--no-sandbox']}:{headless:true});
 const ctx=await browser.newContext({ignoreHTTPSErrors:true,
  locale:'es-ES',viewport:{width:label==='webkit'?390:1300,height:840}});
 await ctx.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 try{
  const p=await ctx.newPage();
  await p.goto(base+'/__blank');
  await p.evaluate(()=>localStorage.setItem('__I14_NO_WRITE__','untouched'));
  await p.goto(base+'/lab/integracion-main-auth-i14.html');
  assert.equal(await p.locator('body').getAttribute('data-lab'),'I14-OFFLINE-READONLY');
  assert.equal(await p.locator('script[src*="app.js"]').count(),0);
  assert.equal(await p.locator('script[src*="encrypted-store"]').count(),0);
  await p.locator('#i14-pass').fill(PASS);
  await p.locator('#i14-bundle').setInputFiles(entry('signed.ml14',fx.bundle));
  await p.locator('#i14-policies').setInputFiles(entry('external.trust14',fx.policies));
  await p.locator('#i14-pins13').setInputFiles(entry('external.pins13',fx.pins13));
  await p.locator('#i14-genesis').setInputFiles(entry('external.gen14',fx.rootPin));
  await p.locator('#i14-latest').setInputFiles(entry('external.pin14',fx.latestPin));
  await p.locator('#i14-verify').click();
  await p.waitForFunction(()=>document.getElementById('i14-status')
   ?.textContent.includes('CADENA Y QUÓRUM VERIFICADOS'),null,{timeout:20000});
  await p.locator('#i14-current').setInputFiles(entry('old.mae11',fx.rawFiles[0]));
  await p.locator('#i14-compare').click();
  await p.waitForFunction(()=>document.getElementById('i14-status')
   ?.textContent.includes('rollback-or-suppression-detected'),null,{timeout:20000});
  const forged=clone(fx.latestPin);forged.lastPolicyDigest='f'.repeat(64);
  await p.locator('#i14-latest').setInputFiles(entry('forged.pin14',forged));
  await p.locator('#i14-verify').click();
  await p.waitForFunction(()=>document.getElementById('i14-status')
   ?.textContent.includes('I14 BLOQUEADO'));
  assert.match(await p.locator('#i14-status').textContent(),/ROLLBACK/);
  await p.locator('#i14-latest').setInputFiles(entry('external.pin14',fx.latestPin));
  await p.locator('#i14-owner').selectOption(B);
  await p.locator('#i14-verify').click();
  await p.waitForFunction(()=>document.getElementById('i14-status')
   ?.textContent.includes('I14 BLOQUEADO'));
  await p.locator('#i14-owner').selectOption(A);
  assert.equal(await p.evaluate(()=>localStorage.getItem('__I14_NO_WRITE__')),'untouched');
  assert.equal(await p.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(x=>x.length):0),0);
  console.log('PASS I14 '+label+' · policy epoch rotation, retired keys, external genesis/final pins, fake A/B isolation, rollback and readonly/no-IDB/network');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 const fx=await build(A,3),base=await start();
 try{await run(webkit,base,'webkit',fx);await run(chromium,base,'chromium',fx)}
 finally{await new Promise(done=>server.close(done));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
