'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),M=require('../integracion/pocket-entrada-real.js');
const r=(frame,ball,pins,extra={})=>({frame,ball,pins,ballId:'x',foul:false,...extra});
const all=[1,2,3,4,5,6,7,8,9,10];
assert.equal(M.pocketSide('diestro'),'1-3');
assert.equal(M.crossSide('diestro'),'1-2');
assert.equal(M.pocketSide('zurdo'),'1-2');
assert.equal(M.crossSide('zurdo'),'1-3');
assert.equal(M.clean('1-2'),'1-2');assert.equal(M.clean('unknown'),null);
const shots=[
 r(1,1,all), // sin marca: por petición del usuario, pocket supuesto
 r(2,1,[1,3],{impactSide:'1-2'}), // derriba 1 y 3 pero entró por 1-2: NO pocket
 r(3,1,[2,4,5]), // sin 1/3 derribados, pero entrada supuesta 1-3
 r(4,2,all), // segunda bola: no contar
 r(5,1,all,{foul:true}) // foul: no cuenta
];
const result=M.analyze(shots,'diestro');
assert.deepEqual({hit:result.hit,total:result.total,cross:result.cross,assumed:result.assumed,legacyHits:result.legacyHits,rate:result.rate},
 {hit:2,total:3,cross:1,assumed:2,legacyHits:2,rate:67});
const left=M.analyze([r(1,1,all),r(2,1,all,{impactSide:'1-3'})],'zurdo');
assert.equal(left.hit,1);assert.equal(left.cross,1);assert.equal(left.rate,50);
assert.equal(M.analyze([], 'diestro').rate,null);
const app=fs.readFileSync(path.join(root,'releases/catalogo-local-f1-fotos1/app.js'),'utf8');
const compact=fs.readFileSync(path.join(root,'integracion/registro-compacto.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(index.includes('integracion/pocket-entrada-real.js'));
assert(app.includes("r.ball===1&&['1-3','1-2'].includes(r.impactSide)"),'migración v2 conserva la trayectoria marcada');
assert(app.includes('setPocketCross(el)'),'edición retrospectiva sin rehacer lanzamientos');
assert(app.includes("Pocket 1–'+pocketStats(a).flank+' (estimado)"),'estadística etiquetada como estimación');
assert(compact.includes('id="rc-cross-first"'),'control de una casilla en marcador compacto');
assert(compact.includes('pendingPocketCross'),'retener selección durante renderizado');
assert(app.includes('window.MiBowlingEscritura.write(KEY,JSON.stringify(copy))'),'edición retrospectiva usa escritor existente');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),m=sw.match(/const HASHES=(\{[\s\S]*?\});/);
assert(m,'SW hashes presentes');const hashes=JSON.parse(m[1]);
for(const p of ['index.html','integracion/pocket-entrada-real.js','integracion/registro-compacto.js','releases/catalogo-local-f1-fotos1/app.js']){
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 assert.equal(hashes['./'+p],actual,'SHA256 '+p);
}
assert.equal(hashes['./'],hashes['./index.html']);
console.log('POCKET-REAL-DOMAIN PASS: sin marca asume 1-3, cruce 1-2 excluido aunque caigan 1+3, zurdos, 4 SHA y migración.');
