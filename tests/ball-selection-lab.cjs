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
 if((await node.getAttribute('open'))===null)await node.locator('summary').click();
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
  await page.locator('#s-venue').fill('Bolera LAB de prueba');
  await page.locator('#s-title').fill('Sesión que no debe perderse');
  await page.locator('#s-notes').fill('Condiciones ficticias a conservar');
  await page.locator('select[name="goalKind"]').selectOption('strike');
  await page.locator('input[name="goalTarget"]').fill('72');
  await page.locator('#lane-pair').fill('5');
  await page.locator('#lane-start').selectOption('6');
  await page.locator('#s-ball').selectOption('lab-a');
  await page.getByRole('button',{name:/Elegir bolas para esta sesión/}).click();
  assert.equal(await page.locator('.ball-session-toggle input:checked').count(),1,'Selection visible during draft');
  await page.getByRole('button',{name:/Volver a empezar partida/}).click();
  assert.equal(await page.locator('#s-venue').inputValue(),'Bolera LAB de prueba','Conserva bolera al volver');
  assert.equal(await page.locator('#s-title').inputValue(),'Sesión que no debe perderse','Conserva título al volver');
  assert.equal(await page.locator('#s-notes').inputValue(),'Condiciones ficticias a conservar','Conserva notas al volver');
  assert.equal(await page.locator('#lane-pair').inputValue(),'5','Conserva par de pistas al volver');
  assert.equal(await page.locator('#lane-start').inputValue(),'6','Conserva pista inicial al volver');
  assert.equal(await page.locator('select[name="goalKind"]').inputValue(),'strike','Conserva objetivo al volver');
  assert.equal(await page.locator('input[name="goalTarget"]').inputValue(),'72','Conserva meta al volver');
  assert.equal(await page.locator('#s-ball').inputValue(),'lab-a','Conserva bola inicial seleccionada');
  await page.locator('#newSessionForm button[type=submit]').click();
  data=await getData(page);
  assert.equal(data.db.sessions.length,2,'Se crea exactamente una nueva sesión');
  const current=data.db.sessions[1],sid=current.id;
  assert.equal(current.venue,'Bolera LAB de prueba','La sesión guarda la bolera original');
  assert.equal(current.title,'Sesión que no debe perderse','La sesión guarda el título');
  assert.equal(current.notes,'Condiciones ficticias a conservar','La sesión guarda las notas');
  assert.deepEqual(current.goal,{kind:'strike',target:72},'La sesión guarda el objetivo');
  assert.deepEqual(current.games[0].pair,[5,6],'La sesión guarda el par de pistas');
  assert.equal(current.games[0].startLane,6,'La sesión guarda la pista de salida');
  assert.equal(current.currentBallId,'lab-a','Bola inicial correcta');
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
  await ensureExtras(page);
  await page.locator('.registry-v4-extra .textlink').click();
  await page.locator('.ball-card').filter({hasText:'Beta'}).locator('.ball-session-toggle input').uncheck();
  await page.getByRole('button',{name:/Volver al lanzamiento/}).click();
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),['Sin asignar','Marca LAB Alpha'],'Desmarcar retira la bola del selector, sin borrar lanzamientos');
  assert.deepEqual((await getData(page)).db.sessions[1].games[0].rolls.slice(0,2).map(r=>r.ballId),['lab-a','lab-b'],'Bolas usadas históricamente inmutables');
  await page.locator('.registry-v4-extra .textlink').click();
  await page.locator('.ball-card').filter({hasText:'Beta'}).locator('.ball-session-toggle input').check();
  await page.getByRole('button',{name:/Volver al lanzamiento/}).click();
  await page.reload({waitUntil:'load'});
  await page.evaluate(id=>openSession(id),sid);
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),['Sin asignar','Marca LAB Alpha','Marca LAB Beta'],'Selección permanece tras recarga');
  await page.evaluate(()=>openSession('lab-historica'));
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),['Sin asignar','Marca LAB Alpha','Marca LAB Beta'],'Sesión antigua sin check conserva comportamiento');
  await page.evaluate(()=>go('bolas'));
  assert.equal(await page.locator('.ball-session-toggle input:checked').count(),0,'Nueva selección independiente tras sesión');
  await page.locator('.ball-card').filter({hasText:'Alpha'}).locator('.ball-session-toggle input').check();
  let beforeRetire=await getData(page);
  assert.deepEqual(beforeRetire.picks.__next__,['lab-a'],'Alpha se marca para la siguiente sesión');
  assert.deepEqual(beforeRetire.picks[sid],['lab-a','lab-b'],'La sesión anterior conserva ambas seleccionadas');
  await page.locator('.ball-card').filter({hasText:'Alpha'}).getByRole('button',{name:'Retirar'}).click();
  data=await getData(page);
  assert.equal(data.db.balls.find(b=>b.id==='lab-a').retired,true,'La ficha se marca como retirada');
  assert.deepEqual(data.picks.__next__,[],'Retirar elimina bola de la siguiente selección');
  assert.deepEqual(data.picks[sid],['lab-b'],'Retirar elimina bola de otras sesiones seleccionadas');
  assert.deepEqual(data.db.sessions[1].games[0].rolls.slice(0,2).map(r=>r.ballId),['lab-a','lab-b'],'Retirar no borra lanzamientos con bola antigua');
  assert.equal(data.db.sessions[0].games[0].rolls[0].ballId,'lab-b','La sesión antigua sigue intacta');
  await page.locator('.ball-card').filter({hasText:'Alpha'}).getByRole('button',{name:'Activar'}).click();
  data=await getData(page);
  assert.deepEqual(data.db.balls,fixture.balls,'Reactivar recupera ficha completa sin campos nuevos');
  assert.deepEqual(data.picks.__next__,[],'Reactivar no vuelve a marcar bola automáticamente');
  assert.deepEqual(data.picks[sid],['lab-b'],'Reactivar no restaura una selección que fue retirada');
  assert.equal(await page.locator('.ball-session-toggle input:checked').count(),0,'Bola reactivada exige nuevo check explícito');
  await page.evaluate(()=>{
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){
    if(key==='mi-bowling-ball-selection-v1')throw new DOMException('Quota simulada','QuotaExceededError');
    return original.call(this,key,value);
   };
  });
  await page.locator('.ball-card').filter({hasText:'Alpha'}).locator('.ball-session-toggle input').check();
  assert.deepEqual(await page.evaluate(()=>selectedBallsFor('__next__')),['lab-a'],'Fallo de cuota: selección operativa en memoria');
  assert.deepEqual((await getData(page)).db.balls,fixture.balls,'Fallo de cuota no cambia arsenal');
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
