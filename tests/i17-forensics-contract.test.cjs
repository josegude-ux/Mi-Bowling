/* MI BOWLING I17 · fail-closed evidence-loss and custodian fork contracts. */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,C_ID,PASS,clone}=require('./i17-forensics-fixture.cjs');
async function main(){
 const x=await fixture(A),{F,K}=x;
 const check=(reports=x.reports,root=x.externalRoot,mark=x.externalMark,
  owner=A,pack=x.package15,source=x.source,pass=PASS)=>
  F.reconcile(pack,source,owner,pass,root,mark,reports);
 const ok=await check();
 assert.equal(ok.decision,'conditionally-consistent');
 assert.equal(ok.verified,true);assert.equal(ok.currentCopies,3);
 assert.equal(ok.signatureChecks,6);
 assert.equal(ok.authority,'conditional-external-inputs');
 for(const prop of ['replayPreventedWithoutRetainedExternalMark',
  'independenceOfCustodiansProven','preIncidentTimeProven','immutableStorageProven',
  'externalFreshnessProven'])assert.equal(ok[prop],false);
 assert.equal(ok.noWrites,true);assert.equal(ok.containsScores,false);
 // One physically named copy absent: remaining two conditional references valid.
 const lost=clone(x.reports);lost[1]=null;
 const oneLost=await check(lost);
 assert.equal(oneLost.decision,'conditionally-consistent');
 assert.equal(oneLost.currentCopies,2);
 const stale=clone(x.reports);stale[2]=await x.stale('C',1);
 const oneStale=await check(stale);
 assert.equal(oneStale.decision,'conditionally-consistent');
 assert.equal(oneStale.currentCopies,2);
 assert.equal(oneStale.staleCopies,1);
 const insufficient=clone(x.reports);insufficient[1]=null;insufficient[2]=null;
 assert.equal((await check(insufficient)).decision,'blocked-insufficient-copies');
 const allGone=[null,null,null];
 assert.equal((await check(allGone)).decision,'blocked-insufficient-copies');
 // Loss of ALL I16 anchors: even good signed reports do not show what is latest.
 const noRoot=await check(x.reports,null);
 assert.equal(noRoot.decision,'blocked-external-reference-loss');
 assert.equal(noRoot.metadata.validSignaturesSlots,3);
 assert.equal(noRoot.verified,false);
 const noMark=await check(x.reports,x.externalRoot,null);
 assert.equal(noMark.decision,'blocked-external-reference-loss');
 const noI16Anchors=await check(x.reports,null,null);
 assert.equal(noI16Anchors.decision,'blocked-external-reference-loss');
 // Even when all I16 copies and both anchor files are lost,
 // historical I15 verification cannot magically regenerate authority.
 const noAll=await check([null,null,null],null,null);
 assert.equal(noAll.decision,'blocked-external-reference-loss');
 assert.equal(noAll.authority,'none');
 assert.equal((await check([null,null,null],null,null,A,null,null)).decision,
  'blocked-total-trust-loss');
 assert.equal((await check(x.reports,null,null,A,null,null)).verified,false);
 // Signed and valid branches at the same sequence: no automatic majority.
 const fork=clone(x.reports);fork[2]=await x.branch('C');
 const disputed=await check(fork);
 assert.equal(disputed.decision,'quarantine-conflicting-evidence');
 assert.equal(disputed.metadata.forkEvidence,true);
 assert.equal(disputed.verified,false);
 assert.equal((await check(fork,null,null)).decision,'blocked-external-reference-loss');
 const damaged=clone(x.reports);damaged[2].copy.markDigest='f'.repeat(64);
 assert.equal((await check(damaged)).decision,'quarantine-conflicting-evidence');
 const falseHistory=clone(x.reports);
 const s=falseHistory[1].history.records[1].signatures[0];
 s.signature=(s.signature[0]==='A'?'B':'A')+s.signature.slice(1);
 assert.equal((await check(falseHistory)).decision,'quarantine-conflicting-evidence');
 const wrongLabels=clone(x.reports);
 wrongLabels[1].slot='A';
 assert.equal((await check(wrongLabels)).decision,'quarantine-conflicting-evidence');
 const oldTwo=clone(x.reports);
 oldTwo[1]=await x.stale('B',1);oldTwo[2]=await x.stale('C',2);
 assert.equal((await check(oldTwo)).decision,'blocked-insufficient-current');
 const olderAll=[
  await x.stale('A',2),await x.stale('B',2),await x.stale('C',2)
 ];
 assert.equal((await check(olderAll)).decision,'blocked-latest-unrepresented');
 // Newer honest signed claim when the supplied external watermark says
 // only generation 3: halt; do not call it invalid or silently override mark.
 const newer=await x.advance('C');
 const withFuture=clone(x.reports);withFuture[2]=newer;
 assert.equal((await check(withFuture)).decision,'quarantine-conflicting-evidence');
 // Tampered I15 proof is not repaired by any matching copy majority.
 const changedSource=clone(x.source);
 changedSource.externalLatestPin.newManifestDigest='f'.repeat(64);
 await assert.rejects(check(x.reports,x.externalRoot,x.externalMark,A,
  x.package15,changedSource),/ROLLBACK/);
 await assert.rejects(check(x.reports,x.externalRoot,x.externalMark,B),
  /identidad|incompletos/);
 const wrongOwner=clone(x.reports);
 wrongOwner[1].history.owner=B;
 assert.equal((await check(wrongOwner)).decision,'quarantine-conflicting-evidence');
 await assert.rejects(check(x.reports,x.externalRoot,x.externalMark,A,
  x.package15,x.source,'WRONG-FICTIONAL-PASSWORD'),/clave incorrecta/);
 // Concurrent forensic inspections never mutate the evidence.
 const parallel=await Promise.all([check(),check(),check()]);
 assert.ok(parallel.every(v=>v.verified&&v.noWrites&&v.currentCopies===3));
 for(const owner of [B,C_ID]){
  const other=await fixture(owner);
  const r=await other.F.reconcile(other.package15,other.source,owner,PASS,
   other.externalRoot,other.externalMark,other.reports);
  assert.equal(r.decision,'conditionally-consistent');
 }
 console.log('PASS I17 Node · 3 custodian claims, signed fork quarantine, old/new conflict, lost external I16/I15 trust fail-closed, 2-of-3 with missing/stale, invalid signed copy, A/B/C and parallel no-write; zero physical immutability/clock claims');
}
main().catch(error=>{console.error(error);process.exitCode=1});
