'use strict';
/* 3.3.27 · Importar PDF «RESULTADOS Nº ENFRENTAMIENTO» (formato FEB: POS CODG CLUB JUGADORES PART BOLOS PROMD MAX MAXS). */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,r)=>{let rel=decodeURIComponent(new URL(q.url,'http://x').pathname).replace(/^\/+/,'');if(!rel||rel.endsWith('/'))rel+='index.html';fs.readFile(path.join(root,rel),(e,v)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':mime[path.extname(rel)]||'application/octet-stream'});r.end(v)})});
const TEAMS=['HALCONES “A”','COMARCAL “A”','LEVANTE','BOLICHES “B”','CELTA XUNTA “B”','CAPITAL BOWLING “B”','BAT ROLLAN-AT VALOR “B”','TOMAHAWK'];
// Jugadores por equipo: 7 cada uno. Código ES 0{t}{j}.
const players=TEAMS.flatMap((t,ti)=>Array.from({length:7},(_,j)=>({code:`ES 0${ti+1}${j}${j}`,team:t,name:`APELLIDO${ti}${j} ÚÑEZ, Nombre${j}`,part:0,bolos:0,max:0})));
const celta=players.filter(p=>p.team.startsWith('CELTA'));
const play=(p,score)=>{p.part++;p.bolos+=score;p.max=Math.max(p.max,score)};
function enf(k,fn){for(const p of players)fn(p);}
// Enfrentamiento 1: todos juegan 2 partidas salvo Celta: jugador 5 juega P1 (180) y le sustituye el 6 en P2 (201).
enf(1,p=>{const i=players.indexOf(p)%7;if(p.team.startsWith('CELTA')){if(i<5){play(p,200+i);play(p,190+i)}else if(i===5)play(p,180);else play(p,201)}else if(i<6){play(p,170+i);play(p,175)}});
const snap1=JSON.parse(JSON.stringify(players));
// Enfrentamiento 2: Celta 0..5 juegan dos partidas; rival Boliches 0..5.
enf(2,p=>{const i=players.indexOf(p)%7;if(i<6){play(p,210+i);play(p,160+i)}});
const snap2=JSON.parse(JSON.stringify(players));
const html=(k,ps)=>`<meta charset=utf-8><style>td{white-space:nowrap;padding:0 4px}</style><body style="font-family:Arial;font-size:9px"><p>XXXIX LIGA NACIONAL BOWLING</p><p>1ª DIVISION MASCULINA</p><p>PRIMERA JORNADA</p><p>RESULTADOS ${k}º ENFRENTAMIENTO</p><p>CLASIFICACION PROVISIONAL POR EQUIPOS</p><table><tr><td>POS</td><td>EQUIPOS</td><td>PTS JOR</td></tr><tr><td>1</td><td>CELTA XUNTA “B”</td><td>12</td></tr></table><table><tr><td>POS</td><td>CODG</td><td>CLUB</td><td>JUGADORES</td><td>PART</td><td>BOLOS</td><td>PROMD</td><td>MAX</td><td>MAXS</td></tr>${[...ps].sort((a,b)=>b.bolos-a.bolos).map((p,i)=>`<tr><td>${i+1}</td><td>${p.code}</td><td>${p.team}</td><td>${p.name}</td>${p.part?`<td>${p.part}</td><td>${p.bolos>=1000?(p.bolos/1000).toFixed(3):p.bolos}</td><td>${(p.bolos/p.part).toFixed(3).replace('.',',')}</td><td>${p.max}</td><td>${p.max*2}</td>`:''}</tr>`).join('')}</table><p>CLASIFICACION GENERAL</p><table><tr><td>1</td><td>${ps[0].code}</td><td>${ps[0].team}</td><td>${ps[0].name}</td><td>99</td><td>9999</td><td>101,000</td><td>299</td><td>599</td></tr></table>`;
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base=`http://localhost:${srv.address().port}/`;const b=await chromium.launch();
 try{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'res-'));const gen=await b.newPage();
  const mk=async(name,h)=>{await gen.setContent(h);const f=path.join(tmp,name);await gen.pdf({path:f,format:"A4",landscape:true});return f};
  const pdf1=await mk('res1.pdf',html(1,snap1)),pdf2=await mk('res2.pdf',html(2,snap2));
  const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();const errs=[],dialogs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{dialogs.push(d.message());d.accept()});
  await p.goto(base);await p.waitForFunction(()=>typeof go==='function'&&!!window.MiBowlingEscritura&&!!window.MiBowlingCuadro,null,{timeout:30000});
  await p.evaluate(()=>{ligaSetMyTeam('CELTA XUNTA "B"');const r1=liga32.matches.filter(x=>x.round===1);
   // Orden como si se hubiese importado el cuadro: 1 HALCONES, 2 BOLICHES.
   const h=r1.find(x=>x.rival==='HALCONES "A"'),bo=r1.find(x=>x.rival==='BOLICHES "B"'),m1=r1.find(x=>x.match===1),m2=r1.find(x=>x.match===2);[h.match,m1.match]=[1,h.match];[bo.match,m2.match]=[2,bo.match];
   // Resultado apuntado a mano en el enfrentamiento 2: el jugador 0 de Celta, partida 1 = 211 (real 210 → aviso).
   const own=bo.players.filter(x=>x.team==='own');own[0].name='APELLIDO40 ÚÑEZ, Nombre0';own[0].scores=['211',''];const ex=own[5];ex.name='Invitado, Externo';ex.scores=['150',''];liga32Save();go('liga');liga33Choose(1,1)});
  const sel='input[type=file][onchange^="ligaImportResultados"]';
  // 1) PDF del 2.º sin el 1.º → aviso de base, solo plantillas.
  await p.setInputFiles(sel,pdf2);await p.waitForSelector('.liga-cuadro-error',{timeout:20000});assert.match(await p.textContent('.liga-cuadro-error'),/1\.º enfrentamiento/);
  await p.click('button:text-is("Aplicar")');
  assert.equal(await p.evaluate(()=>(liga33Roster['own']||[]).filter(n=>n.startsWith('APELLIDO4')).length),7,'plantilla propia (7)');
  assert.equal(await p.evaluate(()=>(liga33Roster['TOMAHAWK']||[]).length),7,'plantillas de los rivales');
  assert.equal(await p.evaluate(()=>liga32.matches.find(x=>x.round===1&&x.match===2).players.find(x=>x.team==='own').scores[0]),'211','acta intacta');
  // 2) PDF del 1.º → base cero: quién jugó, sustitución con puntuaciones exactas.
  await p.setInputFiles(sel,pdf1);await p.waitForSelector('button:text-is("Aplicar")',{timeout:20000});
  const prev=await p.$$eval('.liga-cuadro-list li strong',a=>a.map(x=>x.textContent));assert.equal(prev.length,13,'7 propios (1 sustitución) + 6 rivales');
  await p.click('button:text-is("Aplicar")');
  const a1=await p.evaluate(()=>liga32.matches.find(x=>x.round===1&&x.match===1).players.map(x=>({t:x.team,n:x.name,ns:x.names,s:x.scores,pdf:x.pdf})));
  const own1=a1.filter(x=>x.t==='own'),riv1=a1.filter(x=>x.t==='rival');
  assert.equal(own1.filter(x=>x.pdf).length,6);const sub=own1.find(x=>x.pdf?.sub);assert(sub,'sustitución detectada');
  const pairs=Object.fromEntries(sub.ns.map((n,g)=>[n,sub.s[g]]));assert.deepEqual(pairs,{'APELLIDO45 ÚÑEZ, Nombre5':'180','APELLIDO46 ÚÑEZ, Nombre6':'201'},'cada sustituto con su puntuación exacta');
  const j0=own1.find(x=>x.n==='APELLIDO40 ÚÑEZ, Nombre0');assert.deepEqual(j0.pdf,{partidas:2,bolos:390,max:200});
  assert.equal(riv1.filter(x=>x.pdf).length,6);assert(riv1.every(x=>x.n.startsWith('APELLIDO0')),'rival = HALCONES');
  // 3) PDF del 2.º de nuevo → ahora con base: rellena el acta 2 y respeta lo apuntado.
  await p.evaluate(()=>liga33Choose(1,2));await p.setInputFiles(sel,pdf2);await p.waitForSelector('button:text-is("Aplicar")',{timeout:20000});await p.click('button:text-is("Aplicar")');
  const a2=await p.evaluate(()=>liga32.matches.find(x=>x.round===1&&x.match===2).players.map(x=>({t:x.team,n:x.name,s:x.scores,pdf:x.pdf})));
  const own2=a2.filter(x=>x.t==='own');assert.equal(own2.filter(x=>x.pdf).length,5);assert.deepEqual(own2.find(x=>x.n==='Invitado, Externo').s,['150',''],'hueco con datos no se reasigna');const k0=own2.find(x=>x.n==='APELLIDO40 ÚÑEZ, Nombre0');
  assert.deepEqual(k0.s,['211',''],'no se pisa lo apuntado');assert.deepEqual(k0.pdf,{partidas:2,bolos:370,max:null});
  assert(a2.filter(x=>x.t==='rival').every(x=>x.n.startsWith('APELLIDO3')),'rival = BOLICHES');
  await p.evaluate(()=>{const m=liga32Current();const q=m.players.find(x=>x.name==='APELLIDO40 ÚÑEZ, Nombre0');q.scores=['211','160'];liga32Save();render()});
  assert.match(await p.textContent('.liga-pdf-hint.bad'),/tu suma es 371/);
  await p.reload();await p.waitForFunction(()=>typeof go==='function'&&!!window.MiBowlingEscritura,null,{timeout:30000});
  assert.deepEqual(await p.evaluate(()=>Object.keys(liga32.resultados).sort()),['1-1','1-2']);
  await p.evaluate(()=>{go('liga');liga33Choose(1,1)});await p.locator('.liga32-trio').first().screenshot({path:'/tmp/res.png'});
  assert.deepEqual(errs,[]);assert.equal(dialogs.length,1);assert.match(dialogs[0],/No había hueco para/);
  console.log('IMPORTAR RESULTADOS PASS · base ausente → plantillas, sustitución con puntuaciones exactas, rival correcto, sin pisar datos, aviso de suma, persistencia');
 }finally{await b.close();srv.close()}})().catch(e=>{console.error(e);process.exit(1)});
