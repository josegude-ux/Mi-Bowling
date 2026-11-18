'use strict';
// CP003: incremental evidence only. CP001 source is read-only; fake data and isolated localhost.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const crypto=require('node:crypto'),zlib=require('node:zlib');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),prefix='/Mi-Bowling/';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const gz=b=>zlib.gzipSync(b,{level:9,mtime:0}).length;
const pinned={
 'index.html':'64d0230639f2485be0c983bdd92c60be4fd2a714eed5d92d71893c1249aafa02',
 'styles.css':'f8f1bb398bee7e46d5e11f644e2988cc0baf77f7019cf173f1dc5ad2c5e6c19b',
 'design-ui-tipo-home-rc2.css':'52eeca730ab728a74d2a6c1d0c0d8c20e029b3b5e2702929c195db72a37b3268',
 'releases/catalogo-local-f1-fotos1/app.js':'8b03657eced99fca5fadc9486e85c006a25ff8e4fe3197aae1b8e3223e2f4529',
 'sw.js':'1452f7f630cc4d084fe62fd8b7162f9b170672396a30fe707d509689f51b0fca'
};
const old={};
for(const [name,h] of Object.entries(pinned)){
 old[name]=fs.readFileSync(path.join(root,name));
 assert.equal(sha(old[name]),h,'CP001 pin mismatch: '+name);
}
const changes=new Map(),commentCounts={};
for(const name of ['styles.css','design-ui-tipo-home-rc2.css']){
 const source=old[name].toString('utf8'),re=/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*(?:\r?\n|$)/gm;
 commentCounts[name]=[...source.matchAll(re)].length;
 changes.set(name,Buffer.from(source.replace(re,m=>m.endsWith('\n')?'\n':'')));
}
assert.deepEqual(commentCounts,{'styles.css':26,'design-ui-tipo-home-rc2.css':9});
const sw=old['sw.js'].toString('utf8');
const hMatch=sw.match(/^const HASHES=(\{[^\n]*\});$/m);
const releaseMatch=sw.match(/^const RELEASE="([^"]+)";$/m);
assert(hMatch&&releaseMatch,'CP001 manifest format');
const beforeHashes=JSON.parse(hMatch[1]),afterHashes={...beforeHashes};
assert.equal(Object.keys(beforeHashes).length,60);
for(const [key,h] of Object.entries(beforeHashes)){
 const rel=key.split('?')[0].replace(/^\.\//,'');
 if(changes.has(rel)){
  assert.equal(h,pinned[rel]);
  afterHashes[key]=sha(changes.get(rel));
 }
}
const changedAliases=Object.keys(afterHashes).filter(k=>afterHashes[k]!==beforeHashes[k]).sort();
assert.deepEqual(changedAliases,['./design-ui-tipo-home-rc2.css','./styles.css','./styles.css?v=3310cat1'].sort());
let worker=sw.replace(hMatch[0],'const HASHES='+JSON.stringify(afterHashes)+';')
  .replace(releaseMatch[0],'const RELEASE="'+releaseMatch[1]+'-cssopt-cp003";');
const reversed=worker.replace('-cssopt-cp003";','";')
  .replace(/^const HASHES=\{[^\n]*\};$/m,hMatch[0]);
assert.equal(reversed,sw,'Worker behavior changed outside release and hashes');
changes.set('sw.js',Buffer.from(worker));
function checkManifest(overrides){
 const h=overrides?afterHashes:beforeHashes;
 for(const [url,expected] of Object.entries(h)){
  let rel=url.split('?')[0].replace(/^\.\//,'');
  if(!rel||rel.endsWith('/'))rel+='index.html';
  const b=(overrides&&overrides.has(rel))?overrides.get(rel):fs.readFileSync(path.join(root,rel));
  assert.equal(sha(b),expected,'60/60 manifest integrity '+url);
 }
 return Object.keys(h).length;
}
assert.equal(checkManifest(null),60);
assert.equal(checkManifest(changes),60);
const beforeGzip=Object.values(old).reduce((s,b)=>s+gz(b),0);
const afterGzip=Object.keys(pinned).reduce((s,k)=>s+gz(changes.get(k)||old[k]),0);
assert(afterGzip<=76785,'No compensado +1062 B gzip: '+afterGzip);
assert(beforeGzip-afterGzip>=1062,'Ahorro insuficiente: '+(beforeGzip-afterGzip));
console.log('CP003 CSS & manifest PASS',JSON.stringify({commentCounts,beforeGzip,afterGzip,saved:beforeGzip-afterGzip,unchangedAliases:57}));
if(process.argv.includes('--static-only'))process.exit(0);
const fakeSvg='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><circle cx="80" cy="80" r="65" fill="#47617c"/></svg>').toString('base64');
const balls=Array.from({length:10},(_,i)=>({id:'cp003-fake-'+i,brand:'Marca ficticia',model:'Bola de prueba '+i,weight:'15 lb',kind:'Reactiva',notes:'Ficticia',retired:i>=8,photo:i<8?fakeSvg:''}));
const seed={version:2,hand:'diestro',balls,patterns:[],sessions:[{id:'cp003-fake-session',type:'entrenamiento',date:'2026-01-01',title:'Ficticia',games:[]}]};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain'};
async function server(overrides){
 const s=http.createServer((req,res)=>{
  try{
   const u=new URL(req.url,'http://127.0.0.1');
   if(!u.pathname.startsWith(prefix)){res.writeHead(404).end();return}
   let rel=decodeURIComponent(u.pathname.slice(prefix.length));
   if(!rel||rel.endsWith('/'))rel+='index.html';
   const filename=path.resolve(root,rel);
   if(!filename.startsWith(root+path.sep)){res.writeHead(404).end();return}
   const b=overrides&&overrides.has(rel)?overrides.get(rel):fs.readFileSync(filename);
   res.writeHead(200,{'Content-Type':mime[path.extname(rel)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b);
  }catch(e){res.writeHead(404).end()}
 });
 await new Promise(r=>s.listen(0,'127.0.0.1',r));
 return {url:'http://127.0.0.1:'+s.address().port+prefix,close:()=>new Promise(r=>s.close(r))};
}
async function screen(browser,url,w,h,dark){
 const origin=new URL(url).origin;
 const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await ctx.addInitScript(({seed,origin})=>{
  if(location.origin===origin&&!localStorage.getItem('mi-bowling-analitica-v2'))
   localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(seed));
 },{seed,origin});
 const page=await ctx.newPage(),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  if(new URL(route.request().url()).origin===origin)route.continue();
  else {external.push(route.request().url());route.abort()}
 });
 try{
  await page.goto(url,{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>typeof go==='function'&&!!window.MiBowlingCatalogoLocal,null,{timeout:30000});
  await page.evaluate(()=>go('bolas'));
  await page.locator('.mis-bolas').waitFor();
  if(dark){
   await page.locator('[data-design-theme="compact"]').click();
   assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('lab-dark')),true);
  }
  const m=await page.evaluate(()=>{
   const el=e=>e.getBoundingClientRect(),cards=[...document.querySelectorAll('.mis-bolas>.balls-grid>.ball-card')];
   const nav=el(document.querySelector('.bottom-nav')),header=el(document.querySelector('.topbar'));
   const controls=[...document.querySelectorAll('.mb-back,.mb-intro button,.mb-actions button,.ball-pick-toolbar>button,.mb-more,.ball-session-toggle')];
   return {scroll:document.documentElement.scrollWidth,header:header.height,active:cards.length,retired:document.querySelector('.mb-retired')?.open===false,
    visible:cards.filter(e=>el(e).top>=header.bottom-1&&el(e).bottom<=nav.top+1).length,
    hit:controls.filter(e=>el(e).height>0).every(e=>el(e).width>=44&&el(e).height>=44),
    columns:getComputedStyle(document.querySelector('.balls-grid')).gridTemplateColumns.split(' ').length};
  });
  assert.equal(m.scroll,w);assert.equal(m.header,64);assert.equal(m.active,8);
  if(w===375||w===428)assert.equal(m.visible,w===428?6:4);else assert(m.visible>=4,'390 viewport synthetic visibility');
  assert.equal(m.retired,true);assert.equal(m.hit,true);assert.equal(m.columns,2);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  const shot=await page.locator('.mis-bolas').screenshot({animations:'disabled',caret:'hide'});
  return {geometry:m,image:sha(shot)};
 }finally{await ctx.close()}
}
async function workerCheck(browser,url){
 const ctx=await browser.newContext({viewport:{width:428,height:926},serviceWorkers:'allow'});
 await ctx.addInitScript(({seed})=>{
  if(!localStorage.getItem('mi-bowling-analitica-v2'))localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(seed));
 },{seed});
 const page=await ctx.newPage();
 try{
  await page.goto(url,{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>typeof go==='function',null,{timeout:30000});
  await page.evaluate(()=>navigator.serviceWorker.ready);
  const cached=await page.evaluate(async entries=>{
   const keys=await caches.keys();
   const cacheName=keys.find(k=>k.includes('cssopt-cp003'));
   if(!cacheName)return {count:0,invalid:['no-cache']};
   const cache=await caches.open(cacheName),invalid=[];
   for(const [u,expected] of Object.entries(entries)){
    const r=await cache.match(new URL(u,location.href));
    if(!r){invalid.push(u);continue}
    const digest=await crypto.subtle.digest('SHA-256',await r.arrayBuffer());
    const h=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
    if(h!==expected)invalid.push(u);
   }
   return {count:(await cache.keys()).length,invalid};
  },afterHashes);
  assert.deepEqual(cached,{count:60,invalid:[]});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:30000});
  const before=await page.evaluate(()=>localStorage.getItem('mi-bowling-analitica-v2'));
  await ctx.setOffline(true);
  await page.reload({waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>typeof go==='function',null,{timeout:30000});
  const after=await page.evaluate(()=>localStorage.getItem('mi-bowling-analitica-v2'));
  assert.equal(after,before,'Fake offline session changed');
  console.log('CP003 SW PASS: 60/60 CacheStorage, offline, fake data unchanged');
 }finally{await ctx.close()}
}
(async()=>{
 const base=await server(null),next=await server(changes);
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const [w,h] of [[375,667],[390,844],[428,926]]){
   for(const dark of [false,true]){
    const left=await screen(browser,base.url,w,h,dark);
    const right=await screen(browser,next.url,w,h,dark);
    assert.deepEqual(left,right,'Visual regression '+w+'x'+h+' dark='+dark);
    console.log('CP003 SCREEN PASS '+w+'x'+h+' dark='+dark+' visible='+left.geometry.visible+' screenshot='+left.image);
   }
  }
  await workerCheck(browser,next.url);
  console.log('CP003 RESULT PASS isolated candidate; CP001 evidence ZIP and physical Safari NOT validated, NO GO publication');
 }finally{await browser?.close();await base.close();await next.close()}
})().catch(e=>{console.error('CP003 RESULT FAIL:',e.stack||e);process.exitCode=1});
