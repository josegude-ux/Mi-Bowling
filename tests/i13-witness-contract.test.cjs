/* MI BOWLING I13 LAB · detached quorum, version lineage, loss/rollback,
 * altered certificates, cross-identity and concurrency; A/B/C only.
 */
'use strict';
const assert=require('node:assert/strict');
const {A,B,C_ID,fixture,clone}=require('./i13-witness-fixture.cjs');
async function main(){
 const f=await fixture(A,2);
 const {W,policy,pin,bundle,snapshots,PASS,keys,rawFiles,E}=f;
 const valid=await W.verify(bundle,snapshots,policy,pin,A,PASS);
 assert.equal(valid.verified,true);assert.equal(valid.signerThreshold,2);
 assert.equal(valid.trustedSignerChecks,4);
 assert.equal(valid.statements,2);assert.equal(valid.latestReceiptCount,2);
 assert.equal(valid.timestampProven,false);assert.equal(valid.immutabilityProven,false);
 assert.equal(valid.noWrites,true);assert.equal(valid.containsScores,false);
 assert.equal((await W.compareCurrent(bundle,snapshots,policy,pin,A,PASS,
  await E.open(rawFiles[0],PASS,A))).verdict,'rollback-or-suppression-detected');
 assert.equal((await W.compareCurrent(bundle,snapshots,policy,pin,A,PASS,
  await E.open(rawFiles[1],PASS,A))).verdict,'aligned');
 await assert.rejects(W.verify(bundle,snapshots,policy,null,A,PASS),/PIN final/);
 await assert.rejects(W.verify(bundle,snapshots,policy,pin,B,PASS),/identidad/);
 await assert.rejects(W.verify(bundle,snapshots,policy,pin,A,'incorrect-secret-I13'),/clave incorrecta/);
 await assert.rejects(W.verify(bundle,snapshots.slice(1),policy,pin,A,PASS),/incompleto/);
 const old=clone(bundle);old.records=old.records.slice(0,1);
 await assert.rejects(W.verify(old,snapshots.slice(0,1),policy,pin,A,PASS),/ROLLBACK/);
 const alteredPin=clone(pin);alteredPin.lastStatementHash='f'.repeat(64);
 await assert.rejects(W.verify(bundle,snapshots,policy,alteredPin,A,PASS),/ROLLBACK/);
 const changedPolicy=clone(policy);changedPolicy.threshold=3;
 await assert.rejects(W.verify(bundle,snapshots,changedPolicy,pin,A,PASS),/SUSTITUCIÓN/);
 const wrongPolicy=await W.createPolicy(A,[
  f.publicJwks[0],f.publicJwks[2]],2);
 await assert.rejects(W.verify(bundle,snapshots,wrongPolicy,pin,A,PASS),/SUSTITUCIÓN/);
 const substituted=clone(policy);substituted.keys[0].publicJwk=f.publicJwks[2];
 await assert.rejects(W.verify(bundle,snapshots,substituted,pin,A,PASS),/sustituida/);
 const privateJwk=await require('node:crypto').webcrypto.subtle.exportKey('jwk',keys[0].privateKey);
 await assert.rejects(W.createPolicy(A,[privateJwk,f.publicJwks[1]]),/privada/);
 const oneSigner=clone(bundle);oneSigner.records[1].signatures.splice(1,1);
 await assert.rejects(W.verify(oneSigner,snapshots,policy,pin,A,PASS),/insuficiente/);
 const doubled=clone(bundle);
 doubled.records[1].signatures[1]=clone(doubled.records[1].signatures[0]);
 await assert.rejects(W.verify(doubled,snapshots,policy,pin,A,PASS),/duplicado/);
 const forgery=clone(bundle);
 forgery.records[1].signatures[0].signature=
  forgery.records[1].signatures[0].signature.replace(/^./,
   x=>x==='A'?'B':'A');
 await assert.rejects(W.verify(forgery,snapshots,policy,pin,A,PASS),/firma alterada/);
 const unknown=clone(bundle);
 unknown.records[1].signatures[0].keyId='f'.repeat(64);
 await assert.rejects(W.verify(unknown,snapshots,policy,pin,A,PASS),/desconocido/);
 const loss=clone(snapshots);loss[1].files.splice(1,1);
 await assert.rejects(W.verify(bundle,loss,policy,pin,A,PASS),/PÉRDIDA|difieren/);
 const tamper=clone(snapshots);const cipher=JSON.parse(tamper[1].files[1]);
 cipher.ciphertext=(cipher.ciphertext[0]==='A'?'B':'A')+cipher.ciphertext.slice(1);
 tamper[1].files[1]=JSON.stringify(cipher);
 await assert.rejects(W.verify(bundle,tamper,policy,pin,A,PASS),/alterada/);
 const swapped=clone(bundle);[swapped.records[0],swapped.records[1]]=
  [swapped.records[1],swapped.records[0]];
 await assert.rejects(W.verify(swapped,snapshots,policy,pin,A,PASS),/alterado|insuficiente/);
 const stale=clone(snapshots);stale[1]=clone(stale[0]);
 await assert.rejects(W.verify(bundle,stale,policy,pin,A,PASS),/ROLLBACK/);
 const extraneous=clone(bundle);extraneous.privateKey='FORBIDDEN';
 await assert.rejects(W.verify(extraneous,snapshots,policy,pin,A,PASS),/incompleto/);
 // Concurrent independent, fully read-only verification cannot mutate shared
 // evidence; results must be identical across N calls.
 const copies=await Promise.all(Array.from({length:4},()=>
  W.verify(bundle,snapshots,policy,pin,A,PASS)));
 assert.ok(copies.every(x=>x.verified&&x.latestManifestDigest===valid.latestManifestDigest));
 for(const owner of [B,C_ID]){
  const other=await fixture(owner,1);
  assert.equal((await other.W.verify(other.bundle,other.snapshots,
   other.policy,other.pin,owner,other.PASS)).verified,true);
  await assert.rejects(W.verify(bundle,snapshots,policy,pin,owner,PASS),/identidad/);
 }
 console.log('PASS I13 Node · verified 2/3 independent pinned public keys, signed lineage, 2 exports, restore + conflict, PIN downgrade/rollback, lost/tampered witness, signature/key substitution, A/B/C and 4 concurrent read-only checks');
}
main().catch(err=>{console.error(err);process.exitCode=1});
