'use strict';
/* 3.3.25 · Liga Nacional: elegir «Mi equipo» prepara 3 jornadas × 7 actas contra los otros 7 equipos,
 * sin tocar actas con resultados; cambiar un rival lo intercambia dentro de la jornada. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,r)=>{let rel=decodeURIComponent(new URL(q.url,'http://x').pathname).replace(/^\/+/,'');if(!rel||rel.endsWith('/'))rel+='index.html';fs.readFile(path.join(root,rel),(e,v)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':mime[path.extname(rel)]||'application/octet-stream'});r.end(v)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();
 try{const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>typeof go==='function'&&!!window.MiBowlingEscritura,null,{timeout:30000});
  // Un acta de la jornada 2 ya tiene resultado contra LEVANTE: no debe tocarse.
  await p.evaluate(()=>{const m=liga32.matches.find(x=>x.round===2&&x.match===3);m.rival='LEVANTE';m.players[0].scores=['201',''];liga32Save();go('liga')});
  await p.selectOption('.card select.input >> nth=2','CELTA XUNTA "B"');await p.waitForTimeout(200);
  const st=await p.evaluate(()=>[1,2,3].map(r=>liga32.matches.filter(x=>x.round===r).sort((a,b)=>a.match-b.match).map(x=>({my:x.myTeam,rival:x.rival,pend:!!x.orderPending}))));
  const others=['HALCONES "A"','COMARCAL "A"','LEVANTE','BOLICHES "B"','CAPITAL BOWLING "B"','BAT ROLLAN "B"','TOMAHAWK'];
  for(const ronda of st){assert.equal(ronda.length,7);assert(ronda.every(x=>x.my==='CELTA XUNTA "B"'));assert.deepEqual(ronda.map(x=>x.rival).sort(),[...others].sort(),'7 rivales distintos')}
  assert.equal(st[1][2].rival,'LEVANTE');
  const dates=await p.evaluate(()=>[1,2,3].map(r=>liga32.matches.filter(x=>x.round===r).sort((a,b)=>a.match-b.match).map(x=>x.date)));
  assert.equal(dates[0][0],'2027-01-23');assert.equal(dates[0][6],'2027-01-24');assert.equal(dates[2][3],'2027-05-29');assert.equal(dates[2][4],'2027-05-30');assert.equal(st[1][2].pend,false,'acta con datos conservada');
  assert.equal(await p.evaluate(()=>liga32.matches.find(x=>x.round===2&&x.match===3).players[0].scores[0]),'201');
  // Cambiar el rival del enfrentamiento 1 de la jornada 1 a TOMAHAWK lo intercambia.
  await p.evaluate(()=>{liga33Choose(1,1)});const before=st[0][0].rival;
  await p.selectOption('.card select.input >> nth=3','TOMAHAWK');await p.waitForTimeout(200);
  const r1=await p.evaluate(()=>liga32.matches.filter(x=>x.round===1).sort((a,b)=>a.match-b.match).map(x=>x.rival));
  assert.equal(r1[0],'TOMAHAWK');assert.equal(new Set(r1).size,7);assert(r1.includes(before));
  // Persistencia tras recargar.
  await p.reload();await p.waitForFunction(()=>typeof go==='function'&&!!window.MiBowlingEscritura,null,{timeout:30000});
  assert.equal(await p.evaluate(()=>liga32.matches.filter(x=>x.myTeam==='CELTA XUNTA "B"').length),21);
  await p.evaluate(()=>go('liga'));await p.screenshot({path:'/tmp/liga.png'});
  assert.deepEqual(errs,[]);console.log('LIGA EQUIPOS PASS · 21 actas, 7 rivales distintos por jornada, datos conservados, intercambio, persistencia');
 }finally{await b.close();srv.close()}})().catch(e=>{console.error(e);process.exit(1)});
