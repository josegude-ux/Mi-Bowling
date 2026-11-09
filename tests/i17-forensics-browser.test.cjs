/* MI BOWLING I17 · WebKit/Chromium offline forensic dispute and anchor-loss UI.
 * No API clients, external services, private browser keys, or real A/B/C data.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A,B,PASS,clone}=require('./i17-forensics-fixture.cjs');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i17-'));
let server;
const upload=(name,x)=>({name,mimeType:'application/json',
 buffer:Buffer.from(typeof x==='string'?x:JSON.stringify(x))});
async function start(){
 const key=path.join(TMP,'key.pem'),crt=path.join(TMP,'cert.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',crt,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(crt)},(req,res)=>{
  if(req.url==='/__blank'){
   res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   res.end('<!doctype html><title>Isolated I17</title>');return;
  }
  const uri=decodeURIComponent(new URL(req.url,'https://127.0.0.1').pathname);
  const pathname=path.resolve(ROOT,uri.replace(/^\/+/,''));
  if(!pathname.startsWith(ROOT+path.sep)||!fs.existsSync(pathname)||
   !fs.statSync(pathname).isFile()){
   res.writeHead(404);res.end('not found');return;
  }
  res.writeHead(200,{'Content-Type':pathname.endsWith('.js')?
   'application/javascript':'text/html','Referrer-Policy':'no-referrer',
   'Cache-Control':'no-store'});res.end(fs.readFileSync(pathname));
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function run(engine,base,label,fx){
 const browser=await engine.launch(label==='chromium'?{headless:true,
  executablePath:cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),
  args:['--no-sandbox']}:{headless:true});
 const ctx=await browser.newContext({ignoreHTTPSErrors:true,locale:'es-ES',
  viewport:{width:label==='webkit'?390:1280,height:844}});
 await ctx.route('**/*',route=>route.request().url().startsWith(base+'/')?
  route.continue():route.abort());
 try{
  const page=await ctx.newPage();
  await page.goto(base+'/__blank');
  await page.evaluate(()=>localStorage.setItem('__I17_PROTECTED__','intact'));
  await page.goto(base+'/lab/integracion-main-auth-i17.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I17-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('script[src*="encrypted-store"]').count(),0);
  await page.locator('#i17-pass').fill(PASS);
  const files=[
   ['i17-package15','sealed.mr15',fx.package15],
   ['i17-source15','outside.refs15',fx.source],
   ['i17-root','independent.gen16',fx.externalRoot],
   ['i17-latest','independent.mark16',fx.externalMark],
   ['i17-report-A','custodianA.claim17',fx.reports[0]],
   ['i17-report-B','custodianB.claim17',fx.reports[1]],
   ['i17-report-C','custodianC.claim17',fx.reports[2]]
  ];
  for(const [id,name,data] of files)
   await page.locator('#'+id).setInputFiles(upload(name,data));
  async function assertState(decision){
   await page.locator('#i17-check').click();
   await page.waitForFunction(d=>document.querySelector('#i17-status')
    ?.textContent.includes('I17 · '+d.toUpperCase()),decision,{timeout:50000});
   return page.locator('#i17-status').textContent();
  }
  assert.match(await assertState('conditionally-consistent'),/COHERENCIA CONDICIONADA/);
  await page.locator('#i17-report-C').setInputFiles([]);
  assert.match(await assertState('conditionally-consistent'),/faltantes 1/);
  await page.locator('#i17-report-B').setInputFiles([]);
  assert.match(await assertState('blocked-insufficient-copies'),/NO AUTORIZADO/);
  await page.locator('#i17-report-B').setInputFiles(upload('custodianB.claim17',fx.reports[1]));
  const fork=await fx.branch('C');
  await page.locator('#i17-report-C').setInputFiles(upload('fork.claim17',fork));
  assert.match(await assertState('quarantine-conflicting-evidence'),/bifurcación sí/);
  await page.locator('#i17-report-C').setInputFiles(upload('custodianC.claim17',fx.reports[2]));
  await page.locator('#i17-latest').setInputFiles([]);
  assert.match(await assertState('blocked-external-reference-loss'),/NO AUTORIZADO/);
  await page.locator('#i17-root').setInputFiles([]);
  assert.match(await assertState('blocked-external-reference-loss'),/NO AUTORIZADO/);
  await page.locator('#i17-package15').setInputFiles([]);
  await page.locator('#i17-source15').setInputFiles([]);
  assert.match(await assertState('blocked-total-trust-loss'),/NO AUTORIZADO/);
  await page.locator('#i17-package15').setInputFiles(upload('sealed.mr15',fx.package15));
  await page.locator('#i17-source15').setInputFiles(upload('outside.refs15',fx.source));
  await page.locator('#i17-root').setInputFiles(upload('independent.gen16',fx.externalRoot));
  await page.locator('#i17-latest').setInputFiles(upload('independent.mark16',fx.externalMark));
  await page.locator('#i17-owner').selectOption(B);
  await page.locator('#i17-check').click();
  await page.waitForFunction(()=>document.querySelector('#i17-status')
   ?.textContent.includes('I17 BLOQUEADO:'),null,{timeout:50000});
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I17_PROTECTED__')),'intact');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(x=>x.length):0),0);
  console.log('PASS I17 '+label+' · offline signed fork quarantine, missing 1/2 custodians, lost external high-watermark/whole I15 trust, cross-owner B and no IDB/external network');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 const fx=await fixture(A),base=await start();
 try{await run(webkit,base,'webkit',fx);await run(chromium,base,'chromium',fx)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
