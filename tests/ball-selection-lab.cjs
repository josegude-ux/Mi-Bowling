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

async function officialScenario(browser,engine,origin){
 const context=await browser.newContext({
  viewport:{width:430,height:932},isMobile:true,hasTouch:true,deviceScaleFactor:3,serviceWorkers:'block'
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  const sample=JSON.parse(JSON.stringify(fixture));
  sample.patterns.push({id:'patron-lab',name:'Aceite ficticio LAB',length:'42',maker:'LAB',ratio:'',volume:'',notes:'',pdfName:'',createdAt:'2026-01-01'});
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(db=>localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(db)),sample);
  await page.reload({waitUntil:'load'});
  await page.getByRole('button',{name:'Nueva',exact:true}).click();
  await page.locator('#s-type').selectOption('oficial');
  await page.locator('#s-date').fill('2026-11-21');
  await page.locator('#s-venue').fill('Bolera oficial sintética');
  await page.locator('#s-title').fill('Competición ficticia');
  await page.locator('#s-notes').fill('Mantener anotaciones oficiales');
  await page.locator('#s-patternId').selectOption('patron-lab');
  await page.locator('#lane-pair').fill('7');
  await page.locator('#lane-start').selectOption('8');
  await page.locator('#s-ball').selectOption('lab-b');
  await page.getByRole('button',{name:/Elegir bolas para esta sesión/}).click();
  await page.locator('.ball-card').filter({hasText:'Beta'}).locator('.ball-session-toggle input').check();
  await page.getByRole('button',{name:/Volver a empezar partida/}).click();
  assert.equal(await page.locator('#s-type').inputValue(),'oficial','Modalidad oficial preservada');
  assert.equal(await page.locator('#s-date').inputValue(),'2026-11-21','Fecha preservada');
  assert.equal(await page.locator('#s-venue').inputValue(),'Bolera oficial sintética','Bolera preservada');
  assert.equal(await page.locator('#s-patternId').inputValue(),'patron-lab','Patrón preservado');
  assert.equal(await page.locator('#lane-pair').inputValue(),'7','Par preservado');
  assert.equal(await page.locator('#lane-start').inputValue(),'8','Pista preservada');
  assert.equal(await page.locator('#s-ball').inputValue(),'lab-b','Bola inicial preservada');
  await page.locator('#newSessionForm button[type=submit]').click();
  let data=await getData(page),s=data.db.sessions.at(-1);
  assert.equal(data.db.sessions.length,2,'Solo una nueva sesión oficial');
  assert.equal(s.type,'oficial','Tipo de competición correcto');
  assert.equal(s.patternId,'patron-lab','Patrón correcto');
  assert.equal(s.pattern,'Aceite ficticio LAB','Nombre del patrón correcto');
  assert.deepEqual(s.games[0].pair,[7,8],'Par correcto');
  assert.equal(s.games[0].startLane,8,'Pista de salida correcta');
  assert.equal(s.currentBallId,'lab-b','Bola inicial oficial correcta');
  assert.deepEqual(data.picks[s.id],['lab-b'],'Filtro de sesión oficial correcto');
  await page.evaluate(()=>togglePin(1));
  assert.deepEqual(await page.evaluate(()=>selection),[1],'Bolo señalado antes del cambio de selección');
  await ensureExtras(page);
  await page.locator('.registry-v4-extra .textlink').click();
  await page.getByRole('button',{name:/Volver al lanzamiento/}).click();
  assert.deepEqual(await page.evaluate(()=>selection),[1],'Bolos en pie no se pierden al elegir bolas');
  await page.locator('#quick-record').click();
  data=await getData(page);
  const roll=data.db.sessions.at(-1).games[0].rolls[0];
  assert.equal(roll.pins.length,9,'Se registran nueve bolos derribados');
  assert.equal(roll.ballId,'lab-b','Lanzamiento mantiene la bola seleccionada');
  // Una misma sesión puede contener varias partidas; la selección debe pertenecer a
  // la sesión, no a la primera partida ni al estado visual anterior.
  for(let i=0;i<12;i++)await page.getByRole('button',{name:'Todos derribados'}).click();
  assert.equal(await page.getByText('Partida terminada').count(),1,'Partida ficticia terminada');
  await page.getByRole('button',{name:/Siguiente partida/}).click();
  await page.getByRole('button',{name:/Empezar siguiente partida/}).click();
  data=await getData(page);
  assert.equal(data.db.sessions.at(-1).games.length,2,'Segunda partida dentro de la misma sesión');
  assert.deepEqual(data.picks[s.id],['lab-b'],'Filtro permanece asociado a la sesión');
  assert.equal(data.db.sessions.at(-1).games[0].rolls[0].ballId,'lab-b','Primer juego mantiene bola histórica');
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),['Sin asignar','Marca LAB Beta'],'Nuevo juego hereda filtro de sesión');
  await page.locator('.registry-v4-extra .textlink').click();
  await page.locator('.ball-card').filter({hasText:'Beta'}).locator('.ball-session-toggle input').uncheck();
  await page.getByRole('button',{name:/Volver al lanzamiento/}).click();
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),['Sin asignar'],'Lista vacía permite continuar sin bola');
  await page.locator('#quick-record').click();
  data=await getData(page);
  assert.equal(data.db.sessions.at(-1).games[1].rolls[0].ballId,'','Tiro con lista vacía se registra sin bola');
  assert.equal(data.db.sessions.at(-1).games[0].rolls[0].ballId,'lab-b','Desmarcar no reescribe primer juego');
  assert.deepEqual(data.picks[s.id],[],'Selección vacía se mantiene por sesión');
  assert.deepEqual(data.db.balls,fixture.balls,'Competiciones no modifican fichas del arsenal');
  assert.deepEqual(errors,[],'Ningún error JS en WebKit/Chromium móvil');
  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
  assert(overflow.scroll<=overflow.width+2,'Sin desplazamiento horizontal en 430px');
  console.log('OK '+engine+' iPhone 430x932: competición, patrón, borrador y bolos preservados');
 }finally{await context.close()}
}

