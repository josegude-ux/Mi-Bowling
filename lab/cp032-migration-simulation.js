/* MI BOWLING CP032 · Safe synthetic migration strategy simulation.
 * Uses actual CP002/003/004 APIs but only injected fake storage, browser-local synthetic IDB,
 * and v3 synthetic journal. It is NOT a production migration utility.
 * No import of user backups/photos; no fetch; no writes to window.localStorage.
 */
(function(root,factory){
 const api=factory(
  typeof module==='object'&&module.exports?require('../integracion/autoridad-local.js'):root.MiBowlingAutoridad,
  typeof module==='object'&&module.exports?require('../integracion/respaldo-local.js'):root.MiBowlingRespaldo,
  typeof module==='object'&&module.exports?require('../integracion/respaldo-pdf-f1.js'):root.MiBowlingRespaldoPDF,
  typeof module==='object'&&module.exports?require('../integracion/recuperacion-integral.js'):root.MiBowlingRecuperacion,
  typeof module==='object'&&module.exports?require('./cp032-pwa-adapter.js'):root.MiBowlingCP032PWA
 );
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MiBowlingCP032MigrationSimulation=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(Authority,Local,PDF,Integral,PWA){
 'use strict';
 const DB=Authority.KEYS[0],assert=(ok,msg)=>{if(!ok)throw Error(msg)};
 const copy=v=>JSON.parse(JSON.stringify(v));
 function lockGate(){
  if(typeof window==='undefined')return false;
  const loc=window.location;
  assert((loc.hostname==='localhost'||loc.hostname==='127.0.0.1')&&window.isSecureContext&&
    new URLSearchParams(loc.search).get('cp032lab')==='ficticio','CP032_SIM_ORIGIN_DENIED');
  assert(window.MiBowlingRegistroCP021?.enabled===true,'CP032_SIM_PERSONAL_DATA_GUARD');
  assert(Object.keys(window.localStorage).every(k=>!k.startsWith('mi-bowling-')),'CP032_SIM_REAL_STORAGE_PRESENT');
  return true;
 }
 function raw(storage){return PDF.prefixSnapshot(storage)}
 function managed(storage){return Authority.snapshot(storage)}
 function exactEqual(a,b){return JSON.stringify(a)===JSON.stringify(b)}
 function source(doc,storage){
  PWA.verifyMirror(doc);
  const view=PWA.read(doc);
  const current=managed(storage);
  assert(exactEqual(current,doc.cp032Mirror.raw),'CP032_SIM_SOURCE_MAP_DIFF');
  assert(current[DB]!==null,'CP032_SIM_V2_MISSING');
  assert(exactEqual(JSON.parse(current[DB]),view.legacyExact),'CP032_SIM_V2_NOT_EXACT');
  return view;
 }
 async function snapshot({guard,storage,io}){
  guard.assertAuthority();
  const r=raw(storage),p=await io.readPDFs();
  guard.assertAuthority();
  assert(exactEqual(raw(storage),r),'CP032_SIM_RACE_DURING_PDF_READ');
  const old=JSON.parse(managed(storage)[DB]);
  const local=Local.exportBundle(guard,old);
  const bundle=Integral.backupFromState({raw:r,pdfs:p},local);
  await Integral.validate(bundle);
  return bundle;
 }
 async function preflight({guard,storage,io,sidecar,document,target,photoProbe}){
  lockGate();assert(typeof photoProbe==='function','CP032_SIM_PHOTO_PROBE_REQUIRED');
  assert(guard&&storage&&io&&sidecar&&target,'CP032_SIM_DEPENDENCIES_REQUIRED');
  guard.assertAuthority();const before=source(document,storage);
  const old=await snapshot({guard,storage,io}),next=await Integral.validate(target);
  assert(exactEqual(next.raw,old.rawAll),'CP032_SIM_V2_RAW_CHANGE_DENIED');
  assert(next.pdfs.length===old.indexedDB.pdfs.length,'CP032_SIM_PDF_COUNT_CHANGE');
  const photos=await photoProbe(),legacyChecksum=JSON.stringify(before.legacyExact);
  assert(typeof photos==='string'&&photos.length>0,'CP032_SIM_PHOTO_SNAPSHOT_REQUIRED');
  const revision=await sidecar.read();guard.assertAuthority();
  assert(JSON.stringify(before.legacyExact)===legacyChecksum,'CP032_SIM_V2_MUTATED');
  return {photos,revision,old,plan:{strategy:'compensating-not-atomic',stepOrder:[
   'Web Lock exclusive','read-only CP003/004 backup + PDF validation',
   'verify private CacheStorage marker','journal sidecar v3','CP004 restore existing v2/PDF state',
   'verify SHA256 and no photo writes','rollback both on error'
  ],realDataAllowed:false,publishAllowed:false,crashSafeAcrossStores:false}};
 }
 async function simulate(args,{failAt=null}={}){
  const {guard,storage,io,sidecar,document,target,photoProbe}=args;
  const before=await preflight(args);
  let committedV3=false,cp004Started=false;
  try{
   await sidecar.save(document,before.revision.revision);
   committedV3=true;
   if(failAt==='afterV3')throw Error('CP032_SIMULATED_FAILURE_AFTER_V3');
   cp004Started=true;
   const applied=await Integral.restore({
    guard,storage,io,bundle:target,confirmBackup:()=>true
   });
   assert(applied===true,'CP032_SIM_CP004_NOT_APPLIED');
   if(failAt==='afterCP004')throw Error('CP032_SIMULATED_FAILURE_AFTER_CP004');
   const after=await Integral.validate(await snapshot({guard,storage,io}));
   const expected=await Integral.validate(target);
   assert(exactEqual(after,expected),'CP032_SIM_PDF_RESTORE_NOT_VERIFIED');
   const stored=await sidecar.read();PWA.verifyMirror(stored.document);
   assert(exactEqual(stored.document,document),'CP032_SIM_V3_NOT_VERIFIED');
   assert((await photoProbe())===before.photos,'CP032_SIM_PHOTO_CHANGED');
   guard.assertAuthority();
   return {committed:true,v3Revision:stored.revision,photoPreserved:true,
    v2Preserved:true,compensatingProtocol:true,atomicAcrossStores:false};
  }catch(error){
   // Deliberately do not pretend cross-store atomicity: this only models
   // compensation within one live Web Lock. Hard crashes need recovery design.
   let stop=null;
   try{
    if(cp004Started){
     // CP004 has its own journal and rollback; if necessary, recover first.
     await Integral.recover({guard,storage,io});
     const current=await snapshot({guard,storage,io});
     if(!exactEqual(await Integral.validate(current),await Integral.validate(before.old))){
      const undone=await Integral.restore({
       guard,storage,io,bundle:before.old,confirmBackup:()=>true
      });
      assert(undone===true,'CP032_SIM_CP004_COMPENSATION_DENIED');
     }
    }
    if(committedV3){
     const active=await sidecar.read();
     const result=await sidecar.rollback(active.revision);
     assert(exactEqual(result.restored,before.revision.document),'CP032_SIM_V3_ROLLBACK_NOT_EXACT');
    }
    assert(exactEqual(await Integral.validate(await snapshot({guard,storage,io})),
      await Integral.validate(before.old)),'CP032_SIM_CP004_NOT_RESTORED');
    assert((await photoProbe())===before.photos,'CP032_SIM_PHOTO_CHANGED_DURING_ROLLBACK');
    guard.assertAuthority();
   }catch(e){stop=e}
   if(stop)throw Error('CP032_SIM_NO_GO_MANUAL_RECOVERY_REQUIRED: '+stop.message+'; original: '+error.message);
   return {committed:false,rolledBack:true,reason:error.message,
    photoPreserved:true,v2Preserved:true,hardCrashRecoveryNotProven:true};
  }
 }
 return Object.freeze({preflight,simulate,writesProduction:false,atomicAcrossStores:false});
});