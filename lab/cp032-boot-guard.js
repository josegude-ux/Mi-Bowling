/* CP032 LAB ONLY · Fail-closed boot barrier for injected fictional data.
 * Must be called BEFORE starting a writer. Never autostarts on a production page.
 */
(function(root,factory){
 const api=factory(
  typeof module==='object'&&module.exports?require('./cp032-durable-coordinator.js'):root.MiBowlingCP032Durable
 );
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MiBowlingCP032Boot=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(Coord){
 'use strict';
 const assert=(v,msg)=>{if(!v)throw Error(msg)};
 let busy=false;
 async function boot(args,{onReady=null}={}){
  assert(!busy,'CP032_BOOT_ALREADY_RUNNING');
  assert(Coord?.syntheticOnly===true&&Coord.writesProduction===false,'CP032_BOOT_COORDINATOR_MISSING');
  assert(args?.guard&&args?.io&&args?.sidecar&&args?.storage,'CP032_BOOT_DEPS');
  args.guard.assertAuthority();
  assert(typeof onReady==='function','CP032_BOOT_ON_READY_REQUIRED');
  busy=true;
  try{
   // If CP004 left a journal WITHOUT a corresponding coordinator intent,
   // do not start the application or try to overwrite an unknown state.
   const pending=await Coord.pending();
   if(!pending.pending){
    const legacy=await args.io.readJournal();
    assert(legacy===null,'CP032_BOOT_ORPHAN_CP004_JOURNAL');
   }
   const resolution=pending.pending?await Coord.recover(args):{recovered:false,mode:'clean'};
   assert((await Coord.pending()).pending===false,'CP032_BOOT_PENDING');
   assert((await args.io.readJournal())===null,'CP032_BOOT_CP004_PENDING');
   args.guard.assertAuthority();
   const result=await onReady();
   return {ready:true,resolution,onReadyResult:result};
  }finally{busy=false}
 }
 return Object.freeze({boot,syntheticOnly:true,writesProduction:false});
});