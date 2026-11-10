'use strict';
// Solo prueba la página pública con almacenamiento sintético en el navegador del runner.
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const url='https://josegude-ux.github.io/Mi-Bowling/catalogo-bolas/';
async function test(name,w,h){
 const browser=await ({chromium,webkit}[name]).launch({headless:true});
 const context=await browser.newContext({viewport:{width:w,height:h},isMobile:w===390,hasTouch:w===390});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const response=await page.goto(url,{waitUntil:'load',timeout:45000});
  assert.equal(response.status(),200,'URL publicada 200');
  assert.equal(await page.locator('.item').count(),100,'100 elementos publicados');
  assert(await page.locator('#disclaimer').isVisible(),'Aviso sobre límites visible');
  await page.locator('#query').fill('Theorem Delta');
  assert.equal(await page.locator('.item').count(),1,'Buscar la bola del catálogo');
  await page.locator('.item [data-check]').check();
  assert.equal(await page.locator('#chosen').textContent(),'1');
  await page.reload({waitUntil:'load'});
  assert.equal(await page.locator('#chosen').textContent(),'1','Selección persistente');
  await page.locator('#filter').selectOption('chosen');
  assert.equal(await page.locator('.item').count(),1,'Filtrar las marcadas');
  await page.locator('[data-edit]').click();
  assert.equal(await page.locator('#modalTitle').textContent(),'Theorem Delta');
  await page.locator('#core').fill('Dato ficticio de auditoría');
  await page.locator('#save').click();
  await page.reload({waitUntil:'load'});
  await page.locator('#filter').selectOption('chosen');
  await page.locator('[data-edit]').click();
  assert.equal(await page.locator('#core').inputValue(),'Dato ficticio de auditoría');
  await page.locator('#close').click();
  const actual=await page.evaluate(()=>({our:localStorage.getItem('mi-bowling-plantilla-100-v1')!=null,app:localStorage.getItem('mi-bowling-analitica-v2'),selections:localStorage.getItem('mi-bowling-ball-selection-v1'),wide:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
  assert(actual.our&&actual.app===null&&actual.selections===null,'Sin escribir datos de app');
  assert(actual.wide<5,'Sin desbordamiento horizontal');
  assert.deepEqual(errors,[],'Sin errores JS');
  console.log('PASS DEPLOY '+name+' '+w+'×'+h+': HTTP 200, 100 tarjetas, buscar, marcar, editar, persistencia, sin datos MI BOWLING');
  await page.screenshot({path:'catalogo100-live-'+name+'-'+w+'.png',fullPage:false});
 }finally{await context.close();await browser.close()}
}
(async()=>{await test('chromium',390,844);await test('webkit',390,844);await test('chromium',1280,900)})().catch(e=>{console.error(e);process.exitCode=1});