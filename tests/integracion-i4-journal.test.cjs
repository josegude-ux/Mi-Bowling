/* MI BOWLING · I4 LAB · simulated write-ahead recovery and no-loss conflict matrix.
 * In-memory RLS fixtures A/B/C only; no cloud service or browser storage.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {createServer}=require('./rls-mock-server.cjs');
const root=path.resolve(__dirname,'..');
const ids={
 A:'11111111-1111-4111-8111-111111111111',
 B:'22222222-2222-4222-8222-222222222222',
 C:'33333333-3333-4333-8333-333333333333'
};
const copy=x=>JSON.parse(JSON.stringify(x));
const original=()=>({version:2,hand:'diestro',sessions:[],balls:[],patterns:[]});
const game=(id,score)=>({id,type:'entrenamiento',date:'2026-11-09',games:[{id:'g-'+id,score,rolls:[]}]});
const principal=id=>({id,role:'authenticated',confirmed:true,is_anonymous:false,active:true,email:id+'@lab.invalid'});
function modules(){
 const ctx={crypto:webcrypto,TextEncoder,console,setTimeout,clearTimeout};ctx.globalThis=ctx;
 vm.createContext(ctx);
 for(const filename of ['auth-private-repository.js','lab/i4-persistence.js'])
  vm.runInContext(fs.readFileSync(path.join(root,filename),'utf8'),ctx,{filename});
 return {repo:ctx.MiBowlingPrivateRepository,port:ctx.MiBowlingI4Persistence};
}
const {repo:privateRepository,port}=modules();
function setup(){
 const server=createServer();server.seed(ids.A,'personal',{...original(),sessions:[game('A0',170)]});
 server.seed(ids.A,'league',{version:1,matches:[{id:'acta-A'}],rosters:{own:[]}});
 server.seed(ids.C,'personal',{...original(),sessions:[game('C0',210)]});
 const clients=Object.fromEntries(Object.keys(ids).map(k=>[k,server.client(principal(ids[k]))]));
 const repos=Object.fromEntries(Object.keys(ids).map(k=>[k,privateRepository.create(clients[k])]));
 return {server,clients,repos};
}
const row=(server,k,kind='personal')=>server.snapshot().find(x=>x.user_id===ids[k]&&x.doc_type===kind);
const newP=(repository,owner,journal,debounceMs=10000)=>port.create({repository,owner,journal,debounceMs});
async function run(){
 const e=setup(),journal=port.memoryJournal();
 const league=JSON.stringify(row(e.server,'A','league'));
 const a=newP(e.repos.A,ids.A,journal),b=newP(e.repos.B,ids.B,journal),c=newP(e.repos.C,ids.C,journal);
 const aa=await a.start(),bb=await b.start(),cc=await c.start();
 assert.equal(aa.state.revision,0);assert.equal(bb.state.revision,null);
 assert.equal(cc.initial.sessions[0].id,'C0');
 assert.equal(row(e.server,'B'),undefined,'open never creates rows');
 const draft=copy(aa.initial);draft.sessions.push(game('A1',180));
 a.stage(draft);await a.flush();
 assert.equal(row(e.server,'A').revision,1);
 assert.equal(row(e.server,'A').payload.sessions.at(-1).id,'A1');
 assert.equal(await journal.read(ids.A),null,'confirmed journal cleared');
 assert.equal(JSON.stringify(row(e.server,'A','league')),league);
 const newB=copy(bb.initial);newB.sessions.push(game('B1',92));
 b.stage(newB);await b.flush();
 assert.equal(row(e.server,'B').revision,0);
 assert.equal(row(e.server,'C').payload.sessions.at(-1).id,'C0');
 await assert.rejects(newP(e.repos.A,ids.B,journal).start(),/Acceso denegado/,
  'forged owner B cannot be opened by A');
 console.log('PASS I4 · A/B/C isolation, CAS, no League writes, new account and read-only boot');
 // Crash/restart simulation: same injected memory journal survives two adapter
 // instances. There is NO claim of browser-reload durability.
 const fakeFail={
  load:id=>e.repos.A.load(id),
  async write(){throw Error('network outage before commit')}
 };
 const fail=newP(fakeFail,ids.A,journal);
 const f0=await fail.start();
 const pending=copy(f0.initial);pending.sessions.push(game('WAIT',188));
 fail.stage(pending);await fail.flush();
 assert.equal(fail.state().blocked,'uncertain');
 assert.equal(row(e.server,'A').revision,1);
 const exportBefore=await fail.exportPending();
 assert.equal(exportBefore.payload.sessions.at(-1).id,'WAIT');
 assert.equal(exportBefore.owner,ids.A);
 assert.equal(fail.close().unsaved,true);
 const recover=newP(e.repos.A,ids.A,journal);
 const f1=await recover.start();
 assert.equal(f1.state.blocked,'recovery');
 assert.equal(f1.initial.sessions.at(-1).id,'A1','never auto-load unverified draft');
 assert.equal((await recover.inspect()).status,'can-resume');
 assert.equal(recover.state().revision,1,'reopen is read-only');
 await recover.recover();
 assert.equal(row(e.server,'A').payload.sessions.at(-1).id,'WAIT');
 assert.equal(row(e.server,'A').revision,2);
 assert.equal(await journal.read(ids.A),null);
 recover.close();
 console.log('PASS I4 · write-ahead recovery after synthetic restart, explicit retry, checksum & CAS');
 // Ambiguous commit: server committed, response lost. Recovery detects exact
 // hash and next revision and ACKs WITHOUT replay.
 let once=true;const unknown={
  load:id=>e.repos.C.load(id),
  async write(...args){const v=await e.repos.C.write(...args);
   if(once){once=false;throw Error('response lost after commit')}return v;}
 };
 const unc=newP(unknown,ids.C,journal);
 const c0=await unc.start(),cu=copy(c0.initial);
 cu.sessions.push(game('C1',198));unc.stage(cu);await unc.flush();
 assert.equal(unc.state().blocked,'uncertain');assert.equal(row(e.server,'C').revision,1);
 unc.close();
 const ca=newP(e.repos.C,ids.C,journal);const cs=await ca.start();
 assert.equal(cs.state.blocked,'recovery');
 assert.equal((await ca.inspect()).status,'already-applied');
 await ca.recover();
 assert.equal(row(e.server,'C').revision,1);
 assert.equal(ca.state().blocked,null);
 assert.equal(await journal.read(ids.C),null);
 ca.close();
 console.log('PASS I4 · lost ACK detected and cleared without duplicate or overwriting remote');
 // Non-overlap merge: local and server separately added new session IDs. Remote
 // remains source of truth until explicit merge; both additions survive.
 const merge=newP(e.repos.A,ids.A,journal);
 const m0=await merge.start(),ml=copy(m0.initial);
 ml.sessions.push(game('LOCAL-NEW',141));
 await e.repos.A.write(ids.A,'personal',{...copy(m0.initial),sessions:[
  ...m0.initial.sessions,game('REMOTE-NEW',144)]},2);
 merge.stage(ml);await merge.flush();
 assert.equal(merge.state().blocked,'uncertain');
 const diff=await merge.inspect();assert.equal(diff.status,'conflict');
 assert.equal((await merge.exportPending()).payload.sessions.at(-1).id,'LOCAL-NEW');
 await assert.rejects(merge.safeMerge(''),/confirmación explícita/);
 await merge.safeMerge('CONFIRMAR-FUSION-FICTICIA');
 assert.equal(merge.state().blocked,null);
 const names=row(e.server,'A').payload.sessions.map(x=>x.id);
 assert.ok(names.includes('LOCAL-NEW')&&names.includes('REMOTE-NEW'));
 assert.equal(new Set(names).size,names.length);
 assert.equal(await journal.read(ids.A),null);
 merge.close();
 console.log('PASS I4 · explicit conservative three-way union of distinct added sessions');
 // Overlap: modifications to same existing session are not auto-merged.
 const clash=newP(e.repos.A,ids.A,journal);
 const t0=await clash.start(),tl=copy(t0.initial);
 tl.sessions[0].games[0].score=111;
 const tr=copy(t0.initial);tr.sessions[0].games[0].score=222;
 await e.repos.A.write(ids.A,'personal',tr,4);
 clash.stage(tl);await clash.flush();
 assert.equal((await clash.inspect()).status,'conflict');
 const before=row(e.server,'A').revision;
 await clash.safeMerge('CONFIRMAR-FUSION-FICTICIA');
 assert.equal(clash.state().blocked,'conflict');
 assert.equal(row(e.server,'A').revision,before);
 assert.equal(row(e.server,'A').payload.sessions[0].games[0].score,222);
 assert.equal((await clash.exportPending()).payload.sessions[0].games[0].score,111);
 clash.close();
 console.log('PASS I4 · overlap denied, separate server/local copies retained without deleting history');
 // Corrupted journal or owner-swapped journal must fail-closed.
 const badJournal=port.memoryJournal();
 badJournal.unsafeTestSeed(ids.B,{...exportBefore,owner:ids.B});
 const malicious=newP(e.repos.B,ids.B,badJournal);
 const bad=await malicious.start();
 assert.equal(bad.state.blocked,'invalid-journal');
 assert.equal(row(e.server,'B').revision,0);
 await assert.rejects(malicious.exportPending(),/checksum inválido/);
 malicious.close();
 const victim=newP(e.repos.B,ids.B,journal);
 const valid=await victim.start();
 assert.equal(valid.state.blocked,null);
 victim.close();
 // Race close during server write. New owner is switched before mock server
 // gets authorization; it must not mutate or clear retained journal.
 let release,entered;
 const barrier=new Promise(resolve=>release=resolve),reached=new Promise(resolve=>entered=resolve);
 const held={
  load:id=>e.repos.C.load(id),
  async write(...args){entered();await barrier;return e.repos.C.write(...args);}
 };
 const close=newP(held,ids.C,journal);const opened=await close.start(),d=copy(opened.initial);
 d.sessions.push(game('LATE',101));close.stage(d);
 const writing=close.flush();await reached;
 assert.equal(close.close().unsaved,true);
 e.clients.C.change(principal(ids.B));release();await writing;
 assert.equal(row(e.server,'C').revision,1);
 const stuck=await journal.read(ids.C);assert.ok(stuck&&stuck.payload.sessions.at(-1).id==='LATE');
 e.clients.C.change(principal(ids.C));
 const reopening=newP(e.repos.C,ids.C,journal);const again=await reopening.start();
 assert.equal(again.state.blocked,'recovery');
 assert.equal((await reopening.inspect()).status,'can-resume');
 reopening.close();
 a.close();b.close();c.close();
 console.log('PASS I4 · corrupted/foreign journal denied, logout race preserved for review');
 // No browser storage used by I4 code; only the isolated loader is permitted to
 // read a *verified same-origin* app.js. No SDK or remote endpoints.
 for(const f of ['lab/i4-persistence.js','lab/i4-engine-port.js']){
  const data=fs.readFileSync(path.join(root,f),'utf8');
  assert.ok(!/\b(?:localStorage|sessionStorage)\s*(?:\[|\.)/.test(data),'I4 directly accesses real browser storage');
  assert.ok(!/https:\/\/.*supabase/.test(data),'I4 contains remote endpoint');
 }
 console.log('PASS I4 · all synthetic persistence, recovery and no-loss assertions');
}
run().catch(e=>{console.error(e);process.exitCode=1});
