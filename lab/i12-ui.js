/* MI BOWLING · LAB I12 · local file-only browser interface. */
(function(root){
'use strict';
const M=root.MiBowlingI12Manifest,E=root.MiBowlingI11Evidence;
const $=id=>root.document.getElementById(id);
const msg=value=>{$('i12-status').textContent=value};
const limit=E.MAX*2,mini=200000;
let latest=null,busy=false;
const owner=()=>$('i12-owner').value;
function pass(){
 const p=$('i12-pass').value;
 if(p.length<12||p.length>256)throw Error('Frase de prueba de 12 a 256 caracteres requerida');
 return p;
}
async function fileFrom(id,required=true,max=mini){
 const f=$(id).files?.[0];
 if(!f){if(required)throw Error('Falta seleccionar '+id);return null}
 if(f.size>max||f.size===0)throw Error('I12: archivo vacío o demasiado grande');
 return f.text();
}
async function sources(){
 const all=Array.from($('i12-files').files||[]);
 if(!all.length||all.length>M.MAX_ENTRIES)throw Error('I12: selecciona 1–40 archivos .mae11');
 const p=pass();
 return Promise.all(all.map(async f=>{
  if(!/\.(mae11|json)$/i.test(f.name)||f.size>limit||!f.size)
   throw Error('I12: exportación I11 no permitida');
  return{file:await f.text(),passphrase:p};
 }));
}
async function manifest(){
 let raw=await fileFrom('i12-manifest-file');
 try{return JSON.parse(raw)}catch(_){throw Error('I12: manifiesto JSON inválido')}
}
async function externalPin(){
 const raw=await fileFrom('i12-pin-file',false,10000);
 return raw?JSON.parse(raw):null;
}
function download(name,data){
 const href=URL.createObjectURL(new Blob([data],{type:'application/json'}));
 try{
  const a=root.document.createElement('a');
  a.href=href;a.download=name;root.document.body.appendChild(a);a.click();a.remove();
 }finally{root.setTimeout(()=>URL.revokeObjectURL(href),2500)}
}
async function build(){
 const m=await M.build(owner(),await sources());
 latest=m;
 download('mi-bowling-i12-manifiesto-lab.mami12',JSON.stringify(m,null,2));
 msg('I12: manifiesto descargado · '+m.entries.length+' exportaciones · SHA-256 '+
  m.digest+'. Ahora pulsa DESCARGAR PIN para guardarlo por separado fuera del navegador.');
 return m;
}
async function pinDownload(){
 if(!latest||latest.owner!==owner())throw Error('I12: primero genera el manifiesto de esta identidad');
 const p=M.pin(latest);
 download('mi-bowling-i12-pin-externo-lab.pin12',JSON.stringify(p,null,2));
 msg('I12: PIN externo descargado ('+p.lastCount+' recibos). Consérvalo aparte del manifiesto y de los archivos .mae11. No prueba inmutabilidad.');
 return p;
}
async function verify(){
 const result=await M.verify(await manifest(),await sources(),owner(),await externalPin());
 msg('I12: '+(result.externallyPinned?'VERIFICADO CON PIN EXTERNO':'COHERENTE, SIN PIN INDEPENDIENTE')+
  ' · '+result.sourceFilesVerified+' archivos · '+result.restoredReceipts+
  ' recibos de restauración · '+result.rejectedConflicts+' conflictos · '+
  result.count+' eventos · '+result.digest+
  (result.externallyPinned?' · continuidad comprobable frente al PIN conservado':' · rollback completo NO descartado'));
 return result;
}
async function compare(){
 const raw=await fileFrom('i12-current-file',true,limit);
 const data=await E.open(raw,pass(),owner());
 const result=await M.compareCurrent(owner(),await manifest(),await sources(),
  await externalPin(),data);
 msg('I12: contraste de evidencia actual · '+result.verdict+
  (result.missing?' · faltan '+result.missing+' recibos respecto del testigo':'')+
  '. Solo lectura: no se modificaron partidas, WAL ni auditoría.');
 return result;
}
async function signature(){
 // Require all I11 witness bytes and independent pin BEFORE checking signature.
 const m=await manifest();
 const check=await M.verify(m,await sources(),owner(),await externalPin());
 const txt=await fileFrom('i12-key-file',true,10000);
 let jwk;try{jwk=JSON.parse(txt)}catch(_){throw Error('I12: JWK público inválido')}
 const sig=(await fileFrom('i12-signature-file',true,10000)).trim();
 const result=await M.verifyDetachedSignature(m,sig,jwk);
 msg('I12: firma P-256 '+(result.signatureValid?'VÁLIDA':'NO VÁLIDA')+
  ' · testigo '+(check.externallyPinned?'PIN externo':'sin PIN')+
  '. No demuestra fecha auténtica, custodia ni inmutabilidad.');
 return result;
}
const buttons=[['i12-build',build],['i12-pin-download',pinDownload],
 ['i12-verify',verify],['i12-compare',compare],['i12-signature',signature]];
for(const [id,func] of buttons){
 const el=$(id);
 if(!el)throw Error('I12: interfaz incompleta: '+id);
 el.addEventListener('click',async()=>{
  if(busy)return;
  busy=true;
  for(const [bid] of buttons)$(bid).disabled=true;
  try{await func()}catch(err){msg('I12 BLOQUEADO: '+err.message)}
  finally{busy=false;for(const [bid] of buttons)$(bid).disabled=false}
 });
}
root.MiBowlingI12UI=Object.freeze({build,pinDownload,verify,compare,signature});
})(window);
