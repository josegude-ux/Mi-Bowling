'use strict';
/* CP032 · NEW ONLY: journal, crash simulation, re-open and data isolation; one iPhone-sized viewport. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8'),m=sw.match(/^const HASHES=(\{.+\});$/m);
assert(m,'SW manifest missing');const hashes=JSON.parse(m[1]);
assert.equal(Object.keys(hashes).length,71,'CP032 updated manifest requires 71 integrity entries');
for(const [url,expected] of Object.entries(hashes)){
 let p=url.replace(/^\.\//,'').split('?')[0];if(!p||p.endsWith('/'))p+='index.html';
 const filename=path.resolve(root,p);assert(filename.startsWith(root+path.sep),'Traversal');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'),expected,'Integrity '+url);
}
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')}catch{res.writeHead(400);return res.end()}
 if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b)});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/?cp032lab=ficticio';
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const loaded=async()=>{
   await page.waitForSelector('.cp021-root .screen');
   await page.waitForFunction(()=>!!window.__CP015_LAB&&window.MiBowlingCP032Journal?.writesProduction===false&&window.MiBowlingCP032Views?.writesProduction===false);
  };
  await page.goto(url,{waitUntil:'domcontentloaded'});await loaded();
  await page.locator('#info').click();
  assert.equal(await page.locator('#cp032-save').count(),1);
  await page.locator('#cp032-save').click();
  await page.waitForFunction(()=>document.querySelector('#cp032-status')?.textContent.includes('rev 1'));
  await page.locator('#io-close').click();
  await page.locator('[data-mode="cantidad"]').click();
  await page.locator('#quantity-grid [data-key="7"]').click();await page.locator('#submit').click();
  await page.locator('#info').click();await page.locator('#cp032-save').click();
  await page.waitForFunction(()=>document.querySelector('#cp032-status')?.textContent.includes('rev 2'));
  await page.reload({waitUntil:'domcontentloaded'});await loaded();
  await page.locator('#info').click();await page.locator('#cp032-reopen').click();
  await page.waitForFunction(()=>document.querySelector('#cp032-status')?.textContent.includes('Reabierta rev 2'));
  const count=await page.evaluate(()=>window.__CP015_LAB.snapshot());
  assert.equal(count.document.sessions[0].games[0].rolls[0].count,7);
  assert.equal(count.document.sessions[0].games[0].rolls[0].pinIds,null);
  assert.equal(count.document.sessions[0].games[0].rolls[0].pinDetail,'count');
  const prepared=await page.evaluate(async()=>{
   const api=window.MiBowlingCP032Journal,old=await api.read(),doc=JSON.parse(JSON.stringify(old.document));
   doc.sessions[0].title='Ficticia crash prepare';
   let error='';try{await api.save(doc,old.revision,{failAt:'afterPrepare'})}catch(e){error=e.message}
   const state=await api.recover(),after=await api.read();
   return {error,state,before:old,after};
  });
  assert.match(prepared.error,/afterPrepare/);
  assert.equal(prepared.state.mode,'rolled-back-pending');
  assert.deepEqual(prepared.after,prepared.before,'Prepared crash lost history');
  const committed=await page.evaluate(async()=>{
   const api=window.MiBowlingCP032Journal,old=await api.read(),doc=JSON.parse(JSON.stringify(old.document));
   doc.sessions[0].title='Ficticia crash commit';
   let error='';try{await api.save(doc,old.revision,{failAt:'afterCommit'})}catch(e){error=e.message}
   const restored=await api.recover(),now=await api.read(),reverted=await api.rollback(now.revision),after=await api.read();
   return {error,mode:restored.mode,now,reverted,after,before:old};
  });
  assert.match(committed.error,/afterCommit/);assert.equal(committed.mode,'committed');
  assert.equal(committed.now.document.sessions[0].title,'Ficticia crash commit');
  assert.deepEqual(committed.after.document,committed.before.document,'Rollback changed source');
  assert(committed.reverted.revision>committed.now.revision,'Rollback revision did not advance');
  const backup=await page.evaluate(async()=>{
   const api=window.MiBowlingCP032Journal,exported=await api.exportCopy();
   const parsed=api.parseCopy(exported),old=await api.read();
   let rejected=false;try{api.parseCopy(JSON.stringify({schema:'cp032-synthetic-journal-v1',revision:1,document:{version:3,sessions:[{id:'REAL-ACCOUNT',games:[]}]}}))}catch{rejected=true}
   return {parsed,old,rejected,storage:Object.keys(localStorage)};
  });
  assert.equal(backup.parsed.sessions[0].games[0].rolls[0].pinIds,null);
  assert(backup.rejected,'Non-synthetic import accepted');
  assert(backup.storage.every(k=>!k.startsWith('mi-bowling-')),'Production keys touched');
  await page.locator('#io-close').click();
  await page.locator('#undo').click();
  await page.locator('[data-mode="final"]').click();
  for(const digit of ['2','7','8'])await page.locator('#final-pad [data-digit="'+digit+'"]').click();
  await page.locator('#submit').click();
  await page.locator('#info').click();await page.locator('#cp032-save').click();
  await page.waitForFunction(()=>document.querySelector('#cp032-status')?.textContent.includes('rev 5'));
  const final=await page.evaluate(async()=>{
   const api=window.MiBowlingCP032Journal,snapshot=await api.read();
   const project=window.MiBowlingCP032Views.project(snapshot.document);
   return {entry:snapshot.document.sessions[0].games[0],stats:project.summary,session:project.sessions[0],keys:Object.keys(localStorage)};
  });
  assert.equal(final.entry.entryKind,'final_only');assert.equal(final.entry.finalOnlyScore,278);
  assert.equal(final.entry.rolls.length,0);assert.equal(final.stats.averageScore,278);
  assert.equal(final.stats.frameAnalysisEligibleGames,0);assert.equal(final.stats.pinPatternEligibleGames,0);
  assert.equal(final.session.games[0].framesAvailable,false);
  assert(final.keys.every(k=>!k.startsWith('mi-bowling-')));
  assert(!errors.length,'Runtime '+errors.join(';'));
  await ctx.close();
  // New isolated context with existing v2 key.  The CP032 journal must refuse all access.
  const protectedContext=await browser.newContext({viewport:{width:390,height:844}});
  const protectedPage=await protectedContext.newPage();
  const fixture={version:2,hand:'diestro',balls:[],patterns:[],sessions:[]};
  await protectedPage.addInitScript(v=>localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(v)),fixture);
  await protectedPage.goto(url,{waitUntil:'domcontentloaded'});
  await protectedPage.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled===false&&!!window.MiBowlingCP032Journal);
  const result=await protectedPage.evaluate(async()=>{
   let message='';try{await window.MiBowlingCP032Journal.read()}catch(e){message=e.message}
   return {message,actual:localStorage.getItem('mi-bowling-analitica-v2')};
  });
  assert.match(result.message,/CP032_EXISTING_DATA_PROTECTED/);
  assert.deepEqual(JSON.parse(result.actual),fixture);
  await protectedContext.close();
  console.log('CP032 JOURNAL PASS · durable synthetic reopen, v2 preserved, quantity no invented pins, final-only no frames, rollback and faults, private keys blocked, 71/71 integrity.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error('CP032 JOURNAL FAIL',e);process.exitCode=1;try{server.close()}catch{}});
