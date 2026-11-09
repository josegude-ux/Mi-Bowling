/* MI BOWLING I12 LAB · offline manifest, rollback, loss, tamper, fake A/B/C, concurrency. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const ctx={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
for(const file of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',file),'utf8'),ctx,{filename:file});
const C=ctx.MiBowlingI11AuditCore,E=ctx.MiBowlingI11Evidence,M=ctx.MiBowlingI12Manifest;
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const D='33333333-3333-4333-8333-333333333333';
const PASS='I12-FICTICIOUS-EXTERNAL-EVIDENCE-2026';
const id=n=>String(n).padStart(8,'0')+'-1111-4111-8111-111111111111';
const payload=(n,kind='restore',reason='none')=>({
 kind,reason,status:kind==='restore'?'restored':'rejected',
 auditId:id(n),backupId:id(n+30),backupSha:'a'.repeat(64),
 occurredAt:1794200000000+n,sourceCreatedAt:1794000000000+n,
 revision:n,operationsAdded:kind==='restore'?n:0
});
const clone=x=>JSON.parse(JSON.stringify(x));
async function main(){
 let chain=[];
 for(const p of [payload(1),payload(2,'conflict','fork'),payload(3)]){
  chain.push(await C.append(A,p,chain.at(-1)?.chainHash||C.ZERO,chain.length+1));
 }
 const evidence=async(owner,events)=>E.seal({
  version:1,owner,events,head:C.head(owner,events)},PASS);
 const files=await Promise.all([evidence(A,chain.slice(0,1)),
   evidence(A,chain.slice(0,2)),evidence(A,chain)]);
 const sources=files.map(file=>({file,passphrase:PASS}));
 const manifest=await M.build(A,sources),external=M.pin(manifest);
 assert.equal(manifest.entries.length,3);
 assert.equal(manifest.entries[0].newRestoreAuditIds.length,1);
 assert.equal(manifest.entries[1].newConflictAuditIds.length,1);
 assert.equal(manifest.entries[2].newRestoreAuditIds.length,1);
 assert.equal((await M.verify(manifest,sources,A,external)).restoredReceipts,2);
 assert.equal((await M.verify(manifest,sources,A,external)).rejectedConflicts,1);
 assert.equal((await M.verify(manifest,sources,A)).rollbackAssurance,'not-established');
 assert.equal((await M.compareCurrent(A,manifest,sources,external,
  {owner:A,events:chain,head:C.head(A,chain)})).verdict,'aligned');
 const old={owner:A,events:chain.slice(0,1),head:C.head(A,chain.slice(0,1))};
 const gap=await M.compareCurrent(A,manifest,sources,external,old);
 assert.equal(gap.verdict,'rollback-or-suppression-detected');assert.equal(gap.missing,2);
 assert.equal((await M.compareCurrent(A,manifest,sources,external,
  {owner:A,events:[],head:null})).missing,3);
 await assert.rejects(M.compareCurrent(A,manifest,sources,null,old),/PIN externo/);
 const fourth=await C.append(A,payload(4),chain.at(-1).chainHash,4);
 assert.equal((await M.compareCurrent(A,manifest,sources,external,
  {owner:A,events:[...chain,fourth],head:C.head(A,[...chain,fourth])})).verdict,
  'external-witness-obsolete');
 const fork=[chain[0],await C.append(A,payload(5),chain[0].chainHash,2)];
 assert.equal((await M.compareCurrent(A,manifest,sources,external,
  {owner:A,events:fork,head:C.head(A,fork)})).verdict,'fork-detected');
 await assert.rejects(M.verify(manifest,sources.slice(0,2),A,external),/PÉRDIDA|difieren/);
 await assert.rejects(M.verify(manifest,[sources[0],sources[1],sources[1]],A,external),
  /duplicada/);
 await assert.rejects(M.verify(manifest,[sources[2],sources[1],sources[0]],A,external),
  /ROLLBACK|fuera de orden/);
 const oldManifest=await M.build(A,sources.slice(0,2));
 await assert.rejects(M.verify(oldManifest,sources.slice(0,2),A,external),/ROLLBACK/);
 const fake=clone(manifest);fake.entries[2].count=999;
 await assert.rejects(M.verify(fake,sources,A,external),/difieren/);
 const altered=JSON.parse(files[2]);
 altered.ciphertext=(altered.ciphertext[0]==='A'?'B':'A')+altered.ciphertext.slice(1);
 await assert.rejects(M.verify(manifest,[sources[0],sources[1],
  {file:JSON.stringify(altered),passphrase:PASS}],A,external),/alterada/);
 await assert.rejects(M.verify(manifest,sources,A,{...external,manifestDigest:'b'.repeat(64)}),/ROLLBACK/);
 await assert.rejects(M.verify(manifest,sources,B,external),/identidad/);
 for(const owner of [B,D]){
  const foreign=await evidence(owner,[]);
  const m=await M.build(owner,[{file:foreign,passphrase:PASS}]);
  assert.equal((await M.verify(m,[{file:foreign,passphrase:PASS}],owner,M.pin(m))).count,0);
  await assert.rejects(M.verify(manifest,sources,owner),/identidad/);
 }
 const results=await Promise.all(Array.from({length:3},()=>
  M.verify(manifest,sources,A,external)));
 assert.ok(results.every(x=>x.verified&&x.noWrites&&x.externallyPinned));
 // Detached verification ONLY; keys are generated in ephemeral Node test RAM.
 const keys=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},
  true,['sign','verify']);
 const pub=await webcrypto.subtle.exportKey('jwk',keys.publicKey);
 const data=new TextEncoder().encode('MI-BOWLING-I12-MANIFEST-v1|'+manifest.digest);
 const signed=new Uint8Array(await webcrypto.subtle.sign(
  {name:'ECDSA',hash:'SHA-256'},keys.privateKey,data));
 const signature=btoa(String.fromCharCode(...signed));
 assert.equal((await M.verifyDetachedSignature(manifest,signature,pub)).signatureValid,true);
 signed[4]^=1;
 assert.equal((await M.verifyDetachedSignature(manifest,
  btoa(String.fromCharCode(...signed)),pub)).signatureValid,false);
 const other=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 assert.equal((await M.verifyDetachedSignature(manifest,signature,
  await webcrypto.subtle.exportKey('jwk',other.publicKey))).signatureValid,false);
 await assert.rejects(M.verifyDetachedSignature(manifest,signature,
  await webcrypto.subtle.exportKey('jwk',keys.privateKey)),/pública/);
 console.log('PASS I12 · manifests of 3 exports, 2 restores and 1 conflict; external PIN, anchor/file rollback, missing/tampered/reordered files, fork, A/B/C, concurrent readonly checks and independent P-256 public-key verification');
}
main().catch(err=>{console.error(err);process.exitCode=1});
