/* MI BOWLING · LAB I16 · redundant signed offline references.
 * READ ONLY. SHA/signatures do not establish physical custody, timestamps,
 * independent operators, real replay prevention or immutable storage.
 * A retained OUTSIDE high-watermark is mandatory for anti-replay claims.
 * No writes, private keys, network, app storage or accounts.
 */
(function(root){
'use strict';
const I15=root.MiBowlingI15Recovery,I13=root.MiBowlingI13Witnesses;
const I12=root.MiBowlingI12Manifest,I11=root.MiBowlingI11AuditCore;
if(!I15||!I13||!I12||!I11||!root.crypto?.subtle)
 throw Error('I16: I11 through I15 and WebCrypto required');
const FORMAT='MI-BOWLING-I16-LAB-SIGNED-ANCHOR-HISTORY';
const ST='MI-BOWLING-I16-SIGNED-CHECKPOINT';
const ROOT='MI-BOWLING-I16-EXTERNAL-GENESIS';
const MARK='MI-BOWLING-I16-EXTERNAL-HIGH-WATERMARK';
const COPY='MI-BOWLING-I16-EXTERNAL-ANCHOR-COPY';
const MAX=12,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const exact=(obj,keys)=>!!obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).sort().join(',')===keys.slice().sort().join(',');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=x=>I12.hashText(JSON.stringify(x));
const domain='MI-BOWLING-I16-CHECKPOINT-v1|';
const stHash=s=>I12.hashText(domain+JSON.stringify(s));
const bytes=s=>new TextEncoder().encode(domain+JSON.stringify(s));
function checkpoint(owner,seriesId,sequence,nonce,previousHash,i15PinDigest,
 policyDigest,manifestDigest,auditCount){
 if(!UUID.test(owner||'')||!UUID.test(seriesId||'')||!UUID.test(nonce||'')||
  !Number.isSafeInteger(sequence)||sequence<1||sequence>MAX||
  !SHA.test(previousHash||'')||!SHA.test(i15PinDigest||'')||
  !SHA.test(policyDigest||'')||!SHA.test(manifestDigest||'')||
  !Number.isSafeInteger(auditCount)||auditCount<0)
  throw Error('I16: identidad, serie, orden o referencias inválidas');
 return Object.freeze({format:ST,version:1,owner,seriesId,sequence,
  nonce,previousHash,i15PinDigest,policyDigest,manifestDigest,auditCount});
}
function signatureBytes(sig){
 if(typeof sig!=='string'||sig.length!==88||!/^[A-Za-z0-9+/]{86}==$/.test(sig))
  throw Error('I16: firma base64 P256 inválida');
 let b;try{b=Uint8Array.from(atob(sig),ch=>ch.charCodeAt(0))}
 catch(_){throw Error('I16: firma codificada ilegible')}
 if(b.length!==64)throw Error('I16: firma P256 incorrecta');
 return b;
}
async function signatures(list,policy,st){
 if(!Array.isArray(list)||list.length<policy.threshold||
    list.length>policy.keys.length)
  throw Error('I16: quórum de firmas insuficiente');
 const seen=new Set(),keys=new Map(policy.keys.map(x=>[x.keyId,x.publicJwk]));
 for(const s of list){
  if(!exact(s,['keyId','signature'])||!SHA.test(s.keyId||'')||
   seen.has(s.keyId)||!keys.has(s.keyId))
   throw Error('I16: firmante duplicado o no autorizado');
  seen.add(s.keyId);
  const key=await root.crypto.subtle.importKey('jwk',
   {...keys.get(s.keyId),ext:true},{name:'ECDSA',namedCurve:'P-256'},
   false,['verify']);
  if(!await root.crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},
    key,signatureBytes(s.signature),bytes(st)))
   throw Error('I16: firma de checkpoint alterada o clave incorrecta');
 }
 return seen.size;
}
async function genesis(owner,seriesId,policy,i15LastPin,firstStatement){
 const verified=await I13.verifyPolicy(policy,owner);
 if(!UUID.test(seriesId||'')||firstStatement?.owner!==owner||
  firstStatement?.seriesId!==seriesId||firstStatement?.sequence!==1)
  throw Error('I16: génesis no coincide con primera firma');
 return Object.freeze({format:ROOT,version:1,owner,seriesId,
  policyDigest:verified.policyDigest,i15PinDigest:await hash(i15LastPin),
  firstStatementHash:await stHash(firstStatement)});
}
async function highWatermark(history,externalRoot){
 if(!exact(history,['format','version','owner','seriesId','records'])||
  history.format!==FORMAT||history.version!==1||
  !Array.isArray(history.records)||!history.records.length||
  history.records.length>MAX)
  throw Error('I16: historial malformado');
 const s=history.records.at(-1)?.statement;
 return Object.freeze({format:MARK,version:1,owner:history.owner,
  seriesId:history.seriesId,rootHash:await hash(externalRoot),
  sequence:history.records.length,latestStatementHash:await stHash(s),
  i15PinDigest:externalRoot.i15PinDigest});
}
async function anchorCopy(slot,mark){
 if(!['A','B','C'].includes(slot)||!exact(mark,['format','version','owner',
 'seriesId','rootHash','sequence','latestStatementHash','i15PinDigest'])||
 mark.format!==MARK||mark.version!==1)
  throw Error('I16: marca externa inválida');
 return Object.freeze({format:COPY,version:1,owner:mark.owner,
  seriesId:mark.seriesId,slot,sequence:mark.sequence,
  latestStatementHash:mark.latestStatementHash,markDigest:await hash(mark)});
}
async function verify(history,package15,source15,owner,pass,externalRoot,externalMark,copies){
 if(!UUID.test(owner||'')||
  !exact(history,['format','version','owner','seriesId','records'])||
  history.format!==FORMAT||history.version!==1||history.owner!==owner||
  !UUID.test(history.seriesId||'')||!Array.isArray(history.records)||
  history.records.length<1||history.records.length>MAX)
  throw Error('I16: historial de anclas inválido o de otra identidad');
 if(!externalRoot||!externalMark||!Array.isArray(copies)||copies.length!==3)
  throw Error('I16: génesis, última marca y 3 ubicaciones externas obligatorias');
 const proof=await I15.verify(package15,source15,owner,pass);
 const trusted=await I13.verifyPolicy(source15.newPolicy,owner);
 const expectedDigest=await hash(source15.externalLatestPin);
 if(!exact(externalRoot,['format','version','owner','seriesId','policyDigest',
  'i15PinDigest','firstStatementHash'])||externalRoot.format!==ROOT||
  externalRoot.version!==1||externalRoot.owner!==owner||
  externalRoot.seriesId!==history.seriesId||
  !SHA.test(externalRoot.policyDigest||'')||
  !SHA.test(externalRoot.i15PinDigest||'')||
  !SHA.test(externalRoot.firstStatementHash||'')||
  externalRoot.policyDigest!==trusted.policyDigest||
  externalRoot.i15PinDigest!==expectedDigest)
  throw Error('I16: génesis externa sustituida, ausente o ajena');
 const seenNonces=new Set();
 let previous=I11.ZERO,total=0;
 for(let i=0;i<history.records.length;i++){
  const item=history.records[i];
  if(!exact(item,['statement','signatures']))
   throw Error('I16: registro de checkpoint con campos extra o sin firmas');
  const st=item.statement;
  if(!exact(st,['format','version','owner','seriesId','sequence','nonce',
   'previousHash','i15PinDigest','policyDigest','manifestDigest','auditCount']))
   throw Error('I16: declaración malformada');
  const expected=checkpoint(owner,history.seriesId,i+1,st.nonce,previous,
   expectedDigest,trusted.policyDigest,proof.finalManifestDigest,proof.newAuditCount);
  if(!same(st,expected))
   throw Error('I16: REPLAY, BIFURCACIÓN o corrupción de secuencia');
  if(seenNonces.has(st.nonce))
   throw Error('I16: nonce reutilizado en otra generación');
  seenNonces.add(st.nonce);
  total+=await signatures(item.signatures,source15.newPolicy,expected);
  previous=await stHash(expected);
 }
 const expectedRoot=await genesis(owner,history.seriesId,source15.newPolicy,
  source15.externalLatestPin,history.records[0].statement);
 if(!same(externalRoot,expectedRoot))
  throw Error('I16: primer testigo no coincide con génesis externa');
 const expectedMark=await highWatermark(history,externalRoot);
 if(!exact(externalMark,['format','version','owner','seriesId','rootHash',
  'sequence','latestStatementHash','i15PinDigest'])||
  !same(externalMark,expectedMark))
  throw Error('I16: REPLAY/ROLLBACK: última marca externa no coincide');
 const distinct=new Set();
 let good=0,stale=0,invalid=0;
 for(const c of copies){
  if(c===null){invalid++;continue}
  // A label is only a logical filename; physical independence NOT proven.
  if(!c||!['A','B','C'].includes(c.slot)||distinct.has(c.slot))
   throw Error('I16: ubicación externa duplicada o inválida');
  distinct.add(c.slot);
  if(exact(c,['format','version','owner','seriesId','slot','sequence',
   'latestStatementHash','markDigest'])&&c.format===COPY&&c.version===1&&
   c.owner===owner&&c.seriesId===history.seriesId){
   if(c.sequence>expectedMark.sequence)
    throw Error('I16: copia con generación superior: marca retenida OBSOLETA');
   const expected=await anchorCopy(c.slot,externalMark);
   if(same(c,expected)){good++;continue}
   if(c.sequence<expectedMark.sequence){stale++;continue}
  }
  invalid++;
 }
 if(good<2)
  throw Error('I16: CUÓRUM DE REFERENCIAS insuficiente; no demostrar frescura');
 return Object.freeze({verified:true,owner,sequence:history.records.length,
  signedCheckpoints:total,externalCopiesMatched:good,
  missingOrInvalidCopies:invalid,staleCopies:stale,
  finalAuditCount:proof.newAuditCount,finalManifestDigest:proof.finalManifestDigest,
  anchorAssurance:'conditional-on-independent-retained-high-watermark',
  independentCustodyProven:false,authenticClockProven:false,
  immutabilityProven:false,antiReplayWithoutExternalGuardProven:false,
  noWrites:true,containsScores:false});
}
async function compareCurrent(history,package15,source15,owner,pass,rootPin,latestPin,copies,current){
 await verify(history,package15,source15,owner,pass,rootPin,latestPin,copies);
 return I15.compareCurrent(package15,source15,owner,pass,current);
}
root.MiBowlingI16Anchors=Object.freeze({FORMAT,ROOT,MARK,COPY,MAX,
 checkpoint,stHash,signBytes:bytes,genesis,highWatermark,anchorCopy,
 verify,compareCurrent});
})(window);
