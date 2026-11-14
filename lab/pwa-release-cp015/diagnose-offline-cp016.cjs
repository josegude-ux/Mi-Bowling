'use strict';
const {webkit}=require('playwright'), fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const template=fs.readFileSync(path.join(__dirname,'worker-template.js'),'utf8');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAALUlEQVR4nGPUrVjFQEvARFPTRy0YtWDUglELRi0YtWDUglELRi0YtWDUAioCAGvkAY/3fquUAAAAAElFTkSuQmCC','base64');
const html=Buffer.from('<!doctype html><meta charset=utf-8><title>CP016 synthetic</title><h1 id="ok">CP016 fixture</h1><img id="photo" src="./fixture.png"><a href="./catalogo-bolas/">Catalog</a><script>navigator.serviceWorker.register("./sw.js");</script>');
const cat=Buffer.from('<!doctype html><meta charset=utf-8><h1 id="total">100</h1><img id="photo" src="../fixture.png">');
const files={'':html,'index.html':html,'fixture.png':png,'catalogo-bolas/':cat,'catalogo-bolas/index.html':cat};
const hashes=Object.fromEntries(Object.entries(files).map(([k,v])=>[k,crypto.createHash('sha256').update(v).digest('hex')]));
const exact=template.replace('__RELEASE__',JSON.stringify('cp016diagnostic')).replace('__HASHES__',JSON.stringify(hashes));
const control="const C='cp016-control';self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html','./fixture.png','./catalogo-bolas/','./catalogo-bolas/index.html']))));self.addEventListener('fetch',e=>e.respondWith(caches.open(C).then(c=>c.match(e.request)).then(r=>r||fetch(e.request))));";
const outcomes=[];
async function scenario(label,worker,mode){
 let disconnected=false,requests=[],failures=[],phase='start';const profile=fs.mkdtempSync(path.join(os.tmpdir(),'cp016-webkit-'));
 const server=http.createServer((req,res)=>{requests.push({phase,path:req.url,disconnected});if(disconnected){req.socket.destroy();return}const k=new URL(req.url,'http://localhost').pathname.slice(1);const b=k==='sw.js'?Buffer.from(worker):files[k];if(!b){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':k.endsWith('.js')?'text/javascript':k.endsWith('.png')?'image/png':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Length':b.length});res.end(b)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port+'/';
 let ctx;const result={label,mode,engine:null,probe:null,root:null,catalog:null,cache:null,storage:null,requests:null,failures:null};
 try{
  ctx=await webkit.launchPersistentContext(profile,{headless:true,serviceWorkers:'allow',viewport:{width:390,height:844}});result.engine=ctx.browser()?.version()||'WebKit Playwright 1.56.1';
  const page=await ctx.newPage();page.on('requestfailed',r=>failures.push({phase,url:r.url(),error:r.failure()?.errorText}));page.on('pageerror',e=>failures.push({phase,error:e.message}));
  phase='install';await page.goto(origin);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await page.locator('#photo').evaluate(e=>e.decode());
  await page.evaluate(()=>localStorage.setItem('cp016-fixture','unchanged'));
  result.cache=await page.evaluate(async()=>{const rows=[];for(const n of await caches.keys()){const c=await caches.open(n);for(const k of await c.keys()){const r=await c.match(k);rows.push({path:new URL(k.url).pathname,status:r.status,bytes:(await r.arrayBuffer()).byteLength})}}return rows});
  assert.equal(result.cache.length,5);
  phase='offline-probe';if(mode==='emulated')await ctx.setOffline(true);else disconnected=true;
  try{result.probe=await page.evaluate(async()=>{const a=await fetch('./fixture.png');return {status:a.status,bytes:(await a.arrayBuffer()).byteLength,controlled:!!navigator.serviceWorker.controller}})}catch(e){result.probe={error:e.message}}
  phase='offline-root';try{await page.reload({timeout:12000});await page.locator('#ok').waitFor({timeout:5000});await page.locator('#photo').evaluate(e=>e.decode());result.root='PASS';result.storage=await page.evaluate(()=>localStorage.getItem('cp016-fixture'))}catch(e){result.root='FAIL '+e.message}
  phase='offline-catalog';try{await page.goto(origin+'catalogo-bolas/',{timeout:12000});assert.equal(await page.locator('#total').innerText({timeout:5000}),'100');await page.locator('#photo').evaluate(e=>e.decode());result.catalog='PASS'}catch(e){result.catalog='FAIL '+e.message}
 }catch(e){result.setupError=e.message}
 finally{result.requests=requests.filter(r=>r.phase.startsWith('offline'));result.failures=failures;outcomes.push(result);console.log('CP016_RESULT '+JSON.stringify(result));if(ctx)await ctx.close();await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true})}
}
(async()=>{await scenario('exact-worker-server-disconnected',exact,'server');await scenario('exact-worker-playwright-offline',exact,'emulated');await scenario('minimal-cache-control-playwright-offline',control,'emulated');console.log('CP016_SUMMARY '+JSON.stringify(outcomes.map(x=>({label:x.label,root:x.root,catalog:x.catalog,probe:x.probe,storage:x.storage,setupError:x.setupError}))));if(outcomes.some(x=>x.setupError)||outcomes[0].root!=='PASS'||outcomes[0].catalog!=='PASS')process.exitCode=1})().catch(e=>{console.error(e);process.exitCode=1});
