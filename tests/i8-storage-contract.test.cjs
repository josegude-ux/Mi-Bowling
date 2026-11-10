/* MI BOWLING I8 · fast deterministic contract tests (no browser/services).
 * Browser CI independently verifies actual AES-GCM, IDB durability and tab close.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto'),{TextEncoder}=require('node:util');
const ctx={crypto:webcrypto,TextEncoder,console};ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab/i8-persistence.js'),'utf8'),ctx,
 {filename:'lab/i8-persistence.js'});
const {create,safeUnion}=ctx.MiBowlingI8Persistence;
const owner='11111111-1111-4111-8111-111111111111';
const canonical=()=>({version:2,hand:'diestro',balls:[],patterns:[],sessions:[]});
const session=id=>({id,type:'entrenamiento',date:'2026-11-09',games:[{id:'g-'+id,rolls:[]} ]});
const clone=x=>JSON.parse(JSON.stringify(x));
async function main(){
 const base=canonical(),wal=new Map(),seen=[],repo={
  async load(id){assert.equal(id,owner);return {owner,personal:{revision:0,payload:clone(base)}}},
  async write(id,kind,payload,rev){
   assert.equal(id,owner);assert.equal(kind,'personal');assert.equal(rev,0);
   seen.push(clone(payload));throw Error('I8 fictitious pre-commit outage');
  }
 };
 const journal={
  async list(id){assert.equal(id,owner);return [...wal.values()].map(clone)},
  async readOp(id,tab,op){return clone(wal.get(owner+':'+tab+':'+op)||null)},
  async append(id,entry){
   assert.equal(id,owner);
   const key=owner+':'+entry.tabId+':'+entry.opId;
   if(wal.has(key))throw Error('duplicate op');
   wal.set(key,clone(entry));
   return {durable:true,tabId:entry.tabId,opId:entry.opId,checksum:entry.checksum};
  },
  async clearOp(id,tab,op,checksum){const key=owner+':'+tab+':'+op;
   if(wal.get(key)?.checksum!==checksum)return false;
   wal.delete(key);return true}
 };
 const sync=create({repository:repo,journal,owner});
 await sync.start();
 assert.throws(()=>sync.stage({...base,leagueRosters:{}}),/personal no permitido/);
 assert.throws(()=>sync.stage({...base,leagueNational:{}}),/personal no permitido/);
 assert.throws(()=>sync.stage({...base,sessions:'not an array'}),/personal no permitido/);
 const p1={...base,sessions:[session('ONE')]};
 const p2={...base,sessions:[session('ONE'),session('TWO')]};
 sync.stage(p1);sync.stage(p2);
 const status=await sync.drain();
 assert.equal(status.blocked,'uncertain','remote outage blocks automatic replay');
 assert.equal(status.volatileCount,0,'both operations have durable receipts');
 assert.equal(wal.size,2,'unique WAL per operation in one browser tab');
 assert.equal(new Set([...wal.values()].map(x=>x.opId)).size,2);
 assert.equal(seen.length,1,'once first backend write fails second is NOT replayed blindly');
 const conflict={...base,sessions:[session('ONE')]};
 const merged=safeUnion(base,p2,conflict);
 assert.ok(merged&&merged.sessions.length===2,'identical shared new sessions are idempotent');
 assert.equal(safeUnion(base,p2,{...base,sessions:[{...session('ONE'),title:'changed'}]}),null,
  'same ID with different contents must be rejected');
 const historic={...base,sessions:[session('OLD')]};
 const edited={...historic,sessions:[{...session('OLD'),title:'local-edit'}]};
 assert.equal(safeUnion(historic,edited,historic),null,'edits to preexisting session blocked');
 sync.close();
 let transmitted=0;
 const aborted={
  ...journal,
  async list(){return []},
  async append(){throw Error('I8 simulated IndexedDB abort before oncomplete')}
 };
 const guarded=create({repository:{
  load:repo.load,async write(){transmitted++;return 1}
 },journal:aborted,owner});
 await guarded.start();
 guarded.stage(p1);
 const denied=await guarded.drain();
 assert.equal(denied.blocked,'journal-error');
 assert.equal(denied.volatileCount,1,'no durable receipt means local-only volatile state');
 assert.equal(denied.durableCount,0);
 assert.equal(transmitted,0,'no backend write without confirmed WAL');
 guarded.close();
 // Quota abort is distinguishable from other storage failures and must
 // never make a volatile draft look durable or invoke confirmed fake server.
 let quotaWrites=0;
 const qJournal={...journal,async list(){return []},
  async append(){throw Error('QuotaExceededError (LAB transaction aborted)')}};
 const q=create({repository:{load:repo.load,
  async write(){quotaWrites++;return 1}},journal:qJournal,owner});
 await q.start();q.stage(p1);
 const qStatus=await q.drain();
 assert.equal(qStatus.blocked,'journal-error');
 assert.equal(qStatus.failureClass,'quota');
 assert.equal(qStatus.volatileCount,1);
 assert.equal(qStatus.durableCount,0);
 assert.equal(qStatus.lastDurable,null);
 assert.equal(quotaWrites,0);
 q.close();
 console.log('PASS I8 Node · independent WAL IDs, no loss-by-overwrite, no false quota ACK, league boundary, aborted IDB blocks backend');
}
main().catch(e=>{console.error(e);process.exitCode=1});
