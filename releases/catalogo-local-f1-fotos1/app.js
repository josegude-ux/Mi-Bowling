'use strict';
/* Mi Bowling · versión analítica local. Sin dependencias ni cuentas. */
const APP_VERSION='3.3.28-prueba';
const KEY='mi-bowling-analitica-v2', OLDKEY='mi-bowling-v1';
const PINS=[1,2,3,4,5,6,7,8,9,10], RACK=[[7,8,9,10],[4,5,6],[2,3],[1]];
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,9);
const p100=(a,b)=>b?`${Math.round(100*a/b)}%`:'—';
const fmt=v=>Number(v).toLocaleString('es-ES',{maximumFractionDigits:1,minimumFractionDigits:1});
const today=()=>{let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const normalPair=x=>{let n=parseInt(x,10);if(!Number.isInteger(n)||n<1||n>999)return null;return n%2===0?[n-1,n]:[n,n+1]};
const intLane=x=>{const n=parseInt(x,10);return Number.isInteger(n)&&n>0&&n<1000?n:null};
const cleanLine=o=>({approach:String(o?.approach??''),arrow:String(o?.arrow??''),breakpoint:String(o?.breakpoint??'')});
const emptyDB=()=>({version:2,hand:'diestro',balls:[],patterns:[],sessions:[]});
function migrate(data){const o=emptyDB();if(!data||typeof data!=='object')return o;o.hand=data.hand==='zurdo'?'zurdo':'diestro';o.balls=Array.isArray(data.balls)?data.balls.filter(b=>b&&b.id):[];o.patterns=Array.isArray(data.patterns)?data.patterns.filter(p=>p&&p.id).map(p=>({...p})):[];
 o.sessions=(Array.isArray(data.sessions)?data.sessions:[]).filter(s=>s&&Array.isArray(s.games)).map(s=>({
 id:s.id||uid(),type:s.type==='oficial'?'oficial':'entrenamiento',date:s.date||today(),title:s.title||'',venue:s.venue||'',notes:s.notes||'',pattern:s.pattern||'',patternId:s.patternId||'',patternNotes:s.patternNotes||'',competition:s.competition||'',leagueOther:!!s.leagueOther,leaguePlayer:s.leaguePlayer||'',goal:s.type==='oficial'?null:(s.goal&&typeof s.goal==='object'?{kind:String(s.goal.kind||''),target:Number(s.goal.target)||0}:null),
 currentBallId:s.currentBallId||'',...(typeof s.spareBallId==='string'&&s.spareBallId?{spareBallId:s.spareBallId}:{}),currentLine:cleanLine(s.currentLine),lane:intLane(s.lane)||null,
 games:s.games.map(g=>({id:g.id||uid(),...(validFinalOnly(g.finalOnly)?{finalOnly:g.finalOnly}:{}),pair:Array.isArray(g.pair)&&g.pair.length===2?g.pair.map(Number):null,startLane:intLane(g.startLane)||null,
 includeStats:g.includeStats!==false,segments:Array.isArray(g.segments)?g.segments.filter(e=>e&&e.pair&&e.fromFrame).map(e=>({fromFrame:+e.fromFrame,pair:e.pair.map(Number),startLane:+e.startLane})):[],
 rolls:(g.rolls||[]).map(r=>({frame:+r.frame,ball:+r.ball,pins:Array.isArray(r.pins)?r.pins.map(Number).filter(p=>PINS.includes(p)):[],ballId:r.ballId||'',line:cleanLine(r.line),lane:intLane(r.lane)||null,pair:Array.isArray(r.pair)?r.pair:null,foul:!!r.foul,createdAt:r.createdAt||null,...(r.pinDetail==='count'&&Number.isInteger(r.count)&&r.count>=0&&r.count<=10?{pinDetail:'count',count:r.count,pins:[]}:{})}))}))
 }));return o}
let selectedPatternId='',patternMode='entrenamiento';
let registryDetailsOpen=false,registryHistoryOpen=false;
let ligaGame=0,ligaMatch=0,ligaSelected=0;
const LIGA_KEY='mi-bowling-liga-v1';
const ligaBlank=()=>({id:uid(),date:today(),rival:'Equipo rival',myTeam:'Mi equipo',match:1,players:Array.from({length:12},(_,i)=>({name:(i<6?'Jugador ':'Rival ')+(i%6+1),team:i<6?'own':'rival',trio:(i%6)<3?1:2,frames:Array.from({length:2},()=>Array.from({length:10},()=>({a:null,b:null,c:null,monitor:null,kind:''}))),startFrame:1}))});
let ligaData;try{ligaData=JSON.parse(localStorage.getItem(LIGA_KEY)||'null')}catch(e){}
if(!ligaData||!Array.isArray(ligaData.matches))ligaData={matches:[ligaBlank()]};
const ligaCurrent=()=>ligaData.matches[ligaMatch]||ligaData.matches[0];
function ligaSave(){try{window.MiBowlingEscritura.write(LIGA_KEY,JSON.stringify(ligaData))}catch(e){alert('No se pudo guardar la Liga. Exporta una copia y revisa el espacio.')}}

let ligaReturn=null;
let db;
try { db=migrate(JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(OLDKEY)||'null')); }catch {db=emptyDB()}
let pinSubtab='derribos',statsPeriod='all',quickLayout='standard',comboKind='normal',compSessionId='',tab='inicio',activeId=null,selection=[],statMode='entrenamiento',statPane='general',historyMode='entrenamiento',ballEditingId=null,editPair=false,showNext=false,noticeText='',statsBallId='',expanded={};
let saveError=false;
let updateAvailable=false;try{quickLayout=localStorage.getItem('mi-bowling-quick-layout')||'standard'}catch(e){}
let swRegistration=null;
let updateCheckStarted=false;
function updateStatus(msg,showButton=false){const state=$('update-state'),button=$('apply-update');if(state)state.textContent=msg;if(button)button.style.display=showButton?'':'none'}
async function checkForUpdates(manual=false){if(!('serviceWorker' in navigator)||!location.protocol.startsWith('http')){if(manual)updateStatus('Actualización automática disponible al publicar en HTTPS.');return}try{const reg=swRegistration||await navigator.serviceWorker.ready;swRegistration=reg;await reg.update();if(reg.waiting){updateAvailable=true;updateStatus('Nueva versión preparada. Cierra todas las ventanas de MI BOWLING y vuelve a abrir para actualizar sin interrumpir una partida.',true)}else if(updateAvailable){updateStatus('Nueva versión descargada. Pulsa Actualizar ahora.',true)}else if(manual){updateStatus('Comprobación realizada. Si hay cambios, se descargarán automáticamente.')}}catch(e){if(manual)updateStatus('No se pudo comprobar. Revisa tu conexión e inténtalo otra vez.')}}
function applyUpdate(){if(!updateAvailable)return;if(swRegistration?.waiting){updateStatus('Cierra todas las ventanas de MI BOWLING y vuelve a abrir. Tus datos permanecen en este dispositivo.',true);return}window.location.reload()}

function save(){try{window.MiBowlingEscritura.write(KEY,JSON.stringify(db));saveError=false;window.MiBowlingNube?.programar()}catch(err){saveError=true;alert('No se ha podido guardar. Exporta una copia de seguridad y revisa el espacio del dispositivo.')}}

