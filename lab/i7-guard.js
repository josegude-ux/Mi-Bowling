/* MI BOWLING · Integración LAB I7 · Guard first, fail closed.
 * No localStorage/sessionStorage/IndexedDB from the visitor may be inspected.
 * Encrypted journal captures IDB BEFORE this guard; guard hides native IDB
 * from all simulated auth/profile/main scripts, which see undefined.
 */
(function(root){
'use strict';
const document=root.document;
if(!root.MiBowlingI7EncryptedJournal)throw Error('I7: módulo cifrado no cargado antes del guard');
const error=message=>{
 document.body.dataset.labIsolation='FAIL';
 const node=document.getElementById('lab-safety-status');
 if(node){node.textContent='LAB BLOQUEADO: '+message;node.hidden=false;}
};
if(!/\/lab\/integracion-main-auth-i7\.html$/.test(root.location.pathname)){
 error('Ruta de demostración no reconocida');return;
}
function fakeStorage(){
 const map=new Map();
 return Object.freeze({
  getItem:k=>map.has(String(k))?map.get(String(k)):null,
  setItem:(k,v)=>{map.set(String(k),String(v))},
  removeItem:k=>{map.delete(String(k))},
  clear:()=>map.clear(),
  key:n=>[...map.keys()][n]??null,
  get length(){return map.size}
 });
}
const virtualLocal=fakeStorage(),virtualSession=fakeStorage();
try{
 Object.defineProperty(root,'localStorage',{configurable:true,value:virtualLocal});
 Object.defineProperty(root,'sessionStorage',{configurable:true,value:virtualSession});
 Object.defineProperty(root,'indexedDB',{configurable:true,value:undefined});
 if(root.localStorage!==virtualLocal||root.sessionStorage!==virtualSession||
    root.indexedDB!==undefined)
  throw Error('El aislamiento de datos no es compatible con este navegador');
 // A new PWA must NEVER be registered by the integration harness. The main
 // application is only injected after an explicit fictitious login.
 const blockedSW=Object.freeze({
  controller:null,
  addEventListener(){/* no-op: main's controllerchange listener remains isolated */},
  register:async()=>{throw Error('PWA LAB bloqueada')}
 });
 Object.defineProperty(root.navigator,'serviceWorker',{configurable:true,value:blockedSW});
 if(root.navigator.serviceWorker!==blockedSW)throw Error('No se pudo bloquear Service Worker');
 // app.js uses storage APIs and navigator.serviceWorker checks; both are fenced.
 root.MiBowlingI2Isolation=Object.freeze({
  local:virtualLocal,session:virtualSession,
  status:()=>({ready:document.body.dataset.labIsolation==='PASS',virtualOnly:true,
   hasIndexedDB:root.indexedDB!==undefined,serviceWorkerBlocked:root.navigator.serviceWorker===blockedSW})
 });
 document.body.dataset.labIsolation='PASS';
}catch(err){error(err.message);}
})(window);
