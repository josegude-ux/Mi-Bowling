/* MI BOWLING · LAB I27 · honest runtime observations and bounded import.
 * Wraps I26.analyze exactly once; deliberately DOES NOT replace I25's
 * complete-string/JSON processing. Neither observed heap nor elapsed time
 * predicts an iPhone's memory, runtime, timestamp, or external custody.
 * All A/B/C are fabricated. Offline / no storage / no credentials.
 */
(function(root){
'use strict';
const Import=root.MiBowlingI26BoundedImport,Audit=root.MiBowlingI25RetentionAudit;
if(!Import||!Audit)throw Error('I27: I26 and I25 required');
const FORMAT='MI-BOWLING-I27-LAB-OBSERVED-RESOURCE-REPORT';
const MiB=1024*1024;
const PROFILES=Object.freeze({
 constrained:Object.freeze({maxFileBytes:4*MiB,maxTotalBytes:8*MiB,
  chunkBytes:32*1024}),
 standard:Object.freeze({maxFileBytes:12*MiB,maxTotalBytes:28*MiB,
  chunkBytes:128*1024})
});
function getProfile(profile){
 if(typeof profile!=='string'||!Object.hasOwn(PROFILES,profile))
  throw Error('I27: choose standard or constrained profile');
 return PROFILES[profile];
}
function preflight(files,profile='standard'){
 const limits=getProfile(profile),base=Import.preflight(files);
 if(base.files.some(s=>s.bytes>limits.maxFileBytes))
  throw Error('I27: '+profile+' profile file budget exceeded');
 if(base.totalBytes>limits.maxTotalBytes)
  throw Error('I27: '+profile+' profile total budget exceeded');
 return Object.freeze({profile,sourceBytes:base.totalBytes,
  presentFiles:base.files.filter(x=>x.present).length,
  missingFiles:base.files.filter(x=>!x.present).length,
  ...limits,metadataOnly:true,
  observedHeapPeakMeasured:false,actualRAMMaximumProven:false,
  iPhonePhysicallyValidated:false,externalCustodyProven:false});
}
function finiteNonnegative(n){
 return typeof n==='number'&&Number.isFinite(n)&&n>=0;
}
function finitePositive(n){return finiteNonnegative(n)&&n>0}
function clock(options){
 const f=options?.now||
  (root.performance&&typeof root.performance.now==='function'?
   ()=>root.performance.now():null);
 if(typeof f!=='function')
  throw Error('I27: monotonic observation clock not available');
 return f;
}
function metricsOptions(options){
 if(options?.sampleHeap!==undefined&&typeof options.sampleHeap!=='function')
  throw Error('I27: heap sampler must be an explicit function');
 if(options?.onProgress!==undefined&&typeof options.onProgress!=='function')
  throw Error('I27: progress handler must be a function');
 if(options?.shouldCancel!==undefined&&typeof options.shouldCancel!=='function')
  throw Error('I27: cancellation handler must be a function');
 if(options?.maxObservedHeapBytes!==undefined&&
  !finitePositive(options.maxObservedHeapBytes))
  throw Error('I27: sampled heap threshold must be positive');
 if(options?.deadlineMs!==undefined&&!finitePositive(options.deadlineMs))
  throw Error('I27: elapsed observation deadline must be positive');
 if(options?.maxObservedHeapBytes!==undefined&&!options.sampleHeap)
  throw Error('I27: heap threshold without sampler is untestable');
}
async function run(files,pins=Array(7).fill(null),options={}){
 if(!options||typeof options!=='object'||Array.isArray(options))
  throw Error('I27: options must be a record');
 const profile=options.profile===undefined?'standard':options.profile;
 const metadata=preflight(files,profile),time=clock(options);
 metricsOptions(options);
 const started=time();
 if(!finiteNonnegative(started))throw Error('I27: invalid monotonic start observation');
 const observations=[];
 let aborted=false,readProgress=0,readChunks=0;
 const sample=label=>{
  if(!options.sampleHeap)return;
  let n;
  try{n=options.sampleHeap()}
  catch(_){aborted=true;throw Error('I27: heap observation failed, analysis rejected')}
  if(!finiteNonnegative(n)){
   aborted=true;throw Error('I27: invalid heap observation, analysis rejected');
  }
  observations.push({point:label,heapUsedBytes:n});
  if(options.maxObservedHeapBytes!==undefined&&n>options.maxObservedHeapBytes){
   aborted=true;throw Error('I27: observed heap pressure threshold exceeded');
  }
 };
 const check=()=>{
  if(aborted)return true;
  if(options.shouldCancel?.()===true){aborted=true;return true}
  const t=time();
  if(!finiteNonnegative(t)||t<started){
   aborted=true;throw Error('I27: invalid monotonic clock movement');
  }
  if(options.deadlineMs!==undefined&&t-started>options.deadlineMs){
   aborted=true;throw Error('I27: observed elapsed deadline exceeded');
  }
  return false;
 };
 sample('before');
 if(check())throw Error('I27: canceled before import');
 const result=await Import.analyze(files,pins,{
  chunkBytes:metadata.chunkBytes,
  shouldCancel:check,
  onProgress:event=>{
   if(check())throw Error('I27: canceled during staged import');
   readProgress=event.bytesRead;readChunks=event.chunkCount;
   sample('progress');
   options.onProgress?.(Object.freeze({
    stage:event.stage,bytesRead:event.bytesRead,
    totalBytes:event.totalBytes,chunkCount:event.chunkCount,
    profile,externalCustodyProven:false}));
  }
 });
 if(check())throw Error('I27: canceled after verification');
 sample('after');
 const finished=time();
 if(!finiteNonnegative(finished)||finished<started)
  throw Error('I27: invalid monotonic completion observation');
 const heaps=observations.map(x=>x.heapUsedBytes);
 const report=Object.freeze({
  format:FORMAT,profile,sourceBytes:metadata.sourceBytes,
  presentFiles:metadata.presentFiles,missingFiles:metadata.missingFiles,
  maxFileBytes:metadata.maxFileBytes,maxTotalBytes:metadata.maxTotalBytes,
  chunkBytes:metadata.chunkBytes,inputChunks:result.diagnostic.chunks,
  bytesRead:result.diagnostic.readBytes,
  maxReadChunkBytes:result.diagnostic.peakReadBytes,
  observedElapsedMs:finished-started,observedHeapSamples:heaps.length,
  observedHeapMinBytes:heaps.length?Math.min(...heaps):null,
  observedHeapMaxBytes:heaps.length?Math.max(...heaps):null,
  actualHeapPeakProven:false,fullRAMMaximumProven:false,
  memoryMeasurementMethod:heaps.length?'provided-heapUsed-samples':'not-available',
  heapMeasurementsReproducibleAcrossDevices:false,
  timingsComparableOnlyWithinSameEnvironment:true,
  originalI25VerificationUsed:true,I25StillParsesCompleteJSON:true,
  actualIPhoneValidated:false,externalCustodyProven:false,
  operationalApproval:false,jointReplacementExcluded:false,
  noWrites:true
 });
 if(!Object.isFrozen(report)||result.externalCustodyProven!==false||
  result.operationalApproval!==false||result.noWrites!==true)
  throw Error('I27: upstream trust policy violated');
 return Object.freeze({packet:result.packet,report,classification:result.classification,
  operationalApproval:false,externalCustodyProven:false,
  timeAnchorProven:false,physicalRetentionProven:false,
  actualIPhoneValidated:false,heapPeakProven:false,noWrites:true});
}
root.MiBowlingI27ResourceProfile=Object.freeze({
 FORMAT,PROFILES,getProfile,preflight,run
});
})(window);
