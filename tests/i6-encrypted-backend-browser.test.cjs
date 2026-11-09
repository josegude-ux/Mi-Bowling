/* I6 · Real browser encrypted confirmed-score persistence and multi-tab CAS.
 * TEST FIXTURES ONLY, no user scores, remote backend or real identities.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const https=require('node:https'),cp=require('node:child_process'),{webkit,chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i6-'));
const user={A:'11111111-1111-4111-8111-111111111111',B:'22222222-2222-4222-8222-222222222222',C:'33333333-3333-4333-8333-333333333333'};
const phrase=a=>'LAB-ONLY-KEY-'+a+'-NotForUseElsewhere-2026';
let server;
async function serve(){
 const cert=path.join(tmp,'cert.pem'),key=path.join(tmp,'key.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
  if(req.url==='/__blank'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end('<!doctype html><title>LAB blank</title>');return}
  const rel=decodeURIComponent(new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,'');
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404);res.end('Missing');return
  }
  const ext=path.extname(file);
  res.writeHead(200,{'Content-Type':ext==='.js'?'application/javascript':ext==='.css'?'text/css':
   ext==='.json'?'application/json':ext==='.png'?'image/png':'text/html',
   'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end(fs.readFileSync(file));
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function raw(page,owner,store){
 return page.evaluate(async({owner,store})=>{
  const db=await new Promise((ok,no)=>{
   const q=indexedDB.open('mi-bowling-i6-lab-encrypted-data-v1',1);
   q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);
  });
  try{return await new Promise((ok,no)=>{
   const tx=db.transaction(store,'readonly');const q=tx.objectStore(store).get(owner);
   q.onsuccess=()=>ok(q.result??null);q.onerror=()=>no(q.error);
  })}finally{db.close()}
 },{owner,store});
}
const state=p=>p.evaluate(()=>MiBowlingIntegrationI6.getState());
const confirmed=p=>p.evaluate(()=>MiBowlingIntegrationI6.confirmed());
const ids=p=>p.evaluate(()=>Function('return db.sessions.map(s=>s.id)')());
async function open(page,base,who,secret=phrase(who)){
 await page.goto(base+'/lab/integracion-main-auth-i6.html');
 assert.equal(await page.locator('body').getAttribute('data-lab-isolation'),'PASS');
 await page.locator('#lab-i6-passphrase').fill(secret);
 await page.locator('[data-demo-account="'+who+'"]').click();
}
async function waitOpen(p,who){
 await p.waitForFunction(owner=>{
  const x=window.MiBowlingIntegrationI6?.getState();
  return x?.opened&&x.owner===owner&&x.persistence?.phase==='ready';
 },user[who],{timeout:20000});
}
async function modify(p,label){
 // Synthetic scores use the EXACT migration normalizer of the live CP-020 engine.
 // Under-specified raw fixtures would be rewritten after reload, legitimately
 // blocking a strict merge because they modify existing sessions' JSON shapes.
 await p.evaluate(name=>{
  const raw={id:name,type:'entrenamiento',date:'2026-11-09',
   games:[{id:'game-'+name,rolls:[],includeStats:true}]};
  Function('return db')().sessions.push(Function('return migrate')()({sessions:[raw]}).sessions[0]);
  Function('return save')()();
 },label);
}
async function waitSaved(p,revision){
 await p.waitForFunction(expected=>{
  const s=window.MiBowlingIntegrationI6?.getState()?.persistence;
  return s?.phase==='saved'&&s?.revision===expected&&!s?.blocked&&!s?.dirty;
 },revision,{timeout:30000});
}
async function waitPending(p){
 await p.waitForFunction(()=>window.MiBowlingIntegrationI6?.getState()?.persistence?.blocked==='uncertain',
  null,{timeout:30000});
}
async function caseBrowser(browser,base,device,label){
 const ctx=await browser.newContext({...device,locale:'es-ES',ignoreHTTPSErrors:true});
 await ctx.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
 try{
  let a=await ctx.newPage();
  await a.goto(base+'/__blank');
  await a.evaluate(()=>localStorage.setItem('__I6_REAL_SENTINEL__','untouched'));
  await open(a,base,'A');await waitOpen(a,'A');
  assert.equal(await a.evaluate(()=>window.indexedDB),undefined);
  assert.equal((await confirmed(a)).revision,0);
  await modify(a,label+'-CONFIRMED');
  await waitSaved(a,1);
  assert.ok((await ids(a)).includes(label+'-CONFIRMED'));
  assert.equal(await a.evaluate(()=>MiBowlingIntegrationI6.hasOwnerPending()),false);
  await a.close();
  a=await ctx.newPage();await a.goto(base+'/__blank');
  const enc=await raw(a,user.A,'encrypted-confirmed');
  assert.ok(enc&&enc.kind==='CONFIRMED'&&enc.revision===1&&enc.cipher.length>100);
  assert.equal(JSON.stringify(enc).includes(label+'-CONFIRMED'),false,
   'Confirmed score leaked in plaintext');
  assert.equal(await a.evaluate(()=>localStorage.getItem('__I6_REAL_SENTINEL__')),'untouched');
  await open(a,base,'A');await waitOpen(a,'A');
  assert.equal((await confirmed(a)).revision,1);
  assert.ok((await ids(a)).includes(label+'-CONFIRMED'),
   'Confirmed score must survive REAL tab close and reload');
  await a.reload();
  await a.locator('#lab-i6-passphrase').fill(phrase('A'));
  await a.locator('[data-demo-account="A"]').click();await waitOpen(a,'A');
  assert.ok((await ids(a)).includes(label+'-CONFIRMED'));
  assert.equal((await confirmed(a)).revision,1);
  console.log('PASS I6 '+label+' · encrypted confirmed scores survive real close/reload, original browser localStorage intact');
  // Wrong key: do not show or alter encrypted confirmed row.
  await a.goto(base+'/lab/integracion-main-auth-i6.html');
  await a.locator('#lab-i6-passphrase').fill('Incorrect-Demo-Key-2026');
  await a.locator('[data-demo-account="A"]').click();
  await a.locator('#lab-safety-status:not([hidden])').waitFor({timeout:15000});
  await a.goto(base+'/__blank');
  assert.deepEqual(await raw(a,user.A,'encrypted-confirmed'),enc);
  // Independent B must not inherit A and must have separate encrypted backend.
  await open(a,base,'B');await waitOpen(a,'B');
  assert.equal((await confirmed(a)).revision,null);
  assert.equal((await ids(a)).includes(label+'-CONFIRMED'),false);
  await modify(a,label+'-B-ONLY');await waitSaved(a,0);
  assert.ok((await ids(a)).includes(label+'-B-ONLY'));
  await a.goto(base+'/__blank');
  assert.equal(JSON.stringify(await raw(a,user.B,'encrypted-confirmed')).includes(label+'-B-ONLY'),false);
  assert.deepEqual(await raw(a,user.A,'encrypted-confirmed'),enc);
  console.log('PASS I6 '+label+' · B/A isolation, wrong key rejected, confirmed encrypted separately');
  // Stage WAL on CP-020 save without any programmed 80ms timer; network failure
  // leaves ciphertext durable after the journal's IDB transaction confirms.
  await open(a,base,'A');await waitOpen(a,'A');
  await a.evaluate(()=>MiBowlingIntegrationI6.simulateNetworkFailure(true));
  await modify(a,label+'-WAL');
  const instant=await state(a);
  assert.notEqual(instant.persistence.phase,'pending','I6 must start journaling immediately');
  await waitPending(a);
  assert.equal(await a.evaluate(()=>MiBowlingIntegrationI6.hasOwnerPending()),true);
  await a.close();
  a=await ctx.newPage();await a.goto(base+'/__blank');
  const wal=await raw(a,user.A,'encrypted-wal');
  assert.ok(wal&&wal.kind==='WAL'&&wal.cipher.length>100);
  assert.equal(JSON.stringify(wal).includes(label+'-WAL'),false);
  await open(a,base,'A');
  await a.waitForFunction(()=>MiBowlingIntegrationI6.getState().recoveryOnly===true,
    null,{timeout:20000});
  const x=await a.evaluate(()=>MiBowlingIntegrationI6.inspectPending());
  assert.equal(x.status,'can-resume');
  await a.locator('#lab-i4-recover').click();
  await a.waitForFunction(()=>MiBowlingIntegrationI6.getState().opened===true,
    null,{timeout:20000});
  assert.ok((await ids(a)).includes(label+'-WAL'));
  assert.equal((await confirmed(a)).revision,2);
  await a.goto(base+'/__blank');assert.equal(await raw(a,user.A,'encrypted-wal'),null);
  console.log('PASS I6 '+label+' · immediate pre-network encrypted WAL and explicit recovery after real tab close');
  // Two tabs load same confirmed revision. One wins. The losing journal stays
  // encrypted: explicit three-way merge is mandatory, not silent replace.
  const tab1=await ctx.newPage(),tab2=await ctx.newPage();
  await open(tab1,base,'A');await waitOpen(tab1,'A');
  await open(tab2,base,'A');await waitOpen(tab2,'A');
  await modify(tab1,label+'-TAB-ONE');await waitSaved(tab1,3);
  await modify(tab2,label+'-TAB-TWO');
  await waitPending(tab2);
  const disagreement=await tab2.evaluate(()=>MiBowlingIntegrationI6.inspectPending());
  assert.equal(disagreement.status,'conflict');
  assert.equal((await confirmed(tab2)).revision,3);
  assert.equal((await confirmed(tab2)).payload.sessions.some(s=>s.id===label+'-TAB-TWO'),false,
   'losing tab must not overwrite winning confirmed score');
  const draft=await tab2.evaluate(()=>MiBowlingIntegrationI6.verifyPending());
  assert.equal(draft.owner,user.A);
  const mergedStatus=await tab2.evaluate(()=>MiBowlingIntegrationI6.mergePending());
  if(mergedStatus.blocked||mergedStatus.revision!==4)
   throw Error('I6 merge diagnostics (no scores): '+JSON.stringify({
    phase:mergedStatus.phase,blocked:mergedStatus.blocked,
    revision:mergedStatus.revision,error:mergedStatus.error,
    serverRevision:(await confirmed(tab2)).revision,
    pending:mergedStatus.pending,
    shape:await tab2.evaluate(()=>MiBowlingIntegrationI6.inspectMergeShape())
   }));
  await waitSaved(tab2,4);
  assert.ok((await confirmed(tab2)).payload.sessions.some(s=>s.id===label+'-TAB-ONE'));
  assert.ok((await confirmed(tab2)).payload.sessions.some(s=>s.id===label+'-TAB-TWO'));
  await tab1.close();await tab2.close();
  console.log('PASS I6 '+label+' · two-tab stale CAS protected and nonoverlap confirmed by explicit three-way merge');
 }finally{await ctx.close()}
}
async function main(){
 const base=await serve();
 const wk=await webkit.launch({headless:true});
 try{await caseBrowser(wk,base,{...devices['iPhone 13 Pro Max'],viewport:{width:390,height:844}},'webkit-iphone')}
 finally{await wk.close()}
 const chrome=cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim();
 const c=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
 try{await caseBrowser(c,base,{viewport:{width:1366,height:900}},'chromium-desktop')}
 finally{await c.close()}
 console.log('PASS I6 · test-only encrypted confirmed backend + WAL, no external services');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
 if(server)await new Promise(resolve=>server.close(resolve));
 fs.rmSync(tmp,{recursive:true,force:true});
});
