/* MI BOWLING · I26 LAB · bounded-input, sequential UTF-8 imports.
 * MAX 12MiB/file and 28MiB/7 slots. Chunk size bounds the READ operation,
 * NOT JavaScript heap use: I25 still retains and parses complete text.
 * A/B/C only fictitious. No network, storage, real accounts or permissions.
 */
(function(root){
'use strict';
const I25=root.MiBowlingI25RetentionAudit;
if(!I25||!root.TextDecoder)throw Error('I26: I25 and TextDecoder required');
const FORMAT='MI-BOWLING-I26-LAB-BOUNDED-IMPORT-REPORT';
const STAGES=I25.STAGES,DEFAULT_CHUNK_BYTES=128*1024,MAX_CHUNK_BYTES=256*1024;
const SHA=/^[0-9a-f]{64}$/;
function checkPins(pins){
 if(!Array.isArray(pins)||pins.length!==7||
  pins.some(x=>x!==null&&!(typeof x==='string'&&SHA.test(x))))
  throw Error('I26: exactly seven optional lowercase SHA claims required');
}
function preflight(files){
 if(!Array.isArray(files)||files.length!==7)
  throw Error('I26: seven ordered I18-I24 file slots required');
 let total=0;
 const limits=files.map((file,i)=>{
  if(file===null)return {stage:STAGES[i],bytes:0,present:false};
  if(!file||!Number.isSafeInteger(file.size)||file.size<=0||
    typeof file.slice!=='function')
   throw Error('I26: invalid file interface or empty input: '+STAGES[i]);
  if(file.size>I25.MAX_FILE_BYTES)
   throw Error('I26: file exceeds 12 MiB: '+STAGES[i]);
  total+=file.size;
  if(total>I25.MAX_TOTAL_BYTES)
   throw Error('I26: seven files exceed 28 MiB');
  return{stage:STAGES[i],bytes:file.size,present:true};
 });
 return Object.freeze({files:limits,totalBytes:total,knownMaxChunkBytes:MAX_CHUNK_BYTES,
  rawInputBudgetEnforced:true,heapUseMeasured:false,physicalCustodyProven:false});
}
function cancellation(options){
 if(options?.shouldCancel?.()===true)throw Error('I26: import canceled, no result retained');
}
function chooseChunk(value){
 if(value===undefined)return DEFAULT_CHUNK_BYTES;
 if(!Number.isInteger(value)||value<1||value>MAX_CHUNK_BYTES)
  throw Error('I26: chunk size outside allowed range');
 return value;
}
async function decodeOne(file,stage,chunkBytes,options,progress){
 if(file===null)return null;
 // Explicit UTF-8 BOM check also works when BOM bytes span chunks.
 const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
 const pieces=[];
 for(let offset=0;offset<file.size;offset+=chunkBytes){
  cancellation(options);
  const end=Math.min(file.size,offset+chunkBytes);
  const part=file.slice(offset,end);
  if(!part||typeof part.arrayBuffer!=='function')
   throw Error('I26: invalid slice for '+stage);
  const bytes=new Uint8Array(await part.arrayBuffer());
  cancellation(options);
  if(bytes.length!==end-offset)
   throw Error('I26: short or overlong chunk: '+stage);
  progress.chunkCount++;
  progress.peakReadBytes=Math.max(progress.peakReadBytes,bytes.length);
  progress.bytesRead+=bytes.length;
  let str;
  try{str=decoder.decode(bytes,{stream:true})}
  catch(_){throw Error('I26: malformed UTF-8 in '+stage)}
  if(str)pieces.push(str);
  if(typeof options?.onProgress==='function')
   options.onProgress(Object.freeze({stage,bytesRead:progress.bytesRead,
    totalBytes:progress.totalBytes,chunkCount:progress.chunkCount}));
 }
 cancellation(options);
 try{pieces.push(decoder.decode())}
 catch(_){throw Error('I26: truncated UTF-8 in '+stage)}
 const result=pieces.join('');
 if(result.charCodeAt(0)===0xFEFF)
  throw Error('I26: UTF-8 BOM rejected for '+stage);
 if(file.size!==progress.currentExpected)
  throw Error('I26: file changed during import: '+stage);
 return result;
}
async function readFiles(files,options={}){
 const pre=preflight(files),chunkBytes=chooseChunk(options.chunkBytes);
 cancellation(options);
 const raws=[];
 const progress={totalBytes:pre.totalBytes,bytesRead:0,
  chunkCount:0,peakReadBytes:0,currentExpected:0};
 for(let i=0;i<STAGES.length;i++){
  progress.currentExpected=pre.files[i].bytes;
  const text=await decodeOne(files[i],STAGES[i],chunkBytes,options,progress);
  raws.push(text);
 }
 cancellation(options);
 if(progress.bytesRead!==pre.totalBytes)
  throw Error('I26: import byte total mismatch');
 return{raws,diagnostic:Object.freeze({format:FORMAT,stages:7,
  imported:pre.files.filter(x=>x.present).length,
  missing:pre.files.filter(x=>!x.present).length,
  inputBytes:pre.totalBytes,readBytes:progress.bytesRead,
  chunks:progress.chunkCount,peakReadBytes:progress.peakReadBytes,
  maxSingleFileBytes:I25.MAX_FILE_BYTES,maxCombinedBytes:I25.MAX_TOTAL_BYTES,
  inputBudgetEnforced:true,heapUseMeasured:false,
  independentlyAuthenticated:false,physicalCustodyProven:false,
  immutableStorageProven:false,untrustedPinsOnly:true,
  noWrites:true})};
}
async function analyze(files,pins=Array(7).fill(null),options={}){
 checkPins(pins);
 const loaded=await readFiles(files,options);
 cancellation(options);
 const packet=await I25.prepare(loaded.raws,pins);
 cancellation(options);
 const verification=await I25.verify(packet);
 cancellation(options);
 if(verification.operationalApproval!==false||
    verification.externalCustodyProven!==false||verification.noWrites!==true)
  throw Error('I26: I25 trust boundary broken');
 return Object.freeze({packet,diagnostic:loaded.diagnostic,
  verifiedStageCount:verification.internallyVerifiedStages,
  classification:packet.classification,operationalApproval:false,
  externalCustodyProven:false,jointReplacementExcluded:false,
  heapUseMeasured:false,noWrites:true});
}
root.MiBowlingI26BoundedImport=Object.freeze({FORMAT,STAGES,
 DEFAULT_CHUNK_BYTES,MAX_CHUNK_BYTES,preflight,readFiles,analyze});
})(window);
