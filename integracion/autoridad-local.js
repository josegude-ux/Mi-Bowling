'use strict';
/* F1 LAB: one exclusive writer for all participating pages on the same origin.
 * A page that cannot acquire the lock must not start its application engine.
 * No fallback to an optimistic-only lock. No access to IndexedDB. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MiBowlingAutoridad=api;})(globalThis,function(){
 const KEYS=Object.freeze(['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-ball-selection-v1','mi-bowling-plantilla-100-v1','mi-bowling-liga-v1','mi-bowling-liga-acta-v32','mi-bowling-liga-rosters-v33','mi-bowling-quick-layout']);
 const JOURNAL='mi-bowling-f1-restore-journal-v1', LOCK='mi-bowling-f1-exclusive-writer-v1';
 const fail=m=>{throw Error(m)};const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
 function snapshot(storage){return Object.fromEntries(KEYS.map(k=>[k,storage.getItem(k)]));}
 function validateRawMap(map){if(!isObj(map)||Object.keys(map).length!==KEYS.length||KEYS.some(k=>!own(map,k)||(map[k]!==null&&typeof map[k]!=='string')))fail('Mapa de almacenamiento no válido.');return map;}
 function same(a,b){return KEYS.every(k=>a[k]===b[k]);}
 function put(storage,k,v){if(v===null)storage.removeItem(k);else storage.setItem(k,v);if(storage.getItem(k)!==v)fail('Escritura no verificable: '+k);}
 function readJournal(storage){const raw=storage.getItem(JOURNAL);if(raw===null)return null;let j;try{j=JSON.parse(raw)}catch{fail('Journal dañado: no abrir la aplicación.')}if(!isObj(j)||j.version!==1)fail('Journal incompatible.');validateRawMap(j.before);validateRawMap(j.after);return j;}
 function recover(storage){const j=readJournal(storage);if(!j)return false;const current=snapshot(storage);if(KEYS.some(k=>current[k]!==j.before[k]&&current[k]!==j.after[k]))fail('Conflicto en recuperación: conservar journal, no sobrescribir.');for(const k of KEYS){const v=storage.getItem(k);if(v!==j.before[k]&&v!==j.after[k])fail('Conflicto durante recuperación: '+k);if(v!==j.before[k])put(storage,k,j.before[k]);}if(!same(snapshot(storage),j.before))fail('Recuperación no verificable.');put(storage,JOURNAL,null);return true;}
 function create(storage,hasLock,onBlocked=()=>{}){
  if(typeof hasLock!=='function'||hasLock()!==true)fail('Sin bloqueo exclusivo.');
  recover(storage);let expected=snapshot(storage),blocked=false,maintenanceToken=null,maintenanceDone=Promise.resolve();
  function block(reason){if(!blocked){blocked=true;onBlocked(reason)}return false;}
  function assertAuthority(token=null){if(maintenanceToken!==token)fail('Restauración integral en curso o permiso caducado.');if(blocked||hasLock()!==true)fail('Autoridad de escritura no disponible.');if(!same(snapshot(storage),expected)||storage.getItem(JOURNAL)!==null){block('El almacenamiento cambió fuera de la autoridad.');fail('Estado obsoleto; no sobrescribir.')}return true;}
  function write(k,v){if(!KEYS.includes(k))fail('Clave no autorizada: '+k);if(v!==null&&typeof v!=='string')fail('Valor no válido.');assertAuthority();try{put(storage,k,v);expected[k]=v;}catch(e){if(storage.getItem(k)!==expected[k])block('Escritura incierta; recargar después de verificar.');throw e;}}
  function transaction(after,token=null){validateRawMap(after);assertAuthority(token);const before={...expected};if(same(before,after))return false;
   // Journal must exist and be readable before any target key is changed.
   try{put(storage,JOURNAL,JSON.stringify({version:1,before,after}));}catch(e){if(storage.getItem(JOURNAL)!==null)block('Journal no verificable.');throw e;}
   try{for(const k of KEYS){if(storage.getItem(k)!==before[k])fail('Cambio externo durante restauración: '+k);if(before[k]!==after[k])put(storage,k,after[k]);}if(!same(snapshot(storage),after))fail('Restauración no verificable.');put(storage,JOURNAL,null);expected={...after};return true;}
   catch(e){try{recover(storage);expected=snapshot(storage);if(!same(expected,before))fail('Rollback no verificable.');}catch(r){block('Recuperación pendiente; conservar journal.');throw r;}throw e;}
  }
  async function maintenance(run){assertAuthority();const token=Symbol('maintenance');maintenanceToken=token;let done;maintenanceDone=new Promise(r=>done=r);
   const access=Object.freeze({assertAuthority:()=>assertAuthority(token),snapshot:()=>{assertAuthority(token);return {...expected}},transaction:after=>transaction(after,token)});
   try{return await run(access)}finally{maintenanceToken=null;done();}
  }
  return Object.freeze({assertAuthority:()=>assertAuthority(),write,remove:k=>write(k,null),transaction:after=>transaction(after),snapshot:()=>{assertAuthority();return {...expected}},maintenance,whenIdle:()=>maintenanceDone,block,isBlocked:()=>blocked});
 }
 async function startBrowser({onBlocked,run}){
  if(!globalThis.isSecureContext||!navigator.locks?.request)throw Error('Web Locks no disponible: no se puede abrir sin protección de escritura.');
  let release,held=false,started=false,guard;const untilRelease=new Promise(r=>release=r);
  const close=()=>{held=false;Promise.resolve(guard?.whenIdle()).then(release)};
  window.addEventListener('pagehide',close,{once:true});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
  return navigator.locks.request(LOCK,{mode:'exclusive',ifAvailable:true},async lock=>{
   if(!lock)throw Error('Otra pestaña de MI BOWLING tiene el control. Ciérrala y recarga.');held=true;
   try{guard=create(localStorage,()=>held,onBlocked);window.MiBowlingEscritura=guard;
    window.addEventListener('storage',e=>{if(e.storageArea===localStorage&&(e.key===null||KEYS.includes(e.key)||e.key===JOURNAL))guard.block('Cambio externo detectado. Cierra la pestaña y revisa el respaldo antes de recargar.');});
    await run(guard);started=true;await untilRelease;
   }finally{held=false;if(!started)release();}
  });
 }
 return Object.freeze({KEYS,JOURNAL,LOCK,snapshot,validateRawMap,recover,create,startBrowser});
});
