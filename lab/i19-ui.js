/* MI BOWLING I19 · file-only manual review UI, no application writes. */
(function(root){
'use strict';
const V=root.MiBowlingI19ManualReview,$=id=>root.document.getElementById(id);
let current=null,dossier=null,pin=null,busy=false;
const status=s=>{$('i19-status').textContent=s};
function controls(){
 $('i19-record').disabled=busy||!current||current.status!=='review-open';
 $('i19-escalate').disabled=busy||!current||current.status!=='review-open'||
  current.events.length<2;
 $('i19-download').disabled=busy||!current;
 $('i19-prepare').disabled=busy;$('i19-verify').disabled=busy;
}
function invalidate(){
 current=null;dossier=null;pin=null;controls();
 status('I19: fuente I18 o SHA cambiada. Comienza una nueva comprobación; no se reutiliza la revisión previa.');
}
$('i19-dossier').addEventListener('change',invalidate);
$('i19-pin').addEventListener('input',invalidate);
async function read(id,cap=6*1024*1024){
 const f=$(id).files?.[0];if(!f||!f.size||f.size>cap)
  throw Error('I19: archivo de revisión ausente o excesivo: '+id);
 try{return JSON.parse(await f.text())}
 catch(_){throw Error('I19: JSON inválido: '+id)}
}
function sourcePin(){return $('i19-pin').value.trim()||null}
async function prepare(){
 const d=await read('i19-dossier'),p=sourcePin();
 const r=await V.prepare(d,p);await V.verify(r,d,p);
 dossier=d;pin=p;current=r;controls();
 status('I19 · REVISIÓN ABIERTA · fuente '+d.decision+
  '\nRegistro '+r.reviewDigest+
  '\nAncla externa '+(p?'aportada para contraste, no acredita custodia':'NO aportada')+
  '\nSin autoridad ni validación de independencia humana.');
 return r;
}
async function record(){
 if(!current||!dossier)throw Error('I19: no hay revisión abierta');
 const r=await V.record(current,dossier,pin,$('i19-reviewer').value,
  $('i19-assessment').value,$('i19-basis').value);
 current=r;controls();
 status('I19 · OBSERVACIÓN REGISTRADA · '+r.events.length+
  ' alias · '+r.events.at(-1).reviewer+
  '\nHuella '+r.reviewDigest+
  '\nSolo etiquetas lógicas, sin firma humana ni validación de custodia.');
 return r;
}
async function escalate(){
 if(!current||!dossier)throw Error('I19: revisión inicial ausente');
 const r=await V.escalate(current,dossier,pin);
 current=r;controls();
 status('I19 · ESCALADA MANUAL PENDIENTE · '+r.events.at(-1).assessment+
  '\nRegistro '+r.reviewDigest+
  '\nNo se ha aprobado, restaurado ni publicado ninguna evidencia.');
 return r;
}
function download(){
 if(!current)throw Error('I19: no hay revisión para exportar');
 const blob=new Blob([JSON.stringify(current,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 try{
  const a=root.document.createElement('a');a.href=url;
  a.download='MI-BOWLING-I19-'+current.caseId+'.review19';
  root.document.body.appendChild(a);a.click();a.remove();
 }finally{URL.revokeObjectURL(url)}
 status('I19 · COPIA LOCAL SOLICITADA · '+current.status+
  '\nSHA interno '+current.reviewDigest+
  '\nLa exportación no crea referencia externa auténtica por sí sola.');
}
async function checkSaved(){
 const [d,r]=await Promise.all([read('i19-dossier'),read('i19-saved')]);
 const proof=await V.verify(r,d,sourcePin());
 status('I19 · REGISTRO COMPROBADO · '+proof.status+
  '\nObservaciones: '+proof.reviewerLabels+' · pasos: '+proof.steps+
  '\nSin aprobación operativa ni garantía de identidad, custodia o tiempo.');
 return proof;
}
async function guarded(fn){
 if(busy)return;busy=true;controls();
 status('I19: verificación local en curso...');
 try{return await fn()}
 catch(err){status('I19 BLOQUEADO: '+err.message);throw err}
 finally{busy=false;controls()}
}
for(const [id,fn] of [['i19-prepare',prepare],['i19-record',record],
 ['i19-escalate',escalate],['i19-download',download],['i19-verify',checkSaved]]){
 $(id).addEventListener('click',()=>{guarded(fn).catch(()=>{})});
}
controls();
root.MiBowlingI19UI=Object.freeze({prepare,record,escalate,checkSaved});
})(window);
