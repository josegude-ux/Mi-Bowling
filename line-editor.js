/* MI BOWLING — Editor visual de línea, R1. Original, sin dependencias. */
(function () {
  'use strict';
  var X0=38, X1=342, FOUL=510, ARROW=390, STAND=601, TOP=30, SCALE=8;
  var FIELDS=['approach','arrow','breakpoint'];
  var LABELS={approach:'Posición de los pies',arrow:'Paso por las flechas',breakpoint:'Breakpoint'};
  var DEFAULTS={approach:25,arrow:15,breakpoint:8,breakpointFt:43};
  var drag=null;
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function num(value,fallback,min,max){
    if(value===undefined||value===null||String(value).trim()==='')return fallback;
    var n=Number(value);
    return Number.isFinite(n)&&n>=min&&n<=max?n:fallback;
  }
  function visible(v){return String(v===undefined||v===null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function boardX(board){return X1-(board-.5)*(X1-X0)/39;}
  function bpY(ft){return FOUL-ft*SCALE;}
  function vals(line){
    line=line||{};
    return {
      approach:num(line.approach,DEFAULTS.approach,1,39),
      arrow:num(line.arrow,DEFAULTS.arrow,1,39),
      breakpoint:num(line.breakpoint,DEFAULTS.breakpoint,1,39),
      breakpointFt:num(line.breakpointFt,DEFAULTS.breakpointFt,25,55)
    };
  }
  function editorState(){
    var state={};
    Object.keys(DEFAULTS).forEach(function(k){var el=document.getElementById(k);state[k]=el?el.value:'';});
    return vals(state);
  }
  function coordinates(o){
    return {approach:[boardX(o.approach),STAND],
      arrow:[boardX(o.arrow),ARROW],
      breakpoint:[boardX(o.breakpoint),bpY(o.breakpointFt)]};
  }
  function element(tag,attrs,body){
    return '<'+tag+' '+attrs+'>'+body+'</'+tag+'>';
  }
  function svg(line){
    var v=vals(line),p=coordinates(v),nodes=[];
    nodes.push('<svg id="shot-lane" class="shot-lane" viewBox="0 0 380 644" role="group" aria-label="Pista de bowling. Vista cenital y tres marcadores ajustables." xmlns="http://www.w3.org/2000/svg">');
    nodes.push('<rect x="27" y="17" width="326" height="506" rx="8" fill="#e4cfaa"/>');
    nodes.push('<rect x="'+X0+'" y="'+TOP+'" width="'+(X1-X0)+'" height="'+(FOUL-TOP)+'" fill="#f3debb"/>');
    nodes.push('<rect x="'+X0+'" y="'+FOUL+'" width="'+(X1-X0)+'" height="112" fill="#dbe5ea"/>');
    for(var i=0;i<=39;i++){
      var x=X1-i*(X1-X0)/39;
      nodes.push('<line x1="'+x.toFixed(2)+'" y1="'+TOP+'" x2="'+x.toFixed(2)+'" y2="'+FOUL+'" stroke="#bb985d" stroke-width=".6" opacity=".42"/>');
    }
    for(var b=5;b<=35;b+=5){
      var ax=boardX(b);
      nodes.push('<path d="M '+ax.toFixed(2)+' '+(ARROW-15)+' l -5 20 l 10 0 z" fill="#42647c" opacity=".55"/>');
      nodes.push('<text x="'+ax.toFixed(2)+'" y="535" text-anchor="middle" font-size="11" font-weight="700" fill="#4e6d81">'+b+'</text>');
    }
    nodes.push('<line x1="'+X0+'" y1="'+FOUL+'" x2="'+X1+'" y2="'+FOUL+'" stroke="#254e60" stroke-width="4"/>');
    nodes.push('<text x="12" y="503" font-size="10" fill="#527080" transform="rotate(-90 12 503)">LÍNEA DE FALTA</text>');
    nodes.push('<text x="190" y="553" text-anchor="middle" font-size="12" font-weight="800" fill="#355c70">ZONA DE SALIDA</text>');
    nodes.push('<text x="190" y="571" text-anchor="middle" font-size="10" fill="#355c70">39 tablas · 1 a la derecha mirando los bolos</text>');
    nodes.push('<text x="12" y="'+(ARROW+4)+'" font-size="10" fill="#42647c" transform="rotate(-90 12 '+(ARROW+4)+')">15 ft</text>');
    nodes.push('<text x="12" y="'+(bpY(v.breakpointFt)+6)+'" font-size="10" fill="#42647c" transform="rotate(-90 12 '+(bpY(v.breakpointFt)+6)+')">BP</text>');
    var pins=[190,175,205,160,190,220,145,175,205,235];
    pins.forEach(function(x,i){var row=i<1?0:i<3?1:i<6?2:3;nodes.push('<circle cx="'+x+'" cy="'+(42+row*9)+'" r="3.5" fill="white" stroke="#6b858e" stroke-width=".8"/>');});
    nodes.push('<path id="shot-foot-guide" fill="none" stroke="#cf7b2f" stroke-width="2.7" stroke-dasharray="7 6" d="M '+p.approach.join(' ')+' L '+p.arrow.join(' ')+'"/>');
    nodes.push('<path id="shot-line-path" fill="none" stroke="#009cad" stroke-width="4" stroke-linecap="round" d="M '+p.arrow.join(' ')+' L '+p.breakpoint.join(' ')+'"/>');
    FIELDS.forEach(function(k){
      var pos=p[k],color=k==='approach'?'#df842d':k==='arrow'?'#008d9e':'#6d48ab';
      nodes.push('<g class="shot-marker" tabindex="0" role="slider" data-point="'+k+'" aria-label="'+LABELS[k]+', tabla" aria-valuemin="1" aria-valuemax="39" aria-valuenow="'+v[k]+'" transform="translate('+pos[0]+' '+pos[1]+')">');
      nodes.push('<circle class="shot-marker-halo" r="20" fill="'+color+'" opacity=".17"/>');
      nodes.push('<circle class="shot-marker-disc" r="14" fill="'+color+'" stroke="#fff" stroke-width="2.8"/>');
      nodes.push('<text text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="white">'+v[k]+'</text>');
      nodes.push('</g>');
    });
    nodes.push('<text x="190" y="637" text-anchor="middle" font-size="10" fill="#658198">Arrastra los puntos o introduce las tablas abajo</text>');
    nodes.push('</svg>');
    return nodes.join('');
  }
  function field(key,label,placeholder){
    return '<label class="shot-field" for="'+key+'"><span>'+label+'</span><input class="input" id="'+key+'" name="'+key+'" type="number" inputmode="decimal" min="1" max="39" step="0.5" placeholder="'+placeholder+'" oninput="changeLine(\''+key+'\',this.value);MiBowlingLineEditor.refresh()" aria-label="'+label+' en tablas"></label>';
  }
  function html(line){
    line=line||{};
    var initial=svg(line);
    return '<section class="shot-editor" aria-label="Editor visual de la línea de lanzamiento">'+
      '<p class="shot-explanation">Marca <b>dónde colocas los pies</b>, la <b>tabla por la que pasa la bola en las flechas</b> y el <b>breakpoint</b>. Los puntos pueden arrastrarse sobre la pista.</p>'+
      '<div class="shot-editor-layout"><div class="shot-stage '+(window.MiBowlingLane3D?'lane-view-3d':'lane-view-2d')+'" id="shot-stage">'+(window.MiBowlingLane3D?window.MiBowlingLane3D.html():'')+'<div class="shot-visual">'+initial+
      '<div class="shot-legend"><span><i class="shot-dot foot"></i>Pies</span><span><i class="shot-dot arrow"></i>Flecha</span><span><i class="shot-dot bp"></i>Break</span></div></div></div>'+
      '<div class="shot-controls">'+
      field('approach','1 · Salida de los pies','Ej. 25').replace('placeholder="Ej. 25"','value="'+visible(line.approach)+'" placeholder="Ej. 25"')+
      field('arrow','2 · Paso por flechas','Ej. 15').replace('placeholder="Ej. 15"','value="'+visible(line.arrow)+'" placeholder="Ej. 15"')+
      field('breakpoint','3 · Breakpoint, tabla','Ej. 8').replace('placeholder="Ej. 8"','value="'+visible(line.breakpoint)+'" placeholder="Ej. 8"')+
      '<label class="shot-field" for="breakpointFt"><span>Distancia del break (pies)</span><input id="breakpointFt" class="input" type="number" min="25" max="55" step="1" inputmode="numeric" value="'+visible(line.breakpointFt)+'" placeholder="43" oninput="changeLine(\'breakpointFt\',this.value);MiBowlingLineEditor.refresh()"></label>'+
      '<div id="shot-line-summary" class="shot-line-summary" aria-live="polite"></div>'+
      '<p class="hint">Es un <b>registro visual</b>, no una predicción física del recorrido. La línea discontinua une tu posición de pies con la referencia de flechas; no representa la suelta real. Si un campo está vacío, el dibujo usa un ejemplo hasta que lo ajustes.</p>'+
      '</div></div></section>';
  }
  function refresh(){
    var svgEl=document.getElementById('shot-lane');if(!svgEl)return;
    var v=editorState(),p=coordinates(v);
    var f=svgEl.querySelector('#shot-foot-guide'),line=svgEl.querySelector('#shot-line-path');
    if(f)f.setAttribute('d','M '+p.approach.join(' ')+' L '+p.arrow.join(' '));
    if(line)line.setAttribute('d','M '+p.arrow.join(' ')+' L '+p.breakpoint.join(' '));
    FIELDS.forEach(function(k){
      var marker=svgEl.querySelector('[data-point="'+k+'"]');if(!marker)return;
      marker.setAttribute('transform','translate('+p[k][0]+' '+p[k][1]+')');
      marker.setAttribute('aria-valuenow',String(v[k]));
      var t=marker.querySelector('text');if(t)t.textContent=String(v[k]);
    });
    var summary=document.getElementById('shot-line-summary');
    if(summary){
      var raw=FIELDS.map(function(k){var el=document.getElementById(k);return el&&el.value.trim()?el.value.trim():'—';});
      var ft=document.getElementById('breakpointFt');
      summary.textContent='Pies '+raw[0]+' · Flecha '+raw[1]+' · Break '+raw[2]+(ft&&ft.value.trim()?' a '+ft.value.trim()+' pies':'');
    }
    if(window.MiBowlingLane3D&&typeof window.MiBowlingLane3D.refresh==='function')window.MiBowlingLane3D.refresh();
  }
  function toSvg(evt,svgEl){
    var box=svgEl.getBoundingClientRect();
    return {x:(evt.clientX-box.left)*380/box.width,y:(evt.clientY-box.top)*644/box.height};
  }
  function updateFromPointer(evt){
    if(!drag||evt.pointerId!==drag.id)return;
    var pos=toSvg(evt,drag.svg),k=drag.key;
    var board=Math.round(clamp((X1-pos.x)*39/(X1-X0)+.5,1,39)*2)/2;
    board=clamp(board,1,39);
    var input=document.getElementById(k);
    if(!input)return;
    if(input.value!==String(board)){input.value=String(board);if(typeof window.changeLine==='function')window.changeLine(k,input.value);}
    if(k==='breakpoint'){
      var feet=clamp(Math.round((FOUL-pos.y)/SCALE),25,55);
      var d=document.getElementById('breakpointFt');
      if(d&&d.value!==String(feet)){d.value=String(feet);if(typeof window.changeLine==='function')window.changeLine('breakpointFt',d.value);}
    }
    refresh();
  }
  document.addEventListener('pointerdown',function(evt){
    var marker=evt.target.closest&&evt.target.closest('.shot-marker');
    if(!marker)return;
    var svgEl=marker.closest('svg');
    if(!svgEl||svgEl.id!=='shot-lane')return;
    drag={id:evt.pointerId,key:marker.getAttribute('data-point'),svg:svgEl};
    evt.preventDefault();
    updateFromPointer(evt);
  });
  document.addEventListener('pointermove',function(evt){
    if(!drag||drag.id!==evt.pointerId)return;
    evt.preventDefault();updateFromPointer(evt);
  },{passive:false});
  ['pointerup','pointercancel'].forEach(function(type){document.addEventListener(type,function(evt){if(drag&&drag.id===evt.pointerId)drag=null;});});
  document.addEventListener('keydown',function(evt){
    var marker=evt.target.closest&&evt.target.closest('.shot-marker');
    if(!marker||!marker.closest('#shot-lane'))return;
    var key=marker.getAttribute('data-point'),input=document.getElementById(key);
    if(!input)return;
    var step=evt.key==='ArrowLeft'?.5:evt.key==='ArrowRight'?-.5:0;
    if(step){
      evt.preventDefault();input.value=String(clamp(num(input.value,DEFAULTS[key],1,39)+step,1,39));
      if(typeof window.changeLine==='function')window.changeLine(key,input.value);refresh();
    }else if(key==='breakpoint'&&(evt.key==='ArrowUp'||evt.key==='ArrowDown')){
      evt.preventDefault();var distance=document.getElementById('breakpointFt');
      if(distance){distance.value=String(clamp(num(distance.value,43,25,55)+(evt.key==='ArrowUp'?1:-1),25,55));if(typeof window.changeLine==='function')window.changeLine('breakpointFt',distance.value);refresh();}
    }
  });
  window.MiBowlingLineEditor={html:html,refresh:refresh,values:vals,boardX:boardX};
})();
