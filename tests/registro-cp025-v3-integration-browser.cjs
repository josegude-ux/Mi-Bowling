'use strict';
/* CP025: only NEW functional v3 adapter in EXISTING PWA, fictional localhost origin.
 * Historical CP021–CP024 suites are not rerun. No real keys, no photos, no main.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const calc=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const worker=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
const match=worker.match(/^const HASHES=(\{.*\});$/m);
assert(match,'CP025_MANIFEST_MISSING');
const manifest=JSON.parse(match[1]);
assert.equal(Object.keys(manifest).length,68,'CP025_EXPECT_68_ASSETS');
for(const [name,hash] of Object.entries(manifest)){
 const pathname=new URL(name,'http://127.0.0.1/').pathname;
 let rel=decodeURIComponent(pathname).replace(/^\/+/, '');if(!rel||rel.endsWith('/'))rel+='index.html';
 assert.equal(calc(fs.readFileSync(path.join(ROOT,rel))),hash,'CP025_ASSET_HASH_'+name);
}
const v3Path=path.join(ROOT,'lab/registro-cp021/cp025-v3-adapter.js');
assert(fs.existsSync(v3Path),'CP025_ADAPTER_MISSING');
const entry=fs.readFileSync(path.join(ROOT,'lab/registro-cp021/cp021-entry.js'),'utf8');
assert(entry.includes('cp025-v3-adapter.js'),'CP025_INTEGRATION_MISSING');
assert(entry.includes("new URLSearchParams(loc.search).get('cp021lab')==='ficticio'"),'CP025_ORIGIN_GUARD_LOST');
const mime={'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
let notFound=[];
const server=http.createServer((req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1');let rel=decodeURIComponent(u.pathname).replace(/^\/+/, '');
  if(!rel||rel.endsWith('/'))rel+='index.html';
  const file=path.resolve(ROOT,rel);
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
  const data=fs.readFileSync(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(rel)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
 }catch(e){notFound.push(req.url);res.writeHead(404).end()}
});
const start=()=>new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const stop=()=>new Promise(ok=>server.close(ok));
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-cp025-fixture-'));
 let context;
 const offOrigin=[],pageErrors=[];
 try{
  await start();const origin='http://127.0.0.1:'+server.address().port;
  context=await chromium.launchPersistentContext(dir,{headless:true,args:['--no-sandbox'],viewport:{width:390,height:844},serviceWorkers:'block',isMobile:true,hasTouch:true});
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:)/,route=>{offOrigin.push(route.request().url());return route.abort()});
  let page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(origin+'/?cp021lab=ficticio',{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB&&!!document.querySelector('.cp021-root'),null,{timeout:30000});
  const initially=await page.evaluate(async()=>({module:typeof window.BowlingCp025V3, databases:(await indexedDB.databases()).map(d=>d.name).filter(n=>n?.startsWith('mi-bowling-cp018-synthetic-')),contractEnabled:window.MiBowlingRegistroCP021.enabled}));
  assert.equal(initially.module,'undefined','CP025_MODULE_MUST_BE_LAZY');
  assert.deepEqual(initially.databases,[],'CP025_MUST_NOT_TOUCH_IDB_ON_START');
  assert.equal(initially.contractEnabled,true);
  await page.locator('#info').click();
  const button=page.locator('#cp025-v3-promote');
  assert.equal(await button.count(),1,'CP025_EXPLICIT_BUTTON_NOT_PRESENT');
  await button.click();
  await page.waitForFunction(()=>document.querySelector('#cp025-v3-status')?.textContent?.includes('Contrato v3 validado'),null,{timeout:25000});
  const result=await page.evaluate(async()=>{
   const entry=window.MiBowlingRegistroCP021,doc=await entry.readV3Synthetic();
   const store=new window.MiBowlingCP018.CP018Store(),raw=await store.row('sources'),backup=JSON.parse(await store.exportBackup());
   const state=await store.read();const A=window.BowlingCp014Compat;
   return {doc,raw,backup,state,score:A.summary(doc).averageScore,version:window.BowlingCp025V3?.version,
    keys:['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-liga-v1','mi-bowling-ball-selection-v1'].map(k=>localStorage.getItem(k))};
  });
  assert.equal(result.version,3);assert.equal(result.doc.version,3);assert.equal(result.score,289);
  assert.equal(result.doc.sessions.length,2);assert.equal(result.doc.balls.length,2);assert.equal(result.doc.patterns.length,2);
  assert.deepEqual(result.doc.sessions.flatMap(s=>s.games.map(g=>g.entryKind)),['rolls','final_only']);
  assert.deepEqual(result.doc.sessions.map(s=>s.type),['entrenamiento','oficial']);
  assert.equal(result.state.mode,'shadow-v3');assert.equal(result.state.recoveryRequired,false);
  assert.equal(result.backup.raw.legacy,result.raw.legacy);assert.equal(result.backup.raw.modern,result.raw.modern);
  assert.equal(result.backup.raw.legacy!==null,true);assert.deepEqual(result.keys,[null,null,null,null]);
  const previous=await page.evaluate(()=>window.MiBowlingRegistroCP021.promoteV3Synthetic());
  const again=await page.evaluate(()=>window.MiBowlingRegistroCP021.promoteV3Synthetic());
  assert.equal(previous.transaction,again.transaction,'CP025_PROMOTION_NOT_IDEMPOTENT');
  assert.equal(previous.shadowSeal,again.shadowSeal,'CP025_SHADOW_CHANGED');
  console.log('CP025 V3 REAL_INTEGRATION PASS '+JSON.stringify({version:result.doc.version,games:2,average:289,metadata:[2,2],idempotent:true,fixtureOnly:true}));

  // Even a protected key appearing after the initial gate must block new writes.
  const guard=await page.evaluate(async()=>{
   localStorage.setItem('mi-bowling-analitica-v2','cp025-fake-injected-guard');
   try{await window.MiBowlingRegistroCP021.promoteV3Synthetic();return 'UNEXPECTED_SUCCESS'}
   catch(e){return e.message}
   finally{localStorage.removeItem('mi-bowling-analitica-v2')}
  });
  assert.equal(guard,'CP025_EXISTING_DATA_PROTECTED');
  const current=await page.evaluate(()=>window.MiBowlingRegistroCP021.readV3Synthetic());
  assert.equal(current.sessions.length,2);
  await page.reload({waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB,null,{timeout:30000});
  const opened=await page.evaluate(async()=>({doc:await window.MiBowlingRegistroCP021.readV3Synthetic(),active:(await window.MiBowlingRegistroCP021.inspectSynthetic()).mode}));
  assert.equal(opened.doc.sessions.length,2);assert.equal(opened.active,'shadow-v3');
  const rollback=await page.evaluate(()=>window.MiBowlingRegistroCP021.rollbackV3Synthetic());
  assert.equal(rollback.mode,'dual-read');assert.equal(rollback.stats.averageScore,289);
  const after=await page.evaluate(async()=>{const s=new window.MiBowlingCP018.CP018Store();return {raw:await s.row('sources'),hasBackup:!!(await s.row('backup:'+String((await s._identity()).txid))),hasShadow:!!(await s.row('shadow:'+String((await s._identity()).txid)))}});
  assert.equal(after.raw.legacy,result.raw.legacy);assert.equal(after.raw.modern,result.raw.modern);
  assert(after.hasBackup&&after.hasShadow,'CP025_ROLLBACK_LOST_RECOVERY_ASSETS');
  console.log('CP025 REOPEN_ROLLBACK PASS '+JSON.stringify({reopen:true,mode:rollback.mode,average:rollback.stats.averageScore,protectedGuard:true,sourcesIntact:true}));

  // A different browser context with no opt-in must not load v3 nor expose the panel.
  const other=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
   const otherCtx=await other.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   const normal=await otherCtx.newPage();
   await normal.goto(origin+'/',{waitUntil:'load',timeout:30000});
   await normal.waitForFunction(()=>!!window.MiBowlingRegistroCP021,null,{timeout:30000});
   const closed=await normal.evaluate(async()=>{
    let error=null;try{await window.MiBowlingRegistroCP021.promoteV3Synthetic()}catch(e){error=e.message}
    return {enabled:window.MiBowlingRegistroCP021.enabled,adapter:typeof window.BowlingCp025V3,error,button:!!document.querySelector('#cp025-v3-promote')};
   });
   assert.equal(closed.enabled,false);assert.equal(closed.adapter,'undefined');assert.equal(closed.error,'CP025_LAB_ONLY');assert.equal(closed.button,false);
   await otherCtx.close();
  }finally{await other.close()}
  assert.deepEqual(notFound,[],'CP025_HTTP_404');assert.deepEqual(offOrigin,[],'CP025_EXTERNAL_FETCH');assert.deepEqual(pageErrors,[],'CP025_PAGE_ERRORS');
  console.log('CP025 FINAL PASS: actual PWA LAB v3 module lazy, backup, read, IDB, idempotency, guard, reload, rollback, normal PWA disabled');
 }finally{if(context)await context.close();if(server.listening)await stop();fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error('CP025 RESULT FAIL:',e.stack||e);console.error('CP025 ERROR DIAGNOSTIC '+JSON.stringify({notFound,offOrigin,pageErrors}));process.exitCode=1});
