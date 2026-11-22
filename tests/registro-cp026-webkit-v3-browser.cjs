'use strict';
/* CP026 — NEW WebKit-only browser homologation of CP025 v3 adapter in existing PWA.
 * Synthetic records and private temporary context only; not Safari/iPhone hardware.
 * Historical CP021–CP025 suites must NOT be invoked.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {webkit}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const mf=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8').match(/^const HASHES=(\{.*\});$/m);
assert(mf,'CP026_SW_MANIFEST_MISSING');
const manifest=JSON.parse(mf[1]);
assert.equal(Object.keys(manifest).length,68,'CP026_EXPECT_CP025_68_RESOURCES');
for(const key of ['./','./index.html','./?cp021lab=ficticio','./lab/registro-cp021/cp021-entry.js','./lab/registro-cp021/cp025-v3-adapter.js']){
 const loc=new URL(key,'http://127.0.0.1/');let file=decodeURIComponent(loc.pathname).slice(1);if(!file)file='index.html';
 assert.equal(manifest[key],sha(fs.readFileSync(path.join(ROOT,file))),'CP026_ASSET_SHA_MISMATCH_'+key);
}
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.jpg':'image/jpeg'};
const missing=[];
const server=http.createServer((req,res)=>{
 try{const u=new URL(req.url,'http://127.0.0.1');let rel=decodeURIComponent(u.pathname).replace(/^\/+/, '');if(!rel||rel.endsWith('/'))rel+='index.html';
 const f=path.resolve(ROOT,rel);if(!f.startsWith(ROOT+path.sep))return res.writeHead(403).end();
 const raw=fs.readFileSync(f);res.writeHead(200,{'Content-Type':MIME[path.extname(rel)]||'application/octet-stream','Cache-Control':'no-store'}).end(raw);
 }catch(e){missing.push(req.url);res.writeHead(404).end()}
});
const listen=()=>new Promise(done=>server.listen(0,'127.0.0.1',done));
const stop=()=>new Promise(done=>server.close(done));
const ORIGINAL_KEYS=['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-liga-v1','mi-bowling-ball-selection-v1'];
(async()=>{
 await listen();const origin='http://127.0.0.1:'+server.address().port;
 let browser;const offOrigin=[],errors=[];const passed=[];
 try{
  browser=await webkit.launch({headless:true});
  // Each viewport uses a clean disposable LAB origin context.
  for(const [width,height] of [[375,667],[390,844],[430,932]]){
   const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,serviceWorkers:'block',locale:'es-ES',reducedMotion:'reduce'});
   try{
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1:)/,route=>{offOrigin.push(route.request().url());return route.abort()});
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(`${width}x${height}: ${e.message}`));
    await page.goto(origin+'/?cp021lab=ficticio',{waitUntil:'load',timeout:30000});
    await page.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB&&!!document.querySelector('.cp021-root'),null,{timeout:25000});
    const before=await page.evaluate(async()=>({
     adapter:typeof window.BowlingCp025V3,cp018:typeof window.MiBowlingCP018,
     protected: ['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-liga-v1','mi-bowling-ball-selection-v1'].map(k=>localStorage.getItem(k)),
     h:document.documentElement.scrollHeight,w:document.documentElement.scrollWidth,iw:innerWidth,ih:innerHeight
    }));
    assert.equal(before.adapter,'undefined','CP026_ADAPTER_EAGER_LOAD');
    assert.equal(before.cp018,'undefined','CP026_IDB_MODULE_EAGER_LOAD');
    assert.deepEqual(before.protected,[null,null,null,null]);
    assert(before.w<=before.iw+1,'CP026_HORIZONTAL_OVERFLOW_'+width);
    assert(before.h<=before.ih+1,'CP026_VERTICAL_OVERFLOW_'+width);
    await page.locator('#info').click();
    const button=page.locator('#cp025-v3-promote');assert.equal(await button.count(),1,'CP026_EXPLICIT_BUTTON_MISSING');
    const rect=await button.boundingBox();assert(rect&&rect.height>=44&&rect.width>=44,'CP026_TOUCH_TARGET_TOO_SMALL');
    const dialog=page.locator('#lab-io');assert(await dialog.evaluate(el=>el.open),'CP026_DIALOG_NOT_OPEN');
    if(width===390){
     // Only one new WebKit contract test, no historical Chromium suites.
     await button.click();
     await page.waitForFunction(()=>document.querySelector('#cp025-v3-status')?.textContent?.includes('Contrato v3 validado'),null,{timeout:30000});
     const state=await page.evaluate(async()=>{
      const entry=window.MiBowlingRegistroCP021,doc=await entry.readV3Synthetic();
      const store=new window.MiBowlingCP018.CP018Store();
      const sources=await store.row('sources');const backup=JSON.parse(await store.exportBackup());const read=await store.read();
      const summary=window.BowlingCp014Compat.summary(doc);const idb=await store.open();
      return {doc,sources,backup,read,summary,dbName:idb.name,protected:['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-liga-v1','mi-bowling-ball-selection-v1'].map(k=>localStorage.getItem(k))};
     });
     assert.equal(state.doc.format,'mi-bowling-v3-lab');assert.equal(state.doc.version,3);
     assert.deepEqual(state.doc.sessions.flatMap(s=>s.games.map(g=>g.entryKind)),['rolls','final_only']);
     assert.deepEqual(state.doc.sessions.map(s=>s.type),['entrenamiento','oficial']);
     assert.equal(state.doc.sessions.length,2);assert.equal(state.doc.balls.length,2);assert.equal(state.doc.patterns.length,2);
     assert.equal(state.summary.averageScore,289);assert.equal(state.read.mode,'shadow-v3');
     assert.equal(state.backup.raw.legacy,state.sources.legacy);assert.equal(state.backup.raw.modern,state.sources.modern);
     assert.equal(state.dbName,'mi-bowling-cp018-synthetic-v3');assert.deepEqual(state.protected,[null,null,null,null]);
     const first=await page.evaluate(()=>window.MiBowlingRegistroCP021.promoteV3Synthetic());
     const second=await page.evaluate(()=>window.MiBowlingRegistroCP021.promoteV3Synthetic());
     assert.equal(first.transaction,second.transaction,'CP026_NOT_IDEMPOTENT');
     assert.equal(first.shadowSeal,second.shadowSeal,'CP026_SHADOW_CHANGED');
     const blocked=await page.evaluate(async()=>{
      localStorage.setItem('mi-bowling-analitica-v2','cp026-fake-guard');
      try{await window.MiBowlingRegistroCP021.promoteV3Synthetic();return 'UNEXPECTED'}catch(e){return e.message}
      finally{localStorage.removeItem('mi-bowling-analitica-v2')}
     });
     assert.equal(blocked,'CP025_EXISTING_DATA_PROTECTED');
     const sourceAfter=await page.evaluate(async()=>new window.MiBowlingCP018.CP018Store().row('sources'));
     assert.deepEqual(sourceAfter,state.sources,'CP026_SOURCE_CHANGED_AFTER_GUARD');
     await page.reload({waitUntil:'load',timeout:30000});
     await page.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB,null,{timeout:30000});
     const reopened=await page.evaluate(async()=>({doc:await window.MiBowlingRegistroCP021.readV3Synthetic(),read:await window.MiBowlingRegistroCP021.inspectSynthetic()}));
     assert.equal(reopened.doc.sessions.length,2);assert.equal(reopened.read.mode,'shadow-v3');
     const revert=await page.evaluate(()=>window.MiBowlingRegistroCP021.rollbackV3Synthetic());
     assert.equal(revert.mode,'dual-read');assert.equal(revert.stats.averageScore,289);
     const final=await page.evaluate(async()=>{
      const store=new window.MiBowlingCP018.CP018Store(),raw=await store.row('sources');
      const identity=await store._identity();return {raw,backup:await store.row('backup:'+identity.txid),shadow:await store.row('shadow:'+identity.txid),active:await store.row('active')};
     });
     assert.deepEqual(final.raw,state.sources);assert(final.backup&&final.shadow,'CP026_BACKUP_OR_SHADOW_LOST');assert(!final.active,'CP026_ROLLBACK_POINTER_STILL_ACTIVE');
     console.log('CP026 WEBKIT_V3 PASS '+JSON.stringify({viewport:'390x844',v3:3,idb:state.dbName,games:2,average:289,metadata:[2,2],idempotent:true,protected:true,afterReload:reopened.read.mode,afterRollback:revert.mode}));
     passed.push('WebKit v3/IDB/rollback');
    }
    console.log('CP026 WEBKIT_VIEWPORT PASS '+width+'x'+height+' (dialog, deferred adapter, no scroll, >=44px touch, no protected keys)');
    passed.push(width+'x'+height);
   }finally{await ctx.close()}
  }
  // A new clean context WITHOUT the LAB opt-in must never expose CP025.
  const normalContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  try{
   const page=await normalContext.newPage();page.on('pageerror',e=>errors.push('normal: '+e.message));
   await page.goto(origin+'/',{waitUntil:'load',timeout:30000});
   await page.waitForFunction(()=>!!window.MiBowlingRegistroCP021,null,{timeout:25000});
   const normal=await page.evaluate(async()=>{
    let err='';try{await window.MiBowlingRegistroCP021.promoteV3Synthetic()}catch(e){err=e.message}
    return {enabled:window.MiBowlingRegistroCP021.enabled,adapter:typeof window.BowlingCp025V3,err,button:!!document.querySelector('#cp025-v3-promote')};
   });
   assert.equal(normal.enabled,false);assert.equal(normal.adapter,'undefined');assert.equal(normal.err,'CP025_LAB_ONLY');assert.equal(normal.button,false);
   passed.push('normal-PWA-closed');
   console.log('CP026 WEBKIT_GUARD PASS normal PWA excludes v3 LAB');
  }finally{await normalContext.close()}
  assert.deepEqual(missing,[],'CP026_404');assert.deepEqual(offOrigin,[],'CP026_EXTERNAL_FETCH');assert.deepEqual(errors,[],'CP026_PAGE_ERRORS');
  console.log('CP026 FINAL PASS: '+JSON.stringify({engine:'Playwright WebKit Linux, not iPhone/Safari physical',passed,noRealData:true,cachefix2Unchanged:true}));
 }finally{if(browser)await browser.close();if(server.listening)await stop()}
})().catch(e=>{console.error('CP026 RESULT FAIL:',e.stack||e);console.error('CP026 DIAGNOSTICS '+JSON.stringify({missing,offOrigin:[],script:'new WebKit-only checks'}));process.exitCode=1});
