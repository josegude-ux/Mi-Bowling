/* MI BOWLING · LAB I19 · human-labelled review trail, READ-ONLY.
 * Logical A/B/C review aliases are not verified humans or custodians.
 * Hashes prove only internal consistency (external PIN optional and user-supplied).
 * No signature, clock, network, key, escrow, account, publication or authority.
 */
(function(root){
'use strict';
const H=root.MiBowlingI18ForensicHold,M=root.MiBowlingI12Manifest;
if(!H||!M||!root.crypto?.subtle)throw Error('I19: I12/I18 and WebCrypto required');
const FORMAT='MI-BOWLING-I19-LAB-HUMAN-REVIEW-HOLD';
const ENTRY='MI-BOWLING-I19-LAB-REVIEW-EVENT';
const ZERO='0'.repeat(64),SHA=/^[a-f0-9]{64}$/;
const REVIEWERS=['A','B','C'];
const ASSESSMENTS=['integrity-only','disputed-evidence','missing-originals','requires-independent-review'];
const BASES=['i18-internal-hashes','signed-branch-comparison',
 'external-anchor-absent','external-provenance-unverified'];
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join(',')===keys.slice().sort().join(',');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=x=>M.hashText(JSON.stringify(x));
const eventHash=e=>M.hashText('MI-BOWLING-I19-REVIEW-EVENT-v1|'+JSON.stringify(e));
const REASON={
 'quarantine-conflicting-evidence':'unresolved-signed-fork',
 'blocked-total-trust-loss':'missing-original-I15-trust',
 'blocked-external-reference-loss':'missing-original-I16-anchors',
 'blocked-insufficient-copies':'insufficient-evidence',
 'blocked-insufficient-current':'insufficient-evidence',
 'blocked-latest-unrepresented':'unrepresented-high-watermark',
 'blocked-invalid-evidence':'invalid-cryptographic-evidence',
 'conditionally-consistent':'independent-trust-review-required'
};
function reasonFor(decision){return REASON[decision]||'unresolved-evidence'}
function eventCore(caseFile,sequence,stage,reviewer,assessment,basis,previousHash){
 return {format:ENTRY,version:1,owner:caseFile.owner,caseId:caseFile.caseId,
  dossierDigest:caseFile.dossierDigest,sequence,stage,reviewer,assessment,
  basis,previousHash};
}
function payload(log){
 return {format:log.format,version:log.version,owner:log.owner,
  caseId:log.caseId,dossierDigest:log.dossierDigest,externalDigest:log.externalDigest,
  sourceDecision:log.sourceDecision,status:log.status,events:log.events,
  latestHash:log.latestHash,authority:log.authority,
  operationalApproval:log.operationalApproval,
  externalCustodyProven:log.externalCustodyProven,
  reviewerIdentityProven:log.reviewerIdentityProven,
  independentReviewersProven:log.independentReviewersProven,
  signedHumanConsentProven:log.signedHumanConsentProven,
  timestampProven:log.timestampProven,immutableStorageProven:log.immutableStorageProven,
  irreversibleEscalationAuthorized:log.irreversibleEscalationAuthorized,
  noWrites:log.noWrites,containsScores:log.containsScores};
}
async function pack(log){
 return Object.freeze({...log,reviewDigest:await hash(payload(log))});
}
async function prepare(dossier,externalDigest=null){
 const v=await H.verify(dossier,externalDigest);
 if(!v.integrityChecked)throw Error('I19: expediente I18 no verificable');
 return pack({format:FORMAT,version:1,owner:dossier.owner,caseId:dossier.caseId,
  dossierDigest:dossier.dossierDigest,externalDigest,
  sourceDecision:dossier.decision,status:'review-open',
  events:[],latestHash:ZERO,authority:'none',operationalApproval:false,
  externalCustodyProven:false,reviewerIdentityProven:false,
  independentReviewersProven:false,signedHumanConsentProven:false,
  timestampProven:false,immutableStorageProven:false,
  irreversibleEscalationAuthorized:false,noWrites:true,containsScores:false});
}
async function verify(log,dossier,externalDigest=null){
 const v=await H.verify(dossier,externalDigest);
 if(!exact(log,[...Object.keys(payload({
  format:0,version:0,owner:0,caseId:0,dossierDigest:0,externalDigest:0,
  sourceDecision:0,status:0,events:0,latestHash:0,authority:0,
  operationalApproval:0,externalCustodyProven:0,reviewerIdentityProven:0,
  independentReviewersProven:0,signedHumanConsentProven:0,
  timestampProven:0,immutableStorageProven:0,irreversibleEscalationAuthorized:0,
  noWrites:0,containsScores:0
 })),'reviewDigest'])||log.format!==FORMAT||log.version!==1||
  !uuid.test(log.owner||'')||log.owner!==dossier.owner||
  log.caseId!==dossier.caseId||log.dossierDigest!==dossier.dossierDigest||
  log.externalDigest!==externalDigest||log.sourceDecision!==dossier.decision||
  !['review-open','escalated-unresolved'].includes(log.status)||
  log.authority!=='none'||log.operationalApproval!==false||
  log.externalCustodyProven!==false||log.reviewerIdentityProven!==false||
  log.independentReviewersProven!==false||
  log.signedHumanConsentProven!==false||log.timestampProven!==false||
  log.immutableStorageProven!==false||
  log.irreversibleEscalationAuthorized!==false||
  log.noWrites!==true||log.containsScores!==false||
  !Array.isArray(log.events)||log.events.length>4||
  !SHA.test(log.latestHash||'')||!SHA.test(log.reviewDigest||''))
  throw Error('I19: esquema de revisión inválido o confianza no autorizada');
 let prev=ZERO,people=new Set(),closed=false;
 for(let i=0;i<log.events.length;i++){
  const e=log.events[i],last=i===log.events.length-1;
  if(!exact(e,['format','version','owner','caseId','dossierDigest',
    'sequence','stage','reviewer','assessment','basis','previousHash','hash']))
   throw Error('I19: evento no canónico');
  let core;
  if(e.stage==='manual-review'){
   if(closed||!REVIEWERS.includes(e.reviewer)||people.has(e.reviewer)||
    !ASSESSMENTS.includes(e.assessment)||!BASES.includes(e.basis))
    throw Error('I19: alias de revisión repetido o valoración no permitida');
   people.add(e.reviewer);
   core=eventCore(dossier,i+1,'manual-review',e.reviewer,e.assessment,e.basis,prev);
  }else if(e.stage==='manual-escalation'){
   if(closed||!last||people.size<2)
    throw Error('I19: escalada inválida o sin dos revisiones lógicas');
   closed=true;
   core=eventCore(dossier,i+1,'manual-escalation','none',
    reasonFor(dossier.decision),'outside-authority-required',prev);
  }else throw Error('I19: etapa no permitida');
  if(!same(core,{format:e.format,version:e.version,owner:e.owner,
    caseId:e.caseId,dossierDigest:e.dossierDigest,sequence:e.sequence,
    stage:e.stage,reviewer:e.reviewer,assessment:e.assessment,
    basis:e.basis,previousHash:e.previousHash})||
    await eventHash(core)!==e.hash)
   throw Error('I19: TRAZA alterada, reemplazada o reordenada');
  prev=e.hash;
 }
 if(log.latestHash!==prev||
    (closed&&log.status!=='escalated-unresolved')||
    (!closed&&log.status!=='review-open')||
    (await hash(payload(log)))!==log.reviewDigest)
  throw Error('I19: integridad del registro o estado de bloqueo alterado');
 return Object.freeze({integrityChecked:true,sourceIntegrityChecked:v.integrityChecked,
  reviewerLabels:people.size,steps:log.events.length,status:log.status,
  sourceDecision:dossier.decision,externalDigestMatched:v.externalDigestMatched,
  operationalApproval:false,authority:'none',physicalCustodyProven:false,
  independentHumansProven:false,timeProven:false,immutabilityProven:false,
  noWrites:true});
}
async function record(log,dossier,externalDigest,reviewer,assessment,basis){
 await verify(log,dossier,externalDigest);
 if(log.status!=='review-open'||log.events.length>=3||
   !REVIEWERS.includes(reviewer)||!ASSESSMENTS.includes(assessment)||
   !BASES.includes(basis))
  throw Error('I19: revisión cerrada o etiqueta/valoración no autorizada');
 if(log.events.some(e=>e.reviewer===reviewer))
  throw Error('I19: alias de revisión repetido; no implica dos humanos distintos');
 const core=eventCore(dossier,log.events.length+1,'manual-review',
  reviewer,assessment,basis,log.latestHash);
 const e={...core,hash:await eventHash(core)};
 return pack({...payload(log),events:[...log.events,e],latestHash:e.hash});
}
async function escalate(log,dossier,externalDigest=null){
 const v=await verify(log,dossier,externalDigest);
 if(log.status!=='review-open'||v.reviewerLabels<2)
  throw Error('I19: faltan dos revisiones lógicas; no se concede autoridad');
 const core=eventCore(dossier,log.events.length+1,'manual-escalation',
  'none',reasonFor(dossier.decision),'outside-authority-required',log.latestHash);
 const e={...core,hash:await eventHash(core)};
 return pack({...payload(log),status:'escalated-unresolved',
  events:[...log.events,e],latestHash:e.hash});
}
root.MiBowlingI19ManualReview=Object.freeze({FORMAT,ENTRY,ZERO,prepare,
 verify,record,escalate,reasonFor});
})(window);
