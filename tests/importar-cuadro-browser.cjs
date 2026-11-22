'use strict';
/* 3.3.26 · Importar cuadro de enfrentamientos de Liga desde PDF real (generado con Chrome) en la PWA. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const srv=http.createServer((q,r)=>{let rel=decodeURIComponent(new URL(q.url,'http://x').pathname).replace(/^\/+/,'');if(!rel||rel.endsWith('/'))rel+='index.html';fs.readFile(path.join(root,rel),(e,v)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':mime[path.extname(rel)]||'application/octet-stream'});r.end(v)})});
const ME='CELTA XUNTA "B"';
const F1=`<h2>XL LIGA NACIONAL · PRIMERA DIVISIÓN MASCULINA · 1ª JORNADA</h2><p>SÁBADO</p><table border=1><tr><td>1º</td><td>PISTAS 1-2</td><td>HALCONES “A”</td><td>-</td><td>CELTA XUNTA “B”</td></tr><tr><td>1º</td><td>PISTAS 3-4</td><td>LEVANTE</td><td>-</td><td>TOMAHAWK</td></tr><tr><td>2º</td><td>PISTAS 5-6</td><td>CELTA XUNTA “B”</td><td>-</td><td>BOLICHES “B”</td></tr><tr><td>3º</td><td>PISTAS 7-8</td><td>COMARCAL “A”</td><td>-</td><td>CELTA XUNTA “B”</td></tr><tr><td>4º</td><td>PISTAS 1-2</td><td>CELTA XUNTA “B”</td><td>-</td><td>CAPITAL BOWLING “B”</td></tr></table><p>DOMINGO</p><table border=1><tr><td>5º</td><td>PISTAS 3-4</td><td>BAT ROLLAN-AT VALOR “B”</td><td>-</td><td>CELTA XUNTA “B”</td></tr><tr><td>6º</td><td>PISTAS 5-6</td><td>CELTA XUNTA “B”</td><td>-</td><td>LEVANTE</td></tr><tr><td>7º</td><td>PISTAS 7-8</td><td>TOMAHAWK</td><td>-</td><td>CELTA XUNTA “B”</td></tr></table>`;
const F3=`<p>Nº 1 · HALCONES "A" &nbsp; Nº 5 · CELTA XUNTA "B"</p><p>Nº 2 · COMARCAL "A" &nbsp; Nº 6 · CAPITAL BOWLING "B"</p><p>Nº 3 · LEVANTE &nbsp; Nº 7 · BAT ROLLAN "B"</p><p>Nº 4 · BOLICHES "B" &nbsp; Nº 8 · TOMAHAWK</p><p>1ª · 2A-3A · 8A-5A · 4A-1A · 6A-7A</p><p>2ª · 6A-1B · 4A-7B · 3A-5B · 8A-2B</p><p>3ª · 5A-1A · 2A-8A</p><p>4ª · 2A-5A</p><p>5ª · 5A-4A</p><p>6ª · 6A-5A</p><p>7ª · 5A-7A</p>`;
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base=`http://localhost:${srv.address().port}/`;const b=await chromium.launch();
 try{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cuadro-'));const gen=await b.newPage();
  const mk=async(name,html)=>{await gen.setContent('<meta charset=utf-8><body style="font-family:Arial;font-size:12px">'+html);const f=path.join(tmp,name);await gen.pdf({path:f,format:'A4'});return f};
  const pdf1=await mk('cuadro1.pdf',F1),pdf3=await mk('cuadro3.pdf',F3);
  await gen.setContent('<canvas id=c width=600 height=200></canvas><script>const x=c.getContext("2d");x.font="20px Arial";x.fillText("HALCONES A - CELTA XUNTA B",10,50)</script>');const img=await gen.locator('#c').screenshot();
  await gen.setContent(`<img src="data:image/png;base64,${img.toString('base64')}">`);const scan=path.join(tmp,'escaneado.pdf');await gen.pdf({path:scan});
  const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();const errs=[],dialogs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{dialogs.push(d.message());d.accept()});
  await p.goto(base);await p.waitForFunction(()=>typeof go==='function'&&!!window.MiBowlingEscritura&&!!window.MiBowlingCuadro,null,{timeout:30000});
  // Sin «Mi equipo» → aviso, nada cambia.
  await p.evaluate(()=>go('liga'));await p.setInputFiles('input[type=file][accept^="application/pdf"]',pdf1);await p.waitForSelector('.liga-cuadro-error');
  assert.match(await p.textContent('.liga-cuadro-error'),/Mi equipo/);
  await p.evaluate(()=>{ligaCuadroPreview=null;ligaSetMyTeam('CELTA XUNTA "B"')});
  // Resultado previo contra TOMAHAWK en la jornada 1 (enfrentamiento provisional 7): debe moverse con su rival.
  await p.evaluate(()=>{const m=liga32.matches.find(x=>x.round===1&&x.rival==='TOMAHAWK');m.players[0].scores=['210','190'];liga32Save();render()});
  // Formato 1 (tabla con nombres y pistas).
  await p.setInputFiles('input[type=file][accept^="application/pdf"]',pdf1);await p.waitForSelector('.liga-cuadro-list',{timeout:20000});
    const prev=await p.$$eval('.liga-cuadro-list li strong',a=>a.map(x=>x.textContent));
  const ORD1=['HALCONES "A"','BOLICHES "B"','COMARCAL "A"','CAPITAL BOWLING "B"','BAT ROLLAN "B"','LEVANTE','TOMAHAWK'];
  assert.deepEqual(prev,ORD1);assert.equal(await p.evaluate(()=>liga32.matches.find(x=>x.round===1&&x.match===1).orderPending),true,'vista previa: aún sin aplicar');
  await p.click('button:text-is("Aplicar")');
  const r1=await p.evaluate(()=>liga32.matches.filter(x=>x.round===1).sort((a,b)=>a.match-b.match).map(x=>({r:x.rival,l:x.lanes,p:!!x.orderPending,s:x.players[0].scores[0],d:x.date})));
  assert.deepEqual(r1.map(x=>x.r),ORD1);assert(r1.every(x=>!x.p));assert.equal(r1[0].l,'1-2');assert.equal(r1[6].s,'210','resultado conservado con su rival');assert.equal(r1[0].d,'2027-01-23');assert.equal(r1[6].d,'2027-01-24');
  assert.equal(new Set(await p.evaluate(()=>liga32.matches.filter(x=>x.round===1).map(x=>x.match))).size,7);
  // Formato 3 (numerado) en la jornada 2.
  await p.evaluate(()=>{liga33Choose(2,1)});await p.setInputFiles('input[type=file][accept^="application/pdf"]',pdf3);await p.waitForSelector('.liga-cuadro-list',{timeout:20000});await p.click('button:text-is("Aplicar")');
  const r2=await p.evaluate(()=>liga32.matches.filter(x=>x.round===2).sort((a,b)=>a.match-b.match).map(x=>x.rival));
  assert.deepEqual(r2,['TOMAHAWK','LEVANTE','HALCONES "A"','COMARCAL "A"','BOLICHES "B"','CAPITAL BOWLING "B"','BAT ROLLAN "B"']);
  // PDF escaneado (sin texto) → mensaje claro, sin cambios.
  const snap=await p.evaluate(()=>JSON.stringify(liga32));await p.setInputFiles('input[type=file][accept^="application/pdf"]',scan);await p.waitForSelector('.liga-cuadro-error',{timeout:20000});
  assert.match(await p.textContent('.liga-cuadro-error'),/imagen escaneada/);assert.equal(await p.evaluate(()=>JSON.stringify(liga32)),snap);
  await p.reload();await p.waitForFunction(()=>typeof go==='function'&&!!window.MiBowlingEscritura,null,{timeout:30000});
  assert.deepEqual(await p.evaluate(()=>liga32.matches.filter(x=>x.round===1).sort((a,b)=>a.match-b.match).map(x=>x.rival)),ORD1,'persistencia');
  await p.evaluate(()=>{go('liga');liga33Choose(1,1)});await p.setInputFiles('input[type=file][accept^="application/pdf"]',pdf1);await p.waitForSelector('.liga-cuadro-list',{timeout:20000});await p.locator('.liga-cuadro-list').scrollIntoViewIfNeeded();await p.screenshot({path:'/tmp/cuadro.png'});
  assert.deepEqual(errs,[]);console.log('IMPORTAR CUADRO PASS · PDF real: tabla con nombres y pistas, formato numerado, escaneado, resultados conservados, persistencia');
 }finally{await b.close();srv.close()}})().catch(e=>{console.error(e);process.exit(1)});
