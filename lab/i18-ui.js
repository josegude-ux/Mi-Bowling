/* MI BOWLING I18 LAB · local input/explicit download only, no app writes.
 * Never exposes password in forensic export. No storage/network access.
 */
(function(root){
'use strict';
const H=root.MiBowlingI18ForensicHold,$=id=>root.document.getElementById(id);
let last=null,busy=false;
const status=s=>{$('i18-status').textContent=s};
async function read(id,max=20*1024*1024){
 const f=$(id).files?.[0];if(!f)return null;
 if(!f.size||f.size>max)throw Error('I18: archivo vacío o excesivo: '+id);
 try{return JSON.parse(await f.text())}
 catch(_){throw Error('I18: JSON no válido: '+id)}
}
async function collect(){
 const [package15,source15,externalRoot,externalLatest,a,b,c]=await Promise.all([
  read('i18-package15'),read('i18-source15'),read('i18-root',40000),
  read('i18-latest',40000),read('i18-report-A'),read('i18-report-B'),read('i18-report-C')]);
 return {package15,source15,externalRoot,externalLatest,reports:[a,b,c]};
}
async function build(){
 last=null;
 const owner=$('i18-owner').value,id=$('i18-case').value;
 const x=await collect();
 const caseFile=await H.create(x,owner,id,$('i18-pass').value);
 await H.verify(caseFile);
 last=caseFile;$('i18-download').disabled=false;
 status('I18 · EXPEDIENTE PREPARADO · '+caseFile.decision.toUpperCase()+
  '\nHUELLA SHA-256 (NO AUTENTICADA): '+caseFile.dossierDigest+
  '\n'+caseFile.guidance+
  '\nDecisiones encadenadas: '+caseFile.events.length+
  '. Sin re-root, restauración ni autorización. Conserva la huella por separado.');
 return caseFile;
}
function download(){
 if(!last)throw Error('I18: no existe expediente verificado para exportación');
 const serialized=JSON.stringify(last,null,2);
 const blob=new Blob([serialized],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 try{
  const a=root.document.createElement('a');
  a.href=url;a.download='MI-BOWLING-I18-'+last.caseId+'.hold18';
  a.style.display='none';root.document.body.appendChild(a);a.click();a.remove();
 }finally{URL.revokeObjectURL(url)}
 status('I18 · COPIA LOCAL EXPORTADA A SOLICITUD · '+last.decision+
  '\nSHA del expediente: '+last.dossierDigest+
  '\nNo existe registro externo acreditado automáticamente. Preserva la huella separada.');
}
async function check(){
 const dossier=await read('i18-saved',6*1024*1024);
 if(dossier===null)throw Error('I18: falta expediente de contraste');
 const pin=$('i18-trusted-digest').value.trim()||null;
 const v=await H.verify(dossier,pin);
 status('I18 · INTEGRIDAD INTERNA CORRECTA · '+v.decision+
  '\nReferencia externa: '+(v.externalDigestMatched?'coincide con el valor aportado':'NO aportada')+
  '. No se prueba quién conservó la referencia ni cuándo.'+
  '\nDecisiones: '+v.traceSteps+' · fuentes ausentes: '+v.missingCount+
  ' · SIN AUTORIZACIÓN OPERATIVA.');
 return v;
}
async function guarded(fn){
 if(busy)return;busy=true;
 for(const id of ['i18-build','i18-check','i18-download'])$(id).disabled=true;
 status('I18: revisión local en curso...');
 try{return await fn()}catch(e){status('I18 BLOQUEADO: '+e.message);throw e}
 finally{busy=false;$('i18-build').disabled=false;$('i18-check').disabled=false;
  $('i18-download').disabled=last===null}
}
$('i18-build').addEventListener('click',()=>{guarded(build).catch(()=>{})});
$('i18-check').addEventListener('click',()=>{guarded(check).catch(()=>{})});
$('i18-download').addEventListener('click',()=>{guarded(download).catch(()=>{})});
root.MiBowlingI18UI=Object.freeze({build,check});
})(window);
