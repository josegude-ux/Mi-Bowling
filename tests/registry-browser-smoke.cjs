'use strict';
// Browser regression isolated from production. Requires: playwright, local files.
// Uses only fictitious sessions in fresh browser contexts.
// UI measurements intentionally block SW takeover; PWA cache is checked separately.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');

const root = path.resolve(__dirname, '..');
const results = path.join(root, 'test-results');
fs.mkdirSync(results, { recursive: true });

const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml',
 '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg' };

const server = http.createServer((req,res)=>{
 let pathname;
 try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
 catch { res.writeHead(400).end(); return; }
 const file = path.resolve(root, '.' + (pathname==='/' ? '/index.html' : pathname));
 if(!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()){
  res.writeHead(404).end('Not found');return;
 }
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type',types[path.extname(file)] || 'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
const listen = ()=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close = ()=>new Promise(resolve=>server.close(()=>resolve()));

const fixture = {
 version:2, hand:'diestro', balls:[], patterns:[], sessions:[{
  id:'LAB-SESION',type:'entrenamiento',date:'2026-11-08',
  title:'Partida ficticia de laboratorio',lane:null,currentBallId:'',
  currentLine:{approach:'20',arrow:'15',breakpoint:'8'},
  games:[{id:'LAB-G1',pair:null,startLane:null,includeStats:true,segments:[],rolls:[]}]
 }]
};
const dbFromPage = page=>page.evaluate(()=>JSON.parse(localStorage.getItem('mi-bowling-analitica-v2')));
function assertNoHorizontalOverflow(page){
 return page.evaluate(()=>({
  width:document.documentElement.clientWidth,
  scroll:document.documentElement.scrollWidth
 }));
}
async function runView(browser,engine,width,height,origin){
 const context = await browser.newContext({viewport:{width,height},
  isMobile:width<700,hasTouch:width<700,deviceScaleFactor:1,serviceWorkers:'block'});
 const page = await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try {
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(db=>{localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(db));},fixture);
  await page.reload({waitUntil:'load'});
  await page.evaluate(()=>{activeId='LAB-SESION';go('registro');});
  await page.locator('.registry-v4-score').waitFor();
  assert.equal(await page.locator('#bottom-nav').isVisible(),false,'Registro sin navegación fija superpuesta');
  await page.evaluate(()=>go('inicio'));
  assert(await page.locator('#bottom-nav').isVisible(),'Navegación conservada fuera del registro');
  await page.evaluate(()=>go('registro'));

  assert.equal(await page.locator('.score-strip .frame-cell').count(),10, '10 frames');
  assert.equal(await page.locator('.registry-v4-mini-frame').count(),10,'10 miniaturas');
  assert.equal(await page.locator('.pin-layout button.pin').count(),10,'10 bolos');
  assert.equal(await page.getByRole('button',{name:/Cambiar par/}).count(),1);
  assert.equal(await page.getByRole('button',{name:/Deshacer último lanzamiento/}).count(),1);
  assert(await page.getByRole('button',{name:/Deshacer último lanzamiento/}).isDisabled());
  assert((await page.locator('.registry-v4-score').boundingBox()).y <
   (await page.locator('.registry-v4-roll').boundingBox()).y,'Marcador encima del selector');
  const sizes = await page.locator('.pin-layout button.pin').first().evaluate(el=>{
   const b=el.getBoundingClientRect(); return [b.width,b.height];
  });
  assert(sizes[0]>=44 && sizes[1]>=44,'Bolos cómodos al tacto');
  assert.equal(await page.locator('.registry-v4-quick .btn').count(),3,'Tres atajos');
  assert.equal(await page.getByRole('button',{name:'Todos derribados',exact:true}).count(),0,'Atajo redundante eliminado');
  assert(await page.locator('#quick-record').getByText('Strike').isVisible(),'Strike sigue disponible como acción principal');
  const actions = await page.locator('.registry-v4-quick .btn').evaluateAll(buttons=>buttons.map(el=>{
   const b=el.getBoundingClientRect();return {x:b.x,y:b.y,height:b.height,scroll:el.scrollWidth,width:el.clientWidth};
  }));
  assert(actions.every(a=>a.height>=44 && a.scroll <= a.width+2),'Atajos accesibles sin texto cortado');
  if(width===320){
   assert(Math.abs(actions[0].y-actions[1].y)<2,'Dos botones en la primera fila');
   assert(actions[2].y>actions[0].y+20,'Segunda fila para atajos en móvil pequeño');
  }
  const frameHeading=await page.locator('.registry-v4-roll .game-heading h1').evaluate(el=>{
   const b=el.getBoundingClientRect(),style=getComputedStyle(el);
   const line=parseFloat(style.lineHeight)||parseFloat(style.fontSize)*1.2;
   return {height:b.height,line,contentWidth:el.scrollWidth,clientWidth:el.clientWidth};
  });
  assert(frameHeading.height<=frameHeading.line+3,'Cabecera del frame en una línea');
  assert(frameHeading.contentWidth<=frameHeading.clientWidth+2,'Título del frame sin recortes');
  assert(await page.getByText('Si no marcas ninguno, anotarás todos derribados.').isVisible(),'Explicación de anotación');

  const overflow=await assertNoHorizontalOverflow(page);
  assert(overflow.scroll <= overflow.width + 2,
   'Desbordamiento horizontal: '+JSON.stringify({engine,width,overflow}));
  assert.equal(errors.length,0,'Sin excepciones de JS en carga');
  const screenshot=path.join(results,engine+'-'+width+'.png');
  await page.screenshot({path:screenshot,fullPage:true});

  if(width===390){
   // Estabilidad del desplegable al seleccionar bolos.
   const extra=page.locator('.registry-v4-extra');
   await extra.locator('summary').click();
   assert(await extra.evaluate(el=>el.open),'Detalles abiertos');
   await page.locator('#approach').fill('24');
   await page.locator('#approach').press('Tab');
   assert.equal((await dbFromPage(page)).sessions[0].currentLine.approach,'24');
   await page.getByRole('button',{name:/Bolo 7/}).click();
   assert.equal(await page.locator('.pin-layout button.pin.selected').count(),1,'Seleccionar bolo');
   assert(await extra.evaluate(el=>el.open),'Sección de línea mantiene apertura tras seleccionar');
   await page.getByRole('button',{name:'Limpiar'}).click();
   assert.equal(await page.locator('.pin-layout button.pin.selected').count(),0,'Limpiar selección');
   await page.locator('#quick-record').click(); // Primera tirada: strike
   let db=await dbFromPage(page);
   assert.equal(db.sessions[0].games[0].rolls.length,1,'Tiro guardado');
   assert.equal(db.sessions[0].games[0].rolls[0].pins.length,10,'Strike guardado');
   assert.equal(db.sessions[0].games[0].rolls[0].line.approach,'24','Línea del tiro');
   assert(!(await page.getByRole('button',{name:/Deshacer último lanzamiento/}).isDisabled()));
   const undo=page.getByRole('button',{name:/Deshacer último lanzamiento/});
   page.once('dialog',async dialog=>dialog.accept());
   await undo.click();
   db=await dbFromPage(page);
   assert.equal(db.sessions[0].games[0].rolls.length,0,'Deshacer revierte un tiro');
   assert(await page.getByRole('button',{name:/Deshacer último lanzamiento/}).isDisabled());
   await page.getByRole('button',{name:/Cambiar par/}).click();
   assert(await page.locator('#new-pair').isVisible(),'Editor de par sin par previo');
   await page.locator('#new-pair').fill('7');
   await page.locator('#new-pair-start').selectOption('7');
   await page.getByRole('button',{name:'Confirmar cambio de par'}).click();
   assert.deepEqual((await dbFromPage(page)).sessions[0].games[0].segments[0].pair,[7,8]);
   await page.reload({waitUntil:'load'});
   await page.evaluate(()=>{activeId='LAB-SESION';go('registro');});
   assert.deepEqual((await dbFromPage(page)).sessions[0].games[0].segments[0].pair,[7,8],
    'Par guardado tras recarga');
   assert.equal(errors.length,0,'Sin errores JS en interacción');
  }
  console.log('OK '+engine+' '+width+'x'+height+', bolos '+sizes[0]+'px, scroll '+overflow.scroll);
 } finally {
  await context.close();
 }
}
async function runMissedFrame(browser,engine,origin){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await context.newPage();
 try{
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(db=>localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(db)),fixture);
  await page.reload({waitUntil:'load'});
  await page.evaluate(()=>{activeId='LAB-SESION';go('registro');});
  const first=page.locator('.registry-v4-mini-frame').first();
  await page.getByRole('button',{name:/Bolo 9:/}).click();
  await page.getByRole('button',{name:/Bolo 10:/}).click();
  await page.locator('#quick-record').click();
  assert.equal(await first.locator('.missed').count(),0,'Primera tirada: sin rojo');
  assert.equal(await first.locator('.standing').count(),2,'Primera tirada: dos bolos negros');
  assert((await page.locator('#quick-record').textContent()).includes('Semipleno'),'Segunda tirada ofrece Semipleno');
  assert(!(await page.locator('#quick-record').textContent()).includes('Derribados todos'),'Segunda tirada sin nombre antiguo');
  assert.equal(await first.locator('[data-pin="9"].standing').count(),1,'Bolo 9 en pie negro');
  assert.equal(await first.locator('[data-pin="10"].standing').count(),1,'Bolo 10 en pie negro');
  await page.getByRole('button',{name:/Bolo 10:/}).click();
  await page.locator('#quick-record').click();
  assert.equal(await first.locator('.missed').count(),1,'Solo bolo 10 sin derribar');
  assert.equal(await first.locator('[data-pin="10"].missed').count(),1,'Pin correcto marcado en rojo');
  assert.equal(await first.locator('[data-pin="9"].standing').count(),1,'Bolo 9 derribado en segunda negro');
  assert.equal(await first.locator('[data-pin="8"].fallen').count(),1,'Bolo derribado en primera gris');
  assert.equal((await dbFromPage(page)).sessions[0].games[0].rolls.length,2,'Segunda tirada guardada');
  await page.screenshot({path:path.join(results,engine+'-390-rojo-segunda.png'),fullPage:true});
  page.once('dialog',async dlg=>dlg.accept());
  await page.getByRole('button',{name:/Deshacer último lanzamiento/}).click();
  assert.equal(await first.locator('.missed').count(),0,'Deshacer: no conservar rojo anterior');
  assert.equal(await first.locator('.standing').count(),2,'Deshacer repone los dos negros de primera tirada');
  await page.locator('#quick-record').click();
  assert.equal(await first.locator('.missed').count(),0,'Spare: ningún bolo rojo');
  assert.equal(await first.locator('.standing').count(),2,'Spare deja negros los derribados en segunda');
  console.log('OK '+engine+' indicadores rojos: cierre, deshacer y spare.');
 }finally{await context.close();}
}

