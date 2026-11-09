'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f));
const app=read('app.js').toString(),css=read('styles.css').toString(),sw=read('sw.js').toString(),html=read('index.html').toString();
new Function(app);
assert(app.includes("const APP_VERSION='3.3.10-catalogo'"),'Versión funcional preservada');
assert(app.includes("const KEY='mi-bowling-analitica-v2', OLDKEY='mi-bowling-v1'"),'Sin migración de datos');
assert(html.includes('app.js?v=3310cat1')&&html.includes('styles.css?v=3310cat1'),'Recursos nuevos');
assert(sw.includes('mi-bowling-analitica-v3-3-10-ui-cp036'),'Caché nueva');
assert(css.includes("url('./home-estadisticas-limpio.jpg')"),'Tarjeta usa imagen sin porcentajes ilustrativos');
assert(!css.includes("url('./home-estadisticas.jpg')"),'Tarjeta no usa fondo anterior del 85%');
const jpg=read('home-estadisticas-limpio.jpg');
assert.equal(jpg.subarray(0,2).toString('hex'),'ffd8','JPEG válido');
assert(jpg.length>25000&&jpg.length<180000,'Peso adecuado');
for(const label of ['registro','partidas','estadisticas']){
 const file='icon-'+label+'-3d.svg',svg=read(file).toString();
 assert(svg.includes('<svg')&&svg.includes('linearGradient')&&svg.includes('feDropShadow'),'Icono con profundidad '+file);
 assert(app.includes('<img src="./'+file+'"'),'Icono utilizado '+file);
 assert(sw.includes("'./"+file+"'"),'Icono offline '+file);
}
assert(app.includes('class="bowling-home-module bowling-home-module-red"'),'Tarjeta roja conservada');
assert(app.includes('class="bowling-home-module bowling-home-module-blue"'),'Tarjeta azul conservada');
assert(app.includes('class="bowling-home-module bowling-home-module-gold"'),'Tarjeta dorada conservada');
const home=app.slice(app.indexOf('function home(){'),app.indexOf('let calendarMonth='));
assert(!home.includes('bowling-home-tools')&&!home.includes('bowling-home-tool-card'),'Inicio sin herramientas duplicadas');
assert(app.includes('Ver mis bolas →')&&app.includes('Biblioteca de patrones / PDF'),'Arsenal y patrones accesibles desde sus secciones');
assert(app.includes("['calendario'"),'Calendario permanece en navegación');
console.log('PASS CP-019 · Iconos tridimensionales estáticos, estadísticas sin 85%, tarjetas uniformes, PWA y datos intactos');
