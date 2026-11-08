/* MI BOWLING · LAB A7 · read-only PDF adapter for the *selected* local profile.
 * No IndexedDB writes, deletes, upgrades or enumeration of other profiles.
 * The real app does NOT load this module. Use only against an explicit source
 * and a pre-existing database; absent databases cause an upgrade abort.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.MiBowlingIdbPdfReaderLAB=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const MAX_BYTES=20*1024*1024;
 const namesFor=profile=>{
  if(profile==='legacy')return ['mi-bowling-patrones-pdf-legacy','mi-bowling-patrones-pdf'];
  if(/^p-[a-zA-Z0-9-]{3,100}$/.test(profile||''))return ['mi-bowling-patrones-pdf-'+profile];
  throw Error('Perfil local de origen no válido');
 };
 const isKey=key=>typeof key==='string'&&key.length>0&&key.length<=150;
 function create({indexedDB:factory,sourceProfileId,timeoutMs=12000,maxBytes=MAX_BYTES}={}){
  const idb=factory||(typeof indexedDB!=='undefined'?indexedDB:null);
  if(!idb||typeof idb.open!=='function')throw Error('IndexedDB no está disponible en este navegador');
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<250||timeoutMs>60000)throw Error('Tiempo de lectura inválido');
  if(!Number.isSafeInteger(maxBytes)||maxBytes<8||maxBytes>MAX_BYTES)throw Error('Límite de PDF no válido');
  const names=namesFor(sourceProfileId);
  let closed=false, readCount=0;
  function openKnown(name){
   return new Promise((resolve,reject)=>{
    let req,done=false,timer;
    const finish=(db,error)=>{
     if(done){try{db?.close?.()}catch(_){};return;}
     done=true;clearTimeout(timer);
     if(error){try{db?.close?.()}catch(_){};reject(error)}
     else resolve(db);
    };
    timer=setTimeout(()=>finish(null,Error('IndexedDB bloqueado o sin respuesta')),timeoutMs);
    try{
     req=idb.open(name); // no version: do NOT upgrade an existing database
     req.onupgradeneeded=()=>{
      // Opening an unknown name ordinarily CREATES it. Abort that transaction
      // BEFORE it completes; no new DB or object store may be persisted.
      try{req.transaction?.abort()}catch(_){}
     };
     req.onsuccess=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('pdf'))return finish(db,Error('La base no contiene el almacén PDF esperado'));
      db.onversionchange=()=>{try{db.close()}catch(_){}};
      finish(db,null);
     };
     req.onerror=()=>{
      // AbortError denotes our deliberate abort of an absent database.
      const absent=req.error?.name==='AbortError';
      const err=Error(absent?'Base PDF de origen no existente':'No se pudo abrir la base de PDF');
      err.code=absent?'ABSENT':'IDB_ERROR';
      finish(null,err);
     };
     req.onblocked=()=>finish(null,Error('Acceso a la base PDF bloqueado por otra pestaña'));
    }catch(_){finish(null,Error('Error al solicitar la base IndexedDB'))}
   });
  }
  async function readFrom(name,id){
   let db;
   try{db=await openKnown(name)}
   catch(err){if(err.code==='ABSENT')return {found:false,bytes:null};throw err}
   try{
    const value=await new Promise((resolve,reject)=>{
     let done=false;
     function settle(data,error){if(done)return;done=true;error?reject(error):resolve(data)}
     try{
      const tx=db.transaction(['pdf'],'readonly');
      const request=tx.objectStore('pdf').get(id);
      let content,ok=false;
      request.onsuccess=()=>{content=request.result;ok=true};
      request.onerror=()=>settle(null,Error('No se pudo leer el PDF'));
      tx.onabort=()=>settle(null,Error('Lectura PDF cancelada o corrupta'));
      tx.onerror=()=>settle(null,Error('Fallo en la transacción de lectura'));
      tx.oncomplete=()=>ok?settle(content,null):settle(null,Error('Lectura PDF incompleta'));
     }catch(_){settle(null,Error('No se pudo iniciar una lectura segura'))}
    });
    if(value===null||value===undefined)return {found:false,bytes:null};
    let bytes;
    if(value instanceof ArrayBuffer)bytes=new Uint8Array(value);
    else if(ArrayBuffer.isView(value))bytes=new Uint8Array(value.buffer,value.byteOffset,value.byteLength);
    else if(typeof value.arrayBuffer==='function'&&typeof value.size==='number'){
     if(value.size>maxBytes||value.size<8)throw Error('PDF demasiado grande o incompleto');
     if(value.type&&value.type!=='application/pdf')throw Error('Contenido almacenado no es PDF');
     bytes=new Uint8Array(await value.arrayBuffer());
    }else throw Error('Valor PDF almacenado con un formato desconocido');
    if(bytes.length<8||bytes.length>maxBytes)throw Error('PDF fuera del límite de tamaño');
    if(String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-')throw Error('Firma del PDF inválida');
    readCount++;
    return {found:true,bytes:new Uint8Array(bytes)};
   }finally{db.close();}
  }
  async function readPdf(id){
   if(closed)throw Error('Lector de PDF ya cerrado');
   if(!isKey(id))throw Error('ID de patrón inválido');
   for(const name of names){
    const found=await readFrom(name,id);
    if(found.found)return found.bytes; // legacy: scoped copy first, original fallback
   }
   return null; // capture() rejects this when a PDF is declared in pattern metadata
  }
  function close(){closed=true;}
  return Object.freeze({readPdf,close,getState:()=>({sourceProfileId,readCount,closed})});
 }
 return Object.freeze({create,namesFor,MAX_BYTES});
});
