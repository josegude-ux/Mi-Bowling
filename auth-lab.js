/* MI BOWLING · Acceso individual LAB A1
 * Fase de autenticación aislada. Si no hay proveedor y repositorio privado
 * verificados NO se carga app.js ni datos anteriores.
 * La identidad se valida mediante petición remota (getUser), nunca por email local. */
(function(root){
'use strict';
function htmlEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);}
const isEmail=v=>typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function create(options={}){
 const doc=options.document||root.document;
 const element=options.element||doc?.getElementById?.('auth-gate');
 const auth=options.auth||null,repository=options.repository||null;
 const available=!!(auth&&repository);
 const canSignUp=available&&options.allowSignUp===true;
 let mode='login',busy=false,user=null,verifiedDocs=null,launched=false,closed=false;
 let cleanup=null;
 function status(message,type='info'){
  const el=element?.querySelector?.('#auth-status');
  if(el){el.textContent=String(message);el.dataset.kind=type;}
 }
 function render(){
  if(!element)return;
  const reason=available?
   'Cada cuenta dispondrá de partidas y estadísticas privadas. La Liga Nacional será una sección independiente.':
   'Laboratorio de acceso sin proveedor de identidad ni base de datos privada configurados. No se admiten cuentas reales ni se abrirán partidas.';
  const forms={
   login:'<h2>Acceder a mi cuenta</h2><p>Identifícate con correo electrónico y contraseña.</p>',
   signup:'<h2>Crear cuenta</h2><p>Confirma el correo antes de comenzar a jugar.</p>',
   recovery:'<h2>Recuperar contraseña</h2><p>Te enviaremos instrucciones si existe una cuenta con ese correo.</p>',
   update:'<h2>Establecer nueva contraseña</h2><p>Introduce una contraseña nueva para recuperar tu cuenta.</p>'
  };
  const modeForm=forms[mode]||forms.login;
  const emailInput=mode==='update'?'':('<label for="auth-email">Correo electrónico</label>'+
   '<input id="auth-email" name="email" type="email" inputmode="email" autocomplete="email" required maxlength="254" placeholder="jugador@correo.com">');
  const passInput=(mode==='login'||mode==='signup'||mode==='update')?
   '<label for="auth-password">Contraseña</label><input id="auth-password" name="password" type="password" autocomplete="'+(mode==='login'?'current-password':'new-password')+'" minlength="12" required placeholder="Mínimo 12 caracteres">':'';
  const confirmInput=(mode==='signup'||mode==='update')?
   '<label for="auth-confirm">Repetir contraseña</label><input id="auth-confirm" name="confirm" type="password" autocomplete="new-password" minlength="12" required>':'';
  const submitName={login:'Iniciar sesión',signup:'Crear cuenta',recovery:'Enviar instrucciones',update:'Actualizar contraseña'}[mode];
  element.hidden=false;
  element.innerHTML='<main class="auth-lab-screen"><div class="auth-lab-panel">'+
   '<div class="auth-lab-brand"><span aria-hidden="true">🎳</span><strong>MI BOWLING</strong>'+
   '<small>Acceso personal de jugadores</small></div>'+
   '<div class="auth-lab-subhead"><span>CUENTAS Y PRIVACIDAD · LAB</span></div>'+
   '<form id="auth-form" novalidate>'+modeForm+emailInput+passInput+confirmInput+
   '<button type="submit" class="auth-lab-primary" '+(!available?'disabled':'')+'>'+submitName+'</button></form>'+
   '<div class="auth-lab-actions">'+
   '<button id="auth-mode-login" type="button" '+(mode==='login'?'hidden':'')+'>Volver a iniciar sesión</button>'+
   '<button id="auth-mode-signup" type="button" '+(mode==='signup'?'hidden':!canSignUp?'disabled title="Alta deshabilitada hasta activar el servicio"':'')+'>Crear cuenta</button>'+
   '<button id="auth-mode-recovery" type="button" '+(mode==='recovery'||mode==='update'?'hidden':'')+'>¿Olvidaste tu contraseña?</button>'+
   '</div><p id="auth-status" role="status" aria-live="polite" data-kind="info"></p>'+
   '<p class="auth-lab-notice">'+htmlEscape(reason)+'</p>'+
   '<p class="auth-lab-foot">Los datos antiguos no se importan automáticamente. Sin servidor seguro, MI BOWLING no desbloquea puntuaciones.</p>'+
   '</div></main>';
  for(const next of ['login','signup','recovery']){
   element.querySelector('#auth-mode-'+next)?.addEventListener('click',()=>{mode=next;render();});
  }
  element.querySelector('#auth-form')?.addEventListener('submit',async e=>{
   e.preventDefault();
   const email=element.querySelector('#auth-email')?.value?.trim()?.toLowerCase();
   const pw=element.querySelector('#auth-password')?.value;
   const confirm=element.querySelector('#auth-confirm')?.value;
   try{
    if(mode==='login')await login(email,pw);
    if(mode==='signup')await signup(email,pw,confirm);
    if(mode==='recovery')await requestReset(email);
    if(mode==='update')await updatePassword(pw,confirm);
   }catch(err){status('No se pudo completar la operación. Revisa los datos y vuelve a intentarlo.','error');}
  });
  if(!available)status('Servicio de autenticación no conectado. Acceso deshabilitado.','warning');
 }
 function loading(on){
  busy=on;
  const btn=element?.querySelector?.('#auth-form button[type="submit"]');
  if(btn)btn.disabled=on||!available;
 }
 async function login(email,password){
  if(busy)throw Error('Operación en curso');
  if(!available)throw Error('Autenticación y almacén privados no disponibles');
  if(!isEmail(email)||typeof password!=='string'||!password)throw Error('Credenciales inválidas');
  loading(true);
  try{
   await auth.signIn(email,password);
   const verified=await auth.getVerifiedUser();
   if(!verified?.id||!verified.email||verified.email.toLowerCase()!==email.toLowerCase())
    throw Error('Usuario no verificado');
   const docs=await repository.load(verified.id);
   if(!docs||docs.owner!==verified.id||!docs.personal||!docs.league)
    throw Error('Documentos de usuario sin propietario o incompletos');
   user=Object.freeze({...verified});verifiedDocs=docs;
   if(typeof options.onReady!=='function'){
    status('Identidad verificada. Falta habilitar la conexión de partidas privadas en LAB; ninguna partida se ha abierto.','warning');
    return {verified:true,opened:false,owner:verified.id};
   }
   await options.onReady({user,documents:docs});
   launched=true;
   status('Identificación correcta.','info');
   return {verified:true,opened:true,owner:verified.id};
  }catch(err){
   user=null;verifiedDocs=null;launched=false;
   // Never retain a signed-in session after the storage/identity verification fails.
   try{await auth.signOut();}catch(_){}
   status('No se pudo verificar la cuenta o sus datos privados. Ninguna partida se ha abierto.','error');
   throw err;
  }finally{loading(false);}
 }
 async function signup(email,password,confirmation){
  if(!canSignUp)throw Error('Las altas reales están deshabilitadas en este LAB');
  if(!isEmail(email)||typeof password!=='string'||password.length<12||password!==confirmation)
   throw Error('Correo o contraseña no válidos');
  loading(true);
  try{await auth.signUp(email,password);mode='login';render();status('Revisa tu correo para confirmar el alta. No se han importado partidas.');return true;}
  finally{loading(false);}
 }
 async function requestReset(email){
  if(!available||!isEmail(email))throw Error('No se puede recuperar contraseña');
  loading(true);
  try{
   await auth.requestReset(email,options.redirectTo||undefined);
   status('Si existe una cuenta, recibirás instrucciones para recuperar el acceso.');
   return true;
  }finally{loading(false);}
 }
 async function updatePassword(password,confirmation){
  if(!available||typeof password!=='string'||password.length<12||password!==confirmation)
   throw Error('La nueva contraseña no es válida');
  loading(true);
  try{
   await auth.updatePassword(password);
   await auth.signOut();
   user=null;verifiedDocs=null;launched=false;
   mode='login';render();
   status('Contraseña cambiada. Inicia sesión de nuevo.');
  }finally{loading(false);}
 }
 async function logout(){
  user=null;verifiedDocs=null;launched=false;
  try{if(available)await auth.signOut();}
  finally{
   if(typeof options.onClose==='function')await options.onClose();
   mode='login';render();
  }
 }
 function init(){
  if(closed)throw Error('Control de sesión cerrado');
  render();
  if(available&&typeof auth.onAuthChange==='function'){
   cleanup=auth.onAuthChange(event=>{
    if(event==='SIGNED_OUT'){
     user=null;verifiedDocs=null;launched=false;
     if(typeof options.onClose==='function')options.onClose();
     mode='login';render();
    }
    if(event==='PASSWORD_RECOVERY'){mode='update';render();}
   });
  }
  return true;
 }
 function destroy(){closed=true;cleanup?.();user=null;verifiedDocs=null;launched=false;}
 return Object.freeze({init,login,signup,requestReset,updatePassword,logout,destroy,
   getState:()=>({available,mode,verified:!!user,opened:launched,owner:user?.id||null})});
}
root.MiBowlingAuthGate=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
