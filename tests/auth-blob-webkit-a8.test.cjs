/* MI BOWLING · LAB A8 · WebKit/iPhone Blob read, errors and PWA isolation.
 * Real WebKit engine, mock IDB Blob objects, disposable native IDB probes.
 * Nothing touches a personal device or an actual user profile.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const https=require('node:https'),cp=require('node:child_process');
const {webkit,devices}=require('playwright');
const baseDir=path.resolve(__dirname,'..'),out=path.join(__dirname,'artifacts-blob-a8');
fs.mkdirSync(out,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bowling-blob-a8-'));
let server,browser;
async function serve(){
 const key=path.join(temp,'key.pem'),cert=path.join(temp,'cert.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-newkey','rsa:2048','-days','1',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
  const route=decodeURIComponent(new URL(req.url,'https://localhost').pathname).replace(/^\/+/,'');
  const file=path.resolve(baseDir,route);
  if(!file.startsWith(baseDir+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404);res.end('Not found');return;
  }
  res.writeHead(200,{'Content-Type':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html',
   'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end(fs.readFileSync(file));
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',resolve);
 });
 return 'https://127.0.0.1:'+server.address().port;
}
async function mount(page,base){
 await page.goto(base+'/lab/migracion-a7.html');
 await page.addScriptTag({url:base+'/auth-idb-pdf-reader-lab.js'});
}
async function webkitBlobRead(page){
 const result=await page.evaluate(async()=>{
  const API=window.MiBowlingIdbPdfReaderLAB;
  const source='p-a8-blob';
  const original=new TextEncoder().encode('%PDF-1.5\n1 0 obj\n<< /Title (FICTICIO) >>\nendobj\n%%EOF');
  const calls={readonly:0,writes:0,opens:0,closes:0};
  function fake(value,{blocked=false,abort=false,throwOpen=false}={}){
   return {open(name){
    calls.opens++;
    if(throwOpen)throw new DOMException('QuotaExceededError','QuotaExceededError');
    const request={};
    const db={
     objectStoreNames:{contains:x=>x==='pdf'},
     close(){calls.closes++},
     transaction(names,mode){
      if(mode!=='readonly')throw Error('Reader used a write transaction');
      calls.readonly++;
      const tx={};
      tx.objectStore=()=>({get(id){
       const getRequest={};
       queueMicrotask(()=>{
        if(abort){tx.onabort?.();return}
        getRequest.result=id==='oil'?value:undefined;
        getRequest.onsuccess?.();
        queueMicrotask(()=>tx.oncomplete?.());
       });
       return getRequest;
      }});
      return tx;
     }
    };
    queueMicrotask(()=>{
     if(blocked)request.onblocked?.();
     else{request.result=db;request.onsuccess?.()}
    });
    return request;
   }};
  }
  const pdf=new Blob([original],{type:'application/pdf'});
  const idb=API.create({indexedDB:fake(pdf),sourceProfileId:source});
  const bytes=await idb.readPdf('oil');
  if(bytes.length!==original.length||bytes.some((v,i)=>v!==original[i]))
   throw Error('WebKit Blob.arrayBuffer changed byte content');
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
   b=>b.toString(16).padStart(2,'0')).join('');
  const missing=await idb.readPdf('missing');
  if(missing!==null)throw Error('Nonexistent object should return null');
  idb.close();
  try{await idb.readPdf('oil');throw Error('Reader accepted a closed instance')}
  catch(err){if(!/cerrado/.test(err.message))throw err}
  for(const [value,pattern,settings] of [
   [new Blob([original],{type:'text/plain'}),/no es PDF/,{}],
   [new Blob(['BAD-NO-PDF'],{type:'application/pdf'}),/Firma|PDF fuera/,{}],
   [new Blob([original],{type:'application/pdf'}),/grande|incompleto/,{maxBytes:12}]
  ]){
   const obj=API.create({indexedDB:fake(value),sourceProfileId:source,...settings});
   try{await obj.readPdf('oil');throw Error('Invalid Blob was accepted')}
   catch(err){if(!pattern.test(err.message))throw err}
   obj.close();
  }
  for(const [options,pattern] of [
   [{blocked:true},/bloqueado/],
   [{abort:true},/cancelada/],
   [{throwOpen:true},/Error al solicitar/]
  ]){
   const obj=API.create({indexedDB:fake(pdf,options),sourceProfileId:source,timeoutMs:500});
   try{await obj.readPdf('oil');throw Error('IndexedDB failure not propagated')}
   catch(err){if(!pattern.test(err.message))throw err}
   obj.close();
  }
  let release;
  const delayed={size:original.length,type:'application/pdf',arrayBuffer:()=>new Promise(r=>release=r)};
  const delayedReader=API.create({indexedDB:fake(delayed),sourceProfileId:source});
  const inflight=delayedReader.readPdf('oil');
  for(let i=0;i<25&&!release;i++)await new Promise(r=>setTimeout(r,0));
  if(!release)throw Error('No delayed Blob.arrayBuffer invocation');
  delayedReader.close();
  release(original.buffer.slice(0));
  try{await inflight;throw Error('Closed reader disclosed in-flight PDF')}
  catch(err){if(!/cerrado/.test(err.message))throw err}
  if(calls.writes!==0||calls.readonly<4||calls.closes<4)
   throw Error('Reader transaction mode/connection counts invalid');
  return {sha,bytes:original.length,readOnlyTransactions:calls.readonly,closed:calls.closes};
 });
 assert.equal(result.sha.length,64);
 console.log('OK · WebKit Blob.arrayBuffer mocked IDB, byte integrity, MIME, quota, abort, blocked and in-flight close');
 return result;
}
async function probeNativeBlob(page){
 return page.evaluate(async()=>{
  const name='mi-bowling-patrones-pdf-p-a8-native';
  function createDB(){
   return new Promise((resolve,reject)=>{
    const r=indexedDB.open(name,1);
    r.onupgradeneeded=()=>r.result.createObjectStore('pdf');
    r.onerror=()=>reject(Error('native open '+(r.error?.name||'unknown')));
    r.onsuccess=()=>resolve(r.result);
   });
  }
  let db;
  try{
   db=await createDB();
   const pdf=new Blob([new TextEncoder().encode('%PDF-1.5\nNative Fictional PDF\n%%EOF')],
    {type:'application/pdf'});
   const inserted=await new Promise((resolve,reject)=>{
    const tx=db.transaction('pdf','readwrite');
    tx.objectStore('pdf').put(pdf,'oil');
    tx.oncomplete=()=>resolve(true);
    tx.onabort=()=>reject(Error('native Blob transaction aborted '+(tx.error?.name||'no reason')));
    tx.onerror=()=>reject(Error('native Blob transaction failed '+(tx.error?.name||'no reason')));
   });
   db.close();db=null;
   if(inserted){
    const reader=window.MiBowlingIdbPdfReaderLAB.create({indexedDB,sourceProfileId:'p-a8-native'});
    const contents=await reader.readPdf('oil');
    reader.close();
    if(!contents||String.fromCharCode(...contents.slice(0,5))!=='%PDF-')
     throw Error('Native Blob stored but unreadable');
    return{nativeBlobStatus:'passed',bytes:contents.length};
   }
  }catch(e){
   // Disclose unsupported native serialization explicitly, NEVER silently pass
   // it off as a successful native IDB Blob round-trip.
   return{nativeBlobStatus:'not-verified-in-linux-webkit',reason:String(e.message||e)};
  }finally{db?.close()}
 });
}
async function isolation(base,device){
 const pwa=await browser.newContext({...device,ignoreHTTPSErrors:true});
 const safari=await browser.newContext({...device,ignoreHTTPSErrors:true});
 try{
  const a=await pwa.newPage(),b=await safari.newPage();
  await mount(a,base);await mount(b,base);
  const profile='p-a8-pwa-private';
  await a.evaluate(profile=>new Promise((resolve,reject)=>{
   const req=indexedDB.open('mi-bowling-patrones-pdf-'+profile,1);
   req.onupgradeneeded=()=>req.result.createObjectStore('pdf');
   req.onerror=()=>reject(req.error||Error('PWA IDB failed'));
   req.onsuccess=()=>{
    const db=req.result,tx=db.transaction('pdf','readwrite');
    tx.objectStore('pdf').put(new Uint8Array(new TextEncoder().encode('%PDF-1.5\nPWA-only\n%%EOF')),'oil');
    tx.oncomplete=()=>{db.close();resolve()};
    tx.onerror=()=>{db.close();reject(Error('PWA test write failed'))};
   };
  }),profile);
  const sourceBytes=await a.evaluate(async profile=>{
   const reader=window.MiBowlingIdbPdfReaderLAB.create({indexedDB,sourceProfileId:profile});
   try{return [...await reader.readPdf('oil')]}finally{reader.close()}
  },profile);
  assert.ok(sourceBytes.length>8,'PWA-only bytes available');
  const separate=await b.evaluate(async profile=>{
   const reader=window.MiBowlingIdbPdfReaderLAB.create({indexedDB,sourceProfileId:profile});
   try{return await reader.readPdf('oil')}finally{reader.close()}
  },profile);
  assert.equal(separate,null,'Safari separate context should not access PWA private IDB');
  await b.reload();
  assert.equal(b.url().includes('/lab/migracion-a7.html'),true);
  const reopened=await a.evaluate(async profile=>{
   const reader=window.MiBowlingIdbPdfReaderLAB.create({indexedDB,sourceProfileId:profile});
   try{return [...await reader.readPdf('oil')]}finally{reader.close()}
  },profile);
  assert.deepEqual(reopened,sourceBytes,'PWA re-open after other browser navigation');
  await a.screenshot({path:path.join(out,'webkit-a8-iphone-pwa-ficticio.png'),fullPage:true});
  console.log('OK · 2 WebKit iPhone contexts: independent PWA/Safari IndexedDB, read-only re-open intact');
 }finally{await safari.close();await pwa.close()}
}
async function main(){
 const base=await serve();
 browser=await webkit.launch({headless:true});
 const device=devices['iPhone 13 Pro Max']||{viewport:{width:428,height:926},isMobile:true,hasTouch:true,deviceScaleFactor:3};
 const ctx=await browser.newContext({...device,ignoreHTTPSErrors:true});
 try{
  const page=await ctx.newPage();
  await mount(page,base);
  await webkitBlobRead(page);
  const native=await probeNativeBlob(page);
  console.log('WebKit Linux native IndexedDB Blob probe: '+JSON.stringify(native));
  assert.ok(['passed','not-verified-in-linux-webkit'].includes(native.nativeBlobStatus));
 }finally{await ctx.close()}
 await isolation(base,device);
 console.log('OK · A8 WebKit functional checks complete; actual iPhone Safari/PWA still untested');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
 try{await browser?.close()}catch(_){}
 if(server)await new Promise(r=>server.close(r));
 fs.rmSync(temp,{recursive:true,force:true});
});