/* CATÁLOGO Y ARSENAL F1 LAB: selección operativa; no modifica db/balls/sessions. */
const BALL_SELECTION_KEY='mi-bowling-ball-selection-v1';
const BALL_SELECTION_NEXT='__next__';
let ballPickTarget=BALL_SELECTION_NEXT,ballPickReturn='inicio',ballPickPins=null,ballPickerOpening=false,ballPickNewSessionDraft=null;
function readBallSelections(){
 try{const value=JSON.parse(localStorage.getItem(BALL_SELECTION_KEY)||'{}');
 return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
 catch{return {}}
}
let ballSelections=readBallSelections(),ballSelectionSaveError=false;
function latestBallSelections(){
 // Combinar con la copia local más reciente; si hubo fallo de cuota, conservar memoria.
 if(!ballSelectionSaveError)ballSelections=readBallSelections();
 return ballSelections;
}
function cleanSelectedBallIds(ids){
 if(!Array.isArray(ids))return [];
 // El catálogo persistido es la fuente vigente entre pestañas: una restauración
 // puede sustituir IDs y una retirada puede volver obsoleta la copia en memoria.
 // Si el almacenamiento no es legible, se mantiene el comportamiento local previo.
 let activeCatalog=db.balls;
 try{
  const stored=JSON.parse(localStorage.getItem(KEY)||'null');
  if(Array.isArray(stored?.balls))activeCatalog=stored.balls;
 }catch{}
 return [...new Set(ids)].filter(id=>typeof id==='string'&&activeCatalog.some(b=>b&&b.id===id&&!b.retired));
}
function selectedBallsFor(key){
 const current=latestBallSelections();
 return Object.prototype.hasOwnProperty.call(current,key)?cleanSelectedBallIds(current[key]):null;
}
function persistBallSelections(next){
 ballSelections=next;
 try{window.MiBowlingEscritura.write(BALL_SELECTION_KEY,JSON.stringify(next));ballSelectionSaveError=false}
 catch{ballSelectionSaveError=true;alert('No se pudo guardar la selección para la próxima apertura. Podrás seguir jugando durante esta sesión.')}
}
// Los cambios de otra pestaña se reflejan sin reemplazar borradores ni tiradas en curso.
window.addEventListener('storage',event=>{
 if(event.key!==BALL_SELECTION_KEY||ballSelectionSaveError)return;
 ballSelections=readBallSelections();
 if(tab==='bolas'&&!ballEditingId)render();
});
function toggleSelectedBall(id,checked){
 if(!db.balls.some(b=>b.id===id&&!b.retired))return;
 const current=latestBallSelections();
 const chosen=new Set(Object.prototype.hasOwnProperty.call(current,ballPickTarget)?cleanSelectedBallIds(current[ballPickTarget]):[]);
 if(checked)chosen.add(id);else chosen.delete(id);
 persistBallSelections({...current,[ballPickTarget]:cleanSelectedBallIds([...chosen])});
 render();
}
function captureNewSessionDraft(){
 const form=$('newSessionForm');
 if(!form)return null;
 return Array.from(form.querySelectorAll('input,select,textarea')).filter(el=>el.type!=='file'&&(el.id||el.name)).map(el=>({
  id:el.id,name:el.name,value:el.value,checked:el.type==='checkbox'||el.type==='radio'?el.checked:null
 }));
}
function restoreNewSessionDraft(draft){
 if(!draft||!$('newSessionForm'))return;
 const form=$('newSessionForm');
 function restoreOne(item){
  const el=item.id?form.querySelector('[id="'+item.id+'"]'):Array.from(form.elements).find(e=>e.name===item.name);
  if(!el||el.type==='file'||el.disabled)return;
  if(el.tagName==='SELECT'){
   if(Array.from(el.options).some(o=>o.value===item.value))el.value=item.value;
  }else if(item.checked!==null){el.checked=item.checked}
  else el.value=item.value;
 }
 draft.filter(x=>x.name!=='startLane').forEach(restoreOne);
 if($('lane-pair'))updatePairHint();
 draft.filter(x=>x.name==='startLane').forEach(restoreOne);
 if($('s-patternId'))patternPreview($('s-patternId').value);
}
function openBallPickerFor(sessionId='',returnTo='inicio'){
 ballPickTarget=sessionId&&db.sessions.some(s=>s.id===sessionId)?sessionId:BALL_SELECTION_NEXT;
 ballPickReturn=returnTo;ballPickPins=returnTo==='registro'?[...selection]:null;
 ballPickNewSessionDraft=returnTo==='nueva'?captureNewSessionDraft():null;
 ballEditingId=null;ballPickerOpening=true;go('bolas');ballPickerOpening=false;
}
function closeBallPicker(){
 const back=ballPickReturn,pins=ballPickPins,draft=ballPickNewSessionDraft;
 ballPickPins=null;ballPickNewSessionDraft=null;go(back);
 if(back==='nueva')restoreNewSessionDraft(draft);
 if(back==='registro'&&pins){selection=pins;render()}
}
function transferBallSelectionToSession(id){
 const current=latestBallSelections();
 const picked=Object.prototype.hasOwnProperty.call(current,BALL_SELECTION_NEXT)?cleanSelectedBallIds(current[BALL_SELECTION_NEXT]):null;
 if(picked===null)return;
 const next={...current,[id]:picked};delete next[BALL_SELECTION_NEXT];
 persistBallSelections(next);
}
function removeRetiredBallFromSelections(id){
 const next={...latestBallSelections()};
 let changed=false;
 for(const [scope,ids] of Object.entries(next)){
  if(!Array.isArray(ids)||!ids.includes(id))continue;
  next[scope]=ids.filter(ballId=>ballId!==id);
  changed=true;
 }
 if(changed)persistBallSelections(next);
}
function session(){return db.sessions.find(s=>s.id===activeId)||null}
function game(s){return s?.games[s.games.length-1]}
function rollsIn(g,f){return(g?.rolls||[]).filter(r=>r.frame===f)}
// 3.3.15 · Formato ampliado compatible: tirada por cantidad (pinDetail:'count', count) y partida solo con resultado (finalOnly).
function validFinalOnly(v){return Number.isInteger(v)&&v>=0&&v<=300}
function isFinalOnly(g){return !!g&&validFinalOnly(g.finalOnly)}
function exactRoll(r){return r.pinDetail!=='count'}
function exactGame(g){return !isFinalOnly(g)&&(g?.rolls||[]).every(exactRoll)}
function kn(r){return r?(r.pinDetail==='count'?r.count:r.pins.length):0}
function standingAfter(r){return r.pinDetail==='count'?null:PINS.filter(p=>!r.pins.includes(p))}
function next(g){if(isFinalOnly(g))return{done:true};for(let f=1;f<=10;f++){
 const a=rollsIn(g,f), x=kn(a[0]),y=kn(a[1]);
 const fresh=(frame,ball)=>({frame,ball,available:[...PINS],capacity:10});
 const rest=(frame,ball,r)=>({frame,ball,available:standingAfter(r),capacity:10-kn(r)});
 if(f<10){if(!a.length)return fresh(f,1);if(x===10)continue;if(a.length===1)return rest(f,2,a[0]);continue}
 if(!a.length)return fresh(10,1);
 if(a.length===1)return x===10?fresh(10,2):rest(10,2,a[0]);
 if(a.length===2){if(x===10)return y===10?fresh(10,3):rest(10,3,a[1]);if(x+y===10)return fresh(10,3)}
 return{done:true}}
 return{done:true}}
const complete=g=>next(g).done;
function frameScores(g){if(isFinalOnly(g))return Array(10).fill(null);const a=(g?.rolls||[]).map(kn);let scores=[],pos=0,sum=0;
 for(let f=1;f<=10;f++) {const fr=rollsIn(g,f);if(!fr.length){scores.push(null);continue}let v=null,first=kn(fr[0]),second=fr[1]?kn(fr[1]):0;
  if(f===10){if(complete(g))v=fr.reduce((s,r)=>s+kn(r),0)}
  else if(first===10){if(a.length>=pos+3)v=10+a[pos+1]+a[pos+2]}
  else if(fr.length===2){if(first+second===10){if(a.length>=pos+3)v=10+a[pos+2]}else v=first+second}
  if(v===null)scores.push(null);else{sum+=v;scores.push(sum)}pos+=fr.length;
 }return scores}
const score=g=>{if(isFinalOnly(g))return g.finalOnly;const a=frameScores(g);return [...a].reverse().find(x=>x!==null)??0};
function currentLane(g,frame){const seg=(g.segments||[]).filter(a=>a.fromFrame<=frame).sort((a,b)=>b.fromFrame-a.fromFrame)[0];
 if(seg&&seg.pair&&seg.pair.length===2){const start=seg.pair.includes(seg.startLane)?seg.startLane:seg.pair[0];return {pair:seg.pair,lane:seg.pair[(seg.pair.indexOf(start)+(frame-seg.fromFrame))%2]}}
 if(g.pair&&g.pair.length===2){const start=g.pair.includes(g.startLane)?g.startLane:g.pair[0];return{pair:g.pair,lane:g.pair[(g.pair.indexOf(start)+frame-1)%2]}}
 return{pair:null,lane:g.startLane||null}}
function newGame(s,prev){const lastRoll=prev?.rolls?.at(-1);const pair=prev?.segments?.at(-1)?.pair||prev?.pair||null;const nextStart=pair&&lastRoll?.lane?pair.find(x=>x!==lastRoll.lane)||pair[0]:pair?.[0]||null;
 return{id:uid(),includeStats:true,rolls:[],pair:pair?[...pair]:null,startLane:pair?nextStart:(prev?.startLane||s.lane||null),segments:[]}}
function aggregate(type,ballFilter=''){const sessions=db.sessions.filter(s=>s.type===type&&!s.leagueOther&&!pendingClassification(s));const scoreGames=sessions.flatMap(s=>s.games.filter(complete).map(g=>({...g,_session:s}))).filter(g=>(type!=='entrenamiento'||g.includeStats!==false)&&(!ballFilter||g.rolls.some(r=>r.ballId===ballFilter)));const games=scoreGames.filter(exactGame);
 const allGames=sessions.flatMap(s=>s.games);const counted=games.filter(g=>complete(g));const eligibleRolls=counted.flatMap(g=>g.rolls.map(r=>({...r,_game:g}))).filter(r=>!ballFilter||r.ballId===ballFilter);
 const first=eligibleRolls.filter(r=>{if(r.ball===1)return true;if(r.frame!==10)return false;const fr=rollsIn(r._game,10),x=fr[0]?.pins.length||0,y=fr[1]?.pins.length||0;return r.ball===2&&x===10||r.ball===3&&(x===10&&y===10||x<10&&x+y===10)});
 const strikes=first.filter(r=>r.pins.length===10);let opportunities=[];
 for(const g of counted)for(let f=1;f<=10;f++){const fr=rollsIn(g,f),a=fr[0],b=fr[1];if(!a||a.pins.length===10||!b||ballFilter&&b.ballId!==ballFilter)continue;const left=PINS.filter(p=>!a.pins.includes(p));opportunities.push({left,second:b.pins,converted:left.every(p=>b.pins.includes(p)),gameId:g.id,ballId:b.ballId,lane:b.lane,pair:b.pair})}
 const totals=scoreGames.map(g=>score(g));return{sessions,scoreGames,games,counted,allGames,rolls:eligibleRolls,first,strikes,opportunities,spare:opportunities.filter(a=>a.converted).length,avg:totals.length?totals.reduce((a,b)=>a+b,0)/totals.length:0,totals};}
function cleanGame(g){if(!complete(g)||isFinalOnly(g))return false;for(let f=1;f<=10;f++){const fr=rollsIn(g,f);if(!fr.length)return false;if(kn(fr[0])===10)continue;if(fr.length<2||kn(fr[0])+kn(fr[1])!==10)return false;}return true}
function pocketStats(a){const flank=db.hand==='zurdo'?2:3;const throws=a.games.flatMap(g=>Array.from({length:10},(_,i)=>rollsIn(g,i+1)[0]).filter(Boolean)).filter(r=>!r.foul&&(!statsBallId||r.ballId===statsBallId));return{hit:throws.filter(r=>r.pins.includes(1)&&r.pins.includes(flank)).length,total:throws.length,flank}}
// 3.3.17 · Logotipo «mibowling» con bolo en la i, para imágenes generadas.
function drawWordmark(c,x,y,size){c.save();c.font=`800 ${size}px system-ui,-apple-system,sans-serif`;c.textBaseline='alphabetic';c.fillStyle='#f5f5f7';c.fillText('mi',x,y);x+=c.measureText('mi').width;c.fillStyle='#f0612d';c.fillText('bowl',x,y);x+=c.measureText('bowl').width;const h=size*.74,sc=h/88;x+=size*.02;c.save();c.translate(x,y-h);c.scale(sc,sc);c.translate(-29,-6.5);c.fillStyle='#f0612d';c.fill(new Path2D('M50 7C58.5 7 62.5 14 61.5 23.5C60.6 31 56.5 34 56.5 38.5C56.5 43 66.5 50.5 68.5 62.5C70.5 76.5 63.5 88.5 58.5 94H41.5C36.5 88.5 29.5 76.5 31.5 62.5C33.5 50.5 43.5 43 43.5 38.5C43.5 34 39.4 31 38.5 23.5C37.5 14 41.5 7 50 7Z'));c.fillStyle='#1c1c1e';c.fillRect(43,33.5,14,2.6);c.fillRect(43.6,37.6,12.8,2.6);c.restore();x+=42*sc+size*.03;c.fillStyle='#f0612d';c.fillText('ng',x,y);c.restore()}
// 3.3.19 · Compartir como tarjeta vertical tipo historia (1080×1920).
function shareStoryCanvas(s){
 const W=1080,H=1920,cvs=document.createElement('canvas');cvs.width=W;cvs.height=H;const c=cvs.getContext('2d');
 const FONT='system-ui,-apple-system,"SF Pro Display","Helvetica Neue",sans-serif',f=(w,sz)=>`${w} ${sz}px ${FONT}`;
 const A='#f0612d',T='#f5f5f7',M='#8e8e93',S1='#1c1c1e',S2='#2c2c2e';
 const rr=(x,y,w,h,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()};
 c.fillStyle='#000';c.fillRect(0,0,W,H);
 const glow=c.createRadialGradient(W*.85,H*1.02,40,W*.85,H*1.02,W*.95);glow.addColorStop(0,'rgba(240,97,45,.42)');glow.addColorStop(1,'rgba(240,97,45,0)');c.fillStyle=glow;c.fillRect(0,0,W,H);
 // Cabecera: icono triángulo + logotipo
 const tri=(x,y,size,dot,one)=>{const k=size/72;let n=0;for(const [cnt,yy] of [[4,22],[3,40],[2,58],[1,76]])for(let i=0;i<cnt;i++){c.beginPath();c.arc(x+(50+(i-(cnt-1)/2)*18-14)*k,y+(yy-13)*k,7*k,0,Math.PI*2);c.fillStyle=cnt===1?one:dot;c.fill();n++}};
 rr(80,104,96,96,24);c.fillStyle=S1;c.fill();tri(92,116,72,A,'#fff');
 drawWordmark(c,200,174,64);
 // Sesión
 const d=hmDate(s.date),kind=s.type==='oficial'?(s.competition||'Competición'):'Entreno';
 const meta=[kind,`${HM_DAYS_S[d.getUTCDay()]} ${d.getUTCDate()} ${HM_MONTHS_S[d.getUTCMonth()]} ${d.getUTCFullYear()}`,s.venue].filter(Boolean).join('  ·  ').toLocaleUpperCase('es');
 c.font=f(600,30);c.fillStyle=A;c.fillText(meta.length>52?meta.slice(0,51)+'…':meta,80,300);
 const tt=String(s.title||'').replace(/ \[Tipo pendiente\]$/,'').trim();if(tt&&!/^(entreno|entrenamiento|competición|competición oficial)$/i.test(tt)&&tt.toLowerCase()!==String(kind).toLowerCase()){c.font=f(600,40);c.fillStyle=T;c.fillText(tt.length>40?tt.slice(0,39)+'…':tt,80,356)}
 // Resultado principal (bloque centrado en vertical)
 const done=s.games.filter(complete),scores=done.map(score),serie=scores.reduce((a,b)=>a+b,0),best=scores.length?Math.max(...scores):0,avgS=scores.length?serie/scores.length:0;
 const single=done.length<=1;
 const allR=s.games.filter(g=>complete(g)||g.rolls.length),nR=allR.length,RH0=nR<=3?230:nR<=5?180:150,rowsH=Math.min(nR,Math.max(1,Math.floor((H-200-((single?800:760)+200))/(RH0+20))))*(RH0+20);
 const blockH=((single?800:760)+150-430)+50+rowsH,off=Math.max(0,Math.round(((H-170)-400-blockH)/2-30));c.save();c.translate(0,off);
 c.font=f(600,32);c.fillStyle=M;c.fillText(single?'RESULTADO':`SERIE · ${done.length} PARTIDAS`,80,470);
 c.font=f(800,single?300:240);c.fillStyle=T;const big=String(single?(scores[0]??0):serie);c.fillText(big,68,single?740:700);
 // Indicadores
 const exact=done.filter(g=>!isFinalOnly(g)),first=exact.flatMap(g=>Array.from({length:10},(_,i)=>rollsIn(g,i+1)[0]).filter(Boolean)),stk=first.filter(r=>kn(r)===10).length;
 const chips=single?[['Strikes',first.length?Math.round(100*stk/first.length)+'%':'—'],['Clean',cleanGame(done[0]||{})?'Sí':'No']]:[['Media',fmt(avgS)],['Mejor',String(best)],['Strikes',first.length?Math.round(100*stk/first.length)+'%':'—']];
 let cx=80;const cy=single?800:760;
 for(const [l,v] of chips){c.font=f(800,56);const vw=c.measureText(v).width;c.font=f(600,26);const lw=c.measureText(l.toUpperCase()).width;const w=Math.max(vw,lw)+64;rr(cx,cy,w,150,32);c.fillStyle=S1;c.fill();c.fillStyle=M;c.fillText(l.toUpperCase(),cx+32,cy+52);c.font=f(800,56);c.fillStyle=T;c.fillText(v,cx+32,cy+120);cx+=w+20}
 // Partidas con su hoja
 let y=(single?800:760)+200;const all=s.games.filter(g=>complete(g)||g.rolls.length),RH=all.length<=3?230:all.length<=5?180:150,GAP=20,maxRows=Math.max(1,Math.floor((H-200-y)/(RH+GAP))),list=all.slice(0,maxRows),Z=RH/150;
 const cellW=(W-160-60)/10;
 list.forEach((g,k)=>{const idx=s.games.indexOf(g)+1;rr(60,y,W-120,RH,30);c.fillStyle=S1;c.fill();
  c.font=f(600,Math.round(28*Math.min(Z,1.15)));c.fillStyle=M;c.fillText(`PARTIDA ${idx}`,96,y+Math.round(48*Z));c.font=f(800,Math.round(48*Math.min(Z,1.35)));c.fillStyle=T;const sc=complete(g)?String(score(g)):'—';const sw=c.measureText(sc).width;c.fillText(sc,W-96-sw,y+Math.round(58*Z));
  if(isFinalOnly(g)){c.font=f(500,30);c.fillStyle=M;c.fillText('Solo puntuación final',96,y+RH-40)}
  else{const fs=frameScores(g),top=y+RH-Math.round(60*Math.min(Z,1.25)),cw=cellW;for(let fr=1;fr<=10;fr++){const xx=96+(fr-1)*cw;
    c.font=f(700,Math.round((fr===10?24:27)*Math.min(Z,1.25)));c.fillStyle=T;const lab=frameLabel(g,fr)||'·';c.fillText(lab,xx+4,top);c.font=f(500,Math.round(22*Math.min(Z,1.2)));c.fillStyle=M;c.fillText(String(fs[fr-1]??''),xx+4,top+Math.round(32*Math.min(Z,1.25)));
    if(isSplitFirst(g,fr)){c.strokeStyle=A;c.lineWidth=3;c.beginPath();c.arc(xx+13,top-10,19,0,Math.PI*2);c.stroke()}}}
  y+=RH+GAP});
 c.restore();const more=all.length-list.length;y+=off;
 if(more>0){c.font=f(600,28);c.fillStyle=M;c.fillText(`y ${more} partida${more===1?'':'s'} más`,96,y+30)}
 c.font=f(500,28);c.fillStyle=M;const foot='Registrado con mibowling';const fw=c.measureText(foot).width;c.fillText(foot,(W-fw)/2,H-90);
 return cvs;
}
function shareSessionImage(){const s=session();if(!s)return;const cvs=shareStoryCanvas(s);cvs.toBlob(async blob=>{if(!blob)return;const file=new File([blob],'mibowling_'+s.date+'.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'mibowling · '+s.date});return}catch(e){if(e.name==='AbortError')return}}const url=URL.createObjectURL(blob),el=document.createElement('a');el.href=url;el.download=file.name;el.click();setTimeout(()=>URL.revokeObjectURL(url),2000)},'image/png')}
function changeHand(value){db.hand=value==='zurdo'?'zurdo':'diestro';save();render()}
const UI_LINE_PATHS={"ball":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"10\" cy=\"8.5\" r=\"1.1\"/><circle cx=\"14\" cy=\"8.5\" r=\"1.1\"/><circle cx=\"12\" cy=\"12\" r=\"1.1\"/>","lock":"<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>","drop":"<path d=\"M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z\"/>","checklist":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"m9 12 2 2 4-4\"/>","home":"<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"/><path d=\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>","list":"<path d=\"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4\"/><path d=\"M2 6h4\"/><path d=\"M2 10h4\"/><path d=\"M2 14h4\"/><path d=\"M2 18h4\"/><path d=\"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z\"/>","bars":"<line x1=\"12\" x2=\"12\" y1=\"20\" y2=\"10\"/><line x1=\"18\" x2=\"18\" y1=\"20\" y2=\"4\"/><line x1=\"6\" x2=\"6\" y1=\"20\" y2=\"16\"/>","plus":"<path d=\"M5 12h14\"/><path d=\"M12 5v14\"/>","calendar":"<path d=\"M8 2v4\"/><path d=\"M16 2v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/><path d=\"M8 14h.01\"/><path d=\"M12 14h.01\"/><path d=\"M16 14h.01\"/><path d=\"M8 18h.01\"/><path d=\"M12 18h.01\"/><path d=\"M16 18h.01\"/>","target":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>","trophy":"<path d=\"M6 9H4.5a2.5 2.5 0 0 1 0-5H6\"/><path d=\"M18 9h1.5a2.5 2.5 0 0 0 0-5H18\"/><path d=\"M4 22h16\"/><path d=\"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22\"/><path d=\"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22\"/><path d=\"M18 2H6v7a6 6 0 0 0 12 0V2Z\"/>","zap":"<path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\"/>","check":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m9 12 2 2 4-4\"/>","trend":"<polyline points=\"22 7 13.5 15.5 8.5 10.5 2 17\"/><polyline points=\"16 7 22 7 22 13\"/>","settings":"<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.73v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>","moon":"<path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z\"/>","sun":"<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2\"/><path d=\"M12 20v2\"/><path d=\"m4.93 4.93 1.41 1.41\"/><path d=\"m17.66 17.66 1.41 1.41\"/><path d=\"M2 12h2\"/><path d=\"M20 12h2\"/><path d=\"m6.34 17.66-1.41 1.41\"/><path d=\"m19.07 4.93-1.41 1.41\"/>","arrow":"<path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/>","walk":"<path d=\"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z\"/><path d=\"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z\"/><path d=\"M16 17h4\"/><path d=\"M4 13h4\"/>","ball":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>","drop":"<path d=\"M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z\"/>","clock":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/>","flag":"<path d=\"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z\"/><line x1=\"4\" x2=\"4\" y1=\"22\" y2=\"15\"/>","ellipsis":"<circle cx=\"12\" cy=\"5\" r=\"1\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"12\" cy=\"19\" r=\"1\"/>","info":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4M12 8h.01\"/>","check-circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m9 12 2 2 4-4\"/>","archive":"<rect width=\"20\" height=\"5\" x=\"2\" y=\"3\" rx=\"1\"/><path d=\"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4\"/>","chevron":"<path d=\"m9 18 6-6-6-6\"/>"};
function uiInl(key){return uiLineIcon(key).replace('class="ui-line-icon"','class="ui-line-icon inl"')}
function uiLineIcon(key){return `<svg class="ui-line-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${UI_LINE_PATHS[key]||UI_LINE_PATHS.target}</svg>`;}
function uiMetricIcon(icon,label){const s=String(label).toLowerCase();if(s.includes('strike'))return uiLineIcon('zap');if(s.includes('spare')||s.includes('clean')||s.includes('resultado'))return uiLineIcon('check');if(s.includes('mejor'))return uiLineIcon('trophy');if(s.includes('partidas'))return uiLineIcon('list');if(s.includes('media'))return uiLineIcon('bars');if(s.includes('falta'))return uiLineIcon('flag');return uiLineIcon('target');}
function nav(){const names=[['inicio',uiLineIcon('home'),'Inicio'],['historial',uiLineIcon('list'),'Partidas'],['nueva',uiLineIcon('plus'),'Nueva'],['estadisticas',uiLineIcon('bars'),'Estadísticas'],['calendario',uiLineIcon('calendar'),'Calendario']];$('bottom-nav').innerHTML=names.map(([t,i,v])=>`<button type="button" aria-label="${v}" ${tab===t||tab==='registro'&&t==='nueva'?'aria-current="page"':''} class="${tab===t||tab==='registro'&&t==='nueva'?'active':''} ${t==='nueva'?'fab':''}" onclick="go('${t}')"><span class="nav-icon">${i}</span>${v}</button>`).join('')}
function go(t){if(t==='bolas')arsenalPanel='list';if(t==='bolas'&&!ballPickerOpening){ballPickTarget=BALL_SELECTION_NEXT;ballPickReturn='inicio';ballPickPins=null;}tab=t;editPair=false;showNext=false;noticeText='';selection=[];render();window.scrollTo({top:0,behavior:'instant'})}
function render(){const sp=document.getElementById('mb-splash');if(sp&&!sp.classList.contains('gone')){sp.classList.add('gone');setTimeout(()=>sp.remove(),600)}window.MiBowlingRegistroCompacto?.syncBody(false);document.body.classList.toggle('home-screen',tab==='inicio');document.body.classList.toggle('registry-screen',tab==='registro');nav();$('app').innerHTML=tab==='inicio'?home():tab==='nueva'?newSessionView():tab==='registro'?registry():tab==='historial'?history():tab==='detalle'?detail():tab==='estadisticas'?stats():tab==='bolas'?ballsView():tab==='calendario'?calendarView():tab==='patrones'?patternsView():tab==='liga'?ligaView():tab==='federacion'?federacionView():settings();if(tab==='estadisticas'){renderCharts();uiRevealStatsPane(false);}if(tab==='liga')ligaShowFrame();if(tab==='nueva')updateSessionFields();if(tab==='registro'){const strip=document.querySelector('.score-strip'),curr=strip?.querySelector('.frame-cell.current');if(curr)strip.scrollLeft=Math.max(0,curr.offsetLeft-strip.offsetLeft-strip.clientWidth/2+curr.clientWidth/2)}}
function head(title,sub,extra=''){return `<div class="section-head"><div><h1>${esc(title)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div>${extra}</div>`}
function metrics(a){return [{icon:'◉',label:'Media',value:a.totals.length?fmt(a.avg):'—'},{icon:'▥',label:'Partidas',value:a.totals.length},{icon:'♛',label:'Mejor partida',value:a.totals.length?Math.max(...a.totals):'—'},{icon:'✦',label:'Strikes',value:p100(a.strikes.length,a.first.length)},{icon:'✓',label:'Spare',value:p100(a.spare,a.opportunities.length)}]}
function tile(icon,label,value,detail=''){return `<div class="stat-tile"><div class="label"><span>${uiMetricIcon(icon,label)}</span> ${label}</div><div class="value${value==='—'?' ui-no-value':''}">${value}</div>${detail?`<div class="detail">${detail}</div>`:''}</div>`}
function premiumStat(icon,label,val,click='',small=''){return `<button type="button" class="premium-stat" ${click?`onclick="${click}"`:''} ${click?'':'disabled'}><span class="premium-stat-icon">${uiMetricIcon(icon,label)}</span><span class="premium-stat-text"><span class="premium-label">${label}</span><strong>${val}</strong>${small?`<small>${small}</small>`:''}</span></button>`}
function premiumBars(a){let vals=a.totals.slice(-20);if(!vals.length)return `<div class="premium-empty-chart">Registra partidas de entrenamiento para ver tu evolución.</div>`;const max=300;return `<div class="premium-bars" aria-label="Puntuaciones de las últimas ${vals.length} partidas de entrenamiento">${vals.map((v,i)=>`<div class="premium-bar" title="Partida ${i+1}: ${v} puntos" style="height:${Math.max(5,v/max*100)}%"></div>`).join('')}</div>`}
// 3.3.18 · Inicio con contenido propio: registrar, última partida, medias y próxima competición.
const HM_DAYS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],HM_DAYS_S=['dom','lun','mar','mié','jue','vie','sáb'],HM_MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],HM_MONTHS_S=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function hmDate(iso){const [y,m,d]=String(iso||'').split('-').map(Number);return new Date(Date.UTC(y||1970,(m||1)-1,d||1))}
function hmDaysBetween(a,b){return Math.round((hmDate(b)-hmDate(a))/864e5)}
function hmTitle(t){const small=new Set(['de','del','la','las','el','los','e','y','en','a']);return String(t||'').toLocaleLowerCase('es').split(/\s+/).map((w,i)=>i&&small.has(w)?w:w.charAt(0).toLocaleUpperCase('es')+w.slice(1)).join(' ').replace(/\bMasc\b/g,'Masc.').replace(/\bFem\b/g,'Fem.').replace(/\bSsmm\b/g,'SSMM')}
function hmSpark(values,bars){if(values.length<2&&!bars)return '';const w=130,h=30,max=Math.max(...values),min=Math.min(...values),span=Math.max(1,max-min);
 if(bars){const n=values.length,bw=8,gap=n>1?(w-bw*n)/(n-1):0;return `<svg class="hm-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${values.map((v,i)=>{const bh=6+((v-min)/span)*(h-6);return `<rect x="${(i*(bw+gap)).toFixed(1)}" y="${(h-bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" rx="2"/>`}).join('')}</svg>`}
 const pts=values.map((v,i)=>[(i*(w-6)/(values.length-1)).toFixed(1),(h-4-((v-min)/span)*(h-8)).toFixed(1)]);const [lx,ly]=pts[pts.length-1];
 return `<svg class="hm-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${lx}" cy="${ly}" r="3.5"/></svg>`}
function hmScoreGames(type){const a=aggregate(type);return a.scoreGames.slice().sort((x,y)=>x._session.date.localeCompare(y._session.date))}
function hmLastGame(){const ss=db.sessions.filter(s=>!s.leagueOther).slice().sort((a,b)=>b.date.localeCompare(a.date));for(const s of ss){const gs=s.games.filter(complete);if(gs.length)return{s,g:gs[gs.length-1],n:s.games.indexOf(gs[gs.length-1])+1}}return null}
function home(){
 const now=today(),d=hmDate(now),head=`${HM_DAYS[d.getUTCDay()]}, ${d.getUTCDate()} de ${HM_MONTHS[d.getUTCMonth()]}`;
 const out=['<section class="hm" aria-label="Inicio de Mi Bowling">'];
 out.push(`<div class="hm-hello"><p class="hm-date">${esc(head)}</p><h1>Tu juego, bajo control</h1></div>`);
 out.push(`<button type="button" class="hm-cta" onclick="go('nueva')"><span class="hm-cta-txt"><strong>Registrar partida</strong><span>Bolos, cantidad o solo puntuación</span></span><svg class="hm-tri" viewBox="14 13 72 70" aria-hidden="true">${[[4,22],[3,40],[2,58],[1,76]].map(([n,y])=>Array.from({length:n},(_,i)=>`<circle cx="${50+(i-(n-1)/2)*18}" cy="${y}" r="7"${n===1?' class="hm-one"':''}/>`).join('')).join('')}</svg></button>`);
 const last=hmLastGame();
 if(last){const {s,g,n}=last,ld=hmDate(s.date),kind=s.type==='oficial'?'Competición':'Entreno',sc=frameScores(g);
  const sheet=isFinalOnly(g)?'<p class="hm-note">Anotada solo con la puntuación final.</p>':`<div class="hm-sheet" aria-hidden="true">${Array.from({length:10},(_,i)=>{const f=i+1;return `<span class="hm-cell${f===10?' hm-cell10':''}"><i>${f}</i><b>${esc(frameLabel(g,f)||'·')}</b><em>${sc[i]??''}</em></span>`}).join('')}</div>`;
  out.push(`<button type="button" class="hm-card hm-last" onclick="activeId=${esc(JSON.stringify(s.id))};go('detalle')" aria-label="Última partida: ${score(g)} puntos, ${esc(kind)} del ${ld.getUTCDate()} de ${HM_MONTHS[ld.getUTCMonth()]}. Ver la sesión"><span class="hm-row"><span class="hm-col"><span class="hm-kicker">Última partida</span><span class="hm-sub">${esc(kind)} · ${HM_DAYS_S[ld.getUTCDay()]} ${ld.getUTCDate()} ${HM_MONTHS_S[ld.getUTCMonth()]}${s.venue?' · '+esc(s.venue):''}${s.games.length>1?' · partida '+n:''}</span></span><span class="hm-big">${score(g)}</span></span>${sheet}</button>`);
 }else out.push(`<button type="button" class="hm-card hm-empty" onclick="go('nueva')"><span class="hm-kicker">Empieza aquí</span><strong>Aún no hay partidas</strong><span class="hm-sub">Registra la primera y aquí verás tu resultado, tu media y tu evolución.</span></button>`);
 out.push(fbHomeCard());
 const tr=hmScoreGames('entrenamiento'),of=hmScoreGames('oficial');
 if(tr.length||of.length){
  const avg=a=>a.length?a.reduce((x,g)=>x+score(g),0)/a.length:null,month=now.slice(0,7);
  const tile=(label,games,line)=>{const av=avg(games);if(av===null)return `<button type="button" class="hm-card hm-tile" onclick="statMode='${label==='Entreno'?'entrenamiento':'oficial'}';go('estadisticas')"><span class="hm-kicker2">${label}</span><span class="hm-big2">—</span><span class="hm-sub">Sin partidas todavía</span></button>`;
   const recent=games.slice(-12).map(score),cur=games.filter(g=>g._session.date.slice(0,7)===month),prev=games.filter(g=>g._session.date.slice(0,7)<month);
   let foot=`${games.length} partida${games.length===1?'':'s'}`,cls='';
   if(line&&cur.length&&prev.length){const dlt=avg(cur)-avg(prev);foot=`${dlt>=0?'+':'−'}${fmt(Math.abs(dlt))} este mes`;cls=dlt>=0?' hm-up':' hm-down'}
   return `<button type="button" class="hm-card hm-tile" onclick="statMode='${label==='Entreno'?'entrenamiento':'oficial'}';go('estadisticas')" aria-label="Media ${label.toLowerCase()} ${fmt(av)}"><span class="hm-kicker2">${label}</span><span class="hm-big2">${fmt(av)}</span>${hmSpark(recent,!line)}<span class="hm-sub${cls}">${cls?'<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>':''}${foot}</span></button>`};
  out.push(`<div class="hm-tiles">${tile('Entreno',tr,true)}${tile('Oficial',of,false)}</div>`);
 }
 const ev=officialCalendarEvents().filter(e=>e.end>=now).sort((a,b)=>a.start.localeCompare(b.start))[0];
 if(ev){const sd=hmDate(ev.start),ed=hmDate(ev.end),dd=hmDaysBetween(now,ev.start),when=dd<=0?'hoy':dd===1?'mañana':`en ${dd} días`;
  const range=ev.start===ev.end?`${sd.getUTCDate()} ${HM_MONTHS_S[sd.getUTCMonth()]}`:sd.getUTCMonth()===ed.getUTCMonth()?`${sd.getUTCDate()}–${ed.getUTCDate()} ${HM_MONTHS_S[sd.getUTCMonth()]}`:`${sd.getUTCDate()} ${HM_MONTHS_S[sd.getUTCMonth()]}–${ed.getUTCDate()} ${HM_MONTHS_S[ed.getUTCMonth()]}`;
  out.push(`<button type="button" class="hm-card hm-next" onclick="calendarMonth=${esc(JSON.stringify(ev.start.slice(0,7)))};calendarSelected=${esc(JSON.stringify(ev.start))};go('calendario')"><span class="hm-day"><i>${HM_MONTHS_S[sd.getUTCMonth()]}</i><b>${sd.getUTCDate()}</b></span><span class="hm-col hm-grow"><span class="hm-kicker2">Próxima competición</span><strong>${esc(hmTitle(ev.title))}</strong><span class="hm-sub">${esc(hmTitle(ev.venue))} · ${range}</span></span><span class="hm-pill">${when}</span></button>`);
 }
 out.push('<footer class="home-start-footer">Datos almacenados en este dispositivo · Versión '+esc(APP_VERSION)+'</footer></section>');
 return out.join('');
}

let calendarMonth=today().slice(0,7),calendarSelected=today(),calendarScope='todos';
function officialCalendarEvents(){
 const base=Array.isArray(globalThis.BOWLING_OFFICIAL_CALENDAR_2026_27)?globalThis.BOWLING_OFFICIAL_CALENDAR_2026_27:[],conf=globalThis.BOWLING_CALENDAR_CONFIRMED||{};
 return base.map(e=>conf[e.id]?{...e,...conf[e.id],confirmed:true}:e);
}
function calendarEventOnDay(event,day){return event.start<=day&&event.end>=day;}
function calendarOfficialInMonth(month){
 const [year,m]=month.split('-').map(Number);
 const last=month+'-'+String(new Date(Date.UTC(year,m,0)).getUTCDate()).padStart(2,'0');
 return officialCalendarEvents().filter(event=>event.start<=last&&event.end>=month+'-01');
}
function setCalendarScope(value){
 if(!['todos','gallego','nacional','personal'].includes(value))return;
 calendarScope=value;render();
}
function changeCalendarMonth(delta){
 const parts=calendarMonth.split('-').map(Number);
 const d=new Date(Date.UTC(parts[0],parts[1]-1+delta,1));
 calendarMonth=d.toISOString().slice(0,7);
 calendarSelected='';
 render();
}
function chooseCalendarDay(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.slice(0,7)!==calendarMonth)return;
 calendarSelected=value;
 render();
}
function calendarView(){
 const [year,month]=calendarMonth.split('-').map(Number);
 const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
 const first=(new Date(Date.UTC(year,month-1,1)).getUTCDay()+6)%7;
 const monthLabel=new Date(Date.UTC(year,month-1,1)).toLocaleDateString('es-ES',{month:'long',year:'numeric',timeZone:'UTC'});
 const records=db.sessions.filter(s=>typeof s.date==='string'&&s.date.slice(0,7)===calendarMonth);
 const monthCompetitions=calendarOfficialInMonth(calendarMonth);
 const filteredCompetitions=calendarScope==='personal'?[]:monthCompetitions.filter(e=>calendarScope==='todos'||e.category===calendarScope);
 const showPersonal=calendarScope==='todos'||calendarScope==='personal';
 const dateCounts=new Map();
 for(const s of records)dateCounts.set(s.date,(dateCounts.get(s.date)||0)+1);
 const selected=calendarSelected&&calendarSelected.slice(0,7)===calendarMonth?calendarSelected:'';
 const selectedEvents=selected&&showPersonal?records.filter(s=>s.date===selected):[];
 const selectedCompetitions=selected?filteredCompetitions.filter(event=>calendarEventOnDay(event,selected)):[];
 const gallego=monthCompetitions.filter(e=>e.category==='gallego').length,nacional=monthCompetitions.filter(e=>e.category==='nacional').length;
 let html=head('Calendario','Consulta tus partidas y las competiciones gallegas y nacionales de la temporada 2026-2027.');
 html+='<section class="calendar-panel" aria-label="Calendario de partidas y competiciones">';
 html+='<div class="calendar-monthbar"><button type="button" class="calendar-chevron" aria-label="Mes anterior" onclick="changeCalendarMonth(-1)">‹</button><h2>'+esc(monthLabel.charAt(0).toUpperCase()+monthLabel.slice(1))+'</h2><button type="button" class="calendar-chevron" aria-label="Mes siguiente" onclick="changeCalendarMonth(1)">›</button></div>';
 html+='<div class="calendar-summary">'+records.length+' sesión(es) registrada(s) este mes</div>';
 html+='<p class="calendar-competition-summary">'+gallego+' gallegas · '+nacional+' nacionales · calendario provisional 2026-2027</p>';
 html+='<div class="calendar-filters" role="group" aria-label="Mostrar calendario">';
 for(const [value,label] of [['todos','Todos'],['gallego','Gallego'],['nacional','Nacional'],['personal','Mis partidas']]){
  html+='<button type="button" class="calendar-filter'+(calendarScope===value?' active':'')+'" aria-pressed="'+(calendarScope===value?'true':'false')+'" onclick="setCalendarScope(\''+value+'\')">'+label+'</button>';
 }
 html+='</div>';
 html+='<div class="calendar-legend" aria-label="Leyenda"><span><i class="calendar-dot-gallego"></i> Gallego</span><span><i class="calendar-dot-nacional"></i> Nacional</span><span><i class="calendar-dot-personal"></i> Mis partidas</span></div>';
 html+='<div class="calendar-weekdays">'+['L','M','X','J','V','S','D'].map(x=>'<span>'+x+'</span>').join('')+'</div><div class="calendar-grid">';
 for(let i=0;i<first;i++)html+='<span class="calendar-pad" aria-hidden="true"></span>';
 for(let day=1;day<=daysInMonth;day++){
  const date=calendarMonth+'-'+String(day).padStart(2,'0');
  const personal=showPersonal?(dateCounts.get(date)||0):0;
  const official=filteredCompetitions.filter(e=>calendarEventOnDay(e,date));
  const categories=[...new Set(official.map(e=>e.category))];
  const total=personal+official.length;
  const cls='calendar-day'+(date===selected?' selected':'')+(date===today()?' today':'')+(total?' has-events':'');
  const details=[personal?personal+' partida(s)':'',official.length?official.length+' competición(es)':''].filter(Boolean).join(', ');
  const label=day+' de '+monthLabel+(details?', '+details:' sin eventos');
  const marks=(personal?'<i class="calendar-dot-personal" aria-hidden="true"></i>':'')+categories.map(c=>'<i class="calendar-dot-'+c+'" aria-hidden="true"></i>').join('');
  html+='<button type="button" class="'+cls+'" onclick="chooseCalendarDay('+esc(JSON.stringify(date))+')" aria-label="'+esc(label)+'" aria-pressed="'+(date===selected?'true':'false')+'"><span>'+day+'</span>'+(marks?'<span class="calendar-markers">'+marks+'</span>':'')+'</button>';
 }
 html+='</div></section>';
 html+='<section class="calendar-agenda" aria-label="Partidas y competiciones del día seleccionado"><h2>'+(selected?'Agenda del '+esc(selected.split('-').reverse().join('/')):'Selecciona un día')+'</h2>';
 if(!selected)html+='<p class="calendar-empty">Toca un día para consultar partidas o competiciones.</p>';
 else if(!selectedEvents.length&&!selectedCompetitions.length)html+='<p class="calendar-empty">No hay eventos de esta categoría en la fecha seleccionada.</p>';
 for(const session of selectedEvents){
  const games=Array.isArray(session.games)?session.games:[],finished=games.filter(complete).length;
  const label=session.title||(session.type==='oficial'?'Competición':'Entrenamiento');
  html+='<article class="calendar-session"><div><strong>'+esc(label)+'</strong><small>'+esc(session.venue||'Bolera sin indicar')+' · '+games.length+' partida(s) · '+finished+' completa(s)</small></div><button class="btn outline" type="button" onclick="openCalendarSession('+esc(JSON.stringify(String(session.id)))+')">Abrir</button></article>';
 }
 for(const event of selectedCompetitions){
  const where=event.venue||'Sede no indicada en el PDF';
  const span=event.start===event.end?event.start.split('-').reverse().join('/'):(event.start.split('-').reverse().join('/')+' – '+event.end.split('-').reverse().join('/'));
  html+='<article class="calendar-official '+(event.category==='gallego'?'calendar-official-gallego':'calendar-official-nacional')+(event.confirmed?' calendar-official-confirmed':'')+'"><div><span class="calendar-category">'+(event.category==='gallego'?'Gallego':'Nacional')+'</span><strong>'+esc(event.title)+'</strong><small>'+esc(span)+' · '+esc(where)+'</small>'+(event.confirmed?(event.changed?'<small class="calendar-changed">'+esc(event.changed)+'</small>':'')+'<details class="calendar-more"><summary>Horario y detalles</summary>'+(event.details||[]).map(d=>'<small class="calendar-detail">'+esc(d)+'</small>').join('')+'</details><a class="calendar-circular" href="'+esc(event.url)+'" target="_blank" rel="noopener">'+esc(event.source)+' ↗</a>':'')+'</div><span class="calendar-provisional'+(event.confirmed?' calendar-confirmed':'')+'">'+(event.confirmed?'Oficial':'Provisional')+'</span></article>';
 }
 html+='</section>';
 html+='<p class="calendar-source">Fuente: Federación Galega de Bolos · calendario provisional de 17/07/2026. Las fechas pueden cambiar. No son inscripciones ni partidos creados en tu historial.</p>';
 html+='<div class="calendar-actions"><button type="button" class="btn outline" onclick="go(\'nueva\')">+ Nueva partida</button><button type="button" class="btn outline" onclick="go(\'bolas\')">Mis bolas</button><button type="button" class="btn outline" onclick="go(\'federacion\')">Resultados oficiales</button></div>';
 return html;
}
function openCalendarSession(id){
 if(!db.sessions.some(s=>s.id===id))return;
 activeId=id;
 go('detalle');
}

let newMode='entrenamiento';let competitionFormat='habitual';function startWith(type){newMode=type;go('nueva')}
function chooseSessionType(v){newMode=v;updateSessionFields()}
function chooseCompetitionFormat(v){competitionFormat=v;updateSessionFields()}
function launchLeagueFromNew(){ligaGame=0;ligaSelected=0;go('liga')}
function newSessionView(){return `${head('Empezar partida','')}
 <div class="card"><form id="newSessionForm" onsubmit="createSession(event)"><label class="field" for="s-type">Modalidad</label><select id="s-type" name="type" class="input" onchange="chooseSessionType(this.value)"><option value="entrenamiento" ${newMode==='entrenamiento'?'selected':''}>Entrenamiento</option><option value="oficial" ${newMode==='oficial'?'selected':''}>Competición oficial</option></select>
 <div id="competition-format"></div><div id="normal-session-fields"><div class="form-grid"><div><label class="field" for="s-date">Fecha</label><input id="s-date" type="date" class="input" required name="date" value="${today()}"></div><div><label class="field" for="s-venue">Bolera</label><input id="s-venue" class="input" name="venue" placeholder="Nombre de bolera"></div></div>
 <label class="field" for="s-title">Nombre de sesión / competición</label><input id="s-title" class="input" name="title" placeholder="Ej. Liga, jornada 3; práctica de spares">
 <label class="field">Patrón de aceitado</label><select id="s-patternId" class="input" name="patternId" onchange="patternPreview(this.value)"><option value="">Sin patrón asignado</option>${db.patterns.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}${p.length?' · '+esc(p.length)+' ft':''}</option>`).join('')}</select><div id="pattern-last"></div><button type="button" class="btn outline mt12" onclick="go('patrones')">＋ Biblioteca de patrones / PDF</button>
 <div id="training-goals"></div><div id="session-lanes"></div><label class="field" for="s-notes">Notas</label><textarea class="input note" id="s-notes" name="notes" placeholder="Sensaciones, objetivo de sesión..."></textarea>
 <label class="field" for="s-ball">Bola inicial (puedes cambiarla en cada lanzamiento)</label><button type="button" class="btn outline block mt12" onclick="openBallPickerFor('','nueva')">${uiInl('checklist')} Elegir bolas para esta sesión</button><p class="hint">Las bolas marcadas estarán disponibles. Puedes jugar sin asignar una bola.</p>${ballSelect('s-ball','ballId','')}
 <button class="btn primary big block mt16" type="submit">Comenzar sesión →</button></div></form></div>
 <div class="card"><div class="hint">${uiInl('lock')} Los entrenamientos no modifican las estadísticas oficiales. Una competición mantiene el par y la pista de cada tiro.</div></div>`}
function updateSessionFields(){const cf=$('competition-format');if(cf)cf.innerHTML=newMode==='oficial'?`<div class="card" style="background:#f4fafb;margin:12px 0"><h3>Formato de competición</h3><label class="field" for="competition-format-choice">¿Qué vas a registrar?</label><select id="competition-format-choice" class="input" onchange="chooseCompetitionFormat(this.value)"><option value="habitual" ${competitionFormat==='habitual'?'selected':''}>Competición oficial habitual · Mi partida</option><option value="liga" ${competitionFormat==='liga'?'selected':''}>Liga Nacional · Marcador por tripletas</option></select>${competitionFormat==='liga'?`<p class="hint">Controla a los 12 jugadores, los cuadros y las sumas de las dos tripletas. Los datos de prueba ya introducidos se conservan.</p><button type="button" class="btn primary block" onclick="launchLeagueFromNew()">Abrir marcador de Liga Nacional →</button>`:''}</div>`:'';const nf=$('normal-session-fields');if(nf)nf.style.display=newMode==='oficial'&&competitionFormat==='liga'?'none':'';const goal=$('training-goals');if(goal)goal.innerHTML=newMode==='entrenamiento'?`<div class="card" style="background:#f4fafb"><h3>Objetivo del entrenamiento (opcional)</h3><label class="field">Trabajar</label><select class="input" name="goalKind"><option value="">Sin objetivo</option><option value="pocket">Pocket 1–3 / 1–2</option><option value="strike">Strikes</option><option value="single">Spare de bolo suelto</option><option value="clean">Partidas limpias (Clean Game)</option></select><label class="field">Meta porcentual</label><input class="input" name="goalTarget" type="number" min="1" max="100" value="80"></div>`:'';const o=$('session-lanes');if(!o)return;o.innerHTML=`<div class="card" style="background:#f4fafb;margin:13px 0 7px"><h3>${newMode==='oficial'?'Par de pistas inicial':'Pistas del entrenamiento (opcional)'}</h3><div class="form-grid"><div><label class="field">Primera pista del par</label><input class="input" type="number" id="lane-pair" name="pair" min="1" max="998" step="1" placeholder="Ej. 5" oninput="updatePairHint()"></div><div><label class="field">Segunda pista del par</label><input class="input" id="lane-second" type="number" placeholder="Ej. 6" readonly></div><div><label class="field">Pista de salida</label><select class="input" id="lane-start" name="startLane"><option value="">Selecciona el par</option></select></div></div><p class="hint" id="pair-hint">Introduce la primera pista del par (ej. 5 para pistas 5 y 6). Puedes dejarlo vacío.</p></div>`}
function updatePairHint(){const pair=normalPair($('lane-pair')?.value),o=$('lane-start');if(!o)return;const second=$('lane-second');if(second)second.value=pair?pair[1]:'';o.innerHTML='<option value="">'+(pair?'Selecciona':'Selecciona el par')+'</option>'+(pair?pair.map(n=>`<option value="${n}">Pista ${n}</option>`).join(''):'');$('pair-hint').textContent=pair?`Par ${pair[0]}–${pair[1]}. Cada frame cambiará de pista automáticamente.`:'Puedes dejarlo vacío y añadirlo más tarde.'}
function ballSelect(id,name,selected){
 const scope=id==='s-ball'?BALL_SELECTION_NEXT:session()?.id;
 const chosen=scope?selectedBallsFor(scope):null;
 return `<select class="input" id="${id}" name="${name}"><option value="">Sin asignar</option>${db.balls.filter(b=>chosen===null?(!b.retired||b.id===selected):chosen.includes(b.id)).map(b=>`<option value="${esc(b.id)}" ${selected===b.id?'selected':''}>${esc(b.brand+' '+b.model)}</option>`).join('')}</select>`;
}
function createSession(e){e.preventDefault();if(newMode==='oficial'&&competitionFormat==='liga'){launchLeagueFromNew();return}const f=new FormData(e.currentTarget);const typ=f.get('type');const pair=normalPair(f.get('pair')),start=pair?(intLane(f.get('startLane'))||pair[0]):null;
 if(pair&&!pair.includes(start))return alert('La pista inicial debe pertenecer al par elegido.');
 const requestedBallId=String(f.get('ballId')||''),allowedBalls=selectedBallsFor(BALL_SELECTION_NEXT);
 const initialBallId=allowedBalls!==null&&!allowedBalls.includes(requestedBallId)?'':requestedBallId;
 const s={id:uid(),type:typ,date:String(f.get('date')),title:String(f.get('title')||'').trim(),venue:String(f.get('venue')||'').trim(),pattern:db.patterns.find(p=>p.id===f.get('patternId'))?.name||'',patternId:String(f.get('patternId')||''),patternNotes:'',goal:typ==='entrenamiento'&&String(f.get('goalKind')||'')?{kind:String(f.get('goalKind')),target:Math.max(1,Math.min(100,Number(f.get('goalTarget'))||80))}:null,notes:String(f.get('notes')||'').trim(),currentBallId:initialBallId,currentLine:cleanLine({}),lane:start,games:[{id:uid(),includeStats:true,pair,startLane:start,segments:[],rolls:[]}]};
 db.sessions.push(s);activeId=s.id;save();transferBallSelectionToSession(s.id);go('registro')}
function openSession(id){if(!db.sessions.some(s=>s.id===id))return;activeId=id;go('registro')}
// Split: el bolo 1 debe haber caído y los bolos restantes forman grupos separados.
const PIN_XY={7:[0,0],8:[2,0],9:[4,0],10:[6,0],4:[1,1],5:[3,1],6:[5,1],2:[2,2],3:[4,2],1:[3,3]};
function isSplit(standing){if(standing.length<2||standing.includes(1))return false;const rem=new Set(standing),seen=new Set(),stack=[standing[0]];seen.add(standing[0]);while(stack.length){const a=stack.pop();for(const b of rem){const dx=PIN_XY[a][0]-PIN_XY[b][0],dy=PIN_XY[a][1]-PIN_XY[b][1];if(!seen.has(b)&&dx*dx+dy*dy<=2){seen.add(b);stack.push(b)}}}return seen.size!==standing.length}
function isSplitFirst(g,f){const a=rollsIn(g,f)[0];return !!a&&exactRoll(a)&&a.pins.length<10&&isSplit(PINS.filter(p=>!a.pins.includes(p)))}
function toggleGameStats(id,checked){const s=session();if(!s||s.type!=='entrenamiento'||pendingClassification(s))return;const g=s.games.find(x=>x.id===id);if(!g)return;g.includeStats=checked;save();render()}
function foulRoll(){const s=session();if(!s)return;const n=next(game(s));if(n.done||!n.available)return;selection=[...n.available];recordRoll(true)}
function fastRoll(allStanding){const s=session();if(!s)return;const n=next(game(s));if(n.done||!n.available)return;selection=allStanding?[...n.available]:[];recordRoll()}
function frameLabel(g,f){const a=rollsIn(g,f);return a.map((r,i)=>{let n=kn(r);if(r.foul)return 'F';if(n===10&&(i===0||f===10))return'X';if(i===1&&kn(a[0])<10&&kn(a[0])+n===10)return'/';if(f===10&&i===2&&kn(a[0])===10&&kn(a[1])<10&&kn(a[1])+n===10)return'/';return n===0?'–':n}).join(' ')}
function scoreStrip(g,n){const scores=frameScores(g);return `<div class="score-strip">${Array.from({length:10},(_,i)=>{const f=i+1,fr=rollsIn(g,f),split=isSplitFirst(g,f);const marks=fr.map((r,j)=>{const count=kn(r);let mark=r.foul?'F':count===10&&(j===0||f===10)?'X':j===1&&kn(fr[0])<10&&kn(fr[0])+count===10?'/':f===10&&j===2&&kn(fr[0])===10&&kn(fr[1])<10&&kn(fr[1])+count===10?'/':count===0?'–':count;return `<span class="score-mark ${mark==='X'?'strike-mark':''} ${j===0&&split?'split-mark':''}">${mark}</span>`}).join('');return `<div class="frame-cell ${n?.frame===f?'current':''}"><span>${f}</span><b class="score-marks">${marks||'·'}</b><strong>${scores[i]??'·'}</strong></div>`}).join('')}</div>`}
function rackUI(available){return `<div class="pin-layout">${RACK.map(row=>`<div class="pin-row">${row.map(p=>`<button type="button" aria-label="Bolo ${p}: ${!available.includes(p)?'no disponible':selection.includes(p)?'en pie':'derribado'}" aria-pressed="${selection.includes(p)}" ${!available.includes(p)?'disabled':''} onclick="togglePin(${p})" class="pin ${!available.includes(p)?'unavailable':selection.includes(p)?'selected':''}">${p}</button>`).join('')}</div>`).join('')}</div>`}
function laneBoardNum(value){
 const raw=String(value??'').trim();
 if(!/^\d{1,2}$/.test(raw))return null;
 const n=Number(raw);
 return Number.isInteger(n)&&n>=1&&n<=39?n:null;
}

function laneX(board,hand){
 return 76+((hand==='zurdo'?board-0.5:39.5-board)/39)*368;
}

function laneVisualSvg(s){
 const hand=db.hand==='zurdo'?'zurdo':'diestro';
 const fields=[{key:'approach',name:'Posición inicial',y:625,color:'#22c58b'},{key:'arrow',name:'Flechas',y:462,color:'#37b7ff'},{key:'breakpoint',name:'Breakpoint',y:245,color:'#ffb343'}];
 const positions=fields.map(f=>({...f,board:laneBoardNum(s.currentLine[f.key])}));
 const stripes=Array.from({length:39},(_,i)=>`<rect x="${(76+i*368/39).toFixed(2)}" y="72" width="${(368/39+.2).toFixed(2)}" height="593" fill="${i%2?'#e5af6c':'#f3c68a'}" opacity="${i%4===0?.82:.69}"/>`).join('');
 const arrows=[5,10,15,20,25,30,35].map((n,i)=>{const x=laneX(n,'diestro');return `<path d="M${x.toFixed(1)} 455 l-5 15 h10 z" fill="#345978" opacity="${i===3?.85:.55}"/>`}).join('');
 const pinPositions=[[0,0],[-10,-17],[10,-17],[-20,-34],[0,-34],[20,-34],[-30,-51],[-10,-51],[10,-51],[30,-51]].map(([dx,dy])=>`<g transform="translate(${260+dx*1.45} ${158+dy*1.0})"><ellipse cx="0" cy="3" rx="6" ry="8" fill="#d8e8f2" opacity=".6"/><ellipse cx="0" cy="0" rx="4.5" ry="9" fill="#fff" stroke="#d4e4f0" stroke-width="1"/><rect x="-3.4" y="-1" width="6.8" height="2.5" rx="1" fill="#d53c45"/></g>`).join('');
 const valid=positions.filter(f=>f.board!==null);
 const path=valid.length>=2?`<path d="M${valid.map((f,i)=>`${i===0?'':'L'}${laneX(f.board,hand).toFixed(1)},${f.y}`).join(' ')}" fill="none" stroke="#c8f4ff" stroke-width="7" opacity=".22" stroke-linejoin="round"/><path d="M${valid.map((f,i)=>`${i===0?'':'L'}${laneX(f.board,hand).toFixed(1)},${f.y}`).join(' ')}" fill="none" stroke="#14b7f1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`:'';
 const guides=positions.map(f=>`<g><line x1="76" y1="${f.y}" x2="444" y2="${f.y}" stroke="${f.color}" stroke-width="1.5" opacity=".7" stroke-dasharray="7 6"/><text x="12" y="${f.y-10}" fill="#e5edf5" font-size="12" font-weight="750">${f.key==='approach'?'SALIDA':f.key==='arrow'?'FLECHAS':'BREAK'}</text></g>`).join('');
 const pins=pinPositions;
 const markers=positions.map(f=>f.board===null?'':`<g pointer-events="none"><circle cx="${laneX(f.board,hand)}" cy="${f.y}" r="17" fill="${f.color}" opacity=".21"/><circle cx="${laneX(f.board,hand)}" cy="${f.y}" r="9" fill="${f.color}" stroke="#fff" stroke-width="3"/><rect x="${Math.max(84,Math.min(391,laneX(f.board,hand)-23)).toFixed(1)}" y="${f.y-34}" width="46" height="19" rx="9" fill="#0d3353" stroke="${f.color}"/><text x="${Math.max(84,Math.min(391,laneX(f.board,hand)-23))+23}" y="${f.y-20.5}" text-anchor="middle" fill="#fff" font-size="11" font-weight="800">${f.board}</text></g>`).join('');
 const zones=positions.map(f=>`<rect class="lane-hit-area" data-lane-key="${f.key}" x="76" y="${f.y-(f.key==='breakpoint'?44:43)}" width="368" height="${f.key==='approach'?63:86}" fill="#fff" fill-opacity=".002" role="button" tabindex="0" aria-label="Seleccionar tabla en ${f.name}" onclick="laneSelect(event,'${f.key}')" onkeydown="laneKeyboard(event,'${f.key}')"/>`).join('');
 return `<svg class="lane-graphic" viewBox="0 0 520 700" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Pista esquemática vista desde arriba. Toca una zona para seleccionar la tabla.">
 <defs><linearGradient id="mb-lane-border" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#133956"/><stop offset=".5" stop-color="#386786"/><stop offset="1" stop-color="#133956"/></linearGradient></defs>
 <rect width="520" height="700" fill="#0e2a47" rx="15"/>
 <rect x="54" y="60" width="412" height="614" fill="#081a30" rx="10"/>
 <rect x="67" y="68" width="386" height="601" fill="url(#mb-lane-border)" rx="6"/>
 ${stripes}
 <rect x="76" y="72" width="368" height="593" fill="#f0c58e" opacity=".12"/>
 <rect x="70" y="72" width="6" height="593" fill="#0e334e"/><rect x="444" y="72" width="6" height="593" fill="#0e334e"/>
 <line x1="76" y1="576" x2="444" y2="576" stroke="#123c63" stroke-width="5"/>
 <text x="260" y="692" text-anchor="middle" fill="#b7d7ec" font-size="12" font-weight="700">VISTA CENITAL · ${hand==='zurdo'?'ZURDO':'DIESTRO'} · TABLAS 1–39</text>
 ${arrows}${pins}${guides}${path}${markers}${zones}
 </svg>`;
}

