/* MI BOWLING I20 · adversarial preservation and outside-review request.
 * Case signatures, alias labels and hashes do not create real human authority.
 */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,C_ID,clone}=require('./i20-rival-fixture.cjs');
async function main(){
 const f=await fixture(A),P=f.P,d=f.dossier;
 const contested=await P.prepare(d,null,f.fullReview);
 assert.equal(contested.classification,'quarantine-divergent');
 assert.equal(contested.findings.some(x=>x.startsWith('divergent-event-branch')),true);
 assert.equal(contested.findings.some(x=>x.startsWith('identical-copy')),true);
 assert.deepEqual(JSON.parse(JSON.stringify(contested.claims[1].review)),
  JSON.parse(JSON.stringify(f.acClosed)));
 assert.equal(contested.evidence.length,3);
 assert.equal(contested.evidence[0].classification,'verified-internal');
 assert.equal(contested.evidence[1].classification,'verified-internal');
 assert.equal(contested.evidence[2].classification,'verified-internal');
 assert.equal(contested.status,'quarantine-held');
 assert.equal(contested.authority,'none');
 assert.equal(contested.operationalApproval,false);
 for(const k of ['trustedHumanReviewProven','independentCustodiansProven',
  'timestampProven','immutableStorageProven','recencyProven','reRootAuthorized',
  'containsScores'])assert.equal(contested[k],false);
 assert.equal(contested.noWrites,true);
 assert.equal(contested.events.length,1);
 assert.equal(contested.events[0].previousHash,P.ZERO);
 const valid=await P.verify(contested);
 assert.equal(valid.integrityChecked,true);
 assert.equal(valid.validLogicalFiles,3);
 assert.equal(valid.evidenceDigestMatched,false);
 assert.equal(valid.externalCustodyProven,false);
 const requested=await P.requestExternalReview(contested);
 assert.equal(requested.status,'external-review-requested');
 assert.equal(requested.events.length,2);
 assert.equal(requested.events[1].previousHash,requested.events[0].hash);
 assert.equal(requested.events[1].stage,'outside-review-requested');
 assert.equal(requested.operationalApproval,false);
 assert.equal((await P.verify(requested)).integrityChecked,true);
 assert.equal(contested.events.length,1);
 await assert.rejects(P.requestExternalReview(requested),/ya anotada/);
 const duplicates=await P.prepare(d,null,f.sameReview);
 assert.equal(duplicates.classification,'hold-duplicate-claims');
 assert.equal(duplicates.evidence[2].classification,'absent');
 assert.equal((await P.verify(duplicates)).missingLogicalFiles,1);
 const compatible=await P.prepare(d,null,f.compatible);
 assert.equal(compatible.classification,'hold-compatible-conditional');
 assert.equal(compatible.operationalApproval,false);
 const onlyOne=await P.prepare(d,null,[f.fullReview[0],null,null]);
 assert.equal(onlyOne.classification,'hold-insufficient');
 const allGone=await P.prepare(d,null,[null,null,null]);
 assert.equal(allGone.classification,'hold-insufficient');
 assert.equal((await P.verify(allGone)).validLogicalFiles,0);
 const invalid=clone(f.fullReview);
 invalid[1].review.events[0].assessment='approve-restoration';
 const rejected=await P.prepare(d,null,invalid);
 assert.equal(rejected.classification,'quarantine-unverifiable');
 assert.equal(rejected.evidence[1].classification,'invalid');
 assert.deepEqual(JSON.parse(JSON.stringify(rejected.claims[1])),
  JSON.parse(JSON.stringify(invalid[1])));
 const mismatched=clone(f.fullReview);
 mismatched[0].slot='C';
 const wrongSlot=await P.prepare(d,null,mismatched);
 assert.equal(wrongSlot.classification,'quarantine-unverifiable');
 assert.equal(wrongSlot.evidence[0].reason,'slot-or-format-invalid');
 const crossing=clone(f.fullReview);
 const other=await fixture(B);
 crossing[1]={slot:'B',review:other.abClosed};
 const wrongOwner=await P.prepare(d,null,crossing);
 assert.equal(wrongOwner.classification,'quarantine-unverifiable');
 // Only a separate externally supplied digest can detect complete packet replacement.
 await assert.rejects(P.verify(requested,'f'.repeat(64)),/PIN de paquete/);
 const externalPin=await P.verify(requested,requested.packetDigest);
 assert.equal(externalPin.evidenceDigestMatched,true);
 assert.equal(externalPin.independentHumansProven,false);
 const fakeAuthority=clone(requested);fakeAuthority.operationalApproval=true;
 await assert.rejects(P.verify(fakeAuthority),/autoridad prohibida/);
 const fakeCustody=clone(requested);fakeCustody.independentCustodiansProven=true;
 await assert.rejects(P.verify(fakeCustody),/autoridad prohibida/);
 const fakeStatus=clone(requested);fakeStatus.status='published-and-restored';
 await assert.rejects(P.verify(fakeStatus),/autoridad prohibida/);
 const alteredTrace=clone(requested);alteredTrace.events[1].stage='permission-granted';
 await assert.rejects(P.verify(alteredTrace),/TRAZA/);
 const reordered=clone(requested);
 [reordered.events[0],reordered.events[1]]=[reordered.events[1],reordered.events[0]];
 await assert.rejects(P.verify(reordered),/TRAZA/);
 const changedClaim=clone(requested);
 changedClaim.claims[1].review.events[0].hash='f'.repeat(64);
 await assert.rejects(P.verify(changedClaim),/fuentes o dictamen/);
 const deleted=clone(requested);deleted.claims.pop();
 await assert.rejects(P.verify(deleted),/tres posiciones/);
 const changedFile=clone(requested);changedFile.dossier.decision='conditionally-consistent';
 await assert.rejects(P.verify(changedFile),/expediente|alterado|integridad|decisión|escalada/i);
 const secret=clone(f.fullReview);secret[0].review.privateKey='must-never-export';
 await assert.rejects(P.prepare(d,null,secret),/secreto/);
 await assert.rejects(P.prepare(d,'f'.repeat(64),f.fullReview),/PIN externo/);
 // If I18 is pinned externally, all I19 claims must ALSO have been bound to
 // that exact supplied pin. Their normal null PINs cannot silently be upgraded.
 const supposedlyPinned=await P.prepare(d,d.dossierDigest,f.fullReview);
 assert.equal(supposedlyPinned.classification,'quarantine-unverifiable');
 const pinnedLogBase=await f.V.prepare(d,d.dossierDigest);
 const pinnedLogA=await f.V.record(pinnedLogBase,d,d.dossierDigest,
  'A','disputed-evidence','signed-branch-comparison');
 const pinnedLogB=await f.V.record(pinnedLogBase,d,d.dossierDigest,
  'B','requires-independent-review','external-provenance-unverified');
 const pinned=await P.prepare(d,d.dossierDigest,[
  {slot:'A',review:pinnedLogA},{slot:'B',review:pinnedLogB},null]);
 assert.equal(pinned.classification,'quarantine-divergent');
 assert.equal(pinned.operationalApproval,false);
 assert.equal((await P.verify(pinned)).integrityChecked,true);
 // All underlying I18 diagnoses remain non-authoritative, including lost trust.
 for(const dossier of [f.total,f.anchorsLost,f.consistent]){
  const p=await P.prepare(dossier,null,[null,null,null]);
  assert.equal(p.authority,'none');assert.equal(p.operationalApproval,false);
  assert.equal((await P.requestExternalReview(p)).status,'external-review-requested');
 }
 for(const owner of [B,C_ID]){
  const fx=await fixture(owner);
  const packet=await fx.P.prepare(fx.dossier,null,fx.fullReview);
  assert.equal(packet.owner,owner);
  assert.equal((await fx.P.verify(packet)).integrityChecked,true);
  await assert.rejects(P.prepare(d,null,[
   {slot:'A',review:fx.abClosed},null,null]).then(x=>P.verify({...x,owner})),
   /autoridad prohibida|fuentes o dictamen/);
 }
 const parallel=await Promise.all([P.verify(requested),P.verify(requested),P.verify(requested)]);
 assert.ok(parallel.every(x=>x.integrityChecked&&x.noWrites));
 console.log('PASS I20 Node · divergent and duplicate I19 claims preserved, invalid branch retained, missing/prefix variants blocked, separate external PIN, no false custody, external request without permission, A/B/C, adversarial tampering and parallel no-write');
}
main().catch(e=>{console.error(e);process.exitCode=1});
