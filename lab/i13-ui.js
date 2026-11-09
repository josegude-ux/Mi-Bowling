/* MI BOWLING I13 LAB · independent file inputs; no storage/network/writes. */
(function(root){
'use strict';
const W=root.MiBowlingI13Witnesses,E=root.MiBowlingI11Evidence;
const $=id=>root.document.getElementById(id);
const msg=s=>{$('i13-status').textContent=s};
const owner=()=>$('i13-owner').value;
let busy=false;
function pass(){
 const p=$('i13-pass').value;
 if(p.length<12||p.length>256)throw Error('I13: frase exclusivamente ficticia de 12–256 caracteres requerida');
 return p;
}
async function read(id,limit=8*1024*1024){
 const f=$(id).files?.[0];
 if(!f||f.size===0||f.size>limit)throw Error('I13: falta archivo o tamaño inválido: '+id);
 let value;try{value=JSON.parse(await f.text())}
 catch(_){throw Error('I13: JSON incompatible: '+id)}
 return value;
}
async function data(){
 const [pkg,policy,pin]=await Promise.all([
  read('i13-package',16*1024*1024),
  read('i13-policy',20000),read('i13-pin',12000)]);
 if(!pkg||Object.keys(pkg).sort().join(',')!=='bundle,snapshots')
  throw Error('I13: paquete debe contener solo bundle y snapshots, sin claves privadas');
 return {pkg,policy,pin};
}
async function verify(){
 const {pkg,policy,pin}=await data();
 const r=await W.verify(pkg.bundle,pkg.snapshots,policy,pin,owner(),pass());
 msg('I13: QUÓRUM VERIFICADO CON PIN EXTERNO · '+r.statements+
  ' testigos enlazados · '+r.trustedSignerChecks+' firmas válidas · umbral '+
  r.signerThreshold+' · '+r.latestReceiptCount+' recibos · manifiesto '+
  r.latestManifestDigest+'. Solo lectura. Custodia, fecha e inmutabilidad no demostradas.');
 return r;
}
async function compare(){
 const [{pkg,policy,pin},current]=await Promise.all([
  data(),read('i13-current',E.MAX*2)]);
 const original=$('i13-current').files[0];
 const evidence=await E.open(await original.text(),pass(),owner());
 const r=await W.compareCurrent(pkg.bundle,pkg.snapshots,policy,pin,owner(),pass(),evidence);
 msg('I13: comparación SIN ESCRITURA · '+r.verdict+
  (r.missing?' · recibos faltantes: '+r.missing:'')+
  '. Ningún cambio en puntuaciones, WAL o registros.');
 return r;
}
for(const [id,fn] of [['i13-verify',verify],['i13-compare',compare]]){
 $(id).addEventListener('click',async()=>{
  if(busy)return;busy=true;
  $('i13-verify').disabled=true;$('i13-compare').disabled=true;
  try{await fn()}catch(e){msg('I13 BLOQUEADO: '+e.message)}
  finally{busy=false;$('i13-verify').disabled=false;$('i13-compare').disabled=false}
 });
}
root.MiBowlingI13UI=Object.freeze({verify,compare});
})(window);
