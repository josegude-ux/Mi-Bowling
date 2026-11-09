/* MI BOWLING I16 · offline verifier UI. Read-only, no network or storage. */
(function(root){
'use strict';
const A=root.MiBowlingI16Anchors,E=root.MiBowlingI11Evidence;
const $=id=>root.document.getElementById(id);
const status=s=>{$('i16-status').textContent=s};
let busy=false;
function pass(){
 const s=$('i16-password').value;
 if(typeof s!=='string'||s.length<12||s.length>256)
  throw Error('I16: frase ficticia de entre 12 y 256 caracteres obligatoria');
 return s;
}
const owner=()=>$('i16-owner').value;
async function read(id,max=18*1024*1024,optional=false){
 const f=$(id).files?.[0];
 if(!f){if(optional)return null;throw Error('I16: falta referencia obligatoria: '+id)}
 if(!f.size||f.size>max)throw Error('I16: tamaño incorrecto de archivo: '+id);
 try{return JSON.parse(await f.text())}
 catch(_){throw Error('I16: JSON ilegible: '+id)}
}
async function collect(){
 const [history,package15,source15,externalRoot,externalMark,a,b,c]=
  await Promise.all([
   read('i16-history',3*1024*1024),read('i16-package15'),
   read('i16-source15'),read('i16-root',30000),
   read('i16-watermark',30000),
   read('i16-copy-A',30000,true),read('i16-copy-B',30000,true),
   read('i16-copy-C',30000,true)
  ]);
 return{history,package15,source15,externalRoot,externalMark,copies:[a,b,c]};
}
async function verify(){
 const x=await collect();
 const p=await A.verify(x.history,x.package15,x.source15,owner(),pass(),
  x.externalRoot,x.externalMark,x.copies);
 status('I16 · REFERENCIAS VERIFICADAS CON MARCA EXTERNA · '+
  p.sequence+' generaciones firmadas · '+p.signedCheckpoints+
  ' firmas · '+p.externalCopiesMatched+' copias válidas · '+
  p.staleCopies+' antiguas · '+p.missingOrInvalidCopies+' ausentes/ilegibles. '+
  'Solo lectura. No se demuestra custodia real ni fecha de creación.');
 return p;
}
async function compare(){
 const x=await collect(),f=$('i16-current').files?.[0],p=pass();
 if(!f||!f.size||f.size>E.MAX*2)
  throw Error('I16: testigo I11 actual ausente o de tamaño incorrecto');
 const now=await E.open(await f.text(),p,owner());
 const result=await A.compareCurrent(x.history,x.package15,x.source15,owner(),p,
  x.externalRoot,x.externalMark,x.copies,now);
 status('I16 · COMPARACIÓN SOLO LECTURA · '+result.verdict+
  (result.missing?' · recibos faltantes '+result.missing:'')+
  '. Ninguna partida, WAL ni dato publicado modificado.');
 return result;
}
for(const [id,fn] of [['i16-verify',verify],['i16-compare',compare]]){
 $(id).addEventListener('click',async()=>{
  if(busy)return;busy=true;
  status('I16: comprobación en curso...');
  $('i16-verify').disabled=true;$('i16-compare').disabled=true;
  try{await fn()}catch(err){status('I16 BLOQUEADO: '+err.message)}
  finally{busy=false;$('i16-verify').disabled=false;$('i16-compare').disabled=false}
 });
}
root.MiBowlingI16UI=Object.freeze({verify,compare});
})(window);
