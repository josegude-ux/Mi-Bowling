'use strict';
// MI BOWLING · DISEÑO LAB R1. Solo datos ficticios, sin servicios reales.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'test-results');
fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml',
 '.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 let p;
 try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}
 catch{res.writeHead(400).end();return}
 const f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
 if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){
  res.writeHead(404).end('Not found');return;
 }
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');
 fs.createReadStream(f).pipe(res);
});
const fixture={
 version:2,hand:'diestro',
 balls:[{id:'LAB-BALL-A',brand:'Columbia 300',model:'Bully',weight:'',
   kind:'Reactiva',notes:'Ficha de prueba',photo:'',retired:false}],
 patterns:[],
 sessions:[{id:'LAB-SESION',type:'entrenamiento',date:'2026-11-09',
  title:'Partida ficticia de diseño',venue:'Bolera ficticia',
  lane:null,currentBallId:'',currentLine:{approach:'20',arrow:'15',breakpoint:'8'},
  games:[{id:'LAB-G1',pair:null,startLane:null,includeStats:true,segments:[],rolls:[]}]}]
};
async function test(browser,engine,width,height,url){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,
  isMobile:width<700,hasTouch:width<700,serviceWorkers:'block'});
 const page=await ctx.newPage(),errors=[],resources=[];
 page.on('pageerror',err=>errors.push(err.message));
 page.on('response',res=>{if(res.status()>=400)resources.push(res.status()+' '+res.url())});
 try{
  await page.goto(url,{waitUntil:'load'});
  await page.evaluate(data=>localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(data)),fixture);
  await page.reload({waitUntil:'load'});
  await page.locator('.bowling-home-menu').waitFor();
  const before=await page.evaluate(()=>localStorage.getItem('mi-bowling-analitica-v2'));
  assert.equal(await page.locator('.bowling-home-module').count(),3,'Tres accesos de inicio');
  assert(await page.locator('.topbar').isVisible(),'Cabecera consistente');
  assert.equal(await page.locator('link[href^="design-lab.css"]').count(),1,'CSS cargado');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--teal').trim()),'#086fd4');
  if(width>=1120){
   assert(await page.locator('.design-lab-sidebar').isVisible(),'Barra lateral de escritorio');
   assert.equal(await page.locator('#bottom-nav').isVisible(),false,'Sin barra inferior duplicada');
   assert.equal(await page.locator('[data-design-target="inicio"]').getAttribute('aria-current'),'page');
   await page.locator('[data-design-target="bolas"]').click();
  }else{
   assert.equal(await page.locator('.design-lab-sidebar').isVisible(),false,'Sin barra lateral en pantallas pequeñas');
   assert(await page.locator('#bottom-nav').isVisible(),'Barra inferior disponible');
   await page.evaluate(()=>go('estadisticas'));
   await page.getByRole('button',{name:'Ver mis bolas'}).click();
  }
  await page.getByRole('heading',{name:/Mis bolas/i}).waitFor();
  assert.equal(await page.locator('.ball-card').count(),1,'Arsenal real sin inventar bolas');
  assert.equal(await page.locator('.ball-session-toggle input[type="checkbox"]').count(),1,'Casilla de selección intacta');
  if(width>=1120)assert.equal(await page.locator('[data-design-target="bolas"]').getAttribute('aria-current'),'page');
  await page.evaluate(()=>go('estadisticas'));
  await page.getByRole('heading',{name:'Estadísticas'}).waitFor();
  await page.evaluate(()=>go('registro'));
  await page.evaluate(()=>{activeId='LAB-SESION';render()});
  await page.locator('.registry-v4-score').waitFor();
  assert.equal(await page.locator('.score-strip .frame-cell').count(),10,'Diez frames');
  assert.equal(await page.locator('.pin-layout button.pin').count(),10,'Diez bolos operativos');
  assert.equal(await page.locator('.registry-v4-score .score-action-buttons button').count(),2,'Controles juntos');
  assert.equal(await page.locator('.registry-v4-score .score-action-buttons').evaluate(x=>getComputedStyle(x).gridTemplateColumns.split(' ').length),2,'Dos controles paralelos');
  assert(await page.getByRole('button',{name:'Deshacer último lanzamiento'}).isDisabled(),'Deshacer no activo sin tirada');
  await page.locator('.design-lab-header-theme').click();
  assert(await page.evaluate(()=>document.body.classList.contains('lab-dark')),'Modo oscuro opcional');
  await page.locator('.design-lab-header-theme').click();
  assert.equal(await page.evaluate(()=>document.body.classList.contains('lab-dark')),false,'Regreso a claro');
  assert.equal(await page.evaluate(()=>localStorage.getItem('mi-bowling-analitica-v2')),before,'El diseño no escribe sesiones');
  const viewport=await page.evaluate(()=>({vw:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert(viewport.scroll<=viewport.vw+2,'Sin desbordamiento horizontal: '+JSON.stringify(viewport));
  await page.screenshot({path:path.join(output,'diseno-'+engine+'-'+width+'.png'),fullPage:true});
  assert.deepEqual(errors,[],'Sin errores JavaScript');
  assert.deepEqual(resources,[],'Sin recursos 404 u otros errores HTTP');
  console.log('PASS '+engine+' '+width+'×'+height+': juego, bolas, analítica, responsive, accesibilidad, tema y datos sin cambios');
 } finally{await ctx.close()}
}
(async()=>{
 const port=await new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
 const url='http://127.0.0.1:'+port+'/';
 try{
  const c=await chromium.launch({headless:true}),w=await webkit.launch({headless:true});
  try{
   await test(c,'chromium',390,844,url);
   await test(c,'chromium',820,1180,url);
   await test(c,'chromium',1280,900,url);
   await test(w,'webkit',390,844,url);
  }finally{await c.close();await w.close()}
 }finally{await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});