/* MI BOWLING · I13 LAB · signed multi-witness offline verification.
 * READ ONLY. Public P-256 keys MUST originate from an independently retained
 * trust policy, not from the evidence being verified. No private keys here.
 * A separate latest PIN is REQUIRED to detect replacement of ALL records.
 * Signatures prove key possession, NOT independent custody, age, or immutability.
 */
(function(root){
'use strict';
const M=root.MiBowlingI12Manifest,C=root.MiBowlingI11AuditCore,E=root.MiBowlingI11Evidence;
if(!M||!C||!E||!root.crypto?.subtle)throw Error('I13: I11/I12/WebCrypto required');
const F='MI-BOWLING-I13-SIGNED-WITNESSES',P='MI-BOWLING-I13-EXTERNAL-TRUST-POLICY';
const PIN='MI-BOWLING-I13-EXTERNAL-LATEST-PIN',S='MI-BOWLING-I13-SIGNED-STATEMENT';
const MAX=12,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join(',')===keys.slice().sort().join(',');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const digest=x=>M.hashText(JSON.stringify(x));
const pub=key=>{
 if(!exact(key,['kty','crv','x','y'])||key.kty!=='EC'||key.crv!=='P-256'||
  typeof key.x!=='string'||typeof key.y!=='string'||
  !/^[a-zA-Z0-9_-]{43}$/.test(key.x)||!/^[a-zA-Z0-9_-]{43}$/.test(key.y))
  throw Error('I13: clave pública P-256 inválida, privada o con campos adicionales');
 return{ kty:'EC',crv:'P-256',x:key.x,y:key.y };
};
async function fingerprint(key){
 return M.hashText('MI-BOWLING-I13-P256-PUB-v1|'+JSON.stringify(pub(key)));
}
async function createPolicy(owner,jwks,threshold=2){
 if(!UUID.test(owner||'')||!Array.isArray(jwks)||jwks.length<2||
   jwks.length>5||!Number.isSafeInteger(threshold)||threshold<2||threshold>jwks.length)
  throw Error('I13: política independiente requiere 2–5 claves y umbral >=2');
 const keys=[];
 for(const key of jwks){const publicJwk=pub(key);
  keys.push({keyId:await fingerprint(publicJwk),publicJwk});
 }
 if(new Set(keys.map(x=>x.keyId)).size!==keys.length)
  throw Error('I13: claves públicas duplicadas no cuentan como testigos distintos');
 // Creation does not establish ownership, external custody or authenticity.
 return Object.freeze({format:P,version:1,owner,algorithm:'ECDSA-P256-SHA256',
  threshold,keys});
}
async function verifyPolicy(policy,owner){
 if(!exact(policy,['format','version','owner','algorithm','threshold','keys'])||
  policy.format!==P||policy.version!==1||policy.owner!==owner||
  policy.algorithm!=='ECDSA-P256-SHA256'||!UUID.test(owner||'')||
  !Array.isArray(policy.keys)||policy.keys.length<2||policy.keys.length>5||
  !Number.isSafeInteger(policy.threshold)||policy.threshold<2||
  policy.threshold>policy.keys.length)
  throw Error('I13: política de confianza externa inválida o de otro jugador');
 const seen=new Set();
 for(const k of policy.keys){
  if(!exact(k,['keyId','publicJwk'])||!SHA.test(k.keyId||'')||
   await fingerprint(k.publicJwk)!==k.keyId||seen.has(k.keyId))
   throw Error('I13: clave pública sustituida, privada o duplicada');
  seen.add(k.keyId);
  try{await root.crypto.subtle.importKey('jwk',
   {...pub(k.publicJwk),ext:true},{name:'ECDSA',namedCurve:'P-256'},false,['verify'])}
  catch(_){throw Error('I13: punto de clave pública P-256 inválido')}
 }
 return Object.freeze({policyDigest:await digest(policy),keys:new Map(policy.keys.map(k=>[k.keyId,k.publicJwk]))});
}
function statement(owner,sequence,manifest,previousHash=C.ZERO){
 if(!UUID.test(owner||'')||!Number.isSafeInteger(sequence)||sequence<1||
   sequence>MAX||!SHA.test(previousHash||'')||manifest?.owner!==owner||
   !SHA.test(manifest?.digest||'')||!Array.isArray(manifest?.entries)||
   manifest.entries.length<1||manifest.entries.length>40)
  throw Error('I13: secuencia/manifiesto/base inválidos');
 const end=manifest.entries.at(-1);
 if(!Number.isSafeInteger(end.count)||end.count<0||!SHA.test(end.headHash||''))
  throw Error('I13: cabecera del manifiesto inválida');
 return Object.freeze({format:S,version:1,owner,sequence,
  manifestDigest:manifest.digest,exports:manifest.entries.length,
  auditCount:end.count,headHash:end.headHash,previousHash});
}
function signedText(st){
 return 'MI-BOWLING-I13-ECDSA-STATEMENT-v1|'+JSON.stringify(st);
}
async function statementHash(st){return M.hashText(signedText(st))}
function decode64(x){
 if(typeof x!=='string'||x.length!==88||!/^[A-Za-z0-9+/]{86}==$/.test(x))
  throw Error('I13: firma P-256 base64 inválida');
 let a;
 try{a=Uint8Array.from(atob(x),v=>v.charCodeAt(0))}
 catch(_){throw Error('I13: firma truncada')}
 if(a.length!==64)throw Error('I13: firma P-256 de tamaño inválido');
 return a;
}
async function verifySignatures(record,st,keys,threshold){
 if(!exact(record,['statement','signatures'])||
   !Array.isArray(record.signatures)||record.signatures.length<threshold||
   record.signatures.length>keys.size||!equal(record.statement,st))
  throw Error('I13: registro firmado incompleto, alterado o insuficiente');
 const seen=new Set(),bytes=new TextEncoder().encode(signedText(st));
 for(const item of record.signatures){
  if(!exact(item,['keyId','signature'])||!SHA.test(item.keyId||'')||
   seen.has(item.keyId)||!keys.has(item.keyId))
   throw Error('I13: firmante duplicado, desconocido o sustituido');
  seen.add(item.keyId);
  const jwk=keys.get(item.keyId);
  const k=await root.crypto.subtle.importKey('jwk',{...pub(jwk),ext:true},
   {name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  if(!await root.crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},k,
    decode64(item.signature),bytes))
   throw Error('I13: firma alterada o clave externa incorrecta');
 }
 if(seen.size<threshold)throw Error('I13: quórum de firmas insuficiente');
}
async function lastPin(bundle,policy){
 if(!exact(bundle,['format','version','owner','records'])||bundle.format!==F||
   bundle.version!==1||!Array.isArray(bundle.records)||!bundle.records.length||
   bundle.records.length>MAX)
  throw Error('I13: paquete de testigos inválido');
 const last=bundle.records.at(-1);
 return Object.freeze({format:PIN,version:1,owner:bundle.owner,
  sequence:bundle.records.length,policyDigest:await digest(policy),
  lastStatementHash:await statementHash(last.statement),
  finalManifestDigest:last.statement.manifestDigest});
}
async function verify(bundle,snapshots,policy,externalPin,owner){
 if(!UUID.test(owner||'')||!exact(bundle,['format','version','owner','records'])||
   bundle.format!==F||bundle.version!==1||bundle.owner!==owner||
   !Array.isArray(bundle.records)||bundle.records.length<1||bundle.records.length>MAX||
   !Array.isArray(snapshots)||snapshots.length!==bundle.records.length)
  throw Error('I13: paquete de testigos incompleto o identidad cruzada');
 // Crucial: the externalPin and policy must be sourced separately, never
 // copied out of the untrusted bundle at verification time.
 if(!externalPin||!policy)
  throw Error('I13: PIN final y política independientes obligatorios');
 const trust=await verifyPolicy(policy,owner);
 if(!exact(externalPin,['format','version','owner','sequence','policyDigest',
   'lastStatementHash','finalManifestDigest'])||
   externalPin.format!==PIN||externalPin.version!==1||
   externalPin.owner!==owner||!SHA.test(externalPin.policyDigest||'')||
   !SHA.test(externalPin.lastStatementHash||'')||
   !SHA.test(externalPin.finalManifestDigest||'')||
   !Number.isSafeInteger(externalPin.sequence)||externalPin.sequence<1)
  throw Error('I13: PIN final externo inválido, ausente o identidad incorrecta');
 if(externalPin.policyDigest!==trust.policyDigest)
  throw Error('I13: SUSTITUCIÓN DE CLAVES: política distinta del PIN externo');
 let previous=C.ZERO,previousManifest=null,total=0;
 for(let i=0;i<bundle.records.length;i++){
  const snap=snapshots[i],r=bundle.records[i];
  if(!exact(snap,['manifest','files','pin12'])||
     !Array.isArray(snap.files)||snap.files.length<1||
     snap.files.length>40||snap.files.some(f=>typeof f!=='string'||
        f.length===0||f.length>E.MAX*2))
   throw Error('I13: exportación cifrada faltante o malformada');
  // A per-request ephemeral password is injected by caller; never put
  // passwords, credentials or private keys in a portable I13 file.
  if(typeof snap.passphrase!=='undefined')
   throw Error('I13: el paquete no puede almacenar contraseñas');
  const pass=arguments.length>5?arguments[5]:null;
  if(typeof pass!=='string'||pass.length<12||pass.length>256)
   throw Error('I13: se requiere frase ficticia fuera del paquete');
  const inputs=snap.files.map(file=>({file,passphrase:pass}));
  const proof=await M.verify(snap.manifest,inputs,owner,snap.pin12);
  if(!proof.externallyPinned)throw Error('I13: PIN I12 requerido para cada manifiesto');
  if(previousManifest){
   const older=previousManifest.entries,newer=snap.manifest.entries;
   if(newer.length<=older.length)
    throw Error('I13: ROLLBACK: falta avance de exportaciones entre testigos');
   for(let j=0;j<older.length;j++)
    if(newer[j].entryHash!==older[j].entryHash)
     throw Error('I13: BIFURCACIÓN o sustitución de manifiesto anterior');
  }
  const st=statement(owner,i+1,snap.manifest,previous);
  await verifySignatures(r,st,trust.keys,policy.threshold);
  previous=await statementHash(st);
  previousManifest=snap.manifest;
  total+=r.signatures.length;
 }
 const computed=await lastPin(bundle,policy);
 if(!equal(externalPin,computed))
  throw Error('I13: ROLLBACK o alteración: PIN externo contradice el paquete');
 const latest=snapshots.at(-1);
 return Object.freeze({verified:true,owner,statements:bundle.records.length,
  trustedSignerChecks:total,signerThreshold:policy.threshold,
  latestReceiptCount:latest.manifest.entries.at(-1).count,
  latestManifestDigest:latest.manifest.digest,
  policyDigest:trust.policyDigest,
  externallyPinned:true,quorumConditional:true,noWrites:true,
  containsScores:false,timestampProven:false,immutabilityProven:false});
}
async function compareCurrent(bundle,snapshots,policy,externalPin,owner,pass,current){
 await verify(bundle,snapshots,policy,externalPin,owner,pass);
 const snap=snapshots.at(-1);
 return M.compareCurrent(owner,snap.manifest,
  snap.files.map(file=>({file,passphrase:pass})),snap.pin12,current);
}
root.MiBowlingI13Witnesses=Object.freeze({FORMAT:F,POLICY_FORMAT:P,PIN_FORMAT:PIN,
 createPolicy,verifyPolicy,fingerprint,statement,signedText,statementHash,lastPin,
 verify,compareCurrent});
})(window);