function laneVisual(s){
 const hand=db.hand==='zurdo'?'zurdo':'diestro';
 const labels=[['approach','Posición inicial','#22c58b'],['arrow','Flechas','#37b7ff'],['breakpoint','Breakpoint','#ffb343']];
 const rows=labels.map(([k,label,color])=>{
  const num=laneBoardNum(s.currentLine[k]);
  return `<div class="lane-control-row" data-lane-row="${k}"><span class="lane-control-indicator" style="background:${color}"></span><span class="lane-control-name">${label}<small>${num===null?'Sin seleccionar':'Tabla '+num}</small></span><button type="button" class="lane-control-nudge" onclick="laneNudge('${k}',-1)" aria-label="${label}: reducir una tabla">−</button><button type="button" class="lane-control-nudge" onclick="laneNudge('${k}',1)" aria-label="${label}: aumentar una tabla">+</button></div>`;
 }).join('');
 return `<section class="lane-visual" aria-label="Registro visual de la línea de juego"><div class="lane-visual-title"><div><h3>Pista interactiva · vista superior</h3><p>Elige la tabla tocando la pista o ajusta con + y −.</p></div><span class="lane-visual-tag">39 tablas · ${hand==='zurdo'?'zurdo':'diestro'}</span></div><div id="lane-visual-live" class="lane-visual-layout"><div class="lane-visual-scene">${laneVisualSvg(s)}</div><div class="lane-visual-sidebar"><div class="lane-visual-help">Selecciona el punto de <strong>salida</strong>, las <strong>flechas</strong> y el <strong>breakpoint</strong>. Los valores se guardan para el siguiente lanzamiento.</div>${rows}<p class="lane-visual-caption">Representación esquemática, no simulación física 3D. Puedes introducir valores manualmente debajo.</p></div></div></section>`;
}

function laneSync(){
 const el=$('lane-visual-live'),s=session();
 if(!el||!s)return;
 const scene=el.querySelector('.lane-visual-scene');
 if(scene)scene.innerHTML=laneVisualSvg(s);
 for(const key of ['approach','arrow','breakpoint']){
  const label=el.querySelector('[data-lane-row="'+key+'"] .lane-control-name small');
  if(label){const value=laneBoardNum(s.currentLine[key]);label.textContent=value===null?'Sin seleccionar':'Tabla '+value;}
 }
}

function laneSelect(event,key){
 const s=session();
 if(!s||!['approach','arrow','breakpoint'].includes(key))return;
 const box=event.currentTarget.getBoundingClientRect();
 if(!box.width)return;
 const ratio=Math.max(0,Math.min(1,(event.clientX-box.left)/box.width));
 const number=1+Math.round((db.hand==='zurdo'?ratio:1-ratio)*38);
 s.currentLine[key]=String(number);
 const input=$(key);if(input)input.value=String(number);
 save();laneSync();
}

function laneNudge(key,step){
 const s=session();
 if(!s||!['approach','arrow','breakpoint'].includes(key))return;
 const before=laneBoardNum(s.currentLine[key])??20;
 const number=Math.max(1,Math.min(39,before+(step<0?-1:1)));
 s.currentLine[key]=String(number);
 const input=$(key);if(input)input.value=String(number);
 save();laneSync();
}

function laneKeyboard(event,key){
 if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
  event.preventDefault();
  const direction=event.key==='ArrowLeft'?(db.hand==='zurdo'?-1:1):(db.hand==='zurdo'?1:-1);
  laneNudge(key,direction);
  const updated=$('lane-visual-live')?.querySelector('.lane-hit-area[data-lane-key="'+key+'"]');
  if(updated)updated.focus();
 }else if(event.key==='Enter'||event.key===' '){
  event.preventDefault();
  const n=laneBoardNum(session()?.currentLine?.[key])??20;
  const input=$(key);if(input){input.focus();input.select();}
 }
}

function registryFrameMissedPins(g,frame){
 const fr=rollsIn(g,frame);
 if(fr.length<2||!fr[0]||fr[0].pins.length===10)return null;
 // La segunda tirada debe haber terminado el frame: en el 10º puede haber un bonus.
 if(frame===10&&(fr.length!==2||fr[0].pins.length+fr[1].pins.length===10))return null;
 const hit=new Set([...fr[0].pins,...fr[1].pins]);
 return PINS.filter(pin=>!hit.has(pin));
}
function registryPinMini(g){
 return `<div class="registry-v4-pin-history" aria-label="Detalle por frame: negro tras primera o derribado en segunda; rojo en pie después de segunda">${Array.from({length:10},(_,i)=>{
  const frame=i+1,fr=rollsIn(g,frame),first=fr[0],second=fr[1];
    const remainingFirst=first?PINS.filter(pin=>!first.pins.includes(pin)):[];
    const knockedSecond=second?remainingFirst.filter(pin=>second.pins.includes(pin)):[];
    const missed=second?registryFrameMissedPins(g,frame):null;
    const black=second?knockedSecond:remainingFirst;
    const red=second&&missed?missed:[];
  const closed=frame===10?complete(g):!!fr[0]&&(fr[0].pins.length===10||fr.length>=2);
  const status=!first?'sin comenzar':!second&&first.pins.length<10?remainingFirst.length+' en pie tras la primera':second?(red.length+' en pie y '+knockedSecond.length+' derribado(s) en la segunda'):'strike';
  const rows=RACK.map(row=>`<span class="registry-v4-mini-row">${row.map(pin=>`<i data-pin="${pin}" aria-hidden="true" class="registry-v4-mini-dot ${black.includes(pin)?'standing':red.includes(pin)?'missed':first?'fallen':'unplayed'}"></i>`).join('')}</span>`).join('');
  return `<span class="registry-v4-mini-frame" title="Frame ${frame}: ${status}" aria-label="Frame ${frame}: ${status}">${rows}</span>`;
 }).join('')}</div>`;
}

function registry(){const RC=window.MiBowlingRegistroCompacto;if(RC&&RC.enabled()&&session()){if(RC.active()){const html=RC.render();if(html){RC.syncBody(true);return html}}else return RC.classicBar()+registryClassic()}return registryClassic()}
function registryClassic(){const s=session();if(!s)return `<div class="card"><h2>Ninguna sesión abierta</h2><button class="btn primary" onclick="go('nueva')">Crear sesión</button></div>`;const g=game(s),n=next(g),lane=n.done?currentLane(g,10):currentLane(g,n.frame),completed=s.games.filter(complete).length;return `<section class="registry-v4">${head(s.title|| (s.type==='oficial'?'Competición oficial':'Entrenamiento'),`Partida ${s.games.length} · ${s.date}`,`<button class="btn outline" onclick="ligaReturn?ligaBack():go('historial')">${ligaReturn?'← Volver a Liga':'Salir'}</button>`)}
 <div class="row wrap mb12"><span class="pill ${s.type==='oficial'?'orange':''}">${classificationLabel(s)}</span><span class="pill gray">${lane.pair?`Par ${lane.pair.join('–')} · Pista ${lane.lane}`:lane.lane?`Pista ${lane.lane}`:'Pista no indicada'}</span></div>

 
  <div class="card compact-score registry-v4-score"><div class="card-head"><h2>Marcador · Partida ${s.games.length}</h2><span class="pill">${complete(g)?score(g):'Parcial '+score(g)} pts</span></div>${scoreStrip(g,n)}${exactGame(g)?registryPinMini(g):''}<p class="registry-v4-mini-legend"><span><i class="registry-v4-legend-black" aria-hidden="true"></i> Negro: en pie tras la 1.ª / derribados en la 2.ª.</span><span><i class="registry-v4-legend-red" aria-hidden="true"></i> Rojo: en pie tras la 2.ª.</span></p><div class="score-actions-row mt12">${lane.pair?`<span class="hint">${n.done?'Última pista':`Frame ${n.frame} ·`} ${lane.lane?`Pista ${lane.lane}`:'Sin pista'}. Alternancia por frame.</span>`:''}<div class="score-action-buttons"><button type="button" class="btn outline" onclick="editPair=!editPair;render()">⇄ Cambiar par</button><button type="button" class="btn outline" onclick="undoRoll()" ${g.rolls.length?'':'disabled'} aria-label="Deshacer último lanzamiento">↶ Deshacer último lanzamiento</button></div></div></div>
${editPair?pairEditor(s,g,n):''}
${n.done?finishedGame(s,g,completed):`<div class="card registry-v4-roll"><div class="game-heading"><div><h1>Frame ${n.frame} · Tirada ${n.ball}</h1></div><span class="pill">${selection.length} en pie</span></div>
<p class="registry-v4-pin-caption">Toca los <strong>bolos que quedan en pie</strong>.<small>Si no marcas ninguno, anotarás todos derribados.</small></p><div class="registry-v4-rack-wrap">${n.available?rackUI(n.available):'<p class="hint">Este frame se empezó por cantidad: termínalo en el registro nuevo (modo Cantidad).</p>'}</div>
 <button class="btn primary big block mt12 registry-v4-record" onclick="recordRoll()" id="quick-record">${selection.length===0?(n.available.length===10?'✕ Strike':'✓ Derribados todos'):`Registrar ${n.available.length-selection.length} derribados →`}</button>
 ${quickLayout==='large'?'':''}<p class="registry-v4-quick-caption">Atajos: «Todos en pie», «Todos derribados» y «Falta» registran directamente la tirada.</p><div class="actions mt12 v25-actions registry-v4-quick ${quickLayout==='compact'?'quick-compact':quickLayout==='large'?'quick-large':''}" data-quickbar><button class="btn" onclick="fastRoll(true)">Todos en pie</button><button class="btn" onclick="fastRoll(false)">Todos derribados</button><button class="btn foul-btn" onclick="foulRoll()">Falta</button><button type="button" class="btn" onclick="selection=[];render()">Limpiar</button></div>
 ${s.type==='entrenamiento'&&!pendingClassification(s)?`<label class="switch stats-checkbox"><input type="checkbox" ${g.includeStats!==false?'checked':''} onchange="toggleGameStats('${g.id}',this.checked)"> Incluir esta partida en estadísticas</label>`:''}

 <details class="registry-v4-extra" ${registryDetailsOpen?'open':''} ontoggle="registryDetailsOpen=this.open"><summary><b>${uiInl('ball')} Bola y línea de juego</b><small>Posición · flechas · breakpoint</small></summary><div class="card" style="margin:17px 0 12px;background:#f5fbfc"><div class="card-head"><h3>${uiInl('ball')} Bola utilizada</h3><button class="textlink" onclick="openBallPickerFor(${esc(JSON.stringify(s.id))},'registro')">Cambiar selección →</button></div>${ballSelect('roll-ball','ballId',s.currentBallId).replace('<select ','<select onchange="changeBall(this.value)" ')}
 ${laneVisual(s)}
 <button type="button" class="btn outline mt12" onclick="openBallAdvisorFor(${esc(JSON.stringify(s.id))})">${uiInl('ball')} Asistente de competición</button>
 <div class="row" style="margin-top:10px"><h3 style="margin:0">Línea de juego</h3><span class="hint">Se recuerda para el siguiente tiro</span></div><div class="form-grid line-grid"><div><label class="field" for="approach">Approach · tabla</label><input id="approach" inputmode="decimal" class="input" placeholder="Ej. 25" value="${esc(s.currentLine.approach)}" onchange="changeLine('approach',this.value)"></div><div><label class="field" for="arrow">Flecha · tabla</label><input id="arrow" inputmode="decimal" class="input" placeholder="Ej. 15" value="${esc(s.currentLine.arrow)}" onchange="changeLine('arrow',this.value)"></div><div><label class="field" for="breakpoint">Breakpoint</label><input id="breakpoint" inputmode="decimal" class="input" placeholder="Opcional" value="${esc(s.currentLine.breakpoint)}" onchange="changeLine('breakpoint',this.value)"></div></div></div>
 </details></div>`}
 <details class="registry-v4-history" ${registryHistoryOpen?'open':''} ontoggle="registryHistoryOpen=this.open"><summary>Historial de lanzamientos · ${g.rolls.length} tiradas</summary>${rollLog(g)}</details></section>`}
