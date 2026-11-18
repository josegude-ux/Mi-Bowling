/* MI BOWLING · LAB Estadísticas visuales R1 · propuesta 1 (VISURA INVENTA).
 * Fuente ÚNICA: agregado que entrega la sesión / perfil actualmente seleccionado.
 * No lee ni escribe localStorage, IndexedDB, sesiones o cuentas. */
(function(root){
'use strict';
const PINS=[1,2,3,4,5,6,7,8,9,10];
const ROWS=[[7,8,9,10],[4,5,6],[2,3],[1]];
const MODES=[
 ['first','1er lanzamiento'],
 ['second','2º lanzamiento'],
 ['single','Bolos únicos'],
 ['combinations','Combinaciones']
];
const LABELS={
 first:'Primer lanzamiento',
 second:'Segundo lanzamiento',
 single:'Spare de bolo único',
 combinations:'Combinaciones de bolos'
};
let mode='first',selectedPin=1;
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function pct(h,n){return n?Math.round(h*1000/n)/10:null;}
function rate(v){return v===null?'—':(Number.isInteger(v)?String(v):v.toFixed(1)).replace('.',',')+' %';}
function pinStats(){return PINS.map(pin=>({pin,attempts:0,hit:0,rate:null}));}
function cleanPins(a){
 if(!Array.isArray(a))return [];
 return [...new Set(a.filter(p=>Number.isInteger(p)&&p>=1&&p<=10))].sort((x,y)=>x-y);
}
function compute(a,view='first'){
 if(!MODES.some(m=>m[0]===view))throw Error('Modo de estadísticas no admitido');
 const pins=pinStats(),byPin=new Map(pins.map(p=>[p.pin,p]));
 const first=Array.isArray(a?.first)?a.first:[];
 const opportunities=Array.isArray(a?.opportunities)?a.opportunities:[];
 let events=0,converted=0,overallPossible=0,overallHit=0;
 const combos=new Map();
 if(view==='first'){
  for(const roll of first){
   if(!roll||!Array.isArray(roll.pins))continue;
   const fallen=cleanPins(roll.pins);
   for(const pin of PINS){
    const p=byPin.get(pin);p.attempts++;
    if(fallen.includes(pin))p.hit++;
   }
   events++;
  }
 }else{
  for(const opp of opportunities){
   if(!opp)continue;
   const left=cleanPins(opp.left);
   const hit=cleanPins(opp.second);
   if(!left.length)continue;
   if(view==='single'&&left.length!==1)continue;
   if(view==='combinations'&&left.length<2)continue;
   const fullyConverted=left.every(pin=>hit.includes(pin));
   events++;if(fullyConverted)converted++;
   for(const pin of left){
    const p=byPin.get(pin);p.attempts++;
    if(hit.includes(pin))p.hit++;
   }
   if(view==='combinations'){
    const key=left.join('-');
    const entry=combos.get(key)||{pins:left,attempts:0,converted:0};
    entry.attempts++;
    if(fullyConverted)entry.converted++;
    combos.set(key,entry);
   }
  }
 }
 for(const p of pins){
  p.rate=pct(p.hit,p.attempts);
  overallPossible+=p.attempts;
  overallHit+=p.hit;
 }
 const rank=pins.filter(p=>p.attempts>=5).sort((a,b)=>b.rate-a.rate||b.attempts-a.attempts||a.pin-b.pin);
 const hardest=rank.slice().reverse().sort((a,b)=>a.rate-b.rate||b.attempts-a.attempts||a.pin-b.pin);
 const comboRanking=[...combos.values()].map(c=>({...c,rate:pct(c.converted,c.attempts)}))
  .sort((a,b)=>b.attempts-a.attempts||a.pins.length-b.pins.length||a.pins.join('-').localeCompare(b.pins.join('-')));
 return {
  mode:view,pins,events,converted,overallPossible,overallHit,
  overallRate:pct(overallHit,overallPossible),
  spareRate:view==='first'?null:pct(converted,events),
  best:rank.slice(0,3),hardest:hardest.slice(0,3),
  combos:comboRanking
 };
}
function pinSvg(n){
 return '<svg class="pinmap-pin-svg" viewBox="0 0 46 72" width="38" height="59" aria-hidden="true">'+
  '<path d="M20 4C20 1 26 1 26 4C27 11 24 15 27 20C30 27 37 33 38 44C39 56 36 65 32 68H14C10 65 7 56 8 44C9 33 16 27 19 20C22 15 19 11 20 4Z" fill="#ffc52c" stroke="#52718a" stroke-width="2"/>'+
  '<path d="M19 19C20 16 19 13 19 10H27C27 13 26 16 27 19" fill="#fff" stroke="#52718a" stroke-width="1.3"/>'+
  '<path d="M17 27H29" stroke="#e28c15" stroke-width="3"/>'+
  '<text x="23" y="50" text-anchor="middle" fill="#25465b" font-size="13" font-weight="800">'+n+'</text>'+
  '</svg>';
}
function pinHTML(p){
 const isSelected=p.pin===selectedPin;
 const label='Bolo '+p.pin+': '+(p.rate===null?'sin oportunidades':rate(p.rate)+', '+p.hit+' de '+p.attempts+' oportunidades');
 return '<button type="button" class="pinmap-pin '+(isSelected?'selected':'')+'" aria-label="'+esc(label)+'" aria-pressed="'+isSelected+'" onclick="MiBowlingPinStats.selectPin('+p.pin+')">'+
   '<strong class="pinmap-pin-rate">'+rate(p.rate)+'</strong>'+
   pinSvg(p.pin)+
   '<span class="pinmap-pin-attempts">'+(p.attempts?p.hit+' / '+p.attempts:'Sin datos')+'</span>'+
   '</button>';
}
function rankingCard(title,items,empty){
 return '<section class="pinmap-card pinmap-rank"><h3>'+title+'</h3>'+
  (items.length?items.map(p=>'<div class="pinmap-rank-row"><b>Bolo '+p.pin+'</b><span>'+rate(p.rate)+'</span>'+
    '<div class="pinmap-meter" role="img" aria-label="'+esc('Efectividad: '+rate(p.rate))+'"><i style="width:'+p.rate+'%"></i></div>'+
    '<small>'+p.hit+' / '+p.attempts+'</small></div>').join(''):'<p class="pinmap-muted">'+empty+'</p>')+
  '</section>';
}
function modeDescription(view){
 return {
  first:'Bolos derribados en lanzamientos con los 10 bolos colocados, incluidas las bonificaciones del décimo frame.',
  second:'Solo segundas tiradas con bolos en pie tras la primera; cada porcentaje usa los intentos reales de ese bolo.',
  single:'Conversiones cuando queda un único bolo en pie para el segundo lanzamiento.',
  combinations:'Probabilidad de derribo por bolo cuando quedan dos o más. La conversión total de cada combinación se muestra debajo.'
 }[view];
}
function html(a,opts={}){
 const analysis=compute(a,mode);
 const one=analysis.pins.find(p=>p.pin===selectedPin)||analysis.pins[0];
 const period=opts.period||'all';
 const profile=opts.profileName?' · '+esc(opts.profileName):'';
 const total=analysis.overallRate;
 const ring=total===null?0:Math.max(0,Math.min(100,total));
 const quantity=mode==='first'?'lanzamientos completos':'segundas tiradas';
 const note=analysis.events===1?' oportunidad':' oportunidades';
 const spare=mode!=='first';
 const periodOpts=[['all','Todo el historial'],['month','Mes actual'],['quarter','Trimestre actual'],['year','Año actual']];
 const combos=mode==='combinations'?
  '<section class="pinmap-card pinmap-combo"><h3>Combinaciones más frecuentes</h3>'+
  (analysis.combos.length?analysis.combos.slice(0,8).map(x=>'<div class="pinmap-combo-row"><strong>Bolos '+x.pins.join(' · ')+'</strong><span>'+x.converted+' / '+x.attempts+' spares</span><b>'+rate(x.rate)+'</b></div>').join(''):
   '<p class="pinmap-muted">Sin combinaciones registradas en partidas completas.</p>')+
  '</section>':'';
 return '<section id="pinmap-screen" class="pinmap-screen" aria-label="Mapa visual de precisión por bolo">'+
  '<div class="pinmap-top"><div><span class="pinmap-kicker">MI BOWLING · ANÁLISIS VISUAL'+profile+'</span>'+
    '<h2>Estadísticas de bolos</h2><p>Consulta tu precisión en la formación real de diez bolos.</p></div>'+
    '<label class="pinmap-period">Período<select id="pinmap-period" aria-label="Período de las estadísticas" onchange="statsPeriod=this.value;render()">'+
    periodOpts.map(([value,name])=>'<option value="'+value+'" '+(value===period?'selected':'')+'>'+name+'</option>').join('')+
    '</select></label></div>'+
  '<div class="pinmap-tabs" role="group" aria-label="Tipo de lanzamiento">'+
    MODES.map(([key,label])=>'<button class="'+(mode===key?'active':'')+'" type="button" aria-pressed="'+(mode===key)+'" onclick="MiBowlingPinStats.setMode(\''+key+'\')">'+label+'</button>').join('')+'</div>'+
  '<div class="pinmap-main-grid">'+
    '<section class="pinmap-card pinmap-map"><div class="pinmap-card-heading"><h3>Precisión por bolo</h3>'+
      '<span class="pinmap-chip">'+esc(LABELS[mode])+'</span></div>'+
      '<p class="pinmap-muted">'+modeDescription(mode)+'</p>'+
      '<div class="pinmap-rack" role="group" aria-label="Formación real de diez bolos">'+
      ROWS.map(row=>'<div class="pinmap-rack-row">'+row.map(n=>pinHTML(analysis.pins[n-1])).join('')+'</div>').join('')+
      '</div><p class="pinmap-footnote">Selecciona un bolo para ver su detalle. Porcentaje = derribos / oportunidades de ese bolo.</p>'+
    '</section>'+
    '<div class="pinmap-aside">'+
    '<section class="pinmap-card pinmap-overall"><h3>Efectividad global</h3>'+
      '<div class="pinmap-donut" style="--pinmap-ring:'+ring+'%" role="img" aria-label="'+esc('Precisión global '+rate(total))+'"><div><strong>'+rate(total)+'</strong></div></div>'+
      '<p class="pinmap-global-numbers">'+analysis.overallHit+' de '+analysis.overallPossible+' bolos disponibles derribados</p>'+
      '<dl><div><dt>Intentos analizados</dt><dd>'+analysis.events+'</dd></div>'+
      '<div><dt>Aciertos sobre bolos</dt><dd>'+analysis.overallHit+'</dd></div>'+
      '<div><dt>Bolos sin derribar</dt><dd>'+(analysis.overallPossible-analysis.overallHit)+'</dd></div>'+
      (spare?'<div><dt>Spares convertidos</dt><dd>'+analysis.converted+' / '+analysis.events+' ('+rate(analysis.spareRate)+')</dd></div>':'')+
      '</dl></section>'+
    '<section class="pinmap-card pinmap-detail"><h3>Bolo '+one.pin+' · Detalle</h3>'+
      '<strong>'+rate(one.rate)+'</strong><p>'+one.hit+' derribos de '+one.attempts+' oportunidades</p>'+
      '<div class="pinmap-meter"><i style="width:'+(one.rate||0)+'%"></i></div></section>'+
    '</div>'+
   '</div>'+
   '<div class="pinmap-rank-grid">'+
   rankingCard('Bolos más difíciles',analysis.hardest,'Todavía no hay cinco oportunidades por bolo para comparar resultados.')+
   rankingCard('Mejores bolos',analysis.best,'El ranking aparecerá al alcanzar cinco oportunidades por bolo.')+
   '</div>'+combos+
   '<p class="pinmap-footnote">Se incluyen únicamente partidas completas del jugador y modalidad seleccionados. El filtro de bola, si se aplica, atribuye cada lanzamiento a su bola. No se mezclan perfiles. '+(analysis.events?'':'Aún no hay lanzamientos válidos para esta vista.')+'</p>'+
  '</section>';
}
function setMode(next){
 if(!MODES.some(m=>m[0]===next))return;
 mode=next;
 if(typeof root.render==='function')root.render();
}
function selectPin(pin){
 if(!PINS.includes(pin))return;
 selectedPin=pin;
 if(typeof root.render==='function')root.render();
}
root.MiBowlingPinStats=Object.freeze({
 compute,html,setMode,selectPin,
 getMode:()=>mode,getSelectedPin:()=>selectedPin,
 reset:()=>{mode='first';selectedPin=1;}
});
})(typeof window!=='undefined'?window:globalThis);
