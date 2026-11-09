/* MI BOWLING I21 LAB · offline inputs only, no trusted provenance assertions.
 * Claim digest missing -> same-file SHA is explicitly UNVERIFIED.
 */
(function(root){
'use strict';
const D=root.MiBowlingI21ProvenanceDoubt,$=id=>root.document.getElementById(id);
let latest=null,busy=false,revision=0;
const show=s=>{$('i21-status').textContent=s};
function controls(){
 $('i21-build').disabled=busy;$('i21-check').disabled=busy;
 $('i21-request').disabled=busy||!latest||
  latest.status!=='hold-pending-external-review';
 $('i21-download').disabled=busy||!latest;
}
function invalidate(){
 revision++;latest=null;controls();
 show('I21: referencias modificadas. El sobre anterior queda invalidado. Sin permisos.');
}
for(const id of ['i21-prior','i21-claim-A','i21-claim-B','i21-claim-C'])
 $(id).addEventListener('input',invalidate);
for(const slot of ['A','B','C'])
 $('i21-file-'+slot).addEventListener('change',invalidate);
async function read(id,optional=false,max=9*1024*1024){
 const f=$(id).files?.[0];
 if(!f){if(optional)return null;throw Error('I21: archivo no seleccionado: '+id)}
 if(!f.size||f.size>max)throw Error('I21: tamaño de archivo inválido: '+id);
 try{return JSON.parse(await f.text())}
 catch(_){throw Error('I21: archivo JSON malformado: '+id)}
}
async function collect(){
 const bundles=[];
 for(const slot of ['A','B','C']){
  const packet=await read('i21-file-'+slot,true);
  if(packet===null){bundles.push(null);continue}
  // This SHA is a claim from an unverified file, even when it matches.
  const digest=$('i21-claim-'+slot).value.trim()||packet.packetDigest;
  bundles.push({slot,packet,claim:{
   format:D.CLAIM,version:1,slot,digest,origin:'unverified-file'
  }});
 }
 return bundles;
}
async function build(){
 const currentRevision=revision,bundles=await collect();
 const prior=$('i21-prior').value.trim()||null;
 const p=await D.prepare(bundles,prior);
 await D.verify(p);
 if(currentRevision!==revision)
  throw Error('I21: documentos cambiados durante la comprobación');
 latest=p;controls();
 show('I21 · EVIDENCIAS RETENIDAS · '+p.classification.toUpperCase()+
  '\n'+p.guidance+
  '\nA/B/C: '+p.evidence.map(e=>e.slot+' '+e.state).join(' · ')+
  '\nHuella calculada: '+p.digest+
  '\nNO se acredita procedencia, identidad, tiempo, inmutabilidad ni permiso.');
 return p;
}
async function request(){
 if(!latest)throw Error('I21: primero hay que evaluar las fuentes');
 latest=await D.requestReview(latest);controls();
 show('I21 · REVISIÓN EXTERNA ANOTADA, NO ENVIADA'+
  '\n'+latest.classification+' · '+latest.digest+
  '\nNo existe aprobación ni contacto con revisores reales.');
 return latest;
}
function download(){
 if(!latest)throw Error('I21: sobre no preparado');
 const url=URL.createObjectURL(new Blob([JSON.stringify(latest,null,2)],
  {type:'application/json'}));
 try{
  const a=root.document.createElement('a');a.href=url;
  a.download='MI-BOWLING-I21-'+latest.digest.slice(0,12)+'.doubt21';
  root.document.body.appendChild(a);a.click();a.remove();
 }finally{URL.revokeObjectURL(url)}
 show('I21 · EXPORTACIÓN LOCAL EXPRESA · '+latest.classification+
  '\nHuella interna '+latest.digest+
  '\nNo prueba origen ni conservación externa.');
}
async function check(){
 const saved=await read('i21-saved',false,22*1024*1024);
 const expected=$('i21-saved-sha').value.trim()||null;
 const result=await D.verify(saved,expected);
 show('I21 · INTEGRIDAD INTERNA CORRECTA · '+result.classification+
  '\nCoincidencia con SHA externo aportado: '+
  (result.externalDigestMatched?'sí; procedencia sin acreditar':'no aportado')+
  '\nArchivos válidos: '+result.validFiles+' · ausentes: '+result.missingFiles+
  '\nSustitución conjunta NO descartada. SIN AUTORIZACIÓN.');
 return result;
}
async function guarded(fn){
 if(busy)return;busy=true;controls();show('I21: comprobación local en curso...');
 try{return await fn()}catch(e){show('I21 BLOQUEADO: '+e.message);throw e}
 finally{busy=false;controls()}
}
for(const [id,fn] of [['i21-build',build],['i21-request',request],
 ['i21-download',download],['i21-check',check]])
 $(id).addEventListener('click',()=>{guarded(fn).catch(()=>{})});
controls();
root.MiBowlingI21UI=Object.freeze({build,request,check});
})(window);
