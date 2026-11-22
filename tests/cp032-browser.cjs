'use strict';
/* CP032: Real PWA shell, localhost-only & fictitious games, no actual user storage. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'');}catch{res.writeHead(400);return res.end();}
 if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,v)=>{if(e){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(v)});
});
const formats=[[375,667],[390,844],[393,852],[428,926],[430,932]];
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;const url='http://127.0.0.1:'+server.address().port+'/?cp032lab=ficticio';
 try{
  browser=await chromium.launch({headless:true});
  for(const [width,height] of formats){
   const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'allow'});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForSelector('.cp021-root .screen',{timeout:30000});
   await page.waitForFunction(()=>!!window.__CP015_LAB&&window.MiBowlingRegistroCP021?.enabled===true,null,{timeout:30000});
   const before=await page.evaluate(()=>{
     const scr=document.querySelector('.cp021-root .screen'),foot=scr?.querySelector('.footer'),root=document.querySelector('.cp021-root');
     return {version:APP_VERSION,documentHeight:document.documentElement.scrollHeight,windowHeight:innerHeight,rootHeight:root.clientHeight,rootScroll:root.scrollHeight,
       footerBottom:foot.getBoundingClientRect().bottom,footerTop:foot.getBoundingClientRect().top,scoreBottom:scr.querySelector('#scoreboard').getBoundingClientRect().bottom,
       rootRight:root.getBoundingClientRect().right,viewportWidth:innerWidth,storage:Object.keys(localStorage)};
   });
   assert.equal(before.version,'3.3.14-lab-cp032-1');
   assert(before.footerBottom<=height+2&&before.footerTop>before.scoreBottom,'Footer clipped or overlapping '+width+'x'+height+' '+JSON.stringify(before));
   assert(before.documentHeight<=height+2&&before.rootScroll<=before.rootHeight+2,'Vertical overflow '+width+'x'+height+' '+JSON.stringify(before));
   assert(before.rootRight<=width+2,'Horizontal overflow');
   assert(before.storage.every(k=>!k.startsWith('mi-bowling-')),'Real application key written in synthetic mode');
   assert.equal(await page.locator('#scoreboard .frame').count(),10,'Lost frames '+width);
   assert.equal(await page.locator('[data-mode]').count(),3,'Missing mode '+width);
   await page.locator('[data-mode="cantidad"]').click();
   await page.locator('#quantity-grid [data-key="7"]').click();
   await page.locator('#submit').click();
   let snap=await page.evaluate(()=>window.__CP015_LAB.snapshot());
   assert.equal(snap.document.sessions[0].games[0].rolls[0].pinDetail,'count','Missing count mode roll');
   assert.equal(snap.document.sessions[0].games[0].rolls[0].pinIds,null,'Unknown pins fabricated');
   await page.locator('#undo').click();
   await page.locator('[data-mode="final"]').click();
   for(const d of ['2','7','8'])await page.locator('#final-pad [data-digit="'+d+'"]').click();
   await page.locator('#submit').click();
   snap=await page.evaluate(()=>window.__CP015_LAB.snapshot());
   assert.equal(snap.document.sessions[0].games[0].finalOnlyScore,278);
   assert.equal(snap.document.sessions[0].games[0].rolls.length,0,'Invented final-only frames');
   const storage=await page.evaluate(()=>Object.keys(localStorage));
   assert(storage.every(k=>!k.startsWith('mi-bowling-')),'Synthetic fixture wrote application storage');
   assert(!errors.length,'JS runtime exception '+errors.slice(0,2).join('|'));
   console.log('CP032 VIEWPORT PASS '+width+'x'+height+' / 3 modes / synthetic memory / no scroll');
   await ctx.close();
  }
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  const fake={version:2,hand:'diestro',balls:[],patterns:[],sessions:[]};
  await page.addInitScript(data=>localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(data)),fake);
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled===false&&typeof go==='function',null,{timeout:30000});
  assert.equal(await page.locator('.cp021-root').count(),0,'CP032 exposed with existing storage');
  const stored=await page.evaluate(()=>localStorage.getItem('mi-bowling-analitica-v2'));
  assert.deepEqual(JSON.parse(stored),fake,'Synthetic existing data changed');
  await ctx.close();
  console.log('CP032 FAIL-CLOSED PASS · existing storage disables LAB and keeps data unchanged.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error('CP032 BROWSER FAIL',e);process.exitCode=1;try{server.close()}catch{}});
