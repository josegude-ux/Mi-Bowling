/* MI BOWLING I15 · file-only UI; no database, storage, signing or network. */
(function(root){
'use strict';
const I15=root.MiBowlingI15Recovery,E=root.MiBowlingI11Evidence;
const $=id=>root.document.getElementById(id);
const show=s=>{$('i15-status').textContent=s};
let busy=false;
function password(){
 const p=$('i15-pass').value;
 if(typeof p!=='string'||p.length<12||p.length>256)
  throw Error('I15: contraseña exclusivamente ficticia de 12–256 caracteres requerida');
 return p;
}
const user=()=>$('i15-owner').value;
async function read(id,max=18*1024*1024){
 const file=$(id).files?.[0];
 if(!file||!file.size||file.size>max)
  throw Error('I15: archivo independiente ausente, vacío o excesivo: '+id);
 try{return JSON.parse(await file.text())}
 catch(_){throw Error('I15: JSON inválido en '+id)}
}
async function collect(){
 const [package15,previousPolicies,previousPins13,previousGenesisPin,
  previousLatestPin,recoveryPolicy,commitment,newPolicy,newPin13,externalLatestPin]=
  await Promise.all([
   read('i15-package'),read('i15-policies',40000),read('i15-pins13',40000),
   read('i15-gen14',10000),read('i15-last14',10000),
   read('i15-recovery-policy',20000),read('i15-commitment',10000),
   read('i15-new-policy',20000),read('i15-pin13',10000),
   read('i15-last15',10000)
  ]);
 return {package15,source:{previousPolicies,previousPins13,previousGenesisPin,
  previousLatestPin,recoveryPolicy,commitment,newPolicy,newPin13,externalLatestPin}};
}
async function verify(){
 const {package15,source}=await collect();
 const result=await I15.verify(package15,source,user(),password());
 show('I15: RECUPERACIÓN SINTÉTICA VERIFICADA · '+result.previousEpochs+
  ' épocas I14 · '+result.recoverySignatures+' firmas de rescate · '+
  result.acceptanceSignatures+' firmas de nueva política · '+
  result.newAuditCount+' recibos · SHA final '+result.finalManifestDigest+
  '. SOLO LECTURA. Sin probar custodia externa, cronología ni inmutabilidad.');
 return result;
}
async function compare(){
 const {package15,source}=await collect();
 const file=$('i15-current').files?.[0];
 if(!file||!file.size||file.size>E.MAX*2)
  throw Error('I15: falta una evidencia I11 actual válida');
 const pass=password(),current=await E.open(await file.text(),pass,user());
 const result=await I15.compareCurrent(package15,source,user(),pass,current);
 show('I15: CONTRASTE SOLO LECTURA · '+result.verdict+
  (result.missing?' · faltan '+result.missing+' recibos':'')+
  '. No se han modificado confirmados, partidas ni WAL.');
 return result;
}
for(const [id,fn] of [['i15-verify',verify],['i15-compare',compare]]){
 $(id).addEventListener('click',async()=>{
  if(busy)return;busy=true;$('i15-verify').disabled=true;$('i15-compare').disabled=true;
  try{await fn()}catch(err){show('I15 BLOQUEADO: '+err.message)}
  finally{busy=false;$('i15-verify').disabled=false;$('i15-compare').disabled=false}
 });
}
root.MiBowlingI15UI=Object.freeze({verify,compare});
})(window);
