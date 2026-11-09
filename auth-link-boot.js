/* MI BOWLING · LAB A3 callback bootstrap.
 * Auth session exists only in callback page memory, not sessionStorage.
 * verifyOtp(token_hash) is independent of PKCE verifier in original tab.
 * Without approved HTTPS config + pinned SDK, callback stays disabled. */
(function(root){
'use strict';
function memoryStorage(){
 const state=new Map();
 return {
  getItem:key=>state.has(key)?state.get(key):null,
  setItem:(key,value)=>state.set(key,value),
  removeItem:key=>state.delete(key)
 };
}
function boot(){
 const cfg=root.MI_BOWLING_AUTH_CONFIG;
 let auth=null;
 try{
  if(root.MiBowlingAuthBoot?.validConfig(cfg,root.location)&&
     root.location?.protocol==='https:'&&
     typeof root.supabase?.createClient==='function'){
   const options={auth:{
    flowType:'pkce',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,
    storage:memoryStorage()
   }};
   const client=root.supabase.createClient(cfg.url,cfg.publishableKey,options);
   auth=root.MiBowlingSupabaseAuth.create(client);
  }
 }catch(_){auth=null;}
 const controller=root.MiBowlingEmailCallback.create({
  document:root.document,location:root.location,history:root.history,auth
 });
 root.MiBowlingEmailCallbackLAB=controller;
 return controller;
}
root.MiBowlingEmailCallbackBoot=Object.freeze({boot,memoryStorage});
})(typeof window!=='undefined'?window:globalThis);
