/* MI BOWLING I27 · A/B/C fictitious, no real keys retained.
 * Node performance / memory readings are runtime observations, not hardware proof.
 */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {fixture:fixture26,A,B,C_ID,PASS,clone}=require('./i26-bounded-import-fixture.cjs');
function module27(){
 const env={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console,performance};
 env.window=env;env.globalThis=env;vm.createContext(env);
 for(const name of [
  'i11-audit-core.js','i11-evidence.js','i12-manifest.js',
  'i13-witnesses.js','i14-policy-lifecycle.js','i15-recovery.js',
  'i16-anchors.js','i17-forensics.js','i18-forensic-hold.js',
  'i19-manual-review.js','i20-rival-reviews.js','i21-provenance-doubt.js',
  'i22-uncertainty-matrix.js','i23-external-evidence-gate.js',
  'i24-manual-crosscheck.js','i25-retention-audit.js',
  'i26-bounded-import.js','i27-resource-profile.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',name),'utf8'),
   env,{filename:name});
 return{Profile:env.MiBowlingI27ResourceProfile,
  Import:env.MiBowlingI26BoundedImport,
  Audit:env.MiBowlingI25RetentionAudit};
}
async function fixture(owner=A){
 const f=await fixture26(owner),m=module27();
 return {...f,...m,makeFiles:x=>x.map(y=>y===null?null:new Blob([y]))};
}
module.exports={fixture,module27,A,B,C_ID,PASS,clone};
