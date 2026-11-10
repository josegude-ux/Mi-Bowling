/* MI BOWLING · LAB I6 · Encrypted, owner-scoped write-ahead journal.
 * Must run BEFORE the I6 guard hides native indexedDB from all other modules.
 * The native IDB handle NEVER escapes this closure. Only encrypted records are
 * durable. User passphrase is NOT embedded, cached in storage or returned.
 * Lab-only; no real accounts, remote services, production data or PDF blobs.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nativeIDB=root.indexedDB,crypto=root.crypto,encoder=new TextEncoder(),decoder=new TextDecoder();
const DB='mi-bowling-i6-lab-encrypted-data-v1',STORE='encrypted-wal',CONFIRMED='encrypted-confirmed';
const allowed=/\/lab\/integracion-main-auth-i6\.html$/;
const b64=bytes=>{
 let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);
 return btoa(s);
};
function unb64(str){
 if(typeof str!=='string'||str.length>12000000)throw Error('I6: codificación cifrada inválida');
 const decoded=atob(str);
 return Uint8Array.from(decoded,c=>c.charCodeAt(0));
}
const clone=x=>JSON.parse(JSON.stringify(x));
function assertPath(){
 if(!allowed.test(root.location.pathname)||root.location.search||root.location.hash)
  throw Error('I6: solo ruta LAB aislada sin parámetros ni tokens');
 if(!root.isSecureContext||!crypto?.subtle||!nativeIDB)
  throw Error('I6: WebCrypto e IndexedDB requeridos en contexto seguro');
}
function openDB(){
 assertPath();
 return new Promise((resolve,reject)=>{
  const q=nativeIDB.open(DB,1);
  q.onupgradeneeded=()=>{
   const d=q.result;
   if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'});
   if(!d.objectStoreNames.contains(CONFIRMED))d.createObjectStore(CONFIRMED,{keyPath:'id'});
  };
  q.onerror=()=>reject(Error('I6: no se pudo abrir journal cifrado'));
  q.onblocked=()=>reject(Error('I6: almacenamiento bloqueado por otra pestaña'));
  q.onsuccess=()=>resolve(q.result);
 });
}
async function transact(mode,fn,storeName=STORE){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  let done=false,value;
  const tx=db.transaction(storeName,mode),store=tx.objectStore(storeName);
  tx.oncomplete=()=>{done=true;resolve(value)};
  tx.onabort=()=>reject(Error('I6: transacción de journal abortada'));
  tx.onerror=()=>{}; // onabort handles errors without leaking content
  try{fn(store,v=>{value=v},tx)}catch(e){tx.abort();reject(e)}
 })}finally{db.close()}
}
function rawRow(owner,storeName=STORE){return transact('readonly',(store,set)=>{
 const q=store.get(owner);q.onsuccess=()=>set(q.result??null);
},storeName)}
async function derive(base,salt){
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},
  base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function aad(owner,digest,kind,revision){return encoder.encode('MI-BOWLING-I6|v1|'+kind+'|'+owner+'|'+digest+'|'+revision)}
async function hash(value){
 const d=await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(value)));
 return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function unlock({owner,passphrase}={}){
 assertPath();
 if(!UUID.test(owner||'')||typeof passphrase!=='string'||passphrase.length<12||passphrase.length>256)
  throw Error('I6: UUID o contraseña de desbloqueo inválida');
 // A non-extractable PBKDF2 base key remains only in this unlocked page lifetime.
 let base=await crypto.subtle.importKey('raw',encoder.encode(passphrase),
  {name:'PBKDF2'},false,['deriveKey']);
 let closed=false;
 function check(id){
  if(closed||!base)throw Error('I6: journal bloqueado al cerrar sesión');
  if(id!==owner)throw Error('I6: identidad cruzada denegada');
  assertPath();
 }
 async function encrypt(entry,kind='WAL'){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await derive(base,salt);
  const digest=kind==='WAL'?entry.checksum:await hash(entry);
  const cipher=new Uint8Array(await crypto.subtle.encrypt({
   name:'AES-GCM',iv,additionalData:aad(owner,digest,kind,kind==='WAL'?null:entry.revision),tagLength:128
  },key,encoder.encode(JSON.stringify(entry))));
  return {id:owner,v:1,salt:b64(salt),iv:b64(iv),cipher:b64(cipher),digest,kind,revision:kind==='WAL'?null:entry.revision};
 }
 async function decrypt(row,kind='WAL'){
  if(row?.kind!==kind)throw Error('I6: tipo de contenido cifrado incorrecto');
  if(!row)return null;
  if(row.id!==owner||row.v!==1||typeof row.digest!=='string'||
      !/^[a-f0-9]{64}$/.test(row.digest))throw Error('I6: propietario o formato cifrado incorrecto');
  try{
   const salt=unb64(row.salt),iv=unb64(row.iv),cipher=unb64(row.cipher);
   if(salt.length!==16||iv.length!==12||cipher.length<24)
    throw Error('I6: cabecera cifrada inválida');
   const key=await derive(base,salt);
   const bytes=await crypto.subtle.decrypt({
    name:'AES-GCM',iv,additionalData:aad(owner,row.digest,kind,row.revision),tagLength:128
   },key,cipher);
   const entry=JSON.parse(decoder.decode(bytes));
   if(entry?.owner!==owner||(kind==='WAL'?entry.checksum!==row.digest:
       (entry.revision!==row.revision||await hash(entry)!==row.digest)))
    throw Error('I6: integridad del contenido no coincide');
   return entry;
  }catch(_){throw Error('I6: contraseña incorrecta o diario alterado (sin modificar datos)')}
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
   throw Error('I6: journal personal inválido');
  const row=await encrypt(entry);check(id);
  return transact('readwrite',(store,set)=>{
   const req=store.get(owner);
   req.onsuccess=()=>{
    if(req.result&&req.result.digest!==row.digest){set(false);return}
    store.put(row);set(true);
   };
  }).then(ok=>{
   if(!ok)throw Error('I6: journal ocupado por otro pendiente; se requiere reconciliación');
  });
 }
 async function replace(id,expectedChecksum,entry){
  check(id);
  if(entry?.owner!==owner||!expectedChecksum||!entry.checksum)
   throw Error('I6: reemplazo de journal inválido');
  const row=await encrypt(entry);check(id);
  return transact('readwrite',(store,set)=>{
   const req=store.get(owner);
   req.onsuccess=()=>{
    if(req.result?.digest!==expectedChecksum){set(false);return}
    store.put(row);set(true);
   };
  }).then(ok=>{
   if(!ok)throw Error('I6: pendiente cambió durante la fusión; no sobrescribir');
  });
 }
 async function clear(id,checksum){
  check(id);
  if(typeof checksum!=='string')throw Error('I6: checksum de limpieza ausente');
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
 async function readConfirmed(id){
  check(id);
  const row=await rawRow(owner,CONFIRMED);
  if(!row)return null;
  const entry=await decrypt(row,'CONFIRMED');check(id);
  if(!Number.isSafeInteger(entry.revision)&&entry.revision!==null)
   throw Error('I6: revisión confirmada inválida');
  if(!entry.payload||!Array.isArray(entry.payload.sessions)||
      !Array.isArray(entry.payload.balls)||!Array.isArray(entry.payload.patterns))
   throw Error('I6: confirmación inválida');
  return clone(entry);
 }
 async function seedConfirmed(id,payload,revision){
  check(id);
  if(revision!==null&&(!Number.isSafeInteger(revision)||revision<0))
   throw Error('I6: semilla inválida');
  const entry={owner,revision,payload:clone(payload)};
  const row=await encrypt(entry,'CONFIRMED');check(id);
  await transact('readwrite',(store,set)=>{
   const q=store.get(owner);
   q.onsuccess=()=>{
    if(q.result){set(false);return}
    store.put(row);set(true);
   };
  },CONFIRMED);
  return readConfirmed(id);
 }
 async function writeConfirmed(id,payload,previous){
  check(id);
  if(previous!==null&&(!Number.isSafeInteger(previous)||previous<0))
   throw Error('I6: revisión CAS inválida');
  const prev=await readConfirmed(id);
  if(!prev||prev.revision!==previous)throw Error('I6: CONFLICTO revisión antigua');
  const entry={owner,revision:previous===null?0:previous+1,payload:clone(payload)};
  const observedDigest=await hash(prev);
  const row=await encrypt(entry,'CONFIRMED');check(id);
  const ok=await transact('readwrite',(store,set)=>{
   const q=store.get(owner);
   q.onsuccess=()=>{
    if(!q.result||q.result.revision!==previous){set(false);return}
    // Compare the actual ciphertext fingerprint observed before encryption;
    // prevents same-revision replacement by another tab.
    if(q.result.digest!==observedDigest){set(false);return}
    store.put(row);set(true);
   };
  },CONFIRMED);
  if(!ok)throw Error('I6: CONFLICTO CAS simultáneo; pendiente conservado');
  return entry.revision;
 }
 function close(){closed=true;base=null;}
 return Object.freeze({read,put,replace,clear,hasPending,readConfirmed,seedConfirmed,writeConfirmed,close});
}
root.MiBowlingI6EncryptedJournal=Object.freeze({unlock});
})(window);
