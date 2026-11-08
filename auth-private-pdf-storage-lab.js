/* MI BOWLING · LAB A8 · Private PDF Storage contract (not wired to production).
 * Requires verified auth.getUser AND server RLS (simulated in tests).
 * No remote config, keys, buckets or accounts are ever created by this module.
 * Match "owner/patterns/<sha256>.pdf"; uploads immutable, never upsert.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.MiBowlingPrivatePdfStorageLAB=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const BUCKET='bowling-private-patterns-lab';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
 const HEX=/^[0-9a-f]{64}$/;
 const MAX=20*1024*1024;
 function validOwner(owner){if(typeof owner!=='string'||!UUID.test(owner))throw Error('UUID de propietario inválido');return owner}
 function validPath(owner,path){
  validOwner(owner);
  if(typeof path!=='string'||!path.startsWith(owner+'/patterns/'))
   throw Error('Storage denegado: ruta de otro propietario');
  const hash=path.slice((owner+'/patterns/').length).replace(/\.pdf$/,'');
  if(!HEX.test(hash)||path!==owner+'/patterns/'+hash+'.pdf')
   throw Error('Storage denegado: ruta PDF o SHA-256 inválido');
  return hash;
 }
 function bytesOf(b){
  if(b instanceof Uint8Array)return new Uint8Array(b);
  if(b instanceof ArrayBuffer)return new Uint8Array(b);
  if(ArrayBuffer.isView(b))return new Uint8Array(b.buffer,b.byteOffset,b.byteLength);
  throw Error('Storage exige bytes binarios del PDF');
 }
 function validatePdf(b){
  const bytes=bytesOf(b);
  if(bytes.length<8||bytes.length>MAX||String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')
   throw Error('PDF inválido o demasiado grande');
  return bytes;
 }
 async function hash(bytes,cryptoSource){
  const cryptoObj=cryptoSource||(typeof globalThis!=='undefined'?globalThis.crypto:null);
  if(!cryptoObj?.subtle?.digest)throw Error('Falta WebCrypto para comprobar PDF');
  const result=await cryptoObj.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(result),b=>b.toString(16).padStart(2,'0')).join('');
 }
 function absent(err){
  return String(err?.statusCode||err?.status||'')==='404' ||
   String(err?.code||'')==='404';
 }
 function duplicate(err){
  return String(err?.statusCode||err?.status||'')==='409' ||
   String(err?.code||'')==='409';
 }
 function create(client,{bucket=BUCKET,cryptoSource}={}){
  if(bucket!==BUCKET)throw Error('Bucket privado no autorizado por contrato');
  if(!client?.auth?.getUser||typeof client?.storage?.from!=='function')
   throw Error('Falta un proveedor privado verificable');
  const staged=new Set();
  async function identity(owner){
   validOwner(owner);
   const {data,error}=await client.auth.getUser();
   if(error||!data?.user?.id||data.user.id!==owner||
      !data.user.email_confirmed_at||data.user.is_anonymous)
    throw Error('Storage denegado: identidad no verificada');
  }
  const storage=()=>client.storage.from(bucket);
  async function read(owner,path){
   const expected=validPath(owner,path);
   await identity(owner);
   const {data,error}=await storage().download(path);
   if(error){if(absent(error)){await identity(owner);return null}
    throw Error('Storage denegó la descarga privada')}
   if(data===null||data===undefined)throw Error('Storage devolvió una descarga incompleta');
   let bytes;
   if(data?.arrayBuffer && typeof data.size==='number'){
    if(data.size<8||data.size>MAX)throw Error('Tamaño PDF inválido');
    bytes=new Uint8Array(await data.arrayBuffer());
   }else bytes=bytesOf(data);
   bytes=validatePdf(bytes);
   if(await hash(bytes,cryptoSource)!==expected)throw Error('Checksum privado PDF no coincide');
   await identity(owner); // changed owner during asynchronous data.arrayBuffer or download
   return bytes;
  }
  async function putNew(owner,path,data){
   const expected=validPath(owner,path);
   const bytes=validatePdf(data);
   if(await hash(bytes,cryptoSource)!==expected)
    throw Error('SHA-256 de ruta PDF distinto del contenido');
   await identity(owner);
   const result=await storage().upload(path,bytes,{
    contentType:'application/pdf',upsert:false,cacheControl:'0'
   });
   if(result?.error){
    if(!duplicate(result.error))throw Error('Storage denegó la subida del PDF');
    // Only regard 409 as safe de-duplication when the existing bytes match.
    const existing=await read(owner,path);
    if(!existing)throw Error('Conflicto PDF sin archivo verificable');
    return false;
   }
   if(result?.data?.path && result.data.path!==path)
    throw Error('Storage devolvió otra ruta: escritura no verificada');
   staged.add(owner+'|'+path);
   await identity(owner);
   return true;
  }
  async function remove(owner,path){
   validPath(owner,path);
   // Never grant general delete: only this exact in-process upload may be rolled back.
   if(!staged.has(owner+'|'+path))throw Error('El PDF no es un archivo temporal de esta migración');
   await identity(owner);
   const result=await storage().remove([path]);
   if(result?.error)throw Error('Storage denegó eliminación de PDF temporal');
   await identity(owner);
   staged.delete(owner+'|'+path);
  }
  return Object.freeze({read,putNew,remove,getContract:()=>Object.freeze({
   bucket:BUCKET,private:true,upsert:false,maxPdfBytes:MAX,
   readOnlyByOwner:true,publicUrls:false,signedUrls:false
  })});
 }
 return Object.freeze({create,BUCKET,MAX,validPath});
});
