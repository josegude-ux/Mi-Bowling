/* MI BOWLING · LAB I10 · Encrypted, owner-scoped write-ahead journal.
 * Must run BEFORE the I10 guard hides native indexedDB from all other modules.
 * The native IDB handle NEVER escapes this closure. Only encrypted records are
 * durable. User passphrase is NOT embedded, cached in storage or returned.
 * Lab-only; no real accounts, remote services, production data or PDF blobs.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nativeIDB=root.indexedDB,crypto=root.crypto,encoder=new TextEncoder(),decoder=new TextDecoder();
const DB='mi-bowling-i10-lab-encrypted-data-v4',STORE='encrypted-operations',CONFIRMED='encrypted-confirmed',AUDIT='encrypted-restore-audit';
const allowed=/\/lab\/integracion-main-auth-i10\.html$/;
const b64=bytes=>{
 let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);
 return btoa(s);
};
function unb64(str){
 if(typeof str!=='string'||str.length>12000000)throw Error('I10: codificación cifrada inválida');
 const decoded=atob(str);
 return Uint8Array.from(decoded,c=>c.charCodeAt(0));
}
const clone=x=>JSON.parse(JSON.stringify(x));
function assertPath(){
 if(!allowed.test(root.location.pathname)||root.location.search||root.location.hash)
  throw Error('I10: solo ruta LAB aislada sin parámetros ni tokens');
 if(!root.isSecureContext||!crypto?.subtle||!nativeIDB)
  throw Error('I10: WebCrypto e IndexedDB requeridos en contexto seguro');
}
function openDB(){
 assertPath();
 return new Promise((resolve,reject)=>{
  const q=nativeIDB.open(DB,4);
  let blocked=false;
  q.onupgradeneeded=()=>{
   const d=q.result;
   if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'});
   if(!d.objectStoreNames.contains(CONFIRMED))d.createObjectStore(CONFIRMED,{keyPath:'id'});
   if(!d.objectStoreNames.contains(AUDIT))d.createObjectStore(AUDIT,{keyPath:'id'});
  };
  q.onerror=()=>{if(!blocked)reject(Error('I10: apertura IndexedDB fallida: '+(q.error?.name||'UnknownError')));};
  q.onblocked=()=>{
   blocked=true;
   reject(Error('I10: IndexedDB bloqueado por otra pestaña; cerrar la conexión antigua antes de reintentar'));
  };
  q.onsuccess=()=>{
   // A previously rejected version upgrade can later succeed when the other
   // tab releases its handle. Close that late connection, never reuse it.
   if(blocked){q.result.close();return;}
   resolve(q.result);
  };
 });
}
async function transact(mode,fn,storeName=STORE){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  let done=false,value;
  const tx=db.transaction(storeName,mode),store=tx.objectStore(storeName);
  tx.oncomplete=()=>{done=true;resolve(value)};
  tx.onabort=()=>reject(Error('I10: transacción abortada: '+(tx.__i10Reason||tx.error?.name||'AbortError')));
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
function aad(owner,digest,kind,revision){return encoder.encode('MI-BOWLING-I10|v1|'+kind+'|'+owner+'|'+digest+'|'+revision)}
async function hash(value){
 const d=await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(value)));
 return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function unlock({owner,passphrase}={}){
 assertPath();
 if(!UUID.test(owner||'')||typeof passphrase!=='string'||passphrase.length<12||passphrase.length>256)
  throw Error('I10: UUID o contraseña de desbloqueo inválida');
 // A non-extractable PBKDF2 base key remains only in this unlocked page lifetime.
 let base=await crypto.subtle.importKey('raw',encoder.encode(passphrase),
  {name:'PBKDF2'},false,['deriveKey']);
 let closed=false;
 function check(id){
  if(closed||!base)throw Error('I10: journal bloqueado al cerrar sesión');
  if(id!==owner)throw Error('I10: identidad cruzada denegada');
  assertPath();
 }
 // Every browser tab owns a random UUID and each save owns a unique operation
 // UUID. The DB primary key is owner:tab:operation, never a shared owner-only WAL.
 function opKey(entry){
  if(entry?.owner!==owner||!UUID.test(entry?.tabId||'')||
      !UUID.test(entry?.opId||''))
   throw Error('I10: operación/propietario no válidos');
  return owner+':'+entry.tabId+':'+entry.opId;
 }
 async function encrypt(entry,kind='WAL'){
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await derive(base,salt);
  const digest=kind==='WAL'?entry.checksum:await hash(entry);
  const cipher=new Uint8Array(await crypto.subtle.encrypt({
   name:'AES-GCM',iv,additionalData:aad(owner,digest,kind,kind==='WAL'?null:entry.revision),tagLength:128
  },key,encoder.encode(JSON.stringify(entry))));
  const id=kind==='WAL'?opKey(entry):kind==='AUDIT'?owner+':audit:'+entry.auditId:owner;
  return {id,owner,v:1,salt:b64(salt),iv:b64(iv),cipher:b64(cipher),digest,
   kind,revision:kind==='WAL'?null:entry.revision};
 }
 async function decrypt(row,kind='WAL'){
  if(!row||row.owner!==owner||row.kind!==kind||row.v!==1||
    !/^[0-9a-f]{64}$/.test(row.digest||''))throw Error('I10: registro cifrado de otra identidad o malformado');
  try{
   const salt=unb64(row.salt),iv=unb64(row.iv),cipher=unb64(row.cipher);
   if(salt.length!==16||iv.length!==12||cipher.length<24)throw Error('I10: sobre inválido');
   const key=await derive(base,salt);
   const plain=await crypto.subtle.decrypt({
    name:'AES-GCM',iv,additionalData:aad(owner,row.digest,kind,row.revision),tagLength:128
   },key,cipher);
   const entry=JSON.parse(decoder.decode(plain));
   if(entry?.owner!==owner||(kind==='WAL'?
     entry.checksum!==row.digest||opKey(entry)!==row.id:
     entry.revision!==row.revision||await hash(entry)!==row.digest||
     (kind==='AUDIT'?
      !UUID.test(entry.auditId||'')||row.id!==owner+':audit:'+entry.auditId:
      row.id!==owner)))
    throw Error('I10: integridad del documento errónea');
   return entry;
  }catch(_){throw Error('I10: clave incorrecta, operación alterada o identidad ajena; se conserva todo')}
 }
 let failAppendOnce=false,failQuotaOnce=false,failRestoreOnce=null,failRestoreAckOnce=false;
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
  if(!UUID.test(tabId||'')||!UUID.test(opId||''))throw Error('I10: ID de operación inválido');
  const row=await rawRow(owner+':'+tabId+':'+opId);
  if(!row)return null;
  return clone(await decrypt(row));
 }
 async function append(id,entry){
  check(id);
  if(entry?.version!==2||typeof entry.checksum!=='string'||
     !/^[a-f0-9]{64}$/.test(entry.checksum))throw Error('I10: WAL no firmado');
  const row=await encrypt(entry);check(id);
  const ack=await transact('readwrite',(store,set,tx)=>{
   const req=store.get(row.id);
   req.onsuccess=()=>{
    if(req.result){set(false);return;}
    if(failAppendOnce){failAppendOnce=false;tx.__i10Reason='AbortError (LAB)';tx.abort();return;}
    if(failQuotaOnce){
     failQuotaOnce=false;tx.__i10Reason='QuotaExceededError (LAB)';
     tx.abort();return;
    }
    store.add(row);set(true);
   };
  });
  check(id);
  if(!ack)throw Error('I10: ID de operación ya registrado; no sobrescrito');
  // The Promise resolves exclusively in IDB transaction.oncomplete.
  return Object.freeze({durable:true,tabId:entry.tabId,opId:entry.opId,checksum:entry.checksum});
 }
 async function clearOp(id,tabId,opId,checksum){
  check(id);
  if(!UUID.test(tabId||'')||!UUID.test(opId||'')||
      !/^[a-f0-9]{64}$/.test(checksum||''))throw Error('I10: confirmación exacta requerida');
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
 function simulateQuotaOnce(){check(owner);failQuotaOnce=true;}
 async function audit(id){
  check(id);
  const rows=await transact('readonly',(store,set)=>{
   const q=store.getAll();q.onsuccess=()=>set(q.result);
  });
  check(id);
  const mine=rows.filter(row=>typeof row.id==='string'&&row.id.startsWith(owner+':'));
  let valid=0,unreadable=0;
  for(const row of mine){
   try{await decrypt(row);valid++}
   catch(_){unreadable++}
  }
  check(id);
  // Audit is READ-ONLY and reveals no scores, plaintext or unlocking material.
  // Wrong passphrase and tampering are deliberately not distinguished.
  return Object.freeze({total:mine.length,valid,unreadable,failClosed:unreadable>0});
 }
 async function readConfirmed(id){
  check(id);
  const row=await rawRow(owner,CONFIRMED);
  if(!row)return null;
  const entry=await decrypt(row,'CONFIRMED');check(id);
  if(!Number.isSafeInteger(entry.revision)&&entry.revision!==null)
   throw Error('I10: revisión confirmada inválida');
  if(!entry.payload||!Array.isArray(entry.payload.sessions)||
      !Array.isArray(entry.payload.balls)||!Array.isArray(entry.payload.patterns))
   throw Error('I10: confirmación inválida');
  return clone(entry);
 }
 async function seedConfirmed(id,payload,revision){
  check(id);
  if(revision!==null&&(!Number.isSafeInteger(revision)||revision<0))
   throw Error('I10: semilla inválida');
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
   throw Error('I10: revisión CAS inválida');
  const prev=await readConfirmed(id);
  if(!prev||prev.revision!==previous)throw Error('I10: CONFLICTO revisión antigua');
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
  if(!ok)throw Error('I10: CONFLICTO CAS simultáneo; pendiente conservado');
  return entry.revision;
 }
 // A *consistent snapshot* of confirmed scores and every WAL, taken in
 // ONE readonly transaction so no other tab can interleave its CAS write.
 async function rawSnapshot(){
  check(owner);
  const db=await openDB();
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction([STORE,CONFIRMED],'readonly');
   const requests=[tx.objectStore(STORE).getAll(),tx.objectStore(CONFIRMED).get(owner)];
   let all=null,confirmed=null;
   requests[0].onsuccess=()=>{all=requests[0].result};
   requests[1].onsuccess=()=>{confirmed=requests[1].result??null};
   tx.oncomplete=()=>resolve({rows:(all||[]).filter(x=>
     typeof x.id==='string'&&x.id.startsWith(owner+':')),
     confirmed});
   tx.onabort=()=>reject(Error('I10: instantánea de respaldo abortada'));
  })}finally{db.close()}
 }
 async function snapshot(id){
  check(id);
  const captured=await rawSnapshot(),ops=[];
  if(!captured.confirmed)throw Error('I10: no hay confirmado cifrado que respaldar');
  const confirmed=await decrypt(captured.confirmed,'CONFIRMED');
  const seen=new Set();
  for(const row of captured.rows){
   const entry=await decrypt(row,'WAL');
   if(seen.has(entry.opId))throw Error('I10: ID de operación duplicado en origen');
   seen.add(entry.opId);ops.push(clone(entry));
  }
  check(id);
  ops.sort((a,b)=>a.createdAt-b.createdAt||a.tabId.localeCompare(b.tabId)||a.opId.localeCompare(b.opId));
  return {version:1,owner,confirmed:clone(confirmed),operations:ops};
 }

 async function auditRestores(id){
  check(id);
  const rows=await transact('readonly',(store,set)=>{
   const q=store.getAll();q.onsuccess=()=>set(q.result);
  },AUDIT);
  const result=[];
  for(const row of rows){
   if(typeof row.id!=='string'||!row.id.startsWith(owner+':audit:'))continue;
   const e=await decrypt(row,'AUDIT');
   if(e.version!==1||e.kind!=='restore'||e.owner!==owner||
     !UUID.test(e.auditId||'')||!UUID.test(e.backupId||'')||
     !Number.isSafeInteger(e.occurredAt)||e.occurredAt<=0||
     !/^[a-f0-9]{64}$/.test(e.backupSha||''))
    throw Error('I10: registro de trazabilidad alterado, acceso bloqueado');
   result.push({auditId:e.auditId,backupId:e.backupId,backupSha:e.backupSha,
    occurredAt:e.occurredAt,sourceCreatedAt:e.sourceCreatedAt,
    revision:e.revision,operationsAdded:e.operationsAdded,
    status:e.status});
  }
  check(id);
  return result.sort((a,b)=>a.occurredAt-b.occurredAt||a.auditId.localeCompare(b.auditId));
 }
 function simulateRestoreAbortOnce(phase='after-queue'){
  check(owner);
  if(!['before-queue','after-queue'].includes(phase))
   throw Error('I10: fase de fallo sintético inválida');
  failRestoreOnce=phase;
 }
 function simulateRestoreLostAckOnce(){check(owner);failRestoreAckOnce=true}
 async function inspectSnapshot(id,snapshotData){
  check(id);
  await root.MiBowlingI10Backup.verifySnapshot(snapshotData,owner);
  const captured=await rawSnapshot();
  if(captured.confirmed)await decrypt(captured.confirmed,'CONFIRMED');
  const currentOps=new Map(),ids=new Map();
  for(const row of captured.rows){
   const e=await decrypt(row,'WAL');
   if(ids.has(e.opId))throw Error('I10: ID duplicado en journal existente');
   ids.set(e.opId,row);currentOps.set(row.id,row);
  }
  const incoming=snapshotData.confirmed;
  const digest=await hash(incoming);
  let verdict='empty',canRestore=true,newOps=0,existingOps=0;
  const previous=captured.confirmed;
  if(previous){
   if(previous.revision>incoming.revision){verdict='stale';canRestore=false}
   else if(previous.revision<incoming.revision){verdict='ahead-conflict';canRestore=false}
   else if(previous.digest!==digest){verdict='fork-conflict';canRestore=false}
   else verdict='same-confirmed';
  }
  for(const e of snapshotData.operations){
   const key=opKey(e),existing=currentOps.get(key),seen=ids.get(e.opId);
   if(seen&&seen.id!==key){canRestore=false;verdict='operation-replay'}
   else if(existing&&existing.digest!==e.checksum){canRestore=false;verdict='operation-conflict'}
   else if(existing)existingOps++;
   else newOps++;
  }
  if(canRestore)verdict=!previous?'empty':newOps?'add-wal':'identical';
  check(id);
  return Object.freeze({
   verdict,canRestore,confirmedRevision:previous?previous.revision:null,
   backupRevision:incoming.revision,currentOperations:captured.rows.length,
   backupOperations:snapshotData.operations.length,
   operationsAdded:newOps,operationsExisting:existingOps,
   confirmedWouldBeAdded:!previous,requiresExplicitConfirmation:true
  });
 }

 // The restore plan is validated and every entry encrypted *before* opening
 // an IDB write transaction. No async WebCrypto runs inside the transaction.
 // The confirmed snapshot NEVER overwrites an existing document. A target is
 // allowed iff empty OR its confirmed revision AND digest are identical.
 // Existing WAL are preserved, and repeated entries are idempotent only when
 // their hashes match. A stale/forked backup is rejected before any writes.
 async function restoreSnapshot(id,snapshotData,provenance){
  check(id);
  if(!root.MiBowlingI10Backup?.verifySnapshot)
   throw Error('I10: verificador criptográfico de respaldo ausente');
  await root.MiBowlingI10Backup.verifySnapshot(snapshotData,owner);
  if(!provenance||!UUID.test(provenance.backupId||'')||
    !/^[a-f0-9]{64}$/.test(provenance.backupSha||'')||
    !Number.isSafeInteger(provenance.sourceCreatedAt))
   throw Error('I10: procedencia de archivo cifrado obligatoria');
  check(id);
  const captured=await rawSnapshot();
  if(captured.confirmed){
   // Must verify GCM even when the header appears compatible. A wrong key or
   // corrupted target must NEVER be "repaired" by replacing its ciphertext.
   await decrypt(captured.confirmed,'CONFIRMED');
  }
  const currentRows=new Map(),knownOpIds=new Map();
  for(const row of captured.rows){
   const existingOp=await decrypt(row,'WAL'); // reject corrupt or foreign metadata
   if(knownOpIds.has(existingOp.opId))
    throw Error('I10: diario destino contiene IDs de operación duplicados');
   knownOpIds.set(existingOp.opId,row);
   currentRows.set(row.id,row);
  }
  const confirmedData=snapshotData.confirmed;
  const expectedDigest=await hash(confirmedData);
  const old=captured.confirmed;
  if(old&&(old.revision!==confirmedData.revision||old.digest!==expectedDigest)){
   if(old.revision>confirmedData.revision)
    throw Error('I10: respaldo OBSOLETO: confirmado actual es más reciente');
   throw Error('I10: CONFLICTO de confirmado o revisión; no sobrescribir');
  }
  const newOps=[];
  for(const entry of snapshotData.operations){
   const key=opKey(entry),existing=currentRows.get(key),sameOp=knownOpIds.get(entry.opId);
   if(sameOp&&sameOp.id!==key)
    throw Error('I10: operación duplicada de otra pestaña; conflicto sin escritura');
   if(existing){
    if(existing.digest!==entry.checksum)throw Error('I10: operación con mismo ID y distinto SHA; conflicto');
   }else newOps.push(await encrypt(entry,'WAL'));
  }
  const newConfirmed=old?null:await encrypt(confirmedData,'CONFIRMED');
  const changed=!!newConfirmed||newOps.length>0;
  const auditPayload=changed?{
   owner,kind:'restore',version:1,auditId:crypto.randomUUID(),
   backupId:provenance.backupId,backupSha:provenance.backupSha,
   occurredAt:Date.now(),sourceCreatedAt:provenance.sourceCreatedAt,
   revision:confirmedData.revision,operationsAdded:newOps.length,status:'restored'
  }:null;
  const newAudit=auditPayload?await encrypt(auditPayload,'AUDIT'):null;
  check(id);
  // Snapshot observed above may have changed while validating/re-encrypting.
  // Re-read BOTH stores inside a single readwrite transaction and compare
  // the exact encrypted rows, not merely the optimistic revision metadata.
  const db=await openDB();
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction([STORE,CONFIRMED,AUDIT],'readwrite'),
    opStore=tx.objectStore(STORE),confStore=tx.objectStore(CONFIRMED),
    auditStore=tx.objectStore(AUDIT);
   const abortPhase=failRestoreOnce;failRestoreOnce=null;
   const dropAck=failRestoreAckOnce;failRestoreAckOnce=false;
   const qOps=opStore.getAll(),qConf=confStore.get(owner);
   let actualOps,actualConf,doneOps=false,doneConf=false,prepared=false,summary;
   const plan=()=>{
    if(!doneOps||!doneConf||prepared)return;
    prepared=true;
    const actualMine=actualOps.filter(x=>
      typeof x.id==='string'&&x.id.startsWith(owner+':'));
    const before=captured.rows.slice().sort((a,b)=>a.id.localeCompare(b.id));
    const after=actualMine.slice().sort((a,b)=>a.id.localeCompare(b.id));
    if(JSON.stringify(before)!==JSON.stringify(after)||
       JSON.stringify(captured.confirmed)!==JSON.stringify(actualConf??null)){
     tx.abort();return;
    }
    if(abortPhase==='before-queue'){tx.abort();return}
    if(newConfirmed)confStore.add(newConfirmed);
    for(const item of newOps)opStore.add(item);
    if(newAudit)auditStore.add(newAudit);
    // Abort AFTER write requests have been queued but BEFORE transaction
    // oncomplete, demonstrating rollback of confirmed + all WAL + audit.
    if(abortPhase==='after-queue'){tx.abort();return}
    summary={status:!changed?'already-present':'restored',
     confirmedAdded:!!newConfirmed,operationsAdded:newOps.length,
     operationsExisting:snapshotData.operations.length-newOps.length,
     revision:confirmedData.revision,
     receipt:changed?{auditId:auditPayload.auditId,
      backupId:provenance.backupId,backupSha:provenance.backupSha}:null};
   };
   qOps.onsuccess=()=>{actualOps=qOps.result;doneOps=true;plan()};
   qConf.onsuccess=()=>{actualConf=qConf.result??null;doneConf=true;plan()};
   tx.oncomplete=()=>dropAck?
    reject(Error('I10: acuse de restauración perdido DESPUÉS de commit; verificar auditoría y reintentar idempotente')):
    resolve(Object.freeze(summary));
   tx.onabort=()=>reject(Error('I10: restauración abortada/conflicto concurrente; NO se escribió parcialmente'));
   tx.onerror=()=>{}; // tx abort is authoritative
  })}finally{db.close()}
 }
 function close(){closed=true;base=null;}
 return Object.freeze({list,readOp,append,clearOp,simulateAbortOnce,simulateQuotaOnce,audit,readConfirmed,seedConfirmed,writeConfirmed,snapshot,inspectSnapshot,restoreSnapshot,auditRestores,simulateRestoreAbortOnce,simulateRestoreLostAckOnce,close});
}
root.MiBowlingI10EncryptedJournal=Object.freeze({unlock});
})(window);
