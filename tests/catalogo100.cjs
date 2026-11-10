'use strict';
// MI BOWLING · BOWLING-CATALOG100-CP-001 · Solo datos ficticios.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'catalogo-bolas/index.html'),'utf8');
const match=html.match(/<script id="seed" type="application\/json">([\s\S]*?)<\/script>/);
assert(match,'Dataset presente');
const seed=JSON.parse(match[1]);
assert.equal(seed.length,100,'100 referencias iniciales');
assert.equal(new Set(seed.map(x=>x.id)).size,100,'IDs únicos');
assert(seed.every(x=>x.brand&&x.model&&/^\d{4}-\d\d-\d\d$/.test(x.approved)),'Identidad y fecha');
assert(seed.every(x=>!x.image&&!x.core&&!x.rg&&!x.diff),'No inventar fotografías ni especificaciones');
assert(seed.every((x,i)=>i===0||seed[i-1].approved>=x.approved),'Fechas no crecientes');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
const js=scripts.at(-1)[1];new vm.Script(js);
assert(js.includes("const STORAGE='mi-bowling-plantilla-100-v1'"),'Clave aislada');
assert(!js.includes("localStorage.setItem('mi-bowling-analitica-v2'"),'Sin escribir datos reales');
assert(html.includes('no se afirma que sean las 100 más recientes'),'Fuentes limitadas expuestas');
console.log('PASS static catalog100: 100 referencias, fechas, origen indicado, sin fotos/especificaciones inventadas, sin datos de MI BOWLING');
if(!process.argv.includes('--browser'))process.exit(0);
const {chromium,webkit}=require('playwright'),{PDFDocument,StandardFonts}=require('pdf-lib');
const pdfLib=require.resolve('pdfjs-dist/build/pdf.min.js'),pdfWorker=require.resolve('pdfjs-dist/build/pdf.worker.min.js');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=http.createServer((req,res)=>{
 let target=path.resolve(root,'catalogo-bolas','.'+(req.url==='/'?'/index.html':req.url.split('?')[0]));
 if(!target.startsWith(path.resolve(root,'catalogo-bolas')+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(target,(e,data)=>{if(e){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)});
});
async function fakePdf(){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 for(let n=0;n<60;n++){
  const page=pdf.addPage([792,612]);
  page.drawText('Brand',{x:120,y:575,size:9,font});page.drawText('Ball Name',{x:350,y:575,size:9,font});page.drawText('Date Approved',{x:640,y:575,size:9,font});
  for(let j=0;j<2;j++){
   const k=n*2+j;
   const d=new Date(Date.UTC(2026,10,3-k));
   const date=d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
   const y=530-j*35;
   page.drawText('Marca LAB',{x:130,y,size:10,font});
   page.drawText('Modelo sintético '+String(k+1).padStart(3,'0'),{x:315,y,size:10,font});
   page.drawText(date,{x:640,y,size:10,font});
  }
 }
 return Buffer.from(await pdf.save());
}
async function browserTest(name,viewport,url,buf){
 const b=await({chromium,webkit}[name]).launch({headless:true});
 const ctx=await b.newContext({viewport,isMobile:viewport.width===390,hasTouch:viewport.width===390}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(pdfLib)}));
 await page.route('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(pdfWorker)}));
 try{
  await page.goto(url,{waitUntil:'load',timeout:35000});
  assert.equal(await page.locator('.item').count(),100,'100 cards visibles');
  await page.locator('#query').fill('Theorem Delta');
  assert.equal(await page.locator('.item').count(),1,'Buscar modelo');
  await page.locator('.item input[data-check]').check();
  assert.equal(await page.locator('#chosen').textContent(),'1','Selección');
  await page.reload({waitUntil:'load'});
  assert.equal(await page.locator('#chosen').textContent(),'1','Selección persistente');
  await page.locator('#filter').selectOption('chosen');
  assert.equal(await page.locator('.item').count(),1,'Filtro marcadas');
  await page.locator('.item [data-edit]').click();
  await page.locator('#notes').fill('Solo datos de laboratorio');
  await page.locator('#save').click();
  await page.reload({waitUntil:'load'});
  await page.locator('#filter').selectOption('chosen');
  await page.locator('[data-edit]').click();
  assert.equal(await page.locator('#notes').inputValue(),'Solo datos de laboratorio','Nota local persistida');
  await page.locator('#close').click();
  await page.evaluate(()=>localStorage.setItem('mi-bowling-analitica-v2','NO-TOCAR-REAL'));
  await page.locator('#pdfFile').setInputFiles({name:'USBC-SINTETICO-2026.pdf',mimeType:'application/pdf',buffer:buf});
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Catálogo actualizado'),null,{timeout:120000});
  assert.equal(await page.locator('.item').count(),100,'100 fechas top del PDF');
  const stored=await page.evaluate(()=>({items:JSON.parse(localStorage.getItem('mi-bowling-plantilla-100-v1')).records.length,real:localStorage.getItem('mi-bowling-analitica-v2'),names:[...document.querySelectorAll('.model')].slice(0,3).map(x=>x.textContent)}));
  assert.equal(stored.items,100);assert.equal(stored.real,'NO-TOCAR-REAL','Datos MI BOWLING intocados');
  assert(stored.names.includes('Modelo sintético 001'),'Última aprobación del PDF');
  assert.deepEqual(errors,[],'Sin errores JavaScript');
  console.log('PASS '+name+' '+viewport.width+'×'+viewport.height+': buscar, elegir, persistencia, ficha, PDF sintético 60 páginas/120 filas → últimas 100, datos reales aislados');
  await page.screenshot({path:path.join(root,'catalogo100-'+name+'-'+viewport.width+'.png'),fullPage:false});
 }finally{await ctx.close();await b.close()}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 try{const pdf=await fakePdf();await browserTest('chromium',{width:390,height:844},url,pdf);await browserTest('webkit',{width:390,height:844},url,pdf);await browserTest('chromium',{width:1280,height:900},url,pdf)}
 finally{await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});