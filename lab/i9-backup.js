/* MI BOWLING · I9 LAB · portable encrypted backups, NO production data.
 * Separate export passphrase and inner vault unlock; both only in transient RAM.
 * The signed snapshot is AES-GCM sealed, with authenticated header and SHA-256.
 * No storage APIs, external services, network calls or automatic restoration.
 */
(function(root){
'use strict';
const subtle=root.crypto?.subtle,ENC=new TextEncoder(),DEC=new TextDecoder();
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMAT='MI-BOWLING-I9-LAB-ENCRYPTED-BACKUP',MAX_BYTES=18*1024*1024,MAX_OPS=512;
const copy=x=>JSON.parse(JSON.stringify(x));
const hex=buf=>[...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async v=>hex(await subtle.digest('SHA-256',ENC.encode(v)));
const base64=bytes=>{
 let s='';for(const c of bytes)s+=String.fromCharCode(c);
 return btoa(s);
};
const from64=s=>{
 if(typeof s!=='string'||s.length>MAX_BYTES*2)throw Error('I9: base64 de respaldo inválida');
 try{return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
 catch(_){throw Error('I9: respaldo cifrado mal codificado')}
};
function requirePassword(passphrase){
 if(typeof passphrase!=='string'||passphrase.length<12||passphrase.length>256)
  throw Error('I9: frase de respaldo ficticia de 12 a 256 caracteres requerida');
}
function checkPersonal(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||p.version!==2||
    !Array.isArray(p.sessions)||!Array.isArray(p.balls)||!Array.isArray(p.patterns)||
    ['leagueNational','leagueRosters','rosters','matches'].some(k=>
      Object.prototype.hasOwnProperty.call(p,k)))
  throw Error('I9: respaldo contiene documento personal inválido o datos de Liga');
 if(JSON.stringify(p).length>9*1024*1024)throw Error('I9: documento de puntuaciones demasiado grande');
 return p;
}
async function verifySnapshot(snapshot,expectedOwner){
 if(!UUID.test(expectedOwner||'')||snapshot?.version!==1||snapshot.owner!==expectedOwner||
    !snapshot.confirmed||snapshot.confirmed.owner!==expectedOwner||
    !Array.isArray(snapshot.operations)||snapshot.operations.length>MAX_OPS)
  throw Error('I9: formato/identidad del respaldo no corresponde al jugador ficticio');
 const c=snapshot.confirmed;
 if(!(c.revision===null||(Number.isSafeInteger(c.revision)&&c.revision>=0)))
  throw Error('I9: revisión de confirmado inválida');
 checkPersonal(c.payload);
 const ids=new Set();
 for(const e of snapshot.operations){
  if(!e||e.version!==2||e.owner!==expectedOwner||!UUID.test(e.tabId||'')||
    !UUID.test(e.opId||'')||!Number.isFinite(e.createdAt)||
    !(e.baseRevision===null||(Number.isSafeInteger(e.baseRevision)&&e.baseRevision>=0))||
    !/^[a-f0-9]{64}$/.test(e.baseHash||'')||
    !/^[a-f0-9]{64}$/.test(e.payloadHash||'')||
    !/^[a-f0-9]{64}$/.test(e.checksum||''))
   throw Error('I9: operación de journal inválida');
  if(ids.has(e.opId))throw Error('I9: operación duplicada en el respaldo');
  ids.add(e.opId);
  checkPersonal(e.basePayload);checkPersonal(e.payload);
  if(await sha(JSON.stringify(e.basePayload))!==e.baseHash||
     await sha(JSON.stringify(e.payload))!==e.payloadHash)
    throw Error('I9: hash SHA-256 de la operación no coincide');
  const unsigned={version:2,owner:e.owner,tabId:e.tabId,opId:e.opId,
    createdAt:e.createdAt,baseRevision:e.baseRevision,
    basePayload:e.basePayload,baseHash:e.baseHash,payload:e.payload,payloadHash:e.payloadHash};
  if(await sha(JSON.stringify(unsigned))!==e.checksum)
   throw Error('I9: firma SHA-256 del WAL inválida');
 }
 if(JSON.stringify(snapshot).length>MAX_BYTES)
  throw Error('I9: respaldo excede el tamaño permitido');
 return true;
}
async function key(password,salt){
 const base=await subtle.importKey('raw',ENC.encode(password),{name:'PBKDF2'},false,['deriveKey']);
 return subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},
  base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function aad(h){
 return ENC.encode([FORMAT,1,h.owner,h.backupId,h.revision,
   h.operations,h.createdAt,h.sha256].join('|'));
}
async function seal(snapshot,passphrase){
 requirePassword(passphrase);
 if(!subtle)throw Error('I9: WebCrypto requerido');
 await verifySnapshot(snapshot,snapshot?.owner);
 const raw=JSON.stringify(snapshot),bytes=ENC.encode(raw),salt=root.crypto.getRandomValues(new Uint8Array(16)),
  iv=root.crypto.getRandomValues(new Uint8Array(12));
 if(bytes.length>MAX_BYTES)throw Error('I9: límite de exportación superado');
 const head={format:FORMAT,version:1,owner:snapshot.owner,
  backupId:root.crypto.randomUUID(),revision:snapshot.confirmed.revision,
  operations:snapshot.operations.length,createdAt:Date.now(),sha256:await sha(raw),
  kdf:'PBKDF2-SHA256-310000',algorithm:'AES-256-GCM',salt:base64(salt),iv:base64(iv)};
 const encryptionKey=await key(passphrase,salt);
 const ciphertext=new Uint8Array(await subtle.encrypt({name:'AES-GCM',
  iv,additionalData:aad(head),tagLength:128},encryptionKey,bytes));
 const file=JSON.stringify({...head,ciphertext:base64(ciphertext)});
 if(file.length>MAX_BYTES*2)throw Error('I9: respaldo cifrado excede tamaño');
 return file;
}
async function open(text,passphrase,owner){
 requirePassword(passphrase);
 if(typeof text!=='string'||text.length>MAX_BYTES*2)throw Error('I9: archivo de respaldo demasiado grande');
 let h;
 try{h=JSON.parse(text)}catch(_){throw Error('I9: JSON de respaldo ilegible')}
 if(!UUID.test(owner||'')||h?.format!==FORMAT||h.version!==1||h.owner!==owner||
    !UUID.test(h.backupId||'')||h.kdf!=='PBKDF2-SHA256-310000'||
    h.algorithm!=='AES-256-GCM'||!Number.isSafeInteger(h.createdAt)||
    h.createdAt<=0||h.operations>MAX_OPS||!Number.isSafeInteger(h.operations)||
    !(h.revision===null||(Number.isSafeInteger(h.revision)&&h.revision>=0))||
    !/^[a-f0-9]{64}$/.test(h.sha256||''))
  throw Error('I9: cabecera de respaldo inválida o de otro jugador');
 const salt=from64(h.salt),iv=from64(h.iv),cipher=from64(h.ciphertext);
 if(salt.length!==16||iv.length!==12||cipher.length<24||cipher.length>MAX_BYTES+16)
  throw Error('I9: longitudes criptográficas de respaldo inválidas');
 let payload;
 try{
  const k=await key(passphrase,salt);
  const plain=await subtle.decrypt({name:'AES-GCM',iv,
   additionalData:aad(h),tagLength:128},k,cipher);
  const raw=DEC.decode(plain);
  if(await sha(raw)!==h.sha256)throw Error('checksum mismatch');
  payload=JSON.parse(raw);
 }catch(_){
  throw Error('I9: contraseña de respaldo incorrecta o bytes alterados; NO se restaura nada');
 }
 await verifySnapshot(payload,owner);
 if(payload.operations.length!==h.operations||payload.confirmed.revision!==h.revision)
  throw Error('I9: cabecera y contenido del respaldo no coinciden');
 return copy(payload);
}
async function exportBackup(journal,owner,password){
 if(!journal||typeof journal.snapshot!=='function')throw Error('I9: journal desbloqueado requerido');
 const snap=await journal.snapshot(owner);
 return seal(snap,password);
}
async function inspectBackup(text,password,owner){
 const payload=await open(text,password,owner);
 return {verified:true,owner,confirmedRevision:payload.confirmed.revision,
   operationCount:payload.operations.length,
   operationIds:payload.operations.map(e=>e.opId)};
}
async function restoreBackup(journal,owner,text,password,confirmation){
 if(confirmation!=='CONFIRMAR-RESTAURACION-FICTICIA')
  throw Error('I9: restauración exige confirmación explícita');
 if(!journal||typeof journal.restoreSnapshot!=='function')
  throw Error('I9: almacén cifrado desbloqueado requerido');
 const payload=await open(text,password,owner);
 return journal.restoreSnapshot(owner,payload);
}
root.MiBowlingI9Backup=Object.freeze({
 FORMAT,MAX_BYTES,verifySnapshot,seal,open,exportBackup,inspectBackup,restoreBackup
});
})(window);
