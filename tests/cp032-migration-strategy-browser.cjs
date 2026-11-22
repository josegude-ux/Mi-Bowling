'use strict';
/* CP032 · NEW ONLY: Web Locks, synthetic v2 + PDF IDB and v3 compensation.
 * A disposable localhost server serves the LAB harness, never user data.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json'};
const server=http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')}catch{res.writeHead(400);return res.end()}
 if(!p)p='index.html';const file=path.resolve(root,p);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end()}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
 res.end(b)});
});
(async()=>{
 await new Promise(res=>server.listen(0,'127.0.0.1',res));
 const url='http://127.0.0.1:'+server.address().port+'/lab/cp032-migration-harness.html?cp032lab=ficticio';
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({serviceWorkers:'block'});
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url,{waitUntil:'load',timeout:30000});
  await p.waitForFunction(()=>!!window.MiBowlingCP032MigrationSimulation&&!!window.MiBowlingRecuperacion);
  const setup=await p.evaluate(async()=>{
   const F=window.MiBowlingCP032Fixture,A=window.MiBowlingAutoridad,P=window.MiBowlingCP032PWA;
   const f=F.make(),v2=JSON.parse(f.rawMap[A.KEYS[0]]),pattern=v2.patterns[0];
   pattern.pdfName='CP032-FICTICIO.pdf';
   f.rawMap[A.KEYS[0]]=JSON.stringify(v2);
   const values=new Map(Object.entries(f.rawMap).filter(([k,v])=>v!==null));
   window.__cp032Storage={
    get length(){return values.size},
    key(i){return [...values.keys()][i]??null},
    getItem(k){return values.has(k)?values.get(k):null},
    setItem(k,v){values.set(k,String(v))},
    removeItem(k){values.delete(k)}
   };
   window.__cp032Doc=P.attach(f.modern,f.rawMap,f.assets);
   window.__cp032PdfId=pattern.id;
   const current='%PDF-1.4\nCP032-FICTITIOUS-PDF-A\n%%EOF';
   const request=indexedDB.open('mi-bowling-patrones-pdf',1);
   await new Promise((res,rej)=>{
    request.onupgradeneeded=()=>{request.result.createObjectStore('pdf')};
    request.onerror=()=>rej(request.error);request.onsuccess=()=>res();
   });
   const db=request.result;
   await new Promise((res,rej)=>{
    const t=db.transaction('pdf','readwrite');
    t.objectStore('pdf').put(new Blob([current],{type:'application/pdf'}),pattern.id);
    t.oncomplete=()=>res();t.onerror=t.onabort=()=>rej(t.error);
   });db.close();
   const photos=await caches.open('cp032-FICTITIOUS-photos-only');
   await photos.put(new URL('/cp032-fictitious-photo-cache',location.origin).href,
    new Response('CP032_FAKE_PHOTO_MARKER_A',{headers:{'Content-Type':'text/plain'}}));
   window.__cp032PhotoProbe=async()=>{
    const cache=await caches.open('cp032-FICTITIOUS-photos-only');
    const r=await cache.match(new URL('/cp032-fictitious-photo-cache',location.origin).href);
    return r?await r.text():'MISSING';
   };
   return {exactV2:JSON.stringify(v2),pdfId:pattern.id,photos:await window.__cp032PhotoProbe(),
    localKeys:Object.keys(localStorage)};
  });
  assert(setup.photos==='CP032_FAKE_PHOTO_MARKER_A');
  assert(setup.localKeys.every(x=>!x.startsWith('mi-bowling-')));
  const lockPrep=await p.evaluate(()=>{
   const A=window.MiBowlingAutoridad;
   window.__cp032Held=false;let release;
   const hold=new Promise(r=>release=r);window.__cp032Release=release;
   window.__cp032LockPromise=navigator.locks.request(A.LOCK,{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock){window.__cp032NoLock=true;return}
    window.__cp032Held=true;
    window.__cp032Guard=A.create(window.__cp032Storage,()=>window.__cp032Held);
    await hold;window.__cp032Held=false;
   });
   return {requested:true,lockName:A.LOCK};
  });
  await p.waitForFunction(()=>window.__cp032Held&&!!window.__cp032Guard);
  const blocked=await ctx.newPage();await blocked.goto(url,{waitUntil:'load'});
  const denied=await blocked.evaluate(async()=>{
   const lock=await navigator.locks.request(window.MiBowlingAutoridad.LOCK,{mode:'exclusive',ifAvailable:true},l=>!!l);
   let caught=false;try{window.MiBowlingAutoridad.create(window.localStorage,()=>false)}catch(e){caught=/bloqueo exclusivo/i.test(e.message)}
   return {lock,caught};
  });
  assert.equal(denied.lock,false,'Concurrent lock obtained');
  assert.equal(denied.caught,true,'Writer without lock permitted');
  await blocked.close();
  const first=await p.evaluate(async()=>{
   const guard=window.__cp032Guard,storage=window.__cp032Storage,Integral=window.MiBowlingRecuperacion;
   const L=window.MiBowlingRespaldo,B=window.MiBowlingRespaldoPDF,io=Integral.browserIO();
   const orig=JSON.parse(storage.getItem(window.MiBowlingAutoridad.KEYS[0]));
   const local=L.exportBundle(guard,orig);
   const exported=await B.build({guard,storage,localBundle:local,idb:indexedDB,ready:()=>true});
   await Integral.validate(exported);
   const modified=structuredClone(exported),pdf=modified.indexedDB.pdfs[0];
   const replacement='%PDF-1.4\nCP032-FICTITIOUS-PDF-B\n%%EOF';
   const bytes=new TextEncoder().encode(replacement);
   pdf.base64=btoa(String.fromCharCode(...bytes));pdf.size=bytes.length;
   pdf.sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
   await Integral.validate(modified);
   window.__cp032Before=exported;window.__cp032Target=modified;window.__cp032IO=io;
   window.__cp032Args={
    guard,storage,io,sidecar:window.MiBowlingCP032Journal,
    document:window.__cp032Doc,target:modified,photoProbe:window.__cp032PhotoProbe
   };
   const p=await window.MiBowlingCP032MigrationSimulation.preflight(window.__cp032Args);
   return {steps:p.plan.stepOrder.length,atomic:p.plan.crashSafeAcrossStores,pdfs:modified.indexedDB.pdfs.length,
    unchanged:JSON.stringify(p.old.raw)===JSON.stringify(exported.rawAll)};
  });
  assert(first.unchanged&&first.steps===7&&!first.atomic&&first.pdfs===1);
  const success=await p.evaluate(()=>window.MiBowlingCP032MigrationSimulation.simulate(window.__cp032Args));
  assert(success.committed&&success.v2Preserved&&success.photoPreserved&&!success.atomicAcrossStores);
  const afterSuccess=await p.evaluate(async()=>{
   const v3=await window.MiBowlingCP032Journal.read(),pdfs=await window.__cp032IO.readPDFs();
   return {revision:v3.revision,pdf:pdfs[0]?.sha256,local:
    window.__cp032Storage.getItem(window.MiBowlingAutoridad.KEYS[0]),
    photo:await window.__cp032PhotoProbe()};
  });
  assert.equal(afterSuccess.revision,1);
  assert.equal(afterSuccess.local,setup.exactV2);
  assert.equal(afterSuccess.pdf,(await p.evaluate(()=>window.__cp032Target.indexedDB.pdfs[0].sha256)));
  assert.equal(afterSuccess.photo,setup.photos);
  const failedAfterV3=await p.evaluate(async()=>{
   const previous=await window.MiBowlingCP032Journal.read();
   const outcome=await window.MiBowlingCP032MigrationSimulation.simulate(window.__cp032Args,{failAt:'afterV3'});
   const now=await window.MiBowlingCP032Journal.read();
   return {outcome,previous,now};
  });
  assert(!failedAfterV3.outcome.committed&&failedAfterV3.outcome.rolledBack);
  assert.deepEqual(failedAfterV3.now.document,failedAfterV3.previous.document);
  const failedAfterCP004=await p.evaluate(async()=>{
   const before=await window.__cp032IO.readPDFs();
   const old=window.__cp032Target;
   const altered=structuredClone(window.__cp032Before);
   // Attempt to replace current PDF B with PDF A, then simulate interruption.
   window.__cp032Args.target=altered;
   const outcome=await window.MiBowlingCP032MigrationSimulation.simulate(window.__cp032Args,{failAt:'afterCP004'});
   window.__cp032Args.target=old;
   const after=await window.__cp032IO.readPDFs();
   const j=await window.__cp032IO.readJournal();
   return {outcome,before,after,j,photo:await window.__cp032PhotoProbe(),keys:Object.keys(localStorage)};
  });
  assert(!failedAfterCP004.outcome.committed&&failedAfterCP004.outcome.rolledBack);
  assert.deepEqual(failedAfterCP004.after,failedAfterCP004.before,'PDF compensation not exact');
  assert.equal(failedAfterCP004.j,null,'CP004 journal pending');
  assert.equal(failedAfterCP004.photo,setup.photos);
  assert(failedAfterCP004.keys.every(k=>!k.startsWith('mi-bowling-')));
  const corrupt=await p.evaluate(async()=>{
   const target=structuredClone(window.__cp032Target);
   target.indexedDB.pdfs[0].base64='AQ==';
   let blocked=false;
   try{await window.MiBowlingCP032MigrationSimulation.preflight({...window.__cp032Args,target})}
   catch(e){blocked=/PDF|Hash|tamaño|Base64|respaldo/i.test(e.message)}
   return blocked;
  });
  assert(corrupt,'Corrupt PDF not refused');
  assert.equal(errors.length,0,'JavaScript runtime errors '+errors.join(';'));
  await p.evaluate(()=>window.__cp032Release());
  await p.evaluate(()=>window.__cp032LockPromise);
  const acquired=await p.evaluate(()=>navigator.locks.request(window.MiBowlingAutoridad.LOCK,
   {mode:'exclusive',ifAvailable:true},lock=>!!lock));
  assert(acquired,'Web Lock not released');
  await ctx.close();
  console.log('CP032 MIGRATION STRATEGY PASS · real Web Locks contention, synthetic CP003 PDF/IDB and CP004 restore, v3 journal, SHA, compensation after V3/CP004, photos unchanged; production untouched.');
 }finally{
  if(browser)await browser.close();
  await new Promise(res=>server.close(res));
 }
})().catch(e=>{console.error('CP032 MIGRATION STRATEGY FAIL',e);process.exitCode=1;try{server.close()}catch{}});
