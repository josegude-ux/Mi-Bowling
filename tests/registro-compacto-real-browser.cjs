'use strict';
/* Registro compacto (3.3.14-prueba): prueba en la PWA real con un historial v2 ficticio pero con forma real.
 * Comprueba: desactivado por defecto, activación en Ajustes, anotación completa, deshacer, vista clásica,
 * persistencia tras recargar, siguiente partida, cinco tamaños de iPhone sin scroll, desactivación,
 * que las partidas anteriores no cambian y que el service worker instala los 61 recursos con su SHA-256. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.txt':'text/plain'};
const server=http.createServer((req,res)=>{let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')}catch{res.writeHead(400);return res.end()}
 if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(e,v)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(v)})});
const KEY='mi-bowling-analitica-v2',PREF='mibowling.pref.registro-compacto';
const line={approach:'25',arrow:'12',breakpoint:'8'};
const roll=(frame,ball,pins,lane,extra={})=>({frame,ball,pins,ballId:'ball-ficticia-1',line,lane,pair:[9,10],foul:false,createdAt:'2026-11-01T10:00:00.000Z',...extra});
const oldGame={id:'g-old',includeStats:true,pair:[9,10],startLane:9,segments:[],rolls:[
 roll(1,1,[1,2,3,4,5,6,7,8,9,10],9),roll(2,1,[1,2,3,5,6,8,9],10),roll(2,2,[4,7,10],10),roll(3,1,[1,2,3,4,5,6,7,8,9,10],9),
 roll(4,1,[1,3,5,6,9,10],10),roll(4,2,[2,8],10),roll(5,1,[1,2,3,4,5,6,7,8,9,10],9),roll(6,1,[1,2,3,4,5,6,7,8,9,10],10),
 roll(7,1,[1,2,4,5,7,8],9),roll(7,2,[3,6,9,10],9),roll(8,1,[1,2,3,4,5,6,7,8,9,10],10),roll(9,1,[1,3,5,6,8,9,10],9),roll(9,2,[2,4,7],9),
 roll(10,1,[1,2,3,4,5,6,7,8,9,10],10),roll(10,2,[1,2,3,4,5,6,7,8],10),roll(10,3,[1,2,3,4,5,6,7,8,9,10],10,{foul:false})]};
const inProgress={id:'g-now',includeStats:true,pair:[9,10],startLane:10,segments:[],rolls:[roll(1,1,[1,2,3,4,5,6,8,9],10),roll(1,2,[7],10)]};
const seed={version:2,hand:'diestro',balls:[{id:'ball-ficticia-1',brand:'Marca',model:'Bola Ficticia'}],patterns:[],sessions:[
 {id:'s-old',type:'oficial',date:'2026-10-30',title:'Torneo ficticio',venue:'Bolera',notes:'',pattern:'',patternId:'',patternNotes:'',competition:'',leagueOther:false,leaguePlayer:'',goal:null,currentBallId:'ball-ficticia-1',currentLine:line,lane:9,games:[oldGame]},
 {id:'s-now',type:'entrenamiento',date:'2026-11-22',title:'Entreno ficticio',venue:'Bolera',notes:'',pattern:'',patternId:'',patternNotes:'',competition:'',leagueOther:false,leaguePlayer:'',goal:null,currentBallId:'ball-ficticia-1',currentLine:line,lane:10,games:[oldGame&&JSON.parse(JSON.stringify(oldGame)),inProgress].map((g,i)=>i===0?{...g,id:'g-prev'}:g)}]};
const shots=process.env.RC_SHOTS||'';
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://localhost:${server.address().port}/`;
 const browser=await chromium.launch();
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  await ctx.addInitScript(([k,v])=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(k,v);sessionStorage.setItem('seeded','1')}},[KEY,JSON.stringify(seed)]);
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const db=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const ready=async()=>{await page.waitForFunction(()=>!!window.MiBowlingCatalogoLocal&&typeof window.openSession==='function',null,{timeout:20000});assert(!(await page.$('#f1-blocked')),'Arranque bloqueado')};
  await page.goto(base);await ready();
  // 1. Desactivado por defecto: el registro clásico sigue igual.
  await page.evaluate(()=>openSession('s-now'));
  assert.equal(await page.$('.rc-root'),null,'Por defecto debe verse el registro clásico');
  assert(await page.$('.registry-v4'),'Registro clásico presente');
  // 2. Activación desde Ajustes.
  await page.evaluate(()=>go('ajustes'));
  await page.waitForSelector('#rc-toggle');await page.check('#rc-toggle');
  assert.equal(await page.evaluate(p=>localStorage.getItem(p),PREF),'1');
  await page.evaluate(()=>openSession('s-now'));await page.waitForSelector('.rc-root[data-rc="play"]');
  if(shots)await page.screenshot({path:path.join(shots,'compacto-390.png')});
  assert.match(await page.textContent('.rc-turn'),/Frame 2, bola 1/);
  assert.equal(await page.evaluate(()=>document.querySelector('.rc-mode button[disabled]')!==null),true,'Cantidad/Solo puntuación deshabilitados');
  const before=await db();
  // 3. Frame 2: 7 derribados (en pie 7,10,4) y spare.
  for(const p of [4,7,10])await page.click(`[data-rc-pin="${p}"]`);
  assert.match(await page.textContent('#quick-record'),/Registrar 7 derribados/);
  await page.click('#quick-record');
  assert.match(await page.textContent('#quick-record'),/Spare/);
  await page.click('#quick-record');
  // 4. Deshacer y rehacer.
  await page.click('.rc-undo');assert.match(await page.textContent('.rc-turn'),/Frame 2, bola 2/);
  await page.click('#quick-record');
  // 5. Falta y canal.
  await page.click('text=⚠ Falta');await page.click('text=– Canal');
  // 6. Resto: strikes hasta el final.
  for(let i=0;i<20;i++){if(await page.$('.rc-root[data-rc="done"]'))break;await page.click('#quick-record')}
  await page.waitForSelector('.rc-root[data-rc="done"]');
  if(shots)await page.screenshot({path:path.join(shots,'compacto-final.png')});
  let after=await db();const s=after.sessions.find(x=>x.id==='s-now'),g=s.games.find(x=>x.id==='g-now');
  assert.deepEqual(after.sessions.find(x=>x.id==='s-old'),before.sessions.find(x=>x.id==='s-old'),'Sesión anterior intacta');
  assert.deepEqual(s.games[0],before.sessions[1].games[0],'Partida previa de la sesión intacta');
  assert.deepEqual(g.rolls.slice(0,2),inProgress.rolls,'Tiradas ya guardadas intactas');
  const nw=g.rolls.slice(2);
  assert.deepEqual(nw.slice(0,2).map(r=>r.pins),[[1,2,3,5,6,8,9],[4,7,10]]);
  assert.equal(nw[2].foul,true);assert.deepEqual(nw[2].pins,[]);assert.deepEqual(nw[3].pins,[]);
  for(const r of nw){assert.equal(r.ballId,'ball-ficticia-1');assert.deepEqual(r.line,line);assert.deepEqual(r.pair,[9,10]);assert.ok(r.createdAt)}
  assert.deepEqual(nw.map(r=>r.lane),nw.map(r=>[10,9][(r.frame-1)%2]),'Alternancia de pistas por frame igual que el clásico');
  const total=await page.evaluate(()=>score(game(session())));
  assert.equal(total,229,'9 + 10 + 0 + siete frames de 30');
  assert.match(await page.textContent('.rc-final b'),/229/);
  // 7. Recargar: datos y preferencia persisten.
  await page.reload();await ready();
  await page.evaluate(()=>openSession('s-now'));await page.waitForSelector('.rc-root[data-rc="done"]');
  assert.deepEqual(await db(),after,'Tras recargar no cambia nada');
  // 8. Siguiente partida desde el compacto.
  await page.click('text=＋ Siguiente partida');await page.click('text=Empezar siguiente partida →');
  await page.waitForSelector('.rc-root[data-rc="play"]');assert.match(await page.textContent('.rc-turn'),/Frame 1, bola 1/);
  after=await db();assert.equal(after.sessions.find(x=>x.id==='s-now').games.length,3);
  // 9. Vista clásica de la partida y vuelta.
  await page.click('[aria-label^="Más opciones"]');await page.waitForSelector('.rc-classic-bar');
  assert(await page.$('.registry-v4'));assert.equal(await page.$('.rc-root'),null);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('rc-open')),false,'Sin bloqueo de scroll en clásico');
  await page.click('text=Volver al compacto');await page.waitForSelector('.rc-root');
  // 10. Cinco tamaños de iPhone: todo visible, sin scroll.
  for(const [w,h] of [[375,667],[390,844],[393,852],[428,926],[430,932]]){
   await page.setViewportSize({width:w,height:h});await page.waitForTimeout(150);
   const m=await page.evaluate(()=>{const R=e=>e.getBoundingClientRect(),rack=[...document.querySelectorAll('.rc-pin')].map(R),turn=R(document.querySelector('.rc-ball')),quick=R(document.querySelector('.rc-quick'));const clash=rack.some(a=>a.top<turn.bottom||a.bottom>quick.top);if(clash)return{clash:true};const r=document.querySelector('.rc-root'),b=document.querySelector('#quick-record').getBoundingClientRect(),p=document.querySelector('[data-rc-pin="7"]').getBoundingClientRect();return{over:r.scrollHeight-r.clientHeight,bottom:b.bottom,top:p.top,h:innerHeight,pin:p.width}});
   assert(!m.clash,`Los bolos no se solapan con la bola ni con los botones ${w}x${h}`);
   assert(m.over<=1,`Sin scroll ${w}x${h} (${m.over})`);assert(m.bottom<=m.h&&m.top>0,`Botón y bolos visibles ${w}x${h}`);assert(m.pin>=44,`Bolos de al menos 44 px ${w}x${h}`);
   if(shots&&w===375)await page.screenshot({path:path.join(shots,'compacto-375.png')});
   console.log(`RC VIEWPORT PASS ${w}x${h}`);
  }
  // 11. Salir: vuelve el menú inferior; desactivar devuelve el clásico.
  await page.click('[aria-label="Salir del registro"]');await page.waitForFunction(()=>!document.body.classList.contains('rc-open'));
  await page.evaluate(()=>go('ajustes'));await page.uncheck('#rc-toggle');
  assert.equal(await page.evaluate(p=>localStorage.getItem(p),PREF),null);
  await page.evaluate(()=>openSession('s-now'));assert.equal(await page.$('.rc-root'),null);assert(await page.$('.registry-v4'));
  // 12. La preferencia no entra en las claves protegidas ni en el respaldo.
  assert.equal(await page.evaluate(p=>window.MiBowlingAutoridad.KEYS.includes(p),PREF),false);
  assert.deepEqual(errors,[],'Sin errores de JavaScript');
  await ctx.close();
  // 13. Service worker real: instala los recursos verificando cada SHA-256.
  const ctx2=await browser.newContext();const p2=await ctx2.newPage();
  await p2.goto(base);await p2.waitForFunction(()=>!!window.MiBowlingCatalogoLocal,null,{timeout:20000});
  const sw=await p2.evaluate(async()=>{const reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,rej)=>setTimeout(()=>rej(Error('SW no activado: fallo de hash o de descarga')),30000))]);
   const a=reg.active;if(a.state!=='activated')await new Promise(res=>a.addEventListener('statechange',()=>{if(a.state==='activated')res()}));
   const names=await caches.keys();const c=await caches.open(names.find(n=>n.includes('v3314-registro-compacto-prueba')));return{names,count:(await c.keys()).length}});
  assert.equal(sw.count,61,'61 recursos en caché verificados');
  console.log('RC SERVICE WORKER PASS · 61/61 SHA-256');
  await ctx2.close();
  console.log('REGISTRO COMPACTO REAL PASS · v2 intacto, anotación, deshacer, falta, canal, recarga, siguiente partida, vista clásica, 5 tamaños, desactivar.');
 }catch(e){throw e}
 finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
