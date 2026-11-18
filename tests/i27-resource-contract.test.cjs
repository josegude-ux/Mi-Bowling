/* I27 · bounded mobile profiles and honest runtime observations.
 * A/B/C fabricated. Test deterministic injected clocks separately from
 * empirical CI runner heapUsed/time; do NOT assert universal perf thresholds.
 */
'use strict';
const assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const {fixture,A,B,PASS,clone}=require('./i27-resource-fixture.cjs');
async function main(){
 const f=await fixture(A),P=f.Profile;
 assert.deepEqual(Object.keys(P.PROFILES).sort(),['constrained','standard']);
 assert.equal(P.PROFILES.standard.maxTotalBytes,28*1024*1024);
 assert.equal(P.PROFILES.constrained.maxTotalBytes,8*1024*1024);
 assert.equal(P.PROFILES.constrained.maxFileBytes,4*1024*1024);
 assert.equal(P.PROFILES.constrained.chunkBytes,32*1024);
 assert.equal(P.PROFILES.standard.chunkBytes,128*1024);
 const metadata=P.preflight(f.blobs,'constrained');
 assert.equal(metadata.metadataOnly,true);
 assert.equal(metadata.presentFiles,7);
 assert.equal(metadata.actualRAMMaximumProven,false);
 assert.equal(metadata.observedHeapPeakMeasured,false);
 assert.equal(metadata.externalCustodyProven,false);
 assert.equal(metadata.sourceBytes,f.blobs.reduce((s,x)=>s+x.size,0));
 // Preflight is genuinely done before a slice call, and profile limits can be
 // tighter than I26's global constraints without modifying the originals.
 const fake=(size)=>({size,slice(){throw Error('SHOULD NOT READ')}});
 const empty=[null,null,null,null,null,null,null];
 await assert.rejects(P.run([fake(5*1024*1024),...empty.slice(1)],null,
  {profile:'constrained'}),/constrained profile file budget exceeded/);
 const three=[fake(3*1024*1024),fake(3*1024*1024),
  fake(3*1024*1024),null,null,null,null];
 await assert.rejects(P.run(three,undefined,
  {profile:'constrained'}),/constrained profile total budget exceeded/);
 await assert.rejects(P.run([fake(13*1024*1024),...empty.slice(1)]),
  /I26: file exceeds 12 MiB/);
 await assert.rejects(P.run(empty,undefined,{profile:'privileged'}),
  /choose standard or constrained/);
 await assert.rejects(P.run(empty,undefined,
  {maxObservedHeapBytes:1000}),/without sampler/);
 await assert.rejects(P.run(empty,undefined,{sampleHeap:42}),
  /heap sampler must be an explicit function/);
 await assert.rejects(P.run(empty,undefined,{deadlineMs:0}),
  /deadline must be positive/);
 await assert.rejects(P.run(empty,undefined,
  {now:()=>-1}),/invalid monotonic start/);
 await assert.rejects(P.run(empty,undefined,
  {now:(()=>{let n=10;return()=>n--})()}),
  /invalid monotonic clock movement/);
 await assert.rejects(P.run(empty,undefined,
  {now:(()=>{let n=0;return()=>n+=100})(),deadlineMs:50}),
  /observed elapsed deadline exceeded/);
 await assert.rejects(P.run(empty,undefined,{sampleHeap:()=>NaN}),
  /invalid heap observation/);
 await assert.rejects(P.run(empty,undefined,
  {sampleHeap:()=>{throw Error('simulated sampler failure')}}),
  /heap observation failed/);
 await assert.rejects(P.run(empty,undefined,{
  sampleHeap:()=>1001,maxObservedHeapBytes:1000
 }),/observed heap pressure threshold exceeded/);
 await assert.rejects(P.run(empty,undefined,{shouldCancel:()=>true}),
  /canceled before import/);
 const observedProgress=[];
 const observed=await P.run(f.blobs,undefined,{
  profile:'constrained',now:()=>performance.now(),
  sampleHeap:()=>process.memoryUsage().heapUsed,
  onProgress:event=>observedProgress.push(event.bytesRead)
 });
 assert.equal(observed.classification,'hold-internal-consistency-only');
 assert.equal(observed.packet.sources.length,7);
 assert.equal(observed.report.format,P.FORMAT);
 assert.equal(observed.report.profile,'constrained');
 assert.equal(observed.report.sourceBytes,metadata.sourceBytes);
 assert.equal(observed.report.bytesRead,metadata.sourceBytes);
 assert.equal(observed.report.originalI25VerificationUsed,true);
 assert.equal(observed.report.I25StillParsesCompleteJSON,true);
 assert.equal(observed.report.observedHeapSamples,observed.report.inputChunks+2);
 assert.equal(observed.report.memoryMeasurementMethod,'provided-heapUsed-samples');
 assert.equal(observed.report.observedHeapMinBytes>=0,true);
 assert.equal(observed.report.observedHeapMaxBytes>=
  observed.report.observedHeapMinBytes,true);
 assert.equal(observed.report.maxReadChunkBytes<=32*1024,true);
 assert.equal(observed.report.observedElapsedMs>=0,true);
 assert.equal(observed.report.actualHeapPeakProven,false);
 assert.equal(observed.report.fullRAMMaximumProven,false);
 assert.equal(observed.report.actualIPhoneValidated,false);
 assert.equal(observed.report.heapMeasurementsReproducibleAcrossDevices,false);
 assert.equal(observed.report.externalCustodyProven,false);
 assert.equal(observed.report.operationalApproval,false);
 assert.equal(observed.report.noWrites,true);
 assert.equal(observed.operationalApproval,false);
 assert.equal(observed.externalCustodyProven,false);
 assert.equal(observed.timeAnchorProven,false);
 assert.equal(observed.physicalRetentionProven,false);
 assert.equal(observed.actualIPhoneValidated,false);
 assert.equal(observed.heapPeakProven,false);
 assert.equal(observed.noWrites,true);
 assert.equal(observedProgress.at(-1),metadata.sourceBytes);
 assert.equal((await f.Audit.verify(observed.packet)).integrityChecked,true);
 assert.equal(JSON.stringify(observed.packet).includes(PASS),false);
 // Null sampler means report has NO heap memory claim at all.
 let fakeClock=0;
 const deterministic=await P.run(f.blobs,undefined,{
  profile:'standard',now:()=>fakeClock+=3
 });
 assert.equal(deterministic.report.observedHeapSamples,0);
 assert.equal(deterministic.report.observedHeapMinBytes,null);
 assert.equal(deterministic.report.observedHeapMaxBytes,null);
 assert.equal(deterministic.report.memoryMeasurementMethod,'not-available');
 assert.equal(deterministic.report.actualHeapPeakProven,false);
 assert.equal(deterministic.report.observedElapsedMs>0,true);
 assert.equal(deterministic.report.maxReadChunkBytes<=128*1024,true);
 assert.equal(deterministic.classification,'hold-internal-consistency-only');
 // Pressure can occur later as progress samples are collected.
 let heapCalls=0;
 await assert.rejects(P.run(f.blobs,undefined,{
  profile:'constrained',
  sampleHeap:()=>++heapCalls===1?100:9000,
  maxObservedHeapBytes:1000
 }),/observed heap pressure threshold exceeded/);
 // Import cancellation cannot yield a valid packet; a later fresh attempt works.
 let didCancel=false;
 await assert.rejects(P.run(f.blobs,undefined,{
  profile:'constrained',onProgress:()=>{didCancel=true},
  shouldCancel:()=>didCancel
 }),/import canceled/);
 const good=await P.run(f.blobs,undefined,{profile:'constrained'});
 assert.equal(good.packet.digest,observed.packet.digest);
 assert.equal(good.externalCustodyProven,false);
 // Co-rewritten A/B/C documents and SHA remain internally self-consistent.
 const fB=await fixture(B),second=await P.run(fB.blobs,undefined,{
  profile:'constrained'});
 assert.equal(second.classification,'hold-internal-consistency-only');
 assert.notEqual(second.packet.digest,good.packet.digest);
 assert.equal(second.report.externalCustodyProven,false);
 assert.equal(second.packet.jointReplacementExcluded,false);
 await assert.rejects(fB.Audit.verify(second.packet,good.packet.digest),
  /SHA mismatch/);
 // Corrupted JSON is retained by I25 after safe bytes were imported.
 const broken=f.raws.slice();broken[3]='{"unfinished":';
 const packet=await P.run(f.fromRaws(broken),undefined,{profile:'constrained'});
 assert.equal(packet.classification,'quarantine-invalid-stages');
 assert.equal(packet.packet.sources[3],broken[3]);
 assert.equal(packet.report.operationalApproval,false);
 // Format failures and bad references never become resource observations of success.
 const badEncoding=Array(7).fill(null);
 badEncoding[0]=new Blob([new Uint8Array([0xc3,0x28])]);
 await assert.rejects(P.run(badEncoding),/malformed UTF-8/);
 const pins=Array(7).fill(null);pins[1]='f'.repeat(64);
 const mismatch=await P.run(f.blobs,pins);
 assert.equal(mismatch.classification,'quarantine-untrusted-pin-mismatch');
 assert.equal(mismatch.report.externalCustodyProven,false);
 console.log('PASS I27 Node · constrained/standard 4/8 vs 12/28MiB budgets, one I26/I25 verified pipeline, cancellation & sampled pressure fail closed, no false RAM peak or physical iPhone claims, A/B/C synthetic');
 console.log('I27 OBSERVATION ONLY runner=GitHubActions/Node profile='+observed.report.profile+
  ' inputBytes='+observed.report.sourceBytes+
  ' readChunks='+observed.report.inputChunks+
  ' elapsedMs='+observed.report.observedElapsedMs.toFixed(3)+
  ' sampledHeapUsedMinBytes='+observed.report.observedHeapMinBytes+
  ' sampledHeapUsedMaxBytes='+observed.report.observedHeapMaxBytes+
  ' (samples != actual peak; not an iPhone benchmark)');
}
main().catch(e=>{console.error(e);process.exitCode=1});
