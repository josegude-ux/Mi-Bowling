/* MI BOWLING · LAB I24 · six-axis manual cross-check, no external trust issuance.
 * A/B/C are unverified logical positions, NOT persons or independent custodians.
 * Claims, SHA references and the whole dossier can be replaced together.
 */
(function(root){
'use strict';
const I23=root.MiBowlingI23ExternalEvidence,M=root.MiBowlingI12Manifest;
if(!I23||!M||!root.crypto?.subtle)throw Error('I24: missing I12/I23/WebCrypto');
const FORMAT='MI-BOWLING-I24-LAB-MANUAL-CROSSCHECK-HOLD';
const EVENT='MI-BOWLING-I24-LAB-CROSSCHECK-EVENT';
const ZERO='0'.repeat(64),SHA=/^[a-f0-9]{64}$/,SLOTS=['A','B','C'];
const VERDICTS=['claimed-match','claimed-conflict','unresolved'];
const ORIGINS=['same-document','claimed-independent','unknown'];
const AXES=[
 ['prior-independent-root','Compare historical root with independently retained original'],
 ['real-custodian-identity','Identify real custodian and independently verify control'],
 ['preincident-retention','Verify authentic retention before incident by external means'],
 ['secure-time-anchor','Authenticate external trusted timestamp and document binding'],
 ['immutability-proof','Examine actual physical/WORM retention and resistance to replacement'],
 ['explicit-authority','Obtain truly independent human authorization under external policy']
];
const KEYS=['format','version','source','sourcePin','sheets','evidence','evidenceRoot',
 'classification','requirements','findings','status','events','latestEventHash',
 'authority','operationalApproval','independentCustodyProven','identityProven',
 'preincidentRetentionProven','trustedTimeProven','immutabilityProven',
 'externalApprovalProven','jointReplacementExcluded','outsideReviewContacted',
 'reRootAuthorized','noWrites','containsScores','digest'];
const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join(',')===keys.slice().sort().join(',');
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),hash=x=>M.hashText(JSON.stringify(x));
const eventHash=x=>M.hashText('MI-BOWLING-I24-MANUAL-CROSSCHECK-v1|'+JSON.stringify(x));
function safeJSON(x){
 const work=[x],seen=new Set();let n=0;
 while(work.length){
  const v=work.pop();if(++n>160000)throw Error('I24: evidence too complex');
  if(v&&typeof v==='object'){
   if(seen.has(v))throw Error('I24: circular or reused object');
   seen.add(v);
   if(Object.prototype.toString.call(v)!=='[object Object]'&&!Array.isArray(v))
    throw Error('I24: invalid JSON');
   for(const [k,y] of Object.entries(v)){
    if(/(?:private.?key|password|passphrase|secret|credential|api.?key|access.?token|mnemonic|seed)/i.test(k))
     throw Error('I24: secret rejected');
    if(y&&typeof y==='object')work.push(y);
    else if(y===undefined||typeof y==='function'||typeof y==='symbol'||
     typeof y==='bigint'||(typeof y==='number'&&!Number.isFinite(y)))
     throw Error('I24: not serializable');
   }
  }
 }
}
function emptySheets(){return AXES.map(([code])=>({code,claims:[null,null,null]}))}
function diagnosis(entries){
 const c=entries.filter(x=>x.state==='untrusted-declaration'),
  yes=c.some(x=>x.verdict==='claimed-match'),
  no=c.some(x=>x.verdict==='claimed-conflict');
 if(entries.some(x=>x.state==='invalid-claim'))return 'quarantine-invalid-statement';
 if(yes&&no)return 'quarantine-disputed-reports';
 if(yes)return 'hold-self-asserted-only';
 if(no)return 'hold-conflict-claimed';
 return 'hold-insufficient-reports';
}
async function analyze(source,sourcePin,sheets){
 await I23.verify(source,sourcePin);
 if(!Array.isArray(sheets)||sheets.length!==6)
  throw Error('I24: six requirements with three A/B/C positions required');
 safeJSON(sheets);
 if(JSON.stringify(sheets).length>15*1024*1024)
  throw Error('I24: too many statements');
 const evidence=[],requirements=[],findings=[];let invalid=0,disputed=0,positive=0;
 for(let i=0;i<6;i++){
  const code=AXES[i][0],item=sheets[i],entries=[];
  if(!item||!exact(item,['code','claims'])||item.code!==code||
   !Array.isArray(item.claims)||item.claims.length!==3)
   throw Error('I24: requirement order or structure invalid: '+code);
  for(let j=0;j<3;j++){
   const c=item.claims[j],slot=SLOTS[j];
   let state='absent',verdict=null,reference=null,origin=null;
   if(c!==null){
    if(!exact(c,['slot','verdict','referenceDigest','origin'])||c.slot!==slot||
     !VERDICTS.includes(c.verdict)||!ORIGINS.includes(c.origin)||
     (c.referenceDigest!==null&&!SHA.test(c.referenceDigest||''))){
     state='invalid-claim';invalid++;
    }else{
     state='untrusted-declaration';verdict=c.verdict;
     reference=c.referenceDigest;origin=c.origin;
    }
   }
   entries.push({slot,state,verdict,referenceDigest:reference,originClaim:origin,
    originalDigest:c===null?ZERO:await hash(c),
    independentSourceVerified:false,humanVerified:false,
    timestampVerified:false,physicalRetentionVerified:false});
  }
  const d=diagnosis(entries);
  if(d==='quarantine-disputed-reports')disputed++;
  if(d==='hold-self-asserted-only')positive++;
  const matching=entries.filter(x=>x.state==='untrusted-declaration'&&
   x.verdict==='claimed-match'&&x.referenceDigest!==null);
  for(let j=0;j<matching.length;j++)for(let k=j+1;k<matching.length;k++)
   if(matching[j].referenceDigest===matching[k].referenceDigest)
    findings.push('correlated-unverified-sha-'+code+'-'+matching[j].slot+'-'+matching[k].slot);
  if(d==='quarantine-disputed-reports')findings.push('contradictory-claims-'+code);
  if(d==='quarantine-invalid-statement')findings.push('invalid-statement-retained-'+code);
  evidence.push({code,entries,diagnosis:d,sourceSheetDigest:await hash(item)});
  requirements.push({code,needed:AXES[i][1],diagnosis:d,
   satisfied:false,status:'not-verified-outside-lab',humanOrPhysicalProof:false});
 }
 if(disputed)findings.push('require-genuine-independent-adjudication');
 if(positive)findings.push('alleged-matches-are-not-custody-proof');
 findings.push('all-six-requirements-unproven');
 const classification=invalid?'quarantine-invalid-claims':
  disputed?'quarantine-manual-disagreement':
  positive?'hold-positive-claims-unverified':'hold-no-independent-proof';
 return{evidence,evidenceRoot:await hash(evidence),
  requirements,findings,classification};
}
function unsigned(p){const {digest,...rest}=p;return rest}
function core(p,i,stage,previousHash){
 return{format:EVENT,version:1,sourceDigest:p.source.digest,
  evidenceRoot:p.evidenceRoot,classification:p.classification,
  sequence:i+1,stage,previousHash};
}
async function trace(p,status){
 const stages=status==='outside-review-noted-not-sent'?
  ['six-axis-assessment-held','outside-review-noted-only']:['six-axis-assessment-held'];
 let events=[],prev=ZERO;
 for(let i=0;i<stages.length;i++){
  const e=core(p,i,stages[i],prev),h=await eventHash(e);
  events.push({...e,hash:h});prev=h;
 }
 return{...p,status,events,latestEventHash:prev};
}
async function prepare(source,sourcePin=null,sheets=emptySheets()){
 const d=await analyze(source,sourcePin,sheets);
 const p={format:FORMAT,version:1,source,sourcePin,sheets,...d,
  authority:'none',operationalApproval:false,
  independentCustodyProven:false,identityProven:false,
  preincidentRetentionProven:false,trustedTimeProven:false,
  immutabilityProven:false,externalApprovalProven:false,
  jointReplacementExcluded:false,outsideReviewContacted:false,
  reRootAuthorized:false,noWrites:true,containsScores:false};
 const t=await trace(p,'manual-assessment-held');
 return Object.freeze({...t,digest:await hash(t)});
}
async function verify(packet,expectedDigest=null){
 if(!exact(packet,KEYS)||packet.format!==FORMAT||packet.version!==1||
  !SHA.test(packet.evidenceRoot||'')||!SHA.test(packet.latestEventHash||'')||
  !SHA.test(packet.digest||'')||
  (expectedDigest!==null&&!SHA.test(expectedDigest||''))||
  !['manual-assessment-held','outside-review-noted-not-sent'].includes(packet.status)||
  packet.authority!=='none'||packet.operationalApproval!==false||
  ['independentCustodyProven','identityProven','preincidentRetentionProven',
   'trustedTimeProven','immutabilityProven','externalApprovalProven',
   'jointReplacementExcluded','outsideReviewContacted','reRootAuthorized',
   'containsScores'].some(k=>packet[k]!==false)||packet.noWrites!==true)
  throw Error('I24: tampered format or false authority');
 const e=await analyze(packet.source,packet.sourcePin,packet.sheets);
 if(!eq(e,{evidence:packet.evidence,evidenceRoot:packet.evidenceRoot,
   requirements:packet.requirements,findings:packet.findings,
   classification:packet.classification}))
  throw Error('I24: sources or matrix substituted');
 const t=await trace({...unsigned(packet),events:undefined,
  latestEventHash:undefined},packet.status);
 if(!eq(t.events,packet.events)||t.latestEventHash!==packet.latestEventHash)
  throw Error('I24: audit trace altered');
 if(await hash(unsigned(packet))!==packet.digest)throw Error('I24: envelope digest altered');
 if(expectedDigest!==null&&expectedDigest!==packet.digest)
  throw Error('I24: supplied separate SHA mismatch');
 return Object.freeze({integrityChecked:true,classification:packet.classification,
  heldRequirements:6,verifiedExternalRequirements:0,
  declaredClaims:packet.evidence.reduce((sum,e)=>sum+
   e.entries.filter(x=>x.state==='untrusted-declaration').length,0),
  externalDigestMatched:expectedDigest!==null,
  operationalApproval:false,independentCustodyProven:false,
  externalAuthorityProven:false,outsideReviewContacted:false,
  jointReplacementExcluded:false,noWrites:true,status:packet.status});
}
async function noteOutsideReview(p){
 await verify(p);
 if(p.status!=='manual-assessment-held')
  throw Error('I24: external review already noted, no duplicates');
 const t=await trace({...unsigned(p),events:undefined,latestEventHash:undefined},
  'outside-review-noted-not-sent');
 return Object.freeze({...t,digest:await hash(t)});
}
root.MiBowlingI24ManualCrosscheck=Object.freeze({FORMAT,EVENT,ZERO,
 REQUIREMENTS:AXES.map(x=>x[0]),emptySheets,prepare,verify,noteOutsideReview});
})(window);
