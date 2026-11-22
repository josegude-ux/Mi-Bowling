/* CP021 - Integrated registration in existing PWA; synthetic-only, localhost guard. */
(function(){'use strict';
const loc=window.location;
const allowed=(loc.hostname==='localhost'||loc.hostname==='127.0.0.1')&&window.isSecureContext===true&&new URLSearchParams(loc.search).get('cp032lab')==='ficticio';
const protectedKeys=window.MiBowlingAutoridad?.KEYS||[];
let empty=false;try{empty=protectedKeys.length===8&&Object.keys(window.localStorage).every(key=>!key.startsWith('mi-bowling-'))&&protectedKeys.every(key=>window.localStorage.getItem(key)===null)}catch(e){empty=false}
const enabled=!!(allowed&&empty&&window.BowlingCp013Engine&&window.BowlingCp014Compat&&window.BowlingCp016Coexist);
const markup="<section class=\"screen\" aria-label=\"Simulador de anotación MI BOWLING con adaptador CP014 y datos ficticios\">\n  <header class=\"header\">\n    <button class=\"round\" type=\"button\" aria-label=\"Volver a la maqueta\" id=\"back\"><svg fill=\"none\" viewBox=\"0 0 24 24\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m15 18-6-6 6-6\"/></svg></button>\n    <div class=\"header-title\"><div class=\"eyebrow\">MI BOWLING · LAB · CP015</div><h1>Partida 1 · LAB</h1></div>\n    <button class=\"round\" type=\"button\" aria-label=\"Información de la maqueta\" id=\"info\"><svg fill=\"none\" viewBox=\"0 0 24 24\" stroke-width=\"2\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 10v6M12 7h.01\"/></svg></button>\n  </header>\n  <div class=\"scoreboard\" aria-label=\"Marcador de diez frames de la partida ficticia\" id=\"scoreboard\"></div>\n  <div class=\"scoreline\"><span class=\"score-label\">Puntuación actual</span><span><span class=\"score-note\">Parcial</span><strong class=\"score-value\">0</strong></span></div>\n  <div class=\"tabs\" role=\"tablist\" aria-label=\"Método de anotación\">\n    <button type=\"button\" class=\"tab\" role=\"tab\" id=\"tab-bolos\" aria-controls=\"panel-bolos\" aria-selected=\"true\" data-mode=\"bolos\">Bolos</button>\n    <button type=\"button\" class=\"tab\" role=\"tab\" id=\"tab-cantidad\" aria-controls=\"panel-cantidad\" aria-selected=\"false\" data-mode=\"cantidad\">Cantidad</button>\n    <button type=\"button\" class=\"tab\" role=\"tab\" id=\"tab-final\" aria-controls=\"panel-final\" aria-selected=\"false\" data-mode=\"final\">Solo puntuación</button>\n  </div>\n  <section class=\"mode-shell\" role=\"tabpanel\" aria-label=\"Anotación en demostración\" id=\"mode-shell\">\n    <div class=\"mode-title\" id=\"mode-title\">Frame 1, bola 1 <span class=\"sub\">· 10 bolos disponibles</span></div>\n    <div class=\"ball-row\" id=\"ball-row\">\n      <button type=\"button\" class=\"ball-btn\" data-ball=\"strike\"><span class=\"ball-caption\">Bola strike</span><strong id=\"strike-ball\">Sin definir</strong></button>\n      <button type=\"button\" class=\"ball-btn\" data-ball=\"spare\"><span class=\"ball-caption\">Bola spare</span><strong id=\"spare-ball\">Sin definir</strong></button>\n    </div>\n    <p class=\"hint\" id=\"mode-hint\">Toca los bolos que quedan en pie</p>\n    <div class=\"work-area\" id=\"panel-bolos\"><div class=\"rack\" role=\"group\" aria-label=\"Bolos que quedan en pie\" id=\"rack\"></div></div>\n    <div class=\"work-area\" id=\"panel-cantidad\" hidden><div class=\"quantity-grid\" aria-label=\"Introducir cantidad de bolos derribados\" id=\"quantity-grid\"></div></div>\n    <div class=\"work-area\" id=\"panel-final\" hidden>\n      <div class=\"final-form\"><label class=\"final-heading\" for=\"final-score\">Puntuación final</label><input class=\"final-input\" id=\"final-score\" type=\"text\" readonly inputmode=\"none\" maxlength=\"3\" placeholder=\"—\" aria-describedby=\"final-description\" aria-label=\"Resultado final mediante teclado en pantalla\"><div class=\"final-pad\" id=\"final-pad\" role=\"group\" aria-label=\"Teclado para puntuación final\"></div><p class=\"final-description\" id=\"final-description\">Sin frames inventados. Sin frames inventados. Solo JSON ficticio, sin guardado automático.</p></div>\n    </div>\n    <div class=\"quickrow\" id=\"quickrow\"><button type=\"button\" class=\"quick\" id=\"channel\">− &nbsp; Canal</button><button type=\"button\" class=\"quick\" id=\"foul\">⚠ &nbsp; Falta</button></div>\n    <div class=\"finished-summary\" id=\"finished-summary\" hidden><span class=\"finished-caption\">Partida finalizada</span><strong id=\"finished-score\">0</strong><p>Resultado ficticio · no se guarda en la aplicación</p></div>\n  </section>\n  <div class=\"status\" role=\"status\" aria-live=\"polite\" id=\"status\"></div>\n  <footer class=\"footer\"><button type=\"button\" class=\"undo\" id=\"undo\" aria-label=\"Deshacer último registro\">↶</button><button type=\"button\" class=\"action\" id=\"submit\">Strike</button></footer>\n</section>\n<dialog id=\"lab-io\" aria-label=\"Datos ficticios de laboratorio\">\n  <h2>Datos de prueba · CP015</h2><p id=\"io-kind\">Formato v3 ficticio · sin guardado automático</p>\n  <p id=\"io-summary\">—</p>\n  <div class=\"io-grid\">\n    <button type=\"button\" id=\"io-export\" class=\"io-btn primary\">Exportar JSON ficticio</button>\n    <button type=\"button\" id=\"io-import\" class=\"io-btn\">Importar JSON ficticio</button>\n    <button type=\"button\" id=\"io-reopen\" class=\"io-btn\">Reabrir último exportado</button>\n    <button type=\"button\" id=\"io-example\" class=\"io-btn\">Cargar ejemplo v2 ficticio</button>\n  </div>\n  <input type=\"file\" id=\"io-file\" accept=\"application/json,.json\" hidden>\n  <p id=\"io-feedback\" role=\"status\" aria-live=\"polite\"></p>\n  <p>Solo acepta archivos con marcador de laboratorio CP015. Al cerrar o recargar la página, los cambios de memoria desaparecen; para recuperarlos posteriormente, vuelve a importar el JSON descargado. No conecta con la aplicación real.</p>\n  <button type=\"button\" id=\"io-close\" class=\"io-btn\" style=\"width:100%\">Volver a la partida</button>\n</dialog>";
const css=".cp021-root{color-scheme:dark;--black:#080809;--surface:#1e1e21;--surface-2:#28282c;--surface-3:#343438;--line:#414146;--text:#faf9f7;--muted:#a6a5ad;--accent:#f36a3d;--accent-light:#ff936e;--ink:#180d09;--test-safe-top:0px;--test-safe-bottom:0px}\n@scope (.cp021-root) {\n\n\n*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;overscroll-behavior:none}body{background:#080809;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,\"SF Pro Text\",Inter,\"Segoe UI\",sans-serif;-webkit-font-smoothing:antialiased}button,input{font:inherit}button{color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}button:focus-visible,input:focus-visible{outline:3px solid #ffd1bc;outline-offset:2px}button:disabled{opacity:.42;cursor:default}\n.screen{width:min(100%,560px);height:100vh;height:100dvh;margin:0 auto;padding:max(8px,env(safe-area-inset-top,0px),var(--test-safe-top)) 12px max(8px,env(safe-area-inset-bottom,0px),var(--test-safe-bottom));display:flex;flex-direction:column;gap:clamp(4px,.8dvh,9px);overflow:hidden;background:var(--black)}\n.header{display:grid;grid-template-columns:48px minmax(0,1fr)48px;align-items:center;gap:8px;min-height:48px;flex-shrink:0}.header-title{text-align:center;min-width:0}.eyebrow{font-size:10px;letter-spacing:.13em;font-weight:750;text-transform:uppercase;color:var(--accent-light);line-height:1.1}.header h1{font-size:clamp(16px,4.4vw,20px);font-weight:750;letter-spacing:-.025em;margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.round{border:1px solid var(--line);background:var(--surface);border-radius:50%;width:46px;height:46px;display:grid;place-items:center;font-size:25px}.round svg{width:23px;height:23px;stroke:currentColor}\n.scoreboard{height:clamp(69px,9.7dvh,89px);min-height:68px;border:1px solid #46464c;border-radius:11px;display:grid;grid-template-columns:repeat(9,minmax(0,1fr)) minmax(0,1.4fr);overflow:hidden;flex-shrink:0}.frame{min-width:0;padding:4px 1px;border-right:1px solid #414146;display:flex;align-items:center;justify-content:space-between;flex-direction:column;gap:0}.frame:last-child{border-right:0}.frame.current{box-shadow:inset 0 0 0 2px var(--accent);background:linear-gradient(180deg,#3e1d13 0%,#29140f 100%)}.frame-index{font-size:clamp(10px,2.5vw,12px);color:var(--muted);line-height:1}.frame-roll{font-size:clamp(11px,3vw,17px);font-weight:720;line-height:1.15;white-space:nowrap}.frame-score{font-weight:780;font-variant-numeric:tabular-nums;font-size:clamp(10px,2.9vw,16px);line-height:1.12}.frame .empty{color:#69686e}\n.scoreline{min-height:29px;display:flex;justify-content:space-between;align-items:center;gap:7px;flex-shrink:0}.score-label{font-size:clamp(13px,3.5vw,16px);color:var(--muted);font-weight:480}.score-value{font-size:clamp(22px,5.8vw,29px);font-weight:800;font-variant-numeric:tabular-nums}.score-note{font-size:11px;color:var(--muted);padding-right:6px}\n.tabs{height:50px;flex-shrink:0;display:grid;grid-template-columns:1fr 1fr 1.17fr;border-radius:23px;background:var(--surface);padding:3px;gap:3px}.tab{border:0;border-radius:20px;background:transparent;color:var(--text);font-size:clamp(12px,3.5vw,15px);line-height:1;font-weight:540;min-width:0;min-height:44px;white-space:nowrap}.tab[aria-selected=\"true\"]{background:#606064;font-weight:720;box-shadow:0 1px 3px #0008}\n.mode-shell{flex:1;min-height:0;display:flex;flex-direction:column;gap:clamp(4px,.75dvh,9px);overflow:hidden}.mode-title{min-height:26px;flex:0 0 auto;text-align:center;display:flex;align-items:center;justify-content:center;gap:10px;font-size:clamp(15px,4vw,19px);font-weight:740}.mode-title .sub{font-size:11px;font-weight:580;color:var(--muted)}.ball-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;flex-shrink:0}.ball-btn{min-height:44px;border:1px solid #343438;border-radius:13px;background:var(--surface);display:flex;align-items:center;justify-content:center;gap:5px;min-width:0;padding:0 7px;font-size:clamp(11px,3.0vw,13px)}.ball-btn .ball-caption{color:var(--muted);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.ball-btn strong{font-size:clamp(11px,3.0vw,13px);font-weight:750;white-space:nowrap}.work-area{min-height:0;flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:clamp(3px,.8dvh,10px);overflow:hidden}.work-area[hidden],.ball-row[hidden],.quickrow[hidden],.mode-title[hidden],.footer[hidden]{display:none!important}.hint{flex-shrink:0;color:var(--muted);text-align:center;font-size:clamp(10px,2.8vw,12px);line-height:1.15;margin:0;padding:0 2px}.rack{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:clamp(3px,.65dvh,8px);width:100%;max-height:100%;min-height:0}.pin-row{display:flex;gap:clamp(7px,2.1vw,13px);justify-content:center}.pin{width:clamp(44px,5.7dvh,57px);height:clamp(44px,5.7dvh,57px);min-width:44px;min-height:44px;border-radius:50%;border:3px solid var(--accent);background:transparent;font-size:clamp(16px,4.5vw,20px);font-weight:760;display:grid;place-items:center}.pin[aria-pressed=\"true\"]{background:var(--accent);color:var(--ink)}.pin:active{transform:scale(.95)}\n.quickrow{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex-shrink:0;min-height:44px}.quick{min-height:44px;border:0;background:var(--surface-3);border-radius:15px;font-size:clamp(13px,3.7vw,16px);font-weight:570}.quick.small{font-size:13px}\n.footer{height:clamp(49px,6.8dvh,60px);flex-shrink:0;display:grid;grid-template-columns:54px 1fr;gap:9px}.undo{border:0;background:var(--surface-2);border-radius:18px;color:var(--accent);display:grid;place-items:center;font-size:30px;min-height:49px}.action{border:0;background:var(--accent);color:#16100e;border-radius:18px;font-size:clamp(15px,4.2vw,20px);font-weight:830;min-height:49px;letter-spacing:-.01em}.action.secondary{background:#515156;color:white}.quantity-grid{width:100%;max-width:410px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(3,minmax(44px,1fr));gap:clamp(5px,.9dvh,11px);height:100%;max-height:270px;min-height:0}.qty{border:1px solid transparent;border-radius:18px;background:var(--surface-2);font-size:clamp(21px,5.7vw,27px);font-weight:790;color:var(--accent)}.qty[aria-pressed=\"true\"]{background:var(--accent);color:var(--ink)}.qty:active{transform:scale(.97)}.qty[data-kind=\"special\"]{font-size:clamp(17px,4.9vw,23px)}\n.final-form{width:100%;max-width:450px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:clamp(9px,2dvh,23px)}.final-heading{color:var(--muted);font-size:clamp(18px,5vw,26px);font-weight:700;text-align:center}.final-input{width:min(85%,320px);height:clamp(74px,14dvh,116px);border:1px solid var(--line);border-radius:22px;text-align:center;background:var(--surface);color:var(--text);font-size:clamp(44px,11vw,74px);font-weight:850;letter-spacing:.01em;font-variant-numeric:tabular-nums}.final-description{font-size:12px;color:var(--muted);text-align:center;max-width:300px;line-height:1.35}.status{flex-shrink:0;min-height:16px;line-height:1.15;color:var(--accent-light);font-size:10px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.status:empty{visibility:hidden}\n.demo-banner{display:none} .screen.preview-debug .demo-banner{display:block;color:var(--accent-light)}\n@media(max-height:730px){.screen{gap:4px;padding-top:max(5px,env(safe-area-inset-top,0px),var(--test-safe-top));padding-bottom:max(5px,env(safe-area-inset-bottom,0px),var(--test-safe-bottom))}.header{min-height:42px;grid-template-columns:44px minmax(0,1fr)44px}.round{width:44px;height:44px}.scoreboard{height:65px;min-height:65px}.scoreline{min-height:23px}.score-value{font-size:22px}.tabs{height:50px}.mode-shell{gap:4px}.mode-title{min-height:23px}.ball-btn{min-height:44px}.hint{font-size:10px}.pin-row{gap:7px}.rack{gap:3px}.quickrow{min-height:44px}.footer{height:49px}.status{min-height:12px;font-size:9px}.qty{border-radius:14px}}\n@media(max-width:355px){.screen{padding-left:8px;padding-right:8px}.frame-index{font-size:10px}.frame-roll,.frame-score{font-size:10px}.ball-btn{font-size:10px}.pin-row{gap:5px}}\n@media(prefers-reduced-motion:no-preference){button{transition:background-color .12s ease,transform .12s ease}}\n\n/* CP013 -- entirely scoped to independent offline prototype */\n.pin.unavailable{opacity:.17;border-color:#555;cursor:default}\n.finished-summary{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(7px,1.6dvh,14px);text-align:center}\n.finished-summary[hidden]{display:none!important}\n.finished-summary strong{font-size:clamp(72px,18vw,110px);line-height:1;font-weight:850;letter-spacing:-.05em;font-variant-numeric:tabular-nums;color:var(--text)}\n.finished-caption{font-size:clamp(17px,4.6vw,23px);font-weight:720}.finished-summary p{font-size:clamp(11px,3vw,13px);color:var(--muted);max-width:300px;margin:0}\n.final-form{gap:clamp(6px,.8dvh,9px);width:100%;height:100%;min-height:0;justify-content:center}\n.final-input{height:clamp(49px,9dvh,76px);min-height:49px;font-size:clamp(32px,8vw,52px);pointer-events:none}\n.final-pad{width:min(92%,380px);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(3,minmax(44px,1fr));gap:5px;min-height:0;height:min(23dvh,183px);flex-shrink:0}\n.final-key{min-height:44px;min-width:44px;border:0;background:var(--surface-2);border-radius:13px;color:var(--accent);font-size:clamp(18px,5vw,22px);font-weight:760}\n.final-key:active{background:var(--accent);color:var(--ink)}\n.final-heading{font-size:clamp(14px,4.2vw,19px)}\n.final-description{font-size:clamp(10px,2.6vw,12px);line-height:1.16}\n@media(max-height:730px){.final-pad{height:140px;gap:4px}.final-form{gap:4px}.final-input{height:49px}.final-heading{font-size:16px}.final-description{max-width:300px;font-size:10px}}\n\n/* CP015 — import/export dialog is outside the one-screen scoring layout */\n#lab-io{width:min(calc(100% - 24px),510px);max-height:calc(100dvh - 36px);border:1px solid #54545a;border-radius:24px;background:#222226;color:#fbf9f7;padding:19px;box-shadow:0 18px 80px #000b;overflow:auto;overscroll-behavior:contain}\n#lab-io::backdrop{background:#000c}\n#lab-io h2{font-size:20px;margin:2px 0 10px}\n#lab-io p{font-size:13px;color:#c5c4cd;line-height:1.4}\n.io-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}\n.io-btn{min-height:50px;border:1px solid #46464a;border-radius:14px;background:#333338;font-size:13px;font-weight:700;padding:10px}\n.io-btn.primary{color:#17110d;background:var(--accent);border:0}\n#io-feedback{min-height:32px;font-weight:650;color:var(--accent-light)}\n#io-summary{color:white!important;font-weight:680}\n\n}\n\n/* LAB only: never visible outside the CP021 screen. */\nbody:has(.cp021-root) .topbar,body:has(.cp021-root) .bottom-nav,body:has(.cp021-root) .design-lab-sidebar{display:none!important}\nbody:has(.cp021-root) .app-main{max-width:none!important;width:100%!important;margin:0!important;padding:0!important;min-height:0!important}\nbody:has(.cp021-root){margin:0!important;padding:0!important;overflow:hidden!important;width:100vw!important;height:100dvh!important}\n.cp021-root{display:block;width:100vw;height:100dvh;overflow:hidden;background:#080809;color:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,\"SF Pro Text\",Inter,\"Segoe UI\",sans-serif}\n.cp021-root *, .cp021-root *::before,.cp021-root *::after{box-sizing:border-box}\n";
let mounted=false,syntheticStore=null,loadingStore=null;
async function getStore(){
 if(!enabled)throw Error('CP021_INACTIVE');
 if(!window.MiBowlingCP018){
  if(!loadingStore)loadingStore=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='./lab/registro-cp021/cp018-persistence.js';
   script.onload=()=>resolve();
   script.onerror=()=>reject(Error('CP018_MODULE_LOAD_FAILED'));
   document.head.appendChild(script);
  });
  await loadingStore;
 }
 if(!syntheticStore)syntheticStore=new window.MiBowlingCP018.CP018Store();
 return syntheticStore;
}

