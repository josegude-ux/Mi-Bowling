'use strict';
/* Complemento de exportación, no restaurador. Conserva CP015 y el JSON local anterior.
 * Lee todos los valores locales del prefijo y los PDF existentes en una transacción IDB
 * de solo lectura; no crea bases, no modifica ni borra ninguna clave. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MiBowlingRespaldoPDF=factory();})(globalThis,function(){
 const SCHEMA='mi-bowling-respaldo-extendido-f1-v1',DATABASE='mi-bowling-patrones-pdf',STORE='pdf',LIMIT=100*1024*1024;
 const fail=m=>{throw Error(m)};
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function prefixSnapshot(storage){const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(typeof k==='string'&&k.startsWith('mi-bowling-'))keys.push(k);}const raw=Object.create(null);for(const k of [...new Set(keys)].sort()){const v=storage.getItem(k);if(typeof v!=='string')fail('Almacenamiento modificado durante la lectura.');raw[k]=v;}return raw;}
 async function readPDFs(idb){if(!idb?.open)fail('IndexedDB no disponible.');return new Promise((resolve,reject)=>{let absent=false;const r=idb.open(DATABASE);r.onupgradeneeded=()=>{absent=true;r.transaction.abort();};r.onblocked=()=>reject(Error('Base PDF bloqueada.'));r.onerror=()=>absent?resolve([]):reject(r.error||Error('No se pudo abrir IndexedDB.'));r.onsuccess=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE)){d.close();reject(Error('Almacén PDF no disponible.'));return;}let t;try{t=d.transaction(STORE,'readonly');const s=t.objectStore(STORE),keys=s.getAllKeys(),values=s.getAll();t.oncomplete=()=>{d.close();if(keys.result.length!==values.result.length){reject(Error('Lectura de PDF incompleta.'));return;}resolve(keys.result.map((id,i)=>({id,blob:values.result[i]})));};t.onerror=t.onabort=()=>{d.close();reject(t.error||Error('Lectura de PDF interrumpida.'));};}catch(e){d.close();reject(e);}};});}
 function toBase64(bytes){let out='';for(let i=0;i<bytes.length;i+=0x8000)out+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(out);}
 async function build({guard,storage,localBundle,read=readPDFs,idb=globalThis.indexedDB,crypto=globalThis.crypto,ready=()=>true}){
  if(!guard||!ready())fail('Estado de aplicación no apto para respaldo.');guard.assertAuthority();const before=prefixSnapshot(storage),managed=guard.snapshot();
  if(!localBundle?.localBackup?.raw||!same(managed,localBundle.localBackup.raw))fail('La copia local y su origen no coinciden.');
  const list=await read(idb);if(!Array.isArray(list))fail('Lectura PDF inválida.');const pdfs=[],ids=new Set();let size=0;
  for(const {id,blob} of list){if(typeof id!=='string'||!id||ids.has(id)||!blob||typeof blob.arrayBuffer!=='function'||!Number.isSafeInteger(blob.size)||blob.size<0)fail('Entrada PDF inválida.');ids.add(id);size+=blob.size;if(size>LIMIT)fail('PDF demasiado grandes para un respaldo único (100 MiB). Descarga los originales por separado.');const bytes=new Uint8Array(await blob.arrayBuffer());if(bytes.length!==blob.size)fail('Lectura PDF incompleta.');const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');pdfs.push({id,type:blob.type||'',size:bytes.length,sha256,base64:toBase64(bytes)});}
  const missing=(localBundle.patterns||[]).filter(p=>p.pdfName&&!ids.has(p.id)).map(p=>p.id);if(missing.length)fail('Faltan PDF asociados a patrones; no certificar copia integral.');
  guard.assertAuthority();if(!ready()||!same(before,prefixSnapshot(storage))||!same(managed,guard.snapshot()))fail('Los datos cambiaron durante la exportación.');
  return {schema:SCHEMA,createdAt:new Date().toISOString(),local:localBundle,rawAll:before,indexedDB:{name:DATABASE,store:STORE,pdfs},limitations:['No es una transacción atómica entre LocalStorage e IndexedDB.','No incluye CacheStorage ni borradores sin guardar.','No importar con el restaurador JSON de partidas: requiere recuperación separada de PDF.']};
 }
 return Object.freeze({SCHEMA,prefixSnapshot,readPDFs,build});
});
