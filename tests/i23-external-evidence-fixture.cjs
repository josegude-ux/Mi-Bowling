/* MI BOWLING I23 · fabricated provenance claims in logical A/B/C files.
 * All prior P256 keys stay in Node ephemeral fixture RAM.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {fixture:fixture22,A,B,C_ID,PASS,clone}=require('./i22-uncertainty-fixture.cjs');
function module23(){
 const x={crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,console};
 x.window=x;x.globalThis=x;vm.createContext(x);
 for(const file of ['i11-audit-core.js','i11-evidence.js','i12-manifest.js',
  'i13-witnesses.js','i14-policy-lifecycle.js','i15-recovery.js',
  'i16-anchors.js','i17-forensics.js','i18-forensic-hold.js',
  'i19-manual-review.js','i20-rival-reviews.js','i21-provenance-doubt.js',
  'i22-uncertainty-matrix.js','i23-external-evidence-gate.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../lab',file),'utf8'),
   x,{filename:file});
 return {G:x.MiBowlingI23ExternalEvidence,U:x.MiBowlingI22Uncertainty};
}
async function fixture(owner=A){
 const previous=await fixture22(owner),{G,U}=module23();
 const base=await U.prepare(previous.baseline,null,previous.duplicates);
 const rival=await U.prepare(previous.baseline,null,previous.competing);
 const replaced=await U.prepare(previous.replacement,null,[
  previous.offer('A',previous.replacement),
  previous.offer('B',previous.replacement),
  previous.offer('C',previous.replacement)
 ]);
 const record=(slot,packet=base,options={})=>({
  slot,packet:clone(packet),
  claim:{format:G.RECEIPT,version:1,slot,packetDigest:options.digest||packet.digest,
   origin:options.origin||'claimed-offline',
   retentionGroup:options.group||('group-'+slot.toLowerCase()),
   preIncidentClaimed:options.before??true,
   reviewerAlias:options.alias||slot}
 });
 return {...previous,G,U,base,rival,replaced,record,
  matching:[record('A'),record('B'),record('C')],
  competing:[record('A',base),record('B',rival),record('C',replaced)],
  correlated:[record('A'),record('B',base,{group:'group-a',alias:'A'}),null]
 };
}
module.exports={fixture,module23,A,B,C_ID,PASS,clone};
