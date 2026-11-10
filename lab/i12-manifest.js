/* MI BOWLING · LAB I12 · portable, independent, READ-ONLY evidence manifest.
 * No scores, WAL, authenticated services, IndexedDB, localStorage or network.
 * SHA-256 provides consistency, NOT authenticity or immutability by itself.
 * Rollback requires an independently retained newer pin / sealed witness.
 */
(function(root){
'use strict';
const C=root.MiBowlingI11AuditCore,E=root.MiBowlingI11Evidence;
if(!C||!E||!root.crypto?.subtle)throw Error('I12: I11 audit core, sealed evidence and WebCrypto required');
const FORMAT='MI-BOWLING-I12-LAB-AUDIT-MANIFEST',VERSION=1,MAX_ENTRIES=40;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
const hashText=async s=>hex(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
const hashObject=x=>hashText(JSON.stringify(x));
const copy=C.copy;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function assertOwner(owner){if(!UUID.test(owner||''))throw Error('I12: identidad ficticia UUID inválida')}
function assertSources(sources){
 if(!Array.isArray(sources)||!sources.length||sources.length>MAX_ENTRIES)
  throw Error('I12: se requieren entre 1 y 40 exportaciones de evidencia ordenadas');
 for(const s of sources){
  if(!s||typeof s.file!=='string'||!s.file.length||s.file.length>E.MAX*2||
     typeof s.passphrase!=='string')
   throw Error('I12: archivo o frase de evidencia inválidos');
 }
}
function assertPrefix(oldEvents,newEvents){
 if(newEvents.length<oldEvents.length)throw Error('I12: ROLLBACK: exportación más antigua que el testigo anterior');
 for(let i=0;i<oldEvents.length;i++)
  if(oldEvents[i].chainHash!==newEvents[i].chainHash)
   throw Error('I12: BIFURCACIÓN: evidencia no prolonga la cadena anterior');
}
async function readSource(owner,source){
 const data=await E.open(source.file,source.passphrase,owner);
 let h;
 try{h=JSON.parse(source.file)}catch(_){throw Error('I12: evidencia JSON inválida')}
 return {data,header:h,fileHash:await hashText(source.file)};
}
async function build(owner,sources){
 assertOwner(owner);assertSources(sources);
 let older=[],lastTime=0,priorHash=C.ZERO;
 const ids=new Set(),fileHashes=new Set(),entries=[];
 for(let i=0;i<sources.length;i++){
  const {data,header,fileHash}=await readSource(owner,sources[i]);
  if(ids.has(header.evidenceId)||fileHashes.has(fileHash))
   throw Error('I12: exportación duplicada en el manifiesto');
  ids.add(header.evidenceId);fileHashes.add(fileHash);
  if(header.createdAt<lastTime)
   throw Error('I12: exportaciones fuera de orden cronológico; ordena los archivos');
  assertPrefix(older,data.events);
  const delta=data.events.slice(older.length);
  const base={seq:i+1,owner,kind:'sealed-evidence-export',
   evidenceId:header.evidenceId,exportedAt:header.createdAt,
   fileSha256:fileHash,count:data.events.length,
   headHash:data.head?.headHash||C.ZERO,
   newRestoreAuditIds:delta.filter(x=>x.kind==='restore').map(x=>x.auditId),
   newConflictAuditIds:delta.filter(x=>x.kind==='conflict').map(x=>x.auditId),
   prevEntryHash:priorHash};
  const entry={...base,entryHash:await hashObject(base)};
  entries.push(entry);older=data.events;lastTime=header.createdAt;priorHash=entry.entryHash;
 }
 const body={format:FORMAT,version:VERSION,owner,entries};
 return Object.freeze({...body,digest:await hashObject(body)});
}
function pin(manifest){
 if(!manifest||manifest.format!==FORMAT||!SHA.test(manifest.digest||'')||
  !manifest.entries?.length)throw Error('I12: manifiesto no verificado');
 const last=manifest.entries.at(-1);
 return Object.freeze({format:'MI-BOWLING-I12-EXTERNAL-PIN',version:1,
  owner:manifest.owner,manifestDigest:manifest.digest,
  exports:manifest.entries.length,lastCount:last.count,lastHeadHash:last.headHash});
}
function readPin(external,owner){
 if(external===undefined||external===null||external==='')return null;
 let p;
 try{p=typeof external==='string'?JSON.parse(external):external}
 catch(_){throw Error('I12: PIN externo ilegible')}
 if(!p||Object.keys(p).sort().join(',')!==
  ['format','version','owner','manifestDigest','exports','lastCount','lastHeadHash'].sort().join(',')||
   p.format!=='MI-BOWLING-I12-EXTERNAL-PIN'||p.version!==1||p.owner!==owner||
   !SHA.test(p.manifestDigest||'')||!SHA.test(p.lastHeadHash||'')||
   !Number.isSafeInteger(p.exports)||p.exports<1||p.exports>MAX_ENTRIES||
   !Number.isSafeInteger(p.lastCount)||p.lastCount<0)
  throw Error('I12: PIN externo incompatible o de otra identidad');
 return p;
}
async function verify(manifest,sources,owner,externalPin){
 assertOwner(owner);
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest)||
    Object.keys(manifest).sort().join(',')!==
     ['format','version','owner','entries','digest'].sort().join(',')||
    manifest.format!==FORMAT||manifest.version!==VERSION||manifest.owner!==owner||
    !SHA.test(manifest.digest||''))
  throw Error('I12: manifiesto inválido o perteneciente a otra identidad');
 const recreated=await build(owner,sources);
 if(!same(manifest,recreated))
  throw Error('I12: ALTERACIÓN, PÉRDIDA o ARCHIVO ANTIGUO: manifiesto y exportaciones difieren');
 const trusted=readPin(externalPin,owner);
 if(trusted&&!same(trusted,pin(recreated)))
  throw Error('I12: ROLLBACK: el PIN externo conservado contradice el manifiesto');
 const last=recreated.entries.at(-1);
 return Object.freeze({verified:true,sourceFilesVerified:sources.length,
  restoredReceipts:recreated.entries.reduce((n,e)=>n+e.newRestoreAuditIds.length,0),
  rejectedConflicts:recreated.entries.reduce((n,e)=>n+e.newConflictAuditIds.length,0),
  count:last.count,headHash:last.headHash,digest:recreated.digest,
  externallyPinned:!!trusted,rollbackAssurance:trusted?'external-witness-conditional':'not-established',
  noWrites:true,containsScores:false});
}
async function compareCurrent(owner,manifest,sources,externalPin,current){
 // Never trust an internally self-certified head in place of an external pin.
 const proof=await verify(manifest,sources,owner,externalPin);
 if(!proof.externallyPinned)
  throw Error('I12: no puede atribuirse detección de rollback sin PIN externo conservado');
 if(!current||current.owner!==owner||!Array.isArray(current.events))
  throw Error('I12: instantánea de auditoría local inválida');
 await C.verify(owner,current.events,current.head);
 const latest=(await readSource(owner,sources.at(-1))).data;
 for(let i=0;i<Math.min(current.events.length,latest.events.length);i++)
  if(current.events[i].chainHash!==latest.events[i].chainHash)
   return Object.freeze({verdict:'fork-detected',noWrites:true,externallyPinned:true});
 if(current.events.length<latest.events.length)
  return Object.freeze({verdict:'rollback-or-suppression-detected',
   missing:latest.events.length-current.events.length,noWrites:true,externallyPinned:true});
 if(current.events.length>latest.events.length)
  return Object.freeze({verdict:'external-witness-obsolete',
   extra:current.events.length-latest.events.length,noWrites:true,externallyPinned:true});
 return Object.freeze({verdict:'aligned',count:latest.events.length,
  noWrites:true,externallyPinned:true});
}
function unbase64(input){
 if(typeof input!=='string'||input.length>5000||!/^[A-Za-z0-9+/]*={0,2}$/.test(input))
  throw Error('I12: firma base64 inválida');
 try{return Uint8Array.from(atob(input),ch=>ch.charCodeAt(0))}
 catch(_){throw Error('I12: firma codificada inválida')}
}
async function verifyDetachedSignature(manifest,signatureBase64,publicJwk){
 // Experimental verification only: private keys are NEVER issued or stored here.
 if(!manifest||!SHA.test(manifest.digest||'')||!publicJwk||
   publicJwk.kty!=='EC'||publicJwk.crv!=='P-256'||
   typeof publicJwk.x!=='string'||typeof publicJwk.y!=='string'||
   Object.prototype.hasOwnProperty.call(publicJwk,'d'))
  throw Error('I12: clave P-256 pública externa inválida');
 const sig=unbase64(signatureBase64);
 if(sig.length!==64)throw Error('I12: firma ECDSA P-256 debe tener 64 bytes IEEE P1363');
 const publicKey=await root.crypto.subtle.importKey('jwk',
  {kty:'EC',crv:'P-256',x:publicJwk.x,y:publicJwk.y,ext:true},
  {name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 const bytes=new TextEncoder().encode('MI-BOWLING-I12-MANIFEST-v1|'+manifest.digest);
 const valid=await root.crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},publicKey,sig,bytes);
 return Object.freeze({signatureValid:valid,algorithm:'ECDSA-P256-SHA256',
  independentlyManagedKeyRequired:true,timestampProven:false,immutabilityProven:false});
}
root.MiBowlingI12Manifest=Object.freeze({FORMAT,VERSION,MAX_ENTRIES,
 build,verify,pin,compareCurrent,verifyDetachedSignature,hashText});
})(window);
