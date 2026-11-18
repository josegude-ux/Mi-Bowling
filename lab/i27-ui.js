/* MI BOWLING I27 · isolated, no persistent or external state.
 * Profile budgets do not claim total RAM caps or physical iPhone validation.
 */
(function(root){
'use strict';
const Profile=root.MiBowlingI27ResourceProfile;
const $=id=>root.document.getElementById(id),stageNames=['I18','I19','I20','I21','I22','I23','I24'];
let current=null,busy=false,revision=0,canceled=false;
const show=text=>{$('i27-status').textContent=text};
const box=$('i27-files');
for(const stage of stageNames){
 const item=root.document.createElement('div');item.className='stage';
 const label=root.document.createElement('label');label.htmlFor='i27-file-'+stage;
 label.textContent=stage+' · Archivo UTF-8 original o ausencia';
 const file=root.document.createElement('input');file.id=label.htmlFor;
 file.type='file';file.accept='.json,.hold18,.review19,.hold20,.doubt21,.uncert22,.gate23,.review24';
 const pinLabel=root.document.createElement('label');pinLabel.htmlFor='i27-pin-'+stage;
 pinLabel.textContent='SHA aportado '+stage+' (opcional, no autenticado)';
 const pin=root.document.createElement('input');pin.id=pinLabel.htmlFor;
 pin.maxLength=64;pin.spellcheck=false;
 file.addEventListener('change',invalidate);
 pin.addEventListener('input',invalidate);
 item.append(label,file,pinLabel,pin);box.appendChild(item);
}
function buttons(){
 $('i27-run').disabled=busy;
 $('i27-profile').disabled=busy;
 $('i27-cancel').disabled=!busy||canceled;
 $('i27-export').disabled=busy||!current;
}
function clearRows(){
 const tbody=$('i27-matrix');tbody.replaceChildren();
 const row=root.document.createElement('tr');
 for(const s of ['Sin evaluar','No verificado','No acreditado']){
  const td=root.document.createElement('td');td.textContent=s;row.appendChild(td);
 }
 tbody.appendChild(row);
}
function invalidate(){
 revision++;canceled=true;current=null;
 clearRows();buttons();
 show('I27: entradas o perfil modificados, cálculo anterior invalidado. Sin autorización.');
}
$('i27-profile').addEventListener('change',invalidate);
$('i27-clear').addEventListener('click',()=>{
 revision++;canceled=true;current=null;clearRows();buttons();
 show('I27: informe local descartado. Los archivos seleccionados no se han alterado.');
});
$('i27-cancel').addEventListener('click',()=>{
 if(!busy)return;
 canceled=true;current=null;buttons();
 show('I27: cancelación solicitada. No hay resultados disponibles.');
});
function render(packet){
 const tbody=$('i27-matrix');tbody.replaceChildren();
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
 const at=revision,files=stageNames.map(s=>$('i27-file-'+s).files?.[0]||null),
  pins=stageNames.map(s=>$('i27-pin-'+s).value.trim()||null),
  profile=$('i27-profile').value;
 const result=await Profile.run(files,pins,{
  profile,now:()=>root.performance.now(),shouldCancel:()=>canceled||at!==revision,
  onProgress:x=>{
   if(x.chunkCount%8===0||x.bytesRead===x.totalBytes)
    show('I27 · '+profile+' · '+x.bytesRead+' / '+x.totalBytes+
     ' bytes importados. RAM no medida; custodia no acreditada.');
  }
 });
 if(canceled||at!==revision)throw Error('I27: resultado obsoleto cancelado');
 current=result;render(result.packet);buttons();
 const r=result.report;
 show('I27 · '+result.classification.toUpperCase()+
  '\nPerfil '+r.profile+' · datos de entrada '+r.sourceBytes+' bytes'+
  '\nLecturas '+r.inputChunks+' · máximo fragmento '+r.maxReadChunkBytes+' bytes'+
  '\nTiempo observado local: '+r.observedElapsedMs.toFixed(2)+' ms'+
  '\nMemoria RAM: NO MEDIDA en este navegador; pico real DESCONOCIDO'+
  '\nVerificación I25 original conservada. Sin permiso, custodia ni iPhone físico acreditados.'+
  '\nSHA del expediente '+result.packet.digest);
 return result;
}
function exportResult(){
 if(!current)throw Error('I27: no existe expediente válido para exportar');
 const packet=current.packet;
 const url=URL.createObjectURL(new Blob([JSON.stringify(packet,null,2)],
  {type:'application/json'}));
 try{
  const a=root.document.createElement('a');a.href=url;
  a.download='MI-BOWLING-I27-PERFIL-'+packet.digest.slice(0,12)+'.audit25';
  root.document.body.appendChild(a);a.click();a.remove();
 }finally{URL.revokeObjectURL(url)}
 show('I27 · DESCARGA LOCAL SOLICITADA · '+current.report.profile+
  '\n'+packet.digest+
  '\nNo certifica memoria máxima, procedencia ni conservación externa.');
}
async function guarded(fn){
 if(busy)return;
 busy=true;canceled=false;buttons();
 show('I27: importación y observación locales en curso...');
 try{return await fn()}
 catch(e){
  current=null;clearRows();
  show('I27 BLOQUEADO O CANCELADO: '+e.message+
   '\nNo se mantiene un resultado anterior como válido.');
  throw e;
 }finally{busy=false;buttons()}
}
$('i27-run').addEventListener('click',()=>{guarded(analyze).catch(()=>{})});
$('i27-export').addEventListener('click',()=>{guarded(exportResult).catch(()=>{})});
buttons();
root.MiBowlingI27UI=Object.freeze({analyze});
})(window);
