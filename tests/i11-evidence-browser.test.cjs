/* MI BOWLING I11 · true Chromium encrypted audit chain + independent witness.
 * Synthetic fake A/B/C, HTTPS loopback; no real accounts or services.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),
 os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),TMP=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i11-audit-'));
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const V='LAB-I11-A-Vault-Only-2026',E='LAB-I11-External-Witness-Key-2026';
const BP='LAB-I11-Score-Backup-Key-2026',PAGE='/lab/integracion-main-auth-i11.html';
const DB='mi-bowling-i11-lab-encrypted-data-v5';
let server;
async function start(){
 const key=path.join(TMP,'key.pem'),crt=path.join(TMP,'cert.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
  '-keyout',key,'-out',crt,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(crt)},(req,res)=>{
  if(req.url==='/__blank'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
    res.end('<!doctype html><title>I11 private storage inspector</title>');return}
  const f=path.resolve(ROOT,decodeURIComponent(new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,''));
  if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){
   res.writeHead(404);res.end('Not found');return;
  }
  const ext=path.extname(f);res.writeHead(200,{
   'Content-Type':ext==='.js'?'application/javascript':ext==='.css'?'text/css':
     ext==='.json'?'application/json':'text/html',
   'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end(fs.readFileSync(f));
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function readAll(page,base){
 await page.goto(base+'/__blank');
 return page.evaluate(async dbName=>{
  const db=await new Promise((ok,no)=>{
   const q=indexedDB.open(dbName,5);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);
  });
  try{return await new Promise((ok,no)=>{
   const stores=['encrypted-operations','encrypted-confirmed','encrypted-restore-audit','encrypted-audit-head'],
    tx=db.transaction(stores,'readonly'),result={};
   for(const name of stores){const q=tx.objectStore(name).getAll();
    q.onsuccess=()=>{result[name]=q.result}}
   tx.oncomplete=()=>ok(result);tx.onabort=()=>no(tx.error);
  })}finally{db.close()}
 },DB);
}
async function mutate(page,base,kind,id,op){
 await page.goto(base+'/__blank');
 return page.evaluate(async({dbName,kind,id,op})=>{
  const db=await new Promise((ok,no)=>{
   const q=indexedDB.open(dbName,5);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);
  });
  try{return await new Promise((ok,no)=>{
   const tx=db.transaction(kind,'readwrite'),s=tx.objectStore(kind);
   if(op==='clear')s.clear();
   else if(op==='delete')s.delete(id);
   else if(op==='tamper'){
    const q=s.get(id);
    q.onsuccess=()=>{
     const row=q.result;
     if(!row){tx.abort();return}
     row.cipher=(row.cipher[0]==='A'?'B':'A')+row.cipher.slice(1);
     s.put(row);
    };
   }
   tx.oncomplete=()=>ok(true);tx.onabort=()=>no(Error('Synthetic operation failed'));
  })}finally{db.close()}
 },{dbName:DB,kind,id,op});
}
async function test(base){
 const profile=fs.mkdtempSync(path.join(TMP,'chromium-profile-'));
 const executablePath=cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim();
 const launch=()=>chromium.launchPersistentContext(profile,{
  headless:true,executablePath,args:['--no-sandbox'],
  viewport:{width:1360,height:860},ignoreHTTPSErrors:true,locale:'es-ES'});
 let ctx=await launch();
 const isolate=async context=>context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 await isolate(ctx);
 try{
  let p=await ctx.newPage();await p.goto(base+PAGE);
  const outcome=await p.evaluate(async({A,V,E,BP})=>{
   const j=await MiBowlingI11EncryptedJournal.unlock({owner:A,passphrase:V});
   const hash=async x=>{
    const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(x)));
    return [...new Uint8Array(data)].map(v=>v.toString(16).padStart(2,'0')).join('');
   };
   const base={version:2,hand:'diestro',sessions:[],balls:[],patterns:[]};
   const one={version:1,owner:A,confirmed:{owner:A,revision:1,payload:base},operations:[]};
   const f1=await MiBowlingI11Backup.seal(one,BP);
   try{
    const r1=await MiBowlingI11Backup.restoreBackup(j,A,f1,BP,
     'CONFIRMAR-RESTAURACION-FICTICIA');
    if(r1.status!=='restored')throw Error('first restore failed');
    const payload={...base,sessions:[{id:'I11-FAKE-SESSION',
     type:'entrenamiento',date:'2026-11-09',games:[]}]};
    const entry={version:2,owner:A,
     tabId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     opId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
     createdAt:1794200000000,baseRevision:1,
     basePayload:base,baseHash:await hash(base),payload,payloadHash:await hash(payload)};
    const wal={...entry,checksum:await hash(entry)};
    const two={...one,operations:[wal]};
    const f2=await MiBowlingI11Backup.seal(two,BP);
    const r2=await MiBowlingI11Backup.restoreBackup(j,A,f2,BP,
     'CONFIRMAR-RESTAURACION-FICTICIA');
    if(r2.status!=='restored'||r2.operationsAdded!==1)throw Error('second restore failed');
    const divergent={...one,confirmed:{...one.confirmed,
      payload:{...base,sessions:[{id:'I11-FORK',games:[]}]}}};
    const fork=await MiBowlingI11Backup.seal(divergent,BP);
    let deniedFork='';
    try{await MiBowlingI11Backup.restoreBackup(j,A,fork,BP,
     'CONFIRMAR-RESTAURACION-FICTICIA')}
    catch(err){deniedFork=err.message}
    const stale={...one,confirmed:{...one.confirmed,revision:0}};
    const old=await MiBowlingI11Backup.seal(stale,BP);
    let deniedStale='';
    try{await MiBowlingI11Backup.restoreBackup(j,A,old,BP,
     'CONFIRMAR-RESTAURACION-FICTICIA')}
    catch(err){deniedStale=err.message}
    const chain=await j.auditRestores(A);
    const proof=await MiBowlingI11Evidence.exportEvidence(j,A,E);
    const evidenceFile=await MiBowlingI11Evidence.open(proof,E,A);
    return {r1,r2,deniedFork,deniedStale,chain,proof,f1,f2,
     externalCount:evidenceFile.events.length};
   }finally{j.close()}
  },{A,V,E,BP});
  assert.match(outcome.deniedFork,/CONFLICTO/);
  assert.match(outcome.deniedStale,/OBSOLETO/);
  assert.equal(outcome.chain.count,4,'two committed restorations plus two verified denied conflicts');
  assert.deepEqual(outcome.chain.receipts.map(e=>e.kind),
   ['restore','restore','conflict','conflict']);
  assert.deepEqual(outcome.chain.receipts.map(e=>e.reason),['none','none','fork','stale']);
  assert.equal(outcome.externalCount,4);
  assert.ok(!outcome.proof.includes('I11-FAKE-SESSION'));
  assert.ok(!outcome.proof.includes('operationsAdded'));
  console.log('PASS I11 Chromium · two committed restores + two denied conflicts signed, encrypted and strictly ordered');
  await ctx.close();ctx=null;
  ctx=await launch();await isolate(ctx);
  p=await ctx.newPage();await p.goto(base+PAGE);
  const after=await p.evaluate(async({A,V,proof,E})=>{
   const j=await MiBowlingI11EncryptedJournal.unlock({owner:A,passphrase:V});
   try{
    const c=await j.auditRestores(A);
    const preview=await MiBowlingI11Evidence.previewEvidence(j,A,proof,E);
    const repeat=await MiBowlingI11Evidence.importEvidence(j,A,proof,E,
     'CONFIRMAR-EVIDENCIA-FICTICIA');
    return {c,preview,repeat}
   }finally{j.close()}
  },{A,V,proof:outcome.proof,E});
  assert.equal(after.c.count,4);
  assert.equal(after.preview.verdict,'identical');
  assert.equal(after.repeat.status,'already-present');
  console.log('PASS I11 Chromium · full browser process restart retains verified 4-event chain and independent witness');
  // Verify the actual mobile-friendly controls: chain check, encrypted local
  // download and file preview. No remote upload happens.
  await p.locator('#lab-i11-passphrase').fill(V);
  await p.locator('[data-demo-account="A"]').click();
  await p.waitForFunction(()=>MiBowlingIntegrationI11.getState().recoveryOnly===true);
  await p.locator('#lab-i11-evidence-pass').fill(E);
  await p.locator('#lab-i11-chain-check').click();
  await p.waitForFunction(()=>document.querySelector('#lab-i11-evidence-status')
   ?.textContent.includes('cadena VERIFICADA'));
  const [download]=await Promise.all([
   p.waitForEvent('download',{timeout:15000}),
   p.locator('#lab-i11-evidence-download').click()
  ]);
  assert.ok(download.suggestedFilename().endsWith('.mae11'));
  const parts=[];
  for await(const part of await download.createReadStream())parts.push(part);
  const downloaded=Buffer.concat(parts).toString('utf8');
  assert.ok(!downloaded.includes('I11-FAKE-SESSION'));
  await p.locator('#lab-i11-evidence-file').setInputFiles({
   name:'i11-outside-browser.mae11',mimeType:'application/json',
   buffer:Buffer.from(downloaded)
  });
  await p.locator('#lab-i11-evidence-preview').click();
  await p.waitForFunction(()=>document.querySelector('#lab-i11-evidence-status')
   ?.textContent.includes('identical'));
  console.log('PASS I11 Chromium · real evidence export/download and read-only verified file preview buttons');
  const witness=await ctx.newPage();
  const before=await readAll(witness,base);
  const confBefore=JSON.stringify(before['encrypted-confirmed']),walBefore=JSON.stringify(before['encrypted-operations']);
  const rowId=A+':audit:'+outcome.chain.receipts[1].auditId;
  await mutate(witness,base,'encrypted-restore-audit',rowId,'delete');
  const broken=await p.evaluate(async({A,V})=>{
   const j=await MiBowlingI11EncryptedJournal.unlock({owner:A,passphrase:V});
   try{await j.auditRestores(A);return false}catch(err){return /supresión|orden/.test(err.message)}
   finally{j.close()}
  },{A,V});
  assert.equal(broken,true);
  const preview=await p.evaluate(async({A,V,proof,E})=>{
   const j=await MiBowlingI11EncryptedJournal.unlock({owner:A,passphrase:V});
   try{return await MiBowlingI11Evidence.previewEvidence(j,A,proof,E)}
   finally{j.close()}
  },{A,V,proof:outcome.proof,E});
  assert.equal(preview.verdict,'local-chain-unverifiable');
  await p.locator('#lab-i11-evidence-consent').check();
  await p.locator('#lab-i11-evidence-preview').click();
  await p.waitForFunction(()=>document.querySelector('#lab-i11-evidence-status')
   ?.textContent.includes('local-chain-unverifiable'));
  await p.locator('#lab-i11-evidence-import').click();
  await p.waitForFunction(()=>document.querySelector('#lab-i11-evidence-status')
   ?.textContent.includes('evidence-restored'));
  const restored=await p.evaluate(async({A,V,proof,E})=>{
   const j=await MiBowlingI11EncryptedJournal.unlock({owner:A,passphrase:V});
   try{
    const result=await MiBowlingI11Evidence.importEvidence(j,A,proof,E,
     'CONFIRMAR-EVIDENCIA-FICTICIA');
    const verified=await j.auditRestores(A);
    return {result,verified}
   }finally{j.close()}
  },{A,V,proof:outcome.proof,E});
  assert.equal(restored.result.status,'already-present');
  assert.equal(restored.result.eventsAdded,0);
  assert.equal(restored.verified.count,4);
  console.log('PASS I11 Chromium · missing middle receipt detected, recovered exclusively from authenticated external witness');
  await mutate(witness,base,'encrypted-restore-audit',A+':audit:'+outcome.chain.receipts[3].auditId,'delete');
  const tail=await p.evaluate(async({A,V})=>{
   const j=await MiBowlingI11EncryptedJournal.unlock({owner:A,passphrase:V});
   try{await j.auditRestores(A);return false}catch(err){return /supresión/.test(err.message)}
   finally{j.close()}
  },{A,V});
  assert.equal(tail,true);
  const healed=await p.evaluate(async({A,V,E,proof})=>{
   const j=await MiBowlingI11EncryptedJournal.unlock({owner:A,passphrase:V});
   try{return await MiBowlingI11Evidence.importEvidence(j,A,proof,E,
     'CONFIRMAR-EVIDENCIA-FICTICIA')}
   finally{j.close()}
  },{A,V,E,proof:outcome.proof});
  assert.equal(healed.eventsAdded,1);
  console.log('PASS I11 Chromium · tail suppression detected against separate encrypted anchor and repaired without score writes');
  await mutate(witness,base,'encrypted-restore-audit',null,'clear');
  await mutate(witness,base,'encrypted-audit-head',null,'clear');
  const missingAll=await p.evaluate(async({A,V,proof,E})=>{
   const j=await MiBowlingI11EncryptedJournal.unlock({owner:A,passphrase:V});
   try{
    const local=await j.auditRestores(A);
    const preview=await MiBowlingI11Evidence.previewEvidence(j,A,proof,E);
    const result=await MiBowlingI11Evidence.importEvidence(j,A,proof,E,
     'CONFIRMAR-EVIDENCIA-FICTICIA');
    return {local,preview,result,after:await j.auditRestores(A)}
   }finally{j.close()}
  },{A,V,proof:outcome.proof,E});
  assert.equal(missingAll.local.count,0,
   'simultaneous local anchor & all-event deletion cannot be detected without external witness');
  assert.equal(missingAll.preview.newEvents,4);
  assert.equal(missingAll.result.eventsAdded,4);
  assert.equal(missingAll.after.count,4);
  console.log('PASS I11 Chromium · deletion of BOTH receipts and local head only detectable against independently exported witness');
  const rawAfter=await readAll(witness,base);
  assert.equal(JSON.stringify(rawAfter['encrypted-confirmed']),confBefore);
  assert.equal(JSON.stringify(rawAfter['encrypted-operations']),walBefore);
  const wrong=await p.evaluate(async({A,B,C,E,proof})=>{
   const valid=async(who,key)=>{
    try{await MiBowlingI11Evidence.open(proof,key,who);return false}
    catch(_){return true}
   };
   return {pass:await valid(A,'WRONG-LAB-I11-EXTERNAL-PASSWORD'),
    otherB:await valid(B,E),otherC:await valid(C,E)}
  },{A,B,C,E,proof:outcome.proof});
  assert.ok(Object.values(wrong).every(Boolean));
  const forged=JSON.parse(outcome.proof);
  forged.ciphertext=(forged.ciphertext[0]==='A'?'B':'A')+forged.ciphertext.slice(1);
  const failTamper=await p.evaluate(async({A,V,E,file})=>{
   const j=await MiBowlingI11EncryptedJournal.unlock({owner:A,passphrase:V});
   try{await MiBowlingI11Evidence.importEvidence(j,A,file,E,
     'CONFIRMAR-EVIDENCIA-FICTICIA');return false}
   catch(err){return /alterada|clave incorrecta/.test(err.message)}
   finally{j.close()}
  },{A,V,E,file:JSON.stringify(forged)});
  assert.equal(failTamper,true);
  console.log('PASS I11 Chromium · wrong passphrase, ciphertext tamper and B/C cross-owner evidence rejected');
  // An altered ciphertext row is NEVER silently overwritten by the witness.
  await mutate(witness,base,'encrypted-restore-audit',
    A+':audit:'+outcome.chain.receipts[0].auditId,'tamper');
  const corruptNotOverwritten=await p.evaluate(async({A,V,E,proof})=>{
   const j=await MiBowlingI11EncryptedJournal.unlock({owner:A,passphrase:V});
   try{await MiBowlingI11Evidence.importEvidence(j,A,proof,E,
     'CONFIRMAR-EVIDENCIA-FICTICIA');return false}
   catch(err){return /clave incorrecta|alterada|identidad ajena/.test(err.message)}
   finally{j.close()}
  },{A,V,E,proof:outcome.proof});
  assert.equal(corruptNotOverwritten,true);
  console.log('PASS I11 Chromium · tampered encrypted receipt cannot be silently replaced even with valid external witness');
  await witness.close();await p.close();
 }finally{if(ctx)await ctx.close();fs.rmSync(profile,{recursive:true,force:true})}
}
async function main(){
 const base=await start();await test(base);
 console.log('PASS I11 · verified SHA chain + independent encrypted evidence and conflict receipts, no third-party requests');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
 if(server)await new Promise(ok=>server.close(ok));
 fs.rmSync(TMP,{recursive:true,force:true});
});
