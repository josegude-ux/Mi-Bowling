/* MI BOWLING I23 · adversarial source provenance and independent custody.
 * All subjects and alleged receipts are fictitious A/B/C file labels.
 */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,C_ID,PASS,clone}=require('./i23-external-evidence-fixture.cjs');
async function main(){
 const f=await fixture(A),G=f.G;
 const identical=await G.prepare(f.base,null,f.matching);
 assert.equal(identical.classification,'hold-correlated-reference-claims');
 assert.equal(identical.evidence.length,3);
 assert.equal(identical.evidence.every(x=>x.state==='internally-matching'),true);
 assert.equal(identical.findings.some(x=>x.startsWith('identical-document-copies')),true);
 assert.equal(identical.findings.includes('retention-group-labels-are-self-asserted'),true);
 assert.equal(identical.status,'hold-unverified-external-custody');
 assert.equal(identical.authority,'none');
 assert.equal(identical.operationalApproval,false);
 assert.equal(identical.requirements.length,6);
 assert.ok(identical.requirements.every(x=>x.satisfied===false&&
  x.status==='not-verifiable-in-lab'));
 for(const key of ['independentOriginProven','originalPinAuthenticityProven',
  'humanIdentityProven','custodiansIndependentProven',
  'preincidentRetentionProven','timeProven','immutabilityProven',
  'jointReplacementExcluded','reRootAuthorized','outsideReviewContacted',
  'containsScores'])assert.equal(identical[key],false);
 assert.equal(identical.noWrites,true);
 const v=await G.verify(identical);
 assert.equal(v.integrityChecked,true);
 assert.equal(v.validLogicalClaims,3);
 assert.equal(v.satisfiedExternalRequirements,0);
 assert.equal(v.independentCustodyProven,false);
 assert.equal(v.priorRetentionProven,false);
 assert.equal(v.jointReplacementExcluded,false);
 assert.equal(v.externalDigestMatched,false);
 assert.equal((await G.verify(identical,identical.digest)).externalDigestMatched,true);
 assert.equal((await G.verify(identical,identical.digest)).independentCustodyProven,false);
 assert.equal(JSON.stringify(identical).includes(PASS),false);
 assert.equal(JSON.stringify(identical).includes('privateKey'),false);
 // A self-asserted claim of separate retention cannot become external proof.
 assert.equal(identical.records[0].claim.origin,'claimed-offline');
 assert.equal(identical.records[0].claim.preIncidentClaimed,true);
 assert.equal(identical.evidence[0].physicalRetentionVerified,false);
 assert.equal(identical.evidence[0].independentReferenceVerified,false);
 const note=await G.noteExternalReview(identical);
 assert.equal(note.status,'manual-outside-review-recorded-not-sent');
 assert.equal(note.events.length,2);
 assert.equal(note.events[1].previousHash,note.events[0].hash);
 assert.equal(note.events[1].stage,'manual-outside-review-only');
 assert.equal(note.outsideReviewContacted,false);
 assert.equal((await G.verify(note)).integrityChecked,true);
 await assert.rejects(G.noteExternalReview(note),/ya anotada/);
 // A mutually conflicting but internally valid set must all survive.
 const rivals=await G.prepare(f.base,null,f.competing);
 assert.equal(rivals.classification,'quarantine-competing-versions');
 assert.equal((await G.verify(rivals)).validLogicalClaims,3);
 assert.deepEqual(JSON.parse(JSON.stringify(rivals.records[1].packet)),
  JSON.parse(JSON.stringify(f.rival)));
 assert.equal(rivals.operationalApproval,false);
 // Two sources from a single claimed retention group remain correlated.
 const correlation=await G.prepare(f.base,null,f.correlated);
 assert.equal(correlation.classification,'hold-correlated-reference-claims');
 assert.equal(correlation.findings.some(x=>x.startsWith('same-declared-retention-group')),true);
 assert.equal(correlation.findings.some(x=>x.startsWith('same-logical-alias')),true);
 const one=await G.prepare(f.base,null,[f.record('A'),null,null]);
 assert.equal(one.classification,'hold-matching-without-independent-proof');
 assert.equal((await G.verify(one)).missingLogicalClaims,2);
 const empty=await G.prepare(f.base,null,[null,null,null]);
 assert.equal(empty.classification,'hold-no-reference');
 assert.equal((await G.verify(empty)).validLogicalClaims,0);
 // A coherent replacement of all documents + claimed hashes is still unproven.
 const replaced=await G.prepare(f.replaced,null,[
  f.record('A',f.replaced),f.record('B',f.replaced),
  f.record('C',f.replaced)
 ]);
 assert.equal(replaced.classification,'hold-correlated-reference-claims');
 assert.equal(replaced.jointReplacementExcluded,false);
 assert.notEqual(replaced.digest,identical.digest);
 await assert.rejects(G.verify(replaced,identical.digest),/PIN externo/);
 assert.equal((await G.verify(replaced,replaced.digest)).independentCustodyProven,false);
 // An externally PROVIDED matching reference proves arithmetic only.
 const claimedPin=await G.prepare(f.base,f.base.digest,f.matching);
 assert.equal(claimedPin.originalPinAuthenticityProven,false);
 assert.equal(claimedPin.jointReplacementExcluded,false);
 await assert.rejects(G.prepare(f.replaced,f.base.digest,[
  f.record('A',f.replaced),null,null]),/PIN externo/);
 // Preserve corrupt or counterfeit references instead of secretly repairing.
 const corrupt=clone(f.matching);
 corrupt[1].claim.packetDigest='f'.repeat(64);
 const hold=await G.prepare(f.base,null,corrupt);
 assert.equal(hold.classification,'quarantine-invalid-claim');
 assert.equal(hold.evidence[1].state,'mismatched-reference');
 assert.deepEqual(JSON.parse(JSON.stringify(hold.records[1])),
  JSON.parse(JSON.stringify(corrupt[1])));
 const invalidPacket=clone(f.matching);
 invalidPacket[0].packet.operationallyApproved=true;
 const badPacket=await G.prepare(f.base,null,invalidPacket);
 assert.equal(badPacket.classification,'quarantine-invalid-claim');
 assert.equal(badPacket.evidence[0].state,'invalid-packet');
 const wrongSlot=clone(f.matching);wrongSlot[0].slot='C';
 assert.equal((await G.prepare(f.base,null,wrongSlot)).classification,
  'quarantine-invalid-claim');
 const falseSignature=clone(f.matching);
 falseSignature[0].claim.origin='verified-by-witness';
 assert.equal((await G.prepare(f.base,null,falseSignature)).classification,
  'quarantine-invalid-claim');
 const fakeTime=clone(f.matching);
 fakeTime[0].claim.preIncidentClaimed='2026-01-01';
 assert.equal((await G.prepare(f.base,null,fakeTime)).classification,
  'quarantine-invalid-claim');
 const secret=clone(f.matching);secret[0].claim.privateKey='forbidden';
 await assert.rejects(G.prepare(f.base,null,secret),/secreto rechazado/);
 // Other fictitious owners must not be recognized as same case or as custodians.
 for(const owner of [B,C_ID]){
  const other=await fixture(owner);
  const crossed=await G.prepare(f.base,null,[
   f.record('A',f.base),
   f.record('B',other.base),
   null
  ]);
  assert.equal(crossed.classification,'quarantine-cross-case');
  assert.equal(crossed.evidence[1].subjectMatch,'different-source-digest');
  assert.equal(crossed.humanIdentityProven,false);
 }
 // Malicious approval, timestamp, immutability or provenance reports fail closed.
 for(const name of ['operationalApproval','independentOriginProven',
  'originalPinAuthenticityProven','humanIdentityProven',
  'custodiansIndependentProven','timeProven','immutabilityProven',
  'preincidentRetentionProven','jointReplacementExcluded',
  'outsideReviewContacted','reRootAuthorized']){
  const forged=clone(note);forged[name]=true;
  await assert.rejects(G.verify(forged),/autorización falsificada/);
 }
 const forgedRequired=clone(note);
 forgedRequired.requirements[0].satisfied=true;
 await assert.rejects(G.verify(forgedRequired),/registro, requisitos o fuentes alterados/);
 const forgedEvidence=clone(note);
 forgedEvidence.evidence[0].independentReferenceVerified=true;
 await assert.rejects(G.verify(forgedEvidence),/registro, requisitos o fuentes alterados/);
 const changed=clone(note);
 changed.records[1].claim.packetDigest='f'.repeat(64);
 await assert.rejects(G.verify(changed),/registro, requisitos o fuentes alterados/);
 const reordered=clone(note);
 [reordered.events[0],reordered.events[1]]=[reordered.events[1],reordered.events[0]];
 await assert.rejects(G.verify(reordered),/traza de custodia alterada/);
 const editedStage=clone(note);editedStage.events[1].stage='approval-granted';
 await assert.rejects(G.verify(editedStage),/traza de custodia alterada/);
 const editedSHA=clone(note);editedSHA.digest='f'.repeat(64);
 await assert.rejects(G.verify(editedSHA),/huella interna/);
 const parallel=await Promise.all([G.verify(note),G.verify(note),G.verify(note)]);
 assert.ok(parallel.every(x=>x.integrityChecked&&x.noWrites&&
  x.satisfiedExternalRequirements===0&&x.operationalApproval===false));
 console.log('PASS I23 Node · claimed offline A/B/C receipts remain unverified; all 6 external requirements unsatisfied, correlating/differing/cross-case/corrupt references retained, joint replacement and fake authority/time/custody denied; no writes');
}
main().catch(e=>{console.error(e);process.exitCode=1});
