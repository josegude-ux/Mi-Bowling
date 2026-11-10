/* MI BOWLING I11 LAB · cryptographic chain and independent AES-GCM witness */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const ctx={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
for(const file of ['i11-audit-core.js','i11-evidence.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',file),'utf8'),ctx,{filename:file});
const C=ctx.MiBowlingI11AuditCore,E=ctx.MiBowlingI11Evidence;
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const PASS='LAB-I11-EVIDENCE-SAFE-KEY-2026';
const UUID=i=>String(i).padStart(8,'0')+'-1111-4111-8111-111111111111';
const SHA='a'.repeat(64),copy=x=>JSON.parse(JSON.stringify(x));
const proof=(id,kind='restore',reason='none')=>({
 kind,reason,status:kind==='restore'?'restored':'rejected',auditId:UUID(id),
 backupId:UUID(id+20),backupSha:SHA,occurredAt:1794200000000+id,
 sourceCreatedAt:1794000000000+id,revision:id,
 operationsAdded:kind==='restore'?id:0
});
async function main(){
 let events=[];
 for(const p of [proof(1),proof(2),proof(3,'conflict','stale'),proof(4,'conflict','fork')]){
  events.push(await C.append(A,p,events.at(-1)?.chainHash||C.ZERO,events.length+1));
 }
 let anchor=C.head(A,events);
 assert.equal((await C.verify(A,events,anchor)).count,4);
 assert.equal((await C.verify(A,[],null)).headHash,C.ZERO);
 const file=await E.seal({version:1,owner:A,events,head:anchor},PASS);
 assert.ok(!file.includes('operationsAdded'),'inner evidence must be encrypted');
 assert.ok(!file.includes(SHA),'inner checksum must be encrypted');
 const opened=await E.open(file,PASS,A);
 assert.deepEqual(copy(opened),{version:1,owner:A,events:copy(events),head:copy(anchor)});
 await assert.rejects(E.open(file,PASS,B),/identidad/);
 await assert.rejects(E.open(file,'INCORRECT-EVIDENCE-KEY-2026',A),/clave incorrecta/);
 const modified=JSON.parse(file);modified.ciphertext=(modified.ciphertext[0]==='A'?'B':'A')+modified.ciphertext.slice(1);
 await assert.rejects(E.open(JSON.stringify(modified),PASS,A),/alterada/);
 const brokenHead=copy(anchor);brokenHead.headHash='b'.repeat(64);
 await assert.rejects(C.verify(A,events,brokenHead),/supresión/);
 await assert.rejects(C.verify(A,events.slice(0,-1),anchor),/supresión/);
 await assert.rejects(C.verify(A,events.filter(x=>x.seq!==2),anchor),/supresión/);
 await assert.rejects(C.verify(A,events.slice(1),anchor),/supresión/);
 const changed=copy(events);changed[1].revision=99;
 await assert.rejects(C.verify(A,changed,anchor),/huella/);
 const swapped=copy(events);[swapped[1],swapped[2]]=[swapped[2],swapped[1]];
 await assert.rejects(C.verify(A,swapped,anchor),/orden/);
 const duplicated=[...copy(events),copy(events.at(-1))];
 await assert.rejects(C.verify(A,duplicated,C.head(A,duplicated)),/orden|duplicidad/);
 const prefix=events.slice(0,2);
 const comparison=await C.compare(A,prefix,C.head(A,prefix),events,anchor);
 assert.equal(comparison.verdict,'append-only');
 assert.equal(comparison.newEvents,2);
 assert.equal((await C.compare(A,events,anchor,events,anchor)).verdict,'identical');
 await assert.rejects(C.compare(A,events,anchor,prefix,C.head(A,prefix)),/OBSOLETA/);
 const fork=copy(events);fork[2]=await C.append(A,{...proof(50,'conflict','operation'),seq:3},fork[1].chainHash,3);
 fork[3]=await C.append(A,proof(51),fork[2].chainHash,4);
 await assert.rejects(C.compare(A,events,anchor,fork,C.head(A,fork)),/bifurcadas/);
 const memory={
  exportAuditEvidence:async(owner)=>{assert.equal(owner,A);return copy({version:1,owner:A,events,head:anchor})},
  restoreAuditEvidence:async(owner,data)=>{assert.equal(owner,A);
   assert.equal((await C.verify(owner,data.events,data.head)).count,4);
   return{status:'evidence-restored',eventsAdded:4,count:4}}
 };
 const exported=await E.exportEvidence(memory,A,PASS);
 assert.equal((await E.open(exported,PASS,A)).events.length,4);
 await assert.rejects(E.importEvidence(memory,A,exported,PASS,'WRONG'),/autorización/);
 assert.equal((await E.importEvidence(memory,A,exported,PASS,
  'CONFIRMAR-EVIDENCIA-FICTICIA')).eventsAdded,4);
 assert.equal((await E.previewEvidence(memory,A,exported,PASS)).newEvents,0);
 console.log('PASS I11 Node · SHA256 linked receipts, conflict events, deletion/tail/middle/order/tamper detection, independent AES-GCM witness, prefix recovery, fork denial, A/B and consent');
}
main().catch(e=>{console.error(e);process.exitCode=1});
