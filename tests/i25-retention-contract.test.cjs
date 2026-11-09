/* MI BOWLING I25 · adversarial preservation / normalization / size / co-rewrite.
 * All seven stages are A/B/C fabricated, no real custody or account data.
 */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,PASS,clone}=require('./i25-retention-fixture.cjs');
async function main(){
 const f=await fixture(A),S=f.Audit;
 const full=await S.prepare(f.raws);
 assert.equal(full.classification,'hold-internal-consistency-only');
 assert.equal(full.evidence.length,7);
 assert.ok(full.evidence.every(x=>x.state==='internally-verified'));
 assert.ok(full.evidence.every(x=>x.present&&!x.normalizationObserved));
 assert.ok(full.links.every(x=>x.state==='match'));
 assert.equal(full.links.length,6);
 assert.equal(full.status,'audit-held');
 assert.equal(full.authority,'none');
 assert.equal(full.operationalApproval,false);
 assert.equal(full.externalCustodyProven,false);
 assert.equal(full.humanIdentityProven,false);
 assert.equal(full.priorPinAuthenticityProven,false);
 assert.equal(full.timestampProven,false);
 assert.equal(full.immutabilityProven,false);
 assert.equal(full.jointReplacementExcluded,false);
 assert.equal(full.outsideReviewContacted,false);
 assert.equal(full.reRootAuthorized,false);
 assert.equal(full.noWrites,true);
 assert.equal(full.containsScores,false);
 const v=await S.verify(full);
 assert.equal(v.integrityChecked,true);
 assert.equal(v.internallyVerifiedStages,7);
 assert.equal(v.missingStages,0);
 assert.equal(v.divergingLinks,0);
 assert.equal(v.normalizationWarnings,0);
 assert.equal(v.byteForByteOriginalExternalProvenanceProven,false);
 assert.equal(v.rawTextPreserved,true);
 assert.equal(v.noWrites,true);
 assert.equal(JSON.stringify(full).includes(PASS),false);
 assert.equal(JSON.stringify(full).includes('privateKey'),false);
 // The same JSON information can have different actual imported UTF-8 bytes.
 const pretty=clone(f.raws);pretty[4]=JSON.stringify(f.objects[4],null,2);
 const p=await S.prepare(pretty);
 assert.equal(p.classification,'hold-serialization-ambiguity');
 assert.equal(p.evidence[4].normalizationObserved,true);
 assert.notEqual(p.evidence[4].rawDigest,p.evidence[4].normalizedDigest);
 assert.equal(p.evidence[4].rawBytes,Buffer.byteLength(pretty[4],'utf8'));
 assert.equal((await S.verify(p)).normalizationWarnings,1);
 assert.equal(p.sources[4],pretty[4]);
 assert.equal(p.links.every(x=>x.state==='match'),true);
 // An invalid original stays represented, not silently re-parsed as valid.
 const corrupt=clone(f.raws);corrupt[3]='{"format":';
 const damaged=await S.prepare(corrupt);
 assert.equal(damaged.classification,'quarantine-invalid-stages');
 assert.equal(damaged.evidence[3].state,'invalid-json');
 assert.equal(damaged.sources[3],corrupt[3]);
 assert.equal(damaged.links[2].state,'not-evaluable');
 assert.equal((await S.verify(damaged)).noWrites,true);
 // A fully valid but competing I20 copy diverges from the I21 file.
 const unrelated=clone(f.raws);unrelated[2]=JSON.stringify(f.different);
 const cross=await S.prepare(unrelated);
 assert.equal(cross.evidence[2].state,'internally-verified');
 assert.equal(cross.classification,'quarantine-cross-stage-disagreement');
 assert.ok(cross.findings.includes('cross-stage-divergence-I21-I20'));
 assert.equal(cross.sources[2],unrelated[2]);
 // Pin comparison is arithmetic, never establishes independent custody.
 const hashes=await Promise.all(f.raws.map(x=>f.C?f.Audit.verify&&
  require('node:crypto').webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(x)).then(b=>
   Buffer.from(b).toString('hex')):null));
 const pinned=await S.prepare(f.raws,hashes);
 assert.equal(pinned.classification,'hold-internal-consistency-only');
 assert.equal(pinned.evidence.every(x=>x.pinState==='arithmetic-match-untrusted'),true);
 assert.equal((await S.verify(pinned)).externalCustodyProven,false);
 const badPins=clone(hashes);badPins[6]='f'.repeat(64);
 const mismatch=await S.prepare(f.raws,badPins);
 assert.equal(mismatch.classification,'quarantine-untrusted-pin-mismatch');
 assert.equal(mismatch.evidence[6].pinState,'claim-mismatch');
 assert.equal(mismatch.sources[6],f.raws[6]);
 // Omitted stages are not treated as damaged or reconstituted.
 const sparse=clone(f.raws);sparse[1]=null;sparse[4]=null;
 const held=await S.prepare(sparse);
 assert.equal(held.classification,'hold-incomplete-stage-chain');
 assert.equal((await S.verify(held)).missingStages,2);
 assert.equal(held.sources[1],null);
 const noted=await S.noteReview(full);
 assert.equal(noted.status,'review-note-recorded-not-sent');
 assert.equal(noted.events.length,2);
 assert.equal(noted.events[1].previousHash,noted.events[0].hash);
 assert.equal(noted.outsideReviewContacted,false);
 assert.equal((await S.verify(noted)).integrityChecked,true);
 await assert.rejects(S.noteReview(noted),/already noted/);
 // Content and its SHA may be substituted coherently. This remains untrusted.
 const fB=await fixture(B);
 const alternate=await fB.Audit.prepare(fB.raws);
 assert.equal(alternate.classification,'hold-internal-consistency-only');
 assert.equal(alternate.externalCustodyProven,false);
 assert.equal(alternate.jointReplacementExcluded,false);
 assert.notEqual(alternate.digest,full.digest);
 assert.equal((await fB.Audit.verify(alternate,alternate.digest))
  .userProvidedDigestCompared,true);
 assert.equal((await fB.Audit.verify(alternate,alternate.digest))
  .externalCustodyProven,false);
 await assert.rejects(S.verify(alternate,full.digest),/SHA mismatch/);
 // Size guards execute BEFORE any deep parsing/cryptography.
 const over=S.MAX_FILE_BYTES+1;
 const tooBig=clone(f.raws);tooBig[0]='a'.repeat(over);
 await assert.rejects(S.prepare(tooBig),/12 MiB/);
 const total=Array(7).fill(null);
 for(let i=0;i<3;i++)total[i]=' '.repeat(10*1024*1024);
 await assert.rejects(S.prepare(total),/28 MiB/);
 const bom=clone(f.raws);bom[0]='\uFEFF'+bom[0];
 await assert.rejects(S.prepare(bom),/BOM/);
 const invalidUTF=clone(f.raws);invalidUTF[0]='\uD800';
 await assert.rejects(S.prepare(invalidUTF),/Unicode roundtrip/);
 await assert.rejects(S.prepare(f.raws.slice(1)),/seven ordered slots/);
 await assert.rejects(S.prepare(f.raws,['bad']),/seven optional lowercase SHA256/);
 // Verify denies forged authority, trust, trace, and preservation digests.
 for(const field of ['operationalApproval','externalCustodyProven',
  'humanIdentityProven','priorPinAuthenticityProven','timestampProven',
  'immutabilityProven','jointReplacementExcluded','outsideReviewContacted',
  'reRootAuthorized']){
  const forged=clone(noted);forged[field]=true;
  await assert.rejects(S.verify(forged),/false authority/);
 }
 const changedRaw=clone(noted);changedRaw.sources[0]='{"malformed":true}';
 await assert.rejects(S.verify(changedRaw),/originals, stage links or findings altered/);
 const alteredEvidence=clone(noted);alteredEvidence.evidence[0].state='externally-certified';
 await assert.rejects(S.verify(alteredEvidence),/originals, stage links or findings altered/);
 const alteredLinks=clone(noted);alteredLinks.links[2].state='match-trusted';
 await assert.rejects(S.verify(alteredLinks),/originals, stage links or findings altered/);
 const alteredTrace=clone(noted);alteredTrace.events[1].stage='restore-permitted';
 await assert.rejects(S.verify(alteredTrace),/event trace altered/);
 const digestForgery=clone(noted);digestForgery.digest='f'.repeat(64);
 await assert.rejects(S.verify(digestForgery),/envelope digest altered/);
 const unexpectedField=clone(noted);unexpectedField.verifiedCustodian='Alice';
 await assert.rejects(S.verify(unexpectedField),/schema or false authority/);
 const simultaneous=await Promise.all([S.verify(noted),S.verify(noted)]);
 assert.ok(simultaneous.every(x=>x.integrityChecked&&x.noWrites&&
  !x.operationalApproval&&!x.externalCustodyProven));
 console.log('PASS I25 Node · I18-I24 consolidated raw UTF8+normalized SHA, independent stage verification and link conflicts, malformed/missing originals retained, 12/28 MiB guards, joint ref replacement and forged authority denied, A/B/C synthetic, no writes');
}
main().catch(e=>{console.error(e);process.exitCode=1});
