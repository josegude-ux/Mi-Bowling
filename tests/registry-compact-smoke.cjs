'use strict';
// MI BOWLING: smoke repeatible del nuevo registro compacto, sin dependencias.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
new Function(app);
const start=app.indexOf('function registryFrameMissedPins(');
const end=app.indexOf('function changeBall(',start);
assert(start>=0 && end>start,'Función de registro localizado');
const PINS=[1,2,3,4,5,6,7,8,9,10],RACK=[[7,8,9,10],[4,5,6],[2,3],[1]];
const ONE=[{frame:1,ball:1,pins:[1,2,3,4,5,6,7,8]}];
function render(pair,rolls,done){
 const g={id:'g1',pair,rolls},s={id:'s1',type:'entrenamiento',date:'2026-11-08',title:'Prueba',games:[g],currentBallId:'',currentLine:{approach:'20',arrow:'15',breakpoint:'8'}};
 const ctx={
  session:()=>s,game:()=>g,next:()=>done?{done:true,frame:10}:{done:false,frame:5,ball:1,available:PINS},
  currentLane:()=>({pair,lane:pair?pair[0]:null}),complete:()=>!!done,
  head:()=>'<div class="section-head"></div>',score:()=>89,
  scoreStrip:()=>'<div class="score-strip"></div>',
  rackUI:()=>'<div class="pin-layout"></div>',
  ballSelect:()=>'<select id="roll-ball"></select>',
  laneVisual:()=>'<div class="lane-visual"></div>',
  rollLog:()=>'<div class="roll-log"></div>',
  pairEditor:()=>'<div class="pair-editor"></div>',
  finishedGame:()=>'<div class="finished"></div>',
  quickLayout:'standard',selection:[],editPair:false,ligaReturn:null,
  registryDetailsOpen:false,registryHistoryOpen:false,
  esc:x=>String(x),PINS,RACK,rollsIn:(obj,f)=>obj.rolls.filter(x=>x.frame===f),isSplit:()=>false
 };
 const fn=new Function(...Object.keys(ctx),app.slice(start,end)+'return registry();');
 return fn(...Object.values(ctx));
}
for(const pair of [null,[7,8]]){
 for(const rolls of [[],ONE]){
  const html=render(pair,rolls,false);
  assert(html.indexOf('registry-v4-score')<html.indexOf('registry-v4-rack-wrap'),'Marcador antes que los bolos');
  assert.equal((html.match(/class="registry-v4-mini-frame"/g)||[]).length,10,'Diez diagramas de frame');
  assert(html.includes('Cambiar par')&&html.includes('Deshacer último lanzamiento'),'Ambas acciones visibles');
  assert.equal(html.split('onclick="undoRoll()"').length-1,1,'Un botón de deshacer');
  assert.equal(html.includes('onclick="undoRoll()" disabled'),rolls.length===0,'Deshacer desactivado en partida vacía');
  assert(html.includes('onclick="fastRoll(true)"')&&html.includes('onclick="fastRoll(false)"')&&html.includes('onclick="foulRoll()"'),'Atajos conservados');
  assert(html.includes('onclick="selection=[];render()"'),'Limpiar selección');
  assert(html.includes('id="roll-ball"')&&html.includes('registry-v4-extra'),'Bola en desplegable');
  assert(html.includes('lane-visual')&&html.includes('registry-v4-history'),'Línea visual e historial conservados');
  assert.equal((html.match(/<details/g)||[]).length,(html.match(/<\/details>/g)||[]).length,'Desplegables equilibrados');
  assert.equal((html.match(/<div\b/g)||[]).length,(html.match(/<\/div>/g)||[]).length,'Contenedores equilibrados');
 }
}
// Los errores de la segunda tirada se colorean solo cuando se cierra el frame.
const miniContext={
 PINS,RACK,rollsIn:(g,f)=>g.rolls.filter(r=>r.frame===f),
 complete:()=>true
};
const miniCode=app.slice(app.indexOf('function registryFrameMissedPins('),app.indexOf('function registry(){'));
const mk=new Function(...Object.keys(miniContext),miniCode+'return {registryPinMini,registryFrameMissedPins};')(...Object.values(miniContext));
const buildGame=rolls=>({rolls});
const first={frame:1,ball:1,pins:[1,2,3,4,5,6,7,8]}, secondMiss={frame:1,ball:2,pins:[9]}, secondSpare={frame:1,ball:2,pins:[9,10]};
assert.equal(mk.registryFrameMissedPins(buildGame([first]),1),null,'Primera tirada nunca señala rojo');
assert.deepEqual(mk.registryFrameMissedPins(buildGame([first,secondMiss]),1),[10],'Bolo 10 restante al cerrar');
assert.deepEqual(mk.registryFrameMissedPins(buildGame([first,secondSpare]),1),[],'Spare no deja rojos');
assert.equal(mk.registryFrameMissedPins(buildGame([{frame:1,ball:1,pins:[...PINS]}]),1),null,'Strike no marca rojos');
assert.equal(mk.registryFrameMissedPins(buildGame([]),1),null,'Sin tirar no marca rojos');
assert.deepEqual(mk.registryFrameMissedPins(buildGame([{frame:10,ball:1,pins:[1,2,3,4,5,6,7,8]},{frame:10,ball:2,pins:[9]}]),10),[10],'Décimo abierto al terminar');
const secondOther={frame:1,ball:2,pins:[]};
assert.deepEqual(mk.registryFrameMissedPins(buildGame([first,secondOther]),1),[9,10],'Dos bolos fallados son dos rojos');
const htmlOpen=mk.registryPinMini(buildGame([first,secondMiss]));
assert.equal((htmlOpen.match(/class="registry-v4-mini-dot missed"/g)||[]).length,1,'Un solo punto rojo');
assert(htmlOpen.includes('data-pin="10" aria-hidden="true" class="registry-v4-mini-dot missed"'),'Posición del bolo 10 en rojo');
const pinClass=(html,pin)=>html.match(new RegExp('data-pin="'+pin+'" aria-hidden="true" class="registry-v4-mini-dot ([a-z-]+)"'))?.[1];
assert.equal(pinClass(mk.registryPinMini(buildGame([first])),9),'standing','Bolo 9 en negro tras primera');
assert.equal(pinClass(mk.registryPinMini(buildGame([first])),10),'standing','Bolo 10 en negro tras primera');
assert.equal(pinClass(mk.registryPinMini(buildGame([first])),8),'fallen','Bolos de primera en gris');
assert.equal(pinClass(mk.registryPinMini(buildGame([first,secondMiss])),9),'standing','Derribado en segunda sigue negro');
assert.equal(pinClass(mk.registryPinMini(buildGame([first,secondMiss])),10),'missed','En pie tras segunda rojo');
assert.equal(pinClass(mk.registryPinMini(buildGame([first,secondMiss])),8),'fallen','Derribado en primera sigue gris');
assert.equal(pinClass(mk.registryPinMini(buildGame([first,secondSpare])),9),'standing','Spare: derribado en segunda negro');
assert.equal(pinClass(mk.registryPinMini(buildGame([first,secondSpare])),10),'standing','Spare: último derribado en segunda negro');
assert.equal((mk.registryPinMini(buildGame([first,secondSpare])).match(/class="registry-v4-mini-dot missed"/g)||[]).length,0,'Spare sin rojos');
assert.equal((mk.registryPinMini(buildGame([first,secondMiss])).match(/class="registry-v4-mini-dot standing"/g)||[]).length,1,'Un negro en la segunda');
assert(app.includes('Negro: en pie tras la 1.ª / derribados en la 2.ª.'),'Leyenda de negro');
assert(app.includes('Rojo: en pie tras la 2.ª.'),'Leyenda de rojo');
const htmlFirst=mk.registryPinMini(buildGame([first]));
assert.equal((htmlFirst.match(/class="registry-v4-mini-dot missed"/g)||[]).length,0,'No rojo antes de segunda tirada');
const htmlSpare=mk.registryPinMini(buildGame([first,secondSpare]));
assert.equal((htmlSpare.match(/class="registry-v4-mini-dot missed"/g)||[]).length,0,'No rojo con spare');
assert(css.includes('.registry-v4 .registry-v4-mini-dot.missed'),'Estilo rojo definido');
assert(app.includes('Rojo: en pie tras la 2.ª.'),'Leyenda correcta');

