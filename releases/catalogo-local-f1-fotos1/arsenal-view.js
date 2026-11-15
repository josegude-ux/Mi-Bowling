'use strict';
/* MI BOWLING · LAB R1: interfaz del análisis. Render consultivo, sin escrituras. */
(function(root){
 let catalogFilter='all';
 const paths={back:'<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',plus:'<path d="M5 12h14M12 5v14"/>',check:'<path d="m20 6-11 11-5-5"/>',scale:'<path d="m16 16 3-8 3 8c-1.7 1.3-4.3 1.3-6 0ZM2 16l3-8 3 8c-1.7 1.3-4.3 1.3-6 0ZM7 21h10M12 3v18M3 7h18"/>',trophy:'<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.26 7 22m7-7.34V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.26 17 22M18 2H6v7a6 6 0 0 0 12 0Z"/>',external:'<path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>'};
 const icon=(name)=>'<svg class="arsenal-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+paths[name]+'</svg>';
 const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 function photo(e,eager=false){return root.MiBowlingFotosPrivadas.img(e).replace(/ style="[^"]*"/,'').replace('loading="lazy"',eager?'loading="eager"':'loading="lazy"');}
 function source(e){return root.MiBowlingFotosPrivadas.source(e).replace('<p class="hint">','<p class="arsenal-source-note">'+icon('info')+'<span>').replace('<a href=','</span><a class="arsenal-control arsenal-secondary" href=').replace('>Ver fuente oficial</a>','>'+icon('external')+'Ver fuente oficial</a>');}
 function applies(brand,own){return catalogFilter==='all'||(catalogFilter==='mine'?own:catalogFilter==='brand:'+brand);}
 function filter(button){
  const screen=button.closest('.arsenal-screen');if(!screen)return;
  if(button.hasAttribute('data-arsenal-filter'))catalogFilter=button.dataset.arsenalFilter;
  screen.querySelectorAll('[data-arsenal-filter]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.arsenalFilter===catalogFilter)));
  const cards=Array.from(screen.querySelectorAll('.arsenal-model[data-search]'));let shown=0;
  cards.forEach(card=>{card.hidden=!applies(card.dataset.brand,card.dataset.owned==='true');if(!card.hidden&&card.style.display!=='none')shown++;});
  screen.querySelector('#arsenal-catalog-count').textContent=shown+' de '+cards.length+' modelos';
  screen.querySelector('#arsenal-catalog-noresults').hidden=shown!==0;
 }
 function render(ctx){
  const lib=root.MiBowlingArsenal,escape=ctx.escape,balls=ctx.balls||[];
  if(!lib)return '<div class="card"><p>Los análisis no están disponibles sin el catálogo local.</p></div>';
  const pick=lib.selected(balls,ctx.ids||[]);
  const action=(panel,id)=>'setArsenalPanel('+escape(JSON.stringify(panel))+(id===undefined?'':','+escape(JSON.stringify(id)))+');window.scrollTo({top:0,behavior:\'instant\'})';
  const link=(label,panel,id,ic)=>'<button type="button" class="arsenal-control arsenal-secondary" onclick="'+action(panel,id)+'">'+(ic?icon(ic):'')+escape(label)+'</button>';
  const estimate='Estimaciones basadas en fichas de fábrica. No sustituyen pruebas sobre pista: superficie, PAP, taladro y estilo de lanzamiento pendientes.';
  const info=(summary,body)=>'<details class="arsenal-info"><summary><span>'+escape(summary)+'</span><span class="arsenal-info-icon" aria-label="Información">'+icon('info')+'</span></summary><div class="arsenal-info-body">'+body+'</div></details>';
  const intro=info('Análisis orientativo · fichas de fábrica','<p>'+escape(estimate)+'</p>');
  const returnLabel=ctx.returnTo==='registro'?'Volver al lanzamiento':ctx.returnTo==='nueva'?'Volver a empezar partida':'';
  const quickReturn=returnLabel?'<button type="button" class="arsenal-control arsenal-secondary" onclick="closeBallPicker()">'+icon('back')+escape(returnLabel)+'</button>':'';
  const isCatalog=ctx.mode==='catalog'||ctx.mode==='profile';
  const nav='<nav class="arsenal-navigation" aria-label="Navegación del arsenal"><div class="arsenal-segment" role="tablist" aria-label="Mis bolas y catálogo"><button type="button" role="tab" aria-selected="'+!isCatalog+'" onclick="'+action('list')+'">Mis bolas</button><button type="button" role="tab" aria-selected="'+isCatalog+'" onclick="'+action('catalog')+'">Catálogo</button></div><div class="arsenal-actions">'+quickReturn+link('Comparar marcadas','compare',undefined,'scale')+link('Asistente de competición','assistant',undefined,'trophy')+'</div></nav>';
  const headline='<div class="arsenal-heading"><h1>Análisis de Mis bolas</h1><p>Arsenal seleccionado para '+escape(ctx.scope)+'</p></div>';
  const screen=(content,kind='analysis')=>'<section class="arsenal-screen arsenal-screen-'+kind+'">'+content+'</section>';
  const addButton=(p,matching,small)=>'<button type="button" class="'+(small?'arsenal-add':'arsenal-control arsenal-primary')+'" '+(matching?'disabled aria-label="'+(matching.retired?'Registrada, retirada':'Ya en Mis bolas')+'"':'aria-label="Añadir a Mis bolas" onclick="registerBallFromCatalog('+escape(JSON.stringify(p.id))+')"')+'><span>'+icon(matching?'check':'plus')+(small?'':matching?(matching.retired?'Retirada':'Registrada en Mis bolas'):'Añadir a Mis bolas')+'</span></button>';
  if(ctx.mode==='catalog'){
   const query=String(ctx.catalogQuery||'');
   const official=root.MiBowlingOfficialBallCatalog;
   const localProfiles=lib.profiles.map(p=>Object.assign({origin:'historical'},p));
   const extra=(official?.models||[]).map(p=>Object.assign({origin:'official'},p));
   const pool=[...localProfiles,...extra],total=pool.length;
   const rows=pool.map(p=>({p,matching:balls.find(b=>p.origin==='historical'?lib.find(b)?.id===p.id:norm(b.brand)===norm(p.brand)&&norm(b.model)===norm(p.model)),searchText:[p.brand,p.model,p.role||'',p.oil||''].join(' ')}));
   const brands=[...new Set(pool.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'es'));
   const owned=rows.filter(x=>x.matching&&!x.matching.retired).length;
   const visible=rows.filter(x=>norm(x.searchText).includes(norm(query))&&applies(x.p.brand,!!x.matching&&!x.matching.retired)).length;
   const chips=[['all','Todas'],['mine','Mías'],...brands.map(brand=>['brand:'+brand,brand])].map(([key,label])=>'<button type="button" data-arsenal-filter="'+escape(key)+'" aria-pressed="'+(catalogFilter===key)+'" onclick="MiBowlingArsenalView.filter(this)"><span>'+escape(label)+'</span></button>').join('');
   const cards=rows.map(({p,matching,searchText},i)=>{
    const shown=norm(searchText).includes(norm(query)),own=!!matching&&!matching.retired;
    const ref=root.MiBowlingFotosPrivadas.profile(p),image=photo(ref,i<4);
    const status=matching?'<span class="arsenal-status'+(matching.retired?' is-retired':'')+'">'+(matching.retired?'Retirada':'Mía')+'</span>':'';
    const content='<span class="arsenal-image">'+(image||'<span class="arsenal-placeholder" aria-label="Sin fotografía">'+icon('info')+'</span>')+(image?'<span class="arsenal-photo-badge">'+icon('info')+'Foto oficial</span>':'')+'</span>'+status+'<strong class="arsenal-name">'+escape(p.model)+'</strong><span class="arsenal-brand">'+escape(p.brand)+'</span>'+(p.origin==='historical'?'<span class="arsenal-meta"><span title="'+escape(p.role)+'">'+escape(p.role)+'</span><span title="'+escape(p.oil)+'">'+escape(p.oil)+'</span></span>':'<span class="arsenal-meta"><span>Referencia fabricante</span></span>');
    const target=p.origin==='official'?'<a class="arsenal-card-target" href="'+escape(p.sourceUrl)+'" target="_blank" rel="noopener noreferrer" aria-label="'+escape((p.sourceType==='product'?'Ficha del fabricante':'Catálogo del fabricante')+': '+p.brand+' '+p.model)+'">'+content+'</a>':'<button type="button" class="arsenal-card-target" aria-label="'+escape('Ver análisis: '+p.brand+' '+p.model)+'" onclick="'+action('profile',p.id)+'">'+content+'</button>';
    return '<article class="arsenal-model arsenal-catalog-card" data-search="'+escape(searchText)+'" data-brand="'+escape(p.brand)+'" data-owned="'+own+'" '+(!applies(p.brand,own)?'hidden ':'')+'style="'+(shown?'':'display:none')+'">'+target+addButton(p,matching,true)+'</article>';
   }).join('');
   const officialLinks=Object.entries(official?.catalogs||{}).map(([brand,url])=>'<a class="arsenal-control arsenal-secondary" target="_blank" rel="noopener noreferrer" href="'+escape(url)+'">'+escape(brand)+icon('external')+'</a>').join(' ');
   const description='Incluye '+localProfiles.length+' fichas históricas de tu arsenal y '+extra.length+' referencias consultadas en páginas oficiales de fabricantes. Es una selección local, NO una búsqueda en vivo ni un catálogo completo. Se puede utilizar sin conexión.';
   return screen('<div class="arsenal-heading"><h1>Catálogo</h1><p>'+owned+' mías · '+total+' modelos en catálogo · selección local</p></div>'+nav+info('Fichas históricas y referencias de fabricante','<p>'+escape(description)+'</p><p>'+escape(estimate)+'</p>')+
    '<div class="arsenal-search">'+icon('search')+'<input id="arsenal-catalog-search" type="search" aria-label="Buscar por marca o modelo (y función/aceite en fichas históricas). Ej. Track, Theorem Delta o Phantom" value="'+escape(query)+'" placeholder="Buscar marca o modelo" oninput="filterArsenalCatalog(this.value);MiBowlingArsenalView.filter(this)"></div>'+
    '<div class="arsenal-filter-row" role="group" aria-label="Filtrar por marca o bolas propias">'+chips+'</div><p class="arsenal-count" id="arsenal-catalog-count" aria-live="polite">'+visible+' de '+total+' modelos</p>'+
    '<div class="arsenal-catalog-grid">'+cards+'</div><p id="arsenal-catalog-noresults" class="arsenal-label" '+(visible?'hidden':'')+'>Ese modelo no figura todavía en esta selección local. Puedes consultar el fabricante o añadir marca y modelo manualmente.</p>'+
    '<div class="card arsenal-manufacturers"><h3>Catálogos oficiales completos</h3><p class="hint">Estos enlaces abren la web del fabricante con Internet; la aplicación no extrae datos de esas páginas.</p><div class="actions">'+officialLinks+'</div><button type="button" class="arsenal-control arsenal-secondary" onclick="setArsenalPanel(' + "'list'" + ');ballEditingId=' + "'nuevo'" + ';render()">Añadir una bola manualmente sin inventar ficha técnica</button></div>','catalog');
  }
  if(ctx.mode==='profile'||ctx.mode==='detail'){
   const registered=ctx.mode==='detail'?balls.find(b=>b.id===ctx.detailId):balls.find(b=>lib.find(b)?.id===ctx.detailId);
   const p=ctx.mode==='detail'?lib.find(registered):lib.profiles.find(p=>p.id===ctx.detailId);
   if(!p){
    return screen(headline+nav+'<div class="card"><h2>Ficha no identificada</h2><p>Esta bola no tiene una coincidencia técnica segura en los 10 modelos. Se conserva intacta.</p></div>');
   }
   const facts=[['Núcleo',p.core],['RG · 15 lb',p.rg],['Diferencial · 15 lb',p.diff],['Cubierta',p.cover],['Aceite de partida',p.oil],['Longitud de patrón',p.length],['Función estimada',p.role]];
   const ref=root.MiBowlingFotosPrivadas.profile(p);
   const detailPhoto=registered?.photo||(registered&&p.id==='rhino')?'':photo(ref,true);
   return screen(headline+nav+intro+'<div class="card arsenal-detail">'+(detailPhoto?'<div class="arsenal-detail-image">'+detailPhoto+'</div>':'')+'<h2>'+escape(p.model)+'</h2><p class="arsenal-brand">'+escape(p.brand)+'</p><p class="arsenal-label">Análisis individual · orientativo</p>'+source(ref)+'<dl class="arsenal-detail-facts">'+facts.map(x=>'<div><dt>'+escape(x[0])+'</dt><dd>'+escape(x[1])+'</dd></div>').join('')+'</dl><h3>Reacción prevista</h3><p>'+escape(p.reaction)+'</p><h3>Compatibilidad y límites</h3><p>'+escape(p.warning)+'</p><h3>Complementos a probar</h3><p>'+escape(p.complements.map(id=>lib.profiles.find(q=>q.id===id)?.model||id).join(' · '))+'</p><h3>Taladro y superficie actual</h3><p class="hint">'+(registered&&registered.notes?escape(registered.notes):'Sin notas verificadas en Mis bolas. No se deduce el layout de una fotografía parcial.')+'</p></div><div class="arsenal-detail-actions">'+addButton(p,registered,false)+link('Volver al catálogo','catalog')+'</div>','detail');
  }
  if(ctx.mode==='compare'){
   const good=pick.filter(e=>e.profile),unknown=pick.filter(e=>!e.profile);
   const overlap=lib.overlaps(pick);
   const sections=[3,4,6].map(n=>{
    const lineup=lib.lineup(pick,n);
    return '<div class="arsenal-lineup"><strong>Equipo de '+n+'</strong><p>'+escape(lineup.map(e=>e.profile.model).join(' · ')||'No hay bolas identificadas')+'</p><p class="hint">'+(lineup.length<n?'Selección parcial: marca al menos '+n+' modelos identificados.':'Propuesta orientativa; ajusta según el patrón real.')+'</p></div>';
   }).join('');
   return screen(headline+nav+intro+'<div class="card"><h2>Comparación por selección</h2><p class="hint">'+pick.length+' bola(s) marcadas para '+escape(ctx.scope)+'. Nunca se añaden modelos no marcados.</p>'+
    (pick.length?'<div class="arsenal-model-list">'+pick.map(e=>'<div class="arsenal-model"><span>'+escape((e.ball.brand||'')+' '+(e.ball.model||''))+'</span><span class="pill gray">'+escape(e.profile?.role||'Sin ficha verificada')+'</span></div>').join('')+'</div>':'<p>Marca las bolas mediante sus checks en Mis bolas antes de compararlas.</p>')+
    (unknown.length?'<p class="hint">Sin coincidencia técnica para '+unknown.length+' bola(s). No se inventan parámetros.</p>':'')+
    '<h3>Solapamientos posibles</h3>'+(overlap.length?'<ul>'+overlap.map(pair=>'<li>'+escape(pair.join(' ↔ '))+'</li>').join('')+'</ul>':'<p class="hint">Ningún solapamiento de grupo identificado entre los modelos marcados.</p>')+
    '<h3>Combinaciones de 3, 4 y 6</h3>'+sections+'</div>');
  }
  const problem=lib.problems[ctx.issue]||lib.problems.pocket;
  const suggestions=lib.suggestion(ctx.issue,pick);
  const radios=Object.keys(lib.problems).map(key=>{
   const issue=lib.problems[key];
   return '<label class="arsenal-choice"><input type="radio" name="arsenal-issue" value="'+escape(key)+'" '+(key===ctx.issue?'checked ':'')+'onchange="setArsenalIssue(this.value)"><span>'+escape(issue.label)+'</span></label>';
  }).join('');
  return screen(headline+nav+intro+'<div class="card"><h2>Guía de decisiones durante la competición</h2><p class="hint">Selecciona qué ocurre. El asistente solo propone las bolas que has marcado para '+escape(ctx.scope)+'.</p><div class="arsenal-choices">'+radios+'</div><div class="arsenal-recommend"><h3>Qué observar</h3><p>'+escape(problem.observe)+'</p><h3>Ajuste que probaría</h3><p>'+escape(problem.adjust)+'</p><h3>Bolas candidatas de tu selección</h3><p>'+(suggestions.length?escape(suggestions.map(e=>e.ball.brand+' '+e.ball.model).join(' → ')):'Ninguna coincidencia entre las bolas marcadas. Comprueba la selección o consulta el catálogo.')+'</p></div><p class="hint">No se cambia la bola automáticamente, ni se registra un lanzamiento.</p></div>');
 }
 root.MiBowlingArsenalView=Object.freeze({render,filter});
})(typeof window==='undefined'?globalThis:window);
