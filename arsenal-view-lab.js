'use strict';
/* MI BOWLING · LAB R1: interfaz del análisis. Render consultivo, sin escrituras. */
(function(root){
 function render(ctx){
  const lib=root.MiBowlingArsenal,escape=ctx.escape,balls=ctx.balls||[];
  if(!lib)return '<div class="card"><p>Los análisis no están disponibles sin el catálogo local.</p></div>';
  const pick=lib.selected(balls,ctx.ids||[]);
  const link=(label,panel,id)=>'<button type="button" class="btn outline" onclick="setArsenalPanel('+escape(JSON.stringify(panel))+(id===undefined?'':','+escape(JSON.stringify(id)))+')">'+escape(label)+'</button>';
  const back='<button type="button" class="btn outline" onclick="setArsenalPanel(\'list\')">← Volver a Mis bolas</button>';
  const intro='<div class="card arsenal-notice"><p class="hint">Estimaciones basadas en fichas de fábrica. No sustituyen pruebas sobre pista: superficie, PAP, taladro y estilo de lanzamiento pendientes.</p></div>';
  const returnLabel=ctx.returnTo==='registro'?'Volver al lanzamiento':ctx.returnTo==='nueva'?'Volver a empezar partida':'';
  const quickReturn=returnLabel?'<button type="button" class="btn primary" onclick="closeBallPicker()">← '+escape(returnLabel)+'</button>':'';
  const nav='<div class="card arsenal-nav"><div class="actions">'+quickReturn+back+link('Catálogo de 10 modelos','catalog')+link('Comparar marcadas','compare')+link('Asistente de competición','assistant')+'</div></div>';
  const headline='<div class="section-head"><div><h1>Análisis de Mis bolas</h1><p>Arsenal seleccionado para '+escape(ctx.scope)+'</p></div></div>';
  if(ctx.mode==='catalog'){
   const cards=lib.profiles.map(p=>{
    const registered=balls.some(b=>lib.find(b)?.id===p.id);
    return '<article class="arsenal-model"><div><strong>'+escape(p.brand+' '+p.model)+'</strong><p class="hint">'+escape(p.role)+' · '+escape(p.oil)+'</p><span class="pill gray">'+(registered?'Registrada en Mis bolas':'Ficha informativa')+'</span></div>'+link('Ver análisis','profile',p.id)+'</article>';
   }).join('');
   return headline+nav+intro+'<div class="card"><h2>Catálogo técnico · 10 modelos</h2><p class="hint">Consultar una ficha no crea una bola ni modifica tus datos.</p><div class="arsenal-model-list">'+cards+'</div></div>';
  }
  if(ctx.mode==='profile'||ctx.mode==='detail'){
   const registered=ctx.mode==='detail'?balls.find(b=>b.id===ctx.detailId):balls.find(b=>lib.find(b)?.id===ctx.detailId);
   const p=ctx.mode==='detail'?lib.find(registered):lib.profiles.find(p=>p.id===ctx.detailId);
   if(!p){
    return headline+nav+'<div class="card"><h2>Ficha no identificada</h2><p>Esta bola no tiene una coincidencia técnica segura en los 10 modelos. Se conserva intacta.</p></div>';
   }
   const facts=[['Núcleo',p.core],['RG · 15 lb',p.rg],['Diferencial · 15 lb',p.diff],['Cubierta',p.cover],['Aceite de partida',p.oil],['Longitud de patrón',p.length],['Función estimada',p.role]];
   return headline+nav+intro+'<div class="card"><h2>'+escape(p.brand+' '+p.model)+'</h2><p class="hint">Análisis individual · orientativo</p><dl class="arsenal-facts">'+facts.map(x=>'<div><dt>'+escape(x[0])+'</dt><dd>'+escape(x[1])+'</dd></div>').join('')+'</dl><h3>Reacción prevista</h3><p>'+escape(p.reaction)+'</p><h3>Compatibilidad y límites</h3><p>'+escape(p.warning)+'</p><h3>Complementos a probar</h3><p>'+escape(p.complements.map(id=>lib.profiles.find(q=>q.id===id)?.model||id).join(' · '))+'</p><h3>Taladro y superficie actual</h3><p class="hint">'+(registered&&registered.notes?escape(registered.notes):'Sin notas verificadas en Mis bolas. No se deduce el layout de una fotografía parcial.')+'</p></div>';
  }
  if(ctx.mode==='compare'){
   const good=pick.filter(e=>e.profile),unknown=pick.filter(e=>!e.profile);
   const overlap=lib.overlaps(pick);
   const sections=[3,4,6].map(n=>{
    const lineup=lib.lineup(pick,n);
    return '<div class="arsenal-lineup"><strong>Equipo de '+n+'</strong><p>'+escape(lineup.map(e=>e.profile.model).join(' · ')||'No hay bolas identificadas')+'</p><p class="hint">'+(lineup.length<n?'Selección parcial: marca al menos '+n+' modelos identificados.':'Propuesta orientativa; ajusta según el patrón real.')+'</p></div>';
   }).join('');
   return headline+nav+intro+'<div class="card"><h2>Comparación por selección</h2><p class="hint">'+pick.length+' bola(s) marcadas para '+escape(ctx.scope)+'. Nunca se añaden modelos no marcados.</p>'+
    (pick.length?'<div class="arsenal-model-list">'+pick.map(e=>'<div class="arsenal-model"><span>'+escape((e.ball.brand||'')+' '+(e.ball.model||''))+'</span><span class="pill gray">'+escape(e.profile?.role||'Sin ficha verificada')+'</span></div>').join('')+'</div>':'<p>Marca las bolas mediante sus checks en Mis bolas antes de compararlas.</p>')+
    (unknown.length?'<p class="hint">Sin coincidencia técnica para '+unknown.length+' bola(s). No se inventan parámetros.</p>':'')+
    '<h3>Solapamientos posibles</h3>'+(overlap.length?'<ul>'+overlap.map(pair=>'<li>'+escape(pair.join(' ↔ '))+'</li>').join('')+'</ul>':'<p class="hint">Ningún solapamiento de grupo identificado entre los modelos marcados.</p>')+
    '<h3>Combinaciones de 3, 4 y 6</h3>'+sections+'</div>';
  }
  const problem=lib.problems[ctx.issue]||lib.problems.pocket;
  const suggestions=lib.suggestion(ctx.issue,pick);
  const radios=Object.keys(lib.problems).map(key=>{
   const issue=lib.problems[key];
   return '<label class="arsenal-choice"><input type="radio" name="arsenal-issue" value="'+escape(key)+'" '+(key===ctx.issue?'checked ':'')+'onchange="setArsenalIssue(this.value)"><span>'+escape(issue.label)+'</span></label>';
  }).join('');
  return headline+nav+intro+'<div class="card"><h2>Guía de decisiones durante la competición</h2><p class="hint">Selecciona qué ocurre. El asistente solo propone las bolas que has marcado para '+escape(ctx.scope)+'.</p><div class="arsenal-choices">'+radios+'</div><div class="arsenal-recommend"><h3>Qué observar</h3><p>'+escape(problem.observe)+'</p><h3>Ajuste que probaría</h3><p>'+escape(problem.adjust)+'</p><h3>Bolas candidatas de tu selección</h3><p>'+(suggestions.length?escape(suggestions.map(e=>e.ball.brand+' '+e.ball.model).join(' → ')):'Ninguna coincidencia entre las bolas marcadas. Comprueba la selección o consulta el catálogo.')+'</p></div><p class="hint">No se cambia la bola automáticamente, ni se registra un lanzamiento.</p></div>';
 }
 root.MiBowlingArsenalView=Object.freeze({render});
})(typeof window==='undefined'?globalThis:window);
