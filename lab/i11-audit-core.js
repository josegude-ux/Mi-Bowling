/* MI BOWLING · I11 LAB · canonical verifiable receipt chain.
 * Pure cryptographic protocol, no storage/network/services and no scores.
 */
(function(root){
'use strict';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/,ZERO='0'.repeat(64);
const ENCODER=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
const hash=async x=>hex(await root.crypto.subtle.digest('SHA-256',ENCODER.encode(JSON.stringify(x))));
const copy=x=>JSON.parse(JSON.stringify(x));
const validRev=r=>r===null||(Number.isSafeInteger(r)&&r>=0);
const validDate=t=>Number.isSafeInteger(t)&&t>0;
const fields=['version','kind','owner','auditId','backupId','backupSha',
 'occurredAt','sourceCreatedAt','revision','operationsAdded','status',
 'seq','prevHash'];
function canonical(e){
 if(!e||typeof e!=='object'||Array.isArray(e))throw Error('I11: recibo inválido');
 return Object.fromEntries(fields.map(k=>[k,e[k]]));
}
function fieldsExactly(e){
 const keys=Object.keys(e).sort();
 const wanted=[...fields,'chainHash'].sort();
 return keys.length===wanted.length&&keys.every((k,i)=>k===wanted[i]);
}
function shape(e,owner){
 if(!UUID.test(owner||'')||!fieldsExactly(e)||
   e.version!==2||e.kind!=='restore'||e.owner!==owner||
   !UUID.test(e.auditId||'')||!UUID.test(e.backupId||'')||
   !SHA.test(e.backupSha||'')||!SHA.test(e.prevHash||'')||
   !SHA.test(e.chainHash||'')||!validDate(e.occurredAt)||
   !validDate(e.sourceCreatedAt)||!validRev(e.revision)||
   !Number.isSafeInteger(e.operationsAdded)||e.operationsAdded<0||
   !Number.isSafeInteger(e.seq)||e.seq<1||e.status!=='restored')
  throw Error('I11: recibo alterado o de otra identidad');
}
async function append(owner,payload,previous=ZERO,seq=1){
 const entry=canonical({...payload,owner,kind:'restore',version:2,
   seq,prevHash:previous});
 const core={...entry};
 const e={...core,chainHash:await hash(core)};
 shape(e,owner);
 return Object.freeze(e);
}
async function verify(owner,events,anchor){
 if(!UUID.test(owner||'')||!Array.isArray(events)||events.length>2000)
  throw Error('I11: cadena de auditoría inválida');
 const seen=new Set();
 let prev=ZERO;
 for(let i=0;i<events.length;i++){
  const e=events[i];
  shape(e,owner);
  if(e.seq!==i+1||e.prevHash!==prev||seen.has(e.auditId))
   throw Error('I11: supresión, orden o duplicidad detectada en cadena');
  seen.add(e.auditId);
  if(await hash(canonical(e))!==e.chainHash)
   throw Error('I11: huella de evento alterada');
  prev=e.chainHash;
 }
 if(events.length===0){
  if(anchor!==null&&anchor!==undefined)
   throw Error('I11: cabecera sin eventos o supresión de cadena');
 }else if(!anchor||anchor.version!==1||anchor.kind!=='head'||
    anchor.owner!==owner||anchor.count!==events.length||
    anchor.revision!==events.length||anchor.headHash!==prev||
    Object.keys(anchor).sort().join(',')!==
     ['version','kind','owner','count','revision','headHash'].sort().join(','))
  throw Error('I11: supresión de cola o alteración de ancla detectada');
 return Object.freeze({count:events.length,headHash:prev,verified:true});
}
function head(owner,events){
 if(!events.length)return null;
 return Object.freeze({version:1,kind:'head',owner,
  count:events.length,revision:events.length,
  headHash:events[events.length-1].chainHash});
}
async function compare(owner,local,localHead,external,externalHead){
 await verify(owner,local,localHead);
 await verify(owner,external,externalHead);
 for(let i=0;i<Math.min(local.length,external.length);i++){
  if(local[i].chainHash!==external[i].chainHash)
   throw Error('I11: CONFLICTO: cadenas de auditoría bifurcadas');
 }
 if(external.length<local.length)
  throw Error('I11: evidencia OBSOLETA: contiene menos recibos que el almacén');
 return Object.freeze({verdict:external.length===local.length?'identical':'append-only',
  existing:local.length,newEvents:external.length-local.length,
  verified:true,headHash:external.length?external.at(-1).chainHash:ZERO});
}
root.MiBowlingI11AuditCore=Object.freeze({ZERO,hash,canonical,append,verify,head,compare,copy});
})(window);
