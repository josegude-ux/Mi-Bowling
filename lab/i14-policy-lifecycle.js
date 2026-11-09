/* MI BOWLING · I14 LAB · externally anchored key-policy lifecycle.
 * Offline/read-only, no clock assumptions, storage, private keys or network.
 * All trust and last pins MUST be supplied independently from this package.
 * Signatures alone cannot prove independent custody or historic signing time.
 */
(function(root){
'use strict';
const W=root.MiBowlingI13Witnesses,M=root.MiBowlingI12Manifest,C=root.MiBowlingI11AuditCore;
if(!W||!M||!C||!root.crypto?.subtle)throw Error('I14: I11/I12/I13/WebCrypto required');
const FORMAT='MI-BOWLING-I14-LAB-POLICY-LIFECYCLE';
const ROOT_FORMAT='MI-BOWLING-I14-EXTERNAL-GENESIS';
const LAST_FORMAT='MI-BOWLING-I14-EXTERNAL-LATEST';
const STATEMENT_FORMAT='MI-BOWLING-I14-POLICY-TRANSITION';
const ZERO=C.ZERO,MAX=8,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join(',')===keys.slice().sort().join(',');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sha=x=>M.hashText(JSON.stringify(x));
const statementHash=st=>M.hashText('MI-BOWLING-I14-POLICY-TRANSITION-v1|'+JSON.stringify(st));
const context=(role,st)=>new TextEncoder().encode('MI-BOWLING-I14-'+role+'-v1|'+JSON.stringify(st));
function statement(owner,epoch,action,previousHash,fromPolicyDigest,toPolicyDigest,latestManifestDigest,latestCount){
 if(!UUID.test(owner||'')||!Number.isSafeInteger(epoch)||epoch<1||epoch>MAX||
  !['genesis','rotate','revoke'].includes(action)||!SHA.test(previousHash||'')||
  !SHA.test(fromPolicyDigest||'')||!SHA.test(toPolicyDigest||'')||
  !SHA.test(latestManifestDigest||'')||!Number.isSafeInteger(latestCount)||latestCount<0)
  throw Error('I14: declaración de época inválida');
 return Object.freeze({format:STATEMENT_FORMAT,version:1,owner,epoch,action,
  previousHash,fromPolicyDigest,toPolicyDigest,latestManifestDigest,latestCount});
}
function genesisPin(owner,policy){
 if(!UUID.test(owner||'')||policy?.owner!==owner)throw Error('I14: génesis ajena');
 return sha(policy).then(genesisPolicyDigest=>Object.freeze({
  format:ROOT_FORMAT,version:1,owner,genesisPolicyDigest}));
}
async function lastPin(bundle,policies){
 if(!exact(bundle,['format','version','owner','epochs'])||bundle.format!==FORMAT||
  bundle.version!==1||!Array.isArray(bundle.epochs)||!bundle.epochs.length||
  !Array.isArray(policies)||policies.length!==bundle.epochs.length)
  throw Error('I14: paquete incompleto');
 const e=bundle.epochs.at(-1),p=policies.at(-1);
 return Object.freeze({format:LAST_FORMAT,version:1,owner:bundle.owner,
  epochCount:bundle.epochs.length,lastStatementHash:await statementHash(e.statement),
  lastPolicyDigest:await sha(p),lastManifestDigest:e.statement.latestManifestDigest});
}
function bytes(signature){
 if(typeof signature!=='string'||signature.length!==88||
  !/^[A-Za-z0-9+/]{86}==$/.test(signature))
  throw Error('I14: firma ECDSA P-256 base64 inválida');
 let raw;try{raw=Uint8Array.from(atob(signature),s=>s.charCodeAt(0))}
 catch(_){throw Error('I14: firma base64 truncada')}
 if(raw.length!==64)throw Error('I14: firma P-256 longitud errónea');
 return raw;
}
async function signatures(sigList,policy,role,st){
 if(!Array.isArray(sigList)||sigList.length<policy.threshold||
  sigList.length>policy.keys.length)
  throw Error('I14: quórum de '+role+' insuficiente');
 const allowed=new Map(policy.keys.map(x=>[x.keyId,x.publicJwk]));
 const seen=new Set();
 for(const s of sigList){
  if(!exact(s,['keyId','signature'])||!SHA.test(s.keyId||'')||
   !allowed.has(s.keyId)||seen.has(s.keyId))
   throw Error('I14: firmante duplicado, retirado o no autorizado');
  seen.add(s.keyId);
  const k=allowed.get(s.keyId);
  let key;
  try{key=await root.crypto.subtle.importKey('jwk',
   {...k,ext:true},{name:'ECDSA',namedCurve:'P-256'},false,['verify'])}
  catch(_){throw Error('I14: clave pública inválida')}
  if(!await root.crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},
    key,bytes(s.signature),context(role,st)))
   throw Error('I14: firma '+role+' inválida o manipulada');
 }
 return seen.size;
}
function validateEnvelope(bundle,policies,pins13,externalGenesis,externalLatest,owner){
 if(!UUID.test(owner||'')||
  !exact(bundle,['format','version','owner','epochs'])||bundle.format!==FORMAT||
  bundle.version!==1||bundle.owner!==owner||
  !Array.isArray(bundle.epochs)||bundle.epochs.length<1||bundle.epochs.length>MAX||
  !Array.isArray(policies)||policies.length!==bundle.epochs.length||
  !Array.isArray(pins13)||pins13.length!==bundle.epochs.length)
  throw Error('I14: cadena, políticas o PIN I13 incompletos');
 if(!exact(externalGenesis,['format','version','owner','genesisPolicyDigest'])||
  externalGenesis.format!==ROOT_FORMAT||externalGenesis.version!==1||
  externalGenesis.owner!==owner||!SHA.test(externalGenesis.genesisPolicyDigest||''))
  throw Error('I14: ancla de génesis independiente ausente o de otra identidad');
 if(!exact(externalLatest,['format','version','owner','epochCount',
   'lastStatementHash','lastPolicyDigest','lastManifestDigest'])||
  externalLatest.format!==LAST_FORMAT||externalLatest.version!==1||
  externalLatest.owner!==owner||!Number.isSafeInteger(externalLatest.epochCount)||
  externalLatest.epochCount<1||!SHA.test(externalLatest.lastStatementHash||'')||
  !SHA.test(externalLatest.lastPolicyDigest||'')||
  !SHA.test(externalLatest.lastManifestDigest||''))
  throw Error('I14: PIN final externo ausente, inválido o de otro propietario');
}
async function verify(bundle,policies,pins13,externalGenesis,externalLatest,owner,pass){
 validateEnvelope(bundle,policies,pins13,externalGenesis,externalLatest,owner);
 if(typeof pass!=='string'||pass.length<12||pass.length>256)
  throw Error('I14: se requiere frase ficticia fuera del paquete');
 const genesisDigest=await sha(policies[0]);
 if(genesisDigest!==externalGenesis.genesisPolicyDigest)
  throw Error('I14: SUSTITUCIÓN: política de génesis no coincide con ancla externa');
 let previousHash=ZERO,previousPolicy=null,previousManifest=null;
 let checks=0,retired=new Set(),allSeen=new Set();
 for(let i=0;i<bundle.epochs.length;i++){
  const e=bundle.epochs[i],policy=policies[i],pin=pins13[i];
  if(!exact(e,['statement','oldSignatures','newSignatures','witnessBundle','witnessSnapshots'])||
   !Array.isArray(e.witnessSnapshots)||!Array.isArray(e.oldSignatures)||
   !Array.isArray(e.newSignatures))
   throw Error('I14: etapa de custodia incompleta o con secretos adicionales');
  const trusted=await W.verifyPolicy(policy,owner);
  const proof=await W.verify(e.witnessBundle,e.witnessSnapshots,
   policy,pin,owner,pass);
  const manifest=e.witnessSnapshots.at(-1).manifest;
  const expected=statement(owner,i+1,i===0?'genesis':e.statement?.action,
   previousHash,i===0?ZERO:await sha(previousPolicy),trusted.policyDigest,
   manifest.digest,manifest.entries.at(-1).count);
  if(!same(e.statement,expected))
   throw Error('I14: transición alterada, reordenada o ancla incorrecta');
  const keyIds=new Set(policy.keys.map(k=>k.keyId));
  if(i===0){
   if(e.oldSignatures.length!==0)
    throw Error('I14: génesis no admite firmas de política desconocida');
  }else{
   for(const k of keyIds)if(retired.has(k))
    throw Error('I14: CLAVE RETIRADA reintroducida en política nueva');
   const oldKeys=new Set(previousPolicy.keys.map(k=>k.keyId));
   const removed=[...oldKeys].filter(k=>!keyIds.has(k));
   const added=[...keyIds].filter(k=>!oldKeys.has(k));
   if(e.statement.action==='rotate'&&added.length===0)
    throw Error('I14: rotación sin clave pública nueva');
   if(e.statement.action==='revoke'&&removed.length===0)
    throw Error('I14: revocación sin retirar clave');
   if(added.length===0&&removed.length===0)
    throw Error('I14: política no ha cambiado');
   const before=previousManifest.entries,after=manifest.entries;
   if(after.length<before.length)
    throw Error('I14: ROLLBACK: manifiesto anterior perdió exportaciones');
   for(let j=0;j<before.length;j++)
    if(before[j].entryHash!==after[j]?.entryHash)
     throw Error('I14: BIFURCACIÓN: testigo cambia exportaciones previas');
   checks+=await signatures(e.oldSignatures,previousPolicy,'OLD',expected);
   for(const k of removed)retired.add(k);
  }
  checks+=await signatures(e.newSignatures,policy,'NEW',expected);
  for(const k of keyIds)allSeen.add(k);
  previousHash=await statementHash(expected);
  previousPolicy=policy;previousManifest=manifest;
  if(!proof.verified||!proof.externallyPinned)throw Error('I14: I13 no verificado');
 }
 const calculated=await lastPin(bundle,policies);
 if(!same(calculated,externalLatest))
  throw Error('I14: ROLLBACK o sustitución de política: PIN final externo incompatible');
 return Object.freeze({verified:true,owner,epochs:bundle.epochs.length,
  transitionCount:bundle.epochs.length-1,signatureChecks:checks,retiredKeys:retired.size,
  finalPolicyDigest:calculated.lastPolicyDigest,
  finalManifestDigest:calculated.lastManifestDigest,
  independentPinsRequired:true,authorityCustodyProven:false,signingTimeProven:false,
  retroactiveRevocationProven:false,immutabilityProven:false,noWrites:true,
  containsScores:false});
}
async function compareCurrent(bundle,policies,pins13,rootPin,latestPin,owner,pass,current){
 await verify(bundle,policies,pins13,rootPin,latestPin,owner,pass);
 const e=bundle.epochs.at(-1);
 return W.compareCurrent(e.witnessBundle,e.witnessSnapshots,policies.at(-1),
  pins13.at(-1),owner,pass,current);
}
root.MiBowlingI14Lifecycle=Object.freeze({FORMAT,ROOT_FORMAT,LAST_FORMAT,MAX,ZERO,
 statement,statementHash,genesisPin,lastPin,verify,compareCurrent,
 context:(role,st)=>context(role,st)});
})(window);
