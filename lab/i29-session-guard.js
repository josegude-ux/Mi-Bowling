/* MI BOWLING I29 LAB · per-session revision guards + independent external
 * I25 verification. A/B/C invented, offline, no writes or authority.
 * I28 fresh single-inspection path remains unchanged and never authenticates
 * a received packet. No measured browser RAM or physical iPhone claim.
 */
(function(root){
'use strict';
const Efficiency=root.MiBowlingI28Efficiency;
const Audit=root.MiBowlingI25RetentionAudit;
if(!Efficiency||!Audit||typeof Audit.verify!=='function')
 throw Error('I29: I28 and original I25 verifier required');
const FORMAT='MI-BOWLING-I29-LAB-SESSION-RECOVERY';
const MAX_EXTERNAL_JSON_CHARS=48*1024*1024;
const SHA=/^[a-f0-9]{64}$/;
function verifyInput(packet,expectedDigest){
 if(!packet||typeof packet!=='object'||Array.isArray(packet)||
  !Array.isArray(packet.sources)||packet.sources.length!==7||
  packet.sources.some(x=>x!==null&&typeof x!=='string'))
  throw Error('I29: external packet requires seven text slots');
 if(packet.sources.some(x=>x!==null&&x.length>Audit.MAX_FILE_BYTES)||
    packet.sources.reduce((n,x)=>n+(x?.length||0),0)>Audit.MAX_TOTAL_BYTES)
  throw Error('I29: external raw size preflight exceeded');
 if(expectedDigest!==null&&
   !(typeof expectedDigest==='string'&&SHA.test(expectedDigest)))
  throw Error('I29: invalid separately supplied SHA claim');
}
/* Serializing before verifying avoids reacting to later mutations of the
 * caller's packet during I25.verify, but may transiently allocate copies.
 * The JSON-length guard is AFTER stringification: NOT a peak-memory bound.
 * This extra parsing is ONLY on externally supplied packets, not the fresh
 * I28 optimized construction path.
 */
function snapshotExternal(packet){
 let text;
 try{text=JSON.stringify(packet)}
 catch(_){throw Error('I29: external packet cannot be snapshotted')}
 if(typeof text!=='string'||text.length>MAX_EXTERNAL_JSON_CHARS)
  throw Error('I29: external envelope snapshot too large');
 try{return JSON.parse(text)}
 catch(_){throw Error('I29: external envelope snapshot invalid')}
}
function createSession(){
 let revision=0,phase='idle',latestDigest=null;
 const state=()=>Object.freeze({format:FORMAT,revision,phase,
  latestDigest,externalCustodyProven:false,
  actualIPhoneValidated:false,noWrites:true});
 const cancel=()=>{
  revision++;phase='canceled';latestDigest=null;
  return state();
 };
 const start=()=>{
  const ticket=++revision;
  phase='running';latestDigest=null;
  return ticket;
 };
 function ensure(ticket,check){
  if(ticket!==revision)throw Error('I29: stale session result rejected');
  if(check?.()===true){
   revision++;phase='canceled';latestDigest=null;
   throw Error('I29: session canceled without result');
  }
 }
 function fail(ticket){
  if(ticket===revision){phase='failed';latestDigest=null}
 }
 async function run(files,pins=Array(7).fill(null),options={}){
  const ticket=start();
  try{
   if(!options||typeof options!=='object'||Array.isArray(options))
    throw Error('I29: options must be a record');
   const shouldCancel=options.shouldCancel;
   if(shouldCancel!==undefined&&typeof shouldCancel!=='function')
    throw Error('I29: cancellation callback must be a function');
   ensure(ticket,shouldCancel);
   const fresh=await Efficiency.run(files,pins,{
    ...options,
    shouldCancel:()=>ticket!==revision||shouldCancel?.()===true,
    onProgress:event=>{
     ensure(ticket,shouldCancel);
     options.onProgress?.(event);
     ensure(ticket,shouldCancel);
    }
   });
   ensure(ticket,shouldCancel);
   if(fresh.operationalApproval!==false||
      fresh.externalCustodyProven!==false||
      fresh.noWrites!==true||
      fresh.report.freshI25InspectionPasses!==1||
      fresh.report.externalPacketsRequireI25Verify!==true)
    throw Error('I29: fresh packet trust boundary failed');
   phase='fresh-ready';latestDigest=fresh.packet.digest;
   return fresh;
  }catch(e){fail(ticket);throw e}
 }
 async function verifyExternal(packet,expectedDigest=null,options={}){
  const ticket=start();
  try{
   if(!options||typeof options!=='object'||Array.isArray(options))
    throw Error('I29: external options must be a record');
   const shouldCancel=options.shouldCancel;
   if(shouldCancel!==undefined&&typeof shouldCancel!=='function')
    throw Error('I29: external cancellation must be a function');
   ensure(ticket,shouldCancel);
   verifyInput(packet,expectedDigest);
   const snapshot=snapshotExternal(packet);
   ensure(ticket,shouldCancel);
   // Unmodified complete I25 verifier, NEVER the single-inspection builder.
   const checked=await Audit.verify(snapshot,expectedDigest);
   ensure(ticket,shouldCancel);
   if(checked.integrityChecked!==true||checked.noWrites!==true||
      checked.operationalApproval!==false||checked.externalCustodyProven!==false)
    throw Error('I29: invalid external verifier result');
   latestDigest=snapshot.digest;phase='external-internally-checked';
   return Object.freeze({format:FORMAT,verification:checked,
    digest:snapshot.digest,originalI25VerifyUsed:true,
    singleInspectionBypassUsed:false,externallyAuthenticated:false,
    externalCustodyProven:false,operationalApproval:false,noWrites:true});
  }catch(e){fail(ticket);throw e}
 }
 return Object.freeze({run,verifyExternal,cancel,state});
}
root.MiBowlingI29SessionGuard=Object.freeze({
 FORMAT,MAX_EXTERNAL_JSON_CHARS,createSession
});
})(window);
