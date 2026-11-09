/* MI BOWLING I22 · no equivalence between digest match and verified custody.
 * All A/B/C are fictitious logical FILE POSITIONS.
 */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,C_ID,PASS,clone}=require('./i22-uncertainty-fixture.cjs');
async function main(){
 const f=await fixture(A),U=f.U;
 const duplicates=await U.prepare(f.baseline,null,f.duplicates);
 assert.equal(duplicates.classification,'hold-duplicate-claims');
 assert.equal(duplicates.events.length,1);
 assert.equal(duplicates.events[0].previousHash,U.ZERO);
 assert.equal(duplicates.authority,'none');
 assert.equal(duplicates.operationallyApproved,false);
 assert.equal(duplicates.matrix.length,8);
 assert.equal(duplicates.matrix[0].axis,'sha-content-equality');
 assert.equal(duplicates.matrix[0].status,'observed-on-untrusted-input');
 for(const axis of ['source-authenticity','independent-custody',
  'historical-freshness','physical-immutability'])
  assert.equal(duplicates.matrix.find(x=>x.axis===axis).status,'unproven');
 assert.equal(duplicates.matrix.find(x=>x.axis==='operational-release').status,'forbidden');
 for(const key of ['externalProvenanceProven','custodianIndependenceProven',
  'identityProven','historicalFreshnessProven','timestampProven',
  'immutableStorageProven','priorPinAuthenticityProven',
  'jointReplacementExcluded','externalReviewContacted','reRootAuthorized',
  'containsScores'])assert.equal(duplicates[key],false);
 assert.equal(duplicates.noWrites,true);
 assert.equal((await U.verify(duplicates)).internallyConsistent,3);
 assert.equal((await U.verify(duplicates)).externalDigestMatched,false);
 assert.equal((await U.verify(duplicates,duplicates.digest)).externalDigestMatched,true);
 assert.equal((await U.verify(duplicates,duplicates.digest)).independentCustodyProven,false);
 assert.equal(JSON.stringify(duplicates).includes(PASS),false);
 assert.equal(JSON.stringify(duplicates).includes('privateKey'),false);
 // Three identical labelled files do not establish three independent custodians.
 assert.equal(duplicates.evidence[1].originClaim,'claimed-separate');
 assert.equal(duplicates.evidence[1].independentRetentionProven,false);
 assert.deepEqual(JSON.parse(JSON.stringify(duplicates.offers[2].caseFile)),
  JSON.parse(JSON.stringify(f.baseline)));
 const queried=await U.requestExternalReview(duplicates);
 assert.equal(queried.status,'outside-review-recorded-not-sent');
 assert.equal(queried.events.length,2);
 assert.equal(queried.events[1].previousHash,queried.events[0].hash);
 assert.equal(queried.externalReviewContacted,false);
 assert.equal((await U.verify(queried)).integrityChecked,true);
 await assert.rejects(U.requestExternalReview(queried),/ya anotada/);
 assert.equal(duplicates.status,'held-for-independent-review');
 const contested=await U.prepare(f.baseline,null,f.competing);
 assert.equal(contested.classification,'quarantine-parallel-forks');
 assert.equal(contested.evidence.length,3);
 assert.equal(contested.evidence.every(x=>x.internalState==='internally-consistent'),true);
 assert.equal(contested.findings.some(x=>x.startsWith('competing-complete-versions')),true);
 assert.deepEqual(JSON.parse(JSON.stringify(contested.offers[1].caseFile)),
  JSON.parse(JSON.stringify(f.competitor)));
 assert.equal((await U.verify(contested)).integrityChecked,true);
 const unreferenced=await U.prepare(f.baseline,null,f.genuineUnknown);
 assert.equal(unreferenced.classification,'hold-insufficient-claims');
 assert.equal(unreferenced.evidence[0].internalState,'unreferenced');
 assert.equal(unreferenced.evidence[1].internalState,'missing');
 assert.equal(unreferenced.evidence[2].internalState,'missing');
 assert.equal(unreferenced.matrix.find(x=>x.axis==='external-provenance'),undefined);
 const missing=await U.prepare(f.baseline,null,[null,null,null]);
 assert.equal(missing.classification,'hold-insufficient-claims');
 assert.equal((await U.verify(missing)).present,0);
 // A wholly substituted packet plus freshly generated matching references
 // remains consistent; it can never establish an historical original.
 const jointlyReplaced=await U.prepare(f.replacement,null,[
  f.offer('A',f.replacement),
  f.offer('B',f.replacement,f.replacement.digest,'claimed-separate'),
  f.offer('C',f.replacement)
 ]);
 assert.equal(jointlyReplaced.classification,'hold-duplicate-claims');
 assert.equal(jointlyReplaced.externalProvenanceProven,false);
 assert.equal(jointlyReplaced.jointReplacementExcluded,false);
 assert.notEqual(jointlyReplaced.digest,duplicates.digest);
 await assert.rejects(U.verify(jointlyReplaced,duplicates.digest),/PIN externo/);
 // Even if an alleged external pin matches, the tool cannot attest its custody.
 const supplied=await U.prepare(f.baseline,f.baseline.digest,f.duplicates);
 assert.equal(supplied.classification,'hold-duplicate-claims');
 assert.equal(supplied.priorPinAuthenticityProven,false);
 await assert.rejects(U.prepare(f.baseline,'f'.repeat(64),f.duplicates),
  /EXTERNA|huella/i);
 const mismatch=clone(f.duplicates);
 mismatch[1].claimedDigest='f'.repeat(64);
 const invalid=await U.prepare(f.baseline,null,mismatch);
 assert.equal(invalid.classification,'quarantine-invalid-source');
 assert.equal(invalid.evidence[1].internalState,'invalid-digest-claim');
 assert.deepEqual(JSON.parse(JSON.stringify(invalid.offers[1])),
  JSON.parse(JSON.stringify(mismatch[1])));
 const tampered=clone(f.duplicates);
 tampered[2].caseFile.status='externally-approved';
 const damaged=await U.prepare(f.baseline,null,tampered);
 assert.equal(damaged.classification,'quarantine-invalid-source');
 assert.equal(damaged.evidence[2].internalState,'invalid-source-file');
 const malformed=clone(f.duplicates);malformed[0].slot='C';
 assert.equal((await U.prepare(f.baseline,null,malformed)).classification,
  'quarantine-invalid-source');
 const originForgery=clone(f.duplicates);originForgery[0].origin='verified-by-court';
 assert.equal((await U.prepare(f.baseline,null,originForgery)).classification,
  'quarantine-invalid-source');
 const injected=clone(f.duplicates);injected[0].privateKey='forbidden';
 await assert.rejects(U.prepare(f.baseline,null,injected),/secreto rechazado/);
 // File from a different synthetic case: preserved, not silently promoted.
 for(const owner of [B,C_ID]){
  const other=await fixture(owner);
  const foreign=[f.offer('A',f.baseline),
   f.offer('B',other.baseline,other.baseline.digest,'claimed-separate'),
   null];
  const compared=await U.prepare(f.baseline,null,foreign);
  assert.equal(compared.classification,'quarantine-parallel-forks');
  assert.equal(compared.evidence[1].ownerRelation,'different-declared-subjects');
  assert.equal(compared.custodianIndependenceProven,false);
 }
 const approval=clone(queried);approval.operationallyApproved=true;
 await assert.rejects(U.verify(approval),/falsa autoridad/);
 const signed=clone(queried);signed.custodianIndependenceProven=true;
 await assert.rejects(U.verify(signed),/falsa autoridad/);
 const clock=clone(queried);clock.timestampProven=true;
 await assert.rejects(U.verify(clock),/falsa autoridad/);
 const fakeSource=clone(queried);fakeSource.externalProvenanceProven=true;
 await assert.rejects(U.verify(fakeSource),/falsa autoridad/);
 const fakeNoReplacement=clone(queried);fakeNoReplacement.jointReplacementExcluded=true;
 await assert.rejects(U.verify(fakeNoReplacement),/falsa autoridad/);
 const fakeSent=clone(queried);fakeSent.externalReviewContacted=true;
 await assert.rejects(U.verify(fakeSent),/falsa autoridad/);
 const forgedStatus=clone(queried);forgedStatus.status='restoration-approved';
 await assert.rejects(U.verify(forgedStatus),/falsa autoridad/);
 const editedMatrix=clone(queried);editedMatrix.matrix[1].status='proven';
 await assert.rejects(U.verify(editedMatrix),/alteración de matriz/);
 const editedOffer=clone(queried);editedOffer.offers[1].claimedDigest='f'.repeat(64);
 await assert.rejects(U.verify(editedOffer),/alteración de matriz/);
 const eventReordered=clone(queried);
 [eventReordered.events[0],eventReordered.events[1]]=
  [eventReordered.events[1],eventReordered.events[0]];
 await assert.rejects(U.verify(eventReordered),/traza alterada/);
 const wrongDigest=clone(queried);wrongDigest.digest='f'.repeat(64);
 await assert.rejects(U.verify(wrongDigest),/huella del sobre/);
 const parallel=await Promise.all([
  U.verify(queried),U.verify(queried),U.verify(queried)]);
 assert.ok(parallel.every(x=>x.integrityChecked&&x.noWrites&&
  x.independentCustodyProven===false));
 console.log('PASS I22 Node · SHA match != custody; A/B/C duplicate and competing full I21 dossiers retained, coordinated replacement not excluded, false provenance/clock/approval rejected, cross-case quarantined, parallel no-write');
}
main().catch(e=>{console.error(e);process.exitCode=1});
