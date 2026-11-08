/* MI BOWLING · LAB A3 · Safari/PWA-safe email link landing.
 * Supabase mail template must use #token_hash=...&type=email|recovery.
 * The fragment stays out of HTTP logs, and is cleared before any async work.
 * A mail prefetcher cannot consume the token: requires explicit button click.
 * No login, scoreboard, or migration on this page. */
(function(root){
'use strict';
const HASH=/^[a-f0-9]{64}$/i, TYPES=['email','recovery'];
function parseAndScrub(location,history){
 const hash=String(location?.hash||''),query=String(location?.search||'');
 try{history?.replaceState?.(null,'',String(location?.pathname||'/'));}catch(_){}
 if(query||!hash.startsWith('#'))return null;
 const form=new URLSearchParams(hash.slice(1));
 if([...form.keys()].sort().join(',')!=='token_hash,type')return null;
 const type=form.get('type'),tokenHash=form.get('token_hash');
 if(!TYPES.includes(type)||!HASH.test(tokenHash||''))return null;
 return {type,tokenHash};
}
function create(options={}){
 const doc=options.document||root.document;
 const location=options.location||root.location;
 const history=options.history||root.history;
 const now=typeof options.now==='function'?options.now:()=>Date.now();
 const auth=options.auth||null;
 const element=options.element||doc?.getElementById?.('auth-link-gate');
 const pending=parseAndScrub(location,history);
 let mode=pending?'pending':'error',type=pending?.type||null,tokenHash=pending?.tokenHash||null;
 let verifiedId=null,verifiedAt=0,busy=false,disposed=false;
 const maxRecoveryMs=10*60*1000;
 function status(message){
  const node=element?.querySelector?.('#auth-link-status');
  if(node)node.textContent=String(message);
 }
 function paint(){
  if(!element)return;
  const titles={
   pending:type==='email'?'Confirmar correo electrónico':'Recuperar contraseña',
   verifying:'Comprobando enlace',
   confirmed:'Correo confirmado',
   password:'Nueva contraseña',
   done:'Contraseña actualizada',
   error:'Enlace no disponible'
  };
  const descriptions={
   pending:'Para proteger tu cuenta, pulsa el botón para verificar este enlace de un solo uso.',
   verifying:'Se está verificando el enlace con el servicio de identidad.',
   confirmed:'Correo verificado. Abre MI BOWLING y entra con tu correo y contraseña.',
   password:'La identidad se ha verificado. Introduce una contraseña nueva y confirma el cambio.',
   done:'Contraseña actualizada. Abre MI BOWLING e inicia sesión de nuevo.',
   error:'Este enlace no se puede verificar. Solicita uno nuevo desde MI BOWLING.'
  };
  const lock=!auth || mode!=='pending';
  element.innerHTML='<main class="auth-lab-screen"><section class="auth-lab-panel">'+
   '<div class="auth-lab-brand"><span aria-hidden="true">🎳</span><strong>MI BOWLING</strong><small>Identificación de jugadores · LAB</small></div>'+
   '<div class="auth-lab-subhead"><span>ENLACE PRIVADO DE CORREO</span></div>'+
   '<h2 id="auth-link-title">'+titles[mode]+'</h2>'+
   '<p class="auth-lab-notice" id="auth-link-desc">'+descriptions[mode]+'</p>'+
   (mode==='pending'?'<button id="auth-link-verify" type="button" class="auth-lab-primary" '+(lock?'disabled':'')+'>Verificar enlace</button>':'')+
   (mode==='password'?'<form id="auth-link-password-form">'+
    '<label for="auth-link-password">Nueva contraseña</label>'+
    '<input id="auth-link-password" type="password" autocomplete="new-password" minlength="12" required>'+
    '<label for="auth-link-confirm">Repetir contraseña</label>'+
    '<input id="auth-link-confirm" type="password" autocomplete="new-password" minlength="12" required>'+
    '<button class="auth-lab-primary" type="submit">Cambiar contraseña</button></form>':'')+
   '<p id="auth-link-status" role="status" aria-live="polite"></p>'+
   '<p class="auth-lab-foot">No se abrirán las puntuaciones desde un correo. La aplicación instalada puede tener otra sesión independiente.</p>'+
   '</section></main>';
  element.querySelector('#auth-link-verify')?.addEventListener('click',()=>{
   verify().catch(()=>{});
  });
  element.querySelector('#auth-link-password-form')?.addEventListener('submit',event=>{
   event.preventDefault();
   const pw=element.querySelector('#auth-link-password')?.value;
   const confirmation=element.querySelector('#auth-link-confirm')?.value;
   updatePassword(pw,confirmation).catch(()=>{});
  });
  if(!auth && mode==='pending')status('LAB sin servicio privado configurado. Verificación deshabilitada.');
 }
 async function clearSession(){
  verifiedId=null;verifiedAt=0;
  try{await auth?.signOut?.();}catch(_){}
 }
 async function verify(){
  if(disposed||busy||mode!=='pending'||!auth||!tokenHash)
   throw Error('Enlace no disponible o ya utilizado');
  busy=true;mode='verifying';
  const incomingHash=tokenHash,incomingType=type;
  tokenHash=null; // consume local copy immediately; never retry automatically
  paint();
  try{
   if(typeof auth.verifyLinkToken!=='function'||typeof auth.getVerifiedUser!=='function')
    throw Error('Proveedor sin verificación de enlace');
   await auth.verifyLinkToken(incomingType,incomingHash);
   if(disposed)throw Error('Página cerrada');
   const user=await auth.getVerifiedUser();
   if(!user?.id||!user.email)throw Error('Usuario no validado');
   if(incomingType==='email'){
    await clearSession();
    mode='confirmed';
   }else{
    verifiedId=user.id;verifiedAt=now();mode='password';
   }
   paint();
   return {verified:true,mode,owner:incomingType==='recovery'?verifiedId:null};
  }catch(error){
   await clearSession();mode='error';paint();
   status('El enlace no se pudo verificar o ya caducó. Solicita otro desde MI BOWLING.');
   throw Error('No se pudo verificar el enlace');
  }finally{busy=false;}
 }
 async function updatePassword(password,confirmation){
  if(disposed||busy||mode!=='password'||type!=='recovery'||!auth||!verifiedId)
   throw Error('No existe recuperación autorizada');
  if(now()-verifiedAt>maxRecoveryMs){
   await clearSession();mode='error';paint();
   throw Error('Sesión de recuperación caducada');
  }
  if(typeof password!=='string'||password.length<12||password!==confirmation)
   throw Error('La contraseña no cumple los requisitos');
  busy=true;
  try{
   const user=await auth.getVerifiedUser();
   if(!user?.id||user.id!==verifiedId)throw Error('Propietario cambió durante la recuperación');
   await auth.updatePassword(password);
   await clearSession();mode='done';paint();
   return true;
  }catch(error){
   await clearSession();mode='error';paint();
   status('No se pudo actualizar la contraseña. Solicita otro enlace.');
   throw Error('Error de recuperación');
  }finally{busy=false;}
 }
 async function cancel(){
  disposed=true;mode='error';tokenHash=null;
  await clearSession();paint();
 }
 paint();
 return Object.freeze({
  verify,updatePassword,cancel,
  getState:()=>({mode,type,verified:mode==='password',hasPendingToken:!!tokenHash,
   hasAuth:!!auth,disposed})
 });
}
root.MiBowlingEmailCallback=Object.freeze({create,parseAndScrub});
})(typeof window!=='undefined'?window:globalThis);
