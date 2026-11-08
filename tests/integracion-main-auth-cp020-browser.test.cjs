/* MI BOWLING · LAB I2 · Browser integration of unchanged main CP-020.
 * HTTPS localhost with isolated Playwright browsers and three fake UUIDs.
 * Never reaches real accounts, production storage, email or a remote URL.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..'),shotDir=path.join(__dirname,'artifacts-integracion-i2');
fs.mkdirSync(shotDir,{recursive:true});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-main-i2-'));
let server;const hits=[];
async function serve(){
 const cert=path.join(tmp,'cert.pem'),key=path.join(tmp,'key.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1',
 '-newkey','rsa:2048','-keyout',key,'-out',cert,'-subj','/CN=localhost',
 '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},(req,res)=>{
  hits.push({url:req.url,referer:req.headers.referer||''});
  if(req.url==='/__blank'){
   res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
   res.end('<!doctype html><html><title>Blank test origin</title></html>');return;
  }
  const rel=decodeURIComponent(new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,'');
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404);res.end('not found');return;
  }
  const ext=path.extname(file);
  res.writeHead(200,{'Content-Type':ext==='.js'?'application/javascript':ext==='.css'?'text/css':
   ext==='.json'?'application/json':ext==='.png'?'image/png':'text/html',
   'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end(fs.readFileSync(file));
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);server.listen(0,'127.0.0.1',resolve);
 });
 return 'https://127.0.0.1:'+server.address().port;
}
const select=letter=>'[data-demo-account="'+letter+'"]';
async function state(page){return page.evaluate(()=>window.MiBowlingIntegrationI2.getState())}
async function waitOpened(page,letter){
 const id={A:'11111111-1111-4111-8111-111111111111',
 B:'22222222-2222-4222-8222-222222222222',
 C:'33333333-3333-4333-8333-333333333333'}[letter];
 await page.waitForFunction(expected=>{
  const d=window.MiBowlingIntegrationI2?.getState();
  return !!d?.opened&&d.owner===expected;
 },id,{timeout:20000});
 return state(page);
}
async function checkNoRealStorage(page,base){
 await page.goto(base+'/__blank');
 const before=await page.evaluate(()=>{
  localStorage.setItem('__REAL_SENTINEL_I2__','UNCHANGED');
  return localStorage.length;
 });
 await page.goto(base+'/lab/integracion-main-auth-cp020.html?smoke=1');
 await page.locator('#auth-form').waitFor();
 assert.equal(await page.locator('body').getAttribute('data-lab-isolation'),'PASS');
 const guard=await state(page);
 assert.equal(guard.isolation.ready,true);
 assert.equal(guard.isolation.virtualOnly,true);
 assert.equal(guard.isolation.hasIndexedDB,false);
 assert.equal(guard.isolation.serviceWorkerBlocked,true);
 assert.equal(guard.opened,false);
 assert.equal(await page.locator('script[src*="app.js"]').count(),0,'No main before verified email');
 assert.equal(await page.locator('#lab-app-shell').isHidden(),true,'Scores remain gated');
 const wrong=page.locator('#auth-email');
 await wrong.fill('jugador-a@demo.invalid');
 await page.locator('#auth-password').fill('incorrecta');
 await page.locator('#auth-form button[type="submit"]').click();
 await page.locator('#auth-status[data-kind="error"]').waitFor();
 assert.equal((await state(page)).opened,false,'Wrong password cannot access scores');
 return {before};
}
async function afterLeave(page,base,before){
 await page.goto(base+'/__blank');
 const got=await page.evaluate(()=>({
  value:localStorage.getItem('__REAL_SENTINEL_I2__'),
  size:localStorage.length,player:localStorage.getItem('mi-bowling-analitica-v2')
 }));
 assert.equal(got.value,'UNCHANGED','Existing browser data corrupted by LAB');
 assert.equal(got.size,before,'Real localStorage size changed by lab');
 assert.equal(got.player,null,'LAB copied scores into actual localStorage');
}
async function login(page,letter){
 await page.locator(select(letter)).click();
 const got=await waitOpened(page,letter);
 assert.equal(got.auth.verified,true);
 assert.equal(got.auth.opened,true);
 assert.equal(got.isolation.hasIndexedDB,false);
 assert.equal(got.calendarCount,31);
 assert.equal(got.galician,10);
 assert.equal(got.national,21);
 assert.equal(got.localSourceOnly,true,'Local PIN must not become parallel auth');
 assert.equal(await page.locator('script[src*="app.js"]').count(),1,'Main app loaded once');
 assert.equal(await page.locator('#lab-app-shell').isVisible(),true);
 assert.equal(await page.locator('#auth-gate').isVisible(),false);
 assert.equal((got.archive||{}).owner,got.owner);
 assert.equal(got.archive.sha256.length,64);
 assert.equal(await page.evaluate(x=>window.MiBowlingIntegrationI2.crossOwnerDenied(x),
  letter==='A'?'B':'A'),true,'Foreign UUID document was exposed');
 const leakage=await page.evaluate(()=>({
  independent:window.MiBowlingProfiles.current()===null,
  idb:window.indexedDB===undefined,
  src:window.MiBowlingIntegrationI2.getState().archive.source
 }));
 assert.equal(leakage.independent,true,'Local PIN profiles unexpectedly initialized');
 assert.equal(leakage.idb,true);
 assert.ok(leakage.src==='legacy'||/^p-demo-[bc]$/.test(leakage.src));
 return got;
}
async function checkVisual(page,letter){
 await page.locator('#lab-stats').click();
 await page.locator('#lab-pinmap .pinmap-pin').first().waitFor();
 assert.equal(await page.locator('#lab-pinmap .pinmap-pin').count(),10,'Visual 10-pin rack absent');
 const count=await page.evaluate(()=>MiBowlingPinStats.compute(
  Function("return periodAggregate(aggregate('entrenamiento',''))")(),'first').events);
 if(letter==='A')assert.equal(count,11,'A has ten first balls plus one full-rack bonus on tenth-frame spare');
 if(letter==='B')assert.equal(count,0,'B new account must remain empty');
 if(letter==='C')assert.equal(count,0,'C official scores must not appear under training');
 await page.locator('#lab-pinmap .pinmap-tabs button').nth(1).click();
 await page.waitForFunction(()=>MiBowlingPinStats.getMode()==='second');
 await page.locator('#lab-pinmap .pinmap-pin').first().waitFor();
 assert.equal(await page.locator('#lab-pinmap .pinmap-pin').count(),10);
 const vw=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));
 assert.ok(vw.sw<=vw.w+3,'Stats cause horizontal overflow '+JSON.stringify(vw));
 return count;
}
async function checkMainCalendarAndLeague(page){
 await page.locator('#lab-home').click();
 await page.locator('#app .bowling-home').waitFor();
 assert.ok((await page.locator('#app').textContent()).toLowerCase().includes('bowling'));
 await page.locator('#lab-calendar').click();
 await page.waitForFunction(()=>window.MiBowlingIntegrationI2.getState().view==='calendar');
 const calendar=(await page.locator('#app').textContent()).toLowerCase();
 assert.ok(calendar.includes('calendario'),'Published calendar missing');
 await page.locator('#lab-league').click();
 await page.waitForFunction(()=>window.MiBowlingIntegrationI2.getState().view==='league');
 const leagueText=(await page.locator('#app').textContent())||'';
 const diag=await page.evaluate(()=>({
  tab:(()=>{try{return Function('return tab')()}catch(e){return e.message}})(),
  current:window.MiBowlingIntegrationI2?.getState().view,
  ligaDirect:(()=>{try{return Function('return ligaView()')().slice(0,160)}catch(e){return 'ERROR '+e.message+' STACK '+(e.stack||'').slice(0,600)}})()
 }));
 assert.ok(leagueText.toLowerCase().includes('liga nacional'),
  'Liga view is absent. tab='+JSON.stringify(diag)+' html='+leagueText.slice(0,750));
}
async function runUser(browser,base,letter,screen,label){
 const ctx=await browser.newContext({...screen,ignoreHTTPSErrors:true,locale:'es-ES'});
 await ctx.route('**/*',route=>{
  if(route.request().url().startsWith(base+'/'))return route.continue();
  return route.abort();
 });
 try{
  const page=await ctx.newPage();
  const {before}=await checkNoRealStorage(page,base);
  const got=await login(page,letter);
  if(letter==='B'){
   assert.equal(got.sessions,0);
   assert.equal(got.balls,0);
   assert.equal(got.archive.pdfs,0);
  }else{
   assert.equal(got.sessions,1);
   assert.equal(got.balls,1);
   assert.equal(got.archive.pdfs,1);
  }
  await checkVisual(page,letter);
  if(letter==='A'){
   await page.screenshot({path:path.join(shotDir,label+'-estadisticas.png'),fullPage:true});
   await checkMainCalendarAndLeague(page);
   await page.screenshot({path:path.join(shotDir,label+'-liga.png'),fullPage:true});
   await page.locator('#lab-calendar').click();
   await page.screenshot({path:path.join(shotDir,label+'-calendario.png'),fullPage:true});
   await page.locator('#lab-save-private').click();
   await page.waitForFunction(()=>document.querySelector('#lab-private-summary')?.textContent.includes('revisión 1'));
   assert.equal((await state(page)).owner,got.owner);
  }else if(letter==='C'){
   await checkMainCalendarAndLeague(page);
   await page.screenshot({path:path.join(shotDir,label+'-home-liga.png'),fullPage:true});
  }
  await afterLeave(page,base,before);
  console.log('OK · '+label+' · '+letter+' · email mock, main home/calendar, profiles import only, privacy & stats');
 }finally{await ctx.close()}
}
async function main(){
 const base=await serve();
 const iPhone={...devices['iPhone 13 Pro Max'],viewport:{width:390,height:844}};
 const tablet={viewport:{width:768,height:1024},isMobile:true,hasTouch:true,deviceScaleFactor:2};
 const desktop={viewport:{width:1440,height:900},isMobile:false,hasTouch:false,deviceScaleFactor:1};
 const wk=await webkit.launch({headless:true});
 try{
  await runUser(wk,base,'A',iPhone,'webkit-iphone-A');
  await runUser(wk,base,'B',iPhone,'webkit-iphone-B');
  await runUser(wk,base,'C',tablet,'webkit-tablet-C');
 }finally{await wk.close()}
 const chromeBin=cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim();
 const ch=await chromium.launch({headless:true,executablePath:chromeBin,args:['--no-sandbox']});
 try{
  await runUser(ch,base,'A',desktop,'chromium-desktop-A');
  await runUser(ch,base,'B',desktop,'chromium-desktop-B');
 }finally{await ch.close()}
 assert.ok(hits.every(x=>!x.url.includes('token')&&!x.referer.includes('token')),
  'Identity token passed to HTTP server');
 console.log('OK · 31 FGB official calendar events (10 Galicia + 21 national) kept in current-main JS');
 console.log('OK · no real accounts, storage, PWA SW, external network, Supabase or production changes');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
 if(server)await new Promise(resolve=>server.close(resolve));
 fs.rmSync(tmp,{recursive:true,force:true});
});