let loadingCP025=null;
function cp025Gate(){
 const ok=enabled&&(loc.hostname==='localhost'||loc.hostname==='127.0.0.1')&&new URLSearchParams(loc.search).get('cp032lab')==='ficticio';
 if(!ok)throw Error('CP025_LAB_ONLY');
 try{if(protectedKeys.some(k=>window.localStorage.getItem(k)!==null))throw Error('CP025_EXISTING_DATA_PROTECTED');}
 catch(e){if(e.message==='CP025_EXISTING_DATA_PROTECTED')throw e;throw Error('CP025_STORAGE_UNAVAILABLE')}
}
async function cp025Module(){
 cp025Gate();await getStore();
 if(!window.BowlingCp025V3){
  if(!loadingCP025)loadingCP025=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='./lab/registro-cp021/cp025-v3-adapter.js';
   script.onload=resolve;script.onerror=()=>reject(Error('CP025_MODULE_LOAD_FAILED'));
   document.head.appendChild(script);
  });
  await loadingCP025;
 }
 cp025Gate();
 if(!window.BowlingCp025V3||window.BowlingCp025V3.version!==3)throw Error('CP025_ADAPTER_MISSING');
 return window.BowlingCp025V3;
}
async function promoteV3Synthetic(){
 cp025Gate();const mod=await cp025Module();return mod.promote({getStore});
}
async function readV3Synthetic(){
 cp025Gate();const mod=await cp025Module();return mod.read({getStore});
}
async function rollbackV3Synthetic(){
 cp025Gate();const mod=await cp025Module();return mod.rollback({getStore});
}
async function promoteV3Demo(){
 cp025Gate();const store=await getStore();
 if(!(await store.row('sources'))){
  const C=window.BowlingCp016Coexist,legacy=C.buildLegacyFixture(),modern=C.buildFinalFixture(278);
  legacy.balls=[{id:'cp016-fake-ball-v2',name:'v2 mock ball'}];
  legacy.patterns=[{id:'cp016-fake-pattern-v2',name:'v2 mock pattern'}];
  modern.balls=[{id:'cp016-fake-ball-v3',name:'v3 mock ball'}];
  modern.patterns=[{id:'cp016-fake-pattern-v3',name:'v3 mock pattern'}];
  modern.sessions[0].type='oficial';
  cp025Gate();await store.seed(JSON.stringify(legacy),JSON.stringify(modern));
 }
 return promoteV3Synthetic();
}
function attachCP025Button(){
 const dialog=document.getElementById('lab-io');
 if(!enabled||!dialog||document.getElementById('cp025-v3-promote'))return;
 const button=document.createElement('button');button.type='button';
 button.id='cp025-v3-promote';button.className='io-btn';
 button.style.width='100%';button.textContent='Activar contrato v3 · solo partidas ficticias';
 const status=document.createElement('p');
 status.id='cp025-v3-status';status.setAttribute('role','status');
 button.addEventListener('click',async()=>{
  button.disabled=true;status.textContent='Comprobando respaldo y formato v3…';
  try{
   const r=await promoteV3Demo();const doc=await readV3Synthetic();
   status.textContent='Contrato v3 validado: '+r.totalGames+' partidas ficticias, media '+r.averageScore+' · '+doc.format;
  }catch(e){status.textContent='Contrato v3 detenido: '+e.message}
  finally{button.disabled=false}
 });
 const close=document.getElementById('io-close');
 dialog.insertBefore(button,close);dialog.insertBefore(status,close);
}