async function deletionAndMalformedSelectionScenario(browser,engine,origin){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 let allowDelete=false;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>allowDelete?d.accept():d.dismiss());
 try{
  const sample=JSON.parse(JSON.stringify(fixture));
  const disposable=JSON.parse(JSON.stringify(sample.sessions[0]));
  disposable.id='lab-descartable';disposable.title='Borrar solo ficha ficticia';
  disposable.games[0].id='lab-juego-descartable';
  sample.sessions.push(disposable);
  const selections={
   'lab-historica':['lab-b'],'lab-descartable':['lab-a'],'__next__':['lab-b']
  };
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(({db,picks})=>{
   localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(db));
   localStorage.setItem('mi-bowling-ball-selection-v1',JSON.stringify(picks));
  },{db:sample,picks:selections});
  await page.reload({waitUntil:'load'});
  const initial=await getData(page);
  const normalized=await page.evaluate(db=>migrate(db),initial.db);
  assert.deepEqual(initial.picks,selections,'Selecciones preparadas para dos sesiones ficticias');
  await page.evaluate(()=>deleteSession('lab-descartable'));
  let data=await getData(page);
  assert.equal(data.db.sessions.length,2,'Cancelar el borrado conserva la sesión');
  assert.deepEqual(data.picks,selections,'Cancelar no altera ninguna selección temporal');
  allowDelete=true;
  await page.evaluate(()=>deleteSession('lab-descartable'));
  data=await getData(page);
  assert.equal(data.db.sessions.length,1,'Solo se elimina la sesión ficticia confirmada');
  assert.deepEqual(data.db.sessions[0],normalized.sessions[0],'Otra sesión y sus tiros no se alteran tras migración normal');
  assert.deepEqual(data.db.balls,fixture.balls,'Borrar una sesión no modifica el arsenal');
  assert.equal(Object.hasOwn(data.picks,'lab-descartable'),false,'No quedan selecciones de sesión borrada');
  assert.deepEqual(data.picks['lab-historica'],['lab-b'],'Selección de la otra sesión preservada');
  assert.deepEqual(data.picks.__next__,['lab-b'],'Próxima sesión preservada');
  // Selecciones no son datos de las partidas: si se corrompen, no deben impedir abrir la PWA.
  await page.evaluate(()=>localStorage.setItem('mi-bowling-ball-selection-v1','{invalid json'));
  await page.reload({waitUntil:'load'});
  assert.equal(await page.evaluate(()=>selectedBallsFor('__next__')),null,'Selección malformada se ignora');
  await page.getByRole('button',{name:'Mis bolas',exact:true}).click();
  assert.equal(await page.locator('.ball-session-toggle input:checked').count(),0,'JSON dañado no marca bolas');
  await page.evaluate(()=>localStorage.setItem('mi-bowling-ball-selection-v1',
   JSON.stringify({__next__:['lab-b','lab-b','lab-c','lab-inexistente',42]})));
  await page.reload({waitUntil:'load'});
  assert.deepEqual(await page.evaluate(()=>selectedBallsFor('__next__')),['lab-b'],
   'Se ignoran duplicados, retiradas, inexistentes y IDs no válidos');
  const stable=await getData(page);
  assert.deepEqual(stable.db.sessions,normalized.sessions.slice(0,1),'Historial deportivo intacto tras sidecar inválido');
  assert.deepEqual(stable.db.balls,normalized.balls,'Bolas intactas tras sidecar inválido');
  assert.deepEqual(errors,[],'Sin errores JS durante borrado y recuperación de selección');
  console.log('OK '+engine+' 390px: cancelación/borrado de sesión, sidecar limpio y recuperación de selección corrupta');
 }finally{await context.close()}
}

