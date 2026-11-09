/* MI BOWLING I14 · disconnected local files, no writes. */
(function(root){
'use strict';
const L=root.MiBowlingI14Lifecycle,E=root.MiBowlingI11Evidence;
const $=id=>root.document.getElementById(id);
const msg=text=>{$('i14-status').textContent=text};
let busy=false;
const owner=()=>$('i14-owner').value;
function pass(){
 const p=$('i14-pass').value;
 if(typeof p!=='string'||p.length<12||p.length>256)
  throw Error('I14: frase ficticia de 12–256 caracteres requerida');
 return p;
}
async function readJSON(id,max=32*1024*1024){
 const f=$(id).files?.[0];
 if(!f||f.size===0||f.size>max)throw Error('I14: falta archivo o tamaño incorrecto: '+id);
 try{return JSON.parse(await f.text())}
 catch(_){throw Error('I14: archivo JSON ilegible: '+id)}
}
async function load(){
 const [bundle,policies,pins13,genesis,latest]=await Promise.all([
  readJSON('i14-bundle'),readJSON('i14-policies',30000),
  readJSON('i14-pins13',30000),readJSON('i14-genesis',10000),
  readJSON('i14-latest',10000)]);
 return{bundle,policies,pins13,genesis,latest};
}
async function verify(){
 const d=await load();
 const r=await L.verify(d.bundle,d.policies,d.pins13,d.genesis,d.latest,owner(),pass());
 msg('I14: CADENA Y QUÓRUM VERIFICADOS · '+r.epochs+' épocas, '+r.transitionCount+
  ' transiciones, '+r.signatureChecks+' firmas contrastadas, '+r.retiredKeys+
  ' claves retiradas, referencia final '+r.finalManifestDigest+
  '. No se ha demostrado independencia de custodios, fecha de firma ni inmutabilidad.');
 return r;
}
async function compare(){
 const d=await load(),file=$('i14-current').files?.[0];
 if(!file||!file.size||file.size>E.MAX*2)
  throw Error('I14: requiere archivo I11 actual de tamaño válido');
 const p=pass(),current=await E.open(await file.text(),p,owner());
 const r=await L.compareCurrent(d.bundle,d.policies,d.pins13,d.genesis,
  d.latest,owner(),p,current);
 msg('I14: contraste SOLO LECTURA · '+r.verdict+
  (r.missing?' · recibos faltantes: '+r.missing:'')+
  '. Sin modificar partidas, confirmados ni WAL.');
 return r;
}
for(const [id,fn] of [['i14-verify',verify],['i14-compare',compare]]){
 $(id).addEventListener('click',async()=>{
  if(busy)return;busy=true;
  $('i14-verify').disabled=true;$('i14-compare').disabled=true;
  try{await fn()}catch(err){msg('I14 BLOQUEADO: '+err.message)}
  finally{busy=false;$('i14-verify').disabled=false;$('i14-compare').disabled=false}
 });
}
root.MiBowlingI14UI=Object.freeze({verify,compare});
})(window);
