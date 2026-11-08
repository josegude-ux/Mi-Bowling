/* MI BOWLING · LAB A8 · Three-UUID Storage RLS and A6 migration contract.
 * Real production Storage is NEVER contacted.
 */
'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const Pdf=require('../auth-private-pdf-storage-lab.js');
const Migration=require('../auth-legacy-migration-lab.js');
const {createServer,BUCKET}=require('./private-storage-policy-mock-a8.cjs');
const {createServer:createDocumentServer}=require('./rls-mock-server.cjs');
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const users=[A,B,C];
const principal=id=>({id,role:'authenticated',is_anonymous:false,confirmed:true,active:true});
const pdf=s=>new Uint8Array(Buffer.from('%PDF-1.5\n1 0 obj\n<< /Name ('+s+') >>\nendobj\n%%EOF','utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const toPath=(owner,bytes)=>owner+'/patterns/'+sha(bytes)+'.pdf';
function expectedReject(result,phrase){assert.ok(result.error,'Policy must deny: '+phrase)}
function createRepository(client){
 const ctx={console};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../auth-private-repository.js'),'utf8'),ctx);
 return ctx.MiBowlingPrivateRepository.create(client);
}
async function main(){
 const backend=createServer(),clients=users.map(id=>backend.client(principal(id)));
 const stores=clients.map(client=>Pdf.create(client,{cryptoSource:crypto.webcrypto}));
 const files=users.map((id,i)=>pdf('fictitious-'+i));
 const paths=files.map((bytes,i)=>toPath(users[i],bytes));
 assert.deepEqual(stores[0].getContract(),{
  bucket:BUCKET,private:true,upsert:false,maxPdfBytes:20*1024*1024,
  readOnlyByOwner:true,publicUrls:false,signedUrls:false
 });
 assert.equal(stores[0].getPublicUrl,undefined);
 assert.equal(stores[0].createSignedUrl,undefined);
 // Upload and read independent A/B/C PDFs through the actual contract.
 for(let i=0;i<3;i++){
  assert.equal(await stores[i].putNew(users[i],paths[i],files[i]),true);
  const restored=await stores[i].read(users[i],paths[i]);
  assert.deepEqual([...restored],[...files[i]]);
  assert.equal(await stores[i].putNew(users[i],paths[i],files[i]),false,'Immutable existing PDF');
 }
 const originals=backend.snapshot();
 assert.equal(originals.length,3);
 // Six directed attempts A->B, etc, at both client and fake server layers.
 for(let i=0;i<3;i++)for(let j=0;j<3;j++){
  if(i===j)continue;
  await assert.rejects(stores[i].read(users[i],paths[j]),/ruta de otro propietario/);
  await assert.rejects(stores[i].putNew(users[i],paths[j],files[j]),/ruta de otro propietario/);
  await assert.rejects(stores[i].remove(users[i],paths[j]),/ruta de otro propietario/);
  const direct=clients[i].storage.from(BUCKET);
  expectedReject(await direct.download(paths[j]),'direct cross UUID read');
  expectedReject(await direct.upload(paths[j],files[j],{contentType:'application/pdf',upsert:false}),'direct cross UUID write');
  expectedReject(await direct.remove([paths[j]]),'direct cross UUID delete');
 }
 assert.deepEqual(backend.snapshot(),originals);
 // Malicious path, forged checksum, ZIP, oversized PDF, wrong bucket and upsert.
 for(const bad of [
  B+'/patterns/'+sha(files[0])+'.pdf',
  A+'/patterns/../'+sha(files[0])+'.pdf',
  A+'/patterns/'+sha(files[0]).toUpperCase()+'.pdf',
  A+'/patterns/'+sha(files[0])+'.pdf/../../../foo',
  A+'/patterns/'+sha(files[0])+'.jpg',
  '/'+A+'/patterns/'+sha(files[0])+'.pdf',
 ]){
  await assert.rejects(stores[0].read(A,bad),/ruta|SHA-256/);
 }
 const other=pdf('wrong-digest');
 await assert.rejects(stores[0].putNew(A,paths[0],other),/SHA-256/);
 await assert.rejects(stores[0].putNew(A,toPath(A,new TextEncoder().encode('not a pdf')),
  new TextEncoder().encode('not a pdf')),/PDF inválido/);
 const oversized=new Uint8Array(20*1024*1024+1);
 oversized.set([37,80,68,70,45]);
 await assert.rejects(stores[0].putNew(A,toPath(A,oversized),oversized),/PDF inválido/);
 assert.throws(()=>Pdf.create(clients[0],{bucket:'public'}),/Bucket privado/);
 expectedReject(await clients[0].storage.from(BUCKET).upload(paths[0],files[0],
  {contentType:'application/pdf',upsert:true}),'upsert forbidden');
 expectedReject(await clients[0].storage.from('public').download(paths[0]),'public bucket forbidden');
 assert.deepEqual(backend.snapshot(),originals);
 console.log('OK · 3 UUID PDF uploads/downloads; 6× foreign SELECT/INSERT/DELETE denied even bypassing facade');
 // Registration guards on facade do NOT pretend RLS validates confirmed email.
 for(const [state,name] of [
  [{...principal(A),is_anonymous:true},'anonymous'],
  [{...principal(A),confirmed:false},'unconfirmed'],
  [{...principal(A),active:false},'expired'],
  [{id:null,role:'anon'},'no session']
 ]){
  const client=backend.client(state);
  const store=Pdf.create(client,{cryptoSource:crypto.webcrypto});
  await assert.rejects(store.read(A,paths[0]),/identidad no verificada/,'facade denies '+name);
  await assert.rejects(store.putNew(A,toPath(A,pdf(name)),pdf(name)),/identidad no verificada/);
  if(name==='unconfirmed'){
   const r=await client.storage.from(BUCKET).download(paths[0]);
   assert.ok(r.data,'Mock RLS intentionally checks UUID, not confirmed-email state');
  }
 }
 // A corrupt existing object cannot be considered a safe duplicate.
 const corrupt=pdf('healthy');const target=toPath(A,corrupt);
 backend.seed(A,target,pdf('corrupted'));
 await assert.rejects(stores[0].read(A,target),/Checksum/);
 await assert.rejects(stores[0].putNew(A,target,corrupt),/Checksum/);
 // QuotaExceededError does not mutate existing objects.
 const beforeQuota=backend.snapshot();
 backend.failNextQuota();
 const quotaFile=pdf('exceeds-quota');
 await assert.rejects(stores[0].putNew(A,toPath(A,quotaFile),quotaFile),/denegó la subida/);
 assert.deepEqual(backend.snapshot(),beforeQuota);
 // Server allows only strict single-use remove; no deletion of untracked files.
 const seeded=pdf('existing-stored');const seededPath=toPath(A,seeded);
 backend.seed(A,seededPath,seeded);
 assert.equal(await stores[0].putNew(A,seededPath,seeded),false);
 await assert.rejects(stores[0].remove(A,seededPath),/no es un archivo temporal/);
 await stores[1].remove(B,paths[1]);
 await assert.rejects(stores[1].remove(B,paths[1]),/no es un archivo temporal/);
 assert.equal(await stores[1].read(B,paths[1]),null);
 // Changing user mid-flight denies or prevents unauthorized result delivery.
 const swap=backend.client(principal(A));
 const isolated=Pdf.create(swap,{cryptoSource:crypto.webcrypto});
 let unlock;
 const blocked=new Promise(resolve=>unlock=resolve);
 backend.pauseNext(blocked);
 const reading=isolated.read(A,paths[0]);
 await new Promise(resolve=>setImmediate(resolve));
 swap.change(principal(B));unlock();
 await assert.rejects(reading,/Storage denegó|identidad no verificada/);
 assert.equal(swap.getPrincipal().id,B);
 // Integrate A6's *actual* migration with the private Storage facade + RLS docs.
 const docs=createDocumentServer();
 const repo=createRepository(docs.client(principal(C)));
 const cStore=Pdf.create(backend.client(principal(C)),{cryptoSource:crypto.webcrypto});
 const single=pdf('private-migration-C');
 const profile='p-rls-test';
 const local={getItem(k){
  return k==='mi-bowling-profile:'+profile+':mi-bowling-analitica-v2'?
   JSON.stringify({version:2,hand:'zurdo',sessions:[{id:'session-C',games:[{
    id:'game-C',score:202,rolls:[{frame:1,ball:1,pins:[1,2,3]}]}]}],
    balls:[{id:'ball-C'}],patterns:[{id:'oil-C',pdfName:'oil-C.pdf'}]}):null;
 }};
 const pkg=await Migration.capture({storage:local,readPdf:async id=>id==='oil-C'?single:null,
  sourceProfileId:profile,ownerId:C,confirmOwnerId:C,acknowledge:Migration.ACK,
  cryptoSource:crypto.webcrypto});
 const saved=await Migration.apply({pkg,ownerId:C,repository:repo,fileStore:cStore,
  acknowledge:Migration.ACK,cryptoSource:crypto.webcrypto});
 assert.equal(saved.status,'verified');
 assert.equal(saved.stats.games,1);
 const result=await repo.load(C);
 assert.equal(result.personal.payload.sessions[0].games[0].score,202);
 assert.equal(result.league.payload.matches.length,0);
 const backup=await Migration.backupRemote({ownerId:C,repository:repo,
  fileStore:cStore,cryptoSource:crypto.webcrypto});
 assert.equal(backup.pdfs.length,1);
 assert.equal(await Migration.verifyRemoteBackup(backup,{ownerId:C,cryptoSource:crypto.webcrypto}),true);
 const forbiddenPdf=backend.snapshot().find(x=>x.owner===C);
 assert.ok(forbiddenPdf);
 console.log('OK · checksum, immutable paths, quota, identity races and no public/signed URLs');
 console.log('OK · A6 migration read-back/backup with new A8 private facade and simulated server RLS');
 console.log('OK · No actual Supabase project, SQL, emails, buckets or personal data');
}
main().catch(e=>{console.error(e);process.exitCode=1});
