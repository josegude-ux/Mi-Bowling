'use strict';
/* CP023 — NEW isolated real-browser PWA update and rollback test.
 * Only synthetic fixtures. V-A is checkout CP022 unchanged. V-B is an in-memory
 * HTML marker and SW manifest/release variant; never writes files to repository.
 * No forced activation, no production merge, no historic test rerun.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const RELEASE_A = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const INDEX_A = fs.readFileSync(path.join(ROOT, 'index.html'));
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const swManifestMatch = RELEASE_A.match(/^const HASHES=(\{.*\});$/m);
const aVersion = RELEASE_A.match(/^const RELEASE="([^"]+)";/m)?.[1];
assert(swManifestMatch && aVersion, 'CP022 SW format not available');
const hashesA = JSON.parse(swManifestMatch[1]);
assert.equal(Object.keys(hashesA).length, 67, 'Expected CP022 67-entry hash manifest');
const aliases = ['./', './index.html', './?cp021lab=ficticio'];
for (const key of aliases) assert.equal(hashesA[key], sha(INDEX_A), 'CP022 original HTML hash mismatch '+key);
const MARKER = '<meta name="cp023-synthetic-release" content="B">';
const sourceHtml = INDEX_A.toString('utf8');
assert.equal(sourceHtml.split('</head>').length, 2, 'Cannot locate one HTML head close');
const INDEX_B = Buffer.from(sourceHtml.replace('</head>', '  '+MARKER+'\n</head>'), 'utf8');
const hashesB = {...hashesA};
for (const key of aliases) hashesB[key] = sha(INDEX_B);
const RELEASE_B = RELEASE_A
  .replace(/^const RELEASE="([^"]+)";/m, `const RELEASE="${aVersion}-cp023-fixture-B";`)
  .replace(swManifestMatch[0], 'const HASHES='+JSON.stringify(hashesB)+';');
const cacheLogic = x => x.slice(x.indexOf('\n\nconst CACHE='));
assert.equal(cacheLogic(RELEASE_A), cacheLogic(RELEASE_B), 'Cachefix2 logic changed in fixture');
assert(!RELEASE_B.includes('skipWaiting()'), 'No early activation permitted');
assert.equal(Object.keys(hashesB).length, 67);
const mime = {'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
 '.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
 '.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
let serving = 'A';
let siteClosed = false;
let external = [];
const errors = [];
const requests = {A:0,B:0,notFound:[]};
const server = http.createServer((request,response)=>{
  try {
    const uri = new URL(request.url, 'http://127.0.0.1');
    let relative = decodeURIComponent(uri.pathname).replace(/^\/+/, '');
    if(!relative || relative.endsWith('/')) relative += 'index.html';
    const fullPath = path.resolve(ROOT, relative);
    if(!fullPath.startsWith(ROOT+path.sep)) {response.writeHead(403).end();return;}
    let buffer;
    if(relative === 'sw.js') buffer = Buffer.from(serving === 'A' ? RELEASE_A : RELEASE_B);
    else if(relative === 'index.html') buffer = serving === 'A' ? INDEX_A : INDEX_B;
    else buffer = fs.readFileSync(fullPath);
    requests[serving]++;
    response.writeHead(200, {'Content-Type':mime[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-store'}).end(buffer);
  } catch (error) {
    requests.notFound.push({url:request.url,error:String(error.message)});
    response.writeHead(404).end();
  }
});
const closeServer = ()=>new Promise(ok=>server.close(ok));
const delay = ms=>new Promise(ok=>setTimeout(ok,ms));
async function until(label, check, duration = 45000) {
  const begin=Date.now();let last;
  while(Date.now()-begin<duration) {
    try { last=await check(); if(last?.ok) return last; }
    catch(err) {last={error:String(err)};}
    await delay(180);
  }
  throw Error('CP023_TIMEOUT_'+label+' '+JSON.stringify(last));
}
const inspect = async page => page.evaluate(async()=>{
  const registration=await navigator.serviceWorker.getRegistration();
  const cachesNow=(await caches.keys()).filter(n=>n.startsWith('mi-bowling-release-'));
  return {active:registration?.active?.state, waiting:registration?.waiting?.state,
   installing:registration?.installing?.state, controller:!!navigator.serviceWorker.controller,
   marker:document.querySelector('meta[name="cp023-synthetic-release"]')?.content||'A',
   cacheNames:cachesNow, compact:!!document.querySelector('.cp021-root')};
});
const validateStorage = async page => page.evaluate(async()=>{
  const s=await window.MiBowlingRegistroCP021.inspectSynthetic();
  const keys=['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-liga-v1','mi-bowling-ball-selection-v1'];
  return {mode:s.mode,average:s.stats.averageScore,protected:keys.map(k=>localStorage.getItem(k))};
});
const profileArgs = {headless:true,viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,
 hasTouch:true,serviceWorkers:'allow',reducedMotion:'reduce',args:['--no-sandbox']};
(async()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-cp023-synthetic-'));
  let context,origin;
  try {
    await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
    origin='http://127.0.0.1:'+server.address().port;
    const lab=origin+'/?cp021lab=ficticio';
    context=await chromium.launchPersistentContext(folder,profileArgs);
    await context.route(/^https?:\/\/(?!127\.0\.0\.1:)/,route=>{
      external.push(route.request().url());return route.abort();
    });
    let page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(lab,{waitUntil:'load',timeout:30000});
    await page.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB,null,{timeout:30000});
    await until('A_ACTIVATED',async()=>{
      const v=await inspect(page);
      return {...v,ok:v.active==='activated'&&!v.waiting&&v.cacheNames.length===1};
    },85000);
    await page.reload({waitUntil:'load',timeout:30000});
    await until('A_CONTROLLER',async()=>{const v=await inspect(page);return {...v,ok:v.controller&&v.active==='activated'}},10000);
    const first=await inspect(page);
    assert.equal(first.marker,'A');assert.equal(first.compact,true);
    const migration=await page.evaluate(()=>window.MiBowlingRegistroCP021.migrateSynthetic());
    assert.equal(migration.result.mode,'shadow-v3');assert.equal(migration.result.stats.averageScore,289);
    const initial=await validateStorage(page);
    assert.deepEqual(initial.protected,[null,null,null,null]);
    assert.equal(initial.mode,'shadow-v3');
    const cacheNameA=first.cacheNames[0];
    console.log('CP023 A_INSTALLED '+JSON.stringify({cache:cacheNameA,syntheticIdb:initial.mode,average:initial.average}));

    // Deploy a different synthetic release WITHOUT changing repository files.
    serving='B';
    await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
    const staged=await until('B_WAITING',async()=>{
      const v=await inspect(page);
      return {...v,ok:v.waiting==='installed'&&v.active==='activated'&&v.controller&&v.cacheNames.length===2};
    },85000);
    assert.equal(staged.marker,'A','Candidate B must not replace an open A client');
    assert(staged.cacheNames.includes(cacheNameA),'A rollback cache discarded during B install');
    assert(staged.cacheNames.some(n=>n.includes('cp023-fixture-B')),'B release cache missing');
    console.log('CP023 B_WAITING_OLD_CLIENT_PRESERVED '+JSON.stringify({active:'A',waiting:'B',cacheNames:staged.cacheNames}));

    // Close ALL pages: default SW lifecycle should activate waiting B (no skipWaiting).
    for(const p of context.pages())await p.close();
    await delay(900);
    page=null;
    for(let n=0;n<9;n++) {
      page=await context.newPage();
      await page.goto(lab,{waitUntil:'load',timeout:30000});
      const v=await inspect(page);
      if(v.marker==='B'&&v.active==='activated'&&v.controller)break;
      await page.close();page=null;await delay(600);
    }
    assert(page,'B must become active after all A clients close');
    await page.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB,null,{timeout:30000});
    const upgraded=await inspect(page);
    assert.equal(upgraded.marker,'B');
    assert.equal(upgraded.cacheNames.length,2);
    const afterUpgrade=await validateStorage(page);
    assert.equal(afterUpgrade.mode,'shadow-v3');assert.equal(afterUpgrade.average,289);
    assert.deepEqual(afterUpgrade.protected,initial.protected);
    console.log('CP023 B_ACTIVATED '+JSON.stringify({marker:upgraded.marker,caches:upgraded.cacheNames.length,syntheticIdb:afterUpgrade.mode}));

    // Rollback by publishing the original CP022 SW and original HTML on the SAME origin.
    serving='A';
    await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
    const rollbackWaiting=await until('A_ROLLBACK_WAITING',async()=>{
      const v=await inspect(page);
      return {...v,ok:v.waiting==='installed'&&v.active==='activated'&&v.controller};
    },85000);
    assert.equal(rollbackWaiting.marker,'B','Rollback cannot seize a still-open B session');
    assert(rollbackWaiting.cacheNames.includes(cacheNameA),'A rollback cache unavailable');
    for(const p of context.pages())await p.close();
    await delay(900);
    page=null;
    for(let n=0;n<9;n++){
      page=await context.newPage();
      await page.goto(lab,{waitUntil:'load',timeout:30000});
      const v=await inspect(page);
      if(v.marker==='A'&&v.controller&&v.active==='activated')break;
      await page.close();page=null;await delay(600);
    }
    assert(page,'Previous A release did not reactivate after B closed');
    await page.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB,null,{timeout:30000});
    const rolledBack=await inspect(page),afterRollback=await validateStorage(page);
    assert.equal(rolledBack.marker,'A');
    assert.equal(rolledBack.cacheNames.length,2);
    assert.deepEqual(afterRollback.protected,initial.protected);
    assert.equal(afterRollback.mode,'shadow-v3');assert.equal(afterRollback.average,289);
    console.log('CP023 A_ROLLBACK_ACTIVATED '+JSON.stringify({marker:'A',retainedCaches:rolledBack.cacheNames.length,syntheticIdb:afterRollback.mode}));

    // New browser process: previous version, restored while server is stopped.
    await context.close();context=null;
    await closeServer();siteClosed=true;
    context=await chromium.launchPersistentContext(folder,profileArgs);
    await context.setOffline(true);
    const offline=await context.newPage();
    await offline.goto(lab,{waitUntil:'load',timeout:30000});
    await offline.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB,null,{timeout:30000});
    const final=await inspect(offline);
    assert.equal(final.marker,'A');assert.equal(final.controller,true);assert.equal(final.active,'activated');
    assert.equal(final.cacheNames.length,2);
    const restored=await validateStorage(offline);
    assert.equal(restored.mode,'shadow-v3');assert.equal(restored.average,289);
    assert.deepEqual(restored.protected,initial.protected);
    assert.deepEqual(requests.notFound,[],'Missing original resources');
    assert.deepEqual(external,[],'Unexpected external requests');
    assert.deepEqual(errors,[],'Unexpected JavaScript errors');
    console.log('CP023 OFFLINE_ROLLBACK_PASS '+JSON.stringify({newProcess:true,serverOff:true,
     marker:final.marker,controller:final.controller,caches:final.cacheNames.length,idb:restored.mode,average:restored.average}));
    console.log('CP023 FINAL PASS: A->B waiting->B active->A rollback->A offline; synthetic data only; SW Cachefix2 logic unchanged');
  } finally {
    if(context)await context.close();
    if(!siteClosed&&server.listening)await closeServer();
    fs.rmSync(folder,{recursive:true,force:true});
  }
})().catch(error=>{
  console.error('CP023 FINAL FAIL:',error.stack||error);
  console.error('CP023 diagnostic '+JSON.stringify({serving,requests,external:external.slice(0,8),errors:errors.slice(0,8)}));
  process.exitCode=1;
});
