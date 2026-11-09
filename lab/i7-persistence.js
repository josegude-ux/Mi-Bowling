/* MI BOWLING · LAB I7 · explicit per-tab/per-operation WAL reconciler.
 * Only fictitious scores, owner-scoped injected encrypted IndexedDB and CAS
 * fake backend. NO public app modifications, real auth, network or secrets.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clone=x=>JSON.parse(JSON.stringify(x)),eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function validate(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||p.version!==2||
  !Array.isArray(p.sessions)||!Array.isArray(p.balls)||
  !Array.isArray(p.patterns)||['leagueNational','matches','rosters','leagueRosters'].some(k=>
    Object.prototype.hasOwnProperty.call(p,k)))throw Error('I7: documento personal no permitido');
 if(JSON.stringify(p).length>8*1024*1024)throw Error('I7: archivo demasiado grande');
 return clone(p);
}
async function hash(value){
 if(!root.crypto?.subtle)throw Error('I7: SHA-256 requerido');
 const digest=await root.crypto.subtle.digest('SHA-256',
   new TextEncoder().encode(JSON.stringify(value)));
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function sign(input){
 const e={version:2,owner:input.owner,tabId:input.tabId,opId:input.opId,
  createdAt:input.createdAt,baseRevision:input.baseRevision,
  basePayload:validate(input.basePayload),baseHash:await hash(input.basePayload),
  payload:validate(input.payload),payloadHash:await hash(input.payload)};
 return {...e,checksum:await hash(e)};
}
async function verify(e,owner){
 if(!e||e.owner!==owner||e.version!==2||!UUID.test(e.tabId||'')||
  !UUID.test(e.opId||'')||!Number.isFinite(e.createdAt)||
  !(e.baseRevision===null||(Number.isSafeInteger(e.baseRevision)&&e.baseRevision>=0))||
  !/^[0-9a-f]{64}$/.test(e.checksum||'')||
  !/^[0-9a-f]{64}$/.test(e.baseHash||'')||
  !/^[0-9a-f]{64}$/.test(e.payloadHash||''))
  throw Error('I7: WAL malformado o ajeno');
 const v=await sign(e);
 if(v.checksum!==e.checksum||v.baseHash!==e.baseHash||v.payloadHash!==e.payloadHash)
  throw Error('I7: SHA de WAL inválido');
 return v;
}
function safeUnion(base,local,remote){
 const meta=x=>{const v=clone(x);delete v.sessions;return v};
 if(!eq(meta(base),meta(local))||!eq(meta(base),meta(remote)))return null;
 const unique=a=>a.every(s=>s&&typeof s.id==='string')&&
  new Set(a.map(s=>s.id)).size===a.length;
 if(![base,local,remote].every(x=>unique(x.sessions)))return null;
 const B=new Map(base.sessions.map(s=>[s.id,s]));
 const L=new Map(local.sessions.map(s=>[s.id,s]));
 const R=new Map(remote.sessions.map(s=>[s.id,s]));
 if([...B].some(([id,s])=>!eq(L.get(id),s)||!eq(R.get(id),s)))return null;
 const added=local.sessions.filter(s=>!B.has(s.id));
 // A second operation in the SAME tab can contain an earlier, already
 // confirmed new session. Reusing its ID is safe ONLY if bytes are identical.
 // Divergent changes to that ID (or any preexisting session) still fail closed.
 if(added.some(s=>R.has(s.id)&&!eq(R.get(s.id),s)))return null;
 const uniqueAdds=added.filter(s=>!R.has(s.id));
 return {...clone(remote),sessions:[...clone(remote.sessions),...clone(uniqueAdds)]};
}
function create({repository,journal,owner,tabId=root.crypto?.randomUUID?.(),
  onStatus=()=>{}}={}){
 if(!UUID.test(owner||'')||!UUID.test(tabId||'')||
  !['load','write'].every(k=>typeof repository?.[k]==='function')||
  !['list','readOp','append','clearOp'].every(k=>typeof journal?.[k]==='function'))
  throw Error('I7: contrato de identidad, repositorio o journal inválido');
 let ready=false,closed=false,phase='idle',blocked=null,error=null,
  revision=null,base=null,local=null,volatile=new Map(),durableCount=0,pendingCount=0;
 let chain=Promise.resolve(),seq=0,lastDurable=null,epoch=0;
 const state=()=>Object.freeze({owner,tabId,ready,closed,phase,blocked,error,revision,
  volatileCount:volatile.size,durableCount,pendingCount,lastDurable});
 function emit(){try{onStatus(state())}catch(_){}}
 function mark(reason,cause){blocked=reason;phase=reason;error=String(cause?.message||cause||reason);emit()}
 function check(){if(!ready||closed)throw Error('I7: sesión cerrada o no inicializada')}
 async function remote(){
  const docs=await repository.load(owner);
  if(docs?.owner!==owner||!docs.personal)throw Error('I7: respuesta remota de otra identidad');
  const rev=docs.personal.revision;
  if(rev!==null&&(!Number.isSafeInteger(rev)||rev<0))throw Error('I7: revisión remota inválida');
  return {revision:rev,payload:validate(docs.personal.payload)};
 }
 async function list(){
  check();
  const entries=await journal.list(owner);
  const result=[];
  for(const item of entries)result.push(await verify(item,owner));
  pendingCount=result.length;
  emit();
  return result;
 }
 async function start(){
  if(ready||closed)throw Error('I7: inicio duplicado');
  const stamp=epoch;
  const server=await remote(),entries=await journal.list(owner);
  for(const e of entries)await verify(e,owner); // tampered WAL blocks login
  if(stamp!==epoch||closed)throw Error('I7: identidad modificada');
  base=server.payload;local=clone(base);revision=server.revision;
  pendingCount=entries.length;ready=true;
  phase=entries.length?'recovery':'ready';blocked=entries.length?'recovery':null;
  emit();
  return {initial:clone(base),state:state()};
 }
 async function deliver(e){
  const server=await remote();
  const sameBase=server.revision===e.baseRevision&&await hash(server.payload)===e.baseHash;
  const nextRevision=e.baseRevision===null?0:e.baseRevision+1;
  if(server.revision===nextRevision&&await hash(server.payload)===e.payloadHash){
   const ok=await journal.clearOp(owner,e.tabId,e.opId,e.checksum);
   if(!ok)throw Error('I7: acuse cambió; no borrar');
   await list();revision=server.revision;base=server.payload;
   return {status:'already-applied',revision};
  }
  if(!sameBase)return {status:'conflict',revision:server.revision};
  let returned;
  try{returned=await repository.write(owner,'personal',e.payload,e.baseRevision)}
  catch(cause){return {status:'uncertain',error:String(cause?.message||cause)}}
  if(returned!==nextRevision)return {status:'uncertain',error:'revisión CAS inesperada'};
  const checked=await remote();
  if(checked.revision!==nextRevision||await hash(checked.payload)!==e.payloadHash)
   return {status:'uncertain',error:'lectura de confirmación distinta'};
  const ok=await journal.clearOp(owner,e.tabId,e.opId,e.checksum);
  if(!ok)return {status:'uncertain',error:'WAL sustituido durante ACK'};
  await list();revision=checked.revision;base=checked.payload;
  return {status:'saved',revision};
 }
 // Stage is synchronous only for the CP-020 compatibility port; the mutation
 // becomes durable ONLY when append() IDB transaction.oncomplete resolves.
 function stage(payload){
  check();
  if(blocked)throw Error('I7: hay pendientes; revisar antes de nuevas modificaciones');
  const target=validate(payload);
  if(eq(local,target))return state();
  local=clone(target);
  const opId=root.crypto.randomUUID(),createdAt=Date.now()+seq/1000;
  seq++;
  const draft={opId,tabId,createdAt,payload:target,
   basePayload:clone(base),baseRevision:revision,owner};
  volatile.set(opId,draft);phase='journaling';emit();
  chain=chain.catch(()=>{}).then(async()=>{
   const entry=await sign(draft);
   // No remote write is permitted before durable encrypted journal receipt.
   const receipt=await journal.append(owner,entry);
   if(!receipt?.durable||receipt.checksum!==entry.checksum)
    throw Error('I7: no se recibió acuse duradero');
   volatile.delete(opId);lastDurable=opId;durableCount++;
   await list();
   if(closed){phase='closed';emit();return}
   if(blocked){emit();return}
   phase='saving';emit();
   const result=await deliver(entry);
   if(result.status==='saved'||result.status==='already-applied'){
    durableCount=Math.max(0,durableCount-1);
    if(!pendingCount){blocked=null;error=null;phase='saved'}
    else mark('recovery','Hay operaciones cifradas aún sin conciliar');
   }else mark(result.status==='conflict'?'conflict':'uncertain',result.error||result.status);
   emit();
  }).catch(e=>{
   // Preserve every already-acknowledged encrypted WAL. Unacknowledged work
   // is flagged as volatile, NEVER advertised as durable.
   if(!closed)mark('journal-error',e);
  });
  return state();
 }
 async function drain(){check();await chain;return state()}
 async function inspect(){
  check();await chain.catch(()=>{});
  const entries=await list(),server=await remote(),digest=await hash(server.payload);
  const statuses=[];
  for(const e of entries){
   const nr=e.baseRevision===null?0:e.baseRevision+1;
   const status=server.revision===e.baseRevision&&digest===e.baseHash?'can-resume':
    server.revision===nr&&digest===e.payloadHash?'already-applied':'conflict';
   statuses.push({opId:e.opId,tabId:e.tabId,durable:true,checksum:e.checksum,status});
  }
  return statuses;
 }
 async function reconcile(opId,action='recover',confirmation){
  check();await chain.catch(()=>{});
  if(!UUID.test(opId||''))throw Error('I7: selecciona una operación UUID');
  const entries=await list(),e=entries.find(x=>x.opId===opId);
  if(!e)throw Error('I7: operación ausente o de otra identidad');
  const statuses=await inspect(),s=statuses.find(x=>x.opId===opId);
  if(action==='inspect')return s;
  if(action==='recover'&&s.status==='conflict')
   return {status:'conflict',retained:true};
  if(action==='recover'&&(s.status==='already-applied'||s.status==='can-resume')){
   const result=await deliver(e);
   if(result.status==='saved'||result.status==='already-applied'){
    durableCount=Math.max(0,durableCount-1);
    if(!pendingCount){blocked=null;phase='saved';error=null;}
    else{blocked='recovery';phase='recovery'}
   }else mark(result.status,result.error||result.status);
   emit();return result;
  }
  if(action!=='merge'||confirmation!=='CONFIRMAR-FUSION-FICTICIA')
   throw Error('I7: fusión requiere confirmación explícita');
  if(s.status!=='conflict')throw Error('I7: no existe conflicto de tres vías');
  const server=await remote(),merged=safeUnion(e.basePayload,e.payload,server.payload);
  if(!merged){mark('conflict','I7: cambio solapado; ambas copias se mantienen');return {status:'conflict',retained:true}}
  // Persist a NEW independent operation first. The old WAL is retained until
  // its merged content has been CAS-confirmed; interruption keeps both.
  const mergedOp=await sign({owner,tabId,opId:root.crypto.randomUUID(),
   createdAt:Date.now(),baseRevision:server.revision,
   basePayload:server.payload,payload:merged});
  const receipt=await journal.append(owner,mergedOp);
  if(!receipt?.durable)throw Error('I7: fusión sin acuse durable');
  durableCount++;await list();
  const result=await deliver(mergedOp);
  if(result.status==='saved'||result.status==='already-applied'){
   const cleared=await journal.clearOp(owner,e.tabId,e.opId,e.checksum);
   if(!cleared){mark('uncertain','I7: origen de fusión cambió, conservar evidencia');return {status:'uncertain',retained:true}}
   durableCount=Math.max(0,durableCount-2);await list();
   if(!pendingCount){blocked=null;phase='saved';error=null}
   else{blocked='recovery';phase='recovery'}
   emit();return {status:'merged',revision:result.revision,pendingCount};
  }
  mark(result.status,result.error||result.status);
  return {status:result.status,retained:true,pendingCount};
 }
 async function exportOperation(opId){
  check();
  const entries=await list(),e=entries.find(x=>x.opId===opId);
  return e?clone(e):null;
 }
 function close(){
  const unsaved=volatile.size>0||pendingCount>0;
  closed=true;ready=false;epoch++;phase='closed';emit();
  return Object.freeze({unsaved,volatileCount:volatile.size,pendingCount});
 }
 return Object.freeze({start,stage,drain,list,inspect,reconcile,exportOperation,close,state});
}
root.MiBowlingI7Persistence=Object.freeze({create,validate,safeUnion});
})(typeof window!=='undefined'?window:globalThis);
