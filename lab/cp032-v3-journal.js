/* MI BOWLING · CP032 · journal IndexedDB SÓLO ficticios; no toca datos de producción.
 * No auto-inicializa, no lee localStorage personal y no despliega servicios. */
(function(root){
 'use strict';
 const A=root.BowlingCp014Compat;
 const DB_NAME='mi-bowling-cp032-synthetic-v3',STORE='journal',SCHEMA='cp032-synthetic-journal-v1',MAX=1048576;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
 const hex=bytes=>[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
 async function hash(s){return hex(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))}
 function gate(){
  assert(!!A&&typeof A.validateDocument==='function','CP032_NO_V3');
  assert(['localhost','127.0.0.1'].includes(root.location.hostname),'CP032_ORIGIN_DENIED');
  assert(root.isSecureContext===true&&new URLSearchParams(root.location.search).get('cp032lab')==='ficticio','CP032_LAB_MARK_REQUIRED');
  assert(root.MiBowlingRegistroCP021?.enabled===true,'CP032_EXISTING_DATA_PROTECTED');
  assert(!Object.keys(root.localStorage).some(k=>k.startsWith('mi-bowling-')),'CP032_REAL_KEYS_FOUND');
 }
 function validate(doc){
  gate();
  assert(doc&&typeof doc==='object','CP032_DOCUMENT_REQUIRED');
  const data=copy(doc);
  A.validateDocument(data);
  if(data.cp032Mirror){assert(root.MiBowlingCP032PWA?.verifyMirror,'CP032_PWA_ADAPTER_MISSING');root.MiBowlingCP032PWA.verifyMirror(data)}
  assert(data.labFixture==='cp015-synthetic-only'&&data.sessions.length===1,'CP032_ONLY_SYNTHETIC');
  assert(data.sessions.every(s=>s.id.startsWith('cp015-fake-')&&s.games.length>0&&s.games.every(g=>g.id.startsWith('cp015-fake-'))),'CP032_UNTRUSTED_GAME');
  assert(new TextEncoder().encode(JSON.stringify(data)).length<=MAX,'CP032_OVERSIZE');
  return data;
 }
 const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 let db=null;
 async function open(){
  gate();if(db)return db;
  db=await new Promise((resolve,reject)=>{
   const r=root.indexedDB.open(DB_NAME,1);
   r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
   r.onsuccess=()=>resolve(r.result);
   r.onerror=()=>reject(r.error);
   r.onblocked=()=>reject(Error('CP032_IDB_BLOCKED'));
  });
  return db;
 }
 async function readKey(key){
  const d=await open();
  return new Promise((resolve,reject)=>{
   const tx=d.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);
   let v;r.onsuccess=()=>v=r.result;tx.oncomplete=()=>resolve(v===undefined?null:copy(v));tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
 }
 async function change(fn){
  const d=await open();return new Promise((resolve,reject)=>{
   let result,fail=null;
   const tx=d.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
   const stop=m=>{fail=Error(m);tx.abort()};
   try{fn(store,stop,v=>{result=v})}catch(e){fail=e;tx.abort()}
   tx.oncomplete=()=>resolve(result);
   tx.onerror=()=>reject(fail||tx.error);
   tx.onabort=()=>reject(fail||tx.error||Error('CP032_IDB_ABORT'));
  });
 }
 async function packet(doc,revision){
  if(doc===null)return {revision,document:null,sha:null};
  const data=validate(doc),sha=await hash(JSON.stringify(data));return {revision,document:data,sha};
 }
 async function verify(p){
  assert(p&&Number.isSafeInteger(p.revision)&&p.revision>=0&&
    (p.document===null||typeof p.document==='object'),'CP032_PACKET_INVALID');
  if(p.document!==null){validate(p.document);assert(await hash(JSON.stringify(p.document))===p.sha,'CP032_HASH_MISMATCH')}
  else assert(p.sha===null,'CP032_NULL_HASH');
  return p;
 }
 async function state(){
  gate();const active=await readKey('active');
  return active?await verify(active):packet(null,0);
 }
 async function recover(){
  gate();const intent=await readKey('intent');
  if(!intent)return {recovered:false,mode:'clean'};
  assert(intent.schema===SCHEMA,'CP032_JOURNAL_SCHEMA');
  const [before,after,now]=await Promise.all([verify(intent.before),verify(intent.after),state()]);
  const eq=(a,b)=>a.revision===b.revision&&a.sha===b.sha;
  assert(eq(now,before)||eq(now,after),'CP032_UNRESOLVED_CONFLICT');
  await change((s,stop)=>{const g=s.get('intent');g.onsuccess=()=>{
   if(!g.result||g.result.txid!==intent.txid){stop('CP032_INTENT_CHANGED');return}
   s.delete('intent');
  }});
  return {recovered:true,mode:eq(now,before)?'rolled-back-pending':'committed'};
 }
 async function read(){
  await recover();const v=await state();return {revision:v.revision,document:v.document===null?null:copy(v.document)};
 }
 async function save(doc,expectedRevision,{failAt=null}={}){
  gate();const after=await packet(doc,expectedRevision+1);
  assert(Number.isSafeInteger(expectedRevision)&&expectedRevision>=0,'CP032_EXPECTED_REV_REQUIRED');
  // Durable prepare barrier; concurrent writers cannot both prepare against same revision.
  const before=await state();assert(before.revision===expectedRevision,'CP032_CONFLICT');
  const txid=await hash(before.revision+':'+before.sha+':'+after.sha);
  const intent={schema:SCHEMA,txid,before,after};
  await change((s,stop)=>{
   const a=s.get('active');a.onsuccess=()=>{
    const existing=a.result||{revision:0,document:null,sha:null};
    if(existing.revision!==expectedRevision||existing.sha!==before.sha){stop('CP032_STALE');return}
    const j=s.get('intent');j.onsuccess=()=>{if(j.result){stop('CP032_PENDING');return}s.put(intent,'intent')};
   };
  });
  if(failAt==='afterPrepare')throw Error('CP032_SIMULATED_CRASH_afterPrepare');
  await change((s,stop)=>{
   const j=s.get('intent');j.onsuccess=()=>{
    if(j.result?.txid!==txid){stop('CP032_INTENT_CHANGED');return}
    const a=s.get('active');a.onsuccess=()=>{
     const v=a.result||{revision:0,document:null,sha:null};
     if(v.revision!==before.revision||v.sha!==before.sha){stop('CP032_CONFLICT_COMMIT');return}
     s.put(before,'previous');s.put(after,'active');
    };
   };
  });
  if(failAt==='afterCommit')throw Error('CP032_SIMULATED_CRASH_afterCommit');
  await recover();
  return {revision:after.revision,sha:after.sha};
 }
 async function rollback(expectedRevision){
  gate();await recover();const [current,previous]=await Promise.all([state(),readKey('previous')]);
  assert(current.revision===expectedRevision&&previous,'CP032_NO_ROLLBACK');
  await verify(previous);
  // Revisions remain monotonic, but source bytes remain identical.
  const restored={...previous,revision:current.revision+1};
  await change((s,stop)=>{const a=s.get('active');a.onsuccess=()=>{
   if(a.result?.revision!==expectedRevision){stop('CP032_STALE_ROLLBACK');return}
   s.put(restored,'active');s.delete('previous');
  }});
  return {revision:restored.revision,restored:restored.document===null?null:copy(restored.document)};
 }
 async function exportCopy(){const x=await read();return JSON.stringify({schema:SCHEMA,revision:x.revision,document:x.document},null,2)}
 function parseCopy(value){
  assert(typeof value==='string'&&value.length<=MAX*2,'CP032_COPY_INVALID');
  const data=JSON.parse(value);
  assert(data&&data.schema===SCHEMA&&Number.isSafeInteger(data.revision)&&data.revision>=0,'CP032_COPY_FORMAT');
  return validate(data.document);
 }
 function close(){if(db){db.close();db=null}}
 root.MiBowlingCP032Journal=Object.freeze({
   version:'CP032-transaction-1',dbName:DB_NAME,read,save,recover,rollback,exportCopy,parseCopy,close,
   writesProduction:false
 });
})(typeof window!=='undefined'?window:globalThis);
