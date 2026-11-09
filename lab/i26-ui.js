/* MI BOWLING I26 · isolated mobile import surface, no persistence/writes.
 * A change of source invalidates all results; cancellation rejects stale tasks.
 */
(function(root){
'use strict';
const P=root.MiBowlingI26BoundedImport,A=root.MiBowlingI25RetentionAudit;
const $=id=>root.document.getElementById(id);
let current=null,busy=false,revision=0,canceled=false;
const show=s=>{$('i26-status').textContent=s};
const container=$('i26-files');
for(const stage of P.STAGES){
 const block=root.document.createElement('div');block.className='stage';
 const label=root.document.createElement('label');
 label.htmlFor='i26-file-'+stage;label.textContent=stage+' · Archivo original';
 const input=root.document.createElement('input');
 input.type='file';input.id=label.htmlFor;
 input.accept='.hold18,.review19,.hold20,.doubt21,.uncert22,.gate23,.review24,.json';
 const pl=root.document.createElement('label');pl.htmlFor='i26-pin-'+stage;
 pl.textContent='SHA del archivo '+stage+' (opcional, origen no autenticado)';
 const pin=root.document.createElement('input');pin.id=pl.htmlFor;
 pin.maxLength=64;pin.spellcheck=false;
 input.addEventListener('change',invalidate);
 pin.addEventListener('input',invalidate);
 block.append(label,input,pl,pin);container.appendChild(block);
}
function buttons(){
 $('i26-start').disabled=busy;
 $('i26-cancel').disabled=!busy||canceled;
 $('i26-check').disabled=busy;
 $('i26-note').disabled=busy||!current||current.packet.status!=='audit-held';
 $('i26-export').disabled=busy||!current;
}
function reset(){
 const tbody=$('i26-matrix');tbody.replaceChildren();
 const row=root.document.createElement('tr');
 for(const s of ['Sin evaluar','No comprobado','Sin certificación']){
  const cell=root.document.createElement('td');cell.textContent=s;
  row.appendChild(cell);
 }
 tbody.appendChild(row);
}
function invalidate(){
 revision++;canceled=true;current=null;reset();buttons();
 show('I26: archivos o referencias cambiados. Resultado anterior invalidado y lectura cancelada.');
}
function render(packet){
 const tbody=$('i26-matrix');tbody.replaceChildren();
 for(const e of packet.evidence){
  const tr=root.document.createElement('tr');
  for(const s of [e.stage,e.state,
   e.normalizationObserved?'Texto UTF-8 distinto del JSON reserializado':
    'Sin diferencia de serialización observada']){
   const td=root.document.createElement('td');td.textContent=s;tr.appendChild(td);
  }
  tbody.appendChild(tr);
 }
}
function selected(){
 return P.STAGES.map(stage=>$('i26-file-'+stage).files?.[0]||null);
}
function pins(){
 return P.STAGES.map(stage=>$('i26-pin-'+stage).value.trim()||null);
}
function cancel(){
 if(busy){canceled=true;show('I26: cancelación solicitada; ninguna importación se considerará aprobada.');buttons()}
}
$('i26-cancel').addEventListener('click',cancel);
async function build(){
 const at=revision,inputs=selected(),claims=pins();
 const result=await P.analyze(inputs,claims,{
  shouldCancel:()=>canceled||at!==revision,
  onProgress:x=>{
   if(x.chunkCount%4===0||x.bytesRead===x.totalBytes)
    show('I26: lectura controlada '+x.bytesRead+' / '+x.totalBytes+
     ' bytes · '+x.chunkCount+' fragmentos. Sin certificación externa.');
  }
 });
 if(canceled||at!==revision)throw Error('I26: resultado obsoleto cancelado');
 current=result;render(result.packet);buttons();
 show('I26 · '+result.classification.toUpperCase()+
  '\nEtapas verificadas internamente: '+result.verifiedStageCount+'/7'+
  '\nEntrada: '+result.diagnostic.inputBytes+' bytes'+
  ' · fragmentos: '+result.diagnostic.chunks+
  ' · máximo fragmento: '+result.diagnostic.peakReadBytes+' bytes'+
  '\nMemoria RAM total NO medida; ningún custodio externo acreditado.'+
  '\nHuella del sobre I25: '+result.packet.digest);
 return result;
}
async function note(){
 if(!current)throw Error('I26: no existe sobre evaluado');
 const at=revision;
 const packet=await A.noteReview(current.packet);
 if(at!==revision||canceled)throw Error('I26: resultado invalidado');
 current={...current,packet};buttons();
 show('I26 · REVISIÓN EXTERNA ANOTADA, NO ENVIADA'+
  '\n'+packet.classification+' · '+packet.digest+
  '\nNo hay autoridad humana, almacenamiento externo ni sello temporal.');
 return current;
}
function exportFile(){
 if(!current)throw Error('I26: no existe sobre exportable');
 const data=JSON.stringify(current.packet,null,2);
 const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
 try{
  const a=root.document.createElement('a');a.href=url;
  a.download='MI-BOWLING-I25-IMPORT-I26-'+current.packet.digest.slice(0,12)+'.audit25';
  root.document.body.appendChild(a);a.click();a.remove();
 }finally{URL.revokeObjectURL(url)}
 show('I26 · DESCARGA LOCAL INICIADA POR PULSACIÓN'+
  '\nSHA del sobre: '+current.packet.digest+
  '\nLa copia exportada no acredita una fuente previa o independiente.');
}
async function readSaved(file,shouldCancel){
 if(!file||!Number.isSafeInteger(file.size)||!file.size||file.size>44*1024*1024)
  throw Error('I26: copia I25 ausente o mayor que 44 MiB');
 const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
 const parts=[],chunk=128*1024;
 for(let n=0;n<file.size;n+=chunk){
  if(shouldCancel())throw Error('I26: revisión cancelada');
  const end=Math.min(file.size,n+chunk);
  const bytes=new Uint8Array(await file.slice(n,end).arrayBuffer());
  if(bytes.length!==end-n)throw Error('I26: lectura de copia truncada');
  try{parts.push(decoder.decode(bytes,{stream:true}))}
  catch(_){throw Error('I26: copia con UTF-8 inválido')}
 }
 try{parts.push(decoder.decode())}
 catch(_){throw Error('I26: copia UTF-8 incompleta')}
 const text=parts.join('');
 if(text.charCodeAt(0)===0xFEFF)throw Error('I26: BOM no admitido');
 try{return JSON.parse(text)}
 catch(_){throw Error('I26: copia JSON malformada')}
}
async function check(){
 const at=revision,packet=await readSaved($('i26-saved').files?.[0],
  ()=>canceled||at!==revision);
 const reference=$('i26-saved-pin').value.trim()||null;
 const result=await A.verify(packet,reference);
 if(canceled||at!==revision)throw Error('I26: revisión obsoleta');
 render(packet);
 show('I26 · COPIA I25 VERIFICADA INTERNAMENTE · '+result.classification+
  '\nEtapas validadas: '+result.internallyVerifiedStages+
  ' · PIN aportado: '+(result.userProvidedDigestCompared?
   'coincidencia aritmética, origen no autenticado':'no facilitado')+
  '\nNo se acredita custodia física, humano, fecha o autoridad.');
 return result;
}
async function guarded(fn){
 if(busy)return;
 busy=true;canceled=false;buttons();
 show('I26: operación local en curso...');
 try{return await fn()}catch(e){
  current=null;reset();
  show('I26 BLOQUEADO O CANCELADO: '+e.message+
   '\nNo se conserva un resultado anterior como vigente.');
  throw e;
 }finally{busy=false;buttons()}
}
for(const [id,fn] of [['i26-start',build],['i26-note',note],
 ['i26-export',exportFile],['i26-check',check]])
 $(id).addEventListener('click',()=>{guarded(fn).catch(()=>{})});
buttons();
root.MiBowlingI26UI=Object.freeze({build,cancel,check});
})(window);
