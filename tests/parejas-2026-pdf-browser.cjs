'use strict';
/* Chromium/WebKit reales; origen localhost y sesión ficticia, sin servicios externos.
 * PDF con tabla nativa generado en memoria. No se modifica producción, ni datos reales.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright'),{pdfFixture}=require('./parejas-2026-fixture-pdf.cjs');
const root=path.resolve(__dirname,'..'),KEY='mi-bowling-analitica-v2';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')}catch{res.writeHead(400);return res.end()}
 if(!rel||rel.endsWith('/'))rel+='index.html';
 const f=path.resolve(root,rel);if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(f,(err,b)=>{if(err){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b)});
});
const pdfA=pdfFixture(['CLASIFICACION PAREJAS 2026','SEGUNDA CATEGORIA','POS CAT PAREJA PARTIDAS BOLOS','1 2M EQUIPO UNO 1 400','2 2M CELTA XUNTA 1 380','3 2M EQUIPO TRES 1 360']);
const pdfB=pdfFixture(['CLASIFICACION PAREJAS 2026','SEGUNDA CATEGORIA','POS CAT PAREJA PARTIDAS BOLOS','1 2M CELTA XUNTA 2 800','2 2M EQUIPO UNO 2 790','3 2M EQUIPO TRES 2 735']);
const pdfWrong=pdfFixture(['FOLIO DE INFORMACION','SIN TABLA DE CLASIFICACION']);
const oldSession={id:'old-synthetic',type:'entrenamiento',date:'2026-11-01',title:'Partida ficticia anterior',venue:'LAB',notes:'',pattern:'',patternId:'',patternNotes:'',currentBallId:'',currentLine:{approach:'',arrow:'',breakpoint:''},lane:5,games:[{id:'g-old',includeStats:true,finalOnly:165,pair:[5,6],startLane:5,segments:[],rolls:[]}]};
const seed={version:2,hand:'diestro',balls:[],patterns:[],sessions:[oldSession]};
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await (process.env.BOWLING_BROWSER==='webkit'?webkit:chromium).launch();
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  await ctx.addInitScript(([k,v])=>{if(!sessionStorage.getItem('seed-pdf-lab')){localStorage.setItem(k,v);localStorage.setItem('mibowling.pref.registro-modo','bolos');sessionStorage.setItem('seed-pdf-lab','yes')}},[KEY,JSON.stringify(seed)]);
  const page=await ctx.newPage(),errors=[],dialogs=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>{dialogs.push(d.message());d.accept()});
  await page.goto('http://localhost:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof abrirTorneoParejas==='function'&&!!window.MiBowlingParejasClasificacion&&!!window.MiBowlingRegistroCompacto,{timeout:20000});
  const db=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),KEY);
  await page.evaluate(()=>abrirTorneoParejas());
  await page.getByRole('button',{name:'Preparar sábado'}).click();
  await page.waitForSelector('.rc-root');
  await page.evaluate(()=>{setFinalOnly(180);render()});
  await page.locator('#rc-lazaro-score').fill('160');
  await page.locator('button[onclick="guardarLazaroPartidaActual()"]').click();
  let data=await db();
  const sat=()=>data.sessions.find(s=>s.date==='2026-11-28');
  assert.equal(sat().parejas2026.lazaro[0],160);
  assert.equal(data.sessions.find(s=>s.id==='old-synthetic').games[0].finalOnly,165);
  await page.evaluate(()=>abrirClasificacionParejasPdf());
  await page.waitForSelector('#parejas-pdf-file');
  async function upload(buffer,name){
   await page.locator('#parejas-pdf-file').setInputFiles({name,mimeType:'application/pdf',buffer});
   await page.waitForFunction(()=>document.querySelector('[data-parejas-pdf-row]')||document.querySelector('[role="alert"]'),null,{timeout:16000}).catch(()=>{});
   if(!(await page.locator('[data-parejas-pdf-row]').count())){
    const diag=await page.evaluate(()=>({visible:document.body.innerText.slice(-1600),pdfError:document.querySelector('[role="alert"]')?.textContent,hasReader:typeof MiBowlingParejasClasificacion?.pdfLines,hasPdfScript:[...document.scripts].some(x=>x.src?.includes('pdfjs'))}));
    const probe=await page.evaluate(async b64=>{
     const bytes=Uint8Array.from(atob(b64),ch=>ch.charCodeAt(0));
     const f=new File([bytes],'fixture.pdf',{type:'application/pdf'});
     try{const rows=await MiBowlingParejasClasificacion.pdfLines(f,new URL('./',document.baseURI).href);return {rows:rows.slice(0,3),hasSubtle:!!crypto.subtle?.digest}}
     catch(e){return{message:e?.message,stack:e?.stack,hasSubtle:!!crypto.subtle?.digest}}
    },pdfA.toString('base64'));
    throw Error('WEBKIT_PDF_DIAGNOSTIC '+JSON.stringify(diag)+' PROBE '+JSON.stringify(probe)+' PAGE_ERRORS '+errors.join(' | '));
   }
  }
  await upload(pdfA,'parejas-ficticio-1.pdf');
  assert.equal(await page.locator('[data-parejas-pdf-row]').count(),3);
  assert.equal(await page.locator('[data-parejas-pdf-row]').nth(1).locator('[data-field="team"]').inputValue(),'CELTA XUNTA');
  assert.equal(await page.locator('[data-parejas-pdf-row]').nth(1).locator('[data-field="cat"]').inputValue(),'2ª');
  // Revisión manual explícita; antes de ello no existe ninguna versión en almacenamiento.
  assert.equal((await db()).sessions.find(s=>s.date==='2026-11-28').parejas2026.rankings.length,0);
  await page.locator('#parejas-pdf-reviewed').check();
  await page.getByRole('button',{name:'Guardar esta versión revisada'}).click();
  data=await db();assert.equal(sat().parejas2026.rankings.length,1);
  assert.equal(sat().parejas2026.rankings[0].rows[1].bolos,380);
  assert.equal(sat().parejas2026.rankings[0].version,1);
  await upload(pdfA,'parejas-ficticio-1.pdf');
  await page.locator('#parejas-pdf-reviewed').check();
  await page.getByRole('button',{name:'Guardar esta versión revisada'}).click();
  data=await db();assert.equal(sat().parejas2026.rankings.length,1,'PDF duplicado no crea versión');
  await upload(pdfB,'parejas-ficticio-2.pdf');
  await page.locator('#parejas-pdf-game').selectOption('2');
  await page.locator('#parejas-pdf-reviewed').check();
  await page.getByRole('button',{name:'Guardar esta versión revisada'}).click();
  data=await db();
  assert.equal(sat().parejas2026.rankings.length,2);
  assert.equal(sat().parejas2026.rankings[1].version,2);
  assert.equal(sat().parejas2026.rankings[1].game,2);
  const view=await page.evaluate(()=>{const C=MiBowlingParejasClasificacion;const s=JSON.parse(localStorage.getItem('mi-bowling-analitica-v2')).sessions.find(s=>s.date==='2026-11-28');return C.rankingView(s.parejas2026.rankings,'2ª','2026-11-28',2)});
  assert.equal(view.me.pos,1);assert.equal(view.me.bolos,800);assert.equal(view.change,1);
  assert.equal(view.gapLeader,0);
  // Archivo sin tabla: no debe alterar ninguna clasificación anterior.
  await page.locator('#parejas-pdf-file').setInputFiles({name:'sin-tabla.pdf',mimeType:'application/pdf',buffer:pdfWrong});
  await page.waitForFunction(()=>document.body.textContent.includes('No se reconoció una tabla'),null,{timeout:16000});
  assert.equal((await db()).sessions.find(s=>s.date==='2026-11-28').parejas2026.rankings.length,2);
  // Mismo usuario, dos sesiones independientes; segundo día no existe hasta indicarse pista.
  await page.evaluate(()=>abrirTorneoParejas());
  await page.locator('#parejas-lane-2026-11-29').fill('13');
  await page.getByRole('button',{name:'Preparar domingo'}).click();
  await page.waitForSelector('.rc-root');
  await page.evaluate(()=>{setFinalOnly(195);render()});
  await page.locator('#rc-lazaro-score').fill('200');
  await page.locator('button[onclick="guardarLazaroPartidaActual()"]').click();
  data=await db();assert.equal(data.sessions.filter(s=>s.type==='oficial').length,2);
  assert.equal(data.sessions.find(s=>s.date==='2026-11-29').parejas2026.lazaro[0],200);
  assert.equal(data.sessions.find(s=>s.id==='old-synthetic').games[0].finalOnly,165);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof abrirTorneoParejas==='function',{timeout:16000});
  const after=await db(),checkSat=after.sessions.find(s=>s.date==='2026-11-28');
  assert.equal(checkSat.parejas2026.rankings.length,2,'Importaciones preservadas por migrate y recarga');
  assert.equal(checkSat.parejas2026.lazaro[0],160,'Marcador compañero preservado');
  assert.equal(after.sessions.find(s=>s.date==='2026-11-29').parejas2026.lazaro[0],200);
  assert.equal(after.sessions.find(s=>s.id==='old-synthetic').games[0].finalOnly,165);
  assert(errors.length===0,'Errores no controlados del navegador: '+errors.join(' | '));
  console.log('PAREJAS-2026-PDF '+(process.env.BOWLING_BROWSER==='webkit'?'WEBKIT':'CHROMIUM')+' PASS · PDF local, revisión, 2 versiones, duplicado bloqueado, Celta, marcador Lázaro, domingo, recarga e historial previo intacto. Alertas previstas: '+dialogs.length);
  await ctx.close();
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{console.error(e);process.exitCode=1});
