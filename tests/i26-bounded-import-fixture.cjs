/* MI BOWLING I26 · synthetic A/B/C seven-stage import fixtures. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {fixture:fixture25,A,B,C_ID,PASS,clone}=require('./i25-retention-fixture.cjs');
function module26(){
 const env={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 env.window=env;env.globalThis=env;vm.createContext(env);
 for(const file of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js',
  'i13-witnesses.js','i14-policy-lifecycle.js','i15-recovery.js',
  'i16-anchors.js','i17-forensics.js','i18-forensic-hold.js',
  'i19-manual-review.js','i20-rival-reviews.js','i21-provenance-doubt.js',
  'i22-uncertainty-matrix.js','i23-external-evidence-gate.js',
  'i24-manual-crosscheck.js','i25-retention-audit.js',
  'i26-bounded-import.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',file),'utf8'),
   env,{filename:file});
 return{Import:env.MiBowlingI26BoundedImport,
  Audit:env.MiBowlingI25RetentionAudit};
}
async function fixture(owner=A){
 const f=await fixture25(owner),{Import,Audit}=module26();
 const blobs=f.raws.map(s=>new Blob([s],{type:'application/json'}));
 return{...f,Import,Audit,blobs,
  fromRaws:raw=>raw.map(s=>s===null?null:new Blob([s],{type:'application/json'}))};
}
module.exports={fixture,module26,A,B,C_ID,PASS,clone};
