/* MI BOWLING · LAB I6 · Encrypted WAL storage-port integration of CP-020 with verified fictitious UUID owners.
 * No actual identity service or remote database. No real browser storage.
 * Unlike PR #8's PIN selector, the local profile ID is ONLY an import source.
 * The published app.js/index.html/sw.js and official calendar remain unchanged.
 */
(function(root){
'use strict';
const dom=root.document,$=id=>dom.getElementById(id);
if(root.MiBowlingI2Isolation?.status().ready!==true)return;
const isolation=root.MiBowlingI2Isolation;
const SECRET='DemoLAB-Password123!';
const USERS=Object.freeze({
 A:{id:'11111111-1111-4111-8111-111111111111',email:'jugador-a@demo.invalid',
  name:'Jugador A',source:'legacy'},
 B:{id:'22222222-2222-4222-8222-222222222222',email:'jugador-b@demo.invalid',
  name:'Jugador B',source:'p-demo-b'},
 C:{id:'33333333-3333-4333-8333-333333333333',email:'jugador-c@demo.invalid',
  name:'Jugador C',source:'p-demo-c'}
});
const all=[1,2,3,4,5,6,7,8,9,10],clone=x=>JSON.parse(JSON.stringify(x));
const pdfFor=(label)=>new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Title (LAB '+label+') >>\nendobj\n%%EOF');
function completeGame(letter,style){
 const rolls=[];
 for(let frame=1;frame<=10;frame++){
  if(style==='strikes'){
   rolls.push({frame,ball:1,pins:all.slice(),ballId:'ball-'+letter});
   if(frame===10){
    rolls.push({frame,ball:2,pins:all.slice(),ballId:'ball-'+letter});
    rolls.push({frame,ball:3,pins:all.slice(),ballId:'ball-'+letter});
   }
  }else{
   rolls.push({frame,ball:1,pins:all.slice(0,9),ballId:'ball-'+letter});
   rolls.push({frame,ball:2,pins:[10],ballId:'ball-'+letter});
   if(frame===10)rolls.push({frame,ball:3,pins:all.slice(),ballId:'ball-'+letter});
  }
 }
 return {id:'game-i2-'+letter,includeStats:true,rolls};
}
function personal(letter){
 if(letter==='B')return {version:2,hand:'diestro',sessions:[],balls:[],patterns:[]};
 const type=letter==='C'?'oficial':'entrenamiento';
 return {version:2,hand:letter==='C'?'zurdo':'diestro',
  sessions:[{id:'session-i2-'+letter,type,date:'2026-11-08',
   title:'Partida de prueba '+letter,venue:'Pista ficticia',games:[
    completeGame(letter,letter==='C'?'strikes':'spares')
   ]}],
  balls:[{id:'ball-'+letter,brand:'Ficticia',model:'Bola de pruebas '+letter}],
  patterns:[{id:'oil-'+letter,name:'Patrón ficticio '+letter,pdfName:'patron-'+letter+'.pdf'}]
 };
}
const records=new Map();
for(const [letter,u] of Object.entries(USERS)){
 records.set(u.id,new Map([
  ...(letter==='B'?[]:[['personal',{user_id:u.id,doc_type:'personal',
   payload:personal(letter),revision:0}]]),
  ['league',{user_id:u.id,doc_type:'league',payload:{
   version:1,matches:letter==='A'?[{id:'acta-i2-A',myTeam:'Equipo ficticio A',rival:'Rival ficticio'}]:
    letter==='B'?[{id:'acta-i2-B',myTeam:'Equipo ficticio B',rival:'Rival ficticio'}]:[],
   rosters:{own:[]}},revision:0}]
 ]));
}
let current=null,currentDocs=null,gate=null,mainReady=false,view='home',archive=null,repo,i4=null,port=null,journal=null;
let simulateWriteFailure=false;
const fixtureData=letter=>letter==='B'?personal('B'):personal(letter);
const totalSessions=letter=>fixtureData(letter).sessions.length;
const fakeClient={
 auth:{async getUser(){
  if(!current)return {data:{user:null},error:{message:'LAB signed out'}};
  return{data:{user:{id:current.id,email:current.email,
   email_confirmed_at:'2026-11-08T20:00:00Z',is_anonymous:false}},error:null};
 }},
 from(table){
  if(table!=='bowling_player_documents')throw Error('Tabla ajena al LAB');
  const eligible=()=>current?.id||null;
  return{
   select(columns){
    if(columns!=='user_id,doc_type,payload,revision')throw Error('Consulta no permitida');
    return{async eq(key,id){
     if(key!=='user_id')throw Error('Filtro no permitido');
     const rows=id===eligible()?[...records.get(id).values()].map(clone):[];
     return{data:rows,error:null};
    }};
   },
   async insert(row){
    if(!current||current.id!==row.user_id)return{data:null,error:{message:'RLS denegado'}};
    if(simulateWriteFailure)return{data:null,error:{message:'I6 fixture: error de red simulado'}};
    const m=records.get(current.id);
    if(m.has(row.doc_type))return{data:null,error:{message:'Duplicado'}};
    m.set(row.doc_type,clone(row));return{data:null,error:null};
   },
   update(values){
    const filters={};
    const chain={
     eq(key,value){filters[key]=value;return chain;},
     async select(fields){
      if(fields!=='revision')throw Error('Consulta de actualización no permitida');
      if(simulateWriteFailure)return{data:null,error:{message:'I6 fixture: error de red simulado'}};
      const m=current&&records.get(current.id);
      const row=m?.get(filters.doc_type);
      if(!row||filters.user_id!==current.id||row.user_id!==current.id||
         row.revision!==filters.revision)return{data:[],error:null};
      row.payload=clone(values.payload);row.revision=values.revision;
      return{data:[{revision:row.revision}],error:null};
     }
    };return chain;
   }
  };
 }
};
const auth={
 async signIn(email,password){
  const found=Object.values(USERS).find(x=>x.email===String(email).toLowerCase());
  if(password!==SECRET||!found)throw Error('Credenciales de demostración inválidas');
  current=found;return{session:{access_token:'LAB_MEMORY_ONLY'}};
 },
 async getVerifiedUser(){
  if(!current)throw Error('No hay identidad de LAB');
  return{id:current.id,email:current.email};
 },
 async signOut(){current=null;},
 onAuthChange(){return()=>{}},
 async requestReset(){return true;}
};
const fixtureRepo=root.MiBowlingPrivateRepository.create(fakeClient);
// A fake, local-only backend: anonymous UUIDs are not user accounts. Gate
// verifies against fixtureRepo, then confirmed payloads are loaded through
// authenticated, owner-bound encrypted IndexedDB CAS.
repo=Object.freeze({
 async load(owner){
  const verified=await fixtureRepo.load(owner); // mock RLS identity check on EVERY call
  // The repository intentionally returns frozen documents. Recompose a fresh
  // read-only snapshot rather than mutating its object or bypassing RLS.
  const docs={owner:verified.owner,personal:clone(verified.personal),
    league:clone(verified.league)};
  if(journal){
   const confirmed=await journal.readConfirmed(owner);
   if(!confirmed)throw Error('I6: servidor cifrado ficticio sin inicializar');
   docs.personal={revision:confirmed.revision,payload:confirmed.payload};
  }
  return docs;
 },
 async write(owner,docType,payload,revision){
  if(!current||current.id!==owner||docType!=='personal'||!journal)
   throw Error('I6: intento de escritura personal sin sesión ficticia válida');
  if(simulateWriteFailure)throw Error('I6: red simulada sin servicio');
  await fixtureRepo.load(owner); // RLS mock gate; no cross-owner
  return journal.writeConfirmed(owner,payload,revision);
 }
});
function setStatus(text,type='info'){
 const node=$('lab-private-summary');
 node.textContent=text;node.dataset.kind=type;
}
function prohibitUploads(){
 dom.addEventListener('change',event=>{
  if(event.target?.matches?.('input[type="file"]')){
   event.preventDefault();event.stopImmediatePropagation();
   event.target.value='';
   setStatus('Adjuntar archivos reales no está permitido en este LAB.','warning');
  }
 },true);
}
async function archiveProof(letter){
 const u=USERS[letter],p=fixtureData(letter);
 const sourceKey=root.MiBowlingProfiles.storageKey('mi-bowling-analitica-v2',u.source);
 const storage={getItem:key=>key===sourceKey?
  JSON.stringify({...p,localPlayer:{id:u.source},
   leagueNational:{matches:[{id:'archivo-ficticio-'+letter}]}}):null};
 const file=p.patterns.length?pdfFor(letter):null;
 const pkg=await root.MiBowlingMigrationLAB.capture({
  storage,readPdf:async pattern=>p.patterns.some(x=>x.id===pattern)?file:null,
  sourceProfileId:u.source,ownerId:u.id,confirmOwnerId:u.id,
  acknowledge:root.MiBowlingMigrationLAB.ACK
 });
 await root.MiBowlingMigrationLAB.verify(pkg,{ownerId:u.id});
 archive={owner:u.id,source:u.source,sha256:pkg.sha256,pdfs:pkg.files.length,stats:pkg.stats};
 $('lab-archive-proof').textContent='Origen local '+u.source+
  ' · '+pkg.stats.games+' partidas · '+pkg.stats.balls+' bolas · '+
  pkg.files.length+' PDF ficticios · SHA-256 '+pkg.sha256.slice(0,16)+'…';
}
function showMain(){
 view='home';
 $('lab-visual').hidden=true;$('lab-live-app').hidden=false;
 if(mainReady)root.go('inicio');
 updatePressed();
}
function showCalendar(){
 view='calendar';
 $('lab-visual').hidden=true;$('lab-live-app').hidden=false;
 if(mainReady)root.go('calendario');
 updatePressed();
}
function showLeague(){
 view='league';
 $('lab-visual').hidden=true;$('lab-live-app').hidden=false;
 if(mainReady)root.go('liga');
 updatePressed();
}
function drawVisual(){
 if(!mainReady||!current)return;
 const a=Function("return periodAggregate(aggregate('entrenamiento',''))")();
 $('lab-pinmap').innerHTML=root.MiBowlingPinStats.html(a,{
  period:'all',profileName:current.name
 });
}
function showVisual(){
 view='visual';
 $('lab-live-app').hidden=true;$('lab-visual').hidden=false;
 drawVisual();updatePressed();
}
function updatePressed(){
 const map={home:'lab-home',calendar:'lab-calendar',visual:'lab-stats',league:'lab-league'};
 for(const id of Object.values(map))$(id).setAttribute('aria-pressed',id===map[view]?'true':'false');
}
async function saveInLAB(){
 if(!mainReady||!current||!i4)throw Error('No existe sesión ficticia válida');
 const result=await i4.flush();
 if(result.blocked||result.pending)throw Error('I4 bloqueado: '+(result.error||result.phase));
 const body=Function('return JSON.parse(JSON.stringify(db))')();
 const reloaded=await repo.load(current.id);
 if(reloaded.owner!==current.id||reloaded.personal.revision!==result.revision||
   JSON.stringify(reloaded.personal.payload)!==JSON.stringify(body))
  throw Error('La copia privada de prueba no coincide con las partidas');
 currentDocs=reloaded;
 setStatus('I6 cifrado: revisión '+result.revision+' verificada · Liga separada.','success');
 return result.revision;
}
async function activateMain(){
 if(mainReady||!current||!i4||i4.state().blocked)throw Error('I6: desbloqueo de engine no permitido');
 const docs=await repo.load(current.id);
 if(docs.owner!==current.id)throw Error('I6: acceso cruzado');
 currentDocs=docs;
 port=root.MiBowlingI4Engine.createPort({
  personal:docs.personal.payload,league:docs.league.payload,
  onPersonal:p=>i4.stage(p)
 });
 await root.MiBowlingI4Engine.loadMain(port);
 mainReady=true;
 $('lab-live-app').hidden=false;
 for(const id of ['lab-home','lab-calendar','lab-stats','lab-league','lab-save-private'])
  $(id).disabled=false;
 showMain();
}
function recoveryMode(){
 mainReady=false;
 $('lab-live-app').hidden=true;
 $('lab-visual').hidden=true;
 for(const id of ['lab-home','lab-calendar','lab-stats','lab-league','lab-save-private'])
  $(id).disabled=true;
}
function recoveryStatus(msg){
 $('lab-i4-recovery-status').textContent=msg;
}
async function inspectPending(){
 if(!i4)throw Error('Sin cuenta de LAB');
 const d=await i4.inspect();
 recoveryStatus('Diario ficticio: '+d.status);
 return d;
}
async function recoverPending(){
 if(!i4)throw Error('Sin cuenta de LAB');
 const status=await i4.recover();
 recoveryStatus('Recuperación: '+status.phase+' · revisión '+status.revision);
 if(!status.blocked&&!mainReady)await activateMain();
 return status;
}
async function mergePending(){
 if(!i4)throw Error('Sin cuenta de LAB');
 const status=await i4.safeMerge('CONFIRMAR-FUSION-FICTICIA');
 recoveryStatus('Fusión conservadora: '+status.phase);
 if(!status.blocked&&!mainReady)await activateMain();
 return status;
}
async function verifyPending(){
 if(!i4)throw Error('Sin cuenta de LAB');
 const backup=await i4.exportPending();
 recoveryStatus(backup?'Copia ficticia íntegra · SHA-256 '+backup.checksum.slice(0,16)+'…':'Sin copia pendiente');
 return backup?{checksum:backup.checksum,owner:backup.owner}:null;
}
async function prepareMain({user,documents}){
 if(mainReady)throw Error('El motor solo puede abrirse una vez por sesión');
 if(user.id!==current?.id||documents.owner!==current.id)
  throw Error('UUID no coincide con la sesión de LAB');
 if(!isolation.status().ready)throw Error('El aislamiento ha dejado de estar activo');
 // No real identities/keys: explicit test passphrase never persists.
 const passphrase=$('lab-i6-passphrase').value;
 if(typeof passphrase!=='string'||passphrase.length<12)
  throw Error('I6: introduce primero una frase de desbloqueo ficticia de al menos 12 caracteres');
 currentDocs=documents;
 const letter=Object.keys(USERS).find(k=>USERS[k].id===current.id);
 await archiveProof(letter);
 journal=await root.MiBowlingI6EncryptedJournal.unlock({owner:current.id,passphrase});
 // Bootstrap a fake confirmed-score record ONLY if this UUID has never saved.
 // A fresh login MUST NOT replace any previous encrypted local server result.
 await journal.seedConfirmed(current.id,documents.personal.payload,documents.personal.revision);
 $('lab-i6-passphrase').value='';
 i4=root.MiBowlingI6Persistence.create({
  repository:repo,journal,owner:current.id,debounceMs:0,
  onStatus:status=>{
   if(status.phase==='saved')setStatus('I6: guardado ficticio verificado · revisión '+status.revision+'.','success');
   if(status.blocked)setStatus('I6 pendiente protegido ('+status.blocked+'): '+(status.error||'revisión pendiente')+'.','warning');
  }
 });
 const boot=await i4.start();
 $('lab-auth-area').hidden=true;$('lab-app-shell').hidden=false;
 $('lab-owner').textContent='👤 '+current.name+' · '+current.email;
 if(boot.state.blocked){
  recoveryMode();
  recoveryStatus('Copia cifrada detectada ('+boot.state.blocked+'). Inspecciona antes de recuperar; no se cargan partidas sin revisión.');
  return;
 }
 await activateMain();

 setStatus('Cuenta ficticia verificada · '+totalSessions(letter)+
  ' sesiones personales · journal cifrado I6 · Liga separada.','success');
}
const params=new URL(root.location.href).searchParams;
if(params.has('real')||params.has('callback')||params.has('token')){
 $('lab-safety-status').hidden=false;
 $('lab-safety-status').textContent='LAB bloqueado: no acepta cuentas, tokens o URLs reales';
 return;
}
prohibitUploads();
gate=root.MiBowlingAuthGate.create({
 document:dom,element:$('auth-gate'),auth,repository:repo,
 allowSignUp:false,onReady:prepareMain,
 onClose:async()=>{
  // The real main app has global variables; never reuse it for another owner.
  // Reload clears all transient data, prevents a stale app from reading B's state.
  $('lab-app-shell').hidden=true;
  i4?.close();i4=null;
  port?.close();port=null;
  journal?.close();journal=null;
  isolation.local.clear();isolation.session.clear();
  root.location.reload();
 }
});
gate.init();
for(const button of dom.querySelectorAll('[data-demo-account]')){
 button.addEventListener('click',async()=>{
  if(mainReady)return;
  const letter=button.getAttribute('data-demo-account');
  try{await gate.login(USERS[letter].email,SECRET);}
  catch(err){$('lab-safety-status').textContent='LAB: '+err.message;$('lab-safety-status').hidden=false}
 });
}
$('lab-home').addEventListener('click',showMain);
$('lab-calendar').addEventListener('click',showCalendar);
$('lab-stats').addEventListener('click',showVisual);
$('lab-league').addEventListener('click',showLeague);
$('lab-brand').addEventListener('click',showMain);
$('lab-save-private').addEventListener('click',()=>saveInLAB().catch(err=>setStatus(err.message,'error')));
$('lab-logout').addEventListener('click',()=>gate.logout().catch(err=>setStatus(err.message,'error')));
dom.addEventListener('click',e=>{
 if(e.target?.closest?.('#lab-pinmap .pinmap-tabs button,#lab-pinmap .pinmap-pin'))
  root.setTimeout(()=>{if(view==='visual')drawVisual()},0);
});

for(const [id,action] of [
 ['lab-i4-inspect',inspectPending],['lab-i4-recover',recoverPending],
 ['lab-i4-merge',mergePending],['lab-i4-export',verifyPending]]){
 $(id).addEventListener('click',()=>action().catch(e=>recoveryStatus('LAB bloqueado: '+e.message)));
}
root.MiBowlingIntegrationI6=Object.freeze({
 getState:()=>({
  owner:current?.id||null,email:current?.email||null,
  persistence:i4?.state()||null,
  directLocalStorageDependency:false,
  encryptedConfirmedBackend:true,
  encryptedJournalUnlocked:!!journal,
  recoveryOnly:!!(i4?.state().blocked&&!mainReady),
  portActive:!!root.MiBowlingI4Port,
  opened:mainReady,view,archive:archive?clone(archive):null,
  auth:gate.getState(),isolation:isolation.status(),
  sessions:currentDocs?.personal?.payload?.sessions?.length??null,
  balls:currentDocs?.personal?.payload?.balls?.length??null,
  calendarCount:root.BOWLING_OFFICIAL_CALENDAR_2026_27?.length??0,
  galician:root.BOWLING_OFFICIAL_CALENDAR_2026_27?.filter(x=>x.category==='gallego').length??0,
  national:root.BOWLING_OFFICIAL_CALENDAR_2026_27?.filter(x=>x.category==='nacional').length??0,
  localSourceOnly:!isolation.local.getItem('mi-bowling-local-profiles-v1')
 }),
 async crossOwnerDenied(targetLetter){
  const target=USERS[targetLetter];if(!current||!target)throw Error('No hay usuario');
  try{await repo.load(target.id);return false}
  catch(err){return /Acceso denegado/.test(err.message)}
 },
 demoAccounts:()=>Object.values(USERS).map(({id,email,name,source})=>({id,email,name,source})),
 saveInLAB,inspectPending,recoverPending,mergePending,verifyPending,
 simulateNetworkFailure(value){if(!current)throw Error('I6: solo identidad ficticia');
  simulateWriteFailure=!!value;return simulateWriteFailure;},
 async hasOwnerPending(){return journal?journal.hasPending(current.id):false;},
 async confirmed(){return journal?journal.readConfirmed(current.id):null;},
 async inspectMergeShape(){
  if(!current||!i4)throw Error('I6: cuenta LAB ausente');
  const e=await i4.exportPending(),server=(await repo.load(current.id)).personal.payload;
  if(!e)return {status:'none'};
  const B=e.basePayload,L=e.payload,R=server;
  const meta=x=>{const y=clone(x);delete y.sessions;return JSON.stringify(y)};
  const identical=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const checkOld=(arr)=>B.sessions.every(s=>identical(s,arr.find(x=>x.id===s.id)));
  return {status:'ok',baseSessions:B.sessions.length,
   localSessions:L.sessions.length,remoteSessions:R.sessions.length,
   metaBaseLocal:meta(B)===meta(L),metaBaseRemote:meta(B)===meta(R),
   previousBaseLocal:checkOld(L),previousBaseRemote:checkOld(R),
   newIdsOverlap:L.sessions.filter(s=>!B.sessions.some(x=>x.id===s.id)).some(s=>
    R.sessions.some(x=>x.id===s.id)),
   normBaseLocal:identical(Function('return migrate('+JSON.stringify(B)+')')(),
     Function('return migrate('+JSON.stringify(L)+')')())
  };
 }
});
})(window);
