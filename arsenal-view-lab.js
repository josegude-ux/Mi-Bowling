'use strict';
/* MI BOWLING · LAB R1: interfaz del análisis. Render consultivo, sin escrituras. */
(function(root){
 function renderCatalog100(ctx,headline,nav,intro){
  const bridge=root.MiBowlingCatalog100Bridge,escape=ctx.escape,balls=ctx.balls||[];
  if(!bridge)return headline+nav+'<div class="card">La plantilla de 100 no está disponible. Tus bolas no se han modificado.</div>';
  const source=bridge.current(),items=source.items,query=String(ctx.catalogQuery||'');
  const norm=x=>String(x||'').toLowerCase().normalize('NFD')
   .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const policy=root.MiBowlingCatalog100VariantPolicy;
  const exists=x=>balls.find(b=>bridge.identity(b)===bridge.identity(x));
  const matching=x=>norm(x.brand+' '+x.model+' '+x.approved).includes(norm(query));
  const cards=items.map(x=>{
   const found=exists(x),matched=matching(x);
   const ambiguity=found||(!policy?true:policy.inspect(x,balls).kind==='name-collision');
   const action=ambiguity?
    '<span class="pill gray">Coincidencia de nombre: edición, peso, SKU y unidad sin verificar'+(found?.retired?' (retirada)':'')+'</span>'+
    '<button class="btn outline" type="button" onclick="openCatalog100Manual('+escape(JSON.stringify(x.id))+')">Revisar variante / alta manual</button>'
    :'<button class="btn primary" type="button" onclick="registerBallFromCatalog('+escape(JSON.stringify(x.id))+')">Añadir a Mis bolas</button>';
   return '<article class="arsenal-model" data-search="'+escape(x.brand+' '+x.model+' '+x.approved)+'" style="'+(matched?'':'display:none')+'">'+
    '<div><strong>'+escape(x.brand+' '+x.model)+'</strong><p class="hint">Fecha de aprobación indicada: '+escape(x.approved)+
    ' · Núcleo / RG / diferencial pendientes de contraste · Foto real no incluida</p></div>'+
    '<div class="actions">'+action+'</div></article>';
  }).join('');
  const currentSource=source.origin==='local-template'?
   '100 referencias guardadas localmente en la plantilla (solo si comparten almacenamiento en este dispositivo).':
   '100 referencias iniciales publicadas; NO se acredita que sean las 100 más recientes del PDF USBC completo.';
  return headline+nav+intro+
   '<div class="card"><h2>Catálogo de 100 bolas · plantilla</h2>'+
   '<p class="hint">'+escape(currentSource)+' Aprobar un modelo en USBC no acredita fecha comercial ni ficha técnica. Sin fotografías copiadas.</p>'+
   '<div class="actions"><a class="btn outline" target="_blank" rel="noopener noreferrer" href="./catalogo-bolas/">Abrir plantilla independiente de 100</a></div>'+
   '<label class="field" for="arsenal-catalog-search">Buscar marca, modelo o fecha</label>'+
   '<input id="arsenal-catalog-search" class="input" type="search" value="'+escape(query)+'" placeholder="Ej. Brunswick o Raptor" oninput="filterArsenalCatalog(this.value)">'+
   '<p class="hint" aria-live="polite" id="arsenal-catalog-count">'+items.filter(matching).length+' de '+items.length+' modelos</p>'+
   '<div class="arsenal-model-list">'+cards+'</div>'+
   '<p id="arsenal-catalog-noresults" class="hint" '+(items.some(matching)?'hidden':'')+'>No figura en esta plantilla. Puedes buscarlo en el catálogo local o registrarlo manualmente.</p>'+
   '<div class="card"><h3>Transferir bolas marcadas desde la plantilla</h3>'+
   '<p class="hint">Exporta «JSON de elegidas» en la plantilla independiente y selecciona ese archivo aquí. No sincroniza dispositivos ni demuestra variantes/SKU. Las coincidencias de nombre se omitirán para revisión; no se copiarán fotos, notas ni especificaciones no verificadas.</p>'+
   '<label class="field" for="catalog100-selection-file">Elegir archivo JSON de selección</label>'+
   '<input id="catalog100-selection-file" class="input" type="file" accept=".json,application/json" onchange="importCatalog100Selection(this)">'+
   '<p class="hint">El archivo se lee localmente y nunca sustituye tus sesiones ni las bolas existentes. El alta solo se aplica si confirmas.</p></div>'+
   '</div>';
 }
 function render(ctx){
  const lib=root.MiBowlingArsenal,escape=ctx.escape,balls=ctx.balls||[];
  if(!lib)return '<div class="card"><p>Los análisis no están disponibles sin el catálogo local.</p></div>';
  const pick=lib.selected(balls,ctx.ids||[]);
  const link=(label,panel,id)=>'<button type="button" class="btn outline" onclick="setArsenalPanel('+escape(JSON.stringify(panel))+(id===undefined?'':','+escape(JSON.stringify(id)))+')">'+escape(label)+'</button>';
  const back='<button type="button" class="btn outline" onclick="setArsenalPanel(\'list\')">← Volver a Mis bolas</button>';
  const intro='<div class="card arsenal-notice"><p class="hint">Estimaciones basadas en fichas de fábrica. No sustituyen pruebas sobre pista: superficie, PAP, taladro y estilo de lanzamiento pendientes.</p></div>';
  const returnLabel=ctx.returnTo==='registro'?'Volver al lanzamiento':ctx.returnTo==='nueva'?'Volver a empezar partida':'';
  const quickReturn=returnLabel?'<button type="button" class="btn primary" onclick="closeBallPicker()">← '+escape(returnLabel)+'</button>':'';
  const nav='<div class="card arsenal-nav"><div class="actions">'+quickReturn+back+link('Catálogo de 10 modelos','catalog')+link('100 bolas · plantilla','catalog100')+link('Comparar marcadas','compare')+link('Asistente de competición','assistant')+'</div></div>';
  const headline='<div class="section-head"><div><h1>Análisis de Mis bolas</h1><p>Arsenal seleccionado para '+escape(ctx.scope)+'</p></div></div>';
  if(ctx.mode==='catalog100')return renderCatalog100(ctx,headline,nav,intro);
  if(ctx.mode==='catalog'){
   const query=String(ctx.catalogQuery||'');
   const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
   const official=root.MiBowlingOfficialBallCatalog;
   const localProfiles=lib.profiles.map(p=>Object.assign({origin:'historical'},p));
   const extra=(official?.models||[]).map(p=>Object.assign({origin:'official'},p));
   const pool=[...localProfiles,...extra],total=pool.length;
   const cards=pool.map(p=>{
    const matching=balls.find(b=>p.origin==='historical'
     ?lib.find(b)?.id===p.id
     :norm(b.brand)===norm(p.brand)&&norm(b.model)===norm(p.model));
    const searchText=[p.brand,p.model,p.role||'',p.oil||''].join(' ');
    const shown=norm(searchText).includes(norm(query));
    const status=matching?(matching.retired?'Registrada (retirada)':'Registrada en Mis bolas'):'';
    const add=matching?'<span class="pill gray">'+escape(status)+'</span>'
     :'<button type="button" class="btn primary" onclick="registerBallFromCatalog('+escape(JSON.stringify(p.id))+')">Añadir a Mis bolas</button>';
    const source=p.origin==='official'
     ?'<a class="btn outline" href="'+escape(p.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+(p.sourceType==='product'?'Ficha del fabricante':'Catálogo del fabricante')+'</a>'
     :link('Ver análisis','profile',p.id);
    const info=p.origin==='official'?'Referencia en fabricante · sin parámetros supuestos':p.role+' · '+p.oil;
    return '<article class="arsenal-model" data-search="'+escape(searchText)+'" style="'+(shown?'':'display:none')+'"><div><strong>'+escape(p.brand+' '+p.model)+'</strong><p class="hint">'+escape(info)+'</p></div><div class="actions">'+add+source+'</div></article>';
   }).join('');
   const visible=pool.filter(p=>norm([p.brand,p.model,p.role||'',p.oil||''].join(' ')).includes(norm(query))).length;
   const officialLinks=Object.entries(official?.catalogs||{}).map(([brand,url])=>
    '<a class="btn outline" target="_blank" rel="noopener noreferrer" href="'+escape(url)+'">'+escape(brand)+'</a>').join(' ');
   return headline+nav+intro+
    '<div class="card"><h2>Catálogo local · '+total+' modelos</h2>'+
    '<p class="hint">Incluye 10 fichas históricas de tu arsenal y '+extra.length+' referencias consultadas en páginas oficiales de fabricantes. Es una selección local, NO una búsqueda en vivo ni un catálogo completo. Se puede utilizar sin conexión.</p>'+
    '<label class="field" for="arsenal-catalog-search">Buscar por marca o modelo (y función/aceite en fichas históricas)</label>'+
    '<input id="arsenal-catalog-search" type="search" class="input" value="'+escape(query)+'" placeholder="Ej. Track, Theorem Delta o Phantom" oninput="filterArsenalCatalog(this.value)">'+
    '<p class="hint" id="arsenal-catalog-count" aria-live="polite">'+visible+' de '+total+' modelos</p>'+
    '<div class="arsenal-model-list">'+cards+'</div>'+
    '<p id="arsenal-catalog-noresults" class="hint" '+(visible?'hidden':'')+'>Ese modelo no figura todavía en esta selección local. Puedes consultar el fabricante o añadir marca y modelo manualmente.</p>'+
    '<div class="card"><h3>Catálogos oficiales completos</h3><p class="hint">Estos enlaces abren la web del fabricante con Internet; la aplicación no extrae datos de esas páginas.</p><div class="actions">'+officialLinks+'</div>'+
    '<button type="button" class="btn outline block mt12" onclick="setArsenalPanel('+"'list'"+');ballEditingId='+"'nuevo'"+';render()">Añadir una bola manualmente sin inventar ficha técnica</button></div>'+
    '</div>';
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
