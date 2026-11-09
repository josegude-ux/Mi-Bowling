/* MI BOWLING · LAB I15 · offline exceptional quorum recovery, READ ONLY.
 * A PRE-INCIDENT independently retained recovery commitment, preserved I14
 * predecessor pin, and independent NEW final pin are all mandatory.
 * A signature cannot prove when the recovery authority was committed, physical
 * custody, independence of humans, legal validity or absolute immutability.
 * No real identities, services, storage, key generation, or signing here.
 */
(function(root){
'use strict';
const I14=root.MiBowlingI14Lifecycle,I13=root.MiBowlingI13Witnesses;
const I12=root.MiBowlingI12Manifest,I11=root.MiBowlingI11AuditCore;
if(!I14||!I13||!I12||!I11||!root.crypto?.subtle)
 throw Error('I15: I11/I12/I13/I14 and WebCrypto required');
const FORMAT='MI-BOWLING-I15-LAB-EMERGENCY-RECOVERY';
const COMMIT='MI-BOWLING-I15-EXTERNAL-RECOVERY-COMMITMENT';
const LAST='MI-BOWLING-I15-EXTERNAL-RECOVERY-LATEST';
const STATEMENT='MI-BOWLING-I15-RECOVERY-STATEMENT';
const SHA=/^[a-f0-9]{64}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join(',')===keys.slice().sort().join(',');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=x=>I12.hashText(JSON.stringify(x));
const statementHash=st=>I12.hashText('MI-BOWLING-I15-RECOVERY-STATEMENT-v1|'+JSON.stringify(st));
const signedBytes=(role,st)=>new TextEncoder().encode(
 'MI-BOWLING-I15-'+role+'-v1|'+JSON.stringify(st));
const sourceKeys=['previousPolicies','previousPins13','previousGenesisPin',
 'previousLatestPin','recoveryPolicy','commitment','newPolicy',
 'newPin13','externalLatestPin'];
function validGenesis(pin,owner){
 return exact(pin,['format','version','owner','genesisPolicyDigest'])&&
  pin.format===I14.ROOT_FORMAT&&pin.version===1&&pin.owner===owner&&
  SHA.test(pin.genesisPolicyDigest||'');
}
async function commitment(owner,previousGenesisPin,recoveryPolicy){
 if(!UUID.test(owner||'')||!validGenesis(previousGenesisPin,owner))
  throw Error('I15: génesis I14 inválida o de otro jugador');
 const policy=await I13.verifyPolicy(recoveryPolicy,owner);
 return Object.freeze({format:COMMIT,version:1,owner,mode:'precommitted-offline-v1',
  previousGenesisDigest:await hash(previousGenesisPin),
  authorityPolicyDigest:policy.policyDigest});
}
function latestManifest(witnessSnapshots){
 if(!Array.isArray(witnessSnapshots)||!witnessSnapshots.length)
  throw Error('I15: testigos de recuperación ausentes');
 const latest=witnessSnapshots.at(-1)?.manifest;
 if(!latest||!Array.isArray(latest.entries)||!latest.entries.length)
  throw Error('I15: manifiesto recuperado ausente');
 return latest;
}
async function statement(owner,recoveryId,reason,previousLatestPin,
 previousManifest,recoveryCommitment,newPolicy,newManifest){
 if(!UUID.test(owner||'')||!UUID.test(recoveryId||'')||
  !['lost-quorum','suspected-compromise'].includes(reason)||
  previousLatestPin?.owner!==owner||recoveryCommitment?.owner!==owner||
  previousManifest?.owner!==owner||newManifest?.owner!==owner||
  !SHA.test(previousLatestPin?.lastStatementHash||'')||
  !SHA.test(previousManifest?.digest||'')||
  !SHA.test(newManifest?.digest||'')||
  !SHA.test(recoveryCommitment?.authorityPolicyDigest||''))
  throw Error('I15: identidad, motivo o referencias de recuperación inválidas');
 const oldEntries=previousManifest.entries,newEntries=newManifest.entries;
 if(!Array.isArray(oldEntries)||!oldEntries.length||
  !Array.isArray(newEntries)||newEntries.length<=oldEntries.length)
  throw Error('I15: ROLLBACK o sin exportación posterior verificable');
 const oldLast=oldEntries.at(-1),newLast=newEntries.at(-1);
 if(!SHA.test(oldLast.headHash||'')||!SHA.test(newLast.headHash||'')||
  !Number.isSafeInteger(oldLast.count)||oldLast.count<0||
  !Number.isSafeInteger(newLast.count)||newLast.count<oldLast.count)
  throw Error('I15: contadores y anclas de auditoría incompatibles');
 for(let i=0;i<oldEntries.length;i++){
  if(oldEntries[i]?.entryHash!==newEntries[i]?.entryHash)
   throw Error('I15: BIFURCACIÓN: prefijo de exportaciones modificado');
 }
 const newTrust=await I13.verifyPolicy(newPolicy,owner);
 return Object.freeze({format:STATEMENT,version:1,owner,recoveryId,reason,
  predecessorPinDigest:await hash(previousLatestPin),
  predecessorLastHash:previousLatestPin.lastStatementHash,
  predecessorManifestDigest:previousManifest.digest,
  authorityPolicyDigest:recoveryCommitment.authorityPolicyDigest,
  newPolicyDigest:newTrust.policyDigest,
  newManifestDigest:newManifest.digest,
  previousExports:oldEntries.length,newExports:newEntries.length,
  previousAuditCount:oldLast.count,newAuditCount:newLast.count,
  newHeadHash:newLast.headHash});
}
function decode(sig){
 if(typeof sig!=='string'||sig.length!==88||
  !/^[A-Za-z0-9+/]{86}==$/.test(sig))
  throw Error('I15: firma P-256 base64 inválida');
 let b;
 try{b=Uint8Array.from(atob(sig),x=>x.charCodeAt(0))}
 catch(_){throw Error('I15: firma truncada')}
 if(b.length!==64)throw Error('I15: firma P-256 longitud inválida');
 return b;
}
async function checkSignatures(sigs,policy,role,st){
 if(!Array.isArray(sigs)||sigs.length<policy.threshold||
  sigs.length>policy.keys.length)
  throw Error('I15: quórum '+role+' insuficiente');
 const allowed=new Map(policy.keys.map(k=>[k.keyId,k.publicJwk])),seen=new Set();
 const msg=signedBytes(role,st);
 for(const sig of sigs){
  if(!exact(sig,['keyId','signature'])||!SHA.test(sig.keyId||'')||
    !allowed.has(sig.keyId)||seen.has(sig.keyId))
   throw Error('I15: firmante '+role+' duplicado o no autorizado');
  seen.add(sig.keyId);
  const k=await root.crypto.subtle.importKey('jwk',
   {...allowed.get(sig.keyId),ext:true},{name:'ECDSA',namedCurve:'P-256'},
   false,['verify']);
  if(!await root.crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},
    k,decode(sig.signature),msg))
   throw Error('I15: firma '+role+' alterada o incorrecta');
 }
 return seen.size;
}
function validate(package15,source,owner,pass){
 if(!UUID.test(owner||'')||!exact(package15,['format','version','owner',
   'previousBundle','recovery'])||package15.format!==FORMAT||
  package15.version!==1||package15.owner!==owner||
  !exact(package15.recovery,['statement','authoritySignatures',
   'acceptSignatures','witnessBundle','witnessSnapshots'])||
  !exact(source,sourceKeys)||typeof pass!=='string'||
  pass.length<12||pass.length>256)
  throw Error('I15: paquete, archivos externos o frase ficticia incompletos');
 const pin=source.externalLatestPin;
 if(!exact(pin,['format','version','owner','ordinal','commitmentDigest',
  'predecessorPinDigest','predecessorLastHash','statementHash',
  'newPolicyDigest','newI13PinDigest','newManifestDigest'])||
  pin.format!==LAST||pin.version!==1||pin.owner!==owner||pin.ordinal!==1||
  ['commitmentDigest','predecessorPinDigest','predecessorLastHash',
   'statementHash','newPolicyDigest','newI13PinDigest','newManifestDigest']
    .some(k=>!SHA.test(pin[k]||'')))
  throw Error('I15: PIN I15 externo ausente, inválido o de otra identidad');
}
async function lastPin(package15,source){
 if(package15?.format!==FORMAT||!package15.recovery?.statement)
  throw Error('I15: paquete de recuperación malformado');
 const st=package15.recovery.statement;
 return Object.freeze({format:LAST,version:1,owner:package15.owner,ordinal:1,
  commitmentDigest:await hash(source.commitment),
  predecessorPinDigest:await hash(source.previousLatestPin),
  predecessorLastHash:source.previousLatestPin.lastStatementHash,
  statementHash:await statementHash(st),
  newPolicyDigest:await hash(source.newPolicy),
  newI13PinDigest:await hash(source.newPin13),
  newManifestDigest:st.newManifestDigest});
}
async function verify(package15,source,owner,pass){
 validate(package15,source,owner,pass);
 // Verify ALL prior history, rather than allowing a recovery to replace I14.
 const old=await I14.verify(package15.previousBundle,source.previousPolicies,
  source.previousPins13,source.previousGenesisPin,source.previousLatestPin,
  owner,pass);
 const expectedCommit=await commitment(owner,source.previousGenesisPin,
  source.recoveryPolicy);
 if(!equal(source.commitment,expectedCommit))
  throw Error('I15: SUSTITUCIÓN de autoridad de rescate o génesis original');
 const oldKeys=new Set(source.previousPolicies.flatMap(p=>p.keys.map(k=>k.keyId)));
 const rescuers=new Set(source.recoveryPolicy.keys.map(k=>k.keyId));
 const newKeys=new Set(source.newPolicy.keys.map(k=>k.keyId));
 if([...rescuers].some(k=>oldKeys.has(k)))
  throw Error('I15: autoridad de rescate comparte claves con histórico activo o retirado');
 if([...newKeys].some(k=>oldKeys.has(k)||rescuers.has(k)))
  throw Error('I15: la nueva política reutiliza claves antiguas o de rescate');
 const recovered=package15.recovery;
 const v=await I13.verify(recovered.witnessBundle,recovered.witnessSnapshots,
  source.newPolicy,source.newPin13,owner,pass);
 const prev=package15.previousBundle.epochs.at(-1).witnessSnapshots.at(-1).manifest;
 const current=latestManifest(recovered.witnessSnapshots);
 const evidence=recovered.statement;
 const expected=await statement(owner,evidence?.recoveryId,evidence?.reason,
  source.previousLatestPin,prev,source.commitment,source.newPolicy,current);
 if(!exact(evidence,Object.keys(expected))||!equal(evidence,expected))
  throw Error('I15: declaración sustituida o recuperación sin continuidad');
 const rescueSignatures=await checkSignatures(recovered.authoritySignatures,
  source.recoveryPolicy,'RECOVERY',expected);
 const acceptingSignatures=await checkSignatures(recovered.acceptSignatures,
  source.newPolicy,'ACCEPT',expected);
 const computed=await lastPin(package15,source);
 if(!equal(computed,source.externalLatestPin))
  throw Error('I15: ROLLBACK de recuperación o PIN final externo sustituido');
 if(!old.verified||!v.verified)throw Error('I15: historia previa o nueva no verificada');
 return Object.freeze({verified:true,owner,previousEpochs:old.epochs,
  recoveredWitnesses:v.statements,recoverySignatures:rescueSignatures,
  acceptanceSignatures:acceptingSignatures,
  previousAuditCount:expected.previousAuditCount,
  newAuditCount:expected.newAuditCount,
  finalManifestDigest:current.digest,newPolicyDigest:expected.newPolicyDigest,
  externalRecoveryAuthorityRequired:true,independentLastPinRequired:true,
  noOldQuorumForNewTransition:true,noWrites:true,containsScores:false,
  custodyProven:false,preIncidentCommitmentTimeProven:false,
  timestampProven:false,retroactiveRevocationProven:false,
  immutabilityProven:false,replayPreventionWithoutExternalStateProven:false});
}
async function compareCurrent(package15,source,owner,pass,current){
 await verify(package15,source,owner,pass);
 const r=package15.recovery;
 return I13.compareCurrent(r.witnessBundle,r.witnessSnapshots,
  source.newPolicy,source.newPin13,owner,pass,current);
}
root.MiBowlingI15Recovery=Object.freeze({FORMAT,COMMIT,LAST,STATEMENT,
 commitment,statement,statementHash,signedBytes,lastPin,verify,compareCurrent});
})(window);
