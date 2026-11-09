/* MI BOWLING · LAB I24 · A/B/C fictional manual cross-check fixtures. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {fixture:fixture23,A,B,C_ID,PASS,clone}=require('./i23-external-evidence-fixture.cjs');
function module24(){
 const x={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 x.window=x;x.globalThis=x;vm.createContext(x);
 for(const file of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js',
  'i13-witnesses.js','i14-policy-lifecycle.js','i15-recovery.js',
  'i16-anchors.js','i17-forensics.js','i18-forensic-hold.js',
  'i19-manual-review.js','i20-rival-reviews.js','i21-provenance-doubt.js',
  'i22-uncertainty-matrix.js','i23-external-evidence-gate.js',
  'i24-manual-crosscheck.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',file),'utf8'),
   x,{filename:file});
 return {C:x.MiBowlingI24ManualCrosscheck,G:x.MiBowlingI23ExternalEvidence};
}
async function fixture(owner=A){
 const f=await fixture23(owner),{C,G}=module24();
 const source=await G.prepare(f.base,null,f.matching);
 const competing=await G.prepare(f.base,null,f.competing);
 const replaced=await G.prepare(f.replaced,null,[
  f.record('A',f.replaced),f.record('B',f.replaced),f.record('C',f.replaced)
 ]);
 const claim=(slot,verdict='claimed-match',referenceDigest=source.digest,
  origin='claimed-independent')=>({slot,verdict,referenceDigest,origin});
 const positive=clone(C.emptySheets());
 for(let i=0;i<6;i++)positive[i].claims[0]=claim('A');
 const disputed=clone(positive);
 disputed[0].claims[1]=claim('B','claimed-conflict',source.digest);
 const correlated=clone(positive);
 correlated[1].claims[1]=claim('B','claimed-match',source.digest);
 const invalid=clone(positive);invalid[2].claims[2]={
  slot:'C',verdict:'claimed-match',referenceDigest:'not-SHA',
  origin:'claimed-independent'};
 return {...f,C,G,source,competing,replaced,claim,
  positive,disputed,correlated,invalid};
}
module.exports={fixture,module24,A,B,C_ID,PASS,clone};
