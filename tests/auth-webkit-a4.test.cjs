/* MI BOWLING · LAB A4 · WebKit/iPhone/Safari callback verification.
 * Real WebKit engine via Playwright, but iPhone and installed PWA are EMULATED.
 * HTTPS loopback only; every account, token and SDK provider is fictitious.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const https=require('node:https');
const {execFileSync}=require('node:child_process');
const {webkit,devices}=require('playwright');

const root=path.resolve(__dirname,'..');
const tok=(pair)=>pair.repeat(32);
const tokens={email:tok('ab'),recovery:tok('cd'),expired:tok('ef'),owner:tok('12')};
const uuidA='11111111-1111-4111-8111-111111111111',uuidB='22222222-2222-4222-8222-222222222222';
const out=path.join(__dirname,'artifacts-webkit-a4');
fs.mkdirSync(out,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mi-bowling-auth-a4-'));
let server,browser;
const requests=[];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
function startHttps(){
 const key=path.join(temp,'localhost.key'),cert=path.join(temp,'localhost.crt');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost',
  '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
  requests.push({url:req.url,referer:req.headers.referer||''});
  const pathname=new URL(req.url,'https://localhost').pathname;
  const relative=decodeURIComponent(pathname).replace(/^\/+/, '');
  const filename=path.resolve(root,relative||'index.html');
  if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){
   res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;
  }
  res.writeHead(200,{
   'Content-Type':mime[path.extname(filename)]||'application/octet-stream',
   'Cache-Control':'no-store','Referrer-Policy':'no-referrer',
   'X-Content-Type-Options':'nosniff'
  });
  res.end(fs.readFileSync(filename));
 });
 return new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>resolve('https://127.0.0.1:'+server.address().port));
 });
}
function installFakeSdk(page,scenario='ok'){
 return page.addInitScript(({scenario,uuidA,uuidB,expected})=>{
  const state={scenario,verified:false,owner:uuidA,email:'ficticio@example.test',
   calls:[],passwordUpdates:0,signedOut:0,options:null};
  window.__fakeAuthA4=state;
  window.MI_BOWLING_AUTH_CONFIG={
   url:'https://abcdefghijk.supabase.co',
   publishableKey:'sb_publishable_FAKE_ONLY_NOT_A_REAL_KEY_000000'
  };
  window.supabase={createClient:(url,key,options)=>{
   state.options=options.auth;
   return {auth:{
    async verifyOtp({type,token_hash}){
     state.calls.push({method:'verifyOtp',type,hashMatches:token_hash===expected});
     if(!['email','recovery'].includes(type)||token_hash!==expected||
        scenario==='expired'||scenario==='replay')return {data:null,error:{message:'Expired or already used'}};
     state.verified=true;
     return {data:{session:{access_token:'NOT_REAL_TEST_TOKEN'}},error:null};
    },
    async getUser(){
     state.calls.push({method:'getUser'});
     if(!state.verified)return {data:null,error:{message:'Unauthenticated'}};
     return {data:{user:{id:state.owner,email:state.email,email_confirmed_at:'2026-11-08T20:00:00Z'}},error:null};
    },
    async updateUser({password}){
     state.calls.push({method:'updateUser',length:password.length});
     if(!state.verified||state.owner!==uuidA)return {data:null,error:{message:'Not authorized'}};
     state.passwordUpdates++;return {data:{user:{}},error:null};
    },
    async signOut(){state.calls.push({method:'signOut'});state.signedOut++;state.verified=false;return {data:{},error:null};},
    async signInWithPassword(){throw Error('No real sign-ins in LAB');},
    async signUp(){throw Error('No real sign-ups in LAB');},
    async resend(){throw Error('No real emails in LAB');},
    async resetPasswordForEmail(){throw Error('No real recovery emails in LAB');}
   }};
  }};
 },{scenario,uuidA,uuidB,expected:tokens[scenario]||tokens.email});
}
async function display(page,label){
 const metrics=await page.evaluate(()=>{
  const button=document.querySelector('#auth-link-verify')||document.querySelector('#auth-link-password-form button');
  const rect=button?.getBoundingClientRect();
  return {
   width:window.innerWidth,
   documentWidth:document.documentElement.scrollWidth,
   buttonHeight:rect?.height||0,
   active:document.activeElement?.id||'',
   hasScoreScript:!!document.querySelector('script[src*="app.js"]'),
   statusLive:document.querySelector('#auth-link-status')?.getAttribute('aria-live'),
   statusRole:document.querySelector('#auth-link-status')?.getAttribute('role')
  };
 });
 assert.ok(metrics.documentWidth<=metrics.width+2,label+' horizontal overflow '+JSON.stringify(metrics));
 assert.ok(metrics.buttonHeight>=44,label+' tap target too small '+JSON.stringify(metrics));
 assert.ok(!metrics.hasScoreScript,label+' loaded scoring application');
 assert.equal(metrics.statusRole,'status',label+' status role absent');
 assert.equal(metrics.statusLive,'polite',label+' polite live announcements absent');
}
async function getState(page){
 return page.evaluate(()=>window.MiBowlingEmailCallbackLAB?.getState());
}
async function checkNavigation(page,base){
 const cleaned=base+'/auth/callback.html';
 assert.equal(page.url(),cleaned,'Fragment/query token was not removed BEFORE click');
 await page.goto(base+'/index.html');
 await page.goBack();
 await page.waitForLoadState('domcontentloaded');
 assert.equal(page.url(),cleaned,'Browser back restored a secret URL');
 const state=await getState(page);
 assert.ok(!state?.hasPendingToken,'Back navigation resurrected token');
 assert.notEqual(state?.mode,'password','Back navigation restored recovery privileges');
}
async function run(){
 const base=await startHttps();
 browser=await webkit.launch({headless:true});
 const phone=devices['iPhone 13 Pro Max']||{
  viewport:{width:428,height:926},screen:{width:428,height:926},
  deviceScaleFactor:3,isMobile:true,hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
 };
 // Separate storage: installed PWA and Safari can share a URL but must not share auth state.
 const pwa=await browser.newContext({...phone,ignoreHTTPSErrors:true,locale:'es-ES'});
 const safari=await browser.newContext({...phone,ignoreHTTPSErrors:true,locale:'es-ES'});
 const pwaPage=await pwa.newPage();
 await pwaPage.goto(base+'/auth/callback.html');
 await pwaPage.evaluate(()=>{
  localStorage.setItem('mi-bowling:fake-pwa-personal','PWA_ONLY');
  sessionStorage.setItem('mi-bowling:fake-original-pkce','PWA_PKCE_ONLY');
 });
 const mail=await safari.newPage();
 await installFakeSdk(mail,'email');
 await mail.goto(base+'/auth/callback.html#token_hash='+tokens.email+'&type=email');
 assert.equal((await getState(mail)).mode,'pending');
 assert.equal(mail.url(),base+'/auth/callback.html','Fragment must be scrubbed on load');
 assert.equal(await mail.evaluate(()=>window.__fakeAuthA4.calls.length),0,'Email preview should not consume token');
 assert.equal(await mail.evaluate(()=>localStorage.getItem('mi-bowling:fake-pwa-personal')),null);
 assert.equal(await mail.evaluate(()=>sessionStorage.getItem('mi-bowling:fake-original-pkce')),null);
 await display(mail,'iPhone Safari email');
 const verify=mail.getByRole('button',{name:'Verificar enlace'});
 assert.equal(await verify.isEnabled(),true);
 await verify.tap(); // real WebKit touch events
 await mail.getByRole('heading',{name:'Correo confirmado'}).waitFor();
 assert.equal((await getState(mail)).mode,'confirmed');
 const emailState=await mail.evaluate(()=>window.__fakeAuthA4);
 assert.equal(emailState.calls.filter(x=>x.method==='verifyOtp').length,1);
 assert.ok(emailState.signedOut>=1);
 assert.equal(emailState.options.detectSessionInUrl,false);
 assert.equal(emailState.options.autoRefreshToken,false);
 assert.equal(await mail.evaluate(()=>window.__fakeAuthA4.options.storage.getItem('anything')),null);
 assert.equal(await pwaPage.evaluate(()=>sessionStorage.getItem('mi-bowling:fake-original-pkce')),'PWA_PKCE_ONLY');
 await mail.screenshot({path:path.join(out,'webkitiPhone13ProMax-email.png'),fullPage:true});
 await checkNavigation(mail,base);
 // Recovery in another WebKit Safari context; no PWA storage shared.
 const recovery=await safari.newPage();
 await installFakeSdk(recovery,'recovery');
 await recovery.goto(base+'/auth/callback.html#token_hash='+tokens.recovery+'&type=recovery');
 assert.equal((await getState(recovery)).mode,'pending');
 await recovery.getByRole('button',{name:'Verificar enlace'}).tap();
 await recovery.getByRole('heading',{name:'Nueva contraseña'}).waitFor();
 assert.equal((await getState(recovery)).mode,'password');
 await display(recovery,'iPhone Safari recovery');
 assert.equal(await recovery.getByLabel('Nueva contraseña').count(),1);
 assert.equal(await recovery.getByLabel('Repetir contraseña').count(),1);
 // Mismatched passwords are not sent to provider. Status is announced.
 await recovery.getByLabel('Nueva contraseña').fill('ClaveSegura12345');
 await recovery.getByLabel('Repetir contraseña').fill('OtraClave12345');
 await recovery.getByRole('button',{name:'Cambiar contraseña'}).tap();
 await recovery.getByRole('status').getByText(/contraseña debe tener/).waitFor();
 assert.equal(await recovery.evaluate(()=>window.__fakeAuthA4.passwordUpdates),0);
 await recovery.getByLabel('Repetir contraseña').fill('ClaveSegura12345');
 await recovery.getByRole('button',{name:'Cambiar contraseña'}).tap();
 await recovery.getByRole('heading',{name:'Contraseña actualizada'}).waitFor();
 assert.equal(await recovery.evaluate(()=>window.__fakeAuthA4.passwordUpdates),1);
 assert.ok((await recovery.evaluate(()=>window.__fakeAuthA4.signedOut))>=1);
 await recovery.screenshot({path:path.join(out,'webkitiPhone13ProMax-password-changed.png'),fullPage:true});
 await checkNavigation(recovery,base);
 // Replay/expired token: WebKit does not enter user state.
 const expired=await safari.newPage();
 await installFakeSdk(expired,'expired');
 await expired.goto(base+'/auth/callback.html#token_hash='+tokens.expired+'&type=email');
 await expired.getByRole('button',{name:'Verificar enlace'}).tap();
 await expired.getByRole('heading',{name:'Enlace no disponible'}).waitFor();
 assert.equal((await getState(expired)).verified,false);
 assert.equal(await expired.evaluate(()=>window.__fakeAuthA4.passwordUpdates),0);
 assert.equal(expired.url(),base+'/auth/callback.html');
 // The actual unconfigured callback must be disabled.
 const unconfigured=await safari.newPage();
 await unconfigured.goto(base+'/auth/callback.html#token_hash='+tokens.email+'&type=email');
 await unconfigured.getByRole('button',{name:'Verificar enlace'}).waitFor();
 assert.equal(await unconfigured.getByRole('button',{name:'Verificar enlace'}).isDisabled(),true);
 assert.equal((await getState(unconfigured)).hasAuth,false);
 // Malicious query and unknown flow fail closed before any remote API.
 for(const suffix of [
  '?next=https://bad.invalid#token_hash='+tokens.email+'&type=email',
  '#access_token='+tokens.email+'&type=email',
  '#token_hash='+tokens.email+'&type=recovery&type=email'
 ]){
  const bad=await safari.newPage();
  await installFakeSdk(bad,'email');
  await bad.goto(base+'/auth/callback.html'+suffix);
  await bad.getByRole('heading',{name:'Enlace no disponible'}).waitFor();
  assert.equal((await getState(bad)).hasPendingToken,false);
  assert.equal(await bad.evaluate(()=>window.__fakeAuthA4.calls.length),0);
  assert.equal(bad.url(),base+'/auth/callback.html','Rejected URL must not navigate to an attacker');
  await bad.close();
 }
 // New WebKit context, different viewports, keyboard nav and platform-style layout.
 for(const [label,emulation] of [
  ['iPhoneLandscape',{...phone,viewport:{width:844,height:390}}],
  ['tablet',{viewport:{width:768,height:1024},deviceScaleFactor:2,isMobile:true,hasTouch:true}],
  ['desktop',{viewport:{width:1440,height:900},deviceScaleFactor:1,isMobile:false,hasTouch:false}]
 ]){
  const context=await browser.newContext({...emulation,ignoreHTTPSErrors:true});
  const page=await context.newPage();
  await installFakeSdk(page,'email');
  await page.goto(base+'/auth/callback.html#token_hash='+tokens.email+'&type=email');
  await display(page,label);
  const button=page.getByRole('button',{name:'Verificar enlace'});
  assert.equal(await button.count(),1);
  await button.focus();
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'auth-link-verify',label+' keyboard focus');
  await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:'Correo confirmado'}).waitFor();
  await page.screenshot({path:path.join(out,'webkit-'+label+'-email.png'),fullPage:true});
  await context.close();
 }
 assert.equal(await pwaPage.evaluate(()=>localStorage.getItem('mi-bowling:fake-pwa-personal')),'PWA_ONLY');
 assert.equal(await pwaPage.evaluate(()=>sessionStorage.getItem('mi-bowling:fake-original-pkce')),'PWA_PKCE_ONLY');
 assert.ok(requests.every(r=>!r.url.includes('token_hash')&&!r.referer.includes('token_hash')),
  'Email token leaked to loopback HTTPS server/referrer');
 assert.ok(requests.every(r=>!r.url.includes('access_token')),'Access token in network request');
 // The attempted attacker URL may appear as a rejected query on the loopback request; it was never navigated to.
 console.log('OK · Real Playwright WebKit engine, iPhone 13 Pro Max touch & landscape, tablet, desktop');
 console.log('OK · Separate Safari/PWA storage contexts, callback without PKCE, verified owner + signout');
 console.log('OK · Recovery mismatch UX, replay/expired URLs, re-navigation/back/URL scrubbed');
 console.log('OK · Accessibility: names/labels, focus Enter, 44px touch controls, no overflow');
 console.log('OK · No token in HTTPS requests; no real external network service/account');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
 try{await browser?.close();}catch(_){}
 if(server)await new Promise(resolve=>server.close(resolve));
 fs.rmSync(temp,{recursive:true,force:true});
});
