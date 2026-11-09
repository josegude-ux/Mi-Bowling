/* MI BOWLING I20 · local-only divergent-review file triage.
 * Source changes invalidate the cached packet. Exports require a direct click.
 */
(function(root){
'use strict';
const P=root.MiBowlingI20RivalReviews,$=id=>root.document.getElementById(id);
let current=null,busy=false,revision=0;
const status=s=>{$('i20-status').textContent=s};
function controls(){
 $('i20-build').disabled=busy;$('i20-check').disabled=busy;
 $('i20-request').disabled=busy||!current||current.status!=='quarantine-held';
 $('i20-download').disabled=busy||!current;
}
function invalidate(){
 revision++;current=null;controls();
 status('I20: entradas modificadas; el resultado anterior no se puede reutilizar. Sin autorización operativa.');
}
for(const id of ['i20-dossier','i20-claim-A','i20-claim-B','i20-claim-C'])
 $(id).addEventListener('change',invalidate);
$('i20-i18-pin').addEventListener('input',invalidate);
async function read(id,optional=false,limit=9*1024*1024){
 const file=$(id).files?.[0];if(!file){
  if(optional)return null;
  throw Error('I20: documento obligatorio ausente: '+id);
 }
 if(!file.size||file.size>limit)throw Error('I20: tamaño inválido: '+id);
 try{return JSON.parse(await file.text())}
 catch(_){throw Error('I20: JSON malformado: '+id)}
}
async function build(){
 const t=revision,source=await read('i20-dossier',false,7*1024*1024);
 const claims=await Promise.all(['A','B','C'].map(async slot=>{
  const x=await read('i20-claim-'+slot,true,5*1024*1024);
  return x===null?null:{slot,review:x};
 }));
 const pin=$('i20-i18-pin').value.trim()||null;
 const packet=await P.prepare(source,pin,claims);
 await P.verify(packet);
 if(t!==revision)throw Error('I20: fuentes modificadas durante la verificación');
 current=packet;controls();
 status('I20 · PAQUETE RETENIDO · '+packet.classification.toUpperCase()+
  '\n'+packet.instructions+
  '\nPosiciones: '+packet.evidence.map(e=>e.slot+'='+e.classification).join(', ')+
  '\nHuella interna no autenticada: '+packet.packetDigest+
  '\nNo demuestra custodios, frescura, tiempo ni autoridad.');
 return packet;
}
async function request(){
 if(!current)throw Error('I20: paquete de contraste ausente');
 current=await P.requestExternalReview(current);controls();
 status('I20 · REVISIÓN EXTERNA SOLICITADA EN EL REGISTRO LOCAL, NO ENVIADA'+
  '\n'+current.classification+' · '+current.packetDigest+
  '\nNo se ha contactado a nadie ni se ha concedido autorización de restauración.');
 return current;
}
function download(){
 if(!current)throw Error('I20: no hay paquete verificado');
 const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],
  {type:'application/json'}));
 try{
  const a=root.document.createElement('a');
  a.href=url;a.download='MI-BOWLING-I20-'+current.caseId+'.hold20';
  root.document.body.appendChild(a);a.click();a.remove();
 }finally{URL.revokeObjectURL(url)}
 status('I20 · EXPORTACIÓN LOCAL INICIADA POR SOLICITUD'+
  '\nHuella calculada: '+current.packetDigest+
  '\nEl archivo y su hash no prueban custodia ni almacenamiento inmutable.');
}
async function check(){
 const packet=await read('i20-saved',false,15*1024*1024);
 const pin=$('i20-pin').value.trim()||null;
 const result=await P.verify(packet,pin);
 status('I20 · PAQUETE INTERNAMENTE COHERENTE · '+result.classification+
  '\nReferencia externa: '+(result.evidenceDigestMatched?
    'comparación correcta con SHA aportado':'no aportada')+
  '\nArchivos lógicos válidos: '+result.validLogicalFiles+
  ' · faltantes: '+result.missingLogicalFiles+
  '\nSIN AUTORIZACIÓN OPERATIVA, SIN PRUEBA DE CUSTODIA O INMUTABILIDAD.');
 return result;
}
async function guarded(fn){
 if(busy)return;busy=true;controls();status('I20: verificación local en curso...');
 try{return await fn()}
 catch(e){status('I20 BLOQUEADO: '+e.message);throw e}
 finally{busy=false;controls()}
}
for(const [id,cb] of [['i20-build',build],['i20-request',request],
 ['i20-download',download],['i20-check',check]]){
 $(id).addEventListener('click',()=>{guarded(cb).catch(()=>{})});
}
controls();
root.MiBowlingI20UI=Object.freeze({build,request,check});
})(window);
