'use strict';
/* MI BOWLING 3.3.15-prueba · registro nuevo (Bolos / Cantidad / Solo puntuación) en la PWA real.
 * Historial v2 ficticio con forma real. Comprueba: registro nuevo por defecto, elección inicial de modo,
 * bola de strike y de spare, split marcado, máx. posible, corregir frame, siguiente partida, cantidad,
 * solo puntuación, estadísticas, conservación del formato ampliado tras recargar y re-guardar,
 * historial anterior intacto, registro clásico, cinco tamaños de iPhone y service worker 61/61. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.txt':'text/plain'};
const server=http.createServer((req,res)=>{let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')}catch{res.writeHead(400);return res.end()}
 if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(e,v)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(v)})});
const KEY='mi-bowling-analitica-v2',PREF='mibowling.pref.registro-compacto',MODE='mibowling.pref.registro-modo';
const line={approach:'25',arrow:'12',breakpoint:'8'};
const roll=(frame,ball,pins,lane,extra={})=>({frame,ball,pins,ballId:'bola-a',line,lane,pair:[9,10],foul:false,createdAt:'2026-11-01T10:00:00.000Z',...extra});
const ALL=[1,2,3,4,5,6,7,8,9,10];
const oldGame={id:'g-old',includeStats:true,pair:[9,10],startLane:9,segments:[],rolls:[roll(1,1,ALL,9),roll(2,1,[1,2,3,5,6,8,9],10),roll(2,2,[4,7,10],10),roll(3,1,ALL,9),roll(4,1,[1,3,5,6,9,10],10),roll(4,2,[2,8],10),roll(5,1,ALL,9),roll(6,1,ALL,10),roll(7,1,[1,2,4,5,7,8],9),roll(7,2,[3,6,9,10],9),roll(8,1,ALL,10),roll(9,1,[1,3,5,6,8,9,10],9),roll(9,2,[2,4,7],9),roll(10,1,ALL,10),roll(10,2,[1,2,3,4,5,6,7,8],10),roll(10,3,ALL,10)]};
const inProgress={id:'g-now',includeStats:true,pair:[9,10],startLane:10,segments:[],rolls:[roll(1,1,[1,2,3,4,5,6,8,9],10),roll(1,2,[7],10)]};
const sess=(id,type,title,games)=>({id,type,date:'2026-11-22',title,venue:'Bolera',notes:'',pattern:'',patternId:'',patternNotes:'',competition:'',leagueOther:false,leaguePlayer:'',goal:null,currentBallId:'bola-a',currentLine:line,lane:10,games});
const seed={version:2,hand:'diestro',balls:[{id:'bola-a',brand:'Marca',model:'Strike Uno'},{id:'bola-b',brand:'Marca',model:'Spare Dos'}],patterns:[],sessions:[sess('s-old','oficial','Torneo ficticio',[oldGame]),sess('s-now','entrenamiento','Entreno ficticio',[{...JSON.parse(JSON.stringify(oldGame)),id:'g-prev'},inProgress])]};
const shots=process.env.RC_SHOTS||'';
const shot=async(page,name)=>{if(shots)await page.screenshot({path:path.join(shots,name+'.png')})};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://localhost:${server.address().port}/`;
 const browser=await chromium.launch();
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  await ctx.addInitScript(([k,v])=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(k,v);sessionStorage.setItem('seeded','1')}},[KEY,JSON.stringify(seed)]);
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const db=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const ready=async()=>{await page.waitForFunction(()=>!!window.MiBowlingCatalogoLocal&&typeof window.openSession==='function',null,{timeout:20000});assert(!(await page.$('#f1-blocked')),'Arranque bloqueado')};
  const cur=()=>page.evaluate(()=>{const s=session();return JSON.parse(JSON.stringify(game(s)))});
  await page.goto(base);await ready();
  // 1. El registro nuevo es el normal; partida a medias sigue en Bolos sin preguntar.
  await page.evaluate(()=>openSession('s-now'));await page.waitForSelector('.rc-root[data-rc="bolos"]');
  assert.equal(await page.$('.rc-sheet'),null,'Sin hoja inicial en partida ya empezada');
  assert.match(await page.textContent('.rc-turn'),/Frame 2, bola 1/);
  assert.match(await page.textContent('.rc-score'),/máx\. 279/);
  const before=await db();
  // 2. Bola de spare distinta.
  await page.selectOption('select[aria-label="Bola de spare"]','bola-b');
  // 3. Frame 2: split 7-10 y spare; frame 3: falta y canal.
  for(const p of [7,10])await page.click(`[data-rc-pin="${p}"]`);
  assert.match(await page.textContent('#quick-record'),/Registrar 8/);await page.click('#quick-record');
  assert.match(await page.textContent('#quick-record'),/Spare/);await page.click('#quick-record');
  assert.equal(await page.$eval('[data-rc-frame="2"] .sp',e=>e.textContent),'8','Split marcado con círculo');
  await page.click('[data-rc="foul"]');await page.click('[data-rc="canal"]');
  await shot(page,'bolos-390');
  // 4. Corregir el frame 3 tocándolo y volver a anotarlo.
  await page.click('[data-rc-frame="3"]');assert.match(await page.textContent('.rc-turn'),/Frame 3, bola 1/);
  await page.click('[data-rc="foul"]');await page.click('[data-rc="canal"]');
  for(let i=0;i<20&&await page.$('.rc-root[data-rc="bolos"]');i++)await page.click('#quick-record');
  await page.waitForSelector('.rc-root[data-rc="done"]');await shot(page,'final-bolos');
  let g=await cur();
  assert.equal(await page.evaluate(()=>score(game(session()))),229,'puntuación');
  assert.match(await page.textContent('.rc-done .big'),/229/);
  const nw=g.rolls.slice(2);
  assert.equal(nw[0].ballId,'bola-a','1.ª bola con bola de strike');assert.equal(nw[1].ballId,'bola-b','2.ª bola con bola de spare');
  assert.deepEqual(nw[1].pins,[7,10]);assert.equal(nw[2].foul,true);
  for(const r of nw){assert.deepEqual(r.line,line);assert.deepEqual(r.pair,[9,10]);assert.ok(r.createdAt);assert.equal(r.pinDetail,undefined)}
  // 5. Siguiente partida: hoja «¿Cómo quieres anotar…?» y modo Cantidad.
  assert.match(await page.textContent('#rc-next'),/Siguiente: partida 3/);await page.click('#rc-next');
  await page.waitForSelector('.rc-sheet');await shot(page,'hoja-modo');
  await page.click('[data-choose="cantidad"]');await page.waitForSelector('.rc-root[data-rc="cantidad"]');
  assert.equal(await page.evaluate(m=>localStorage.getItem(m),MODE),'cantidad');
  const key=k=>page.click(`.rc-key[data-k="${k}"]`);
  await key('9');assert.equal(await page.$eval('[data-mode="bolos"]',e=>e.disabled),true,'Bolos no disponible a mitad de frame por cantidad');
  assert.equal(await page.$eval('.rc-key[data-k="9"]',e=>e.disabled),true,'No se puede derribar más de lo que queda');
  await key('/');await key('8');await key('/');
  await shot(page,'cantidad-390');
  for(let i=0;i<12&&await page.$('.rc-root[data-rc="cantidad"]');i++)await key('X');
  await page.waitForSelector('.rc-root[data-rc="done"]');
  g=await cur();assert.equal(await page.evaluate(()=>score(game(session()))),278,'278 como la referencia');
  assert(g.rolls.every(r=>r.pinDetail==='count'&&Array.isArray(r.pins)&&r.pins.length===0&&Number.isInteger(r.count)),'Tiradas por cantidad sin bolos inventados');
  // 6. Deshacer y rehacer la última.
  await page.click('.rc-undo');await page.waitForSelector('.rc-root[data-rc="cantidad"]');await key('X');await page.waitForSelector('.rc-root[data-rc="done"]');
  // 7. Solo puntuación.
  await page.click('#rc-next');await page.waitForSelector('.rc-root[data-rc="cantidad"]');
  await page.click('[data-mode="final"]');await page.fill('#rc-final-input','215');await shot(page,'solo-puntuacion');
  await page.click('#rc-final-save');await page.waitForSelector('.rc-root[data-rc="done"]');
  g=await cur();assert.equal(g.finalOnly,215);assert.deepEqual(g.rolls,[]);
  // 8. Estadísticas: media y partidas incluyen las 4 completas; análisis de bolos solo las 2 exactas.
  const st=await page.evaluate(()=>{const a=aggregate('entrenamiento');return {totals:a.totals,exact:a.games.length,m:metrics(a).map(x=>x.label+':'+x.value)}});
  assert.deepEqual(st.totals.slice().sort(),[200,215,229,278].map(Number).sort(),'Totales');assert.equal(st.exact,2);
  assert(st.m.includes('Partidas:4'),st.m.join());
  for(const v of ['stats','history'])await page.evaluate(v=>{go(v==='stats'?'estadisticas':'historial')},v);
  await page.evaluate(()=>{activeId='s-now';go('detalle')});assert.match(await page.textContent('#app'),/215/);
  // 9. Recargar y re-guardar con el migrador: el formato ampliado se conserva.
  const saved=await db();
  await page.reload();await ready();await page.evaluate(()=>{changeHand('diestro')});
  const again=await db();const sNow=again.sessions.find(s=>s.id==='s-now');
  assert.equal(sNow.games[3].finalOnly,215,'finalOnly conservado');assert(sNow.games[2].rolls.every(r=>r.pinDetail==='count'),'cantidad conservada');
  assert.equal(sNow.spareBallId,'bola-b','bola de spare conservada');
  assert.deepEqual(again.sessions.find(s=>s.id==='s-old'),before.sessions.find(s=>s.id==='s-old'),'Sesión antigua intacta');
  assert.deepEqual(sNow.games[0],before.sessions[1].games[0],'Partida anterior intacta');
  assert.deepEqual(sNow.games[1].rolls.slice(0,2),inProgress.rolls,'Tiradas ya guardadas intactas');
  assert.equal(JSON.stringify(again.sessions.map(s=>s.games.map(g=>g.rolls.length))),JSON.stringify(saved.sessions.map(s=>s.games.map(g=>g.rolls.length))));
  // 10. Registro clásico sigue disponible (opciones → par, línea, historial) y vuelve.
  await page.evaluate(()=>openSession('s-now'));await page.waitForSelector('.rc-root');await page.click('[aria-label="Opciones de la partida"]');
  await page.click('text=Par, pistas, línea e historial');await page.waitForSelector('.rc-classic-bar');assert(await page.$('.registry-v4'));
  await page.click('text=Volver al registro nuevo');await page.waitForSelector('.rc-root');
  // 11. Tamaños de iPhone en Bolos y en Cantidad.
  await page.click('#rc-next');await page.waitForSelector('.rc-root[data-rc="cantidad"]');
  for(const mode of ['cantidad','bolos']){
   await page.click(`[data-mode="${mode}"]`);await page.waitForSelector(`.rc-root[data-rc="${mode}"]`);
   for(const [w,h] of [[375,667],[390,844],[393,852],[428,926],[430,932]]){
    await page.setViewportSize({width:w,height:h});await page.waitForTimeout(120);
    const m=await page.evaluate(mode=>{const R=e=>e.getBoundingClientRect(),r=document.querySelector('.rc-root'),items=[...document.querySelectorAll(mode==='bolos'?'.rc-pin':'.rc-key')].map(R),balls=R(document.querySelector('.rc-balls')),foot=R(document.querySelector('.rc-foot'));
     return {over:r.scrollHeight-r.clientHeight,clash:items.some(a=>a.top<balls.bottom||a.bottom>foot.top),min:Math.min(...items.map(a=>a.height)),bottom:foot.bottom,h:innerHeight}},mode);
    assert(!m.clash,`Sin solapes ${mode} ${w}x${h}`);assert(m.over<=1,`Sin scroll ${mode} ${w}x${h}`);assert(m.bottom<=m.h,`Botones visibles ${mode} ${w}x${h}`);assert(m.min>=44,`Botones ≥44px ${mode} ${w}x${h}`);
    if(w===375)await shot(page,mode+'-375');
    console.log(`RC VIEWPORT PASS ${mode} ${w}x${h}`);
   }
   await page.setViewportSize({width:390,height:844});
  }
  // 12. Desactivar en Ajustes → registro clásico.
  await page.click('[aria-label="Salir del registro"]');await page.evaluate(()=>go('ajustes'));await page.uncheck('#rc-toggle');
  assert.equal(await page.evaluate(p=>localStorage.getItem(p),PREF),'0');
  await page.evaluate(()=>openSession('s-now'));assert.equal(await page.$('.rc-root'),null);assert(await page.$('.registry-v4'));
  await page.evaluate(()=>go('ajustes'));await page.check('#rc-toggle');
  assert.deepEqual(errors,[],'Sin errores de JavaScript');
  await ctx.close();
  // 13. Service worker: 61 recursos verificados por SHA-256.
  const ctx2=await browser.newContext();const p2=await ctx2.newPage();
  await p2.goto(base);await p2.waitForFunction(()=>!!window.MiBowlingCatalogoLocal,null,{timeout:20000});
  const sw=await p2.evaluate(async()=>{const reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,rej)=>setTimeout(()=>rej(Error('SW no activado')),30000))]);
   const a=reg.active;if(a.state!=='activated')await new Promise(res=>a.addEventListener('statechange',()=>{if(a.state==='activated')res()}));
   const names=await caches.keys();const c=await caches.open(names.find(n=>n.includes('v3315-registro-tres-modos-prueba')));return (await c.keys()).length});
  assert.equal(sw,61);console.log('RC SERVICE WORKER PASS · 61/61 SHA-256');
  await ctx2.close();
  console.log('REGISTRO TRES MODOS PASS · bolos, cantidad, solo puntuación, split, bolas strike/spare, corregir, estadísticas, formato conservado, historial intacto.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
