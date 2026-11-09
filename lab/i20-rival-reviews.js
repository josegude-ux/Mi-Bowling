/* MI BOWLING · LAB I20 · preserve rival I19 branches without adjudicating.
 * A/B/C are LOGICAL FILE LABELS, never verified custodians or actual humans.
 * Read-only; no real accounts, signing, clocks, network, storage or authority.
 * Self-hashes alone do NOT establish independently retained evidence, freshness
 * or physical immutability. An externally retained digest must come from OUTSIDE.
 */
(function(root){
'use strict';
const I18=root.MiBowlingI18ForensicHold,I19=root.MiBowlingI19ManualReview,
 M=root.MiBowlingI12Manifest;
if(!I18||!I19||!M||!root.crypto?.subtle)throw Error('I20: I12, I18 and I19 required');
const FORMAT='MI-BOWLING-I20-LAB-RIVAL-REVIEW-PACKET';
const EVENT='MI-BOWLING-I20-LAB-QUARANTINE-TRACE';
const ZERO='0'.repeat(64),SHA=/^[a-f0-9]{64}$/;
const SLOTS=['A','B','C'],KEYS=['dossier','externalI18Digest','claims'];
const PACKET_KEYS=['format','version','owner','caseId','dossierDigest',
 'externalI18Digest','dossier','claims','evidence','evidenceRoot',
 'classification','findings','instructions','status','events','latestEventHash',
 'authority','operationalApproval','trustedHumanReviewProven',
 'independentCustodiansProven','timestampProven','immutableStorageProven',
 'recencyProven','reRootAuthorized','noWrites','containsScores','packetDigest'];
const exact=(x,k)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join(',')===k.slice().sort().join(',');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=x=>M.hashText(JSON.stringify(x));
const evHash=x=>M.hashText('MI-BOWLING-I20-QUARANTINE-EVENT-v1|'+JSON.stringify(x));
function safeJson(x){
 const all=[x],seen=new Set();let n=0;
 while(all.length){
  const v=all.pop();if(++n>65000)throw Error('I20: paquete excede límite de complejidad');
  if(v&&typeof v==='object'){
   if(seen.has(v))throw Error('I20: referencia cíclica o duplicada');
   seen.add(v);
   if(Object.prototype.toString.call(v)!=='[object Object]'&&!Array.isArray(v))
    throw Error('I20: evidencia no JSON');
   for(const [k,z] of Object.entries(v)){
    if(/(?:private.?key|password|passphrase|secret|credential|api.?key|access.?token|mnemonic|seed)/i.test(k))
     throw Error('I20: secreto en expediente de revisión');
    if(z&&typeof z==='object')all.push(z);
    else if(z===undefined||typeof z==='function'||typeof z==='symbol'||typeof z==='bigint')
     throw Error('I20: entrada no serializable');
   }
  }else if(typeof v==='number'&&!Number.isFinite(v))
   throw Error('I20: número no finito');
 }
}
function instruction(kind){
 if(kind==='quarantine-unverifiable')
  return 'Preservar A/B/C originales e inválidos; revisar daños sin inventar una nueva autoridad';
 if(kind==='quarantine-divergent')
  return 'Preservar todas las ramas divergentes; exigir arbitraje verdaderamente externo sin elegir mayoría';
 if(kind==='hold-duplicate-claims')
  return 'Copias idénticas no cuentan como revisores independientes; solicitar procedencia externa verificable';
 if(kind==='hold-insufficient')
  return 'Faltan comparaciones suficientes; solicitar fuentes originales fuera del laboratorio';
 return 'Historias de revisión compatibles internamente; sin certificar última versión, custodios ni autorización';
}
function base(packet){
 const {packetDigest,...rest}=packet;return rest;
}
function eventCore(s,number,stage,previous){
 return {format:EVENT,version:1,owner:s.owner,caseId:s.caseId,
  dossierDigest:s.dossierDigest,evidenceRoot:s.evidenceRoot,
  classification:s.classification,sequence:number,stage,previousHash:previous};
}
async function withEvents(s,status){
 let previous=ZERO,events=[];
 const stages=status==='external-review-requested'?
  ['comparison-recorded','outside-review-requested']:['comparison-recorded'];
 for(let i=0;i<stages.length;i++){
  const core=eventCore(s,i+1,stages[i],previous);
  const item={...core,hash:await evHash(core)};
  events.push(item);previous=item.hash;
 }
 return {...s,status,events,latestEventHash:previous};
}
async function compare(dossier,externalI18Digest,claims){
 if(!Array.isArray(claims)||claims.length!==3||
  (externalI18Digest!==null&&!SHA.test(externalI18Digest)))
  throw Error('I20: tres posiciones y SHA externo opcional requeridos');
 await I18.verify(dossier,externalI18Digest);
 safeJson(claims);
 if(JSON.stringify(claims).length>12*1024*1024)
  throw Error('I20: archivos de revisión demasiado grandes');
 let evidence=[],valid=[],findings=[],invalid=0,absent=0;
 for(let i=0;i<3;i++){
  const item=claims[i],slot=SLOTS[i];
  const digest=item===null?ZERO:await hash(item);
  let classification='absent',review=null,reason='no-input';
  if(item===null)absent++;
  else if(!exact(item,['slot','review'])||item.slot!==slot||!item.review){
   classification='invalid';reason='slot-or-format-invalid';invalid++;
  }else{
   try{
    await I19.verify(item.review,dossier,externalI18Digest);
    review=item.review;classification='verified-internal';reason='cryptographic-structure-consistent';
    valid.push({slot,digest:review.reviewDigest,events:review.events});
   }catch(_){classification='invalid';reason='i19-verify-rejected';invalid++}
  }
  evidence.push({slot,present:item!==null,digest,classification,reason});
 }
 let divergent=false,duplicated=false,compatiblePairs=0;
 for(let i=0;i<valid.length;i++)for(let j=i+1;j<valid.length;j++){
  const a=valid[i],b=valid[j];
  if(a.digest===b.digest){duplicated=true;findings.push('identical-copy-'+a.slot+'-'+b.slot)}
  const prefix=Math.min(a.events.length,b.events.length);
  if(a.events.some((ev,k)=>k<prefix&&ev.hash!==b.events[k].hash)){
   divergent=true;findings.push('divergent-event-branch-'+a.slot+'-'+b.slot);
  }else compatiblePairs++;
 }
 if(invalid)findings.push('invalid-or-unverifiable-input');
 if(absent)findings.push('missing-original-review');
 let classification;
 if(invalid)classification='quarantine-unverifiable';
 else if(divergent)classification='quarantine-divergent';
 else if(duplicated)classification='hold-duplicate-claims';
 else if(valid.length<2)classification='hold-insufficient';
 else classification='hold-compatible-conditional';
 const digestRoot=await hash(evidence.map(x=>({
  slot:x.slot,present:x.present,digest:x.digest,
  classification:x.classification,reason:x.reason
 })));
 return {owner:dossier.owner,caseId:dossier.caseId,
  dossierDigest:dossier.dossierDigest,evidence,evidenceRoot:digestRoot,
  classification,findings,instructions:instruction(classification)};
}
async function prepare(dossier,externalI18Digest=null,claims=[null,null,null]){
 const comparison=await compare(dossier,externalI18Digest,claims);
 const s={format:FORMAT,version:1,...comparison,externalI18Digest,
  dossier,claims,authority:'none',operationalApproval:false,
  trustedHumanReviewProven:false,independentCustodiansProven:false,
  timestampProven:false,immutableStorageProven:false,recencyProven:false,
  reRootAuthorized:false,noWrites:true,containsScores:false};
 const withTrace=await withEvents(s,'quarantine-held');
 return Object.freeze({...withTrace,packetDigest:await hash(withTrace)});
}
async function verify(packet,externalPacketDigest=null){
 if(!exact(packet,PACKET_KEYS)||packet.format!==FORMAT||packet.version!==1||
  !SHA.test(packet.dossierDigest||'')||!SHA.test(packet.evidenceRoot||'')||
  !SHA.test(packet.latestEventHash||'')||!SHA.test(packet.packetDigest||'')||
  (externalPacketDigest!==null&&!SHA.test(externalPacketDigest))||
  !['quarantine-held','external-review-requested'].includes(packet.status)||
  packet.authority!=='none'||packet.operationalApproval!==false||
  ['trustedHumanReviewProven','independentCustodiansProven','timestampProven',
   'immutableStorageProven','recencyProven','reRootAuthorized','containsScores']
    .some(k=>packet[k]!==false)||packet.noWrites!==true)
  throw Error('I20: paquete manipulado o atribución de autoridad prohibida');
 const comparison=await compare(packet.dossier,packet.externalI18Digest,packet.claims);
 if(comparison.owner!==packet.owner||comparison.caseId!==packet.caseId||
  comparison.dossierDigest!==packet.dossierDigest||
  !same(comparison.evidence,packet.evidence)||
  comparison.evidenceRoot!==packet.evidenceRoot||
  comparison.classification!==packet.classification||
  !same(comparison.findings,packet.findings)||
  comparison.instructions!==packet.instructions)
  throw Error('I20: fuentes o dictamen de comparación sustituidos');
 const expected=await withEvents({...base(packet),events:undefined,latestEventHash:undefined},
  packet.status);
 if(!same(packet.events,expected.events)||packet.latestEventHash!==expected.latestEventHash)
  throw Error('I20: TRAZA de solicitud externa alterada o reordenada');
 if(await hash(base(packet))!==packet.packetDigest)
  throw Error('I20: índice forense interno no coincide');
 if(externalPacketDigest!==null&&externalPacketDigest!==packet.packetDigest)
  throw Error('I20: PIN de paquete proporcionado externamente no coincide');
 return Object.freeze({integrityChecked:true,classification:packet.classification,
  validLogicalFiles:comparison.evidence.filter(x=>x.classification==='verified-internal').length,
  missingLogicalFiles:comparison.evidence.filter(x=>!x.present).length,
  evidenceDigestMatched:externalPacketDigest!==null,
  status:packet.status,authority:'none',operationalApproval:false,
  externalCustodyProven:false,independentHumansProven:false,
  immutableStorageProven:false,recencyProven:false,noWrites:true});
}
async function requestExternalReview(packet){
 await verify(packet);
 if(packet.status!=='quarantine-held')
  throw Error('I20: solicitud externa ya anotada; no duplicar escaladas');
 const next=await withEvents({...base(packet),events:undefined,latestEventHash:undefined},
  'external-review-requested');
 return Object.freeze({...next,packetDigest:await hash(next)});
}
root.MiBowlingI20RivalReviews=Object.freeze({FORMAT,EVENT,ZERO,
 prepare,verify,requestExternalReview});
})(window);
