/* MI BOWLING · LAB I10 · real-browser encrypted backup and atomic restore.
 * All accounts, sessions, scores and passwords are synthetic.
 * HTTPS localhost, no remote service or published app mutations.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mb-i10-'));
const IDs={A:'11111111-1111-4111-8111-111111111111',
 B:'22222222-2222-4222-8222-222222222222',
 C:'33333333-3333-4333-8333-333333333333'};
const PASSWORD='I10-Backup-Only-2026-Fictitious',URL_PATH='/lab/integracion-main-auth-i10.html';
const vault=l=>'I10-Private-LAB-Vault-Only-'+l+'-2026';
let server;
async function serve(){
 const cert=path.join(tmp,'cert.pem'),key=path.join(tmp,'key.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},(req,res)=>{
  if(req.url==='/__blank'){
   res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   res.end('<!doctype html><title>I10 isolated storage inspector</title>');return
  }
  const rel=decodeURIComponent(new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,'');
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404);res.end('Not found');return
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
async function isolate(ctx,base){
 await ctx.route('**/*',route=>
  route.request().url().startsWith(base+'/')?route.continue():route.abort())
}
async function login(p,base,letter,key=vault(letter),backupText=null){
 await p.goto(base+URL_PATH);
 assert.equal(await p.locator('body').getAttribute('data-lab-isolation'),'PASS');
 if(backupText!==null){
  await p.locator('#lab-i10-backup-file').setInputFiles({
   name:'mi-bowling-lab-i10-cifrado.mbi10',mimeType:'application/json',
   buffer:Buffer.from(backupText)
  });
  await p.locator('#lab-i10-backup-password').fill(PASSWORD);
  await p.locator('#lab-i10-restore-consent').check();
 }
 await p.locator('#lab-i10-passphrase').fill(key);
 await p.locator('[data-demo-account="'+letter+'"]').click();
}
async function ready(p,letter){
 await p.waitForFunction(owner=>{
  const s=window.MiBowlingIntegrationI10?.getState();
  return s?.owner===owner&&s.opened&&['ready','saved'].includes(s.persistence?.phase);
 },IDs[letter],{timeout:25000});
}
async function recovery(p,letter){
 await p.waitForFunction(owner=>{
  const s=window.MiBowlingIntegrationI10?.getState();
  return s?.owner===owner&&!s.opened&&s.recoveryOnly&&
   s.persistence?.pendingCount>0;
 },IDs[letter],{timeout:25000});
}
const getState=p=>p.evaluate(()=>MiBowlingIntegrationI10.getState());
const confirmed=p=>p.evaluate(()=>MiBowlingIntegrationI10.confirmed());
const pending=p=>p.evaluate(()=>MiBowlingIntegrationI10.pendingOperations());
async function mutate(p,name){
 await p.evaluate(id=>{
  const raw={id,type:'entrenamiento',date:'2026-11-09',
   games:[{id:'g-'+id,rolls:[],includeStats:true}]};
  Function('return db')().sessions.push(
   Function('return migrate')()({sessions:[raw]}).sessions[0]);
  Function('return save')()();
 },name);
}
async function drain(p){return p.evaluate(()=>MiBowlingIntegrationI10.drain())}
async function rawData(p,base){
 await p.goto(base+'/__blank');
 return p.evaluate(async()=>{
  const db=await new Promise((ok,no)=>{
   const q=indexedDB.open('mi-bowling-i10-lab-encrypted-data-v4',4);
   q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);
  });
  try{return await new Promise((ok,no)=>{
   const tx=db.transaction(['encrypted-operations','encrypted-confirmed'],'readonly');
   const o=tx.objectStore('encrypted-operations').getAll(),
    c=tx.objectStore('encrypted-confirmed').getAll();
   let ops=[],confirmed=[];
   o.onsuccess=()=>{ops=o.result};
   c.onsuccess=()=>{confirmed=c.result};
   tx.oncomplete=()=>ok({ops,confirmed});
   tx.onabort=()=>no(tx.error);
  })}finally{db.close()}
 });
}
async function makeSource(browser,base){
 const ctx=await browser.newContext({...devices['iPhone 13 Pro Max'],
  viewport:{width:390,height:844},ignoreHTTPSErrors:true,locale:'es-ES'});
 await isolate(ctx,base);
 try{
  const p=await ctx.newPage();await login(p,base,'A');await ready(p,'A');
  // Canonical CP-020 fixture before creating WALs for strict 3-way merge.
  await p.evaluate(()=>Function('return save')()());
  assert.equal((await drain(p)).revision,1);
  await p.evaluate(()=>MiBowlingIntegrationI10.simulateNetworkFailure(true));
  await mutate(p,'I10-BACKUP-WAL-ONE');
  await mutate(p,'I10-BACKUP-WAL-TWO');
  const status=await drain(p);
  assert.equal(status.blocked,'uncertain');assert.equal(status.volatileCount,0);
  assert.equal((await pending(p)).length,2);
  const file=await p.evaluate(pass=>MiBowlingIntegrationI10.exportBackup(pass),PASSWORD);
  assert.ok(file.length>300&&file.length<18*1024*1024*2);
  assert.ok(!file.includes('I10-BACKUP-WAL-ONE'));
  assert.ok(!file.includes('I10-BACKUP-WAL-TWO'));
  const details=await p.evaluate(({file,pass})=>
   MiBowlingIntegrationI10.inspectBackup(file,pass),{file,pass:PASSWORD});
  assert.equal(details.operationCount,2);assert.equal(details.confirmedRevision,1);
  // Test the ACTUAL HTML buttons, not just the exported JavaScript methods.
  await p.locator('#lab-i10-backup-password').fill(PASSWORD);
  await p.locator('#lab-i10-backup-file').setInputFiles({
   name:'i10-lab-encrypted.mbi10',mimeType:'application/json',buffer:Buffer.from(file)
  });
  await p.locator('#lab-i10-preview').click();
  await p.waitForFunction(()=>document.querySelector('#lab-i10-backup-status')
   ?.textContent.includes('firma verificada'));
  const [download]=await Promise.all([
   p.waitForEvent('download',{timeout:15000}),
   p.locator('#lab-i10-download').click()
  ]);
  assert.ok(download.suggestedFilename().endsWith('.mbi10'));
  const chunks=[];
  for await(const chunk of await download.createReadStream())chunks.push(chunk);
  const actualFile=Buffer.concat(chunks).toString('utf8');
  const fromDownload=await p.evaluate(({f,pass})=>
   MiBowlingIntegrationI10.inspectBackup(f,pass),{f:actualFile,pass:PASSWORD});
  assert.equal(fromDownload.operationCount,2);
  assert.equal(fromDownload.confirmedRevision,1);
  console.log('PASS I10 WebKit · encrypted portable export includes confirmed revision and 2 independent WAL, no score plaintext');
  const wrong=await p.evaluate(async text=>{
   try{await MiBowlingIntegrationI10.inspectBackup(text,'WRONG-backup-passphrase-2026');return false}
   catch(error){return /contraseña/.test(error.message)}
  },file);
  assert.equal(wrong,true);
  const foreign=await p.evaluate(async text=>{
   const j=await MiBowlingI10EncryptedJournal.unlock({
    owner:'22222222-2222-4222-8222-222222222222',
    passphrase:'I10-Fixture-B-Only-2026'});
   try{await MiBowlingI10Backup.restoreBackup(j,'22222222-2222-4222-8222-222222222222',
    text,'I10-Backup-Only-2026-Fictitious','CONFIRMAR-RESTAURACION-FICTICIA');return false}
   catch(error){return /otro jugador|identidad/.test(error.message)}
   finally{j.close()}
  },file);
  assert.equal(foreign,true);
  console.log('PASS I10 WebKit · wrong backup key and foreign B UUID rejected before storage writes');
  return file;
 }finally{await ctx.close()}
}
async function verifyFreshRestore(browser,base,file){
 const ctx=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1366,height:900}});
 await isolate(ctx,base);
 try{
  let p=await ctx.newPage();
  // Import BEFORE fake account seeding; backup/vault passwords are different.
  await login(p,base,'A','I10-TARGET-Different-Encrypted-Key-2026',file);
  await recovery(p,'A');
  assert.equal((await getState(p)).encryptedBackupI10,true);
  assert.equal((await confirmed(p)).revision,1);
  const ops=await pending(p);assert.equal(ops.length,2);
  assert.equal(new Set(ops.map(x=>x.opId)).size,2);
  const original=await p.evaluate(()=>MiBowlingI10Backup.open(
   document.querySelector('#lab-i10-backup-file').files[0].name,
   'wrong', '11111111-1111-4111-8111-111111111111').catch(e=>e.message));
  assert.ok(typeof original==='string');
  const again=await p.evaluate(({file,pass})=>
   MiBowlingIntegrationI10.restoreBackup(file,pass,'CONFIRMAR-RESTAURACION-FICTICIA'),
   {file,pass:PASSWORD});
  assert.equal(again.status,'already-present');
  assert.equal(again.operationsExisting,2);
  assert.equal((await pending(p)).length,2);
  const log=await p.evaluate(()=>MiBowlingIntegrationI10.restoreAudit());
  assert.equal(log.length,1,'only one successful restore should generate one audit row');
  assert.equal(log[0].operationsAdded,2);
  assert.ok(log[0].backupId);
  assert.equal((await p.evaluate(()=>MiBowlingI10BackupUI.trace())).length,1);
  const plan=await p.evaluate(({file,pass})=>
   MiBowlingIntegrationI10.compareBackupToVault(file,pass),{file,pass:PASSWORD});
  assert.equal(plan.verdict,'identical');
  assert.equal(plan.canRestore,true);
  assert.equal(plan.operationsExisting,2);

  await p.locator('#lab-i10-import').click(); // UI: explicit checked consent
  await p.waitForFunction(()=>document.querySelector('#lab-i10-backup-status')
   ?.textContent.includes('already-present'));
  assert.equal((await pending(p)).length,2);
  console.log('PASS I10 Chromium · cold restore with different vault password; idempotent duplicate import cannot duplicate operations');
  const pre=await confirmed(p);
  // A verified, correctly encrypted *forked* backup at same revision MUST
  // be rejected; no "last writer wins" even with explicit confirmation.
  const fork=await p.evaluate(async({file,pass})=>{
   const p=await MiBowlingI10Backup.open(file,pass,
    '11111111-1111-4111-8111-111111111111');
   p.confirmed.payload.sessions.push({id:'I10-FORK-SCORE',games:[]});
   return MiBowlingI10Backup.seal(p,pass);
  },{file,pass:PASSWORD});
  const refused=await p.evaluate(async({file,pass})=>{
   try{await MiBowlingIntegrationI10.restoreBackup(file,pass,
    'CONFIRMAR-RESTAURACION-FICTICIA');return false}
   catch(e){return /CONFLICTO/.test(e.message)}
  },{file:fork,pass:PASSWORD});
  assert.equal(refused,true);
  assert.deepEqual(await confirmed(p),pre);
  assert.equal((await pending(p)).length,2);
  // Same operation UUID with a DIFFERENT tab must be rejected: the composite
  // storage key alone is insufficient to prevent cross-tab replay.
  const replay=await p.evaluate(async({file,pass})=>{
   const x=await MiBowlingI10Backup.open(file,pass,
    '11111111-1111-4111-8111-111111111111');
   const e=x.operations[0];e.tabId='ffffffff-ffff-4fff-8fff-ffffffffffff';
   const unsigned={version:e.version,owner:e.owner,tabId:e.tabId,opId:e.opId,
    createdAt:e.createdAt,baseRevision:e.baseRevision,basePayload:e.basePayload,
    baseHash:e.baseHash,payload:e.payload,payloadHash:e.payloadHash};
   const dig=await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(JSON.stringify(unsigned)));
   e.checksum=[...new Uint8Array(dig)].map(v=>v.toString(16).padStart(2,'0')).join('');
   return MiBowlingI10Backup.seal(x,pass);
  },{file,pass:PASSWORD});
  const replayDenied=await p.evaluate(async({file,pass})=>{
   try{await MiBowlingIntegrationI10.restoreBackup(file,pass,
    'CONFIRMAR-RESTAURACION-FICTICIA');return false}
   catch(err){return /duplicada|otra pestaña/.test(err.message)}
  },{file:replay,pass:PASSWORD});
  assert.equal(replayDenied,true);
  assert.equal((await pending(p)).length,2);
  // Owner switch with file A is denied and does not seed or modify B.
  const b=await ctx.newPage();
  await login(b,base,'B',vault('B'),file);
  await b.waitForFunction(()=>MiBowlingIntegrationI10.getState().recoveryOnly===true,
   null,{timeout:15000});
  assert.equal((await getState(b)).opened,false);
  await b.close();
  const bclean=await ctx.newPage();await login(bclean,base,'B');await ready(bclean,'B');
  assert.equal((await confirmed(bclean)).revision,null);
  await bclean.close();
  console.log('PASS I10 Chromium · forked revision rejected atomically and foreign backup cannot restore into B');
  const first=(await pending(p))[0];
  const out=await p.evaluate(id=>MiBowlingIntegrationI10.recoverOperation(id),first.opId);
  assert.equal(out.status,'saved');
  const remain=await pending(p);
  assert.equal(remain.length,1);assert.equal(remain[0].status,'conflict');
  const merged=await p.evaluate(id=>
    MiBowlingIntegrationI10.mergeOperation(id,'CONFIRMAR-FUSION-FICTICIA'),remain[0].opId);
  assert.equal(merged.status,'merged');
  const confirmedScores=await confirmed(p);
  assert.equal(confirmedScores.revision,3);
  assert.ok(confirmedScores.payload.sessions.some(x=>x.id==='I10-BACKUP-WAL-ONE'));
  assert.ok(confirmedScores.payload.sessions.some(x=>x.id==='I10-BACKUP-WAL-TWO'));
  assert.equal((await pending(p)).length,0);
  // The previous backup revision 1 is stale against confirmed revision 3.
  const stale=await p.evaluate(async({file,pass})=>{
   try{await MiBowlingIntegrationI10.restoreBackup(file,pass,
     'CONFIRMAR-RESTAURACION-FICTICIA');return false}
   catch(e){return /OBSOLETO/.test(e.message)}
  },{file,pass:PASSWORD});
  assert.equal(stale,true);
  assert.equal((await confirmed(p)).revision,3);
  assert.equal((await pending(p)).length,0);
  const stalePreview=await p.evaluate(({file,pass})=>
   MiBowlingIntegrationI10.compareBackupToVault(file,pass),{file,pass:PASSWORD});
  assert.equal(stalePreview.verdict,'stale');
  assert.equal(stalePreview.canRestore,false);
  const trace=await p.evaluate(()=>MiBowlingIntegrationI10.restoreAudit());
  assert.equal(trace.length,1);

  console.log('PASS I10 Chromium · selected multi-WAL recovery/merge, stale backup rejected, no duplicate scores or rollback');
  // A tampered encrypted file is cryptographically rejected, with state intact.
  const tampered=JSON.parse(file);
  tampered.ciphertext=(tampered.ciphertext[0]==='A'?'B':'A')+
    tampered.ciphertext.slice(1);
  const denied=await p.evaluate(async({file,pass})=>{
   try{await MiBowlingIntegrationI10.restoreBackup(file,pass,
     'CONFIRMAR-RESTAURACION-FICTICIA');return false}
   catch(e){return /contraseña|alterados/.test(e.message)}
  },{file:JSON.stringify(tampered),pass:PASSWORD});
  assert.equal(denied,true);
  assert.equal((await confirmed(p)).revision,3);
  await p.close();
 }finally{await ctx.close()}
}
async function concurrentRestore(browser,base,file){
 const ctx=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:860}});
 await isolate(ctx,base);
 try{
  const a=await ctx.newPage(),b=await ctx.newPage();
  await a.goto(base+URL_PATH);await b.goto(base+URL_PATH);
  const attempt=(p)=>p.evaluate(async({file,PASSWORD,owner})=>{
   const j=await MiBowlingI10EncryptedJournal.unlock({
    owner,passphrase:'I10-RACE-SHARED-VAULT-2026'});
   try{return {ok:true,result:await MiBowlingI10Backup.restoreBackup(
    j,owner,file,PASSWORD,'CONFIRMAR-RESTAURACION-FICTICIA')}}
   catch(e){return {ok:false,error:e.message}}
   finally{j.close()}
  },{file,PASSWORD,owner:IDs.A});
  const [one,two]=await Promise.all([attempt(a),attempt(b)]);
  assert.ok(one.ok||two.ok);
  assert.ok([one,two].every(x=>x.ok||
   /concurrente|conflicto|abortada|OBSOLETO/.test(x.error)),
   'race must not silently overwrite');
  await a.goto(base+URL_PATH);
  const journal=await a.evaluate(async owner=>{
   const j=await MiBowlingI10EncryptedJournal.unlock({owner,
    passphrase:'I10-RACE-SHARED-VAULT-2026'});
   try{return await j.snapshot(owner)}finally{j.close()}
  },IDs.A);
  assert.equal(journal.confirmed.revision,1);
  assert.equal(journal.operations.length,2);
  assert.equal(new Set(journal.operations.map(x=>x.opId)).size,2);
  console.log('PASS I10 Chromium · parallel cold restore: atomic two-store CAS, exactly 2 WAL and one confirmed revision');
 }finally{await ctx.close()}
}
async function main(){
 const base=await serve();
 const wk=await webkit.launch({headless:true});
 let file;
 try{file=await makeSource(wk,base)}finally{await wk.close()}
 const bin=cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim();
 const ch=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox']});
 try{await verifyFreshRestore(ch,base,file);await concurrentRestore(ch,base,file)}
 finally{await ch.close()}
 console.log('PASS I10 · portable backup, exact revision and encrypted WAL import, atomic stale/fork/race protection with fake fixtures');
}
main().catch(err=>{console.error(err);process.exitCode=1}).finally(async()=>{
 if(server)await new Promise(ok=>server.close(ok));
 fs.rmSync(tmp,{recursive:true,force:true});
});
