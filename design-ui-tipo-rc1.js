/* MI BOWLING · LAB DISEÑO R1.
   Solo navegación accesible y modo visual opcional. No modifica app.js, db,
   puntuación, almacenamiento, contratos ni comunicaciones externas. */
(function(){
 'use strict';
 const view=document.getElementById('app');
 const side=document.querySelector('.design-lab-sidebar');
 const themeButtons=Array.from(document.querySelectorAll('[data-design-theme]'));
 if(!view||!side)return;

 function currentScreen(){
  const raw=typeof tab==='string'?tab:'inicio';
  return raw==='registro'?'nueva':raw==='detalle'?'historial':raw;
 }
 function syncNavigation(){
  const current=currentScreen();
  side.querySelectorAll('[data-design-target]').forEach(button=>{
   const active=button.dataset.designTarget===current;
   button.classList.toggle('is-active',active);
   if(active)button.setAttribute('aria-current','page');
   else button.removeAttribute('aria-current');
  });
 }
 function syncThemeButtons(){
  const dark=document.body.classList.contains('lab-dark');
  themeButtons.forEach(button=>{
   button.setAttribute('aria-pressed',String(dark));
   button.setAttribute('aria-label',dark?'Activar modo claro':'Activar modo oscuro');
   const icon=dark?'<svg class="ui-line-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>':'<svg class="ui-line-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
   button.innerHTML=icon+(button.dataset.designTheme==='compact'?'':dark?' Modo claro':' Modo oscuro');
  });
 }
 themeButtons.forEach(button=>button.addEventListener('click',()=>{
  document.body.classList.toggle('lab-dark');
  syncThemeButtons();
 }));
 new MutationObserver(syncNavigation).observe(view,{childList:true});
 syncNavigation();
 syncThemeButtons();
})();