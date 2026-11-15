'use strict';
// BOWLING-UI-POSTPUB-001: evidencia del mínimo diff y copia para publicación posterior.
// No hace peticiones ni cambia contenido de sesiones.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const index=read('index.html'),sw=read('sw.js'),app=read('app.js'),styles=read('design-lab.css');
const oldCss=read('styles.css'),oldJS=read('design-lab.js');
for(const p of [app,sw,oldJS])new Function(p);
assert(index.includes('<title>MI BOWLING · Jugar, analizar y mejorar</title>'),'Título producción');
assert(!index.includes('Jugar, analizar y mejorar · LAB'),'Sin LAB en título');
assert(!index.includes('Laboratorio de diseño · Funcionalidad existente preservada'),'Sin LAB visible en menú');
assert(index.includes('Juega · Analiza · Mejora'),'Pie informativo normalizado');
assert(index.includes('design-lab.css?v=20261109-lab1')&&index.includes('design-lab.js?v=20261109-lab1'),
 'CSS y JS de la integración visual siguen conectados');
assert(sw.includes("const CACHE='mi-bowling-analitica-v3-3-10-catalogo-cp037'"),'Caché nueva');
for(const name of ['design-lab.css?v=20261109-lab1','design-lab.js?v=20261109-lab1','arsenal-insights.js?v=arsenal-catalog-cp035',
 'official-calendar-2026-2027.js?v=338fgb1','official-ball-catalog.js?v=official-catalog-cp037','arsenal-view-lab.js?v=arsenal-catalog-cp037'])assert(sw.includes(name),'Precarga '+name);
assert(app.includes("const APP_VERSION='3.3.10-catalogo'"),'Versión funcional sin alterar');
assert(app.includes("const KEY='mi-bowling-analitica-v2'"),'Mismo esquema de datos');
assert(oldCss.includes('.registry-v4')&&styles.includes('.registry-v4'),'Registro conserva CSS anterior');
assert(app.includes("function undoRoll()")&&app.includes("function recordRoll("),'Operación de juego intacta');
assert(app.includes("function ballsView()")&&app.includes("function stats()"),'Arsenal y estadísticas intactas');
console.log('PASS POSTPUB LAB: copy público, caché CP-036, invariantes de datos, motor y funcionalidades.');
