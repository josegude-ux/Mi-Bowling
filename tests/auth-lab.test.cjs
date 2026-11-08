/* MI BOWLING Auth LAB A1 · unit tests. ALL identities/data are fictitious.
 * No calls to Supabase, accounts, passwords, production or network. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function read(file){return fs.readFileSync(path.join(root,file),'utf8')}
const authSrc=read('auth-supabase-adapter.js'),repoSrc=read('auth-private-repository.js'),gateSrc=read('auth-lab.js'),bootSrc=read('auth-boot.js');
const sql=read('docs/sql/BOWLING_AUTH_RLS_A1_REVIEW_ONLY.sql'),html=read('index.html');
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const calls=[];
let user={id:A,email:'jugadora@example.test',email_confirmed_at:'2026-11-08T12:00:00Z',is_anonymous:false};
let failSignIn=false,failBackend=false,signOutCount=0;
const client={
 auth:{
  async signInWithPassword({email,password}){
   calls.push(['signInWithPassword',email,password==='Correcta12345678']);
   return failSignIn?{data:null,error:{message:'Invalid login credentials'}}:{data:{session:{access_token:'dummy-not-a-real-token'}},error:null}
  },
  async getUser(){
   calls.push(['getUser']);
   return {data:{user},error:null}
  },
  async signUp({email,password}){
   calls.push(['signUp',email,password.length]);return {data:{user:null,session:null},error:null}
  },
  async resend({type,email,options}){calls.push(['resend',type,email,options]);return {data:{},error:null}},
  async signOut(){signOutCount++;calls.push(['signOut']);return {error:null}},
  async resetPasswordForEmail(email,opts){calls.push(['reset',email,opts]);return {error:null}},
  async updateUser({password}){calls.push(['update-password',password.length]);return {error:null}},
  onAuthStateChange(cb){this.event=cb;return {data:{subscription:{unsubscribe(){}}}}}
 },
 from(table){
  assert.equal(table,'bowling_player_documents');
  return {
   select(columns){
    assert.equal(columns,'user_id,doc_type,payload,revision');
    return {eq(column,owner){
     assert.equal(column,'user_id');
     if(failBackend)return Promise.resolve({data:[],error:{message:'offline'}});
     return Promise.resolve({data:[
      {user_id:owner,doc_type:'personal',payload:{version:2,sessions:[],balls:[],patterns:[]},revision:0},
      {user_id:owner,doc_type:'league',payload:{version:1,matches:[]},revision:0}
     ],error:null});
    }}
   },
   insert(record){
    calls.push(['insert',record.user_id,record.doc_type]);
    return Promise.resolve({error:null});
   },
   update(record){
    const filters={};
    return {eq(k,v){filters[k]=v;return this},
      select(c){
       assert.equal(c,'revision');calls.push(['update',record,filters]);
       const allowed=filters.user_id===user.id&&filters.revision===0;
       return Promise.resolve({data:allowed?[{revision:record.revision}]:[],error:null})
      }};
   }
  }
 }
};
function context(){
 const ctx={console,window:null};ctx.window=ctx;
 vm.createContext(ctx);
 for(const [s,name] of [[authSrc,'auth-supabase-adapter.js'],[repoSrc,'auth-private-repository.js'],[gateSrc,'auth-lab.js'],[bootSrc,'auth-boot.js']])
  vm.runInContext(s,ctx,{filename:name,timeout:3000});
 return ctx;
}
function dom(){
 const status={textContent:'',dataset:{}},submit={disabled:false};
 const node={
  hidden:true,innerHTML:'',
  querySelector(selector){
   if(selector==='#auth-status')return status;
   if(selector==='#auth-form button[type="submit"]')return submit;
   return null;
  }
 };
 return {node,status,document:{getElementById(id){return id==='auth-gate'?node:null}}};
}
(async()=>{
 const ctx=context();
 const auth=ctx.MiBowlingSupabaseAuth.create(client),repository=ctx.MiBowlingPrivateRepository.create(client);
 const d=dom();
 const noService=ctx.MiBowlingAuthGate.create({document:d.document,element:d.node});
 noService.init();
 assert.match(d.node.innerHTML,/Correo electrónico/);
 assert.match(d.node.innerHTML,/Contraseña/);
 assert.match(d.node.innerHTML,/disabled/);
 assert.match(d.status.textContent,/Acceso deshabilitado/);
 assert.equal(noService.getState().opened,false);
 await assert.rejects(noService.login('jugadora@example.test','Correcta12345678'),/no disponibles/);
 assert.ok(!/src="app\.js/.test(html),'Main login entrypoint must not load app JS');
 assert.ok(!html.includes('profiles.js'),'Old PIN selector must not launch');
 // The adapter uses the remote getUser endpoint after authenticating.
 const beforeGet=calls.length;
 await auth.signIn('jugadora@example.test','Correcta12345678');
 const remote=await auth.getVerifiedUser();
 assert.equal(remote.id,A);
 assert.ok(calls.slice(beforeGet).some(x=>x[0]==='getUser'));
 assert.ok(calls.slice(beforeGet).some(x=>x[0]==='signInWithPassword'));
 const personal=await repository.load(A);
 assert.equal(personal.owner,A);
 assert.equal(personal.personal.payload.sessions.length,0);
 assert.equal(personal.league.payload.matches.length,0);
 assert.deepEqual([personal.personal.revision,personal.league.revision],[0,0]);
 await assert.rejects(repository.load(B),/Acceso denegado/);
 await assert.rejects(repository.write(B,'personal',{sessions:[]},0),/Acceso denegado/);
 assert.equal(await repository.write(A,'personal',{sessions:[{id:'a1'}]},0),1);
 await assert.rejects(repository.write(A,'personal',{sessions:[]},7),/Conflicto/);
 await assert.rejects(repository.write(A,'all',{sessions:[]},0),/Tipo de documento/);
 const x=dom();let launches=0;
 const liveGate=ctx.MiBowlingAuthGate.create({document:x.document,element:x.node,auth,repository});
 liveGate.init();
 const state=await liveGate.login('jugadora@example.test','Correcta12345678');
 assert.equal(state.verified,true);
 assert.equal(state.opened,false,'Even valid login must NOT open scores before backend integration');
 assert.equal(liveGate.getState().opened,false);
 assert.equal(liveGate.getState().owner,A);
 assert.match(x.status.textContent,/Falta habilitar/);
 // Fail closed when backend unavailable after valid credentials.
 failBackend=true;
 await assert.rejects(liveGate.login('jugadora@example.test','Correcta12345678'),/almacén privado/);
 assert.equal(liveGate.getState().owner,null);
 assert.equal(liveGate.getState().opened,false);
 assert.ok(signOutCount>0,'Abort must terminate session');
 failBackend=false;
 // Fail when the identity has not confirmed email.
 user={...user,email_confirmed_at:null};
 await assert.rejects(auth.getVerifiedUser(),/sin confirmar/);
 user={...user,email_confirmed_at:'2026-11-08T12:00:00Z'};
 await assert.rejects(liveGate.signup('jugadora@example.test','Password123456','Password123456'),/altas reales están deshabilitadas/);
 assert.equal(await liveGate.requestReset('jugadora@example.test'),true);
 assert.ok(calls.some(x=>x[0]==='reset'));
 await liveGate.logout();
 assert.equal(liveGate.getState().verified,false);
 assert.equal(liveGate.getState().opened,false);
 // Injected fixture opens only for verified owner, never for email-only or cross-owner.
 const y=dom();
 const tested=ctx.MiBowlingAuthGate.create({document:y.document,element:y.node,auth,repository,
   onReady:async({user,documents})=>{launches++;assert.equal(documents.owner,user.id)}});
 tested.init();
 await tested.login('jugadora@example.test','Correcta12345678');
 assert.equal(launches,1);
 user={...user,id:B,email:'otra-persona@example.test'};
 await assert.rejects(tested.login('jugadora@example.test','Correcta12345678'),/usuario no verificado|Usuario no verificado|No se puede verificar|Usuario/i);
 assert.equal(launches,1,'Wrong owner must not launch');
 // RLS design must include scope for select/insert/update and NO public deletes.
 assert.match(sql,/enable row level security/);
 for(const operation of ['select','insert','update'])assert.match(sql,new RegExp('for '+operation+' to authenticated'));
 assert.match(sql,/with check\s*\(/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/revoke all on table.+from public, anon, authenticated/);
 assert.doesNotMatch(sql,/grant\s+.+\bdelete\b/i);
 assert.ok(!/localStorage\.(?:getItem|setItem)|indexedDB\./.test(authSrc+repoSrc+gateSrc),'Auth gate may not read legacy local data');
 assert.ok(!/sb_secret_|service_role/.test(authSrc+repoSrc+gateSrc+bootSrc),'No secret key in browser');
 console.log('OK · real-provider interface: sign-in, remote getUser, confirmed email, reset, sign-out');
 console.log('OK · no provider/offline/unconfirmed/cross-owner all FAIL CLOSED; no app loaded');
 console.log('OK · independent personal/league documents, optimistic revisions and RLS review-only contract');
 console.log('OK · no account created or deployed; PIN profiles/production remain untouched');
})().catch(e=>{console.error(e);process.exitCode=1});