function changeBall(id){const s=session();if(!s)return;s.currentBallId=id;save()}
function changeLine(k,v){const s=session();if(!s)return;if(!['approach','arrow','breakpoint'].includes(k))return;s.currentLine[k]=v.trim();save();laneSync()}
function pairEditor(s,g,n){const from=n.done?11:rollsIn(g,n.frame).length?n.frame+1:n.frame;return `<div class="card" style="background:#eff9fa"><div class="card-head"><h2>⇄ Cambio de par</h2><button class="btn" onclick="editPair=false;render()">Cerrar</button></div>${from>10?`<p class="hint">Esta partida terminó. Elige el nuevo par al iniciar la siguiente.</p>`:`<p class="hint">Se aplicará desde el frame <b>${from}</b>, manteniendo intactas las pistas anteriores. Si ya has empezado un frame, se hará efectivo en el siguiente.</p><div class="form-grid"><div><label class="field">Nueva primera pista del par</label><input class="input" id="new-pair" inputmode="numeric" type="number" min="1" placeholder="Ej. 9" oninput="pairChangeHint()"></div><div><label class="field">Empiezo en la pista</label><select class="input" id="new-pair-start"><option value="">Indica el par</option></select></div></div><p class="hint" id="new-pair-note"></p><button class="btn primary block" onclick="changePair(${from})">Confirmar cambio de par</button>`}</div>`}
function pairChangeHint(){let p=normalPair($('new-pair')?.value);$('new-pair-start').innerHTML=p?p.map(x=>`<option value="${x}">Pista ${x}</option>`).join(''):'<option value="">Indica el par</option>';}
function changePair(frame){const s=session(),g=game(s),p=normalPair($('new-pair').value),start=intLane($('new-pair-start').value);if(!p||!p.includes(start))return alert('Introduce un par válido y la pista donde empiezas.');g.segments=(g.segments||[]).filter(x=>x.fromFrame<frame);g.segments.push({fromFrame:frame,pair:p,startLane:start});save();editPair=false;render()}
function togglePin(pin){const s=session(),n=next(game(s));if(n.done||!n.available||!n.available.includes(pin))return;selection=selection.includes(pin)?selection.filter(x=>x!==pin):[...selection,pin];render()}
function recordRoll(isFoul=false){const s=session();if(!s)return;const g=game(s),n=next(g);if(n.done||!n.available)return;if(selection.some(p=>!n.available.includes(p)))return alert('Has seleccionado algún bolo que ya estaba derribado.');
 const requestedBall=$('roll-ball')?.value||'';
 const selectedForSession=selectedBallsFor(s.id);
 const chosen=selectedForSession!==null&&!selectedForSession.includes(requestedBall)?'':requestedBall;
 if(chosen&&!db.balls.some(x=>x.id===chosen))return alert('La bola ya no existe en el catálogo.');s.currentBallId=chosen;
 for(const k of ['approach','arrow','breakpoint'])if($(k))s.currentLine[k]=$(k).value.trim();
 const where=currentLane(g,n.frame);g.rolls.push({frame:n.frame,ball:n.ball,pins:n.available.filter(p=>!selection.includes(p)).sort((a,b)=>a-b),ballId:chosen,line:cleanLine(s.currentLine),lane:where.lane,pair:where.pair?[...where.pair]:null,foul:!!isFoul,createdAt:new Date().toISOString()});selection=[];save();render()}
function undoRoll(){const s=session(),g=game(s);if(isFinalOnly(g)){if(!confirm('¿Borrar la puntuación final anotada?'))return;delete g.finalOnly;save();render();return}if(!g.rolls.length)return;if(!confirm('¿Eliminar el último lanzamiento?'))return;g.rolls.pop();selection=[];save();render()}
// 3.3.15 · Anotación del registro nuevo. Guarda por la misma vía (save → MiBowlingEscritura).
function throwBallFor(s,n){const want=(n.capacity===10?s.currentBallId:(s.spareBallId||s.currentBallId))||'';const allowed=selectedBallsFor(s.id);if(!want||(allowed!==null&&!allowed.includes(want))||!db.balls.some(b=>b.id===want))return '';return want}
function recordThrow(opts){const s=session();if(!s)return false;const g=game(s),n=next(g);if(n.done)return false;
 const where=currentLane(g,n.frame);const base={frame:n.frame,ball:n.ball,ballId:throwBallFor(s,n),line:cleanLine(s.currentLine),lane:where.lane,pair:where.pair?[...where.pair]:null,foul:!!opts.foul,createdAt:new Date().toISOString()};
 if(Array.isArray(opts.pins)){if(!n.available)return false;const pins=[...new Set(opts.pins.map(Number))].sort((a,b)=>a-b);if(pins.some(p=>!n.available.includes(p)))return false;g.rolls.push({...base,pins:opts.foul?[]:pins})}
 else{const c=opts.foul?0:opts.count;if(!Number.isInteger(c)||c<0||c>n.capacity)return false;g.rolls.push({...base,pins:[],count:c,pinDetail:'count'})}
 selection=[];save();return true}
function setFinalOnly(value){const s=session();if(!s)return false;const g=game(s),v=Number(value);if(g.rolls.length||isFinalOnly(g)||!validFinalOnly(v))return false;g.finalOnly=v;selection=[];save();return true}
function undoLast(){const s=session();if(!s)return false;const g=game(s);if(isFinalOnly(g)){delete g.finalOnly}else if(g.rolls.length){g.rolls.pop()}else return false;selection=[];save();return true}
function rewindFrame(f){const s=session();if(!s)return false;const g=game(s);if(isFinalOnly(g))return false;const i=g.rolls.findIndex(r=>r.frame===f);if(i<0)return false;const r=g.rolls[i];g.rolls=g.rolls.slice(0,i);if(r.ballId&&r.ball===1)s.currentBallId=r.ballId;s.currentLine=cleanLine(r.line);selection=[];save();return true}
function maxPossible(g){if(isFinalOnly(g))return g.finalOnly;const sim={rolls:g.rolls.map(r=>({frame:r.frame,ball:r.ball,pins:[],count:kn(r),pinDetail:'count'}))};for(let i=0;i<24;i++){const n=next(sim);if(n.done)break;sim.rolls.push({frame:n.frame,ball:n.ball,pins:[],count:n.capacity,pinDetail:'count'})}return score(sim)}
function nextGameQuick(){const s=session();if(!s)return false;const prev=game(s);if(!complete(prev))return false;s.games.push(newGame(s,prev));selection=[];showNext=false;save();return true}
function setSpareBall(id){const s=session();if(!s)return;s.spareBallId=id||'';save()}
function rewindRoll(index){const g=game(session());if(!confirm(`¿Volver a la tirada ${index+1}? Se eliminará esa tirada y todas las posteriores de esta partida para que puedas corregir los bolos.`))return;const r=g.rolls[index];if(r){const s=session(),oldBall=r.ballId||'',chosen=selectedBallsFor(s.id);s.currentBallId=chosen!==null&&!chosen.includes(oldBall)?'':oldBall;s.currentLine=cleanLine(r.line);}g.rolls=g.rolls.slice(0,index);selection=[];save();render()}
function rollLog(g){return `<div class="card"><div class="card-head"><h2>Historial de lanzamientos</h2><span class="pill gray">${g.rolls.length} tiradas</span></div>${g.rolls.length?`<div class="roll-log">${g.rolls.map((r,i)=>{const b=db.balls.find(b=>b.id===r.ballId);return `<div class="list-item"><div><div class="item-title">F${r.frame} · T${r.ball} · ${kn(r)} bolos ${kn(r)===10?'✕':''}</div><div class="item-subtitle">${!exactRoll(r)?'Posiciones no anotadas':kn(r)?r.pins.join(' · '):'Ninguno'}${r.lane?' · Pista '+r.lane:''}${b?' · '+esc(b.model):''}${r.line?.approach?' · Salida '+esc(r.line.approach):''}${r.line?.arrow?' · Flechas '+esc(r.line.arrow):''}${r.line?.breakpoint?' · Break '+esc(r.line.breakpoint):''}</div></div><button class="btn outline" onclick="rewindRoll(${i})" title="Corregir esta tirada">↶</button></div>`}).reverse().join('')}</div>`:'<p class="hint">Los tiros aparecerán aquí a medida que los registres.</p>'}</div>`}
function finishedGame(s,g,completed){return `<div class="card" style="text-align:center"><div class="finished-icon">${uiLineIcon('ball')}</div><h2>Partida terminada</h2><div style="font-size:53px;font-weight:830;color:var(--teal2)">${score(g)}</div><p class="muted">Puntuación sin hándicap · ${completed} partida(s) completas en esta sesión.</p><div class="actions">${ligaReturn?'<button class="btn primary" onclick="ligaBack()">✓ Guardar y volver a Liga</button>':'<button class="btn primary" onclick="showNext=!showNext;render()">＋ Siguiente partida</button><button class="btn outline" onclick="go(\'historial\')">Guardar y salir</button>'}</div>${showNext?nextGameForm(s,g):''}</div>`}
function nextGameForm(s,g){const w=currentLane(g,10);const p=w.pair;const suggested=p?.find(x=>x!==w.lane)||p?.[0];return `<div class="card" style="text-align:left;margin:14px 0 0;background:#f3fafb"><h3>Configurar siguiente partida</h3><p class="hint">Puedes continuar en el mismo par o indicar otro. Esto no altera las partidas anteriores.</p>${g.pair?`<div class="form-grid"><div><label class="field">Par siguiente (primera pista)</label><input class="input" type="number" id="next-pair" placeholder="Ej. 9" value="${p?.[0]||''}" oninput="fillNextPair()"></div><div><label class="field">Pista de salida</label><select class="input" id="next-start">${p?p.map(v=>`<option value="${v}" ${v===suggested?'selected':''}>Pista ${v}</option>`).join(''):'<option value="">Sin pista</option>'}</select></div></div>`:`<label class="field">Pista (opcional)</label><input id="next-lane" class="input" type="number" value="${g.startLane||''}">`}<button class="btn primary block mt12" onclick="addGame()">Empezar siguiente partida →</button></div>`}
function fillNextPair(){const pair=normalPair($('next-pair')?.value);$('next-start').innerHTML=pair?pair.map(x=>`<option value="${x}">Pista ${x}</option>`).join(''):'<option value="">Sin pista</option>'}
function addGame(){const s=session(),prev=game(s);if(!complete(prev))return alert('Termina la partida primero.');const g=newGame(s,prev);
 if(g.pair){const entered=$('next-pair')?.value||'',p=entered?normalPair(entered):null;if(entered&&!p)return alert('Par inválido');g.pair=p;g.startLane=p?(intLane($('next-start')?.value)||p[0]):null;if(p&&!p.includes(g.startLane))return alert('La pista inicial no pertenece al par indicado.')}else g.startLane=intLane($('next-lane')?.value)||null;
 s.games.push(g);save();selection=[];showNext=false;render()}
let historyOpenDay='';
// LAB: clasificación explícita por partida, sin cambiar el formato v2.
const LT_PENDING_NOTE='Tipo de jornada no confirmado en la copia de origen. Se muestra provisionalmente en Entrenamientos por compatibilidad y no se incluye en las estadísticas de entrenamiento hasta que se confirme su clasificación.';
function pendingClassification(s){return s?.type==='entrenamiento'&&String(s.title||'').endsWith(' [Tipo pendiente]')&&String(s.notes||'').split('\n').includes(LT_PENDING_NOTE)}
function classificationMode(s){return pendingClassification(s)?'pendiente':s.type}
function classificationLabel(s){return pendingClassification(s)?'Pendiente de clasificar':s.type==='oficial'?'Competición':'Entrenamiento'}
function classificationLocked(s,league=liga32){return !!(s.leagueOther||s.leaguePlayer||league?.matches?.some(m=>m.players?.some(p=>Object.values(p.links||{}).some(l=>l?.sessionId===s.id))))}
function classificationPlan(source,sessionId,gameId,type,idFactory,league){
 if(!['entrenamiento','oficial'].includes(type))throw Error('Tipo no válido.');
 const s=source.sessions.find(x=>x.id===sessionId);if(!s)throw Error('La jornada ya no existe.');
 if(classificationLocked(s,league))throw Error('La jornada está vinculada a Liga. No se puede cambiar su tipo aquí.');
 const selected=gameId?s.games.filter(g=>g.id===gameId):s.games;
 if(!selected.length||(gameId&&selected.length!==1))throw Error('La partida ya no existe o su ID está duplicado.');
 const pending=pendingClassification(s);if(!pending&&s.type===type)return null;
 const split=selected.length!==s.games.length;
 const id=split?idFactory():s.id;if(split&&(!id||source.sessions.some(x=>x.id===id)))throw Error('Identificador de jornada no válido.');
 const result=JSON.parse(JSON.stringify(source)),index=result.sessions.findIndex(x=>x.id===sessionId),original=result.sessions[index];
 const wanted=new Set(selected.map(g=>g.id));const moved=original.games.filter(g=>wanted.has(g.id));
 const dest={...original,id,type,games:moved};
 if(pending){dest.title=dest.title.slice(0,-' [Tipo pendiente]'.length);dest.notes=dest.notes.split('\n').filter(n=>n!==LT_PENDING_NOTE).join('\n');dest.notes+=(dest.notes?'\n':'')+'Tipo confirmado manualmente: '+(type==='oficial'?'Competición':'Entrenamiento')+'.';for(const g of moved)g.includeStats=!!complete(g)}
 // Los objetivos de entrenamiento no son aplicables a competición. Conservar su valor como nota.
 if(type==='oficial'&&dest.goal){dest.notes+=(dest.notes?'\n':'')+'Objetivo anterior de entrenamiento: '+JSON.stringify(dest.goal);dest.goal=null}
 if(split){original.games=original.games.filter(g=>!wanted.has(g.id));result.sessions.splice(index+1,0,dest)}else result.sessions[index]=dest;
 return {db:result,id,split,pending,count:moved.length};
}
// Consultar también la Liga persistida: otra pestaña puede haber creado un vínculo.
function classificationLeagueSnapshot(){
 const raw=localStorage.getItem(LIGA32_KEY);let league=null;
 if(raw!==null){league=JSON.parse(raw);if(!league||!Array.isArray(league.matches))throw Error('No se puede verificar el estado guardado de Liga.');}
 return {raw,league};
}
function classificationControls(s,g=null){
 try{if(classificationLocked(s)||classificationLocked(s,classificationLeagueSnapshot().league))return '<p class="hint">Tipo protegido: partida vinculada a Liga.</p>';}
 catch{return '<p class="hint">Tipo protegido: no se puede verificar el estado guardado de Liga.</p>';}
 const sid=esc(s.id),gid=esc(g?.id||''),pending=pendingClassification(s),label=g?'Cambiar tipo':'Cambiar tipo de toda la jornada';
 return `<div class="mt12"><button type="button" class="btn outline" aria-expanded="false" onclick="const p=this.nextElementSibling;p.hidden=!p.hidden;this.setAttribute('aria-expanded',String(!p.hidden))">${label}</button><div hidden class="mt12"><p class="hint">Tipo actual: ${classificationLabel(s)}. No se modifican los lanzamientos.</p><div class="actions">${['entrenamiento','oficial'].filter(t=>pending||t!==s.type).map(t=>`<button type="button" class="btn outline" data-session="${sid}" data-game="${gid}" data-type="${t}" onclick="applyClassification(this.dataset.session,this.dataset.game,this.dataset.type)">${t==='oficial'?'Competición':'Entrenamiento'}</button>`).join('')}</div></div></div>`;
}
function applyClassification(sessionId,gameId,type){
 let plan,primaryAttempted=false;const source=db.sessions.find(s=>s.id===sessionId);
 try{if(!source)return;plan=classificationPlan(db,sessionId,gameId,type,uid,liga32);if(!plan)return;}catch(e){return alert(e.message)}
 const description=type==='oficial'?'Competición':'Entrenamiento';
 if(!confirm(`¿Cambiar ${plan.count===1?'esta partida':plan.count+' partidas'} a ${description}? ${plan.split?'Se separará de la jornada original. ':''}Se conservarán los lanzamientos y la puntuación. Las estadísticas se recalcularán.`))return;
 try{
  if(saveError)throw Error('Hay cambios de guardado pendientes. Exporta una copia y revisa el espacio.');
  const leagueSnapshot=classificationLeagueSnapshot();
  if(classificationLocked(source,liga32)||classificationLocked(source,leagueSnapshot.league))throw Error('La jornada está vinculada a Liga. No se puede cambiar su tipo aquí.');
  const raw=localStorage.getItem(KEY),legacy=localStorage.getItem(OLDKEY);
  if(JSON.stringify(migrate(JSON.parse(raw||legacy||'null')))!==JSON.stringify(db))throw Error('Los datos guardados han cambiado. Recarga antes de modificar el tipo.');
  // Copiar la selección operativa al nuevo ID sin tocar el ámbito original. Si falla, no iniciar la escritura principal.
  if(plan.split){if(ballSelectionSaveError)throw Error('Hay una selección de bolas pendiente de guardar.');const selections=latestBallSelections();if(Object.prototype.hasOwnProperty.call(selections,sessionId)){
   const nextSelections={...selections,[plan.id]:[...selections[sessionId]]};const encoded=JSON.stringify(nextSelections);
   window.MiBowlingEscritura.write(BALL_SELECTION_KEY,encoded);if(localStorage.getItem(BALL_SELECTION_KEY)!==encoded)throw Error('No se pudo verificar la selección de bolas.');ballSelections=nextSelections;ballSelectionSaveError=false;
  }}
  if(localStorage.getItem(KEY)!==raw||localStorage.getItem(OLDKEY)!==legacy)throw Error('El historial cambió durante la operación. Recarga antes de continuar.');
  if(localStorage.getItem(LIGA32_KEY)!==leagueSnapshot.raw)throw Error('El estado guardado de Liga cambió durante la operación. Recarga antes de continuar.');
  const encoded=JSON.stringify(plan.db);primaryAttempted=true;window.MiBowlingEscritura.write(KEY,encoded);if(localStorage.getItem(KEY)!==encoded)throw Error('No se pudo verificar el guardado.');
  db=plan.db;saveError=false;
 }catch(e){if(primaryAttempted)saveError=true;return alert('No se pudo confirmar el cambio de tipo. '+e.message+' No repitas el cambio sin cerrar y volver a abrir la aplicación y comprobar el historial. Conserva tu copia de seguridad.')}
 if(tab==='detalle'){activeId=plan.id;historyMode=type;historyOpenDay=type+source.date;}
 else if(!plan.split){historyMode=type;historyOpenDay=type+source.date;}
 else {if(activeId===sessionId&&gameId&&source.games.at(-1)?.id===gameId)activeId=plan.id;historyOpenDay=classificationMode(source)+source.date;}
 render();
}

function history(){const rows=[...db.sessions].filter(s=>classificationMode(s)===historyMode).sort((a,b)=>b.date.localeCompare(a.date));let groups={};for(const s of rows)(groups[s.date]??=[]).push(s);return `${head('Historial','')}<div class="seg mb16"><button class="${historyMode==='entrenamiento'?'active':''}" onclick="historyMode='entrenamiento';historyOpenDay='';render()">${uiInl('walk')} Entrenamientos</button><button class="${historyMode==='oficial'?'active':''}" onclick="historyMode='oficial';historyOpenDay='';render()">${uiInl('trophy')} Competiciones</button><button class="${historyMode==='pendiente'?'active':''}" onclick="historyMode='pendiente';historyOpenDay='';render()">Pendientes</button></div>${Object.entries(groups).map(([date,ss])=>{const key=historyMode+date,open=historyOpenDay===key,count=ss.reduce((n,s)=>n+s.games.length,0),venues=[...new Set(ss.map(s=>s.venue).filter(Boolean))].join(' · ')||'Bolera sin indicar';return `<div class="card v25-day"><button class="v25-day-head" onclick="historyOpenDay=${open?"''":`'${key}'`};render()"><span class="v25-day-icon">${historyMode==='pendiente'?'?':historyMode==='entrenamiento'?uiLineIcon('walk'):uiLineIcon('trophy')}</span><span><strong>${esc(date)}</strong><small>${count} partidas · ${esc(venues)}</small></span><b>${open?'⌃':'⌄'}</b></button>${open?ss.map(s=>`<div class="v25-day-session"><strong>${esc(s.title|| (s.type==='oficial'?'Competición':'Entrenamiento'))}</strong><small>${s.games.length} partidas · ${classificationLabel(s)}</small>${classificationControls(s)}${s.games.map((g,i)=>`<div><div class="v25-day-game"><span>Partida ${i+1}</span><b>${complete(g)?score(g):'En curso'}</b></div>${classificationControls(s,g)}</div>`).join('')}<div class="actions"><button class="btn primary" onclick="openSession('${s.id}')">${s.games.some(g=>!complete(g))?'Continuar':'Abrir'}</button><button class="btn outline" onclick="activeId='${s.id}';go('detalle')">Informe</button><button class="btn warn" onclick="deleteSession('${s.id}')">Eliminar</button></div></div>`).join(''):''}</div>`}).join('')||'<div class="card empty">Sin jornadas registradas</div>'}`}
function deleteSession(id){const s=db.sessions.find(x=>x.id===id);if(!s)return;if(!confirm(`¿Borrar ${s.title||'esta sesión'} y TODOS sus lanzamientos? No se puede deshacer.`))return;db.sessions=db.sessions.filter(x=>x.id!==id);const current=latestBallSelections();if(Object.prototype.hasOwnProperty.call(current,id)){const selections={...current};delete selections[id];persistBallSelections(selections)}if(activeId===id)activeId=null;save();render()}
function detail(){const s=session();if(!s)return go('historial');return `${head(s.title||'Sesión',`${s.date} · ${s.venue||'Bolera sin especificar'}`,`<button class="btn outline" onclick="go('historial')">Volver</button>`)}
 <div class="card"><div class="row"><span class="pill ${s.type==='oficial'?'orange':''}">${classificationLabel(s)}</span><span class="hint">${s.games.filter(complete).length} completas${s.goal?' · Objetivo: '+esc(s.goal.kind):''}</span></div>${s.pattern?`<p class="hint">Patrón: ${esc(s.pattern)} · <button class="btn outline" onclick="selectedPatternId='${esc(s.patternId)}';go('patrones')">Consultar patrón</button></p><label class="field">Observaciones sobre aceite / reacción</label><textarea class="input note" id="oil-session-note" onchange="savePatternNote('${s.id}',this.value)">${esc(s.patternNotes||'')}</textarea>`:''}${s.notes?`<p>${esc(s.notes)}</p>`:''}${classificationControls(s)}</div>
 ${s.games.map((g,i)=>`<div class="card"><div class="card-head"><h2>Partida ${i+1}</h2><span class="pill">${complete(g)?score(g)+' pts':'En curso'}</span></div>${s.type==='entrenamiento'&&!pendingClassification(s)?`<label class="switch stats-checkbox"><input type="checkbox" ${g.includeStats!==false?'checked':''} onchange="toggleGameStats('${g.id}',this.checked)"> Incluir en estadísticas</label>`:''}${classificationControls(s,g)}${isFinalOnly(g)?`<p class="hint">Anotada solo con la puntuación final: ${g.finalOnly}. No tiene frames ni tiradas.</p>`:`${scoreStrip(g,{frame:null})}
 <div class="table-scroll mt12"><table><thead><tr><th>Frame</th><th>Pista</th><th>Tiradas</th><th>Acumulado</th></tr></thead><tbody>${Array.from({length:10},(_,j)=>{let lane=rollsIn(g,j+1)[0]?.lane||currentLane(g,j+1).lane;return `<tr><td>${j+1}</td><td>${lane||'—'}</td><td>${frameLabel(g,j+1)||'—'}</td><td>${frameScores(g)[j]??'—'}</td></tr>`}).join('')}</tbody></table></div><details class="mt12"><summary>Ver lanzamientos y bolas</summary>${g.rolls.map(r=>{let b=db.balls.find(x=>x.id===r.ballId);return `<p class="hint">F${r.frame}, L${r.ball}: ${kn(r)} bolos (${exactRoll(r)?(r.pins.join(', ')||'0'):'posiciones no anotadas'}) · Pista ${r.lane||'—'} · ${esc(b?.model||'Bola sin asignar')} · Línea ${esc(r.line?.approach||'—')} → ${esc(r.line?.arrow||'—')}</p>`}).join('')}</details>`}</div>`).join('')}
 ${s.type==='entrenamiento'&&s.goal?goalReport(s):''}<div class="card v25-report"><h2>Informe de jornada</h2><div class="dashboard-grid">${tile('▤','Partidas',s.games.filter(complete).length)}${tile('◎','Media',(()=>{let x=s.games.filter(g=>complete(g)&&(s.type!=='entrenamiento'||g.includeStats!==false));return x.length?fmt(x.reduce((v,g)=>v+score(g),0)/x.length):'—'})())}${tile('✕','Strikes',s.games.flatMap(g=>g.rolls).filter(r=>kn(r)===10&&r.ball===1).length)}${tile('F','Faltas',s.games.flatMap(g=>g.rolls).filter(r=>r.foul).length)}</div><div class="actions mt12"><button class="btn primary" onclick="shareSessionImage()">Compartir marcador (imagen)</button><button class="btn outline" onclick="window.print()">Imprimir / PDF</button></div></div><button class="btn primary block" onclick="openSession('${s.id}')">Volver al registro</button>`}
function uiRevealStatsPane(focus){const b=document.querySelector('.ui-stats-chip[aria-pressed="true"]');if(b){if(focus)b.focus({preventScroll:true});const p=b.parentElement;const br=b.getBoundingClientRect(),pr=p.getBoundingClientRect();p.scrollLeft+=br.left-pr.left-(p.clientWidth-b.clientWidth)/2;}}
function uiSelectStatsPane(k){statPane=k;render();uiRevealStatsPane(true);}
function stats(){const a=periodAggregate(aggregate(statMode,statsBallId)),m=metrics(a);return `${head('Estadísticas','Análisis independiente para cada modalidad.')}
 <div class="row wrap mb12"><span class="hint">Material y rendimiento de tu arsenal</span><button type="button" class="textlink" onclick="openBallPickerFor('','estadisticas')">Ver mis bolas →</button></div>
 <div class="seg mb16"><button class="${statMode==='entrenamiento'?'active':''}" onclick="statMode='entrenamiento';statsBallId='';render()"><svg class="ui-line-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/></svg> Entrenamientos</button><button class="${statMode==='oficial'?'active':''}" onclick="statMode='oficial';statsBallId='';render()"><svg class="ui-line-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg> Competición oficial</button></div>
 <div class="card"><div class="ui-stats-filter"><label for="stats-ball">Bola</label><div style="flex:1;min-width:0"><select class="input" id="stats-ball" onchange="statsBallId=this.value;render()"><option value="">Todas las bolas</option>${db.balls.map(b=>`<option value="${esc(b.id)}" ${statsBallId===b.id?'selected':''}>${esc(b.brand+' '+b.model)}</option>`).join('')}</select></div></div>
  ${a.totals.length?`<div class="dashboard-grid mt16">${m.map(x=>tile(x.icon,x.label,x.value)).join('')}${tile('↗','Partidas 200+',a.totals.filter(v=>v>=200).length)}${tile('◎','Pocket 1–'+pocketStats(a).flank,p100(pocketStats(a).hit,pocketStats(a).total),pocketStats(a).hit+' / '+pocketStats(a).total)}${tile('✓','Clean Games',a.games.filter(cleanGame).length,p100(a.games.filter(cleanGame).length,a.games.length)+' partidas limpias')}</div>`:`<div class="ui-empty-card mt16"><div><h2>Sin resultados para este filtro</h2><p>Registra o completa partidas, o cambia el filtro para consultar tus resultados.</p></div><button type="button" class="btn primary" onclick="go('nueva')">Registrar partida</button></div>`}
 ${statsBallId?`<p class="warning-box">La media de las partidas corresponde a juegos en los que se usó esta bola, aunque también se hayan usado otras bolas. Las estadísticas por lanzamiento se atribuyen exclusivamente a la bola seleccionada.</p>`:''}
 </div><div class="card"><span class="field" id="ui-stats-label">Apartado de estadísticas</span><select id="stats-pane-select" class="input" hidden tabindex="-1" aria-hidden="true" onchange="statPane=this.value;render()">${[['general','Resumen general'],['bolos','Análisis por bolo'],['spares','Spares'],['tecnica','Técnica / pistas'],['boleras','Boleras y pistas'],['frames','Por frame'],['combinaciones','Combinaciones'],['periodos','Periodos'],['campeonatos','Campeonatos']].map(([k,l])=>`<option value="${k}" ${statPane===k?'selected':''}>${l}</option>`).join('')}</select> <div class="ui-stats-chips" role="group" aria-labelledby="ui-stats-label">${[['general','Resumen general'],['bolos','Análisis por bolo'],['spares','Spares'],['tecnica','Técnica / pistas'],['boleras','Boleras y pistas'],['frames','Por frame'],['combinaciones','Combinaciones'],['periodos','Periodos'],['campeonatos','Campeonatos']].map(([k,l])=>`<button type="button" class="ui-stats-chip" data-ui-pane="${k}" aria-pressed="${statPane===k}" onclick="uiSelectStatsPane(this.dataset.uiPane)">${l}</button>`).join('')}</div></div>
 ${(a.totals.length||statPane==='periodos'||statPane==='campeonatos')?(statPane==='general'?statsGeneral(a):statPane==='bolos'?pinAnalysisCombined(a):statPane==='spares'?statsSpares(a):statPane==='boleras'?venueLaneAnalysis(a):statPane==='frames'?frameAnalysis(a):statPane==='combinaciones'?combinationAnalysis(a):statPane==='periodos'?periodAnalysis(a):statPane==='campeonatos'?competitionAnalysis(a):statsTechnical(a)):''}`}
