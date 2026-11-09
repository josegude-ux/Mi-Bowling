/* MI BOWLING I15 · adversarial offline recovery contracts, A/B/C only. */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,C_ID,PASS,clone}=require('./i15-recovery-fixture.cjs');
async function main(){
 const f=await fixture(A),{I15:R,package15:pack,sources,previous}=f;
 const check=(p=pack,s=sources,owner=A,pass=PASS)=>R.verify(p,s,owner,pass);
 const verified=await check();
 assert.equal(verified.verified,true);
 assert.equal(verified.previousEpochs,2);
 assert.equal(verified.recoverySignatures,2);
 assert.equal(verified.acceptanceSignatures,2);
 assert.equal(verified.newAuditCount,3);
 assert.equal(verified.noOldQuorumForNewTransition,true);
 assert.equal(verified.noWrites,true);
 for(const prop of ['containsScores','custodyProven','preIncidentCommitmentTimeProven',
  'timestampProven','retroactiveRevocationProven','immutabilityProven',
  'replayPreventionWithoutExternalStateProven'])
  assert.equal(verified[prop],false);
 assert.equal(JSON.stringify(pack).includes('privateKey'),false);
 assert.equal(JSON.stringify(pack).includes('passphrase'),false);
 const old=await f.E.open(previous.rawFiles[0],PASS,A);
 const current=await f.E.open(previous.rawFiles[2],PASS,A);
 assert.equal((await R.compareCurrent(pack,sources,A,PASS,old)).verdict,
  'rollback-or-suppression-detected');
 assert.equal((await R.compareCurrent(pack,sources,A,PASS,current)).verdict,'aligned');
 // No path silently skips previous I14 and its externally retained pin.
 const truncated=clone(pack),truncatedSource=clone(sources);
 truncated.previousBundle.epochs.pop();
 truncatedSource.previousPolicies.pop();truncatedSource.previousPins13.pop();
 await assert.rejects(check(truncated,truncatedSource),/ROLLBACK/);
 const corruptedPrePin=clone(sources);
 corruptedPrePin.previousLatestPin.lastStatementHash='f'.repeat(64);
 await assert.rejects(check(pack,corruptedPrePin),/ROLLBACK|alteración/);
 const forgedGenesis=clone(sources);
 forgedGenesis.previousGenesisPin.genesisPolicyDigest='a'.repeat(64);
 await assert.rejects(check(pack,forgedGenesis),/SUSTITUCIÓN/);
 const absentRoot=clone(sources);absentRoot.commitment=null;
 await assert.rejects(check(pack,absentRoot),/SUSTITUCIÓN/);
 const replacedAuthority=clone(sources);
 replacedAuthority.recoveryPolicy=clone(sources.newPolicy);
 await assert.rejects(check(pack,replacedAuthority),/SUSTITUCIÓN/);
 const fakeCommit=clone(sources);fakeCommit.commitment.authorityPolicyDigest='f'.repeat(64);
 await assert.rejects(check(pack,fakeCommit),/SUSTITUCIÓN/);
 const noLatest=clone(sources);noLatest.externalLatestPin=null;
 await assert.rejects(check(pack,noLatest),/PIN I15/);
 const oldLast=clone(sources);oldLast.externalLatestPin.statementHash='f'.repeat(64);
 await assert.rejects(check(pack,oldLast),/ROLLBACK/);
 const absentPre=clone(sources);absentPre.previousLatestPin=null;
 await assert.rejects(check(pack,absentPre),/PIN final/);
 // A compromised OLD signer cannot impersonate the separately committed
 // recovery authority, even if it has a valid I14 private key.
 const masquerade=clone(pack);
 masquerade.recovery.authoritySignatures[0].keyId=
  previous.policies[0].keys[0].keyId;
 await assert.rejects(check(masquerade),/no autorizado/);
 const oneSigner=clone(pack);oneSigner.recovery.authoritySignatures.pop();
 await assert.rejects(check(oneSigner),/quórum RECOVERY/);
 const noAccept=clone(pack);noAccept.recovery.acceptSignatures.pop();
 await assert.rejects(check(noAccept),/quórum ACCEPT/);
 const duplicate=clone(pack);
 duplicate.recovery.authoritySignatures[1]=clone(duplicate.recovery.authoritySignatures[0]);
 await assert.rejects(check(duplicate),/duplicado/);
 const wrongDomain=clone(pack);
 wrongDomain.recovery.acceptSignatures[0].signature=
  wrongDomain.recovery.authoritySignatures[0].signature;
 await assert.rejects(check(wrongDomain),/firma ACCEPT/);
 const alteredSig=clone(pack);
 const sig=alteredSig.recovery.authoritySignatures[0];
 sig.signature=(sig.signature[0]==='A'?'B':'A')+sig.signature.slice(1);
 await assert.rejects(check(alteredSig),/firma RECOVERY/);
 const alteredStatement=clone(pack);alteredStatement.recovery.statement.reason='suspected-compromise';
 await assert.rejects(check(alteredStatement),/declaración sustituida|firma RECOVERY/);
 const replayOld=clone(pack);const priorManifest=
  previous.bundle.epochs.at(-1).witnessSnapshots.at(-1).manifest;
 replayOld.recovery.witnessSnapshots[0].manifest=priorManifest;
 await assert.rejects(check(replayOld),/PÉRDIDA|difieren/);
 const tamperCipher=clone(pack);
 const encrypted=JSON.parse(tamperCipher.recovery.witnessSnapshots[0].files[2]);
 encrypted.ciphertext=(encrypted.ciphertext[0]==='A'?'B':'A')+encrypted.ciphertext.slice(1);
 tamperCipher.recovery.witnessSnapshots[0].files[2]=JSON.stringify(encrypted);
 await assert.rejects(check(tamperCipher),/alterada/);
 const missing=clone(pack);missing.recovery.witnessSnapshots[0].files.pop();
 await assert.rejects(check(missing),/PÉRDIDA|difieren/);
 const extra=clone(pack);extra.recovery.oldSignatures=[];
 await assert.rejects(check(extra),/paquete|incompletos/);
 const overlap=clone(sources);
 overlap.newPolicy=await f.I13.createPolicy(A,[
  previous.policies[0].keys[0].publicJwk,
  previous.policies[0].keys[1].publicJwk],2);
 await assert.rejects(check(pack,overlap),/reutiliza claves antiguas/);
 const overlapRescue=clone(sources);
 overlapRescue.newPolicy=clone(sources.recoveryPolicy);
 await assert.rejects(check(pack,overlapRescue),/reutiliza claves antiguas o de rescate/);
 const cross=clone(pack);cross.owner=B;
 await assert.rejects(check(cross),/identidad|incompletos/);
 await assert.rejects(check(pack,sources,B),/identidad|incompletos/);
 await assert.rejects(check(pack,sources,A,'INCORRECT-SYNTHETIC-PASSWORD'),/clave incorrecta/);
 const simultaneous=await Promise.all([check(),check(),check()]);
 assert.ok(simultaneous.every(x=>x.verified&&x.noWrites&&
  x.finalManifestDigest===verified.finalManifestDigest));
 for(const owner of [B,C_ID]){
  const o=await fixture(owner);
  const result=await o.I15.verify(o.package15,o.sources,owner,PASS);
  assert.equal(result.verified,true);assert.equal(result.noWrites,true);
 }
 console.log('PASS I15 Node · anchored I14 history + precommitted disjoint 2-of-3 rescue and new authority, export append-only, rollback/tamper/missing witnesses, old quorum impersonation, key overlap, domain separation, A/B/C, parallel readonly validation; no custody or inmutability claim');
}
main().catch(e=>{console.error(e);process.exitCode=1});
