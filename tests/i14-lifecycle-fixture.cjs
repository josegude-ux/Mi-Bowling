/* MI BOWLING I14 LAB · synthetic dual quorum fixture.
 * Private keys exist ONLY in Node test RAM and are never serialized to app/PR.
 */
'use strict';
const {webcrypto}=require('node:crypto'),{fixture,modules,A,B,C_ID,PASS,clone,b64}=require('./i13-witness-fixture.cjs');
const text=s=>new TextEncoder().encode(s);
async function build(owner=A,epochs=3){
 if(epochs<1||epochs>3)throw Error('I14 fixture epochs unsupported');
 const f=await fixture(owner,3),{W,M}=f;
 const L=modules().W; // I13 module separately; I14 loaded explicitly below
 const ctx=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 // Existing fixture modules belong to a VM with the same real WebCrypto;
 // for I14 use a new VM including all dependencies.
 const root={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 root.window=root;root.globalThis=root;ctx.createContext(root);
 for(const filename of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js',
  'i13-witnesses.js','i14-policy-lifecycle.js'])
  ctx.runInContext(fs.readFileSync(path.join(__dirname,'../lab',filename),'utf8'),
   root,{filename});
 const I12=root.MiBowlingI12Manifest,I13=root.MiBowlingI13Witnesses,I14=root.MiBowlingI14Lifecycle;
 const added=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},
  true,['sign','verify']);
 const newPubRaw=await webcrypto.subtle.exportKey('jwk',added.publicKey);
 const newPub={kty:'EC',crv:'P-256',x:newPubRaw.x,y:newPubRaw.y};
 const allPairs=new Map();
 f.policy.keys.forEach((p,i)=>allPairs.set(p.keyId,f.keys[i]));
 const p0=await I13.createPolicy(owner,f.publicJwks,2);
 const p1=await I13.createPolicy(owner,[f.publicJwks[1],f.publicJwks[2],newPub],2);
 const p2=await I13.createPolicy(owner,[f.publicJwks[2],newPub],2);
 allPairs.set(await I13.fingerprint(newPub),added);
 const policies=[p0,p1,p2].slice(0,epochs);
 const bundles=[],pins13=[],epochRecords=[];
 let previous=I14.ZERO;
 const sign=async (pair,data)=>b64(await webcrypto.subtle.sign(
  {name:'ECDSA',hash:'SHA-256'},pair.privateKey,data));
 const signPolicy=async(policy,role,st)=>{
  const list=[];
  for(const item of policy.keys.slice(0,policy.threshold)){
   const pair=allPairs.get(item.keyId);if(!pair)throw Error('missing fixture key');
   list.push({keyId:item.keyId,signature:await sign(pair,I14.context(role,st))});
  }
  return list;
 };
 for(let i=0;i<epochs;i++){
  const files=f.rawFiles.slice(0,i+1),manifest=await I12.build(owner,
   files.map(file=>({file,passphrase:PASS})));
  const snapshots=[{manifest,files,pin12:I12.pin(manifest)}];
  const st13=I13.statement(owner,1,manifest,I14.ZERO);
  const signatures=[];
  for(const item of policies[i].keys.slice(0,policies[i].threshold)){
   signatures.push({keyId:item.keyId,
    signature:await sign(allPairs.get(item.keyId),text(I13.signedText(st13)))});
  }
  const witnessBundle={format:I13.FORMAT,version:1,owner,
   records:[{statement:st13,signatures}]};
  const witnessPin=await I13.lastPin(witnessBundle,policies[i]);
  bundles.push(witnessBundle);pins13.push(witnessPin);
  const action=i===0?'genesis':i===1?'rotate':'revoke';
  const st=I14.statement(owner,i+1,action,previous,
   i===0?I14.ZERO:await I12.hashText(JSON.stringify(policies[i-1])),
   await I12.hashText(JSON.stringify(policies[i])),
   manifest.digest,manifest.entries.at(-1).count);
  const oldSignatures=i===0?[]:await signPolicy(policies[i-1],'OLD',st);
  const newSignatures=await signPolicy(policies[i],'NEW',st);
  epochRecords.push({statement:st,oldSignatures,newSignatures,
   witnessBundle,witnessSnapshots:snapshots});
  previous=await I14.statementHash(st);
 }
 const bundle={format:I14.FORMAT,version:1,owner,epochs:epochRecords};
 const rootPin=await I14.genesisPin(owner,policies[0]);
 const latestPin=await I14.lastPin(bundle,policies);
 return {owner,bundle,policies,pins13,rootPin,latestPin,
  PASS,rawFiles:f.rawFiles,events:f.events,I14,I13,I12,
  allPairs,added,original:f};
}
module.exports={build,A,B,C_ID,PASS,clone};
