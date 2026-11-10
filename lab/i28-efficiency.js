/* MI BOWLING · I28 LAB · single-inspection fast path for newly generated I25
 * packets; preflight and strict bytes remain I26/I27. Sampled heap is NOT
 * peak RAM; WebKit Linux emulation is NOT a physical iPhone/Safari validation.
 * Caller-provided SHA/aliases are untrusted. A/B/C fixtures only. No writes.
 */
(function(root){
'use strict';
const Import=root.MiBowlingI26BoundedImport;
const Profile=root.MiBowlingI27ResourceProfile;
const Audit=root.MiBowlingI25RetentionAudit;
if(!Import||!Profile||!Audit?.prepareCheckedOnce)
 throw Error('I28: I25 optimized builder, I26 and I27 required');
const FORMAT='MI-BOWLING-I28-LAB-SINGLE-INSPECTION-OBSERVATION';
const SHA=/^[a-f0-9]{64}$/;
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const positive=n=>valid(n)&&n>0;
function optionsCheck(options){
 if(!options||typeof options!=='object'||Array.isArray(options))
  throw Error('I28: options must be a record');
 for(const key of ['now','sampleHeap','shouldCancel','onProgress'])
  if(options[key]!==undefined&&typeof options[key]!=='function')
   throw Error('I28: '+key+' must be a function');
 for(const key of ['deadlineMs','maxObservedHeapBytes'])
  if(options[key]!==undefined&&!positive(options[key]))
   throw Error('I28: '+key+' must be positive');
 if(options.maxObservedHeapBytes!==undefined&&!options.sampleHeap)
  throw Error('I28: heap pressure threshold requires a sampler');
}
async function run(files,pins=Array(7).fill(null),options={}){
 optionsCheck(options);
 if(!Array.isArray(pins)||pins.length!==7||
    pins.some(p=>p!==null&&!(typeof p==='string'&&SHA.test(p))))
  throw Error('I28: seven optional lowercase SHA claims required');
 const stablePins=Object.freeze(pins.slice());
 const name=options.profile===undefined?'standard':options.profile;
 const meta=Profile.preflight(files,name);
 const now=options.now||(root.performance?.now?
  ()=>root.performance.now():null);
 if(typeof now!=='function')throw Error('I28: monotonic clock unavailable');
 const started=now();
 if(!valid(started))throw Error('I28: invalid monotonic start');
 let canceled=false,heapMin=null,heapMax=null,heapSamples=0;
 const sample=()=>{
  if(!options.sampleHeap)return;
  let n;
  try{n=options.sampleHeap()}catch(_){
   canceled=true;throw Error('I28: heap observation failed; result rejected');
  }
  if(!valid(n)){canceled=true;throw Error('I28: invalid heap observation')}
  heapSamples++;
  heapMin=heapMin===null?n:Math.min(heapMin,n);
  heapMax=heapMax===null?n:Math.max(heapMax,n);
  if(options.maxObservedHeapBytes!==undefined&&n>options.maxObservedHeapBytes){
   canceled=true;throw Error('I28: observed heap pressure threshold exceeded');
  }
 };
 const guard=()=>{
  if(canceled)return true;
  if(options.shouldCancel?.()===true){canceled=true;return true}
  const t=now();
  if(!valid(t)||t<started){canceled=true;throw Error('I28: invalid monotonic clock')}
  if(options.deadlineMs!==undefined&&t-started>options.deadlineMs){
   canceled=true;throw Error('I28: observed elapsed deadline exceeded');
  }
  return false;
 };
 sample();
 if(guard())throw Error('I28: canceled before import');
 // The I26 strict reader is retained, including BOM, truncation and size checks.
 const loaded=await Import.readFiles(files,{
  chunkBytes:meta.chunkBytes,shouldCancel:guard,
  onProgress:event=>{
   if(guard())throw Error('I28: canceled during import');
   sample();
   options.onProgress?.(Object.freeze({
    stage:event.stage,bytesRead:event.bytesRead,
    totalBytes:event.totalBytes,chunkCount:event.chunkCount,
    profile:name,externalCustodyProven:false}));
  }
 });
 if(guard())throw Error('I28: canceled before inspection');
 // One inspect() over frozen source / pin slots. The I25 legacy prepare() and
 // verify() remain unchanged and are needed for externally received packets.
 const fresh=await Audit.prepareCheckedOnce(loaded.raws,stablePins);
 if(guard())throw Error('I28: canceled after inspection');
 sample();
 const finished=now();
 if(!valid(finished)||finished<started)
  throw Error('I28: invalid monotonic completion');
 if(options.deadlineMs!==undefined&&finished-started>options.deadlineMs)
  throw Error('I28: observed elapsed deadline exceeded');
 const packet=fresh.packet;
 if(packet.operationalApproval!==false||packet.externalCustodyProven!==false||
  packet.noWrites!==true||fresh.stageInspectionPasses!==1||
  fresh.externalIndependentReverificationPerformed!==false)
  throw Error('I28: trust or inspection contract violated');
 const report=Object.freeze({
  format:FORMAT,profile:name,sourceBytes:meta.sourceBytes,
  presentFiles:meta.presentFiles,missingFiles:meta.missingFiles,
  maxFileBytes:meta.maxFileBytes,maxTotalBytes:meta.maxTotalBytes,
  chunkBytes:meta.chunkBytes,inputChunks:loaded.diagnostic.chunks,
  bytesRead:loaded.diagnostic.readBytes,
  maxReadChunkBytes:loaded.diagnostic.peakReadBytes,
  observedElapsedMs:finished-started,observedHeapSamples:heapSamples,
  observedHeapMinBytes:heapMin,observedHeapMaxBytes:heapMax,
  memoryMeasurementMethod:heapSamples?'provided-heapUsed-samples':'not-available',
  heapStatisticsStorage:'constant-size-min-max-count',
  actualHeapPeakProven:false,fullRAMMaximumProven:false,
  heapMeasurementsReproducibleAcrossDevices:false,
  timingsComparableOnlyWithinSameEnvironment:true,
  freshI25InspectionPasses:1,I27LegacyI25InspectionPasses:2,
  duplicateFreshInspectionRemoved:true,
  externalPacketsRequireI25Verify:true,
  originalI25InspectionUsed:true,
  originalI25VerificationUsed:false,
  I25StillParsesCompleteJSON:true,
  actualIPhoneValidated:false,externalCustodyProven:false,
  operationalApproval:false,jointReplacementExcluded:false,noWrites:true
 });
 return Object.freeze({packet,report,classification:packet.classification,
  operationalApproval:false,externalCustodyProven:false,
  timeAnchorProven:false,physicalRetentionProven:false,
  actualIPhoneValidated:false,heapPeakProven:false,noWrites:true});
}
root.MiBowlingI28Efficiency=Object.freeze({FORMAT,run});
})(window);
