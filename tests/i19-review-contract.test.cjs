/* MI BOWLING I19 · adversarial human-review trail, no automatic promotion. */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,C_ID,PASS,clone}=require('./i19-review-fixture.cjs');
async function main(){
 const f=await fixture(A),V=f.V,H=f.H,caseA=f.conflict;
 let log=await V.prepare(caseA);
 assert.equal(log.status,'review-open');
 assert.equal(log.authority,'none');
 assert.equal(log.operationalApproval,false);
 assert.equal(log.reviewerIdentityProven,false);
 assert.equal(log.independentReviewersProven,false);
 assert.equal(log.timestampProven,false);
 assert.equal(log.immutableStorageProven,false);
 assert.equal(log.events.length,0);
 const orig=JSON.stringify(log);
 const first=await V.record(log,caseA,null,'A','disputed-evidence',
  'signed-branch-comparison');
 assert.equal(log.events.length,0);
 assert.equal(JSON.stringify(log),orig);
 assert.equal(first.events[0].previousHash,V.ZERO);
 const second=await V.record(first,caseA,null,'B','requires-independent-review',
  'external-provenance-unverified');
 assert.equal(second.events.length,2);
 assert.equal(second.events[1].previousHash,second.events[0].hash);
 const v=await V.verify(second,caseA);
 assert.equal(v.reviewerLabels,2);
 assert.equal(v.sourceDecision,'quarantine-conflicting-evidence');
 assert.equal(v.operationalApproval,false);
 assert.equal(v.externalDigestMatched,false);
 const last=await V.escalate(second,caseA);
 assert.equal(last.status,'escalated-unresolved');
 assert.equal(last.events[2].assessment,'unresolved-signed-fork');
 assert.equal(last.events[2].stage,'manual-escalation');
 assert.equal(last.operationalApproval,false);
 assert.equal((await V.verify(last,caseA)).integrityChecked,true);
 assert.equal((await V.verify(last,caseA)).authority,'none');
 assert.equal(JSON.stringify(last).includes(PASS),false);
 assert.equal(JSON.stringify(last).includes('privateKey'),false);
 // No double reviewer label and no unilateral escalation, even with I18 coherence.
 await assert.rejects(V.record(first,caseA,null,'A','integrity-only',
  'i18-internal-hashes'),/alias de revisión repetido/);
 await assert.rejects(V.escalate(first,caseA),/faltan dos/);
 await assert.rejects(V.record(last,caseA,null,'C','integrity-only',
  'i18-internal-hashes'),/cerrada/);
 await assert.rejects(V.escalate(last,caseA),/faltan dos/);
 await assert.rejects(V.record(second,caseA,null,'X','integrity-only',
  'i18-internal-hashes'),/no autorizada/);
 await assert.rejects(V.record(second,caseA,null,'C','operationally-approved',
  'i18-internal-hashes'),/no autorizada/);
 await assert.rejects(V.record(second,caseA,null,'C','integrity-only',
  'signed-by-real-human'),/no autorizada/);
 const changedAssessment=clone(last);
 changedAssessment.events[0].assessment='integrity-only';
 await assert.rejects(V.verify(changedAssessment,caseA),/TRAZA/);
 const alteredOrder=clone(last);
 [alteredOrder.events[0],alteredOrder.events[1]]=
  [alteredOrder.events[1],alteredOrder.events[0]];
 await assert.rejects(V.verify(alteredOrder,caseA),/TRAZA/);
 const forgedApproval=clone(last);forgedApproval.operationalApproval=true;
 await assert.rejects(V.verify(forgedApproval,caseA),/confianza no autorizada/);
 const forgedReviewers=clone(last);forgedReviewers.independentReviewersProven=true;
 await assert.rejects(V.verify(forgedReviewers,caseA),/confianza no autorizada/);
 const fakeTime=clone(last);fakeTime.timestampProven=true;
 await assert.rejects(V.verify(fakeTime,caseA),/confianza no autorizada/);
 const fakeEscalation=clone(last);
 fakeEscalation.events[2].assessment='approve-restoration';
 await assert.rejects(V.verify(fakeEscalation,caseA),/TRAZA/);
 const repeatLabel=clone(last);
 repeatLabel.events[1].reviewer='A';
 await assert.rejects(V.verify(repeatLabel,caseA),/repetido/);
 const skipChain=clone(last);skipChain.events.splice(1,1);
 await assert.rejects(V.verify(skipChain,caseA),/escalada inválida|TRAZA/);
 const changeDigest=clone(last);changeDigest.dossierDigest='f'.repeat(64);
 await assert.rejects(V.verify(changeDigest,caseA),/confianza no autorizada/);
 const wrongDossier=await V.prepare(f.consistent);
 await assert.rejects(V.verify(last,f.consistent),/confianza no autorizada/);
 // An independently supplied matching I18 digest is a comparison only;
 // it does not certify custody, real reviewers, or when the hash was made.
 let pinned=await V.prepare(f.total,f.total.dossierDigest);
 assert.equal(pinned.externalDigest,f.total.dossierDigest);
 pinned=await V.record(pinned,f.total,f.total.dossierDigest,'A',
  'missing-originals','external-anchor-absent');
 pinned=await V.record(pinned,f.total,f.total.dossierDigest,'B',
  'requires-independent-review','external-provenance-unverified');
 pinned=await V.escalate(pinned,f.total,f.total.dossierDigest);
 assert.equal(pinned.events[2].assessment,'missing-original-I15-trust');
 assert.equal((await V.verify(pinned,f.total,f.total.dossierDigest))
  .externalDigestMatched,true);
 await assert.rejects(V.verify(pinned,f.total,'f'.repeat(64)),/PIN externo/);
 await assert.rejects(V.verify(pinned,f.total),/confianza no autorizada/);
 assert.equal(pinned.operationalApproval,false);
 // Other loss reason and conditionally consistent I18 still have no release.
 let loss=await V.prepare(f.anchorsLost);
 loss=await V.record(loss,f.anchorsLost,null,'A','missing-originals',
  'external-anchor-absent');
 loss=await V.record(loss,f.anchorsLost,null,'C','requires-independent-review',
  'external-provenance-unverified');
 loss=await V.escalate(loss,f.anchorsLost);
 assert.equal(loss.events[2].assessment,'missing-original-I16-anchors');
 let consistent=await V.prepare(f.consistent);
 consistent=await V.record(consistent,f.consistent,null,'A','integrity-only',
  'i18-internal-hashes');
 consistent=await V.record(consistent,f.consistent,null,'B',
  'requires-independent-review','external-provenance-unverified');
 consistent=await V.escalate(consistent,f.consistent);
 assert.equal(consistent.events[2].assessment,'independent-trust-review-required');
 assert.equal(consistent.operationalApproval,false);
 // Cross-owner dossier never validates the old case, and separately verifies.
 for(const owner of [B,C_ID]){
  const other=await fixture(owner);
  const b=await other.V.prepare(other.conflict);
  const one=await other.V.record(b,other.conflict,null,'A',
   'disputed-evidence','signed-branch-comparison');
  const two=await other.V.record(one,other.conflict,null,'B',
   'requires-independent-review','external-provenance-unverified');
  const done=await other.V.escalate(two,other.conflict);
  assert.equal((await other.V.verify(done,other.conflict)).integrityChecked,true);
  await assert.rejects(V.verify(done,caseA),/confianza no autorizada/);
 }
 const independent=await Promise.all([
  V.verify(last,caseA),V.verify(last,caseA),V.verify(last,caseA)
 ]);
 assert.ok(independent.every(x=>x.integrityChecked&&x.noWrites));
 console.log('PASS I19 Node · signed-fork human-labelled review preserved, duplicate alias rejected, 2 reviewer labels, hash chain, manual unresolved escalation, total I15/I16 loss, pin mismatch, cross-owner A/B/C, no auto approval/custody/time claims');
}
main().catch(e=>{console.error(e);process.exitCode=1});
