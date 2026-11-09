/* MI BOWLING I14 · signed key rotation/revocation adversarial contracts. */
'use strict';
const assert=require('node:assert/strict');
const {build,A,B,C_ID,PASS,clone}=require('./i14-lifecycle-fixture.cjs');
async function main(){
 const f=await build(A,3),{I14:L}=f;
 const verify=(bundle=f.bundle,policies=f.policies,pins=f.pins13,
  genesis=f.rootPin,latest=f.latestPin,owner=A,pass=PASS)=>
  L.verify(bundle,policies,pins,genesis,latest,owner,pass);
 const good=await verify();
 assert.equal(good.verified,true);assert.equal(good.epochs,3);
 assert.equal(good.transitionCount,2);assert.equal(good.retiredKeys,2);
 assert.equal(good.signatureChecks,10); // genesis 2, rotate 4, revoke 4
 for(const k of ['authorityCustodyProven','signingTimeProven',
  'retroactiveRevocationProven','immutabilityProven','containsScores'])
  assert.equal(good[k],false);
 assert.equal(good.noWrites,true);
 // Any rollback, even if old I13 bundles and old I14 signatures were genuine,
 // must contradict the separately retained latest I14 pin.
 const rollback=clone(f.bundle);rollback.epochs.pop();
 await assert.rejects(verify(rollback,f.policies.slice(0,-1),
  f.pins13.slice(0,-1)),/ROLLBACK/);
 const swapped=clone(f.bundle);
 [swapped.epochs[1],swapped.epochs[2]]=[swapped.epochs[2],swapped.epochs[1]];
 await assert.rejects(verify(swapped),/transición|BIFURCACIÓN|ROLLBACK/);
 await assert.rejects(verify(f.bundle,f.policies,f.pins13,null),/génesis/);
 await assert.rejects(verify(f.bundle,f.policies,f.pins13,f.rootPin,null),/PIN final/);
 const wrongRoot={...f.rootPin,genesisPolicyDigest:'a'.repeat(64)};
 await assert.rejects(verify(f.bundle,f.policies,f.pins13,wrongRoot),
  /SUSTITUCIÓN/);
 const wrongLatest={...f.latestPin,lastStatementHash:'c'.repeat(64)};
 await assert.rejects(verify(f.bundle,f.policies,f.pins13,f.rootPin,wrongLatest),
  /ROLLBACK/);
 // A formerly authorized but now RETIRED key cannot be silently reinstated.
 const replaced=clone(f.policies);
 replaced[2]=clone(f.policies[0]);
 await assert.rejects(verify(f.bundle,replaced),/CLAVE RETIRADA|transición/);
 const one=clone(f.bundle);one.epochs[1].oldSignatures.pop();
 await assert.rejects(verify(one),/quórum/);
 const other=clone(f.bundle);
 other.epochs[1].newSignatures[0].keyId='f'.repeat(64);
 await assert.rejects(verify(other),/retirado|autorizado/);
 const tamper=clone(f.bundle);
 const sig=tamper.epochs[2].newSignatures[0];
 sig.signature=(sig.signature[0]==='A'?'B':'A')+sig.signature.slice(1);
 await assert.rejects(verify(tamper),/firma.*inválida/);
 const drop=clone(f.bundle);
 drop.epochs[2].witnessSnapshots[0].files.pop();
 await assert.rejects(verify(drop),/difieren|PÉRDIDA/);
 const fork=clone(f.bundle);
 fork.epochs[2].statement.previousHash='f'.repeat(64);
 await assert.rejects(verify(fork),/transición/);
 const badAction=clone(f.bundle);badAction.epochs[1].statement.action='revoke';
 await assert.rejects(verify(badAction),/transición|revocación|firma/);
 // Verified point does not have an externally certified timestamp.
 const current=await f.original.E.open(f.rawFiles[0],PASS,A);
 const detection=await L.compareCurrent(f.bundle,f.policies,f.pins13,
  f.rootPin,f.latestPin,A,PASS,current);
 assert.equal(detection.verdict,'rollback-or-suppression-detected');
 await assert.rejects(verify(f.bundle,f.policies,f.pins13,f.rootPin,f.latestPin,B),
  /identidad|génesis/);
 await assert.rejects(verify(f.bundle,f.policies,f.pins13,f.rootPin,f.latestPin,A,
  'not-the-fixture-passphrase'),/clave incorrecta/);
 const concurrent=await Promise.all([verify(),verify(),verify()]);
 assert.ok(concurrent.every(x=>x.verified&&x.noWrites&&
  x.finalPolicyDigest===good.finalPolicyDigest));
 for(const owner of [B,C_ID]){
  const isolated=await build(owner,1);
  assert.equal((await isolated.I14.verify(isolated.bundle,isolated.policies,
   isolated.pins13,isolated.rootPin,isolated.latestPin,owner,PASS)).verified,true);
 }
 console.log('PASS I14 Node · 3 epochs, 2/3 signed genesis, dual-quorum rotation and revocation, 2 retired keys, external genesis+latest pins, rollback/key replay/old policy/invalid signatures/loss, A/B/C, concurrency and no immutability claims');
}
main().catch(err=>{console.error(err);process.exitCode=1});
