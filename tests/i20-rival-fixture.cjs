/* MI BOWLING I20 · ephemeral A/B/C rival I19-review fixtures.
 * All P256 private material remains in the preceding Node fixture RAM.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {fixture:fixture19,A,B,C_ID,PASS,clone}=require('./i19-review-fixture.cjs');
function module20(){
 const x={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 x.window=x;x.globalThis=x;vm.createContext(x);
 for(const file of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js',
  'i13-witnesses.js','i14-policy-lifecycle.js','i15-recovery.js',
  'i16-anchors.js','i17-forensics.js','i18-forensic-hold.js',
  'i19-manual-review.js','i20-rival-reviews.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',file),'utf8'),
   x,{filename:file});
 return {P:x.MiBowlingI20RivalReviews,V:x.MiBowlingI19ManualReview,
  H:x.MiBowlingI18ForensicHold};
}
async function fixture(owner=A){
 const f=await fixture19(owner),{P,V}=module20();
 const d=f.conflict;
 const first=await V.prepare(d);
 const a=await V.record(first,d,null,'A','disputed-evidence',
  'signed-branch-comparison');
 const ab=await V.record(a,d,null,'B','requires-independent-review',
  'external-provenance-unverified');
 const ac=await V.record(a,d,null,'C','missing-originals',
  'external-anchor-absent');
 const abClosed=await V.escalate(ab,d);
 const acClosed=await V.escalate(ac,d);
 const incomplete=await V.record(first,d,null,'A','disputed-evidence',
  'signed-branch-comparison');
 const fullReview=[{slot:'A',review:clone(abClosed)},
  {slot:'B',review:clone(acClosed)},
  {slot:'C',review:clone(abClosed)}];
 return {...f,P,V,dossier:d,fullReview,abClosed,acClosed,incomplete,
  sameReview:[{slot:'A',review:clone(abClosed)},
   {slot:'B',review:clone(abClosed)},null],
  compatible:[{slot:'A',review:clone(abClosed)},
   {slot:'B',review:clone(incomplete)},null]};
}
module.exports={fixture,module20,A,B,C_ID,PASS,clone};
