/* MI BOWLING I12 LAB · real browser file-only A/B/C synthetic checks. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i12-'));
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const PASS='LAB-I12-EXTERNAL-TEST-EVIDENCE-2026';
let server;
function entry(name,txt){return{name,mimeType:'application/json',buffer:Buffer.from(txt)}}
async function start(){
 const crt=path.join(TMP,'cert.pem'),key=path.join(TMP,'key.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',crt,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(crt)},(req,res)=>{
  if(req.url==='/__blank'){
   res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   res.end('<!doctype html><title>Standalone LAB I12</title>');return}
  const f=path.resolve(ROOT,decodeURIComponent(new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
  if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){
   res.writeHead(404);res.end('Not found');return}
  res.writeHead(200,{'Content-Type':f.endsWith('.js')?'application/javascript':'text/html',
   'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end(fs.readFileSync(f));
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return'https://127.0.0.1:'+server.address().port;
}
async function test(engine,base,label){
 const browser=await engine.launch(label==='chromium'?{
  executablePath:cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim(),
  headless:true,args:['--no-sandbox']}:{headless:true});
 const ctx=await browser.newContext({ignoreHTTPSErrors:true,acceptDownloads:true,
  locale:'es-ES',viewport:{width:label==='webkit'?390:1240,height:840}});
 await ctx.route('**/*',route=>route.request().url().startsWith(base+'/')?
  route.continue():route.abort());
 try{
  const p=await ctx.newPage();
  await p.goto(base+'/__blank');
  await p.evaluate(()=>localStorage.setItem('__I12_NO_TOUCH__','preserved'));
  await p.goto(base+'/lab/integracion-main-auth-i12.html');
  assert.equal(await p.locator('body').getAttribute('data-lab'),'I12-OFFLINE-READONLY');
  assert.equal(await p.locator('script[src*="app.js"]').count(),0);
  assert.equal(await p.locator('script[src*="encrypted-store"]').count(),0);
  assert.equal(await p.evaluate(()=>localStorage.getItem('__I12_NO_TOUCH__')),'preserved');
  const result=await p.evaluate(async({A,B,C,PASS})=>{
   const C11=MiBowlingI11AuditCore,E=MiBowlingI11Evidence,M=MiBowlingI12Manifest;
   const id=n=>String(n).padStart(8,'0')+'-1111-4111-8111-111111111111';
   const event=async(n,previous,kind='restore')=>C11.append(A,{
    kind,reason:kind==='restore'?'none':'stale',status:kind==='restore'?'restored':'rejected',
    auditId:id(n),backupId:id(n+20),backupSha:'a'.repeat(64),
    occurredAt:1794200000000+n,sourceCreatedAt:1794000000000+n,
    revision:n,operationsAdded:kind==='restore'?1:0
   },previous?.chainHash||C11.ZERO,n);
   const one=await event(1),two=await event(2,one,'conflict');
   const toFile=async(owner,ev)=>E.seal({version:1,owner,events:ev,
    head:C11.head(owner,ev)},PASS);
   const first=await toFile(A,[one]),second=await toFile(A,[one,two]);
   const sources=[first,second].map(file=>({file,passphrase:PASS}));
   const manifest=await M.build(A,sources);
   const other=await Promise.all([toFile(B,[]),toFile(C,[])]);
   return{first,second,manifest,pin:M.pin(manifest),other};
  },{A,B,C,PASS});
  await p.locator('#i12-pass').fill(PASS);
  const setFiles=arr=>p.locator('#i12-files').setInputFiles(arr.map((v,i)=>
   entry('witness'+i+'.mae11',v)));
  await setFiles([result.first,result.second]);
  let promise=p.waitForEvent('download');
  await p.locator('#i12-build').click();
  let download=await promise;
  assert.ok(download.suggestedFilename().endsWith('.mami12'));
  assert.match(await p.locator('#i12-status').textContent(),/manifiesto descargado/);
  promise=p.waitForEvent('download');
  await p.locator('#i12-pin-download').click();
  download=await promise;
  assert.ok(download.suggestedFilename().endsWith('.pin12'));
  await p.locator('#i12-manifest-file').setInputFiles(entry('manifest.mami12',
   JSON.stringify(result.manifest)));
  await p.locator('#i12-pin-file').setInputFiles(entry('latest.pin12',
   JSON.stringify(result.pin)));
  await p.locator('#i12-verify').click();
  await p.locator('#i12-status').getByText('VERIFICADO CON PIN EXTERNO').waitFor();
  await p.locator('#i12-current-file').setInputFiles(entry('old.mae11',result.first));
  await p.locator('#i12-compare').click();
  await p.locator('#i12-status').getByText('rollback-or-suppression-detected').waitFor();
  const tampered=JSON.parse(result.second);
  tampered.ciphertext=(tampered.ciphertext[0]==='A'?'B':'A')+tampered.ciphertext.slice(1);
  await setFiles([result.first,JSON.stringify(tampered)]);
  await p.locator('#i12-verify').click();
  await p.locator('#i12-status').getByText('I12 BLOQUEADO').waitFor();
  await setFiles([result.first,result.second]);
  await p.locator('#i12-owner').selectOption(B);
  await p.locator('#i12-verify').click();
  await p.locator('#i12-status').getByText('I12 BLOQUEADO').waitFor();
  assert.equal(await p.evaluate(()=>localStorage.getItem('__I12_NO_TOUCH__')),'preserved');
  assert.equal(await p.evaluate(()=>indexedDB.databases().then(x=>x.length)),0);
  for(const owner of [B,C]){
   const file=result.other[owner===B?0:1];
   const checked=await p.evaluate(async({owner,file,PASS})=>{
    const m=await MiBowlingI12Manifest.build(owner,[{file,passphrase:PASS}]);
    return MiBowlingI12Manifest.verify(m,[{file,passphrase:PASS}],owner,MiBowlingI12Manifest.pin(m));
   },{owner,file,PASS});
   assert.equal(checked.verified,true);
  }
  console.log('PASS I12 '+label+' · readonly iPhone/desktop UI, two real downloads, pin, rollback, tamper, cross-owner A/B/C, no IDB writes');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 const base=await start();
 try{await test(webkit,base,'webkit');await test(chromium,base,'chromium')}
 finally{await new Promise(done=>server.close(done));fs.rmSync(TMP,{recursive:true,force:true})}
})().catch(err=>{console.error(err);process.exitCode=1});
