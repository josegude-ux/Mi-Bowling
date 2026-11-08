/* MI BOWLING · LAB I3 · Private asynchronous personal-score autosave.
 * Browser-neutral contract. No localStorage, IndexedDB, fetch, SDK or real service.
 * The injected repository MUST verify remote identity and enforce server-side CAS/RLS.
 * This adapter never writes 'league' and never automatically overwrites a conflict.
 */
(function(root){
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function personal(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    !Array.isArray(value.sessions)||!Array.isArray(value.balls)||!Array.isArray(value.patterns))
  throw Error('I3: documento personal inválido');
 if(['matches','rosters','leagueNational','leagueRosters'].some(k=>Object.hasOwn(value,k)))
  throw Error('I3: Liga Nacional no puede mezclarse con partidas personales');
 const text=JSON.stringify(value);
 if(typeof text!=='string'||text.length>8*1024*1024)throw Error('I3: copia personal fuera de límite');
 return {text,payload:JSON.parse(text)};
}
function create({repository,owner,read,onStatus=()=>{},debounceMs=100}={}){
 if(!UUID.test(owner||'')||typeof read!=='function'||
    !repository||typeof repository.load!=='function'||typeof repository.write!=='function')
  throw Error('I3: contrato inválido (UUID='+UUID.test(owner||'')+', owner='+JSON.stringify(owner)+', read='+typeof read+', load='+typeof repository?.load+', write='+typeof repository?.write+')');
 if(!Number.isFinite(debounceMs)||debounceMs<0||debounceMs>10000)
  throw Error('I3: espera de autosave inválida');
 let started=false,closed=false,online=true,revision=null,remoteText=null;
 let observed=null,latest=null,dirty=false,phase='idle',blocked=null,lastError=null;
 let timer=null,inflight=null,epoch=0,lastAttempt=null,detach=()=>{};
 const nextRevision=n=>n===null?0:n+1;
 function state(){return Object.freeze({
  owner,phase,revision,dirty,blocked,online,started,closed,
  error:lastError
 });}
 function emit(){try{onStatus(state())}catch(_){}}
 function cancelTimer(){if(timer!==null){clearTimeout(timer);timer=null;}}
 function schedule(){
  cancelTimer();
  if(!started||closed||!online||blocked||!dirty||inflight)return;
  timer=setTimeout(()=>{timer=null;flush().catch(fail)},debounceMs);
 }
 function fail(error){
  if(closed)return;
  blocked='uncertain';phase='error';lastError=String(error?.message||error);
  cancelTimer();emit();
 }
 function assertReady(){
  if(!started||closed)throw Error('I3: sesión cerrada o no inicializada');
 }
 async function start(){
  if(started||closed)throw Error('I3: arranque duplicado');
  const stamp=epoch;
  const docs=await repository.load(owner);
  if(closed||stamp!==epoch)throw Error('I3: autenticación cambiada durante apertura');
  if(docs?.owner!==owner||!docs.personal)throw Error('I3: propietario remoto incorrecto');
  const v=docs.personal.revision;
  if(v!==null&&(!Number.isSafeInteger(v)||v<0))throw Error('I3: revisión remota inválida');
  revision=v;remoteText=personal(docs.personal.payload).text;
  latest=personal(read());observed=latest.text;
  started=true;phase='ready';emit();
  return state();
 }
 function observe(){
  assertReady();
  const p=personal(read());
  if(p.text===observed)return state();
  observed=p.text;latest=p;
  dirty=p.text!==remoteText;
  if(!dirty){cancelTimer();phase='saved';blocked=null;lastError=null;}
  else if(!blocked){phase=online?'pending':'offline';schedule();}
  emit();return state();
 }
 async function flush({force=false}={}){
  assertReady();cancelTimer();
  if(force&&!blocked){
   latest=personal(read());observed=latest.text;dirty=true;
  }
  if(blocked||!online){phase=blocked?'error':'offline';emit();return state();}
  if(inflight){await inflight;return state();}
  if(!dirty)return state();
  const stamp=epoch;
  inflight=(async()=>{
   while(dirty&&!blocked&&online&&!closed&&stamp===epoch){
    const candidate=latest,prev=revision;
    lastAttempt={text:candidate.text,previous:prev};
    phase='saving';emit();
    let actual;
    try{actual=await repository.write(owner,'personal',candidate.payload,prev)}
    catch(error){if(stamp===epoch&&!closed)fail(error);return}
    if(stamp!==epoch||closed)return; // never deliver stale results to another identity
    if(actual!==nextRevision(prev)){
     fail(Error('I3: respuesta de revisión no verificable'));return;
    }
    revision=actual;remoteText=candidate.text;lastError=null;
    dirty=latest.text!==remoteText;
    phase=dirty?'pending':'saved';emit();
   }
  })();
  try{await inflight}finally{inflight=null}
  if(dirty&&!blocked&&online)schedule();
  return state();
 }
 async function reconcile(){
  assertReady();cancelTimer();
  if(inflight)await inflight;
  const stamp=epoch;
  let docs;
  try{docs=await repository.load(owner)}
  catch(error){if(stamp===epoch&&!closed)fail(error);return state()}
  if(stamp!==epoch||closed)return state();
  if(docs?.owner!==owner||!docs.personal){fail(Error('I3: propietario de conciliación incorrecto'));return state()}
  const v=docs.personal.revision,remote=personal(docs.personal.payload).text;
  if(v===revision&&remote===remoteText){
   blocked=null;lastError=null;
  }else if(lastAttempt&&v===nextRevision(lastAttempt.previous)&&remote===lastAttempt.text){
   // A timeout may occur AFTER the server commits. Acknowledge; do not replay.
   revision=v;remoteText=remote;blocked=null;lastError=null;
  }else{
   blocked='conflict';phase='conflict';lastError='Conflicto: conserva la copia pendiente; no sobrescribir';
   emit();return state();
  }
  dirty=latest.text!==remoteText;
  phase=dirty?(online?'pending':'offline'):'saved';emit();
  if(dirty&&online)return flush();
  return state();
 }
 async function setOnline(value){
  assertReady();online=!!value;
  if(!online){cancelTimer();phase=dirty?'offline':'ready';emit();return state()}
  // A disconnected client must revalidate the remote revision before any write.
  return reconcile();
 }
 function attachMain(target){
  assertReady();
  if(!target||typeof target.save!=='function')throw Error('I3: motor sin función save');
  const original=target.save;
  function wrapped(){
   const outcome=original.apply(this,arguments);
   try{observe()}catch(error){fail(error)}
   return outcome;
  }
  target.save=wrapped;
  detach=()=>{if(target.save===wrapped)target.save=original};
  return detach;
 }
 function close(){
  const unsaved=dirty||!!inflight;
  epoch++;closed=true;started=false;cancelTimer();detach();
  // No persistence fallback, no disk queue, no silent cross-account replay.
  latest=null;observed=null;lastAttempt=null;dirty=false;phase='closed';
  emit();return Object.freeze({unsaved});
 }
 return Object.freeze({start,observe,flush,reconcile,setOnline,attachMain,close,state});
}
root.MiBowlingScoreSyncI3=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
