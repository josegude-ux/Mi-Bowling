/* MI BOWLING I13 · synthetic signing fixtures run only in Node test RAM.
 * Never used by any application page, deployment, key service or real account.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C_ID='33333333-3333-4333-8333-333333333333';
const PASS='I13-SYNTHETIC-WITNESS-EVIDENCE-2026';
function modules(){
 const c={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 c.window=c;c.globalThis=c;vm.createContext(c);
 for(const f of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js','i13-witnesses.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',f),'utf8'),c,{filename:f});
 return {C:c.MiBowlingI11AuditCore,E:c.MiBowlingI11Evidence,
  M:c.MiBowlingI12Manifest,W:c.MiBowlingI13Witnesses};
}
const clone=x=>JSON.parse(JSON.stringify(x));
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
async function fixture(owner=A,n=2){
 const {C,E,M,W}=modules();
 const keys=[],publicJwks=[];
 for(let i=0;i<3;i++){
  const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  keys.push(pair);
  const jwk=await webcrypto.subtle.exportKey('jwk',pair.publicKey);
  publicJwks.push({kty:'EC',crv:'P-256',x:jwk.x,y:jwk.y});
 }
 const policy=await W.createPolicy(owner,publicJwks,2);
 const events=[],rawFiles=[];
 const uuid=i=>String(i).padStart(8,'0')+'-1111-4111-8111-111111111111';
 for(let i=1;i<=Math.max(n,2);i++){
  const kind=i===2?'conflict':'restore';
  const e=await C.append(owner,{kind,
   reason:kind==='conflict'?'fork':'none',
   status:kind==='conflict'?'rejected':'restored',
   auditId:uuid(i),backupId:uuid(i+40),backupSha:'a'.repeat(64),
   occurredAt:1794200000000+i,sourceCreatedAt:1794000000000+i,
   revision:i,operationsAdded:kind==='restore'?1:0},
   events.at(-1)?.chainHash||C.ZERO,i);
  events.push(e);
  rawFiles.push(await E.seal({version:1,owner,events:clone(events),head:C.head(owner,events)},PASS));
 }
 const snapshots=[],records=[];
 let previousHash=C.ZERO;
 for(let i=1;i<=n;i++){
  const files=rawFiles.slice(0,i);
  const manifest=await M.build(owner,files.map(file=>({file,passphrase:PASS})));
  const snap={manifest,files,pin12:M.pin(manifest)};
  const st=W.statement(owner,i,manifest,previousHash);
  const message=new TextEncoder().encode(W.signedText(st));
  const signatures=[];
  for(let j=0;j<2;j++){
   const bytes=await webcrypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys[j].privateKey,message);
   signatures.push({keyId:policy.keys[j].keyId,signature:b64(bytes)});
  }
  records.push({statement:st,signatures});
  previousHash=await W.statementHash(st);snapshots.push(snap);
 }
 const bundle={format:W.FORMAT,version:1,owner,records};
 const pin=await W.lastPin(bundle,policy);
 return {owner,policy,pin,bundle,snapshots,keys,publicJwks,
  rawFiles,events,PASS,C,E,M,W};
}
module.exports={A,B,C_ID,PASS,fixture,modules,clone,b64};
