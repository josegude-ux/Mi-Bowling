'use strict';
/* CP024 — NEW isolated real-browser PWA DATA-CONTRACT migration update and rollback test.
 * Only synthetic fixtures. V-A is checkout CP022 unchanged. V-B is an in-memory
 * FULL v3 contract reader change in B and SW hash; source files unchanged.
 * Historical v2 remains byte-for-byte intact. No real data, merges or old suites.
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
const ENTRY_A = fs.readFileSync(path.join(ROOT, 'lab/registro-cp021/cp021-entry.js'), 'utf8');
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const swManifestMatch = RELEASE_A.match(/^const HASHES=(\{.*\});$/m);
const aVersion = RELEASE_A.match(/^const RELEASE="([^"]+)";/m)?.[1];
assert(swManifestMatch && aVersion, 'CP022 SW format not available');
const hashesA = JSON.parse(swManifestMatch[1]);
assert.equal(Object.keys(hashesA).length, 67, 'Expected CP022 67-entry hash manifest');
const aliases = ['./', './index.html', './?cp021lab=ficticio'];
for (const key of aliases) assert.equal(hashesA[key], sha(INDEX_A), 'CP022 original HTML hash mismatch '+key);
const MARKER = '<meta name="cp024-synthetic-release" content="B">';
const sourceHtml = INDEX_A.toString('utf8');
assert.equal(sourceHtml.split('</head>').length, 2, 'Cannot locate one HTML head close');
const INDEX_B = Buffer.from(sourceHtml.replace('</head>', '  '+MARKER+'\n</head>'), 'utf8');
// B has an ACTUAL v3-only contract reader and migration command; A has neither.
// These bytes are served in-memory only. The original CP021 entry file is NOT changed.
const B_VERSION_METHODS = `
async function cp024PromoteRealV3Contract(){
 if(!enabled)throw Error('CP024_GUARD');
 const store=await getStore(), raw=await store.row('sources');
 if(!raw?.legacy||!raw?.modern)throw Error('CP024_SOURCES_REQUIRED');
 const old=JSON.parse(raw.legacy),C=window.BowlingCp016Coexist;
 if(old.version!==2||old.format!==undefined)throw Error('CP024_LEGACY_NOT_V2');
 const pre=C.analyse({legacy:raw.legacy,modern:raw.modern});
 const prepared=await store.stage();
 const backup=JSON.parse(await store.exportBackup());
 if(backup.raw.legacy!==raw.legacy||backup.raw.modern!==raw.modern)throw Error('CP024_LOSSY_BACKUP');
 const activation=await store.activate();
 const shadow=await store.row('shadow:'+prepared.transaction);
 const A=window.BowlingCp014Compat;
 A.validateDocument(shadow.document);
 if(shadow.document.format!==A.FORMAT||shadow.document.version!==3)throw Error('CP024_NOT_V3');
 const games=shadow.document.sessions.flatMap(s=>s.games);
 if(!games.some(g=>g.entryKind==='final_only'&&g.finalOnlyScore===278))throw Error('CP024_FINAL_LOST');
 const stats=A.summary(shadow.document);
 if(stats.averageScore!==pre.stats.averageScore||stats.totalGames!==pre.stats.totalGames)throw Error('CP024_STAT_LOSS');
 return {contract:'v3',version:shadow.document.version,format:shadow.document.format,txid:prepared.transaction,
  backupSeal:backup.seal,shadowSeal:shadow.seal,score:stats.averageScore,games:games.length,
  finalOnly:stats.finalOnlyGames,exactPinAnalysis:stats.pinPatternEligibleGames,ballCount:shadow.document.balls.length,
  patternCount:shadow.document.patterns.length,legacySourceUnmodified:backup.raw.legacy===raw.legacy,
  oldV2Version:old.version,activated:activation.mode};
}
async function cp024ReadValidatedV3(){
 if(!enabled)throw Error('CP024_GUARD');
 const store=await getStore(),state=await store.read();
 if(state.mode!=='shadow-v3'||state.recoveryRequired)throw Error('CP024_V3_UNAVAILABLE');
 const id=state.transaction,shadow=await store.row('shadow:'+id);
 window.BowlingCp014Compat.validateDocument(shadow.document);
 return JSON.parse(JSON.stringify(shadow.document));
}
`;
const entryTag='window.MiBowlingRegistroCP021=Object.freeze({';
assert.equal(ENTRY_A.split(entryTag).length,2,'Actual CP021 entry shape changed; STOP');
let ENTRY_B=ENTRY_A.replace(entryTag,B_VERSION_METHODS+'\n'+entryTag);
ENTRY_B=ENTRY_B.replace('window.MiBowlingRegistroCP021=Object.freeze({',
  'window.MiBowlingRegistroCP021=Object.freeze({cp024ContractVersion:3,cp024PromoteRealV3Contract,cp024ReadValidatedV3,');
new Function(ENTRY_B);
assert(!ENTRY_A.includes('cp024PromoteRealV3Contract'),'Cannot modify existing v2 reader in A');

const hashesB = {...hashesA};
for (const key of aliases) hashesB[key] = sha(INDEX_B);
hashesB['./lab/registro-cp021/cp021-entry.js']=sha(Buffer.from(ENTRY_B, 'utf8'));
const RELEASE_B = RELEASE_A
  .replace(/^const RELEASE="([^"]+)";/m, `const RELEASE="${aVersion}-cp024-fixture-B";`)
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
    else if(relative === 'lab/registro-cp021/cp021-entry.js') buffer = Buffer.from(serving === 'A' ? ENTRY_A : ENTRY_B,'utf8');
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
  throw Error('CP024_TIMEOUT_'+label+' '+JSON.stringify(last));
}
const inspect = async page => page.evaluate(async()=>{
  const registration=await navigator.serviceWorker.getRegistration();
  const cachesNow=(await caches.keys()).filter(n=>n.startsWith('mi-bowling-release-'));
  return {active:registration?.active?.state, waiting:registration?.waiting?.state,
   installing:registration?.installing?.state, controller:!!navigator.serviceWorker.controller,
   marker:document.querySelector('meta[name="cp024-synthetic-release"]')?.content||'A',
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
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-cp024-synthetic-'));
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
    await page.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB&&!!document.querySelector('.cp021-root'),null,{timeout:30000});
    const first=await inspect(page);
    assert.equal(first.marker,'A');assert.equal(first.compact,true);
    // A is real old v2 reader. Seed the isolated DB with distinct source contracts,
    // but do NOT activate the v3 shadow before B's functional update.
    const seeded=await page.evaluate(async()=>{
      const C=window.BowlingCp016Coexist,A=window.BowlingCp014Compat;
      const legacy=C.buildLegacyFixture(),modern=C.buildFinalFixture(278);
      legacy.balls=[{id:'cp016-fake-ball-v2',name:'v2 mock ball'}];
      legacy.patterns=[{id:'cp016-fake-pattern-v2',name:'v2 mock pattern'}];
      modern.balls=[{id:'cp016-fake-ball-v3',name:'v3 mock ball'}];
      modern.patterns=[{id:'cp016-fake-pattern-v3',name:'v3 mock pattern'}];
      modern.sessions[0].type='oficial';
      // Reject ID collisions BEFORE writing anything to IndexedDB.
      const conflict=JSON.parse(JSON.stringify(modern));
      conflict.sessions[0].id=legacy.sessions[0].id;
      let rejected=false;
      try{C.analyse({legacy,modern:conflict})}catch(e){rejected=/Colisi/i.test(e.message)}
      if(!rejected)throw Error('CP024_ID_COLLISION_NOT_REJECTED');
      const raw={legacy:JSON.stringify(legacy),modern:JSON.stringify(modern)};
      const projection=C.analyse(raw),v2=A.fromLegacyV2(legacy);
      if(A.summary(v2).averageScore!==300)throw Error('CP024_A_LEGACY_SCORE');
      await new Promise((resolve,reject)=>{const script=document.createElement('script');
       script.src='./lab/registro-cp021/cp018-persistence.js';script.onload=resolve;script.onerror=()=>reject(Error('CP024_CP018_LOAD'));document.head.appendChild(script)});
      const store=new window.MiBowlingCP018.CP018Store();
      await store.seed(raw.legacy,raw.modern);
      const before=await store.read();
      if(before.mode!=='dual-read'||before.stats.averageScore!==289)throw Error('CP024_A_NOT_DUAL');
      // Real source-hashed backup, no v3 activation.
      const exported=JSON.parse(await store.exportBackup());
      if(exported.raw.legacy!==raw.legacy||exported.raw.modern!==raw.modern)throw Error('CP024_A_BACKUP_LOSS');
      const sources=await store.row('sources');
      const meta={id:legacy.sessions[0].id,score:A.summary(v2).averageScore};
      return {raw,backup:exported,old:meta,summary:projection.stats,
       mode:before.mode,sourcesUnchanged:sources.legacy===raw.legacy&&sources.modern===raw.modern};
    });
    assert.equal(seeded.mode,'dual-read');assert.equal(seeded.old.score,300);
    assert.equal(seeded.summary.averageScore,289);assert.equal(seeded.summary.totalGames,2);
    assert(seeded.sourcesUnchanged);
    const protectedKeys=['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-liga-v1','mi-bowling-ball-selection-v1'];
    const initialProtected=await page.evaluate(keys=>keys.map(k=>localStorage.getItem(k)),protectedKeys);
    assert.deepEqual(initialProtected,[null,null,null,null]);
    const cacheNameA=first.cacheNames[0];
    console.log('CP024 A_LEGACY_V2_DUAL_BACKUP '+JSON.stringify({version:2,score:300,combined:289,
      backupTx:seeded.backup.txid,sourceImmutable:true,shadowActivated:false,
      fingerprint:seeded.backup.sourceHashes,collisionsRejected:true}));

    // Deploy a different synthetic release WITHOUT changing repository files.
    serving='B';
    await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
    const staged=await until('B_WAITING',async()=>{
      const v=await inspect(page);
      return {...v,ok:v.waiting==='installed'&&v.active==='activated'&&v.controller&&v.cacheNames.length===2};
    },85000);
    assert.equal(staged.marker,'A','Candidate B must not replace an open A client');
    assert(staged.cacheNames.includes(cacheNameA),'A rollback cache discarded during B install');
    assert(staged.cacheNames.some(n=>n.includes('cp024-fixture-B')),'B release cache missing');
    console.log('CP024 B_WAITING_OLD_CLIENT_PRESERVED '+JSON.stringify({active:'A',waiting:'B',cacheNames:staged.cacheNames}));

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
    assert.equal(await page.evaluate(()=>window.MiBowlingRegistroCP021.cp024ContractVersion),3,
      'B did not introduce a functional v3 reader');
    // Lazy CP018 module loads on explicit access only. Prepare it before fault injection.
    const bPrepared=await page.evaluate(()=>window.MiBowlingRegistroCP021.inspectSynthetic());
    assert.equal(bPrepared.mode,'dual-read');
    // Simulate a crash AFTER backup but BEFORE activating shadow; fail closed to dual read.
    const crash=await page.evaluate(async()=>{
      const s=new window.MiBowlingCP018.CP018Store();let thrown='';
      try{await s.stage('afterBackup')}catch(e){thrown=e.message}
      const read=await s.read();
      return {thrown,mode:read.mode,average:read.stats.averageScore,active:await s.row('active')};
    });
    assert.equal(crash.thrown,'CP018_SIMULATED_CRASH_afterBackup');
    assert.equal(crash.mode,'dual-read');assert.equal(crash.average,289);assert.equal(crash.active,null);
    // This is the NEW contract migration B code. It converts legacy v2 rolls to v3,
    // preserves existing v3 final-only and protected metadata, seals shadow and activates.
    const migrated=await page.evaluate(()=>window.MiBowlingRegistroCP021.cp024PromoteRealV3Contract());
    assert.equal(migrated.version,3);assert.equal(migrated.contract,'v3');
    assert.equal(migrated.format,'mi-bowling-v3-lab');assert.equal(migrated.score,289);
    assert.equal(migrated.games,2);assert.equal(migrated.finalOnly,1);
    assert.equal(migrated.exactPinAnalysis,1);
    assert.equal(migrated.ballCount,2);assert.equal(migrated.patternCount,2);
    assert.equal(migrated.activated,'shadow-v3');assert(migrated.legacySourceUnmodified);
    assert.equal(migrated.txid,seeded.backup.txid);
    assert.equal(migrated.backupSeal,seeded.backup.seal);
    const afterUpgrade=await validateStorage(page);
    assert.equal(afterUpgrade.mode,'shadow-v3');assert.equal(afterUpgrade.average,289);
    assert.deepEqual(afterUpgrade.protected,initialProtected);
    const integrity=await page.evaluate(async()=>{
      const store=new window.MiBowlingCP018.CP018Store();
      const src=await store.row('sources'),backup=JSON.parse(await store.exportBackup());
      const doc=await window.MiBowlingRegistroCP021.cp024ReadValidatedV3();
      const A=window.BowlingCp014Compat;
      const oldSessions=doc.sessions.filter(s=>s.type==='entrenamiento');
      const officialSessions=doc.sessions.filter(s=>s.type==='oficial');
      const v2=A.fromLegacyV2(JSON.parse(src.legacy));
      const oldRoundTrip=A.toLegacyV2(v2);
      const q=JSON.stringify;
      const old=JSON.parse(src.legacy);
      if(q(oldRoundTrip)!==q(old))throw Error('CP024_LOSSY_LEGACY_ROUNDTRIP');
      return {sources:src,backupHash:backup.seal,
       oldScore:A.summary({format:A.FORMAT,version:3,sessions:oldSessions}).averageScore,
       officialScore:A.summary({format:A.FORMAT,version:3,sessions:officialSessions}).averageScore,
       kinds:doc.sessions.flatMap(s=>s.games.map(g=>g.entryKind)),
       sourceEnvelope:!!doc.sourceEnvelope?.legacy&&!!doc.sourceEnvelope?.modern,
       exactIds:doc.sessions.map(s=>s.id)};
    });
    assert.equal(integrity.sources.legacy,seeded.raw.legacy);
    assert.equal(integrity.sources.modern,seeded.raw.modern);
    assert.equal(integrity.backupHash,seeded.backup.seal);
    assert.equal(integrity.oldScore,300);assert.equal(integrity.officialScore,278);
    assert.deepEqual(integrity.kinds,['rolls','final_only']);
    assert(integrity.sourceEnvelope);
    assert.deepEqual(integrity.exactIds,['cp016-fake-session-v2','cp016-fake-session-v3']);
    // Corrupt a SEPARATE mock database, never the active migration; its read must
    // fall back to dual source reading and recover without deleting originals.
    const corrupted=await page.evaluate(async()=>{
      const name='mi-bowling-cp018-synthetic-cp024-corrupted';
      const store=new window.MiBowlingCP018.CP018Store(name);
      const source=new window.MiBowlingCP018.CP018Store();const raw=await source.row('sources');
      await store.seed(raw.legacy,raw.modern);const stage=await store.stage();await store.activate();
      const sh=await store.row('shadow:'+stage.transaction);sh.seal='0000';
      await store.put('shadow:'+stage.transaction,sh);
      const detected=await store.read();const recovered=await store.recover();
      const original=await store.row('sources');
      return {detected:detected.mode,recoveryRequired:detected.recoveryRequired,
       recovered:recovered.mode,sourcePreserved:original.legacy===raw.legacy&&original.modern===raw.modern};
    });
    assert.deepEqual(corrupted,{detected:'dual-read',recoveryRequired:true,
     recovered:'dual-read',sourcePreserved:true});
    console.log('CP024 B_ACTIVATED_REAL_V3_CONTRACT '+JSON.stringify({version:3,backup:seeded.backup.txid,
      shadow:migrated.shadowSeal,avg:289,kinds:integrity.kinds,legacySourceUnmodified:true,
      metadata:[migrated.ballCount,migrated.patternCount],crashSafe:true,corruptionFailClosed:true}));
    // Transactional application-level rollback: remove only v3 active pointer;
    // backup + v3 shadow remain for audit, and old v2 raw is still untouched.
    const rolledBackStore=await page.evaluate(async()=>{
      const s=new window.MiBowlingCP018.CP018Store();
      const v=await s.rollback();return {mode:v.mode,average:v.stats.averageScore,
       backupStillPresent:!!(await s.row('backup:'+String((await s._identity()).txid))),
       shadowStillPresent:!!(await s.row('shadow:'+String((await s._identity()).txid)))};
    });
    assert.deepEqual(rolledBackStore,{mode:'dual-read',average:289,backupStillPresent:true,shadowStillPresent:true});
    console.log('CP024 DATA_POINTER_ROLLBACK '+JSON.stringify(rolledBackStore));

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
    assert.equal(rolledBack.marker,'A');assert.equal(rolledBack.cacheNames.length,2);
    assert.equal(await page.evaluate(()=>typeof window.MiBowlingRegistroCP021.cp024PromoteRealV3Contract),'undefined',
      'Old v2 reader must NOT accept B-only contract methods after rollback');
    assert.deepEqual(afterRollback.protected,initialProtected);
    assert.equal(afterRollback.mode,'dual-read');assert.equal(afterRollback.average,289);
    const oldReader=await page.evaluate(async()=>{
      const s=new window.MiBowlingCP018.CP018Store();
      const raw=await s.row('sources'),A=window.BowlingCp014Compat;
      const old=A.fromLegacyV2(JSON.parse(raw.legacy));
      return {score:A.summary(old).averageScore,version:JSON.parse(raw.legacy).version,
       backupPresent:!!(await s.row('backup:'+String((await s._identity()).txid))),
       sourcePresent:!!raw.legacy,raw:raw.legacy};
    });
    assert.equal(oldReader.score,300);assert.equal(oldReader.version,2);
    assert(oldReader.backupPresent&&oldReader.sourcePresent);
    assert.equal(oldReader.raw,seeded.raw.legacy);
    console.log('CP024 A_ROLLBACK_ACTIVATED '+JSON.stringify({marker:'A',oldReaderScore:300,
      oldFormat:2,backupStillPresent:true,dualStats:afterRollback.average,caches:rolledBack.cacheNames.length}));

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
    assert.equal(restored.mode,'dual-read');assert.equal(restored.average,289);
    const oldOffline=await offline.evaluate(async()=>{const s=new window.MiBowlingCP018.CP018Store();const raw=await s.row('sources');return {version:JSON.parse(raw.legacy).version,score:window.BowlingCp014Compat.summary(window.BowlingCp014Compat.fromLegacyV2(JSON.parse(raw.legacy))).averageScore,legacy:raw.legacy};});
    assert.equal(oldOffline.version,2);assert.equal(oldOffline.score,300);assert.equal(oldOffline.legacy,seeded.raw.legacy);
    assert.deepEqual(restored.protected,initial.protected);
    assert.deepEqual(requests.notFound,[],'Missing original resources');
    assert.deepEqual(external,[],'Unexpected external requests');
    assert.deepEqual(errors,[],'Unexpected JavaScript errors');
    console.log('CP024 OFFLINE_ROLLBACK_PASS '+JSON.stringify({newProcess:true,serverOff:true,
     marker:final.marker,controller:final.controller,caches:final.cacheNames.length,idb:restored.mode,average:restored.average,v2Score:oldOffline.score,sourceStillExact:true}));
    console.log('CP024 FINAL PASS: A(v2 dual backup)->B(real v3 active)->data rollback->A(v2 dual)->A offline; synthetic data only; Cachefix2 unchanged');
  } finally {
    if(context)await context.close();
    if(!siteClosed&&server.listening)await closeServer();
    fs.rmSync(folder,{recursive:true,force:true});
  }
})().catch(error=>{
  console.error('CP024 FINAL FAIL:',error.stack||error);
  console.error('CP024 diagnostic '+JSON.stringify({serving,requests,external:external.slice(0,8),errors:errors.slice(0,8)}));
  process.exitCode=1;
});