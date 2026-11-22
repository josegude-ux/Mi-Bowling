/* MI BOWLING CP018 — persistencia IndexedDB exclusivamente para laboratorio sintético.
 * NO es un módulo de producción. NO utiliza las claves de MI BOWLING ni localStorage.
 * Reutiliza CP013/CP014/CP016 intactos cargados antes de este archivo.
 */
(function(root){
'use strict';
const A=root.BowlingCp014Compat, C=root.BowlingCp016Coexist;
if(!A||!C)throw Error('CP018_REQUIERE_CP014_CP016_ORIGINALES');
if(!['localhost','127.0.0.1'].includes(root.location?.hostname))throw Error('CP018_ORIGIN_MUST_BE_LOCALHOST');
const BASE='mi-bowling-cp018-synthetic-', DB_NAME=BASE+'v3', MAX_BYTES=1048576;
const copy=x=>JSON.parse(JSON.stringify(x));
const eq=(a,b)=>canonical(a)===canonical(b);
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(plain(x))return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x);}
async function digest(text){const b=new TextEncoder().encode(text);const hash=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('')}
function sourcePreflight(raw){
 assert(plain(raw)&&Object.keys(raw).sort().join(',')==='legacy,modern','CP018_ORIGEN_ESTRUCTURA');
 for(const k of ['legacy','modern']){
  const s=raw[k];assert(s===null||typeof s==='string','CP018_ORIGEN_TEXTO_'+k);
  if(s!==null)assert(new TextEncoder().encode(s).length<=MAX_BYTES,'CP018_LIMITE_'+k);
 }
 assert(raw.legacy!==null||raw.modern!==null,'CP018_FUENTE_AUSENTE');
 return C.analyse({legacy:raw.legacy,modern:raw.modern});
}
function metadata(raw){
 const legacy=raw.legacy===null?null:JSON.parse(raw.legacy),modern=raw.modern===null?null:JSON.parse(raw.modern);
 const hands=[legacy?.hand,modern?.hand].filter(Boolean);
 assert(hands.every(x=>x==='diestro'||x==='zurdo')&&new Set(hands).size<=1,'CP018_MANO_INVALIDA_O_CONFLICTIVA');
 const combined={};
 for(const key of ['balls','patterns']){
  const seen=new Set();combined[key]=[];
  for(const doc of [legacy,modern])for(const x of (doc?.[key]||[])){
   assert(plain(x)&&typeof x.id==='string'&&/^cp0(15|16)-fake-[a-z\d-]+$/i.test(x.id),'CP018_META_NO_FICTICIA_'+key);
   assert(!seen.has(x.id),'CP018_META_COLISION_'+key);seen.add(x.id);combined[key].push(copy(x));
  }
 }
 const envelope={};
 for(const [name,doc] of [['legacy',legacy],['modern',modern]]){
  if(doc===null){envelope[name]=null;continue}
  const meta=copy(doc);for(const k of ['sessions','balls','patterns'])delete meta[k];envelope[name]=meta;
 }
 return {hand:hands[0]||'diestro',balls:combined.balls,patterns:combined.patterns,sourceEnvelope:envelope};
}
function fail(at,requested){if(at===requested)throw Error('CP018_SIMULATED_CRASH_'+at)}
function req(r){return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
class CP018Store{
 constructor(name=DB_NAME){assert(typeof name==='string'&&name.startsWith(BASE)&&/^[a-z0-9-]+$/.test(name),'CP018_DB_NAMESPACE_DENIED');this.name=name;this.db=null}
 async open(){if(this.db)return this;
  this.db=await new Promise((resolve,reject)=>{const request=indexedDB.open(this.name,1);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('records'))request.result.createObjectStore('records',{keyPath:'key'})};
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
   request.onblocked=()=>reject(Error('CP018_DB_BLOCKED'));
  });return this;
 }
 close(){if(this.db)this.db.close();this.db=null}
 async row(key){await this.open();return new Promise((resolve,reject)=>{
  const tx=this.db.transaction('records','readonly'),r=tx.objectStore('records').get(key);let value;
  r.onsuccess=()=>{value=r.result?.value};tx.oncomplete=()=>resolve(value===undefined?null:copy(value));tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 })}
 async put(key,value){await this.open();return new Promise((resolve,reject)=>{
  const tx=this.db.transaction('records','readwrite');tx.objectStore('records').put({key,value:copy(value)});
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 })}
 async del(key){await this.open();return new Promise((resolve,reject)=>{
  const tx=this.db.transaction('records','readwrite');tx.objectStore('records').delete(key);
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 })}
 async keys(){await this.open();return new Promise((resolve,reject)=>{
  const tx=this.db.transaction('records','readonly');let found;
  const r=tx.objectStore('records').getAllKeys();r.onsuccess=()=>{found=r.result};tx.oncomplete=()=>resolve(found);tx.onerror=()=>reject(tx.error);
 })}
 async seed(legacyRaw,modernRaw){
  const raw={legacy:legacyRaw??null,modern:modernRaw??null};sourcePreflight(raw);metadata(raw);
  const existing=await this.row('sources');
  if(existing){assert(eq(existing,raw),'CP018_FUENTES_DISTINTAS_NO_SOBRESCRIBIR');return {seeded:false,immutable:true}}
  await this.put('sources',raw);return {seeded:true,immutable:true};
 }
 async _identity(){const raw=await this.row('sources');assert(raw,'CP018_SIN_FUENTES');const analysed=sourcePreflight(raw);
  const hashes={legacy:raw.legacy===null?null:await digest(raw.legacy),modern:raw.modern===null?null:await digest(raw.modern)};
  const txid=(await digest(canonical(hashes))).slice(0,24);
  return {raw,analysed,hashes,txid};
 }
 async _verifyBackup(b,id){assert(plain(b)&&b.format==='cp017-backup-v1'&&b.txid===id,'CP018_BACKUP_FORMATO');
  for(const k of ['legacy','modern'])assert((b.raw[k]===null?null:await digest(b.raw[k]))===b.sourceHashes[k],'CP018_BACKUP_HASH_ORIGEN_'+k);
  assert(b.seal===await digest(canonical({id,raw:b.raw,sourceHashes:b.sourceHashes})),'CP018_BACKUP_CORRUPTO');return b;
 }
 async _verifyShadow(s,id){assert(plain(s)&&s.format==='cp017-shadow-v1'&&s.txid===id,'CP018_SOMBRA_FORMATO');
  assert(s.seal===await digest(canonical({id,document:s.document,sourceHashes:s.sourceHashes})),'CP018_SOMBRA_CORRUPTA');
  A.validateDocument(s.document);return s;
 }
 async stage(failAt=null){const info=await this._identity();const {raw,analysed,hashes,txid:id}=info;
  metadata(raw);let backup=await this.row('backup:'+id);
  if(backup){await this._verifyBackup(backup,id);assert(eq(backup.sourceHashes,hashes)&&eq(backup.raw,raw),'CP018_BACKUP_FUENTE_DESACTUALIZADA')}
  else{
   backup={format:'cp017-backup-v1',txid:id,raw:copy(raw),sourceHashes:copy(hashes)};
   backup.seal=await digest(canonical({id,raw:backup.raw,sourceHashes:backup.sourceHashes}));
   await this.put('backup:'+id,backup);
  }
  fail('afterBackup',failAt);
  let shadow=await this.row('shadow:'+id);
  if(shadow){await this._verifyShadow(shadow,id);assert(eq(shadow.sourceHashes,hashes),'CP018_SOMBRA_FUENTES_DESACTUALIZADAS')}
  else{
   const legacy=raw.legacy===null?null:A.fromLegacyV2(JSON.parse(raw.legacy));
   const modern=raw.modern===null?null:A.roundTripJSON(JSON.parse(raw.modern));
   if(legacy)assert(eq(A.toLegacyV2(legacy),JSON.parse(raw.legacy)),'CP018_V2_NO_REVERSIBLE');
   const m=metadata(raw);const doc={format:A.FORMAT,version:3,labFixture:C.MARK,hand:m.hand,balls:m.balls,
    patterns:m.patterns,sourceEnvelope:m.sourceEnvelope,sessions:[...(legacy?.sessions||[]),...(modern?.sessions||[])].map(copy)};
   A.validateDocument(doc);const summary=A.summary(doc),ref=analysed.stats;
   for(const k of ['totalGames','qualifyingGames','averageScore','bestScore','frameAnalysisEligibleGames','pinPatternEligibleGames','finalOnlyGames'])
    assert(summary[k]===ref[k],'CP018_CAMBIO_ESTADISTICAS_'+k);
   shadow={format:'cp017-shadow-v1',txid:id,sourceHashes:copy(hashes),document:doc};
   shadow.seal=await digest(canonical({id,document:doc,sourceHashes:hashes}));
   await this.put('shadow:'+id,shadow);
  }
  fail('afterShadow',failAt);
  return {transaction:id,mode:'PREPARED',backupSeal:backup.seal,shadowSeal:shadow.seal,recordKeys:(await this.keys()).sort()};
 }
 async activate(failAt=null){const s=await this.stage(),identity=await this._identity();
  assert(s.transaction===identity.txid,'CP018_ORIGEN_CAMBIO_CONCURRENCIA');
  await this.put('active',{txid:s.transaction}); // commit singular final: cualquier fallo anterior deja lectura dual
  fail('afterPointer',failAt);
  return {mode:'shadow-v3',transaction:s.transaction};
 }
 async read(){const info=await this._identity(),active=await this.row('active');
  if(active){try{
   assert(typeof active.txid==='string'&&active.txid===info.txid,'CP018_PUNTERO_INVALIDO');
   const b=await this._verifyBackup(await this.row('backup:'+active.txid),active.txid);
   const shadow=await this._verifyShadow(await this.row('shadow:'+active.txid),active.txid);
   assert(eq(b.raw,info.raw)&&eq(b.sourceHashes,info.hashes)&&eq(shadow.sourceHashes,info.hashes),'CP018_CAMBIO_FUENTE');
   return {mode:'shadow-v3',stats:A.summary(shadow.document),transaction:info.txid,recoveryRequired:false};
  }catch(e){return {mode:'dual-read',stats:copy(info.analysed.stats),recoveryRequired:true,reason:String(e.message)}}}
  return {mode:'dual-read',stats:copy(info.analysed.stats),recoveryRequired:false};
 }
 async recover(){const before=await this.read();
  if(before.recoveryRequired){await this.del('active');return {...await this.read(),reverted:true,reason:before.reason}}
  if(before.mode==='dual-read'){await this.stage();return {mode:'dual-read',reprepared:true}}
  return {mode:'shadow-v3',resumed:true};
 }
 async rollback(){await this.del('active');return this.read()}
 async exportBackup(){const info=await this.stage();const data=await this._verifyBackup(await this.row('backup:'+info.transaction),info.transaction);return JSON.stringify(data,null,2)}
 async restoreCopy(exported,newName){assert(newName!==this.name,'CP018_NO_RESTORE_SAME_DB');
  assert(typeof exported==='string'&&new TextEncoder().encode(exported).length<=2500000,'CP018_RESTORE_TAMANO');
  let b;try{b=JSON.parse(exported)}catch{throw Error('CP018_RESTORE_JSON')}
  assert(b&&plain(b.raw)&&typeof b.txid==='string','CP018_RESTORE_FORMAT');
  sourcePreflight(b.raw);metadata(b.raw);
  await this._verifyBackup(b,b.txid);
  const hashes={legacy:b.raw.legacy===null?null:await digest(b.raw.legacy),modern:b.raw.modern===null?null:await digest(b.raw.modern)};
  assert((await digest(canonical(hashes))).slice(0,24)===b.txid,'CP018_RESTORE_TRANSACCION');
  const restored=new CP018Store(newName);await restored.seed(b.raw.legacy,b.raw.modern);
  const step=await restored.stage();assert(step.backupSeal===b.seal,'CP018_RESTORE_DIVERGENCIA');
  return {store:restored,mode:'dual-read',transaction:step.transaction,restoredToNewDatabase:true};
 }
}
root.MiBowlingCP018=Object.freeze({CP018Store,DB_NAME,digest,canonical});
})(typeof window!=='undefined'?window:globalThis);
