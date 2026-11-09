/* I21 fixtures: valid but independently UNPROVEN packet+SHA combinations.
 * Only fabricated A/B/C data and ephemeral Node keys.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {fixture:fixture20,A,B,C_ID,PASS,clone}=require('./i20-rival-fixture.cjs');
function module21(){
 const x={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 x.window=x;x.globalThis=x;vm.createContext(x);
 for(const file of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js',
  'i13-witnesses.js','i14-policy-lifecycle.js','i15-recovery.js',
  'i16-anchors.js','i17-forensics.js','i18-forensic-hold.js',
  'i19-manual-review.js','i20-rival-reviews.js','i21-provenance-doubt.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',file),'utf8'),
   x,{filename:file});
 return {D:x.MiBowlingI21ProvenanceDoubt,P:x.MiBowlingI20RivalReviews};
}
async function fixture(owner=A){
 const f=await fixture20(owner),{D,P}=module21();
 const primary=await P.prepare(f.dossier,null,f.fullReview);
 const different=await P.prepare(f.dossier,null,f.sameReview);
 const substituted=await P.prepare(f.total,null,[null,null,null]);
 const bundle=(slot,packet,claimedDigest=packet.packetDigest)=>({
  slot,packet:clone(packet),
  claim:{format:D.CLAIM,version:1,slot,digest:claimedDigest,
   origin:'unverified-file'}
 });
 const originals=['A','B','C'].map(slot=>bundle(slot,primary));
 const jointlySubstituted=['A','B','C'].map(slot=>bundle(slot,substituted));
 const competing=[bundle('A',primary),bundle('B',different),
  bundle('C',substituted)];
 return {...f,D,P,primary,different,substituted,bundle,
  originals,jointlySubstituted,competing};
}
module.exports={fixture,module21,A,B,C_ID,PASS,clone};
