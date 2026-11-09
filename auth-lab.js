/* MI BOWLING · Acceso individual · LAB A2.
 * No legacy storage, no login through PIN; no data is opened until BOTH
 * identity (remote getUser) and private owner documents are verified.
 * The deployed bootstrap intentionally has no onReady application callback. */
(function(root){
'use strict';
const isEmail=v=>typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function escape(v){return String(v??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);}
function create(options={}){
 const doc=options.document||root.document;
 const element=options.element||doc?.getElementById?.('auth-gate');
 const auth=options.auth||null,repository=options.repository||null;
 const available=!!(auth&&repository);
 const canSignUp=available&&options.allowSignUp===true;
 const clock=typeof options.now==='function'?options.now:()=>Date.now();
 let mode='login',busy=false,user=null,verifiedDocs=null,launched=false,closed=false;
 let pendingEmail='',lastResendAt=0,recoveryAuthorized=false,epoch=0,cleanup=null;
 function status(message,type='info'){
  const node=element?.querySelector?.('#auth-status');
  if(node){node.textContent=String(message);node.dataset.kind=type;}
 }
 function setMode(next){
  if(!['login','signup','confirm','recovery','update'].includes(next))throw Error('Pantalla no permitida');
  if(next==='signup'&&!canSignUp)throw Error('Las altas reales están deshabilitadas en este LAB');
  if(next==='confirm'&&!pendingEmail)throw Error('No hay verificación pendiente');
  if(next==='update'&&!recoveryAuthorized)throw Error('Recuperación sin autorización de servidor');
  mode=next;render();
 }
 function render(){
  if(!element)return;
  const title={
   login:'Acceder a mi cuenta',
   signup:'Crear una cuenta',
   confirm:'Verifica tu correo electrónico',
   recovery:'Recuperar contraseña',
   update:'Establecer nueva contraseña'
  };
  const description={
   login:'Identifícate para consultar únicamente tus partidas y estadísticas.',
   signup:'Cada jugador empieza con cero partidas. La cuenta deberá confirmar su email.',
   confirm:'Revisa el correo de confirmación. Hasta verificarlo no podrás consultar partidas.',
   recovery:'Si la dirección corresponde a una cuenta, se enviarán instrucciones.',
   update:'El enlace de recuperación fue reconocido; introduce tu nueva contraseña.'
  };
  const asksEmail=mode==='login'||mode==='signup'||mode==='recovery';
  const asksPassword=mode==='login'||mode==='signup'||mode==='update';
  const buttonName={
   login:'Iniciar sesión',
   signup:'Crear cuenta',
   confirm:'Reenviar confirmación',
   recovery:'Enviar instrucciones',
   update:'Actualizar contraseña'
  };
  const disabled=!available||(mode==='signup'&&!canSignUp)||(mode==='confirm'&&!canSignUp);
  const email=asksEmail?
   '<label for="auth-email">Correo electrónico</label>'+
   '<input id="auth-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" required placeholder="jugador@correo.com">':'';
  const password=asksPassword?
   '<label for="auth-password">'+(mode==='update'?'Nueva contraseña':'Contraseña')+'</label>'+
   '<input id="auth-password" name="password" type="password" autocomplete="'+(mode==='login'?'current-password':'new-password')+'" minlength="'+(mode==='login'?1:12)+'" required placeholder="'+(mode==='login'?'Introduce tu contraseña':'Mínimo 12 caracteres')+'">':'';
  const confirm=(mode==='signup'||mode==='update')?
   '<label for="auth-confirm">Repetir contraseña</label>'+
   '<input id="auth-confirm" name="confirm" type="password" autocomplete="new-password" minlength="12" required>':'';
  const explain=available?
   'Identificación remota y documentos privados por jugador; Liga Nacional permanece separada.':
   'No hay servicio privado configurado. El acceso está deshabilitado y ningún dato se abre.';
  element.hidden=false;
  element.innerHTML='<main class="auth-lab-screen"><div class="auth-lab-panel">'+
   '<div class="auth-lab-brand"><span aria-hidden="true">🎳</span><strong>MI BOWLING</strong>'+
   '<small>Acceso personal de jugadores</small></div>'+
   '<div class="auth-lab-subhead"><span>CUENTAS Y PRIVACIDAD · LAB</span></div>'+
   '<form id="auth-form" novalidate><h2>'+title[mode]+'</h2><p>'+description[mode]+'</p>'+
   email+password+confirm+
   '<button type="submit" class="auth-lab-primary" '+(disabled?'disabled':'')+'>'+buttonName[mode]+'</button></form>'+
   '<div class="auth-lab-actions">'+
   '<button id="auth-mode-login" type="button" '+(mode==='login'?'hidden':'')+'>Volver a iniciar sesión</button>'+
   '<button id="auth-mode-signup" type="button" '+(mode==='signup'||mode==='confirm'?'hidden':!canSignUp?'disabled title="Altas deshabilitadas en este LAB"':'')+'>Crear cuenta</button>'+
   '<button id="auth-mode-recovery" type="button" '+(mode==='recovery'||mode==='update'?'hidden':'')+'>¿Olvidaste tu contraseña?</button>'+
   '</div><p id="auth-status" role="status" aria-live="polite" data-kind="info"></p>'+
   '<p class="auth-lab-notice">'+escape(explain)+'</p>'+
   '<p class="auth-lab-foot">Los registros anteriores no se migran automáticamente. El PIN local no autentica cuentas.</p>'+
   '</div></main>';
  for(const next of ['login','signup','recovery']){
   element.querySelector('#auth-mode-'+next)?.addEventListener('click',()=>setMode(next));
  }
  element.querySelector('#auth-form')?.addEventListener('submit',async event=>{
   event.preventDefault();
   const email=element.querySelector('#auth-email')?.value?.trim()?.toLowerCase();
   const password=element.querySelector('#auth-password')?.value;
   const confirm=element.querySelector('#auth-confirm')?.value;
   try{
    if(mode==='login')await login(email,password);
    else if(mode==='signup')await signup(email,password,confirm);
    else if(mode==='confirm')await resendConfirmation();
    else if(mode==='recovery')await requestReset(email);
    else if(mode==='update')await updatePassword(password,confirm);
   }catch(err){
    status('No se pudo completar la operación. Revisa los datos o inténtalo más tarde.','error');
   }
  });
  if(!available)status('Servicio de autenticación no conectado. Acceso deshabilitado.','warning');
 }
 function loading(on){
  busy=on;
  const button=element?.querySelector?.('#auth-form button[type="submit"]');
  if(button)button.disabled=on||!available;
 }
 async function login(email,password){
  if(busy)throw Error('Operación en curso');
  if(!available)throw Error('Autenticación y almacén privados no disponibles');
  if(!isEmail(email)||typeof password!=='string'||!password)throw Error('Credenciales inválidas');
  const sequence=epoch;
  loading(true);
  try{
   await auth.signIn(email,password);
   if(sequence!==epoch)throw Error('Sesión interrumpida');
   const verified=await auth.getVerifiedUser();
   if(sequence!==epoch||!verified?.id||!verified.email||
      verified.email.toLowerCase()!==email.toLowerCase())throw Error('Usuario no verificado');
   const documents=await repository.load(verified.id);
   if(sequence!==epoch||!documents||documents.owner!==verified.id||
      !documents.personal||!documents.league)throw Error('Documentos del usuario no verificados');
   user=Object.freeze({...verified});verifiedDocs=documents;
   if(typeof options.onReady!=='function'){
    status('Identidad verificada. Falta habilitar la conexión de partidas privadas en LAB; ninguna partida se ha abierto.','warning');
    return {verified:true,opened:false,owner:verified.id};
   }
   await options.onReady({user,documents});
   if(sequence!==epoch)throw Error('Sesión interrumpida');
   launched=true;status('Identificación correcta.');
   return {verified:true,opened:true,owner:verified.id};
  }catch(error){
   // Clear all identity-related state, even if signOut fails.
   user=null;verifiedDocs=null;launched=false;
   try{await auth.signOut();}catch(_){}
   status('No se pudo verificar la cuenta o sus datos privados. Ninguna partida se ha abierto.','error');
   throw error;
  }finally{loading(false);}
 }
 async function signup(email,password,confirmation){
  if(busy)throw Error('Operación en curso');
  if(!canSignUp)throw Error('Las altas reales están deshabilitadas en este LAB');
  if(!isEmail(email)||typeof password!=='string'||password.length<12||password!==confirmation)
   throw Error('Correo o contraseña no válidos');
  loading(true);
  try{
   const pending=await auth.signUp(email,password,options.confirmRedirectTo);
   if(pending?.pendingConfirmation!==true)throw Error('El proveedor no exigió confirmar el email');
   pendingEmail=email.toLowerCase();
   lastResendAt=0;mode='confirm';render();
   status('Si el correo es válido, recibirás un enlace de confirmación. No se ha abierto ninguna partida.');
   return {pendingConfirmation:true};
  }finally{loading(false);}
 }
 async function resendConfirmation(){
  if(busy)throw Error('Operación en curso');
  if(!canSignUp||mode!=='confirm'||!isEmail(pendingEmail))
   throw Error('No existe verificación pendiente');
  if(lastResendAt&&clock()-lastResendAt<60000)
   throw Error('Espera al menos un minuto antes de volver a solicitar el correo');
  loading(true);
  try{
   // Do not reveal whether the account exists; server-side rate limiting is mandatory.
   await auth.resendSignup(pendingEmail,options.confirmRedirectTo);
   lastResendAt=clock();
   status('Si existe una cuenta pendiente, se enviará otro correo de confirmación.');
   return true;
  }finally{loading(false);}
 }
 async function requestReset(email){
  if(busy)throw Error('Operación en curso');
  if(!available||!isEmail(email))throw Error('No se puede recuperar contraseña');
  loading(true);
  try{
   await auth.requestReset(email,options.resetRedirectTo);
   status('Si existe una cuenta, recibirás instrucciones para recuperar el acceso.');
   return true;
  }finally{loading(false);}
 }
 async function updatePassword(password,confirmation){
  if(busy)throw Error('Operación en curso');
  if(!available||mode!=='update'||!recoveryAuthorized)
   throw Error('Recuperación sin autorización de servidor');
  if(typeof password!=='string'||password.length<12||password!==confirmation)
   throw Error('La nueva contraseña no es válida');
  loading(true);
  try{
   const verified=await auth.getVerifiedUser();
   if(!verified?.id||!verified.email)throw Error('La sesión de recuperación no ha sido verificada');
   await auth.updatePassword(password);
   // Clear session even if logout fails. No scoring data can be opened in A2.
   user=null;verifiedDocs=null;launched=false;recoveryAuthorized=false;epoch++;
   try{await auth.signOut();}catch(_){}
   mode='login';render();
   status('Contraseña cambiada. Inicia sesión de nuevo.');
   return true;
  }finally{loading(false);}
 }
 async function logout(){
  epoch++;user=null;verifiedDocs=null;launched=false;recoveryAuthorized=false;pendingEmail='';
  try{if(available)await auth.signOut();}
  finally{
   if(typeof options.onClose==='function')await options.onClose();
   mode='login';render();
  }
 }
 function onEvent(event){
  if(event==='SIGNED_OUT'){
   epoch++;user=null;verifiedDocs=null;launched=false;recoveryAuthorized=false;
   if(typeof options.onClose==='function')options.onClose();
   mode='login';render();
  }else if(event==='PASSWORD_RECOVERY'){
   epoch++;user=null;verifiedDocs=null;launched=false;
   if(typeof options.onClose==='function')options.onClose();
   recoveryAuthorized=true;mode='update';render();
   status('Enlace de recuperación detectado. Confirma una contraseña nueva.');
  }
  // SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION and USER_UPDATED do not open scores.
 }
 function init(){
  if(closed)throw Error('Control de sesión cerrado');
  render();
  if(available&&typeof auth.onAuthChange==='function')cleanup=auth.onAuthChange(onEvent);
  return true;
 }
 function destroy(){
  closed=true;epoch++;cleanup?.();
  user=null;verifiedDocs=null;recoveryAuthorized=false;launched=false;
 }
 return Object.freeze({init,login,signup,resendConfirmation,requestReset,updatePassword,logout,destroy,
  getState:()=>({available,mode,verified:!!user,opened:launched,
   pendingConfirmation:!!pendingEmail,recoveryAuthorized,owner:user?.id||null})});
}
root.MiBowlingAuthGate=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