async function independentSessionsScenario(browser,engine,origin){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const sample=JSON.parse(JSON.stringify(fixture));
  const second=JSON.parse(JSON.stringify(sample.sessions[0]));
  second.id='lab-otra-sesion';second.title='Segunda sesión ficticia';second.games[0].id='lab-otra-partida';
  second.games[0].rolls=[];second.currentBallId='lab-b';
  sample.sessions.push(second);
  const scopes={'lab-historica':['lab-a'],'lab-otra-sesion':['lab-b'],'__next__':['lab-a']};
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(({db,picks})=>{
   localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(db));
   localStorage.setItem('mi-bowling-ball-selection-v1',JSON.stringify(picks));
  },{db:sample,picks:scopes});
  await page.reload({waitUntil:'load'});
  await page.evaluate(()=>openSession('lab-historica'));
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),
   ['Sin asignar','Marca LAB Alpha'],'La sesión A muestra solo Alpha');
  assert.equal(await page.locator('#roll-ball').inputValue(),'','Una bola anterior fuera de selección no se adjudica por error');
  await page.locator('#quick-record').click();
  let data=await getData(page);
  assert.equal(data.db.sessions[0].games[0].rolls[0].ballId,'lab-b','Tiro histórico de A inalterado');
  assert.equal(data.db.sessions[0].games[0].rolls[1].ballId,'','Nueva tirada de A sin bola excluida');
  await ensureExtras(page);
  await page.locator('.registry-v4-extra .textlink').click();
  assert.equal(await page.locator('.ball-card').filter({hasText:'Alpha'}).locator('input[type=checkbox]').isChecked(),true);
  assert.equal(await page.locator('.ball-card').filter({hasText:'Beta'}).locator('input[type=checkbox]').isChecked(),false);
  await page.locator('.ball-card').filter({hasText:'Beta'}).locator('input[type=checkbox]').check();
  await page.getByRole('button',{name:/Volver al lanzamiento/}).click();
  data=await getData(page);
  assert.deepEqual(data.picks['lab-historica'],['lab-a','lab-b'],'A amplía solo su filtro');
  assert.deepEqual(data.picks['lab-otra-sesion'],['lab-b'],'B preserva filtro anterior');
  assert.deepEqual(data.picks.__next__,['lab-a'],'Próxima sesión independiente');
  await page.evaluate(()=>openSession('lab-otra-sesion'));
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),
   ['Sin asignar','Marca LAB Beta'],'B solo muestra Beta, no hereda Alpha de A');
  assert.equal(await page.locator('#roll-ball').inputValue(),'lab-b','B conserva su bola inicial');
  await page.locator('#quick-record').click();
  data=await getData(page);
  assert.equal(data.db.sessions[1].games[0].rolls[0].ballId,'lab-b','Tirada de B usa Beta');
  assert.equal(data.db.sessions[0].games[0].rolls[0].ballId,'lab-b','Tirada histórica A sigue intacta');
  await ensureExtras(page);
  await page.locator('.registry-v4-extra .textlink').click();
  await page.locator('.ball-card').filter({hasText:'Beta'}).locator('input[type=checkbox]').uncheck();
  await page.getByRole('button',{name:/Volver al lanzamiento/}).click();
  data=await getData(page);
  assert.deepEqual(data.picks['lab-otra-sesion'],[],'B queda con selección vacía independiente');
  assert.deepEqual(data.picks['lab-historica'],['lab-a','lab-b'],'B no altera selección A');
  assert.deepEqual(data.picks.__next__,['lab-a'],'Ninguna sesión altera próximo juego');
  await page.reload({waitUntil:'load'});
  await page.evaluate(()=>openSession('lab-historica'));
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),
   ['Sin asignar','Marca LAB Alpha','Marca LAB Beta'],'A mantiene sus dos opciones tras recarga');
  await page.evaluate(()=>openSession('lab-otra-sesion'));
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),
   ['Sin asignar'],'B mantiene selección vacía tras recarga');
  assert.deepEqual(errors,[],'Sin errores JS en el cambio entre sesiones');
  console.log('OK '+engine+' 390px: dos sesiones independientes, bola excluida sin adjudicar, registros y recarga');
 }finally{await context.close()}
}

