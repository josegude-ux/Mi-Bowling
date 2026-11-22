'use strict';
/* MI BOWLING · Registro compacto (prueba, opcional).
 * Vista alternativa del registro de la partida, inspirada en el diseño CP021/CP032.
 * NO tiene almacenamiento propio: cada acción llama a las funciones existentes de la app
 * (togglePin, recordRoll, fastRoll, foulRoll, undoRoll, changeBall, addGame) y, por tanto,
 * guarda exactamente en el mismo formato v2 y por la misma vía protegida (MiBowlingEscritura).
 * Solo modo «Bolos»: «Cantidad» y «Solo puntuación» necesitan el formato v3, aún no homologado.
 * La preferencia se guarda fuera del prefijo mi-bowling- para no entrar en copias ni restauraciones.
 */
(function(){
 const PREF='mibowling.pref.registro-compacto';
 let classicGameId=null;
 function readPref(){try{return localStorage.getItem(PREF)==='1'}catch(e){return false}}
 function writePref(on){try{if(on)localStorage.setItem(PREF,'1');else localStorage.removeItem(PREF)}catch(e){alert('No se pudo guardar la preferencia.')}}
 function currentGameId(){try{const s=session();return s?game(s)?.id||null:null}catch(e){return null}}
 function active(){return readPref()&&!(classicGameId&&classicGameId===currentGameId())}

 const CSS=`
body.rc-open{overflow:hidden}
.rc-root{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;gap:clamp(6px,1.3vh,12px);
 padding:calc(env(safe-area-inset-top,0px) + 10px) 14px calc(env(safe-area-inset-bottom,0px) + 12px);
 background:#080809;color:#faf9f7;font-family:inherit;overflow:hidden;-webkit-user-select:none;user-select:none}
.rc-root *{box-sizing:border-box}
.rc-head{display:flex;align-items:center;gap:10px}
.rc-round{flex:0 0 auto;width:46px;height:46px;border-radius:50%;border:1px solid #414146;background:#1e1e21;color:#faf9f7;font-size:20px;display:grid;place-items:center}
.rc-title{flex:1;min-width:0;text-align:center}
.rc-title small{display:block;color:#f36a3d;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rc-title b{display:block;font-size:20px;line-height:1.2}
.rc-board{display:grid;grid-template-columns:repeat(9,1fr) 1.35fr;border:1px solid #414146;border-radius:14px;overflow:hidden;background:#0d0d0f}
.rc-frame{display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:4px 1px;min-height:clamp(52px,8.4vh,78px);border-right:1px solid #2c2c30}
.rc-frame:last-child{border-right:0}
.rc-frame.cur{background:#2a140c;box-shadow:inset 0 0 0 2px #f36a3d}
.rc-frame i{font-style:normal;font-size:10px;color:#a6a5ad}
.rc-frame em{font-style:normal;font-size:12px;font-weight:700;white-space:nowrap;letter-spacing:-.02em}
.rc-frame strong{font-size:13px;min-height:16px}
.rc-score{display:flex;align-items:baseline;justify-content:space-between}
.rc-score span{color:#a6a5ad;font-size:15px}
.rc-score b{font-size:30px;line-height:1}
.rc-score small{color:#a6a5ad;font-size:13px;margin-right:6px}
.rc-mode{display:flex;gap:4px;padding:4px;border-radius:999px;background:#1e1e21}
.rc-mode button{flex:1;border:0;border-radius:999px;padding:9px 4px;background:transparent;color:#a6a5ad;font:inherit;font-size:14px;font-weight:700}
.rc-mode button[aria-selected="true"]{background:#5d5d63;color:#fff}
.rc-mode button:disabled{opacity:.45}
.rc-turn{text-align:center;font-size:18px;font-weight:800;margin:0}
.rc-turn span{font-size:12px;font-weight:600;color:#a6a5ad}
.rc-ball{display:flex;align-items:center;gap:8px;border:1px solid #414146;border-radius:14px;background:#1e1e21;padding:6px 10px}
.rc-ball label{font-size:13px;color:#a6a5ad;white-space:nowrap}
.rc-ball select{flex:1;min-width:0;background:transparent;color:#faf9f7;border:0;font:inherit;font-weight:700;font-size:15px;padding:6px 0}
.rc-ball select option{color:#111}
.rc-hint{text-align:center;color:#a6a5ad;font-size:14px;margin:0}
.rc-rack{flex:1;min-height:0;display:flex;flex-direction:column-reverse;justify-content:center;align-items:center;gap:clamp(6px,1.4vh,14px)}
.rc-row{display:flex;gap:clamp(8px,3vw,16px)}
.rc-pin{width:clamp(44px,min(12.5vw,7vh),58px);height:clamp(44px,min(12.5vw,7vh),58px);border-radius:50%;border:3px solid #f36a3d;background:#111113;color:#7d8fa6;font:inherit;font-size:20px;font-weight:800;box-shadow:0 4px 0 #d8d8dc33}
.rc-pin[aria-pressed="true"]{background:#faf9f7;color:#180d09;border-color:#faf9f7}
.rc-pin:disabled{border-color:#2c2c30;color:#3b3b40;background:#0d0d0f;box-shadow:none}
.rc-quick{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rc-btn{border:0;border-radius:16px;padding:13px 8px;background:#28282c;color:#faf9f7;font:inherit;font-size:17px;font-weight:700}
.rc-foot{display:grid;grid-template-columns:64px 1fr;gap:10px}
.rc-undo{border:0;border-radius:16px;background:#1e1e21;color:#f36a3d;font-size:26px}
.rc-undo:disabled{color:#5a3a2e}
.rc-submit{border:0;border-radius:16px;padding:16px 8px;background:#f36a3d;color:#180d09;font:inherit;font-size:20px;font-weight:800}
.rc-note{margin:0;text-align:center;font-size:11px;color:#f36a3d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rc-done{flex:1;overflow:auto;-webkit-user-select:text;user-select:text}
.rc-done .rc-final{text-align:center;padding:16px 0}
.rc-done .rc-final b{display:block;font-size:64px;line-height:1.05}
.rc-done .rc-final span{color:#a6a5ad}
.rc-done .rc-light{background:#fff;color:#102e48;border-radius:16px;padding:2px}
.rc-hint{flex:0 0 auto}
@media (max-height:740px){.rc-root{gap:6px;padding-top:calc(env(safe-area-inset-top,0px) + 6px)}.rc-round{width:40px;height:40px}.rc-title b{font-size:18px}.rc-frame{min-height:44px;padding:2px 1px}.rc-score b{font-size:24px}.rc-mode button{padding:6px 4px;font-size:13px}.rc-turn{font-size:16px}.rc-ball{padding:2px 10px}.rc-hint,.rc-note{display:none}.rc-rack{gap:5px}.rc-btn{padding:10px 8px;font-size:16px}.rc-submit{padding:12px 8px;font-size:18px}.rc-pin{font-size:18px}}
.rc-classic-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;padding:10px 12px;border-radius:12px;background:#fff3ee;color:#7a2d12;font-size:14px}
`;
 function ensureCss(){if(document.getElementById('rc-css'))return;const st=document.createElement('style');st.id='rc-css';st.textContent=CSS;document.head.appendChild(st)}
 function syncBody(open){document.body.classList.toggle('rc-open',!!open)}

 function boardHtml(g,n){
  const scores=frameScores(g);
  return '<div class="rc-board" role="group" aria-label="Marcador">'+Array.from({length:10},(_,i)=>{const f=i+1,m=frameLabel(g,f)||'·',cur=!n.done&&n.frame===f;
   return `<div class="rc-frame ${cur?'cur':''}" aria-label="Frame ${f}: ${esc(m)}${scores[i]!=null?', acumulado '+scores[i]:''}"><i>${f}</i><em>${esc(m)}</em><strong>${scores[i]??''}</strong></div>`}).join('')+'</div>';
 }
 function rackHtml(n){
  return '<div class="rc-rack">'+RACK.slice().reverse().map(row=>'<div class="rc-row">'+row.map(p=>{const can=n.available.includes(p),up=selection.includes(p);
   return `<button type="button" class="rc-pin" data-rc-pin="${p}" onclick="togglePin(${p})" ${can?'':'disabled'} aria-pressed="${up}" aria-label="Bolo ${p}: ${!can?'ya derribado':up?'en pie':'derribado'}">${p}</button>`}).join('')+'</div>').join('')+'</div>';
 }
 function render(){
  ensureCss();
  const s=session();if(!s)return null;
  const g=game(s),n=next(g),lane=n.done?currentLane(g,10):currentLane(g,n.frame);
  const where=lane.pair?`Par ${lane.pair.join('–')} · Pista ${lane.lane}`:lane.lane?`Pista ${lane.lane}`:'';
  const back=ligaReturn?'ligaBack()':"go('historial')";
  const head=`<div class="rc-head"><button type="button" class="rc-round" onclick="${back}" aria-label="${ligaReturn?'Volver a Liga':'Salir del registro'}">‹</button>
   <div class="rc-title"><small>${esc(s.title||classificationLabel(s))}${where?' · '+esc(where):''}</small><b>Partida ${s.games.length}</b></div>
   <button type="button" class="rc-round" onclick="MiBowlingRegistroCompacto.classic()" aria-label="Más opciones: vista clásica (línea, par, historial)">⋯</button></div>`;
  const total=score(g);
  if(n.done){
   const completed=s.games.filter(complete).length;
   return `<div class="rc-root" data-rc="done">${head}${boardHtml(g,n)}<div class="rc-done"><div class="rc-final"><span>Partida terminada</span><b>${total}</b><span>${completed} partida(s) completas en esta sesión</span></div>
    <div class="rc-quick">${ligaReturn?'<button type="button" class="rc-btn" onclick="ligaBack()">✓ Guardar y volver a Liga</button><span></span>':`<button type="button" class="rc-btn" onclick="showNext=!showNext;render()">＋ Siguiente partida</button><button type="button" class="rc-btn" onclick="go('historial')">Guardar y salir</button>`}</div>
    ${showNext&&!ligaReturn?`<div class="rc-light" style="margin-top:12px">${nextGameForm(s,g)}</div>`:''}</div></div>`;
  }
  const down=n.available.length-selection.length;
  const label=selection.length===0?(n.available.length===10?'Strike':(n.frame===10||n.ball===2?'Spare · todos derribados':'Todos derribados')):`Registrar ${down} derribado${down===1?'':'s'}`;
  const ball=ballSelect('roll-ball','ballId',s.currentBallId).replace('<select class="input" ','<select onchange="changeBall(this.value)" ');
  return `<div class="rc-root" data-rc="play">${head}${boardHtml(g,n)}
   <div class="rc-score"><span>Puntuación actual</span><span><small>Parcial</small><b>${total}</b></span></div>
   <div class="rc-mode" role="tablist" aria-label="Forma de anotar"><button type="button" role="tab" aria-selected="true">Bolos</button><button type="button" role="tab" aria-selected="false" disabled title="Necesita el formato v3, aún en pruebas">Cantidad</button><button type="button" role="tab" aria-selected="false" disabled title="Necesita el formato v3, aún en pruebas">Solo puntuación</button></div>
   <p class="rc-turn">Frame ${n.frame}, bola ${n.ball} <span>· ${n.available.length} bolos disponibles</span></p>
   <div class="rc-ball"><label for="roll-ball">Bola</label>${ball}</div>
   <p class="rc-hint">Toca los bolos que quedan en pie</p>
   ${rackHtml(n)}
   <div class="rc-quick"><button type="button" class="rc-btn" onclick="fastRoll(true)">– Canal</button><button type="button" class="rc-btn" onclick="foulRoll()">⚠ Falta</button></div>
   <div class="rc-foot"><button type="button" class="rc-undo" onclick="undoRoll()" ${g.rolls.length?'':'disabled'} aria-label="Deshacer último lanzamiento">↶</button><button type="button" class="rc-submit" id="quick-record" onclick="recordRoll()">${label}</button></div>
   <p class="rc-note">Registro compacto (prueba) · se guarda como siempre en tu historial</p></div>`;
 }
 function classicBar(){return `<div class="rc-classic-bar"><span>Vista clásica de esta partida</span><button type="button" class="btn outline" onclick="MiBowlingRegistroCompacto.compact()">Volver al compacto</button></div>`}
 function settingsCard(){const on=readPref();
  return `<div class="card" id="rc-settings"><h2>Registro compacto <span class="pill orange">Prueba</span></h2><p class="hint">Pantalla de anotación en una sola vista, con bolos grandes. Guarda en tu historial exactamente igual que el registro clásico. Desde «⋯» puedes abrir la vista clásica para cambiar par, línea o corregir tiradas. Los modos «Cantidad» y «Solo puntuación» todavía no están disponibles.</p><label class="switch"><input type="checkbox" id="rc-toggle" ${on?'checked':''} onchange="MiBowlingRegistroCompacto.setEnabled(this.checked)"> Usar el registro compacto</label></div>`}
 window.MiBowlingRegistroCompacto=Object.freeze({
  PREF,active,render,classicBar,settingsCard,syncBody,
  enabled:readPref,
  setEnabled(on){writePref(!!on);classicGameId=null},
  classic(){classicGameId=currentGameId();window.render()},
  compact(){classicGameId=null;window.render()}
 });
})();
