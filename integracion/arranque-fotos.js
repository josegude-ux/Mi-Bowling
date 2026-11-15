'use strict';
/* Boot only after real Web Lock. On conflict fail closed and never execute writers. */
(function(){
 const cfg=document.currentScript.dataset, page=cfg.page;
 function stop(message){const node=document.createElement('main');node.id='f1-blocked';node.setAttribute('role','alert');node.textContent='MI BOWLING: '+String(message);const btn=document.createElement('button');btn.textContent='Volver a comprobar';btn.onclick=()=>location.reload();node.appendChild(btn);document.body.replaceChildren(node);}
 async function load(url){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.async=false;s.onload=resolve;s.onerror=()=>reject(Error('No se pudo cargar '+url));document.head.appendChild(s)});}
 const app=['official-calendar-2026-2027.js?v=338fgb1','arsenal-insights.js?v=arsenal-catalog-cp035','official-ball-catalog.js?v=official-catalog-cp037','releases/catalogo-local-f1-fotos1/arsenal-view.js','releases/catalogo-local-f1-fotos1/app.js','design-ui-tipo-rc1.js'];
 const scripts=page==='catalogo'?['fase1-fotos1.js']:app;
 window.MiBowlingAutoridad.startBrowser({onBlocked:stop,run:async guard=>{await window.MiBowlingRecuperacion.recover({guard,storage:localStorage,io:window.MiBowlingRecuperacion.browserIO()});window.MiBowlingRespaldo.validate(guard.snapshot());await window.MiBowlingFotosPrivadas.init();for(const s of scripts){guard.assertAuthority();await load(s);}if(page==='catalogo'?!window.MiBowlingCatalogoBooted:!window.MiBowlingCatalogoLocal)throw Error('Arranque incompleto; escrituras bloqueadas.');}}).catch(e=>stop(e.message));
})();
