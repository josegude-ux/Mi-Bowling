/* MI BOWLING · LAB I9 · cryptographic backup contracts, synthetic data only. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const ctx={crypto:webcrypto,TextEncoder,TextDecoder,btoa,atob,console};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab/i9-backup.js'),'utf8'),ctx);
const B=ctx.MiBowlingI9Backup;
const owner='11111111-1111-4111-8111-111111111111',foreign='22222222-2222-4222-8222-222222222222';
const tab='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const password='Encrypted-Backup-Only-Fixture-2026';
const copy=x=>JSON.parse(JSON.stringify(x));
async function sha(x){
 const data=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(x)));
 return Buffer.from(data).toString('hex');
}
const personal=()=>({version:2,hand:'right',sessions:[],balls:[],patterns:[]});
async function fixture(){
 const base=personal(),local={...personal(),sessions:[{id:'I9-OP-TEST-1',games:[]}]};
 const payloadHash=await sha(local),baseHash=await sha(base);
 const partial={version:2,owner,tabId:tab,opId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  createdAt:1794200000000,baseRevision:1,basePayload:base,baseHash,
  payload:local,payloadHash};
 return {version:1,owner,confirmed:{owner,revision:1,payload:base},
  operations:[{...partial,checksum:await sha(partial)}]};
}
async function main(){
 const snap=await fixture();
 assert.equal(await B.verifySnapshot(snap,owner),true);
 const sealed=await B.seal(snap,password);
 assert.ok(sealed.startsWith('{'));
 assert.ok(!sealed.includes('I9-OP-TEST-1'),'backup must never include scores in plaintext');
 assert.ok(!sealed.includes(password),'backup password must not persist');
 const restored=await B.open(sealed,password,owner);
 assert.deepEqual(copy(restored),copy(snap));
 const info=await B.inspectBackup(sealed,password,owner);
 assert.equal(info.verified,true);assert.equal(info.operationCount,1);
 assert.equal(info.confirmedRevision,1);
 await assert.rejects(B.open(sealed,'Wrong-Fixture-Password-2026',owner),/contraseña/);
 await assert.rejects(B.open(sealed,password,foreign),/otro jugador/);
 const corrupt=JSON.parse(sealed);
 corrupt.ciphertext=(corrupt.ciphertext[0]==='A'?'B':'A')+corrupt.ciphertext.slice(1);
 await assert.rejects(B.open(JSON.stringify(corrupt),password,owner),/contraseña|alterados/);
 const changedHeader=JSON.parse(sealed);changedHeader.revision=2;
 await assert.rejects(B.open(JSON.stringify(changedHeader),password,owner),/contraseña|alterados/);
 const duplicated=copy(snap);duplicated.operations.push(copy(duplicated.operations[0]));
 await assert.rejects(B.seal(duplicated,password),/duplicada/);
 const changedOp=copy(snap);changedOp.operations[0].payload.sessions[0].id='malicious-change';
 await assert.rejects(B.seal(changedOp,password),/hash SHA-256/);
 const invalidLeague=copy(snap);invalidLeague.confirmed.payload.leagueNational={matches:[]};
 await assert.rejects(B.seal(invalidLeague,password),/Liga/);
 const memory={snapshot:async id=>{assert.equal(id,owner);return copy(snap)},
  restoreSnapshot:async(id,x)=>{assert.equal(id,owner);assert.deepEqual(copy(x),copy(snap));return{status:'restored'}}};
 const newFile=await B.exportBackup(memory,owner,password);
 assert.ok((await B.open(newFile,password,owner)).operations.length===1);
 await assert.rejects(B.restoreBackup(memory,owner,newFile,password,'INVALID'),/confirmación/);
 const applied=await B.restoreBackup(memory,owner,newFile,password,'CONFIRMAR-RESTAURACION-FICTICIA');
 assert.equal(applied.status,'restored');
 console.log('PASS I9 Node · AES-GCM owner/AAD, wrong key, tamper, header, SHA-256, duplicate operation, Liga rejection, explicit consent');
}
main().catch(err=>{console.error(err);process.exitCode=1});
