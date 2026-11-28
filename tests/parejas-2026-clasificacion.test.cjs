'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const C=require('../integracion/parejas-2026-clasificacion.js'),P=require('../integracion/parejas-2026-planificador.js');
assert.equal(C.score(0),true);assert.equal(C.score(300),true);assert.equal(C.score(301),false);
assert.equal(C.score(-1),false);assert.equal(C.score('100'),false);
const marker=P.marker('2026-11-28'),ids=()=>String(Math.random());
const sat=P.draft('2026-11-28',17,ids),sun=P.draft('2026-11-29',19,ids);
sat.games[0].finalOnly=180;sun.games[0].finalOnly=195;
let state=C.updateLazaro(null,0,160);
assert.equal(state.lazaro[0],160);
assert.deepEqual(C.cleanState({schema:1,lazaro:[160,301,-1,0,'22',null]}).lazaro,[160,null,null,0,null,null]);
assert.throws(()=>C.updateLazaro(state,0,301),/PUNTUACION_0_300/);
assert.throws(()=>C.updateLazaro(state,6,100),/PARTIDA_INVALIDA/);
assert.equal(C.updateLazaro(state,0,null).lazaro[0],null);
sat.parejas2026=state;sun.parejas2026=C.updateLazaro(null,0,200);
const weeks=C.pairs([sat,sun],g=>typeof g.finalOnly==='number',g=>g.finalOnly);
assert.deepEqual([weeks[0].joseTotal,weeks[0].lazaroTotal,weeks[0].combinedTotal,weeks[0].played],[180,160,340,1]);
assert.deepEqual([weeks[1].joseTotal,weeks[1].lazaroTotal,weeks[1].combinedTotal,weeks[1].played],[195,200,395,1]);
const lines=['CLASIFICACION PAREJAS 2026','SEGUNDA CATEGORIA','POS CAT PAREJA PARTIDAS BOLOS','1 2M EQUIPO UNO 1 400','2 2M CELTA XUNTA 1 380','3 2M EQUIPO TRES 1 360','TERCERA CATEGORIA','1 3M OTRO EQUIPO 1 390','2 3M OTRO DOS 1 379'];
const parsed=C.parseTextLines(lines);
assert.equal(parsed.rows.length,5);
assert.deepEqual(parsed.celta.map(x=>x.team),['CELTA XUNTA']);
assert(parsed.rows.slice(0,3).every(x=>x.cat==='2ª'));
assert(parsed.rows.slice(3).every(x=>x.cat==='3ª'));
// Réplica FICTICIA (sin PDF ni datos personales de la competición): filas Excel/FEB
// por 6 partidas, promedio sobre 12 entradas y dos categorías en un único documento.
const febLines=[
 'FEDERACION ESPANOLA DE BOLOS',
 'CLASIFICACION 2ª MASCULINA',
 '1ª SERIE',
 'ORD PAREJA CODG JUGADORES 1ª PART 2ª PART 3ª PART 4ª PART 5ª PART 6ª PART PART BOLOS PROMEDIO MAXPT',
 '1 Total CLUB FICTICIO ALFA 400 450 320 380 430 410 12 2390 199,167 450',
 '2 Total CELTA XUNTA 401 399 389 372 400 398 12 2359 196,583 401',
 '3 Total CLUB FICTICIO BETA 360 400 390 360 370 400 12 2280 190,000 400',
 '4 Total CLUB INVALIDO 100 100 100 100 100 100 12 999 83,250 100',
 'CLASIFICACION 3ª MASCULINA',
 '1ª SERIE',
 '1 Total CLUB FICTICIO GAMMA 310 320 300 290 310 280 12 1810 150,833 320',
 '2 Total CLUB FICTICIO DELTA 300 320 280 290 305 275 12 1770 147,500 320',
 '8 Total CELTA XUNTA',
 '9 Total 0'
];
const febResult=C.parseTextLines(febLines);
assert.equal(febResult.rows.length,5,'5 totales válidos de las dos categorías, no jugadores ni filas vacías');
assert.equal(febResult.rows.filter(r=>r.cat==='2ª').length,3);
assert.equal(febResult.rows.filter(r=>r.cat==='3ª').length,2);
assert.deepEqual(febResult.celta.map(r=>[r.pos,r.cat,r.team,r.bolos]),[[2,'2ª','CELTA XUNTA',2359]]);
assert.equal(febResult.rows.some(r=>r.team==='CLUB INVALIDO'),false,'no aceptar totales incongruentes');
assert.equal(C.validateRows(febResult.rows,'2ª').length,5);
assert.throws(()=>C.validateRows(febResult.rows,'3ª'),/IDENTIFICAR_CELTA_XUNTA/,'Celta 3ª sin bolos no es segunda pareja');
const reviewed=C.validateRows(parsed.rows,'2ª');
assert.equal(reviewed.length,5);
assert.throws(()=>C.validateRows(reviewed.filter(x=>x.team!=='CELTA XUNTA'),'2ª'),/IDENTIFICAR_CELTA_XUNTA/);
assert.throws(()=>C.validateRows(reviewed.map(x=>x.team==='CELTA XUNTA'?{...x,bolos:99999}:x),'2ª'),/REVISAR_FILA/);
assert.throws(()=>C.validateRows([{...reviewed[0]},{...reviewed[1],pos:reviewed[0].pos},reviewed[2]],'2ª'),/POSICION_DUPLICADA/);
const dig='a'.repeat(64),date='2026-11-26T10:00:00.000Z';
const raw={day:'2026-11-28',game:1,category:'2ª',fileName:'prueba-oficial-ficticia.pdf',digest:dig,savedAt:date,rows:reviewed};
state=C.addSnapshot(state,raw);
assert.equal(state.rankings.length,1);
assert.equal(state.rankings[0].version,1);
assert.throws(()=>C.addSnapshot(state,raw),/PDF_YA_GUARDADO/);
const latest={...raw,digest:'b'.repeat(64),rows:reviewed.map(x=>x.team==='CELTA XUNTA'?{...x,pos:1,bolos:420}:x.team==='EQUIPO UNO'?{...x,pos:2,bolos:410}:x)};
state=C.addSnapshot(state,latest);
assert.equal(state.rankings[1].version,2);
let view=C.rankingView(state.rankings,'2ª','2026-11-28',1);
assert.equal(view.me.pos,1);assert.equal(view.change,1);assert.equal(view.gapLeader,0);
assert.equal(view.gapPodium,-60);
assert.equal(C.rankingView(state.rankings,'3ª','2026-11-28',1),null);
const invalid=C.cleanState({schema:1,lazaro:[2],rankings:[{a:'corrupt'},...state.rankings]});
assert.equal(invalid.rankings.length,2);
assert.equal(invalid.lazaro[0],2);
const app=read('releases/catalogo-local-f1-fotos1/app.js'),compact=read('integracion/registro-compacto.js'),index=read('index.html'),sw=read('sw.js');
assert(index.includes('integracion/parejas-2026-clasificacion.js'));
assert(app.includes('parejas2026:window.MiBowlingParejasClasificacion.cleanState(s.parejas2026)'),'migrate conserva datos adicionales');
assert(app.includes('window.MiBowlingEscritura.write(KEY,JSON.stringify(copy))'),'escritura bajo autoridad existente');
assert(app.includes('clasificacionParejasPdfView()'));
assert(compact.includes('guardarLazaroPartidaActual()'));
const matches=sw.match(/const HASHES=(\{[\s\S]*?\});/);assert(matches);
const hashes=JSON.parse(matches[1]);for(const f of ['index.html','integracion/parejas-2026-clasificacion.js','integracion/registro-compacto.js','releases/catalogo-local-f1-fotos1/app.js']){
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
 assert.equal(hashes['./'+f],actual,'SW SHA-256 '+f);
}
assert.equal(hashes['./'],hashes['./index.html']);
console.log('PAREJAS-2026-CLASIFICACION-DOMAIN PASS: 2 categorias, Celta, duplicados, snapshots, medias separadas, 4 SHA.');
