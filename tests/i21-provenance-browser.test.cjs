/* MI BOWLING I21 · LAB browsers show that an altered source plus its
 * matching SHA remains UNPROVEN. HTTPS loopback only, synthetic A/B/C.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A,clone}=require('./i21-provenance-fixture.cjs');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i21-'));
let server;
const upload=(name,value)=>({name,mimeType:'application/json',
 buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
async function start(){
 const key=path.join(TMP,'key.pem'),cert=path.join(TMP,'crt.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
  if(req.url==='/__blank'){res.writeHead(200,{'Content-Type':'text/html'});
   res.end('<!doctype html><title>Lab I21</title>');return}
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
  server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function run(engine,base,label,f){
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
  await page.evaluate(()=>localStorage.setItem('__I21_PROTECTED__','unchanged'));
  await page.goto(base+'/lab/integracion-main-auth-i21.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I21-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('#i21-download').isDisabled(),true);
  assert.equal(await page.locator('#i21-request').isDisabled(),true);
  const wait=async s=>{
   await page.waitForFunction(q=>(document.querySelector('#i21-status')
    ?.textContent||'').includes(q),s,{timeout:60000});
   return page.locator('#i21-status').textContent();
  };
  const files=async bundles=>{
   for(let i=0;i<3;i++){
    const slot=['A','B','C'][i],b=bundles[i];
    await page.locator('#i21-file-'+slot).setInputFiles(
     b?upload('candidate-'+slot+'.hold20',b.packet):[]);
    await page.locator('#i21-claim-'+slot).fill(b?.claim.digest||'');
   }
  };
  await files(f.originals);
  await page.locator('#i21-build').click();
  await wait('BLOCKED-JOINT-SUBSTITUTION-UNDECIDABLE');
  assert.equal(await page.locator('#i21-download').isDisabled(),false);
  await page.locator('#i21-request').click();
  await wait('REVISIÓN EXTERNA ANOTADA, NO ENVIADA');
  assert.equal(await page.locator('#i21-request').isDisabled(),true);
  const [download]=await Promise.all([
   page.waitForEvent('download',{timeout:20000}),
   page.locator('#i21-download').click()
  ]);
  assert.match(download.suggestedFilename(),/MI-BOWLING-I21-[a-f0-9]{12}\.doubt21/);
  const savedPath=path.join(TMP,label+'.doubt21');
  await download.saveAs(savedPath);
  const saved=JSON.parse(fs.readFileSync(savedPath,'utf8'));
  assert.equal(saved.operationalApproval,false);
  assert.equal(saved.coordinatedReplacementExcluded,false);
  assert.equal(saved.status,'review-request-recorded-not-sent');
  await page.locator('#i21-saved').setInputFiles(upload('saved.doubt21',saved));
  await page.locator('#i21-saved-sha').fill(saved.digest);
  await page.locator('#i21-check').click();
  assert.match(await wait('INTEGRIDAD INTERNA CORRECTA'),/Sustitución conjunta NO descartada/);
  const bad=clone(saved);bad.operationalApproval=true;
  await page.locator('#i21-saved').setInputFiles(upload('forged.doubt21',bad));
  await page.locator('#i21-check').click();await wait('I21 BLOQUEADO');
  // An equally coherent set of REPLACED packets and hashes is still unproven.
  await files(f.jointlySubstituted);
  await page.locator('#i21-build').click();
  await wait('BLOCKED-JOINT-SUBSTITUTION-UNDECIDABLE');
  // A separately supplied original pin detects the changed packet.
  await page.locator('#i21-prior').fill(f.primary.packetDigest);
  assert.equal(await page.locator('#i21-download').isDisabled(),true);
  await page.locator('#i21-build').click();await wait('BLOCKED-UNREPRESENTED-PIN');
  await page.locator('#i21-prior').fill('');
  await files(f.competing);
  await page.locator('#i21-build').click();
  await wait('QUARANTINE-COMPETING-PACKETS');
  await files([null,null,null]);
  await page.locator('#i21-build').click();await wait('BLOCKED-EVIDENCE-LOSS');
  await page.locator('#i21-request').click();
  await wait('REVISIÓN EXTERNA ANOTADA, NO ENVIADA');
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I21_PROTECTED__')),'unchanged');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(a=>a.length):0),0);
  console.log('PASS I21 '+label+' · whole-packet+digest substitution remains undecidable, original pin mismatch, competing versions quarantined, false approval rejected, explicit download, no IndexedDB/outside network');
 }finally{await context.close();await browser.close()}
}
(async()=>{
 const f=await fixture(A),base=await start();
 try{await run(webkit,base,'webkit',f);await run(chromium,base,'chromium',f)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