function periodKey(date,period){if(period==='month')return date.slice(0,7);if(period==='quarter'){const m=Number(date.slice(5,7));return date.slice(0,4)+'-T'+Math.ceil(m/3)}if(period==='year')return date.slice(0,4);return 'Total'}
function periodAggregate(a){if(statsPeriod==='all')return a;let now=today(),key=periodKey(now,statsPeriod);const ids=new Set(a.scoreGames.filter(g=>periodKey(g._session.date,statsPeriod)===key).map(g=>g.id));const games=a.games.filter(g=>ids.has(g.id));const scoreGames=a.scoreGames.filter(g=>ids.has(g.id));const rolls=a.rolls.filter(r=>ids.has(r._game.id));const first=a.first.filter(r=>ids.has(r._game.id));const opportunities=a.opportunities.filter(o=>!o.gameId||ids.has(o.gameId));const totals=scoreGames.map(score);return {...a,scoreGames,games,rolls,first,strikes:first.filter(r=>r.pins.length===10),opportunities,spare:opportunities.filter(o=>o.converted).length,totals,avg:totals.length?totals.reduce((x,y)=>x+y,0)/totals.length:0}}
function frameAnalysis(a){let rows=Array.from({length:10},(_,i)=>{const f=i+1,rs=a.games.map(g=>rollsIn(g,f)).filter(x=>x.length);const total=rs.length;const strikes=rs.filter(x=>x[0].pins.length===10).length;const open=rs.filter(x=>x[0].pins.length!==10&&(x[0].pins.length+(x[1]?.pins.length||0)<10)).length;return{f,total,strikes,open,avg:total?rs.reduce((sum,r)=>sum+r[0].pins.length,0)/total:0}});return `<div class="card"><h2>Estadísticas por frame</h2><div class="table-scroll"><table><thead><tr><th>Frame</th><th>Partidas</th><th>1.ª bola</th><th>Strikes</th><th>Abiertos</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.f}</td><td>${r.total}</td><td>${r.total?fmt(r.avg):'—'}</td><td>${p100(r.strikes,r.total)}</td><td>${p100(r.open,r.total)}</td></tr>`).join('')}</tbody></table></div></div>`}
function combinationAnalysis(a){const groups={};for(const o of a.opportunities){if(o.left.length<2)continue;const key=o.left.join('-');let g=groups[key]||(groups[key]={count:0,converted:0,split:isSplit(o.left)});g.count++;if(o.converted)g.converted++}const rows=Object.entries(groups).filter(([k,v])=>comboKind==='all'||(comboKind==='splits'?v.split:!v.split)).sort((x,y)=>y[1].count-x[1].count);return `<div class="card"><h2>Combinaciones de spares</h2><div class="seg mb16"><button class="${comboKind==='normal'?'active':''}" onclick="comboKind='normal';render()">Normales</button><button class="${comboKind==='splits'?'active':''}" onclick="comboKind='splits';render()">Splits</button><button class="${comboKind==='all'?'active':''}" onclick="comboKind='all';render()">Todas</button></div><div class="table-scroll"><table><thead><tr><th>Bolos restantes</th><th>Intentos</th><th>Convertidos</th><th>%</th></tr></thead><tbody>${rows.map(([k,v])=>`<tr><td><strong>${k}</strong>${v.split?' · Split':''}</td><td>${v.count}</td><td>${v.converted}</td><td>${p100(v.converted,v.count)}</td></tr>`).join('')||'<tr><td colspan="4">Sin combinaciones registradas</td></tr>'}</tbody></table></div></div>`}
function periodAnalysis(a){const groups={};for(const g of a.scoreGames){const k=g._session.date.slice(0,7),x=groups[k]||(groups[k]={scores:[],games:[]});x.scores.push(score(g));x.games.push(g)}return `<div class="card"><h2>Evolución por periodos</h2><div class="seg tabs-scroll mb16">${[['all','Todo'],['month','Mes'],['quarter','Trimestre'],['year','Año']].map(([v,l])=>`<button class="${statsPeriod===v?'active':''}" onclick="statsPeriod='${v}';render()">${l}</button>`).join('')}</div><div class="table-scroll"><table><thead><tr><th>Mes</th><th>Partidas</th><th>Media</th><th>Strikes*</th><th>Clean</th></tr></thead><tbody>${Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=>{let first=v.games.flatMap(g=>Array.from({length:10},(_,i)=>rollsIn(g,i+1)[0]).filter(Boolean));return `<tr><td>${k}</td><td>${v.games.length}</td><td>${fmt(v.scores.reduce((a,b)=>a+b,0)/v.scores.length)}</td><td>${p100(first.filter(r=>kn(r)===10).length,first.length)}</td><td>${v.games.filter(cleanGame).length}</td></tr>`}).join('')||'<tr><td colspan="5">Sin partidas</td></tr>'}</tbody></table></div><p class="hint">*Primeras bolas de cada frame.</p></div>`}
function competitionAnalysis(a){if(statMode!=='oficial')return `<div class="card empty">Este apartado corresponde exclusivamente a competiciones oficiales.</div>`;const ss=a.sessions.filter(s=>s.type==='oficial');let chosen=ss.find(s=>s.id===compSessionId)||ss[0];if(!chosen)return '<div class="card empty">Sin competiciones registradas.</div>';const games=chosen.games.filter(complete),total=games.map(score),avg=total.length?total.reduce((x,y)=>x+y,0)/total.length:0;const byPair={};for(let i=0;i<games.length;i++){const g=games[i],pairs=new Set(g.rolls.map(r=>r.pair?.join('–')).filter(Boolean));for(const p of pairs){let o=byPair[p]||(byPair[p]={frames:0,strikes:0});for(let f=1;f<=10;f++){let r=rollsIn(g,f)[0];if(r&&r.pair?.join('–')===p){o.frames++;if(kn(r)===10)o.strikes++}}}}return `<div class="card"><h2>Competiciones oficiales</h2><select class="input" onchange="compSessionId=this.value;render()">${ss.map(s=>`<option value="${s.id}" ${s.id===chosen.id?'selected':''}>${esc(s.date+' · '+(s.title||s.venue||'Competición'))}</option>`).join('')}</select><div class="dashboard-grid mt16">${tile('▤','Partidas',games.length)}${tile('◎','Media',games.length?fmt(avg):'—')}${tile('★','Mejor',games.length?Math.max(...total):'—')}</div><h3>Puntuaciones por partida</h3>${games.map((g,i)=>`<div class="list-item"><b>Partida ${i+1}</b><strong>${score(g)}</strong></div>`).join('')}<h3>Rendimiento por par</h3>${Object.entries(byPair).map(([pair,v])=>`<div class="list-item"><span>Par ${pair} · ${v.frames} frames</span><b>${p100(v.strikes,v.frames)} strikes</b></div>`).join('')||'<p class="hint">Sin pares registrados</p>'}</div>`}

function goalReport(s){const gs=s.games.filter(g=>complete(g)&&exactGame(g)&&g.includeStats!==false),kind=s.goal.kind,target=s.goal.target;let hits=0,total=0;for(const g of gs){const first=Array.from({length:10},(_,i)=>rollsIn(g,i+1)[0]).filter(Boolean);if(kind==='strike'){total+=first.length;hits+=first.filter(r=>r.pins.length===10).length}else if(kind==='pocket'){const flank=db.hand==='zurdo'?2:3;total+=first.length;hits+=first.filter(r=>!r.foul&&r.pins.includes(1)&&r.pins.includes(flank)).length}else if(kind==='clean'){total++;if(cleanGame(g))hits++}else if(kind==='single'){for(let i=1;i<=10;i++){const fr=rollsIn(g,i),a=fr[0],b=fr[1];if(!a||a.pins.length===10||!b||a.foul)continue;const left=PINS.filter(p=>!a.pins.includes(p));if(left.length===1){total++;if(!b.foul&&b.pins.includes(left[0]))hits++}}}}
 const names={pocket:'Pocket',strike:'Strikes',single:'Spare de bolo suelto',clean:'Clean Games'},pct=total?Math.round(hits/total*100):null;return `<div class="card"><h2>Objetivo de entrenamiento · ${esc(names[kind]||kind)}</h2><div class="dashboard-grid">${tile('◎','Meta',target+'%')}${tile('✓','Resultado',pct===null?'—':pct+'%',hits+' / '+total)}${tile('▥','Estado',pct===null?'Sin intentos':pct>=target?'Conseguido':'En progreso')}</div><p class="hint">Solo se consideran partidas completas e incluidas en estadísticas.</p></div>`}
function venueLaneAnalysis(a){const byVenue=new Map(),byLane=new Map();for(const g of a.games){const venue=(g._session.venue||'Sin indicar').trim(),v=byVenue.get(venue)||{games:0,pts:0,max:0,first:0,strikes:0};v.games++;const points=score(g);v.pts+=points;v.max=Math.max(v.max,points);byVenue.set(venue,v);for(let frame=1;frame<=10;frame++){const fr=rollsIn(g,frame),r=fr[0];if(!r)continue;v.first++;if(!r.foul&&r.pins.length===10)v.strikes++;const key=r.lane?venue+' · pista '+r.lane:venue+' · sin pista';const l=byLane.get(key)||{first:0,strikes:0,pins:0,spares:0,opps:0};l.first++;l.pins+=r.foul?0:r.pins.length;if(!r.foul&&r.pins.length===10)l.strikes++;const b=fr[1];if(r.pins.length<10&&b){l.opps++;if(!b.foul&&r.pins.length+b.pins.length===10)l.spares++}byLane.set(key,l)}}const row=(entries,fn)=>entries.length?entries.map(fn).join(''):'<tr><td colspan="5">Sin datos registrados</td></tr>';return `<div class="card"><h2>Rendimiento por bolera</h2><div class="table-scroll"><table><thead><tr><th>Bolera</th><th>Partidas</th><th>Media</th><th>Mejor</th><th>Strikes</th></tr></thead><tbody>${row([...byVenue.entries()].sort((x,y)=>y[1].games-x[1].games),([name,v])=>`<tr><td>${esc(name)}</td><td>${v.games}</td><td>${fmt(v.pts/v.games)}</td><td>${v.max}</td><td>${p100(v.strikes,v.first)}</td></tr>`)}</tbody></table></div></div><div class="card"><h2>Rendimiento por pista</h2><p class="hint">La media de bolos en primer tiro y los porcentajes se atribuyen a la pista exacta. La puntuación de una partida alternada no se atribuye a una sola pista.</p><div class="table-scroll"><table><thead><tr><th>Bolera · pista</th><th>Frames</th><th>1.ª bola</th><th>Strikes</th><th>Spares</th></tr></thead><tbody>${row([...byLane.entries()].sort((x,y)=>y[1].first-x[1].first),([name,v])=>`<tr><td>${esc(name)}</td><td>${v.first}</td><td>${fmt(v.pins/v.first)}</td><td>${p100(v.strikes,v.first)}</td><td>${p100(v.spares,v.opps)}</td></tr>`)}</tbody></table></div></div>`}
function pinAnalysisCombined(a){return `<div class="seg mb16"><button class="${pinSubtab==='derribos'?'active':''}" onclick="pinSubtab='derribos';render()">Derribos</button><button class="${pinSubtab==='sueltos'?'active':''}" onclick="pinSubtab='sueltos';render()">Bolos problemáticos</button></div>${pinSubtab==='derribos'?statsPins(a):problemPins(a)}`}
function statsGeneral(a){const totals=a.totals;return `<div class="card"><h2>Evolución de puntuaciones</h2><p class="hint">Últimas ${Math.min(25,totals.length)} partidas completas</p>${totals.length?'<div id="trend-chart" class="line-chart" aria-label="Gráfico de puntuaciones"></div>':'<div class="empty">El gráfico aparecerá al terminar partidas.</div>'}</div><div class="card"><h2>Distribución de puntuaciones</h2>${totals.length?`<div class="progress-grid">${[[0,99],[100,149],[150,199],[200,249],[250,300]].map(([min,max])=>{let n=totals.filter(x=>x>=min&&x<=max).length;return `<div class="progress-row"><span>${min}–${max}</span><div class="progress"><i style="width:${Math.round(n/totals.length*100)}%"></i></div><b>${n}</b></div>`}).join('')}</div>`:'<p class="hint">Sin partidas completas.</p>'}</div>`}
function pinHits(a,p){const chances=a.first.filter(r=>r.pins.length>=0);return{attempts:chances.length,hit:chances.filter(r=>r.pins.includes(p)).length}}
function statsPins(a){const data=PINS.map(p=>pinHits(a,p));return `<div class="card"><h2>Mapa de derribo por bolo</h2><p class="hint">Porcentaje de primeros tiros con rack completo en los que cae cada bolo. Se incluyen las tiradas de bonificación con rack completo del décimo frame.</p>
 <div class="pin-map">${RACK.map(row=>`<div class="pin-row">${row.map(p=>{let v=data[p-1],q=v.attempts?Math.round(100*v.hit/v.attempts):null;return `<div class="pin-perf"><span class="map-circle" style="background:${q===null?'#eaf2f5':q>=90?'#c1ebe8':q>=75?'#d3e6fb':q>=55?'#ffe9bc':'#ffd0d3'}">${p}</span><b>${q===null?'—':q+'%'}</b></div>`}).join('')}</div>`).join('')}</div></div>
 <div class="card"><h2>Estadísticas individuales</h2><div class="table-scroll"><table><thead><tr><th>Bolo</th><th>Derribado</th><th>Tiros con rack completo</th><th>%</th></tr></thead><tbody>${data.map((v,i)=>`<tr><td><b>${i+1}</b></td><td>${v.hit}</td><td>${v.attempts}</td><td><b>${p100(v.hit,v.attempts)}</b></td></tr>`).join('')}</tbody></table></div></div>`}
function statsSpares(a){let group={};for(const x of a.opportunities){const key=x.left.join('-'),g=group[key]||(group[key]={n:0,hit:0});g.n++;if(x.converted)g.hit++}let bySingle=PINS.map(p=>{let opp=a.opportunities.filter(o=>o.left.length===1&&o.left[0]===p);return{pin:p,attempts:opp.length,hit:opp.filter(o=>o.converted).length}});
 return `<div class="card"><h2>Conversión de spares</h2><div class="dashboard-grid">${tile('✓','Convertidos',a.spare)}${tile('◎','Oportunidades',a.opportunities.length)}${tile('%','Porcentaje',p100(a.spare,a.opportunities.length))}</div><p class="hint">Se considera conversión cuando se derriban todos los bolos restantes en el segundo lanzamiento del frame. La bola utilizada en el segundo tiro es la responsable del spare.</p></div>
 <div class="card"><h2>Spare de bolo único</h2><div class="table-scroll"><table><thead><tr><th>Bolo</th><th>Intentos</th><th>Convertidos</th><th>%</th></tr></thead><tbody>${bySingle.map(v=>`<tr><td><b>${v.pin}</b></td><td>${v.attempts}</td><td>${v.hit}</td><td>${p100(v.hit,v.attempts)}</td></tr>`).join('')}</tbody></table></div></div>
 <div class="card"><h2>Combinaciones que más quedan</h2>${Object.entries(group).sort((a,b)=>b[1].n-a[1].n).slice(0,12).map(([key,v])=>`<div class="list-item"><div><div class="item-title">${esc(key.replaceAll('-', ' · '))}</div><div class="item-subtitle">${v.n} veces · ${v.hit} convertidas</div></div><b>${p100(v.hit,v.n)}</b></div>`).join('')||'<p class="hint">Aún no hay suficientes lanzamientos registrados.</p>'}</div>`}
function problemPins(a){const bySingle=PINS.map(pin=>{let x=a.opportunities.filter(o=>o.left.length===1&&o.left[0]===pin);return{pin,attempts:x.length,hit:x.filter(o=>o.converted).length}});return `<div class="card"><h2>Bolos problemáticos</h2><div class="v25-rack">${RACK.map(row=>`<div class="v25-ring-row">${row.map(pin=>{const r=bySingle[pin-1],pct=r.attempts?Math.round(r.hit/r.attempts*100):null,color=pct===null?'#3a3a3c':pct<50?'#f05b56':pct<70?'#f69d41':pct<85?'#efc539':'#25b98d';return `<div class="v25-ring ${pct===0?'zero-hit':''}" style="--pct:${pct??0}%;--ring:${color}"><div class="v25-ring-inside"><strong>${pin}</strong><b>${pct===null?'—':pct+'%'}</b><small>${r.hit}/${r.attempts}</small></div></div>`}).join('')}</div>`).join('')}</div><div class="v25-ring-legend"><span><i style="background:#f05b56"></i>&lt;50%</span><span><i style="background:#f69d41"></i>50–69%</span><span><i style="background:#efc539"></i>70–84%</span><span><i style="background:#25b98d"></i>≥85%</span></div></div>`}
function statsTechnical(a){let lanes={},pairs={},balls={},lines={};for(const r of a.rolls){let lane=r.lane?String(r.lane):'Sin pista',pair=r.pair?.join('–')||'Sin par',id=r.ballId||'Sin asignar',line=[r.line?.approach||'—',r.line?.arrow||'—',r.line?.breakpoint||'—'].join(' → ');
 for(const [obj,k] of [[lanes,lane],[pairs,pair],[balls,id],[lines,line]]){let o=obj[k]||(obj[k]={throws:0,pins:0,strikes:0,full:0});o.throws++;o.pins+=r.pins.length;if(r.ball===1){o.full++;if(r.pins.length===10)o.strikes++}}}
 const table=(obj,label,nameFn)=>{const rows=Object.entries(obj).sort((a,b)=>b[1].throws-a[1].throws);return `<div class="card"><h2>${label}</h2>${rows.length?`<div class="table-scroll"><table><thead><tr><th>${label}</th><th>Tiradas</th><th>Bolos</th><th>% strikes*</th></tr></thead><tbody>${rows.map(([k,v])=>`<tr><td>${esc(nameFn(k))}</td><td>${v.throws}</td><td>${v.pins}</td><td>${p100(v.strikes,v.full)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">Sin información.</p>'}</div>`};
 return `<p class="hint">Cada lanzamiento conserva la bola, la pista y las tablas de su línea. Las métricas de tiradas no son medias de partida.</p>${table(balls,'Bolas',k=>{const b=db.balls.find(b=>b.id===k);return b?b.brand+' '+b.model:k})}${table(lanes,'Pistas',k=>k)}${statMode==='oficial'?table(pairs,'Pares',k=>k):''}${table(lines,'Líneas (salida → flecha → breakpoint)',k=>k)}<p class="hint">*El porcentaje se calcula sobre primeras tiradas de frame registradas con esa bola y línea.</p>`}
function renderCharts(){if(statPane!=='general')return;const a=aggregate(statMode,statsBallId).totals.slice(-25);const el=$('trend-chart');if(!el||!a.length)return;const w=660,h=180,pad=31;let point=(v,i)=>`${pad+i*(w-2*pad)/Math.max(1,a.length-1)},${h-pad-(v/300)*(h-pad*2)}`;let coords=a.map(point);const circles=coords.map((xy,i)=>{const[x,y]=xy.split(',');return `<circle cx="${x}" cy="${y}" r="4.4" fill="#f0612d"><title>Partida ${i+1}: ${a[i]}</title></circle>`}).join('');el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" aria-label="Evolución de las últimas ${a.length} partidas" role="img" width="100%"><g stroke="#2c2c2e" stroke-width="1">${[0,100,200,300].map(v=>{let y=h-pad-(v/300)*(h-pad*2);return `<line x1="${pad}" x2="${w-pad}" y1="${y}" y2="${y}"/><text x="${pad-9}" y="${y+4}" font-size="11" text-anchor="end" fill="#8e8e93" stroke="none">${v}</text>`}).join('')}</g><polyline points="${coords.join(' ')}" stroke="#f0612d" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${circles}</svg>`}
/* ANALISIS ARSENAL R1 LAB: interfaz y motor consultivo, sin cambiar db.version ni bolas. */
let arsenalPanel='list',arsenalDetailId='',arsenalIssue='pocket',arsenalCatalogQuery='';
function setArsenalPanel(panel,id=''){arsenalPanel=panel;arsenalDetailId=id;if(panel==='catalog')ballEditingId=null;render()}
function filterArsenalCatalog(term){
 arsenalCatalogQuery=String(term||'').slice(0,100);
 const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 let visible=0;
 document.querySelectorAll('.arsenal-model[data-search]').forEach(card=>{
  const match=norm(card.dataset.search).includes(norm(arsenalCatalogQuery));
  card.style.display=match?'':'none';if(match)visible++;
 });
 const count=$('arsenal-catalog-count');if(count)count.textContent=visible+' de '+document.querySelectorAll('.arsenal-model[data-search]').length+' modelos';
 const empty=$('arsenal-catalog-noresults');if(empty)empty.hidden=visible!==0;
}
function registerBallFromCatalog(profileId){
 const lib=window.MiBowlingArsenal;
 const historic=lib?.profiles.find(p=>p.id===profileId);
 const official=window.MiBowlingOfficialBallCatalog?.models.find(p=>p.id===profileId);
 const profile=historic||official;
 if(!profile)return alert('Modelo no disponible en el catálogo local.');
 const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 // Prevenir sobrescrituras de otra pestaña: no guardar datos locales obsoletos.
 let stored;
 try{const raw=localStorage.getItem(KEY);stored=raw?JSON.parse(raw):null}
 catch{return alert('No es posible verificar el catálogo local. Recarga antes de añadir.')}
 if(stored){
  const latest=migrate(stored);
  if(JSON.stringify(latest)!==JSON.stringify(db)){
   return alert('Tus datos han cambiado en otra pestaña. Recarga MI BOWLING antes de añadir para no sobrescribirlos.');
  }
 }
 if(db.balls.some(b=>(historic&&lib.find(b)?.id===profile.id)||
  (normalize(b.brand)===normalize(profile.brand)&&normalize(b.model)===normalize(profile.model)))){
  render();return;
 }
 // Solo registrar campos identificados; los datos técnicos desconocidos no se deducen.
 const ball={id:uid(),brand:profile.brand,model:profile.model,weight:'',kind:historic?'Reactiva':'',notes:'',photo:'',retired:false};
 db.balls.push(ball);
 save();
 if(saveError){db.balls.pop();render();return}
 render();
}
function setArsenalIssue(problem){if(window.MiBowlingArsenal?.problems[problem])arsenalIssue=problem;render()}
function openBallAdvisorFor(sessionId){openBallPickerFor(sessionId,'registro');setArsenalPanel('assistant')}
/* Catálogo 100: se consulta la misma plantilla, no otro arsenal. */
let catalog100Rows=[],catalog100State='',catalog100Query='',catalog100Selected=false,catalog100WithPhoto=false,catalog100Busy=false,catalog100FileReview=false;
async function openCatalog100(){if(catalog100Busy)return;if(ballEditingId)return alert('Guarda o cancela la edición de tu bola antes de abrir el catálogo.');catalog100Busy=true;arsenalPanel='catalog100';catalog100State='Leyendo catálogo…';catalog100Rows=[];catalog100FileReview=false;catalog100Selected=false;catalog100WithPhoto=false;catalog100Query='';render();try{catalog100Rows=await window.MiBowlingCatalogoLocal.list();catalog100State='';}catch(e){catalog100State=e.message;}finally{catalog100Busy=false;if(tab==='bolas'&&arsenalPanel==='catalog100')render();}}
function catalog100View(){const norm=s=>String(s||'').normalize('NFKC').toLowerCase();const rows=catalog100Rows.filter(x=>(!catalog100Selected||x.selected)&&(!catalog100WithPhoto||window.MiBowlingFotosPrivadas.has(window.MiBowlingFotosPrivadas.catalog(x)))&&norm(x.brand+' '+x.model+' '+x.approved).includes(norm(catalog100Query)));return `${head('Catálogo de 100 referencias','Consulta y vinculación de unidades personales.',`<button class="btn outline" onclick="setArsenalPanel('list')">Volver a Mis bolas</button>`)}${window.MiBowlingFotosPrivadas.controls('render')}<div class="card"><p class="hint">Identidades por ID, marca, modelo y aprobación USBC. La coincidencia de nombre no demuestra la variante, peso ni unidad física. Las fotos de referencia son privadas y no se copian a las unidades personales.</p><label class="field">Buscar referencia</label><input class="input" id="catalog100-search" type="search" value="${esc(catalog100Query)}" oninput="filterCatalog100(this.value)"><label class="field"><input type="checkbox" ${catalog100Selected?'checked':''} onchange="catalog100Selected=this.checked;render()"> Solo marcadas en la plantilla</label><label class="field"><input type="checkbox" ${catalog100WithPhoto?'checked':''} onchange="catalog100WithPhoto=this.checked;render()"> Solo con fotografía privada</label><div class="actions"><label class="btn outline">Revisar selección JSON<input type="file" accept=".json,application/json" hidden onchange="reviewCatalog100File(this)"></label><button class="btn outline" onclick="openCatalog100()">Recargar catálogo</button></div><p class="hint" role="status">${esc(catalog100State||`${rows.length} referencias · ${catalog100FileReview?'selección del archivo revisada':'activas e históricas'}`)}</p></div><div class="card arsenal-model-list" id="catalog100-results">${catalog100Cards(rows)}</div>`;}
function catalog100Cards(rows){return rows.map(x=>{const ref=esc(JSON.stringify(x.id));const collisions=x.review.matches.filter(b=>db.balls.some(unit=>unit.id===b.id&&!unit.retired)).length;const units=db.balls.filter(b=>b.id&&!b.retired&&b.catalogId!==x.id);return `<article class="arsenal-model"><div>${window.MiBowlingFotosPrivadas.img(window.MiBowlingFotosPrivadas.catalog(x))}<strong>${esc(x.brand+' '+x.model)}</strong>${window.MiBowlingFotosPrivadas.source(window.MiBowlingFotosPrivadas.catalog(x))}<p class="hint">${esc(x.approved)} · ${x.archived?'Archivo histórico':'Referencia activa'}${x.linked.filter(id=>db.balls.some(b=>b.id===id&&!b.retired)).length?' · '+x.linked.filter(id=>db.balls.some(b=>b.id===id&&!b.retired)).length+' unidad(es) vinculada(s)':''}</p><p class="hint">${collisions?'Coincidencia de nombre: requiere revisión manual de variante y unidad.':'Nombre no registrado; no acredita variante.'}</p></div><div class="actions">${!collisions&&!x.linked.length?`<button class="btn primary" onclick="registerCatalog100Unit(${ref})">Registrar unidad confirmada</button>`:''}${units.length?`<button class="btn outline" onclick="linkCatalog100Unit(${ref})">Vincular unidad existente</button>`:''}</div></article>`}).join('')||'<p class="hint">No hay referencias que coincidan.</p>';}
function filterCatalog100(term){catalog100Query=String(term||'').slice(0,170);const norm=s=>String(s||'').normalize('NFKC').toLowerCase();const rows=catalog100Rows.filter(x=>(!catalog100Selected||x.selected)&&(!catalog100WithPhoto||window.MiBowlingFotosPrivadas.has(window.MiBowlingFotosPrivadas.catalog(x)))&&norm(x.brand+' '+x.model+' '+x.approved).includes(norm(catalog100Query)));if($('catalog100-results'))$('catalog100-results').innerHTML=catalog100Cards(rows);}
async function reviewCatalog100File(input){const f=input.files?.[0];if(!f||catalog100Busy)return;catalog100Busy=true;try{if(f.size>1024*1024)throw Error('Archivo de selección demasiado grande.');const rows=await window.MiBowlingCatalogoLocal.selection(await f.text());if(tab!=='bolas'||arsenalPanel!=='catalog100')return;catalog100Rows=rows;catalog100FileReview=true;catalog100Query='';catalog100Selected=false;catalog100WithPhoto=false;catalog100State='Selección revisada. No se ha registrado ninguna unidad.';render();}catch(e){alert('No se aplicó la selección: '+e.message)}finally{catalog100Busy=false;input.value='';}}
async function registerCatalog100Unit(id){if(catalog100Busy)return;const x=catalog100Rows.find(r=>r.id===id);if(!x)return;const confirmed=confirm('¿Confirmas que posees una unidad física nueva de '+x.brand+' '+x.model+' (aprobación '+x.approved+') y has comprobado la variante? No se copiarán peso, taladro ni ficha técnica.');if(!confirmed)return;catalog100Busy=true;try{await window.MiBowlingCatalogoLocal.register({...x,ballId:uid(),confirmed:true});}catch(e){alert('No se registró: '+e.message)}finally{catalog100Busy=false;if(tab==='bolas'&&arsenalPanel==='catalog100')await openCatalog100();}}
async function linkCatalog100Unit(id){if(catalog100Busy)return;const x=catalog100Rows.find(r=>r.id===id);if(!x)return;const units=db.balls.filter(b=>!b.retired&&b.catalogId!==id);if(!units.length)return;const matches=new Set(x.review.matches.map(b=>b.id));units.sort((a,b)=>Number(matches.has(b.id))-Number(matches.has(a.id)));const choice=prompt('Selecciona el número de TU unidad física tras verificar variante:\n'+units.map((b,i)=>`${i+1}. ${b.brand} ${b.model}${b.weight?' · '+b.weight:''}${b.retired?' · retirada':''}${b.catalogId?' · ya vinculada':''}`).join('\n'));if(choice===null||!/^\d+$/.test(choice.trim()))return;const ball=units[Number(choice)-1];if(!ball)return alert('Unidad no válida.');if(!confirm('Vincular '+ball.brand+' '+ball.model+' con '+x.brand+' '+x.model+' (aprobación '+x.approved+'). ¿Has comprobado que corresponde a esta variante y unidad física?'+(ball.catalogId?' Se sustituirá el vínculo anterior.':'')))return;catalog100Busy=true;try{await window.MiBowlingCatalogoLocal.link({ballId:ball.id,catalogId:x.id,reference:x,expectedUnit:JSON.stringify(ball),confirmed:true,replace:!!ball.catalogId});}catch(e){alert('No se vinculó: '+e.message)}finally{catalog100Busy=false;if(tab==='bolas'&&arsenalPanel==='catalog100')await openCatalog100();}}
function arsenalInsightView(){
 if(arsenalPanel==='catalog100')return catalog100View();
 if(!window.MiBowlingArsenalView)return '<div class="card">Análisis temporalmente no disponible.</div>';
 const scope=ballPickTarget===BALL_SELECTION_NEXT?'la próxima sesión':'esta sesión';
 return window.MiBowlingArsenalView.render({mode:arsenalPanel,detailId:arsenalDetailId,issue:arsenalIssue,balls:db.balls.filter(b=>!b.retired),ids:selectedBallsFor(ballPickTarget)||[],scope,returnTo:ballPickReturn,catalogQuery:arsenalCatalogQuery,escape:esc});
}
function ballsView(){
 if(arsenalPanel!=='list')return arsenalInsightView();
 const chosen=selectedBallsFor(ballPickTarget)||[],sessionScope=ballPickTarget===BALL_SELECTION_NEXT?'la próxima sesión':'esta sesión';
 const active=db.balls.filter(b=>!b.retired);
 const icon=uiLineIcon,manual=ballEditingId==='nuevo',photos=window.MiBowlingFotosPrivadas;
 const card=(b,i)=>{const id=esc(JSON.stringify(b.id)),ref=photos.physical(b),key='mb-'+i;
 const photo=b.photo?`<img src="${esc(b.photo)}" alt="Fotografía de ${esc(b.model)}" width="160" height="160" loading="${i<4?'eager':'lazy'}" decoding="async">`:photos.img(ref).replace(/ style="[^"]*"/,'').replace('loading="lazy"',i<4?'loading="eager"':'loading="lazy"');
 const detail=`setArsenalPanel('detail',${id})`,edit=`ballEditingId=${id};render()`,retire=`retireBall(${id})`;
 return `<article class="ball-card arsenal-catalog-card${b.retired?' retired':''}"><button type="button" class="mb-target arsenal-card-target" aria-label="Ver análisis: ${esc(b.model)}" onclick="${detail}"><span class="ball-art arsenal-image">${photo||icon('target')}</span><strong class="ball-name arsenal-name">${esc(b.model)}</strong><span class="ball-brand arsenal-brand">${esc(b.brand)}</span><span class="mb-tags"><span>${b.retired?'Retirada':'Mía'}</span>${b.weight?`<span>${esc(b.weight)}</span>`:''}${b.kind?`<span>${esc(b.kind)}</span>`:''}</span></button>${!b.retired?`<label class="ball-session-toggle"><input type="checkbox" aria-label="Usar en ${sessionScope}" ${chosen.includes(b.id)?'checked ':''}onchange="toggleSelectedBall(${id},this.checked)"><span>${icon('check')}</span></label>`:''}<button type="button" class="mb-icon mb-more" aria-label="Más acciones" popovertarget="${key}-actions">${icon('ellipsis')}</button>${ref&&photo?`<button type="button" class="mb-icon mb-photo-info" aria-label="Información de la fotografía" popovertarget="${key}-photo">${icon('info')}</button><div class="mb-sheet" popover id="${key}-photo">${photos.source(ref)}<button type="button" class="arsenal-control arsenal-secondary" popovertarget="${key}-photo" popovertargetaction="hide">Cerrar</button></div>`:''}<div class="mb-sheet" popover role="dialog" id="${key}-actions" aria-label="Acciones de ${esc(b.model)}"><strong>${esc(b.model)}</strong><button type="button" class="arsenal-control arsenal-secondary" onclick="${detail}">${icon('bars')} Análisis</button><button type="button" class="arsenal-control arsenal-secondary" onclick="${edit}">${icon('list')} Editar</button><button type="button" class="arsenal-control ${b.retired?'arsenal-secondary':'mb-danger'}" onclick="${retire}">${icon(b.retired?'check':'archive')} ${b.retired?'Activar':'Retirar'}</button><button type="button" class="arsenal-control arsenal-secondary" popovertarget="${key}-actions" popovertargetaction="hide">Cerrar</button></div></article>`};
 const empty=`<div class="card empty">Elige un modelo del catálogo o registra una bola manualmente.<div class="mt16"><button class="arsenal-control arsenal-primary" onclick="ballEditingId='nuevo';render()">Añadir una bola</button></div></div>`;
 return `<section class="mis-bolas" aria-label="Mis bolas"><div class="mb-intro"><p class="arsenal-label">${active.length} bolas</p><div class="arsenal-segment mb-segment" role="tablist" aria-label="Modo de alta"><button type="button" role="tab" aria-selected="${!manual}" onclick="setArsenalPanel('catalog')">Catálogo</button><button type="button" role="tab" aria-selected="${manual}" onclick="ballEditingId='nuevo';render()">Manual</button></div></div><div class="ball-pick-toolbar"><strong>${icon('check-circle')} ${chosen.length} ${chosen.length===1?'marcada':'marcadas'}</strong><button type="button" class="arsenal-control arsenal-secondary" onclick="setArsenalPanel('compare')" aria-label="Comparar marcadas"><span>Comparar</span></button><button type="button" class="mb-icon" aria-label="Información de la selección" popovertarget="mb-selection-info">${icon('info')}</button><div id="mb-selection-info" popover class="mb-sheet"><strong>Selección para ${sessionScope}</strong><p>Desmarcar no retira ninguna bola ni cambia las estadísticas.</p><button type="button" class="arsenal-control arsenal-secondary" popovertarget="mb-selection-info" popovertargetaction="hide">Cerrar</button></div></div><div class="mb-actions"><button type="button" class="arsenal-control arsenal-primary" aria-label="Buscar y añadir del catálogo" onclick="setArsenalPanel('catalog')">${icon('plus')} Añadir</button><button type="button" class="arsenal-control arsenal-secondary" aria-label="Catálogo de 100 referencias" onclick="openCatalog100()">${icon('list')} 100 referencias</button><button type="button" class="arsenal-control arsenal-secondary" aria-label="Asistente de competición" onclick="setArsenalPanel('assistant')">${icon('trophy')} Asistente</button></div>${photos.count()!==photos.entries.length?`<p class="arsenal-label">Fotos: ${photos.count()} de ${photos.entries.length} instaladas · Ajustes</p>`:''}${ballEditingId?ballForm():''}${active.length?`<div class="balls-grid">${active.map(card).join('')}</div>`:empty}<details class="arsenal-info"><summary>Historial y retiradas ${icon('info')}</summary><div class="arsenal-info-body"><p>Retirar una bola no borra sus estadísticas históricas. Si cambias de bola durante una partida, se registrará en el lanzamiento correspondiente.</p></div></details></section>`
}
function ballForm(){const b=db.balls.find(x=>x.id===ballEditingId)||{},isNew=ballEditingId==='nuevo';return `<div class="card"><div class="card-head"><h2>${isNew?'Nueva bola':'Editar bola'}</h2><button class="btn outline" onclick="ballEditingId=null;render()">Cancelar</button></div>
 <form onsubmit="saveBall(event)"><div class="form-grid"><div><label class="field">Marca</label><input class="input" name="brand" required placeholder="Ej. Storm" value="${esc(b.brand||'')}"></div><div><label class="field">Modelo</label><input class="input" name="model" required placeholder="Ej. Phaze II" value="${esc(b.model||'')}"></div><div><label class="field">Peso</label><input class="input" name="weight" placeholder="Ej. 15 lb" value="${esc(b.weight||'')}"></div><div><label class="field">Tipo</label><select class="input" name="kind">${['Reactiva','Uretano','Poliéster / Spare','Otro'].map(v=>`<option ${b.kind===v?'selected':''}>${v}</option>`).join('')}</select></div></div>
 <label class="field">Notas (opcional)</label><input class="input" name="notes" value="${esc(b.notes||'')}" placeholder="Ej. Taladro: 45 × 4 × 35; superficie, uso..."><label class="field">Fotografía (opcional)</label><input class="input" type="file" id="ball-photo" accept="image/*"><div class="hint">La foto se reduce de tamaño y se guarda solo en tu dispositivo.</div>
 <button type="submit" class="btn primary block mt16">${isNew?'Guardar nueva bola':'Guardar cambios'}</button></form></div>`}
async function saveBall(e){e.preventDefault();const form=e.currentTarget,data=new FormData(form);const id=ballEditingId==='nuevo'?uid():ballEditingId;let old=db.balls.find(b=>b.id===id)||{id,retired:false,photo:''};let photo=old.photo;const file=$('ball-photo').files[0];if(file){try{photo=await scaledImage(file)}catch(err){return alert('No se pudo procesar la imagen. Prueba con una foto JPG o PNG.')}}
 const b={...old,id,brand:String(data.get('brand')).trim(),model:String(data.get('model')).trim(),weight:String(data.get('weight')).trim(),kind:String(data.get('kind')),notes:String(data.get('notes')).trim(),photo};if(!b.brand||!b.model)return;
 const i=db.balls.findIndex(x=>x.id===id);if(i>=0)db.balls[i]=b;else db.balls.push(b);ballEditingId=null;save();render()}
async function scaledImage(file){if(file.size>20*1024*1024)throw Error('Imagen demasiado grande');const url=URL.createObjectURL(file);try{const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});const canvas=document.createElement('canvas');const max=320,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.74)}finally{URL.revokeObjectURL(url)}}
function retireBall(id){const b=db.balls.find(x=>x.id===id&&!x.retired);if(!b)return;b.retired=true;removeRetiredBallFromSelections(id);save();render()}
function restoreRetiredBall(id){if(tab!=='ajustes')return;const b=db.balls.find(x=>x.id===id&&x.retired);if(!b)return;if(!confirm('¿Recuperar '+b.brand+' '+b.model+' al arsenal activo?'))return;b.retired=false;save();render()}
function retiredBallsSettings(){const retired=db.balls.filter(b=>b.retired);return `<section class="card mb-retired-settings" aria-label="Bolas retiradas"><h2>Bolas retiradas (${retired.length})</h2><p class="hint">Fuera del arsenal activo. El historial de partidas se conserva.</p>${retired.length?`<ul class="mb-retired-settings-list">${retired.map(b=>`<li><span>${esc(b.brand+' '+b.model)}</span><button type="button" class="btn outline" aria-label="Recuperar ${esc(b.brand+' '+b.model)}" onclick="restoreRetiredBall(${esc(JSON.stringify(b.id))})">Recuperar</button></li>`).join('')}</ul>`:'<p class="hint">No tienes bolas retiradas.</p>'}</section>`}
function settings(){return `${head('Ajustes y copias','')}${window.MiBowlingNube?window.MiBowlingNube.settingsCard():''}${window.MiBowlingRegistroCompacto?window.MiBowlingRegistroCompacto.settingsCard():''}${retiredBallsSettings()}${window.MiBowlingFotosPrivadas.controls('render')}<div class="card"><h2>Registro rápido</h2><label class="field">Tamaño y disposición</label><select class="input" onchange="quickLayout=this.value;window.MiBowlingEscritura.write('mi-bowling-quick-layout',this.value);render()"><option value="standard" ${quickLayout==='standard'?'selected':''}>Estándar</option><option value="compact" ${quickLayout==='compact'?'selected':''}>Compacto</option><option value="large" ${quickLayout==='large'?'selected':''}>Botones grandes</option></select></div><div class="card"><h2>Perfil de jugador</h2><label class="field" for="mano-bowling">Mano de lanzamiento</label><select id="mano-bowling" class="input" onchange="changeHand(this.value)"><option value="diestro" ${db.hand==='diestro'?'selected':''}>Diestro · pocket 1–3</option><option value="zurdo" ${db.hand==='zurdo'?'selected':''}>Zurdo · pocket 1–2</option></select></div><div class="card"><h2>${uiInl('lock')} Almacenamiento local</h2><p class="hint">No hay usuario ni cuenta. La información queda en el navegador o en la app instalada. No existe sincronización entre dispositivos. Borrar los datos del navegador puede eliminar el historial.</p><p class="hint">Sesiones: ${db.sessions.length} · Bolas: ${db.balls.length}</p></div><div class="card"><h2>Patrones de aceitado</h2><button class="btn primary" onclick="go('patrones')">Abrir biblioteca · ${db.patterns.length} patrones</button><p class="hint">La copia JSON ampliada conserva catálogo y selecciones. Los PDF se almacenan en este dispositivo por separado de la copia JSON. Descarga los PDF originales antes de borrar o reinstalar la app.</p></div><div class="card"><h2>Copias de seguridad</h2><p class="hint">Recomendado: exportar una copia JSON regularmente y guardarla en Archivos/iCloud/otro lugar seguro. Al importar una copia se sustituyen los datos actuales.</p><div class="actions"><button class="btn primary" onclick="exportData()">↓ Exportar copia</button><button class="btn outline" onclick="exportExtendedData()">↓ Respaldo ampliado con PDF</button><button class="btn outline" onclick="$('restore-file').click()">↑ Importar copia</button><button class="btn outline" onclick="$('restore-extended-file').click()">↑ Restaurar respaldo con PDF</button></div></div><div class="card"><h2>Reglas del marcador</h2><p class="hint">Bolera de 10 bolos · puntuación tradicional hasta 300 puntos · frame 10 con tiradas de bonificación. Las partidas incompletas se guardan, pero no entran en la media de puntuación.</p></div><div class="card"><h2>Actualizaciones</h2><p class="hint">Versión instalada: <strong>${APP_VERSION}</strong>. Al abrir la aplicación se comprueba si hay una versión nueva. Si estás jugando, se aplicará al volver a abrir para no interrumpir la partida.</p><p id="update-state" class="hint">${updateAvailable?"Actualización descargada y lista para aplicar.":"La comprobación se realiza con conexión a Internet."}</p><button class="btn outline block" onclick="checkForUpdates(true)">↻ Comprobar actualizaciones</button><button class="btn primary block mt12" id="apply-update" style="${updateAvailable?"":"display:none"}" onclick="applyUpdate()">Actualizar ahora</button></div><div class="card"><h2>Mi Bowling Analítica</h2><p class="hint">Versión instalada: ${APP_VERSION} · actualización automática al volver a abrir la aplicación con conexión. Los entrenamientos y la competición oficial no se mezclan estadísticamente.</p></div>`}
function downloadLocalBackup(bundle,prefix='Mi_Bowling_copia',maxBytes=Infinity){const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});if(blob.size>maxBytes)throw Error('Respaldo demasiado grande para recuperarlo aquí. Descarga los PDF por separado.');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${prefix}_${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function currentLocalBackup(){if(saveError||ballSelectionSaveError)throw Error('Hay cambios no guardados; no certificar respaldo.');return window.MiBowlingRespaldo.exportBundle(window.MiBowlingEscritura,{...db,leagueNational:liga32,leagueRosters:liga33Roster});}
function exportData(){try{downloadLocalBackup(currentLocalBackup())}catch(e){alert('No se pudo exportar: '+e.message)}}
let extendedBackupBusy=false,oilWrites=0;
function readyExtended(){return !activeId&&tab==='ajustes'&&!saveError&&!ballSelectionSaveError&&!ballEditingId&&!oilWrites;}
async function exportExtendedData(){if(extendedBackupBusy)return;const ready=readyExtended;try{if(!ready())throw Error('Cierra la partida y resuelve cambios sin guardar.');extendedBackupBusy=true;const bundle=await window.MiBowlingRespaldoPDF.build({guard:window.MiBowlingEscritura,storage:localStorage,localBundle:currentLocalBackup(),ready});await window.MiBowlingRecuperacion.validate(bundle);downloadLocalBackup(bundle,'Mi_Bowling_respaldo_ampliado',window.MiBowlingRecuperacion.FILE_LIMIT);alert('Respaldo ampliado generado. Guarda el archivo fuera de MI BOWLING; usa Restaurar respaldo con PDF, no el importador habitual de partidas.');}catch(e){alert('No se pudo generar el respaldo ampliado: '+e.message)}finally{extendedBackupBusy=false}}
$('restore-file').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(extendedBackupBusy||oilWrites||activeId||tab==='registro'||saveError||ballSelectionSaveError)throw Error('Cierra la partida y resuelve cambios sin guardar.');if(f.size>20*1024*1024)throw Error('Copia demasiado grande.');const obj=JSON.parse(await f.text());if(obj?.schema===window.MiBowlingRespaldoPDF.SCHEMA)throw Error('Respaldo ampliado con PDF: utiliza Restaurar respaldo con PDF; no se aplicó ningún cambio.');if(extendedBackupBusy||oilWrites||activeId||tab==='registro'||saveError||ballSelectionSaveError)throw Error('Estado cambiado; cancela la restauración.');const guard=window.MiBowlingEscritura,current=guard.snapshot(),next=window.MiBowlingRespaldo.planRestore(obj,current,migrate);if(!confirm('Se reemplazarán los datos de esta copia. Los PDF locales no se modifican. ¿Descargar respaldo previo?'))return;downloadLocalBackup(currentLocalBackup(),'Mi_Bowling_antes_de_restaurar');if(!confirm('Confirma que has guardado el respaldo previo y quieres restaurar.'))return;guard.assertAuthority();if(JSON.stringify(guard.snapshot())!==JSON.stringify(current))throw Error('Los datos cambiaron; vuelve a iniciar la restauración.');guard.transaction(next);location.reload()}catch(err){alert('No se pudo importar la copia: '+err.message)}finally{e.target.value=''}});

