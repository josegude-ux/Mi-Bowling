'use strict';
/* 3.3.28 · Lectores FGB con líneas sintéticas (mismo formato que los PDF reales, nombres ficticios). */
const assert=require('node:assert/strict');const F=require('../integracion/resultados-fgb.js');
const gen=['CLASIFICACIÓN GENERAL 2026-2027','MASCULINA','Pos Cat Nombre Club Part Bolos Prom Mx Par','1 1M PEREZ GOMEZ, Juan Carlos CELTA 18 3401 188,944 242','2 3M PEREZ VILA, Raul CELTA 18 2986 165,889 209','3 1M ALVAREZ CABA, Cirilo CELTA 18 3201 177,833 214','4 2M ALVAREZ QUIN, Arturo Cirilo CELTA 18 3147 174,833 255','5 2M GARCIA RIO, Jose MILESIOS 18 3072 170,667 230','6 3M LARGO NOMBRE DE APELLIDO, Jose MariaCELTA 0 0 0,000 0','FEMENINA','HDCP','Pos Cat Nombre Club Part Bolos Prom Mx Par ACTUAL','1 U DIAZ LOPEZ, Ana SOLBOWLING 12 2079 173,250 211 16'];
const g=F.parse(gen);assert.equal(g.kind,'general');assert.equal(g.rows.length,7);assert.equal(g.rows[5].club,'CELTA');assert.equal(g.rows[6].gender,'F');assert.equal(g.rows[6].hdcp,16);
const reg=g.rows.map(r=>({...r,key:F.personKey(r.name)}));
const par=F.parse(['PAREJAS GALLEGO 2026-2027','PODIUM','CATEGORÍA “A” BOLOS SCRATCH','Pos Pareja Club Bolos Prom J1 J2','1 J. PEREZ / C. ALVAREZ CELTA 2328 194,000 1101 1227','CATEGORÍA “C”','Pos Pareja Club Bolos Prom J1 J2','1 R. PEREZ / A. ALVAREZ CELTA 1911 159,250 1074 837','JUGADORES INDIVIDUALES','Pos JUGADORES Club Bolos Prom SCRATCH HCDP','1 JOSE RIO MILESIOS 1126 187,667 898 38']);
assert.equal(par.kind,'parejas');assert.equal(par.rows.length,3);assert.deepEqual(par.rows[0].parts,[1101,1227]);assert.equal(par.rows[1].sect,'Cat. C');
assert.equal(F.resolve('J. PEREZ','CELTA',reg),'PEREZ_GOMEZ|JUAN');assert.equal(F.resolve('R. PEREZ','CELTA',reg),'PEREZ_VILA|RAUL');
assert.equal(F.resolve('C. ALVAREZ','CELTA',reg),'ALVAREZ_CABA|CIRILO');assert.equal(F.resolve('A. ALVAREZ','CELTA',reg),'ALVAREZ_QUIN|ARTURO');
assert.equal(F.resolve('JOSE RIO','MILESIOS',reg),'GARCIA_RIO|JOSE');assert.equal(F.resolve('CIRI ALVAREZ','CELTA',reg,'2M'),'ALVAREZ_QUIN|ARTURO');assert.equal(F.resolve('NADIE','CELTA',reg),null);
const copa=F.parse(['COPA PRESIDENTE 2026-2027','VIGO 10-11 OCTUBRE 2026','ADELANTADO 2a SERIE','PRIMERA CATEGORIA','Pos Nombre Club Bolos SCRATCH SERIE','1 JUAN PEREZ CELTA 1259 1259 S3','CATEGORIA UNICA FEMENINA','Pos Nombre Club HDCP Bolos SCRATCH SERIE','1 ANA DIAZ SOLBOWLING 18 1008 900 S1']);
assert.equal(copa.kind,'copa');assert.equal(copa.date,'2026-10-10');assert.equal(copa.rows[0].cat,'1M');assert.equal(copa.rows[1].hdcp,18);
const pis=F.parse(['COPA PRESIDENTE 2026-2027','PRIMERA SERIE','VIGO 10 OCTUBRE 2026 10:00','ORDEN PISTAS PROMEDIOS','CAT Nombre Club Prom PISTAS PISTAS','1 1M JUAN PEREZ CELTA 202,545 5A 7A','SEGUNDA SERIE','VIGO 11 OCTUBRE 2026 09:00','ORDEN PISTAS PROMEDIOS','1 3M RAUL PEREZ CELTA 149,999 4A 2A']);
assert.equal(pis.kind,'pistas');assert.deepEqual(pis.rows.map(r=>[r.date,r.time,r.lanes.join('-')]),[['2026-10-10','10:00','5A-7A'],['2026-10-11','09:00','4A-2A']]);
const ser=F.parse(['INSCRIPCION 1er CIRCUITO 2026-2027','SERIE SABADO (10:00)','POS JUGADOR Club Prom SERIE','1 RAUL PEREZ CELTA SABADO (10:00)','SERIE DOMINGO (09:00)','POS JUGADOR Club Prom SERIE','1 JOSE RIO MILESIOS DOMINGO (09:00)']);
assert.equal(ser.kind,'series');assert.deepEqual(ser.rows.map(r=>r.serie),['Sabado 10:00','Domingo 09:00']);
assert.equal(F.parse(['RESULTADOS DE LA 10ª PARTIDA','nada']),null);
console.log('resultados-fgb: OK');
