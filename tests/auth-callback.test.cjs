/* MI BOWLING · LAB A3 · token_hash callback regression.
 * Safari/PWA storage separation is simulated with fully isolated contexts.
 * No real emails, sessions, Supabase account or service. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
const HEX='ab'.repeat(32),HEX2='cd'.repeat(32);
const uuidA='11111111-1111-4111-8111-111111111111';
const uuidB='22222222-2222-4222-8222-222222222222';
const events=[];
let active=null,confirmed=false,owner=uuidA,clock=5000,shouldFail=false,updateCalls=0;
const used=new Set();
const provider={
 async verifyLinkToken(type,hash){
  events.push(['verifyLinkToken',type,hash]);
  if(shouldFail||used.has(hash))throw Error('Expired or replayed token');
  used.add(hash);
  active={type,hash};
  confirmed=true;
  return {verifiedByServer:true};
 },
 async getVerifiedUser(){
  events.push(['getVerifiedUser']);
  if(!active||!confirmed)throw Error('User not verified');
  return {id:owner,email:'fixture@example.test'};
 },
 async updatePassword(password){updateCalls++;events.push(['updatePassword',password.length]);return true;},
 async signOut(){events.push(['signOut']);active=null;}
};
const status={textContent:''};
function makeDOM(){
 return {
  hidden:false,innerHTML:'',
  querySelector(selector){return selector==='#auth-link-status'?status:null}
 };
}
function makeLocation(type,hash=HEX,search=''){
 return {pathname:'/Mi-Bowling/auth/callback.html',hash:'#token_hash='+hash+'&type='+type,search};
}
function newController(location,auth=provider){
 const history={url:null,replaceState(a,b,url){this.url=url;events.push(['scrub',url]);}};
 const element=makeDOM(),scope={window:null,URLSearchParams,URL,console};
 scope.window=scope;vm.createContext(scope);
 vm.runInContext(source('auth-email-callback.js'),scope,{filename:'auth-email-callback.js'});
 const ctl=scope.MiBowlingEmailCallback.create({element,location,history,
  document:{getElementById:()=>element},auth,now:()=>clock});
 return {ctl,history,element,scope};
}
(async()=>{
 // Same-tab and cross-tab: browser B has no code_verifier or storage from browser A.
 const originalPWA=new Map([['supabase.auth.code-verifier','fake-only-on-ios-pwa']]);
 const safariTab=new Map();assert.equal(safariTab.size,0);
 const landing=newController(makeLocation('email',HEX));
 assert.equal(landing.ctl.getState().mode,'pending');
 assert.equal(landing.history.url,'/Mi-Bowling/auth/callback.html');
 assert.equal(events.filter(e=>e[0]==='verifyLinkToken').length,0,'Email scanner/prefetch cannot consume token');
 assert.equal(landing.element.innerHTML.includes('Verificar enlace'),true);
 await landing.ctl.verify();
 assert.equal(landing.ctl.getState().mode,'confirmed');
 assert.equal(landing.ctl.getState().verified,false);
 assert.equal(active,null,'Email confirmation must close temporary session');
 assert.equal(originalPWA.size,1,'Old PWA state must not be read or modified');
 assert.equal(safariTab.size,0,'The browser callback must not copy PWA storage');
 await assert.rejects(landing.ctl.verify(),/ya utilizado/);
 // Recovery link works even when original page/device stores nothing.
 const recovery=newController(makeLocation('recovery',HEX2));
 assert.equal(recovery.ctl.getState().mode,'pending');
 await recovery.ctl.verify();
 assert.equal(recovery.ctl.getState().mode,'password');
 assert.equal(recovery.ctl.getState().verified,true);
 assert.ok(recovery.element.innerHTML.includes('Nueva contraseña'));
 await assert.rejects(recovery.ctl.updatePassword('corta','corta'),/requisitos/);
 const before=updateCalls;
 assert.equal(await recovery.ctl.updatePassword('CambioValido12345','CambioValido12345'),true);
 assert.equal(updateCalls,before+1);
 assert.equal(recovery.ctl.getState().mode,'done');
 assert.equal(recovery.ctl.getState().verified,false);
 assert.equal(active,null);
 await assert.rejects(recovery.ctl.updatePassword('CambioValido12345','CambioValido12345'),/no existe recuperación/);
 // A one-time link cannot be reused in another isolated browser context.
 const replay=newController(makeLocation('email',HEX));
 await assert.rejects(replay.ctl.verify(),/No se pudo verificar/);
 assert.equal(replay.ctl.getState().mode,'error');
 // Reject query-based magic links, open redirects, unknown/doubled params and access tokens.
 const invalid=[
  {hash:'#access_token=evil&type=email',search:''},
  {hash:'#token_hash='+HEX+'&type=email&type=recovery',search:''},
  {hash:'#token_hash='+HEX+'&type=signup',search:''},
  {hash:'#token_hash='+HEX+'&type=email&next=https://evil.example',search:''},
  {hash:'#token_hash=bad&type=email',search:''},
  {hash:'#token_hash='+HEX+'&type=email',search:'?next=https://evil.example'},
  {hash:'#token_hash='+HEX+'&type=email',search:'?code=fake'},
 ];
 for(const values of invalid){
  const caseLocation={...makeLocation('email'),...values};
  const failed=newController(caseLocation);
  assert.equal(failed.ctl.getState().mode,'error');
  assert.equal(failed.ctl.getState().hasPendingToken,false);
  assert.equal(failed.history.url,'/Mi-Bowling/auth/callback.html');
 }
 const unconfigured=newController(makeLocation('email',HEX2),null);
 assert.equal(unconfigured.ctl.getState().hasAuth,false);
 await assert.rejects(unconfigured.ctl.verify(),/no disponible|utilizado/);
 const expiryHex='ef'.repeat(32);
 const expired=newController(makeLocation('recovery',expiryHex));
 await expired.ctl.verify();clock+=10*60*1000+1;
 await assert.rejects(expired.ctl.updatePassword('NuevaClaveSegura123','NuevaClaveSegura123'),/caducada/);
 assert.equal(expired.ctl.getState().mode,'error');assert.equal(active,null);
 const ownerHash='12'.repeat(32);
 clock+=1000;
 const ownerChanged=newController(makeLocation('recovery',ownerHash));
 await ownerChanged.ctl.verify();owner=uuidB;
 const n=updateCalls;
 await assert.rejects(ownerChanged.ctl.updatePassword('NuevaClaveSegura123','NuevaClaveSegura123'),/Error de recuperación/);
 assert.equal(updateCalls,n,'Cross-owner must never update password');
 assert.equal(active,null);
 owner=uuidA;
 const invalidToken='34'.repeat(32);
 shouldFail=true;
 const network=newController(makeLocation('recovery',invalidToken));
 await assert.rejects(network.ctl.verify(),/No se pudo verificar/);
 assert.equal(network.ctl.getState().mode,'error');
 assert.equal(active,null);
 shouldFail=false;
 const cancel=newController(makeLocation('email','45'.repeat(32)));
 await cancel.ctl.cancel();
 assert.equal(cancel.ctl.getState().disposed,true);
 await assert.rejects(cancel.ctl.verify(),/no disponible|ya utilizado/);
 // No app, local storage or legacy data from callback.
 const src=source('auth-email-callback.js')+source('auth-link-boot.js');
 assert.ok(!/\b(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\s*\(/.test(src));
 assert.ok(!src.includes('mi-bowling-analitica-v2'));
 const html=source('auth/callback.html');
 assert.ok(html.includes('no-referrer')&&html.includes('script-src &#39;self&#39;')===false);
 assert.ok(html.includes('script-src \'self\''));
 assert.ok(!/<script>\s*[\s\S]*?<\/script>/.test(html),'No inline callback scripts');
 assert.ok(!/app\.js/.test(html),'No scores should open from mail');
 for(const file of ['docs/email-templates/LAB_A3_confirm_signup_REVIEW_ONLY.html','docs/email-templates/LAB_A3_reset_password_REVIEW_ONLY.html']){
  assert.ok(source(file).includes('TokenHash'),'Custom template must use token hash');
  assert.ok(source(file).includes('#token_hash='),'Keep hash out of HTTP referrer/server logs');
 }
 // Fake callback SDK with completely isolated in-memory storage and no code verifier.
 const bootstrap={window:null,URL,URLSearchParams,console};
 bootstrap.window=bootstrap;vm.createContext(bootstrap);
 for(const file of ['auth-supabase-adapter.js','auth-boot.js','auth-email-callback.js','auth-link-boot.js'])
  vm.runInContext(source(file),bootstrap,{filename:file});
 const store=bootstrap.MiBowlingEmailCallbackBoot.memoryStorage();
 store.setItem('x','y');assert.equal(store.getItem('x'),'y');store.removeItem('x');assert.equal(store.getItem('x'),null);
 const cfg={url:'https://abcdefghijk.supabase.co',publishableKey:'sb_publishable_TEST_ONLY_FAKE_123456'};
 let optionsPassed;
 bootstrap.MI_BOWLING_AUTH_CONFIG=cfg;
 bootstrap.location={protocol:'https:',hostname:'bowling.example.test',origin:'https://bowling.example.test',
  pathname:'/Mi-Bowling/auth/callback.html',hash:'#token_hash='+'56'.repeat(32)+'&type=email',search:''};
 bootstrap.history={replaceState(){}};
 bootstrap.document={getElementById:()=>makeDOM()};
 bootstrap.supabase={createClient(url,key,opts){
  optionsPassed=opts;return {auth:{
   getUser:async()=>({data:{user:{id:uuidA,email:'fixture@example.test',email_confirmed_at:'2026-11-08'}}}),
   signInWithPassword:async()=>({data:{session:{access_token:'mock'}}}),
   signUp:async()=>({data:{user:null,session:null}}),
   resend:async()=>({data:{}}),
   resetPasswordForEmail:async()=>({data:{}}),
   updateUser:async()=>({data:{}}),
   signOut:async()=>({data:{}}),
   verifyOtp:async()=>({data:{session:{access_token:'mock'}}})
  }}}
 };
 const boot=bootstrap.MiBowlingEmailCallbackBoot.boot();
 assert.equal(boot.getState().hasAuth,true);
 assert.equal(optionsPassed.auth.detectSessionInUrl,false);
 assert.equal(optionsPassed.auth.autoRefreshToken,false);
 assert.equal(optionsPassed.auth.persistSession,true);
 assert.equal(optionsPassed.auth.storage.getItem('anything'),null);
 assert.equal(Object.keys(originalPWA).length,0); // no touching PWA data by callback
 console.log('OK · iPhone PWA/browser isolated storage mock: token_hash email/recovery without shared PKCE verifier');
 console.log('OK · URL fragment stripped, explicit user click, link replay/expiration blocked');
 console.log('OK · recovery requires remote user, same owner, local expiry, mandatory sign-out');
 console.log('OK · no external accounts, network, score access or backend creation');
})().catch(err=>{console.error(err);process.exitCode=1});
