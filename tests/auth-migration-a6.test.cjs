/* MI BOWLING · LAB A6 · Real migration engine + fake RLS documents/PDF store.
 * Exhaustive checks use only made-up A/B/C accounts, sessions, scores, oil PDFs.
 * NO browser storage, SQL, remote accounts, data uploads, deployments.
 */
'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {
 ACK,capture,verify,backupRemote,verifyRemoteBackup,apply,summary,digest
}=require('../auth-legacy-migration-lab.js');
const {createServer}=require('./rls-mock-server.cjs');
const {createStore}=require('./private-pdf-store-mock.cjs');
const A='11111111-1111-4111-8111-111111111111',
 B='22222222-2222-4222-8222-222222222222',
 C='33333333-3333-4333-8333-333333333333';
const owner=id=>({id,role:'authenticated',is_anonymous:false,confirmed:true,active:true});
const pdf=id=>new Uint8Array(Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /ID ('+id+') >>\nendobj\n%%EOF','utf8'));
function personal(id,scores,patternNames){
 const games=scores.map((score,i)=>({
  id:'game-'+id+'-'+i,score,
  includeStats:true,rolls:Array.from({length:10},(_,j)=>({
   frame:j+1,ball:1,ballId:'ball-'+id,pins:[1,2,3,4,5,6,7,8,9,10]
  }))
 }));
 return{
  version:2,hand:id==='C'?'zurdo':'diestro',
  balls:[{id:'ball-'+id,brand:'LAB',model:'Bola '+id}],
  patterns:patternNames.map((n,i)=>({id:'pattern-'+id+'-'+i,
   name:'Aceite '+id+' '+i,pdfName:n})),
  sessions:[{id:'session-'+id,type:'entrenamiento',date:'2026-11-08',
   title:'Entrenamiento ficticio '+id,venue:'Pista de prueba',
   games,notes:'Solo datos inventados'}]
 };
}
function storage(values){
 const entries=new Map(Object.entries(values));let writes=0;
 return{getItem:key=>entries.has(key)?entries.get(key):null,
  setItem(){writes++;throw Error('Legacy read-only: set prohibited')},
  removeItem(){writes++;throw Error('Legacy read-only: remove prohibited')},
  snapshot:()=>[...entries.entries()],
  writes:()=>writes
 };
}
function sourceFixture(which,sourceProfileId,pdfList,leagueArchive={}){
 const pre='mi-bowling-profile:'+sourceProfileId+':';
 const history=personal(which,which==='A'?[300,181]:[157,201],pdfList.map(x=>x.name));
 const files=new Map(pdfList.map((entry,i)=>['pattern-'+which+'-'+i,pdf(which+'-'+i)]));
 const store=storage({
  [pre+'mi-bowling-analitica-v2']:JSON.stringify({...history,localPlayer:{id:sourceProfileId},
   leagueNational:{matches:[{id:'local-league-'+which}]} }),
  [pre+'mi-bowling-liga-v1']:JSON.stringify({matches:[{id:'legacy-private-'+which}]}),
  [pre+'mi-bowling-quick-layout']:'compact',
  ...leagueArchive
 });
 let reads=0;
 return{store,files,history,readPdf:async id=>{reads++;return files.get(id)||null},reads:()=>reads};
}
async function safeCapture(fixture,sourceProfileId,ownerId){
 return capture({storage:fixture.store,readPdf:fixture.readPdf,sourceProfileId,
  ownerId,confirmOwnerId:ownerId,acknowledge:ACK,cryptoSource:crypto.webcrypto});
}
function equalHistory(a,b){
 const stripped=v=>({hand:v.hand,balls:v.balls,patterns:v.patterns,sessions:v.sessions,version:v.version});
 assert.deepEqual(stripped(a),stripped(b));
}
async function main(){
 const cloud=createServer();
 cloud.seed(A,'league',{version:1,matches:[{id:'national-A',total:190}]});
 cloud.seed(B,'league',{version:1,matches:[{id:'national-B',total:145}]});
 cloud.seed(C,'league',{version:1,matches:[]});
 const clients=new Map([A,B,C].map(id=>[id,cloud.client(owner(id))]));
 const repositories=new Map([...clients].map(([id,client])=>[id,
  (()=>{const ctx={};ctx.window=ctx;require('node:vm').createContext(ctx);
   require('node:vm').runInContext(require('node:fs').readFileSync(
    require('node:path').join(__dirname,'../auth-private-repository.js'),'utf8'),ctx);
   return ctx.MiBowlingPrivateRepository.create(client)})()
 ]));
 const fileStore=createStore(owner(A));
 const initial=cloud.snapshot();
 const fixtureA=sourceFixture('A','legacy',[{name:'Aceite-A-0.pdf'},{name:'Aceite-A-1.pdf'}]);
 const fixtureC=sourceFixture('C','p-test-c',[{name:'Aceite-C-0.pdf'}]);
 const rawLegacy=fixtureA.store.snapshot(),rawC=fixtureC.store.snapshot();
 // First read-only backup: no implicit assignment, no overwrite of originals.
 await assert.rejects(capture({storage:fixtureA.store,readPdf:fixtureA.readPdf,
  sourceProfileId:'legacy',ownerId:A,confirmOwnerId:B,acknowledge:ACK,cryptoSource:crypto.webcrypto}),/confirmación expresa/);
 await assert.rejects(capture({storage:fixtureA.store,readPdf:fixtureA.readPdf,
  sourceProfileId:'p-test-other',ownerId:A,confirmOwnerId:A,acknowledge:ACK,cryptoSource:crypto.webcrypto}),/No se encontró el historial seleccionado/);
 assert.deepEqual(fixtureA.store.snapshot(),rawLegacy);
 assert.equal(fixtureA.store.writes(),0);
 const pkgA=await safeCapture(fixtureA,'legacy',A);
 const pkgC=await safeCapture(fixtureC,'p-test-c',C);
 const validatedA=await verify(pkgA,{ownerId:A,cryptoSource:crypto.webcrypto});
 assert.equal(validatedA.ownerId,A);
 assert.deepEqual(pkgA.stats,{sessions:1,games:2,rolls:20,pinHits:200,balls:1,patterns:2});
 assert.equal(pkgA.files.length,2);
 assert.deepEqual(pkgA.personal.sessions,fixtureA.history.sessions);
 assert.equal(pkgA.personal.leagueNational,undefined);
 assert.equal(pkgA.leagueArchive.leagueNational.matches[0].id,'local-league-A');
 assert.equal(pkgA.leagueArchive['mi-bowling-liga-v1'].matches[0].id,'legacy-private-A');
 assert.equal(pkgA.leagueArchive['mi-bowling-quick-layout'],'compact');
 assert.deepEqual(fixtureA.store.snapshot(),rawLegacy);
 assert.deepEqual(fixtureC.store.snapshot(),rawC);
 // Tampered score, PDF content, missing PDF, missing backup and false owner all fail.
 const damagedScore=structuredClone(pkgA);
 damagedScore.personal.sessions[0].games[0].score=999;
 await assert.rejects(verify(damagedScore,{ownerId:A,cryptoSource:crypto.webcrypto}),/Checksum SHA-256/);
 const damagedPins=structuredClone(pkgA);
 damagedPins.personal.sessions[0].games[0].rolls[0].pins=[1,2,3];
 await assert.rejects(verify(damagedPins,{ownerId:A,cryptoSource:crypto.webcrypto}),/Estadísticas o totales alterados/);
 const damagedPdf=structuredClone(pkgA);
 damagedPdf.files[0].bytesBase64=damagedPdf.files[0].bytesBase64.replace('UE', 'UU');
 await assert.rejects(verify(damagedPdf,{ownerId:A,cryptoSource:crypto.webcrypto}),/PDF|Checksum/);
 const missingPdf=structuredClone(pkgA);missingPdf.files=[];
 await assert.rejects(verify(missingPdf,{ownerId:A,cryptoSource:crypto.webcrypto}),/Falta PDF/);
 await assert.rejects(verify(pkgA,{ownerId:B,cryptoSource:crypto.webcrypto}),/otro UUID/);
 assert.deepEqual(cloud.snapshot(),initial,'Capture/verify cannot write cloud data');
 console.log('OK · A/C read-only local backups, exact histories, SHA-256, two PDFs, league archive separate');
 // Import A into blank authenticated owner, verify every PDF after writing.
 const resultA=await apply({pkg:pkgA,ownerId:A,repository:repositories.get(A),
  fileStore,mode:'import',acknowledge:ACK,cryptoSource:crypto.webcrypto});
 assert.equal(resultA.status,'verified');
 assert.equal(resultA.revision,0);
 assert.equal(resultA.pdfs,2);
 const importedA=(await repositories.get(A).load(A)).personal;
 equalHistory(importedA.payload,fixtureA.history);
 assert.equal(importedA.payload.patternPdfRefs.length,2);
 for(const ref of importedA.payload.patternPdfRefs){
  assert.equal(ref.ownerId,A);
  assert.equal(ref.path,A+'/patterns/'+ref.sha256+'.pdf');
  const bytes=await fileStore.read(A,ref.path);
  assert.equal(await digest(bytes,crypto.webcrypto),ref.sha256);
 }
 const remoteBackupA=await backupRemote({ownerId:A,repository:repositories.get(A),
  fileStore,cryptoSource:crypto.webcrypto});
 assert.equal(remoteBackupA.pdfs.length,2);
 assert.equal(remoteBackupA.revision,0);
 await verifyRemoteBackup(remoteBackupA,{ownerId:A,cryptoSource:crypto.webcrypto});
 const ownerALeague=(await repositories.get(A).load(A)).league.payload;
 assert.equal(ownerALeague.matches[0].id,'national-A','Existing League remains independent');
 // B is a new UUID, no data imported and no balls/patterns.
 const bEmpty=await repositories.get(B).load(B);
 assert.deepEqual(bEmpty.personal.payload.sessions,[]);
 assert.deepEqual(bEmpty.personal.payload.balls,[]);
 assert.equal(bEmpty.personal.exists,false);
 // Cross-owner migration is blocked before PDF storage and any writes.
 fileStore.change(owner(B));
 await assert.rejects(apply({pkg:pkgA,ownerId:B,repository:repositories.get(B),
  fileStore,acknowledge:ACK,cryptoSource:crypto.webcrypto}),/otro UUID/);
 const foreignPath=importedA.payload.patternPdfRefs[0].path;
 await assert.rejects(fileStore.read(B,foreignPath),/denegado|inválida/);
 await assert.rejects(repositories.get(B).load(A),/Acceso denegado/);
 // C is isolated from A and has own PDF/file paths, but shares fake server.
 fileStore.change(owner(C));
 const resultC=await apply({pkg:pkgC,ownerId:C,repository:repositories.get(C),
  fileStore,acknowledge:ACK,cryptoSource:crypto.webcrypto});
 assert.equal(resultC.status,'verified');
 equalHistory((await repositories.get(C).load(C)).personal.payload,fixtureC.history);
 assert.equal((await repositories.get(C).load(C)).league.payload.matches.length,0);
 const cBackup=await backupRemote({ownerId:C,repository:repositories.get(C),
  fileStore,cryptoSource:crypto.webcrypto});
 assert.equal(cBackup.pdfs.length,1);
 const allFiles=fileStore.snapshot();
 assert.equal(allFiles.length,3);
 assert.ok(allFiles.every(f=>f.path.startsWith(A+'/')||f.path.startsWith(C+'/')));
 assert.equal(cloud.snapshot().filter(r=>r.doc_type==='league').length,3);
 console.log('OK · A/C imports with PDFs verified; B remains zero, all three National League documents unchanged');
 // Re-import into a populated owner is denied. No hidden loss of scores.
 fileStore.change(owner(A));
 await assert.rejects(apply({pkg:pkgA,ownerId:A,repository:repositories.get(A),
  fileStore,acknowledge:ACK,cryptoSource:crypto.webcrypto}),/Destino no vacío/);
 assert.deepEqual(fileStore.snapshot(),allFiles);
 // Restoration to A requires an independently verified snapshot of current state.
 const intermediate={...structuredClone(importedA.payload),
  sessions:personal('A',[125],[]).sessions};
 await repositories.get(A).write(A,'personal',intermediate,0);
 const afterNewData=(await repositories.get(A).load(A)).personal;
 assert.equal(afterNewData.revision,1);
 assert.equal(afterNewData.payload.sessions[0].games[0].score,125);
 await assert.rejects(apply({pkg:pkgA,ownerId:A,repository:repositories.get(A),
  fileStore,mode:'restore',expectedRevision:1,beforeBackup:remoteBackupA,
  acknowledge:ACK,cryptoSource:crypto.webcrypto}),/Conflicto de versión/);
 const preRestore=await backupRemote({ownerId:A,repository:repositories.get(A),
  fileStore,cryptoSource:crypto.webcrypto});
 assert.equal(preRestore.personal.sessions[0].games[0].score,125);
 const tamperedPrior=structuredClone(preRestore);
 tamperedPrior.personal.sessions[0].games[0].score=234;
 await assert.rejects(apply({pkg:pkgA,ownerId:A,repository:repositories.get(A),
  fileStore,mode:'restore',expectedRevision:1,beforeBackup:tamperedPrior,
  acknowledge:ACK,cryptoSource:crypto.webcrypto}),/Documento previo modificado|Respaldo previo alterado/);
 const restored=await apply({pkg:pkgA,ownerId:A,repository:repositories.get(A),
  fileStore,mode:'restore',expectedRevision:1,beforeBackup:preRestore,
  acknowledge:ACK,cryptoSource:crypto.webcrypto});
 assert.equal(restored.revision,2);
 equalHistory((await repositories.get(A).load(A)).personal.payload,fixtureA.history);
 assert.equal((await repositories.get(A).load(A)).league.payload.matches[0].id,'national-A');
 // Pre-restore backup is still available to recover the overwritten state later.
 assert.equal((await verifyRemoteBackup(preRestore,{ownerId:A,cryptoSource:crypto.webcrypto})),true);
 const editedPersonal=(await repositories.get(A).load(A)).personal;
 await assert.rejects(apply({pkg:pkgA,ownerId:A,repository:repositories.get(A),
  fileStore,mode:'restore',expectedRevision:1,beforeBackup:preRestore,
  acknowledge:ACK,cryptoSource:crypto.webcrypto}),/Conflicto de versión/);
 assert.deepEqual((await repositories.get(A).load(A)).personal.payload,editedPersonal.payload);
 console.log('OK · Explicit restore requires prior snapshot and exact revision; no silent overwrite, League unchanged');
 // Mid-upload failure: staged blobs removed only on independently confirmed noncommit.
 const pkgD=await safeCapture(sourceFixture('A','legacy',[{name:'A.pdf'},{name:'B.pdf'}]),'legacy',A);
 const server2=createServer();const client2=server2.client(owner(A));
 const ctx={};ctx.window=ctx;require('node:vm').createContext(ctx);
 require('node:vm').runInContext(require('node:fs').readFileSync(
  require('node:path').join(__dirname,'../auth-private-repository.js'),'utf8'),ctx);
 const repo2=ctx.MiBowlingPrivateRepository.create(client2);
 const bin2=createStore(owner(A));
 let count=0;
 bin2.beforeWrite(()=>{if(++count===2)throw Error('QuotaExceededError')});
 await assert.rejects(apply({pkg:pkgD,ownerId:A,repository:repo2,fileStore:bin2,
  acknowledge:ACK,cryptoSource:crypto.webcrypto}),/QuotaExceededError/);
 assert.equal(bin2.snapshot().length,0,'New PDFs rolled back after confirmed failed transaction');
 assert.equal((await repo2.load(A)).personal.exists,false);
 // Remote write fails (simulated RLS) after upload; originals and preexisting league untouched.
 bin2.beforeWrite(null);
 const denied={load:ownerId=>repo2.load(ownerId),write:async()=>{throw Error('RLS denied')}};
 await assert.rejects(apply({pkg:pkgD,ownerId:A,repository:denied,fileStore:bin2,
  acknowledge:ACK,cryptoSource:crypto.webcrypto}),/RLS denied/);
 assert.equal(bin2.snapshot().length,0);
 // An ambiguous response can be lost AFTER commit: no PDFs are deleted automatically.
 const lost={load:ownerId=>repo2.load(ownerId),
  write:async(...args)=>{await repo2.write(...args);throw Error('network acknowledgement lost')}};
 await assert.rejects(apply({pkg:pkgD,ownerId:A,repository:lost,fileStore:bin2,
  acknowledge:ACK,cryptoSource:crypto.webcrypto}),/pudo guardar/);
 assert.equal((await repo2.load(A)).personal.payload.migrationReceipt.packageSha256,pkgD.sha256);
 assert.equal(bin2.snapshot().length,2,'Never delete PDFs after ambiguous successful commit');
 // Cross-account same-user replay after signout must not touch remote backups or files.
 const lostState=server2.snapshot();
 client2.change({...owner(B),active:false});
 await assert.rejects(repo2.load(A),/Acceso denegado/);
 assert.deepEqual(server2.snapshot(),lostState);
 assert.deepEqual(fixtureA.store.snapshot(),rawLegacy);
 assert.deepEqual(fixtureC.store.snapshot(),rawC);
 assert.equal(fixtureA.store.writes()+fixtureC.store.writes(),0);
 console.log('OK · Quota rollback, RLS denial, lost acknowledgement preserves PDF and receipts');
 console.log('OK · 3 UUID, integrity/restore/conflict tests with 100% invented data; no external services');
}
main().catch(err=>{console.error(err);process.exitCode=1});