$('restore-extended-file').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f||extendedBackupBusy){e.target.value='';return;}let started=false,priorInert=document.body.inert;try{if(!readyExtended())throw Error('Cierra la partida, vuelve a Ajustes y resuelve cambios sin guardar.');const api=window.MiBowlingRecuperacion;if(f.size>api.FILE_LIMIT)throw Error('Respaldo ampliado demasiado grande.');extendedBackupBusy=true;started=true;document.body.inert=true;const bundle=JSON.parse(await f.text());if(!readyExtended())throw Error('Estado cambiado; cancela.');const guard=window.MiBowlingEscritura,legacy=currentLocalBackup(),io=api.browserIO();const restored=await api.restore({guard,storage:localStorage,io,bundle,confirmBackup:before=>{if(!readyExtended())throw Error('Estado cambiado.');if(!confirm('Se sustituirán todos los datos locales de MI BOWLING y sus PDF. ¿Descargar copia previa?'))return false;const prior=api.backupFromState(before,legacy);downloadLocalBackup(prior,'Mi_Bowling_antes_de_restaurar_integral',api.FILE_LIMIT);return confirm((prior.missingPDFs.length?'El estado anterior tiene PDF ausentes. La copia previa refleja esa limitación. ':'')+'Confirma que guardaste la copia previa fuera de MI BOWLING y quieres restaurar.');}});if(restored)location.reload();}catch(err){alert('No se pudo restaurar el respaldo ampliado: '+err.message)}finally{if(started){extendedBackupBusy=false;document.body.inert=priorInert;}e.target.value='';}});

