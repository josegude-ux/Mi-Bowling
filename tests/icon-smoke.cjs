'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name));
for(const size of [180,192,512]){
 const b=read('icon-'+size+'.png');
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Cabecera PNG');
 assert.equal(b.readUInt32BE(16),size,'Anchura '+size);
 assert.equal(b.readUInt32BE(20),size,'Altura '+size);
 assert(b.length>10000,'Icono vacío');
}
const html=read('index.html').toString(),manifest=JSON.parse(read('manifest.json').toString()),
 sw=read('sw.js').toString(),app=read('app.js').toString(),css=read('styles.css').toString();
for(const name of ['icon-180.png','icon-192.png','icon-512.png'])assert(sw.includes('./'+name+'?v=338icon1'),'PWA precache '+name);
assert(html.includes('rel="apple-touch-icon" href="icon-180.png?v=338icon1"'),'Icono de iPhone');
assert(html.includes('rel="icon" href="icon-192.png?v=338icon1"'),'Favicon navegador');
assert(html.includes('manifest.json?v=338icon1'),'Manifest nuevo');
assert(manifest.icons.some(i=>i.src==='icon-192.png?v=338icon1'),'Manifest 192');
assert(manifest.icons.some(i=>i.src==='icon-512.png?v=338icon1'),'Manifest 512');
assert(html.includes('class="brand-mark"')&&html.includes('icon-192.png?v=338icon1'),'Icono de cabecera');
assert(app.includes('class="bowling-home-mark"')&&app.includes('icon-192.png?v=338icon1'),'Icono de inicio');
assert(css.includes('.bowling-home-mark img'),'Escalado responsive');
assert(sw.includes('mi-bowling-analitica-v3-3-8-prueba-visref1'),'Nueva caché para actualización');
assert(app.includes("const KEY='mi-bowling-analitica-v2', OLDKEY='mi-bowling-v1'"),'Sin modificación de datos');
console.log('PASS iconos 180/192/512, iPhone, manifest, cabeceras, caché y datos');
