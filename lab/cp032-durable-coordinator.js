/* CP032 · DURABLE CROSS-STORE COORDINATION · LAB ONLY.
 * This is a conservative compensation protocol, NOT a multi-store atomic transaction.
 * Uses original CP002 Web Locks + CP004, but ONLY with injected synthetic storage
 * and the independently guarded CP032 fictional v3 sidecar. NO automatic boot.
 */
(function(root,factory){
 const api=factory(
  typeof module==='object'&&module.exports?require('./cp032-migration-simulation.js'):root.MiBowlingCP032MigrationSimulation,
  typeof module==='object'&&module.exports?require('../integracion/recuperacion-integral.js'):root.MiBowlingRecuperacion,
  typeof module==='object'&&module.exports?require('./cp032-pwa-adapter.js'):root.MiBowlingCP032PWA
 );
 if(typeof module==='object'&&module.exports)module.exports=api;else root.MiBowlingCP032Durable=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(Migration,Integral,PWA){
 'use strict';
 const DB='mi-bowling-cp032-synthetic-coordinate-v1',STORE='intent',KEY='pending',
  SCHEMA='cp032-synthetic-crossstore-v1',MAX=2097152;
 const assert=(v,m)=>{if(!v)throw Error(m)};
 const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const clone=x=>JSON.parse(JSON.stringify(x));
 const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
 async function sha(s){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))}
 function gate(args){
  assert(typeof window!=='undefined'&&window.isSecureContext,'CP032_COORD_CONTEXT');
  assert(['localhost','127.0.0.1'].includes(location.hostname)&&
   new URLSearchParams(location.search).get('cp032lab')==='ficticio','CP032_COORD_ORIGIN');
  assert(window.MiBowlingRegistroCP021?.enabled===true,'CP032_COORD_NOT_LAB');
  assert(Object.keys(localStorage).every(k=>!k.startsWith('mi-bowling-')),'CP032_COORD_REAL_KEYS');
  assert(args?.guard&&args?.storage&&args?.io&&args?.sidecar&&typeof args.photoProbe==='function',
   'CP032_COORD_INJECTED_DEPENDENCIES');
  args.guard.assertAuthority();
  assert(args.sidecar.writesProduction===false,'CP032_COORD_V3_PRODUCTION_FORBIDDEN');
 }
 function openDB(create){
  return new Promise((resolve,reject)=>{
   let absent=false,settled=false;
   const request=indexedDB.open(DB,1);
   request.onblocked=()=>{if(!settled){settled=true;reject(Error('CP032_COORD_DB_BLOCKED'))}};
   request.onupgradeneeded=()=>{
    if(!create){absent=true;request.transaction.abort();return}
    request.result.createObjectStore(STORE);
   };
   request.onerror=()=>{if(settled)return;settled=true;absent?resolve(null):reject(request.error||Error('CP032_COORD_DB_OPEN_FAIL'))};
   request.onsuccess=()=>{const db=request.result;if(settled){db.close();return}
    settled=true;
    if(!db.objectStoreNames.contains(STORE)){db.close();reject(Error('CP032_COORD_SCHEMA_MISSING'))}
    else resolve(db);
   };
  });
 }
 async function op(mode,check,value){
  const db=await openDB(mode!=='read');if(!db){if(mode==='read')return null;throw Error('CP032_COORD_DB_MISSING')}
  return new Promise((resolve,reject)=>{
   let result=null,error=null,tx;
   try{
    tx=db.transaction(STORE,mode==='read'?'readonly':'readwrite');
    const store=tx.objectStore(STORE),get=store.get(KEY);
    get.onsuccess=()=>{
     try{
      result=get.result??null;
      if(mode==='put'){
       assert(result===null,'CP032_COORD_PENDING_EXISTS');
       store.add(value,KEY);result=value;
      }else if(mode==='clear'){
       assert(result?.sha256===check,'CP032_COORD_INTENT_CHANGED');
       store.delete(KEY);result=null;
      }
     }catch(e){error=e;tx.abort()}
    };
    tx.oncomplete=()=>{db.close();resolve(result===null?null:clone(result))};
    tx.onerror=tx.onabort=()=>{db.close();reject(error||tx.error||Error('CP032_COORD_TX_ABORT'))};
   }catch(e){db.close();reject(e)}
  });
 }
 async function readIntent(){
  const packet=await op('read');
  if(!packet)return null;
  assert(packet.schema===SCHEMA&&typeof packet.body==='string'&&packet.body.length<=MAX&&
   /^[a-f0-9]{64}$/.test(packet.sha256),'CP032_COORD_PACKET');
  assert(await sha(packet.body)===packet.sha256,'CP032_COORD_HASH_MISMATCH');
  const body=JSON.parse(packet.body);
  assert(body.version===1&&body.v3Before&&body.v3After&&body.before&&body.target&&
    typeof body.photos==='string'&&body.photos.length>0,'CP032_COORD_BODY_INVALID');
  PWA.verifyMirror(body.v3After);
  const before=await Integral.validate(body.before),target=await Integral.validate(body.target);
  assert(eq(before.raw,target.raw),'CP032_COORD_V2_MUTATION');
  assert(body.v3Before.revision>=0&&Number.isSafeInteger(body.v3Before.revision)&&
   (body.v3Before.document===null||typeof body.v3Before.document==='object'),'CP032_COORD_V3_BASE');
  if(body.v3Before.document!==null)PWA.verifyMirror(body.v3Before.document);
  return {packet,body,before,target};
 }
 async function pending(){const x=await readIntent();return x?{pending:true,sha:x.packet.sha256}: {pending:false}}
 async function begin(args,{stopAfter=null}={}){
  gate(args);
  assert([null,'afterPrepare','afterV3','afterCP004'].includes(stopAfter),'CP032_COORD_INVALID_STOP');
  assert((await pending()).pending===false,'CP032_COORD_PENDING_RECOVERY_REQUIRED');
  assert(args.document&&args.target,'CP032_COORD_INPUT_REQUIRED');
  PWA.verifyMirror(args.document);
  const p=await Migration.preflight(args);
  const body={version:1,before:p.old,target:clone(args.target),
   v3Before:clone(p.revision),v3After:clone(args.document),photos:p.photos};
  const content=JSON.stringify(body);
  assert(content.length<=MAX,'CP032_COORD_SIZE_CAP');
  const packet={schema:SCHEMA,body:content,sha256:await sha(content)};
  await op('put',null,packet);
  const check=await readIntent();
  assert(check&&check.packet.sha256===packet.sha256,'CP032_COORD_PREPARE_UNVERIFIED');
  if(stopAfter==='afterPrepare')return {pending:true,stage:'prepared'};
  await args.sidecar.save(args.document,p.revision.revision);
  if(stopAfter==='afterV3')return {pending:true,stage:'v3Committed'};
  const applied=await Integral.restore({guard:args.guard,storage:args.storage,io:args.io,
    bundle:args.target,confirmBackup:async()=>true});
  assert(applied===true,'CP032_COORD_CP004_RESTORE_REJECTED');
  if(stopAfter==='afterCP004')return {pending:true,stage:'cp004Committed'};
  await verifyCommitted(args,body);
  await op('clear',packet.sha256);
  return {committed:true,atomic:false,photoPreserved:true};
 }
 async function verifyCommitted(args,body){
  args.guard.assertAuthority();
  const state=await Integral.validate(await MigrationSnapshot(args));
  const wanted=await Integral.validate(body.target);
  assert(eq(state,wanted),'CP032_COORD_CP004_VERIFY');
  const v3=await args.sidecar.read();
  assert(v3.revision===body.v3Before.revision+1&&eq(v3.document,body.v3After),
    'CP032_COORD_V3_VERIFY');
  assert((await args.photoProbe())===body.photos,'CP032_COORD_PHOTO_DRIFT');
 }
 async function MigrationSnapshot({guard,storage,io}){
  guard.assertAuthority();
  const PDF=typeof module==='object'&&module.exports?require('../integracion/respaldo-pdf-f1.js'):window.MiBowlingRespaldoPDF;
  const Local=typeof module==='object'&&module.exports?require('../integracion/respaldo-local.js'):window.MiBowlingRespaldo;
  const A=typeof module==='object'&&module.exports?require('../integracion/autoridad-local.js'):window.MiBowlingAutoridad;
  const raw=PDF.prefixSnapshot(storage),pdfs=await io.readPDFs();guard.assertAuthority();
  assert(eq(raw,PDF.prefixSnapshot(storage)),'CP032_COORD_RAW_RACE');
  const original=JSON.parse(A.snapshot(storage)[A.KEYS[0]]);
  const local=Local.exportBundle(guard,original);
  const snapshot=Integral.backupFromState({raw,pdfs},local);
  await Integral.validate(snapshot);
  return snapshot;
 }
 async function recover(args){
  gate(args);
  const intent=await readIntent();
  if(!intent)return {recovered:false,mode:'clean'};
  const {packet,body,before,target}=intent;
  args.guard.assertAuthority();
  assert((await args.photoProbe())===body.photos,'CP032_COORD_PHOTO_CONFLICT');
  // CP004 can leave its own journal if the browser was closed during PDF write.
  // CP004 recovery must execute with the exact existing Web Lock.
  await Integral.recover({guard:args.guard,storage:args.storage,io:args.io});
  const live=await Integral.validate(await MigrationSnapshot(args));
  assert(eq(live,before)||eq(live,target),'CP032_COORD_CP004_EXTERNAL_CONFLICT');
  const v3=await args.sidecar.read();
  const old=body.v3Before,baseMatch=eq(v3.document,old.document);
  const isBefore=baseMatch&&(v3.revision===old.revision||v3.revision===old.revision+2);
  const isAfter=eq(v3.document,body.v3After)&&v3.revision===old.revision+1;
  assert(isBefore||isAfter,'CP032_COORD_V3_EXTERNAL_CONFLICT');
  if(eq(live,target)&&!eq(live,before)){
   const restored=await Integral.restore({guard:args.guard,storage:args.storage,io:args.io,
     bundle:body.before,confirmBackup:async()=>true});
   assert(restored===true,'CP032_COORD_CP004_ROLLBACK_REFUSED');
  }
  if(isAfter){
   const rb=await args.sidecar.rollback(v3.revision);
   assert(eq(rb.restored,old.document),'CP032_COORD_V3_ROLLBACK_FAIL');
  }
  const confirmed=await Integral.validate(await MigrationSnapshot(args));
  const v3last=await args.sidecar.read();
  assert(eq(confirmed,before)&&eq(v3last.document,old.document),'CP032_COORD_RECOVERY_NOT_EXACT');
  assert((await args.photoProbe())===body.photos,'CP032_COORD_PHOTO_CHANGED');
  args.guard.assertAuthority();
  await op('clear',packet.sha256);
  return {recovered:true,mode:'rolled-back',crossStoreAtomic:false,photoPreserved:true,
    v3Revision:v3last.revision};
 }
 return Object.freeze({DB,SCHEMA,begin,recover,pending,writesProduction:false,syntheticOnly:true});
});