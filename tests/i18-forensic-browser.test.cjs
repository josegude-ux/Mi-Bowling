/* MI BOWLING I18 · browser forensic dossier and manual-only export.
 * Private Node fixture keys never go to browser. Local HTTPS loopback only.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A,PASS,clone}=require('./i18-forensic-fixture.cjs');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i18-'));
let server;
const file=(name,data)=>({name,mimeType:'application/json',
 buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});
async function start(){
 const key=path.join(TMP,'key.pem'),crt=path.join(TMP,'cert.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',crt,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(crt)},(req,res)=>{
  if(req.url==='/__blank'){res.writeHead(200,{'Content-Type':'text/html'});
   res.end('<!doctype html><title>I18</title>');return}
  const filename=path.resolve(ROOT,decodeURIComponent(
   new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
  if(!filename.startsWith(ROOT+path.sep)||!fs.existsSync(filename)||
   !fs.statSync(filename).isFile()){
   res.writeHead(404);res.end('not found');return;
  }
  res.writeHead(200,{'Content-Type':filename.endsWith('.js')?
   'application/javascript':'text/html','Cache-Control':'no-store',
   'Referrer-Policy':'no-referrer'});res.end(fs.readFileSync(filename));
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
  acceptDownloads:true,viewport:{width:label==='webkit'?390:1280,height:844}});
 await ctx.route('**/*',route=>route.request().url().startsWith(base+'/')?
  route.continue():route.abort());
 try{
  const page=await ctx.newPage();
  await page.goto(base+'/__blank');
  await page.evaluate(()=>localStorage.setItem('__I18_PROTECTED__','unchanged'));
  await page.goto(base+'/lab/integracion-main-auth-i18.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I18-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  await page.locator('#i18-pass').fill(PASS);
  const src=fx.inputs;
  const files=[
   ['i18-package15','sealed.mr15',src.package15],
   ['i18-source15','sources.refs15',src.source15],
   ['i18-root','external.gen16',src.externalRoot],
   ['i18-latest','external.mark16',src.externalLatest],
   ['i18-report-A','slotA.claim17',src.reports[0]],
   ['i18-report-B','slotB.claim17',src.reports[1]],
   ['i18-report-C','slotC.claim17',src.reports[2]]
  ];
  for(const [id,name,data] of files)
   await page.locator('#'+id).setInputFiles(file(name,data));
  async function build(decision){
   await page.locator('#i18-build').click();
   await page.waitForFunction(d=>{
    const t=document.querySelector('#i18-status')?.textContent||'';
    return t.includes('EXPEDIENTE PREPARADO')&&t.includes(d.toUpperCase());
   },decision,{timeout:50000});
   assert.equal(await page.locator('#i18-download').isDisabled(),false);
  }
  await build('conditionally-consistent');
  const [download]=await Promise.all([
   page.waitForEvent('download',{timeout:20000}),page.locator('#i18-download').click()
  ]);
  assert.match(download.suggestedFilename(),/MI-BOWLING-I18-.*\.hold18/);
  const local=path.join(TMP,label+'-case.hold18');
  await download.saveAs(local);
  const dossier=JSON.parse(fs.readFileSync(local,'utf8'));
  assert.equal(dossier.operationallyApproved,false);
  assert.equal(dossier.authority,'none');
  assert.equal(JSON.stringify(dossier).includes(PASS),false);
  assert.equal(dossier.events.length,5);
  await page.locator('#i18-saved').setInputFiles(file('case.hold18',dossier));
  await page.locator('#i18-trusted-digest').fill(dossier.dossierDigest);
  await page.locator('#i18-check').click();
  await page.waitForFunction(()=>document.querySelector('#i18-status')
   ?.textContent.includes('INTEGRIDAD INTERNA CORRECTA'),null,{timeout:15000});
  assert.match(await page.locator('#i18-status').textContent(),/Referencia externa: coincide/);
  const corrupted=clone(dossier);corrupted.evidence[4].payload.copy.markDigest='f'.repeat(64);
  await page.locator('#i18-saved').setInputFiles(file('tampered.hold18',corrupted));
  await page.locator('#i18-check').click();
  await page.waitForFunction(()=>document.querySelector('#i18-status')
   ?.textContent.includes('I18 BLOQUEADO'),null,{timeout:12000});
  await page.locator('#i18-report-C').setInputFiles(
   file('signed-fork.claim17',await fx.branch('C')));
  await build('quarantine-conflicting-evidence');
  for(const id of ['i18-package15','i18-source15','i18-root','i18-latest',
   'i18-report-A','i18-report-B','i18-report-C'])
   await page.locator('#'+id).setInputFiles([]);
  await page.locator('#i18-pass').fill('');
  await build('blocked-total-trust-loss');
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I18_PROTECTED__')),'unchanged');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(x=>x.length):0),0);
  console.log('PASS I18 '+label+' · forensic export only on explicit click, independent pin check, altered dossier denied, signed fork preserved, complete trust-loss escalated manually, no DB or outside network');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 const f=await fixture(A),base=await start();
 try{await run(webkit,base,'webkit',f);await run(chromium,base,'chromium',f)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
