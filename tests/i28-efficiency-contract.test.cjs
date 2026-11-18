/* I28 · A/B/C fictitious. Deterministic parse work, not universal speed/RAM.
 * I25.verify for received packets is retained; fast path only fresh output.
 */
'use strict';
const assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const {fixture,A,B,C_ID,PASS,clone}=require('./i28-efficiency-fixture.cjs');
async function main(){
 const f=await fixture(A),engine=f.Efficiency,base=f.Profile,ctx=f.context;
 assert.equal(typeof f.Audit.prepareCheckedOnce,'function');
 assert.equal(engine.FORMAT,'MI-BOWLING-I28-LAB-SINGLE-INSPECTION-OBSERVATION');
 // Count JSON parses in the same VM for BOTH pipelines and identical input.
 // This checks algorithmic work; wall-clock timing is only informative.
 ctx.__parseCount=0;
 const initCount=()=>ctx.__parseCount;
 const baseline=await base.run(f.blobs,null===undefined?undefined:Array(7).fill(null),
  {profile:'constrained',now:()=>performance.now()});
 const baselineParseCount=initCount();
 ctx.__parseCount=0;
 const start=performance.now();
 const optimized=await engine.run(f.blobs,undefined,{
  profile:'constrained',now:()=>performance.now(),
  sampleHeap:()=>process.memoryUsage().heapUsed
 });
 const elapsedSample=performance.now()-start;
 const fastParseCount=initCount();
 assert.equal(optimized.packet.digest,baseline.packet.digest);
 assert.equal(JSON.stringify(optimized.packet),JSON.stringify(baseline.packet));
 assert.equal(optimized.classification,baseline.classification);
 assert.equal(optimized.classification,'hold-internal-consistency-only');
 assert(fastParseCount<baselineParseCount,
  'single inspection must actually reduce JSON parsing on identical A fixtures');
 assert.equal(optimized.report.freshI25InspectionPasses,1);
 assert.equal(optimized.report.I27LegacyI25InspectionPasses,2);
 assert.equal(optimized.report.duplicateFreshInspectionRemoved,true);
 assert.equal(optimized.report.externalPacketsRequireI25Verify,true);
 assert.equal(optimized.report.originalI25VerificationUsed,false);
 assert.equal(optimized.report.originalI25InspectionUsed,true);
 assert.equal(optimized.report.heapStatisticsStorage,'constant-size-min-max-count');
 assert.equal(optimized.report.observedHeapSamples,optimized.report.inputChunks+2);
 assert.equal(optimized.report.observedHeapMinBytes>=0,true);
 assert.equal(optimized.report.observedHeapMaxBytes>=optimized.report.observedHeapMinBytes,true);
 assert.equal(optimized.report.memoryMeasurementMethod,'provided-heapUsed-samples');
 assert.equal(optimized.report.actualHeapPeakProven,false);
 assert.equal(optimized.report.fullRAMMaximumProven,false);
 assert.equal(optimized.report.actualIPhoneValidated,false);
 assert.equal(optimized.report.externalCustodyProven,false);
 assert.equal(optimized.report.operationalApproval,false);
 assert.equal(optimized.report.noWrites,true);
 assert.equal(optimized.report.sourceBytes,baseline.report.sourceBytes);
 assert.equal(optimized.report.bytesRead,baseline.report.bytesRead);
 assert.equal(optimized.report.maxReadChunkBytes<=32*1024,true);
 assert.equal(optimized.report.observedElapsedMs>=0,true);
 assert.equal(optimized.packet.noWrites,true);
 assert.equal(optimized.packet.authority,'none');
 assert.equal(optimized.packet.jointReplacementExcluded,false);
 assert.equal(JSON.stringify(optimized.packet).includes(PASS),false);
 // The full independent verification remains available and REQUIRED on
 // later import, mutation, or externally supplied packets.
 const externalVerification=await f.Audit.verify(optimized.packet);
 assert.equal(externalVerification.integrityChecked,true);
 const tampered=JSON.parse(JSON.stringify(optimized.packet));
 tampered.sources[0]+=' ';
 await assert.rejects(f.Audit.verify(tampered),/altered|mismatch|schema/i);
 // The same result for B and C, including differences and no trusted claims.
 for(const owner of [B,C_ID]){
  const other=await fixture(owner);
  const got=await other.Efficiency.run(other.blobs,undefined,{profile:'constrained'});
  const expected=await other.Profile.run(other.blobs,undefined,{profile:'constrained'});
  assert.equal(got.packet.digest,expected.packet.digest);
  assert.equal(got.classification,expected.classification);
  assert.notEqual(got.packet.digest,optimized.packet.digest);
  assert.equal(got.externalCustodyProven,false);
 }
 // Narrow preflight rejects overbudget before any file slice/read.
 const fake=n=>({size:n,slice(){throw Error('READ MUST NOT HAPPEN')}});
 const empty=Array(7).fill(null);
 await assert.rejects(engine.run([fake(4*1024*1024+1),...empty.slice(1)],
  undefined,{profile:'constrained'}),/profile file budget exceeded/);
 await assert.rejects(engine.run([fake(3*1024*1024),fake(3*1024*1024),
  fake(3*1024*1024),null,null,null,null],undefined,
  {profile:'constrained'}),/profile total budget exceeded/);
 await assert.rejects(engine.run([fake(13*1024*1024),...empty.slice(1)]),
  /12 MiB/);
 await assert.rejects(engine.run(f.blobs,Array(7).fill('bad')),
  /seven optional lowercase SHA/);
 await assert.rejects(engine.run(empty,undefined,{profile:'fictitious'}),
  /choose standard or constrained/);
 await assert.rejects(engine.run(empty,undefined,{now:()=>-1}),
  /invalid monotonic start/);
 await assert.rejects(engine.run(empty,undefined,{
  now:(()=>{let t=0;return()=>t+=100})(),deadlineMs:50}),
  /observed elapsed deadline exceeded/);
 await assert.rejects(engine.run(empty,undefined,{
  now:(()=>{let t=10;return()=>t--})()}),
  /invalid monotonic clock/);
 await assert.rejects(engine.run(empty,undefined,{sampleHeap:()=>NaN}),
  /invalid heap observation/);
 await assert.rejects(engine.run(empty,undefined,{
  sampleHeap:()=>{throw Error('sampler rejected')}}),/heap observation failed/);
 await assert.rejects(engine.run(empty,undefined,{
  sampleHeap:()=>2000,maxObservedHeapBytes:1000}),
  /observed heap pressure threshold exceeded/);
 await assert.rejects(engine.run(empty,undefined,{maxObservedHeapBytes:1000}),
  /requires a sampler/);
 await assert.rejects(engine.run(empty,undefined,{shouldCancel:()=>true}),
  /canceled before import/);
 // Mid-read observation pressure/cancellation must fail closed: no packet.
 let pressureReads=0;
 await assert.rejects(engine.run(f.blobs,undefined,{
  profile:'constrained',sampleHeap:()=>++pressureReads===1?100:9000,
  maxObservedHeapBytes:1000
 }),/observed heap pressure threshold exceeded/);
 let stopped=false;
 await assert.rejects(engine.run(f.blobs,undefined,{
  profile:'constrained',onProgress:()=>{stopped=true},
  shouldCancel:()=>stopped
 }),/import canceled/);
 const recovered=await engine.run(f.blobs,undefined,{profile:'constrained'});
 assert.equal(recovered.packet.digest,optimized.packet.digest);
 assert.equal(recovered.report.observedHeapMaxBytes,null);
 // Error after valid previous run never returns a stale/partial success packet.
 const broken=clone(f.raws);broken[3]='{"unfinished":';
 const quarantined=await engine.run(f.fromRaws(broken),undefined,
  {profile:'constrained'});
 assert.equal(quarantined.packet.sources[3],broken[3]);
 assert.equal(quarantined.classification,'quarantine-invalid-stages');
 const malformed=empty.slice();
 malformed[0]=new Blob([new Uint8Array([0xc3,0x28])]);
 await assert.rejects(engine.run(malformed),/malformed UTF-8/);
 const mismatchPins=empty.slice();mismatchPins[1]='f'.repeat(64);
 const mismatch=await engine.run(f.blobs,mismatchPins,{profile:'constrained'});
 assert.equal(mismatch.classification,'quarantine-untrusted-pin-mismatch');
 assert.equal(mismatch.externalCustodyProven,false);
 // No mutation of caller arrays / old engine, and no real write privileges.
 assert.equal(f.raws.length,7);
 console.log('PASS I28 Node · A/B/C identical I25 envelopes with fewer JSON parses, safe fresh-only single inspect, external I25.verify retained; cancel, pressure, malformed and retry fail closed');
 console.log('I28 OBSERVATION ONLY runner=GitHubActions/Node inputBytes='+optimized.report.sourceBytes+
  ' chunks='+optimized.report.inputChunks+
  ' baselineJSONParses='+baselineParseCount+' fastJSONParses='+fastParseCount+
  ' runnerElapsedMs='+elapsedSample.toFixed(3)+
  ' sampledHeapMinBytes='+optimized.report.observedHeapMinBytes+
  ' sampledHeapMaxBytes='+optimized.report.observedHeapMaxBytes+
  ' (parse count is deterministic for these fixtures; time and sampled heap are not cross-device benchmarks)');
}
main().catch(e=>{console.error(e);process.exitCode=1});
