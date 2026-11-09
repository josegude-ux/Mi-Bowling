/* MI BOWLING I15 · Chromium/WebKit local-only no-storage synthetic UI.
 * ECDSA private test keys never enter the browser, package, or repository.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A,B,PASS,clone}=require('./i15-recovery-fixture.cjs');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i15-'));
let server;
const input=(name,data)=>({name,mimeType:'application/json',
 buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});
async function serverStart(){
 const key=path.join(TMP,'key.pem'),crt=path.join(TMP,'crt.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',crt,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(crt)},(req,res)=>{
  if(req.url==='/__blank'){
   res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   res.end('<!doctype html><title>I15 isolated</title>');return;
  }
  const uri=new URL(req.url,'https://127.0.0.1').pathname;
  const f=path.resolve(ROOT,decodeURIComponent(uri).replace(/^\/+/,''));
  if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){
   res.writeHead(404);res.end('not found');return;
  }
  res.writeHead(200,{'Content-Type':f.endsWith('.js')?'application/javascript':'text/html',
   'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end(fs.readFileSync(f));
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function run(engine,base,label,fx){
 const browser=await engine.launch(label==='chromium'?{
  headless:true,args:['--no-sandbox'],
  executablePath:cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim()
 }:{headless:true});
 const ctx=await browser.newContext({locale:'es-ES',ignoreHTTPSErrors:true,
  viewport:{width:label==='webkit'?390:1280,height:840}});
 await ctx.route('**/*',route=>route.request().url().startsWith(base+'/')?
  route.continue():route.abort());
 try{
  const page=await ctx.newPage();
  await page.goto(base+'/__blank');
  await page.evaluate(()=>localStorage.setItem('__I15_PROTECTED__','preserved'));
  await page.goto(base+'/lab/integracion-main-auth-i15.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I15-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('script[src*="encrypted-store"]').count(),0);
  const src=fx.sources;
  await page.locator('#i15-pass').fill(PASS);
  const files=[
   ['i15-package','recovery.mr15',fx.package15],
   ['i15-policies','historic.trust14',src.previousPolicies],
   ['i15-pins13','historic.pins13',src.previousPins13],
   ['i15-gen14','original.gen14',src.previousGenesisPin],
   ['i15-last14','old.pin14',src.previousLatestPin],
   ['i15-recovery-policy','rescue.trust15',src.recoveryPolicy],
   ['i15-commitment','precommitted.gen15',src.commitment],
   ['i15-new-policy','new.new15',src.newPolicy],
   ['i15-pin13','new.pin13',src.newPin13],
   ['i15-last15','external.pin15',src.externalLatestPin]
  ];
  for(const [id,name,obj] of files)await page.locator('#'+id).setInputFiles(input(name,obj));
  await page.locator('#i15-verify').click();
  await page.waitForFunction(()=>document.getElementById('i15-status')
   ?.textContent.includes('RECUPERACIÓN SINTÉTICA VERIFICADA'),null,{timeout:25000});
  await page.locator('#i15-current').setInputFiles(input('old.mae11',
   fx.previous.rawFiles[0]));
  await page.locator('#i15-compare').click();
  await page.waitForFunction(()=>document.getElementById('i15-status')
   ?.textContent.includes('rollback-or-suppression-detected'),null,{timeout:25000});
  const forged=clone(src.commitment);forged.authorityPolicyDigest='f'.repeat(64);
  await page.locator('#i15-commitment').setInputFiles(input('forged.gen15',forged));
  await page.locator('#i15-verify').click();
  await page.waitForFunction(()=>document.getElementById('i15-status')
   ?.textContent.includes('I15 BLOQUEADO'));
  assert.match(await page.locator('#i15-status').textContent(),/SUSTITUCIÓN/);
  await page.locator('#i15-commitment').setInputFiles(input('original.gen15',src.commitment));
  const missing=clone(fx.package15);
  missing.recovery.witnessSnapshots[0].files.pop();
  await page.locator('#i15-package').setInputFiles(input('missing.mr15',missing));
  await page.locator('#i15-verify').click();
  await page.waitForFunction(()=>document.getElementById('i15-status')
   ?.textContent.includes('I15 BLOQUEADO'));
  await page.locator('#i15-package').setInputFiles(input('recovery.mr15',fx.package15));
  await page.locator('#i15-owner').selectOption(B);
  await page.locator('#i15-verify').click();
  await page.waitForFunction(()=>document.getElementById('i15-status')
   ?.textContent.includes('I15 BLOQUEADO'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I15_PROTECTED__')),'preserved');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(x=>x.length):0),0);
  console.log('PASS I15 '+label+' · precommitted external recovery policy, double quorum, old I14 history, rollback, missing/tampered pin, cross-owner B, offline readonly no-IDB');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 const f=await fixture(A),base=await serverStart();
 try{await run(webkit,base,'webkit',f);await run(chromium,base,'chromium',f)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
