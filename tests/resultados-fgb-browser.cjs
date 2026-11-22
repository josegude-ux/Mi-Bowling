'use strict';
/* 3.3.28 · Resultados oficiales FGB en Chrome con PDF reales (no incluidos en el repositorio).
 * Uso: FGB_PDF_DIR=/ruta/a/los/pdf node tests/resultados-fgb-browser.cjs — sin la carpeta, se omite. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');const {chromium}=require('playwright');
const dir=process.env.FGB_PDF_DIR||'/mnt/user-data/uploads';if(!fs.existsSync(dir)){console.log('resultados-fgb-browser: omitido (sin PDF)');process.exit(0)}
const pdfs=fs.readdirSync(dir).filter(f=>f.endsWith('.pdf')).map(f=>path.join(dir,f));
const root=path.resolve(__dirname,'..');const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,r)=>{let rel=decodeURIComponent(new URL(q.url,'http://x').pathname).replace(/^\/+/,'');if(!rel||rel.endsWith('/'))rel+='index.html';fs.readFile(path.join(root,rel),(e,v)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':mime[path.extname(rel)]||'application/octet-stream'});r.end(v)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch();
 try{const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/`);await p.waitForFunction(()=>typeof go==='function'&&!!window.MiBowlingEscritura&&!!window.MiBowlingFGB,null,{timeout:30000});
  await p.evaluate(()=>go('calendario'));await p.click('button:text-is("Resultados oficiales")');
  await p.setInputFiles('input[type=file][onchange^="fbImport"]',pdfs);await p.waitForSelector('button:text-matches("^Guardar")',{timeout:60000});
  const prev=await p.textContent('.fb-card:nth-of-type(2)');console.log(prev.replace(/\s+/g,' ').slice(0,700));
  await p.click('button:text-matches("^Guardar")');await p.waitForSelector('.fb-table',{timeout:20000});
  const st=await p.evaluate(()=>({docs:liga32.federacion.docs.map(d=>d.kind),players:Object.keys(liga32.federacion.players).length}));console.log(JSON.stringify(st));
  const txt=(await p.textContent('main')).replace(/\s+/g,' ');
  for(const s of ['Raul Gude','Jose Gude','Reydnier Chavez','Manuel Novo','Clasificación general','PAREJAS GALLEGO 2026-2027','2328','1101 + 1227','1911','Pistas 4A → 2A'])assert(txt.includes(s),'falta: '+s);
  assert(!txt.includes('SOLBOWLING 2007'),'solo Celta por defecto');
  const order=await p.$$eval('.fb-card h2',a=>a.map(x=>x.textContent));console.log(order.join(' | '));assert(order.indexOf('INSCRIPCION 1er CIRCUITO 2026-2027')<order.indexOf('Clasificación general'),'próximas primero');assert(order.lastIndexOf('COPA PRESIDENTE 2026-2027')>order.indexOf('PAREJAS GALLEGO 2026-2027'),'jugadas al final');
  await p.screenshot({path:'/tmp/fgb1.png',fullPage:false});await p.evaluate(()=>window.scrollTo(0,900));await p.screenshot({path:'/tmp/fgb2.png'});
  // Reimportar no duplica.
  await p.setInputFiles('input[type=file][onchange^="fbImport"]',pdfs);await p.waitForSelector('button:text-matches("^Guardar")',{timeout:60000});await p.click('button:text-matches("^Guardar")');
  assert.equal(await p.evaluate(()=>liga32.federacion.docs.length),st.docs.length,'sin duplicados');
  await p.reload();await p.waitForFunction(()=>typeof go==='function'&&!!window.MiBowlingEscritura,null,{timeout:30000});await p.evaluate(()=>go('inicio'));
  assert.match((await p.textContent('main')).replace(/\s+/g,' '),/Resultados oficiales/);await p.screenshot({path:'/tmp/fgb-home.png'});
  assert.deepEqual(errs,[]);console.log('RESULTADOS FGB PASS · '+pdfs.length+' PDF reales, '+st.docs.length+' documentos, '+st.players+' jugadores');
 }finally{await b.close();srv.close()}})().catch(e=>{console.error(e);process.exit(1)});
