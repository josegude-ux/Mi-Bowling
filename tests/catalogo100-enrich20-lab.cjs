'use strict';
/* BOWLING-CATALOG100-F20-USBC-REAL-CP-001 · No escribir datos personales. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'catalogo-bolas'),source=fs.readFileSync(path.join(dir,'enrichment20.js'),'utf8');
const sandbox={};vm.runInNewContext(source,sandbox);
const records=sandbox.MiBowlingCatalog20.entries;
assert.equal(records.length,20,'Primeras 20 referencias auditadas');
assert.equal(records.filter(x=>x.state==='ficha-fabricante-verificada').length,8,'Ocho fichas contrastadas por fabricante o distribuidor oficial');
assert.equal(records.filter(x=>x.state==='pendiente').length,12,'Doce fichas pendientes sin datos inventados');
for(const x of records)if(x.state==='ficha-fabricante-verificada'){
 assert(x.technicalSource.startsWith('https://')&&x.photoPage===x.technicalSource);
 assert(x.core&&x.rg&&x.diff&&x.cover&&x.finish);
 assert(!x.image,'La foto no se copia ni se declara autorizada');
}else for(const field of ['rg','diff','core','cover','image','photoPage'])assert(!x[field],'Sin inventar datos en '+x.model);
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),m=html.match(/<script id="seed" type="application\/json">([\s\S]*?)<\/script>/);
const seeds=JSON.parse(m[1]),key=x=>(x.brand+'|'+x.model).normalize('NFD').toLowerCase().replace(/[^a-z0-9|]+/g,'');
assert.equal(seeds.length,100);
for(let i=0;i<20;i++)assert.equal(key(records[i]),key(seeds[i]),'Fuente asociada a la ficha correcta #'+(i+1));
assert(html.includes('enrichment20.js?v=lab-first20-20261110'),'Se importa el registro independiente');
assert(records.filter(x=>x.sourceAuthority?.includes('Hi-Sports')).length===2,'Fuentes de distribuidor oficial identificadas');
assert(!records.some(x=>x.image),'Sin archivos fotográficos de terceros copiados');
const sources=records.filter(x=>x.identityEvidence||x.commercialEvidence);
assert.equal(sources.map(x=>x.rank).join(','),'2,11','Dos investigaciones con procedencia desglosada');
for(const x of sources){
 assert.equal(x.state,'pendiente','Identidad y comercio no elevan estado de ficha técnica');
 assert(x.identityEvidence?.source.startsWith('https://'),'Identidad oficial vinculada');
 assert(x.commercialEvidence?.source.startsWith('https://'),'Fuente comercial distinguida');
 for(const field of ['cover','core','rg','diff','finish','image','photoPage','technicalSource'])assert(!x[field],'No publicar especificaciones sin ficha oficial: '+field);
}
console.log('PASS F20 static: veinte nombres exactos, ocho fichas contrastadas, doce pendientes, enlaces sin copia ni permiso implícito');
if(!process.argv.includes('--browser'))process.exit(0);
const {chromium,webkit}=require('playwright');
const pdfjs=path.join(root,'node_modules/pdfjs-dist/build/pdf.min.js'),worker=path.join(root,'node_modules/pdfjs-dist/build/pdf.worker.min.js');
const pdfPath=process.argv[process.argv.indexOf('--browser')+1]||'';
const realPdf=pdfPath&&fs.existsSync(pdfPath)?fs.readFileSync(pdfPath):null;
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8'};
const server=http.createServer((req,res)=>{let n;try{n=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)}catch{res.writeHead(400).end();return}
 const f=path.resolve(dir,'.'+(n==='/'?'/index.html':n));if(!f.startsWith(dir+path.sep)){res.writeHead(403).end();return}
 fs.readFile(f,(e,bytes)=>{if(e){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes)})});
async function test(engine,width,url){
 const browser=await ({chromium,webkit}[engine]).launch({headless:true});
 const ctx=await browser.newContext({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(pdfjs)}));
 await page.route('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(worker)}));
 try{
  await page.goto(url,{waitUntil:'load',timeout:35000});
  assert.equal(await page.locator('.item').count(),100);
  assert.equal(await page.locator('.item a:has-text("Ver fotografía en fuente oficial")').count(),8,'Ocho enlaces a páginas oficiales, ninguna fotografía reproducida');
  await page.evaluate(()=>localStorage.setItem('mi-bowling-analitica-v2','NO-TOCAR'));
  await page.locator('#query').fill('Purple Rhino Pro');
  assert.equal(await page.locator('.item').count(),1);
  assert.match(await page.locator('.item').textContent(),/2\.568|0\.032/,'Datos del fabricante visibles');
  await page.locator('.item [data-edit]').click();
  assert.equal(await page.locator('#rg').inputValue(),'2.568 (15 lb)');
  assert.equal(await page.locator('#core').inputValue(),'Vintage Light Bulb');
  assert.match(await page.locator('#manufacturerEvidence').textContent(),/15 lb/);
  assert.equal(await page.locator('#searchPhoto').getAttribute('href'),'https://brunswickbowling.com/products/balls/current/purple-rhino-pro');
  await page.locator('#close').click();
  await page.locator('#query').fill('PhysiX Ignition');
  assert.equal(await page.locator('.item').count(),1);
  await page.locator('.item [data-edit]').click();
  assert.equal(await page.locator('#rg').inputValue(),'2.470 (15 lb)');
  assert.equal(await page.locator('#core').inputValue(),'Atomic A.I. Core');
  assert.equal(await page.locator('#searchPhoto').getAttribute('href'),'https://hi-sp.co.jp/product/physix_ignition/');
  assert.match(await page.locator('#manufacturerEvidence').textContent(),/distribuidor oficial/i);
  await page.locator('#close').click();
  await page.locator('#query').fill('Ion Max (Veil)');
  assert.equal(await page.locator('.item').count(),1);
  await page.locator('.item [data-edit]').click();
  assert.equal(await page.locator('#diff').inputValue(),'0.055 (15 lb)');
  assert.equal(await page.locator('#cover').inputValue(),'NRG Smooth Solid Reactive');
  assert.equal(await page.locator('#searchPhoto').getAttribute('href'),'https://hi-sp.co.jp/product/ion_max_veil/');
  await page.locator('#close').click();
  await page.locator('#query').fill('(Orion) Nebula');
  assert.equal(await page.locator('.item').count(),1);
  assert.match(await page.locator('.item').textContent(),/Cubierta pendiente/);
  assert.equal(await page.locator('.item a:has-text("Ver fotografía en fuente oficial")').count(),0,'Variante ambigua sin foto errónea');
  await page.locator('.item [data-edit]').click();
  assert.equal(await page.locator('#rg').inputValue(),'','Orion no hereda RG de Nebula 2025');
  assert.match(await page.locator('#manufacturerEvidence').textContent(),/MOTIV Nebula de 2025|MOTIV Nebula 2025/);
  assert(await page.locator('#identityEvidenceLink').isVisible(),'Fuente PBA identidad visible');
  assert(await page.locator('#commercialEvidenceLink').isVisible(),'Fuente comercial no verificada diferenciada');
  assert.equal(await page.locator('#identityEvidenceLink').getAttribute('href'),'https://www.pba.com/registered-products/motiv');
  assert.equal(await page.locator('#commercialEvidenceLink').getAttribute('href'),'https://www.bowling.com/products/motiv-orion-nebula.htm');
  assert.equal(await page.locator('#cover').inputValue(),'','Sin cubierta heredada de Nebula original ni promoción de datos de comercio');
  await page.locator('#close').click();
  await page.locator('#query').fill('Nanodesu Mega Grasp');
  assert.equal(await page.locator('.item').count(),1,'Mega Grasp 2026 único');
  await page.locator('.item [data-edit]').click();
  assert.equal(await page.locator('#rg').inputValue(),'','Sin RG heredado de Nanodesu Grasp 2019');
  assert.equal(await page.locator('#diff').inputValue(),'','Sin diferencial heredado de modelo anterior');
  assert(await page.locator('#identityEvidenceLink').isVisible(),'Fuente oficial ABS identidad visible');
  assert(await page.locator('#commercialEvidenceLink').isVisible(),'Fuente comercial Mega Grasp no verificada');
  assert.match(await page.locator('#manufacturerEvidence').textContent(),/2026/);
  assert.equal(await page.locator('#searchPhoto').getAttribute('href').includes('google.com'),true,'No asociar fotografía externa comercial automáticamente');
  await page.locator('#close').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('mi-bowling-analitica-v2')),'NO-TOCAR');
  assert.equal(await page.evaluate(()=>localStorage.getItem('mi-bowling-plantilla-100-v1')),null,'Consultar fichas no escribe ni cambia selecciones');
  await page.locator('#query').fill('Synthesis Prime');
  assert.equal(await page.locator('.item').count(),1);
  await page.locator('.item [data-edit]').click();
  assert.equal(await page.locator('#diff').inputValue(),'0.053 (15 lb)');
  await page.locator('#cover').fill('Cubierta PERSONAL FICTICIA');
  await page.locator('#save').click();
  await page.reload({waitUntil:'load'});
  await page.locator('#query').fill('Synthesis Prime');
  await page.locator('.item [data-edit]').click();
  assert.equal(await page.locator('#cover').inputValue(),'Cubierta PERSONAL FICTICIA','Personalización persiste y prevalece');
  await page.locator('#close').click();
  if(engine==='chromium'&&width===390&&realPdf){
   // Seleccionar una ficha antigua que saldrá del top 100; no debe desaparecer.
   await page.locator('#query').fill('Prime Angular One');
   assert.equal(await page.locator('.item').count(),1,'Ficha histórica de prueba presente');
   await page.locator('.item [data-check]').check();
   await page.locator('#query').fill('Purple Rhino Pro');
   await page.locator('.item [data-check]').check();
   await page.locator('#pdfFile').setInputFiles({name:'usbc-oficial.pdf',mimeType:'application/pdf',buffer:realPdf});
   await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Catálogo actualizado'),null,{timeout:150000});
   const imported=await page.evaluate(()=>({saved:JSON.parse(localStorage.getItem('mi-bowling-plantilla-100-v1')),app:localStorage.getItem('mi-bowling-analitica-v2')}));
   assert.equal(imported.saved.records.length,100,'Recalcular top100 desde PDF auténtico');
   assert(imported.saved.meta.reviewed,'Importación marcada como PDF');
   assert.equal(imported.app,'NO-TOCAR');
   assert(imported.saved.records.some(x=>x.brand==='Vexa'&&x.model==='Start Red/Black/Green'),'Vexa omitida en el índice previo, presente en USBC real');
   assert(imported.saved.records.some(x=>x.brand==='Brunswick'&&x.model==='Purple Rhino Pro (2026)'&&x.selected),'Conservar selección al importar');
   assert(Array.isArray(imported.saved.archive)&&imported.saved.archive.length>0,'Archivo histórico disponible');
   assert(imported.saved.archive.some(x=>x.brand==='Ebonite'&&x.model==='Prime Angular One'&&x.selected),'Ficha/selección desplazada recuperable');
   const dates=imported.saved.records.map(x=>x.approved);
   assert(dates.every((d,i)=>i===0||dates[i-1]>=d),'Orden decreciente por fecha');
   console.log('PASS REAL PDF IMPORT chromium 390×844: PDF USBC real, 100 últimos, Vexa recuperada, archivo histórico con selección preservada y datos de MI BOWLING aislados');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS F20 '+engine+' '+width+': foto oficial enlazada, ficha exacta, variantes ambiguas protegidas y personalización preservada');
 }finally{await ctx.close();await browser.close()}
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/';try{await test('chromium',390,url);await test('webkit',390,url);await test('chromium',1280,url)}finally{await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