async function runOffline(browser,origin){
 // Contexto nuevo, Service Worker real: valida primera instalación y uso sin red.
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
 const page=await context.newPage(),navigations=[];
 page.on('framenavigated',f=>{if(f===page.mainFrame())navigations.push(f.url());});
 try {
  await page.goto(origin,{waitUntil:'load'});
  await page.waitForFunction(()=>!!navigator.serviceWorker?.controller,null,{timeout:20000});
  await page.waitForTimeout(350);
  assert.equal(navigations.length,1,'No debe recargar al tomar el control por primera vez');
  const cacheNames=await page.evaluate(()=>caches.keys());
  assert(cacheNames.some(x=>x.includes('v3-3-9-lab')),'Caché versionada disponible');
  await page.evaluate(db=>{localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(db));},fixture);
  await context.setOffline(true);
  await page.reload({waitUntil:'load'});
  await page.evaluate(()=>{activeId='LAB-SESION';go('registro');});
  assert(await page.locator('.registry-v4-score').isVisible(),'Marcador disponible sin conexión');
  await page.getByRole('button',{name:/Bolo 7/}).click();
  assert.equal(await page.locator('.pin.selected').count(),1,'Bolos interactivos sin conexión');
  await page.locator('#quick-record').click();
  assert.equal((await dbFromPage(page)).sessions[0].games[0].rolls.length,1,
   'Registro ficticio guardado sin conexión');
  console.log('OK chromium PWA offline: caché, primer control sin recarga y anotación local.');
 }finally{await context.close();}
}


