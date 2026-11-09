/* MI BOWLING I25 · browser import is explicit, offline and read-only.
 * UTF-8 decoding is fatal. Reject BOM to avoid silent byte normalization.
 */
(function(root){
'use strict';
const A=root.MiBowlingI25RetentionAudit,$=id=>root.document.getElementById(id);
let current=null,busy=false,revision=0;
const show=s=>{$('i25-status').textContent=s};
const stages=A.STAGES,files=$('i25-files');
for(const stage of stages){
 const block=root.document.createElement('div');block.className='stage';
 const id='i25-file-'+stage,pin='i25-pin-'+stage;
 const l=root.document.createElement('label');l.htmlFor=id;
 l.textContent=stage+' · Documento UTF-8 (o ausencia)';
 const input=root.document.createElement('input');input.type='file';input.id=id;
 input.accept='.hold18,.review19,.hold20,.doubt21,.uncert22,.gate23,.review24,.json';
 const pl=root.document.createElement('label');pl.htmlFor=pin;
 pl.textContent='SHA declarado de bytes UTF-8 '+stage+' (opcional y no autenticado)';
 const p=root.document.createElement('input');p.id=pin;p.maxLength=64;p.spellcheck=false;
 p.placeholder='64 caracteres hexadecimales en minúsculas';
 input.addEventListener('change',invalidate);p.addEventListener('input',invalidate);
 block.append(l,input,pl,p);files.appendChild(block);
}
function buttons(){
 $('i25-build').disabled=busy;$('i25-check').disabled=busy;
 $('i25-note').disabled=busy||!current||current.status!=='audit-held';
 $('i25-download').disabled=busy||!current;
}
function resetTable(){
 const body=$('i25-table');body.replaceChildren();
 const tr=root.document.createElement('tr');
 for(const s of ['No calculado','Pendiente','No comparado','Sin confianza externa']){
  const td=root.document.createElement('td');td.textContent=s;tr.appendChild(td);
 }
 body.appendChild(tr);
}
function invalidate(){
 revision++;current=null;resetTable();buttons();
 show('I25: fuentes o PIN modificados. Evaluación anterior invalidada. Sin permiso.');
}
function render(packet){
 const body=$('i25-table');body.replaceChildren();
 for(const e of packet.evidence){
  const tr=root.document.createElement('tr');
  for(const s of [e.stage,e.state,
   e.normalizationObserved?'Texto original ≠ JSON reserializado':'Sin diferencia observada',
   e.pinState]){
   const td=root.document.createElement('td');td.textContent=s;tr.appendChild(td);
  }
  body.appendChild(tr);
 }
}
async function readUTF8(file,stage){
 if(!file)return null;
 if(!file.size||file.size>A.MAX_FILE_BYTES)
  throw Error('I25: archivo vacío o supera 12 MiB: '+stage);
 const raw=new Uint8Array(await file.arrayBuffer());
 if(raw.length>=3&&raw[0]===0xef&&raw[1]===0xbb&&raw[2]===0xbf)
  throw Error('I25: BOM UTF-8 rechazado para conservar bytes: '+stage);
 try{return new TextDecoder('utf-8',{fatal:true}).decode(raw)}
 catch(_){throw Error('I25: bytes UTF-8 inválidos, original no modificado: '+stage)}
}
async function collect(){
 const inputs=stages.map(stage=>$('i25-file-'+stage).files?.[0]||null);
 if(inputs.reduce((n,f)=>n+(f?.size||0),0)>A.MAX_TOTAL_BYTES)
  throw Error('I25: suma de archivos mayor que 28 MiB');
 const raws=await Promise.all(inputs.map((file,i)=>readUTF8(file,stages[i])));
 const pins=stages.map(stage=>$('i25-pin-'+stage).value.trim()||null);
 return{raws,pins};
}
async function build(){
 const at=revision,{raws,pins}=await collect();
 const packet=await A.prepare(raws,pins);
 await A.verify(packet);
 if(at!==revision)throw Error('I25: se modificaron las entradas durante el análisis');
 current=packet;render(packet);buttons();
 show('I25 · '+packet.classification.toUpperCase()+
  '\nEtapas: '+packet.evidence.map(x=>x.stage+' '+x.state).join(' · ')+
  '\nEnlaces divergentes: '+packet.links.filter(x=>x.state==='divergent').length+
  ' · original/texto vs JSON: '+packet.evidence.filter(x=>x.normalizationObserved).length+
  '\nSHA interno: '+packet.digest+
  '\nNo acredita custodio, fecha, origen independiente ni permiso.');
 return packet;
}
async function note(){
 if(!current)throw Error('I25: faltan entradas verificadas');
 current=await A.noteReview(current);buttons();
 show('I25 · REVISIÓN EXTERNA ANOTADA LOCALMENTE, NO ENVIADA'+
  '\n'+current.classification+' · '+current.digest+
  '\nSin contacto humano ni autorización.');
 return current;
}
function download(){
 if(!current)throw Error('I25: no existe paquete preparado');
 const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],
  {type:'application/json'}));
 try{
  const a=root.document.createElement('a');a.href=url;
  a.download='MI-BOWLING-I25-'+current.digest.slice(0,12)+'.audit25';
  root.document.body.appendChild(a);a.click();a.remove();
 }finally{URL.revokeObjectURL(url)}
 show('I25 · EXPORTACIÓN LOCAL POR PULSACIÓN'+
  '\n'+current.digest+
  '\nSolo copia del texto importado; custodia externa sin acreditar.');
}
async function check(){
 const file=$('i25-saved').files?.[0];
 if(!file||!file.size||file.size>44*1024*1024)
  throw Error('I25: seleccionar una copia válida (máximo 44 MiB)');
 let packet;
 try{packet=JSON.parse(await readUTF8(file,'sobre I25'))}
 catch(e){throw Error('I25: copia inválida: '+e.message)}
 const pin=$('i25-saved-sha').value.trim()||null;
 const proof=await A.verify(packet,pin);
 render(packet);
 show('I25 · INTEGRIDAD INTERNA COMPROBADA · '+proof.classification+
  '\nEtapas consistentes: '+proof.internallyVerifiedStages+
  ' · enlaces divergentes: '+proof.divergingLinks+
  '\nSHA aportado: '+(proof.userProvidedDigestCompared?
    'coincidencia aritmética, sin origen acreditado':'no aportado')+
  '\nSin autoridad ni certificación de originales externos.');
 return proof;
}
async function guarded(fn){
 if(busy)return;busy=true;buttons();show('I25: análisis local de hasta siete etapas...');
 try{return await fn()}catch(e){show('I25 BLOQUEADO: '+e.message);throw e}
 finally{busy=false;buttons()}
}
for(const [id,fn] of [['i25-build',build],['i25-note',note],
 ['i25-download',download],['i25-check',check]])
 $(id).addEventListener('click',()=>{guarded(fn).catch(()=>{})});
buttons();
root.MiBowlingI25UI=Object.freeze({build,note,check});
})(window);