// Biblioteca de patrones: metadatos en la copia JSON, PDF binarios en IndexedDB.
function oilDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('mi-bowling-patrones-pdf',1);r.onupgradeneeded=()=>r.result.createObjectStore('pdf');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function oilPut(id,blob){window.MiBowlingEscritura.assertAuthority();const d=await oilDB();try{window.MiBowlingEscritura.assertAuthority();}catch(e){d.close();throw e;}return new Promise((resolve,reject)=>{const t=d.transaction('pdf','readwrite');t.objectStore('pdf').put(blob,id);t.oncomplete=()=>{d.close();resolve()};t.onerror=t.onabort=()=>{d.close();reject(t.error||Error('Escritura PDF interrumpida.'))}})}
async function oilGet(id){const d=await oilDB();return new Promise((resolve,reject)=>{const t=d.transaction('pdf','readonly');const r=t.objectStore('pdf').get(id);r.onsuccess=()=>{d.close();resolve(r.result||null)};r.onerror=()=>{d.close();reject(r.error)}})}
async function addOilPattern(e){e.preventDefault();const f=e.currentTarget,fd=new FormData(f),file=f.querySelector('input[type=file]')?.files?.[0];const name=String(fd.get('name')||'').trim();if(!name)return alert('Indica el nombre del patrón.');if(file&&(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')||file.size>20*1024*1024))return alert('Utiliza un PDF de hasta 20 MB.');const id=uid();if(extendedBackupBusy)return alert('Respaldo en curso.');oilWrites++;try{window.MiBowlingEscritura.assertAuthority();if(file)await oilPut(id,file);db.patterns.push({id,name,length:String(fd.get('length')||''),maker:String(fd.get('maker')||''),ratio:String(fd.get('ratio')||''),volume:String(fd.get('volume')||''),notes:String(fd.get('notes')||''),pdfName:file?.name||'',createdAt:new Date().toISOString()});selectedPatternId=id;save();render()}catch(err){alert('No se pudo guardar el PDF localmente: '+err.message)}finally{oilWrites--;}}
async function openOilPDF(id){const b=await oilGet(id).catch(()=>null);if(!b)return alert('PDF no disponible en este dispositivo. Vuelve a adjuntarlo.');const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
async function downloadOilPDF(id){const b=await oilGet(id).catch(()=>null);if(!b)return alert('PDF no disponible en este dispositivo.');const p=db.patterns.find(x=>x.id===id);const url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=p?.pdfName||'patron.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
async function attachOilPDF(id,input){const f=input.files?.[0];if(!f)return;if((f.type!=='application/pdf'&&!f.name.toLowerCase().endsWith('.pdf'))||f.size>20*1024*1024)return alert('Selecciona un PDF de máximo 20 MB.');if(extendedBackupBusy)return alert('Respaldo en curso.');oilWrites++;try{window.MiBowlingEscritura.assertAuthority();await oilPut(id,f);const p=db.patterns.find(x=>x.id===id);if(p)p.pdfName=f.name;save();render()}catch(err){alert('No se pudo guardar el PDF: '+err.message)}finally{oilWrites--;}}
function savePatternNote(id,value){const s=db.sessions.find(x=>x.id===id);if(s){s.patternNotes=value;save()}}
function patternPreview(id){const el=$('pattern-last');if(!el)return;const ss=db.sessions.filter(s=>s.patternId===id).sort((a,b)=>b.date.localeCompare(a.date));const s=ss[0];if(!id||!s){el.innerHTML='';return}const r=s.games.flatMap(g=>g.rolls)[0],ball=db.balls.find(b=>b.id===r?.ballId);el.innerHTML=`<div class="card" style="margin-top:10px;background:#eff8fb"><b>Última vez: ${esc(s.date)} · ${esc(s.venue||'Bolera sin indicar')}</b><p class="hint">${s.type==='oficial'?'Competición':'Entrenamiento'} · Bola: ${esc(ball?.model||'Sin asignar')} · Línea: ${esc([r?.line?.approach||'—',r?.line?.arrow||'—',r?.line?.breakpoint||'—'].join(' → '))}</p><p class="hint">${esc(s.patternNotes||s.notes||'Sin observaciones')}</p><button type="button" class="btn outline" onclick="selectedPatternId='${esc(id)}';go('patrones')">Ver historial completo</button></div>`}
function patternsView(){const p=db.patterns.find(x=>x.id===selectedPatternId);const ss=p?db.sessions.filter(s=>s.patternId===p.id).sort((a,b)=>b.date.localeCompare(a.date)):[];const relevant=ss.filter(s=>s.type===patternMode&&!pendingClassification(s));const games=relevant.flatMap(s=>s.games.filter(g=>complete(g)&&(s.type!=='entrenamiento'||g.includeStats!==false)));const average=games.length?fmt(games.reduce((x,g)=>x+score(g),0)/games.length):'—';return `${head('Patrones de aceitado','')}<div class="card"><h2>Biblioteca · ${db.patterns.length}</h2>${db.patterns.map(x=>`<button class="btn ${selectedPatternId===x.id?'primary':'outline'}" style="margin:3px" onclick="selectedPatternId='${esc(x.id)}';render()">${uiInl('drop')} ${esc(x.name)}${x.length?' · '+esc(x.length)+' ft':''}</button>`).join('')||'<p class="hint">Añade tu primer patrón y su PDF.</p>'}</div>${p?`<div class="card"><h2>${esc(p.name)}</h2><p class="hint">${esc([p.maker,p.length&&p.length+' pies',p.ratio&&'Ratio '+p.ratio,p.volume&&'Volumen '+p.volume].filter(Boolean).join(' · '))}</p>${p.notes?`<p>${esc(p.notes)}</p>`:''}<div class="actions"><button class="btn primary" onclick="openOilPDF('${p.id}')">Ver PDF</button><button class="btn outline" onclick="downloadOilPDF('${p.id}')">Descargar PDF</button></div><label class="field">Adjuntar / sustituir PDF local</label><input type="file" class="input" accept="application/pdf,.pdf" onchange="attachOilPDF('${p.id}',this)"><p class="hint">${esc(p.pdfName||'Sin PDF adjunto')} · Documento local, no incluido en la copia JSON</p></div><div class="seg mb16"><button class="${patternMode==='entrenamiento'?'active':''}" onclick="patternMode='entrenamiento';render()">Entrenamientos</button><button class="${patternMode==='oficial'?'active':''}" onclick="patternMode='oficial';render()">Competiciones</button></div><div class="card"><h2>Historial de uso</h2><div class="dashboard-grid">${tile('▤','Jornadas',relevant.length)}${tile('◎','Partidas',games.length)}${tile('★','Media',average)}</div>${relevant.map(s=>{const scores=s.games.filter(complete).map(score);const first=s.games.flatMap(g=>g.rolls)[0];const ball=db.balls.find(b=>b.id===first?.ballId);return `<details class="oil-history"><summary><b>${esc(s.date)}</b> · ${esc(s.venue||'Bolera sin indicar')} · ${scores.length} partidas</summary><p class="hint">${esc(s.title||'')} · ${esc(scores.join(' / ')||'Sin terminar')} · Bola inicial: ${esc(ball?.model||'Sin asignar')} · Línea ${esc([first?.line?.approach||'—',first?.line?.arrow||'—',first?.line?.breakpoint||'—'].join(' → '))}</p><label class="field">Observaciones personales</label><textarea class="input note" onchange="savePatternNote('${s.id}',this.value)">${esc(s.patternNotes||'')}</textarea><button class="btn outline" onclick="activeId='${s.id}';go('detalle')">Ver partidas, bolas y líneas</button></details>`}).join('')||'<p class="hint">Aún no has jugado este patrón en esta modalidad.</p>'}</div>`:''}<div class="card"><h2>Añadir patrón</h2><form onsubmit="addOilPattern(event)"><label class="field">Nombre</label><input class="input" name="name" required placeholder="Nombre exacto del patrón"><div class="form-grid"><div><label class="field">Longitud (pies)</label><input class="input" name="length" inputmode="decimal"></div><div><label class="field">Fabricante</label><input class="input" name="maker"></div><div><label class="field">Ratio</label><input class="input" name="ratio"></div><div><label class="field">Volumen</label><input class="input" name="volume"></div></div><label class="field">PDF (opcional)</label><input class="input" type="file" accept="application/pdf,.pdf"><label class="field">Observaciones del patrón</label><textarea class="input note" name="notes"></textarea><button class="btn primary block mt16" type="submit">Guardar patrón</button></form></div>`}

// Exposed test harness; harmless in normal operation.
window.__miBowlingTest={next,frameScores,score,complete,currentLane,aggregate,migrate};
if('serviceWorker'in navigator&&location.protocol.startsWith('http')){
 let swWasControlled=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  const isUpdate=swWasControlled;
  swWasControlled=true;
  // La primera instalación no es una actualización: no recargar al usuario durante la navegación.
  if(!isUpdate)return;
  updateAvailable=true;
  updateStatus('Nueva versión descargada. Se aplicará al volver a abrir; puedes actualizar ahora.',true);
  if(tab==='inicio'&&document.visibilityState==='visible'&&!updateCheckStarted){
   updateCheckStarted=true;window.location.reload();
  }
 });
 const startWorker=async()=>{try{swRegistration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await swRegistration.update();}catch(e){}};if(document.readyState==='complete')startWorker();else window.addEventListener('load',startWorker,{once:true});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkForUpdates(false)});
}
render();


/* Liga Nacional · Primera División masculina · acta simplificada, almacenamiento aislado */
const LIGA32_KEY='mi-bowling-liga-acta-v32';
function ligaActaBlank(previous){const m=previous||ligaCurrent();return {id:uid(),date:today(),myTeam:m?.myTeam||'Mi equipo',rival:'Equipo rival',match:1,players:Array.from({length:12},(_,i)=>({name:m?.players?.[i]?.name||((i<6?'Jugador ':'Rival ')+(i%6+1)),trio:i%6<3?1:2,team:i<6?'own':'rival',scores:['',''],names:['','']})),demo:false}}
let liga32;try{liga32=JSON.parse(localStorage.getItem(LIGA32_KEY)||'null')}catch(e){}
if(!liga32||!Array.isArray(liga32.matches)||!liga32.matches.length){liga32={matches:[ligaActaBlank()]};const sample=[[205,198],[187,202],[220,214],[194,201],[179,195],[211,207],[198,195],[195,190],[210,208],[200,205],[188,199],[205,203]];liga32.matches[0].players.forEach((p,i)=>p.scores=sample[i].map(String));liga32.matches[0].demo=true;try{window.MiBowlingEscritura.write(LIGA32_KEY,JSON.stringify(liga32))}catch(e){}}
let liga32Match=0,liga32Game=0;
function liga32Current(){return liga32.matches[liga32Match]||liga32.matches[0]}
function liga32Save(){try{window.MiBowlingEscritura.write(LIGA32_KEY,JSON.stringify(liga32))}catch(e){alert('No se pudo guardar la Liga. Exporta una copia.') }}
function liga32Name(p,g){return p.names?.[g]||p.name}
function liga32Score(p,g){if(p.links?.[g]){const link=p.links[g],ss=db.sessions.find(x=>x.id===link.sessionId),gg=ss?.games.find(x=>x.id===link.gameId);if(gg)return complete(gg)?score(gg):null;}let s=p.scores?.[g];return s!==''&&s!==null&&s!==undefined&&Number.isInteger(Number(s))&&Number(s)>=0&&Number(s)<=300?Number(s):null}
function liga32Group(m,team,trio){return m.players.filter(p=>p.team===team&&p.trio===trio)}
function liga32Totals(m,g,team,trio){let ps=liga32Group(m,team,trio),values=ps.map(p=>liga32Score(p,g));return {sum:values.reduce((a,v)=>a+(v??0),0),count:values.filter(v=>v!==null).length}}
function liga32Compute(m){let games=[0,1].map(g=>{const complete=m.players.every(p=>liga32Score(p,g)!==null);let individual=[0,0],trios=[0,0];if(complete){let wins=[0,0];for(let i=0;i<6;i++){const x=liga32Score(m.players[i],g),y=liga32Score(m.players[i+6],g);if(x>y)wins[0]++;else if(x<y)wins[1]++;}individual=wins[0]===wins[1]?[1,1]:wins[0]>wins[1]?[2,0]:[0,2];let tw=[0,0];for(let t=1;t<=2;t++){let a=liga32Totals(m,g,'own',t).sum,b=liga32Totals(m,g,'rival',t).sum;if(a>b)tw[0]++;else if(a<b)tw[1]++;}trios=tw[0]===tw[1]?[1,1]:tw[0]>tw[1]?[2,0]:[0,2];}return {complete,individual,trios}});let final=games.every(g=>g.complete),total=[0,0],bolos=[0,0];for(const p of m.players)for(let g=0;g<2;g++){let n=liga32Score(p,g);if(n!==null)bolos[p.team==='own'?0:1]+=n;}let bp=final?(bolos[0]===bolos[1]?[1,1]:bolos[0]>bolos[1]?[2,0]:[0,2]):[0,0];games.forEach(g=>{if(g.complete){for(let i=0;i<2;i++)total[i]+=g.individual[i]+g.trios[i]}});if(final){total[0]+=bp[0];total[1]+=bp[1]}return {games,final,bolos,bp,total,allocated:games.filter(g=>g.complete).length*4+(final?2:0)}}
function liga32ScoreChange(i,g,val){const m=liga32Current();if(!m.players[i])return;if(m.players[i].links?.[g])return alert('Esta puntuación procede de un registro detallado. Modifícala desde sus lanzamientos.');const v=String(val).trim();if(v!==''&&(!/^\d{1,3}$/.test(v)||Number(v)>300))return alert('Introduce una puntuación entre 0 y 300.');m.players[i].scores[g]=v;liga32Save();liga32Refresh()}
function liga32NameChange(i,g,val){let p=liga32Current().players[i];if(p.links?.[g])return alert('No puedes cambiar el nombre de una partida detallada vinculada.');p.names[g]=val.trim();liga32Save();liga33RosterAdd(p.team==='own'?'own':liga32Current().rival,val.trim())}
function liga32Header(k,v){liga32Current()[k]=v;liga32Save()}
function liga32New(){const m=liga32Current();const next=liga32.matches.findIndex(x=>Number(x.round)===Number(m.round||1)&&Number(x.match)===Number(m.match||1)+1);if(next>=0){liga32Match=next;render();return}alert('La jornada ya dispone de los siete enfrentamientos. Selecciónalos arriba.')}
function liga32Export(){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({version:'3.3',league:liga32,rosters:liga33Roster},null,2)],{type:'application/json'}));a.href=url;a.download='Mi_Bowling_Liga_actas_'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function liga32Input(m,i,g){const p=m.players[i],v=liga32Score(p,g),linked=!!p.links?.[g];return `<input aria-label="Puntuación ${esc(liga32Name(p,g))}, partida ${g+1}" class="input liga32-input" type="number" inputmode="numeric" min="0" max="300" placeholder="—" value="${v??''}" ${linked?'disabled title="Vinculada a tus lanzamientos"':''} onchange="liga32ScoreChange(${i},${g},this.value)">`}
function liga33NameSelector(m,p,i,g){const name=liga32Name(p,g),team=p.team==='own'?'own':m.rival;let choices=[...new Set([name,...(liga33Roster[team]||[])].filter(Boolean))];return `<select class="input liga33-select" aria-label="Nombre de jugador" onchange="liga32NameChange(${i},${g},this.value);render()">${choices.map(n=>`<option value="${esc(n)}" ${n===name?'selected':''}>${esc(n)}</option>`).join('')}</select>`}
function liga32Trio(m,t){return `<div class="card liga32-trio"><h2>Tripleta ${t}</h2><div class="liga32-grid-header"><span>Jugador</span><span>Partida 1</span><span>Partida 2</span></div>${['own','rival'].map(team=>{const group=liga32Group(m,team,t);return `<h3 class="liga32-team">${esc(team==='own'?m.myTeam:m.rival)}</h3>${group.map(p=>{const i=m.players.indexOf(p);return `<div class="liga32-row"><div class="liga32-name">${liga33NameSelector(m,p,i,liga32Game)}${ligaResRow(p)}</div>${[0,1].map(g=>liga32Input(m,i,g)).join('')}</div><div class="liga33-myactions">${[0,1].map(g=>`<button class="btn outline" onclick="liga33OpenPersonal(${i},${g})">${uiInl('ball')} ${p.links?.[g]?'Continuar detalle':'Detalle opcional'} P${g+1}</button>`).join('')}</div>`}).join('')}<div class="liga32-subtotal"><strong>Total ${team==='own'?'propio':'rival'}</strong>${[0,1].map(g=>{let a=liga32Totals(m,g,team,t);return `<strong>${a.sum}${a.count<3?` <small>(${a.count}/3)</small>`:''}</strong>`}).join('')}</div>`}).join('')}<div class="liga32-difference">${[0,1].map(g=>{let a=liga32Totals(m,g,'own',t),b=liga32Totals(m,g,'rival',t),d=a.sum-b.sum;return `<span>P${g+1}: ${a.count===3&&b.count===3?`${d>0?'+':''}${d} bolos`:'Pendiente'}</span>`}).join('')}</div></div>`}
function liga34Difference(m){
 const perGame=[0,1].map(g=>{
  const own=liga32Totals(m,g,'own',1),own2=liga32Totals(m,g,'own',2);
  const rival=liga32Totals(m,g,'rival',1),rival2=liga32Totals(m,g,'rival',2);
  const complete=own.count===3&&own2.count===3&&rival.count===3&&rival2.count===3;
  const a=own.sum+own2.sum,b=rival.sum+rival2.sum;
  return {complete,a,b,diff:a-b};
 });
 const one=perGame[0],two=perGame[1];
 if(!one.complete)return `<div class="liga34-balance"><h3>Ventaja de bolos · Primera partida</h3><p class="hint">Pendiente: introduce las 12 puntuaciones de la primera partida para conocer la diferencia real.</p></div>`;
 const signed=n=>`${n>0?'+':''}${n}`;
 const lead=one.diff;
 const goal=lead<0?`Necesitáis ganar la segunda partida por ${-lead+1} bolos para obtener los 2 puntos por bolos.`:lead>0?`Podéis perder la segunda partida por hasta ${lead-1} bolos y conservar los 2 puntos por bolos.`:'Necesitáis superar al rival por 1 bolo en la segunda partida para obtener los 2 puntos.';
 const tie=lead<0?`Con ${-lead} bolos de ventaja en la segunda partida, empate global: 1 punto por equipo.`:lead>0?`Con ${lead} bolos de desventaja en la segunda partida, empate global: 1 punto por equipo.`:'Con empate en la segunda partida, empate global: 1 punto por equipo.';
 const all=two.complete?`<p><strong>Segunda partida:</strong> ${two.a} – ${two.b} · ${signed(two.diff)}</p><p><strong>Total encuentro:</strong> ${one.a+two.a} – ${one.b+two.b} · <strong>${signed(lead+two.diff)} bolos</strong></p>`:`<p class="hint">La segunda partida todavía no está completa. No se adjudican los 2 puntos por bolos.</p>`;
 return `<div class="liga34-balance"><h3>Ventaja de bolos · Primera partida</h3><p>${one.a} – ${one.b} · <strong>${signed(lead)} bolos</strong> ${lead>0?'a favor':lead<0?'en contra':'de diferencia'}</p><p><strong>Objetivo para la segunda:</strong> ${goal}</p><p class="hint">${tie}</p>${all}</div>`;
}
function liga32Summary(m){const r=liga32Compute(m);return `<div class="card" id="liga32-summary"><h2>Marcador del enfrentamiento</h2><div class="liga32-points"><div><small>${esc(m.myTeam)}</small><strong>${r.total[0]}</strong></div><span>–</span><div><small>${esc(m.rival)}</small><strong>${r.total[1]}</strong></div></div><p class="hint">${r.allocated} de 10 puntos adjudicados · ${10-r.allocated} pendientes</p><div class="liga32-breakdown"><span>Individuales</span><span>${r.games.map(x=>x.complete?x.individual.join('–'):'Pend.').join(' / ')}</span><span>Tripletas</span><span>${r.games.map(x=>x.complete?x.trios.join('–'):'Pend.').join(' / ')}</span><span>Bolos (2 partidas)</span><span>${r.final?r.bp.join('–'):'Pendiente'}</span><span>Total bolos anotados</span><strong>${r.bolos[0]} – ${r.bolos[1]}</strong></div>${liga34Difference(m)}<p class="hint">Los puntos solo se asignan cuando están registradas las 12 puntuaciones de la partida. Los 2 puntos por bolos se calculan al finalizar ambas.</p></div>`}
function liga32Refresh(){let element=document.getElementById('liga32-summary');if(element)element.outerHTML=liga32Summary(liga32Current());document.querySelectorAll('.liga32-trio').forEach((el,j)=>{const temp=document.createElement('div');temp.innerHTML=liga32Trio(liga32Current(),j+1);const subtotals=el.querySelectorAll('.liga32-subtotal,.liga32-difference');const replacements=temp.querySelectorAll('.liga32-subtotal,.liga32-difference');subtotals.forEach((e,k)=>{if(replacements[k])e.outerHTML=replacements[k].outerHTML})})}
/* v3.3: alineaciones con identidad por nombre, tres jornadas y 7 rivales por jornada. */
const LIGA33_ROSTER_KEY='mi-bowling-liga-rosters-v33';
let liga33Roster={};try{liga33Roster=JSON.parse(localStorage.getItem(LIGA33_ROSTER_KEY)||'{}')||{}}catch(e){}
function liga33RosterAdd(team,name){if(!team||!name)return;liga33Roster[team]=liga33Roster[team]||[];if(!liga33Roster[team].includes(name))liga33Roster[team].push(name);window.MiBowlingEscritura.write(LIGA33_ROSTER_KEY,JSON.stringify(liga33Roster))}
function liga33AddPlayer(){const m=liga32Current(),team=$('liga33-team')?.value||'own',n=$('liga33-player')?.value.trim();if(!n)return;liga33RosterAdd(team==='own'?'own':m.rival,n);render()}
function liga33Prepare(){liga32.matches.forEach((m,i)=>{m.round=Number(m.round)||1;m.match=Number(m.match)||i%7+1;m.players.forEach(p=>{p.names=Array.isArray(p.names)?p.names:['',''];p.scores=Array.isArray(p.scores)?p.scores:['',''];p.links=p.links||{};if(p.isMe===undefined)p.isMe=false;liga33RosterAdd(p.team==='own'?'own':m.rival,p.name)})});
 for(let r=1;r<=3;r++)for(let j=1;j<=7;j++)if(!liga32.matches.some(x=>x.round===r&&x.match===j)){const m=ligaActaBlank(liga32.matches[0]);m.round=r;m.match=j;m.date='';m.rival='Equipo rival';m.players.forEach(p=>{p.scores=['',''];p.names=['',''];p.links={};p.isMe=false});liga32.matches.push(m)}
 liga32Save()}
liga33Prepare();
// 3.3.25 · Equipos de Primera División Masculina 2026-27. Al elegir «Mi equipo» se preparan
// las 21 actas (3 jornadas × 7) contra los otros 7 equipos. El orden queda pendiente del cuadro.
const LIGA_TEAMS_1DM_2627=Object.freeze(['HALCONES "A"','COMARCAL "A"','LEVANTE','BOLICHES "B"','CELTA XUNTA "B"','CAPITAL BOWLING "B"','BAT ROLLAN "B"','TOMAHAWK']);
function ligaHasData(m){return !m.demo&&m.players.some(p=>(p.scores||[]).some(x=>x!==''&&x!==undefined)||Object.keys(p.links||{}).length)}
function ligaSetMyTeam(t){if(!LIGA_TEAMS_1DM_2627.includes(t))return;for(const m of liga32.matches)if(m.demo){m.demo=false;m.players.forEach(p=>{p.scores=['',''];p.names=['',''];p.links={};p.isMe=false})}const others=LIGA_TEAMS_1DM_2627.filter(x=>x!==t);
 for(let r=1;r<=3;r++){const ms=liga32.matches.filter(x=>x.round===r).sort((a,b)=>a.match-b.match),taken=new Set(),keep=new Set();
  // Se conservan: actas con datos (cualquier rival) y rivales elegidos a mano. Sin repetir rival en la jornada.
  for(const m of ms)if(ligaHasData(m)){keep.add(m);taken.add(m.rival)}
  for(const m of ms)if(!keep.has(m)&&!m.orderPending&&others.includes(m.rival)&&!taken.has(m.rival)){keep.add(m);taken.add(m.rival)}
  const free=others.filter(x=>!taken.has(x));
  const ev=officialCalendarEvents().find(e=>e.title==='XL LIGA NACIONAL '+r+'ª JORNADA');
  for(const m of ms){m.myTeam=t;if(ev&&!ligaHasData(m))m.date=m.match<=4?ev.start:ev.end;if(!keep.has(m)){m.rival=free.shift()||'Equipo rival';m.orderPending=true}}}
 liga32Save();render()}
function ligaSetRival(v){const m=liga32Current();if(v==='__otro'){const n=prompt('Nombre del equipo rival',LIGA_TEAMS_1DM_2627.includes(m.rival)?'':m.rival);if(!n||!n.trim())return render();v=n.trim()}
 const other=liga32.matches.find(x=>x!==m&&x.round===m.round&&x.rival===v&&LIGA_TEAMS_1DM_2627.includes(v));if(other&&!ligaHasData(other)){other.rival=m.rival;other.orderPending=true}
 m.rival=v;m.orderPending=false;liga32Save();render()}
function ligaTeamFields(m){const mine=LIGA_TEAMS_1DM_2627.includes(m.myTeam),riv=LIGA_TEAMS_1DM_2627.includes(m.rival);
 return `<label class="field">Mi equipo</label><select class="input" onchange="ligaSetMyTeam(this.value)">${mine?'':`<option value="" selected>${esc(m.myTeam||'Elige tu equipo')}</option>`}${LIGA_TEAMS_1DM_2627.map(t=>`<option ${t===m.myTeam?'selected':''}>${esc(t)}</option>`).join('')}</select>${mine?'':`<p class="hint">Al elegir tu equipo se preparan las 21 actas (3 jornadas × 7 enfrentamientos) contra los otros 7 equipos. Lo ya apuntado no se toca.</p>`}
 <label class="field">Equipo rival</label><select class="input" onchange="ligaSetRival(this.value)">${riv?'':`<option selected>${esc(m.rival)}</option>`}${LIGA_TEAMS_1DM_2627.filter(t=>t!==m.myTeam).map(t=>`<option ${t===m.rival?'selected':''}>${esc(t)}</option>`).join('')}<option value="__otro">Otro equipo…</option></select>${m.lanes?`<p class="hint">Pistas ${esc(m.lanes)}</p>`:''}${m.orderPending?`<p class="hint liga-order-pending">Orden provisional: pendiente del cuadro de enfrentamientos. Si eliges otro rival, se intercambia con el enfrentamiento que lo tenía.</p>`:''}`}
// 3.3.26 · Importar cuadro de enfrentamientos (PDF) con vista previa.
let ligaCuadroPreview=null;
async function ligaImportCuadro(input){const f=input.files?.[0];input.value='';if(!f)return;const m=liga32Current();
 try{if(!LIGA_TEAMS_1DM_2627.includes(m.myTeam))throw Error('Elige primero «Mi equipo».');if(f.size>25*1024*1024)throw Error('PDF demasiado grande.');
  const lines=await window.MiBowlingCuadro.pdfLines(await f.arrayBuffer(),new URL('./',location.href).href);
  const r=window.MiBowlingCuadro.parse(lines,LIGA_TEAMS_1DM_2627,m.myTeam);
  if(!r){ligaCuadroPreview={error:lines.join('').replace(/\s/g,'').length<30?'El PDF no contiene texto (parece una imagen escaneada). Ordena los rivales a mano o envíalo para adaptarlo.':'No he reconocido el orden de enfrentamientos de '+m.myTeam+' en este PDF.',text:lines.join('\n'),name:f.name};return render()}
  const targets=r.rounds.length>=3?[1,2,3]:[m.round];ligaCuadroPreview={name:f.name,method:r.method,plan:targets.map((round,i)=>({round,order:r.rounds[i]})).filter(x=>x.order)};render()}
 catch(e){ligaCuadroPreview={error:'No se pudo leer el PDF: '+e.message,name:f.name,text:''};render()}}
function ligaCuadroApplyPlan(plan){for(const {round,order} of plan){const ms=liga32.matches.filter(x=>x.round===round);
  const stuck=ms.filter(x=>ligaHasData(x)&&!order.some(o=>o.rival===x.rival));if(stuck.length)throw Error('La jornada '+round+' tiene resultados contra «'+stuck[0].rival+'», que no aparece en el cuadro. No se ha cambiado nada.')}
 for(const {round,order} of plan){const ms=liga32.matches.filter(x=>x.round===round),used=new Set();
  order.forEach((o,j)=>{const a=ms.find(x=>!used.has(x)&&x.rival===o.rival);if(a){used.add(a);a.match=j+1;a.lanes=o.lanes||'';a.orderPending=false}});
  const rest=ms.filter(x=>!used.has(x));order.forEach((o,j)=>{if(!ms.some(x=>used.has(x)&&x.match===j+1)){const a=rest.shift();if(a){used.add(a);a.match=j+1;a.rival=o.rival;a.lanes=o.lanes||'';a.orderPending=false}}});
  const ev=officialCalendarEvents().find(e=>e.title==='XL LIGA NACIONAL '+round+'ª JORNADA');if(ev)ms.forEach(x=>{if(!ligaHasData(x))x.date=x.match<=4?ev.start:ev.end})}}
function ligaCuadroApply(){if(!ligaCuadroPreview?.plan)return;const backup=JSON.stringify(liga32);
 try{ligaCuadroApplyPlan(ligaCuadroPreview.plan);const cur=liga32Current();liga32Save();ligaCuadroPreview=null;liga32Match=liga32.matches.indexOf(cur);render()}
 catch(e){liga32=JSON.parse(backup);alert(e.message)}}
function ligaCuadroCopy(){const t=ligaCuadroPreview?.text||'';navigator.clipboard?.writeText(t).then(()=>alert('Texto del PDF copiado.'),()=>alert('No se pudo copiar.'))}
function ligaCuadroCard(m){const P=ligaCuadroPreview;let body='';
 if(P?.plan)body=`<p class="hint">${esc(P.name)} · leído por ${esc(P.method)}. Revisa el orden antes de aplicarlo.</p>${P.plan.map(x=>`<h3>Jornada ${x.round}</h3><ol class="liga-cuadro-list">${x.order.map((o,j)=>`<li><span>${j<4?'Sábado':'Domingo'} · ${j+1}</span> <strong>${esc(o.rival)}</strong>${o.lanes?` <small>Pistas ${esc(o.lanes)}</small>`:''}</li>`).join('')}</ol>`).join('')}<p class="hint">Las actas con resultados se mueven con su rival; no se borra nada.</p><div class="row wrap"><button class="btn primary" onclick="ligaCuadroApply()">Aplicar</button><button class="btn outline" onclick="ligaCuadroPreview=null;render()">Cancelar</button></div>`;
 else if(P?.error)body=`<p class="hint liga-cuadro-error">${esc(P.error)}</p>${P.text?'<button class="btn outline" onclick="ligaCuadroCopy()">Copiar texto del PDF</button>':''}<button class="btn outline" onclick="ligaCuadroPreview=null;render()">Cerrar</button>`;
 return `<div class="card"><h2>Cuadro de enfrentamientos</h2><p class="hint">Sube el PDF de la Federación y se ordenan los rivales de cada enfrentamiento${LIGA_TEAMS_1DM_2627.includes(m.myTeam)?' de '+esc(m.myTeam):' (elige antes «Mi equipo»)'}. Se lee en el móvil, sin enviarlo a ningún sitio.</p><label class="btn outline block">Importar cuadro (PDF)<input type="file" accept="application/pdf,.pdf" hidden onchange="ligaImportCuadro(this)"></label>${body}</div>`}
// 3.3.27 · Importar el PDF de resultados de la FEB tras cada enfrentamiento.
let ligaResPreview=null;
const ligaNameKey=n=>window.MiBowlingCuadro.norm(n).replace(/[^A-Z0-9,]/g,'');
function ligaResBase(r,k,snap){const R=liga32.resultados||{};if(k>1)return R[r+'-'+(k-1)]?{base:R[r+'-'+(k-1)]}:{missing:'el '+(k-1)+'.º enfrentamiento'};
 if(snap.players.some(p=>p.part>2)){if(r>1&&R[(r-1)+'-7'])return {base:R[(r-1)+'-7']};return {missing:'el 7.º enfrentamiento de la jornada '+(r-1)}}return {base:null,zero:true}}
async function ligaImportResultados(input){const f=input.files?.[0];input.value='';if(!f)return;const m=liga32Current();
 try{if(!LIGA_TEAMS_1DM_2627.includes(m.myTeam))throw Error('Elige primero «Mi equipo».');if(f.size>25*1024*1024)throw Error('PDF demasiado grande.');
  const lines=await window.MiBowlingCuadro.pdfLines(await f.arrayBuffer(),new URL('./',location.href).href);
  const snap=window.MiBowlingCuadro.parseResultados(lines,LIGA_TEAMS_1DM_2627);
  if(!snap.players.length){ligaResPreview={error:lines.join('').replace(/\s/g,'').length<30?'El PDF no contiene texto (parece una imagen escaneada).':'No he encontrado jugadores de Primera División en este PDF.',text:lines.join('\n')};return render()}
  if(!snap.round||!snap.enf){ligaResPreview={error:'No he encontrado la jornada o el número de enfrentamiento en el PDF.',text:lines.join('\n')};return render()}
  const b=ligaResBase(snap.round,snap.enf,snap),d=b.missing?[]:window.MiBowlingCuadro.delta(snap,b.base);
  const acta=liga32.matches.find(x=>x.round===snap.round&&x.match===snap.enf);
  ligaResPreview={name:f.name,snap:{round:snap.round,enf:snap.enf,players:snap.players},missing:b.missing||'',zero:!!b.zero,acta:acta?liga32.matches.indexOf(acta):-1,
   own:d.filter(p=>p.team===m.myTeam),rival:acta?d.filter(p=>p.team===acta.rival):[]};render()}
 catch(e){ligaResPreview={error:'No se pudo leer el PDF: '+e.message,text:''};render()}}