async function runBackupRoundTrip(browser,origin){
 // Exclusivamente fixture sintética y contexto nuevo: NUNCA usa datos reales del iPhone.
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',acceptDownloads:true});
 const page=await ctx.newPage();
 const original={
  ...fixture,
  balls:[{id:'LAB-BOLA',brand:'Prueba',model:'Bola ficticia',weight:'15 lb',kind:'Reactiva'}],
  patterns:[{id:'LAB-PATRON',name:'Patrón ficticio'}],
  sessions:[{...fixture.sessions[0],currentBallId:'LAB-BOLA',
   games:[{...fixture.sessions[0].games[0],
    rolls:[{frame:1,ball:1,pins:[1,2,3,4,5,6,7,8,9,10],ballId:'LAB-BOLA',
     line:{approach:'20',arrow:'15',breakpoint:'8'},lane:null,pair:null,foul:false}]}]}]
 };
 try{
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(obj=>localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(obj)),original);
  await page.reload({waitUntil:'load'});
  await page.evaluate(()=>go('ajustes'));
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:/Exportar copia/}).click();
  const download=await downloadEvent;
  const saved=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(saved.version,2,'Versión de esquema exportada');
  assert.equal(saved.sessions[0].games[0].rolls.length,1,'Tirada exportada');
  assert.equal(saved.balls[0].id,'LAB-BOLA','Bola exportada');
  assert.equal(saved.patterns[0].id,'LAB-PATRON','Patrón exportado');
  assert(saved.leagueNational && saved.leagueRosters,'Información de Liga incluida');
  await page.evaluate(()=>{localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify({version:2,hand:'diestro',balls:[],patterns:[],sessions:[]}));});
  await page.reload({waitUntil:'load'});
  await page.evaluate(()=>go('ajustes'));
  page.once('dialog',async d=>d.accept());
  await page.locator('#restore-file').setInputFiles({
   name:'MI_BOWLING_copia_ficticia.json',
   mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(saved))
  });
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mi-bowling-analitica-v2')||'{}').sessions?.length===1);
  const restored=await dbFromPage(page);
  assert.equal(restored.sessions[0].id,'LAB-SESION','Sesión restaurada');
  assert.equal(restored.sessions[0].games[0].rolls.length,1,'Tirada restaurada');
  assert.equal(restored.sessions[0].games[0].rolls[0].pins.length,10,'Bolos restaurados');
  assert.equal(restored.balls[0].id,'LAB-BOLA','Material restaurado');
  assert.equal(restored.patterns[0].id,'LAB-PATRON','Patrón restaurado');
  assert.equal(restored.sessions[0].currentLine.breakpoint,'8','Línea restaurada');
  console.log('OK exportación y restauración JSON con fixture sintética, sin datos reales.');
 }finally {await ctx.close();}
}

(async()=>{
 let browsers=[];let passed=0;
 try {
  const port=await listen(),origin='http://127.0.0.1:'+port+'/';
  for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
   const browser=await type.launch({headless:true});
   browsers.push(browser);
   for(const [w,h] of [[320,640],[390,844],[768,1024],[1280,900]]){
    await runView(browser,engine,w,h,origin);passed++;
   }
   await runMissedFrame(browser,engine,origin);
   if(engine==='chromium'){await runOffline(browser,origin);await runBackupRoundTrip(browser,origin);}
  }
  assert.equal(passed,8);
  console.log('PASS 8 combinaciones, PWA offline y copia JSON exportada/restaurada con datos ficticios.');
 }catch(e){console.error('FAIL Browser Lab:',e.stack||e);process.exitCode=1;}
 finally {for(const b of browsers)await b.close();if(server.listening)await close();}
})();