async function parallelTabsSelectionScenario(browser,engine,origin){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const first=await context.newPage(),second=await context.newPage(),errors=[];
 first.on('pageerror',e=>errors.push('A: '+e.message));
 second.on('pageerror',e=>errors.push('B: '+e.message));
 try{
  await first.goto(origin,{waitUntil:'load'});
  await first.evaluate(db=>{
   localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(db));
   localStorage.removeItem('mi-bowling-ball-selection-v1');
  },fixture);
  await second.goto(origin,{waitUntil:'load'});
  await first.reload({waitUntil:'load'});
  await first.getByRole('button',{name:'Mis bolas',exact:true}).click();
  await second.getByRole('button',{name:'Mis bolas',exact:true}).click();
  await first.locator('.ball-card').filter({hasText:'Alpha'}).locator('.ball-session-toggle input').check();
  assert.deepEqual((await getData(first)).picks.__next__,['lab-a'],'Pestaña A selecciona Alpha');
  await second.locator('.ball-card').filter({hasText:'Beta'}).locator('.ball-session-toggle input').check();
  let data=await getData(second);
  assert.deepEqual(data.picks.__next__,['lab-a','lab-b'],
   'Pestaña B debe conservar la selección Alpha que añadió A y añadir Beta');
  assert.deepEqual(data.db.balls,fixture.balls,'Dos pestañas no alteran fichas de bola');
  assert.equal(data.db.sessions.length,1,'Dos pestañas no crean sesiones ficticias');
  await first.reload({waitUntil:'load'});
  await first.getByRole('button',{name:'Mis bolas',exact:true}).click();
  assert.equal(await first.locator('.ball-session-toggle input:checked').count(),2,'Ambas marcas persisten tras recargar A');
  await first.locator('.ball-card').filter({hasText:'Alpha'}).locator('.ball-session-toggle input').uncheck();
  data=await getData(first);
  assert.deepEqual(data.picks.__next__,['lab-b'],'Desmarcar Alpha no borra Beta de la otra pestaña');
  await second.reload({waitUntil:'load'});
  await second.getByRole('button',{name:'Mis bolas',exact:true}).click();
  assert.equal(await second.locator('.ball-card').filter({hasText:'Beta'}).locator('.ball-session-toggle input').isChecked(),true,
   'La selección final Beta queda disponible en la segunda pestaña');
  // La pestaña A conserva el formulario sin re-render mientras B cambia el check.
  // Al crear sesión debe prevalecer el conjunto vigente, no una opción obsoleta.
  await first.locator('.ball-card').filter({hasText:'Alpha'}).locator('.ball-session-toggle input').check();
  await first.getByRole('button',{name:'Nueva',exact:true}).click();
  await first.locator('#s-ball').selectOption('lab-a');
  await first.locator('#s-venue').fill('Bolera LAB entre pestañas');
  await first.locator('#s-title').fill('Sesión ficticia con selección cambiada');
  await second.waitForFunction(()=>{
   const card=[...document.querySelectorAll('.ball-card')].find(el=>el.textContent.includes('Alpha'));
   return card?.querySelector('.ball-session-toggle input')?.checked===true;
  },null,{timeout:10000});
  await second.locator('.ball-card').filter({hasText:'Alpha'}).locator('.ball-session-toggle input').uncheck();
  assert.equal(await first.locator('#s-ball').inputValue(),'lab-a','Borrador de A no se pierde ni re-renderiza');
  assert.deepEqual((await getData(first)).picks.__next__,['lab-b'],'El check de B ha retirado Alpha');
  await first.locator('#newSessionForm button[type=submit]').click();
  data=await getData(first);
  const current=data.db.sessions.at(-1);
  assert.equal(current.venue,'Bolera LAB entre pestañas','Borrador de bolera preservado');
  assert.equal(current.title,'Sesión ficticia con selección cambiada','Título preservado');
  assert.deepEqual(data.picks[current.id],['lab-b'],'La sesión hereda selección vigente sin Alpha');
  assert.equal(current.currentBallId,'','No guarda bola excluida de la selección en otra pestaña');
  assert.equal(data.db.sessions[0].games[0].rolls[0].ballId,'lab-b','Historial original sin cambios');
  assert.deepEqual(data.db.balls,fixture.balls,'Las fichas del arsenal no se modifican');
  assert.deepEqual(errors,[],'Sin errores JavaScript en dos pestañas');
  console.log('OK '+engine+' 390px: dos pestañas conservan selecciones del mismo arsenal y evitan sobreescritura');
 }finally{await context.close()}
}

