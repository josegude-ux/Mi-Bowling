/* MI BOWLING I22 · made-up parallel-file positions A/B/C.
 * No human identity, no trusted third-party PIN or production records.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {fixture:fixture21,A,B,C_ID,PASS,clone}=require('./i21-provenance-fixture.cjs');
function module22(){
 const context={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 context.window=context;context.globalThis=context;vm.createContext(context);
 for(const name of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js',
  'i13-witnesses.js','i14-policy-lifecycle.js','i15-recovery.js',
  'i16-anchors.js','i17-forensics.js','i18-forensic-hold.js',
  'i19-manual-review.js','i20-rival-reviews.js','i21-provenance-doubt.js',
  'i22-uncertainty-matrix.js']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',name),'utf8'),
   context,{filename:name});
 }
 return {U:context.MiBowlingI22Uncertainty,D:context.MiBowlingI21ProvenanceDoubt};
}
async function fixture(owner=A){
 const f=await fixture21(owner),{U,D}=module22();
 const baseline=await D.prepare(f.originals);
 const competitor=await D.prepare(f.competing);
 const replacement=await D.prepare(f.jointlySubstituted);
 const offer=(slot,caseFile=baseline,claimedDigest=caseFile.digest,
  origin='same-file')=>({
   slot,caseFile:clone(caseFile),claimedDigest,origin
  });
 const duplicates=[offer('A'),offer('B',baseline,baseline.digest,'claimed-separate'),
  offer('C',baseline,baseline.digest,'unknown')];
 const competing=[offer('A'),offer('B',competitor,competitor.digest,'claimed-separate'),
  offer('C',replacement,replacement.digest,'claimed-separate')];
 const genuineUnknown=[offer('A',competitor,null,'unknown'),null,null];
 return {...f,U,D,baseline,competitor,replacement,offer,
  duplicates,competing,genuineUnknown};
}
module.exports={fixture,module22,A,B,C_ID,PASS,clone};
