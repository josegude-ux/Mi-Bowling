/* CP015: read-only backup on this origin, no remote requests, no restore side effect. */
(function(root){'use strict';
 const prefix='mi-bowling-';
 // CP018: require a readable database and all PDF references before declaring a complete export.
 const storage=()=>Object.fromEntries(Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).filter(k=>k&&k.startsWith(prefix)).sort().map(k=>[k,localStorage.getItem(k)]));
 const to64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)};
 const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 async function readPDFs(){return new Promise((resolve,reject)=>{
  let missing=false;const r=indexedDB.open('mi-bowling-patrones-pdf');
  r.onupgradeneeded=()=>{missing=true;r.transaction.abort()};
  r.onerror=()=>missing?resolve([]):reject(r.error);r.onblocked=()=>reject(Error('Base PDF bloqueada por otra ventana'));
  r.onsuccess=()=>{const db=r.result;if(!db.objectStoreNames.contains('pdf')){db.close();reject(Error('Almacén PDF inesperado'));return}
   const t=db.transaction('pdf','readonly'),s=t.objectStore('pdf'),records=[];const c=s.openCursor();
   c.onsuccess=()=>{const cur=c.result;if(cur){records.push([cur.key,cur.value]);cur.continue()}};
   t.oncomplete=()=>{db.close();resolve(records)};t.onabort=t.onerror=()=>{db.close();reject(t.error||Error('Lectura PDF interrumpida'))};
  };
 })}
 async function snapshot(){const first=storage();const raw=first['mi-bowling-analitica-v2']||first['mi-bowling-v1'];
  if(!raw)throw Error('No se encontró la base guardada. Guarda la partida o los datos antes de exportar.');
  const db=JSON.parse(raw);if(!db||!Array.isArray(db.sessions)||!Array.isArray(db.balls)|| (db.patterns!==undefined&&!Array.isArray(db.patterns)))throw Error('Base de datos local no reconocida');
  const expected=new Set((db.patterns||[]).filter(p=>p&&p.pdfName).map(p=>p.id));
  const pdfs=[];const ids=new Set();for(const [id,blob] of await readPDFs()){
  if(typeof id!=='string'||!(blob instanceof Blob))throw Error('Registro PDF inesperado; no se exporta una copia incompleta.');const bytes=new Uint8Array(await blob.arrayBuffer());if(!id||ids.has(id)||bytes.length<5||String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-')throw Error('PDF local inválido o duplicado: '+id);ids.add(id);pdfs.push({id,type:blob.type,bytes:bytes.length,sha256:await digest(bytes),base64:to64(bytes)})}
  for(const id of expected)if(!ids.has(id))throw Error('Falta un PDF adjunto en este dispositivo: '+id+'. Conserva el original y vuelve a adjuntarlo antes de exportar.');
  if(JSON.stringify(first)!==JSON.stringify(storage()))throw Error('Los datos han cambiado durante la copia. Cierra otras ventanas y repite.');
  return {format:'MI-BOWLING-BACKUP-COMPLETO',version:1,exportedAt:new Date().toISOString(),origin:location.origin,storage:first,pdfs};}
 async function download(){try{if(!confirm('Guarda la partida y cierra otras ventanas de MI BOWLING. La copia contiene datos personales locales. Guárdala en Archivos, no en un enlace público. ¿Continuar?'))return;
  const data=await snapshot(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='MI_BOWLING_COPIA_COMPLETA_'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){alert('No se pudo generar la copia completa: '+e.message)}}
 root.MiBowlingBackup=Object.freeze({snapshot,download});
})(window);
