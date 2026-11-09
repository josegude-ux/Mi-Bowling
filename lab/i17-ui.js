/* MI BOWLING I17 LAB · file-only, no network, storage, writes or signing. */
(function(root){
'use strict';
const F=root.MiBowlingI17Forensics,$=id=>root.document.getElementById(id);
const status=s=>{$('i17-status').textContent=s};
let busy=false;
async function read(id,max=22*1024*1024){
 const f=$(id).files?.[0];if(!f)return null;
 if(!f.size||f.size>max)throw Error('I17: tamaño inválido: '+id);
 try{return JSON.parse(await f.text())}
 catch(_){throw Error('I17: archivo JSON malformado: '+id)}
}
async function diagnose(){
 const [pack,source,genesis,latest,a,b,c]=await Promise.all([
  read('i17-package15'),read('i17-source15'),read('i17-root',50000),
  read('i17-latest',50000),read('i17-report-A'),read('i17-report-B'),
  read('i17-report-C')]);
 const result=await F.reconcile(pack,source,$('i17-owner').value,
  $('i17-pass').value,genesis,latest,[a,b,c]);
 const m=result.metadata;
 const short=m?
  ' · referencias firmadas '+m.validSignaturesSlots+
  ' · faltantes '+m.missing+' · incompatibles '+m.invalid+
  ' · bifurcación '+(m.forkEvidence?'sí':'no'):'';
 status('I17 · '+result.decision.toUpperCase()+' · '+
  (result.verified?'COHERENCIA CONDICIONADA':'NO AUTORIZADO')+
  short+'\n'+result.summary+'\n'+result.details+
  '\nSin demostrar custodia independiente, fecha de firma ni inmutabilidad.');
 return result;
}
$('i17-check').addEventListener('click',async()=>{
 if(busy)return;busy=true;$('i17-check').disabled=true;
 status('I17: comprobación en curso...');
 try{await diagnose()}catch(error){status('I17 BLOQUEADO: '+error.message)}
 finally{busy=false;$('i17-check').disabled=false}
});
root.MiBowlingI17UI=Object.freeze({diagnose});
})(window);
