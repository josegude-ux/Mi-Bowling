/* MI BOWLING I18 · fictitious A/B/C portable case fixture.
 * Never serializes P-256 private keys or I11 passwords.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {fixture:fixture17,A,B,C_ID,PASS,clone}=require('./i17-forensics-fixture.cjs');
const CASE='00000018-1818-4818-8181-000000000018';
function module18(){
 const x={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 x.window=x;x.globalThis=x;vm.createContext(x);
 for(const file of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js',
  'i13-witnesses.js','i14-policy-lifecycle.js','i15-recovery.js',
  'i16-anchors.js','i17-forensics.js','i18-forensic-hold.js']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',file),'utf8'),
   x,{filename:file});
 }
 return x.MiBowlingI18ForensicHold;
}
async function fixture(owner=A){
 const f=await fixture17(owner),I18=module18();
 const inputs={package15:f.package15,source15:f.source,
  externalRoot:f.externalRoot,externalLatest:f.externalMark,
  reports:f.reports};
 const allLost={package15:null,source15:null,externalRoot:null,
  externalLatest:null,reports:[null,null,null]};
 return {...f,I18,inputs,allLost,CASE};
}
module.exports={fixture,module18,CASE,A,B,C_ID,PASS,clone};
