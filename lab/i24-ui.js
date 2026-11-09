/* MI BOWLING I24 · browser-only, source changes invalidate in-memory results. */
(function(root){
'use strict';
const C=root.MiBowlingI24ManualCrosscheck,$=id=>root.document.getElementById(id);
let current=null,busy=false,revision=0;
const show=s=>{$('i24-status').textContent=s};
const codes=C.REQUIREMENTS,slots=['A','B','C'];
function option(value,label){
 const o=root.document.createElement('option');o.value=value;o.textContent=label;return o;
}
function control(id,options,labelText,container){
 const label=root.document.createElement('label');label.htmlFor=id;label.textContent=labelText;
 const select=root.document.createElement('select');select.id=id;
 for(const [value,text] of options)select.appendChild(option(value,text));
 container.appendChild(label);container.appendChild(select);
 select.addEventListener('change',invalidate);return select;
}
const axes=$('i24-axes');
for(let i=0;i<codes.length;i++){
 const panel=root.document.createElement('div');panel.className='axis';
 const head=root.document.createElement('h3');head.textContent=(i+1)+'. '+codes[i];panel.appendChild(head);
 const cols=root.document.createElement('div');cols.className='slot-grid';
 for(const slot of slots){
  const cell=root.document.createElement('div');
  control('i24-'+slot.toLowerCase()+'-'+i,[
   ['none','Sin declaración'],['claimed-match','Declara que coincide'],
   ['claimed-conflict','Declara discrepancia'],['unresolved','No puede determinarse']
  ],'Posición '+slot+' (no verificada)',cell);
  cols.appendChild(cell);
 }
 panel.appendChild(cols);
 const ref=root.document.createElement('input');
 ref.id='i24-ref-'+i;ref.maxLength=64;ref.spellcheck=false;
 const label=root.document.createElement('label');label.htmlFor=ref.id;
 label.textContent='SHA mencionado para este requisito, opcional y no autenticado';
 panel.appendChild(label);panel.appendChild(ref);ref.addEventListener('input',invalidate);
 control('i24-origin-'+i,[
  ['unknown','Origen desconocido'],['same-document','Del mismo documento'],
  ['claimed-independent','Supuestamente independiente']
 ],'Origen declarado (no probado)',panel);
 axes.appendChild(panel);
}
function buttons(){
 $('i24-build').disabled=busy;$('i24-check').disabled=busy;
 $('i24-note').disabled=busy||!current||current.status!=='manual-assessment-held';
 $('i24-export').disabled=busy||!current;
}
function resetTable(){
 const tbody=$('i24-matrix');tbody.replaceChildren();
 const row=root.document.createElement('tr');
 for(const value of ['Pendiente','No evaluado','No acreditado']){
  const td=root.document.createElement('td');td.textContent=value;row.appendChild(td);
 }
 tbody.appendChild(row);
}
function invalidate(){
 revision++;current=null;buttons();resetTable();
 show('I24: declaraciones o fuentes cambiadas. Resultado anterior invalidado; sin permiso.');
}
$('i24-source').addEventListener('change',invalidate);
$('i24-source-pin').addEventListener('input',invalidate);
function render(list){
 const tbody=$('i24-matrix');tbody.replaceChildren();
 for(const r of list){
  const tr=root.document.createElement('tr');
  for(const v of [r.code,r.diagnosis,r.status]){
   const td=root.document.createElement('td');td.textContent=v;tr.appendChild(td);
  }
  tbody.appendChild(tr);
 }
}
async function read(id,optional=false,limit=24*1024*1024){
 const f=$(id).files?.[0];
 if(!f){if(optional)return null;throw Error('I24: archivo sin seleccionar: '+id)}
 if(!f.size||f.size>limit)throw Error('I24: archivo vacío o demasiado grande: '+id);
 try{return JSON.parse(await f.text())}
 catch(_){throw Error('I24: JSON malformado: '+id)}
}
async function collect(){
 const source=await read('i24-source');
 const sourcePin=$('i24-source-pin').value.trim()||null;
 const sheets=codes.map((code,i)=>{
  const ref=$('i24-ref-'+i).value.trim()||null;
  const origin=$('i24-origin-'+i).value;
  const claims=slots.map(slot=>{
   const verdict=$('i24-'+slot.toLowerCase()+'-'+i).value;
   return verdict==='none'?null:{slot,verdict,referenceDigest:ref,origin};
  });
  return {code,claims};
 });
 return{source,sourcePin,sheets};
}
async function build(){
 const stamp=revision,{source,sourcePin,sheets}=await collect();
 const output=await C.prepare(source,sourcePin,sheets);
 await C.verify(output);
 if(stamp!==revision)throw Error('I24: sources changed during analysis');
 current=output;render(output.requirements);buttons();
 show('I24 · CONSERVACIÓN LOCAL · '+output.classification.toUpperCase()+
  '\nEvaluación de seis requisitos; acreditados externamente 0/6'+
  '\nEstados: '+output.requirements.map(x=>x.code+' '+x.diagnosis).join(' · ')+
  '\nHuella '+output.digest+
  '\nSin custodia, identidad, sello temporal, inmutabilidad ni autorización reales.');
 return output;
}
async function note(){
 if(!current)throw Error('I24: no evidence evaluated');
 current=await C.noteOutsideReview(current);buttons();
 show('I24 · REVISIÓN EXTERNA ANOTADA LOCALMENTE, NO ENVIADA'+
  '\n'+current.classification+' · '+current.digest+
  '\n0/6 pruebas externas; no se ha contactado a nadie ni aprobado restauración.');
 return current;
}
function download(){
 if(!current)throw Error('I24: no envelope to export');
 const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],
  {type:'application/json'}));
 try{
  const a=root.document.createElement('a');a.href=url;
  a.download='MI-BOWLING-I24-'+current.digest.slice(0,12)+'.review24';
  root.document.body.appendChild(a);a.click();a.remove();
 }finally{URL.revokeObjectURL(url)}
 show('I24 · DESCARGA LOCAL INICIADA POR PULSACIÓN'+
  '\nSHA interno '+current.digest+
  '\nLa descarga no acredita almacenamiento externo.');
}
async function check(){
 const packet=await read('i24-saved',false,42*1024*1024);
 const pin=$('i24-saved-pin').value.trim()||null;
 const v=await C.verify(packet,pin);render(packet.requirements);
 show('I24 · INTEGRIDAD INTERNA COMPROBADA · '+v.classification+
  '\nRequisitos externos acreditados: 0/6'+
  '\nHuella aportada '+(v.externalDigestMatched?'coincide, procedencia no acreditada':'no aportada')+
  '\nSin autoridad; sustitución conjunta no descartada.');
 return v;
}
async function guarded(fn){
 if(busy)return;busy=true;buttons();show('I24: verificando copias A/B/C...');
 try{return await fn()}catch(e){show('I24 BLOQUEADO: '+e.message);throw e}
 finally{busy=false;buttons()}
}
for(const [id,fn] of [['i24-build',build],['i24-note',note],
 ['i24-export',download],['i24-check',check]])
 $(id).addEventListener('click',()=>{guarded(fn).catch(()=>{})});
buttons();
root.MiBowlingI24UI=Object.freeze({build,note,check});
})(window);