async function concurrentRollDeselectionScenario(browser,engine,origin){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const first=await context.newPage(),second=await context.newPage(),errors=[];
 first.on('pageerror',e=>errors.push('A: '+e.message));
 second.on('pageerror',e=>errors.push('B: '+e.message));
 try{
  const data=JSON.parse(JSON.stringify(fixture));
  await first.goto(origin,{waitUntil:'load'});
  await first.evaluate(db=>{
   localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(db));
   localStorage.setItem('mi-bowling-ball-selection-v1',JSON.stringify({'lab-historica':['lab-b']}));
  },data);
  await second.goto(origin,{waitUntil:'load'});
  await first.reload({waitUntil:'load'});
  await first.evaluate(()=>openSession('lab-historica'));
  await second.evaluate(()=>openSession('lab-historica'));
  await ensureExtras(first);
  await ensureExtras(second);
  assert.equal(await first.locator('#roll-ball').inputValue(),'lab-b','Bola Beta activa en registro de A');
  await first.evaluate(()=>togglePin(1));
  assert.deepEqual(await first.evaluate(()=>selection),[1],'Bolo 1 señalado sin registrar');
  await second.locator('.registry-v4-extra .textlink').click();
  await second.locator('.ball-card').filter({hasText:'Beta'}).locator('.ball-session-toggle input').uncheck();
  assert.deepEqual((await getData(second)).picks['lab-historica'],[],'B deja selección vacía');
  assert.equal(await first.locator('#roll-ball').inputValue(),'lab-b','Selector A abierto mantiene valor anterior sin perder bolos');
  assert.deepEqual(await first.evaluate(()=>selection),[1],'Tirada A conserva selección física de bolos');
  await first.locator('#quick-record').click();
  let snapshot=await getData(first);
  assert.deepEqual(snapshot.db.sessions[0].games[0].rolls.map(r=>r.ballId),['lab-b',''],
   'El lanzamiento nuevo nunca se adjudica a la bola desmarcada en B');
  assert.deepEqual(snapshot.db.sessions[0].games[0].rolls[1].pins,[2,3,4,5,6,7,8,9,10],
   'Registrar tras cambio conserva los bolos derribados');
  assert.equal(snapshot.db.sessions[0].currentBallId,'','La bola excluida deja de ser bola actual');
  assert.deepEqual(snapshot.db.balls,fixture.balls,'Fichas de bolas originales conservadas');
  assert.deepEqual(errors,[],'Sin errores JS entre dos pestañas con registro abierto');
  console.log('OK '+engine+' 390px: desmarcar bola desde otra pestaña no contamina lanzamiento abierto');
 }finally{await context.close()}
}

