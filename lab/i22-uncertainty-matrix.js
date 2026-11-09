/* MI BOWLING · LAB I22 · uncertainty matrix for parallel I21 dossiers.
 * SHA equality is arithmetic, not independent custody or prior provenance.
 * The three A/B/C labels are file slots, NOT human identities.
 * No external network, real records, clocks, storage, approval or re-root.
 */
(function(root){
'use strict';
const D=root.MiBowlingI21ProvenanceDoubt,M=root.MiBowlingI12Manifest;
if(!D||!M||!root.crypto?.subtle)throw Error('I22: I12 and I21 required');
const FORMAT='MI-BOWLING-I22-LAB-PROVENANCE-UNCERTAINTY';
const EVENT='MI-BOWLING-I22-LAB-MANUAL-HOLD';
const ZERO='0'.repeat(64),SHA=/^[a-f0-9]{64}$/;
const SLOTS=['A','B','C'],ORIGINS=['same-file','claimed-separate','unknown'];
const KEYS=['format','version','source','claimedSourceDigest','offers',
 'evidence','evidenceRoot','classification','findings','matrix','nextAction',
 'status','events','latestEventHash','authority','operationallyApproved',
 'externalProvenanceProven','custodianIndependenceProven','identityProven',
 'historicalFreshnessProven','timestampProven','immutableStorageProven',
 'priorPinAuthenticityProven','jointReplacementExcluded',
 'externalReviewContacted','reRootAuthorized','noWrites','containsScores','digest'];
const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join(',')===keys.slice().sort().join(',');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=v=>M.hashText(JSON.stringify(v));
const eventHash=v=>M.hashText('MI-BOWLING-I22-UNCERTAINTY-v1|'+JSON.stringify(v));
function validateJson(value){
 const todo=[value],seen=new Set();let n=0;
 while(todo.length){
  const x=todo.pop();if(++n>160000)throw Error('I22: demasiada complejidad');
  if(x&&typeof x==='object'){
   if(seen.has(x))throw Error('I22: referencia circular o duplicada');
   seen.add(x);
   if(Object.prototype.toString.call(x)!=='[object Object]'&&!Array.isArray(x))
    throw Error('I22: archivo no JSON');
   for(const [k,v] of Object.entries(x)){
    if(/(?:private.?key|password|passphrase|secret|credential|api.?key|access.?token|mnemonic|seed)/i.test(k))
     throw Error('I22: secreto rechazado');
    if(v&&typeof v==='object')todo.push(v);
    else if(v===undefined||typeof v==='function'||typeof v==='symbol'||
     typeof v==='bigint'||(typeof v==='number'&&!Number.isFinite(v)))
     throw Error('I22: tipo no serializable');
   }
  }
 }
}
function subjects(d){
 if(!Array.isArray(d?.bundles))return[];
 return [...new Set(d.bundles.filter(x=>x?.packet?.dossier)
  .map(x=>x.packet.dossier.owner+'|'+x.packet.dossier.caseId))].sort();
}
function guidance(classification){
 if(classification==='quarantine-invalid-source')
  return 'Retener originales dañados y válidos; aclarar faltantes fuera del LAB sin inventar fuentes';
 if(classification==='quarantine-parallel-forks')
  return 'Preservar todas las versiones concurrentes; no escoger la de más copias ni la más reciente';
 if(classification==='hold-duplicate-claims')
  return 'La igualdad entre copias no demuestra custodios independientes, autoría o anterioridad';
 if(classification==='hold-insufficient-claims')
  return 'Faltan referencias comparables; no convertir un hash autocontenido en prueba externa';
 return 'Solo coherencia técnica: verificación física y documental verdaderamente externa aún pendiente';
}
function matrixFor(evidence,classification){
 const present=evidence.filter(x=>x.present).length;
 const matched=evidence.filter(x=>x.internalState==='internally-consistent').length;
 const invalid=evidence.filter(x=>x.internalState.startsWith('invalid-')).length;
 return[
  {axis:'sha-content-equality',status:matched?'observed-on-untrusted-input':'not-established',
   note:'Un SHA coincidente prueba igualdad de contenido representado, no su origen'},
  {axis:'source-authenticity',status:'unproven',
   note:'No se autentica a quien proporcionó el archivo o la referencia'},
  {axis:'independent-custody',status:'unproven',
   note:'A/B/C son posiciones lógicas, no tres personas o medios independientes'},
  {axis:'historical-freshness',status:'unproven',
   note:'No se dispone de sello temporal ni prueba de última versión anterior'},
  {axis:'physical-immutability',status:'unproven',
   note:'El propio archivo y sus hashes pueden sustituirse conjuntamente'},
  {axis:'operational-release',status:'forbidden',
   note:'Ninguna comparación autoriza restaurar, publicar ni crear una raíz de confianza'},
  {axis:'preservation',status:present?'copies-retained-in-envelope':'missing-inputs-retained',
   note:'Se retienen copias, incluidos documentos inválidos, pero no se demuestra custodia física'},
  {axis:'diagnostic-summary',status:classification,
   note:'Documentos presentes '+present+', internamente coherentes '+matched+', inválidos '+invalid}
 ];
}
async function diagnose(source,claimedSourceDigest,offers){
 if(claimedSourceDigest!==null&&!SHA.test(claimedSourceDigest||''))
  throw Error('I22: SHA de fuente inválido');
 if(!Array.isArray(offers)||offers.length!==3)
  throw Error('I22: tres posiciones A/B/C obligatorias, aunque puedan ser null');
 validateJson(offers);
 if(JSON.stringify(offers).length>35*1024*1024)
  throw Error('I22: conjunto excede límite local');
 await D.verify(source,claimedSourceDigest);
 const sourceDigest=source.digest,baselineSubjects=subjects(source);
 const evidence=[],valid=[],findings=[];
 let invalid=0,missing=0,unreferenced=0;
 for(let i=0;i<3;i++){
  const offer=offers[i],slot=SLOTS[i];
  let internalState='missing',caseDigest=null,claimedDigest=null,
   ownerRelation='not-available',origin='unknown';
  if(offer===null)missing++;
  else if(!exact(offer,['slot','caseFile','claimedDigest','origin'])||
   offer.slot!==slot||!ORIGINS.includes(offer.origin)||
   (offer.claimedDigest!==null&&!SHA.test(offer.claimedDigest||''))||
   !offer.caseFile){
   invalid++;internalState='invalid-structure';
  }else{
   origin=offer.origin;claimedDigest=offer.claimedDigest;
   try{
    await D.verify(offer.caseFile);
    caseDigest=offer.caseFile.digest;
    ownerRelation=equal(subjects(offer.caseFile),baselineSubjects)?
     'same-declared-subjects':'different-declared-subjects';
    if(claimedDigest===null){internalState='unreferenced';unreferenced++}
    else if(claimedDigest!==caseDigest){internalState='invalid-digest-claim';invalid++}
    else{
     internalState='internally-consistent';
     valid.push({slot,digest:caseDigest,ownerRelation});
    }
   }catch(_){internalState='invalid-source-file';invalid++}
  }
  evidence.push({slot,present:offer!==null,inputDigest:offer===null?
   ZERO:await hash(offer),internalState,caseDigest,claimedDigest,
   originClaim:origin,ownerRelation,identitiesVerified:false,
   independentRetentionProven:false});
 }
 let fork=false,duplicate=false;
 for(let i=0;i<valid.length;i++)for(let j=i+1;j<valid.length;j++){
  const a=valid[i],b=valid[j];
  if(a.digest===b.digest){
   duplicate=true;findings.push('identical-untrusted-files-'+a.slot+'-'+b.slot);
  }else{
   fork=true;findings.push('competing-complete-versions-'+a.slot+'-'+b.slot);
  }
 }
 if(valid.some(x=>x.digest!==sourceDigest)){
  fork=true;findings.push('candidate-differs-from-source-i21');
 }
 if(valid.some(x=>x.ownerRelation==='different-declared-subjects')){
  fork=true;findings.push('different-declared-case-subjects-not-authenticated');
 }
 if(invalid)findings.push('invalid-inputs-are-preserved');
 if(unreferenced)findings.push('missing-claimed-hash-is-not-provenance');
 if(missing)findings.push('missing-logical-positions');
 findings.push('no-authenticated-custody-time-or-independent-origin');
 let classification;
 if(invalid)classification='quarantine-invalid-source';
 else if(fork)classification='quarantine-parallel-forks';
 else if(duplicate)classification='hold-duplicate-claims';
 else if(valid.length<2)classification='hold-insufficient-claims';
 else classification='hold-internal-equality-only';
 const evidenceRoot=await hash(evidence);
 return{evidence,evidenceRoot,classification,findings,
  matrix:matrixFor(evidence,classification),nextAction:guidance(classification)};
}
function unsigned(packet){const {digest,...rest}=packet;return rest}
function core(s,i,stage,previousHash){
 return{format:EVENT,version:1,sourceDigest:s.source.digest,
  evidenceRoot:s.evidenceRoot,classification:s.classification,
  sequence:i+1,stage,previousHash};
}
async function withTrace(packet,status){
 const stages=status==='outside-review-recorded-not-sent'?
  ['hold-recorded','outside-review-recorded']:['hold-recorded'];
 let previous=ZERO,events=[];
 for(let i=0;i<stages.length;i++){
  const e=core(packet,i,stages[i],previous),digest=await eventHash(e);
  events.push({...e,hash:digest});previous=digest;
 }
 return {...packet,status,events,latestEventHash:previous};
}
async function prepare(source,claimedSourceDigest=null,offers=[null,null,null]){
 const d=await diagnose(source,claimedSourceDigest,offers);
 const p={format:FORMAT,version:1,source,claimedSourceDigest,offers,...d,
  authority:'none',operationallyApproved:false,
  externalProvenanceProven:false,custodianIndependenceProven:false,
  identityProven:false,historicalFreshnessProven:false,
  timestampProven:false,immutableStorageProven:false,
  priorPinAuthenticityProven:false,jointReplacementExcluded:false,
  externalReviewContacted:false,reRootAuthorized:false,
  noWrites:true,containsScores:false};
 const traced=await withTrace(p,'held-for-independent-review');
 return Object.freeze({...traced,digest:await hash(traced)});
}
async function verify(packet,expectedDigest=null){
 if(!exact(packet,KEYS)||packet.format!==FORMAT||packet.version!==1||
  !SHA.test(packet.evidenceRoot||'')||!SHA.test(packet.digest||'')||
  !SHA.test(packet.latestEventHash||'')||
  (expectedDigest!==null&&!SHA.test(expectedDigest||''))||
  !['held-for-independent-review','outside-review-recorded-not-sent'].includes(packet.status)||
  packet.authority!=='none'||packet.operationallyApproved!==false||
  ['externalProvenanceProven','custodianIndependenceProven','identityProven',
   'historicalFreshnessProven','timestampProven','immutableStorageProven',
   'priorPinAuthenticityProven','jointReplacementExcluded',
   'externalReviewContacted','reRootAuthorized','containsScores']
   .some(k=>packet[k]!==false)||packet.noWrites!==true)
  throw Error('I22: esquema manipulado o falsa autoridad');
 const d=await diagnose(packet.source,packet.claimedSourceDigest,packet.offers);
 if(!equal(d,{evidence:packet.evidence,evidenceRoot:packet.evidenceRoot,
  classification:packet.classification,findings:packet.findings,
  matrix:packet.matrix,nextAction:packet.nextAction}))
  throw Error('I22: alteración de matriz, fuentes o inferencias');
 const regenerated=await withTrace({...unsigned(packet),events:undefined,
  latestEventHash:undefined},packet.status);
 if(!equal(regenerated.events,packet.events)||
  regenerated.latestEventHash!==packet.latestEventHash)
  throw Error('I22: traza alterada');
 if(await hash(unsigned(packet))!==packet.digest)
  throw Error('I22: huella del sobre I22 alterada');
 if(expectedDigest!==null&&expectedDigest!==packet.digest)
  throw Error('I22: PIN externo del sobre incorrecto');
 return Object.freeze({integrityChecked:true,classification:packet.classification,
  present:packet.evidence.filter(x=>x.present).length,
  internallyConsistent:packet.evidence.filter(x=>x.internalState==='internally-consistent').length,
  status:packet.status,externalDigestMatched:expectedDigest!==null,
  independentCustodyProven:false,priorPinAuthenticityProven:false,
  humanIdentityProven:false,operationallyApproved:false,
  jointReplacementExcluded:false,noWrites:true});
}
async function requestExternalReview(packet){
 await verify(packet);
 if(packet.status!=='held-for-independent-review')
  throw Error('I22: ya anotada la solicitud; no repetir');
 const next=await withTrace({...unsigned(packet),events:undefined,
  latestEventHash:undefined},'outside-review-recorded-not-sent');
 return Object.freeze({...next,digest:await hash(next)});
}
root.MiBowlingI22Uncertainty=Object.freeze({FORMAT,EVENT,ZERO,prepare,verify,
 requestExternalReview});
})(window);
