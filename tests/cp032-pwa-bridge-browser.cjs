'use strict';
/* CP032 NEW: end-to-end real-shaped synthetic PWA bridge, league, sealed backup/restore, single viewport. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),manifest=JSON.parse(sw.match(/^const HASHES=(\{.+\});$/m)?.[1]||'null');
assert(manifest&&Object.keys(manifest).length===71,'CP032 expected 71 resources');
for(const [key,digest] of Object.entries(manifest)){
 let rel=key.replace(/^\.\//,'').split('?')[0];
 if(!rel||rel.endsWith('/'))rel+='index.html';
 const file=path.resolve(root,rel);
 assert(file.startsWith(root+path.sep),'traversal');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),digest,'CP032 hash '+key);
}
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')}catch{res.writeHead(400);return res.end()}
 if(!rel||rel.endsWith('/'))rel+='index.html';
 const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b)});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/?cp032lab=ficticio';
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,serviceWorkers:'allow'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  async function ready(){
   await page.waitForSelector('.cp021-root .screen',{timeout:30000});
   await page.waitForFunction(()=>!!window.__CP015_LAB&&window.MiBowlingRegistroCP021?.enabled&&
      !!window.MiBowlingCP032PWA&&!!window.MiBowlingCP032Fixture&&!!window.MiBowlingCP032Journal,{timeout:30000});
  }
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await ready();
  await page.locator('#info').click();
  assert.equal(await page.locator('#cp032-pwa-load').count(),1);
  await page.locator('#cp032-pwa-load').click();
  await page.waitForFunction(()=>document.querySelector('#cp032-pwa-status')?.textContent.includes('Muestra PWA ficticia'));
  const source=await page.evaluate(()=>{
   const doc=JSON.parse(window.__CP015_LAB.exportJSON()),v=window.MiBowlingCP032PWA.read(doc);
   const league=v.league[0].players;
   return {sessions:v.sessions.length,average:v.totals.average,count:v.totals.count,
    links:league[0].scores.map(x=>x.score),quick:league[2].scores[0].score,missing:league[3].scores[0].score,
    retired:v.sourceMetadata.balls[1].retired,photos:v.sourceMetadata.photos.length,pdfs:v.sourceMetadata.pdfs.length,
    original:v.legacyExact,raw:JSON.parse(doc.cp032Mirror.raw['mi-bowling-analitica-v2'])};
  });
  assert.equal(source.sessions,4);assert.equal(source.count,4);assert.equal(source.average,58.75);
  assert.deepEqual(source.links,[0,225]);assert.equal(source.quick,201);assert.equal(source.missing,null);
  assert(source.retired&&source.photos===1&&source.pdfs===1);
  assert.deepEqual(source.original,source.raw,'v2 changed');
  await page.locator('#cp032-pwa-inspect').click();
  await page.waitForFunction(()=>document.querySelector('#cp032-pwa-status')?.textContent.includes('media 58.75'));
  await page.locator('#cp032-save').click();
  await page.waitForFunction(()=>document.querySelector('#cp032-status')?.textContent.includes('rev 1'));
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  await page.locator('#info').click();await page.locator('#cp032-reopen').click();
  await page.waitForFunction(()=>document.querySelector('#cp032-status')?.textContent.includes('Reabierta rev 1'));
  const reloaded=await page.evaluate(()=>{
   const doc=JSON.parse(window.__CP015_LAB.exportJSON());
   return {rev:doc.cp032Mirror?.schema,history:window.MiBowlingCP032PWA.read(doc).sessions.length,
    countOnly:doc.sessions[0].games.find(g=>g.id==='cp015-fake-count-complete')?.rolls.map(r=>r.pinIds),
    final:doc.sessions[0].games.find(g=>g.id==='cp015-fake-final')};
  });
  assert.equal(reloaded.rev,'mi-bowling-cp032-pwa-fixture-v1');
  assert.equal(reloaded.history,4);
  assert.equal(reloaded.countOnly.length,20);
  assert(reloaded.countOnly.every(x=>x===null),'Unknown pin identities manufactured');
  assert.equal(reloaded.final.finalOnlyScore,225);
  assert.equal(reloaded.final.rolls.length,0);
  const downloadPromise=page.waitForEvent('download',{timeout:20000});
  await page.locator('#cp032-pwa-export').click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/SOLO-FICTICIO/);
  const backup=fs.readFileSync(await download.path(),'utf8');
  await page.evaluate(()=>{
   const doc=JSON.parse(window.__CP015_LAB.exportJSON());
   doc.sessions[0].title='CAMBIO FICTICIO TEMPORAL';
   window.__CP015_LAB.reopenJSON(JSON.stringify(doc));
  });
  await page.locator('#cp032-save').click();
  await page.waitForFunction(()=>document.querySelector('#cp032-status')?.textContent.includes('rev 2'));
  const edited=await page.evaluate(()=>window.MiBowlingCP032Journal.read().then(x=>x.document.sessions[0].title));
  assert.equal(edited,'CAMBIO FICTICIO TEMPORAL');
  const tampered=JSON.parse(backup);tampered.payload.modern.sessions[0].title='MANIPULACION';
  await page.locator('#cp032-pwa-input').setInputFiles({name:'alterado.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(tampered))});
  await page.waitForFunction(()=>document.querySelector('#cp032-pwa-status')?.textContent.includes('restauración rechazada'));
  assert.equal(await page.evaluate(()=>window.MiBowlingCP032Journal.read().then(x=>x.revision)),2);
  await page.locator('#cp032-pwa-input').setInputFiles({name:'copia-ficticia.json',mimeType:'application/json',buffer:Buffer.from(backup)});
  await page.waitForFunction(()=>document.querySelector('#cp032-pwa-status')?.textContent.includes('Restauración ficticia confirmada'));
  const restored=await page.evaluate(async()=>{
   const journal=await window.MiBowlingCP032Journal.read(),view=window.MiBowlingCP032PWA.read(journal.document);
   return {revision:journal.revision,title:journal.document.sessions[0].title,avg:view.totals.average,
    league:view.league[0].players[0].scores.map(x=>x.score),
    retired:view.sourceMetadata.balls[1].retired,
    photoCount:view.sourceMetadata.photos.length,pdfCount:view.sourceMetadata.pdfs.length,
    storedKeys:Object.keys(localStorage)};
  });
  assert.equal(restored.revision,3);
  assert.equal(restored.title,'Puntuación de liga FICTICIA');assert.equal(restored.avg,58.75);
  assert.deepEqual(restored.league,[0,225]);assert(restored.retired&&restored.photoCount===1&&restored.pdfCount===1);
  assert(restored.storedKeys.every(k=>!k.startsWith('mi-bowling-')),'Production storage touched');
  assert.equal(errors.length,0,'Runtime '+errors.join(';'));
  await ctx.close();
  console.log('CP032 PWA E2E PASS · localhost fictional v2/v3, IDB journal, league links, scores, sealed backup tampering rejected, full restore, 71/71 SHA256, zero personal writes.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error('CP032 PWA E2E FAIL',e);process.exitCode=1;try{server.close()}catch{}});
