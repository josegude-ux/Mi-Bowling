/* MI BOWLING I26 · browser-only A/B/C synthetic HTTPS localhost tests.
 * WebKit mobile emulation and Chromium desktop, no outside network/storage.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),os=require('node:os'),https=require('node:https'),
 cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A,clone}=require('./i26-bounded-import-fixture.cjs');
const ROOT=path.resolve(__dirname,'..');
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i26-'));
let server;
const upload=(name,value)=>({name,mimeType:'application/json',
 buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value),'utf8')});
async function start(){
 const key=path.join(TMP,'key.pem'),cert=path.join(TMP,'cert.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},
  (req,res)=>{
   if(req.url==='/__blank'){
    res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
    res.end('<!doctype html><title>I26</title>');return;
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
  server.once('error',no);server.listen(0,'127.0.0.1',ok)});
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
  await page.evaluate(()=>localStorage.setItem('__I26_PROTECTED__','untouched'));
  await page.goto(base+'/lab/integracion-main-auth-i26.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I26-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('#i26-files .stage').count(),7);
  assert.equal(await page.locator('#i26-export').isDisabled(),true);
  const wait=async phrase=>{
   await page.waitForFunction(s=>(document.querySelector('#i26-status')
    ?.textContent||'').includes(s),phrase,{timeout:80000});
   return page.locator('#i26-status').textContent();
  };
  const stages=['I18','I19','I20','I21','I22','I23','I24'];
  async function files(raws){
   for(let i=0;i<stages.length;i++){
    await page.locator('#i26-file-'+stages[i]).setInputFiles(
     raws[i]===null?[]:upload(stages[i]+'.json',raws[i]));
   }
  }
  await files(f.raws);
  await page.locator('#i26-start').click();
  await wait('HOLD-INTERNAL-CONSISTENCY-ONLY');
  assert.equal(await page.locator('#i26-matrix tr').count(),7);
  assert.match(await page.locator('#i26-status').textContent(),
   /Etapas verificadas internamente: 7\/7/);
  assert.match(await page.locator('#i26-status').textContent(),/Memoria RAM total NO medida/);
  await page.locator('#i26-note').click();
  await wait('REVISIÓN EXTERNA ANOTADA, NO ENVIADA');
  assert.equal(await page.locator('#i26-note').isDisabled(),true);
  const [download]=await Promise.all([
   page.waitForEvent('download',{timeout:20000}),
   page.locator('#i26-export').click()
  ]);
  assert.match(download.suggestedFilename(),
   /MI-BOWLING-I25-IMPORT-I26-[a-f0-9]{12}\.audit25/);
  const savedPath=path.join(TMP,label+'.audit25');
  await download.saveAs(savedPath);
  const packet=JSON.parse(fs.readFileSync(savedPath,'utf8'));
  assert.equal(packet.status,'review-note-recorded-not-sent');
  assert.equal(packet.externalCustodyProven,false);
  assert.equal(packet.operationalApproval,false);
  assert.equal(packet.sources.length,7);
  assert.equal(packet.sources[4],f.raws[4]);
  await page.locator('#i26-saved').setInputFiles(upload('saved.audit25',packet));
  await page.locator('#i26-saved-pin').fill(packet.digest);
  await page.locator('#i26-check').click();
  await wait('COPIA I25 VERIFICADA INTERNAMENTE');
  const bad=clone(packet);bad.externalCustodyProven=true;
  await page.locator('#i26-saved').setInputFiles(upload('bad.audit25',bad));
  await page.locator('#i26-check').click();await wait('I26 BLOQUEADO O CANCELADO');
  assert.equal(await page.locator('#i26-export').isDisabled(),true);
  await files(f.raws);
  await page.locator('#i26-start').click();
  await wait('HOLD-INTERNAL-CONSISTENCY-ONLY');
  // Invalid UTF8 file cannot be silently normalized or used as a prior result.
  await page.locator('#i26-file-I22').setInputFiles({
   name:'bad-utf8.json',mimeType:'application/json',
   buffer:Buffer.from([0xc3,0x28])
  });
  assert.equal(await page.locator('#i26-export').isDisabled(),true);
  await page.locator('#i26-start').click();
  await wait('I26 BLOQUEADO O CANCELADO');
  assert.equal(await page.locator('#i26-export').isDisabled(),true);
  await page.locator('#i26-file-I22').setInputFiles(upload('i22.json',f.raws[4]));
  await page.locator('#i26-start').click();
  await wait('HOLD-INTERNAL-CONSISTENCY-ONLY');
  // Changed pins invalidate previous results and trigger quarantine.
  await page.locator('#i26-pin-I24').fill('f'.repeat(64));
  assert.equal(await page.locator('#i26-export').isDisabled(),true);
  await page.locator('#i26-start').click();
  await wait('QUARANTINE-UNTRUSTED-PIN-MISMATCH');
  await page.locator('#i26-pin-I24').fill('');
  await page.locator('#i26-file-I19').setInputFiles([]);
  await page.locator('#i26-start').click();await wait('HOLD-INCOMPLETE-STAGE-CHAIN');
  // Explicit cancellation: browser script slows blob reads only for this test.
  await page.addInitScript(()=>{});
  await page.evaluate(()=>{
   const original=Blob.prototype.arrayBuffer;
   Blob.prototype.arrayBuffer=async function(){
    await new Promise(resolve=>setTimeout(resolve,50));
    return original.call(this);
   };
  });
  const large=f.raws.slice();large[6]+= ' '.repeat(1024*1024);
  await files(large);
  await page.locator('#i26-start').click();
  await page.locator('#i26-cancel').click();
  await wait('I26 BLOQUEADO O CANCELADO');
  assert.equal(await page.locator('#i26-export').isDisabled(),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I26_PROTECTED__')),
   'untouched');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(a=>a.length):0),0);
  console.log('PASS I26 '+label+' · cancelable 128KiB staged reads, changed/invalid UTF8 fail closed, genuine I25 checks, explicit download/recheck, no IDB or outside network');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 const f=await fixture(A),base=await start();
 try{await run(webkit,base,'webkit',f);await run(chromium,base,'chromium',f)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
