/* MI BOWLING I21 · coordinated substitution, forged approvals, claimed origin.
 * Two matching files NEVER establish independent pre-incident custody.
 */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,C_ID,PASS,clone}=require('./i21-provenance-fixture.cjs');
async function main(){
 const f=await fixture(A),D=f.D;
 const p=await D.prepare(f.originals);
 assert.equal(p.classification,'blocked-joint-substitution-undecidable');
 assert.equal(p.status,'hold-pending-external-review');
 assert.equal(p.evidence.length,3);
 assert.ok(p.evidence.every(x=>x.state==='internally-coherent'));
 assert.equal(p.findings.some(x=>x.startsWith('duplicates-do-not-prove')),true);
 assert.equal(p.operationalApproval,false);
 assert.equal(p.authority,'none');
 for(const key of ['independentSourceProven','authenticPriorPinProven',
  'humanIdentityProven','custodyIndependenceProven','timeProven',
  'immutabilityProven','freshnessProven','coordinatedReplacementExcluded',
  'containsScores'])assert.equal(p[key],false);
 assert.equal(p.noWrites,true);
 const verified=await D.verify(p);
 assert.equal(verified.integrityChecked,true);
 assert.equal(verified.externalDigestMatched,false);
 assert.equal(verified.jointSubstitutionExcluded,false);
 assert.equal(verified.priorPinAuthenticityProven,false);
 assert.equal(verified.independentCustodyProven,false);
 assert.equal(JSON.stringify(p).includes(PASS),false);
 assert.equal(JSON.stringify(p).includes('privateKey'),false);
 const recorded=await D.requestReview(p);
 assert.equal(recorded.status,'review-request-recorded-not-sent');
 assert.equal(recorded.events.length,2);
 assert.equal(recorded.events[1].previousHash,recorded.events[0].hash);
 assert.equal(recorded.events[1].stage,'offline-request-recorded');
 assert.equal(recorded.operationalApproval,false);
 assert.equal((await D.verify(recorded)).integrityChecked,true);
 await assert.rejects(D.requestReview(recorded),/ya registrada/);
 // Coherent JOINT replacement of source + all claimed SHA can still pass
 // internal validation and can even match a PIN supplied by the attacker.
 const swapped=await D.prepare(f.jointlySubstituted);
 assert.equal(swapped.classification,'blocked-joint-substitution-undecidable');
 assert.equal((await D.verify(swapped)).integrityChecked,true);
 assert.notEqual(swapped.digest,p.digest);
 assert.notEqual(f.primary.packetDigest,f.substituted.packetDigest);
 const originalPinned=await D.prepare(f.originals,f.primary.packetDigest);
 const replacementPinned=await D.prepare(f.jointlySubstituted,
  f.substituted.packetDigest);
 assert.equal(originalPinned.classification,'conditionally-matching-supplied-pin');
 assert.equal(replacementPinned.classification,'conditionally-matching-supplied-pin');
 assert.equal(replacementPinned.authenticPriorPinProven,false);
 assert.equal(replacementPinned.coordinatedReplacementExcluded,false);
 // An actually separate retained expected value detects replacement,
 // but the app cannot prove who retained it or when.
 await assert.rejects(D.verify(swapped,p.digest),/huella EXTERNA/);
 assert.equal((await D.verify(swapped,swapped.digest)).externalDigestMatched,true);
 assert.equal((await D.verify(swapped,swapped.digest)).independentCustodyProven,false);
 const stalePin=await D.prepare(f.jointlySubstituted,f.primary.packetDigest);
 assert.equal(stalePin.classification,'blocked-unrepresented-pin');
 const competed=await D.prepare(f.competing);
 assert.equal(competed.classification,'quarantine-competing-packets');
 assert.equal(competed.findings.some(x=>x.startsWith('competing-complete-packets')),true);
 assert.equal((await D.verify(competed)).validFiles,3);
 const conflictWithPin=await D.prepare(f.competing,f.primary.packetDigest);
 assert.equal(conflictWithPin.classification,'quarantine-competing-packets');
 const invalidRef=clone(f.originals);
 invalidRef[1].claim.digest='f'.repeat(64);
 const denied=await D.prepare(invalidRef);
 assert.equal(denied.classification,'quarantine-unverifiable');
 assert.equal(denied.evidence[1].state,'invalid-claimed-digest');
 assert.deepEqual(JSON.parse(JSON.stringify(denied.bundles[1])),
  JSON.parse(JSON.stringify(invalidRef[1])));
 const modified=clone(f.originals);
 modified[0].packet.operationalApproval=true;
 const modifiedPacket=await D.prepare(modified);
 assert.equal(modifiedPacket.classification,'quarantine-unverifiable');
 assert.equal(modifiedPacket.evidence[0].state,'invalid-source-packet');
 const wrongSlot=clone(f.originals);wrongSlot[0].claim.slot='B';
 const brokenSlot=await D.prepare(wrongSlot);
 assert.equal(brokenSlot.classification,'quarantine-unverifiable');
 const malformed=clone(f.originals);malformed[0]={slot:'A',packet:{}};
 assert.equal((await D.prepare(malformed)).classification,'quarantine-unverifiable');
 const empty=await D.prepare([null,null,null]);
 assert.equal(empty.classification,'blocked-evidence-loss');
 assert.equal((await D.verify(empty)).missingFiles,3);
 const one=await D.prepare([f.originals[0],null,null]);
 assert.equal(one.classification,'blocked-joint-substitution-undecidable');
 assert.equal((await D.verify(one)).validFiles,1);
 const mixed=await D.prepare([f.originals[0],null,f.originals[2]],
  f.primary.packetDigest);
 assert.equal(mixed.classification,'conditionally-matching-supplied-pin');
 assert.equal(mixed.independentSourceProven,false);
 const fakeApproval=clone(recorded);fakeApproval.operationalApproval=true;
 await assert.rejects(D.verify(fakeApproval),/falsa autorización/);
 const fakeCustody=clone(recorded);fakeCustody.independentSourceProven=true;
 await assert.rejects(D.verify(fakeCustody),/falsa autorización/);
 const fakeNoSubstitution=clone(recorded);
 fakeNoSubstitution.coordinatedReplacementExcluded=true;
 await assert.rejects(D.verify(fakeNoSubstitution),/falsa autorización/);
 const fakeTime=clone(recorded);fakeTime.timeProven=true;
 await assert.rejects(D.verify(fakeTime),/falsa autorización/);
 const changed=clone(recorded);
 changed.bundles[1].claim.digest='f'.repeat(64);
 await assert.rejects(D.verify(changed),/comparación o fuente sustituida/);
 const swappedTrace=clone(recorded);
 [swappedTrace.events[0],swappedTrace.events[1]]=
  [swappedTrace.events[1],swappedTrace.events[0]];
 await assert.rejects(D.verify(swappedTrace),/traza de revisión/);
 const falsifiedStage=clone(recorded);
 falsifiedStage.events[1].stage='recovery-approved';
 await assert.rejects(D.verify(falsifiedStage),/traza de revisión/);
 const changedOutcome=clone(recorded);
 changedOutcome.classification='conditionally-matching-supplied-pin';
 await assert.rejects(D.verify(changedOutcome),/comparación o fuente sustituida/);
 const secret=clone(f.originals);secret[0].secret='do-not-copy';
 await assert.rejects(D.prepare(secret),/campo secreto/);
 await assert.rejects(D.prepare(f.originals,'f'.repeat(63)),/64 caracteres/);
 const inconsistent=clone(f.originals);inconsistent[0].claim.origin='trusted-signed';
 const untrusted=await D.prepare(inconsistent);
 assert.equal(untrusted.classification,'quarantine-unverifiable');
 // Other fictional owners: same limitations hold for A/B/C.
 for(const owner of [B,C_ID]){
  const x=await fixture(owner);
  const out=await x.D.prepare(x.originals);
  assert.equal(out.classification,'blocked-joint-substitution-undecidable');
  assert.equal((await x.D.verify(out)).independentCustodyProven,false);
  const foreign=[f.originals[0],x.originals[1],f.originals[2]];
  const foreignCompare=await D.prepare(foreign);
  assert.equal(foreignCompare.classification,'quarantine-competing-packets');
 }
 const simultaneous=await Promise.all([D.verify(recorded),D.verify(recorded),D.verify(recorded)]);
 assert.ok(simultaneous.every(x=>x.integrityChecked&&x.noWrites));
 console.log('PASS I21 Node · coherent coordinated packet+SHA substitutions remain unprovable; external PIN comparisons conditional, rival full packets quarantined; forged origin/authority/time rejected; all A/B/C, parallel no-write');
}
main().catch(e=>{console.error(e);process.exitCode=1});
