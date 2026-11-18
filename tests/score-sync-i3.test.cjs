/* MI BOWLING · LAB I3 · real private-repository adapter + fake RLS backend.
 * In-memory fixtures only. No network, secrets, localStorage or real accounts.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createServer}=require('./rls-mock-server.cjs');
const root=path.resolve(__dirname,'..');
const ids={
 A:'11111111-1111-4111-8111-111111111111',
 B:'22222222-2222-4222-8222-222222222222',
 C:'33333333-3333-4333-8333-333333333333'
};
const principal=id=>({id,role:'authenticated',confirmed:true,is_anonymous:false,active:true,email:id+'@test.invalid'});
const empty=()=>({version:2,hand:'diestro',sessions:[],balls:[],patterns:[]});
const game=(id,score)=>({id,type:'entrenamiento',games:[{id:'g-'+id,score,rolls:[]}],date:'2026-11-09'});
const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const copy=x=>JSON.parse(JSON.stringify(x));
function load(){
 const ctx={console,setTimeout,clearTimeout};ctx.globalThis=ctx;vm.createContext(ctx);
 for(const file of ['auth-private-repository.js','lab/score-sync-i3.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
 return {sync:ctx.MiBowlingScoreSyncI3,privateRepo:ctx.MiBowlingPrivateRepository};
}
const {sync,privateRepo}=load();
function setup(){
 const server=createServer();
 server.seed(ids.A,'personal',{...empty(),sessions:[game('A0',120)]});
 server.seed(ids.A,'league',{version:1,matches:[{id:'league-A'}],rosters:{own:[]}});
 server.seed(ids.C,'personal',{...empty(),sessions:[game('C0',210)]});
 const clients=Object.fromEntries(Object.entries(ids).map(([k,id])=>[k,server.client(principal(id))]));
 const repos=Object.fromEntries(Object.keys(ids).map(k=>[k,privateRepo.create(clients[k])]));
 return {server,clients,repos};
}
const personalRecord=(server,letter)=>server.snapshot().find(x=>x.user_id===ids[letter]&&x.doc_type==='personal');
async function newSync({repos},letter,data,opts={}){
 const d=sync.create({repository:repos[letter],owner:ids[letter],read:()=>data.value,debounceMs:12,...opts});
 await d.start();return d;
}
async function main(){
 const env=setup();const {server,repos,clients}=env;
 const a={value:copy((await repos.A.load(ids.A)).personal.payload)};
 const b={value:empty()},c={value:copy((await repos.C.load(ids.C)).personal.payload)};
 const sa=await newSync(env,'A',a),sb=await newSync(env,'B',b),sc=await newSync(env,'C',c);
 assert.equal(sa.state().revision,0);
 assert.equal(sb.state().revision,null,'B has no personal document');
 assert.equal(server.snapshot().filter(x=>x.doc_type==='personal').length,2,'opening must be read-only');
 assert.equal(sa.state().phase,'ready');
 // Two edits inside one debounce window -> ONE CAS commit, no League mutation.
 const leagueBefore=JSON.stringify(server.snapshot().find(x=>x.user_id===ids.A&&x.doc_type==='league'));
 a.value.sessions.push(game('A1',155));sa.observe();
 a.value.sessions.push(game('A2',161));sa.observe();
 await nap(100);
 assert.equal(sa.state().revision,1);
 assert.equal(personalRecord(server,'A').payload.sessions.length,3);
 assert.equal(personalRecord(server,'A').revision,1);
 assert.equal(JSON.stringify(server.snapshot().find(x=>x.user_id===ids.A&&x.doc_type==='league')),leagueBefore);
 assert.equal(personalRecord(server,'C').payload.sessions[0].games[0].score,210);
 assert.equal(personalRecord(server,'B'),undefined);
 console.log('OK I3 autosave · debounced A changes, no cross-owner or league writes');
 // New account must create exactly one document (revision 0) without overwriting A/C.
 b.value.sessions.push(game('B1',99));sb.observe();await sb.flush();
 assert.equal(sb.state().revision,0);
 assert.equal(personalRecord(server,'B').payload.sessions[0].games[0].score,99);
 c.value.sessions.push(game('C1',200));sc.observe();await sc.flush();
 assert.equal(personalRecord(server,'C').revision,1);
 assert.equal(personalRecord(server,'A').revision,1);
 assert.equal(server.snapshot().filter(x=>x.doc_type==='personal').length,3);
 await assert.rejects(sync.create({owner:ids.B,repository:repos.A,read:()=>empty()}).start(),
  /Acceso denegado/,'A cannot open B-owned documents with forged owner');
 console.log('OK I3 private identities A/B/C · create, update and cross-owner deny');
 // In-flight writes are serialized; latest edit wins without overwriting an intermediate revision.
 const serial={value:copy((await repos.A.load(ids.A)).personal.payload)};
 let release,entered;
 const barrier=new Promise(resolve=>release=resolve);
 const reached=new Promise(resolve=>entered=resolve);
 let waits=1;
 const pausedRepo={
  load:id=>repos.A.load(id),
  async write(...args){if(waits--===1){entered();await barrier;}return repos.A.write(...args);}
 };
 const ss=await newSync(env,'A',serial,{repository:pausedRepo,debounceMs:5000});
 serial.value.sessions.push(game('QUEUE1',101));ss.observe();
 const p=ss.flush();await reached;
 serial.value.sessions.push(game('QUEUE2',102));ss.observe();
 release();await p;
 assert.equal(ss.state().revision,3);
 assert.equal(personalRecord(server,'A').payload.sessions.at(-1).id,'QUEUE2');
 assert.equal(personalRecord(server,'A').revision,3);
 ss.close();
 console.log('OK I3 queue · no lost updates across async write, revision 2 then 3');
 // Concurrent external edit must BLOCK rather than overwrite; explicit reconcile sees conflict.
 const stale={value:copy((await repos.A.load(ids.A)).personal.payload)};
 const sconf=await newSync(env,'A',stale);
 await repos.A.write(ids.A,'personal',{...stale.value,sessions:[...stale.value.sessions,game('EXTERNAL',202)]},3);
 stale.value.sessions.push(game('STALE',203));sconf.observe();
 await sconf.flush();
 assert.equal(sconf.state().blocked,'uncertain');
 assert.equal(personalRecord(server,'A').payload.sessions.at(-1).id,'EXTERNAL');
 await sconf.reconcile();
 assert.equal(sconf.state().blocked,'conflict');
 assert.equal(sconf.state().dirty,true,'draft remains in memory');
 await sconf.flush({force:true});
 assert.equal(personalRecord(server,'A').revision,4,'no blind conflict overwrite');
 sconf.close();
 console.log('OK I3 conflict · another device wins, pending draft not replayed');
 // Ambiguous response after a successful write must be acknowledged, NOT written twice.
 const amb={value:copy((await repos.C.load(ids.C)).personal.payload)};
 let throwOnce=true;
 const unreliable={
  load:id=>repos.C.load(id),
  async write(...args){
   const revision=await repos.C.write(...args);
   if(throwOnce){throwOnce=false;throw Error('timeout after server commit');}
   return revision;
  }
 };
 const samb=await newSync(env,'C',amb,{repository:unreliable});
 amb.value.sessions.push(game('ACK',188));samb.observe();await samb.flush();
 assert.equal(samb.state().blocked,'uncertain');
 const beforeAck=personalRecord(server,'C').revision;
 await samb.reconcile();
 assert.equal(samb.state().revision,beforeAck);
 assert.equal(samb.state().dirty,false);
 assert.equal(personalRecord(server,'C').revision,beforeAck,'no double replay after timeout');
 samb.close();
 console.log('OK I3 ambiguous network success · acknowledged by remote read, no duplicate');
 // A proven failed attempt may resume only AFTER re-reading the same server revision.
 const failData={value:copy((await repos.B.load(ids.B)).personal.payload)};
 let first=true;
 const transient={load:id=>repos.B.load(id),async write(...args){
  if(first){first=false;throw Error('simulated offline before write')}
  return repos.B.write(...args);
 }};
 const st=await newSync(env,'B',failData,{repository:transient,debounceMs:5000});
 failData.value.sessions.push(game('RETRY',127));st.observe();await st.flush();
 assert.equal(st.state().blocked,'uncertain');
 assert.equal(personalRecord(server,'B').revision,0);
 await st.reconcile();
 assert.equal(st.state().revision,1);
 assert.equal(personalRecord(server,'B').payload.sessions.at(-1).id,'RETRY');
 st.close();
 console.log('OK I3 uncertainty · no retry before server reconciliation');
 // Offline changes stay in memory; reconnect checks server revision.
 const offData={value:copy((await repos.B.load(ids.B)).personal.payload)};
 const soff=await newSync(env,'B',offData,{debounceMs:10});
 await soff.setOnline(false);
 offData.value.sessions.push(game('OFFLINE',130));soff.observe();await nap(45);
 assert.equal(soff.state().phase,'offline');
 assert.equal(personalRecord(server,'B').revision,1);
 await soff.setOnline(true);
 assert.equal(soff.state().revision,2);
 assert.equal(personalRecord(server,'B').payload.sessions.at(-1).id,'OFFLINE');
 await soff.setOnline(false);
 offData.value.sessions.push(game('OFFLINE-CONFLICT',131));soff.observe();
 await repos.B.write(ids.B,'personal',{...offData.value,sessions:[...offData.value.sessions,game('DEVICE-B2',132)]},2);
 await soff.setOnline(true);
 assert.equal(soff.state().blocked,'conflict');
 assert.equal(personalRecord(server,'B').payload.sessions.at(-1).id,'DEVICE-B2');
 soff.close();
 console.log('OK I3 offline · resumes after revision check, blocks divergent remote edits');
 // Logout while a write is pending must not rebind the response to a new user.
 const logoutData={value:copy((await repos.C.load(ids.C)).personal.payload)};
 let releaseLogout,enteredLogout;
 const gate=new Promise(resolve=>releaseLogout=resolve),startedWrite=new Promise(resolve=>enteredLogout=resolve);
 const beforeSwitch=personalRecord(server,'C').revision;
 const delayed={
  load:id=>repos.C.load(id),
  async write(...args){enteredLogout();await gate;return repos.C.write(...args);}
 };
 const sLogout=await newSync(env,'C',logoutData,{repository:delayed,debounceMs:5000});
 logoutData.value.sessions.push(game('NEVER-COMMIT',178));sLogout.observe();
 const writePending=sLogout.flush();await startedWrite;
 assert.equal(sLogout.close().unsaved,true);
 clients.C.change(principal(ids.B));
 releaseLogout();await writePending;
 assert.equal(sLogout.state().phase,'closed');
 assert.equal(personalRecord(server,'C').revision,beforeSwitch);
 assert.equal(personalRecord(server,'B').payload.sessions.at(-1).id,'DEVICE-B2');
 console.log('OK I3 logout · in-flight write under changed identity denied');
 // Only personal score document may be written; unsupported payload fails closed.
 const unsafe={value:copy((await repos.A.load(ids.A)).personal.payload)};
 const su=await newSync(env,'A',unsafe);
 unsafe.value.leagueNational={matches:[{id:'leak'}]};
 assert.throws(()=>su.observe(),/Liga Nacional/);
 assert.equal(personalRecord(server,'A').revision,4);
 su.close();
 // The actual main integration uses save() hook; closing restores it.
 const hookData={value:copy((await repos.A.load(ids.A)).personal.payload)};
 const sh=await newSync(env,'A',hookData,{debounceMs:5000});
 const mainWindow={save(){hookData.value.sessions.push(game('HOOK',150));return 'ok'}};
 const original=mainWindow.save;sh.attachMain(mainWindow);
 assert.equal(mainWindow.save(),'ok');
 assert.equal(sh.state().dirty,true);
 await sh.flush();assert.equal(personalRecord(server,'A').revision,5);
 sh.close();assert.equal(mainWindow.save,original);
 assert.ok(!fs.readFileSync(path.join(root,'lab/score-sync-i3.js'),'utf8').includes('localStorage.'));
 console.log('OK I3 contract · main save hook, malformed payload denied, no localStorage');
 sa.close();sb.close();sc.close();
 console.log('OK · LAB I3 ALL PASS · only synthetic score data, no real services');
}
main().catch(e=>{console.error(e);process.exitCode=1});
