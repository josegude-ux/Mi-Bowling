/* MI BOWLING · Auth LAB A1 · adaptador Supabase Auth real (sin credenciales)
 * Requiere un cliente @supabase/supabase-js configurado por un bootstrap privado.
 * NO almacena contraseñas ni verifica credenciales en JavaScript local. */
(function(root){
'use strict';
function ok(result,operation){
 if(result?.error)throw new Error(operation+': '+(result.error.message||'operación no disponible'));
 return result?.data||{};
}
function create(client){
 if(!client?.auth || typeof client.auth.getUser!=='function' ||
    typeof client.auth.signInWithPassword!=='function')throw Error('Cliente de autenticación no configurado');
 return Object.freeze({
  async signIn(email,password){
   const data=ok(await client.auth.signInWithPassword({email,password}),'Inicio de sesión');
   // Los datos del primer resultado no sirven como prueba de identidad.
   return data.session||null;
  },
  async getVerifiedUser(){
   const data=ok(await client.auth.getUser(),'Verificación de sesión (servidor)');
   const user=data.user;
   if(!user?.id||!user?.email)throw Error('Sesión no verificada por el servidor');
   if(!user.email_confirmed_at)throw Error('Debes confirmar el correo electrónico para entrar');
   if(user.is_anonymous)throw Error('Las cuentas anónimas no están permitidas');
   return Object.freeze({id:user.id,email:user.email});
  },
  async signUp(email,password){
   await client.auth.signUp({email,password}).then(r=>ok(r,'Crear cuenta'));
   // Registrarse NO inicia automáticamente MI BOWLING: exige confirmación y login nuevo.
   await client.auth.signOut({scope:'local'}).catch(()=>{});
   return true;
  },
  async requestReset(email,redirectTo){
   const opts=redirectTo?{redirectTo}:{};
   ok(await client.auth.resetPasswordForEmail(email,opts),'Recuperar contraseña');
   return true;
  },
  async updatePassword(password){
   ok(await client.auth.updateUser({password}),'Cambiar contraseña');
   return true;
  },
  async signOut(){
   ok(await client.auth.signOut(),'Cerrar sesión');
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
