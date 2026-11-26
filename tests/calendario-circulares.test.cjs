'use strict';
/* FEB 6246 + 6249: calendario aditivo y lista íntegra, únicamente LAB.
 * No alteración del calendario FGB original ni datos locales de la PWA. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sb={};vm.runInNewContext(read('official-calendar-2026-2027.js'),sb);
vm.runInNewContext(read('integracion/calendario-circulares.js'),sb);
const meta=JSON.parse(read('data/calendario-fgb-2026-2027.json'));
assert.deepEqual(JSON.parse(JSON.stringify(sb.BOWLING_OFFICIAL_CALENDAR_2026_27)),meta.events,'transcripción de calendario intacta');
const conf=sb.BOWLING_CALENDAR_CONFIRMED;
assert.deepEqual(Object.keys(conf).sort(),['FGB-2627-09','FGB-2627-10','FGB-2627-11','FGB-2627-12']);
for(const id in conf){
 const e=meta.events.find(x=>x.id===id);assert.equal(e.start,'2026-11-28');assert.equal(e.end,'2026-11-29');
 assert.match(conf[id].source,/6249/);assert.match(conf[id].url,/^integracion\/parejas-2026-6249\.html#/);
 assert(conf[id].details.every(x=>typeof x==='string'&&x.length));
}
const doc=JSON.parse(read('data/circular-feb-6249-parejas-2026.json'));
assert.equal(doc.circular,6249);assert.equal(doc.schema,'mi-bowling-circular-feb-6249-v1');
assert.equal(doc.participantes.length,161);assert.equal(doc.inscritos_total,161);
const expected={femenino:34,masculino_absoluto:40,masculino_2_3:32,masculino_senior:55};
for(const [k,v] of Object.entries(expected)){
 assert.equal(doc.categorias.find(x=>x.id===k).inscritos,v);
 assert.equal(doc.participantes.filter(x=>x.categoria===k).length,v);
}
assert.equal(doc.categorias.find(x=>x.id==='masculino_2_3').patron.longitud_pies,41);
assert.equal(doc.categorias.find(x=>x.id==='masculino_2_3').patron.volumen_ml,26.5);
const c=doc.participantes.filter(x=>x.categoria==='masculino_2_3'&&x.pareja==='CELTA XUNTA');
assert.deepEqual(c.map(x=>x.codigo).sort(),['ES 0147','ES 1046']);
assert(c.every(x=>x.turno_tabla===0&&x.pista===17));
const sw=read('sw.js'),m=sw.match(/const HASHES=(\{[\s\S]*?\});/);assert(m);
const hashes=JSON.parse(m[1]);for(const f of ['integracion/calendario-circulares.js','integracion/parejas-2026-6249.html','data/circular-feb-6249-parejas-2026.json']){
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
 assert.equal(hashes['./'+f],actual,'SW SHA-256 '+f);
}
assert(read('index.html').includes('integracion/calendario-circulares.js'));
assert(read('releases/catalogo-local-f1-fotos1/app.js').includes('BOWLING_CALENDAR_CONFIRMED'));
assert(read('integracion/parejas-2026-6249.html').includes('circular-feb-6249-parejas-2026.json'));
console.log('FEB-6249-LAB PASS: 161 entradas, 4 categorías, CELTA turno 0/pista 17, patrones, calendario y 3 hashes SW.');
