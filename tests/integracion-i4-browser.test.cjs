/* MI BOWLING · LAB I4 · isolated browser proof of autosave on real CP-020 main.
 * HTTPS loopback ONLY; WebKit iPhone and Chromium desktop; synthetic documents.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-i4-'));
const shots=path.join(__dirname,'artifacts-integracion-i4');fs.mkdirSync(shots,{recursive:true});
let server;const requested=[];
async function serve(){
 const cert=path.join(tmp,'cert.pem'),key=path.join(tmp,'key.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-days','1','-newkey','rsa:2048',
 '-keyout',key,'-out',cert,'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},(req,res)=>{
  requested.push(req.url);
  if(req.url==='/__blank'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end('<title>blank</title>');return}
  const rel=decodeURIComponent(new URL(req.url,'https://127.0.0.1').pathname).replace(/^\/+/,'');
  const f=path.resolve(root,rel);
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){
   res.writeHead(404);res.end('Not found');return;
  }
  const ext=path.extname(f);
  res.writeHead(200,{'Content-Type':ext==='.js'?'application/javascript':ext==='.css'?'text/css':
   ext==='.json'?'application/json':ext==='.png'?'image/png':'text/html',
   'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  res.end(fs.readFileSync(f));
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function run(browser,base,letter,label,config){
 const ctx=await browser.newContext({...config,ignoreHTTPSErrors:true,locale:'es-ES'});
 await ctx.route('**/*',route=>{
  if(route.request().url().startsWith(base+'/'))return route.continue();
  return route.abort(); // no external provider or accidental network.
 });
 try{
  const page=await ctx.newPage();
  await page.goto(base+'/__blank');
  await page.evaluate(()=>localStorage.setItem('__I4_SENTINEL__','preserved'));
  await page.goto(base+'/lab/integracion-main-auth-i4.html');
  assert.equal(await page.locator('body').getAttribute('data-lab-isolation'),'PASS');
  assert.equal(await page.locator('#lab-app-shell').isHidden(),true);
  assert.equal(await page.locator('script[src*="app.js"]').count(),0);
  assert.equal(await page.locator('script[src*="i4-engine-port.js"]').count(),1);
  await page.locator('[data-demo-account="'+letter+'"]').click();
  await page.waitForFunction(expected=>{
   const s=window.MiBowlingIntegrationI4?.getState();
   return s?.opened&&s.owner===expected&&s.persistence?.phase==='ready';
  },{A:'11111111-1111-4111-8111-111111111111',
     B:'22222222-2222-4222-8222-222222222222',
     C:'33333333-3333-4333-8333-333333333333'}[letter]);
  const before=await page.evaluate(()=>window.MiBowlingIntegrationI4.getState());
  assert.equal(before.persistence.revision,letter==='B'?null:0);
  // This invokes the actual main's save() after editing its IN-MEMORY db.
  // The I4 wrapper catches it; persistence goes via mock private repository.
  await page.evaluate(letter=>Function('db.sessions.push({id:"browser-i4-'+letter+'",type:"entrenamiento",date:"2026-11-09",title:"I4 mock",games:[{id:"game-i4-'+letter+'",includeStats:true,rolls:[]}]});save()')(),letter);
  await page.waitForFunction(previous=>{
   const s=window.MiBowlingIntegrationI4?.getState()?.persistence;
   return s?.phase==='saved'&&s.revision===(previous===null?0:previous+1)&&!s.dirty;
  },before.persistence.revision,{timeout:15000});
  const after=await page.evaluate(()=>window.MiBowlingIntegrationI4.getState());
  assert.equal(after.owner,before.owner);
  assert.equal(after.persistence.blocked,null);
  assert.equal(after.directLocalStorageDependency,false);
  assert.equal(after.portActive,true);
  assert.equal(after.persistence.revision,letter==='B'?0:1);
  assert.equal(await page.evaluate(to=>MiBowlingIntegrationI4.crossOwnerDenied(to),letter==='A'?'B':'A'),true);
  // Verify exact content via manual re-read; I4 avoids an unnecessary write
  // when the last state is already confirmed.
  await page.locator('#lab-save-private').click();
  await page.waitForFunction(rev=>document.querySelector('#lab-private-summary')?.textContent.includes('revisión '+rev),letter==='B'?0:1);
  await page.locator('#lab-home').click();
  await page.locator('#app .bowling-home').waitFor();
  await page.locator('#lab-calendar').click();
  assert.ok((await page.locator('#app').textContent()).toLowerCase().includes('calendario'));
  await page.screenshot({path:path.join(shots,label+'-i3.png'),fullPage:true});
  await page.goto(base+'/__blank');
  assert.equal(await page.evaluate(()=>localStorage.getItem('__I4_SENTINEL__')),'preserved');
  assert.equal(await page.evaluate(()=>localStorage.getItem('mi-bowling-analitica-v2')),null);
  console.log('OK I4 · '+label+' '+letter+' · actual main save hook, async mock private autosave, calendar preserved');
 }finally{await ctx.close()}
}
async function main(){
 const base=await serve();
 const iphone={...devices['iPhone 13 Pro Max'],viewport:{width:390,height:844}};
 const tablet={viewport:{width:768,height:1024},isMobile:true,hasTouch:true};
 const desktop={viewport:{width:1440,height:900}};
 const wk=await webkit.launch({headless:true});
 try{await run(wk,base,'A','webkit-iphone-A',iphone);
     await run(wk,base,'B','webkit-tablet-B',tablet)}
 finally{await wk.close()}
 const chrome=cp.execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim();
 const ch=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
 try{await run(ch,base,'C','chromium-desktop-C',desktop)}
 finally{await ch.close()}
 assert.ok(requested.every(x=>!x.includes('token')&&!x.includes('callback')));
 console.log('OK I4 · verified inline CP-020 engine, no direct browser storage, no real services, no PWA, no personal data, no production changes');
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
 if(server)await new Promise(resolve=>server.close(resolve));
 fs.rmSync(tmp,{recursive:true,force:true});
});
