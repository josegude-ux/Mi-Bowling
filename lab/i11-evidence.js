/* MI BOWLING · LAB I11 · independent portable encrypted audit evidence.
 * Owner-scoped receipt chain, NO scores/WAL/plain passwords or online services.
 * External file is the ONLY independent witness if both local receipts & anchor
 * are deleted together. User must keep it outside the browser profile.
 */
(function(root){
'use strict';
const subtle=root.crypto?.subtle,C=root.MiBowlingI11AuditCore;
const ENC=new TextEncoder(),DEC=new TextDecoder();
const FORMAT='MI-BOWLING-I11-LAB-SEALED-AUDIT-EVIDENCE',VERSION=1;
const MAX=3*1024*1024,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const hex=b=>[...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
async function sha(raw){return hex(await subtle.digest('SHA-256',ENC.encode(raw)))}
const b64=bytes=>{let s='';for(const v of bytes)s+=String.fromCharCode(v);return btoa(s)};
function un64(s){
 if(typeof s!=='string'||s.length>MAX*2)throw Error('I11: evidencia codificada inválida');
 try{return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
 catch(_){throw Error('I11: evidencia truncada o codificada incorrectamente')}
}
function password(p){
 if(typeof p!=='string'||p.length<12||p.length>256)
  throw Error('I11: frase ficticia de evidencia de 12 a 256 caracteres');
}
function aad(h){
 return ENC.encode([FORMAT,VERSION,h.owner,h.evidenceId,
  h.createdAt,h.count,h.headHash,h.sha256].join('|'));
}
async function key(pass,salt){
 const base=await subtle.importKey('raw',ENC.encode(pass),{name:'PBKDF2'},false,['deriveKey']);
 return subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},
  base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function verifyData(data,owner){
 if(!UUID.test(owner||'')||data?.version!==1||data.owner!==owner||
   !Array.isArray(data.events)||data.events.length>2000||
   (data.head!==null&&typeof data.head!=='object'))
  throw Error('I11: evidencia de auditoría de otro jugador o malformada');
 await C.verify(owner,data.events,data.head);
 if(JSON.stringify(data).length>MAX)throw Error('I11: evidencia demasiado grande');
 return true;
}
async function seal(data,pass){
 password(pass);await verifyData(data,data?.owner);
 const raw=JSON.stringify(data),salt=root.crypto.getRandomValues(new Uint8Array(16)),
  iv=root.crypto.getRandomValues(new Uint8Array(12));
 if(ENC.encode(raw).length>MAX)throw Error('I11: evidencia excede límite');
 const h={format:FORMAT,version:VERSION,owner:data.owner,evidenceId:root.crypto.randomUUID(),
  createdAt:Date.now(),count:data.events.length,
  headHash:data.head?.headHash||C.ZERO,sha256:await sha(raw),
  kdf:'PBKDF2-SHA256-310000',algorithm:'AES-256-GCM',
  salt:b64(salt),iv:b64(iv)};
 const encrypted=new Uint8Array(await subtle.encrypt({name:'AES-GCM',iv,
  additionalData:aad(h),tagLength:128},await key(pass,salt),ENC.encode(raw)));
 return JSON.stringify({...h,ciphertext:b64(encrypted)});
}
async function open(file,pass,owner){
 password(pass);
 if(typeof file!=='string'||file.length>MAX*2)throw Error('I11: archivo de evidencia excesivo');
 let h;
 try{h=JSON.parse(file)}catch(_){throw Error('I11: JSON de evidencia incompatible/truncado')}
 if(!UUID.test(owner||'')||h?.format!==FORMAT||h.version!==VERSION||h.owner!==owner||
  !UUID.test(h.evidenceId||'')||!Number.isSafeInteger(h.createdAt)||
  h.createdAt<=0||!Number.isSafeInteger(h.count)||h.count<0||h.count>2000||
  !/^[a-f0-9]{64}$/.test(h.headHash||'')||
  !/^[a-f0-9]{64}$/.test(h.sha256||'')||
  h.kdf!=='PBKDF2-SHA256-310000'||h.algorithm!=='AES-256-GCM')
  throw Error('I11: evidencia incompatible o identidad errónea');
 const salt=un64(h.salt),iv=un64(h.iv),bytes=un64(h.ciphertext);
 if(salt.length!==16||iv.length!==12||bytes.length<24||bytes.length>MAX+16)
  throw Error('I11: longitud de evidencia cifrada inválida');
 let data;
 try{
  const raw=DEC.decode(await subtle.decrypt({name:'AES-GCM',iv,
   additionalData:aad(h),tagLength:128},await key(pass,salt),bytes));
  if(await sha(raw)!==h.sha256)throw Error('checksum mismatch');
  data=JSON.parse(raw);
 }catch(_){throw Error('I11: clave incorrecta, evidencia alterada o truncada; no importar')}
 await verifyData(data,owner);
 if(data.events.length!==h.count||(data.head?.headHash||C.ZERO)!==h.headHash)
  throw Error('I11: cabecera y cadena de evidencia no concuerdan');
 return C.copy(data);
}
async function exportEvidence(journal,owner,pass){
 if(!journal||typeof journal.exportAuditEvidence!=='function')
  throw Error('I11: vault ficticio desbloqueado requerido');
 return seal(await journal.exportAuditEvidence(owner),pass);
}
async function previewEvidence(journal,owner,file,pass){
 const data=await open(file,pass,owner);
 let local;
 try{local=await journal.exportAuditEvidence(owner)}
 catch(error){
  // A damaged local chain should not prevent verifying the external witness.
  // However, never claim local integrity or automatically overwrite it.
  return Object.freeze({verified:true,owner,verdict:'local-chain-unverifiable',
   localCount:null,sourceCount:data.events.length,newEvents:null,
   independent:true,noWrites:true,containsScores:false,requiresManualRecovery:true});
 }
 const comparison=await C.compare(owner,local.events,local.head,data.events,data.head);
 return Object.freeze({...comparison,owner,sourceCount:data.events.length,
  localCount:local.events.length,independent:true,noWrites:true,
  containsScores:false,requiresManualRecovery:false});
}
async function importEvidence(journal,owner,file,pass,confirmation){
 if(confirmation!=='CONFIRMAR-EVIDENCIA-FICTICIA')
  throw Error('I11: recuperación de evidencias requiere autorización expresa');
 if(!journal||typeof journal.restoreAuditEvidence!=='function')
  throw Error('I11: almacén de auditoría ficticio bloqueado');
 const data=await open(file,pass,owner);
 return journal.restoreAuditEvidence(owner,data);
}
root.MiBowlingI11Evidence=Object.freeze({FORMAT,VERSION,MAX,
 verifyData,seal,open,exportEvidence,previewEvidence,importEvidence});
})(window);
