'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const fixture={version:2,hand:'diestro',balls:[
 {id:'fake-active',brand:'FICTICIA',model:'ACTIVA CP030',retired:false,photo:'fake-photo-active'},
 {id:'fake-retired',brand:'FICTICIA',model:'RETIRADA CP030',retired:true,photo:'fake-photo-retired'}],patterns:[],
 sessions:[{id:'fake-session',type:'entrenamiento',date:'2026-11-22',games:[{id:'fake-game',rolls:[{frame:1,ball:1,pins:[1,2,3],ballId:'fake-retired'}]}]}]};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')}catch{res.writeHead(400);return res.end()}
 if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(e,bytes)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes)})});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(data=>{if(localStorage.getItem('mi-bowling-analitica-v2')===null)localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(data))},fixture);
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>typeof go==='function'&&!!document.querySelector('.home-start-footer'),null,{timeout:30000});
  assert((await page.locator('.home-start-footer').innerText()).includes('3.3.20-prueba'),'Wrong version running');
  await page.evaluate(()=>go('bolas'));await page.waitForSelector('.mis-bolas .ball-card');
  const live=await page.locator('.mis-bolas').innerText();assert(live.includes('ACTIVA CP030')&&!live.includes('RETIRADA CP030'),'Live arsenal leaked retired');
  await page.evaluate(()=>go('ajustes'));await page.waitForSelector('.mb-retired-settings');
  assert((await page.locator('.mb-retired-settings').innerText()).includes('RETIRADA CP030'),'Settings missing retired unit');
  page.once('dialog',d=>d.accept());await page.locator('.mb-retired-settings button').first().click();
  assert((await page.locator('.mb-retired-settings').innerText()).includes('(0)'),'Recovery failed');
  await page.evaluate(()=>go('bolas'));
  const after=await page.locator('.mis-bolas').innerText();
  assert(after.includes('ACTIVA CP030')&&after.includes('RETIRADA CP030'),'Restored unit not active');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('mi-bowling-analitica-v2')));
  assert(stored.sessions[0].games[0].rolls[0].ballId==='fake-retired','Historical reference lost');
  assert(stored.balls.find(x=>x.id==='fake-retired').photo==='fake-photo-retired','Photo lost');
  assert(!errors.length,'Runtime errors '+errors.slice(0,3).join(' | '));
  await context.close();console.log('CP030 CHROMIUM PASS: active list, Settings recovery, synthetic history and photographs.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error('CP030 CHROMIUM FAIL',e);process.exitCode=1;try{server.close()}catch{}});
