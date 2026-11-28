'use strict';
/* Validación del checkbox de cruce 1–2: navegador real, solo datos ficticios.
 * Motor Chromium/WebKit, sin Servicio Worker, sin acceder a datos reales. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')}catch{res.writeHead(400);return res.end()}
 if(!rel||rel.endsWith('/'))rel+='index.html';
 const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes)});
});
const KEY='mi-bowling-analitica-v2',ALL=[1,2,3,4,5,6,7,8,9,10];
const roll=(frame,ball,pins,extra={})=>({frame,ball,pins,ballId:'x',lane:17,pair:[17,18],line:{approach:'',arrow:'',breakpoint:''},foul:false,createdAt:'2026-11-28T10:00:00.000Z',...extra});
const oldRolls=Array.from({length:9},(_,i)=>roll(i+1,1,ALL)).concat([roll(10,1,ALL),roll(10,2,ALL),roll(10,3,ALL)]);
const oldGame={id:'g-completo',includeStats:true,pair:[17,18],startLane:17,segments:[],rolls:oldRolls};
const currentGame={id:'g-en-curso',includeStats:true,pair:[19,20],startLane:19,segments:[],rolls:[]};
const session=(id,games)=>({id,type:'oficial',date:'2026-11-28',title:'Campeonato ficticio',venue:'LAB',notes:'',pattern:'',patternId:'',patternNotes:'',competition:'',currentBallId:'x',currentLine:{approach:'',arrow:'',breakpoint:''},lane:17,games});
const seed={version:2,hand:'diestro',balls:[{id:'x',brand:'Marca Ficticia',model:'Bola A'}],patterns:[],sessions:[session('s-old',[oldGame]),session('s-new',[currentGame])]};
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await (process.env.BOWLING_BROWSER==='webkit'?webkit:chromium).launch();
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  await ctx.addInitScript(([k,serialized])=>{
   if(!sessionStorage.getItem('seed-pocket')){
    localStorage.setItem(k,serialized);
    localStorage.setItem('mibowling.pref.registro-modo','bolos');
    sessionStorage.setItem('seed-pocket','yes');
   }
  },[KEY,JSON.stringify(seed)]);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('http://localhost:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof openSession==='function'&&!!window.MiBowlingPocketReal&&typeof pocketStats==='function',null,{timeout:16000});
  const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const stats=()=>page.evaluate(()=>{const a=periodAggregate(aggregate('oficial'));return pocketStats(a)});
  await page.evaluate(()=>{statMode='oficial';go('estadisticas')});
  await page.waitForFunction(()=>document.body.textContent.includes('Pocket 1–3 (estimado)'),null,{timeout:10000});
  let p=await stats();assert.deepEqual([p.hit,p.total,p.cross,p.assumed],[10,10,0,10],'Histórico sin marca: 100 % supuesto, no 92 % por derribos');
  await page.getByRole('button',{name:'Revisar entradas 1–2'}).click();
  let first=page.locator('.pocket-review-game input[data-frame="1"]').first();
  await first.check();p=await stats();assert.deepEqual([p.hit,p.total,p.cross,p.assumed],[9,10,1,9]);
  let data=await read();
  assert.equal(data.sessions[0].games[0].rolls[0].impactSide,'1-2','Cruce guardado en primer tiro');
  assert.deepEqual(data.sessions[0].games[0].rolls[0].pins,ALL,'Puntuación/pins inalterados');
  assert.equal(data.sessions[0].games[0].rolls[1].impactSide,undefined,'Otros frames no modificados');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof pocketStats==='function',null,{timeout:16000});
  assert.equal((await stats()).hit,9,'Persistencia del cruce tras recarga');
  await page.evaluate(()=>{statMode='oficial';go('estadisticas');pocketReviewOpen=true;render()});
  first=page.locator('.pocket-review-game input[data-frame="1"]').first();
  await first.uncheck();p=await stats();assert.deepEqual([p.hit,p.cross],[10,0],'Desmarcar vuelve a pocket supuesto');
  assert.equal((await read()).sessions[0].games[0].rolls[0].impactSide,undefined);
  await page.evaluate(()=>openSession('s-new'));
  await page.waitForSelector('.rc-root[data-rc="bolos"]');
  const box=page.locator('#rc-cross-first');
  assert.equal(await box.isChecked(),false,'Check desmarcado por defecto');
  await box.check();
  await page.locator('[data-rc-pin="7"]').click(); // rerender por selección de bolo
  assert.equal(await box.isChecked(),true,'Check retenido después de repintar la pantalla');
  await page.locator('#quick-record').click();
  data=await read();
  assert.equal(data.sessions[1].games[0].rolls[0].impactSide,'1-2');
  assert.equal(data.sessions[1].games[0].rolls[0].pins.length,9,'Solo se registra un cruce; los bolos no cambian');
  assert.deepEqual(data.sessions[0].games[0].rolls.map(x=>x.pins),oldRolls.map(x=>x.pins),'No modificar otra partida');
  await page.evaluate(()=>window.MiBowlingRegistroCompacto.classic());
  await page.evaluate(()=>rewindFrame(1));
  await page.waitForSelector('#classic-pocket-cross');
  await page.locator('#classic-pocket-cross').check();
  await page.locator('[aria-label="Bolo 7: en pie"]').first().click().catch(()=>{});
  assert.equal(await page.locator('#classic-pocket-cross').isChecked(),true,'El check del modo clásico se conserva');
  await page.locator('.registry-v4-record').click();
  data=await read();
  assert.equal(data.sessions[1].games[0].rolls[0].impactSide,'1-2','Clásico guarda el cruce');
  await page.reload({waitUntil:'domcontentloaded'});
  data=await read();
  assert.equal(data.sessions[0].games[0].rolls[0].impactSide,undefined);
  assert.equal(data.sessions[1].games[0].rolls[0].impactSide,'1-2');
  assert.equal(data.sessions[0].games[0].rolls.length,12);
  assert(errors.length===0,'Errores JS: '+errors.join(' | '));
  console.log('POCKET-REAL-BROWSER '+(process.env.BOWLING_BROWSER==='webkit'?'WEBKIT':'CHROMIUM')+' PASS: por defecto pocket 1-3, checkbox 1-2, edición histórica, compacto/clásico, recarga, bolos intactos');
  await ctx.close();
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(err=>{console.error(err);process.exitCode=1});
