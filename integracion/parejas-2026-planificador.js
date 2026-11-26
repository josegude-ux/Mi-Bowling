'use strict';
/* MI BOWLING · Campeonato España Parejas 2026 2ª/3ª masculina.
 * Lógica de dominio pura (sin LocalStorage, IDB, fotos, API ni escrituras).
 * Compatibilidad v2: la identidad del evento se conserva en notes y competition.
 */
(function(root,factory){
 const mod=factory();
 if(typeof module==='object'&&module.exports)module.exports=mod;
 else root.MiBowlingParejas2026Plan=Object.freeze(mod);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const PREFIX='[FEB6249:PAREJAS-2M3M:';
 const DAYS=Object.freeze(['2026-11-28','2026-11-29']);
 const TITLE=Object.freeze({'2026-11-28':'Sábado 28/11','2026-11-29':'Domingo 29/11'});
 const VENUE='Ozone Bowling X-Madrid';
 const PATTERN='PAREJAS 2026 · KEGEL IKON · 41 pies · 26,5 ml';
 const MAX_GAMES=6;
 const marker=day=>PREFIX+day+']';
 const validLane=v=>Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=999;
 const pairFor=lane=>{
  if(!validLane(lane))return null;
  const n=Number(lane),p=n%2===0?n-1:n;return[p,p+1];
 };
 function dayOf(s){
  if(!s||s.type!=='oficial'||typeof s.notes!=='string')return null;
  return DAYS.find(d=>s.date===d&&s.notes.split('\n').includes(marker(d)))||null;
 }
 function sameDay(sessions,day){
  if(!DAYS.includes(day))return null;
  return (sessions||[]).find(s=>dayOf(s)===day)||null;
 }
 function suggestedNextLane(g){
  // Dos PISTAS a la derecha, no dos PARES; no inferir límites ni vueltas.
  const n=Number(g?.startLane);
  return validLane(n)&&n<=997?n+2:null;
 }
 function initialLane(day,lane){
  if(!DAYS.includes(day))throw Error('DIA_NO_PERMITIDO');
  const chosen=lane===undefined||lane===null||lane===''?(day===DAYS[0]?17:null):Number(lane);
  if(!validLane(chosen))throw Error('PISTA_INICIAL_PENDIENTE');
  return Number(chosen);
 }
 function draft(day,lane,idFactory){
  const n=initialLane(day,lane);
  if(typeof idFactory!=='function')throw Error('ID_FACTORY_REQUIRED');
  const id=idFactory(),gameId=idFactory();
  if(!id||!gameId||id===gameId)throw Error('ID_INVALIDO');
  return {
   id,type:'oficial',date:day,title:'Cto. España Parejas 2026 · '+TITLE[day],
   venue:VENUE,pattern:PATTERN,patternId:'',patternNotes:'Reverse brush drop 34 pies. Circular FEB 6249, pág. 7.',
   goal:null,
   competition:'Cto. España Parejas 2026 · CELTA XUNTA',
   notes:marker(day)+'\nPareja CELTA XUNTA · José Gude Bermúdez (ES 0147) / Lázaro Galguera Gómez (ES 1046).\nPistas: desplazamiento +2 después de cada partida; confirmar en pista la siguiente y el retorno a inicio.\nLa tabla FEB muestra turno 0 para la pareja aunque el encabezado anuncia 09:00.',
   currentBallId:'',currentLine:{approach:'',arrow:'',breakpoint:''},lane:n,
   games:[{id:gameId,includeStats:true,pair:pairFor(n),startLane:n,segments:[],rolls:[]}]
  };
 }
 function canNext(s){
  return !!dayOf(s)&&Array.isArray(s.games)&&s.games.length<MAX_GAMES&&s.games.length>=1;
 }
 function nextConfig(s,lane){
  if(!canNext(s))throw Error('SERIE_COMPLETA_O_NO_VALIDA');
  const last=s.games[s.games.length-1];
  const n=lane===undefined||lane===null?suggestedNextLane(last):Number(lane);
  if(!validLane(n))throw Error('CONFIRMAR_PISTA_SIGUIENTE');
  return{pair:pairFor(n),startLane:Number(n)};
 }
 function summary(s,complete,score){
  if(!dayOf(s))return null;
  const done=s.games.filter(g=>complete(g));
  const totals=done.map(g=>score(g));
  const total=totals.reduce((a,b)=>a+b,0);
  return{day:dayOf(s),played:done.length,started:s.games.length,total,average:totals.length?total/totals.length:null,remaining:Math.max(0,MAX_GAMES-done.length)};
 }
 return Object.freeze({DAYS,MAX_GAMES,PATTERN,VENUE,TITLE,marker,dayOf,sameDay,validLane,pairFor,suggestedNextLane,initialLane,draft,canNext,nextConfig,summary});
});
