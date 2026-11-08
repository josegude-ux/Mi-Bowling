/* MI BOWLING · LAB I5 · Encrypted, owner-scoped write-ahead journal.
 * Must run BEFORE the I5 guard hides native indexedDB from all other modules.
 * The native IDB handle NEVER escapes this closure. Only encrypted records are
 * durable. User passphrase is NOT embedded, cached in storage or returned.
 * Lab-only; no real accounts, remote services, production data or PDF blobs.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nativeIDB=root.indexedDB,crypto=root.crypto,encoder=new TextEncoder(),decoder=new TextDecoder();
const DB='mi-bowling-i5-lab-encrypted-pending-v1',STORE='encrypted-wal';
const allowed=/\/lab\/integracion-main-auth-i5\.html$/;
const b64=bytes=>{
 let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);
 return btoa(s);
};
function unb64(str){
 if(typeof str!=='string'||str.length>12000000)throw Error('I5: codificación cifrada inválida');
 const decoded=atob(str);
 return Uint8Array.from(decoded,c=>c.charCodeAt(0));
}
const clone=x=>JSON.parse(JSON.stringify(x));
function assertPath(){
 if(!allowed.test(root.location.pathname)||root.location.search||root.location.hash)
  throw Error('I5: solo ruta LAB aislada sin parámetros ni tokens');
 if(!root.isSecureContext||!crypto?.subtle||!nativeIDB)
  throw Error('I5: WebCrypto e IndexedDB requeridos en contexto seguro');
}
function openDB(){
 assertPath();
 return new Promise((resolve,reject)=>{
  const q=nativeIDB.open(DB,1);
  q.onupgradeneeded=()=>{
   const d=q.result;
   if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'});
  };
  q.onerror=()=>reject(Error('I5: no se pudo abrir journal cifrado'));
  q.onblocked=()=>reject(Error('I5: almacenamiento bloqueado por otra pestaña'));
  q.onsuccess=()=>resolve(q.result);
 });
}
async function transact(mode,fn){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  let done=false,value;
  const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
  tx.oncomplete=()=>{done=true;resolve(value)};
  tx.onabort=()=>reject(Error('I5: transacción de journal abortada'));
  tx.onerror=()=>{}; // onabort handles errors without leaking content
  try{fn(store,v=>{value=v},tx)}catch(e){tx.abort();reject(e)}
 })}finally{db.close()}
}
function rawRow(owner){return transact('readonly',(store,set)=>{
 const q=store.get(owner);q.onsuccess=()=>set(q.result??null);
})}
async function derive(base,salt){
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},
  base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function aad(owner,digest){return encoder.encode('MI-BOWLING-I5-WAL|v1|'+owner+'|'+digest)}
async function unlock({owner,passphrase}={}){
 assertPath();
 if(!UUID.test(owner||'')||typeof passphrase!=='string'||passphrase.length<12||passphrase.length>256)
  throw Error('I5: UUID o contraseña de desbloqueo inválida');
 // A non-extractable PBKDF2 base key remains only in this unlocked page lifetime.
 let base=await crypto.subtle.importKey('raw',encoder.encode(passphrase),
  {name:'PBKDF2'},false,['deriveKey']);
 let closed=false;
 function check(id){
  if(closed||!base)throw Error('I5: journal bloqueado al cerrar sesión');
  if(id!==owner)throw Error('I5: identidad cruzada denegada');
  assertPath();
 }
 async function encrypt(entry){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await derive(base,salt);
  const digest=entry.checksum;
  const cipher=new Uint8Array(await crypto.subtle.encrypt({
   name:'AES-GCM',iv,additionalData:aad(owner,digest),tagLength:128
  },key,encoder.encode(JSON.stringify(entry))));
  return {id:owner,v:1,salt:b64(salt),iv:b64(iv),cipher:b64(cipher),digest};
 }
 async function decrypt(row){
  if(!row)return null;
  if(row.id!==owner||row.v!==1||typeof row.digest!=='string'||
      !/^[a-f0-9]{64}$/.test(row.digest))throw Error('I5: propietario o formato cifrado incorrecto');
  try{
   const salt=unb64(row.salt),iv=unb64(row.iv),cipher=unb64(row.cipher);
   if(salt.length!==16||iv.length!==12||cipher.length<24)
    throw Error('I5: cabecera cifrada inválida');
   const key=await derive(base,salt);
   const bytes=await crypto.subtle.decrypt({
    name:'AES-GCM',iv,additionalData:aad(owner,row.digest),tagLength:128
   },key,cipher);
   const entry=JSON.parse(decoder.decode(bytes));
   if(entry?.owner!==owner||entry?.checksum!==row.digest)
    throw Error('I5: integridad del contenido no coincide');
   return entry;
  }catch(_){throw Error('I5: contraseña incorrecta o diario alterado (sin modificar datos)')}
 }
 async function read(id){
  check(id);const row=await rawRow(owner);
  if(!row)return null;
  const entry=await decrypt(row);check(id);
  return clone(entry);
 }
 async function put(id,entry){
  check(id);
  if(entry?.owner!==owner||typeof entry.checksum!=='string'||!/^[0-9a-f]{64}$/.test(entry.checksum))
   throw Error('I5: journal personal inválido');
  const row=await encrypt(entry);check(id);
  return transact('readwrite',(store,set)=>{
   const req=store.get(owner);
   req.onsuccess=()=>{
    if(req.result&&req.result.digest!==row.digest){set(false);return}
    store.put(row);set(true);
   };
  }).then(ok=>{
   if(!ok)throw Error('I5: journal ocupado por otro pendiente; se requiere reconciliación');
  });
 }
 async function replace(id,expectedChecksum,entry){
  check(id);
  if(entry?.owner!==owner||!expectedChecksum||!entry.checksum)
   throw Error('I5: reemplazo de journal inválido');
  const row=await encrypt(entry);check(id);
  return transact('readwrite',(store,set)=>{
   const req=store.get(owner);
   req.onsuccess=()=>{
    if(req.result?.digest!==expectedChecksum){set(false);return}
    store.put(row);set(true);
   };
  }).then(ok=>{
   if(!ok)throw Error('I5: pendiente cambió durante la fusión; no sobrescribir');
  });
 }
 async function clear(id,checksum){
  check(id);
  if(typeof checksum!=='string')throw Error('I5: checksum de limpieza ausente');
  return transact('readwrite',(store,set)=>{
   const req=store.get(owner);
   req.onsuccess=()=>{
    if(req.result?.digest!==checksum){set(false);return}
    store.delete(owner);set(true);
   };
  });
 }
 async function hasPending(id){
  check(id);return !!(await rawRow(owner));
 }
 function close(){closed=true;base=null;}
 return Object.freeze({read,put,replace,clear,hasPending,close});
}
root.MiBowlingI5EncryptedJournal=Object.freeze({unlock});
})(window);
