/* MI BOWLING CP013 — isolated functional LAB controller. In-memory fake sessions only. */
window.MiBowlingCP021Mount = function(){
  'use strict';
  const E=window.BowlingCp013Engine, A=window.BowlingCp014Compat;
  if(!E||!A)throw Error('Motor CP013 o adaptador CP014 no disponibles');
  const $=id=>document.getElementById(id);
  const LAB_MARK='cp015-synthetic-only';
  let doc={format:A.FORMAT,version:A.VERSION,labFixture:LAB_MARK,hand:'diestro',balls:[],patterns:[],sessions:[{id:'cp015-fake-session-01',type:'entrenamiento',date:'2026-01-01',title:'Sesión ficticia',games:[A.newGame('cp015-fake-game-001',{includeStats:true})]}]};
  const state={games:doc.sessions[0].games,index:0,mode:'bolos',standing:new Set(),quantity:null,ball:{strike:0,spare:0}};
  let lastExport='';
  const engineView=g=>({rolls:g.rolls.map(r=>({frame:r.frame,ball:r.ball,count:r.count,pinIds:r.pinIds===null?null:[...r.pinIds],foul:!!r.foul})),finalOnly:g.entryKind==='final_only'?g.finalOnlyScore:null});
  const rows=[[7,8,9,10],[4,5,6],[2,3],[1]],keys=['−','1','2','3','4','5','6','7','8','9','X','F'];
  const fakeBalls=['Sin definir','Bola A','Bola B'];
  const current=()=>state.games[state.index],turn=()=>A.next(current());
  const finished=()=>turn().done;
  const notify=s=>{$('status').textContent=s;};
  const validFinal=s=>/^\d{1,3}$/.test(s)&&Number.isInteger(+s)&&+s<=300&&+s>=0;
  function capFor(key){if(key==='−'||key==='F')return 0;if(key==='X')return 10;return /^\d$/.test(key)?+key:null;}
  function resetDraft(){state.standing=new Set();state.quantity=null;}
  function build(){
    $('rack').innerHTML=rows.map(row=>'<div class="pin-row">'+row.map(n=>`<button class="pin" type="button" data-pin="${n}" aria-label="Bolo ${n}" aria-pressed="false">${n}</button>`).join('')+'</div>').join('');
    $('quantity-grid').innerHTML=keys.map(key=>`<button type="button" class="qty" data-key="${key}" data-kind="${['X','F','−'].includes(key)?'special':'number'}" aria-label="${key==='−'?'Canal':key==='X'?'Strike':key==='F'?'Falta':key}" aria-pressed="false">${key}</button>`).join('');
    $('final-pad').innerHTML=['1','2','3','4','5','6','7','8','9','⌫','0','C'].map(k=>`<button type="button" class="final-key" data-digit="${k}" aria-label="${k==='⌫'?'Borrar última cifra':k==='C'?'Limpiar resultado':k}">${k}</button>`).join('');
  }
  function updateScoreboard(){
    const g=current(),scores=E.frameScores(engineView(g)),n=turn();
    $('scoreboard').innerHTML=Array.from({length:10},(_,i)=>{
      const f=i+1,m=E.marks(engineView(g),f).join(' ')||'·',s=scores[i]??' ';
      return `<div class="frame ${!n.done&&n.frame===f?'current':''}" aria-label="Frame ${f}, ${m==='·'?'sin tiradas':m}, ${scores[i]===null?'puntuación pendiente':'acumulado '+s}"><span class="frame-index">${f}</span><span class="frame-roll ${m==='·'?'empty':''}">${m}</span><span class="frame-score">${s}</span></div>`;
    }).join('');
    const mark=g.entryKind==='final_only'?'Total registrado':finished()?'Puntuación final':'Puntuación actual';
    document.querySelector('.score-label').textContent=mark;
    document.querySelector('.score-note').textContent=finished()?'':'Parcial';
    document.querySelector('.score-value').textContent=String(A.score(g));
    $('mode-title').innerHTML=n.done?'Partida completada':`Frame ${n.frame}, bola ${n.ball} <span class="sub">· ${n.capacity} bolos disponibles</span>`;
    document.querySelector('.header h1').textContent='Partida '+(state.index+1)+' · LAB';
  }
  function updateRack(){
    const n=turn(),available=n.done?[]:n.available;
    document.querySelectorAll('[data-pin]').forEach(button=>{
      const p=Number(button.dataset.pin),can=Array.isArray(available)&&available.includes(p),standing=state.standing.has(p);
      button.disabled=!can;
      button.hidden=false;
      button.setAttribute('aria-pressed',String(standing));
      button.setAttribute('aria-label',`Bolo ${p}${can?(standing?' marcado en pie':' derribado si registras'):' no disponible'}`);
      button.classList.toggle('unavailable',!can);
    });
  }
  function updateQuantity(){
    const n=turn();
    document.querySelectorAll('[data-key]').forEach(button=>{
      const key=button.dataset.key,value=capFor(key),disabled=n.done||value===null||value>n.capacity;
      button.disabled=disabled;
      button.setAttribute('aria-pressed',String(key===state.quantity));
    });
  }
  function updateControls(){
    const g=current(),n=turn(),done=n.done;
    const tabs=document.querySelectorAll('[data-mode]');
    tabs.forEach(b=>{
      const active=b.dataset.mode===state.mode;
      b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;
      b.disabled=!done&&b.dataset.mode==='bolos'&&n.available===null;
    });
    ['bolos','cantidad','final'].forEach(m=>{$('panel-'+m).hidden=done||m!==state.mode;});
    $('finished-summary').hidden=!done;$('finished-score').textContent=String(A.score(g));
    $('mode-title').hidden=done||state.mode==='final';$('ball-row').hidden=done||state.mode==='final';
    $('quickrow').hidden=state.mode!=='bolos'||done;
    $('mode-hint').hidden=done||state.mode==='final';
    $('mode-hint').textContent=state.mode==='bolos'?'Selecciona los bolos que quedan en pie':state.mode==='cantidad'?'¿Cuántos bolos has derribado?':'';
    $('undo').disabled=g.rolls.length===0&&g.entryKind!=='final_only';
    const submit=$('submit');submit.disabled=false;submit.classList.remove('secondary');
    if(done){submit.textContent='Siguiente partida';submit.classList.add('secondary');}
    else if(state.mode==='bolos'){
      const down=n.capacity-state.standing.size;
      submit.textContent=down===10?'Strike':`Registrar ${down} derribados`;
    }else if(state.mode==='cantidad'){
      const value=state.quantity===null?null:capFor(state.quantity);
      submit.disabled=value===null||value>n.capacity;
      submit.textContent=value===null?'Selecciona cantidad':state.quantity==='F'?'Registrar falta':`Registrar ${value} bolos`;
    }else{
      submit.textContent=g.rolls.length?'No sustituir tiradas':'Registrar total';
      submit.disabled=g.rolls.length>0||!validFinal($('final-score').value);
    }
    updateScoreboard();updateRack();updateQuantity();
  }
  function setMode(m,quiet=false){
    if(!['bolos','cantidad','final'].includes(m))return;
    const n=turn();
    if(m==='bolos'&&!n.done&&n.available===null){notify('Sin posiciones conocidas: termina este frame en Cantidad; no se inventan bolos.');return;}
    state.mode=m;resetDraft();updateControls();
    if(!quiet){
      if(m==='final'&&current().rolls.length)notify('Solo puntuación no sustituye una partida ya anotada por lanzamientos.');
      else notify('LAB sin guardado: todos los datos desaparecen al cerrar.');
    }
  }
  function makeRoll(count,{pinIds=null,foul=false,source='cantidad'}={}){
    try{
      const prev=turn(),kind=prev.ball===1?'strike':'spare';
      A.addRoll(current(),count,source==='bolos'?{pinIds,foul,ballId:fakeBalls[state.ball[kind]]}:{foul,ballId:fakeBalls[state.ball[kind]]});
      resetDraft();
      const n=turn();
      if(n.done)notify('Partida completada. Resultado '+A.score(current())+' · solo en memoria.');
      else if(n.available===null){state.mode='cantidad';notify('Sin posiciones exactas conocidas; continúa este frame en Cantidad.');}
      else notify(`Anotados ${foul?'F (0)':count} bolos. Frame ${n.frame}, bola ${n.ball}.`);
      updateControls();
    }catch(e){notify(e.message);updateControls();}
  }
  function submit(){
    const g=current(),n=turn();
    if(n.done){state.games.push(A.newGame('cp015-fake-game-'+String(state.games.length+1).padStart(3,'0'),{includeStats:true}));state.index++;state.mode='bolos';$('final-score').value='';resetDraft();updateControls();notify('Nueva partida ficticia · los resultados anteriores siguen solo en memoria.');return;}
    if(state.mode==='final'){
      if(!validFinal($('final-score').value)){notify('Introduce un resultado de 0 a 300.');return;}
      try{A.recordFinalOnly(g,Number($('final-score').value));notify('Resultado '+g.finalOnlyScore+' registrado solo en memoria; sin frames inventados.');updateControls();}
      catch(e){notify(e.message);}
    }else if(state.mode==='cantidad'){
      if(state.quantity===null)return;
      const key=state.quantity;
      makeRoll(capFor(key),{foul:key==='F',source:'cantidad'});
    }else{
      if(n.available===null){setMode('cantidad');return;}
      const knocked=n.available.filter(pin=>!state.standing.has(pin));
      makeRoll(knocked.length,{pinIds:knocked,source:'bolos'});
    }
  }
  build();
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
  $('rack').addEventListener('click',event=>{
    const el=event.target.closest('[data-pin]');if(!el||el.disabled)return;
    const pin=Number(el.dataset.pin);
    if(state.standing.has(pin))state.standing.delete(pin);else state.standing.add(pin);
    updateControls();notify(`${state.standing.size} bolos marcados en pie.`);
  });
  $('quantity-grid').addEventListener('click',event=>{
    const el=event.target.closest('[data-key]');if(!el||el.disabled)return;
    state.quantity=el.dataset.key;updateControls();notify('Seleccionados '+(el.dataset.key==='−'?0:el.dataset.key)+' bolos.');
  });
  document.querySelectorAll('[data-ball]').forEach(el=>el.addEventListener('click',()=>{
    const type=el.dataset.ball;state.ball[type]=(state.ball[type]+1)%fakeBalls.length;
    $(type+'-ball').textContent=fakeBalls[state.ball[type]];
    notify('Bola ficticia seleccionada: no accede a MIS BOLAS real.');
  }));
  $('channel').addEventListener('click',()=>makeRoll(0,{pinIds:[],source:'bolos'}));
  $('foul').addEventListener('click',()=>makeRoll(0,{pinIds:[],source:'bolos',foul:true}));
  $('submit').addEventListener('click',submit);
  $('undo').addEventListener('click',()=>{
    if(A.undo(current())){resetDraft();$('final-score').value='';const n=turn();if(state.mode==='bolos'&&!n.done&&n.available===null)state.mode='cantidad';updateControls();notify('Deshecho el último registro de la partida ficticia.');}
  });
  $('final-pad').addEventListener('click',e=>{
    const button=e.target.closest('[data-digit]');if(!button||button.disabled)return;
    const value=button.dataset.digit,inp=$('final-score');
    if(value==='C')inp.value='';else if(value==='⌫')inp.value=inp.value.slice(0,-1);
    else if(inp.value.length<3)inp.value+=value;
    updateControls();if(inp.value&&!validFinal(inp.value))notify('Resultado fuera del intervalo 0–300.');else notify('Teclado local: no se abre el teclado del sistema.');
  });
  $('back').addEventListener('click',()=>notify('Pantalla LAB aislada; usa Deshacer o las pestañas para cambiar el registro.'));
  document.querySelector('.tabs').addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
    const ts=[...document.querySelectorAll('[data-mode]')].filter(t=>!t.disabled);
    const i=ts.findIndex(t=>t.dataset.mode===state.mode),j=(i+(e.key==='ArrowRight'?1:ts.length-1))%ts.length;
    ts[j].focus();setMode(ts[j].dataset.mode);e.preventDefault();
  });

  function assertSynthetic(input){
    if(!input||typeof input!=='object'||input.labFixture!==LAB_MARK)throw Error('Importación rechazada: únicamente archivos ficticios CP015');
    if(!Array.isArray(input.sessions)||input.sessions.length!==1)throw Error('La maqueta permite una sola sesión ficticia');
    for(const session of input.sessions){
      if(typeof session.id!=='string'||!session.id.startsWith('cp015-fake-')||!Array.isArray(session.games)||!session.games.length)throw Error('Sesiones ajenas a CP015 rechazadas');
      for(const g of session.games)if(typeof g.id!=='string'||!g.id.startsWith('cp015-fake-'))throw Error('IDs de partida de prueba obligatorios');
    }
  }
  function canonicalJSON(){A.validateDocument(doc);assertSynthetic(doc);return JSON.stringify(A.roundTripJSON(doc),null,2);}
  function exportJSON(){lastExport=canonicalJSON();return lastExport;}
  function importJSON(text){
    if(typeof text!=='string'||text.length>1048576)throw Error('Archivo JSON demasiado grande o inválido');
    const parsed=JSON.parse(text);
    assertSynthetic(parsed);
    let incoming;
    if(parsed.version===2){incoming=A.fromLegacyV2(parsed);incoming.labFixture=LAB_MARK;}
    else {incoming=A.roundTripJSON(parsed);}
    A.validateDocument(incoming);assertSynthetic(incoming);
    doc=incoming;
    state.games=doc.sessions[0].games;
    state.index=state.games.length-1;
    const g=current(),n=A.next(g);
    state.mode=n.done?'bolos':n.available===null?'cantidad':'bolos';
    resetDraft();$('final-score').value='';updateControls();
    notify('Reabierta sesión ficticia · '+state.games.length+' partida(s).');
    updateIoSummary();return A.summary(doc);
  }
  function importLegacyFixture(){
    const fixture={version:2,labFixture:LAB_MARK,hand:'diestro',balls:[],patterns:[],sessions:[{id:'cp015-fake-session-v2',type:'entrenamiento',date:'2026-01-01',title:'Ejemplo ficticio v2',games:[{id:'cp015-fake-legacy-01',includeStats:true,pair:null,startLane:null,segments:[],rolls:[]}]}]};
    const game=fixture.sessions[0].games[0];
    for(let f=1;f<=10;f++)for(let ball=1;ball<=2;ball++)game.rolls.push({frame:f,ball,pins:[],ballId:'',foul:false});
    return importJSON(JSON.stringify(fixture));
  }
  function updateIoSummary(){
    try{
      const s=A.summary(doc);
      $('io-summary').textContent='Partidas: '+s.totalGames+' · Promedio: '+(s.averageScore===null?'—':s.averageScore.toFixed(1))+' · Frames válidos: '+s.frameAnalysisEligibleGames+' · Patrones de bolos: '+s.pinPatternEligibleGames;
      $('io-kind').textContent='Formato v'+A.VERSION+' · JSON únicamente ficticio · sin guardado automático';
    }catch(e){$('io-summary').textContent=e.message;}
  }
  $('info').setAttribute('aria-label','Importar y exportar datos ficticios');
  $('info').addEventListener('click',()=>{updateIoSummary();$('lab-io').showModal();});
  $('io-close').addEventListener('click',()=>$('lab-io').close());
  $('io-export').addEventListener('click',()=>{
    try{
      const data=exportJSON(),blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='mi-bowling-cp015-solo-ficticio.json';document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),3000);
      $('io-feedback').textContent='Archivo ficticio exportado; guarda el JSON si deseas volver a abrirlo tras cerrar.';
      updateIoSummary();
    }catch(e){$('io-feedback').textContent=e.message;}
  });
  $('io-reopen').addEventListener('click',()=>{
    try{if(!lastExport)throw Error('Primero exporta un JSON ficticio');importJSON(lastExport);$('io-feedback').textContent='JSON reabierto en memoria: datos recuperados.';}
    catch(e){$('io-feedback').textContent=e.message;}
  });
  $('io-example').addEventListener('click',()=>{
    try{importLegacyFixture();$('io-feedback').textContent='Ejemplo v2 ficticio convertido a v3 sin tocar datos reales.';}
    catch(e){$('io-feedback').textContent=e.message;}
  });
  $('io-import').addEventListener('click',()=>$('io-file').click());
  $('io-file').addEventListener('change',async e=>{
    const f=e.target.files?.[0];if(!f)return;
    try{if(f.size>1048576)throw Error('El JSON ficticio excede 1 MB');await importJSON(await f.text());$('io-feedback').textContent='Archivo de prueba importado y validado.';}
    catch(error){$('io-feedback').textContent='Importación no realizada: '+error.message;}
    finally{e.target.value='';}
  });
  window.__CP015_LAB=Object.freeze({
    snapshot:()=>JSON.parse(JSON.stringify({document:doc,activeIndex:state.index,mode:state.mode,score:A.score(current()),next:turn(),summary:A.summary(doc)})),
    exportJSON:()=>exportJSON(),
    reopenJSON:(value)=>importJSON(value),
    importLegacyFixture:()=>importLegacyFixture(),
    hasStorageCalls:false,
    checkpoint:'MI-BOWLING-REGISTRO-SIN-SCROLL-CP015-20261121'
  });
  setMode('bolos',true);notify('CP015 · Sesiones ficticias · Exportación/importación local, sin guardado automático');
};
