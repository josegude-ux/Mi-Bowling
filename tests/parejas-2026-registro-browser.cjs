'use strict';
/* Nuevo caso específico; SOLO registros ficticios en contexto Chromium desechable. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mjs':'text/javascript; charset=utf-8'};
const server=http.createServer((req,res)=>{
 let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')}catch{res.writeHead(400);return res.end()}
 if(!rel||rel.endsWith('/'))rel+='index.html';
 const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(err,body)=>{if(err){res.writeHead(404);return res.end()}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body)});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch();
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  const KEY='mi-bowling-analitica-v2';
  const seed={version:2,hand:'diestro',balls:[],patterns:[],sessions:[]};
  await ctx.addInitScript(([key,value])=>{if(!sessionStorage.getItem('bowling-test-initialized')){localStorage.setItem(key,value);sessionStorage.setItem('bowling-test-initialized','yes')}},[KEY,JSON.stringify(seed)]);
  const page=await ctx.newPage(),errors=[],warnings=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>{warnings.push(d.message());d.accept()});
  const site='http://localhost:'+server.address().port+'/';
  await page.goto(site,{waitUntil:'domcontentloaded'});
  try{await page.waitForFunction(()=>typeof abrirTorneoParejas==='function'&&!!window.MiBowlingParejas2026Plan&&typeof window.MiBowlingRegistroCompacto?.nextGame==='function',null,{timeout:12000})}
  catch(e){const diagnosis=await page.evaluate(()=>({block:document.querySelector('#f1-blocked')?.innerText,hasPlan:!!window.MiBowlingParejas2026Plan,hasCompact:!!window.MiBowlingRegistroCompacto,hasBoot:!!window.MiBowlingCatalogoLocal,hasStart:typeof abrirTorneoParejas,app:document.querySelector('#app')?.innerText?.slice(0,250)}));throw Error('BOOT_DIAGNOSTIC '+JSON.stringify(diagnosis)+' PAGE_ERRORS '+errors.join(' || '))}
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mi-bowling-analitica-v2')||'null'));
  await page.evaluate(()=>abrirTorneoParejas());
  await page.waitForSelector('#parejas-lane-2026-11-28');
  assert.equal(await page.locator('#parejas-lane-2026-11-28').inputValue(),'17');
  assert.equal(await page.locator('#parejas-lane-2026-11-29').inputValue(),'');
  await page.getByRole('button',{name:'Preparar sábado'}).click();
  await page.waitForFunction(()=>document.querySelector('.rc-root')||document.querySelector('.registry-v4'),{timeout:12000});
  let state=await read();
  assert.equal(state.sessions.length,1);
  assert.equal(state.sessions[0].type,'oficial');
  assert.equal(state.sessions[0].date,'2026-11-28');
  assert.equal(state.sessions[0].games[0].startLane,17);
  assert.deepEqual(state.sessions[0].games[0].pair,[17,18]);
  const oldSessionId=state.sessions[0].id;
  await page.evaluate(()=>{setFinalOnly(180);render()});
  await page.waitForSelector('#rc-tournament-next-lane');
  assert.equal(await page.locator('#rc-tournament-next-lane').inputValue(),'19');
  await page.locator('#rc-tournament-next-lane').fill('21');
  await page.locator('#rc-next').click();
  state=await read();assert.equal(state.sessions[0].games.length,2);
  assert.equal(state.sessions[0].games[1].startLane,21);
  assert.deepEqual(state.sessions[0].games[1].pair,[21,22]);
  for(let i=2;i<=6;i++){
   await page.evaluate(n=>{setFinalOnly(140+n);render()},i);
   if(i===6)break;
   await page.waitForSelector('#rc-tournament-next-lane');
   await page.locator('#rc-next').click();
  }
  state=await read();
  assert.equal(state.sessions[0].games.length,6);
  assert.deepEqual(state.sessions[0].games.map(g=>g.startLane),[17,21,23,25,27,29]);
  await page.getByRole('button',{name:'Serie completa · Resumen'}).click();
  await page.waitForSelector('#parejas-lane-2026-11-29');
  assert((await page.locator('main').innerText()).includes('6/12'));
  const blocked=await page.evaluate(()=>nextGameQuick());
  assert.equal(blocked,false);
  assert.equal((await read()).sessions[0].games.length,6);
  await page.getByRole('button',{name:'Preparar domingo'}).click();
  assert.equal((await read()).sessions.length,1,'Sin pista domingo no debe crear sesión');
  await page.locator('#parejas-lane-2026-11-29').fill('13');
  await page.getByRole('button',{name:'Preparar domingo'}).click();
  state=await read();assert.equal(state.sessions.length,2);
  assert.equal(state.sessions[1].date,'2026-11-29');
  assert.equal(state.sessions[1].games[0].startLane,13);
  await page.evaluate(()=>{setFinalOnly(200);render()});
  await page.evaluate(()=>abrirTorneoParejas());
  assert((await page.locator('main').innerText()).includes('7/12'));
  await page.getByRole('button',{name:'Continuar jornada'}).first().click();
  assert.equal((await read()).sessions.length,2,'Continuar no puede duplicar sábado');
  assert.equal((await read()).sessions[0].id,oldSessionId);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof abrirTorneoParejas==='function',{timeout:15000});
  await page.evaluate(()=>abrirTorneoParejas());
  assert((await page.locator('main').innerText()).includes('7/12'));
  assert.equal((await read()).sessions.length,2,'Sin duplicados tras recargar');
  assert(errors.length===0,'Errores JS: '+errors.join(' || '));
  console.log('PAREJAS-2026-BROWSER PASS · 6+6, S 17, avance +2 editable, domingo 13, bloqueo 7ª, recarga, sin duplicados; avisos previstos='+warnings.length);
  await ctx.close();
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{console.error(e);process.exitCode=1});
