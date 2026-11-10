/* MI BOWLING · I11 LAB · portable encrypted backups, NO production data.
 * Separate export passphrase and inner vault unlock; both only in transient RAM.
 * The signed snapshot is AES-GCM sealed, with authenticated header and SHA-256.
 * No storage APIs, external services, network calls or automatic restoration.
 */
(function(root){
'use strict';
const subtle=root.crypto?.subtle,ENC=new TextEncoder(),DEC=new TextDecoder();
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMAT='MI-BOWLING-I11-LAB-ENCRYPTED-BACKUP',VERSION=2,MAX_BYTES=18*1024*1024,MAX_OPS=512;
const copy=x=>JSON.parse(JSON.stringify(x));
const hex=buf=>[...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async v=>hex(await subtle.digest('SHA-256',ENC.encode(v)));
const base64=bytes=>{
 let s='';for(const c of bytes)s+=String.fromCharCode(c);
 return btoa(s);
};
const from64=s=>{
 if(typeof s!=='string'||s.length>MAX_BYTES*2)throw Error('I11: base64 de respaldo inválida');
 try{return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
 catch(_){throw Error('I11: respaldo cifrado mal codificado')}
};
function requirePassword(passphrase){
 if(typeof passphrase!=='string'||passphrase.length<12||passphrase.length>256)
  throw Error('I11: frase de respaldo ficticia de 12 a 256 caracteres requerida');
}
function checkPersonal(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||p.version!==2||
    !Array.isArray(p.sessions)||!Array.isArray(p.balls)||!Array.isArray(p.patterns)||
    ['leagueNational','leagueRosters','rosters','matches'].some(k=>
      Object.prototype.hasOwnProperty.call(p,k)))
  throw Error('I11: respaldo contiene documento personal inválido o datos de Liga');
 if(JSON.stringify(p).length>9*1024*1024)throw Error('I11: documento de puntuaciones demasiado grande');
 return p;
}
async function verifySnapshot(snapshot,expectedOwner){
 if(!UUID.test(expectedOwner||'')||snapshot?.version!==1||snapshot.owner!==expectedOwner||
    !snapshot.confirmed||snapshot.confirmed.owner!==expectedOwner||
    !Array.isArray(snapshot.operations)||snapshot.operations.length>MAX_OPS)
  throw Error('I11: formato/identidad del respaldo no corresponde al jugador ficticio');
 const c=snapshot.confirmed;
 if(!(c.revision===null||(Number.isSafeInteger(c.revision)&&c.revision>=0)))
  throw Error('I11: revisión de confirmado inválida');
 checkPersonal(c.payload);
 const ids=new Set();
 for(const e of snapshot.operations){
  if(!e||e.version!==2||e.owner!==expectedOwner||!UUID.test(e.tabId||'')||
    !UUID.test(e.opId||'')||!Number.isFinite(e.createdAt)||
    !(e.baseRevision===null||(Number.isSafeInteger(e.baseRevision)&&e.baseRevision>=0))||
    !/^[a-f0-9]{64}$/.test(e.baseHash||'')||
    !/^[a-f0-9]{64}$/.test(e.payloadHash||'')||
    !/^[a-f0-9]{64}$/.test(e.checksum||''))
   throw Error('I11: operación de journal inválida');
  if(ids.has(e.opId))throw Error('I11: operación duplicada en el respaldo');
  ids.add(e.opId);
  checkPersonal(e.basePayload);checkPersonal(e.payload);
  if(await sha(JSON.stringify(e.basePayload))!==e.baseHash||
     await sha(JSON.stringify(e.payload))!==e.payloadHash)
    throw Error('I11: hash SHA-256 de la operación no coincide');
  const unsigned={version:2,owner:e.owner,tabId:e.tabId,opId:e.opId,
    createdAt:e.createdAt,baseRevision:e.baseRevision,
    basePayload:e.basePayload,baseHash:e.baseHash,payload:e.payload,payloadHash:e.payloadHash};
  if(await sha(JSON.stringify(unsigned))!==e.checksum)
   throw Error('I11: firma SHA-256 del WAL inválida');
 }
 if(JSON.stringify(snapshot).length>MAX_BYTES)
  throw Error('I11: respaldo excede el tamaño permitido');
 return true;
}
async function key(password,salt){
 const base=await subtle.importKey('raw',ENC.encode(password),{name:'PBKDF2'},false,['deriveKey']);
 return subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},
  base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function aad(h){
 return ENC.encode([FORMAT,VERSION,h.owner,h.backupId,h.revision,
   h.operations,h.createdAt,h.sha256].join('|'));
}
async function seal(snapshot,passphrase){
 requirePassword(passphrase);
 if(!subtle)throw Error('I11: WebCrypto requerido');
 await verifySnapshot(snapshot,snapshot?.owner);
 const raw=JSON.stringify(snapshot),bytes=ENC.encode(raw),salt=root.crypto.getRandomValues(new Uint8Array(16)),
  iv=root.crypto.getRandomValues(new Uint8Array(12));
 if(bytes.length>MAX_BYTES)throw Error('I11: límite de exportación superado');
 const head={format:FORMAT,version:VERSION,owner:snapshot.owner,
  backupId:root.crypto.randomUUID(),revision:snapshot.confirmed.revision,
  operations:snapshot.operations.length,createdAt:Date.now(),sha256:await sha(raw),
  kdf:'PBKDF2-SHA256-310000',algorithm:'AES-256-GCM',salt:base64(salt),iv:base64(iv)};
 const encryptionKey=await key(passphrase,salt);
 const ciphertext=new Uint8Array(await subtle.encrypt({name:'AES-GCM',
  iv,additionalData:aad(head),tagLength:128},encryptionKey,bytes));
 const file=JSON.stringify({...head,ciphertext:base64(ciphertext)});
 if(file.length>MAX_BYTES*2)throw Error('I11: respaldo cifrado excede tamaño');
 return file;
}
async function open(text,passphrase,owner){
 requirePassword(passphrase);
 if(typeof text!=='string'||text.length>MAX_BYTES*2)throw Error('I11: archivo de respaldo demasiado grande');
 let h;
 try{h=JSON.parse(text)}catch(_){throw Error('I11: JSON de respaldo ilegible')}
 if(!UUID.test(owner||'')||h?.format!==FORMAT||h.version!==VERSION||h.owner!==owner||
    !UUID.test(h.backupId||'')||h.kdf!=='PBKDF2-SHA256-310000'||
    h.algorithm!=='AES-256-GCM'||!Number.isSafeInteger(h.createdAt)||
    h.createdAt<=0||h.operations>MAX_OPS||!Number.isSafeInteger(h.operations)||
    !(h.revision===null||(Number.isSafeInteger(h.revision)&&h.revision>=0))||
    !/^[a-f0-9]{64}$/.test(h.sha256||''))
  throw Error('I11: cabecera de respaldo inválida o de otro jugador');
 const salt=from64(h.salt),iv=from64(h.iv),cipher=from64(h.ciphertext);
 if(salt.length!==16||iv.length!==12||cipher.length<24||cipher.length>MAX_BYTES+16)
  throw Error('I11: longitudes criptográficas de respaldo inválidas');
 let payload;
 try{
  const k=await key(passphrase,salt);
  const plain=await subtle.decrypt({name:'AES-GCM',iv,
   additionalData:aad(h),tagLength:128},k,cipher);
  const raw=DEC.decode(plain);
  if(await sha(raw)!==h.sha256)throw Error('checksum mismatch');
  payload=JSON.parse(raw);
 }catch(_){
  throw Error('I11: contraseña de respaldo incorrecta o bytes alterados; NO se restaura nada');
 }
 await verifySnapshot(payload,owner);
 if(payload.operations.length!==h.operations||payload.confirmed.revision!==h.revision)
  throw Error('I11: cabecera y contenido del respaldo no coinciden');
 return copy(payload);
}
async function exportBackup(journal,owner,password){
 if(!journal||typeof journal.snapshot!=='function')throw Error('I11: journal desbloqueado requerido');
 const snap=await journal.snapshot(owner);
 return seal(snap,password);
}
async function inspectBackup(text,password,owner){
 const payload=await open(text,password,owner);
 const header=JSON.parse(text);
 return {verified:true,owner,backupId:header.backupId,
   backupCreatedAt:header.createdAt,
   confirmedRevision:payload.confirmed.revision,
   confirmedHash:await sha(JSON.stringify(payload.confirmed)),
   operationCount:payload.operations.length,
   operationIds:payload.operations.map(e=>e.opId)};
}
async function restoreBackup(journal,owner,text,password,confirmation){
 if(confirmation!=='CONFIRMAR-RESTAURACION-FICTICIA')
  throw Error('I11: restauración exige confirmación explícita');
 if(!journal||typeof journal.restoreSnapshot!=='function')
  throw Error('I11: almacén cifrado desbloqueado requerido');
 const payload=await open(text,password,owner);
 const header=JSON.parse(text); // open() authenticated all header fields via AES-GCM AAD
 const source={backupId:header.backupId,backupSha:header.sha256,
  sourceCreatedAt:header.createdAt,revision:payload.confirmed.revision};
 try{return await journal.restoreSnapshot(owner,payload,source)}
 catch(error){
  // A cryptographically verified archive may still be unsafe to replay.
  // Log the DENIED action in the same append-only encrypted chain while
  // leaving scores and WAL untouched. Wrong passwords/foreign owners never
  // reach this branch and therefore never expose untrusted metadata.
  const msg=String(error?.message||error);
  const reason=/OBSOLETO/.test(msg)?'stale':
   /operación duplicada|mismo ID|otra pestaña/.test(msg)?'operation':
   /CONFLICTO de confirmado|revisión|conflicto sin escritura/.test(msg)?'fork':null;
  // An aborted transaction (including test fault injection) is NOT an
  // authenticated rejected conflict: do not create any audit event after an
  // uncommitted restore. Otherwise the all-or-nothing invariant is false.
  if(reason&&typeof journal.recordConflict==='function'){
   try{await journal.recordConflict(owner,source,reason)}
   catch(auditError){
    throw Error(msg+'; I11: no se pudo registrar el rechazo: '+auditError.message);
   }
  }
  throw error;
 }
}

async function previewAgainstJournal(journal,owner,text,password){
 if(!journal||typeof journal.inspectSnapshot!=='function')
  throw Error('I11: journal de solo lectura no disponible');
 const payload=await open(text,password,owner);
 const plan=await journal.inspectSnapshot(owner,payload);
 const header=JSON.parse(text);
 return Object.freeze({...plan,backupId:header.backupId,
  backupCreatedAt:header.createdAt,sourceFormat:FORMAT,
  sourceVersion:VERSION,verified:true,noChanges:true,
  // Never interpret a supplied timestamp as proof of historical freshness;
  // confirmed revision/hash and WAL IDs decide restoration safety.
  dateIsInformational:true
 });
}
async function compareBackups(a,b,password,owner){
 const pa=await open(a,password,owner),pb=await open(b,password,owner);
 const ha=JSON.parse(a),hb=JSON.parse(b);
 const confirmedA=await sha(JSON.stringify(pa.confirmed));
 const confirmedB=await sha(JSON.stringify(pb.confirmed));
 let verdict;
 if(pa.confirmed.revision<pb.confirmed.revision)verdict='second-newer';
 else if(pa.confirmed.revision>pb.confirmed.revision)verdict='first-newer';
 else if(confirmedA!==confirmedB)verdict='same-revision-fork';
 else{
  const first=new Map(pa.operations.map(e=>[e.opId,e.checksum]));
  const second=new Map(pb.operations.map(e=>[e.opId,e.checksum]));
  const altered=[...first].some(([id,hash])=>second.has(id)&&second.get(id)!==hash);
  verdict=altered?'operation-fork':
   first.size===second.size&&[...first].every(([id,hash])=>second.get(id)===hash)?
   'identical':'same-confirmed-different-pendings';
 }
 return Object.freeze({verified:true,owner,verdict,first:{
   backupId:ha.backupId,createdAt:ha.createdAt,revision:pa.confirmed.revision,
   operations:pa.operations.length},
  second:{backupId:hb.backupId,createdAt:hb.createdAt,
   revision:pb.confirmed.revision,operations:pb.operations.length},
  // The header date is authenticated by AES-GCM, but authored by its exporter:
  // do not rely on timestamps to override revision or fork checks.
  timestampsInformational:true});
}
root.MiBowlingI11Backup=Object.freeze({
 FORMAT,VERSION,MAX_BYTES,verifySnapshot,seal,open,exportBackup,inspectBackup,restoreBackup,previewAgainstJournal,compareBackups
});
})(window);
