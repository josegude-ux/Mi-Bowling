/* I29 · race isolation and external verification contracts. A/B/C only.
 * Json parse count = same-process work only, never physical RAM or speed.
 */
'use strict';
const assert=require('node:assert/strict');
const {fixture,A,B,C_ID,PASS,clone}=require('./i29-session-fixture.cjs');
async function main(){
 const f=await fixture(A),M=f.Session;
 assert.equal(M.FORMAT,'MI-BOWLING-I29-LAB-SESSION-RECOVERY');
 const freshSession=M.createSession();
 f.context.__parseCount=0;
 const a=await freshSession.run(f.blobs,undefined,{profile:'constrained',
  sampleHeap:()=>process.memoryUsage().heapUsed});
 const freshParses=f.context.__parseCount;
 assert.equal(freshParses,7,'fresh construction has exactly one I25 inspection for seven stages');
 assert.equal(a.packet.classification,'hold-internal-consistency-only');
 assert.equal(a.packet.sources.length,7);
 assert.equal(a.report.freshI25InspectionPasses,1);
 assert.equal(a.report.externalPacketsRequireI25Verify,true);
 assert.equal(a.report.observedHeapSamples,a.report.inputChunks+2);
 assert.equal(a.report.actualIPhoneValidated,false);
 assert.equal(a.report.actualHeapPeakProven,false);
 assert.equal(a.report.externalCustodyProven,false);
 assert.equal(a.operationalApproval,false);
 assert.equal(a.noWrites,true);
 assert.equal(JSON.stringify(a.packet).includes(PASS),false);
 assert.equal(freshSession.state().phase,'fresh-ready');
 assert.equal(freshSession.state().latestDigest,a.packet.digest);
 // The I28 baseline must have byte-identical packet JSON and digest.
 const expected=await f.Efficiency.run(f.blobs,undefined,{profile:'constrained'});
 assert.equal(JSON.stringify(a.packet),JSON.stringify(expected.packet));
 assert.equal(a.packet.digest,expected.packet.digest);
 // Receiving the packet from outside MUST use full original I25.verify.
 f.context.__parseCount=0;
 const checked=await freshSession.verifyExternal(a.packet,a.packet.digest);
 assert.equal(checked.originalI25VerifyUsed,true);
 assert.equal(checked.singleInspectionBypassUsed,false);
 assert.equal(checked.verification.integrityChecked,true);
 assert.equal(checked.verification.noWrites,true);
 assert.equal(checked.externallyAuthenticated,false);
 assert.equal(checked.externalCustodyProven,false);
 assert.equal(checked.operationalApproval,false);
 assert(f.context.__parseCount>=8,'external JSON snapshot + seven real stage parses required');
 assert.equal(freshSession.state().phase,'external-internally-checked');
 // The independent expected digest remains a claim, NOT authenticated trust.
 await assert.rejects(freshSession.verifyExternal(a.packet,'f'.repeat(64)),
  /separately supplied envelope SHA mismatch/);
 assert.equal(freshSession.state().latestDigest,null);
 const forged=JSON.parse(JSON.stringify(a.packet));
 forged.sources[0]+=' '; // foreign changed original without matching hashes
 await assert.rejects(freshSession.verifyExternal(forged),
  /altered|mismatch|schema|verification|digest/i);
 const augmented=JSON.parse(JSON.stringify(a.packet));augmented.forgedPermission=true;
 await assert.rejects(freshSession.verifyExternal(augmented),
  /schema|false authority/);
 const invalid=JSON.parse(JSON.stringify(a.packet));
 invalid.sources[0]='z'.repeat(f.Audit.MAX_FILE_BYTES+1);
 await assert.rejects(freshSession.verifyExternal(invalid),/external raw size preflight/);
 // Capturing a snapshot synchronously avoids caller mutation after invocation.
 const caller=JSON.parse(JSON.stringify(a.packet));
 const verifying=freshSession.verifyExternal(caller,a.packet.digest);
 caller.sources[0]+=' changed after method call';
 assert.equal((await verifying).verification.integrityChecked,true);
 assert.equal(freshSession.state().phase,'external-internally-checked');
 // Cancel during asynchronous verification discards the result even if the
 // underlying I25 verification ultimately completes (not CPU preemption).
 const cancelPending=freshSession.verifyExternal(a.packet,a.packet.digest);
 freshSession.cancel();
 await assert.rejects(cancelPending,/stale session result rejected/);
 assert.equal(freshSession.state().phase,'canceled');
 assert.equal(freshSession.state().latestDigest,null);
 // A newly constructed report can always be re-created safely after a fault.
 const recovered=await freshSession.run(f.blobs,undefined,{profile:'constrained'});
 assert.equal(recovered.packet.digest,a.packet.digest);
 // A late old run in SAME session may not replace a newer result.
 let release;const gate=new Promise(ok=>{release=ok});
 const delayedFile=new Blob(['{}']);
 const slow={size:delayedFile.size,slice(from,to){
  const part=delayedFile.slice(from,to);
  return {arrayBuffer:async()=>{await gate;return part.arrayBuffer()}};
 }};
 const sessions=[slow,null,null,null,null,null,null];
 const shared=M.createSession();
 const old=shared.run(sessions,undefined,{profile:'constrained'});
 const newest=shared.run(f.blobs,undefined,{profile:'constrained'});
 release();
 await assert.rejects(old,/stale session result|import canceled/);
 const recent=await newest;
 assert.equal(shared.state().latestDigest,recent.packet.digest);
 assert.equal(recent.packet.digest,a.packet.digest);
 // Cancellation before and DURING import never retains a success result.
 const canceled=M.createSession();
 let stop=false;
 await assert.rejects(canceled.run(f.blobs,undefined,{profile:'constrained',
  onProgress:()=>{stop=true},shouldCancel:()=>stop}),
  /session canceled|import canceled/);
 assert.equal(canceled.state().latestDigest,null);
 const again=await canceled.run(f.blobs,undefined,{profile:'constrained'});
 assert.equal(again.packet.digest,a.packet.digest);
 // Two truly independent sessions run in parallel, with no shared state.
 const b=await fixture(B),c=await fixture(C_ID);
 const bSession=b.Session.createSession(),cSession=c.Session.createSession();
 const [bResult,cResult]=await Promise.all([
  bSession.run(b.blobs,undefined,{profile:'constrained'}),
  cSession.run(c.blobs,undefined,{profile:'constrained'})
 ]);
 assert.notEqual(bResult.packet.digest,cResult.packet.digest);
 assert.notEqual(bResult.packet.digest,a.packet.digest);
 assert.equal(bSession.state().latestDigest,bResult.packet.digest);
 assert.equal(cSession.state().latestDigest,cResult.packet.digest);
 bSession.cancel();
 assert.equal(bSession.state().latestDigest,null);
 assert.equal(cSession.state().latestDigest,cResult.packet.digest);
 assert.equal((await cSession.verifyExternal(cResult.packet,cResult.packet.digest))
  .verification.integrityChecked,true);
 // Errors and pressure cannot return stale packets from a previous success.
 await assert.rejects(cSession.run(f.blobs,undefined,{
  profile:'constrained',sampleHeap:()=>5000,maxObservedHeapBytes:1000
 }),/observed heap pressure threshold exceeded/);
 assert.equal(cSession.state().latestDigest,null);
 const bad=Array(7).fill(null);bad[0]=new Blob([new Uint8Array([0xc3,0x28])]);
 await assert.rejects(cSession.run(bad),/malformed UTF-8/);
 assert.equal(cSession.state().latestDigest,null);
 const damaged=clone(f.raws);damaged[2]='{"unfinished":';
 const quarantined=await cSession.run(f.fromRaws(damaged),undefined,{profile:'constrained'});
 assert.equal(quarantined.classification,'quarantine-invalid-stages');
 assert.equal(quarantined.packet.sources[2],damaged[2]);
 assert.equal(quarantined.externalCustodyProven,false);
 // External fake identity/date and coherent SHA are still no proof.
 assert.equal((await cSession.verifyExternal(quarantined.packet)).verification.integrityChecked,true);
 assert.equal(cSession.state().externalCustodyProven,false);
 assert.equal(cSession.state().actualIPhoneValidated,false);
 assert.equal(cSession.state().noWrites,true);
 console.log('PASS I29 Node · fresh A/B/C equivalence, JSON.parse='+freshParses+
  ', concurrency/supersession, cancellation, independent I25.verify on snapshots, tamper, pressure and recovery fail-closed; no writes or external custody');
}
main().catch(e=>{console.error(e);process.exitCode=1});