async function rewindUndoWithDeselectedBallScenario(browser,engine,origin){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 let confirmAction=false;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>confirmAction?d.accept():d.dismiss());
 try{
  const sample=JSON.parse(JSON.stringify(fixture));
  const secondRoll={...sample.sessions[0].games[0].rolls[0],frame:2,ball:1,createdAt:'2026-01-01T12:01:00Z'};
  sample.sessions[0].games[0].rolls.push(secondRoll);
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(db=>{
   localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(db));
   localStorage.setItem('mi-bowling-ball-selection-v1',JSON.stringify({'lab-historica':['lab-b']}));
  },sample);
  await page.reload({waitUntil:'load'});
  await page.evaluate(()=>openSession('lab-historica'));
  await ensureExtras(page);
  assert.equal(await page.locator('#roll-ball').inputValue(),'lab-b','Beta asignada antes de corregir');
  await page.locator('.registry-v4-extra .textlink').click();
  await page.locator('.ball-card').filter({hasText:'Beta'}).locator('.ball-session-toggle input').uncheck();
  await page.getByRole('button',{name:/Volver al lanzamiento/}).click();
  await ensureExtras(page);
  let before=await getData(page);
  assert.deepEqual(before.picks['lab-historica'],[],'Bola retirada explícitamente de la selección');
  assert.equal(await page.locator('#roll-ball').inputValue(),'','Bola histórica no aparece como seleccionable');
  await page.evaluate(()=>rewindRoll(1));
  let data=await getData(page);
  assert.deepEqual(data.db.sessions[0].games[0].rolls,before.db.sessions[0].games[0].rolls,
   'Cancelar corrección no modifica los tiros ficticios');
  confirmAction=true;
  await page.evaluate(()=>rewindRoll(1));
  data=await getData(page);
  assert.equal(data.db.sessions[0].games[0].rolls.length,1,'Corregir segunda tirada deja la primera');
  assert.equal(data.db.sessions[0].games[0].rolls[0].ballId,'lab-b','Primera bola histórica preservada');
  assert.equal(data.db.sessions[0].currentBallId,'','Corregir no reactiva la bola excluida como bola actual');
  await ensureExtras(page);
  assert.deepEqual(await page.locator('#roll-ball option').allTextContents(),['Sin asignar'],
   'Selector de corrección sigue sin bolas elegidas');
  await page.locator('#quick-record').click();
  data=await getData(page);
  assert.deepEqual(data.db.sessions[0].games[0].rolls.map(r=>r.ballId),['lab-b',''],
   'La corrección registra el nuevo tiro sin reasignar bola excluida');
  assert.deepEqual(data.picks['lab-historica'],[],'La corrección no reescribe el filtro');
  confirmAction=false;
  await page.evaluate(()=>undoRoll());
  assert.equal((await getData(page)).db.sessions[0].games[0].rolls.length,2,'Cancelar deshacer conserva tiros');
  confirmAction=true;
  await page.evaluate(()=>undoRoll());
  assert.deepEqual((await getData(page)).db.sessions[0].games[0].rolls.map(r=>r.ballId),['lab-b'],
   'Deshacer solo elimina el tiro más reciente');
  await ensureExtras(page);
  await page.locator('#quick-record').click();
  data=await getData(page);
  assert.deepEqual(data.db.sessions[0].games[0].rolls.map(r=>r.ballId),['lab-b',''],
   'Repetir tras deshacer no reintroduce Beta');
  assert.deepEqual(data.db.balls,fixture.balls,'Bolas y taladros no se modifican');
  await page.reload({waitUntil:'load'});
  await page.evaluate(()=>openSession('lab-historica'));
  assert.deepEqual((await getData(page)).db.sessions[0].games[0].rolls.map(r=>r.ballId),['lab-b',''],
   'Corrección y resultado se conservan tras recargar');
  assert.deepEqual(errors,[],'Sin errores JS tras corregir/deshacer');
  console.log('OK '+engine+' 390px: cancelar, corregir y deshacer no reactivan bola desmarcada ni alteran historial');
 }finally{await context.close()}
}

