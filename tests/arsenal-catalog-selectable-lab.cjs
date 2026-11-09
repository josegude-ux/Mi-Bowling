'use strict';
// MI BOWLING · Fase LAB catálogo seleccionable · exclusividad de datos ficticios.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 const file=path.resolve(root,'.'+(p==='/'?'/index.html':p));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
const ball=(id,brand,model,retired=false)=>({id,brand,model,weight:'15 lb',kind:'Reactiva',notes:'Taladro personal ficticio',photo:'',retired});
const seed=()=>({version:2,hand:'diestro',balls:[
 ball('lab-existing','Hammer','Web Tour Edition Hybrid'),
 ball('lab-retired','DV8','Pitbull Bite',true),
 ball('lab-alias','Columbia','Bully')
],patterns:[],sessions:[{id:'lab-historico-1',type:'entrenamiento',date:'2026-11-09',title:'Partida guardada LAB',venue:'Bolera ficticia',games:[{id:'lab-juego-1',rolls:[{frame:1,ball:1,pins:[1,2,3],ballId:'lab-existing',line:{approach:'25',arrow:'15',breakpoint:'8'},lane:1,pair:null,foul:false,createdAt:'2026-11-09T08:00:00Z'}]}]}]});
const state=page=>page.evaluate(()=>({db:JSON.parse(localStorage.getItem('mi-bowling-analitica-v2')),picks:JSON.parse(localStorage.getItem('mi-bowling-ball-selection-v1')||'{}')}));
const openCatalog=async page=>{
 await page.getByRole('button',{name:'Mis bolas',exact:true}).click();
 await page.getByRole('button',{name:/Catálogo/}).first().click();
};
async function mainScenario(browser,engine,width,origin){
 const context=await browser.newContext({viewport:{width,height:width<500?844:850},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[],dialogs=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>{dialogs.push(d.message());d.accept()});
 try{
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(data=>{localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(data));localStorage.setItem('mi-bowling-ball-selection-v1',JSON.stringify({__next__:['lab-existing']}))},seed());
  await page.reload({waitUntil:'load'});
  const prior=await state(page);
  await openCatalog(page);
  assert.equal(await page.locator('.arsenal-model').count(),10,'10 fichas reutilizadas de PR19');
  assert.equal(await page.locator('.arsenal-model').filter({hasText:'Web Tour Edition Hybrid'}).getByRole('button',{name:'Añadir a Mis bolas'}).count(),0,'No ofrecer duplicado existente');
  assert.equal(await page.locator('.arsenal-model').filter({hasText:'Pitbull Bite'}).getByRole('button',{name:'Añadir a Mis bolas'}).count(),0,'No duplicar retirada');
  assert.equal(await page.locator('.arsenal-model').filter({hasText:'Bully'}).getByRole('button',{name:'Añadir a Mis bolas'}).count(),0,'Alias Columbia/C300 no se duplica');
  await page.locator('#arsenal-catalog-search').fill('vintage phantom');
  assert.equal(await page.locator('.arsenal-model:visible').count(),1,'Búsqueda sin distinguir mayúsculas');
  assert.match(await page.locator('.arsenal-model:visible').innerText(),/Vintage Phantom/);
  await page.locator('.arsenal-model:visible').getByRole('button',{name:'Añadir a Mis bolas'}).click();
  let after=await state(page);
  assert.equal(after.db.balls.length,4,'Incorporación única');
  const added=after.db.balls.find(x=>x.model==='Vintage Phantom');
  assert(added?.id&&added.brand==='Brunswick','Modelo y marca de perfil local');
  assert.equal(added.weight,'','Peso sin inventar');
  assert.equal(added.notes,'','Taladro sin inventar');
  assert.equal(added.kind,'Reactiva','Tipo reutiliza esquema vigente');
  assert.deepEqual(after.db.balls.slice(0,3),seed().balls,'Bolas y notas anteriores intactas');
  assert.deepEqual(after.db.sessions,prior.db.sessions,'Historial y atribución de bolas en tiros existentes intactos');
  assert.deepEqual(after.picks.__next__,['lab-existing'],'No selecciona automáticamente');
  assert.equal(await page.locator('#arsenal-catalog-search').inputValue(),'vintage phantom','Conserva búsqueda tras incorporar');
  assert.equal(await page.locator('.arsenal-model:visible').getByRole('button',{name:'Añadir a Mis bolas'}).count(),0,'Una sola incorporación idempotente');
  await page.locator('#arsenal-catalog-search').fill('brunswick');
  assert.equal(await page.locator('.arsenal-model:visible').count(),5,'Búsqueda por marca en todo el catálogo');
  await page.getByRole('button',{name:'Volver a Mis bolas'}).click();
  const card=page.locator('.ball-card').filter({hasText:'Vintage Phantom'});
  assert.equal(await card.count(),1,'Modelo incorporado visible en arsenal real');
  await card.locator('.ball-session-toggle input').check();
  after=await state(page);
  assert.deepEqual(after.picks.__next__,['lab-existing',added.id],'Se selecciona mediante check F1 de misma sesión');
  await page.reload({waitUntil:'load'});
  await page.getByRole('button',{name:'Mis bolas',exact:true}).click();
  assert.equal(await page.locator('.ball-card').filter({hasText:'Vintage Phantom'}).locator('.ball-session-toggle input').isChecked(),true,'Persiste selección tras recarga');
  await page.getByRole('button',{name:/Catálogo/}).first().click();
  await page.locator('#arsenal-catalog-search').fill('no-existe-ningún-modelo');
  assert.equal(await page.locator('.arsenal-model:visible').count(),0,'Sin resultados falsos');
  assert.equal(await page.locator('#arsenal-catalog-noresults').isVisible(),true,'Mensaje de búsqueda vacía');
  // Fallo de cuota inyectado: jamás fingir incorporación persistida.
  await page.locator('#arsenal-catalog-search').fill('Ringer');
  await page.evaluate(()=>{
   window.__catalogOriginalSetItem=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){if(k==='mi-bowling-analitica-v2')throw new DOMException('Cuota LAB','QuotaExceededError');return window.__catalogOriginalSetItem.call(this,k,v)};
  });
  await page.locator('.arsenal-model:visible').getByRole('button',{name:'Añadir a Mis bolas'}).click();
  assert(dialogs.some(x=>/No se ha podido guardar/.test(x)),'Se informa de almacenamiento lleno');
  let failed=await state(page);
  assert.equal(failed.db.balls.length,4,'No guardar fantasma al simular cuota');
  assert.equal(await page.locator('.arsenal-model:visible').getByRole('button',{name:'Añadir a Mis bolas'}).count(),1,'Puede reintentarse sin duplicado');
  await page.evaluate(()=>{Storage.prototype.setItem=window.__catalogOriginalSetItem});
  assert.deepEqual(errors,[],'Sin JS errors');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),'Móvil sin scroll horizontal');
  console.log('OK '+engine+' '+width+'px: catálogo buscable 10, incorporación, aliases, retirada, checkbox, recarga y cuota');
 }finally{await context.close()}
}
async function staleTabScenario(browser,engine,origin){
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const a=await ctx.newPage(),b=await ctx.newPage(),errs=[],dialogText=[];
 a.on('pageerror',e=>errs.push('a '+e.message));b.on('pageerror',e=>errs.push('b '+e.message));
 a.on('dialog',d=>d.accept());
 b.on('dialog',d=>{dialogText.push(d.message());d.accept()});
 try{
  await a.goto(origin,{waitUntil:'load'});
  await a.evaluate(data=>localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(data)),{version:2,hand:'diestro',balls:[],patterns:[],sessions:[]});
  await b.goto(origin,{waitUntil:'load'});await a.reload({waitUntil:'load'});
  await openCatalog(a);await openCatalog(b);
  await a.locator('#arsenal-catalog-search').fill('Rally');
  await a.locator('.arsenal-model:visible').getByRole('button',{name:'Añadir a Mis bolas'}).click();
  assert.equal((await state(a)).db.balls.length,1,'A añade Rally');
  await b.locator('#arsenal-catalog-search').fill('Ringer');
  await b.locator('.arsenal-model:visible').getByRole('button',{name:'Añadir a Mis bolas'}).click();
  assert(dialogText.some(s=>/otra pestaña/.test(s)),'B bloquea guardado obsoleto');
  assert.deepEqual((await state(b)).db.balls.map(x=>x.model),['Rally'],'B no sobrescribe Rally de A');
  await b.reload({waitUntil:'load'});await openCatalog(b);
  await b.locator('#arsenal-catalog-search').fill('Ringer');
  await b.locator('.arsenal-model:visible').getByRole('button',{name:'Añadir a Mis bolas'}).click();
  assert.deepEqual((await state(b)).db.balls.map(x=>x.model),['Rally','Ringer Burgundy Pearl'],'B añade tras recargar sin duplicados');
  assert.deepEqual(errs,[],'Sin errores en dos pestañas');
  console.log('OK '+engine+' 390px: otro catálogo abierto no sobrescribe el vigente en una segunda pestaña');
 }finally{await ctx.close()}
}
async function offlineCatalogScenario(browser,origin){
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
 const page=await ctx.newPage();
 try{
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload({waitUntil:'load'});
  assert.equal(await page.evaluate(()=>!!navigator.serviceWorker.controller),true,'Service Worker controla la página LAB');
  await ctx.setOffline(true);
  await page.reload({waitUntil:'load'});
  await openCatalog(page);
  assert.equal(await page.locator('.arsenal-model').count(),10,'Las 10 fichas se cargan en modo offline');
  await page.locator('#arsenal-catalog-search').fill('Rally');
  await page.locator('.arsenal-model:visible').getByRole('button',{name:'Añadir a Mis bolas'}).click();
  assert.deepEqual((await state(page)).db.balls.map(x=>x.model),['Rally'],'Sin red se puede añadir un modelo al almacenamiento local');
  console.log('OK chromium 390px: nuevo catálogo y alta de bola funcionando con PWA offline');
 }finally{await ctx.close()}
}
(async()=>{
 const port=await new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port))),origin='http://127.0.0.1:'+port+'/';
 try{for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){const browser=await type.launch({headless:true});try{for(const width of [390,1280])await mainScenario(browser,engine,width,origin);await staleTabScenario(browser,engine,origin);if(engine==='chromium')await offlineCatalogScenario(browser,origin)}finally{await browser.close()}}}
 finally{await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
