/* MI BOWLING I19 · Node-only synthetic A/B/C manual alias labels.
 * P-256 keys remain in previous ephemeral fixture RAM, never exported.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {fixture:fixture18,A,B,C_ID,PASS,clone}=require('./i18-forensic-fixture.cjs');
function module19(){
 const x={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 x.window=x;x.globalThis=x;vm.createContext(x);
 for(const file of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js',
  'i13-witnesses.js','i14-policy-lifecycle.js','i15-recovery.js',
  'i16-anchors.js','i17-forensics.js','i18-forensic-hold.js','i19-manual-review.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',file),'utf8'),x,
   {filename:file});
 return {V:x.MiBowlingI19ManualReview,H:x.MiBowlingI18ForensicHold};
}
async function fixture(owner=A){
 const f=await fixture18(owner),{V,H}=module19();
 const consistent=await H.create(f.inputs,owner,f.CASE,PASS);
 const branchInputs=clone(f.inputs);branchInputs.reports[2]=await f.branch('C');
 const conflict=await H.create(branchInputs,owner,f.CASE,PASS);
 const total=await H.create(f.allLost,owner,f.CASE,PASS);
 const noRoot=clone(f.inputs);noRoot.externalRoot=null;noRoot.externalLatest=null;
 const anchorsLost=await H.create(noRoot,owner,f.CASE,PASS);
 return {...f,V,H,consistent,conflict,total,anchorsLost};
}
module.exports={fixture,module19,A,B,C_ID,PASS,clone};
