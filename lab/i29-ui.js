/* MI BOWLING I29 · isolated, no persistent or external state.
 * Profile budgets do not claim total RAM caps or physical iPhone validation.
 */
(function(root){
'use strict';
const Session=root.MiBowlingI29SessionGuard;
if(!Session)throw Error('I29: session controller required');
const session=Session.createSession();
const $=id=>root.document.getElementById(id),stageNames=['I18','I19','I20','I21','I22','I23','I24'];
let current=null,busy=false,revision=0,canceled=false;
const show=text=>{$('i29-status').textContent=text};
const box=$('i29-files');
for(const stage of stageNames){
 const item=root.document.createElement('div');item.className='stage';
 const label=root.document.createElement('label');label.htmlFor='i29-file-'+stage;
 label.textContent=stage+' · Archivo UTF-8 original o ausencia';
 const file=root.document.createElement('input');file.id=label.htmlFor;
 file.type='file';file.accept='.json,.hold18,.review19,.hold20,.doubt21,.uncert22,.gate23,.review24';
 const pinLabel=root.document.createElement('label');pinLabel.htmlFor='i29-pin-'+stage;
 pinLabel.textContent='SHA aportado '+stage+' (opcional, no autenticado)';
 const pin=root.document.createElement('input');pin.id=pinLabel.htmlFor;
 pin.maxLength=64;pin.spellcheck=false;
 file.addEventListener('change',invalidate);
 pin.addEventListener('input',invalidate);
 item.append(label,file,pinLabel,pin);box.appendChild(item);
}
function buttons(){
 $('i29-run').disabled=busy;
 $('i29-profile').disabled=busy;
 $('i29-cancel').disabled=!busy||canceled;
 $('i29-export').disabled=busy||!current;
}
function clearRows(){
 const tbody=$('i29-matrix');tbody.replaceChildren();
 const row=root.document.createElement('tr');
 for(const s of ['Sin evaluar','No verificado','No acreditado']){
  const td=root.document.createElement('td');td.textContent=s;row.appendChild(td);
 }
 tbody.appendChild(row);
}
function invalidate(){
 session.cancel();revision++;canceled=true;current=null;
 clearRows();buttons();
 show('I29: entradas o perfil modificados, cálculo anterior invalidado. Sin autorización.');
}
$('i29-profile').addEventListener('change',invalidate);
$('i29-clear').addEventListener('click',()=>{
 session.cancel();revision++;canceled=true;current=null;clearRows();buttons();
 show('I29: informe local descartado. Los archivos seleccionados no se han alterado.');
});
$('i29-cancel').addEventListener('click',()=>{
 if(!busy)return;
 session.cancel();canceled=true;current=null;buttons();
 show('I29: cancelación solicitada. No hay resultados disponibles.');
});
function render(packet){
 const tbody=$('i29-matrix');tbody.replaceChildren();
 for(const e of packet.evidence){
  const tr=root.document.createElement('tr');
  for(const str of [e.stage,e.state,
   e.normalizationObserved?'Texto distinto del JSON reserializado':'Sin diferencia observada']){
   const td=root.document.createElement('td');td.textContent=str;tr.appendChild(td);
  }
  tbody.appendChild(tr);
 }
}
async function analyze(){
 const at=revision,files=stageNames.map(s=>$('i29-file-'+s).files?.[0]||null),
  pins=stageNames.map(s=>$('i29-pin-'+s).value.trim()||null),
  profile=$('i29-profile').value;
 const result=await session.run(files,pins,{
  profile,now:()=>root.performance.now(),shouldCancel:()=>canceled||at!==revision,
  onProgress:x=>{
   if(x.chunkCount%8===0||x.bytesRead===x.totalBytes)
    show('I29 · '+profile+' · '+x.bytesRead+' / '+x.totalBytes+
     ' bytes importados. RAM no medida; custodia no acreditada.');
  }
 });
 if(canceled||at!==revision)throw Error('I29: resultado obsoleto cancelado');
 current=result;render(result.packet);buttons();
 const r=result.report;
 show('I29 · '+result.classification.toUpperCase()+
  '\nPerfil '+r.profile+' · datos de entrada '+r.sourceBytes+' bytes'+
  '\nLecturas '+r.inputChunks+' · máximo fragmento '+r.maxReadChunkBytes+' bytes'+
  '\nTiempo observado local: '+r.observedElapsedMs.toFixed(2)+' ms'+
  '\nMemoria RAM: NO MEDIDA en este navegador; pico real DESCONOCIDO'+
  '\nInspección única I25 para sobre nuevo y revisión de sesión para cancelar; I25.verify sigue obligatorio al importar sobre externo. Sin permiso, custodia ni iPhone físico acreditados.'+
  '\nSHA del expediente '+result.packet.digest);
 return result;
}
function exportResult(){
 if(!current)throw Error('I29: no existe expediente válido para exportar');
 const packet=current.packet;
 const url=URL.createObjectURL(new Blob([JSON.stringify(packet,null,2)],
  {type:'application/json'}));
 try{
  const a=root.document.createElement('a');a.href=url;
  a.download='MI-BOWLING-I29-PERFIL-'+packet.digest.slice(0,12)+'.audit25';
  root.document.body.appendChild(a);a.click();a.remove();
 }finally{URL.revokeObjectURL(url)}
 show('I29 · DESCARGA LOCAL SOLICITADA · '+current.report.profile+
  '\n'+packet.digest+
  '\nNo certifica memoria máxima, procedencia ni conservación externa.');
}
async function guarded(fn){
 if(busy)return;
 busy=true;canceled=false;buttons();
 show('I29: importación y observación locales en curso...');
 try{return await fn()}
 catch(e){
  current=null;clearRows();
  show('I29 BLOQUEADO O CANCELADO: '+e.message+
   '\nNo se mantiene un resultado anterior como válido.');
  throw e;
 }finally{busy=false;buttons()}
}
$('i29-run').addEventListener('click',()=>{guarded(analyze).catch(()=>{})});
$('i29-export').addEventListener('click',()=>{guarded(exportResult).catch(()=>{})});
buttons();
root.MiBowlingI29UI=Object.freeze({analyze});
})(window);
