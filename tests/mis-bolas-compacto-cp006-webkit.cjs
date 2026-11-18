'use strict';
// CP006: new WebKit engine, touch and rotated screen, no physical iPhone claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {webkit}=require('playwright'),root=path.resolve(__dirname,'..'),prefix='/Mi-Bowling/';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const pinned={'styles.css':'f8f1bb398bee7e46d5e11f644e2988cc0baf77f7019cf173f1dc5ad2c5e6c19b','design-ui-tipo-home-rc2.css':'52eeca730ab728a74d2a6c1d0c0d8c20e029b3b5e2702929c195db72a37b3268'};
const changes=new Map();
for(const [file,digest] of Object.entries(pinned)){
 const original=fs.readFileSync(path.join(root,file));
 assert.equal(hash(original),digest,'Source changed: '+file);
 changes.set(file,Buffer.from(original.toString('utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*(?:\r?\n|$)/gm,m=>m.endsWith('\n')?'\n':'')));
}
const meta=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(meta,/<meta name="viewport"[^>]*viewport-fit=cover/);
assert.match(meta,/<meta name="apple-mobile-web-app-capable" content="yes">/);
assert([...changes.keys()].some(f=>fs.readFileSync(path.join(root,f),'utf8').includes('env(safe-area-inset-bottom)')));
const seed={version:2,hand:'diestro',balls:Array.from({length:10},(_,i)=>({id:'cp006-fake-'+i,brand:'Marca ficticia',model:'Bola de prueba '+i,weight:'15 lb',kind:'Reactiva',notes:'Ficticia',retired:i>=8,photo:''})),patterns:[],sessions:[]};
async function server(optimized){
 const srv=http.createServer((req,res)=>{
  try{
   const url=new URL(req.url,'http://127.0.0.1');
   if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return}
   let rel=decodeURIComponent(url.pathname.slice(prefix.length));if(!rel||rel.endsWith('/'))rel+='index.html';
   const filename=path.resolve(root,rel);
   if(!filename.startsWith(root+path.sep)){res.writeHead(404).end();return}
   const bytes=optimized&&changes.has(rel)?changes.get(rel):fs.readFileSync(filename);
   const type={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(rel)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(bytes);
  }catch(e){res.writeHead(404).end()}
 });
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 return {url:'http://127.0.0.1:'+srv.address().port+prefix,close:()=>new Promise(r=>srv.close(r))};
}
async function probe(browser,url,config){
 const {w,h,dark,name}=config,origin=new URL(url).origin;
 const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'});
 await ctx.addInitScript(({seed,origin})=>{if(location.origin===origin&&!localStorage.getItem('mi-bowling-analitica-v2'))localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(seed));},{seed,origin});
 const page=await ctx.newPage(),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=route.request().url();if(u.startsWith('data:')||new URL(u).origin===origin)route.continue();else{external.push(u);route.abort()}});
 try{
  await page.goto(url,{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>typeof go==='function'&&!!window.MiBowlingCatalogoLocal,null,{timeout:30000});
  await page.evaluate(()=>go('bolas'));
  await page.locator('.mis-bolas .ball-card').first().waitFor();
  if(dark){await page.locator('[data-design-theme="compact"]').tap();assert(await page.locator('body').evaluate(e=>e.classList.contains('lab-dark')));}
  const state=await page.evaluate(()=>{
   const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [r.x,r.y,r.right,r.bottom]};
   return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
    top:box('.topbar'),bottom:box('.bottom-nav'),
    active:document.querySelectorAll('.mis-bolas>.balls-grid>.ball-card').length,
    touch:navigator.maxTouchPoints,env:CSS.supports('padding-bottom','env(safe-area-inset-bottom)'),
    popover:typeof HTMLElement.prototype.showPopover==='function'};
  });
  assert.equal(state.width,w);assert.equal(state.height,h);
  assert(state.scrollWidth<=w+1,'Horizontal overflow: '+name);
  assert(state.top[1]>=0&&state.top[3]<=h+1,'Header clipping: '+name);
  assert(state.bottom[1]>=0&&state.bottom[3]<=h+1,'Bottom navigation clipping: '+name);
  assert.equal(state.active,8);assert(state.touch>0);assert(state.env);assert(state.popover);
  const screenshot=hash(await page.screenshot({fullPage:false,animations:'disabled',caret:'hide'}));
  const trigger=page.locator('.mis-bolas .mb-more').first(),id=await trigger.getAttribute('popovertarget');
  assert(/^mb-\d+-actions$/.test(id));
  await trigger.tap();
  const popup=page.locator('#'+id+':popover-open');await popup.waitFor({timeout:5000});
  const pbox=await popup.evaluate(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.right,r.bottom]});
  assert(pbox[0]>=-1&&pbox[1]>=-1&&pbox[2]<=w+1&&pbox[3]<=h+1,'Menu popup clipped: '+name);
  await popup.getByRole('button',{name:'Cerrar'}).tap();await popup.waitFor({state:'hidden'});
  await page.locator('.mis-bolas .ball-session-toggle').first().tap();
  assert(await page.locator('.mis-bolas .ball-session-toggle input').first().isChecked(),'Touch checkbox not selected');
  await page.locator('.mis-bolas .ball-session-toggle').first().tap();
  assert(!(await page.locator('.mis-bolas .ball-session-toggle input').first().isChecked()),'Touch checkbox not deselected');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  return {name,state,pbox,screenshot};
 }finally{await ctx.close()}
}
(async()=>{
 const a=await server(false),b=await server(true);let browser;
 try{
  browser=await webkit.launch({headless:true});
  for(const config of [{name:'portrait430x932',w:430,h:932,dark:false},{name:'landscape932x430',w:932,h:430,dark:true}]){
   const original=await probe(browser,a.url,config),optimized=await probe(browser,b.url,config);
   assert.deepEqual(original,optimized,'WebKit CSS-only regression: '+config.name);
   console.log('CP006 WEBKIT PASS '+config.name+' screenshot='+original.screenshot+' simulated-touch=PASS');
  }
  console.log('CP006 WEBKIT RESULT PASS (Linux WebKit, not Safari on physical iPhone)');
 }finally{await browser?.close();await a.close();await b.close();}
})().catch(e=>{console.error('CP006 WEBKIT RESULT FAIL:',e.stack||e);process.exitCode=1});
