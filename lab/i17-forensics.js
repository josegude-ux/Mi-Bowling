/* MI BOWLING · I17 LAB · read-only forensic reconciliation / fail-closed.
 * Never reconstruct a missing external root or high-watermark as authority.
 * A valid signature proves key possession, NOT recency or custody independence.
 * A/B/C are logical labels, not independent humans/devices.
 */
(function(root){
'use strict';
const K=root.MiBowlingI16Anchors,R=root.MiBowlingI15Recovery,
 W=root.MiBowlingI13Witnesses,M=root.MiBowlingI12Manifest,C=root.MiBowlingI11AuditCore;
if(!K||!R||!W||!M||!C||!root.crypto?.subtle)
 throw Error('I17: I11–I16 and WebCrypto required');
const FORMAT='MI-BOWLING-I17-LAB-FORENSIC-DIAGNOSIS',SLOTS=['A','B','C'];
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join(',')===keys.slice().sort().join(',');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const digest=x=>M.hashText(JSON.stringify(x));
function decode(signature){
 if(typeof signature!=='string'||signature.length!==88||
  !/^[A-Za-z0-9+/]{86}==$/.test(signature))
  throw Error('I17: firma base64 P-256 inválida');
 let a;try{a=Uint8Array.from(atob(signature),c=>c.charCodeAt(0))}
 catch(_){throw Error('I17: firma truncada')}
 if(a.length!==64)throw Error('I17: firma incorrecta');
 return a;
}
async function inspect(history,source15,owner,externalRoot,slot,copy){
 if(!exact(history,['format','version','owner','seriesId','records'])||
  history.format!==K.FORMAT||history.version!==1||history.owner!==owner||
  !UUID.test(history.seriesId||'')||!Array.isArray(history.records)||
  history.records.length<1||history.records.length>K.MAX)
  throw Error('I17: historia inválida o identidad cruzada');
 const verified=await W.verifyPolicy(source15.newPolicy,owner);
 const i15PinDigest=await digest(source15.externalLatestPin);
 const fingerprintSet=new Map(source15.newPolicy.keys.map(k=>[k.keyId,k.publicJwk]));
 const seenNonce=new Set(),hashes=[];
 let prev=C.ZERO,total=0;
 for(let i=0;i<history.records.length;i++){
  const record=history.records[i];
  if(!exact(record,['statement','signatures'])||
    !exact(record.statement,['format','version','owner','seriesId','sequence','nonce',
     'previousHash','i15PinDigest','policyDigest','manifestDigest','auditCount']))
   throw Error('I17: formato de declaraciones no canónico');
  const st=record.statement;
  const expect=K.checkpoint(owner,history.seriesId,i+1,st.nonce,prev,
    i15PinDigest,verified.policyDigest,
    source15.externalLatestPin.newManifestDigest,
    st.auditCount);
  // Audit count is independently recovered from I15 verified evidence by caller.
  if(!same(st,expect))throw Error('I17: BIFURCACIÓN o secuencia manipulada');
  if(seenNonce.has(st.nonce))throw Error('I17: nonce repetido');
  seenNonce.add(st.nonce);
  if(!Array.isArray(record.signatures)||
    record.signatures.length<source15.newPolicy.threshold||
    record.signatures.length>source15.newPolicy.keys.length)
   throw Error('I17: quórum de firmas ausente');
  const ids=new Set();
  for(const sig of record.signatures){
   if(!exact(sig,['keyId','signature'])||!SHA.test(sig.keyId||'')||
    ids.has(sig.keyId)||!fingerprintSet.has(sig.keyId))
    throw Error('I17: firmante duplicado o no autorizado');
   ids.add(sig.keyId);
   const key=await root.crypto.subtle.importKey('jwk',
    {...fingerprintSet.get(sig.keyId),ext:true},
    {name:'ECDSA',namedCurve:'P-256'},false,['verify']);
   if(!await root.crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},
     key,decode(sig.signature),K.signBytes(st)))
    throw Error('I17: firma alterada');
   total++;
  }
  prev=await K.stHash(st);hashes.push(prev);
 }
 const candidateRoot=await K.genesis(owner,history.seriesId,
  source15.newPolicy,source15.externalLatestPin,history.records[0].statement);
 const rootCandidate=externalRoot||candidateRoot;
 if(externalRoot&&!same(externalRoot,candidateRoot))
  throw Error('I17: otra génesis incompatible con la retenida');
 const mark=await K.highWatermark(history,rootCandidate);
 const expectedCopy=await K.anchorCopy(slot,mark);
 if(!same(copy,expectedCopy))
  throw Error('I17: copia de custodio incoherente con su historia firmada');
 return {slot,history,copy,mark,hashes,sequence:history.records.length,
  signatureCount:total,internalSignatureCheck:true,externalFreshnessProven:false};
}
function output(decision,summary,details,meta={}){
 return Object.freeze({format:FORMAT,version:1,decision,verified:false,
  authority:'none',summary,details,metadata:meta,
  replayPreventedWithoutRetainedExternalMark:false,
  independenceOfCustodiansProven:false,preIncidentTimeProven:false,
  immutableStorageProven:false,noWrites:true,containsScores:false});
}
async function reconcile(package15,source15,owner,pass,externalRoot,externalLatest,reports){
 if(!UUID.test(owner||'')||!Array.isArray(reports)||reports.length!==3)
  throw Error('I17: identidad o tres posiciones A/B/C inválidas');
 if(!package15||!source15){
  return output('blocked-total-trust-loss',
   'No se puede acreditar identidad, autenticidad ni frescura sin fuentes I15 externas.',
   'No se crea raíz, PIN o quórum sustituto. Solo recuperar copias originales mediante proceso externo.');
 }
 if(typeof pass!=='string'||pass.length<12||pass.length>256)
  throw Error('I17: frase ficticia de I11 insuficiente');
 // This checks historical I11–I15 evidence, not just declarations in reports.
 const previous=await R.verify(package15,source15,owner,pass);
 const examined=[],issues=[];
 for(let i=0;i<3;i++){
  const report=reports[i],slot=SLOTS[i];
  if(report===null){examined.push({slot,status:'missing'});continue}
  if(!exact(report,['slot','history','copy'])||report.slot!==slot){
   examined.push({slot,status:'invalid'});
   issues.push('Ubicación '+slot+' duplicada, desplazada o malformada');continue;
  }
  try{
   const c=await inspect(report.history,source15,owner,externalRoot,slot,report.copy);
   if(c.history.records.some(r=>r.statement.auditCount!==previous.newAuditCount||
      r.statement.manifestDigest!==previous.finalManifestDigest))
    throw Error('I17: contador o manifiesto no coincide con el I15 verificado');
   examined.push({slot,status:'internally-signed',claim:c});
  }catch(error){
   examined.push({slot,status:'invalid'});
   issues.push('Ubicación '+slot+': '+error.message);
  }
 }
 const valid=examined.filter(x=>x.claim);
 const metadata={owner,validSignaturesSlots:valid.length,
  missing:examined.filter(x=>x.status==='missing').length,
  invalid:examined.filter(x=>x.status==='invalid').length,
  sequences:examined.map(x=>({slot:x.slot,sequence:x.claim?.sequence||null})),
  baseI15Verified:previous.verified,issues};
 let fork=false;
 for(let a=0;a<valid.length;a++){
  for(let b=a+1;b<valid.length;b++){
   const x=valid[a].claim,y=valid[b].claim;
   if(x.history.seriesId!==y.history.seriesId||
    x.hashes.some((h,i)=>i<y.hashes.length&&h!==y.hashes[i]))fork=true;
  }
 }
 metadata.forkEvidence=fork;
 if(!externalRoot||!externalLatest){
  return output('blocked-external-reference-loss',
   'El historial puede conservar firmas coherentes, pero faltan anclas exteriores necesarias para determinar la versión vigente.',
   'No se puede elevar una copia interna a referencia externa ni elegir una supuesta mayoría. Requiere recuperación de referencias originales fuera del LAB.',metadata);
 }
 if(fork||metadata.invalid>0)
  return output('quarantine-conflicting-evidence',
   'Referencias de custodios incompatibles o no autenticables: bloqueo y revisión independiente.',
   'No se selecciona una versión por mayoría ni se sobrescriben ficheros. Cada discrepancia debe preservarse como evidencia.',metadata);
 if(valid.length<2)
  return output('blocked-insufficient-copies',
   'No hay dos referencias firmadas disponibles con la marca externa conservada.',
   'Se necesita recuperar al menos una copia auténtica adicional sin regenerar el PIN desde el paquete.',metadata);
 // The externalRoot and high watermark may themselves be substituted: callers
 // must ensure they were retained independently before this comparison.
 const matching=valid.filter(x=>same(x.claim.mark,externalLatest));
 if(!matching.length)
  return output('blocked-latest-unrepresented',
   'Ninguna copia comprobada representa la marca externa proporcionada.',
   'Una marca externa puede ser más nueva; no se asume que una firma histórica equivale a la última versión.',metadata);
 const canonical=matching[0].claim;
 let stale=0,current=0;
 const copies=[null,null,null];
 for(let i=0;i<3;i++){
  const x=examined[i];if(!x.claim)continue;
  const v=x.claim;
  if(v.history.seriesId!==canonical.history.seriesId||
    v.sequence>canonical.sequence){
   return output('quarantine-conflicting-evidence',
    'Una copia declara una generación o una serie incompatible con la marca retenida.',
    'La marca exterior puede estar obsoleta. No se decide automáticamente qué custodio tiene razón.',metadata);
  }
  if(v.sequence<canonical.sequence)stale++;
  else if(same(v.mark,externalLatest))current++;
  else return output('quarantine-conflicting-evidence',
   'Una misma generación contiene marcas distintas.',
   'Posible bifurcación; conservar las pruebas y bloquear la reconciliación.',metadata);
  copies[i]=v.copy;
 }
 metadata.current=current;metadata.stale=stale;
 if(current<2)
  return output('blocked-insufficient-current',
   'Se requieren dos copias actuales; una firma histórica más antigua no cuenta como copia actual.',
   'Recuperar la referencia correcta sin cambiar la última marca conservada.',metadata);
 const authoritative=await K.verify(canonical.history,package15,source15,owner,
  pass,externalRoot,externalLatest,copies);
 return Object.freeze({...output('conditionally-consistent',
  'Dos o más copias coinciden con la marca externa suministrada; pruebas criptográficas internas correctas.',
  'Vigencia condicionada a conservación externa auténtica. No es certificación física, cronológica ni prueba de independencia de custodios.',metadata),
  verified:true,authority:'conditional-external-inputs',
  currentCopies:current,staleCopies:stale,
  signatureChecks:authoritative.signedCheckpoints,
  finalManifestDigest:authoritative.finalManifestDigest,
  externalFreshnessProven:false});
}
root.MiBowlingI17Forensics=Object.freeze({FORMAT,reconcile});
})(window);
