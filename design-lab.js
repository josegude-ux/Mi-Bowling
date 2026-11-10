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
   if(button.dataset.designTheme==='compact')button.textContent=dark?'☀':'☾';
   else button.textContent=dark?'☀ Modo claro':'☾ Modo oscuro';
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