const finished=render([7,8],ONE,true);
assert(finished.includes('registry-v4-score')&&finished.includes('class="finished"'),'Marcador final disponible');
assert(!finished.includes('registry-v4-rack-wrap'),'No mostrar selector después de terminar');
const pos=app.indexOf('function scoreStrip('),pos2=app.indexOf('function rackUI(',pos);
const makeScore=new Function('frameScores','rollsIn','isSplitFirst',app.slice(pos,pos2)+'return scoreStrip;');
const scoreStrip=makeScore(()=>Array(10).fill(null),(g,f)=>g.rolls.filter(x=>x.frame===f),()=>false);
const scoreHtml=scoreStrip({rolls:ONE},{frame:5});
assert.equal((scoreHtml.match(/class="frame-cell/g)||[]).length,10,'Marcador completo de diez frames');
assert(css.includes('grid-template-columns:repeat(10,minmax(0,1fr))'),'Marcador responsive de 10 frames');
assert(css.includes('.registry-v4 .pin'),'Bolos grandes en la pantalla de registro');
assert(app.includes('Si no marcas ninguno, anotarás todos derribados.'),'Aclaración de strike accidental');
assert(css.includes('@media(max-width:370px)') && css.includes('grid-template-columns:repeat(2,minmax(0,1fr))!important'),'Atajos en 2 columnas a 320px');
assert(app.includes("classList.toggle('registry-screen',tab==='registro')"),'Modo anotación activado solo en registro');
assert(css.includes('body.registry-screen .bottom-nav{display:none!important}'),'Navegación inferior oculta durante anotación');
assert(app.includes('aria-pressed="${selection.includes(p)}"'),'Estado accesible en bolos');
assert(app.includes('registry-v4-quick-caption'),'Advertencia sobre atajos automáticos');
assert(css.includes('.registry-v4-quick.quick-large .btn'),'Respeta botones grandes');
assert(app.includes("const KEY='mi-bowling-analitica-v2'"),'Sin migración de datos');
assert(app.includes("const APP_VERSION='3.3.8-prueba'"),'Versión de laboratorio');
assert(index.includes('app.js?v=338prueba')&&index.includes('styles.css?v=338prueba'),'Referencias coherentes');
assert(sw.includes('mi-bowling-analitica-v3-3-8-prueba'),'Caché de LAB');
console.log('MI BOWLING LAB: registro compacto validado (4 estados, 10 frames, controles, datos, caché).');
