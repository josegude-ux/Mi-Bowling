/* MI BOWLING · Auth LAB A2: email verification, resend, recovery and PKCE bootstrap.
 * All accounts are fixtures; no Supabase service and no email is contacted. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const src=(name)=>fs.readFileSync(path.join(base,name),'utf8');
const calls=[];
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
let user={id:A,email:'a@example.test',email_confirmed_at:'2026-11-08T19:00:00Z',is_anonymous:false};
let confirmEnabled=true,resetFailure=false,now=100000;
let listener=null;
const client={
 auth:{
  async signUp(payload){
   calls.push(['signup',payload]);
   return {data:{user:{id:A,email:payload.email},session:confirmEnabled?null:{access_token:'BAD-MOCK'}},error:null};
  },
  async resend(payload){calls.push(['resend',payload]);return {data:{},error:null}},
  async signInWithPassword(payload){calls.push(['login',payload]);return {data:{session:{access_token:'MOCK'}},error:null}},
  async getUser(){calls.push(['getUser']);return {data:{user},error:null}},
  async resetPasswordForEmail(email,options){calls.push(['reset',email,options]);return resetFailure?
   {data:null,error:{message:'temporary'}}:{data:{},error:null}},
  async updateUser(payload){calls.push(['update',payload]);return {data:{user},error:null}},
  async signOut(){calls.push(['signout']);return {data:{},error:null}},
  onAuthStateChange(fn){listener=fn;return {data:{subscription:{unsubscribe(){listener=null}}}}}
 },
 from(){return {select(){return {eq(name,owner){return Promise.resolve({data:[
  {user_id:owner,doc_type:'personal',payload:{sessions:[],balls:[]},revision:0},
  {user_id:owner,doc_type:'league',payload:{matches:[]},revision:0}
 ],error:null})}}}}}
};
function doc(){
 const status={textContent:'',dataset:{}},button={disabled:false},handlers=[];
 const node={hidden:false,innerHTML:'',
  querySelector(x){
   if(x==='#auth-status')return status;
   if(x==='#auth-form button[type="submit"]')return button;
   return null;
  }};
 return {status,button,node,document:{getElementById:()=>node},handlers};
}
function context(){
 const win={console,window:null};win.window=win;
 vm.createContext(win);
 for(const file of ['auth-supabase-adapter.js','auth-private-repository.js','auth-lab.js','auth-boot.js'])
  vm.runInContext(src(file),win,{filename:file});
 return win;
}
async function main(){
 const w=context(),mock=doc();
 const auth=w.MiBowlingSupabaseAuth.create(client);
 const repository=w.MiBowlingPrivateRepository.create(client);
 const gate=w.MiBowlingAuthGate.create({document:mock.document,element:mock.node,
  auth,repository,allowSignUp:true,confirmRedirectTo:'https://bowling.example.test/auth/callback',
  resetRedirectTo:'https://bowling.example.test/auth/reset',now:()=>now});
 gate.init();
 assert.match(mock.node.innerHTML,/Crear cuenta/);
 assert.match(mock.node.innerHTML,/Recuperar contraseña|Olvidaste tu contraseña/);
 assert.equal(gate.getState().opened,false);
 // A new account may have no current session until the user confirms via email.
 const created=await gate.signup('nuevo@example.test','ContraseñaFuerte1234','ContraseñaFuerte1234');
 assert.equal(created.pendingConfirmation,true);
 assert.equal(gate.getState().mode,'confirm');
 assert.equal(gate.getState().verified,false);
 assert.match(mock.node.innerHTML,/Verifica tu correo/);
 assert.equal(calls.find(x=>x[0]==='signup')[1].options.emailRedirectTo,
  'https://bowling.example.test/auth/callback');
 assert.equal(await gate.resendConfirmation(),true);
 assert.equal(calls.find(x=>x[0]==='resend')[1].type,'signup');
 assert.equal(calls.find(x=>x[0]==='resend')[1].options.emailRedirectTo,
  'https://bowling.example.test/auth/callback');
 await assert.rejects(gate.resendConfirmation(),/Espera al menos/);
 now+=61000;
 assert.equal(await gate.resendConfirmation(),true);
 // The client must reject a provider that issues a full session during signup,
 // even if the server's "Confirm email" option was disabled.
 confirmEnabled=false;
 await assert.rejects(gate.signup('nuevo2@example.test','ContraseñaFuerte1234','ContraseñaFuerte1234'),/no exige verificar/);
 confirmEnabled=true;
 assert.ok(calls.some(x=>x[0]==='signout'),'Misconfigured registration must be signed out');
 // Email unconfirmed: login is not permitted to see scores.
 user={...user,email:'nuevo@example.test',email_confirmed_at:null};
 await assert.rejects(gate.login('nuevo@example.test','ContraseñaFuerte1234'),/sin confirmar|Correo aún sin confirmar/);
 assert.equal(gate.getState().opened,false);
 assert.equal(gate.getState().verified,false);
 user={...user,email_confirmed_at:'2026-11-08T19:00:00Z'};
 // Requesting a reset must not reveal account existence or auto-login.
 assert.equal(await gate.requestReset('nuevo@example.test'),true);
 assert.equal(calls.find(x=>x[0]==='reset')[2].redirectTo,'https://bowling.example.test/auth/reset',JSON.stringify(calls.filter(x=>x[0]==='reset')));
 assert.equal(gate.getState().opened,false);
 await assert.rejects(gate.updatePassword('ContraseñaNueva1234','ContraseñaNueva1234'),/sin autorización/);
 // A valid password recovery event unlocks ONLY the reset form.
 listener('PASSWORD_RECOVERY',{access_token:'DUMMY-RESET'});
 assert.equal(gate.getState().mode,'update');
 assert.equal(gate.getState().recoveryAuthorized,true);
 assert.equal(gate.getState().opened,false);
 assert.equal(await gate.updatePassword('ContraseñaNueva1234','ContraseñaNueva1234'),true);
 assert.equal(gate.getState().mode,'login');
 assert.equal(gate.getState().recoveryAuthorized,false);
 assert.equal(gate.getState().verified,false);
 assert.equal(gate.getState().opened,false);
 assert.ok(calls.some(x=>x[0]==='update'&&x[1].password==='ContraseñaNueva1234'));
 assert.ok(calls.some(x=>x[0]==='signout'));
 // SIGNED_IN event never grants access without a verified getUser+private documents round-trip.
 listener('SIGNED_IN',{user});
 assert.equal(gate.getState().opened,false);
 listener('SIGNED_OUT',null);
 assert.equal(gate.getState().verified,false);
 // Network failures during recovery remain fail closed.
 resetFailure=true;
 await assert.rejects(gate.requestReset('nuevo@example.test'),/temporary/);
 resetFailure=false;
 await gate.logout();
 assert.equal(gate.getState().verified,false);
 gate.destroy();
 // Boot-only configuration: real SDK is never fetched from network in these tests.
 const fake=w.MiBowlingAuthBoot;
 const location={protocol:'https:',hostname:'bowling.example.test',origin:'https://bowling.example.test'};
 const cfg={url:'https://abcdefghijk.supabase.co',publishableKey:'sb_publishable_TEST_ONLY_FAKE_123456',
  confirmRedirectTo:'https://bowling.example.test/auth/callback',
  resetRedirectTo:'https://bowling.example.test/auth/reset'};
 assert.equal(fake.validConfig(cfg,location),true);
 assert.equal(fake.validConfig({...cfg,url:'http://evil.example.test'},location),false);
 assert.equal(fake.validConfig({...cfg,publishableKey:'sb_secret_verybad'},location),false);
 assert.equal(fake.validConfig(cfg,{protocol:'http:',hostname:'example.test'}),false);
 assert.equal(fake.redirect('https://evil.example.test/back',location.origin),undefined);
 assert.equal(fake.redirect('https://bowling.example.test/auth/reset?next=https://evil.example.test',location.origin),undefined);
 assert.equal(fake.redirect(cfg.resetRedirectTo,location.origin),cfg.resetRedirectTo);
 const optionsCaptured=[];
 const w2=context();w2.location=location;w2.document=doc().document;
 w2.sessionStorage={getItem(){return null},setItem(){},removeItem(){}};
 w2.MI_BOWLING_AUTH_CONFIG=cfg;
 w2.supabase={createClient(url,key,options){
  optionsCaptured.push({url,key,options});
  return client;
 }};
 const live=w2.MiBowlingAuthBoot.boot();
 assert.equal(live.getState().available,true);
 assert.equal(live.getState().opened,false);
 assert.equal(optionsCaptured.length,1);
 const config=optionsCaptured[0].options.auth;
 assert.equal(config.flowType,'pkce');
 assert.equal(config.detectSessionInUrl,true);
 assert.equal(config.persistSession,true);
 assert.equal(config.storage,w2.sessionStorage);
 await assert.rejects(live.signup('n@example.test','ContraseñaFuerte1234','ContraseñaFuerte1234'),/deshabilitadas/);
 w2.MI_BOWLING_AUTH_CONFIG={...cfg,confirmRedirectTo:'https://evil.example.test/bad'};
 const blocked=w2.MiBowlingAuthBoot.boot();
 assert.equal(blocked.getState().available,false);
 assert.equal(blocked.getState().opened,false);
 // No authentication source should contain a hardcoded real key or score import.
 for(const source of ['auth-lab.js','auth-boot.js','auth-supabase-adapter.js','auth-private-repository.js']){
  const text=src(source);
  assert.ok(!text.includes('mi-bowling-analitica-v2'),'Auth-only modules cannot import old scores');
  assert.ok(!text.includes('sb_secret_'),'Browser modules must not contain project secret keys');
 }
 console.log('OK · Registration remains pending until server email confirmation + no auto session');
 console.log('OK · Resend with cooldown, password recovery, reset event and mandatory re-login');
 console.log('OK · Remote verification, signed-out state and forced logout on invalid signup');
 console.log('OK · SDK PKCE bootstrap, same-origin redirects and fail-closed disabled real registration');
}
main().catch(e=>{console.error(e);process.exitCode=1});