function ligaResUnits(list,zero){const full=list.filter(p=>p.dPart>=2),part=list.filter(p=>p.dPart===1),u=full.map(p=>({names:[p.name,p.name],pdf:{partidas:p.dPart,bolos:p.dBolos,max:zero?p.newMax:null}}));
 for(let i=0;i<part.length;i+=2){const a=part[i],b=part[i+1];u.push(b?{names:[a.name,b.name],scores:[a.dBolos,b.dBolos],pdf:{partidas:2,bolos:a.dBolos+b.dBolos,sub:true}}:{names:[a.name,a.name],pdf:{partidas:1,bolos:a.dBolos,sub:true}})}return u}
function ligaResFill(m,side,list,zero){const slots=m.players.filter(p=>p.team===side),units=ligaResUnits(list,zero),used=new Set(),skipped=[];
 const has=(p,u)=>[p.name,...(p.names||[])].filter(Boolean).some(n=>u.names.some(x=>ligaNameKey(x)===ligaNameKey(n)));
 const place=(p,u)=>{used.add(p);if(Object.keys(p.links||{}).length)return;p.name=u.names[0];p.names=[...u.names];p.pdf=u.pdf;if(u.scores)u.scores.forEach((v,g)=>{if(!p.scores[g])p.scores[g]=String(v)})};
 const rest=[];for(const u of units){const p=slots.find(x=>!used.has(x)&&has(x,u));if(p)place(p,u);else rest.push(u)}
 for(const u of rest){const p=slots.find(x=>!used.has(x)&&!Object.keys(x.links||{}).length&&!x.scores.some(Boolean));if(p)place(p,u);else skipped.push(u.names[0])}
 return skipped}
function ligaResApply(){const P=ligaResPreview;if(!P?.snap)return;const backup=JSON.stringify(liga32);
 try{liga32.resultados=liga32.resultados||{};liga32.resultados[P.snap.round+'-'+P.snap.enf]={name:P.name,at:new Date().toISOString(),players:P.snap.players};
  const m=liga32.matches[P.acta];let skipped=[];
  if(m&&!P.missing){skipped=[...ligaResFill(m,'own',P.own,P.zero),...ligaResFill(m,'rival',P.rival,P.zero)];m.pdfImported=P.snap.enf}
  liga32Save();for(const p of P.snap.players)liga33RosterAdd(p.team===liga32Current().myTeam?'own':p.team,p.name);
  ligaResPreview=null;if(m)liga32Match=P.acta;render();if(skipped.length)alert('No había hueco para: '+skipped.join(', ')+'. Revísalo en el acta.')}
 catch(e){liga32=JSON.parse(backup);alert('No se pudo aplicar: '+e.message)}}
function ligaResRow(p){if(!p.pdf)return '';const sum=(p.scores||[]).reduce((a,v)=>a+(v===''?NaN:Number(v)),0),ok=Number.isFinite(sum);
 return `<small class="liga-pdf-hint${ok&&sum!==p.pdf.bolos?' bad':''}">Federación: ${p.pdf.partidas} partida${p.pdf.partidas>1?'s':''} · ${p.pdf.bolos} bolos${p.pdf.max?` (máx. ${p.pdf.max} → ${p.pdf.max} y ${p.pdf.bolos-p.pdf.max})`:''}${p.pdf.sub?' · sustitución: confirma qué partida jugó cada uno':''}${ok&&sum!==p.pdf.bolos?` · ¡tu suma es ${sum}!`:''}</small>`}
function ligaResCard(m){const P=ligaResPreview,R=liga32.resultados||{};let body='';
 const li=p=>`<li><strong>${esc(p.name)}</strong> <small>${p.dPart} partida${p.dPart>1?'s':''} · ${p.dBolos} bolos${p.dPart===1?' (puntuación exacta)':''}</small></li>`;
 if(P?.snap){const a=liga32.matches[P.acta];body=`<p class="hint">${esc(P.name)} · Jornada ${P.snap.round} · ${P.snap.enf}.º enfrentamiento · ${P.snap.players.length} jugadores de Primera.</p>`+
  (P.missing?`<p class="hint liga-cuadro-error">Falta el PDF de ${esc(P.missing)}: se guardan las plantillas, pero sin él no se sabe quién jugó este enfrentamiento.</p>`:
   `<h3>${esc(a?.myTeam||m.myTeam)}</h3><ul class="liga-cuadro-list">${P.own.map(li).join('')||'<li>Sin cambios</li>'}</ul><h3>${esc(a?.rival||'Rival')}</h3><ul class="liga-cuadro-list">${P.rival.map(li).join('')||'<li>Sin cambios</li>'}</ul><p class="hint">Se rellenarán los nombres del acta (las sustituciones, partida a partida) y las puntuaciones exactas. Lo que ya hayas apuntado no se borra.</p>`)+
  `<div class="row wrap"><button class="btn primary" onclick="ligaResApply()">Aplicar</button><button class="btn outline" onclick="ligaResPreview=null;render()">Cancelar</button></div>`}
 else if(P?.error)body=`<p class="hint liga-cuadro-error">${esc(P.error)}</p>${P.text?`<button class="btn outline" onclick="navigator.clipboard?.writeText(ligaResPreview.text).then(()=>alert('Texto del PDF copiado.'))">Copiar texto del PDF</button>`:''}<button class="btn outline" onclick="ligaResPreview=null;render()">Cerrar</button>`;
 const done=[1,2,3].map(r=>{const k=[1,2,3,4,5,6,7].filter(k=>R[r+'-'+k]);return k.length?`J${r}: ${k.join(', ')}`:''}).filter(Boolean).join(' · ');
 return `<div class="card"><h2>Resultados de la Federación</h2><p class="hint">Tras cada enfrentamiento, importa el PDF de resultados. Comparándolo con el anterior se sabe quién jugó, las sustituciones y los bolos de cada jugador.${done?' Importados: '+done+'.':''}</p><label class="btn outline block">Importar resultados (PDF)<input type="file" accept="application/pdf,.pdf" hidden onchange="ligaImportResultados(this)"></label>${body}</div>`}
// 3.3.28 · Resultados oficiales de la Federación Galega (PDF) y seguimiento de jugadores del club.
let fbPreview=null,fbShowAll=false;
function fbStore(){liga32.federacion=liga32.federacion||{players:{},docs:[],follow:{clubs:['CELTA'],extra:[],hidden:[]}};return liga32.federacion}
function fbRegistry(){return Object.entries(fbStore().players).map(([key,p])=>({key,...p}))}
function fbShort(key){const p=fbStore().players[key];if(!p)return '';if(p.alias)return p.alias;const [sur,giv]=p.name.split(',');const g=(giv||'').trim().split(/\s+/)[0]||'',s1=(sur||'').trim().split(/\s+/)[0]||'';const cap=x=>x.charAt(0)+x.slice(1).toLowerCase();return (g?g+' ':'')+cap(s1)}
function fbFollowed(key,club){const F=fbStore().follow,p=fbStore().players[key];if(F.hidden.includes(key))return false;if(F.extra.includes(key))return true;const c=window.MiBowlingFGB.norm(p?.club||club||'');return F.clubs.some(x=>window.MiBowlingFGB.norm(x)===c)}
function fbEvent(doc){const t=window.MiBowlingFGB.norm(doc.title),ev=officialCalendarEvents().filter(e=>e.category==='gallego');
 const kw=/PAREJAS|PARELLAS/.test(t)?/PARELLAS|PAREJAS/:/COPA PRESIDENTE/.test(t)?/COPA PRESIDENTE/:/TRIPLETAS/.test(t)?/TRIPLETAS/:/INDIVIDUAL/.test(t)?/INDIVIDUAL/:/MASTER/.test(t)?/MASTER/:/CLUBS/.test(t)?/CLUBS/:/CIRCUITO/.test(t)?new RegExp('^'+((t.match(/(\d)\s*(?:ER|º|O)?\s*CIRCUITO/)||[])[1]||'1')+'º CIRCUITO'):null;
 if(!kw)return null;return ev.find(e=>kw.test(window.MiBowlingFGB.norm(e.title).replace('1º','1º')))||null}
async function fbImport(input){const files=[...(input.files||[])];input.value='';if(!files.length)return;const out=[];
 for(const f of files){try{if(f.size>25*1024*1024)throw Error('demasiado grande');const lines=await window.MiBowlingCuadro.pdfLines(await f.arrayBuffer(),new URL('./',location.href).href);
   const d=window.MiBowlingFGB.parse(lines);if(!d||!d.rows.length){out.push({file:f.name,error:lines.join('').replace(/\s/g,'').length<30?'es una imagen escaneada, no se puede leer':'formato no reconocido todavía',text:lines.join('\n')});continue}
   out.push({file:f.name,doc:d})}catch(e){out.push({file:f.name,error:e.message})}}
 fbPreview=out;render()}
const FB_KIND={general:'Clasificación general',parejas:'Resultados de parejas',copa:'Resultados por series',pistas:'Orden de pistas',series:'Distribución de series'};
function fbApply(){if(!fbPreview)return;const backup=JSON.stringify(liga32);
 try{const S=fbStore();const docs=fbPreview.filter(x=>x.doc).map(x=>({...x.doc,file:x.file})).sort((a,b)=>(a.kind==='general'?0:1)-(b.kind==='general'?0:1));
  for(const d of docs){if(d.kind==='general')for(const r of d.rows){const key=window.MiBowlingFGB.personKey(r.name);S.players[key]={name:r.name,cat:r.cat,club:r.club,gender:r.gender}}
   const id=d.kind==='general'?'general|'+d.rows.map(r=>r.name+r.part+r.bolos).join(';').length+'|'+d.rows.reduce((a,r)=>a+r.part*7+r.bolos,0):d.kind+'|'+d.title+(d.kind==='pistas'||d.kind==='series'?'':'');
   // Nombre de uso («REYDNIER CHAVEZ», «MANUEL NOVO») tomado de copas, pistas y series.
   if(d.kind!=='general'&&d.kind!=='parejas')for(const r of d.rows)for(const n of r.names){if(/[.,]/.test(n))continue;const k=window.MiBowlingFGB.resolve(n,r.club,fbRegistry(),r.cat);if(k&&S.players[k]&&!S.players[k].alias)S.players[k].alias=n.toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase())}
   const doc={id,kind:d.kind,title:d.title,sub:d.sub,date:d.date,time:d.time,file:d.file,at:new Date().toISOString(),rows:d.rows};
   const i=S.docs.findIndex(x=>x.id===id),tot=x=>x.rows.reduce((a,r)=>a+(r.bolos||0),0);
   // Resumen adelantado frente a definitivo: se conserva el más completo (más bolos registrados).
   if(i<0)S.docs.push(doc);else if(d.kind==='general'||tot(doc)>=tot(S.docs[i]))S.docs[i]=doc}
  liga32Save();fbPreview=null;render()}catch(e){liga32=JSON.parse(backup);alert('No se pudo guardar: '+e.message)}}
function fbKeyOf(name,club,cat){return window.MiBowlingFGB.resolve(name,club,fbRegistry(),cat)}
function fbDocDate(d){const ev=fbEvent(d);return d.date||ev?.start||''}
function fbGeneralCard(){const S=fbStore(),gens=S.docs.filter(d=>d.kind==='general');if(!gens.length)return '';const cur=gens[gens.length-1],prev=gens[gens.length-2];
 const pm=new Map((prev?.rows||[]).map(r=>[window.MiBowlingFGB.personKey(r.name),r]));
 const rows=cur.rows.filter(r=>fbShowAll||fbFollowed(window.MiBowlingFGB.personKey(r.name),r.club)).filter(r=>r.part>0);
 return `<div class="card fb-card"><h2>Clasificación general</h2><p class="hint">${esc(cur.title)} · ${esc(cur.file||'')}${prev?' · comparada con la anterior':''}</p><div class="table-scroll"><table class="fb-table"><thead><tr><th>Pos</th><th>Jugador</th><th>Cat</th><th>Part</th><th>Prom</th><th>Máx</th></tr></thead><tbody>${rows.map(r=>{const k=window.MiBowlingFGB.personKey(r.name),q=pm.get(k),dp=q&&q.part?r.prom-q.prom:null,dpos=q?q.pos-r.pos:null;
  return `<tr><td>${r.pos}${dpos?`<small class="${dpos>0?'up':'down'}">${dpos>0?'▲':'▼'}${Math.abs(dpos)}</small>`:''}</td><td>${esc(fbShort(k)||r.name)}${r.gender==='F'?' <small>F</small>':''}</td><td>${esc(r.cat)}</td><td>${r.part}</td><td>${fmt(r.prom)}${dp!==null&&Math.abs(dp)>=0.01?`<small class="${dp>0?'up':'down'}">${dp>0?'+':''}${fmt(dp)}</small>`:''}</td><td>${r.max}</td></tr>`}).join('')||'<tr><td colspan="6">Sin jugadores seguidos con partidas.</td></tr>'}</tbody></table></div></div>`}
function fbCompCards(){const S=fbStore();return S.docs.filter(d=>d.kind==='parejas'||d.kind==='copa').sort((a,b)=>fbDocDate(b).localeCompare(fbDocDate(a))).map(d=>{
  const date=fbDocDate(d),rows=d.rows.filter(r=>fbShowAll||r.names.some(n=>{const k=fbKeyOf(n,r.club,r.cat);return k?fbFollowed(k,r.club):fbFollowed('',r.club)}));
  const name=(n,r)=>{const k=fbKeyOf(n,r.club,r.cat);return esc(k?fbShort(k):n)};
  const sects=[...new Set(rows.map(r=>r.sect||''))];
  return `<div class="card fb-card"><h2>${esc(d.title)}</h2><p class="hint">${date?esc(date.split('-').reverse().join('/'))+' · ':''}${esc(d.sub)} · ${esc(FB_KIND[d.kind])}</p>${sects.map(sc=>`${sc?`<h3>${esc(sc)}</h3>`:''}<ul class="fb-list">${rows.filter(r=>(r.sect||'')===sc).map(r=>`<li><span class="fb-pos${r.pos<=3?' podium':''}">${r.pos}.º</span><span class="fb-who">${r.names.map(n=>name(n,r)).join(' / ')}<small>${esc(r.club)}${r.serie?' · '+esc(r.serie):''}</small></span><span class="fb-num"><strong>${r.bolos}</strong>${r.parts?.length?`<small>${r.parts.join(' + ')}</small>`:r.prom?`<small>${fmt(r.prom)}</small>`:''}</span></li>`).join('')}</ul>`).join('')||'<p class="hint">Ningún jugador seguido en este PDF.</p>'}</div>`}).join('')}
function fbNextCards(upcoming){const S=fbStore(),now=today();const docs=S.docs.filter(d=>(d.kind==='pistas'||d.kind==='series')&&((d.rows[0]?.date||fbDocDate(d)||'9999')>=now)===upcoming);if(!docs.length)return '';
 return docs.map(d=>{const date=fbDocDate(d),rows=d.rows.filter(r=>fbShowAll||r.names.some(n=>{const k=fbKeyOf(n,r.club,r.cat);return k?fbFollowed(k,r.club):fbFollowed('',r.club)}));const past=(rows[0]?.date||date)&&(rows[0]?.date||date)<now;
  return `<div class="card fb-card${past?' fb-past':''}"><h2>${esc(d.title)}</h2><p class="hint">${esc(FB_KIND[d.kind])}${date?' · '+esc(date.split('-').reverse().join('/')):''}${past?' · ya jugada':''}</p><ul class="fb-list">${rows.map(r=>`<li><span class="fb-who">${r.names.map(n=>{const k=fbKeyOf(n,r.club,r.cat);return esc(k?fbShort(k):n)}).join('')}<small>${esc(r.club)}${r.cat?' · '+esc(r.cat):''}</small></span><span class="fb-num"><strong>${esc(r.serie||'')}${r.time?' '+esc(r.time):''}</strong>${r.lanes?`<small>Pistas ${r.lanes.map(esc).join(' → ')}</small>`:''}</span></li>`).join('')}</ul></div>`}).join('')}
function fbPreviewCard(){if(!fbPreview)return '';const ok=fbPreview.filter(x=>x.doc);
 return `<div class="card fb-card"><h2>Revisar antes de guardar</h2><ul class="fb-list">${fbPreview.map(x=>x.doc?`<li><span class="fb-who">${esc(FB_KIND[x.doc.kind])}<small>${esc(x.doc.title)} · ${esc(x.doc.sub)} · ${x.doc.rows.length} filas · ${x.doc.rows.filter(r=>window.MiBowlingFGB.norm(r.club)==='CELTA').length} del Celta</small></span></li>`:`<li><span class="fb-who">${esc(x.file)}<small class="fb-err">No se puede importar: ${esc(x.error)}</small></span></li>`).join('')}</ul>${ok.length?`<div class="row wrap"><button class="btn primary" onclick="fbApply()">Guardar ${ok.length}</button><button class="btn outline" onclick="fbPreview=null;render()">Cancelar</button></div>`:`<button class="btn outline" onclick="fbPreview=null;render()">Cerrar</button>`}</div>`}
function fbFollowCard(){const S=fbStore();const reg=fbRegistry().filter(p=>p.club&&window.MiBowlingFGB.norm(p.club)==='CELTA');if(!reg.length)return '';
 return `<details class="card fb-card"><summary><strong>Jugadores seguidos</strong> <small>${reg.filter(p=>fbFollowed(p.key)).length} del Celta</small></summary><p class="hint">En las competiciones gallegas se sigue a todo el club CELTA. Desmarca a quien no quieras ver.</p><ul class="fb-list">${reg.sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<li><label class="fb-who"><input type="checkbox" ${fbFollowed(p.key)?'checked':''} onchange="fbToggle(${esc(JSON.stringify(p.key))},this.checked)"> ${esc(p.name)}<small>${esc(p.cat)}</small></label></li>`).join('')}</ul></details>`}
function fbToggle(key,on){const F=fbStore().follow;F.hidden=F.hidden.filter(k=>k!==key);F.extra=F.extra.filter(k=>k!==key);if(!on)F.hidden.push(key);liga32Save();render()}
function federacionView(){const S=fbStore();
 return `${head('Resultados oficiales','Federación Galega · jugadores del Celta',`<button class="btn outline" onclick="go('calendario')">Calendario</button>`)}
 <div class="card fb-card"><p class="hint">Importa los PDF de la Federación (clasificación general, parejas, copa, orden de pistas, distribución de series). Puedes elegir varios a la vez. Se leen en el móvil.</p><label class="btn primary block">Importar PDF de la Federación<input type="file" accept="application/pdf,.pdf" multiple hidden onchange="fbImport(this)"></label>${S.docs.length?`<label class="switch mt12"><input type="checkbox" ${fbShowAll?'checked':''} onchange="fbShowAll=this.checked;render()"> Ver todos los clubs</label>`:''}</div>
 ${fbPreviewCard()}${fbNextCards(true)}${fbGeneralCard()}${fbCompCards()}${fbNextCards(false)}${fbFollowCard()}${S.docs.length?'':'<div class="card empty">Aún no hay resultados importados.</div>'}`}
function fbHomeCard(){let S;try{S=liga32?.federacion}catch(e){return ''}if(!S?.docs?.length)return '';const d=[...S.docs].filter(x=>x.kind==='parejas'||x.kind==='copa').sort((a,b)=>fbDocDate(b).localeCompare(fbDocDate(a)))[0];
 const top=d?d.rows.filter(r=>r.names.some(n=>{const k=fbKeyOf(n,r.club,r.cat);return k?fbFollowed(k,r.club):fbFollowed('',r.club)})).sort((a,b)=>a.pos-b.pos)[0]:null;
 return `<button type="button" class="hm-card" onclick="go('federacion')"><span class="hm-kicker">Resultados oficiales</span><strong>${d?esc(d.title):'Federación Galega'}</strong><span class="hm-sub">${top?esc(top.pos+'.º '+(top.sect?top.sect+' · ':'')+top.names.map(n=>{const k=fbKeyOf(n,top.club,top.cat);return k?fbShort(k):n}).join(' / ')+' · '+top.bolos):'Clasificación y resultados del Celta'}</span></button>`}
function liga33Choose(r,j){const i=liga32.matches.findIndex(x=>x.round===r&&x.match===j);if(i<0)return;liga32Match=i;render()}
function liga33MarkMe(i){const m=liga32Current();m.players.forEach((p,k)=>{if(p.team==='own')p.isMe=k===i});liga32Save();render()}
function liga33OpenPersonal(i,g){const m=liga32Current(),p=m.players[i];if(!p)return;let ss=null,gg=null;const old=p.links?.[g];if(old){ss=db.sessions.find(x=>x.id===old.sessionId);gg=ss?.games.find(x=>x.id===old.gameId)}
 if(!ss||!gg){if(p.scores?.[g]!==''&&p.scores?.[g]!==undefined&&!confirm('Esta casilla ya tiene una puntuación rápida. Al iniciar el registro detallado se sustituirá por el resultado de los lanzamientos. ¿Continuar?'))return;
 gg={id:uid(),includeStats:true,pair:null,startLane:null,segments:[],rolls:[]};ss={id:uid(),type:'oficial',leagueOther:!(p.team==='own'&&p.isMe),leaguePlayer:liga32Name(p,g),date:m.date||today(),title:`Liga Nacional · Jornada ${m.round} · Encuentro ${m.match} · ${liga32Name(p,g)} · Partida ${g+1}`,venue:'',pattern:'',patternId:'',patternNotes:'',competition:'Liga Nacional',goal:null,notes:'',currentBallId:'',currentLine:cleanLine({}),lane:null,games:[gg]};db.sessions.push(ss);p.links=p.links||{};p.links[g]={sessionId:ss.id,gameId:gg.id};p.scores[g]='';liga32Save();save()}
 ligaReturn={matchId:m.id,playerIndex:i,game:g};activeId=ss.id;go('registro')}
function ligaBack(){if(!ligaReturn)return go('liga');const index=liga32.matches.findIndex(x=>x.id===ligaReturn.matchId);if(index>=0)liga32Match=index;liga32Game=ligaReturn.game;ligaReturn=null;go('liga')}
function liga33Stats(){const by=new Map();let sum=[0,0],finished=0;for(const m of liga32.matches){const c=liga32Compute(m);if(c.final){sum[0]+=c.total[0];sum[1]+=c.total[1];finished++}m.players.forEach(p=>{for(let g=0;g<2;g++){const v=liga32Score(p,g),n=liga32Name(p,g);if(v===null||!n)continue;const key=(p.team==='own'?'own':m.rival)+'|'+n;let e=by.get(key)||{team:p.team==='own'?m.myTeam:m.rival,name:n,balls:0,games:0,best:0};e.balls+=v;e.games++;e.best=Math.max(e.best,v);by.set(key,e)}})}return `<div class="card"><h2>Estadísticas de Liga Nacional</h2><p class="hint">${finished}/21 enfrentamientos completos · ${sum[0]}–${sum[1]} puntos federativos acumulados</p><div class="liga33-stats">${[...by.values()].sort((a,b)=>b.balls/b.games-a.balls/a.games).map(p=>`<div><strong>${esc(p.name)}</strong> <small>${esc(p.team)}</small><span>${p.games} partidas · Media ${fmt(p.balls/p.games)} · Mejor ${p.best}</span></div>`).join('')}</div><p class="hint">Las medias solo incluyen puntuaciones registradas, no los resultados generales de la Federación. Las partidas detalladas vinculadas se cuentan una sola vez.</p></div>`}
function ligaView(){const m=liga32Current();return `${head('Liga Nacional','Primera División Masculina · 2026–27',`<button class="btn outline" onclick="newMode='oficial';competitionFormat='liga';go('nueva')">Volver</button>`)}<div class="card"><label class="field">Jornada</label><select class="input" onchange="liga33Choose(Number(this.value),1)">${[1,2,3].map(r=>`<option value="${r}" ${m.round===r?'selected':''}>Jornada ${r}</option>`).join('')}</select><label class="field">Enfrentamiento (sábado 1–4 / domingo 5–7)</label><select class="input" onchange="liga33Choose(${m.round},Number(this.value))">${Array.from({length:7},(_,i)=>`<option value="${i+1}" ${m.match===i+1?'selected':''}>${i<4?'Sábado':'Domingo'} · ${i+1} · ${esc(liga32.matches.find(x=>x.round===m.round&&x.match===i+1)?.rival||'')}</option>`).join('')}</select>${ligaTeamFields(m)}<label class="field">Fecha</label><input class="input" type="date" value="${esc(m.date||'')}" onchange="liga32Header('date',this.value)">${m.demo?'<p class="hint">Ejemplo ficticio editable. Puedes sustituir los resultados y nombres.</p>':''}</div>${ligaCuadroCard(m)}${ligaResCard(m)}<div class="card"><h2>Plantillas y jugador personal</h2><p class="hint">Añade los nombres una sola vez; selecciónalos en cada partida desde el desplegable. Marca cuál de los seis jugadores eres tú para que solo tus partidas detalladas cuenten en tus estadísticas personales.</p><select class="input" id="liga33-team"><option value="own">Mi equipo</option><option value="rival">${esc(m.rival)}</option></select><div class="row wrap mt12"><input class="input" id="liga33-player" placeholder="Nombre del jugador"><button class="btn outline" onclick="liga33AddPlayer()">+ Añadir</button></div><label class="field">Mi posición en el enfrentamiento</label><select class="input" onchange="liga33MarkMe(Number(this.value))"><option value="-1">Seleccionar mi jugador</option>${m.players.map((p,i)=>p.team==='own'?`<option value="${i}" ${p.isMe?'selected':''}>${esc(liga32Name(p,0))}</option>`:'').join('')}</select></div>${liga32Summary(m)}<div class="card"><h2>Hoja de puntuaciones</h2><p class="hint">Todos pueden usar puntuación final o detalle opcional. Solo el jugador marcado como tú alimenta tus estadísticas personales. Puedes cambiar la alineación entre partidas.</p><label class="field">Nombres que se muestran al editar la alineación</label><select class="input" onchange="liga32Game=Number(this.value);render()"><option value="0" ${liga32Game===0?'selected':''}>Partida 1</option><option value="1" ${liga32Game===1?'selected':''}>Partida 2</option></select></div>${[1,2].map(t=>liga32Trio(m,t)).join('')}${liga33Stats()}<div class="card"><button class="btn outline block" onclick="liga32Export()">↓ Exportar copia de Liga Nacional</button><p class="hint">Para conservar también los lanzamientos detallados, utiliza la copia general desde Ajustes. La copia de actas solo incluye la Liga.</p></div>`}
function ligaShowFrame(){} // Compatibilidad con el render general.

/* BOWLING-CATALOGO-LOCAL · F1 LAB: API sin interfaz nueva. */
window.MiBowlingCatalogoLocal=window.MiBowlingPuentePersonal.create({guard:window.MiBowlingEscritura,getDB:()=>db,setDB:next=>{db=next;render()},canWrite:()=>!saveError&&!ballSelectionSaveError&&!activeId&&!ballEditingId&&tab!=='registro',fetchPage:async()=>{const r=await fetch('catalogo-bolas/index.html',{credentials:'same-origin'});if(!r.ok)throw Error('Catálogo local no disponible');return r.text()}});
