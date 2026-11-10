'use strict';
/* BOWLING-UI-HOME-CLEAN-CP-001. Contextos efímeros y SIN datos reales. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const app=read('app.js'),html=read('index.html'),sw=read('sw.js');
const from=app.indexOf('function home(){'),to=app.indexOf('let calendarMonth',from);
assert(from>=0&&to>from,'Inicio localizable');
const home=app.slice(from,to);
assert.equal((home.match(/bowling-home-module bowling-home-module-/g)||[]).length,4,'Cuatro módulos principales');
assert(home.includes('bowling-home-tools')&&home.includes('data-target="patrones"'),'Herramientas de Liga y patrones conservadas');
for(const route of ['nueva','historial','estadisticas'])
 assert(home.includes('data-target="'+route+'"'),'Función principal '+route);
assert(app.includes('onclick="openBallPickerFor(\x27\x27,\x27estadisticas\x27)"'),'Arsenal desde Análisis');
assert(app.includes("ballPickReturn==='estadisticas'?'Volver al análisis'"),'Vuelta a Análisis');
assert(app.includes('Liga Nacional · Marcador por tripletas')&&app.includes('launchLeagueFromNew()'),
 'Liga Nacional sigue dentro de Jugar/Competición oficial');
assert(app.includes('Biblioteca de patrones / PDF'),'Patrones accesibles desde Jugar');
assert(html.includes('data-design-target="bolas"'),'Mis bolas en navegación de escritorio');
for(const token of ["const APP_VERSION='3.3.10-catalogo'","const KEY='mi-bowling-analitica-v2'","const BALL_SELECTION_KEY='mi-bowling-ball-selection-v1'","function recordRoll(","function undoRoll(","function ligaView(","function ballsView(","function calendarView("])
 assert(app.includes(token),'Contrato preservado: '+token);
assert(sw.includes("const CACHE='mi-bowling-analitica-v3-3-10-ui-cp036'"),'Caché publicada sin tocar');
console.log('PASS HOME static: 4 módulos, navegación a arsenal/liga/patrones, datos y motor intactos.');

if(!process.argv.includes('--browser'))process.exit(0);

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml',
 '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}
 catch{res.writeHead(400);res.end();return}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!(file===root||file.startsWith(root+path.sep))){res.writeHead(403);res.end();return}
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);res.end();return}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(data);
 });
});
async function verify(browser,engine,width,height,url){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 try{
  await page.goto(url,{waitUntil:'load',timeout:35000});
  await page.locator('.bowling-home-menu').waitFor();
  assert.equal(await page.locator('.bowling-home-module').count(),3,'Inicio 3 tarjetas');
  assert.equal(await page.locator('.bowling-home-tools').count(),0,'Sin Más herramientas');
  assert.equal(await page.locator('.bowling-home-tool-card').count(),0,'Sin accesos duplicados');
  assert.equal(await page.locator('.bowling-home-stats').count(),1,'Resumen de rendimiento intacto');
  if(width>=1120){
   await page.locator('.design-lab-side-nav [data-design-target="estadisticas"]').click();
  }else{
   await page.locator('#bottom-nav button[aria-label="Estadísticas"]').click();
  }
  assert.match(await page.locator('.section-head h1').textContent(),/Estadísticas/);
  const open=page.getByRole('button',{name:'Ver mis bolas'});
  assert(await open.isVisible(),'Ruta del arsenal dentro de Análisis');
  await open.click();
  assert.match(await page.locator('.section-head h1').textContent(),/Mis bolas/i);
  await page.getByRole('button',{name:/Volver al análisis/}).click();
  assert.match(await page.locator('.section-head h1').textContent(),/Estadísticas/);
  if(width>=1120)await page.locator('.design-lab-side-nav [data-design-target="nueva"]').click();
  else await page.locator('#bottom-nav button[aria-label="Nueva"]').click();
  assert.match(await page.locator('.section-head h1').textContent(),/Empezar partida/);
  assert(await page.getByRole('button',{name:/Biblioteca de patrones/}).isVisible(),'Acceso patrones en Jugar');
  await page.locator('#s-type').selectOption('oficial');
  await page.locator('#competition-format-choice').selectOption('liga');
  const league=page.getByRole('button',{name:/Abrir marcador de Liga Nacional/});
  assert(await league.isVisible(),'Acceso Liga Nacional en Competición oficial');
  await league.click();
  assert.match(await page.locator('.section-head h1').textContent(),/Liga Nacional/);
  await page.evaluate(()=>go('inicio'));
  assert.equal(await page.locator('.bowling-home-module').count(),3,'Inicio recuperable');
  const sizes=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert(sizes.content<=sizes.viewport+3,'Sin desbordamiento horizontal: '+JSON.stringify(sizes));
  assert.deepEqual(errors,[],'Sin errores JavaScript');
  console.log('PASS HOME CLEAN '+engine+' '+width+'×'+height+': Inicio, Análisis/Mis bolas/volver, Jugar/Liga, patrones y responsive');
 }finally{await ctx.close()}
}
(async()=>{
 const browsers=require('playwright');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 try{
  for(const [engine,width,height] of [['chromium',390,844],['chromium',820,1180],['chromium',1280,900],['webkit',390,844]]){
   const browser=await browsers[engine].launch({headless:true});
   try{await verify(browser,engine,width,height,url)}
   finally{await browser.close()}
  }
 }finally{await new Promise(resolve=>server.close(resolve))}
})().catch(err=>{console.error(err);process.exitCode=1});
