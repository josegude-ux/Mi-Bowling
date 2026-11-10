/* MI BOWLING · Comprueba que todos los scripts y estilos se precargan offline.
 * Sin acceso a red. Ejecutar: node tests/offline-assets.test.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const match=sw.match(/const ASSETS=([^\n;]+);/);
assert.ok(match,'Falta la lista de recursos de PWA');
const assets=vm.runInNewContext(match[1],{});
const re=/(?:src|href)="((?:styles|line-editor|lane-3d|app)[\w.-]*\.(?:js|css)(?:\?[^"]+)?)"/g;
const needed=[...html.matchAll(re)].map(x=>x[1]);
assert.equal(needed.length,6,'Esperados 3 CSS y 3 JS: '+needed.join(', '));
for(const target of needed){
  assert.ok(assets.includes('./'+target),'Falta en caché offline: '+target);
  assert.ok(fs.existsSync(path.join(root,target.split('?')[0])),'No existe: '+target);
}
assert.match(sw,/mi-bowling-analitica-v3-3-10-ui-cp036/,'Caché versionada de laboratorio');
assert.ok(html.indexOf('src="lane-3d.js')<html.indexOf('src="line-editor.js'),'El editor 3D se debe cargar antes de la integración cenital');
assert.ok(html.indexOf('src="line-editor.js')<html.indexOf('src="app.js'),'El editor debe cargar antes de la app');
console.log('OK · Cache PWA: 6 recursos CSS/JS versionados, orden de scripts y ficheros existentes');
