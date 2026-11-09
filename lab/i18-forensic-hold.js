/* MI BOWLING · LAB I18 · portable forensic hold dossier, offline/read-only.
 * No automatic trust restoration, no private material, timestamps, or writes.
 * Internal hashes prove consistency, NOT physical preservation or provenance.
 */
(function(root){
'use strict';
const F=root.MiBowlingI17Forensics,M=root.MiBowlingI12Manifest;
if(!F||!M||!root.crypto?.subtle)throw Error('I18 requires I12 and I17');
const FORMAT='MI-BOWLING-I18-LAB-FORENSIC-HOLD';
const LOG='MI-BOWLING-I18-DECISION-TRACE';
const ZERO='0'.repeat(64),MAX=5*1024*1024;
const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ALLOWED=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
const KEYS=['package15','source15','externalRoot','externalLatest','reports'];
const NAMES=['package15','source15','externalRoot','externalLatest','reportA','reportB','reportC'];
const STAGES=['intake','classification','hold','manual-escalation','pending-review'];
const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join(',')===keys.slice().sort().join(',');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sha=x=>M.hashText(JSON.stringify(x));
const eventHash=e=>M.hashText('MI-BOWLING-I18-TRACE-v1|'+JSON.stringify(e));
function safePayload(x){
 if(x===null)return;
 const stack=[x];let n=0;
 while(stack.length){
  const v=stack.pop();if(++n>50000)throw Error('I18: evidencia excesiva');
  if(v&&typeof v==='object'){
   if(Object.prototype.toString.call(v)!=='[object Object]'&&!Array.isArray(v))
    throw Error('I18: estructura de evidencia no serializable');
   for(const [k,val] of Object.entries(v)){
    if(/(?:private.?key|secret|password|passphrase|credential|access.?token|api.?key|seed|mnemonic)/i.test(k))
     throw Error('I18: evidencia contiene campo de secreto: rechazo seguro');
    if(val&&typeof val==='object')stack.push(val);
    else if(typeof val==='function'||typeof val==='undefined'||typeof val==='symbol')
     throw Error('I18: contenido no JSON');
   }
  }
 }
}
function validateInputs(inputs,owner,caseId){
 if(!ALLOWED.includes(owner)||!UUID.test(caseId||'')||
  !exact(inputs,KEYS)||!Array.isArray(inputs.reports)||inputs.reports.length!==3)
  throw Error('I18: expediente o identidad ficticia A/B/C inválida');
 const arr=[inputs.package15,inputs.source15,inputs.externalRoot,
  inputs.externalLatest,...inputs.reports];
 for(const x of arr)safePayload(x);
 const size=JSON.stringify(arr).length;
 if(size>MAX)throw Error('I18: expediente sobrepasa límite local');
 return arr;
}
function response(decision){
 if(decision==='blocked-total-trust-loss')
  return ['recover-original-independent-I15-sources',
   'No reconstruir raíces ni PIN. Buscar originales fuera del LAB y solicitar revisión humana externa.'];
 if(decision==='blocked-external-reference-loss')
  return ['recover-original-I16-pins',
   'Conservar historias firmadas pero no atribuir frescura; recuperar genesis y última marca originales.'];
 if(decision==='quarantine-conflicting-evidence')
  return ['quarantine-all-branches',
   'Preservar íntegramente A/B/C y la bifurcación; no elegir mayoría ni corregir documentos.'];
 if(decision==='conditionally-consistent')
  return ['independent-human-review',
   'Coherencia condicionada. No permitir reanudación ni declaración de custodia real sin validación externa.'];
 return ['investigate-unresolved-blocker',
  'Conservar todas las fuentes originales, no operar ni introducir nueva autoridad.'];
}
async function descriptor(name,value,index){
 const present=value!==null;
 return {name,index,present,digest:present?await sha(value):ZERO,
  payload:value};
}
async function traceFor(owner,caseId,decision,evidenceRoot){
 const [action,guidance]=response(decision);
 const outcomes=['recorded',decision,'blocked-no-write',action,'pending-external-human-review'];
 let prev=ZERO,events=[];
 for(let i=0;i<STAGES.length;i++){
  const e={format:LOG,version:1,owner,caseId,sequence:i+1,
   stage:STAGES[i],outcome:outcomes[i],
   evidenceRoot,previousHash:prev};
  const h=await eventHash(e);events.push({...e,hash:h});prev=h;
 }
 return{events,latestEventHash:prev,action,guidance};
}
async function create(inputs,owner,caseId,pass){
 const values=validateInputs(inputs,owner,caseId);
 let diagnostic;
 try{
  diagnostic=await F.reconcile(inputs.package15,inputs.source15,owner,pass,
   inputs.externalRoot,inputs.externalLatest,inputs.reports);
 }catch(e){
  // No secrets or free-form error content are embedded in a portable report.
  diagnostic={decision:'blocked-invalid-evidence',verified:false,
   authority:'none',metadata:{validationRejected:true}};
 }
 const evidence=[];
 for(let i=0;i<NAMES.length;i++)
  evidence.push(await descriptor(NAMES[i],values[i],i+1));
 const evidenceRoot=await sha(evidence.map(x=>({name:x.name,index:x.index,
  present:x.present,digest:x.digest})));
 const verdict=diagnostic.decision;
 const {events,latestEventHash,action,guidance}=
  await traceFor(owner,caseId,verdict,evidenceRoot);
 const dossier={format:FORMAT,version:1,owner,caseId,
  evidence,evidenceRoot,decision:verdict,
  decisionMetadata:JSON.parse(JSON.stringify(diagnostic.metadata||{})),
  diagnosticVerified:diagnostic.verified===true,
  action,guidance,events,latestEventHash,
  authority:'none',operationallyApproved:false,reRootAuthorized:false,
  custodyIndependenceProven:false,freshnessWithoutExternalMarkProven:false,
  immutableStorageProven:false,timestampProven:false,
  noWrites:true,containsScores:false};
 const dossierDigest=await sha(dossier);
 return Object.freeze({...dossier,dossierDigest});
}
async function verify(dossier,externalDigest=null){
 if(!exact(dossier,['format','version','owner','caseId','evidence','evidenceRoot',
  'decision','decisionMetadata','diagnosticVerified','action','guidance',
  'events','latestEventHash','authority','operationallyApproved',
  'reRootAuthorized','custodyIndependenceProven',
  'freshnessWithoutExternalMarkProven','immutableStorageProven',
  'timestampProven','noWrites','containsScores','dossierDigest'])||
  dossier.format!==FORMAT||dossier.version!==1||
  !ALLOWED.includes(dossier.owner)||!UUID.test(dossier.caseId||'')||
  !Array.isArray(dossier.evidence)||dossier.evidence.length!==7||
  !SHA.test(dossier.evidenceRoot||'')||
  !SHA.test(dossier.dossierDigest||'')||
  dossier.authority!=='none'||dossier.operationallyApproved!==false||
  dossier.reRootAuthorized!==false||dossier.noWrites!==true||
  dossier.containsScores!==false||
  ['custodyIndependenceProven','freshnessWithoutExternalMarkProven',
   'immutableStorageProven','timestampProven'].some(k=>dossier[k]!==false)||
  typeof dossier.decision!=='string'||!exact(dossier.decisionMetadata,
   Object.keys(dossier.decisionMetadata||{}))||
  typeof dossier.diagnosticVerified!=='boolean')
  throw Error('I18: expediente incompleto o atribución indebida de confianza');
 const [action,guidance]=response(dossier.decision);
 if(action!==dossier.action||guidance!==dossier.guidance)
  throw Error('I18: decisión o escalada modificada');
 let list=[];
 for(let i=0;i<7;i++){
  const e=dossier.evidence[i];
  if(!exact(e,['name','index','present','digest','payload'])||
    e.name!==NAMES[i]||e.index!==i+1||
    e.present!==(e.payload!==null)||!SHA.test(e.digest||''))
   throw Error('I18: orden de evidencias alterado');
  safePayload(e.payload);
  if(e.digest!==(e.present?await sha(e.payload):ZERO))
   throw Error('I18: evidencia sustituida, dañada o perdida');
  list.push({name:e.name,index:e.index,present:e.present,digest:e.digest});
 }
 if(await sha(list)!==dossier.evidenceRoot)
  throw Error('I18: índice de evidencias alterado');
 const {events,latestEventHash}=await traceFor(
  dossier.owner,dossier.caseId,dossier.decision,dossier.evidenceRoot);
 if(!equal(dossier.events,events)||dossier.latestEventHash!==latestEventHash)
  throw Error('I18: secuencia de decisiones, eslabones o justificación manipulados');
 const unsigned={...dossier};delete unsigned.dossierDigest;
 if(await sha(unsigned)!==dossier.dossierDigest)
  throw Error('I18: sobre forense alterado');
 if(externalDigest!==null&&(!SHA.test(externalDigest)||externalDigest!==dossier.dossierDigest))
  throw Error('I18: PIN externo del expediente incompatible');
 return Object.freeze({integrityChecked:true,decision:dossier.decision,
  evidenceCount:7,missingCount:list.filter(x=>!x.present).length,
  traceSteps:events.length,externalDigestMatched:externalDigest!==null,
  externallyIndependentCustodyProven:false,historyRecencyProven:false,
  immutableStorageProven:false,operationallyApproved:false,noWrites:true});
}
async function recheck(dossier,pass,externalDigest=null){
 const v=await verify(dossier,externalDigest),e=dossier.evidence;
 const x={package15:e[0].payload,source15:e[1].payload,
  externalRoot:e[2].payload,externalLatest:e[3].payload,
  reports:e.slice(4).map(z=>z.payload)};
 let rerun;
 try{rerun=await F.reconcile(x.package15,x.source15,dossier.owner,pass,
  x.externalRoot,x.externalLatest,x.reports)}
 catch(_){rerun={decision:'blocked-invalid-evidence',verified:false}}
 if(rerun.decision!==dossier.decision||rerun.verified!==dossier.diagnosticVerified)
  throw Error('I18: diagnóstico del expediente no coincide con revalidación I17');
 return Object.freeze({...v,diagnosisRechecked:true});
}
root.MiBowlingI18ForensicHold=Object.freeze({FORMAT,LOG,ZERO,
 create,verify,recheck});
})(window);
