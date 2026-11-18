/* MI BOWLING · LAB I5 · REAL browser close/reopen encrypted WAL test.
 * Origin is local ephemeral HTTPS and every player/score/secret is synthetic.
 * Real IndexedDB persistence, not the I4 memory journal.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const https=require('node:https'),cp=require('node:child_process'),{webkit,chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bowling-i5-pwa-'));
let server;
const IDs={A:'11111111-1111-4111-8111-111111111111',B:'22222222-2222-4222-8222-222222222222',C:'33333333-3333-4333-8333-333333333333'};
const URL_PATH='/lab/integracion-main-auth-i5.html';
const pass=l=>'Fictitious-Independent-Secret-'+l+'-2026';
async function serve(){
 const cert=path.join(tmp,'cert.pem'),key=path.join(tmp,'key.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
  if(req.url==='/__blank'){
   res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   res.end('<!doctype html><title>I5 raw origin check</title>');return;
  }
  const rel=decodeURIComponent(new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,'');
  const f=path.resolve(root,rel);
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){
   res.writeHead(404);res.end('not found');return;
  }
  const ext=path.extname(f);
  res.writeHead(200,{'Content-Type':ext==='.js'?'application/javascript':ext==='.css'?'text/css':
   ext==='.json'?'application/json':ext==='.png'?'image/png':'text/html',
   'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end(fs.readFileSync(f));
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function accessRow(page,owner,{corrupt=false}={}){
 return page.evaluate(async({owner,corrupt})=>{
  const db=await new Promise((resolve,reject)=>{
   const q=indexedDB.open('mi-bowling-i5-lab-encrypted-pending-v1',1);
   q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction('encrypted-wal',corrupt?'readwrite':'readonly');
   const store=tx.objectStore('encrypted-wal');
   const req=store.get(owner);let row;
   req.onsuccess=()=>{
    row=req.result||null;
    if(corrupt&&row){row.cipher='AAAA'+row.cipher.slice(4);store.put(row);}
   };
   tx.oncomplete=()=>resolve(row);
   tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  })}finally{db.close()}
 },{owner,corrupt});
}
async function login(page,letter,phrase=pass(letter)){
 await page.locator('#lab-i5-passphrase').fill(phrase);
 await page.locator('[data-demo-account="'+letter+'"]').click();
}
async function status(page){return page.evaluate(()=>window.MiBowlingIntegrationI5?.getState())}
async function expected(page,predicate,value,timeout=20000){
 return page.waitForFunction(([which,x])=>{
  const s=window.MiBowlingIntegrationI5?.getState();
  if(which==='opened')return s?.opened&&s.owner===x&&s.persistence?.phase==='ready';
  if(which==='pending')return s?.persistence?.pending&&s.persistence.blocked==='uncertain';
  if(which==='recovery')return s?.persistence?.blocked==='recovery'&&s.recoveryOnly&&!s.opened;
  if(which==='saved')return s?.opened&&!s.persistence?.pending&&s.persistence?.blocked===null;
  return false;
 },[predicate,value],{timeout});
}
async function go(page,base){await page.goto(base+URL_PATH);assert.equal(await page.locator('body').getAttribute('data-lab-isolation'),'PASS');}
async function webkitRecovery(browser,base){
 const ctx=await browser.newContext({...devices['iPhone 13 Pro Max'],
  viewport:{width:390,height:844},ignoreHTTPSErrors:true,locale:'es-ES'});
 await ctx.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
 try{
  let p=await ctx.newPage();
  await p.goto(base+'/__blank');
  await p.evaluate(()=>localStorage.setItem('__I5_NATIVE_SENTINEL__','must-remain'));
  await go(p,base);
  await login(p,'A');await expected(p,'opened',IDs.A);
  assert.equal((await status(p)).encryptedJournalUnlocked,true);
  assert.equal(await p.evaluate(()=>window.indexedDB),undefined,'main cannot access native IDB');
  await p.evaluate(()=>window.MiBowlingIntegrationI5.simulateNetworkFailure(true));
  await p.evaluate(()=>Function('db.sessions.push({id:"I5-WAL-PENDING-A",type:"entrenamiento",date:"2026-11-09",games:[{id:"wal-game-A",includeStats:true,rolls:[]}]});save()')());
  await expected(p,'pending');
  assert.equal(await p.evaluate(()=>MiBowlingIntegrationI5.hasOwnerPending()),true);
  // Close the actual tab. All JS state and key are destroyed, but the WAL must survive.
  await p.close();
  p=await ctx.newPage();
  await p.goto(base+'/__blank');
  const raw=await accessRow(p,IDs.A);
  assert.ok(raw&&raw.v===1&&raw.id===IDs.A);
  assert.ok(raw.cipher.length>100&&raw.salt.length>10&&raw.iv.length>10);
  assert.equal(JSON.stringify(raw).includes('I5-WAL-PENDING-A'),false,'plaintext leaked to native IDB');
  assert.equal(JSON.stringify(raw).includes('wal-game-A'),false,'game leaked to native IDB');
  assert.equal(await p.evaluate(()=>localStorage.getItem('__I5_NATIVE_SENTINEL__')),'must-remain');
  await go(p,base);
  // A second, explicit same-tab browser reload must preserve the encrypted row
  // while discarding the previous execution's fake identity and unlock key.
  await p.reload();
  assert.equal(await p.locator('body').getAttribute('data-lab-isolation'),'PASS');
  assert.equal((await status(p)).opened,false);
  await login(p,'A','Incorrect-Independent-Secret-2026');
  await p.locator('#lab-safety-status:not([hidden])').waitFor({timeout:15000});
  assert.equal((await status(p)).opened,false);
  await p.goto(base+'/__blank');
  assert.deepEqual(await accessRow(p,IDs.A),raw,'incorrect passphrase cannot alter pending ciphertext');
  await go(p,base);
  await login(p,'B');
  await expected(p,'opened',IDs.B);
  assert.equal((await status(p)).persistence.pending,false);
  assert.equal(await p.evaluate(async()=>{
   const j=await MiBowlingI5EncryptedJournal.unlock({owner:'22222222-2222-4222-8222-222222222222',
    passphrase:'Fictitious-Independent-Secret-B-2026'});
   try{await j.read('11111111-1111-4111-8111-111111111111');return false}
   catch(err){return /identidad cruzada/.test(err.message)}
   finally{j.close()}
  }),true,'foreign A cannot be read with B unlock');
  await p.goto(base+'/__blank');
  assert.deepEqual(await accessRow(p,IDs.A),raw,'B read or sign-in altered A encrypted record');
  await go(p,base);
  await login(p,'A');await expected(p,'recovery');
  assert.equal(await p.locator('#lab-live-app').isHidden(),true,
   'pending must not load mutable engine before recovery');
  const checked=await p.evaluate(()=>MiBowlingIntegrationI5.inspectPending());
  assert.equal(checked.status,'can-resume');
  const proof=await p.evaluate(()=>MiBowlingIntegrationI5.verifyPending());
  assert.equal(proof.owner,IDs.A);assert.equal(proof.checksum.length,64);
  await p.locator('#lab-i4-recover').click();
  await p.waitForFunction(()=>window.MiBowlingIntegrationI5?.getState()?.opened&&
   window.MiBowlingIntegrationI5?.getState()?.persistence?.phase==='saved');
  const loaded=await p.evaluate(()=>Function('return db.sessions.map(s=>s.id)')());
  assert.ok(loaded.includes('I5-WAL-PENDING-A'),'score draft recovered into verified engine');
  assert.equal(await p.evaluate(()=>MiBowlingIntegrationI5.hasOwnerPending()),false);
  await p.goto(base+'/__blank');
  assert.equal(await accessRow(p,IDs.A),null,'confirmed journal not cleared after recovery');
  assert.equal(await p.evaluate(()=>localStorage.getItem('__I5_NATIVE_SENTINEL__')),'must-remain');
  console.log('PASS I5 WebKit · REAL tab close/open, ciphertext survives, wrong key & B blocked, explicit recovery');
 }finally{await ctx.close()}
}
async function chromiumTamper(browser,base){
 const ctx=await browser.newContext({viewport:{width:1440,height:900},
  ignoreHTTPSErrors:true,locale:'es-ES'});
 await ctx.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
 try{
  let p=await ctx.newPage();await go(p,base);await login(p,'C');await expected(p,'opened',IDs.C);
  await p.evaluate(()=>MiBowlingIntegrationI5.simulateNetworkFailure(true));
  await p.evaluate(()=>Function('db.sessions.push({id:"I5-C-TAMPER",type:"entrenamiento",date:"2026-11-09",games:[{id:"C-test",rolls:[]}]});save()')());
  await expected(p,'pending');
  await p.close();
  p=await ctx.newPage();await p.goto(base+'/__blank');
  const changed=await accessRow(p,IDs.C,{corrupt:true});
  assert.ok(changed&&changed.cipher.startsWith('AAAA'));
  await go(p,base);await login(p,'C');
  await p.locator('#lab-safety-status:not([hidden])').waitFor({timeout:15000});
  assert.equal((await status(p)).opened,false);
  await p.goto(base+'/__blank');
  assert.deepEqual(await accessRow(p,IDs.C),changed,'corrupt journal must remain for manual repair, not silently discarded');
  console.log('PASS I5 Chromium · GCM tamper detected and fail-closed without data overwrite');
 }finally{await ctx.close()}
}
async function main(){
 const base=await serve();
 const wk=await webkit.launch({headless:true});
 try{await webkitRecovery(wk,base)}finally{await wk.close()}
 const chrome=cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim();
 const ch=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
 try{await chromiumTamper(ch,base)}finally{await ch.close()}
 console.log('PASS I5 · encrypted IndexedDB durability in isolated real browser contexts, not real services');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
 if(server)await new Promise(resolve=>server.close(resolve));
 fs.rmSync(tmp,{recursive:true,force:true});
});