async function crossTabRestoreClearsSelectionsScenario(browser,engine,origin){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const first=await context.newPage(),second=await context.newPage(),errors=[];
 let acceptRestore=false;
 first.on('dialog',dialog=>acceptRestore?dialog.accept():dialog.dismiss());
 first.on('pageerror',error=>errors.push('A: '+error.message));
 second.on('pageerror',error=>errors.push('B: '+error.message));
 try{
  const before=JSON.parse(JSON.stringify(fixture));
  const extra=JSON.parse(JSON.stringify(before.sessions[0]));
  extra.id='lab-antes-de-importar';extra.title='Sesión para eliminar en LAB';
  before.sessions.push(extra);
  const scopes={__next__:['lab-a'],'lab-historica':['lab-b'],'lab-antes-de-importar':['lab-a']};
  await first.goto(origin,{waitUntil:'load'});
  await first.evaluate(({data,picks})=>{
   localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(data));
   localStorage.setItem('mi-bowling-ball-selection-v1',JSON.stringify(picks));
  },{data:before,picks:scopes});
  await second.goto(origin,{waitUntil:'load'});
  await first.reload({waitUntil:'load'});
  await second.getByRole('button',{name:'Mis bolas',exact:true}).click();
  assert.equal(await second.locator('.ball-card').filter({hasText:'Alpha'}).locator('.ball-session-toggle input').isChecked(),true,
   'Pestaña B muestra selección Alpha antes de restauración');
  // Una restauración cancelada no debe alterar selecciones en ninguna pestaña.
  const restoration={name:'copia-sintetica-lab.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))};
  await first.locator('#restore-file').setInputFiles(restoration);
  assert.deepEqual((await getData(first)).picks,scopes,'Cancelar importación deja las selecciones originales');
  assert.equal((await getData(first)).db.sessions.length,2,'Cancelar importación deja ambas sesiones');
  assert.equal(await second.locator('.ball-card').filter({hasText:'Alpha'}).locator('.ball-session-toggle input').isChecked(),true,
   'Cancelar importación no cambia los checks de B');
  // Restauración autorizada sobre datos ficticios; sidecar queda vacío en ambas pestañas.
  acceptRestore=true;
  await first.locator('#restore-file').setInputFiles(restoration);
  await first.waitForFunction(()=>JSON.parse(localStorage.getItem('mi-bowling-analitica-v2')||'{}').sessions?.length===1);
  await second.waitForFunction(()=>{
   const alpha=[...document.querySelectorAll('.ball-card')].find(el=>el.textContent.includes('Alpha'));
   return alpha?.querySelector('.ball-session-toggle input')?.checked===false;
  });
  let current=await getData(second);
  assert.deepEqual(current.picks,{},'Restauración elimina las selecciones de la instalación anterior');
  assert.equal(await second.locator('.ball-session-toggle input:checked').count(),0,'B quita marcas previas sin recarga');
  await second.locator('.ball-card').filter({hasText:'Beta'}).locator('.ball-session-toggle input').check();
  current=await getData(second);
  assert.deepEqual(current.picks,{__next__:['lab-b']},'Nueva selección B no resucita ninguna selección antigua');
  const a=await getData(first);
  assert.equal(a.db.sessions.length,1,'Solo queda la sesión de la copia restaurada');
  assert.equal(a.db.sessions[0].games[0].rolls[0].ballId,'lab-b','Copia restaura bola de tiro histórico');
  assert.deepEqual(a.db.balls,fixture.balls,'Restauración no altera atributos de bolas');
  await first.getByRole('button',{name:'Mis bolas',exact:true}).click();
  assert.equal(await first.locator('.ball-card').filter({hasText:'Beta'}).locator('.ball-session-toggle input').isChecked(),true,
   'A ve la nueva elección Beta desde la otra pestaña');
  assert.equal(await first.locator('.ball-card').filter({hasText:'Alpha'}).locator('.ball-session-toggle input').isChecked(),false,
   'A no conserva el antiguo check Alpha');
  assert.deepEqual(errors,[],'Sin errores JS tras restaurar con otra pestaña abierta');
  console.log('OK '+engine+' 390px: cancelar/restaurar JSON con otra pestaña borra selecciones antiguas y conserva historial');
 }finally{await context.close()}
}