async function migrateSynthetic(){
 const store=await getStore(),C=window.BowlingCp016Coexist;
 const legacy=JSON.stringify(C.buildLegacyFixture()),modern=JSON.stringify(C.buildFinalFixture(278));
 await store.seed(legacy,modern);
 const stage=await store.stage();
 const active=await store.activate();
 const result=await store.read();
 return {stage,active,result};
}
function attachCP032JournalButtons(){
 const dialog=document.getElementById('lab-io');
 const api=window.MiBowlingCP032Journal,views=window.MiBowlingCP032Views;
 if(!enabled||!dialog||!api||!views||document.getElementById('cp032-save'))return;
 const row=document.createElement('div');row.className='io-grid';
 const make=(id,label)=>{
  const button=document.createElement('button');button.type='button';button.className='io-btn';
  button.id=id;button.textContent=label;row.append(button);return button;
 };
 const save=make('cp032-save','Guardar v3 ficticio'),reopen=make('cp032-reopen','Reabrir v3 ficticio');
 const rollback=make('cp032-rollback','Deshacer último guardado ficticio');
 const exportB=make('cp032-backup','Exportar respaldo v3 ficticio');
 const status=document.createElement('p');status.id='cp032-status';status.setAttribute('role','status');
 status.textContent='CP032 · Solo pruebas en localhost, sin escrituras personales.';
 async function execute(button,fn){
  button.disabled=true;status.textContent='Verificando contrato y journal ficticio…';
  try{status.textContent=await fn()}catch(e){status.textContent='CP032 detenido: '+e.message}
  finally{button.disabled=false}
 }
 save.addEventListener('click',()=>execute(save,async()=>{
  const doc=JSON.parse(window.__CP015_LAB.exportJSON()),summary=views.project(doc);
  const current=await api.read(),out=await api.save(doc,current.revision);
  return 'Guardado ficticio rev '+out.revision+' · '+summary.sessions[0].games.length+' partidas.';
 }));
 reopen.addEventListener('click',()=>execute(reopen,async()=>{
  const saved=await api.read();if(!saved.document)throw Error('No existe respaldo CP032');
  const previous=window.__CP015_LAB.exportJSON();
  try{window.__CP015_LAB.reopenJSON(JSON.stringify(saved.document))}
  catch(e){window.__CP015_LAB.reopenJSON(previous);throw e}
  const summary=views.project(saved.document);
  return 'Reabierta rev '+saved.revision+' · '+summary.summary.totalGames+
   ' partidas · '+summary.precision.finalOnly+' solo puntuación · '+summary.precision.countOnly+' cantidad.';
 }));
 rollback.addEventListener('click',()=>execute(rollback,async()=>{
  const active=await api.read(),back=await api.rollback(active.revision);
  if(back.restored!==null)window.__CP015_LAB.reopenJSON(JSON.stringify(back.restored));
  return 'Rollback ficticio verificado · rev '+back.revision;
 }));
 exportB.addEventListener('click',()=>execute(exportB,async()=>{
  const raw=await api.exportCopy(),value=api.parseCopy(raw),blob=new Blob([raw],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='mi-bowling-cp032-ficticio-v3.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  return 'Respaldo ficticio verificado · '+value.sessions.length+' sesión(es).';
 }));
 const close=document.getElementById('io-close');
 dialog.insertBefore(row,close);dialog.insertBefore(status,close);
}
function attachCP032PWAButtons(){
 const dialog=document.getElementById('lab-io'),A=window.MiBowlingCP032PWA,F=window.MiBowlingCP032Fixture,J=window.MiBowlingCP032Journal;
 if(!enabled||!dialog||!A||!F||!J||document.getElementById('cp032-pwa-load'))return;
 const row=document.createElement('div');row.className='io-grid';
 const button=(id,label)=>{
  const b=document.createElement('button');b.id=id;b.type='button';b.className='io-btn';b.textContent=label;row.append(b);return b;
 };
 const load=button('cp032-pwa-load','Cargar v2+liga FICTICIA');
 const inspect=button('cp032-pwa-inspect','Historial y estadísticas ficticios');
 const exportButton=button('cp032-pwa-export','Exportar respaldo ampliado ficticio');
 const restoreButton=button('cp032-pwa-restore','Restaurar JSON ficticio validado');
 const input=document.createElement('input');input.id='cp032-pwa-input';input.type='file';
 input.accept='.json,application/json';input.hidden=true;
 const status=document.createElement('p');status.id='cp032-pwa-status';status.setAttribute('role','status');
 status.textContent='CP032 · Claves personales bloqueadas. Todo aquí es ficticio.';
 const run=async(button,work)=>{button.disabled=true;status.textContent='Validando datos ficticios…';
  try{status.textContent=await work()}catch(e){status.textContent='CP032 NO GO: '+e.message}
  finally{button.disabled=false}};
 const doc=()=>JSON.parse(window.__CP015_LAB.exportJSON());
 const describe=(d)=>{
  const v=A.read(d),linked=v.league.flatMap(m=>m.players.flatMap(p=>p.scores)).filter(x=>x.source==='linked-complete').length;
  return 'Historial '+v.sessions.length+' sesiones · '+v.totals.count+' partidas estadísticas · media '+v.totals.average+
   ' · liga '+linked+' enlaces resueltos · fotos '+v.sourceMetadata.photos.length+' · PDF '+v.sourceMetadata.pdfs.length;
 };
 load.addEventListener('click',()=>run(load,async()=>{
  const sample=F.make(),next=A.attach(sample.modern,sample.rawMap,sample.assets);
  window.__CP015_LAB.reopenJSON(JSON.stringify(next));
  return 'Muestra PWA ficticia en memoria. '+describe(next)+' · Pulsa Guardar v3 ficticio para conservarla.';
 }));
 inspect.addEventListener('click',()=>run(inspect,async()=>describe(doc())));
 exportButton.addEventListener('click',()=>run(exportButton,async()=>{
  const raw=await A.exportExtended(doc());
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='MI-BOWLING-CP032-AMPLIADO-SOLO-FICTICIO.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
  return 'Respaldo v2+v3+liga ficticio verificado y descargado (sin fotos/PDF binarios).';
 }));
 restoreButton.addEventListener('click',()=>input.click());
 input.addEventListener('change',async(event)=>{
  const file=event.target.files?.[0];
  try{
   if(!file||file.size>2097152)throw Error('CP032_RESTORE_SIZE');
   const restored=await A.restoreExtended(await file.text()),prior=doc();
   const current=await J.read();
   // Validated backup is committed via the synthetic journal only, never the v2 store.
   await J.save(restored,current.revision);
   try{window.__CP015_LAB.reopenJSON(JSON.stringify(restored))}
   catch(e){window.__CP015_LAB.reopenJSON(JSON.stringify(prior));throw e}
   status.textContent='Restauración ficticia confirmada. '+describe(restored);
  }catch(e){status.textContent='CP032 restauración rechazada: '+e.message}
  finally{event.target.value=''}
 });
 const close=document.getElementById('io-close');
 dialog.insertBefore(row,close);dialog.insertBefore(input,close);dialog.insertBefore(status,close);
}
function attachMigrateButton(){
 const dialog=document.getElementById('lab-io');
 if(!dialog||document.getElementById('cp021-migrate-btn'))return;
 const button=document.createElement('button');
 button.type='button';button.id='cp021-migrate-btn';button.className='io-btn';
 button.style.width='100%';button.textContent='Probar backup y migración ficticia (CP018)';
 const status=document.createElement('p');status.id='cp021-migrate-status';status.setAttribute('role','status');
 button.addEventListener('click',async()=>{
  button.disabled=true;status.textContent='Verificando respaldo sintético…';
  try{const r=await migrateSynthetic();status.textContent='LAB CP018: '+r.result.mode+' · media '+r.result.stats.averageScore+' · solo datos ficticios';}
  catch(error){status.textContent='CP018 detenido: '+error.message;}
  finally{button.disabled=false}
 });
 dialog.insertBefore(button,document.getElementById('io-close'));dialog.insertBefore(status,document.getElementById('io-close'));
}
window.MiBowlingRegistroCP021=Object.freeze({
enabled,
render(){if(!enabled)throw Error('CP021_INACTIVE');mounted=false;return '<style id="cp021-css">'+css+'</style><div class="cp021-root">'+markup+'</div>';},
mount(){if(!enabled)return;if(mounted)return;const node=document.querySelector('.cp021-root');if(!node)throw Error('CP021_ROOT_MISSING');if(typeof window.MiBowlingCP021Mount!=='function')throw Error('CP021_CONTROLLER_MISSING');mounted=true;window.MiBowlingCP021Mount();attachMigrateButton();attachCP025Button();attachCP032JournalButtons();attachCP032PWAButtons();},
summarySynthetic(legacyRaw,modernRaw){if(!enabled)throw Error('CP021_INACTIVE');return window.BowlingCp016Coexist.analyse({legacy:legacyRaw,modern:modernRaw});},
migrateSynthetic,
promoteV3Demo,promoteV3Synthetic,readV3Synthetic,rollbackV3Synthetic,
async inspectSynthetic(){const s=await getStore();return s.read()},
async recoverSynthetic(){const s=await getStore();await s.recover();return s.read()},
async rollbackSynthetic(){const s=await getStore();await s.rollback();return s.read()},
kind:'existing-PWA-registry-LAB',sources:['CP013','CP014','CP015','CP016','CP018','CP025'],writesProduction:false
});
})();
