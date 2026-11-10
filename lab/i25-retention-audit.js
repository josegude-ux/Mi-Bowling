/* MI BOWLING I25 · LAB ONLY · consolidated I18–I24 retention diagnostics.
 * Exact imported UTF-8 text is retained, not independently authenticated.
 * Self-consistency, reference pins and A/B/C aliases are never real custody.
 * No browser storage, network, clock, keys, approval or operational writes.
 */
(function(root){
'use strict';
const M=root.MiBowlingI12Manifest;
const engines=[
 root.MiBowlingI18ForensicHold,root.MiBowlingI19ManualReview,
 root.MiBowlingI20RivalReviews,root.MiBowlingI21ProvenanceDoubt,
 root.MiBowlingI22Uncertainty,root.MiBowlingI23ExternalEvidence,
 root.MiBowlingI24ManualCrosscheck
];
if(!M||engines.some(x=>!x)||!root.crypto?.subtle||!root.TextEncoder||!root.TextDecoder)
 throw Error('I25: I12 and I18-I24 modules and WebCrypto required');
const FORMAT='MI-BOWLING-I25-LAB-RETENTION-CONSOLIDATION';
const EVENT='MI-BOWLING-I25-LAB-AUDIT-TRACE';
const STAGES=['I18','I19','I20','I21','I22','I23','I24'];
const MAX_FILE_BYTES=12*1024*1024,MAX_TOTAL_BYTES=28*1024*1024;
const SHA=/^[0-9a-f]{64}$/,ZERO='0'.repeat(64);
const KEYS=['format','version','sources','claimedPins','evidence','evidenceRoot',
 'links','findings','classification','status','events','latestEventHash',
 'authority','operationalApproval','externalCustodyProven','humanIdentityProven',
 'priorPinAuthenticityProven','timestampProven','immutabilityProven',
 'jointReplacementExcluded','outsideReviewContacted','reRootAuthorized',
 'noWrites','containsScores','digest'];
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join(',')===keys.slice().sort().join(',');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=x=>M.hashText(JSON.stringify(x));
const traceHash=x=>M.hashText('MI-BOWLING-I25-TRACE-v1|'+JSON.stringify(x));
function safeRaw(x,i){
 if(x===null)return {bytes:0};
 if(typeof x!=='string')throw Error('I25: expected UTF-8 text for '+STAGES[i]);
 if(x.charCodeAt(0)===0xFEFF)throw Error('I25: UTF-8 BOM not accepted: '+STAGES[i]);
 const bytes=encoder.encode(x);
 if(bytes.length>MAX_FILE_BYTES)throw Error('I25: individual file exceeds 12 MiB: '+STAGES[i]);
 if(decoder.decode(bytes)!==x)throw Error('I25: invalid Unicode roundtrip: '+STAGES[i]);
 return {bytes:bytes.length};
}
function checkSizes(sources){
 if(!Array.isArray(sources)||sources.length!==7)
  throw Error('I25: seven ordered slots I18-I24 required');
 let total=0;
 for(let i=0;i<7;i++){
  total+=safeRaw(sources[i],i).bytes;
  if(total>MAX_TOTAL_BYTES)throw Error('I25: total supplied files exceed 28 MiB');
 }
 return total;
}
function parseSource(s){
 if(s===null)return {value:null,state:'missing',canonical:null};
 try{
  const x=JSON.parse(s);
  if(!x||typeof x!=='object'||Array.isArray(x))
   return {value:null,state:'invalid-json',canonical:null};
  return {value:x,state:'parseable',canonical:JSON.stringify(x)};
 }catch(_){return {value:null,state:'invalid-json',canonical:null}}
}
function contains(candidate,expected){
 if(!candidate||!expected)return false;
 return JSON.stringify(candidate)===JSON.stringify(expected);
}
function link(name,from,to,matching){
 return{from,to,relation:name,state:matching?'match':'divergent',
  externalOriginProven:false};
}
async function inspect(sources,claimedPins){
 checkSizes(sources);
 if(!Array.isArray(claimedPins)||claimedPins.length!==7||
  claimedPins.some(x=>x!==null&&!(typeof x==='string'&&SHA.test(x))))
  throw Error('I25: seven optional lowercase SHA256 claims required');
 const parsed=sources.map(parseSource);
 const evidence=[],findings=[];
 let invalid=0,missing=0,different=0,untrustedPinMismatch=0;
 for(let i=0;i<7;i++){
  const raw=sources[i],p=parsed[i],bytes=safeRaw(raw,i).bytes;
  const rawDigest=raw===null?ZERO:await M.hashText(raw);
  const normalizedDigest=p.canonical===null?null:await M.hashText(p.canonical);
  const differs=p.canonical!==null&&p.canonical!==raw;
  if(differs){different++;findings.push('imported-utf8-vs-json-serialization-'+STAGES[i]);}
  let state=p.state==='missing'?'missing':p.state==='invalid-json'?
    'invalid-json':'pending-verification',pinState='not-supplied';
  if(claimedPins[i]!==null){
   pinState=claimedPins[i]===rawDigest?'arithmetic-match-untrusted':'claim-mismatch';
   if(pinState==='claim-mismatch'){
    untrustedPinMismatch++;findings.push('sha-claim-mismatch-'+STAGES[i]);
   }
  }
  if(state==='missing')missing++;
  if(state==='invalid-json')invalid++;
  evidence.push({stage:STAGES[i],present:raw!==null,state,rawBytes:bytes,
   rawDigest,normalizedDigest,normalizationObserved:differs,
   pinState,unverifiedExternalProvenance:true});
 }
 // Every original remains in sources even if validation fails.
 for(let i=0;i<7;i++){
  if(evidence[i].state!=='pending-verification')continue;
  try{
   const d=parsed[i].value;
   if(!d||d.format!==engines[i].FORMAT)throw Error('format mismatch');
   let v;
   if(i===1){
    const dossier=parsed[0].value||(parsed[2].value?.dossier);
    if(!dossier){
     evidence[i].state='blocked-review-context-missing';continue;
    }
    v=await engines[i].verify(d,dossier,null);
   }else v=await engines[i].verify(d);
   if(v.integrityChecked!==true||v.noWrites!==true||
     v.operationalApproval===true||v.operationallyApproved===true)
    throw Error('false operational permission');
   evidence[i].state='internally-verified';
  }catch(_){
   evidence[i].state='invalid-upstream-verification';invalid++;
   findings.push('upstream-verification-rejected-'+STAGES[i]);
  }
 }
 const links=[];
 const pairs=[
  ['I20 includes I18','I20','I18',()=>contains(parsed[2].value?.dossier,parsed[0].value)],
  ['I20 includes I19','I20','I19',()=>Array.isArray(parsed[2].value?.claims)&&
    parsed[2].value.claims.some(x=>contains(x?.review,parsed[1].value))],
  ['I21 includes I20','I21','I20',()=>Array.isArray(parsed[3].value?.bundles)&&
    parsed[3].value.bundles.some(x=>contains(x?.packet,parsed[2].value))],
  ['I22 includes I21','I22','I21',()=>contains(parsed[4].value?.source,parsed[3].value)],
  ['I23 includes I22','I23','I22',()=>contains(parsed[5].value?.baseline,parsed[4].value)],
  ['I24 includes I23','I24','I23',()=>contains(parsed[6].value?.source,parsed[5].value)]
 ];
 let conflicting=0;
 for(const [relation,from,to,fn] of pairs){
  const a=STAGES.indexOf(from),b=STAGES.indexOf(to);
  if(evidence[a].state!=='internally-verified'||evidence[b].state!=='internally-verified'){
   links.push({from,to,relation,state:'not-evaluable',
    externalOriginProven:false});continue;
  }
  const l=link(relation,from,to,fn());links.push(l);
  if(l.state==='divergent'){conflicting++;findings.push('cross-stage-divergence-'+from+'-'+to);}
 }
 if(invalid)findings.push('invalid-stage-files-retained');
 if(missing)findings.push('missing-stages-retained-as-null');
 if(untrustedPinMismatch)findings.push('provided-pins-do-not-match-imported-utf8');
 findings.push('no-independent-originals-or-human-custodians-verified');
 const classification=invalid?'quarantine-invalid-stages':
  untrustedPinMismatch?'quarantine-untrusted-pin-mismatch':
  conflicting?'quarantine-cross-stage-disagreement':
  missing?'hold-incomplete-stage-chain':
  different?'hold-serialization-ambiguity':
  'hold-internal-consistency-only';
 return{evidence,evidenceRoot:await hash(evidence),links,findings,classification};
}
function unsigned(p){const {digest,...q}=p;return q}
function core(p,n,stage,previousHash){
 return{format:EVENT,version:1,evidenceRoot:p.evidenceRoot,
  classification:p.classification,sequence:n+1,stage,previousHash};
}
async function trace(p,status){
 let prev=ZERO,events=[];
 const stages=status==='review-note-recorded-not-sent'?
  ['audit-held','outside-review-noted-only']:['audit-held'];
 for(let i=0;i<stages.length;i++){
  const e=core(p,i,stages[i],prev),digest=await traceHash(e);
  events.push({...e,hash:digest});prev=digest;
 }
 return{...p,status,events,latestEventHash:prev};
}
async function prepare(sources=[null,null,null,null,null,null,null],
 claimedPins=[null,null,null,null,null,null,null]){
 const x=await inspect(sources,claimedPins);
 const p={format:FORMAT,version:1,sources,claimedPins,...x,
  authority:'none',operationalApproval:false,externalCustodyProven:false,
  humanIdentityProven:false,priorPinAuthenticityProven:false,
  timestampProven:false,immutabilityProven:false,
  jointReplacementExcluded:false,outsideReviewContacted:false,
  reRootAuthorized:false,noWrites:true,containsScores:false};
 const t=await trace(p,'audit-held');
 return Object.freeze({...t,digest:await hash(t)});
}
/* I28 LAB fast path: ONLY newly constructed in-memory dossiers. It runs the
 * exact same inspect() as prepare(), once instead of prepare() + verify() twice.
 * Snapshot arrays prevent async mutation of caller-owned slots/claims.
 * Retained I25.verify() remains mandatory for all subsequently received,
 * imported, mutated or externally supplied packets. Never external authority.
 */
async function prepareCheckedOnce(sources=[null,null,null,null,null,null,null],
 claimedPins=[null,null,null,null,null,null,null]){
 if(!Array.isArray(sources)||!Array.isArray(claimedPins))
  throw Error('I28: seven raw and SHA slots required');
 const stable=Object.freeze(sources.slice()),pins=Object.freeze(claimedPins.slice());
 const x=await inspect(stable,pins);
 const p={format:FORMAT,version:1,sources:stable,claimedPins:pins,...x,
  authority:'none',operationalApproval:false,externalCustodyProven:false,
  humanIdentityProven:false,priorPinAuthenticityProven:false,
  timestampProven:false,immutabilityProven:false,
  jointReplacementExcluded:false,outsideReviewContacted:false,
  reRootAuthorized:false,noWrites:true,containsScores:false};
 const t=await trace(p,'audit-held');
 const packet=Object.freeze({...t,digest:await hash(t)});
 return Object.freeze({packet,
  constructedFromFreshSnapshot:true,
  stageInspectionPasses:1,
  externalIndependentReverificationPerformed:false,
  internallyVerifiedStages:x.evidence.filter(e=>e.state==='internally-verified').length,
  noWrites:true,externalCustodyProven:false,operationalApproval:false});
}
async function verify(packet,expectedDigest=null){
 if(!exact(packet,KEYS)||packet.format!==FORMAT||packet.version!==1||
  !SHA.test(packet.evidenceRoot||'')||!SHA.test(packet.latestEventHash||'')||
  !SHA.test(packet.digest||'')||
  (expectedDigest!==null&&!SHA.test(expectedDigest||''))||
  !['audit-held','review-note-recorded-not-sent'].includes(packet.status)||
  packet.authority!=='none'||packet.operationalApproval!==false||
  ['externalCustodyProven','humanIdentityProven','priorPinAuthenticityProven',
   'timestampProven','immutabilityProven','jointReplacementExcluded',
   'outsideReviewContacted','reRootAuthorized','containsScores']
   .some(k=>packet[k]!==false)||packet.noWrites!==true)
  throw Error('I25: dossier schema or false authority');
 const x=await inspect(packet.sources,packet.claimedPins);
 if(!same(x,{evidence:packet.evidence,evidenceRoot:packet.evidenceRoot,
   links:packet.links,findings:packet.findings,
   classification:packet.classification}))
  throw Error('I25: originals, stage links or findings altered');
 const t=await trace({...unsigned(packet),events:undefined,
  latestEventHash:undefined},packet.status);
 if(!same(t.events,packet.events)||t.latestEventHash!==packet.latestEventHash)
  throw Error('I25: event trace altered');
 if(await hash(unsigned(packet))!==packet.digest)
  throw Error('I25: internal envelope digest altered');
 if(expectedDigest!==null&&expectedDigest!==packet.digest)
  throw Error('I25: separately supplied envelope SHA mismatch');
 return Object.freeze({integrityChecked:true,classification:packet.classification,
  internallyVerifiedStages:packet.evidence.filter(x=>x.state==='internally-verified').length,
  missingStages:packet.evidence.filter(x=>x.state==='missing').length,
  divergingLinks:packet.links.filter(x=>x.state==='divergent').length,
  normalizationWarnings:packet.evidence.filter(x=>x.normalizationObserved).length,
  rawTextPreserved:true,byteForByteOriginalExternalProvenanceProven:false,
  externalCustodyProven:false,operationalApproval:false,
  jointReplacementExcluded:false,noWrites:true,
  userProvidedDigestCompared:expectedDigest!==null,status:packet.status});
}
async function noteReview(packet){
 await verify(packet);
 if(packet.status!=='audit-held')throw Error('I25: external review already noted');
 const p=await trace({...unsigned(packet),events:undefined,
  latestEventHash:undefined},'review-note-recorded-not-sent');
 return Object.freeze({...p,digest:await hash(p)});
}
root.MiBowlingI25RetentionAudit=Object.freeze({FORMAT,EVENT,STAGES,ZERO,
 MAX_FILE_BYTES,MAX_TOTAL_BYTES,prepare,prepareCheckedOnce,verify,noteReview,checkSizes});
})(window);
