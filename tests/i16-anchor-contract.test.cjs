/* MI BOWLING I16 · rollback, loss, copy mismatch, verified nonce & identity.
 * Only synthetic player A/B/C; no real storage or private signing outside Node.
 */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,C_ID,PASS,clone}=require('./i16-anchor-fixture.cjs');
async function main(){
 const f=await fixture(A),{K,history,externalRoot,externalMark,copies}=f;
 const verify=(h=history,r=externalRoot,m=externalMark,c=copies,
  owner=A,pass=PASS,package15=f.package15,source=f.source)=>
  K.verify(h,package15,source,owner,pass,r,m,c);
 const valid=await verify();
 assert.equal(valid.verified,true);
 assert.equal(valid.sequence,3);assert.equal(valid.externalCopiesMatched,3);
 assert.equal(valid.signedCheckpoints,6);
 assert.equal(valid.noWrites,true);assert.equal(valid.containsScores,false);
 assert.equal(valid.anchorAssurance,'conditional-on-independent-retained-high-watermark');
 for(const prop of ['independentCustodyProven','authenticClockProven',
  'immutabilityProven','antiReplayWithoutExternalGuardProven'])assert.equal(valid[prop],false);
 // Missing one exact external copy: two surviving independent files suffice,
 // but NO proof they were actually stored with independent custodians.
 const lost=[copies[0],null,copies[2]];
 const oneMissing=await verify(history,externalRoot,externalMark,lost);
 assert.equal(oneMissing.verified,true);assert.equal(oneMissing.externalCopiesMatched,2);
 assert.equal(oneMissing.missingOrInvalidCopies,1);
 const twoLost=[copies[0],null,null];
 await assert.rejects(verify(history,externalRoot,externalMark,twoLost),/CUÓRUM/);
 const corrupt=clone(copies);
 corrupt[1].latestStatementHash='f'.repeat(64);
 const oneCorrupt=await verify(history,externalRoot,externalMark,corrupt);
 assert.equal(oneCorrupt.externalCopiesMatched,2);
 assert.equal(oneCorrupt.missingOrInvalidCopies,1);
 const allCorrupt=clone(copies);allCorrupt[0].markDigest='f'.repeat(64);
 allCorrupt[1].markDigest='e'.repeat(64);
 await assert.rejects(verify(history,externalRoot,externalMark,allCorrupt),/CUÓRUM/);
 const oldMark=await f.watermarkFor(1);
 const staleCopy=await K.anchorCopy('B',oldMark);
 const mixed=[copies[0],staleCopy,copies[2]];
 const mixedProof=await verify(history,externalRoot,externalMark,mixed);
 assert.equal(mixedProof.externalCopiesMatched,2);
 assert.equal(mixedProof.staleCopies,1);
 const tooOld=[copies[0],staleCopy,
  await K.anchorCopy('C',await f.watermarkFor(2))];
 await assert.rejects(verify(history,externalRoot,externalMark,tooOld),/CUÓRUM/);
 const duplicated=[copies[0],copies[0],null];
 await assert.rejects(verify(history,externalRoot,externalMark,duplicated),/duplicada/);
 const malformed=clone(copies);malformed[0].privateKey='MUST-BLOCK';
 const twoRemaining=await verify(history,externalRoot,externalMark,malformed);
 assert.equal(twoRemaining.externalCopiesMatched,2);assert.equal(twoRemaining.missingOrInvalidCopies,1);
 // A stale signed package is still cryptographically valid internally. Only
 // the INDEPENDENTLY retained newer high-watermark rejects its replay.
 await assert.rejects(verify(f.older(1)),/REPLAY|ROLLBACK/);
 await assert.rejects(verify(f.older(2)),/REPLAY|ROLLBACK/);
 // Corrupt watermark, absent watermark and absent genesis all fail closed.
 const wrongMark=clone(externalMark);wrongMark.sequence=2;
 await assert.rejects(verify(history,externalRoot,wrongMark),/REPLAY|ROLLBACK/);
 await assert.rejects(verify(history,externalRoot,null),/obligatorias/);
 await assert.rejects(verify(history,null),/obligatorias/);
 const forgedRoot=clone(externalRoot);forgedRoot.policyDigest='f'.repeat(64);
 await assert.rejects(verify(history,forgedRoot),/génesis externa/);
 const changedI15=clone(f.source);
 changedI15.externalLatestPin.newManifestDigest='f'.repeat(64);
 await assert.rejects(verify(history,externalRoot,externalMark,copies,A,PASS,
  f.package15,changedI15),/ROLLBACK/);
 const changedPolicy=clone(f.source);
 changedPolicy.newPolicy.keys[0].keyId='f'.repeat(64);
 await assert.rejects(verify(history,externalRoot,externalMark,copies,A,PASS,
  f.package15,changedPolicy),/sustituida|SUSTITUCIÓN|clave pública/);
 const wrongOwner=clone(history);wrongOwner.owner=B;
 await assert.rejects(verify(wrongOwner),/identidad/);
 await assert.rejects(verify(history,externalRoot,externalMark,copies,B),/identidad/);
 // Attackers cannot reorder, splice, duplicate nonces or alter signature bytes.
 const reorder=clone(history);
 [reorder.records[1],reorder.records[2]]=[reorder.records[2],reorder.records[1]];
 await assert.rejects(verify(reorder),/REPLAY|BIFURCACIÓN/);
 const nonceReuse=clone(history);
 nonceReuse.records[2].statement.nonce=nonceReuse.records[1].statement.nonce;
 await assert.rejects(verify(nonceReuse),/nonce reutilizado|REPLAY|BIFURCACIÓN/);
 const badSig=clone(history);
 const first=badSig.records[1].signatures[0];
 first.signature=(first.signature[0]==='A'?'B':'A')+first.signature.slice(1);
 await assert.rejects(verify(badSig),/firma de checkpoint/);
 const insufficient=clone(history);
 insufficient.records[1].signatures.pop();
 await assert.rejects(verify(insufficient),/quórum/);
 const crossSigner=clone(history);
 crossSigner.records[1].signatures[0].keyId='f'.repeat(64);
 await assert.rejects(verify(crossSigner),/no autorizado/);
 const sigClone=clone(history);
 sigClone.records[2].signatures[1]=clone(sigClone.records[2].signatures[0]);
 await assert.rejects(verify(sigClone),/duplicado/);
 const future=clone(copies);future[2].sequence=4;
 await assert.rejects(verify(history,externalRoot,externalMark,future),/OBSOLETA/);
 const rootMismatch=clone(externalRoot);rootMismatch.firstStatementHash='f'.repeat(64);
 await assert.rejects(verify(history,rootMismatch),/primer testigo/);
 // All evidence remains read-only; three concurrent independent validations.
 const checks=await Promise.all([verify(),verify(),verify()]);
 assert.ok(checks.every(x=>x.verified&&x.noWrites&&x.sequence===3));
 for(const owner of [B,C_ID]){
  const other=await fixture(owner);
  const r=await other.K.verify(other.history,other.package15,other.source,owner,PASS,
   other.externalRoot,other.externalMark,other.copies);
  assert.equal(r.verified,true);
 }
 const oldWitness=await f.E.open(f.previous.previous.rawFiles[0],PASS,A);
 const verdict=await K.compareCurrent(history,f.package15,f.source,A,PASS,
  externalRoot,externalMark,copies,oldWitness);
 assert.equal(verdict.verdict,'rollback-or-suppression-detected');
 console.log('PASS I16 Node · pinned signed 3-generation 2-of-3 physical-label copies, one lost/corrupt or stale tolerated, double loss/rollbacks/splices/nonce/signature replay blocked, external high-watermark and I15 ancestry verified, A/B/C + concurrent readonly');
}
main().catch(e=>{console.error(e);process.exitCode=1});
