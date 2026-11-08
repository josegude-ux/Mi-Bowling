/* MI BOWLING · Inicio auth LAB A1. No incluye credenciales ni inicializa cuentas.
 * Activación futura: SDK oficial y objeto de configuración inyectados fuera de este repo.
 * Sin ambas piezas, el formulario permanece bloqueado. NUNCA carga app.js aquí. */
(function(root){
'use strict';
function boot(){
 const cfg=root.MI_BOWLING_AUTH_CONFIG;
 let auth=null,repository=null;
 const secure=(root.location?.protocol==='https:'||root.location?.hostname==='localhost');
 try{
  const valid=cfg&&typeof cfg.url==='string'&&/^https:\/\/[a-z0-9.-]+\/?$/i.test(cfg.url)&&
    typeof cfg.publishableKey==='string'&&cfg.publishableKey.startsWith('sb_publishable_')&&
    typeof root.supabase?.createClient==='function'&&secure;
  if(valid){
   const client=root.supabase.createClient(cfg.url,cfg.publishableKey,{
    auth:{
     persistSession:false,
     autoRefreshToken:false,
     detectSessionInUrl:true
    }
   });
   auth=root.MiBowlingSupabaseAuth.create(client);
   repository=root.MiBowlingPrivateRepository.create(client);
  }
 }catch(e){auth=null;repository=null;}
 // Fase A1: incluso con servicio configurado, NO entra a la app ni migra datos.
 // Activar los documentos reales exige validaciones de RLS y integración
 // de escritura en servidor; no incluir onReady antes de cumplir esos criterios.
 const gate=root.MiBowlingAuthGate.create({
  auth,repository,document:root.document,allowSignUp:false
 });
 gate.init();
 root.MiBowlingAuthLAB=gate;
 return gate;
}
root.MiBowlingAuthBoot=Object.freeze({boot});
})(typeof window!=='undefined'?window:globalThis);
