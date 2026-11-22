'use strict';
/* CP022 — new offline-only integrated PWA homologation.
 * Synthetic fixture, localhost, fresh ephemeral persistent browser profile.
 * Do NOT reuse Chromium/CP021 historical suites. No user data.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'sw.js'),'utf8').match(/^const HASHES=(\{.*\});$/m)?.[1]||'null');
assert(manifest,'Service Worker manifest missing');
assert.equal(Object.keys(manifest).length,67,'Unexpected SW manifest size: stop before browser');
const crypto=require('node:crypto');
const mismatches=[];
for(const [resource,expected] of Object.entries(manifest)){
 const uri=new URL(resource,'http://127.0.0.1/');
 let rel=decodeURIComponent(uri.pathname).slice(1);
 if(!rel||rel.endsWith('/'))rel+='index.html';
 const target=path.resolve(ROOT,rel);
 try{const actual=crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  if(actual!==expected)mismatches.push({resource,expected,actual});}
 catch(e){mismatches.push({resource,reason:e.code||e.message})}
}
console.log('CP022 MANIFEST DIAGNOSTIC '+JSON.stringify({count:Object.keys(manifest).length,mismatchCount:mismatches.length,mismatches:mismatches.slice(0,12)}));
assert.equal(mismatches.length,0,'SW local manifest does not match file bytes');
const types={'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const misses=[],requests=[];
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  let rel=decodeURIComponent(url.pathname).replace(/^\/+/,'');
  if(!rel||rel.endsWith('/'))rel+='index.html';
  const loc=path.resolve(ROOT,rel);
  if(!loc.startsWith(ROOT+path.sep))return res.writeHead(403).end();
  const buffer=fs.readFileSync(loc);
  requests.push({path:url.pathname,query:url.search});
  res.writeHead(200,{'Content-Type':types[path.extname(rel)]||'application/octet-stream','Cache-Control':'no-store'}).end(buffer);
 }catch(e){misses.push(req.url);res.writeHead(404).end();}
});
const closeServer=()=>new Promise(resolve=>server.close(resolve));
const createProfile=()=>fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-cp022-synthetic-'));
const browserOptions={headless:true,args:['--no-sandbox'],viewport:{width:390,height:844},serviceWorkers:'allow',isMobile:true,hasTouch:true,reducedMotion:'reduce'};
(async()=>{
 const profile=createProfile();
 let context=null,siteClosed=false,origin;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin='http://127.0.0.1:'+server.address().port;
  const labUrl=origin+'/?cp021lab=ficticio';
  context=await chromium.launchPersistentContext(profile,browserOptions);
  const page=await context.newPage();
  const exceptions=[],external=[];
  page.on('pageerror',error=>exceptions.push(error.message));
  // Intercept only off-origin HTTP(S). Intercepting all requests interferes with SW handling.
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:)/,route=>{
   external.push(route.request().url());return route.abort();
  });
  await page.goto(labUrl,{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB,null,{timeout:30000});
  // An async predicate inside waitForFunction is truthy before resolution.
  // navigator.serviceWorker.ready is the actual activation barrier.
  const ready=await Promise.race([
   page.evaluate(async()=>{
    const reg=await navigator.serviceWorker.ready;
    const names=(await caches.keys()).filter(n=>n.startsWith('mi-bowling-release-'));
    const c=await caches.open(names.at(-1));
    return {scope:reg.scope,state:reg.active?.state,cacheCount:(await c.keys()).length};
   }),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('CP022_SW_ACTIVATION_TIMEOUT')),75000))
  ]);
  assert.equal(ready.state,'activated','Service Worker not active after ready');
  assert.equal(ready.cacheCount,67,'Service Worker cache incomplete');
  console.log('CP022 SW ACTIVATION READY '+JSON.stringify(ready));
  const installed=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {scope:r?.scope,active:r?.active?.state,waiting:r?.waiting?.state,installing:r?.installing?.state,controller:navigator.serviceWorker.controller?.scriptURL}});
  console.log('CP022 SW INITIAL STATE '+JSON.stringify(installed));
  await page.reload({waitUntil:'load',timeout:30000});
  const diagnostic=await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();return {scope:reg?.scope,active:reg?.active?.state,controller:navigator.serviceWorker.controller?.scriptURL,caches:await caches.keys()}});
  console.log('CP022 SW CONTROLLER DIAGNOSTIC '+JSON.stringify(diagnostic));
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller&&window.MiBowlingRegistroCP021?.enabled,null,{timeout:15000});
  const online=await page.evaluate(async()=>{
   const names=(await caches.keys()).filter(name=>name.startsWith('mi-bowling-release-'));
   const name=names.at(-1),cache=await caches.open(name);
   return {name,count:(await cache.keys()).length,
    hasRoot:!!(await cache.match(location.origin+'/')),
    hasLabDeepLink:!!(await cache.match(location.origin+'/?cp021lab=ficticio')),
    activeScript:navigator.serviceWorker.controller.scriptURL};
  });
  assert.equal(online.count,67,'SW cache missing or extra resources');
  assert.equal(online.hasRoot,true,'Offline root not cached');
  console.log('CP022 SW INSTALLED: cached='+online.count+' root='+online.hasRoot+' labDeepLink='+online.hasLabDeepLink);
  assert.equal(online.hasLabDeepLink,true,'CP022 LAB_URL_NOT_CACHED: ?cp021lab=ficticio cannot load offline without a hash-checked manifest alias');
  const migrated=await page.evaluate(()=>window.MiBowlingRegistroCP021.migrateSynthetic());
  assert.equal(migrated.result.stats.averageScore,289);
  assert.equal(migrated.result.mode,'shadow-v3');
  const unchanged=await page.evaluate(()=>['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-liga-v1','mi-bowling-ball-selection-v1'].map(key=>localStorage.getItem(key)));
  assert.deepEqual(unchanged,[null,null,null,null],'Unexpected legacy data keys during CP022 synthetic session');
  assert.deepEqual(exceptions,[],'Unexpected page script exception while online');
  assert.deepEqual(external,[],'Unexpected external network request');
  await context.close();context=null;
  await closeServer();siteClosed=true;
  // Launch a new browser process with the exact same temporary profile, but NO origin server.
  context=await chromium.launchPersistentContext(profile,browserOptions);
  await context.setOffline(true);
  const offline=await context.newPage();
  await offline.goto(labUrl,{waitUntil:'load',timeout:30000});
  await offline.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB,null,{timeout:30000});
  const offlineInfo=await offline.evaluate(async()=>{
   const names=(await caches.keys()).filter(name=>name.startsWith('mi-bowling-release-'));
   const r=await navigator.serviceWorker.getRegistration();
   const read=await window.MiBowlingRegistroCP021.inspectSynthetic();
   return {cached:names.length,active:!!r?.active,controlled:!!navigator.serviceWorker.controller,mode:read.mode,average:read.stats.averageScore,screen:!!document.querySelector('.cp021-root')};
  });
  assert(offlineInfo.controlled&&offlineInfo.active,'SW did not control offline reopened browser');
  assert.equal(offlineInfo.mode,'shadow-v3');
  assert.equal(offlineInfo.average,289);
  assert(offlineInfo.screen,'CP021 compact registration absent offline');
  assert.equal(misses.length,0,'Local static server returned 404 for SW resources: '+misses.join(', '));
  console.log('CP022 OFFLINE REOPEN PASS: fresh process, server stopped, PWA lab screen, 66 cache entries, synthetic IndexedDB '+JSON.stringify(offlineInfo));
 }finally{
  if(context)await context.close();
  if(!siteClosed&&server.listening)await closeServer();
  fs.rmSync(profile,{recursive:true,force:true});
 }
})().catch(err=>{console.error('CP022 RESULT FAIL:',err.stack||err);console.error('CP022 diagnostics: 404 paths='+JSON.stringify(misses.slice(0,12))+' requests='+requests.length);process.exitCode=1;});