// CP-033: una pestaña con catálogo obsoleto no puede reactivar por un check
// la selección temporal de una bola retirada desde otra pestaña.
async function crossTabRetirementStalePickerScenario(browser,engine,origin){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const first=await context.newPage(),second=await context.newPage(),errors=[];
 first.on('pageerror',e=>errors.push('A: '+e.message));
 second.on('pageerror',e=>errors.push('B: '+e.message));
 try{
  await first.goto(origin,{waitUntil:'load'});
  await first.evaluate(data=>{
   localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(data));
   localStorage.removeItem('mi-bowling-ball-selection-v1');
  },fixture);
  await second.goto(origin,{waitUntil:'load'});
  await first.reload({waitUntil:'load'});
  await first.getByRole('button',{name:'Mis bolas',exact:true}).click();
  await second.getByRole('button',{name:'Mis bolas',exact:true}).click();
  const alpha=page=>page.locator('.ball-card').filter({hasText:'Alpha'});
  await first.locator('.ball-card').filter({hasText:'Alpha'}).locator('.ball-session-toggle input').check();
  await second.waitForFunction(()=>[...document.querySelectorAll('.ball-card')].some(el=>el.textContent.includes('Alpha')&&el.querySelector('.ball-session-toggle input')?.checked),null,{timeout:10000});
  assert.deepEqual((await getData(second)).picks.__next__,['lab-a'],'Alpha marcada antes de retirarla');
  await alpha(second).getByRole('button',{name:'Retirar'}).click();
  let snapshot=await getData(second);
  assert.equal(snapshot.db.balls.find(b=>b.id==='lab-a').retired,true,'B confirma retirada de Alpha');
  assert.deepEqual(snapshot.picks.__next__,[],'B elimina Alpha del sidecar');
  await first.waitForFunction(()=>[...document.querySelectorAll('.ball-card')].some(el=>el.textContent.includes('Alpha')&&el.querySelector('.ball-session-toggle input')?.checked===false),null,{timeout:10000});
  // A puede conservar un catálogo en memoria obsoleto: no debe resucitar la marca.
  await alpha(first).locator('.ball-session-toggle input').check();
  snapshot=await getData(first);
  assert.deepEqual(snapshot.picks.__next__,[],'A no puede reintroducir Alpha retirada por B');
  assert.deepEqual(await first.evaluate(()=>selectedBallsFor('__next__')),[],'Filtro operativo de A excluye Alpha retirada');
  assert.equal((await getData(second)).db.balls.find(b=>b.id==='lab-a').retired,true,'La retirada se conserva en almacenamiento');
  assert.deepEqual(snapshot.db.sessions,(await getData(second)).db.sessions,'No cambia ninguna sesión sintética');
  assert.deepEqual(errors,[],'Sin errores JS tras retirada cruzada');
  console.log('OK '+engine+' 390px: selector obsoleto no resucita bola retirada desde otra pestaña');
 }finally{await context.close()}
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
  // La importación JSON nunca debe reutilizar una selección de otra instalación.
  assert((await getData(page)).picks[sid]?.length>0,'Fixture conserva selección antes de importar');
  await page.locator('#restore-file').setInputFiles({
   name:'restauracion-lab.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(fixture))
  });
  await page.waitForFunction(()=>{
   try{return JSON.parse(localStorage.getItem('mi-bowling-analitica-v2')||'{}').sessions?.length===1}
   catch{return false}
  },null,{timeout:10000});
  data=await getData(page);
  assert.equal(data.db.sessions.length,1,'Restauración reemplaza las sesiones ficticias anteriores');
  assert.equal(data.db.sessions[0].games[0].rolls[0].ballId,'lab-b','Restauración preserva bola de tiro histórico');
  assert.deepEqual(data.db.balls,fixture.balls,'Restauración conserva los campos existentes de las bolas');
  assert.deepEqual(data.picks,{},'Restauración borra solo las selecciones temporales');
  assert.equal(await page.evaluate(()=>selectedBallsFor('lab-historica')),null,'Sesión restaurada sin filtro previo');
  await page.evaluate(()=>go('bolas'));
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
   try{for(const size of [390,1280])await run(browser,name,size,origin);await officialScenario(browser,name,origin);await deletionAndMalformedSelectionScenario(browser,name,origin);await independentSessionsScenario(browser,name,origin);await parallelTabsSelectionScenario(browser,name,origin);await concurrentRollDeselectionScenario(browser,name,origin);await rewindUndoWithDeselectedBallScenario(browser,name,origin);await crossTabRestoreClearsSelectionsScenario(browser,name,origin);await crossTabRetirementStalePickerScenario(browser,name,origin)}
   finally{await browser.close()}
  }
 }finally{await new Promise(resolve=>server.close(resolve))}
})().catch(err=>{console.error(err);process.exitCode=1});
