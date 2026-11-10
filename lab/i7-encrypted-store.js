/* MI BOWLING · LAB I7 · Encrypted, owner-scoped write-ahead journal.
 * Must run BEFORE the I7 guard hides native indexedDB from all other modules.
 * The native IDB handle NEVER escapes this closure. Only encrypted records are
 * durable. User passphrase is NOT embedded, cached in storage or returned.
 * Lab-only; no real accounts, remote services, production data or PDF blobs.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nativeIDB=root.indexedDB,crypto=root.crypto,encoder=new TextEncoder(),decoder=new TextDecoder();
const DB='mi-bowling-i7-lab-encrypted-data-v1',STORE='encrypted-operations',CONFIRMED='encrypted-confirmed';
const allowed=/\/lab\/integracion-main-auth-i7\.html$/;
const b64=bytes=>{
 let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);
 return btoa(s);
};
function unb64(str){
 if(typeof str!=='string'||str.length>12000000)throw Error('I7: codificación cifrada inválida');
 const decoded=atob(str);
 return Uint8Array.from(decoded,c=>c.charCodeAt(0));
}
const clone=x=>JSON.parse(JSON.stringify(x));
function assertPath(){
 if(!allowed.test(root.location.pathname)||root.location.search||root.location.hash)
  throw Error('I7: solo ruta LAB aislada sin parámetros ni tokens');
 if(!root.isSecureContext||!crypto?.subtle||!nativeIDB)
  throw Error('I7: WebCrypto e IndexedDB requeridos en contexto seguro');
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
  q.onerror=()=>reject(Error('I7: no se pudo abrir journal cifrado'));
  q.onblocked=()=>reject(Error('I7: almacenamiento bloqueado por otra pestaña'));
  q.onsuccess=()=>resolve(q.result);
 });
}
async function transact(mode,fn,storeName=STORE){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  let done=false,value;
  const tx=db.transaction(storeName,mode),store=tx.objectStore(storeName);
  tx.oncomplete=()=>{done=true;resolve(value)};
  tx.onabort=()=>reject(Error('I7: transacción de journal abortada'));
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
function aad(owner,digest,kind,revision){return encoder.encode('MI-BOWLING-I7|v1|'+kind+'|'+owner+'|'+digest+'|'+revision)}
async function hash(value){
 const d=await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(value)));
 return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function unlock({owner,passphrase}={}){
 assertPath();
 if(!UUID.test(owner||'')||typeof passphrase!=='string'||passphrase.length<12||passphrase.length>256)
  throw Error('I7: UUID o contraseña de desbloqueo inválida');
 // A non-extractable PBKDF2 base key remains only in this unlocked page lifetime.
 let base=await crypto.subtle.importKey('raw',encoder.encode(passphrase),
  {name:'PBKDF2'},false,['deriveKey']);
 let closed=false;
 function check(id){
  if(closed||!base)throw Error('I7: journal bloqueado al cerrar sesión');
  if(id!==owner)throw Error('I7: identidad cruzada denegada');
  assertPath();
 }
 // Every browser tab owns a random UUID and each save owns a unique operation
 // UUID. The DB primary key is owner:tab:operation, never a shared owner-only WAL.
 function opKey(entry){
  if(entry?.owner!==owner||!UUID.test(entry?.tabId||'')||
      !UUID.test(entry?.opId||''))
   throw Error('I7: operación/propietario no válidos');
  return owner+':'+entry.tabId+':'+entry.opId;
 }
 async function encrypt(entry,kind='WAL'){
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await derive(base,salt);
  const digest=kind==='WAL'?entry.checksum:await hash(entry);
  const cipher=new Uint8Array(await crypto.subtle.encrypt({
   name:'AES-GCM',iv,additionalData:aad(owner,digest,kind,kind==='WAL'?null:entry.revision),tagLength:128
  },key,encoder.encode(JSON.stringify(entry))));
  const id=kind==='WAL'?opKey(entry):owner;
  return {id,owner,v:1,salt:b64(salt),iv:b64(iv),cipher:b64(cipher),digest,
   kind,revision:kind==='WAL'?null:entry.revision};
 }
 async function decrypt(row,kind='WAL'){
  if(!row||row.owner!==owner||row.kind!==kind||row.v!==1||
    !/^[0-9a-f]{64}$/.test(row.digest||''))throw Error('I7: registro cifrado de otra identidad o malformado');
  try{
   const salt=unb64(row.salt),iv=unb64(row.iv),cipher=unb64(row.cipher);
   if(salt.length!==16||iv.length!==12||cipher.length<24)throw Error('I7: sobre inválido');
   const key=await derive(base,salt);
   const plain=await crypto.subtle.decrypt({
    name:'AES-GCM',iv,additionalData:aad(owner,row.digest,kind,row.revision),tagLength:128
   },key,cipher);
   const entry=JSON.parse(decoder.decode(plain));
   if(entry?.owner!==owner||(kind==='WAL'?
     entry.checksum!==row.digest||opKey(entry)!==row.id:
     entry.revision!==row.revision||await hash(entry)!==row.digest||row.id!==owner))
    throw Error('I7: integridad del documento errónea');
   return entry;
  }catch(_){throw Error('I7: clave incorrecta, operación alterada o identidad ajena; se conserva todo')}
 }
 let failAppendOnce=false;
 async function list(id){
  check(id);
  const rows=await transact('readonly',(store,set)=>{
   const q=store.getAll();
   q.onsuccess=()=>set(q.result);
  });
  check(id);
  const mine=rows.filter(row=>typeof row.id==='string'&&row.id.startsWith(owner+':'));
  const entries=[];
  // Any corrupt owned operation fails CLOSED; do not silently ignore it.
  for(const row of mine)entries.push(clone(await decrypt(row)));
  check(id);
  return entries.sort((x,y)=>x.createdAt-y.createdAt||
    x.tabId.localeCompare(y.tabId)||x.opId.localeCompare(y.opId));
 }
 async function readOp(id,tabId,opId){
  check(id);
  if(!UUID.test(tabId||'')||!UUID.test(opId||''))throw Error('I7: ID de operación inválido');
  const row=await rawRow(owner+':'+tabId+':'+opId);
  if(!row)return null;
  return clone(await decrypt(row));
 }
 async function append(id,entry){
  check(id);
  if(entry?.version!==2||typeof entry.checksum!=='string'||
     !/^[a-f0-9]{64}$/.test(entry.checksum))throw Error('I7: WAL no firmado');
  const row=await encrypt(entry);check(id);
  const ack=await transact('readwrite',(store,set,tx)=>{
   const req=store.get(row.id);
   req.onsuccess=()=>{
    if(req.result){set(false);return;}
    if(failAppendOnce){failAppendOnce=false;tx.abort();return;}
    store.add(row);set(true);
   };
  });
  check(id);
  if(!ack)throw Error('I7: ID de operación ya registrado; no sobrescrito');
  // The Promise resolves exclusively in IDB transaction.oncomplete.
  return Object.freeze({durable:true,tabId:entry.tabId,opId:entry.opId,checksum:entry.checksum});
 }
 async function clearOp(id,tabId,opId,checksum){
  check(id);
  if(!UUID.test(tabId||'')||!UUID.test(opId||'')||
      !/^[a-f0-9]{64}$/.test(checksum||''))throw Error('I7: confirmación exacta requerida');
  const key=owner+':'+tabId+':'+opId;
  return transact('readwrite',(store,set)=>{
   const q=store.get(key);
   q.onsuccess=()=>{
    if(q.result?.digest!==checksum){set(false);return;}
    store.delete(key);set(true);
   };
  });
 }
 function simulateAbortOnce(){check(owner);failAppendOnce=true;}
 async function readConfirmed(id){
  check(id);
  const row=await rawRow(owner,CONFIRMED);
  if(!row)return null;
  const entry=await decrypt(row,'CONFIRMED');check(id);
  if(!Number.isSafeInteger(entry.revision)&&entry.revision!==null)
   throw Error('I7: revisión confirmada inválida');
  if(!entry.payload||!Array.isArray(entry.payload.sessions)||
      !Array.isArray(entry.payload.balls)||!Array.isArray(entry.payload.patterns))
   throw Error('I7: confirmación inválida');
  return clone(entry);
 }
 async function seedConfirmed(id,payload,revision){
  check(id);
  if(revision!==null&&(!Number.isSafeInteger(revision)||revision<0))
   throw Error('I7: semilla inválida');
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
   throw Error('I7: revisión CAS inválida');
  const prev=await readConfirmed(id);
  if(!prev||prev.revision!==previous)throw Error('I7: CONFLICTO revisión antigua');
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
  if(!ok)throw Error('I7: CONFLICTO CAS simultáneo; pendiente conservado');
  return entry.revision;
 }
 function close(){closed=true;base=null;}
 return Object.freeze({list,readOp,append,clearOp,simulateAbortOnce,readConfirmed,seedConfirmed,writeConfirmed,close});
}
root.MiBowlingI7EncryptedJournal=Object.freeze({unlock});
})(window);
