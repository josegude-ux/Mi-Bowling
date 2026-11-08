/* MI BOWLING · Supabase Auth adapter · LAB A2 (no keys / no real users).
 * Official browser SDK is injected by the future secure bootstrap.
 * Calls server APIs for identity; neither stores nor hashes user passwords. */
(function(root){
'use strict';
function result(r,operation){
 if(r?.error)throw new Error(operation+': '+(r.error.message||'servicio no disponible'));
 if(!r||typeof r!=='object')throw new Error(operation+': respuesta inválida');
 return r.data||{};
}
function create(client){
 if(!client?.auth||typeof client.auth.getUser!=='function'||
  typeof client.auth.signInWithPassword!=='function'||
  typeof client.auth.signUp!=='function'||
  typeof client.auth.resend!=='function'||
  typeof client.auth.resetPasswordForEmail!=='function'||
  typeof client.auth.updateUser!=='function'||
  typeof client.auth.signOut!=='function')throw Error('Proveedor de identidad incompleto');
 const redirectOptions=redirectTo=>redirectTo?{emailRedirectTo:redirectTo}:{};
 return Object.freeze({
  async signIn(email,password){
   const data=result(await client.auth.signInWithPassword({email,password}),'Inicio de sesión');
   // A session is not proof of email confirmation or account ownership.
   // However, login must actually return a token before remote verification.
   if(!data.session?.access_token)throw Error('El proveedor no ha emitido una sesión válida');
   return data.session;
  },
  async getVerifiedUser(){
   // Unlike getSession, getUser makes a remote verification request.
   const data=result(await client.auth.getUser(),'Verificación remota de identidad');
   const user=data.user;
   if(!user?.id||!user?.email)throw Error('Sesión no verificada por servidor');
   if(!user.email_confirmed_at)throw Error('Correo aún sin confirmar');
   if(user.is_anonymous)throw Error('No se admiten sesiones anónimas');
   return Object.freeze({id:user.id,email:user.email});
  },
  async signUp(email,password,redirectTo){
   const payload={email,password};
   if(redirectTo)payload.options=redirectOptions(redirectTo);
   const data=result(await client.auth.signUp(payload),'Registro');
   // Confirmation required, even if the external provider were misconfigured.
   if(data.session){
    try{await client.auth.signOut({scope:'local'});}catch(_){}
    throw Error('Registro bloqueado: el servidor no exige verificar el correo');
   }
   return Object.freeze({pendingConfirmation:true});
  },
  async resendSignup(email,redirectTo){
   const payload={type:'signup',email};
   if(redirectTo)payload.options=redirectOptions(redirectTo);
   result(await client.auth.resend(payload),'Reenviar confirmación');
   return true;
  },
  async requestReset(email,redirectTo){
   const options=redirectTo?{redirectTo}:{};
   result(await client.auth.resetPasswordForEmail(email,options),'Recuperación de contraseña');
   return true;
  },
  async updatePassword(password){
   result(await client.auth.updateUser({password}),'Actualizar contraseña');
   return true;
  },
  async signOut(){
   result(await client.auth.signOut(),'Cerrar sesión');
   return true;
  },
  onAuthChange(callback){
   if(typeof client.auth.onAuthStateChange!=='function')return ()=>{};
   const {data}=client.auth.onAuthStateChange((event,session)=>callback(event,session));
   return ()=>data?.subscription?.unsubscribe?.();
  }
 });
}
root.MiBowlingSupabaseAuth=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
