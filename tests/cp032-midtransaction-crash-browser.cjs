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
const {execFileSync}=require('node:child_process');
function killChrome(dir){
 const raw=execFileSync('ps',['-eo','pid=,args='],{encoding:'utf8'});
 const rows=raw.split('\n').filter(x=>x.includes('--user-data-dir='+dir)&&/chrom(e|ium)/i.test(x)&&!x.includes('--type='));
 const valid=rows.map(s=>({pid:Number(s.trim().split(/\s+/)[0]),command:s})).filter(x=>Number.isInteger(x.pid)&&x.pid>0);
 if(valid.length!==1)throw Error('CP032_BROWSER_PARENT_NOT_UNIQUE '+JSON.stringify(rows).slice(0,500));
 process.kill(valid[0].pid,'SIGKILL');return valid[0].pid;
}
async function crashAt(dir,page,phase){
 let notify;
 const killed=new Promise((resolve,reject)=>{
  let fired=false;notify=(msg)=>{
   if(fired||!msg.text().includes('CP032_REAL_PROCESS_KILL_'+phase))return;
   fired=true;
   try{resolve(killChrome(dir))}catch(e){reject(e)}
  };
 });
 page.on('console',notify);
 const injection=page.evaluate(phase=>{
  const old=IDBObjectStore.prototype.put;
  window.__crashTriggered=false;
  IDBObjectStore.prototype.put=function(value,key){
   const request=old.apply(this,arguments);
   const selected=phase==='v3'?(this.name==='journal'&&key==='active'):(this.name==='pdf');
   if(selected&&!window.__crashTriggered){
    window.__crashTriggered=true;
    const store=this;
    // Re-queue an in-transaction request on every success, keeping the
    // readwrite transaction alive until its actual browser process is SIGKILLed.
    function keepAlive(){
     try{const r=store.get(key);r.onsuccess=keepAlive}catch{}
    }
    keepAlive();
    console.log('CP032_REAL_PROCESS_KILL_'+phase);
   }
   return request;
  };
  if(phase==='v3')return window.MiBowlingCP032Journal.save(window.__cp032Args.document,0);
  return window.MiBowlingCP032Durable.recover(window.__cp032Args);
 },phase).catch(()=>null);
 const timeout=new Promise((_,reject)=>setTimeout(()=>reject(Error('CP032_KILL_SIGNAL_TIMEOUT_'+phase)),15000));
 try{
  const pid=await Promise.race([killed,timeout]);
  return {pid,forced:true};
 }finally{page.off('console',notify);void injection}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  for(const phase of ['v3','pdf']){
   const dir=await newProfile();
   let ctx=await launch(dir),page=await ctx.newPage();
   await load(page);await configure(page,true);await lock(page);const hashes=await target(page);
   const first=await page.evaluate(phase=>
    window.MiBowlingCP032Durable.begin(window.__cp032Args,{stopAfter:phase==='v3'?'afterPrepare':'afterCP004'}),phase);
   assert(first.pending,'Coordinator must retain durable intent');
   await verify(page,phase==='v3'?hashes.before:hashes.after,true,
    phase==='v3'?'before':'after');
   if(phase==='pdf'){
    await ctx.close();
    ctx=await launch(dir);page=await ctx.newPage();
    await load(page);await configure(page,false);await lock(page);
   }
   const fatal=await crashAt(dir,page,phase);
   assert(fatal.forced&&fatal.pid>0);
   try{await ctx.close()}catch{}
   ctx=await launch(dir);page=await ctx.newPage();
   await load(page);await configure(page,false);await lock(page);
   const report=await page.evaluate(async()=>{
    window.__fakeAppStarted=false;
    const r=await window.MiBowlingCP032Boot.boot(window.__cp032Args,{onReady:()=>{
     window.__fakeAppStarted=true;return 'FAKE_READY';
    }});
    return {r,started:window.__fakeAppStarted};
   });
   assert(report.started&&report.r.ready&&report.r.resolution.recovered,'Post SIGKILL boot did not restore');
   await verify(page,hashes.before,false,'before');
   await ctx.close();
   console.log('CP032 FORCED SIGKILL MID-IDB PASS '+phase+' · process killed with transaction alive; boot recovery exact and fictional');
  }
  console.log('CP032 REAL CRASH LAB PASS · SIGKILL during sidecar v3 readwrite and PDF rollback readwrite; original data/fake photo preserved');
 }finally{
  for(const dir of paths)try{fs.rmSync(dir,{recursive:true,force:true})}catch{}
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(e=>{console.error('CP032 REAL CRASH LAB FAIL',e);process.exitCode=1;try{server.close()}catch{}});
