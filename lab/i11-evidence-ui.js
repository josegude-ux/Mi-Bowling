/* MI BOWLING · I11 LAB · offline-only encrypted evidence controls. */
(function(root){
'use strict';
const $=id=>root.document.getElementById(id);
const msg=text=>{$('lab-i11-evidence-status').textContent=text};
function pass(){
 const p=$('lab-i11-evidence-pass').value;
 if(typeof p!=='string'||p.length<12||p.length>256)
  throw Error('Frase exclusiva ficticia de evidencias: 12 a 256 caracteres');
 return p;
}
async function selected(){
 const f=$('lab-i11-evidence-file').files?.[0];
 if(!f||!/\.(mae11|json)$/i.test(f.name))throw Error('Archivo de evidencia .mae11 requerido');
 if(f.size>root.MiBowlingI11Evidence.MAX*2)throw Error('Evidencia excesivamente grande');
 return f.text();
}
async function check(){
 const chain=await root.MiBowlingIntegrationI11.restoreAudit();
 msg('I11: cadena VERIFICADA · '+chain.count+' recibos cifrados ('+
  chain.receipts.filter(e=>e.kind==='restore').length+' restauraciones, '+
  chain.receipts.filter(e=>e.kind==='conflict').length+' rechazos), ancla '+
  chain.headHash.slice(0,16)+'…. Esta ancla local NO sustituye el archivo externo.');
 return chain;
}
async function download(){
 const encrypted=await root.MiBowlingIntegrationI11.exportEvidence(pass());
 const url=URL.createObjectURL(new Blob([encrypted],{type:'application/json'}));
 try{
  const a=root.document.createElement('a');a.href=url;
  a.download='mi-bowling-lab-i11-evidencia-cifrada.mae11';
  root.document.body.appendChild(a);a.click();a.remove();
 }finally{root.setTimeout(()=>URL.revokeObjectURL(url),2500)}
 msg('I11: evidencia independiente cifrada descargada. Guarda el archivo fuera del navegador; la frase no se almacena.');
 return encrypted.length;
}
async function preview(){
 const outcome=await root.MiBowlingIntegrationI11.previewEvidence(await selected(),pass());
 msg('I11: EVIDENCIA SIN ESCRITURA · '+outcome.verdict+' · '+outcome.localCount+
  ' eventos locales, '+outcome.sourceCount+' en archivo; nuevo(s) '+outcome.newEvents+
  '. No contiene puntuaciones.');
 return outcome;
}
async function restore(){
 if(!$('lab-i11-evidence-consent').checked)
  throw Error('Marca consentimiento específico de evidencias ficticias');
 const result=await root.MiBowlingIntegrationI11.restoreEvidence(
  await selected(),pass(),'CONFIRMAR-EVIDENCIA-FICTICIA');
 msg('I11: '+result.status+' · '+result.eventsAdded+' recibos verificados recuperados, '+
  result.count+' en total. Confirmados/WAL NO modificados. Recarga para revalidar cadena.');
 return result;
}
const handlers=[['lab-i11-chain-check',check],
 ['lab-i11-evidence-download',download],['lab-i11-evidence-preview',preview],
 ['lab-i11-evidence-import',restore]];
for(const [id,fn] of handlers)
 $(id).addEventListener('click',()=>fn().catch(error=>msg('I11 BLOQUEADO: '+error.message)));
root.MiBowlingI11EvidenceUI=Object.freeze({check,download,preview,restore});
})(window);
