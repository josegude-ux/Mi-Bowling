'use strict';
/* MI BOWLING · Registro de partida (3.3.15).
 * Tres formas de anotar: Bolos (posiciones exactas), Cantidad (solo número) y Solo puntuación.
 * Sin almacenamiento propio: llama a recordThrow / setFinalOnly / undoLast / rewindFrame / nextGameQuick
 * de la app, que guardan en mi-bowling-analitica-v2 mediante MiBowlingEscritura (Web Lock + journal).
 * Preferencias fuera del prefijo mi-bowling- (no entran en copias ni restauraciones).
 */
(function(){
 const PREF='mibowling.pref.registro-compacto';   // '0' = usar el registro clásico
 const MODE='mibowling.pref.registro-modo';       // bolos | cantidad | final
 const MODES=['bolos','cantidad','final'];
 let classicGameId=null,modeByGame={},sheet=null,hideTip=false;
 const get=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
 const put=(k,v)=>{try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){alert('No se pudo guardar la preferencia.')}};
 const enabled=()=>get(PREF)!=='0';
 const defaultMode=()=>MODES.includes(get(MODE))?get(MODE):null;
 function currentGameId(){try{const s=session();return s?game(s)?.id||null:null}catch(e){return null}}
 function active(){return enabled()&&!(classicGameId&&classicGameId===currentGameId())}
 function rerender(){window.render()}

 function modeFor(g,n){
  if(isFinalOnly(g))return 'final';
  let m=modeByGame[g.id]||defaultMode()||'bolos';
  if(m==='final'&&g.rolls.length)m=defaultMode()==='cantidad'?'cantidad':'bolos';
  if(m==='bolos'&&!n.done&&!n.available)m='cantidad';
  return m;
 }

 const CSS=`
body.rc-open{overflow:hidden}
.rc-root{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;gap:clamp(6px,1.3vh,12px);padding:calc(env(safe-area-inset-top,0px) + 10px) 16px calc(env(safe-area-inset-bottom,0px) + 12px);background:#000;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.rc-root *{box-sizing:border-box}
.rc-root button{font-family:inherit;cursor:pointer}
.rc-head{display:flex;align-items:center;gap:10px}
.rc-round{flex:0 0 auto;width:46px;height:46px;border-radius:50%;border:0;background:#1c1c1e;color:#f5f5f7;display:grid;place-items:center;padding:0}
.rc-round svg{width:22px;height:22px}
.rc-title{flex:1;min-width:0;text-align:center;font-size:18px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rc-board{display:grid;grid-template-columns:repeat(9,1fr) 1.45fr;border:1px solid #3a3a3c;border-radius:12px;overflow:hidden}
.rc-frame{all:unset;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:4px 1px;min-height:clamp(52px,8.4vh,80px);border-right:1px solid #2c2c2e;cursor:pointer}
.rc-frame:last-child{border-right:0}
.rc-frame.cur{background:#2a1209;box-shadow:inset 0 0 0 2px #f0612d}
.rc-frame i{font-style:normal;font-size:11px;color:#8e8e93}
.rc-frame em{font-style:normal;font-size:15px;font-weight:700;white-space:nowrap;letter-spacing:-.02em;display:flex;align-items:center;gap:3px}
.rc-frame em .sp{display:inline-grid;place-items:center;width:19px;height:19px;border-radius:50%;border:2px solid #f0612d;font-size:12px}
.rc-frame strong{font-size:15px;min-height:18px}
.rc-mini{width:24px;height:22px;display:block;margin:1px 0}
.rc-mini .s{fill:#f5f5f7}
.rc-mini .m{fill:#ff453a}
.rc-mini .k{fill:#48484a}
.rc-score{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.rc-score>span{color:#8e8e93;font-size:19px}
.rc-score b{font-size:30px;line-height:1;color:#f5f5f7}
.rc-score small{color:#8e8e93;font-size:15px;margin-right:8px}
.rc-mode{display:flex;gap:4px;padding:3px;border-radius:12px;background:#1c1c1e}
.rc-mode button{flex:1;border:0;border-radius:10px;padding:8px 2px;background:transparent;color:#f5f5f7;font-size:14px;font-weight:500}
.rc-mode button[aria-selected="true"]{background:#636366;font-weight:600}
.rc-mode button:disabled{opacity:.35}
.rc-turn{text-align:center;font-size:19px;font-weight:700;margin:0}
.rc-balls{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rc-ballbtn{position:relative;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:12px;background:#1c1c1e;padding:10px 6px;min-width:0}
.rc-ballbtn span{font-size:12px;color:#8e8e93;white-space:nowrap}
.rc-ballbtn b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rc-ballbtn select{position:absolute;inset:0;opacity:0;width:100%;height:100%;font-size:16px}
.rc-hint{text-align:center;color:#8e8e93;font-size:15px;margin:0}
.rc-panel{flex:1;min-height:0;display:flex;flex-direction:column;gap:clamp(6px,1.2vh,12px)}
.rc-rack{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:clamp(6px,1.4vh,14px)}
.rc-row{display:flex;gap:clamp(10px,3.4vw,18px)}
.rc-pin{width:clamp(44px,min(14vw,7.2vh),60px);height:clamp(44px,min(14vw,7.2vh),60px);border-radius:50%;border:3px solid #f0612d;background:transparent;color:#f5f5f7;font-size:21px;font-weight:700;padding:0}
.rc-pin[aria-pressed="true"]{background:#f0612d;color:#000}
.rc-pin:disabled{border-color:#2c2c2e;color:#3a3a3c}
.rc-quick{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.rc-btn{border:0;border-radius:22px;padding:14px 8px;background:#3a3a3c;color:#f5f5f7;font-size:19px;font-weight:500}
.rc-keys{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;align-content:start}
.rc-key{border:0;border-radius:30px;padding:clamp(12px,2.4vh,22px) 0;background:#1c1c1e;color:#f0612d;font-size:26px;font-weight:700}
.rc-key[data-k="F"]{color:#ff453a}
.rc-key:disabled{color:#3a3a3c}
.rc-final{display:flex;flex-direction:column;align-items:center;gap:14px;padding-top:8px}
.rc-final input{width:100%;background:transparent;border:0;color:#f5f5f7;text-align:center;font:inherit;font-size:clamp(44px,9vh,64px);font-weight:800;outline:none}
.rc-final input::placeholder{color:#3a3a3c}
.rc-final p{color:#8e8e93;font-size:15px;text-align:center;margin:0}
.rc-save{border:0;border-radius:30px;padding:16px 32px;background:#f0612d;color:#fff;font-size:19px;font-weight:600}
.rc-save:disabled{background:#1c1c1e;color:#48484a}
.rc-foot{display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:center}
.rc-undo{height:64px;border:0;border-radius:32px;background:#1c1c1e;color:#f0612d;display:grid;place-items:center;padding:0}
.rc-undo svg{width:28px;height:28px}
.rc-undo:disabled{color:#48484a}
.rc-submit{height:64px;border:0;border-radius:32px;background:#f0612d;color:#fff;font-size:21px;font-weight:700;padding:0 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rc-done{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;gap:12px;overflow:auto}
.rc-done{position:relative}
.rc-tourney-lane{width:94px;max-width:100%;height:44px;padding:5px 9px;border:1px solid #86868f;border-radius:12px;background:#242428;color:#fff;text-align:center;font-size:20px;vertical-align:middle}
.rc-tourney-hint{font-size:12px;color:#ffab86;text-align:center;line-height:1.3;max-width:330px}
.rc-cheer{margin:6px 0 -4px;font-size:22px;font-weight:800;color:#f0612d;letter-spacing:-.01em;animation:rc-pop .5s cubic-bezier(.2,1.4,.4,1) both}
.rc-party{position:absolute;inset:-40px 0 auto 0;height:260px;pointer-events:none;overflow:hidden}
.rc-party i{position:absolute;top:-12px;left:var(--x);width:8px;height:14px;border-radius:2px;background:var(--c);transform:rotate(var(--r));animation:rc-fall 1.6s var(--d) ease-in forwards;opacity:0}
@keyframes rc-fall{0%{opacity:1;transform:translateY(0) rotate(var(--r))}100%{opacity:0;transform:translateY(240px) rotate(calc(var(--r) + 220deg))}}
@keyframes rc-pop{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.rc-party{display:none}.rc-cheer{animation:none}}
.rc-done .big{font-size:clamp(64px,12vh,96px);font-weight:800;line-height:1}
.rc-share{border:0;border-radius:24px;background:#1c1c1e;color:#f0612d;font-size:19px;font-weight:500;padding:12px 22px;display:flex;align-items:center;gap:10px}
.rc-share svg{width:22px;height:22px}
.rc-tip{width:100%;display:flex;gap:14px;align-items:flex-start;background:#1c1c1e;border-radius:20px;padding:16px}
.rc-tip h3{margin:0 0 4px;font-size:18px}
.rc-tip p{margin:0;color:#8e8e93;font-size:15px}
.rc-tip button{margin-left:auto;border:0;background:#3a3a3c;color:#c7c7cc;border-radius:50%;width:30px;height:30px;flex:0 0 auto}
.rc-sheetbg{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.55);display:flex;align-items:flex-end}
.rc-sheet{width:100%;max-height:92vh;overflow:auto;background:#1c1c1e;color:#f5f5f7;border-radius:28px 28px 0 0;padding:10px 18px calc(env(safe-area-inset-bottom,0px) + 20px);font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif}
.rc-sheet .grab{width:44px;height:5px;border-radius:3px;background:#48484a;margin:0 auto 14px}
.rc-sheet h2{font-size:22px;margin:0 0 14px;color:#f5f5f7}
.rc-opt{all:unset;box-sizing:border-box;display:flex;gap:16px;width:100%;padding:16px;margin-bottom:12px;border-radius:18px;background:#2c2c2e;cursor:pointer;color:#f5f5f7}
.rc-opt i{font-style:normal;color:#f0612d;font-size:28px;width:34px;text-align:center}
.rc-opt b{display:block;font-size:17px;margin-bottom:4px}
.rc-opt span{color:#8e8e93;font-size:14px}
.rc-sheet .note{color:#8e8e93;font-size:13px;margin:4px 0 0}
.rc-sheet label{display:block;color:#8e8e93;font-size:14px;margin:12px 0 6px}
.rc-sheet select{width:100%;padding:12px;border-radius:12px;border:0;background:#2c2c2e;color:#f5f5f7;font-size:16px}
.rc-classic-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;padding:10px 12px;border-radius:12px;background:#fff3ee;color:#7a2d12;font-size:14px}
@media (max-height:740px){.rc-root{gap:6px;padding-top:calc(env(safe-area-inset-top,0px) + 6px)}.rc-round{width:40px;height:40px}.rc-frame{min-height:46px;padding:2px 1px}.rc-frame em,.rc-frame strong{font-size:13px}.rc-score>span{font-size:16px}.rc-score b{font-size:24px}.rc-turn{font-size:17px}.rc-ballbtn{padding:7px 6px}.rc-hint{display:none}.rc-btn{padding:10px 8px;font-size:17px}.rc-foot{grid-template-columns:60px 1fr}.rc-undo,.rc-submit{height:54px}.rc-submit{font-size:19px}.rc-key{font-size:22px}}
`;
 const ICON={
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  opts:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>'
 };
 function ensureCss(){if(document.getElementById('rc-css'))return;const st=document.createElement('style');st.id='rc-css';st.textContent=CSS;document.head.appendChild(st)}
 function syncBody(open){document.body.classList.toggle('rc-open',!!open)}

 function frameMarks(g,f){
  const label=frameLabel(g,f);if(!label)return '';
  const parts=label.split(' ').map(x=>esc(x));
  if(isSplitFirst(g,f))parts[0]=`<span class="sp" title="Split">${parts[0]}</span>`;
  return parts.join(' ');
 }
 // 3.3.33 · Mini triángulo en cada casilla: en pie tras la 1.ª bola (blanco) y fallados en la 2.ª (rojo).
 const RACK_POS={7:[4,3],8:[10,3],9:[16,3],10:[22,3],4:[7,9],5:[13,9],6:[19,9],2:[10,15],3:[16,15],1:[13,21]};
 function frameRack(g,f){const rs=rollsIn(g,f);if(!rs.length||!rs.every(r=>exactRoll(r)))return '';
  let i=0;if(f===10){while(i<rs.length&&rs[i].pins.length===10)i++;if(i>=rs.length)return ''}else if(rs[0].pins.length===10)return '';
  const a=rs[i],b=f===10&&i>=2?null:rs[i+1];const st1=[1,2,3,4,5,6,7,8,9,10].filter(p=>!a.pins.includes(p)),st2=b?st1.filter(p=>!b.pins.includes(p)):null;
  return `<svg class="rc-mini" viewBox="0 0 26 24" aria-hidden="true">${Object.entries(RACK_POS).map(([p,[x,y]])=>{p=+p;const up=st1.includes(p),miss=st2&&st2.includes(p);return `<circle cx="${x}" cy="${y}" r="${up?2.6:1.3}" class="${!up?'k':miss?'m':'s'}"/>`}).join('')}</svg>`}
 function boardHtml(g,n){
  const scores=frameScores(g);
  return '<div class="rc-board" role="group" aria-label="Hoja de puntuación. Toca un frame para corregirlo">'+Array.from({length:10},(_,i)=>{const f=i+1,cur=!n.done&&n.frame===f,has=rollsIn(g,f).length>0;
   return `<button type="button" class="rc-frame ${cur?'cur':''}" data-rc-frame="${f}" ${has?`onclick="MiBowlingRegistroCompacto.fix(${f})"`:'tabindex="-1"'} aria-label="Frame ${f}${has?', '+esc(frameLabel(g,f))+(scores[i]!=null?', acumulado '+scores[i]:'')+'. Corregir':''}"><i>${f}</i><em>${frameMarks(g,f)}</em>${frameRack(g,f)}<strong>${scores[i]??''}</strong></button>`}).join('')+'</div>';
 }
 const ballLabel=b=>esc(((b.brand||'')+' '+(b.model||'')).trim()||'Bola');
 function ballName(id){const b=db.balls.find(x=>x.id===id);return b?ballLabel(b):'Sin definir'}
 function ballOptions(selected){
  const s=session(),allowed=selectedBallsFor(s.id);
  const list=db.balls.filter(b=>allowed===null?(!b.retired||b.id===selected):allowed.includes(b.id));
  return `<option value="">Sin definir</option>`+list.map(b=>`<option value="${esc(b.id)}" ${b.id===selected?'selected':''}>${ballLabel(b)}</option>`).join('');
 }
 function ballsHtml(s){
  return `<div class="rc-balls"><label class="rc-ballbtn"><span>Bola de strike</span><b>${ballName(s.currentBallId)}</b><select aria-label="Bola de strike" onchange="changeBall(this.value);render()">${ballOptions(s.currentBallId)}</select></label><label class="rc-ballbtn"><span>Bola de spare</span><b>${s.spareBallId?ballName(s.spareBallId):(s.currentBallId?'La misma':'Sin definir')}</b><select aria-label="Bola de spare" onchange="setSpareBall(this.value);render()">${ballOptions(s.spareBallId||'')}</select></label></div>`;
 }
 function rackHtml(n){
  return '<div class="rc-rack">'+RACK.map(row=>'<div class="rc-row">'+row.map(p=>{const can=n.available.includes(p),up=selection.includes(p);
   return `<button type="button" class="rc-pin" data-rc-pin="${p}" onclick="togglePin(${p})" ${can?'':'disabled'} aria-pressed="${up}" aria-label="Bolo ${p}: ${!can?'ya derribado':up?'en pie':'derribado'}">${p}</button>`}).join('')+'</div>').join('')+'</div>';
 }
 function keysHtml(n){
  const spareKey=n.capacity<10?'/':'X';
  const keys=[['−',0],['1',1],['2',2],['3',3],['4',4],['5',5],['6',6],['7',7],['8',8],['9',9],[spareKey,n.capacity],['F','F']];
  return '<div class="rc-keys">'+keys.map(([label,v])=>{const dis=v!=='F'&&label!==spareKey&&v>=n.capacity&&v!==0;
   return `<button type="button" class="rc-key" data-k="${label}" ${dis?'disabled':''} onclick="MiBowlingRegistroCompacto.count(${v==='F'?"'F'":v})" aria-label="${label==='−'?'Canal, 0':label==='F'?'Falta':label==='X'?'Strike':label==='/'?'Spare, '+v:label}">${label}</button>`}).join('')+'</div>';
 }
 const MODE_NAME={bolos:'Bolos en pie',cantidad:'Cantidad',final:'Solo puntuación'};
 function sheetHtml(){
  if(sheet==='modo')return `<div class="rc-sheetbg" onclick="if(event.target===this)MiBowlingRegistroCompacto.closeSheet()"><div class="rc-sheet" role="dialog" aria-label="Cómo quieres anotar tus partidas"><div class="grab"></div><h2>¿Cómo quieres anotar tus partidas?</h2>
   <button type="button" class="rc-opt" data-choose="cantidad" onclick="MiBowlingRegistroCompacto.chooseDefault('cantidad')"><i>#</i><div><b>Cuenta los bolos que derribaste</b><span>La forma más sencilla: toca un número del 0 al 10 tras cada bola.</span></div></button>
   <button type="button" class="rc-opt" data-choose="bolos" onclick="MiBowlingRegistroCompacto.chooseDefault('bolos')"><i>⁘</i><div><b>Toca los bolos que siguen en pie</b><span>Requiere un poco de práctica y muestra qué spares y splits te cuestan bolos.</span></div></button>
   <button type="button" class="rc-opt" data-choose="final" onclick="MiBowlingRegistroCompacto.chooseDefault('final')"><i>Σ</i><div><b>Solo la puntuación final</b><span>Escribe tu total tras cada partida. Strikes, spares y leaves necesitan los frames.</span></div></button>
   <p class="note">Puedes cambiarlo cuando quieras arriba en la pantalla de puntuación.</p></div></div>`;
  if(sheet==='opciones'){const s=session(),g=game(s);return `<div class="rc-sheetbg" onclick="if(event.target===this)MiBowlingRegistroCompacto.closeSheet()"><div class="rc-sheet" role="dialog" aria-label="Opciones de la partida"><div class="grab"></div><h2>Opciones</h2>
   <label for="rc-def">Forma de anotar por defecto</label><select id="rc-def" onchange="MiBowlingRegistroCompacto.chooseDefault(this.value,true)">${MODES.map(m=>`<option value="${m}" ${defaultMode()===m?'selected':''}>${MODE_NAME[m]}</option>`).join('')}</select>
   ${s.type==='entrenamiento'&&!pendingClassification(s)?`<label><input type="checkbox" ${g.includeStats!==false?'checked':''} onchange="toggleGameStats('${esc(g.id)}',this.checked)"> Incluir esta partida en estadísticas</label>`:''}
   <button type="button" class="rc-opt" style="margin-top:16px" onclick="MiBowlingRegistroCompacto.classic()"><i>⇄</i><div><b>Par, pistas, línea e historial</b><span>Abre el registro clásico de esta partida.</span></div></button>
   <button type="button" class="rc-opt" onclick="MiBowlingRegistroCompacto.closeSheet()"><i>✓</i><div><b>Cerrar</b></div></button></div></div>`}
  return '';
 }
 function render(){
  ensureCss();
  const s=session();if(!s)return null;
  const g=game(s),n=next(g),mode=modeFor(g,n),total=score(g),idx=s.games.length;
  if(!defaultMode()&&!sheet&&!g.rolls.length&&!isFinalOnly(g))sheet='modo';
  const torneoDay=window.MiBowlingParejas2026Plan?.dayOf(s)||null;
  const who=torneoDay?(torneoDay==='2026-11-28'?'Sáb':'Dom')+' · Partida '+idx+'/6 · Pista '+(g.startLane||'—'):s.leaguePlayer?esc(s.leaguePlayer)+', partida '+idx:'Partida '+idx;
  const back=ligaReturn?'ligaBack()':"go('historial')";
  const head=`<div class="rc-head"><button type="button" class="rc-round" onclick="${back}" aria-label="${ligaReturn?'Volver a Liga':'Salir del registro'}">${ICON.back}</button><div class="rc-title">${who}</div><button type="button" class="rc-round" onclick="MiBowlingRegistroCompacto.openSheet('opciones')" aria-label="Opciones de la partida">${ICON.opts}</button></div>`;
  const tabs=`<div class="rc-mode" role="tablist" aria-label="Forma de anotar">${[['bolos','Bolos'],['cantidad','Cantidad'],['final','Solo puntuación']].map(([m,l])=>{const dis=n.done||(m==='bolos'&&!n.available)||(m==='final'&&g.rolls.length>0);return `<button type="button" role="tab" data-mode="${m}" aria-selected="${mode===m}" ${dis&&mode!==m?'disabled':''} onclick="MiBowlingRegistroCompacto.mode('${m}')">${l}</button>`}).join('')}</div>`;
  const undoBtn=`<button type="button" class="rc-undo" onclick="MiBowlingRegistroCompacto.undo()" ${g.rolls.length||isFinalOnly(g)?'':'disabled'} aria-label="Deshacer">${ICON.undo}</button>`;
  let body;
  if(n.done){
   const others=db.sessions.filter(x=>x.type===s.type&&!x.leagueOther).flatMap(x=>x.games).filter(x=>x!==g&&complete(x)).map(score);
   const best=others.length?Math.max(...others):null,record=best!==null&&total>best;
   const cheer=total===300?'¡Partida perfecta!':record?'¡Tu mejor partida!':total>=250?'¡Partidón!':total>=200?'¡Más de 200!':'';
   const party=cheer?`<div class="rc-party" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--x:${(i*37)%100}%;--d:${(i%6)*0.12}s;--r:${(i*47)%360}deg;--c:${['#f0612d','#f5f5f7','#ff8a5c'][i%3]}"></i>`).join('')}</div>`:'';
   const tourCompleted=!!torneoDay&&idx>=6;
   const nextLabel=tourCompleted?'Serie completa · Resumen':torneoDay?'Siguiente · partida '+(idx+1)+'/6':ligaReturn?'Guardar y volver a Liga':`Siguiente: partida ${idx+1}${s.leaguePlayer?', '+esc(s.leaguePlayer):''}`;
   const tourLane=torneoDay&&!tourCompleted?`<label class="rc-tourney-hint">Pista siguiente (propuesta +2; confirma o corrige)<br><input id="rc-tournament-next-lane" class="rc-tourney-lane" type="number" min="1" max="999" inputmode="numeric" value="${window.MiBowlingParejas2026Plan?.suggestedNextLane(g)||''}"></label>`:'';
   const tourAction=tourCompleted?'MiBowlingRegistroCompacto.finishTournament()':'MiBowlingRegistroCompacto.nextGame()';
   body=`${isFinalOnly(g)?'':boardHtml(g,n)}<div class="rc-score"><span>Puntuación</span><b>${total}</b></div>${tabs}
    <div class="rc-done">${party}${cheer?`<p class="rc-cheer" role="status">${cheer}</p>`:''}<div class="big">${total}</div>${tourLane}<button type="button" class="rc-share" onclick="shareSessionImage()">${ICON.share} Compartir</button>
    ${isFinalOnly(g)?'<p class="rc-hint">Partida guardada solo con la puntuación final.</p>':'<p class="rc-hint">Toca un frame de arriba para corregirlo.</p>'}
    ${hideTip||isFinalOnly(g)?'':`<div class="rc-tip"><div><h3>¿Te equivocaste?</h3><p>Toca cualquier frame de la hoja para anotarlo de nuevo.</p></div><button type="button" aria-label="Cerrar aviso" onclick="MiBowlingRegistroCompacto.tip()">✕</button></div>`}</div>
    <div class="rc-foot">${undoBtn}<button type="button" class="rc-submit" id="rc-next" onclick="${tourAction}">${nextLabel}</button></div>`;
  }else if(mode==='final'){
   body=`${tabs}<div class="rc-panel"><div class="rc-final"><input id="rc-final-input" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" placeholder="Puntuación final" aria-label="Puntuación final de 0 a 300" oninput="MiBowlingRegistroCompacto.finalInput(this)"><button type="button" class="rc-save" id="rc-final-save" disabled onclick="MiBowlingRegistroCompacto.saveFinal()">Guardar puntuación</button><p>Las partidas con solo la puntuación final cuentan únicamente para el promedio y las mejores marcas.</p></div></div>
    <div class="rc-foot">${undoBtn}<span></span></div>`;
  }else{
   const scoreRow=`<div class="rc-score"><span>Puntuación actual</span><span><small>máx. ${maxPossible(g)}</small><b>${total}</b></span></div>`;
   const title=`<p class="rc-turn">Frame ${n.frame}, bola ${n.ball}</p>`;
   if(mode==='cantidad'){
    body=`${boardHtml(g,n)}${scoreRow}${tabs}${title}${ballsHtml(s)}<div class="rc-panel"><p class="rc-hint">Bolos derribados</p>${keysHtml(n)}</div><div class="rc-foot">${undoBtn}<span></span></div>`;
   }else{
    const down=n.available.length-selection.length;
    const label=selection.length===0?(n.capacity===10?'Strike':'Spare'):(down===0?'Registrar 0':`Registrar ${down}`);
    body=`${boardHtml(g,n)}${scoreRow}${tabs}${title}${ballsHtml(s)}<div class="rc-panel"><p class="rc-hint">Toca los bolos que siguen en pie</p>${rackHtml(n)}<div class="rc-quick"><button type="button" class="rc-btn" data-rc="canal" onclick="MiBowlingRegistroCompacto.pins('canal')">— Canal</button><button type="button" class="rc-btn" data-rc="foul" onclick="MiBowlingRegistroCompacto.pins('foul')">⚠ Foul</button></div></div>
     <div class="rc-foot">${undoBtn}<button type="button" class="rc-submit" id="quick-record" onclick="MiBowlingRegistroCompacto.pins()">${label}</button></div>`;
   }
  }
  return `<div class="rc-root" data-rc="${n.done?'done':mode}">${head}${body}</div>${sheetHtml()}`;
 }
 function classicBar(){return `<div class="rc-classic-bar"><span>Registro clásico de esta partida</span><button type="button" class="btn outline" onclick="MiBowlingRegistroCompacto.compact()">Volver al registro nuevo</button></div>`}
 function settingsCard(){
  return `<div class="card" id="rc-settings"><h2>Registro de partidas</h2><p class="hint">Registro en una sola pantalla: bolos en pie, cantidad o solo la puntuación final. Las partidas por cantidad o solo puntuación cuentan para media y mejores marcas, pero no para el análisis de bolos, pocket o splits.</p><label class="switch"><input type="checkbox" id="rc-toggle" ${enabled()?'checked':''} onchange="MiBowlingRegistroCompacto.setEnabled(this.checked)"> Usar el registro nuevo</label><label class="field" for="rc-mode-def">Forma de anotar por defecto</label><select class="input" id="rc-mode-def" onchange="MiBowlingRegistroCompacto.chooseDefault(this.value,true)"><option value="" ${defaultMode()?'':'selected'}>Preguntar la primera vez</option>${MODES.map(m=>`<option value="${m}" ${defaultMode()===m?'selected':''}>${MODE_NAME[m]}</option>`).join('')}</select></div>`;
 }
 const api={
  PREF,MODE,active,render,classicBar,settingsCard,syncBody,enabled,
  setEnabled(on){put(PREF,on?null:'0');classicGameId=null},
  classic(){sheet=null;classicGameId=currentGameId();rerender()},
  compact(){classicGameId=null;rerender()},
  openSheet(k){sheet=k;rerender()},
  closeSheet(){if(sheet==='modo'&&!defaultMode())put(MODE,'bolos');sheet=null;rerender()},
  chooseDefault(m,stay){if(!m){put(MODE,null);return}if(!MODES.includes(m))return;put(MODE,m);const id=currentGameId();if(id&&!stay){const g=game(session());if(!(m==='final'&&g.rolls.length))modeByGame[id]=m}sheet=null;if(document.querySelector('.rc-root'))rerender()},
  mode(m){const s=session();if(!s||!MODES.includes(m))return;const g=game(s),n=next(g);if(n.done)return;if(m==='bolos'&&!n.available)return;if(m==='final'&&g.rolls.length)return;modeByGame[g.id]=m;selection=[];rerender()},
  pins(kind){const s=session();if(!s)return;const n=next(game(s));if(n.done||!n.available)return;
   const ok=kind==='canal'?recordThrow({pins:[]}):kind==='foul'?recordThrow({pins:[],foul:true}):recordThrow({pins:n.available.filter(p=>!selection.includes(p))});
   if(ok)rerender()},
  count(v){const ok=v==='F'?recordThrow({foul:true}):recordThrow({count:v});if(ok)rerender()},
  finalInput(el){el.value=el.value.replace(/\D/g,'').slice(0,3);const v=Number(el.value);const b=document.getElementById('rc-final-save');if(b)b.disabled=!(el.value!==''&&v>=0&&v<=300)},
  saveFinal(){const el=document.getElementById('rc-final-input');if(!el||el.value==='')return;if(setFinalOnly(Number(el.value)))rerender();else alert('Introduce una puntuación de 0 a 300.')},
  undo(){if(undoLast())rerender()},
  fix(f){const s=session();if(!s)return;const g=game(s);if(!rollsIn(g,f).length)return;if(!confirm(`¿Corregir el frame ${f}? Se borrarán sus tiradas y las posteriores para anotarlas de nuevo.`))return;if(rewindFrame(f))rerender()},
  nextGame(){if(ligaReturn){ligaBack();return}if(nextGameQuick())rerender()},
  finishTournament(){sheet=null;classicGameId=null;abrirTorneoParejas()},
  tip(){hideTip=true;rerender()}
 };
 window.MiBowlingRegistroCompacto=Object.freeze(api);
})();
