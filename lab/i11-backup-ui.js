/* MI BOWLING · I11 LAB · encrypted backup controls only, no external calls. */
(function(root){
'use strict';
const $=id=>root.document.getElementById(id);
const status=msg=>{$('lab-i11-backup-status').textContent=msg};
function phrase(){
 const p=$('lab-i11-backup-password').value;
 if(p.length<12||p.length>256)throw Error('Frase ficticia de respaldo de 12 a 256 caracteres requerida');
 return p;
}
async function selected(id='lab-i11-backup-file'){
 const file=$(id).files?.[0];
 if(!file||!/\.(mbi11|json)$/i.test(file.name))
  throw Error('Selecciona archivo de respaldo I11 (.mbi11/.json)');
 if(file.size>root.MiBowlingI11Backup.MAX_BYTES*2)
  throw Error('Respaldo excesivamente grande');
 return file.text();
}
function confirmFixture(){
 if(!$('lab-i11-restore-consent').checked)
  throw Error('Marca la confirmación para restaurar exclusivamente datos ficticios');
 return 'CONFIRMAR-RESTAURACION-FICTICIA';
}
async function download(){
 const contents=await root.MiBowlingIntegrationI11.exportBackup(phrase());
 const blob=new Blob([contents],{type:'application/json'});
 const href=URL.createObjectURL(blob);
 try{
  const node=root.document.createElement('a');
  node.href=href;node.download='mi-bowling-lab-i11-cifrado.mbi11';
  root.document.body.appendChild(node);node.click();node.remove();
 }finally{root.setTimeout(()=>URL.revokeObjectURL(href),2500)}
 status('I11: respaldo AES-256-GCM generado · '+contents.length+
  ' caracteres cifrados · no se almacena la frase de respaldo.');
}
async function preview(){
 const plan=await root.MiBowlingIntegrationI11.compareBackupToVault(await selected(),phrase());
 status('I11: previsualización SIN ESCRIBIR · '+plan.verdict+
  ' · revisión almacenada '+plan.confirmedRevision+' / respaldo '+plan.backupRevision+
  ' · WAL nuevos '+plan.operationsAdded+', existentes '+plan.operationsExisting+
  ' · compatible: '+plan.canRestore);
 return plan;
}
async function restore(){
 const ack=confirmFixture();
 const text=await selected(),pwd=phrase();
 const plan=await root.MiBowlingIntegrationI11.compareBackupToVault(text,pwd);
 if(!plan.canRestore)throw Error('I11: '+plan.verdict+
  ' · restauración peligrosa rechazada antes de escribir');
 const result=await root.MiBowlingIntegrationI11.restoreBackup(text,pwd,ack);
 status('I11: '+result.status+' · confirmados añadidos '+Number(result.confirmedAdded)+
  ' · WAL añadidos '+result.operationsAdded+' · WAL idénticos '+result.operationsExisting);
 // Reload is deliberate: the already injected CP-020 globals cannot be reused
 // with a different confirmed/WAL snapshot safely in the same page lifetime.
 if(result.status==='restored')root.location.reload();
 return result;
}
async function compareDates(){
 const first=await selected(),second=await selected('lab-i11-second-file');
 const result=await root.MiBowlingIntegrationI11.compareTwoBackups(first,second,phrase());
 status('I11: comparación verificable entre fechas (informativas): '+result.verdict+
  ' · revisión '+result.first.revision+' frente a '+result.second.revision+
  ' · WAL '+result.first.operations+' frente a '+result.second.operations+
  ' · sin escritura');
 return result;
}
async function trace(){
 const chain=await root.MiBowlingIntegrationI11.restoreAudit();
 status('I11: cadena verificada · '+chain.count+' recibos, head '+
  chain.headHash.slice(0,12)+'… . Últimos: '+
  chain.receipts.slice(-5).map(e=>'#'+e.seq+' '+e.kind+
   ' '+e.reason+' / rev '+e.revision).join('; ')+
  '. Sin puntuaciones ni secretos.');
 return chain;
}
const tasks=[['lab-i11-download',download],['lab-i11-preview',preview],
 ['lab-i11-compare',compareDates],['lab-i11-trace',trace],
 ['lab-i11-import',restore]];
for(const [id,fn] of tasks){
 $(id).addEventListener('click',()=>fn().catch(error=>status('I11: bloqueado: '+error.message)));
}
root.MiBowlingI11BackupUI=Object.freeze({download,preview,compareDates,trace,restore});
})(window);
