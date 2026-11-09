/* MI BOWLING · I10 LAB · encrypted backup controls only, no external calls. */
(function(root){
'use strict';
const $=id=>root.document.getElementById(id);
const status=msg=>{$('lab-i10-backup-status').textContent=msg};
function phrase(){
 const p=$('lab-i10-backup-password').value;
 if(p.length<12||p.length>256)throw Error('Frase ficticia de respaldo de 12 a 256 caracteres requerida');
 return p;
}
async function selected(id='lab-i10-backup-file'){
 const file=$(id).files?.[0];
 if(!file||!/\.(mbi10|json)$/i.test(file.name))
  throw Error('Selecciona archivo de respaldo I10 (.mbi10/.json)');
 if(file.size>root.MiBowlingI10Backup.MAX_BYTES*2)
  throw Error('Respaldo excesivamente grande');
 return file.text();
}
function confirmFixture(){
 if(!$('lab-i10-restore-consent').checked)
  throw Error('Marca la confirmación para restaurar exclusivamente datos ficticios');
 return 'CONFIRMAR-RESTAURACION-FICTICIA';
}
async function download(){
 const contents=await root.MiBowlingIntegrationI10.exportBackup(phrase());
 const blob=new Blob([contents],{type:'application/json'});
 const href=URL.createObjectURL(blob);
 try{
  const node=root.document.createElement('a');
  node.href=href;node.download='mi-bowling-lab-i10-cifrado.mbi10';
  root.document.body.appendChild(node);node.click();node.remove();
 }finally{root.setTimeout(()=>URL.revokeObjectURL(href),2500)}
 status('I10: respaldo AES-256-GCM generado · '+contents.length+
  ' caracteres cifrados · no se almacena la frase de respaldo.');
}
async function preview(){
 const plan=await root.MiBowlingIntegrationI10.compareBackupToVault(await selected(),phrase());
 status('I10: previsualización SIN ESCRIBIR · '+plan.verdict+
  ' · revisión almacenada '+plan.confirmedRevision+' / respaldo '+plan.backupRevision+
  ' · WAL nuevos '+plan.operationsAdded+', existentes '+plan.operationsExisting+
  ' · compatible: '+plan.canRestore);
 return plan;
}
async function restore(){
 const ack=confirmFixture();
 const text=await selected(),pwd=phrase();
 const plan=await root.MiBowlingIntegrationI10.compareBackupToVault(text,pwd);
 if(!plan.canRestore)throw Error('I10: '+plan.verdict+
  ' · restauración peligrosa rechazada antes de escribir');
 const result=await root.MiBowlingIntegrationI10.restoreBackup(text,pwd,ack);
 status('I10: '+result.status+' · confirmados añadidos '+Number(result.confirmedAdded)+
  ' · WAL añadidos '+result.operationsAdded+' · WAL idénticos '+result.operationsExisting);
 // Reload is deliberate: the already injected CP-020 globals cannot be reused
 // with a different confirmed/WAL snapshot safely in the same page lifetime.
 if(result.status==='restored')root.location.reload();
 return result;
}
async function compareDates(){
 const first=await selected(),second=await selected('lab-i10-second-file');
 const result=await root.MiBowlingIntegrationI10.compareTwoBackups(first,second,phrase());
 status('I10: comparación verificable entre fechas (informativas): '+result.verdict+
  ' · revisión '+result.first.revision+' frente a '+result.second.revision+
  ' · WAL '+result.first.operations+' frente a '+result.second.operations+
  ' · sin escritura');
 return result;
}
async function trace(){
 const events=await root.MiBowlingIntegrationI10.restoreAudit();
 status('I10: '+events.length+' restauraciones cifradas confirmadas. Últimas: '+
  events.slice(-5).map(e=>e.backupId.slice(0,8)+' / rev '+e.revision+
   ' / nuevos '+e.operationsAdded).join('; ')+'. Sin datos de partidas.');
 return events;
}
const tasks=[['lab-i10-download',download],['lab-i10-preview',preview],
 ['lab-i10-compare',compareDates],['lab-i10-trace',trace],
 ['lab-i10-import',restore]];
for(const [id,fn] of tasks){
 $(id).addEventListener('click',()=>fn().catch(error=>status('I10: bloqueado: '+error.message)));
}
root.MiBowlingI10BackupUI=Object.freeze({download,preview,compareDates,trace,restore});
})(window);
