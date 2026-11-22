'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')}catch{res.writeHead(400);return res.end()}
 if(!p)p='index.html';const file=path.resolve(root,p);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end()}
 res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.json':'application/json'}[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b)});
});
const paths=[];
const launch=dir=>chromium.launchPersistentContext(dir,{headless:true,serviceWorkers:'block',viewport:{width:390,height:844}});
const url=()=> 'http://127.0.0.1:'+server.address().port+'/lab/cp032-resilience-harness.html?cp032lab=ficticio';
async function load(page){await page.goto(url(),{waitUntil:'load'});await page.waitForFunction(()=>!!window.MiBowlingCP032Durable&&window.MiBowlingRegistroCP021?.enabled)}
async function configure(page,seed){
 return page.evaluate(async seed=>{
  const A=window.MiBowlingAutoridad,F=window.MiBowlingCP032Fixture,P=window.MiBowlingCP032PWA;
  const fixture=F.make(),db=JSON.parse(fixture.rawMap[A.KEYS[0]]);
  db.patterns[0].pdfName='CP032-FICTICIO.pdf';
  fixture.rawMap[A.KEYS[0]]=JSON.stringify(db);
  const prefix='cp032-fake-map:';
  const storage={
   get length(){return Object.keys(localStorage).filter(k=>k.startsWith(prefix)).length},
   key(i){return Object.keys(localStorage).filter(k=>k.startsWith(prefix))[i]?.slice(prefix.length)??null},
   getItem(k){return localStorage.getItem(prefix+k)},
   setItem(k,v){localStorage.setItem(prefix+k,String(v))},
   removeItem(k){localStorage.removeItem(prefix+k)}
  };
  if(seed){
   for(const [k,v] of Object.entries(fixture.rawMap))if(v!==null)storage.setItem(k,v);
   const req=indexedDB.open('mi-bowling-patrones-pdf',1);
   const handle=await new Promise((resolve,reject)=>{
    req.onupgradeneeded=()=>req.result.createObjectStore('pdf');
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
   await new Promise((resolve,reject)=>{
    const tx=handle.transaction('pdf','readwrite');
    tx.objectStore('pdf').put(new Blob(['%PDF-1.4\nCP032-FAKE-PDF-A\n%%EOF'],{type:'application/pdf'}),db.patterns[0].id);
    tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error);
   });handle.close();
   const c=await caches.open('cp032-photo-fake');
   await c.put(new URL('/cp032-fake-photo',location.origin).href,new Response('CP032_FAKE_PHOTO_UNCHANGED'));
  }
  const map=Object.fromEntries(A.KEYS.map(k=>[k,storage.getItem(k)]));
  window.__cp032Args={
   storage,io:window.MiBowlingRecuperacion.browserIO(),
   document:P.attach(fixture.modern,map,fixture.assets),
   sidecar:window.MiBowlingCP032Journal,
   photoProbe:async()=>{
    const c=await caches.open('cp032-photo-fake'),v=await c.match(new URL('/cp032-fake-photo',location.origin).href);
    return v?await v.text():'MISSING';
   }
  };
  return {keys:Object.keys(localStorage),photo:await window.__cp032Args.photoProbe()};
 },seed);
}
async function lock(page){
 await page.evaluate(()=>{
  window.__lockHeld=false;
  const hold=new Promise(resolve=>window.__unlock=resolve);
  window.__lockPromise=navigator.locks.request(window.MiBowlingAutoridad.LOCK,
   {mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock){window.__lockDenied=true;return}
    window.__lockHeld=true;
    window.__cp032Args.guard=window.MiBowlingAutoridad.create(window.__cp032Args.storage,()=>window.__lockHeld);
    await hold;window.__lockHeld=false;
   });
 });
 await page.waitForFunction(()=>window.__lockHeld&&!!window.__cp032Args.guard);
}
async function target(page){
 return page.evaluate(async()=>{
  const a=window.__cp032Args,A=window.MiBowlingAutoridad,Local=window.MiBowlingRespaldo,
   PDF=window.MiBowlingRespaldoPDF,Integral=window.MiBowlingRecuperacion;
  const legacy=JSON.parse(a.storage.getItem(A.KEYS[0]));
  const from=await PDF.build({guard:a.guard,storage:a.storage,
   localBundle:Local.exportBundle(a.guard,legacy),idb:indexedDB,ready:()=>true});
  const to=structuredClone(from),pdf=to.indexedDB.pdfs[0],
   data=new TextEncoder().encode('%PDF-1.4\nCP032-FAKE-PDF-B\n%%EOF');
  pdf.base64=btoa(String.fromCharCode(...data));pdf.size=data.length;
  pdf.sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join('');
  await Integral.validate(to);a.target=to;
  return {before:from.indexedDB.pdfs[0].sha256,after:pdf.sha256};
 });
}
async function verify(page,sha,pending,kind){
 const x=await page.evaluate(async()=>{
  const a=window.__cp032Args,A=window.MiBowlingAutoridad;
  return {pdf:(await a.io.readPDFs())[0]?.sha256,photo:await a.photoProbe(),
   v3:await a.sidecar.read(),pending:await window.MiBowlingCP032Durable.pending(),
   raw:JSON.parse(a.storage.getItem(A.KEYS[0])),keys:Object.keys(localStorage)};
 });
 assert.equal(x.pdf,sha,'PDF integrity mismatch');
 assert.equal(x.photo,'CP032_FAKE_PHOTO_UNCHANGED');
 assert.equal(x.pending.pending,pending,'Coordinator state incorrect');
 assert(x.keys.every(k=>!k.startsWith('mi-bowling-')),'Personal storage touched');
 assert.equal(x.raw.version,2);
 assert(x.raw.patterns[0].pdfName==='CP032-FICTICIO.pdf');
 if(kind==='before')assert.equal(x.v3.document,null,'V3 was not rolled back');
 if(kind==='after')assert(x.v3.document?.cp032Mirror?.schema,'V3 document missing');
 return x;
}
async function newProfile(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cp032-closed-context-'));paths.push(dir);
 return dir;
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  // Quota in v3 sidecar: coordinator intent must survive for boot recovery.
  {
   const dir=await newProfile();let ctx=await launch(dir),page=await ctx.newPage();
   await load(page);await configure(page,true);await lock(page);const sha=await target(page);
   const attempt=await page.evaluate(async()=>{
    const original=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value,key){
     if(this.name==='journal'&&key==='intent')throw new DOMException('CP032 synthetic quota','QuotaExceededError');
     return original.apply(this,arguments);
    };
    let error='';try{await window.MiBowlingCP032Durable.begin(window.__cp032Args)}
    catch(e){error=e.name+':'+e.message}
    finally{IDBObjectStore.prototype.put=original}
    return {error,pending:await window.MiBowlingCP032Durable.pending()};
   });
   assert(attempt.error,'Quota fault did not fire');assert(attempt.pending.pending,'Intent lost after quota');
   await ctx.close();
   ctx=await launch(dir);page=await ctx.newPage();await load(page);await configure(page,false);await lock(page);
   const result=await page.evaluate(async()=>{
    window.__appStarted=false;
    const x=await window.MiBowlingCP032Boot.boot(window.__cp032Args,{onReady:()=>{
     window.__appStarted=true;return 'FAKE_APP';
    }});
    return {...x,started:window.__appStarted};
   });
   assert(result.ready&&result.started&&result.resolution.recovered);
   await verify(page,sha.before,false,'before');await ctx.close();
   console.log('CP032 QUOTA PASS · synthetic sidecar QuotaExceededError, recovery before boot, no personal writes');
  }
  // Alter coordinator journal body, leave old SHA. Boot MUST fail closed.
  {
   const dir=await newProfile();let ctx=await launch(dir),page=await ctx.newPage();
   await load(page);await configure(page,true);await lock(page);const sha=await target(page);
   await page.evaluate(()=>window.MiBowlingCP032Durable.begin(window.__cp032Args,{stopAfter:'afterPrepare'}));
   await ctx.close();
   ctx=await launch(dir);page=await ctx.newPage();await load(page);await configure(page,false);await lock(page);
   const tampered=await page.evaluate(async()=>{
    const req=indexedDB.open(window.MiBowlingCP032Durable.DB,1);
    const db=await new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)});
    await new Promise((res,rej)=>{
     const tx=db.transaction('intent','readwrite'),s=tx.objectStore('intent'),g=s.get('pending');
     g.onsuccess=()=>{let p=g.result;p.body+=' ';s.put(p,'pending')};
     tx.oncomplete=res;tx.onabort=tx.onerror=()=>rej(tx.error);
    });db.close();
    window.__started=false;let error='';
    try{await window.MiBowlingCP032Boot.boot(window.__cp032Args,{onReady:()=>{window.__started=true}})}
    catch(e){error=e.message}
    const r=indexedDB.open(window.MiBowlingCP032Durable.DB,1);
    const d=await new Promise(res=>r.onsuccess=()=>res(r.result));
    const evidence=await new Promise(res=>{
     const t=d.transaction('intent','readonly'),g=t.objectStore('intent').get('pending');
     g.onsuccess=()=>res(!!g.result);
    });d.close();
    return {error,started:window.__started,evidence,
      pdf:(await window.__cp032Args.io.readPDFs())[0].sha256,
      photo:await window.__cp032Args.photoProbe(),keys:Object.keys(localStorage)};
   });
   assert.match(tampered.error,/CP032_COORD_HASH_MISMATCH/);
   assert(!tampered.started&&tampered.evidence,'Corruption led to overwrite or app boot');
   assert.equal(tampered.pdf,sha.before);assert.equal(tampered.photo,'CP032_FAKE_PHOTO_UNCHANGED');
   assert(tampered.keys.every(k=>!k.startsWith('mi-bowling-')));await ctx.close();
   console.log('CP032 CORRUPT HASH NO GO PASS · writer blocked and durable journal retained');
  }
  // Quota thrown inside CP004 PDF put; subsequent bootstrap must restore or stop and preserve journals.
  {
   const dir=await newProfile();let ctx=await launch(dir),page=await ctx.newPage();
   await load(page);await configure(page,true);await lock(page);const sha=await target(page);
   const fault=await page.evaluate(async()=>{
    const original=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value,key){
     if(this.name==='pdf')throw new DOMException('CP032 synthetic PDF quota','QuotaExceededError');
     return original.apply(this,arguments);
    };
    let error='';try{await window.MiBowlingCP032Durable.begin(window.__cp032Args)}
    catch(e){error=e.name+':'+e.message}
    finally{IDBObjectStore.prototype.put=original}
    return {error};
   });
   assert(fault.error,'PDF quota not injected');
   await ctx.close();
   ctx=await launch(dir);page=await ctx.newPage();await load(page);await configure(page,false);await lock(page);
   const boot=await page.evaluate(async()=>{
    let started=false,error='',result=null;
    try{result=await window.MiBowlingCP032Boot.boot(window.__cp032Args,{onReady:()=>{started=true}})}
    catch(e){error=e.message}
    return {started,error,result};
   });
   assert(boot.started&&boot.result?.ready,'Failed safe recovery of PDF quota: '+boot.error);
   await verify(page,sha.before,false,'before');await ctx.close();
   console.log('CP032 PDF QUOTA PASS · CP004 write failure, boot compensation under Web Lock');
  }
  console.log('CP032 RESILIENCE LAB PASS · quota, corrupted journal and verified fail-closed startup; all data synthetic');
 }finally{for(const dir of paths)try{fs.rmSync(dir,{recursive:true,force:true})}catch{}
  await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error('CP032 RESILIENCE LAB FAIL',e);process.exitCode=1;try{server.close()}});
