'use strict';
// MI BOWLING · PR análisis arsenal LAB: datos sintéticos, no toca perfiles reales.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 const file=path.resolve(root,'.'+(p==='/'?'/index.html':p));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
const newBall=(id,brand,model,notes='')=>({id,brand,model,weight:'15 lb',kind:'Reactiva',notes,photo:'',retired:false});
const fixture={version:2,hand:'diestro',balls:[
 newBall('lab-rally','Columbia 300','Rally','Taladro LAB sin medidas validadas'),
 newBall('lab-web','Hammer','Web Tour Edition Hybrid'),
 newBall('lab-ringer','Brunswick','Ringer Burgundy Pearl'),
 newBall('lab-pitbull','DV8','Pitbull Bite'),
 newBall('lab-unknown','Marca LAB','Modelo de prueba'),
 {...newBall('lab-retired','Track','Legion Pearl'),retired:true}
],patterns:[],sessions:[]};
const store=page=>page.evaluate(()=>({db:JSON.parse(localStorage.getItem('mi-bowling-analitica-v2')),picks:JSON.parse(localStorage.getItem('mi-bowling-ball-selection-v1')||'{}')}));
async function run(browser,name,width,origin){
 const ctx=await browser.newContext({viewport:{width,height:width<500?844:850},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 try{
  await page.goto(origin,{waitUntil:'load'});await page.evaluate(data=>localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(data)),fixture);await page.reload({waitUntil:'load'});
  await page.getByRole('button',{name:'Mis bolas',exact:true}).click();
  assert.equal(await page.locator('.ball-card').count(),6,'Arsenal original intacto');
  await page.getByRole('button',{name:/Comparar marcadas/}).click();
  assert.match(await page.locator('#app').innerText(),/Marca las bolas mediante sus checks/,'Sin selección no recomienda bolas');
  await page.getByRole('button',{name:/Volver a Mis bolas/}).click();
  for(const key of ['Rally','Web Tour Edition Hybrid','Ringer Burgundy Pearl','Pitbull Bite']){
   await page.locator('.ball-card').filter({hasText:key}).locator('.ball-session-toggle input').check();
  }
  const before=await store(page);
  assert.deepEqual(before.picks.__next__,['lab-rally','lab-web','lab-ringer','lab-pitbull']);
  await page.getByRole('button',{name:/Comparar marcadas/}).click();
  const comp=await page.locator('#app').innerText();
  assert.match(comp,/4 bola\(s\) marcadas/);
  assert.match(comp,/Equipo de 3/);assert.match(comp,/Equipo de 4/);assert.match(comp,/Equipo de 6/);
  assert(!comp.includes('Marca LAB Modelo de prueba'),'No recomienda bola fuera de selección');
  assert(!comp.includes('Track Legion Pearl'),'No recomienda bola retirada');
  await page.getByRole('button',{name:/Asistente de competición/}).click();
  assert.equal(await page.locator('input[name="arsenal-issue"]').count(),4,'Cuatro diagnósticos');
  await page.locator('input[name="arsenal-issue"][value="skid"]').check();
  let assist=await page.locator('#app').innerText();assert.match(assist,/Pitbull Bite/);assert.match(assist,/Rally/);
  await page.locator('input[name="arsenal-issue"][value="early"]').check();
  assist=await page.locator('#app').innerText();assert.match(assist,/Ringer/);assert(!assist.includes('Track Legion Pearl'),'No sugiere retirada');
  await page.locator('input[name="arsenal-issue"][value="jump"]').check();
  await page.locator('input[name="arsenal-issue"][value="pocket"]').check();
  await page.getByRole('button',{name:/Catálogo de 10 modelos/}).click();
  assert.equal(await page.locator('.arsenal-model').count(),10,'Diez modelos consultivos');
  await page.locator('.arsenal-model').filter({hasText:'Vintage Phantom'}).getByRole('button',{name:/Ver análisis/}).click();
  assert.match(await page.locator('#app').innerText(),/Cynosure simétrico/);
  await page.getByRole('button',{name:/Volver a Mis bolas/}).click();
  await page.locator('.ball-card').filter({hasText:'Rally'}).getByRole('button',{name:'Análisis'}).click();
  assert.match(await page.locator('#app').innerText(),/Taladro LAB sin medidas validadas/,'Notas existentes reutilizadas');
  await page.getByRole('button',{name:/Volver a Mis bolas/}).click();
  await page.locator('.ball-card').filter({hasText:'Modelo de prueba'}).getByRole('button',{name:'Análisis'}).click();
  assert.match(await page.locator('#app').innerText(),/Ficha no identificada/,'Sin datos inventados');
  assert.deepEqual((await store(page)).db,fixture,'Análisis no escribe fichas, esquema ni sesiones');
  assert.deepEqual((await store(page)).picks,before.picks,'Análisis no modifica checks');

  // Asistente desde el marcador: conserva bolos en pie y no crea tiros al consultar.
  await page.getByRole('button',{name:/Volver a Mis bolas/}).click();
  await page.getByRole('button',{name:'Nueva',exact:true}).click();
  await page.locator('#s-title').fill('Competicicón ficticia de análisis');
  await page.locator('#s-venue').fill('Bolera LAB');
  await page.locator('#s-ball').selectOption('lab-rally');
  await page.locator('#newSessionForm button[type=submit]').click();
  let active=await store(page);
  assert.equal(active.db.sessions.length,1,'Una única sesión sintética creada');
  const sid=active.db.sessions[0].id;
  assert.deepEqual(active.picks[sid],before.picks.__next__,'Los cuatro checks se transfieren por UUID de sesión');
  await page.evaluate(()=>togglePin(1));
  assert.deepEqual(await page.evaluate(()=>selection),[1],'Bolo en pie antes del asistente');
  const extras=page.locator('details.registry-v4-extra');
  if((await extras.getAttribute('open'))===null)await extras.locator('summary').click();
  await page.getByRole('button',{name:/Asistente de competición/}).click();
  assert.match(await page.locator('#app').innerText(),/4 bola\(s\) marcadas|bola[s]? candidatas de tu selección/i,'Asistente abierto para la sesión');
  await page.locator('input[name="arsenal-issue"][value="skid"]').check();
  await page.getByRole('button',{name:/Volver al lanzamiento/}).click();
  assert.deepEqual(await page.evaluate(()=>selection),[1],'El regreso rápido conserva el bolo pendiente');
  active=await store(page);
  assert.equal(active.db.sessions[0].games[0].rolls.length,0,'Consultar el asistente no registra ni elimina lanzamientos');
  assert.deepEqual(active.db.balls,fixture.balls,'No cambia ninguna ficha al volver al lanzamiento');
  assert.deepEqual(active.picks[sid],before.picks.__next__,'El asesor no altera la selección');
  const scroll=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert(scroll.scroll<=scroll.client+2,'Sin scroll horizontal en responsive');
  assert.deepEqual(errors,[],'Sin errores JS');
  console.log('OK '+name+' '+width+'px: catálogo 10, ficha, notas, comparador, 4 problemas, selección aislada, datos intactos');
 }finally{await ctx.close()}
}
(async()=>{
 const port=await new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
 try{for(const [name,type] of [['Chromium',chromium],['WebKit',webkit]]){const b=await type.launch({headless:true});try{for(const width of [390,1280])await run(b,name,width,'http://127.0.0.1:'+port+'/')}finally{await b.close()}}}
 finally{await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
