/* MI BOWLING CP016 · Doble lectura v2/v3 (solo LAB). Sin red ni escrituras.
 * Contrato: instantaneas JSON ficticias, atomicidad y proyeccion estadistica de lectura.
 * No importar en produccion ni sustituir el migrador del repositorio.
 */
(function(root,factory){
  const B=factory(typeof module==='object'&&module.exports ? require('./source_CP015/codigo/cp014-compat-bridge.js') : root.BowlingCp014Compat);
  if(typeof module==='object'&&module.exports) module.exports=B;
  if(root)root.BowlingCp016Coexist=B;
})(typeof globalThis!=='undefined'?globalThis:null,function(A){
'use strict';
if(!A||typeof A.fromLegacyV2!=='function')throw Error('CP014 original requerido');
const FORMAT='mi-bowling-cp016-readonly', MARK='cp016-synthetic-only';
const clone=o=>JSON.parse(JSON.stringify(o));
const check=(v,m)=>{if(!v)throw new Error(m)};
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const acceptedMarkers=new Set([MARK,'cp015-synthetic-only']);
function decode(source,label){
  if(source===null||source===undefined)return null;
  if(typeof source==='string'){
    check(source.length<=1048576,`${label}: JSON excede 1 MB`);
    try{source=JSON.parse(source)}catch{throw new Error(`${label}: JSON inválido`)}
  }
  check(plain(source),`${label}: instantánea inválida`);
  const raw=clone(source);
  check(acceptedMarkers.has(raw.labFixture),`${label}: solo instantáneas sintéticas CP015/CP016`);
  check(Array.isArray(raw.sessions),`${label}: sesiones requeridas`);
  check(raw.sessions.length<=100,`${label}: demasiadas sesiones`);
  for(const ses of raw.sessions){
    check(plain(ses)&&typeof ses.id==='string'&&/^cp0(15|16)-fake-[a-z\d-]+$/i.test(ses.id),`${label}: ID de sesión no ficticio`);
    check(Array.isArray(ses.games)&&ses.games.length<=500,`${label}: lista de partidas inválida`);
    for(const g of ses.games)check(plain(g)&&typeof g.id==='string'&&/^cp0(15|16)-fake-[a-z\d-]+$/i.test(g.id),`${label}: partida no ficticia`);
  }
  if(Array.isArray(raw.balls))for(const ball of raw.balls)check(plain(ball)&&typeof ball.id==='string'&&/^cp0(15|16)-fake-[a-z\d-]+$/i.test(ball.id),`${label}: bola no ficticia`);
  return raw;
}
function analyse({legacy=null,modern=null}={}){
  const rawLegacy=decode(legacy,'v2'),rawModern=decode(modern,'v3');
  check(rawLegacy!==null||rawModern!==null,'Al menos un espacio de prueba es necesario');
  if(rawLegacy!==null)check(rawLegacy.version===2&&!Object.hasOwn(rawLegacy,'format'),'La instantánea v2 debe ser legacy sin sobreescrituras');
  if(rawModern!==null)check(rawModern.version===3&&rawModern.format===A.FORMAT,'Formato v3 incompatible');
  const v2=rawLegacy===null?null:A.fromLegacyV2(rawLegacy);
  const v3=rawModern===null?null:A.roundTripJSON(rawModern);
  const all=[...(v2?.sessions||[]),...(v3?.sessions||[])];
  const sessIds=new Set(),gameIds=new Set();
  for(const s of all){
    check(!sessIds.has(s.id),'Colisión de ID de sesión: proyección detenida');sessIds.add(s.id);
    for(const g of s.games){check(!gameIds.has(g.id),'Colisión de ID de partida: proyección detenida');gameIds.add(g.id)}
  }
  const combined={format:A.FORMAT,version:3,labFixture:MARK,hand:'diestro',balls:[],patterns:[],sessions:clone(all)};
  A.validateDocument(combined);
  const agg=A.summary(combined);
  const legacyS=new Set((v2?.sessions||[]).map(s=>s.id));
  const perGame=agg.perGame.map(g=>({...g,completed:g.completed===true,
    eligibleForOverallAverage:g.eligibleForOverallAverage===true,
    eligibleForFrameAnalysis:g.eligibleForFrameAnalysis===true,
    eligibleForPinPatternAnalysis:g.eligibleForPinPatternAnalysis===true,
    source:legacyS.has(g.sessionId)?'v2 · histórico':'v3 · nuevo'}));
  const sourceSummary=Object.freeze({legacySessions:v2?.sessions.length||0,modernSessions:v3?.sessions.length||0,
    legacyGames:v2?.sessions.reduce((n,s)=>n+s.games.length,0)||0,modernGames:v3?.sessions.reduce((n,s)=>n+s.games.length,0)||0});
  return {format:FORMAT,labFixture:MARK,version:1,sourceSummary,
    stats:{totalGames:agg.totalGames,qualifyingGames:agg.qualifyingGames,averageScore:agg.averageScore,
      bestScore:agg.bestScore,frameAnalysisEligibleGames:agg.frameAnalysisEligibleGames,
      pinPatternEligibleGames:agg.pinPatternEligibleGames,finalOnlyGames:agg.finalOnlyGames},
    perGame,spaces:{legacy:rawLegacy,modern:rawModern},
    immutableInputs:{legacy:rawLegacy===null?null:JSON.stringify(rawLegacy),modern:rawModern===null?null:JSON.stringify(rawModern)}};
}
function revalidateBundle(value){
  if(typeof value==='string'){
    check(value.length<=2097152,'El paquete supera 2 MB');
    try{value=JSON.parse(value)}catch{throw Error('Paquete JSON inválido')}
  }
  check(plain(value)&&value.format===FORMAT&&value.version===1&&value.labFixture===MARK,'Paquete CP016 no reconocido');
  check(plain(value.spaces),'Faltan espacios independientes');
  return analyse({legacy:value.spaces.legacy??null,modern:value.spaces.modern??null});
}
function pack(snapshot){
  const validated=revalidateBundle(snapshot);
  return JSON.stringify({format:FORMAT,version:1,labFixture:MARK,spaces:validated.spaces},null,2);
}
function buildLegacyFixture(){
  const pins=[1,2,3,4,5,6,7,8,9,10],rolls=[];
  for(let f=1;f<=10;f++)rolls.push({frame:f,ball:1,pins:[...pins],ballId:'',line:{approach:'',arrow:'',breakpoint:''},foul:false});
  rolls.push({frame:10,ball:2,pins:[...pins],ballId:'',foul:false});
  rolls.push({frame:10,ball:3,pins:[...pins],ballId:'',foul:false});
  return {version:2,labFixture:MARK,hand:'diestro',balls:[],patterns:[],sessions:[{id:'cp016-fake-session-v2',date:'2026-01-01',title:'Histórico sintético',type:'entrenamiento',games:[{id:'cp016-fake-game-300',rolls,pair:null,startLane:null,segments:[],includeStats:true}]}]};
}
function buildFinalFixture(score=278){
  check(Number.isInteger(score)&&score>=0&&score<=300,'Resultado final ficticio inválido');
  return {format:A.FORMAT,version:3,labFixture:MARK,hand:'diestro',balls:[],patterns:[],sessions:[{id:'cp016-fake-session-v3',date:'2026-01-01',title:'Resultado sintético',type:'entrenamiento',games:[{id:'cp016-fake-game-278',entryKind:'final_only',finalOnlyScore:score,rolls:[],includeStats:true}]}]};
}
return Object.freeze({FORMAT,MARK,analyse,revalidateBundle,pack,buildLegacyFixture,buildFinalFixture});
});
