/* MI BOWLING I18 · adversarial provenance / chain of decisions / hold.
 * Internal integrity != external custody or historical freshness.
 */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,C_ID,PASS,clone}=require('./i18-forensic-fixture.cjs');
async function main(){
 const x=await fixture(A),H=x.I18;
 const make=(inp=x.inputs,id=x.CASE,p=PASS)=>H.create(inp,A,id,p);
 const good=await make();
 assert.equal(good.decision,'conditionally-consistent');
 assert.equal(good.operationallyApproved,false);
 assert.equal(good.authority,'none');
 assert.equal(good.reRootAuthorized,false);
 assert.equal(good.diagnosticVerified,true);
 assert.equal(good.evidence.length,7);
 assert.equal(good.events.length,5);
 assert.equal(good.events.at(-1).outcome,'pending-external-human-review');
 assert.equal(good.events[0].previousHash,H.ZERO);
 for(const key of ['custodyIndependenceProven','freshnessWithoutExternalMarkProven',
  'immutableStorageProven','timestampProven','containsScores'])assert.equal(good[key],false);
 assert.equal(good.noWrites,true);
 const exported=JSON.stringify(good);
 assert.equal(exported.includes(PASS),false);
 assert.equal(exported.includes('privateKey'),false);
 assert.equal((await H.verify(good)).externalDigestMatched,false);
 assert.equal((await H.verify(good,good.dossierDigest)).externalDigestMatched,true);
 assert.equal((await H.recheck(good,PASS,good.dossierDigest)).diagnosisRechecked,true);
 // Signed conflict: archive ALL three original reports (including disfavoured fork).
 const conflicted=clone(x.inputs);conflicted.reports[2]=await x.branch('C');
 const held=await make(conflicted);
 assert.equal(held.decision,'quarantine-conflicting-evidence');
 assert.equal(held.action,'quarantine-all-branches');
 assert.equal(held.operationallyApproved,false);
 assert.deepEqual(JSON.parse(JSON.stringify(held.evidence[6].payload)),
  JSON.parse(JSON.stringify(conflicted.reports[2])));
 assert.equal((await H.recheck(held,PASS,held.dossierDigest)).diagnosisRechecked,true);
 const noRoot=clone(x.inputs);noRoot.externalRoot=null;noRoot.externalLatest=null;
 const blocked=await make(noRoot);
 assert.equal(blocked.decision,'blocked-external-reference-loss');
 assert.equal(blocked.action,'recover-original-I16-pins');
 assert.equal(blocked.diagnosticVerified,false);
 assert.equal((await H.recheck(blocked,PASS)).diagnosisRechecked,true);
 const total=await make(x.allLost);
 assert.equal(total.decision,'blocked-total-trust-loss');
 assert.equal(total.action,'recover-original-independent-I15-sources');
 assert.equal(total.authority,'none');
 assert.equal(total.evidence.filter(e=>e.present).length,0);
 assert.equal((await H.recheck(total,PASS)).diagnosisRechecked,true);
 // Recomputed SELF hash alone is NOT independent external evidence.
 const altered=clone(good);
 altered.evidence[4].payload.history.records[1].statement.nonce=
  'aaaaaaaa-1818-4818-8181-000000000018';
 await assert.rejects(H.verify(altered),/evidencia sustituida/);
 const deleted=clone(good);deleted.evidence[6].payload=null;
 await assert.rejects(H.verify(deleted),/orden de evidencias/);
 const substituted=clone(good);
 substituted.evidence[4].payload.copy.markDigest='f'.repeat(64);
 await assert.rejects(H.verify(substituted),/evidencia sustituida/);
 const changedTrace=clone(good);changedTrace.events[2].outcome='operationally-approved';
 await assert.rejects(H.verify(changedTrace),/decisiones/);
 const reordered=clone(good);[reordered.events[1],reordered.events[2]]=
  [reordered.events[2],reordered.events[1]];
 await assert.rejects(H.verify(reordered),/decisiones/);
 const forgedAction=clone(good);forgedAction.action='restore-production';
 await assert.rejects(H.verify(forgedAction),/decisión o escalada/);
 const fakeAuthority=clone(good);fakeAuthority.authority='trusted';
 await assert.rejects(H.verify(fakeAuthority),/atribución indebida/);
 const fakeApproval=clone(good);fakeApproval.operationallyApproved=true;
 await assert.rejects(H.verify(fakeApproval),/atribución indebida/);
 const fakeImmutability=clone(good);fakeImmutability.immutableStorageProven=true;
 await assert.rejects(H.verify(fakeImmutability),/atribución indebida/);
 const badPin='f'.repeat(64);
 await assert.rejects(H.verify(good,badPin),/PIN externo/);
 const missing=clone(good);missing.evidence.pop();
 await assert.rejects(H.verify(missing),/expediente incompleto/);
 const secret=clone(x.inputs);secret.reports[0].privateKey='fictional-secret';
 await assert.rejects(make(secret),/campo de secreto/);
 const cred=clone(x.inputs);cred.source15.apiKey='must-block';
 await assert.rejects(make(cred),/campo de secreto/);
 const crossing=clone(x.inputs);crossing.reports[0].slot='B';
 const invalid=await make(crossing);
 assert.equal(invalid.decision,'quarantine-conflicting-evidence');
 assert.equal(invalid.operationallyApproved,false);
 const changedI15=clone(x.inputs);
 changedI15.source15.externalLatestPin.newManifestDigest='f'.repeat(64);
 const cryptoBlocked=await make(changedI15);
 assert.equal(cryptoBlocked.decision,'blocked-invalid-evidence');
 assert.equal(cryptoBlocked.operationallyApproved,false);
 assert.equal((await H.recheck(cryptoBlocked,PASS)).diagnosisRechecked,true);
 // Reject a changed official decision even if content hash is recalculated;
 // independent digest remains required for provenance of the original case.
 const modified=await make({...x.inputs,reports:[x.reports[0],null,null]});
 assert.equal(modified.decision,'blocked-insufficient-copies');
 await assert.rejects(H.verify(modified,good.dossierDigest),/PIN externo/);
 const concurrent=await Promise.all([make(),make(),make()]);
 assert.ok(concurrent.every(c=>c.dossierDigest===good.dossierDigest&&
  c.events.length===5&&c.operationallyApproved===false));
 for(const owner of [B,C_ID]){
  const v=await fixture(owner);
  const c=await v.I18.create(v.inputs,owner,v.CASE,PASS);
  assert.equal(c.owner,owner);
  assert.equal((await v.I18.recheck(c,PASS)).diagnosisRechecked,true);
 }
 console.log('PASS I18 Node · exact encrypted evidence retention, 5-link decision trace, fork quarantine, total external trust loss, manual-only escalation, tamper/secret rejection, external digest mismatch, recheck, A/B/C, concurrent no-write; no real custody or time claims');
}
main().catch(e=>{console.error(e);process.exitCode=1});
