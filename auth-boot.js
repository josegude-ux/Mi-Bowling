/* MI BOWLING · LAB A2 · factory for approved Supabase browser SDK.
 * Nothing connected by default. No auth project, keys, users or remote calls.
 * A future isolated deployment must inject an independently reviewed config
 * and an officially bundled, version-pinned @supabase/supabase-js SDK. */
(function(root){
'use strict';
function redirect(url,origin){
 if(!url)return undefined;
 try{
  const u=new URL(url);
  if(u.origin!==origin||u.protocol!=='https:'||u.username||u.password||
     u.hash||u.search) return undefined;
  return u.href;
 }catch(_){return undefined;}
}
function validConfig(cfg,location){
 if(!cfg||typeof cfg.url!=='string'||typeof cfg.publishableKey!=='string')return false;
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url))return false;
 if(!/^sb_publishable_[a-zA-Z0-9_-]{10,}$/.test(cfg.publishableKey))return false;
 if(location?.protocol!=='https:' && location?.hostname!=='localhost')return false;
 return true;
}
function boot(){
 const cfg=root.MI_BOWLING_AUTH_CONFIG;
 let auth=null,repository=null,confirmRedirectTo,resetRedirectTo;
 try{
  if(validConfig(cfg,root.location)&&
     typeof root.supabase?.createClient==='function'&&
     root.sessionStorage&&
     typeof root.sessionStorage.setItem==='function'&&
     typeof root.sessionStorage.getItem==='function'){
   // URL Configuration in Supabase Auth MUST allowlist each exact redirect.
   // No redirect is accepted from a query parameter, form, or remote identity.
   const origin=root.location.origin;
   confirmRedirectTo=redirect(cfg.confirmRedirectTo,origin);
   resetRedirectTo=redirect(cfg.resetRedirectTo,origin);
   if((cfg.confirmRedirectTo&&!confirmRedirectTo)||
      (cfg.resetRedirectTo&&!resetRedirectTo))throw Error('Redirecciones no autorizadas');
   const client=root.supabase.createClient(cfg.url,cfg.publishableKey,{
    auth:{
     flowType:'pkce', // confirmation / recovery code exchanged by the SDK
     storage:root.sessionStorage, // tokens are session-scoped; NO scores here
     persistSession:true, // required to retain PKCE verifier across redirect
     autoRefreshToken:true,
     detectSessionInUrl:true
    }
   });
   auth=root.MiBowlingSupabaseAuth.create(client);
   repository=root.MiBowlingPrivateRepository.create(client);
  }
 }catch(_){auth=null;repository=null;}
 // Intentional release gate: even when a provider is supplied, no accounts
 // may be registered and no scores may open in LAB A2.
 const gate=root.MiBowlingAuthGate.create({
  auth,repository,document:root.document,allowSignUp:false,
  confirmRedirectTo,resetRedirectTo
 });
 gate.init();
 root.MiBowlingAuthLAB=gate;
 return gate;
}
root.MiBowlingAuthBoot=Object.freeze({boot,validConfig,redirect});
})(typeof window!=='undefined'?window:globalThis);
