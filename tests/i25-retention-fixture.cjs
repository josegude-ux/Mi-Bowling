/* MI BOWLING I25 · seven synthetic I18-I24 files: A/B/C only, no real keys.
 * Key material is ephemeral and retained only by earlier Node fixtures.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {fixture:fixture24,A,B,C_ID,PASS,clone}=require('./i24-manual-crosscheck-fixture.cjs');
const moduleFiles=[
 'i11-audit-core.js','i11-evidence.js','i12-manifest.js',
 'i13-witnesses.js','i14-policy-lifecycle.js','i15-recovery.js',
 'i16-anchors.js','i17-forensics.js','i18-forensic-hold.js',
 'i19-manual-review.js','i20-rival-reviews.js','i21-provenance-doubt.js',
 'i22-uncertainty-matrix.js','i23-external-evidence-gate.js',
 'i24-manual-crosscheck.js','i25-retention-audit.js'
];
function modules(){
 const env={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 env.window=env;env.globalThis=env;vm.createContext(env);
 for(const file of moduleFiles)
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',file),'utf8'),
   env,{filename:file});
 return{Audit:env.MiBowlingI25RetentionAudit,
  C:env.MiBowlingI24ManualCrosscheck};
}
async function fixture(owner=A){
 const f=await fixture24(owner),{Audit,C}=modules();
 const stage24=await C.prepare(f.source,null,f.positive);
 const objects=[f.dossier,f.abClosed,f.primary,f.baseline,f.base,f.source,stage24];
 const raws=objects.map(x=>JSON.stringify(x));
 return{...f,Audit,C,stage24,objects,raws,
  emptyPins:Array(7).fill(null),rawsFromObjects:xs=>xs.map(x=>x===null?null:JSON.stringify(x))};
}
module.exports={fixture,modules,A,B,C_ID,PASS,clone};
