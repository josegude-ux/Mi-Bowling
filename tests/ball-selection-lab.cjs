'use strict';
// MI BOWLING · CATÁLOGO Y ARSENAL F1 LAB: datos 100% ficticios.
// Ejecutar con node tests/ball-selection-lab.cjs (requiere playwright 1.56.1).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 const file=path.resolve(root,'.'+(p==='/'?'/index.html':p));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
});
const oldRoll={frame:1,ball:1,pins:[1,2,3,4,5,6,7,8,9,10],ballId:'lab-b',line:{approach:'20',arrow:'15',breakpoint:'8'},lane:1,pair:[1,2],foul:false,createdAt:'2026-01-01T12:00:00Z'};
const fixture={version:2,hand:'diestro',balls:[
 {id:'lab-a',brand:'Marca LAB',model:'Alpha',weight:'15 lb',kind:'Reactiva',notes:'Taladro: texto propio 45 x 4 x 35',photo:'',retired:false},
 {id:'lab-b',brand:'Marca LAB',model:'Beta',weight:'15 lb',kind:'Uretano',notes:'Notas antiguas conservadas',photo:'',retired:false},
 {id:'lab-c',brand:'Marca LAB',model:'Gamma',weight:'14 lb',kind:'Reactiva',notes:'',photo:'',retired:true}
],patterns:[],sessions:[{id:'lab-historica',type:'entrenamiento',date:'2026-01-01',title:'Histórica ficticia',venue:'LAB',notes:'',pattern:'',patternId:'',currentBallId:'lab-b',currentLine:{approach:'20',arrow:'15',breakpoint:'8'},lane:1,games:[{id:'lab-juego',pair:[1,2],startLane:1,includeStats:true,segments:[],rolls:[oldRoll]}]}]};
const getData=page=>page.evaluate(()=>({db:JSON.parse(localStorage.getItem('mi-bowling-analitica-v2')),picks:JSON.parse(localStorage.getItem('mi-bowling-ball-selection-v1')||'{}')}));
async function ensureExtras(page){
 const node=page.locator('details.registry-v4-extra');
 if(!(await node.getAttribute('open')))await node.locator('summary').click();
}
async function run(browser,engine,width,origin){
 const context=await browser.newContext({viewport:{width,height:width<500?844:850},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 try{
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(db=>localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(db)),fixture);
  await page.reload({waitUntil:'load'});
  await page.getByRole('button',{name:'Mis bolas',exact:true}).click();
  assert.equal(await page.locator('.ball-card').count(),3,'Arsenal original completo');
  assert.equal(await page.locator('.ball-session-toggle input').count(),2,'Solo bolas activas seleccionables');
  await page.locator('.ball-card').filter({hasText:'Alpha'}).locator('.ball-session-toggle input').check();
  let data=await getData(page);
  assert.deepEqual(data.db.balls,fixture.balls,'Marcar no cambia la ficha ni crea campos');
  assert.equal(data.db.sessions.length,1,'No crea partidas antes de comenzar');
  assert.deepEqual(data.picks.__next__,['lab-a'],'Selección de próxima sesión');
  await page.getByRole('button',{name:'Nueva',exact:true}).click();
  assert.deepEqual(await page.locator('#s-ball option').allTextContents(),['Sin asignar','Marca LAB Alpha'],'Selector filtrado por check');
  await page.locator('#s-ball').selectOption('lab-a');
  await page.locator('#newSessionForm button[type=submit]').click();
  data=await getData(page);
  assert.equal(data.db.sessions.length,2,'Se crea exactamente una nueva sesión');
  const current=data.db.sessions[1],sid=current.id;
  assert.deepEqual(data.picks[sid],['lab-a'],'Selección asociada al UUID de sesión');
  assert.equal(Object.hasOwn(data.picks,'__next__'),false,'No se hereda a sesiones futuras');
  assert.deepEqual(data.db.sessions[0].games[0].rolls[0].ballId,'lab-b','Historial conserva bola original');
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),['Sin asignar','Marca LAB Alpha'],'Primer lanzamiento filtrado');
  await page.locator('#quick-record').click();
  data=await getData(page);
  assert.equal(data.db.sessions[1].games[0].rolls[0].ballId,'lab-a','Primer tiro conserva id A');
  await ensureExtras(page);
  await page.locator('.registry-v4-extra .textlink').click();
  await page.locator('.ball-card').filter({hasText:'Beta'}).locator('.ball-session-toggle input').check();
  assert.deepEqual((await getData(page)).db.balls,fixture.balls,'Cambiar checks no muta arsenal');
  await page.getByRole('button',{name:/Volver al lanzamiento/}).click();
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),['Sin asignar','Marca LAB Alpha','Marca LAB Beta'],'Permite ampliar selección en curso');
  await page.locator('#roll-ball').selectOption('lab-b');
  await page.locator('#quick-record').click();
  data=await getData(page);
  assert.deepEqual(data.db.sessions[1].games[0].rolls.slice(0,2).map(r=>r.ballId),['lab-a','lab-b'],'Bola independiente por lanzamiento');
  assert.deepEqual(data.db.sessions[0].games[0].rolls[0].ballId,'lab-b','Histórico original intacto');
  assert.equal(data.db.balls[0].notes,fixture.balls[0].notes,'Texto de taladro solo en notes');
  assert.deepEqual(data.db.balls.map(b=>Object.keys(b).sort()),fixture.balls.map(b=>Object.keys(b).sort()),'Cero nuevos campos de bola');
  assert.equal(data.db.version,2,'Esquema existente intacto');
  await page.reload({waitUntil:'load'});
  await page.evaluate(id=>openSession(id),sid);
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),['Sin asignar','Marca LAB Alpha','Marca LAB Beta'],'Selección permanece tras recarga');
  await page.evaluate(()=>openSession('lab-historica'));
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),['Sin asignar','Marca LAB Alpha','Marca LAB Beta'],'Sesión antigua sin check conserva comportamiento');
  await page.evaluate(()=>go('bolas'));
  assert.equal(await page.locator('.ball-session-toggle input:checked').count(),0,'Nueva selección independiente tras sesión');
  const scroll=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert(scroll.scroll<=scroll.client+2,'Sin desbordamiento horizontal');
  assert.deepEqual(errors,[],'Sin errores JS en navegador');
  console.log('OK '+engine+' '+width+'px: checks, sesiones, lanzamientos, recarga, histórico, taladro y responsive');
 }finally{await context.close()}
}
(async()=>{
 const port=await new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
 const origin='http://127.0.0.1:'+port+'/';
 try{
  for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
   const browser=await type.launch({headless:true});
   try{for(const size of [390,1280])await run(browser,name,size,origin)}
   finally{await browser.close()}
  }
 }finally{await new Promise(resolve=>server.close(resolve))}
})().catch(err=>{console.error(err);process.exitCode=1});
