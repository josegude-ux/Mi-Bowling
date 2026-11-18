/* MI BOWLING I28 · WebKit Linux mobile and Chromium desktop.
 * HTTPS localhost only; external requests blocked; synthetic A/B/C files.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),os=require('node:os'),https=require('node:https'),
 cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A}=require('./i28-efficiency-fixture.cjs');
const ROOT=path.resolve(__dirname,'..');
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i28-'));
let server;
const upload=(name,value)=>({name,mimeType:'application/json',
 buffer:Buffer.from(value,'utf8')});
async function start(){
 const key=path.join(TMP,'key.pem'),cert=path.join(TMP,'crt.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},
  (req,res)=>{
   if(req.url==='/__blank'){
    res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
    res.end('<!doctype html><title>I28</title>');return;
   }
   const file=path.resolve(ROOT,decodeURIComponent(
    new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
   if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||
    !fs.statSync(file).isFile()){res.writeHead(404);res.end('not found');return}
   res.writeHead(200,{'Content-Type':file.endsWith('.js')?
    'application/javascript':'text/html','Cache-Control':'no-store',
    'Referrer-Policy':'no-referrer'});res.end(fs.readFileSync(file));
  });
 await new Promise((ok,no)=>{
  server.once('error',no);server.listen(0,'127.0.0.1',ok);
 });
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
  await page.evaluate(()=>localStorage.setItem('__I28_PROTECTED__','unchanged'));
  await page.goto(base+'/lab/integracion-main-auth-i28.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I28-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('#i28-files .stage').count(),7);
  assert.equal(await page.locator('#i28-export').isDisabled(),true);
  assert.equal(await page.locator('#i28-profile').inputValue(),'constrained');
  const wait=async phrase=>{
   await page.waitForFunction(p=>(document.querySelector('#i28-status')
    ?.textContent||'').includes(p),phrase,{timeout:85000});
   return page.locator('#i28-status').textContent();
  };
  async function files(raws){
   for(let i=0;i<7;i++){
    const stage='I'+(i+18);
    await page.locator('#i28-file-'+stage).setInputFiles(
     raws[i]===null?[]:upload(stage+'.json',raws[i]));
   }
  }
  await files(fx.raws);
  await page.locator('#i28-run').click();
  await wait('HOLD-INTERNAL-CONSISTENCY-ONLY');
  assert.equal(await page.locator('#i28-matrix tr').count(),7);
  assert.match(await page.locator('#i28-status').innerText(),/Tiempo observado local:/);
  assert.match(await page.locator('#i28-status').innerText(),
   /Memoria RAM: NO MEDIDA en este navegador/);
  assert.equal(await page.locator('#i28-export').isDisabled(),false);
  const [download]=await Promise.all([
   page.waitForEvent('download',{timeout:20000}),
   page.locator('#i28-export').click()
  ]);
  assert.match(download.suggestedFilename(),/MI-BOWLING-I28-PERFIL-[a-f0-9]{12}\.audit25/);
  const filename=path.join(TMP,label+'.audit25');
  await download.saveAs(filename);
  const packet=JSON.parse(fs.readFileSync(filename,'utf8'));
  assert.equal(packet.authority,'none');
  assert.equal(packet.operationalApproval,false);
  assert.equal(packet.externalCustodyProven,false);
  assert.equal(packet.sources.length,7);
  assert.equal(packet.sources[2],fx.raws[2]);
  // Changing the profile invalidates the previous result.
  await page.locator('#i28-profile').selectOption('standard');
  assert.equal(await page.locator('#i28-export').isDisabled(),true);
  await page.locator('#i28-run').click();
  await wait('HOLD-INTERNAL-CONSISTENCY-ONLY');
  await page.locator('#i28-profile').selectOption('constrained');
  // Only actual input size is limited; 4MiB over-limit file must fail before reads.
  await page.locator('#i28-file-I22').setInputFiles({
   name:'over-limit.json',mimeType:'application/json',
   buffer:Buffer.alloc(4*1024*1024+1,0x20)
  });
  await page.locator('#i28-run').click();
  assert.match(await wait('I28 BLOQUEADO O CANCELADO'),/profile file budget exceeded/);
  assert.equal(await page.locator('#i28-export').isDisabled(),true);
  await page.locator('#i28-file-I22').setInputFiles(upload('i22.json',fx.raws[4]));
  await page.locator('#i28-run').click();await wait('HOLD-INTERNAL-CONSISTENCY-ONLY');
  // Malformed UTF8 must fail closed with no stale export from the previous run.
  await page.locator('#i28-file-I23').setInputFiles({
   name:'invalid-utf8.json',mimeType:'application/json',
   buffer:Buffer.from([0xc3,0x28])
  });
  await page.locator('#i28-run').click();await wait('I28 BLOQUEADO O CANCELADO');
  assert.equal(await page.locator('#i28-export').isDisabled(),true);
  await page.locator('#i28-file-I23').setInputFiles(upload('i23.json',fx.raws[5]));
  await page.locator('#i28-pin-I24').fill('f'.repeat(64));
  await page.locator('#i28-run').click();await wait('QUARANTINE-UNTRUSTED-PIN-MISMATCH');
  await page.locator('#i28-pin-I24').fill('');
  await page.locator('#i28-file-I19').setInputFiles([]);
  await page.locator('#i28-run').click();await wait('HOLD-INCOMPLETE-STAGE-CHAIN');
  // Explicit cancel with deliberate artificial read latency in the test browser.
  await page.evaluate(()=>{
   const original=Blob.prototype.arrayBuffer;
   Blob.prototype.arrayBuffer=async function(){
    await new Promise(resolve=>setTimeout(resolve,50));
    return original.call(this);
   };
  });
  const large=fx.raws.slice();large[6]+=' '.repeat(900*1024);
  await files(large);
  await page.locator('#i28-run').click();
  await page.locator('#i28-cancel').click();
  await wait('I28 BLOQUEADO O CANCELADO');
  assert.equal(await page.locator('#i28-export').isDisabled(),true);
  await page.locator('#i28-clear').click();
  assert.match(await page.locator('#i28-status').innerText(),/informe local descartado/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I28_PROTECTED__')),
   'unchanged');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(a=>a.length):0),0);
  console.log('PASS I28 '+label+' · profile 4/8 vs 12/28MiB, local elapsed observation without RAM claim, preflight pressure, error retry, cancel and no writes/network');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 const f=await fixture(A),base=await start();
 try{await run(webkit,base,'webkit',f);await run(chromium,base,'chromium',f)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
