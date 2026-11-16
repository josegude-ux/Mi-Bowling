'use strict';
/* MI BOWLING · BOWLING-CATALOGO-LOCAL-001 · Fase 1 · sin efectos al cargar.
   Conserva la clave histórica del catálogo y la forma db.balls. Sin red ni DOM. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MiBowlingCatalogoModelo=api;})(typeof globalThis==='object'?globalThis:this,function(){
 const KEY='mi-bowling-plantilla-100-v1', DB_KEY='mi-bowling-analitica-v2', VERSION=2;
 const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const copy=x=>JSON.parse(JSON.stringify(x));
 const nonempty=x=>typeof x==='string'&&x.trim().length>0;
 const fail=m=>{throw new Error(m)};
 const origins=new Set(['own','official','illustration','none']);
 const safeUrl=x=>{if(!nonempty(x))return '';try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
 const safePath=(x,origin)=>{const dirs={own:'propia',official:'oficial',illustration:'ilustracion'};return typeof x==='string'&&dirs[origin]&&new RegExp('^catalogo/'+dirs[origin]+'/(?:miniaturas/)?[a-z0-9][a-z0-9_-]*\\.(?:webp|svg)$').test(x)?x:''};
 function record(input){
  if(!obj(input)||!nonempty(input.id)||!nonempty(input.brand)||!nonempty(input.model))fail('Ficha inválida: ID, marca y modelo necesarios en almacenamiento.');
  const r=copy(input); // Preserve exact identity, legacy data and verified-source metadata.
  const defaults={year:null,cover:null,coverType:null,core:null,coreType:null,rg:null,diff:null,intermediateDiff:null,finish:null,availableWeights:[],specificationsByWeight:{},specWeight:null,notes:'',imagePath:'',thumbnail:'',imageOrigin:'none',imageSourceUrl:'',officialUrl:'',sku:null,edition:null};
  for(const [key,value] of Object.entries(defaults))if(!own(r,key))r[key]=value;
  if(!origins.has(r.imageOrigin))fail('Origen de imagen desconocido.');
  // Legacy image / imageSource / technicalSource remain untouched, not reclassified.
  // A legacy URL is not a local file nor proof of permission. New fields stay empty.
  if(r.imagePath&&!safePath(r.imagePath,r.imageOrigin))fail('Ruta local inválida.');
  if(r.thumbnail&&!safePath(r.thumbnail,r.imageOrigin))fail('Miniatura local inválida.');
  if(r.imageSourceUrl&&!safeUrl(r.imageSourceUrl))fail('Fuente inválida.');
  if(r.officialUrl&&!safeUrl(r.officialUrl))fail('Ficha oficial inválida.');
  if(!Array.isArray(r.availableWeights)||!obj(r.specificationsByWeight))fail('Pesos inválidos.');
  return r;
 }
 function newRecord(input,catalog,idFactory){
  if(!obj(input)||!nonempty(input.brand)||!nonempty(input.model))fail('Marca y modelo necesarios.');
  const id=nonempty(input.id)?input.id:(typeof idFactory==='function'?idFactory():globalThis.crypto?.randomUUID?.());
  if(!nonempty(id))fail('No se pudo generar ID de catálogo.');
  if(catalog&&lookup(catalog,id))fail('ID existente; no añadir una segunda ficha.');
  return record({...input,id});
 }
 function migrate(snapshot,seeds,seedMeta={}){
  if(snapshot!==null&&(!obj(snapshot)||!Array.isArray(snapshot.records)))fail('Catálogo inválido; no sustituir por semillas.');
  if(snapshot!==null&&own(snapshot,'schemaVersion')&&![1,VERSION].includes(snapshot.schemaVersion))fail('Versión de catálogo no compatible.');
  if(snapshot===null&&!Array.isArray(seeds))fail('Semillas originales necesarias.');
  const out=snapshot===null?{records:copy(seeds),meta:copy(seedMeta),archive:[]}:copy(snapshot);
  if(!own(out,'archive'))out.archive=[];
  if(!Array.isArray(out.archive))fail('Archivo histórico inválido.');
  const ids=new Set();
  for(const name of ['records','archive'])out[name]=out[name].map(x=>{const r=record(x);if(ids.has(r.id))fail('ID de catálogo duplicado; revisión manual.');ids.add(r.id);return r});
  out.schemaVersion=VERSION;return out;
 }
 function decode(raw,seeds,meta){if(raw===null)return migrate(null,seeds,meta);let v;try{v=JSON.parse(raw)}catch{fail('Catálogo dañado: se conserva el original.')}return migrate(v,seeds,meta)}
 function lookup(catalog,id){return [...catalog.records,...catalog.archive].find(r=>r.id===id)||null}
 function assertDb(db){if(!obj(db)||!Array.isArray(db.balls)||!Array.isArray(db.sessions)||!Array.isArray(db.patterns))fail('Base personal inválida.');const ids=new Set();for(const b of db.balls){if(!obj(b)||!nonempty(b.id)||ids.has(b.id))fail('ID personal inválido o duplicado.');ids.add(b.id)}}
 function project(catalog,db,id){assertDb(db);const r=lookup(catalog,id);if(!r)return null;const units=db.balls.filter(b=>b.catalogId===id);return {...copy(r),mi_bola:units.some(b=>!b.retired),userBallIds:units.map(b=>b.id),activeUserBallIds:units.filter(b=>!b.retired).map(b=>b.id)}}
 function planLink(db,catalog,{ballId,catalogId,confirmed=false,replace=false}={}){
  assertDb(db);const b=db.balls.find(x=>x.id===ballId);if(!b)fail('Bola personal inexistente.');
  if(!lookup(catalog,catalogId))fail('Ficha inexistente.');
  if(b.catalogId===catalogId)return {changed:false,db:copy(db)};
  if(confirmed!==true)fail('Identidad de unidad y variante requiere confirmación explícita.');
  if(b.catalogId&&replace!==true)fail('La bola ya está vinculada: sustitución no autorizada.');
  const next=copy(db);next.balls.find(x=>x.id===ballId).catalogId=catalogId;return {changed:true,db:next};
 }
 function planUnlink(db,{ballId,confirmed=false}={}){assertDb(db);const b=db.balls.find(x=>x.id===ballId);if(!b)fail('Bola personal inexistente.');if(!own(b,'catalogId'))return {changed:false,db:copy(db)};if(confirmed!==true)fail('Desvinculación requiere confirmación.');const next=copy(db);delete next.balls.find(x=>x.id===ballId).catalogId;return {changed:true,db:next};}
 function issues(catalog,db){assertDb(db);return db.balls.filter(b=>own(b,'catalogId')&&!lookup(catalog,b.catalogId)).map(b=>({ballId:b.id,catalogId:b.catalogId,reason:'referencia no disponible; conservar vínculo'}))}
 // Migration uses one existing key. No primary DB write, no clear(), no fallback on errors.
 // Caller must own the authorized write guard; this optimistic check is NOT a cross-tab lock.
 function prepareCatalog(storage,seeds,meta){const raw=storage.getItem(KEY);const value=decode(raw,seeds,meta);return {key:KEY,expected:raw,value,encoded:JSON.stringify(value)}}
 function commitCatalog(storage,plan,{assertAuthority}={}){if(typeof assertAuthority!=='function'||assertAuthority()!==true)fail('Sin autoridad de escritura del catálogo.');if(!plan||plan.key!==KEY||typeof plan.encoded!=='string'||JSON.stringify(plan.value)!==plan.encoded)fail('Plan de migración inválido.');if(storage.getItem(KEY)!==plan.expected)fail('El catálogo cambió; volver a leer.');if(plan.encoded===plan.expected)return false;storage.setItem(KEY,plan.encoded);if(storage.getItem(KEY)!==plan.encoded)fail('Guardado no verificable; no reintentar ni sobrescribir automáticamente.');return true}
 // No independent writer for db.balls: the host must persist the plan using CP020's guard.
 return Object.freeze({KEY,DB_KEY,VERSION,record,newRecord,migrate,decode,lookup,project,planLink,planUnlink,issues,prepareCatalog,commitCatalog});
});
