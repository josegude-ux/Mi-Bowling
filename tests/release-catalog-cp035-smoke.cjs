'use strict';
// Prevuelo candidato CP-035: recursos versionados y catálogo local. Sin red ni datos personales.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const app=read('app.js'),html=read('index.html'),sw=read('sw.js'),insights=read('arsenal-insights.js'),view=read('arsenal-view-lab.js'),css=read('styles.css');
const VERSION='3.3.10-catalogo',CACHE='mi-bowling-analitica-v3-3-10-catalogo-cp035',QUERY='3310cat1',MODULES='arsenal-catalog-cp035';
assert(app.includes("const APP_VERSION='"+VERSION+"'"),'Versión visible en la aplicación');
assert(app.includes("const KEY='mi-bowling-analitica-v2', OLDKEY='mi-bowling-v1'"),'Mismo contrato de almacenamiento');
assert(sw.includes("const CACHE='"+CACHE+"'"),'Caché PWA renovada');
const scripts=['official-calendar-2026-2027.js?v=338fgb1','arsenal-insights.js?v='+MODULES,'arsenal-view-lab.js?v='+MODULES,'app.js?v='+QUERY];
let last=-1;
for(const s of scripts){const pos=html.indexOf('<script src="'+s+'"></script>');assert(pos>last,'Scripts necesarios y en orden: '+s);last=pos}
assert(html.includes('styles.css?v='+QUERY),'CSS con query nueva');
for(const file of ['index.html','sw.js','app.js','styles.css']){
 const s=read(file);for(const stale of ['v3-3-9-arsenal-f1','3.3.9-arsenal-f1','339f1','arsenal-catalog-lab1'])assert(!s.includes(stale),'No reutilizar recurso obsoleto: '+stale+' en '+file);
}
const match=sw.match(/const ASSETS=(\[[^\n]+\]);/);
assert(match,'Array de precaché presente');
const assets=vm.runInNewContext(match[1]);
assert.equal(assets.length,new Set(assets).size,'No precachear entradas duplicadas');
for(const file of ['./','./index.html','./app.js?v='+QUERY,'./styles.css?v='+QUERY,'./arsenal-insights.js?v='+MODULES,'./arsenal-view-lab.js?v='+MODULES,'./official-calendar-2026-2027.js?v=338fgb1'])assert(assets.includes(file),'Archivo disponible offline: '+file);
const globals={};vm.runInNewContext(insights,globals);
assert.equal(globals.MiBowlingArsenal.profiles.length,10,'Exactamente diez modelos consultivos originales');
assert.equal(new Set(Array.from(globals.MiBowlingArsenal.profiles,x=>x.id)).size,10,'Sin duplicados de ficha técnica');
assert(view.includes('registerBallFromCatalog('),'Catálogo enlaza alta del arsenal');
assert(app.includes('function registerBallFromCatalog(')&&app.includes('function filterArsenalCatalog('),'Funciones de incorporación y búsqueda disponibles');
assert(css.includes('.arsenal-model-list')&&css.includes('#arsenal-catalog-search'),'Responsive y buscador preparados');
console.log('PASS candidata CP-035: version '+VERSION+', nueva caché, scripts, 10 perfiles, alta, assets PWA');
