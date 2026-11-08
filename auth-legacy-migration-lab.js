/* MI BOWLING · LAB A6 · Explicit legacy backup, checksummed migration and restore.
 * Pure transfer logic only: injected storage, repository and private file store.
 * NO production binding, no side effects on import, no remote service connections.
 * The SHA-256 is an integrity checksum, NOT an authorization/signature.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.MiBowlingMigrationLAB=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const PKEY='mi-bowling-analitica-v2';
 const LKEYS=['mi-bowling-liga-v1','mi-bowling-liga-acta-v32','mi-bowling-liga-rosters-v33','mi-bowling-quick-layout'];
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const PDF_MAX=20*1024*1024;
 const ACK='CONFIRMO_ASIGNACION_DE_ESTE_HISTORIAL';
 function fail(msg){throw Error(msg);}
 function requireOwner(id){if(typeof id!=='string'||!UUID.test(id))fail('UUID del propietario inválido');return id.toLowerCase();}
 function validProfile(id){return id==='legacy'||/^p-[a-zA-Z0-9-]{3,100}$/.test(id);}
 function plain(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
 function clone(value){return JSON.parse(JSON.stringify(value));}
 function canonical(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 }
 function bytesOf(value){
  if(value instanceof Uint8Array)return new Uint8Array(value);
  if(value instanceof ArrayBuffer)return new Uint8Array(value);
  if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength);
  fail('El PDF necesita bytes binarios');
 }
 function toBase64(bytes){
  const block=0x4000;let binary='';
  for(let i=0;i<bytes.length;i+=block)
   binary+=String.fromCharCode(...bytes.subarray(i,i+block));
  if(typeof btoa!=='function')fail('Se requiere codificación Base64 segura');
  return btoa(binary);
 }
 function fromBase64(b64){
  if(typeof b64!=='string'||!b64.length||b64.length%4!==0||
     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b64))
   fail('Base64 del PDF inválido');
  if(typeof atob!=='function')fail('El navegador no permite decodificar PDF');
  return Uint8Array.from(atob(b64),ch=>ch.charCodeAt(0));
 }
 function pdfCheck(bytes){
  if(bytes.length<8||bytes.length>PDF_MAX)fail('PDF incompleto o superior a 20 MB');
  const mark=String.fromCharCode(...bytes.slice(0,5));
  if(mark!=='%PDF-')fail('Firma PDF no válida');
 }
 function subtle(cryptoSource){
  const c=cryptoSource||globalThis.crypto;
  if(!c?.subtle?.digest)fail('SHA-256 requiere WebCrypto; no se ha guardado nada');
  return c.subtle;
 }
 async function digest(textOrBytes,cryptoSource){
  const bytes=typeof textOrBytes==='string'?new TextEncoder().encode(textOrBytes):bytesOf(textOrBytes);
  const hash=await subtle(cryptoSource).digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
 }
 function validatePersonal(data){
  if(!plain(data)||!Array.isArray(data.sessions)||!Array.isArray(data.balls)||!Array.isArray(data.patterns))
   fail('El historial requiere sesiones, bolas y patrones como listas');
  if(data.hand!==undefined&&!['diestro','zurdo'].includes(data.hand))fail('Mano de lanzamiento inválida');
  const uniq=(arr,title)=>{
   const ids=arr.map(x=>x?.id);
   if(ids.some(x=>typeof x!=='string'||!x||x.length>150)||new Set(ids).size!==ids.length)
    fail('IDs duplicados o inválidos en '+title);
  };
  uniq(data.sessions,'sesiones');uniq(data.balls,'bolas');uniq(data.patterns,'patrones');
  for(const session of data.sessions){
   if(!Array.isArray(session.games))fail('Sesión sin lista de partidas');
   uniq(session.games,'partidas');
   for(const game of session.games){
    if(!Array.isArray(game.rolls))fail('Partida sin lanzamientos');
    for(const roll of game.rolls){
     if(!Number.isInteger(roll.frame)||roll.frame<1||roll.frame>10||
        !Number.isInteger(roll.ball)||roll.ball<1||roll.ball>3||
        !Array.isArray(roll.pins)||new Set(roll.pins).size!==roll.pins.length||
        roll.pins.some(p=>!Number.isInteger(p)||p<1||p>10))
      fail('Puntuación o derribos de la partida inválidos');
    }
   }
  }
  const forbidden=['leagueNational','leagueRosters','matches','rosters','localPlayer'];
  if(forbidden.some(k=>Object.prototype.hasOwnProperty.call(data,k)))
   fail('Liga o propietario local mezclados con el historial personal');
  return true;
 }
 function summary(personal){
  validatePersonal(personal);
  const games=personal.sessions.flatMap(s=>s.games);
  const rolls=games.flatMap(g=>g.rolls);
  return {sessions:personal.sessions.length,games:games.length,
   rolls:rolls.length,pinHits:rolls.reduce((n,r)=>n+r.pins.length,0),
   balls:personal.balls.length,patterns:personal.patterns.length};
 }
 function scopedKey(source,key){
  return source==='legacy'?'mi-bowling-profile:legacy:'+key:
   'mi-bowling-profile:'+source+':'+key;
 }
 async function capture({storage,readPdf,sourceProfileId,ownerId,confirmOwnerId,acknowledge,
  cryptoSource}={}){
  const owner=requireOwner(ownerId);
  if(owner!==requireOwner(confirmOwnerId)||acknowledge!==ACK)
   fail('La asignación del historial al UUID requiere confirmación expresa');
  if(!validProfile(sourceProfileId))fail('Perfil local de origen desconocido');
  if(typeof storage?.getItem!=='function'||typeof readPdf!=='function')
   fail('No se ha proporcionado fuente de lectura segura');
  // Legacy copied values have priority. Never silently fall back to another profile.
  let raw=storage.getItem(scopedKey(sourceProfileId,PKEY));
  if(raw===null&&sourceProfileId==='legacy')raw=storage.getItem(PKEY);
  if(raw===null)fail('No se encontró el historial seleccionado; ningún otro perfil se ha leído');
  let parsed;
  try{parsed=JSON.parse(raw)}catch(_){fail('JSON del historial corrupto, no migrar');}
  // Older backups can contain League alongside personal fields; archive them
  // independently but NEVER insert them into "personal".
  const personal=clone(parsed);
  const fromExport={};
  for(const field of ['leagueNational','leagueRosters']){
   if(Object.prototype.hasOwnProperty.call(personal,field)){
    fromExport[field]=personal[field];delete personal[field];
   }
  }
  delete personal.localPlayer;
  delete personal.exportedAt;
  validatePersonal(personal);
  if(parsed.localPlayer?.id && parsed.localPlayer.id!==sourceProfileId)
   fail('El JSON identifica un perfil de origen diferente al seleccionado');
  const legacyLeague={...fromExport};
  for(const key of LKEYS){
   let rawLeague=storage.getItem(scopedKey(sourceProfileId,key));
   if(rawLeague===null&&sourceProfileId==='legacy')rawLeague=storage.getItem(key);
   if(rawLeague!==null){
    if(key==='mi-bowling-quick-layout')legacyLeague[key]=rawLeague;
    else{
     try{legacyLeague[key]=JSON.parse(rawLeague)}
     catch(_){fail('Datos antiguos de Liga corruptos en '+key);}
    }
   }
  }
  const files=[];
  for(const p of personal.patterns){
   const bytes=await readPdf(p.id); // Explicit read-only callback; never creates a database.
   if(bytes===null||bytes===undefined){
    if(p.pdfName)fail('PDF declarado pero ausente: '+p.id);
    continue;
   }
   const data=bytesOf(bytes);
   pdfCheck(data);
   files.push({
    id:p.id,name:String(p.pdfName||p.id+'.pdf').slice(0,180),
    bytesBase64:toBase64(data),sha256:await digest(data,cryptoSource),size:data.length
   });
  }
  const payload={
   format:'mi-bowling-lab-migration-v1',sourceProfileId,ownerId:owner,
   personal,leagueArchive:legacyLeague,files,stats:summary(personal)
  };
  const checksum=await digest(canonical(payload),cryptoSource);
  return {...payload,sha256:checksum};
 }
 async function verify(pkg,{ownerId,cryptoSource}={}){
  if(!plain(pkg)||pkg.format!=='mi-bowling-lab-migration-v1')fail('Formato de respaldo incorrecto');
  const owner=requireOwner(pkg.ownerId);
  if(ownerId!==undefined&&owner!==requireOwner(ownerId))fail('El respaldo pertenece a otro UUID');
  if(!validProfile(pkg.sourceProfileId)||!plain(pkg.leagueArchive)||!Array.isArray(pkg.files))
   fail('Manifiesto de respaldo malformado');
  validatePersonal(pkg.personal);
  const stat=summary(pkg.personal);
  if(canonical(stat)!==canonical(pkg.stats))fail('Estadísticas o totales alterados');
  const ids=new Set(), patterns=new Set(pkg.personal.patterns.map(x=>x.id));
  for(const file of pkg.files){
   if(!plain(file)||typeof file.id!=='string'||!patterns.has(file.id)||ids.has(file.id))
    fail('PDF ajeno o repetido');
   ids.add(file.id);
   if(typeof file.name!=='string'||file.name.length>180||
      !Number.isInteger(file.size)||file.size>PDF_MAX||file.size<8)
    fail('Metadatos PDF no válidos');
   const data=fromBase64(file.bytesBase64);
   pdfCheck(data);
   if(data.length!==file.size||await digest(data,cryptoSource)!==file.sha256)
    fail('Checksum PDF no válido');
  }
  for(const p of pkg.personal.patterns){
   if(p.pdfName&&!ids.has(p.id))fail('Falta PDF del patrón '+p.id);
  }
  const {sha256,...contents}=pkg;
  if(typeof sha256!=='string'||sha256!==await digest(canonical(contents),cryptoSource))
   fail('Checksum SHA-256 del respaldo no coincide');
  return Object.freeze({ownerId:owner,sha256,stats:stat});
 }
 function isEmpty(data){
  return Array.isArray(data?.sessions)&&data.sessions.length===0&&
   Array.isArray(data?.balls)&&data.balls.length===0&&
   Array.isArray(data?.patterns)&&data.patterns.length===0;
 }
 function documentFrom(pkg,owner){
  const doc=clone(pkg.personal);
  const refs=pkg.files.map(file=>({
   patternId:file.id,ownerId:owner,path:owner+'/patterns/'+file.sha256+'.pdf',
   sha256:file.sha256,size:file.size
  }));
  doc.patternPdfRefs=refs;
  doc.migrationReceipt={packageSha256:pkg.sha256,sourceProfileId:pkg.sourceProfileId,ownerId:owner};
  return doc;
 }
 function requireDeps(repository,fileStore){
  if(typeof repository?.load!=='function'||typeof repository?.write!=='function'||
     typeof fileStore?.read!=='function'||typeof fileStore?.putNew!=='function'||
     typeof fileStore?.remove!=='function')
   fail('Faltan repositorio o almacén binario privado verificados');
 }
 async function backupRemote({ownerId,repository,fileStore,cryptoSource}={}){
  const owner=requireOwner(ownerId);requireDeps(repository,fileStore);
  const remote=await repository.load(owner);
  if(remote.owner!==owner)fail('Propietario remoto distinto');
  const personal=remote.personal.payload;
  validatePersonal(personal);
  const pdfs=[];
  for(const ref of personal.patternPdfRefs||[]){
   if(ref.ownerId!==owner||ref.path!==owner+'/patterns/'+ref.sha256+'.pdf')
    fail('Referencia PDF de otro propietario');
   const bytes=await fileStore.read(owner,ref.path);
   if(!bytes)fail('Falta un PDF de la copia remota');
   const data=bytesOf(bytes);
   pdfCheck(data);
   if(data.length!==ref.size||await digest(data,cryptoSource)!==ref.sha256)
    fail('PDF de copia remota dañado');
   pdfs.push({id:ref.patternId,name:ref.patternId+'.pdf',bytesBase64:toBase64(data),
    sha256:ref.sha256,size:data.length});
  }
  const snap={ownerId:owner,personal:clone(personal),pdfs,revision:remote.personal.revision,
   source:'private-document',docSha256:await digest(canonical(personal),cryptoSource)};
  return {...snap,sha256:await digest(canonical(snap),cryptoSource)};
 }
 async function verifyRemoteBackup(backup,{ownerId,cryptoSource}={}){
  const owner=requireOwner(ownerId);
  if(!plain(backup)||backup.source!=='private-document'||backup.ownerId!==owner||
    !Array.isArray(backup.pdfs)||!Number.isInteger(backup.revision)&&backup.revision!==null)
   fail('Respaldo previo incompatible con el propietario');
  validatePersonal(backup.personal);
  for(const file of backup.pdfs){
   const data=fromBase64(file.bytesBase64);pdfCheck(data);
   if(data.length!==file.size||await digest(data,cryptoSource)!==file.sha256)
    fail('Respaldo PDF previo dañado');
  }
  if(backup.docSha256!==await digest(canonical(backup.personal),cryptoSource))
   fail('Documento previo modificado');
  const {sha256,...body}=backup;
  if(sha256!==await digest(canonical(body),cryptoSource))fail('Respaldo previo alterado');
  return true;
 }
 async function apply({pkg,ownerId,repository,fileStore,mode='import',beforeBackup=null,
  expectedRevision=null,acknowledge,cryptoSource}={}){
  const owner=requireOwner(ownerId);
  requireDeps(repository,fileStore);
  if(acknowledge!==ACK)fail('Operación sin confirmación expresa');
  await verify(pkg,{ownerId:owner,cryptoSource});
  const old=await repository.load(owner);
  if(old.owner!==owner)fail('Identidad de usuario no validada');
  const present=old.personal;
  if(mode==='import'){
   if(!isEmpty(present.payload))fail('Destino no vacío; no sobrescribir partidas existentes');
  }else if(mode==='restore'){
   if(!beforeBackup)fail('Restaurar exige una copia recuperable del estado anterior');
   await verifyRemoteBackup(beforeBackup,{ownerId:owner,cryptoSource});
   if(beforeBackup.revision!==present.revision||expectedRevision!==present.revision)
    fail('Conflicto de versión: el estado cambió después del respaldo');
   if(beforeBackup.docSha256!==await digest(canonical(present.payload),cryptoSource))
    fail('El respaldo previo no corresponde al contenido actual');
  }else fail('Modo de importación desconocido');
  const expected=present.revision;
  if(mode==='import'&&expectedRevision!==null&&expectedRevision!==expected)
   fail('Conflicto de versión de importación');
  const payload=documentFrom(pkg,owner);
  const created=[];
  let committed=false,maybeCommitted=false;
  try{
   for(const file of pkg.files){
    const path=owner+'/patterns/'+file.sha256+'.pdf';
    const bytes=fromBase64(file.bytesBase64);
    const wasCreated=await fileStore.putNew(owner,path,bytes); // never overwrite an existing PDF
    if(wasCreated)created.push(path);
    const check=await fileStore.read(owner,path);
    if(!check||await digest(bytesOf(check),cryptoSource)!==file.sha256)
     fail('No se verificó el respaldo privado del PDF');
   }
   // A single CAS write of the personal document; League remains untouched.
   const revision=await repository.write(owner,'personal',payload,expected);
   committed=true;
   const confirmed=await repository.load(owner);
   if(confirmed.personal.revision!==revision||
      await digest(canonical(confirmed.personal.payload),cryptoSource)!==
      await digest(canonical(payload),cryptoSource))fail('La lectura posterior no coincide');
   return Object.freeze({ownerId:owner,revision,packageSha256:pkg.sha256,
    status:'verified',stats:summary(payload),pdfs:pkg.files.length,leagueUnchanged:true});
  }catch(err){
   if(committed)throw Error('Datos ya guardados pero no verificados; conserva los respaldos y no reintentes a ciegas: '+err.message);
   // A failed network acknowledgement can hide a successful remote commit.
   // Do not remove PDFs unless a fresh read PROVES the new document is absent.
   let canClean=false;
   try{
    const refreshed=await repository.load(owner);
    const after=refreshed.personal.payload;
    if(after?.migrationReceipt?.packageSha256===pkg.sha256){
     maybeCommitted=true;
    }else if(refreshed.personal.revision===expected&&
      await digest(canonical(after),cryptoSource)===
      await digest(canonical(present.payload),cryptoSource))canClean=true;
   }catch(_){}
   if(maybeCommitted)throw Error('El servidor pudo guardar la migración; conservar PDFs y verificar manualmente antes de reintentar');
   if(canClean){
    const failures=[];
    for(const path of created.reverse()){
     try{await fileStore.remove(owner,path)}catch(_){failures.push(path)}
    }
    if(failures.length)throw Error('Error con limpieza incompleta: conservar y revisar '+failures.length+' PDF');
   }
   throw Error('Migración no confirmada, originales conservados. '+err.message);
  }
 }
 return Object.freeze({ACK,capture,verify,backupRemote,verifyRemoteBackup,apply,summary,digest,canonical});
});
