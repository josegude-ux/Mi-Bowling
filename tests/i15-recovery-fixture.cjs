/* MI BOWLING I15 · Node-only synthetic recovery authorities A/B/C.
 * Private ECDSA keys remain ephemeral in Node RAM and NEVER in exported data.
 */
'use strict';
const {webcrypto}=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {build:buildI14,A,B,C_ID,PASS,clone}=require('./i14-lifecycle-fixture.cjs');
const {b64}=require('./i13-witness-fixture.cjs');
const keysOnly=jwk=>({kty:'EC',crv:'P-256',x:jwk.x,y:jwk.y});
const utf=s=>new TextEncoder().encode(s);
async function makeKeys(count){
 const pairs=[],pubs=[];
 for(let i=0;i<count;i++){
  const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},
   false,['sign','verify']);
  pairs.push(pair);pubs.push(keysOnly(await webcrypto.subtle.exportKey('jwk',pair.publicKey)));
 }
 return {pairs,pubs};
}
function modules(){
 const x={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 x.window=x;x.globalThis=x;vm.createContext(x);
 for(const file of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js',
  'i13-witnesses.js','i14-policy-lifecycle.js','i15-recovery.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',file),'utf8'),x,{filename:file});
 return {I11:x.MiBowlingI11AuditCore,E:x.MiBowlingI11Evidence,
  M:x.MiBowlingI12Manifest,W:x.MiBowlingI13Witnesses,
  L:x.MiBowlingI14Lifecycle,R:x.MiBowlingI15Recovery};
}
async function fixture(owner=A){
 const previous=await buildI14(owner,2),{W,M,R}=modules();
 const rescuers=await makeKeys(3),fresh=await makeKeys(3);
 const recoveryPolicy=await W.createPolicy(owner,rescuers.pubs,2);
 const newPolicy=await W.createPolicy(owner,fresh.pubs,2);
 const commitment=await R.commitment(owner,previous.rootPin,recoveryPolicy);
 const files=previous.rawFiles.slice(0,3);
 const manifest=await M.build(owner,files.map(file=>({file,passphrase:PASS})));
 const snapshots=[{manifest,files,pin12:M.pin(manifest)}];
 const st=W.statement(owner,1,manifest);
 const sign=async(pair,msg)=>b64(await webcrypto.subtle.sign(
  {name:'ECDSA',hash:'SHA-256'},pair.privateKey,msg));
 const witnessSignatures=await Promise.all(newPolicy.keys.slice(0,2).map(
  async(k,i)=>({keyId:k.keyId,signature:await sign(fresh.pairs[i],utf(W.signedText(st)))})));
 const witnessBundle={format:W.FORMAT,version:1,owner,
  records:[{statement:st,signatures:witnessSignatures}]};
 const newPin13=await W.lastPin(witnessBundle,newPolicy);
 const oldManifest=previous.bundle.epochs.at(-1).witnessSnapshots.at(-1).manifest;
 const recoveryStatement=await R.statement(owner,
  'd15e0001-1111-4111-8111-111111111111',
  'lost-quorum',previous.latestPin,oldManifest,commitment,newPolicy,manifest);
 const signatures=async(role,policy,pairs)=>{
  const out=[];
  for(let i=0;i<policy.threshold;i++)out.push({
   keyId:policy.keys[i].keyId,
   signature:await sign(pairs[i],R.signedBytes(role,recoveryStatement))
  });
  return out;
 };
 const package15={format:R.FORMAT,version:1,owner,previousBundle:previous.bundle,
  recovery:{statement:recoveryStatement,
   authoritySignatures:await signatures('RECOVERY',recoveryPolicy,rescuers.pairs),
   acceptSignatures:await signatures('ACCEPT',newPolicy,fresh.pairs),
   witnessBundle,witnessSnapshots:snapshots}};
 const sources={previousPolicies:previous.policies,
  previousPins13:previous.pins13,
  previousGenesisPin:previous.rootPin,
  previousLatestPin:previous.latestPin,
  recoveryPolicy,commitment,newPolicy,newPin13,externalLatestPin:null};
 sources.externalLatestPin=await R.lastPin(package15,sources);
 return {owner,package15,sources,previous,recoveryStatement,manifest,
  rescuers,fresh,I15:R,I13:W,I12:M,I11:modules().I11,
  E:previous.original.E,PASS};
}
module.exports={fixture,A,B,C_ID,PASS,clone,modules};
