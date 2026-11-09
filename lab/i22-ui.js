/* MI BOWLING I22 · browser UI; all input files are untrusted and local.
 * No network, account, operational writes, or signing key storage.
 */
(function(root){
'use strict';
const U=root.MiBowlingI22Uncertainty,$=id=>root.document.getElementById(id);
let current=null,busy=false,revision=0;
const show=x=>{$('i22-status').textContent=x};
function controls(){
 $('i22-build').disabled=busy;$('i22-check').disabled=busy;
 $('i22-request').disabled=busy||!current||
  current.status!=='held-for-independent-review';
 $('i22-download').disabled=busy||!current;
}
function emptyMatrix(){
 const tbody=$('i22-matrix');tbody.replaceChildren();
 const tr=root.document.createElement('tr');
 for(const cell of ['Sin evaluar','No acreditado','A/B/C no verificados']){
  const td=root.document.createElement('td');td.textContent=cell;tr.appendChild(td);
 }
 tbody.appendChild(tr);
}
function invalidate(){
 revision++;current=null;controls();emptyMatrix();
 show('I22: se modificaron las fuentes o declaraciones. Resultado anterior invalidado. Sin permisos.');
}
for(const id of ['i22-source','i22-file-A','i22-file-B','i22-file-C'])
 $(id).addEventListener('change',invalidate);
for(const id of ['i22-source-digest','i22-sha-A','i22-sha-B','i22-sha-C'])
 $(id).addEventListener('input',invalidate);
for(const id of ['i22-origin-A','i22-origin-B','i22-origin-C'])
 $(id).addEventListener('change',invalidate);
async function read(id,optional=false,max=18*1024*1024){
 const file=$(id).files?.[0];
 if(!file){if(optional)return null;throw Error('I22: archivo obligatorio ausente: '+id)}
 if(!file.size||file.size>max)throw Error('I22: archivo demasiado grande o vacío: '+id);
 try{return JSON.parse(await file.text())}
 catch(_){throw Error('I22: documento JSON inválido: '+id)}
}
function render(matrix){
 const tbody=$('i22-matrix');tbody.replaceChildren();
 for(const value of matrix){
  const tr=root.document.createElement('tr');
  for(const s of [value.axis,value.status,value.note]){
   const td=root.document.createElement('td');td.textContent=s;tr.appendChild(td);
  }
  tbody.appendChild(tr);
 }
}
async function collect(){
 const source=await read('i22-source');
 const pin=$('i22-source-digest').value.trim()||null;
 const offers=[];
 for(const slot of ['A','B','C']){
  const file=await read('i22-file-'+slot,true);
  if(file===null){offers.push(null);continue}
  const typed=$('i22-sha-'+slot).value.trim();
  offers.push({slot,caseFile:file,
   claimedDigest:typed||file.digest,
   // A hash computed from the file is always from the SAME file.
   origin:typed?$('i22-origin-'+slot).value:'same-file'});
 }
 return {source,pin,offers};
}
async function build(){
 const expectedRevision=revision,{source,pin,offers}=await collect();
 const p=await U.prepare(source,pin,offers);
 await U.verify(p);
 if(expectedRevision!==revision)
  throw Error('I22: entradas cambiadas durante la comprobación');
 current=p;render(p.matrix);controls();
 show('I22 · COPIAS RETENIDAS · '+p.classification.toUpperCase()+
  '\n'+p.nextAction+
  '\nEstados A/B/C: '+p.evidence.map(x=>x.slot+' '+x.internalState).join(' · ')+
  '\nSHA interno '+p.digest+
  '\nNo se acredita custodia humana, fecha, inmutabilidad ni autorización.');
 return p;
}
async function request(){
 if(!current)throw Error('I22: no existe evaluación conservada');
 current=await U.requestExternalReview(current);
 controls();
 show('I22 · SOLICITUD DE REVISIÓN EXTERNA ANOTADA, NO ENVIADA'+
  '\n'+current.classification+' · '+current.digest+
  '\nSin aprobación operativa ni comunicación externa.');
 return current;
}
function download(){
 if(!current)throw Error('I22: no existe sobre para exportar');
 const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],
  {type:'application/json'}));
 try{
  const a=root.document.createElement('a');a.href=url;
  a.download='MI-BOWLING-I22-'+current.digest.slice(0,12)+'.uncert22';
  root.document.body.appendChild(a);a.click();a.remove();
 }finally{URL.revokeObjectURL(url)}
 show('I22 · EXPORTACIÓN SOLICITADA · '+current.classification+
  '\nSHA interno '+current.digest+
  '\nLa descarga no acredita custodia externa.');
}
async function check(){
 const p=await read('i22-saved',false,42*1024*1024);
 const supplied=$('i22-saved-digest').value.trim()||null;
 const result=await U.verify(p,supplied);
 render(p.matrix);
 show('I22 · INTEGRIDAD INTERNA COMPROBADA · '+result.classification+
  '\nPosiciones presentes '+result.present+
  ' · coherentes internamente '+result.internallyConsistent+
  '\nSHA declarado del sobre '+(result.externalDigestMatched?
    'coincide (sin origen acreditado)':'no aportado')+
  '\nCustodia/independencia NO demostradas. SIN AUTORIZACIÓN.');
 return result;
}
async function guarded(fn){
 if(busy)return;
 busy=true;controls();show('I22: análisis local en curso...');
 try{return await fn()}catch(e){show('I22 BLOQUEADO: '+e.message);throw e}
 finally{busy=false;controls()}
}
for(const [id,fn] of [['i22-build',build],['i22-request',request],
 ['i22-download',download],['i22-check',check]])
 $(id).addEventListener('click',()=>{guarded(fn).catch(()=>{})});
controls();
root.MiBowlingI22UI=Object.freeze({build,request,check});
})(window);
