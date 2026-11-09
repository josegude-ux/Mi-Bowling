'use strict';
/* MI BOWLING · DISEÑO LAB R1 · contrato visual estático.
 * Este ensayo no altera puntuación, datos reales ni la aplicación publicada. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('index.html'),css=read('design-lab.css'),js=read('design-lab.js'),sw=read('sw.js'),app=read('app.js');
new Function(js);
assert(html.includes('href="design-lab.css?v=20261109-lab1"'),'Capa LAB de estilos conectada');
assert(html.includes('src="design-lab.js?v=20261109-lab1"'),'Control LAB conectado');
assert(html.includes('styles.css?v=3310cat1')&&html.includes('app.js?v=3310cat1'),'Motor y estilos anteriores siguen conectados');
for(const [screen,label] of Object.entries({inicio:'Inicio',nueva:'Jugar',bolas:'Mis bolas',estadisticas:'Análisis',patrones:'Patrones',historial:'Historial',calendario:'Calendario',ajustes:'Ajustes'})){
 assert(html.includes('data-design-target="'+screen+'"'),'Ruta '+screen);
 assert(html.includes('> '+label+'</button>'),'Texto '+label);
}
for(const token of ['--teal:#086fd4','--paper:#fff','.registry-v4-score .score-action-buttons','grid-template-columns:1fr 1fr','@media(min-width:1120px)','@media(max-width:650px)','body.lab-dark','.arsenal-choice','.ball-session-toggle']){
 assert(css.includes(token),'Estilo '+token);
}
for(const token of ['MutationObserver','aria-current','aria-pressed','classList.toggle']){
 assert(js.includes(token),'Accesibilidad '+token);
}
for(const forbidden of ['localStorage.setItem','sessionStorage.setItem','indexedDB','fetch(','XMLHttpRequest','WebSocket','recordRoll()','save()']){
 assert(!js.includes(forbidden),'El complemento no debe ejecutar '+forbidden);
}
assert(/const CACHE='(?:mi-bowling-lab-visual-20261109-r1|mi-bowling-analitica-v3-3-10-ui-cp036)'/.test(sw),'Caché visual separada de CP-035 y versionada');
assert(sw.includes("'./design-lab.css?v=20261109-lab1'"),'CSS offline LAB');
assert(sw.includes("'./design-lab.js?v=20261109-lab1'"),'JS offline LAB');
assert(app.includes("const KEY='mi-bowling-analitica-v2'"),'Datos existentes intactos');
assert(app.includes('function recordRoll('),'Registro funcional preservado');
assert(app.includes('function undoRoll('),'Deshacer funcional preservado');
assert(app.includes('function ballsView('),'Arsenal funcional preservado');
assert(app.includes('function stats('),'Estadísticas preservadas');
assert(app.includes('function calendarView('),'Calendario preservado');
console.log('PASS DISEÑO LAB R1: navegación 8 destinos, tema, CSS responsive, activos offline, motor y datos intactos.');