/* MI BOWLING · I10 LAB · atomic rollback, lost ACK and persistent restart.
 * HTTPS 127.0.0.1 only; synthetic A/B/C; no external services.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mb-i10-'));
const owner='11111111-1111-4111-8111-111111111111',ownerB='22222222-2222-4222-8222-222222222222';
const PASSWORD='I10-Portable-Backup-Fake-Password-2026';
const vault='I10-LAB-A-Different-Vault-Key-2026';
const DB='mi-bowling-i10-lab-encrypted-data-v4',PAGE='/lab/integracion-main-auth-i10.html';
let server;
async function serve(){
 const cert=path.join(tmp,'c.pem'),key=path.join(tmp,'k.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},(req,res)=>{
  if(req.url==='/__blank'){
   res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   res.end('<!doctype html><title>Private I10 fixture</title>');return
  }
  const file=path.resolve(root,decodeURIComponent(new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404);res.end('Missing');return
  }
  const ext=path.extname(file);
  res.writeHead(200,{'Content-Type':ext==='.js'?'application/javascript':
   ext==='.css'?'text/css':ext==='.json'?'application/json':
   ext==='.png'?'image/png':'text/html','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end(fs.readFileSync(file));
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function route(ctx,base){await ctx.route('**/*',q=>q.request().url().startsWith(base+'/')?q.continue():q.abort())}
async function login(page,base,letter,key){
 await page.goto(base+PAGE);
 assert.equal(await page.locator('body').getAttribute('data-lab-isolation'),'PASS');
 await page.locator('#lab-i10-passphrase').fill(key);
 await page.locator('[data-demo-account="'+letter+'"]').click();
}
async function ready(page){
 await page.waitForFunction(()=>MiBowlingIntegrationI10?.getState()?.opened===true,null,{timeout:25000});
}
async function recovering(page){
 await page.waitForFunction(()=>{
  const s=MiBowlingIntegrationI10?.getState();
  return s?.recoveryOnly===true&&!s?.opened&&s.persistence?.pendingCount>0;
 },null,{timeout:25000});
}
async function data(page,base){
 await page.goto(base+'/__blank');
 return page.evaluate(async dbName=>{
  const db=await new Promise((ok,no)=>{
   const q=indexedDB.open(dbName,4);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)
  });
  try{return await new Promise((ok,no)=>{
   const tx=db.transaction(['encrypted-operations','encrypted-confirmed','encrypted-restore-audit'],'readonly');
   const stores=['encrypted-operations','encrypted-confirmed','encrypted-restore-audit'];
   const counts={},rows={};
   for(const s of stores){
    const q=tx.objectStore(s).getAll();
    q.onsuccess=()=>{rows[s]=q.result;counts[s]=q.result.length};
   }
   tx.oncomplete=()=>ok({counts,rows});
   tx.onabort=()=>no(tx.error);
  })}finally{db.close()}
 },DB);
}
async function makeFile(browser,base){
 const ctx=await browser.newContext({...devices['iPhone 13 Pro Max'],
  viewport:{width:390,height:844},ignoreHTTPSErrors:true});
 await route(ctx,base);
 try{
  const p=await ctx.newPage();await login(p,base,'A','I10-Fake-Source-Vault-Key-2026');
  await ready(p);
  await p.evaluate(()=>Function('return save')()());
  assert.equal((await p.evaluate(()=>MiBowlingIntegrationI10.drain())).revision,1);
  await p.evaluate(()=>MiBowlingIntegrationI10.simulateNetworkFailure(true));
  await p.evaluate(()=>{
   for(const id of ['I10-PENDING-FIRST','I10-PENDING-SECOND']){
    const raw={id,type:'entrenamiento',date:'2026-11-09',
      games:[{id:'g-'+id,rolls:[],includeStats:true}]};
    Function('return db')().sessions.push(
     Function('return migrate')()({sessions:[raw]}).sessions[0]);
    Function('return save')()();
   }
  });
  const drained=await p.evaluate(()=>MiBowlingIntegrationI10.drain());
  assert.equal(drained.blocked,'uncertain');
  assert.equal(drained.volatileCount,0);
  const out=await p.evaluate(pass=>MiBowlingIntegrationI10.exportBackup(pass),PASSWORD);
  assert.ok(!out.includes('I10-PENDING-FIRST'));
  assert.equal((await p.evaluate(pass=>MiBowlingIntegrationI10.inspectBackup(
   JSON.stringify({format:'bad'}),pass).catch(e=>e.message),PASSWORD)).includes('cabecera'),true);
  return out;
 }finally{await ctx.close()}
}
async function openLab(page,base){await page.goto(base+PAGE);
 assert.equal(await page.locator('body').getAttribute('data-lab-isolation'),'PASS')}
