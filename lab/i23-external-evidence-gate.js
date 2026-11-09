/* MI BOWLING · LAB I23 · independent-proof requirements, NO trusted issuance.
 * A/B/C are unverified logical file slots, NOT actual custodians.
 * Cryptographic equality proves internal consistency only. A coerced/replaced
 * packet AND its hash can appear self-consistent. No real external anchor,
 * signing, WORM, timestamp, identity, network, account or operational write.
 */
(function(root){
'use strict';
const I22=root.MiBowlingI22Uncertainty,M=root.MiBowlingI12Manifest;
if(!I22||!M||!root.crypto?.subtle)throw Error('I23: I12/I22 and WebCrypto required');
const FORMAT='MI-BOWLING-I23-LAB-INDEPENDENT-EVIDENCE-GATE';
const RECEIPT='MI-BOWLING-I23-LAB-UNVERIFIED-REFERENCE';
const EVENT='MI-BOWLING-I23-LAB-CUSTODY-HOLD-TRACE';
const ZERO='0'.repeat(64),SHA=/^[a-f0-9]{64}$/;
const SLOTS=['A','B','C'],ORIGINS=['self-export','claimed-offline','unknown'];
const REQUIREMENTS=[
 ['prior-independent-root','A prior digest retained independently of every submitted packet'],
 ['real-custodian-identity','Independent custodian identity and control verified outside this LAB'],
 ['preincident-retention','Evidence of authentic preincident retention, not a file assertion'],
 ['secure-time-anchor','A verified external time source, not an untrusted date field'],
 ['immutability-proof','Independently established physical/WORM retention and nonreplacement'],
 ['explicit-authority','Independent human approval under a real, separate authority policy']
];
const KEYS=['format','version','baseline','baselinePin','records','evidence',
 'evidenceRoot','findings','classification','requirements','recommendation',
 'status','events','latestEventHash','authority','operationalApproval',
 'independentOriginProven','originalPinAuthenticityProven','humanIdentityProven',
 'custodiansIndependentProven','preincidentRetentionProven','timeProven',
 'immutabilityProven','jointReplacementExcluded','reRootAuthorized',
 'outsideReviewContacted','noWrites','containsScores','digest'];
const exact=(o,k)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join(',')===k.slice().sort().join(',');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=x=>M.hashText(JSON.stringify(x));
const eventHash=x=>M.hashText('MI-BOWLING-I23-CUSTODY-GATE-v1|'+JSON.stringify(x));
function checkJSON(data){
 let n=0;const pending=[data],seen=new Set();
 while(pending.length){
  const v=pending.pop();if(++n>170000)throw Error('I23: evidencia excesivamente compleja');
  if(v&&typeof v==='object'){
   if(seen.has(v))throw Error('I23: referencia de objeto reutilizada o circular');
   seen.add(v);
   if(Object.prototype.toString.call(v)!=='[object Object]'&&!Array.isArray(v))
    throw Error('I23: documento no JSON');
   for(const [k,x] of Object.entries(v)){
    if(/(?:private.?key|password|passphrase|secret|credential|api.?key|access.?token|mnemonic|seed)/i.test(k))
     throw Error('I23: clave o secreto rechazado');
    if(x&&typeof x==='object')pending.push(x);
    else if(x===undefined||typeof x==='function'||typeof x==='symbol'||
      typeof x==='bigint'||(typeof x==='number'&&!Number.isFinite(x)))
     throw Error('I23: archivo no serializable');
   }
  }
 }
}
function requirements(){
 return REQUIREMENTS.map(([code,needed])=>({
  code,status:'not-verifiable-in-lab',satisfied:false,needed
 }));
}
function recommendation(kind){
 if(kind==='quarantine-invalid-claim')
  return 'Retener copias dañadas y sus referencias: no rehabilitar una declaración inválida';
 if(kind==='quarantine-cross-case')
  return 'Retener expedientes de otros casos sin asumir su autoridad ni identidad';
 if(kind==='quarantine-competing-versions')
  return 'Preservar todas las versiones en conflicto; nunca decidir por mayoría';
 if(kind==='hold-correlated-reference-claims')
  return 'Copias, etiquetas o grupos de retención coincidentes no demuestran independencia';
 if(kind==='hold-no-reference')
  return 'No existen materiales que permitan contrastar una referencia previa';
 return 'Hay coincidencia aritmética, pero no se demuestran procedencia ni conservación externa';
}
async function inspect(baseline,baselinePin,records){
 if(!Array.isArray(records)||records.length!==3||
  (baselinePin!==null&&!SHA.test(baselinePin||'')))
  throw Error('I23: tres posiciones y SHA previo opcional requeridos');
 await I22.verify(baseline,baselinePin);
 checkJSON(records);
 if(JSON.stringify(records).length>40*1024*1024)
  throw Error('I23: excedido límite de archivos locales');
 const evidence=[],valid=[],findings=[];
 let invalid=0,missing=0,foreign=0;
 for(let i=0;i<3;i++){
  const slot=SLOTS[i],r=records[i];
  let state='missing',origin='unknown',group=null,declared=null,
   packetDigest=null,subjectMatch='not-observed',claimedBefore=false,alias=null;
  if(r===null)missing++;
  else if(!exact(r,['slot','packet','claim'])||r.slot!==slot||!r.packet||
   !exact(r.claim,['format','version','slot','packetDigest','origin',
    'retentionGroup','preIncidentClaimed','reviewerAlias'])||
   r.claim.format!==RECEIPT||r.claim.version!==1||
   r.claim.slot!==slot||!SHA.test(r.claim.packetDigest||'')||
   !ORIGINS.includes(r.claim.origin)||
   typeof r.claim.retentionGroup!=='string'||
   !/^[a-z0-9-]{1,32}$/.test(r.claim.retentionGroup)||
   typeof r.claim.preIncidentClaimed!=='boolean'||
   !SLOTS.includes(r.claim.reviewerAlias)){
   invalid++;state='invalid-structure';
  }else{
   origin=r.claim.origin;group=r.claim.retentionGroup;
   declared=r.claim.packetDigest;claimedBefore=r.claim.preIncidentClaimed;
   alias=r.claim.reviewerAlias;
   try{
    await I22.verify(r.packet);
    packetDigest=r.packet.digest;
    subjectMatch=r.packet.source.digest===baseline.source.digest?
     'same-source-digest':'different-source-digest';
    if(packetDigest!==declared){invalid++;state='mismatched-reference'}
    else {
     state='internally-matching';
     if(subjectMatch==='different-source-digest')foreign++;
     valid.push({slot,packetDigest,group,alias,subjectMatch});
    }
   }catch(_){invalid++;state='invalid-packet'}
  }
  evidence.push({slot,present:r!==null,sourceHash:r===null?ZERO:await hash(r),
   state,originClaim:origin,retentionGroupClaim:group,packetDigest,
   declaredDigest:declared,preIncidentClaimed:claimedBefore,
   reviewerAlias:alias,subjectMatch,physicalRetentionVerified:false,
   independentReferenceVerified:false});
 }
 let competing=false,correlated=false;
 for(let i=0;i<valid.length;i++)for(let j=i+1;j<valid.length;j++){
  const a=valid[i],b=valid[j],suffix=a.slot+'-'+b.slot;
  if(a.packetDigest!==b.packetDigest){
   competing=true;findings.push('competing-document-versions-'+suffix);
  }else{
   correlated=true;findings.push('identical-document-copies-'+suffix);
  }
  if(a.group===b.group){
   correlated=true;findings.push('same-declared-retention-group-'+suffix);
  }
  if(a.alias===b.alias){
   correlated=true;findings.push('same-logical-alias-'+suffix);
  }
 }
 if(valid.some(x=>x.subjectMatch==='different-source-digest'))
  findings.push('cross-subject-packet-without-trusted-bridge');
 if(invalid)findings.push('invalid-or-mismatched-references-retained');
 if(missing)findings.push('missing-untrusted-file-slots');
 if(valid.some(x=>x.group))findings.push('retention-group-labels-are-self-asserted');
 findings.push('no-authenticated-human-or-preincident-custody-available');
 let classification;
 if(invalid)classification='quarantine-invalid-claim';
 else if(foreign)classification='quarantine-cross-case';
 else if(competing)classification='quarantine-competing-versions';
 else if(correlated)classification='hold-correlated-reference-claims';
 else if(!valid.length)classification='hold-no-reference';
 else classification='hold-matching-without-independent-proof';
 return {evidence,evidenceRoot:await hash(evidence),findings,classification,
  requirements:requirements(),recommendation:recommendation(classification)};
}
function unsigned(p){const {digest,...rest}=p;return rest}
function core(p,number,stage,prev){
 return {format:EVENT,version:1,sourceDigest:p.baseline.digest,
  evidenceRoot:p.evidenceRoot,classification:p.classification,
  sequence:number,stage,previousHash:prev};
}
async function trace(p,status){
 const stages=status==='manual-outside-review-recorded-not-sent'?
  ['hold-for-independent-evidence','manual-outside-review-only']:
  ['hold-for-independent-evidence'];
 let events=[],previous=ZERO;
 for(let i=0;i<stages.length;i++){
  const e=core(p,i+1,stages[i],previous);
  const digest=await eventHash(e);
  events.push({...e,hash:digest});previous=digest;
 }
 return {...p,status,events,latestEventHash:previous};
}
async function prepare(baseline,baselinePin=null,records=[null,null,null]){
 const x=await inspect(baseline,baselinePin,records);
 const p={format:FORMAT,version:1,baseline,baselinePin,records,...x,
  authority:'none',operationalApproval:false,
  independentOriginProven:false,originalPinAuthenticityProven:false,
  humanIdentityProven:false,custodiansIndependentProven:false,
  preincidentRetentionProven:false,timeProven:false,immutabilityProven:false,
  jointReplacementExcluded:false,reRootAuthorized:false,
  outsideReviewContacted:false,noWrites:true,containsScores:false};
 const out=await trace(p,'hold-unverified-external-custody');
 return Object.freeze({...out,digest:await hash(out)});
}
async function verify(packet,expectedDigest=null){
 if(!exact(packet,KEYS)||packet.format!==FORMAT||packet.version!==1||
  !SHA.test(packet.evidenceRoot||'')||!SHA.test(packet.digest||'')||
  !SHA.test(packet.latestEventHash||'')||
  (expectedDigest!==null&&!SHA.test(expectedDigest||''))||
  !['hold-unverified-external-custody','manual-outside-review-recorded-not-sent'].includes(packet.status)||
  packet.authority!=='none'||packet.operationalApproval!==false||
  ['independentOriginProven','originalPinAuthenticityProven',
   'humanIdentityProven','custodiansIndependentProven','preincidentRetentionProven',
   'timeProven','immutabilityProven','jointReplacementExcluded','reRootAuthorized',
   'outsideReviewContacted','containsScores'].some(k=>packet[k]!==false)||
  packet.noWrites!==true)
  throw Error('I23: formato, prueba de custodia o autorización falsificada');
 const x=await inspect(packet.baseline,packet.baselinePin,packet.records);
 if(!same(x,{evidence:packet.evidence,evidenceRoot:packet.evidenceRoot,
  findings:packet.findings,classification:packet.classification,
  requirements:packet.requirements,recommendation:packet.recommendation}))
  throw Error('I23: registro, requisitos o fuentes alterados');
 const t=await trace({...unsigned(packet),events:undefined,
  latestEventHash:undefined},packet.status);
 if(!same(t.events,packet.events)||t.latestEventHash!==packet.latestEventHash)
  throw Error('I23: traza de custodia alterada');
 if(await hash(unsigned(packet))!==packet.digest)
  throw Error('I23: huella interna de dossier alterada');
 if(expectedDigest!==null&&expectedDigest!==packet.digest)
  throw Error('I23: PIN externo del dossier incompatible');
 return Object.freeze({integrityChecked:true,classification:packet.classification,
  validLogicalClaims:packet.evidence.filter(x=>x.state==='internally-matching').length,
  missingLogicalClaims:packet.evidence.filter(x=>!x.present).length,
  satisfiedExternalRequirements:0,
  externalDigestMatched:expectedDigest!==null,
  authority:'none',operationalApproval:false,independentCustodyProven:false,
  timestampProven:false,priorRetentionProven:false,unmodifiedHistoryProven:false,
  jointReplacementExcluded:false,noWrites:true,status:packet.status});
}
async function noteExternalReview(packet){
 await verify(packet);
 if(packet.status!=='hold-unverified-external-custody')
  throw Error('I23: revisión externa ya anotada, no duplicar');
 const out=await trace({...unsigned(packet),events:undefined,
  latestEventHash:undefined},'manual-outside-review-recorded-not-sent');
 return Object.freeze({...out,digest:await hash(out)});
}
root.MiBowlingI23ExternalEvidence=Object.freeze({FORMAT,RECEIPT,EVENT,ZERO,
 prepare,verify,noteExternalReview});
})(window);
