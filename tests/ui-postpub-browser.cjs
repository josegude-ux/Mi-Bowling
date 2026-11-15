'use strict';
/* BOWLING-UI-POSTPUB-001: verificación de despliegue, no altera servidor.
   Se abren contextos efímeros aislados con datos 100% ficticios.
   LAB_AUDIT_MODE=local prueba la rama; deployed prueba Pages publicado. */
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const mode=process.env.LAB_AUDIT_MODE||'local';
assert(['local','deployed'].includes(mode),'Modo local/deployed');
const out=path.join(root,'test-results','ui-postpub');
fs.mkdirSync(out,{recursive:true});
const LIVE='https://josegude-ux.github.io/Mi-Bowling/';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 let u;
 try{u=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}
 catch{res.writeHead(400).end();return}
 const file=path.resolve(root,'.'+(u==='/'?'/index.html':u));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
  res.writeHead(404).end('Not found');return;
 }
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type',MIME[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
const ball={id:'AUDIT-B1',brand:'Columbia 300',model:'Bully',weight:'',kind:'Reactiva',
 notes:'FICHA FICTICIA · NO ES DATO DEL USUARIO',photo:'',retired:false};
const fixture={
 version:2,hand:'diestro',balls:[ball],patterns:[],
 sessions:[{id:'AUDIT-SESION',type:'entrenamiento',date:'2026-11-09',
  title:'PARTIDA FICTICIA · AUDITORÍA POSTPUBLICACIÓN',venue:'Bolera ficticia',
  currentBallId:'',currentLine:{approach:'20',arrow:'15',breakpoint:'8'},lane:null,
  games:[{id:'AUDIT-G1',pair:null,startLane:null,includeStats:true,segments:[],rolls:[]}]}]
};
function visitOptions(width,height){return {viewport:{width,height},deviceScaleFactor:1,isMobile:width<700,hasTouch:width<700,serviceWorkers:'block'}}
async function regular(browser,engine,width,height,url){
 const context=await browser.newContext(visitOptions(width,height));
 const page=await context.newPage(),errors=[],badAssets=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)badAssets.push(r.status()+' '+r.url())});
 try{
  await page.goto(url,{waitUntil:'load',timeout:35000});
  await page.locator('.bowling-home-menu').waitFor({timeout:15000});
  const meta=await page.evaluate(()=>({title:document.title,nav:!!document.querySelector('.design-lab-sidebar'),
   css:[...document.styleSheets].some(s=>s.href?.includes('design-lab.css')),
   heading:document.querySelector('.design-lab-side-foot')?.textContent}));
  assert(meta.nav&&meta.css,'Rediseño publicado y CSS cargado');
  if(mode==='local'){
   assert(!meta.title.includes('LAB')&&!meta.heading.includes('Laboratorio'),
    'Etiquetas LAB eliminadas de la interfaz visible de candidata');
  }else{
   console.log('DETECTADO EN PUBLICACIÓN: etiqueta LAB='+meta.title.includes('LAB')+
     ', pie Laboratorio='+meta.heading.includes('Laboratorio'));
  }
  await page.evaluate(data=>localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(data)),fixture);
  await page.reload({waitUntil:'load',timeout:35000});
  assert.equal(await page.locator('.bowling-home-module').count(),3,'Inicio sin regresiones');
  if(mode==='local')assert.equal(await page.locator('.bowling-home-tools').count(),0,'Inicio LAB sin enlaces duplicados');
  if(width===1280){
   const tops=await page.locator('.bowling-home-module').evaluateAll(nodes=>
    nodes.map(n=>Math.round(n.getBoundingClientRect().top)));
   if(mode==='local')assert(tops.every(v=>Math.abs(v-tops[0])<=2),
    'Las tres tarjetas quedan alineadas en escritorio LAB: '+tops.join(','));
   else console.log('DIAGNÓSTICO PUBLICADO: tres tarjetas en Y='+tops.join(','));
  }
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--teal').trim()),
   '#086fd4','Tema azul activo');
  if(width>=1120){
   assert(await page.locator('.design-lab-sidebar').isVisible(),'Sidebar escritorio');
   assert.equal(await page.locator('#bottom-nav').isVisible(),false,'Sin doble navegación');
   await page.locator('[data-design-target="bolas"]').click();
  }else{
   assert.equal(await page.locator('.design-lab-sidebar').isVisible(),false,'Sidebar oculto en móvil/tablet');
   assert(await page.locator('#bottom-nav').isVisible(),'Menú móvil/tablet');
   const legacyLink=page.locator('.bowling-home-tool-card').filter({hasText:'Mis bolas'});
   if(await legacyLink.count())await legacyLink.click();
   else{
    await page.locator('#bottom-nav button[aria-label="Estadísticas"]').click();
    await page.getByRole('button',{name:/Ver mis bolas/}).click();
   }
  }
  assert.equal(await page.locator('.ball-card').count(),1,'Arsenal ficticio una sola vez');
  await page.locator('.ball-session-toggle input').check();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('mi-bowling-ball-selection-v1')).__next__),
   ['AUDIT-B1'],'Selección por check persistida');
  await page.evaluate(()=>go('estadisticas'));
  assert(await page.getByRole('heading',{name:'Estadísticas'}).isVisible(),'Estadísticas accesibles');
  await page.evaluate(()=>{activeId='AUDIT-SESION';go('registro')});
  assert.equal(await page.locator('.pin-layout button.pin').count(),10,'10 bolos en pantalla');
  assert.equal(await page.locator('.score-strip .frame-cell').count(),10,'10 frames');
  assert.equal(await page.locator('.registry-v4-score .score-action-buttons button').count(),2,'Cambiar par y Deshacer juntos');
  assert(await page.getByRole('button',{name:'Deshacer último lanzamiento'}).isDisabled(),'Deshacer inicialmente desactivado');
  await page.evaluate(()=>fastRoll(false));
  assert.equal(await page.evaluate(()=>game(session()).rolls[0].pins.length),10,'Primer strike real');
  await page.getByRole('button',{name:'Deshacer último lanzamiento'}).click();
  assert.equal(await page.evaluate(()=>game(session()).rolls.length),0,'Deshacer revierte el lanzamiento');
  await page.evaluate(()=>{for(let n=0;n<12;n++)fastRoll(false)});
  assert.deepEqual(await page.evaluate(()=>({rolls:game(session()).rolls.length,done:complete(game(session())),
   points:score(game(session()))})),{rolls:12,done:true,points:300},'Partida ficticia perfecta = 300');
  await page.evaluate(()=>go('estadisticas'));
  const average=await page.evaluate(()=>aggregate('entrenamiento').avg);
  assert.equal(average,300,'Estadística alimentada por datos ficticios calculados, no maquetación');
  await page.reload({waitUntil:'load'});
  const persisted=await page.evaluate(()=>({
   rolls:db.sessions.find(s=>s.id==='AUDIT-SESION')?.games[0].rolls.length,
   names:db.balls.map(b=>b.model),
   selection:JSON.parse(localStorage.getItem('mi-bowling-ball-selection-v1')||'{}').__next__
  }));
  assert.deepEqual(persisted,{rolls:12,names:['Bully'],selection:['AUDIT-B1']},
   'Recarga conserva partida y selección sin reemplazo');
  await page.locator('.design-lab-header-theme').click();
  assert(await page.evaluate(()=>document.body.classList.contains('lab-dark')),'Modo oscuro');
  await page.locator('.design-lab-header-theme').click();
  assert.equal(await page.evaluate(()=>document.body.classList.contains('lab-dark')),false,'Vuelta a claro');
  const bounds=await page.evaluate(()=>({visible:document.documentElement.clientWidth,
   width:document.documentElement.scrollWidth}));
  assert(bounds.width<=bounds.visible+2,'Sin desbordamiento '+JSON.stringify(bounds));
  await page.screenshot({path:path.join(out,mode+'-'+engine+'-'+width+'.png'),fullPage:true});
  assert.deepEqual(errors,[],'Sin errores JS');
  assert.deepEqual(badAssets,[],'Sin recursos rotos HTTP');
  console.log('PASS '+mode+' '+engine+' '+width+'×'+height+
   ': diseño, puntuación 300, deshacer, bolas, estadísticas, persistencia, navegación y tema');
 }finally{await context.close()}
}
async function offline(browser,url){
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,
  hasTouch:true,deviceScaleFactor:1,serviceWorkers:'allow'});
 const page=await ctx.newPage(),errs=[];
 page.on('pageerror',e=>errs.push(e.message));
 try{
  await page.goto(url,{waitUntil:'load',timeout:35000});
  await page.waitForFunction(async()=>{
   const r=await navigator.serviceWorker.getRegistration();
   return !!r?.active;
  },null,{timeout:30000});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:20000});
  const cached=await page.evaluate(async()=>({
   keys:await caches.keys(),
   css:!!(await caches.match('./design-lab.css?v=20261109-lab1')),
   js:!!(await caches.match('./design-lab.js?v=20261109-lab1')),
   html:!!(await caches.match('./index.html'))
  }));
  assert(cached.css&&cached.js&&cached.html,'Recursos nuevos realmente precargados offline');
  assert(cached.keys.some(x=>x.includes('mi-bowling-')),'Caché Mi Bowling presente');
  const expected=mode==='local'?'mi-bowling-analitica-v3-3-10-catalogo-cp037':'mi-bowling-analitica-v3-3-10-ui-cp036';
  assert(cached.keys.includes(expected),'Versión PWA correcta '+expected+': '+cached.keys);
  await page.evaluate(data=>localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(data)),fixture);
  await page.reload({waitUntil:'load'});
  await ctx.setOffline(true);
  await page.reload({waitUntil:'load'});
  await page.locator('.bowling-home-menu').waitFor();
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--teal').trim()),
   '#086fd4','Estilo azul disponible offline');
  await page.evaluate(()=>go('bolas'));
  assert.equal(await page.locator('.ball-card').count(),1,'Arsenal offline');
  await page.locator('.ball-session-toggle input').check();
  await page.evaluate(()=>{activeId='AUDIT-SESION';go('registro');fastRoll(false)});
  await page.reload({waitUntil:'load'});
  const after=await page.evaluate(()=>({
   rolls:db.sessions.find(s=>s.id==='AUDIT-SESION')?.games[0].rolls.length,
   chosen:JSON.parse(localStorage.getItem('mi-bowling-ball-selection-v1')).__next__
  }));
  assert.deepEqual(after,{rolls:1,chosen:['AUDIT-B1']},'Tirada y check persisten totalmente offline');
  assert.deepEqual(errs,[],'Sin errores JS offline');
  await page.screenshot({path:path.join(out,mode+'-chromium-390-offline.png'),fullPage:true});
  console.log('PASS '+mode+' Chromium PWA: SW, cache, offline, escritura local ficticia, recarga y conservación');
 }finally{await ctx.close()}
}
(async()=>{
 let origin=LIVE;
 if(mode==='local'){
  const port=await new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
  origin='http://127.0.0.1:'+port+'/';
 }
 const c=await chromium.launch({headless:true}),w=await webkit.launch({headless:true});
 try{
  await regular(c,'chromium',390,844,origin);
  await regular(c,'chromium',820,1180,origin);
  await regular(c,'chromium',1280,900,origin);
  await regular(w,'webkit',390,844,origin);
  await offline(c,origin);
 }finally{
  await c.close();await w.close();
  if(mode==='local')await new Promise(resolve=>server.close(resolve));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
