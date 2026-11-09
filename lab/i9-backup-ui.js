/* MI BOWLING · I9 LAB · encrypted backup controls only, no external calls. */
(function(root){
'use strict';
const $=id=>root.document.getElementById(id);
const status=msg=>{$('lab-i9-backup-status').textContent=msg};
function phrase(){
 const p=$('lab-i9-backup-password').value;
 if(p.length<12||p.length>256)throw Error('Frase ficticia de respaldo de 12 a 256 caracteres requerida');
 return p;
}
async function selected(){
 const file=$('lab-i9-backup-file').files?.[0];
 if(!file||!/\.(mbi9|json)$/i.test(file.name))
  throw Error('Selecciona archivo de respaldo I9 (.mbi9/.json)');
 if(file.size>root.MiBowlingI9Backup.MAX_BYTES*2)
  throw Error('Respaldo excesivamente grande');
 return file.text();
}
function confirmFixture(){
 if(!$('lab-i9-restore-consent').checked)
  throw Error('Marca la confirmación para restaurar exclusivamente datos ficticios');
 return 'CONFIRMAR-RESTAURACION-FICTICIA';
}
async function download(){
 const contents=await root.MiBowlingIntegrationI9.exportBackup(phrase());
 const blob=new Blob([contents],{type:'application/json'});
 const href=URL.createObjectURL(blob);
 try{
  const node=root.document.createElement('a');
  node.href=href;node.download='mi-bowling-lab-i9-cifrado.mbi9';
  root.document.body.appendChild(node);node.click();node.remove();
 }finally{root.setTimeout(()=>URL.revokeObjectURL(href),2500)}
 status('I9: respaldo AES-256-GCM generado · '+contents.length+
  ' caracteres cifrados · no se almacena la frase de respaldo.');
}
async function preview(){
 const proof=await root.MiBowlingIntegrationI9.inspectBackup(await selected(),phrase());
 status('I9: firma verificada para cuenta ficticia · revisión '+proof.confirmedRevision+
  ' · '+proof.operationCount+' operaciones pendientes · sin cambios.');
 return proof;
}
async function restore(){
 const ack=confirmFixture();
 const text=await selected(),pwd=phrase();
 await root.MiBowlingIntegrationI9.inspectBackup(text,pwd);
 const result=await root.MiBowlingIntegrationI9.restoreBackup(text,pwd,ack);
 status('I9: '+result.status+' · confirmados añadidos '+Number(result.confirmedAdded)+
  ' · WAL añadidos '+result.operationsAdded+' · WAL idénticos '+result.operationsExisting);
 // Reload is deliberate: the already injected CP-020 globals cannot be reused
 // with a different confirmed/WAL snapshot safely in the same page lifetime.
 if(result.status==='restored')root.location.reload();
 return result;
}
const tasks=[['lab-i9-download',download],['lab-i9-preview',preview],
 ['lab-i9-import',restore]];
for(const [id,fn] of tasks){
 $(id).addEventListener('click',()=>fn().catch(error=>status('I9: bloqueado: '+error.message)));
}
root.MiBowlingI9BackupUI=Object.freeze({download,preview,restore});
})(window);
