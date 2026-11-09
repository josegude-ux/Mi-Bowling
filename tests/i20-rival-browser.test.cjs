/* MI BOWLING I20 · Chromium/WebKit offline rival-review preservation.
 * The 127.0.0.1 ephemeral HTTPS server is private and synthetic only.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const {fixture,A,clone}=require('./i20-rival-fixture.cjs');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i20-'));
let server;
const upload=(name,x)=>({name,mimeType:'application/json',
 buffer:Buffer.from(typeof x==='string'?x:JSON.stringify(x))});
async function start(){
 const key=path.join(TMP,'key.pem'),cert=path.join(TMP,'cert.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},
  (req,res)=>{
   if(req.url==='/__blank'){
    res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
    res.end('<!doctype html><title>I20</title>');return;
   }
   const file=path.resolve(ROOT,decodeURIComponent(new URL(req.url,
    'https://127.0.0.1').pathname).replace(/^\/+/,''));
   if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||
    !fs.statSync(file).isFile()){res.writeHead(404);res.end('not found');return}
   res.writeHead(200,{'Content-Type':file.endsWith('.js')?
    'application/javascript':'text/html','Cache-Control':'no-store',
    'Referrer-Policy':'no-referrer'});res.end(fs.readFileSync(file));
  });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function run(engine,base,label,f){
 const browser=await engine.launch(label==='chromium'?{
  executablePath:cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),
  headless:true,args:['--no-sandbox']}:{headless:true});
 const ctx=await browser.newContext({locale:'es-ES',ignoreHTTPSErrors:true,
  acceptDownloads:true,viewport:{width:label==='webkit'?390:1280,height:844}});
 await ctx.route('**/*',route=>route.request().url().startsWith(base+'/')?
  route.continue():route.abort());
 try{
  const page=await ctx.newPage();
  await page.goto(base+'/__blank');
  await page.evaluate(()=>localStorage.setItem('__I20_PROTECTED__','untouched'));
  await page.goto(base+'/lab/integracion-main-auth-i20.html');
  assert.equal(await page.locator('body').getAttribute('data-lab'),'I20-OFFLINE-READONLY');
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('#i20-request').isDisabled(),true);
  await page.locator('#i20-dossier').setInputFiles(upload('fictitious.hold18',f.dossier));
  for(let i=0;i<3;i++)
   await page.locator('#i20-claim-'+['A','B','C'][i]).setInputFiles(
    upload('copy'+i+'.review19',f.fullReview[i].review));
  async function wait(x){
   await page.waitForFunction(q=>(document.querySelector('#i20-status')
    ?.textContent||'').includes(q),x,{timeout:50000});
   return page.locator('#i20-status').textContent();
  }
  await page.locator('#i20-build').click();
  assert.match(await wait('QUARANTINE-DIVERGENT'),/Sin|No demuestra/);
  assert.equal(await page.locator('#i20-request').isDisabled(),false);
  await page.locator('#i20-request').click();
  await wait('REVISIÓN EXTERNA SOLICITADA EN EL REGISTRO LOCAL');
  assert.equal(await page.locator('#i20-request').isDisabled(),true);
  const [download]=await Promise.all([
   page.waitForEvent('download',{timeout:20000}),
   page.locator('#i20-download').click()
  ]);
  assert.match(download.suggestedFilename(),/MI-BOWLING-I20-.*\.hold20$/);
  const filename=path.join(TMP,label+'.hold20');
  await download.saveAs(filename);
  const packet=JSON.parse(fs.readFileSync(filename,'utf8'));
  assert.equal(packet.status,'external-review-requested');
  assert.equal(packet.classification,'quarantine-divergent');
  assert.equal(packet.authority,'none');
  assert.equal(packet.operationalApproval,false);
  assert.equal(packet.claims.length,3);
  assert.equal(packet.claims[1].review.reviewDigest,f.acClosed.reviewDigest);
  await page.locator('#i20-saved').setInputFiles(upload('saved.hold20',packet));
  await page.locator('#i20-pin').fill(packet.packetDigest);
  await page.locator('#i20-check').click();
  assert.match(await wait('PAQUETE INTERNAMENTE COHERENTE'),/comparación correcta/);
  const changed=clone(packet);changed.operationalApproval=true;
  await page.locator('#i20-saved').setInputFiles(upload('fake.hold20',changed));
  await page.locator('#i20-check').click();
  await wait('I20 BLOQUEADO');
  await page.locator('#i20-i18-pin').fill('f'.repeat(64));
  assert.equal(await page.locator('#i20-download').isDisabled(),true);
  await page.locator('#i20-i18-pin').fill('');
  await page.locator('#i20-claim-A').setInputFiles(upload('sameA.review19',f.abClosed));
  await page.locator('#i20-claim-B').setInputFiles(upload('sameB.review19',f.abClosed));
  await page.locator('#i20-claim-C').setInputFiles([]);
  await page.locator('#i20-build').click();
  await wait('HOLD-DUPLICATE-CLAIMS');
  await page.locator('#i20-dossier').setInputFiles(upload('lost.hold18',f.total));
  for(const slot of ['A','B'])await page.locator('#i20-claim-'+slot).setInputFiles([]);
  await page.locator('#i20-build').click();
  await wait('HOLD-INSUFFICIENT');
  await page.locator('#i20-request').click();
  await wait('REVISIÓN EXTERNA SOLICITADA EN EL REGISTRO LOCAL');
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I20_PROTECTED__')),
   'untouched');
  assert.equal(await page.evaluate(()=>typeof indexedDB.databases==='function'?
   indexedDB.databases().then(x=>x.length):0),0);
  console.log('PASS I20 '+label+' · divergent rivals preserved, duplicates no human independence, total I18 trust loss, external request not sent, optional digest, tamper blocked, explicit export, no IDB/outside network');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 const f=await fixture(A),base=await start();
 try{await run(webkit,base,'webkit',f);await run(chromium,base,'chromium',f)}
 finally{await new Promise(ok=>server.close(ok));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
