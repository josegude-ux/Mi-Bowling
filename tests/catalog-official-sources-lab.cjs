'use strict';
/* CP BOWLING-ARSENAL-SOURCES-001: exclusivamente datos sintéticos. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const get=n=>fs.readFileSync(path.join(root,n),'utf8');
const js=get('official-ball-catalog.js'),view=get('arsenal-view-lab.js'),app=get('app.js'),html=get('index.html'),sw=get('sw.js');
new Function(js);new Function(view);new Function(app);
const official=require('node:vm').runInNewContext(js+'; JSON.stringify(MiBowlingOfficialBallCatalog.models)',{});
const models=JSON.parse(official),norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
assert.equal(models.length,21,'21 referencias adicionales sin etiquetas técnicas ficticias');
assert.equal(new Set(models.map(x=>x.id)).size,21,'ids de origen únicos');
assert.equal(new Set(models.map(x=>norm(x.brand)+'/'+norm(x.model))).size,21,'modelos de origen únicos');
for(const m of models){assert(m.id.startsWith('official-'),'id namespaced');
 assert(/^https:\/\/(www\.)?(stormbowling\.com|hammerbowling\.com|trackbowling\.com|dv8bowling\.com|brunswickbowling\.com)\//.test(m.sourceUrl),'enlace de dominio oficial '+m.model);
 assert(!('rg' in m)&&!('weight' in m)&&!('layout' in m),'sin datos técnicos no verificados');
}
assert(html.includes('official-ball-catalog.js?v=official-catalog-cp037'),'fuentes enlazadas');
assert(html.indexOf('official-ball-catalog.js')<html.indexOf('arsenal-view-lab.js'),'fuentes cargadas antes de la vista');
for(const token of ["const KEY='mi-bowling-analitica-v2'","const BALL_SELECTION_KEY='mi-bowling-ball-selection-v1'","function recordRoll(","function undoRoll("])
 assert(app.includes(token),'compatibilidad '+token);
assert(sw.includes("const CACHE='mi-bowling-analitica-v3-3-10-catalogo-cp037'"),'versión CP037');
assert(sw.includes('official-ball-catalog.js?v=official-catalog-cp037'),'precache de fuentes');
console.log('PASS CATALOG SOURCES static: 21 refs oficiales, 10 perfiles previos, PWA CP037, datos y motor sin migración');
if(!process.argv.includes('--browser'))process.exit(0);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 const file=path.resolve(root,'.'+(p==='/'?'/index.html':p));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)});
});
const ball=(i,brand,model,retired=false)=>({id:'FICTICIA-'+i,brand,model,retired,kind:'Reactiva',weight:'',photo:'',notes:'Prueba aislada'});
const oldBalls=[
 ['Columbia 300','Bully'],['Columbia 300','Rally'],['Brunswick','Ringer Burgundy Pearl'],['Brunswick','Rhino Pro Gold'],
 ['Brunswick','C-System 4.5'],['Brunswick','Vintage Phantom'],['Hammer','Web Tour Edition Hybrid'],
 ['Brunswick','Cutting Edge Solid'],['DV8','Pitbull Bite'],['Track','Legion Pearl']
].map((x,i)=>ball(i,...x));
const fixture={version:2,hand:'diestro',balls:oldBalls,patterns:[],sessions:[{id:'S-FICTICIA',type:'entrenamiento',date:'2026-11-10',title:'Historial ficticio',games:[{id:'G-FICTICIO',rolls:[{frame:1,ball:1,pins:[1,2],ballId:'FICTICIA-0',line:{},lane:1}]}]}]};
const {chromium,webkit}=require('playwright');
async function verify(engine,url){
 const browser=await({chromium,webkit}[engine]).launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'}),page=await ctx.newPage(),errs=[];
 page.on('pageerror',e=>errs.push(e.message));
 try{
  await page.goto(url,{waitUntil:'load',timeout:35000});
  await page.evaluate(data=>{localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(data));localStorage.setItem('mi-bowling-ball-selection-v1',JSON.stringify({__next__:['FICTICIA-0']}))},fixture);
  await page.reload({waitUntil:'load'});
  const baseline=await page.evaluate(()=>({balls:structuredClone(db.balls),sessions:structuredClone(db.sessions)}));
  await page.locator('#bottom-nav button[aria-label="Estadísticas"]').click();
  await page.getByRole('button',{name:/Ver mis bolas/}).click();
  assert.equal(await page.locator('.ball-card').count(),10,'No se alteran 10 bolas');
  await page.getByRole('button',{name:'⌕ Catálogo',exact:true}).click();
  assert.equal(await page.locator('.arsenal-model[data-search]').count(),31,'Total 10+21');
  assert.match(await page.locator('#arsenal-catalog-count').textContent(),/31 de 31/);
  assert.equal(await page.getByRole('link',{name:'Track'}).getAttribute('href'),'https://trackbowling.com/collections/balls','Enlace a fabricante');
  await page.locator('#arsenal-catalog-search').fill('Theorem Delta');
  assert.equal(await page.locator('.arsenal-model:visible').count(),1,'Búsqueda nueva');
  assert.equal(await page.locator('.arsenal-model:visible a').getAttribute('href'),'https://trackbowling.com/collections/balls/products/theorem-delta','Ficha exacta si existe');
  await page.locator('.arsenal-model:visible').getByRole('button',{name:'Añadir a Mis bolas'}).click();
  const saved=await page.evaluate(()=>({db:JSON.parse(localStorage.getItem(KEY)),pick:JSON.parse(localStorage.getItem('mi-bowling-ball-selection-v1'))}));
  assert.equal(saved.db.balls.length,11,'incorporación una sola bola');
  assert.deepEqual(JSON.parse(JSON.stringify(saved.db.balls.slice(0,10))),baseline.balls,'las diez bolas y sus notas intactas');
  assert.deepEqual(JSON.parse(JSON.stringify(saved.db.sessions)),baseline.sessions,'historial intacto');
  assert.deepEqual(JSON.parse(JSON.stringify(saved.pick)),{__next__:['FICTICIA-0']},'selecciones sin autoselección');
  const added=saved.db.balls.at(-1);
  assert.equal(added.brand,'Track');assert.equal(added.model,'Theorem Delta');
  assert.equal(added.weight,'');assert.equal(added.kind,'');assert.equal(added.notes,'','sin inventar campos');
  assert.equal(await page.locator('.arsenal-model:visible button').filter({hasText:'Añadir'}).count(),0,'No añadir duplicado');
  await page.reload({waitUntil:'load'});
  await page.evaluate(()=>{go('bolas');setArsenalPanel('catalog')});
  await page.locator('#arsenal-catalog-search').fill('Theorem Delta');
  assert.equal(await page.locator('.arsenal-model:visible button').filter({hasText:'Añadir'}).count(),0,'Detecta registrado tras recarga');
  await page.locator('#arsenal-catalog-search').fill('noexisteinventado');
  assert.equal(await page.locator('.arsenal-model:visible').count(),0,'No inventa resultados');
  assert(await page.locator('#arsenal-catalog-noresults').isVisible(),'Explica cobertura limitada');
  assert(await page.getByRole('button',{name:/Añadir una bola manualmente/}).isVisible(),'Ruta segura sin ficha oficial');
  if(engine==='chromium'){
   await page.evaluate(()=>go('inicio'));
   await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.active,null,{timeout:30000});
   await page.reload({waitUntil:'load'});
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:20000});
   const cache=await page.evaluate(async()=>({names:await caches.keys(),catalog:!!(await caches.match('./official-ball-catalog.js?v=official-catalog-cp037'))}));
   assert(cache.catalog&&cache.names.includes('mi-bowling-analitica-v3-3-10-catalogo-cp037'),'catálogo precargado');
   await ctx.setOffline(true);
   await page.reload({waitUntil:'load'});
   await page.evaluate(()=>{go('bolas');setArsenalPanel('catalog')});
   await page.locator('#arsenal-catalog-search').fill('Storm Equinox');
   assert.equal(await page.locator('.arsenal-model:visible').count(),1,'búsqueda offline');
   await page.locator('.arsenal-model:visible').getByRole('button',{name:/Añadir a Mis bolas/}).click();
   assert.equal(await page.evaluate(()=>db.balls.length),12,'alta offline con datos ficticios');
   await page.reload({waitUntil:'load'});
   assert.equal(await page.evaluate(()=>db.balls.length),12,'persistencia offline');
   console.log('PASS CATALOG SOURCES Chromium PWA: SW CP037, búsqueda, alta y recarga offline');
  }
  assert.deepEqual(errs,[],'Sin errores de JavaScript');
  console.log('PASS CATALOG SOURCES '+engine+' iPhone emulado: 10+21, búsqueda, altas, no duplicar, historial y selecciones conservadas');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 try{await verify('chromium',url);await verify('webkit',url)}finally{await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
