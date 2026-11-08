'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p));
const app=read('app.js').toString(),css=read('styles.css').toString(),index=read('index.html').toString(),sw=read('sw.js').toString();
new Function(app);
assert(app.includes("const KEY='mi-bowling-analitica-v2', OLDKEY='mi-bowling-v1'"),'No cambia el almacenamiento');
assert(app.includes("['calendario'")&&app.includes("'Calendario']"),'Calendario sustituye a Mis bolas en menú inferior');
assert(app.includes("tab==='calendario'?calendarView()"),'Ruta calendario funcional');
assert(app.includes('data-target="bolas"')&&app.includes('<strong>Mis bolas</strong>'),'Mis bolas accesible desde herramientas');
assert.equal((app.slice(app.indexOf('function home(){'),app.indexOf("let calendarMonth=")).match(/class="bowling-home-module bowling-home-module-/g)||[]).length,3,'Tres tarjetas VISURA');
assert(css.includes("url('./home-registro.jpg')")&&css.includes("url('./home-partidas.jpg')")&&css.includes("url('./home-estadisticas-limpio.jpg')"),'Tres fondos independientes');
assert(css.includes('.calendar-grid')&&css.includes('.calendar-day.selected'),'Estilos de calendario');
for(const filename of ['home-registro.jpg','home-partidas.jpg','home-estadisticas.jpg']){
 const bytes=read(filename);
 assert.equal(bytes.subarray(0,2).toString('hex'),'ffd8','JPEG correcto');
 assert(bytes.length>20000&&bytes.length<150000,'Imagen ligera con contenido');
 assert(sw.includes("'./"+filename+"'"),'Disponible sin conexión: '+filename);
}
assert(index.includes('styles.css?v=338fgb1')&&index.includes('app.js?v=338fgb1'),'Recursos PWA actualizados');
assert(sw.includes('mi-bowling-analitica-v3-3-8-prueba-fgbcalendar1'),'Caché distinta de producción previa');
const begin=app.indexOf('let calendarMonth='),end=app.indexOf("let newMode=",begin);
assert(begin>0&&end>begin,'Bloque de calendario encontrado');
const fixture={sessions:[
 {id:'LAB-A',date:'2026-11-08',type:'entrenamiento',title:'Entrenamiento ficticio',venue:'Bolera prueba',games:[{done:true}]},
 {id:'LAB-B',date:'2026-11-08',type:'oficial',title:'Liga ficticia',games:[{done:false}]},
 {id:'LAB-C',date:'2026-11-15',type:'entrenamiento',title:'Otro entrenamiento',games:[]},
 {id:'LAB-D',date:'2026-12-04',type:'oficial',title:'Diciembre ficticio',games:[]},
]};
const untouched=JSON.stringify(fixture);
let renderCount=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const block=app.slice(begin,end)+'return {view:calendarView,choose:chooseCalendarDay,month:changeCalendarMonth,state:()=>({month:calendarMonth,selected:calendarSelected})};';
const model=new Function('db','today','head','esc','render','complete',block)(fixture,()=>'2026-11-08',(a,b)=>'<header><h1>'+a+'</h1><p>'+b+'</p></header>',esc,()=>{renderCount++},g=>g.done);
let html=model.view();
assert(html.includes('Noviembre de 2026')||html.includes('Noviembre 2026'),'Título de mes');
assert(html.includes('3 sesión(es) registrada(s) este mes'),'Conteo por mes');
assert(html.includes('Entrenamiento ficticio')&&html.includes('Liga ficticia'),'Varias sesiones de un mismo día');
assert(!html.includes('Diciembre ficticio'),'No mezcla meses');
assert.equal((html.match(/class="calendar-day/g)||[]).length,30,'30 días de noviembre');
model.choose('2026-11-15');
html=model.view();
assert(html.includes('Otro entrenamiento'),'Selección de fecha actualiza agenda');
model.choose('2027-01-01');
assert.equal(model.state().selected,'2026-11-15','Rechaza fechas de fuera del mes');
model.month(2);
assert.equal(model.state().month,'2027-01','Navegación de año');
html=model.view();assert(html.includes('31')&&html.includes('0 sesión(es)'),'Enero sin sesiones');
model.month(-1);assert.equal(model.state().month,'2026-12','Retrocede mes');
model.choose('2026-12-04');assert(model.view().includes('Diciembre ficticio'),'Mes nuevo muestra sesión real');
assert(renderCount>=3,'Navegación actualiza pantalla');
assert.equal(JSON.stringify(fixture),untouched,'Calendario no modifica registros');
console.log('PASS portada VISURA, 3 imágenes, calendario de solo lectura, navegación, PWA y datos intactos');