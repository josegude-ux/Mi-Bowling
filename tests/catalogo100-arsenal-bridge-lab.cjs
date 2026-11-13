'use strict';
/* LAB CAT100 · Datos A/B/C ficticios. No acceso a datos reales, ni imágenes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),vm=require('node:vm'),http=require('node:http');
const ROOT=path.resolve(__dirname,'..');
const read=n=>fs.readFileSync(path.join(ROOT,n),'utf8');
const bridgeJS=read('catalogo100-mis-bolas-bridge.js'),
 independent=read('catalogo-bolas/index.html'),
 app=read('app.js'),view=read('arsenal-view-lab.js'),
 index=read('index.html'),sw=read('sw.js');
new vm.Script(bridgeJS);new vm.Script(view);new vm.Script(app);
const seedTag=independent.match(/<script id="seed" type="application\/json">([\s\S]*?)<\/script>/);
assert(seedTag,'plantilla fuente de 100 publicada');
const seed=JSON.parse(seedTag[1]);
const environment={};environment.window=environment;environment.globalThis=environment;
vm.runInNewContext(bridgeJS,environment);
const lib=environment.MiBowlingCatalog100Bridge;
assert.equal(lib.SEED.length,100);
assert.equal(new Set(lib.SEED.map(x=>x.id)).size,100);
assert.deepEqual(JSON.parse(JSON.stringify(lib.SEED)),
 seed.map(x=>({id:x.id,brand:x.brand,model:x.model,approved:x.approved})),
 'la plantilla publicada es fuente exacta, sin nuevas fichas inventadas');
const storage=new Map();
const source={getItem:key=>storage.get(key)||null};
assert.equal(lib.current(source).origin,'published-seed');
assert.equal(lib.current(source).actualNewest100Proven,false);
assert.equal(lib.current(source).independentlyAuthenticated,false);
let modified=seed.map(x=>({...x}));
modified[0]={...modified[0],id:'usbc-lab-a-model',brand:'LAB Fabricante',model:'Bola sintética A'};
storage.set(lib.STORAGE,JSON.stringify({records:modified,
 meta:{source:'PDF USBC elegido por el usuario',reviewed:true}}));
const local=lib.current(source);
assert.equal(local.origin,'local-template');
assert.equal(local.items[0].brand,'LAB Fabricante');
assert.equal(local.independentlyAuthenticated,false);
assert.equal('cover' in local.items[0],false);
assert.equal('image' in local.items[0],false);
modified[1].id=modified[0].id;
storage.set(lib.STORAGE,JSON.stringify({records:modified}));
assert.equal(lib.current(source).origin,'published-seed','duplicados invalidan snapshot');
storage.set(lib.STORAGE,'NOT_JSON');
assert.equal(lib.current(source).origin,'published-seed','snapshot corrupto no desplaza plantilla');
const selected={schema:lib.SCHEMA,items:[
 {...seed[0],selected:true},{...seed[1],selected:true}
]};
assert.deepEqual(JSON.parse(JSON.stringify(lib.parseSelection(JSON.stringify(selected)))).map(x=>x.id),
 [seed[0].id,seed[1].id],'selección válida sin incorporar datos técnicos');
assert.throws(()=>lib.parseSelection(JSON.stringify({...selected,schema:'otra'})),/selección válida/);
assert.throws(()=>lib.parseSelection(JSON.stringify({...selected,items:[{...seed[0],selected:false}]})),/selección válida/);
assert.throws(()=>lib.parseSelection(JSON.stringify({...selected,items:[{...seed[0],selected:true},{...seed[0],selected:true}]})),/selección válida/);
assert(!bridgeJS.includes('fetch(')&&!bridgeJS.includes('localStorage.setItem('),
 'Bridge readonly, sin redes ni escrituras');
for(const token of [
 "const KEY='mi-bowling-analitica-v2'",
 "const BALL_SELECTION_KEY='mi-bowling-ball-selection-v1'",
 "function recordRoll(","function undoRoll(","function ballsView("])
 assert(app.includes(token),'Contrato original '+token);
assert(index.indexOf('catalogo100-mis-bolas-bridge.js')>
 index.indexOf('official-ball-catalog.js'),'carga después de fuentes actuales');
assert(index.indexOf('catalogo100-mis-bolas-bridge.js')<
 index.indexOf('arsenal-view-lab.js'),'carga antes del render');
assert(sw.includes("const CACHE='mi-bowling-analitica-v3-3-10-catalogo-cp037'"),
 'PWA CP037 publicada intacta: runtime cache solo tras visita online');
assert(view.includes("ctx.mode==='catalog100'")&&
 view.includes("Catálogo de 100 bolas · plantilla"));
assert(app.includes('importCatalog100Selection')&&
 app.includes('catalog100')&&
 !app.includes('db.version=3'),'No migración destructiva');
console.log('PASS BRIDGE100 STATIC · identidad 100/100 con plantilla publicada, fuente local validada, rechazos y contratos PWA/arsenal intactos');
if(!process.argv.includes('--browser'))process.exit(0);

const {chromium,webkit}=require('playwright');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json',
 '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}
 catch{res.writeHead(400).end();return}
 const p=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
 if(!p.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
 fs.readFile(p,(error,data)=>{
  if(error){res.writeHead(404).end();return}
  res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream',
   'Cache-Control':'no-store'});res.end(data);
 });
});
const ball=(i,brand,model,retired=false)=>({
 id:'BOLA-SINTETICA-'+i,brand,model,weight:'15 lb',
 kind:'Reactiva',notes:'Taladro ficticio '+i,photo:'',retired
});
const balls=[
 ball(0,'ABS','PRO-am Elite Performer Solid'), // existing seed record, no duplicate
 ball(1,'Columbia 300','Bully'),
 ball(2,'Brunswick','Ringer Burgundy Pearl'),
 ball(3,'Hammer','Web Tour Edition Hybrid'),
 ball(4,'DV8','Pitbull Bite',true),
 ball(5,'Brunswick','Vintage Phantom'),
 ball(6,'Brunswick','C-System 4.5'),
 ball(7,'Track','Legion Pearl'),
 ball(8,'Columbia 300','Rally'),
 ball(9,'Brunswick','Cutting Edge Solid')
];
const sessions=Array.from({length:12},(_,i)=>({
 id:'SESION-FICTICIA-'+i,type:'entrenamiento',date:'2026-11-01',
 title:'Simulación',games:[{id:'PARTIDA-FICTICIA-'+i,
 rolls:[{frame:1,ball:1,pins:[1,2,3],ballId:balls[i%10].id,
 line:{approach:'20',arrow:'10',breakpoint:'5'},lane:1}]}]
}));
const initial={version:2,hand:'diestro',balls,patterns:[],sessions};
function state(page){return page.evaluate(()=>({
 db:JSON.parse(localStorage.getItem('mi-bowling-analitica-v2')),
 selection:JSON.parse(localStorage.getItem('mi-bowling-ball-selection-v1')||'{}')
}))}
async function open100(page){
 await page.evaluate(()=>go('bolas'));
 await page.getByRole('button',{name:'100 bolas · plantilla'}).click();
 await page.locator('#arsenal-catalog-search').waitFor();
}
async function scenario(engine,viewport,origin){
 const browser=await engine.launch({headless:true});
 const ctx=await browser.newContext({viewport,hasTouch:viewport.width<500,
  isMobile:viewport.width<500,serviceWorkers:'block'});
 const page=await ctx.newPage(),errors=[],dialogs=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>{dialogs.push(d.message());d.accept()});
 try{
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(data=>{
   localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(data));
   localStorage.setItem('mi-bowling-ball-selection-v1',
    JSON.stringify({__next__:['BOLA-SINTETICA-1']}));
  },initial);
  await page.reload({waitUntil:'load'});
  const before=await state(page);
  // migrate() normaliza el esquema de las sesiones ficticias al cargar app.js.
  // Comparar contra el estado operativo previo, no el JSON incompleto de siembra.
  const normalizedSessions=await page.evaluate(()=>JSON.parse(JSON.stringify(db.sessions)));
  await open100(page);
  assert.equal(await page.locator('.arsenal-model[data-search]').count(),100);
  assert.match(await page.locator('#arsenal-catalog-count').textContent(),/100 de 100/);
  assert.match(await page.locator('.arsenal-model').first().textContent(),/Foto real no incluida/);
  assert.equal(await page.locator('.arsenal-model').first().getByRole('button',{name:'Añadir a Mis bolas'}).count(),0,
   'Ya registrada no se duplica');
  await page.locator('#arsenal-catalog-search').fill('Lunar Orbit');
  assert.equal(await page.locator('.arsenal-model:visible').count(),1);
  await page.locator('.arsenal-model:visible').getByRole('button',{name:'Añadir a Mis bolas'}).click();
  const added=await state(page);
  assert.equal(added.db.balls.length,11);
  assert.equal(added.db.balls[10].model,'Lunar Orbit (Under 13 lbs.)');
  for(const k of ['weight','kind','notes','photo'])assert.equal(added.db.balls[10][k],'');
  assert.deepEqual(added.db.balls.slice(0,10),before.db.balls,'10 bolas y taladros ficticios sin tocar');
  assert.deepEqual(added.db.sessions,normalizedSessions,'12 sesiones y lanzamientos intactos');
  assert.deepEqual(added.selection,before.selection,'sin autoseleccionar bolas');
  assert.equal(await page.locator('.arsenal-model:visible button').filter({hasText:'Añadir'}).count(),0,
   'Alta idempotente en el panel');
  const chosen={schema:lib.SCHEMA,items:[
   {...seed[0],selected:true},{...seed[9],selected:true},
   {...seed[16],selected:true}
  ]};
  await page.locator('#catalog100-selection-file').setInputFiles({
   name:'SELECCION-100-LAB.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(chosen))
  });
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mi-bowling-analitica-v2')).balls.length===13);
  const afterBatch=await state(page);
  assert.equal(afterBatch.db.balls.length,13,'2 nuevos + 1 existente');
  assert.deepEqual(afterBatch.db.sessions,normalizedSessions);
  assert.deepEqual(afterBatch.selection,before.selection);
  assert.deepEqual(afterBatch.db.balls.slice(0,10),before.db.balls);
  assert(afterBatch.db.balls.slice(10).every(x=>x.photo===''&&x.weight===''&&x.notes===''));
  assert(dialogs.some(s=>s.includes('Se añadirán 2')),'Confirmación obligatoria');
  await page.reload({waitUntil:'load'});await open100(page);
  await page.locator('#arsenal-catalog-search').fill('Lunar Orbit');
  assert.equal(await page.locator('.arsenal-model:visible button').filter({hasText:'Añadir'}).count(),0,
   'Idempotencia después de recarga');
  // An actual user-updated standalone 100 snapshot is visible only if storage is shared.
  const update=seed.map(x=>({...x}));update[0]={...update[0],
   id:'usbc-modelo-sintetico-99',brand:'Marca LAB',model:'Modelo 99 ficticio'};
  await page.evaluate(snapshot=>localStorage.setItem('mi-bowling-plantilla-100-v1',
   JSON.stringify({records:snapshot,meta:{source:'PDF USBC elegido por el usuario'}})),update);
  await page.evaluate(()=>setArsenalPanel('catalog100'));
  await page.locator('#arsenal-catalog-search').fill('Modelo 99 ficticio');
  assert.equal(await page.locator('.arsenal-model:visible').count(),1,
   'snapshot compartido actualizado, sin importar PDF automáticamente');
  const unchanged=await state(page);assert.deepEqual(unchanged.db.sessions,normalizedSessions);
  await page.evaluate(()=>localStorage.setItem('mi-bowling-plantilla-100-v1','INVALID_JSON'));
  await page.evaluate(()=>setArsenalPanel('catalog100'));
  assert.equal(await page.locator('.arsenal-model').count(),100,'fallback al seed tras corrupción');
  assert(!errors.length,errors.join(' | '));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+3),
   'sin desbordamiento móvil');
  console.log('PASS CAT100 ARSENAL '+(engine===chromium?'chromium':'webkit')+
    ' '+viewport.width+'px · 100 búsqueda, alta, JSON batch, sin duplicados, 12 sesiones, selección y snapshot sin pérdida');
 }finally{await ctx.close();await browser.close()}
}
async function offline(origin){
 const browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844},
  isMobile:true,hasTouch:true,serviceWorkers:'allow'});
 const page=await ctx.newPage();
 try{
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await page.reload({waitUntil:'load'}); // Runtime cache bridge from controlled online load.
  // Do not infer offline support from cache.keys()/caches.match() snapshots.
  // Browser service-worker activation may remove an older cache between reads.
  // The actual OFFLINE reload + functional model search/add below is the gate.
  await ctx.setOffline(true);await page.reload({waitUntil:'load'});
  await open100(page);
  assert.equal(await page.locator('.arsenal-model').count(),100,
   '100 references available offline after initial online visit');
  await page.locator('#arsenal-catalog-search').fill('Lunar Orbit');
  await page.locator('.arsenal-model:visible').getByRole('button',{name:'Añadir a Mis bolas'}).click();
  assert.equal(await page.evaluate(()=>db.balls.some(b=>b.model.includes('Lunar Orbit'))),true);
  console.log('PASS CAT100 ARSENAL chromium PWA offline · CP037 untouched, runtime caching after online load');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port+'/';
 try{await scenario(chromium,{width:390,height:844},origin);
  await scenario(webkit,{width:390,height:844},origin);
  await scenario(chromium,{width:1280,height:900},origin);
  await offline(origin)}
 finally{await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
