/* MI BOWLING · LAB A7 · Interactive migration sandbox; all data in memory.
 * NEVER reads localStorage, indexedDB, browser files, or network.
 * Only for fictional A/B/C. The actual reader is tested separately in WebKit.
 */
(function(){
'use strict';
const M=window.MiBowlingMigrationLAB;
const IDS={
 A:'11111111-1111-4111-8111-111111111111',
 B:'22222222-2222-4222-8222-222222222222',
 C:'33333333-3333-4333-8333-333333333333'
};
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
function pdf(s){return new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Name ('+s+') >>\nendobj\n%%EOF');}
function history(id,scores){
 return {version:2,hand:'diestro',
  sessions:scores.length?[{id:'session-'+id,type:'entrenamiento',date:'2026-11-08',
    games:scores.map((score,i)=>({id:'game-'+id+'-'+i,score,rolls:[{frame:1,ball:1,pins:[1,2,3,4,5,6,7,8,9,10]}]}))}]:[],
  balls:scores.length?[{id:'ball-'+id,name:'Bola ficticia '+id}]:[],
  patterns:scores.length?[{id:'pattern-'+id,name:'Aceite ficticio '+id,pdfName:'Patron-'+id+'.pdf'}]:[]
 };
}
const testSource={
 A:{profile:'legacy',data:history('A',[300,181]),file:pdf('A')},
 B:{profile:'p-a7-b',data:history('B',[]),file:null},
 C:{profile:'p-a7-c',data:history('C',[157,201]),file:pdf('C')}
};
function sourceFor(key){
 const src=testSource[key],profile=src.profile;
 const prefix='mi-bowling-profile:'+profile+':';
 const raw={
  [prefix+'mi-bowling-analitica-v2']:JSON.stringify({...src.data,localPlayer:{id:profile},
   leagueNational:{matches:[{id:'archivo-'+key}]} }),
  [prefix+'mi-bowling-liga-v1']:JSON.stringify({matches:[{id:'archivo-liga-'+key}]})
 };
 return {
  storage:{getItem:k=>Object.prototype.hasOwnProperty.call(raw,k)?raw[k]:null},
  readPdf:async id=>src.data.patterns.some(p=>p.id===id)?new Uint8Array(src.file):null
 };
}
const records=new Map(),binary=new Map();
for(const [key,id] of Object.entries(IDS)){
 records.set(id,{
  personal:{payload:{version:2,hand:'diestro',sessions:[],balls:[],patterns:[]},
   revision:null,exists:false},
  league:{payload:{version:1,matches:key==='A'?[{id:'acta-A',total:195}]:key==='B'?[{id:'acta-B',total:140}]:[],rosters:{own:[]}},
   revision:0,exists:true}
 });
}
let selected='A',pkg=null,remoteBackup=null,busy=false,fault=false;
const owner=()=>IDS[selected];
function assertOwner(id){if(id!==owner())throw Error('Acceso cruzado denegado: UUID distinto');}
function fileStore(){
 return{
  async read(id,path){assertOwner(id);if(!path.startsWith(id+'/patterns/'))throw Error('Ruta PDF ajena');return binary.has(path)?new Uint8Array(binary.get(path)):null;},
  async putNew(id,path,bytes){
   assertOwner(id);if(!path.startsWith(id+'/patterns/'))throw Error('Ruta PDF ajena');
   if(fault)throw Error('QuotaExceededError ficticio: no se ha guardado el PDF');
   if(binary.has(path))return false;binary.set(path,new Uint8Array(bytes));return true;
  },
  async remove(id,path){assertOwner(id);if(!path.startsWith(id+'/patterns/'))throw Error('Ruta PDF ajena');binary.delete(path);}
 };
}
function repo(){
 return{
  async load(id){assertOwner(id);return{owner:id,...clone(records.get(id))}},
  async write(id,kind,payload,revision){
   assertOwner(id);
   if(kind!=='personal')throw Error('Liga Nacional no se modifica en LAB');
   const row=records.get(id).personal;
   if(row.revision!==revision)throw Error('Conflicto de revisión: no se sobrescribió nada');
   if(revision!==null&&!Number.isSafeInteger(revision))throw Error('Revisión inválida');
   row.payload=clone(payload);row.revision=revision===null?0:revision+1;row.exists=true;
   return row.revision;
  }
 };
}
function log(msg,error=false){
 const area=$('a7-status');area.textContent=msg;area.dataset.kind=error?'error':'success';
}
function fmt(id){
 const row=records.get(id).personal;
 return {sessions:row.payload.sessions.length,balls:row.payload.balls.length,
  pdfs:row.payload.patternPdfRefs?.length||0,rev:row.revision};
}
function refresh(){
 $('a7-uuid').textContent=owner();
 $('a7-source').textContent=testSource[selected].profile;
 for(const [key,id] of Object.entries(IDS)){
  const rec=fmt(id);
  $('a7-data-'+key).textContent=rec.sessions+' sesiones · '+rec.balls+' bolas · '+rec.pdfs+' PDF';
  $('a7-rev-'+key).textContent=rec.rev===null?'Sin documento':'Revisión '+rec.rev;
 }
 $('a7-package').textContent=pkg?'Copia verificada: '+pkg.stats.games+' partidas, '+pkg.files.length+' PDF; SHA-256 '+pkg.sha256.slice(0,16)+'…':'Todavía no hay copia preparada';
 $('a7-prev').textContent=remoteBackup?'Copia previa verificada, revisión '+remoteBackup.revision:'No hay copia previa';
}
async function operation(label,fn){
 if(busy)return;
 busy=true;
 const all=[...document.querySelectorAll('[data-action]')];
 for(const el of all)el.disabled=true;
 try{await fn();log(label+' completado en LAB: solo datos ficticios.');}
 catch(err){log((err?.message||String(err))+' · Ningún dato real afectado.',true);}
 finally{busy=false;for(const el of all)el.disabled=false;refresh();}
}
function confirmed(){
 if(!$('a7-confirm').checked)throw Error('Confirma expresamente el UUID de destino antes de continuar');
}
$('a7-player').addEventListener('change',e=>{
 selected=e.target.value;pkg=null;remoteBackup=null;$('a7-confirm').checked=false;
 $('a7-status').textContent='Jugador '+selected+' seleccionado. Se ha descartado la copia preparada de otro UUID.';
 $('a7-status').dataset.kind='info';refresh();
});
$('a7-backup').addEventListener('click',()=>operation('Respaldo de origen',async()=>{
 confirmed();
 const src=sourceFor(selected);
 pkg=await M.capture({...src,sourceProfileId:testSource[selected].profile,
  ownerId:owner(),confirmOwnerId:owner(),acknowledge:M.ACK});
 await M.verify(pkg,{ownerId:owner()});
}));
$('a7-verify').addEventListener('click',()=>operation('Integridad SHA-256',async()=>{
 if(!pkg)throw Error('Prepara primero una copia');
 await M.verify(pkg,{ownerId:owner()});
}));
$('a7-import').addEventListener('click',()=>operation('Importación al repositorio privado simulado',async()=>{
 confirmed();if(!pkg)throw Error('Primero prepara y verifica una copia');
 const result=await M.apply({pkg,ownerId:owner(),repository:repo(),fileStore:fileStore(),acknowledge:M.ACK});
 if(result.status!=='verified')throw Error('No se pudo verificar la importación');
}));
$('a7-previous').addEventListener('click',()=>operation('Respaldo del documento destino',async()=>{
 confirmed();remoteBackup=await M.backupRemote({ownerId:owner(),repository:repo(),fileStore:fileStore()});
 await M.verifyRemoteBackup(remoteBackup,{ownerId:owner()});
}));
$('a7-edit').addEventListener('click',()=>operation('Modificación ficticia de una partida',async()=>{
 confirmed();
 const id=owner(),row=records.get(id).personal;
 if(!row.payload.sessions.length)throw Error('Importa primero un historial con partidas');
 const edited=clone(row.payload);
 edited.sessions[0].games[0].score=111;
 await repo().write(id,'personal',edited,row.revision);
}));
$('a7-restore').addEventListener('click',()=>operation('Restauración desde respaldo verificado',async()=>{
 confirmed();if(!pkg||!remoteBackup)throw Error('Necesitas paquete de origen y copia previa del destino');
 await M.apply({pkg,ownerId:owner(),repository:repo(),fileStore:fileStore(),
  mode:'restore',beforeBackup:remoteBackup,expectedRevision:remoteBackup.revision,acknowledge:M.ACK});
}));
$('a7-fault').addEventListener('change',e=>{fault=e.target.checked;});
window.MiBowlingA7Demo=Object.freeze({
 getState:()=>({selected,owner:owner(),pkgOwner:pkg?.ownerId||null,
  remoteBackupRevision:remoteBackup?.revision??null,
  players:Object.fromEntries(Object.entries(IDS).map(([key,id])=>[key,fmt(id)])),
  league:Object.fromEntries(Object.entries(IDS).map(([key,id])=>[key,clone(records.get(id).league.payload)])),
  files:binary.size}),
 // Tests may inspect but not change private state. No real data ever used.
});
refresh();
})();
