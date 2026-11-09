/* MI BOWLING I24 · six-axis crosscheck must never certify untrusted witnesses. */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,C_ID,PASS,clone}=require('./i24-manual-crosscheck-fixture.cjs');
async function main(){
 const f=await fixture(A),C=f.C;
 const blank=await C.prepare(f.source);
 assert.equal(blank.classification,'hold-no-independent-proof');
 assert.equal(blank.requirements.length,6);
 assert.equal(blank.evidence.length,6);
 assert.equal(blank.requirements.every(x=>x.satisfied===false&&
  x.status==='not-verified-outside-lab'),true);
 assert.equal((await C.verify(blank)).declaredClaims,0);
 const positive=await C.prepare(f.source,null,f.positive);
 assert.equal(positive.classification,'hold-positive-claims-unverified');
 assert.equal(positive.evidence.every(x=>x.diagnosis==='hold-self-asserted-only'),true);
 assert.equal(positive.status,'manual-assessment-held');
 assert.equal(positive.events.length,1);
 assert.equal(positive.events[0].previousHash,C.ZERO);
 const verification=await C.verify(positive);
 assert.equal(verification.integrityChecked,true);
 assert.equal(verification.heldRequirements,6);
 assert.equal(verification.verifiedExternalRequirements,0);
 assert.equal(verification.declaredClaims,6);
 assert.equal(verification.independentCustodyProven,false);
 assert.equal(verification.operationalApproval,false);
 assert.equal(verification.externalAuthorityProven,false);
 assert.equal(verification.outsideReviewContacted,false);
 assert.equal(positive.authority,'none');
 for(const key of ['operationalApproval','independentCustodyProven','identityProven',
  'preincidentRetentionProven','trustedTimeProven','immutabilityProven',
  'externalApprovalProven','jointReplacementExcluded','outsideReviewContacted',
  'reRootAuthorized','containsScores'])assert.equal(positive[key],false);
 assert.equal(positive.noWrites,true);
 assert.equal(positive.evidence[0].entries[0].originClaim,'claimed-independent');
 assert.equal(positive.evidence[0].entries[0].independentSourceVerified,false);
 assert.equal(positive.evidence[0].entries[0].humanVerified,false);
 assert.equal(positive.requirements.every(x=>!x.humanOrPhysicalProof),true);
 assert.equal(JSON.stringify(positive).includes(PASS),false);
 assert.equal(JSON.stringify(positive).includes('privateKey'),false);
 assert.equal((await C.verify(positive,positive.digest)).externalDigestMatched,true);
 assert.equal((await C.verify(positive,positive.digest)).verifiedExternalRequirements,0);
 const disputed=await C.prepare(f.source,null,f.disputed);
 assert.equal(disputed.classification,'quarantine-manual-disagreement');
 assert.equal(disputed.requirements[0].diagnosis,'quarantine-disputed-reports');
 assert.ok(disputed.findings.includes('contradictory-claims-prior-independent-root'));
 assert.deepEqual(JSON.parse(JSON.stringify(disputed.sheets[0])),
  JSON.parse(JSON.stringify(f.disputed[0])));
 const corr=await C.prepare(f.source,null,f.correlated);
 assert.equal(corr.classification,'hold-positive-claims-unverified');
 assert.equal(corr.findings.some(x=>x.startsWith('correlated-unverified-sha-')),true);
 assert.equal(corr.requirements.every(x=>!x.satisfied),true);
 const invalid=await C.prepare(f.source,null,f.invalid);
 assert.equal(invalid.classification,'quarantine-invalid-claims');
 assert.equal(invalid.evidence[2].entries[2].state,'invalid-claim');
 assert.deepEqual(JSON.parse(JSON.stringify(invalid.sheets[2])),
  JSON.parse(JSON.stringify(f.invalid[2])));
 const missing=clone(f.positive);
 missing[4].claims=[null,null,null];
 assert.equal((await C.prepare(f.source,null,missing)).requirements[4].diagnosis,
  'hold-insufficient-reports');
 const wrongSlot=clone(f.positive);wrongSlot[1].claims[0].slot='B';
 assert.equal((await C.prepare(f.source,null,wrongSlot)).classification,
  'quarantine-invalid-claims');
 const wrongAxis=clone(f.positive);wrongAxis[2].code='real-custodian-identity';
 await assert.rejects(C.prepare(f.source,null,wrongAxis),/requirement order/);
 const secret=clone(f.positive);secret[0].claims[0].privateKey='hidden';
 await assert.rejects(C.prepare(f.source,null,secret),/secret rejected/);
 const counterfeit=clone(f.positive);counterfeit[1].claims[0].origin='verified-custodian';
 assert.equal((await C.prepare(f.source,null,counterfeit)).classification,
  'quarantine-invalid-claims');
 const restored=await C.noteOutsideReview(positive);
 assert.equal(restored.status,'outside-review-noted-not-sent');
 assert.equal(restored.events.length,2);
 assert.equal(restored.events[1].previousHash,restored.events[0].hash);
 assert.equal(restored.outsideReviewContacted,false);
 assert.equal((await C.verify(restored)).integrityChecked,true);
 await assert.rejects(C.noteOutsideReview(restored),/already noted/);
 assert.equal(positive.status,'manual-assessment-held');
 const swapped=await C.prepare(f.replaced,null,f.positive);
 assert.equal(swapped.classification,'hold-positive-claims-unverified');
 assert.equal(swapped.jointReplacementExcluded,false);
 assert.notEqual(swapped.digest,positive.digest);
 await assert.rejects(C.verify(swapped,positive.digest),/supplied separate SHA mismatch/);
 assert.equal((await C.verify(swapped,swapped.digest)).verifiedExternalRequirements,0);
 await assert.rejects(C.prepare(f.replaced,f.source.digest,f.positive),
  /PIN externo|incompatible/i);
 for(const owner of [B,C_ID]){
  const other=await fixture(owner);
  const foreign=await C.prepare(other.source,null,f.positive);
  assert.equal(foreign.classification,'hold-positive-claims-unverified');
  assert.equal((await C.verify(foreign)).independentCustodyProven,false);
 }
 const falseFields=['operationalApproval','independentCustodyProven',
  'identityProven','preincidentRetentionProven','trustedTimeProven',
  'immutabilityProven','externalApprovalProven','jointReplacementExcluded',
  'outsideReviewContacted','reRootAuthorized'];
 for(const field of falseFields){
  const forged=clone(restored);forged[field]=true;
  await assert.rejects(C.verify(forged),/false authority/);
 }
 const forgedRequirement=clone(restored);forgedRequirement.requirements[0].satisfied=true;
 await assert.rejects(C.verify(forgedRequirement),/sources or matrix substituted/);
 const fakeVerification=clone(restored);
 fakeVerification.evidence[0].entries[0].independentSourceVerified=true;
 await assert.rejects(C.verify(fakeVerification),/sources or matrix substituted/);
 const changed=clone(restored);changed.sheets[0].claims[0].verdict='claimed-conflict';
 await assert.rejects(C.verify(changed),/sources or matrix substituted/);
 const reordered=clone(restored);
 [reordered.events[0],reordered.events[1]]=[reordered.events[1],reordered.events[0]];
 await assert.rejects(C.verify(reordered),/audit trace altered/);
 const falseStage=clone(restored);falseStage.events[1].stage='approval-granted';
 await assert.rejects(C.verify(falseStage),/audit trace altered/);
 const falseDigest=clone(restored);falseDigest.digest='f'.repeat(64);
 await assert.rejects(C.verify(falseDigest),/envelope digest altered/);
 const parallel=await Promise.all([C.verify(restored),C.verify(restored),C.verify(restored)]);
 assert.ok(parallel.every(x=>x.integrityChecked&&x.noWrites&&
  !x.operationalApproval&&x.verifiedExternalRequirements===0));
 console.log('PASS I24 Node · six A/B/C requirement crosschecks: 0 external proofs; positive/contradictory/correlated/damaged claims preserved; joint source+SHA replacement unproven, forged custody/time/approval rejected, no writes');
}
main().catch(e=>{console.error(e);process.exitCode=1});
