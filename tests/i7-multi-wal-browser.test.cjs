/* MI BOWLING · LAB I7 · real-browser encrypted per-tab/per-operation WAL.
 * Synthetic player UUIDs and scores only. Local HTTPS, no external network.
 * Verifies durability ACK, loss before/after commit, multi-WAL merge and RLS.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bowling-i7-'));
const UUID={A:'11111111-1111-4111-8111-111111111111',
 B:'22222222-2222-4222-8222-222222222222',
 C:'33333333-3333-4333-8333-333333333333'};
const secret=x=>'LAB-Fixture-Only-'+x+'-Different-From-Real-2026';
let server;
async function serve(){
 const crt=path.join(tmp,'cert.pem'),key=path.join(tmp,'key.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',crt,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(crt)},(req,res)=>{
  if(req.url==='/__blank'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   res.end('<!doctype html><title>I7 raw origin check</title>');return}
  const f=path.resolve(root,decodeURIComponent(new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){
   res.writeHead(404);res.end('Not found');return;
  }
  const ext=path.extname(f);
  res.writeHead(200,{'Content-Type':ext==='.js'?'application/javascript':
   ext==='.css'?'text/css':ext==='.json'?'application/json':
   ext==='.png'?'image/png':'text/html','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end(fs.readFileSync(f));
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return 'https://127.0.0.1:'+server.address().port;
}
const state=p=>p.evaluate(()=>MiBowlingIntegrationI7.getState());
const status=p=>p.evaluate(()=>MiBowlingIntegrationI7.pendingOperations());
const confirmed=p=>p.evaluate(()=>MiBowlingIntegrationI7.confirmed());
const rawPending=p=>p.evaluate(()=>MiBowlingIntegrationI7.rawPending());
const engineSessions=p=>p.evaluate(()=>Function('return db.sessions.map(s=>s.id)')());
async function open(page,base,letter,pass=secret(letter)){
 await page.goto(base+'/lab/integracion-main-auth-i7.html');
 assert.equal(await page.locator('body').getAttribute('data-lab-isolation'),'PASS');
 await page.locator('#lab-i7-passphrase').fill(pass);
 await page.locator('[data-demo-account="'+letter+'"]').click();
}
async function waitFor(page,kind,owner){
 await page.waitForFunction(([mode,id])=>{
  const state=window.MiBowlingIntegrationI7?.getState();
  if(mode==='ready')return state?.opened&&state.owner===id&&
    ['ready','saved'].includes(state.persistence?.phase);
  if(mode==='recovery')return state?.owner===id&&state?.recoveryOnly&&
    !state.opened&&state.persistence?.pendingCount>0;
  return false;
 },[kind,UUID[owner]],{timeout:25000});
}
async function mutate(page,name){
 await page.evaluate(label=>{
  const raw={id:label,type:'entrenamiento',date:'2026-11-09',
   games:[{id:'g-'+label,rolls:[],includeStats:true}]};
  Function('return db')().sessions.push(
   Function('return migrate')()({sessions:[raw]}).sessions[0]);
  Function('return save')()();
 },name);
}
async function editFirst(page,title){
 await page.evaluate(value=>{
  Function('return db')().sessions[0].title=value;
  Function('return save')()();
 },title);
}
async function drain(page){
 const s=await page.evaluate(()=>MiBowlingIntegrationI7.drain());
 assert.equal(s.volatileCount,0,'await drain must leave only ACKed WAL');
 return s;
}
async function nativeRows(page,owner){
 await page.goto(page.url().includes('/__blank')?page.url():new URL('/__blank',page.url()).href);
 return page.evaluate(async who=>{
  const db=await new Promise((ok,no)=>{
   const q=indexedDB.open('mi-bowling-i7-lab-encrypted-data-v1',1);
   q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);
  });
  try{return await new Promise((ok,no)=>{
   const q=db.transaction('encrypted-operations','readonly')
    .objectStore('encrypted-operations').getAll();
   q.onsuccess=()=>ok(q.result.filter(x=>x.owner===who));q.onerror=()=>no(q.error);
  })}finally{db.close()}
 },owner);
}
async function webkitMultiWal(browser,base){
 const ctx=await browser.newContext({...devices['iPhone 13 Pro Max'],
  viewport:{width:390,height:844},ignoreHTTPSErrors:true,locale:'es-ES'});
 await ctx.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 try{
  const t1=await ctx.newPage(),t2=await ctx.newPage();
  await open(t1,base,'A');await waitFor(t1,'ready','A');
  await open(t2,base,'A');await waitFor(t2,'ready','A');
  assert.notEqual((await state(t1)).persistence.tabId,(await state(t2)).persistence.tabId);
  await t1.evaluate(()=>MiBowlingIntegrationI7.simulateNetworkFailure(true));
  await t2.evaluate(()=>MiBowlingIntegrationI7.simulateNetworkFailure(true));
  await mutate(t1,'I7-OP-TAB1');
  await mutate(t2,'I7-OP-TAB2');
  const s1=await drain(t1),s2=await drain(t2);
  assert.equal(s1.blocked,'uncertain');assert.equal(s2.blocked,'uncertain');
  assert.ok(s1.lastDurable&&s2.lastDurable,'durability ACK required');
  assert.notEqual(s1.lastDurable,s2.lastDurable);
  assert.equal((await confirmed(t1)).revision,0,'failed pre-commit must not change confirmed server');
  assert.equal((await rawPending(t1)).length,2,'both independent encrypted operations must survive');
  assert.equal((await rawPending(t2)).length,2);
  await t1.close();await t2.close();
  let verify=await ctx.newPage();await verify.goto(base+'/__blank');
  const ciphertext=await nativeRows(verify,UUID.A);
  assert.equal(ciphertext.length,2);
  assert.equal(new Set(ciphertext.map(x=>x.id)).size,2);
  for(const row of ciphertext){
   assert.equal(row.kind,'WAL');assert.ok(row.cipher.length>120);
   assert.ok(!JSON.stringify(row).includes('I7-OP-TAB1'));
   assert.ok(!JSON.stringify(row).includes('I7-OP-TAB2'));
  }
  await open(verify,base,'A');await waitFor(verify,'recovery','A');
  assert.equal((await status(verify)).length,2);
  const ops=await status(verify);
  assert.ok(ops.every(x=>x.status==='can-resume'));
  const result=await verify.evaluate(id=>MiBowlingIntegrationI7.recoverOperation(id),ops[0].opId);
  assert.equal(result.status,'saved');
  const second=(await status(verify));
  assert.equal(second.length,1);assert.equal(second[0].status,'conflict');
  const merged=await verify.evaluate(id=>
   MiBowlingIntegrationI7.mergeOperation(id,'CONFIRMAR-FUSION-FICTICIA'),second[0].opId);
  assert.equal(merged.status,'merged');
  assert.equal((await confirmed(verify)).revision,2);
  assert.deepEqual((await status(verify)),[]);
  const names=await engineSessions(verify);
  assert.ok(names.includes('I7-OP-TAB1')&&names.includes('I7-OP-TAB2'));
  await verify.reload();await verify.locator('#lab-i7-passphrase').fill(secret('A'));
  await verify.locator('[data-demo-account="A"]').click();await waitFor(verify,'ready','A');
  assert.ok((await engineSessions(verify)).includes('I7-OP-TAB1'));
  assert.ok((await engineSessions(verify)).includes('I7-OP-TAB2'));
  console.log('PASS I7 WebKit · 2 independent encrypted WAL survive 2 real tab closes, explicit recovery and safe multi-WAL merge');
  // B's password and UUID cannot unlock A's operations/confirmed scores.
  await open(verify,base,'B');await waitFor(verify,'ready','B');
  assert.equal((await status(verify)).length,0);
  assert.equal((await confirmed(verify)).revision,null);
  assert.ok(!(await engineSessions(verify)).includes('I7-OP-TAB1'));
  await mutate(verify,'I7-B-SCORE');await drain(verify);
  assert.equal((await confirmed(verify)).revision,0);
  await open(verify,base,'C');await waitFor(verify,'ready','C');
  assert.equal((await status(verify)).length,0);
  assert.ok(!(await engineSessions(verify)).includes('I7-B-SCORE'));
  console.log('PASS I7 WebKit · A/B/C independent fake IDs, encrypted confirmed scores and rejected cross-owner mixing');
  // The fake backend COMMITS, but the response is LOST. Next login must
  // recognize exact SHA + revision, ACK without replay or duplicate writes.
  await verify.evaluate(()=>MiBowlingIntegrationI7.simulateAfterCommitFailureOnce());
  await mutate(verify,'I7-ACK-LOST-C');
  const ambiguous=await drain(verify);
  assert.equal(ambiguous.blocked,'uncertain');
  assert.equal((await confirmed(verify)).revision,1);
  assert.equal((await status(verify)).length,1);
  await verify.close();verify=await ctx.newPage();
  await open(verify,base,'C');await waitFor(verify,'recovery','C');
  const pending=await status(verify);
  assert.equal(pending[0].status,'already-applied');
  const ack=await verify.evaluate(id=>MiBowlingIntegrationI7.recoverOperation(id),pending[0].opId);
  assert.equal(ack.status,'already-applied');
  assert.equal((await confirmed(verify)).revision,1);
  assert.equal((await status(verify)).length,0);
  console.log('PASS I7 WebKit · response lost after confirmed CAS acknowledged once without duplicate');
  // Abort IDB transaction BEFORE durable receipt. No fake confidence, no
  // confirmed write and no false persisted WAL. This is the unavoidable
  // interruption boundary and is explicitly reported as unprotected.
  await verify.evaluate(()=>MiBowlingIntegrationI7.simulateJournalAbortOnce());
  await mutate(verify,'I7-BEFORE-IDB-ACK');
  await verify.evaluate(()=>MiBowlingIntegrationI7.drain());
  const unacked=await state(verify);
  assert.equal(unacked.persistence.blocked,'journal-error');
  assert.equal(unacked.persistence.volatileCount,1);
  assert.equal((await confirmed(verify)).revision,1);
  assert.equal((await rawPending(verify)).length,0);
  console.log('PASS I7 WebKit · aborted IDB transaction never falsely reports durability');
  await verify.close();
 }finally{await ctx.close()}
}
async function chromiumCas(browser,base){
 const ctx=await browser.newContext({viewport:{width:1366,height:900},
  ignoreHTTPSErrors:true,locale:'es-ES'});
 await ctx.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 try{
  const a=await ctx.newPage(),b=await ctx.newPage();
  await open(a,base,'A');await waitFor(a,'ready','A');
  await open(b,base,'A');await waitFor(b,'ready','A');
  await Promise.all([mutate(a,'I7-CHROME-A'),mutate(b,'I7-CHROME-B')]);
  const result=await Promise.all([drain(a),drain(b)]);
  assert.ok(result.some(x=>x.phase==='saved'));
  assert.ok(result.some(x=>x.blocked));
  const actual=await confirmed(a);assert.equal(actual.revision,1);
  assert.equal((await rawPending(a)).length,1);
  await a.close();await b.close();
  let t=await ctx.newPage();await open(t,base,'A');await waitFor(t,'recovery','A');
  const one=await status(t);assert.equal(one.length,1);assert.equal(one[0].status,'conflict');
  const merged=await t.evaluate(id=>MiBowlingIntegrationI7.mergeOperation(id,'CONFIRMAR-FUSION-FICTICIA'),one[0].opId);
  assert.equal(merged.status,'merged');
  const post=await confirmed(t);
  assert.equal(post.revision,2);
  assert.ok(post.payload.sessions.some(x=>x.id==='I7-CHROME-A'));
  assert.ok(post.payload.sessions.some(x=>x.id==='I7-CHROME-B'));
  console.log('PASS I7 Chromium · genuine parallel CAS, loser retained, nonoverlap 3-way merge, no overwrite');
  // Overlapping existing-session edits must NEVER merge automatically.
  const m1=await ctx.newPage(),m2=await ctx.newPage();
  await open(m1,base,'A');await waitFor(m1,'ready','A');
  await open(m2,base,'A');await waitFor(m2,'ready','A');
  await editFirst(m1,'one-version');await drain(m1);
  await editFirst(m2,'different-version');const s=await drain(m2);
  assert.ok(s.blocked);
  await m1.close();await m2.close();await t.close();
  t=await ctx.newPage();await open(t,base,'A');await waitFor(t,'recovery','A');
  const conflict=(await status(t));assert.equal(conflict.length,1);
  assert.equal(conflict[0].status,'conflict');
  const before=await confirmed(t);
  const rejected=await t.evaluate(id=>
   MiBowlingIntegrationI7.mergeOperation(id,'CONFIRMAR-FUSION-FICTICIA'),conflict[0].opId);
  assert.equal(rejected.status,'conflict');
  assert.equal((await confirmed(t)).revision,before.revision);
  assert.equal((await status(t)).length,1,'original WAL must remain encrypted');
  console.log('PASS I7 Chromium · overlapping edits refused, original encrypted WAL remains');
  await t.close();
 }finally{await ctx.close()}
}
async function main(){
 const base=await serve();
 const wk=await webkit.launch({headless:true});
 try{await webkitMultiWal(wk,base)}finally{await wk.close()}
 const bin=cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim();
 const ch=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox']});
 try{await chromiumCas(ch,base)}finally{await ch.close()}
 console.log('PASS I7 · isolated real-browser multi-operation encrypted journal, no external services');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
 if(server)await new Promise(ok=>server.close(ok));
 fs.rmSync(tmp,{recursive:true,force:true});
});
