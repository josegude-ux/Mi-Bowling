/* MI BOWLING · LAB I8 · real browser storage resilience.
 * All data/identities/passphrases synthetic. HTTPS private loopback only.
 * The "quota" condition is deterministic IDB transaction fault injection,
 * NOT a claim of filling real disk/browser quota.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bowling-i8-'));
const UUID={A:'11111111-1111-4111-8111-111111111111',
 B:'22222222-2222-4222-8222-222222222222',
 C:'33333333-3333-4333-8333-333333333333'};
const DB='mi-bowling-i8-lab-encrypted-data-v2',URL_PATH='/lab/integracion-main-auth-i8.html';
const secret=x=>'LAB-I8-Key-Fixture-'+x+'-Never-Use-Real-Passwords';
let server,baseForTests;
async function serve(){
 const cert=path.join(tmp,'cert.pem'),key=path.join(tmp,'key.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
  if(req.url==='/__blank'){
   res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   res.end('<!doctype html><title>I8 private origin diagnostics</title>');return;
  }
  const file=path.resolve(root,decodeURIComponent(new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404);res.end('Not found');return;
  }
  const ext=path.extname(file);
  res.writeHead(200,{'Content-Type':ext==='.js'?'application/javascript':
   ext==='.css'?'text/css':ext==='.json'?'application/json':
   ext==='.png'?'image/png':'text/html',
   'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end(fs.readFileSync(file));
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function isolate(ctx,base){await ctx.route('**/*',route=>
 route.request().url().startsWith(base+'/')?route.continue():route.abort())}