async function withJournal(page,phase,file){
 return page.evaluate(async({owner,pass,password,vault,phase})=>{
  const j=await MiBowlingI10EncryptedJournal.unlock({owner,passphrase:vault});
  try{
   if(phase==='lost')j.simulateRestoreLostAckOnce();
   else if(phase!=='normal')j.simulateRestoreAbortOnce(phase);
   try{
    const result=await MiBowlingI10Backup.restoreBackup(
     j,owner,pass,password,'CONFIRMAR-RESTAURACION-FICTICIA');
    return {ok:true,result}
   }catch(e){return {ok:false,error:e.message}}
  }finally{j.close()}
 },{owner,pass:file,password:PASSWORD,vault,phase});
}
async function persistentProof(base,file){
 const profile=fs.mkdtempSync(path.join(tmp,'profile-'));
 const bin=cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim();
 const launch=()=>chromium.launchPersistentContext(profile,{
  executablePath:bin,headless:true,args:['--no-sandbox'],locale:'es-ES',
  viewport:{width:1366,height:900},ignoreHTTPSErrors:true
 });
 let ctx=await launch();
 await route(ctx,base);
 try{
  const p=await ctx.newPage();await openLab(p,base);
  // Let the REAL I10 encrypted-store module initialize its three stores.
  // A raw indexedDB.open() on a virgin profile would create an empty schema,
  // which is a test setup error, not an application storage failure.
  await p.evaluate(async({owner,vault})=>{
   const j=await MiBowlingI10EncryptedJournal.unlock({owner,passphrase:vault});
   try{await j.auditRestores(owner)}finally{j.close()}
  },{owner,vault});
  const nullState=await data(p,base);
  assert.equal(nullState.counts['encrypted-operations'],0);
  assert.equal(nullState.counts['encrypted-confirmed'],0);
  assert.equal(nullState.counts['encrypted-restore-audit'],0);
  await openLab(p,base);
  for(const phase of ['before-queue','after-queue']){
   const response=await withJournal(p,phase,file);
   assert.equal(response.ok,false);
   assert.match(response.error,/abortada|concurrente/);
   const actual=await data(p,base);
   assert.equal(actual.counts['encrypted-operations'],0);
   assert.equal(actual.counts['encrypted-confirmed'],0);
   assert.equal(actual.counts['encrypted-restore-audit'],0);
   await openLab(p,base);
  }
  console.log('PASS I10 Chromium · forced abort before/after queued writes rolls back confirmed, 2 WAL and encrypted audit atomically');
  const lost=await withJournal(p,'lost',file);
  assert.equal(lost.ok,false);
  assert.match(lost.error,/acuse.*perdido/i);
  const committed=await data(p,base);
  assert.equal(committed.counts['encrypted-confirmed'],1);
  assert.equal(committed.counts['encrypted-operations'],2);
  assert.equal(committed.counts['encrypted-restore-audit'],1);
  assert.equal(JSON.stringify(committed).includes('I10-PENDING-FIRST'),false,
   'all three stores must be ciphertext');
  await ctx.close();ctx=null; // shutdown the entire browser profile, not just page reload
  ctx=await launch();await route(ctx,base);
  const q=await ctx.newPage();await openLab(q,base);
  const inspection=await q.evaluate(async({owner,vault,file,password})=>{
   const j=await MiBowlingI10EncryptedJournal.unlock({owner,passphrase:vault});
   try{
    const plan=await MiBowlingI10Backup.previewAgainstJournal(j,owner,file,password);
    const audit=await j.auditRestores(owner);
    const repeat=await MiBowlingI10Backup.restoreBackup(
      j,owner,file,password,'CONFIRMAR-RESTAURACION-FICTICIA');
    return {plan,audit,repeat,after:await j.auditRestores(owner)}
   }finally{j.close()}
  },{owner,vault,file,password:PASSWORD});
  assert.equal(inspection.plan.verdict,'identical');
  assert.equal(inspection.plan.canRestore,true);
  assert.equal(inspection.repeat.status,'already-present');
  assert.equal(inspection.audit.length,1);
  assert.equal(inspection.after.length,1,'lost ACK retry cannot duplicate audit');
  assert.equal(inspection.audit[0].operationsAdded,2);
  console.log('PASS I10 Chromium · full process restart preserves 2 WAL and signed encrypted restore receipt; lost ACK reconciles idempotently');
  await login(q,base,'A',vault);
  await recovering(q);
  await q.locator('#lab-i10-backup-file').setInputFiles({
   name:'lab-i10-file.mbi10',mimeType:'application/json',buffer:Buffer.from(file)
  });
  await q.locator('#lab-i10-backup-password').fill(PASSWORD);
  await q.locator('#lab-i10-preview').click();
  await q.waitForFunction(()=>document.querySelector('#lab-i10-backup-status')
   ?.textContent.includes('identical'));
  await q.locator('#lab-i10-trace').click();
  await q.waitForFunction(()=>document.querySelector('#lab-i10-backup-status')
   ?.textContent.includes('1 restauraciones'));
  const first=(await q.evaluate(()=>MiBowlingIntegrationI10.pendingOperations()))[0];
  const r=await q.evaluate(id=>MiBowlingIntegrationI10.recoverOperation(id),first.opId);
  assert.equal(r.status,'saved');
  const remain=await q.evaluate(()=>MiBowlingIntegrationI10.pendingOperations());
  assert.equal(remain.length,1);assert.equal(remain[0].status,'conflict');
  const merged=await q.evaluate(id=>MiBowlingIntegrationI10.mergeOperation(
   id,'CONFIRMAR-FUSION-FICTICIA'),remain[0].opId);
  assert.equal(merged.status,'merged');
  assert.equal((await q.evaluate(()=>MiBowlingIntegrationI10.confirmed())).revision,3);
  assert.equal((await q.evaluate(()=>MiBowlingIntegrationI10.pendingOperations())).length,0);
  const stale=await q.evaluate(({file,password})=>
   MiBowlingIntegrationI10.compareBackupToVault(file,password),{file,password:PASSWORD});
  assert.equal(stale.verdict,'stale');
  assert.equal(stale.canRestore,false);
  await q.locator('#lab-i10-preview').click();
  await q.waitForFunction(()=>document.querySelector('#lab-i10-backup-status')
   ?.textContent.includes('stale'));
  assert.equal((await q.evaluate(()=>MiBowlingIntegrationI10.restoreAudit())).length,1);
  console.log('PASS I10 Chromium · UI preview and trace after restart, manual multi-WAL reconcile; old dated backup rejected without rollback');
  // B/C are never affected by importing A, even after a full browser restart.
  await login(q,base,'B','I10-Fixture-Only-B-Vault-2026');
  await ready(q);
  assert.equal((await q.evaluate(()=>MiBowlingIntegrationI10.confirmed())).revision,null);
  await login(q,base,'C','I10-Fixture-Only-C-Vault-2026');
  await ready(q);
  assert.equal((await q.evaluate(()=>MiBowlingIntegrationI10.pendingOperations())).length,0);
  console.log('PASS I10 Chromium · independent B/C fake vaults remain untouched');
  await q.close();
 }finally{if(ctx)await ctx.close();fs.rmSync(profile,{recursive:true,force:true})}
}
async function main(){
 const base=await serve();
 const wk=await webkit.launch({headless:true});
 let file;
 try{file=await makeFile(wk,base)}finally{await wk.close()}
 await persistentProof(base,file);
 console.log('PASS I10 · encrypted audit, process restart, crash-style rollback and comparative read-only preview, no services');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
 if(server)await new Promise(ok=>server.close(ok));
 fs.rmSync(tmp,{recursive:true,force:true});
});
