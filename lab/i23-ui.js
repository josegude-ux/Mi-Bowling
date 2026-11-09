/* MI BOWLING I23 · isolated file-only frontend, no trust promotion.
 * Changing a source invalidates the previous comparison; export explicit.
 */
(function(root){
'use strict';
const G=root.MiBowlingI23ExternalEvidence,$=id=>root.document.getElementById(id);
let current=null,busy=false,revision=0;
const status=s=>{$('i23-status').textContent=s};
function controls(){
 $('i23-build').disabled=busy;$('i23-check').disabled=busy;
 $('i23-review').disabled=busy||!current||
  current.status!=='hold-unverified-external-custody';
 $('i23-download').disabled=busy||!current;
}
function noProofTable(){
 const body=$('i23-requirements');body.replaceChildren();
 const row=root.document.createElement('tr');
 for(const x of ['Pendiente de lectura','No se ha comprobado']){
  const td=root.document.createElement('td');td.textContent=x;row.appendChild(td);
 }
 body.appendChild(row);
}
function render(list){
 const body=$('i23-requirements');body.replaceChildren();
 for(const r of list){
  const tr=root.document.createElement('tr');
  for(const str of [r.needed,r.status]){
   const td=root.document.createElement('td');td.textContent=str;
   tr.appendChild(td);
  }
  body.appendChild(tr);
 }
}
function invalidate(){
 revision++;current=null;controls();noProofTable();
 status('I23: entrada o afirmación modificada. Dossier anterior invalidado. Sin autorización.');
}
for(const x of ['i23-base','i23-file-A','i23-file-B','i23-file-C'])
 $(x).addEventListener('change',invalidate);
for(const x of ['i23-base-pin','i23-sha-A','i23-sha-B','i23-sha-C',
 'i23-group-A','i23-group-B','i23-group-C'])
 $(x).addEventListener('input',invalidate);
for(const x of ['i23-origin-A','i23-origin-B','i23-origin-C',
 'i23-before-A','i23-before-B','i23-before-C'])
 $(x).addEventListener('change',invalidate);
async function read(id,optional=false,limit=18*1024*1024){
 const f=$(id).files?.[0];
 if(!f){if(optional)return null;throw Error('I23: documento obligatorio no seleccionado: '+id)}
 if(!f.size||f.size>limit)throw Error('I23: archivo vacío o excesivo: '+id);
 try{return JSON.parse(await f.text())}
 catch(_){throw Error('I23: JSON incorrecto: '+id)}
}
async function collect(){
 const baseline=await read('i23-base');
 const pin=$('i23-base-pin').value.trim()||null;
 const records=[];
 for(const slot of ['A','B','C']){
  const packet=await read('i23-file-'+slot,true);
  if(packet===null){records.push(null);continue}
  const typed=$('i23-sha-'+slot).value.trim();
  records.push({
   slot,packet,
   claim:{format:G.RECEIPT,version:1,slot,
    packetDigest:typed||packet.digest,
    // A hash taken from the SAME file cannot be marked externally preserved.
    origin:typed?$('i23-origin-'+slot).value:'self-export',
    retentionGroup:$('i23-group-'+slot).value.trim(),
    preIncidentClaimed:$('i23-before-'+slot).checked,reviewerAlias:slot}
  });
 }
 return{baseline,pin,records};
}
async function build(){
 const start=revision,{baseline,pin,records}=await collect();
 const p=await G.prepare(baseline,pin,records);
 await G.verify(p);
 if(start!==revision)throw Error('I23: archivos cambiados durante análisis');
 current=p;render(p.requirements);controls();
 status('I23 · RETENCIÓN SEGURA · '+p.classification.toUpperCase()+
  '\n'+p.recommendation+
  '\nA/B/C: '+p.evidence.map(x=>x.slot+' '+x.state).join(' · ')+
  '\nRequisitos externos acreditados: 0/'+p.requirements.length+
  '\nSHA calculado '+p.digest+
  '\nNo hay prueba de custodia física, autoría, fecha ni autoridad.');
 return p;
}
async function note(){
 if(!current)throw Error('I23: no existe dossier listo');
 current=await G.noteExternalReview(current);controls();
 status('I23 · REVISIÓN EXTERNA ANOTADA LOCALMENTE, NO ENVIADA'+
  '\n'+current.classification+' · '+current.digest+
  '\nNo se ha contactado a nadie, ni concedido permiso, ni generado nueva raíz.');
 return current;
}
function download(){
 if(!current)throw Error('I23: sobre no preparado');
 const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],
  {type:'application/json'}));
 try{
  const a=root.document.createElement('a');a.href=url;
  a.download='MI-BOWLING-I23-'+current.digest.slice(0,12)+'.gate23';
  root.document.body.appendChild(a);a.click();a.remove();
 }finally{URL.revokeObjectURL(url)}
 status('I23 · EXPORTACIÓN LOCAL SOLICITADA · '+current.classification+
  '\nHuella '+current.digest+
  '\nNo prueba que el sobre se haya custodiado en otro medio.');
}
async function check(){
 const saved=await read('i23-saved',false,42*1024*1024);
 const pin=$('i23-saved-pin').value.trim()||null;
 const result=await G.verify(saved,pin);
 render(saved.requirements);
 status('I23 · ESTRUCTURA INTERNA COMPROBADA · '+result.classification+
  '\nReferencias lógicas coincidentes '+result.validLogicalClaims+
  ' · externas acreditadas '+result.satisfiedExternalRequirements+
  '\nPIN aportado '+(result.externalDigestMatched?'coincide, origen sin acreditar':'no aportado')+
  '\nSustitución conjunta NO descartada. SIN AUTORIZACIÓN.');
 return result;
}
async function guarded(fn){
 if(busy)return;busy=true;controls();status('I23: comparación local en curso...');
 try{return await fn()}catch(e){status('I23 BLOQUEADO: '+e.message);throw e}
 finally{busy=false;controls()}
}
for(const [id,fn] of [['i23-build',build],['i23-review',note],
 ['i23-download',download],['i23-check',check]])
 $(id).addEventListener('click',()=>{guarded(fn).catch(()=>{})});
controls();
root.MiBowlingI23UI=Object.freeze({build,note,check});
})(window);
