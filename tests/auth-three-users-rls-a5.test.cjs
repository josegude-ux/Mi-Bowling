/* MI BOWLING · LAB A5 · three fictional authenticated users and RLS contract.
 * This tests the ACTUAL auth-private-repository.js against a policy simulator.
 * RLS behavior here is an independent model, NOT an executed PostgreSQL policy.
 * No Supabase project, network, real account or migrated scores involved. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createServer}=require('./rls-mock-server.cjs');
const base=path.resolve(__dirname,'..');
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const OWNER=id=>({id,role:'authenticated',confirmed:true,is_anonymous:false,active:true,email:id+'@example.test'});
function repo(client){
 const ctx={console};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(base,'auth-private-repository.js'),'utf8'),ctx,{filename:'auth-private-repository.js'});
 return ctx.MiBowlingPrivateRepository.create(client);
}
function personal(scores,balls=[]){
 return {
  version:2,hand:'diestro',sessions:scores.map((score,i)=>({id:'fake-'+i,type:'entrenamiento',games:[{score,rolls:[]}]})),
  balls:balls.map(id=>({id,model:'Ficticia'})),patterns:[]
 };
}
function league(matches){
 return {version:1,matches:matches.map((total,i)=>({id:'fake-league-'+i,total,players:[{alias:'Ficticio'}]})),rosters:{own:['Equipo simulado']}};
}
function scores(doc){return doc.sessions.flatMap(x=>x.games).map(x=>x.score);}
async function main(){
 const server=createServer();
 server.seed(A,'personal',personal([300,181],['bola-A']));
 server.seed(A,'league',league([195,200]));
 server.seed(B,'league',league([140]));
 server.seed(C,'personal',personal([157,201],['bola-C']));
 const initial=server.snapshot();
 const clients=[A,B,C].map(id=>server.client(OWNER(id)));
 const repos=clients.map(repo);
 // Authorized loads: A and C have different historical games. B starts with none.
 const results=await Promise.all(repos.map((r,i)=>r.load([A,B,C][i])));
 const [a,b,c]=results;
 assert.deepEqual(scores(a.personal.payload),[300,181]);
 assert.equal(a.personal.payload.balls[0].id,'bola-A');
 assert.deepEqual(a.league.payload.matches.map(x=>x.total),[195,200]);
 assert.deepEqual(scores(b.personal.payload),[]);
 assert.deepEqual(b.personal.payload.balls,[]);
 assert.equal(b.personal.exists,false);
 assert.deepEqual(b.league.payload.matches.map(x=>x.total),[140]);
 assert.deepEqual(scores(c.personal.payload),[157,201]);
 assert.equal(c.league.exists,false);
 assert.deepEqual(c.league.payload.matches,[]);
 assert.deepEqual(c.league.payload.rosters.own,[]);
 assert.equal(new Set([a.owner,b.owner,c.owner]).size,3);
 console.log('OK · A=[300,181], B=0, C=[157,201]; Liga A/B/C independent from personal history');
 // Every owner attempts SELECT/INSERT/UPDATE of another owner (6 cross directions).
 for(let i=0;i<3;i++){
  for(let j=0;j<3;j++){
   if(i===j)continue;
   const target=[A,B,C][j],client=clients[i],r=repos[i];
   await assert.rejects(r.load(target),/Acceso denegado/,'repository denied cross-owner load');
   await assert.rejects(r.write(target,'personal',personal([999]),null),/Acceso denegado/);
   await assert.rejects(r.write(target,'league',league([999]),0),/Acceso denegado/);
   const direct=await client.from('bowling_player_documents').select('user_id,doc_type,payload,revision').eq('user_id',target);
   assert.equal(direct.data.length,0,'server RLS deny direct SELECT');
   const insert=await client.from('bowling_player_documents').insert({
    user_id:target,doc_type:'personal',payload:personal([999]),revision:0
   });
   assert.ok(insert.error,'server RLS deny forged owner INSERT');
   const updated=await client.from('bowling_player_documents').update({payload:personal([999]),revision:1})
    .eq('user_id',target).eq('doc_type','personal').eq('revision',0).select('revision');
   assert.equal(updated.data.length,0,'server RLS deny cross UPDATE');
  }
 }
 assert.deepEqual(server.snapshot(),initial,'Unauthorized operations cannot mutate any score/league row');
 console.log('OK · SELECT/INSERT/UPDATE crossed among A, B, C (6 owner pairs): all denied');
 // A new owner starts with zero and can create own personal document only.
 const bNew=personal([123],['bola-B']);
 const nextRevision=await repos[1].write(B,'personal',bNew,null);
 assert.equal(nextRevision,0);
 assert.equal((await repos[1].load(B)).personal.payload.sessions[0].games[0].score,123);
 assert.deepEqual(scores((await repos[0].load(A)).personal.payload),[300,181]);
 assert.deepEqual(scores((await repos[2].load(C)).personal.payload),[157,201]);
 // Cannot overwrite own personal doc using blind INSERT.
 await assert.rejects(repos[1].write(B,'personal',personal([999]),null),/no se pudo crear/i);
 // Revision-checked update and stale concurrent operation denied without overwriting.
 const bRev=await repos[1].write(B,'personal',personal([124]),0);
 assert.equal(bRev,1);
 await assert.rejects(repos[1].write(B,'personal',personal([888]),0),/Conflicto/);
 assert.deepEqual(scores((await repos[1].load(B)).personal.payload),[124]);
 // Updating league must not change own personal history or other users' league.
 const aBefore=server.snapshot().find(r=>r.user_id===A&&r.doc_type==='personal');
 const bLeagueVersion=await repos[1].write(B,'league',league([199,225]),0);
 assert.equal(bLeagueVersion,1);
 assert.deepEqual((await repos[1].load(B)).league.payload.matches.map(x=>x.total),[199,225]);
 assert.deepEqual(server.snapshot().find(r=>r.user_id===A&&r.doc_type==='personal'),aBefore);
 assert.deepEqual((await repos[0].load(A)).league.payload.matches.map(x=>x.total),[195,200]);
 // Swapping document types must fail on client BEFORE network write.
 await assert.rejects(repos[0].write(A,'personal',{sessions:[],leagueNational:{matches:[]}},0),/actas de Liga/);
 await assert.rejects(repos[0].write(A,'personal',{matches:[{score:300}]},0),/actas de Liga/);
 await assert.rejects(repos[0].write(A,'league',{sessions:[{id:'a'}]},0),/partidas personales/);
 await assert.rejects(repos[1].write(B,'league',{balls:[{id:'x'}]},0),/partidas personales/);
 await assert.rejects(repos[0].write(A,'personal',[],0),/Documento no válido/);
 console.log('OK · Revision conflicts and no blind overwrite; Liga changes cannot touch personal scores');
 // An owner cannot reassign user_id through UPDATE (WITH CHECK even if USING passed).
 const altered=await clients[0].from('bowling_player_documents').update({
  user_id:B,payload:personal([500]),revision:55
 }).eq('user_id',A).eq('doc_type','personal').eq('revision',0).select('revision');
 assert.ok(altered.error,'WITH CHECK rejects owner reassignment');
 // Anonymous sign-in has authenticated Postgres role, still must be blocked.
 const anon=server.client({...OWNER(A),is_anonymous:true});
 const unauth=server.client({id:null,role:'anon',active:true});
 const expired=server.client({...OWNER(C),active:false});
 const unconfirmed=server.client({...OWNER(A),confirmed:false});
 for(const [name,client] of [['anonymous',anon],['no session',unauth],['expired',expired],['unconfirmed',unconfirmed]]){
  const r=repo(client);
  await assert.rejects(r.load(A),/Acceso denegado/,'repository denies '+name);
  const raw=await client.from('bowling_player_documents').select('user_id,doc_type,payload,revision');
  assert.equal(raw.data.length,0,'server RLS denies '+name);
  const no=await client.from('bowling_player_documents').insert({user_id:A,doc_type:'league',payload:league([999]),revision:0});
  assert.ok(no.error,'server denies insert for '+name);
 }
 const del=await clients[0].from('bowling_player_documents').delete().eq('user_id',A);
 assert.ok(del.error,'DELETE disabled by policy and grants');
 // User switches session during an in-flight SELECT: no result can be delivered.
 const gateClient=server.client(OWNER(A)),gateRepo=repo(gateClient);
 let release;
 const barrier=new Promise(resolve=>{release=resolve});
 gateClient.pauseNextSelect(barrier);
 const waiting=gateRepo.load(A);
 await new Promise(resolve=>setImmediate(resolve)); // ensure getUser() and SELECT started
 gateClient.change(OWNER(B));
 release();
 await assert.rejects(waiting,/Acceso denegado/);
 assert.equal(gateClient.state().id,B);
 // A response that includes a row from another owner must never be passed through.
 const alien={auth:{getUser:async()=>({data:{user:{id:A,email:'a@example.test',email_confirmed_at:'2026-11-08'}}})},
  from:()=>({select:()=>({eq:async()=>({data:[{user_id:B,doc_type:'personal',revision:0,payload:personal([111])}],error:null})})})};
 await assert.rejects(repo(alien).load(A),/otro propietario/);
 // Reject unknown document types, duplicate personal rows, malformed server document.
 function malicious(rowset){
  return repo({auth:{getUser:async()=>({data:{user:{id:A,email:'a@example.test',email_confirmed_at:'2026-11-08'}}})},
   from:()=>({select:()=>({eq:async()=>({data:rowset,error:null})})})});
 }
 await assert.rejects(malicious([{user_id:A,doc_type:'admin',revision:0,payload:{}}]).load(A),/Tipo de documento/);
 await assert.rejects(malicious([0,1].map(()=>({user_id:A,doc_type:'personal',revision:0,payload:personal([])}))).load(A),/duplicados/);
 await assert.rejects(malicious([{user_id:A,doc_type:'league',revision:0,payload:personal([100])}]).load(A),/partidas personales/);
 // Contract is checked statically. NOT a PostgreSQL execution.
 const sql=fs.readFileSync(path.join(base,'docs/sql/BOWLING_AUTH_RLS_A1_REVIEW_ONLY.sql'),'utf8');
 assert.match(sql,/alter\s+table\s+public\.bowling_player_documents\s+enable\s+row\s+level\s+security/i);
 assert.match(sql,/revoke\s+all\s+on\s+table\s+public\.bowling_player_documents\s+from\s+public,\s*anon,\s*authenticated/i);
 assert.match(sql,/grant\s+select,\s*insert,\s*update\s+on\s+table\s+public\.bowling_player_documents\s+to\s+authenticated/i);
 for(const kind of ['select','insert','update']){
  assert.match(sql,new RegExp('for '+kind+' to authenticated','i'));
 }
 assert.match(sql,/using\s*\(\(select\s+auth\.uid\(\)\)\s*=\s*user_id/);
 assert.match(sql,/with\s+check\s*\(\(select\s+auth\.uid\(\)\)\s*=\s*user_id/);
 assert.match(sql,/auth\.jwt\(\)\s*->>\s*'is_anonymous'/);
 assert.ok(!/\bgrant\b[^;]*\bdelete\b/i.test(sql));
 assert.ok(!/\bsecurity\s+definer\b/i.test(sql.replace(/--[^\n]*/g,'')));
 assert.ok(!/\buser_metadata\b|\braw_user_meta_data\b/i.test(sql));
 assert.match(sql,/primary key\s*\(user_id,\s*doc_type\)/i);
 console.log('OK · Anonymous, expired, unconfirmed, foreign identity + in-flight session switch all denied');
 console.log('OK · SQL grants/owner policies statically matched to RLS mock; NO database SQL executed');
 console.log('OK · All scores/rosters fictitious, no Supabase project/accounts and no external writes');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
