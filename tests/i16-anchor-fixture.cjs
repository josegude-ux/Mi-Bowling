/* MI BOWLING I16 · synthetic pinned references A/B/C only.
 * P-256 private keys live in ephemeral Node test RAM; never exported to UI.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {fixture:fixture15,A,B,C_ID,PASS,clone}=require('./i15-recovery-fixture.cjs');
const {b64}=require('./i13-witness-fixture.cjs');
function modules(){
 const ctx={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
 for(const file of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js',
  'i13-witnesses.js','i14-policy-lifecycle.js','i15-recovery.js','i16-anchors.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',file),'utf8'),ctx,{filename:file});
 return {K:ctx.MiBowlingI16Anchors,C:ctx.MiBowlingI11AuditCore,
  W:ctx.MiBowlingI13Witnesses,M:ctx.MiBowlingI12Manifest};
}
async function fixture(owner=A){
 const previous=await fixture15(owner),{K,C}=modules(),seriesId=
  '00000016-1616-4161-8161-000000000016';
 const source=previous.sources,pol=source.newPolicy,policyDigest=
  await previous.I13.verifyPolicy(pol,owner);
 const i15PinDigest=await previous.I12.hashText(JSON.stringify(source.externalLatestPin));
 let prior=C.ZERO;const records=[];
 for(let i=1;i<=3;i++){
  const nonce=String(i).padStart(8,'0')+'-1616-4161-8161-000000000016';
  const st=K.checkpoint(owner,seriesId,i,nonce,prior,i15PinDigest,
   policyDigest.policyDigest,previous.manifest.digest,3);
  const signatures=[];
  for(let j=0;j<2;j++){
   const sig=await webcrypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},
    previous.fresh.pairs[j].privateKey,K.signBytes(st));
   signatures.push({keyId:pol.keys[j].keyId,signature:b64(sig)});
  }
  records.push({statement:st,signatures});
  prior=await K.stHash(st);
 }
 const history={format:K.FORMAT,version:1,owner,seriesId,records};
 const externalRoot=await K.genesis(owner,seriesId,pol,source.externalLatestPin,
  records[0].statement);
 const externalMark=await K.highWatermark(history,externalRoot);
 const copies=[];
 for(const slot of ['A','B','C'])copies.push(await K.anchorCopy(slot,externalMark));
 const older=(seq)=>({format:K.FORMAT,version:1,owner,seriesId,
  records:clone(records.slice(0,seq))});
 const watermarkFor=async seq=>K.highWatermark(older(seq),externalRoot);
 return {owner,history,externalRoot,externalMark,copies,older,watermarkFor,
  previous,package15:previous.package15,source:source,PASS,K};
}
module.exports={fixture,A,B,C_ID,PASS,clone,modules};