async function login(page,base,letter,password=secret(letter)){
 await page.goto(base+URL_PATH);
 assert.equal(await page.locator('body').getAttribute('data-lab-isolation'),'PASS');
 await page.locator('#lab-i8-passphrase').fill(password);
 await page.locator('[data-demo-account="'+letter+'"]').click();
}
const state=p=>p.evaluate(()=>MiBowlingIntegrationI8.getState());
const status=p=>p.evaluate(()=>MiBowlingIntegrationI8.pendingOperations());
const backend=p=>p.evaluate(()=>MiBowlingIntegrationI8.confirmed());
async function ready(page,letter){
 await page.waitForFunction(id=>{
  const s=window.MiBowlingIntegrationI8?.getState();
  return s?.owner===id&&s?.opened&&['ready','saved'].includes(s.persistence?.phase);
 },UUID[letter],{timeout:22000});
}
async function forensic(page,letter){
 await page.waitForFunction(id=>{
  const s=window.MiBowlingIntegrationI8?.getState();
  return s?.owner===id&&s?.recoveryOnly&&!s.opened;
 },UUID[letter],{timeout:22000});
}
async function add(page,name){
 await page.evaluate(id=>{
  const raw={id,type:'entrenamiento',date:'2026-11-09',
   games:[{id:'g-'+id,rolls:[],includeStats:true}]};
  Function('return db')().sessions.push(
   Function('return migrate')()({sessions:[raw]}).sessions[0]);
  Function('return save')()();
 },name);
}
async function drain(p){return p.evaluate(()=>MiBowlingIntegrationI8.drain())}
async function rawRows(page,owner,store='encrypted-operations'){
 await page.goto(baseForTests+'/__blank');
 return page.evaluate(async({who,store,DB})=>{
  const db=await new Promise((ok,no)=>{
   const q=indexedDB.open(DB,2);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);
  });
  try{return await new Promise((ok,no)=>{
   const tx=db.transaction(store,'readonly');const q=tx.objectStore(store).getAll();
   q.onsuccess=()=>ok(q.result.filter(r=>r.owner===who));q.onerror=()=>no(q.error);
  })}finally{db.close()}
 },{who:owner,store,DB});
}
async function changeRaw(page,owner,kind='WAL'){
 await page.goto(baseForTests+'/__blank');
 return page.evaluate(async({owner,DB,kind})=>{
  const db=await new Promise((ok,no)=>{
   const q=indexedDB.open(DB,2);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);
  });
  const name=kind==='WAL'?'encrypted-operations':'encrypted-confirmed';
  try{return await new Promise((ok,no)=>{
   const tx=db.transaction(name,'readwrite'),store=tx.objectStore(name);
   const q=store.getAll();let changed=null;
   q.onsuccess=()=>{
    const row=q.result.find(x=>x.owner===owner);
    if(!row){tx.abort();return}
    row.cipher=(row.cipher[0]==='A'?'B':'A')+row.cipher.slice(1);
    changed=row;store.put(row);
   };
   tx.oncomplete=()=>ok(changed);
   tx.onabort=()=>no(Error('No fixture to corrupt'));
  })}finally{db.close()}
 },{owner,DB,kind});
}
async function fakeQuotaAndKey(browser,base){
 const ctx=await browser.newContext({...devices['iPhone 13 Pro Max'],
  viewport:{width:390,height:844},ignoreHTTPSErrors:true,locale:'es-ES'});
 await isolate(ctx,base);
 try{
  const a=await ctx.newPage(),b=await ctx.newPage();
  await login(b,base,'B');await ready(b,'B');
  await b.evaluate(()=>MiBowlingIntegrationI8.simulateNetworkFailure(true));
  await add(b,'I8-B-INDEPENDENT');let before=await drain(b);
  assert.equal(before.blocked,'uncertain');
  assert.equal((await status(b)).length,1);
  const beforeB=(await b.evaluate(()=>MiBowlingIntegrationI8.rawPending()))[0].checksum;
  await login(a,base,'A');await ready(a,'A');
  const baseA=await backend(a);
  await a.evaluate(()=>MiBowlingIntegrationI8.simulateQuotaOnce());
  await add(a,'I8-A-QUOTA-FAIL');
  const limited=await drain(a);
  assert.equal(limited.blocked,'journal-error');
  assert.equal(limited.failureClass,'quota');
  assert.equal(limited.volatileCount,1);
  assert.equal(limited.durableCount,0);
  assert.equal(limited.lastDurable,null);
  assert.equal((await backend(a)).revision,baseA.revision,
   'no confirmed write after aborted quota fixture');
  assert.equal((await status(a)).length,0,'quota abort leaves no counterfeit WAL');
  assert.equal((await status(b)).length,1,'quota for A cannot discard B');
  assert.equal((await b.evaluate(()=>MiBowlingIntegrationI8.rawPending()))[0].checksum,beforeB);
  await a.close();
  const after=await ctx.newPage();
  await login(after,base,'A');await ready(after,'A');
  assert.equal((await backend(after)).revision,baseA.revision);
  assert.equal((await status(after)).length,0,
   'unacknowledged volatile score cannot be claimed as recovered');
  console.log('PASS I8 WebKit · simulated QuotaExceededError aborts transaction, no false ACK, confirmed A and WAL B unchanged');
  await after.close();
  // Lost/wrong key must fail closed and retain EXACT original ciphertext.
  const witness=await ctx.newPage();
  const rawBefore=await rawRows(witness,UUID.B);
  assert.equal(rawBefore.length,1);
  await login(witness,base,'B','LAB-INCORRECT-KEY-DO-NOT-REUSE');
  await forensic(witness,'B');
  const wrong=await witness.evaluate(()=>MiBowlingIntegrationI8.auditEncryptedPending());
  assert.equal(wrong.total,1);
  assert.equal(wrong.unreadable,1);
  assert.equal(wrong.failClosed,true);
  const rawAfter=await rawRows(witness,UUID.B);
  assert.deepEqual(rawAfter,rawBefore,'bad/lost key must not alter ciphertext');
  await login(witness,base,'B');await forensic(witness,'B');
  const good=await witness.evaluate(()=>MiBowlingIntegrationI8.auditEncryptedPending());
  assert.equal(good.valid,1);assert.equal(good.unreadable,0);
  assert.equal((await status(witness)).length,1);
  console.log('PASS I8 WebKit · wrong/lost key fails closed, read-only audit, correct key restores access with WAL intact');
  await a.close().catch(()=>{});await b.close();await witness.close();
 }finally{await ctx.close()}
}
async function actualBlock(browser,base){
 const ctx=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:850}});
 await isolate(ctx,base);
 try{
  const blocker=await ctx.newPage();await blocker.goto(base+'/__blank');
  await blocker.evaluate(DB=>new Promise((ok,no)=>{
   const q=indexedDB.open(DB,1);
   q.onsuccess=()=>{window.__idbBlocker=q.result;ok(true)};
   q.onerror=()=>no(q.error);
  }),DB);
  const p=await ctx.newPage();
  await login(p,base,'A');await forensic(p,'A');
  const blockedState=await state(p);
  assert.equal(blockedState.opened,false,'do not load CP-020 while IDB upgrade blocked');
  assert.equal(await p.locator('#lab-live-app').isHidden(),true);
  const info=await p.locator('#lab-i4-recovery-status').textContent();
  assert.match(info,/bloquead/i);
  // Closing the old IDB connection releases the version-upgrade lock.
  await blocker.evaluate(()=>window.__idbBlocker.close());
  await new Promise(ok=>setTimeout(ok,250));
  await login(p,base,'A');await ready(p,'A');
  assert.equal((await backend(p)).revision,0);
  assert.equal((await status(p)).length,0);
  console.log('PASS I8 Chromium · real IndexedDB version-upgrade block fails closed and recovers after releasing old connection');
 }finally{await ctx.close()}
}
async function corruption(browser,base){
 const ctx=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1366,height:900}});
 await isolate(ctx,base);
 try{
  const p=await ctx.newPage();
  await login(p,base,'A');await ready(p,'A');
  await p.evaluate(()=>MiBowlingIntegrationI8.simulateNetworkFailure(true));
  await add(p,'I8-A-WAL-VALID');
  await add(p,'I8-A-WAL-TAMPER');
  let q=await drain(p);
  assert.equal(q.volatileCount,0);
  assert.equal((await status(p)).length,2);
  await p.close();
  const audit=await ctx.newPage();await audit.goto(base+'/__blank');
  const tampered=await changeRaw(audit,UUID.A);
  assert.ok(tampered&&tampered.kind==='WAL');
  const rawBefore=await rawRows(audit,UUID.A);
  assert.equal(rawBefore.length,2);
  await login(audit,base,'A');await forensic(audit,'A');
  assert.equal((await state(audit)).opened,false);
  assert.equal(await audit.locator('#lab-live-app').isHidden(),true);
  const report=await audit.evaluate(()=>MiBowlingIntegrationI8.auditEncryptedPending());
  assert.deepEqual({total:report.total,valid:report.valid,unreadable:report.unreadable},
   {total:2,valid:1,unreadable:1});
  assert.equal(report.failClosed,true);
  const rawAfter=await rawRows(audit,UUID.A);
  assert.deepEqual(rawAfter,rawBefore,'corruption audit must not delete or rewrite any WAL');
  await login(audit,base,'B');await ready(audit,'B');
  assert.equal((await status(audit)).length,0,'B must remain usable despite corrupted A');
  await login(audit,base,'C');await ready(audit,'C');
  assert.equal((await status(audit)).length,0,'C must remain usable despite corrupted A');
  console.log('PASS I8 Chromium · one corrupt WAL blocks A, preserves both ciphertexts, B/C unaffected');
  await audit.close();
 }finally{await ctx.close()}
}
async function persistentRestart(browserType,base){
 const profile=fs.mkdtempSync(path.join(tmp,'persistent-profile-'));
 const binary=cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim();
 const launch=()=>browserType.launchPersistentContext(profile,{
  executablePath:binary,headless:true,args:['--no-sandbox'],
  ignoreHTTPSErrors:true,viewport:{width:1280,height:850},locale:'es-ES'
 });
 let first=await launch();
 await isolate(first,base);
 try{
  let p=await first.newPage();
  await login(p,base,'A');await ready(p,'A');
  // Normalize CP-020 legacy fixture before testing additive three-way merge.
  await p.evaluate(()=>Function('return save')()());
  const normalized=await drain(p);
  assert.equal(normalized.revision,1);
  await p.evaluate(()=>MiBowlingIntegrationI8.simulateNetworkFailure(true));
  await add(p,'I8-RESTART-ONE');await add(p,'I8-RESTART-TWO');
  const queued=await drain(p);
  assert.equal(queued.volatileCount,0);
  assert.equal(queued.blocked,'uncertain');
  const before=(await status(p));
  assert.equal(before.length,2);
  const twoIds=new Set(before.map(x=>x.opId));assert.equal(twoIds.size,2);
  await first.close();first=null; // Entire Chromium process/profile closed.
  let second=await launch();
  await isolate(second,base);
  try{
   p=await second.newPage();
   await login(p,base,'A');await forensic(p,'A');
   let entries=await status(p);
   assert.equal(entries.length,2);
   assert.ok(entries.every(x=>twoIds.has(x.opId)));
   const firstResult=await p.evaluate(id=>MiBowlingIntegrationI8.recoverOperation(id),entries[0].opId);
   assert.equal(firstResult.status,'saved');
   entries=await status(p);assert.equal(entries.length,1);
   assert.equal(entries[0].status,'conflict');
   const merged=await p.evaluate(id=>MiBowlingIntegrationI8.mergeOperation(
    id,'CONFIRMAR-FUSION-FICTICIA'),entries[0].opId);
   assert.equal(merged.status,'merged');
   const confirmed=await backend(p);
   assert.equal(confirmed.revision,3);
   assert.ok(confirmed.payload.sessions.some(s=>s.id==='I8-RESTART-ONE'));
   assert.ok(confirmed.payload.sessions.some(s=>s.id==='I8-RESTART-TWO'));
   assert.equal((await status(p)).length,0);
   await p.reload();
   await p.locator('#lab-i8-passphrase').fill(secret('A'));
   await p.locator('[data-demo-account="A"]').click();
   await ready(p,'A');
   assert.equal((await backend(p)).revision,3);
   console.log('PASS I8 Chromium · true full-browser process restart keeps two encrypted operations, selective recover + idempotent merge');
  }finally{await second.close()}
 }finally{if(first)await first.close();fs.rmSync(profile,{recursive:true,force:true})}
}
async function main(){
 const base=await serve();baseForTests=base;
 const wk=await webkit.launch({headless:true});
 try{await fakeQuotaAndKey(wk,base)}finally{await wk.close()}
 const binary=cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim();
 const chrome=await chromium.launch({headless:true,executablePath:binary,args:['--no-sandbox']});
 try{await actualBlock(chrome,base);await corruption(chrome,base)}finally{await chrome.close()}
 await persistentRestart(chromium,base);
 console.log('PASS I8 · quota simulation, real blocked IDB upgrade, corruption, lost key, full process restart and multi-WAL recovery');
}
main().catch(err=>{console.error(err);process.exitCode=1}).finally(async()=>{
 if(server)await new Promise(ok=>server.close(ok));
 fs.rmSync(tmp,{recursive:true,force:true});
});
