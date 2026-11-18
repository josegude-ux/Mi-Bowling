/* MI BOWLING · LAB I5 · private async persistence + recoverable write-ahead journal.
 * Inert without injected owner-verified repository & journal. No browser storage,
 * credentials, network transport or production data. Only PERSONAL JSON.
 * An injected encrypted journal can survive real browser reload; no real service.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const copy=x=>JSON.parse(JSON.stringify(x));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function validate(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||p.version!==2||
  !Array.isArray(p.sessions)||!Array.isArray(p.balls)||!Array.isArray(p.patterns))
  throw Error('I5: documento personal inválido');
 if(['matches','rosters','leagueNational','leagueRosters'].some(k=>has(p,k)))
  throw Error('I5: documento personal incluye Liga');
 const data=JSON.stringify(p);
 if(data.length>8*1024*1024)throw Error('I5: documento excesivo');
 return copy(p);
}
async function sha(obj){
 if(!root.crypto?.subtle)throw Error('I5: SHA-256 indisponible');
 const bytes=new TextEncoder().encode(JSON.stringify(obj));
 const digest=await root.crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}
function memoryJournal(){
 const map=new Map();
 return Object.freeze({
  async read(owner){return map.has(owner)?copy(map.get(owner)):null;},
  async put(owner,record){if(record.owner!==owner)throw Error('I5: propietario del journal no coincide');map.set(owner,copy(record));},
  async clear(owner,checksum){
   if(map.get(owner)?.checksum!==checksum)return false;
   map.delete(owner);return true;
  },
  // Exposed only for synthetic corruption fixtures and restart simulation.
  unsafeTestSeed(owner,record){map.set(owner,copy(record));}
 });
}
async function signEntry(entry){
 const x={version:1,owner:entry.owner,baseRevision:entry.baseRevision,
  baseHash:entry.baseHash,basePayload:validate(entry.basePayload),
  payload:validate(entry.payload),payloadHash:entry.payloadHash};
 return {...x,checksum:await sha(x)};
}
async function verifyEntry(entry,owner){
 if(!entry||entry.version!==1||entry.owner!==owner||
  !(entry.baseRevision===null||
    (Number.isSafeInteger(entry.baseRevision)&&entry.baseRevision>=0))||
  !/^[0-9a-f]{64}$/.test(entry.baseHash||'')||
  !/^[0-9a-f]{64}$/.test(entry.payloadHash||''))
  throw Error('I5: journal malformado o de otra identidad');
 const v=await signEntry(entry);
 if(v.checksum!==entry.checksum||await sha(v.basePayload)!==v.baseHash||
    await sha(v.payload)!==v.payloadHash)
  throw Error('I5: journal alterado o con checksum inválido');
 return v;
}
function simpleMerge(base,local,remote){
 // Conservative additive-only three-way merge. No implicit edits or deletions.
 const meta=x=>{const v=copy(x);delete v.sessions;return v;};
 if(!same(meta(base),meta(local))||!same(meta(base),meta(remote)))return null;
 const unique=arr=>arr.every(s=>s&&typeof s.id==='string')&&
  new Set(arr.map(s=>s.id)).size===arr.length;
 if(![base,local,remote].every(x=>unique(x.sessions)))return null;
 const B=new Map(base.sessions.map(s=>[s.id,s]));
 const L=new Map(local.sessions.map(s=>[s.id,s]));
 const R=new Map(remote.sessions.map(s=>[s.id,s]));
 if([...B].some(([id,v])=>!same(L.get(id),v)||!same(R.get(id),v)))return null;
 const localExtra=local.sessions.filter(s=>!B.has(s.id));
 if(localExtra.some(s=>R.has(s.id)))return null;
 const merged=copy(remote);
 merged.sessions.push(...copy(localExtra));
 return merged;
}
function create({repository,journal,owner,onStatus=()=>{},debounceMs=70}={}){
 if(!UUID.test(owner||'')||typeof repository?.load!=='function'||
  typeof repository?.write!=='function'||typeof journal?.read!=='function'||
  typeof journal?.put!=='function'||typeof journal?.clear!=='function')
  throw Error('I5: contrato de repositorio, UUID o journal inválido');
 if(!Number.isInteger(debounceMs)||debounceMs<0||debounceMs>10000)
  throw Error('I5: debounce inválido');
 let ready=false,closed=false,epoch=0,revision=null,base=null,local=null;
 let pending=null,blocked=null,phase='idle',timer=null,busy=null,dirty=false,lastError=null;
 const state=()=>Object.freeze({
  owner,ready,closed,revision,phase,blocked,dirty,
  pending:!!pending,error:lastError,
  // Never return personally identifiable score or PDF bytes from status.
 });
 function emit(){try{onStatus(state())}catch(_){}}
 const cancel=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
 function mark(reason,error){blocked=reason;phase=reason;lastError=String(error?.message||error||reason);cancel();emit();}
 function check(){if(!ready||closed)throw Error('I5: sesión no inicializada o cerrada');}
 async function remote(){
  const docs=await repository.load(owner);
  if(docs?.owner!==owner||!docs.personal)throw Error('I5: propietario remoto inesperado');
  const v=docs.personal.revision;
  if(v!==null&&(!Number.isSafeInteger(v)||v<0))throw Error('I5: revisión remota inválida');
  return {revision:v,payload:validate(docs.personal.payload)};
 }
 async function start(){
  if(ready||closed)throw Error('I5: arranque duplicado');
  const stamp=epoch;
  const current=await remote(),saved=await journal.read(owner);
  if(stamp!==epoch||closed)throw Error('I5: identidad cambió durante apertura');
  revision=current.revision;base=current.payload;local=copy(base);
  if(saved){
   try{pending=await verifyEntry(saved,owner);}
   catch(e){mark('invalid-journal',e);ready=true;return {initial:copy(base),state:state()};}
   blocked='recovery';phase='recovery';
  }else phase='ready';
  ready=true;emit();
  return {initial:copy(base),state:state()};
 }
 function schedule(){
  cancel();
  if(closed||!ready||blocked||!dirty||busy)return;
  timer=setTimeout(()=>{timer=null;flush().catch(e=>mark('uncertain',e));},debounceMs);
 }
 function stage(payload){
  check();
  local=validate(payload);
  dirty=!same(local,base);
  if(!blocked){phase=dirty?'pending':'saved';schedule();}
  emit();return state();
 }
 async function makeEntry(origin,target){
  return signEntry({owner,baseRevision:origin.revision,
   basePayload:origin.payload,baseHash:await sha(origin.payload),
   payload:target,payloadHash:await sha(target)});
 }
 async function confirm(entry,returned,stamp){
  if(returned!==(entry.baseRevision===null?0:entry.baseRevision+1))
   throw Error('I5: revisión CAS inesperada');
  const docs=await remote();
  if(stamp!==epoch||closed)return false;
  if(docs.revision!==returned||await sha(docs.payload)!==entry.payloadHash)
   throw Error('I5: escritura sin confirmación de lectura');
  revision=docs.revision;base=docs.payload;
  if(!await journal.clear(owner,entry.checksum))throw Error('I5: journal cambió durante confirmación');
  pending=null;
  dirty=!same(local,base);blocked=null;lastError=null;
  phase=dirty?'pending':'saved';emit();return true;
 }
 async function writeEntry(entry,stamp,{precommitted=false}={}){
  pending=entry;
  if(!precommitted)await journal.put(owner,entry); // encrypted WRITE AHEAD, before network
  if(stamp!==epoch||closed)return;
  let result;
  try{result=await repository.write(owner,'personal',entry.payload,entry.baseRevision);}
  catch(err){if(stamp===epoch&&!closed)mark('uncertain',err);return;}
  if(stamp!==epoch||closed)return;
  try{await confirm(entry,result,stamp);}catch(err){mark('uncertain',err);}
 }
 async function flush(){
  check();cancel();
  if(blocked||!dirty)return state();
  if(busy){await busy;return state();}
  const stamp=epoch;
  busy=(async()=>{
   while(!closed&&stamp===epoch&&dirty&&!blocked){
    const payload=copy(local);
    phase='journaling';emit();
    let entry;
    try{entry=await makeEntry({revision,payload:base},payload);}
    catch(err){mark('invalid-journal',err);return;}
    if(closed||stamp!==epoch)return;
    phase='saving';emit();
    try{await writeEntry(entry,stamp);}
    catch(err){if(!closed&&stamp===epoch)mark('uncertain',err);}
   }
  })();
  try{await busy;}finally{busy=null;}
  if(dirty&&!blocked&&!closed)schedule();
  return state();
 }
 async function inspect(){
  check();
  if(busy)await busy;
  if(!pending)return {status:'none'};
  let verified;
  try{verified=await verifyEntry(await journal.read(owner),owner);}
  catch(err){mark('invalid-journal',err);return {status:'invalid'};}
  if(!verified||verified.checksum!==pending.checksum)
   {mark('invalid-journal','Journal sustituido');return {status:'invalid'};}
  const server=await remote();
  const h=await sha(server.payload);
  if(server.revision===verified.baseRevision&&h===verified.baseHash)
   return {status:'can-resume',baseRevision:server.revision,localHash:verified.payloadHash};
  if(server.revision===(verified.baseRevision===null?0:verified.baseRevision+1)&&h===verified.payloadHash)
   return {status:'already-applied',serverRevision:server.revision};
  return {status:'conflict',serverRevision:server.revision,localHash:verified.payloadHash,remoteHash:h};
 }
 async function recover(){
  check();
  if(!pending)throw Error('I5: no hay pendiente recuperable');
  const d=await inspect();
  if(d.status==='already-applied'){
   const server=await remote();
   if(!await journal.clear(owner,pending.checksum))throw Error('I5: diario alterado');
   base=server.payload;revision=server.revision;pending=null;
   blocked=null;local=copy(base);dirty=false;phase='saved';emit();
   return state();
  }
  if(d.status!=='can-resume'){mark('conflict','I5: cambios remotos divergentes; revisión manual');return state();}
  blocked=null;phase='saving';emit();
  const entry=pending;
  local=copy(entry.payload);dirty=true;
  await writeEntry(entry,epoch);
  return state();
 }
 async function exportPending(){
  check();
  const entry=await journal.read(owner);
  if(!entry)return null;
  // A caller can present/save this synthetic package separately; never clears journal.
  return copy(await verifyEntry(entry,owner));
 }
 async function safeMerge(confirmation){
  check();
  if(confirmation!=='CONFIRMAR-FUSION-FICTICIA')throw Error('I5: confirmación explícita requerida');
  if(!pending||busy)throw Error('I5: sin pendiente o guardado en curso');
  const before=await inspect();
  if(before.status!=='conflict')throw Error('I5: no hay conflicto divergente');
  const server=await remote();
  if(server.revision!==before.serverRevision||await sha(server.payload)!==before.remoteHash)
   throw Error('I5: revisión cambió durante comparación');
  const merged=simpleMerge(pending.basePayload,pending.payload,server.payload);
  if(!merged){mark('conflict','I5: cambios solapados; preservar ambas copias');return state();}
  // The merged draft contains both nonoverlapping additions. No changes to
  // preexisting sessions, balls, patterns or league are permitted.
  const entry=await makeEntry(server,merged);
  // Atomic compare-and-replace of the old encrypted journal, so a merge never
  // drops the previous draft before the new envelope is durably committed.
  if(typeof journal.replace!=='function')throw Error('I5: journal sin CAS de sustitución');
  await journal.replace(owner,pending.checksum,entry);
  pending=entry;
  local=copy(merged);dirty=true;blocked=null;phase='saving';emit();
  await writeEntry(entry,epoch,{precommitted:true});
  return state();
 }
 function close(){
  const unsaved=dirty||!!pending||!!busy;
  closed=true;ready=false;epoch++;cancel();
  // A result arriving after close never removes the journal.
  phase='closed';emit();
  return Object.freeze({unsaved});
 }
 return Object.freeze({start,stage,flush,inspect,recover,exportPending,safeMerge,close,state});
}
root.MiBowlingI5Persistence=Object.freeze({create,memoryJournal});
})(typeof window!=='undefined'?window:globalThis);
