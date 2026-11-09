/* MI BOWLING I21 · LAB · coordinated packet+SHA substitution diagnosis.
 * Full packet integrity and a matching claimed hash DO NOT prove provenance.
 * A/B/C are untrusted file positions, NOT separate people or custodians.
 * All operations offline / read-only; no recovery or production authority.
 */
(function(root){
'use strict';
const I20=root.MiBowlingI20RivalReviews,M=root.MiBowlingI12Manifest;
if(!I20||!M||!root.crypto?.subtle)throw Error('I21: I12, I20 and WebCrypto required');
const FORMAT='MI-BOWLING-I21-LAB-PROVENANCE-DOUBT';
const CLAIM='MI-BOWLING-I21-UNVERIFIED-DIGEST-CLAIM';
const EVENT='MI-BOWLING-I21-LAB-REVIEW-REQUEST';
const SHA=/^[0-9a-f]{64}$/,ZERO='0'.repeat(64),SLOTS=['A','B','C'];
const OUT_KEYS=['format','version','bundles','priorPin','evidence',
 'evidenceRoot','classification','findings','guidance','status','events',
 'latestEventHash','authority','operationalApproval','independentSourceProven',
 'authenticPriorPinProven','humanIdentityProven','custodyIndependenceProven',
 'timeProven','immutabilityProven','freshnessProven',
 'coordinatedReplacementExcluded','noWrites','containsScores','digest'];
const exact=(v,k)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join(',')===k.slice().sort().join(',');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=v=>M.hashText(JSON.stringify(v));
const eventHash=v=>M.hashText('MI-BOWLING-I21-TRACE-v1|'+JSON.stringify(v));
function safe(x){
 const stack=[x],seen=new Set();let n=0;
 while(stack.length){
  const v=stack.pop();if(++n>70000)throw Error('I21: documentos excesivamente complejos');
  if(v&&typeof v==='object'){
   if(seen.has(v))throw Error('I21: referencia de objeto reutilizada o cíclica');
   seen.add(v);
   if(Object.prototype.toString.call(v)!=='[object Object]'&&!Array.isArray(v))
    throw Error('I21: documento no JSON');
   for(const [k,z] of Object.entries(v)){
    if(/(?:private.?key|password|passphrase|secret|credential|api.?key|access.?token|mnemonic|seed)/i.test(k))
     throw Error('I21: campo secreto rechazado');
    if(z&&typeof z==='object')stack.push(z);
    else if(z===undefined||typeof z==='function'||typeof z==='symbol'||
     typeof z==='bigint'||(typeof z==='number'&&!Number.isFinite(z)))
     throw Error('I21: tipo no serializable');
   }
  }
 }
}
function guidance(c){
 if(c==='quarantine-unverifiable')
  return 'Retener originales inválidos. No corregir ni promover archivos aportados';
 if(c==='quarantine-competing-packets')
  return 'Retener versiones discrepantes y sus SHA asociados sin elegir por mayoría';
 if(c==='quarantine-pin-mismatch')
  return 'No aceptar una nueva marca para reemplazar la referencia aportada';
 if(c==='blocked-unrepresented-pin')
  return 'La referencia aportada no coincide con ningún paquete recuperado';
 if(c==='blocked-evidence-loss')
  return 'No existen paquetes utilizables; no crear nueva raíz o historia';
 if(c==='conditionally-matching-supplied-pin')
  return 'Coincidencia aritmética con PIN suministrado; su origen y anterioridad NO están probados';
 return 'Paquete y SHA pueden haber sido reemplazados juntos: procedencia indeterminable';
}
async function inspect(bundles,priorPin){
 if(!Array.isArray(bundles)||bundles.length!==3||
  (priorPin!==null&&!SHA.test(priorPin||'')))
  throw Error('I21: tres posiciones y SHA opcional de 64 caracteres requeridos');
 safe(bundles);
 if(JSON.stringify(bundles).length>14*1024*1024)
  throw Error('I21: paquete de comparación demasiado grande');
 const evidence=[],findings=[],valid=[];
 let invalid=0,missing=0;
 for(let i=0;i<3;i++){
  const slot=SLOTS[i],bundle=bundles[i],itemDigest=bundle===null?ZERO:await hash(bundle);
  let state='missing',packetDigest=null,declaredDigest=null;
  if(bundle===null)missing++;
  else if(!exact(bundle,['slot','packet','claim'])||bundle.slot!==slot||
   !bundle.packet||!exact(bundle.claim,['format','version','slot','digest','origin'])||
   bundle.claim.format!==CLAIM||bundle.claim.version!==1||
   bundle.claim.slot!==slot||bundle.claim.origin!=='unverified-file'||
   !SHA.test(bundle.claim.digest||'')){
   invalid++;state='invalid-structure';
  }else{
   declaredDigest=bundle.claim.digest;
   try{
    const proof=await I20.verify(bundle.packet);
    packetDigest=bundle.packet.packetDigest;
    if(!proof.integrityChecked||packetDigest!==declaredDigest){
     invalid++;state='invalid-claimed-digest';
    }else{
     state='internally-coherent';
     valid.push({slot,packetDigest,claimDigest:declaredDigest});
    }
   }catch(_){invalid++;state='invalid-source-packet'}
  }
  evidence.push({slot,present:bundle!==null,itemDigest,state,
   claimedDigest:declaredDigest,packetDigest});
 }
 let divergent=false,identical=false;
 for(let i=0;i<valid.length;i++)for(let j=i+1;j<valid.length;j++){
  if(valid[i].packetDigest!==valid[j].packetDigest){
   divergent=true;findings.push('competing-complete-packets-'+valid[i].slot+'-'+valid[j].slot);
  }else{
   identical=true;findings.push('matching-unverified-copies-'+valid[i].slot+'-'+valid[j].slot);
  }
 }
 if(invalid)findings.push('unverifiable-reference-or-packet');
 if(missing)findings.push('missing-original-packet-or-reference');
 let classification;
 if(invalid)classification='quarantine-unverifiable';
 else if(divergent)classification='quarantine-competing-packets';
 else if(!valid.length)classification='blocked-evidence-loss';
 else if(priorPin!==null&&valid.every(x=>x.packetDigest!==priorPin))
  classification='blocked-unrepresented-pin';
 else if(priorPin!==null&&valid.some(x=>x.packetDigest!==priorPin))
  classification='quarantine-pin-mismatch';
 else if(priorPin!==null)classification='conditionally-matching-supplied-pin';
 else classification='blocked-joint-substitution-undecidable';
 if(identical)findings.push('duplicates-do-not-prove-independent-custodians');
 findings.push('no-independent-provenance-or-time-evidence');
 const evidenceRoot=await hash(evidence);
 return{evidence,evidenceRoot,classification,findings,guidance:guidance(classification)};
}
function base(p){const {digest,...rest}=p;return rest}
function core(s,i,stage,previousHash){
 return {format:EVENT,version:1,classification:s.classification,
  evidenceRoot:s.evidenceRoot,sequence:i+1,stage,previousHash};
}
async function trace(s,status){
 const stages=status==='review-request-recorded-not-sent'?
  ['comparison-held','offline-request-recorded']:['comparison-held'];
 let prev=ZERO,events=[];
 for(let i=0;i<stages.length;i++){
  const e=core(s,i,stages[i],prev),h=await eventHash(e);
  events.push({...e,hash:h});prev=h;
 }
 return {...s,status,events,latestEventHash:prev};
}
async function prepare(bundles=[null,null,null],priorPin=null){
 const result=await inspect(bundles,priorPin);
 const state={format:FORMAT,version:1,bundles,priorPin,...result,
  authority:'none',operationalApproval:false,
  independentSourceProven:false,authenticPriorPinProven:false,
  humanIdentityProven:false,custodyIndependenceProven:false,
  timeProven:false,immutabilityProven:false,freshnessProven:false,
  coordinatedReplacementExcluded:false,noWrites:true,containsScores:false};
 const p=await trace(state,'hold-pending-external-review');
 return Object.freeze({...p,digest:await hash(p)});
}
async function verify(p,expectedDigest=null){
 if(!exact(p,OUT_KEYS)||p.format!==FORMAT||p.version!==1||
  (expectedDigest!==null&&!SHA.test(expectedDigest||''))||
  !SHA.test(p.evidenceRoot||'')||!SHA.test(p.latestEventHash||'')||
  !SHA.test(p.digest||'')||
  !['hold-pending-external-review','review-request-recorded-not-sent'].includes(p.status)||
  p.authority!=='none'||p.operationalApproval!==false||p.noWrites!==true||
  ['independentSourceProven','authenticPriorPinProven','humanIdentityProven',
   'custodyIndependenceProven','timeProven','immutabilityProven',
   'freshnessProven','coordinatedReplacementExcluded','containsScores']
   .some(x=>p[x]!==false))
  throw Error('I21: esquema o falsa autorización');
 const x=await inspect(p.bundles,p.priorPin);
 if(!same(x,p&&{evidence:p.evidence,evidenceRoot:p.evidenceRoot,
   classification:p.classification,findings:p.findings,guidance:p.guidance}))
  throw Error('I21: comparación o fuente sustituida');
 const rebuilt=await trace({...base(p),events:undefined,latestEventHash:undefined},
  p.status);
 if(!same(rebuilt.events,p.events)||rebuilt.latestEventHash!==p.latestEventHash)
  throw Error('I21: traza de revisión alterada');
 if(await hash(base(p))!==p.digest)throw Error('I21: huella interna de sobre alterada');
 if(expectedDigest!==null&&p.digest!==expectedDigest)
  throw Error('I21: huella EXTERNA del sobre incompatible');
 return Object.freeze({integrityChecked:true,classification:p.classification,
  status:p.status,validFiles:p.evidence.filter(x=>x.state==='internally-coherent').length,
  missingFiles:p.evidence.filter(x=>x.state==='missing').length,
  externalDigestMatched:expectedDigest!==null,
  independentCustodyProven:false,priorPinAuthenticityProven:false,
  jointSubstitutionExcluded:false,operationalApproval:false,authority:'none',
  noWrites:true});
}
async function requestReview(p){
 await verify(p);
 if(p.status!=='hold-pending-external-review')
  throw Error('I21: solicitud ya registrada; no repetir');
 const next=await trace({...base(p),events:undefined,latestEventHash:undefined},
  'review-request-recorded-not-sent');
 return Object.freeze({...next,digest:await hash(next)});
}
root.MiBowlingI21ProvenanceDoubt=Object.freeze({FORMAT,CLAIM,EVENT,ZERO,
 prepare,verify,requestReview});
})(window);
