/* MI BOWLING · Pista 3D en perspectiva, LAB R2.
 * Render 3D original sobre Canvas 2D con proyección de cámara y ray casting en la pista.
 * Visualización geométrica ilustrativa: NO calcula la física de la bola.
 * No usa bibliotecas externas ni modifica el modelo de datos. */
(function () {
  'use strict';
  var colors={approach:'#e38b30',arrow:'#078fb2',breakpoint:'#8152cc'};
  var names={approach:'Pies',arrow:'Flecha',breakpoint:'Break'};
  var selectedView='3d',cameraYaw=0,cameraTilt=0,zoom=1,drag=null;
  var last={projected:{},camera:null,width:0,height:0,markers:0};
  function clamp(x,lo,hi){return Math.max(lo,Math.min(hi,x));}
  function num(v,fallback,lo,hi){if(v===undefined||v===null||String(v).trim()==='')return fallback;var n=Number(v);return Number.isFinite(n)?clamp(n,lo,hi):fallback;}
  function add(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
  function sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
  function scale(a,s){return [a[0]*s,a[1]*s,a[2]*s];}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
  function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function unit(a){var d=Math.sqrt(dot(a,a))||1;return scale(a,1/d);}
  function position(board){return 20-board;} // tabla 1 a la derecha mirando los bolos
  function current(){
    var d={approach:25,arrow:15,breakpoint:8,breakpointFt:43};
    for(var k in d){var el=document.getElementById(k);if(el)d[k]=num(el.value,d[k],k==='breakpointFt'?25:1,k==='breakpointFt'?55:39);}
    return d;
  }
  function camera(w,h){
    var mobile=w<500,baseZ=mobile?-60:-45,baseY=mobile?35:29;
    var offset=mobile?15:30;
    var eye=[offset*Math.sin(cameraYaw),baseY+cameraTilt,baseZ+offset*(1-Math.cos(cameraYaw))];
    var target=[0,0,mobile?25:25];
    eye=add(target,scale(sub(eye,target),1/zoom));
    var forward=unit(sub(target,eye)),right=unit(cross([0,1,0],forward)),up=unit(cross(forward,right));
    return {eye:eye,forward:forward,right:right,up:up,tan:Math.tan((mobile?54:49)*Math.PI/360),w:w,h:h};
  }
  function project(p,c){
    var d=sub(p,c.eye),depth=dot(d,c.forward);
    if(depth<=.1)return null;
    var m=c.h/(2*c.tan*depth);
    return {x:c.w/2+dot(d,c.right)*m,y:c.h/2-dot(d,c.up)*m,depth:depth};
  }
  function rayPlane(x,y,c){
    var factor=2*c.tan/c.h;
    var dir=unit(add(c.forward,add(scale(c.right,(x-c.w/2)*factor),scale(c.up,(c.h/2-y)*factor))));
    if(Math.abs(dir[1])<1e-5)return null;
    var t=-c.eye[1]/dir[1];
    return t>0?add(c.eye,scale(dir,t)):null;
  }
  function poly(ctx,c,pts,fill,stroke,width){
    var points=pts.map(function(p){return project(p,c);});
    if(points.some(function(p){return !p;}))return;
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
    for(var i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
    ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width||1;ctx.stroke();}
  }
  function segment(ctx,c,pts,color,width,dashes){
    var xy=pts.map(function(v){return project(v,c);});if(xy.some(function(p){return !p;}))return;
    ctx.beginPath();ctx.moveTo(xy[0].x,xy[0].y);
    xy.slice(1).forEach(function(p){ctx.lineTo(p.x,p.y);});
    ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=width;ctx.strokeStyle=color;
    ctx.setLineDash(dashes||[]);ctx.stroke();ctx.setLineDash([]);
  }
  function label(ctx,str,x,y,color){
    ctx.font='700 11px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    var width=ctx.measureText(str).width+18;
    var left=clamp(x-width/2,4,Math.max(4,last.width-width-4));
    ctx.fillStyle='rgba(255,255,255,.96)';ctx.beginPath();ctx.roundRect(left,y-13,width,26,8);ctx.fill();
    ctx.fillStyle=color||'#194967';ctx.fillText(str,left+width/2,y);
  }
  function marker(ctx,spot,color,title,board){
    ctx.shadowBlur=13;ctx.shadowColor=color+'99';
    ctx.beginPath();ctx.arc(spot.x,spot.y,15,0,Math.PI*2);
    ctx.fillStyle=color;ctx.fill();ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(spot.x,spot.y,15,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
    ctx.font='800 11px system-ui, sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(String(board),spot.x,spot.y);
    var dy=title==='Pies'?31:-29;
    label(ctx,title,spot.x,spot.y+dy,'#2f5471');
  }
  function scene(canvas){
    var bounds=canvas.getBoundingClientRect(),w=Math.max(1,bounds.width),h=Math.max(1,bounds.height);
    if(w<10||h<10)return;
    var ratio=clamp(window.devicePixelRatio||1,1,2);
    if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){
      canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
    }
    var ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.setTransform(ratio,0,0,ratio,0,0);
    last.width=w;last.height=h;
    ctx.clearRect(0,0,w,h);
    var sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#d8ebfc');sky.addColorStop(.66,'#f4faff');sky.addColorStop(1,'#d4e4ef');
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    var c=camera(w,h);last.camera=c;
    // Escenario 3D: pista 60 ft, pasillo, bordes y canaletas, sin librerías.
    poly(ctx,c,[[-29,-.6,-12],[29,-.6,-12],[29,-.6,63],[-29,-.6,63]],'#b4d1df');
    poly(ctx,c,[[-24,-.3,0],[-20,-.3,0],[-20,-.3,60],[-24,-.3,60]],'#6e91a4');
    poly(ctx,c,[[20,-.3,0],[24,-.3,0],[24,-.3,60],[20,-.3,60]],'#6e91a4');
    poly(ctx,c,[[-20,0,-12],[20,0,-12],[20,0,0],[-20,0,0]],'#c4d7df');
    poly(ctx,c,[[-20,0,0],[20,0,0],[20,0,60],[-20,0,60]],'#f5d9a8');
    for(var x=-20;x<20;x++){
      poly(ctx,c,[[x,0,0],[x+1,0,0],[x+1,0,60],[x,0,60]],(x%4===0)?'rgba(177,123,64,.14)':'rgba(255,255,255,.085)');
    }
    for(var board=5;board<=35;board+=5){
      var bx=position(board);
      poly(ctx,c,[[bx-.75,.05,13.8],[bx+.75,.05,13.8],[bx,.05,17]],'#6a8aa0');
    }
    segment(ctx,c,[[-20,.06,0],[20,.06,0]],'#214d66',4);
    segment(ctx,c,[[-20,.05,60],[20,.05,60]],'#718ba2',2);
    // Estructura de pinos: sombras y volumen simplificado sobre el plano.
    var pins=[[0,57.1],[-1.3,57.8],[1.3,57.8],[-2.6,58.5],[0,58.5],[2.6,58.5],[-3.9,59.2],[-1.3,59.2],[1.3,59.2],[3.9,59.2]];
    pins.forEach(function(item){
      var base=project([item[0],0,item[1]],c),top=project([item[0],2,item[1]],c);
      if(!base||!top)return;
      ctx.strokeStyle='#cad4db';ctx.lineWidth=Math.max(2,Math.min(9,base.y-top.y)*.58);
      ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(top.x,top.y);ctx.stroke();
      ctx.fillStyle='#fefefe';ctx.beginPath();ctx.arc(top.x,top.y,Math.max(2,ctx.lineWidth*.48),0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#bb4551';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(top.x-2,(base.y+top.y)/2);ctx.lineTo(top.x+2,(base.y+top.y)/2);ctx.stroke();
    });
    var v=current();
    var p={
      approach:[position(v.approach),.5,-9],
      arrow:[position(v.arrow),.5,15],
      breakpoint:[position(v.breakpoint),.5,v.breakpointFt]
    };
    // Trazo esquemático: referencia de pies NO es trayectoria real de la bola.
    segment(ctx,c,[p.approach,p.arrow],colors.approach,3,[7,7]);
    segment(ctx,c,[p.arrow,p.breakpoint],colors.arrow,5);
    segment(ctx,c,[p.breakpoint,[4,.5,57]],'rgba(7,143,178,.45)',3,[6,7]);
    last.projected={};
    ['approach','arrow','breakpoint'].forEach(function(k){
      var spot=project(p[k],c);if(!spot)return;
      last.projected[k]={x:spot.x,y:spot.y,board:v[k],ft:k==='breakpoint'?v.breakpointFt:null};
      marker(ctx,spot,colors[k],names[k],v[k]);
    });
    last.markers=Object.keys(last.projected).length;
    var legend=document.getElementById('lane3d-camera-status');
    if(legend)legend.textContent='Cámara '+Math.round(cameraYaw*100)/100+' · Zoom '+Math.round(zoom*100)+'%';
  }
  function sync(){
    var wrap=document.getElementById('shot-stage');
    if(!wrap)return;
    wrap.classList.toggle('lane-view-3d',selectedView==='3d');
    wrap.classList.toggle('lane-view-2d',selectedView==='2d');
    var a=document.getElementById('view3d-button'),b=document.getElementById('view2d-button');
    if(a){a.setAttribute('aria-pressed',String(selectedView==='3d'));a.classList.toggle('active',selectedView==='3d');}
    if(b){b.setAttribute('aria-pressed',String(selectedView==='2d'));b.classList.toggle('active',selectedView==='2d');}
  }
  function refresh(){
    sync();
    if(selectedView!=='3d')return;
    var canvas=document.getElementById('lane3d-canvas');
    if(canvas)scene(canvas);
  }
  function setView(mode){if(mode!=='3d'&&mode!=='2d')return;selectedView=mode;sync();refresh();}
  function setCamera(which){
    if(which==='izquierda')cameraYaw=-.57;
    else if(which==='derecha')cameraYaw=.57;
    else if(which==='centro'){cameraYaw=0;cameraTilt=0;}
    else return;
    refresh();
  }
  function changeZoom(delta){zoom=clamp(Math.round((zoom+delta)*10)/10,.7,1.5);refresh();}
  function html(){
    return '<div class="lane3d-head"><div><span class="lane3d-eyebrow">MI BOWLING · ANÁLISIS DE LÍNEA</span><h4>Pista interactiva</h4></div>'+
      '<div class="lane3d-switch" role="group" aria-label="Vista de la pista"><button id="view3d-button" class="lane3d-toggle" type="button" aria-pressed="true" onclick="MiBowlingLane3D.setView(\'3d\')">Perspectiva 3D</button><button id="view2d-button" class="lane3d-toggle" type="button" aria-pressed="false" onclick="MiBowlingLane3D.setView(\'2d\')">Vista cenital</button></div></div>'+
      '<div class="lane3d-frame" aria-label="Vista de pista en perspectiva con puntos interactivos">'+
        '<canvas id="lane3d-canvas" class="lane3d-canvas" tabindex="0" role="img" aria-label="Vista 3D esquemática de la pista; puedes arrastrar los puntos con el dedo o utilizar los campos de tablas"></canvas>'+
        '<div class="lane3d-footer"><span id="lane3d-camera-status" aria-live="polite">Cámara centrada</span><span>Arrastra un punto para modificarlo · Arrastra el fondo para girar</span></div>'+
        '<div class="lane3d-camera" role="group" aria-label="Controles de cámara">'+
        '<button type="button" onclick="MiBowlingLane3D.setCamera(\'izquierda\')" title="Ver desde la izquierda" aria-label="Cámara izquierda">↶</button>'+
        '<button type="button" onclick="MiBowlingLane3D.setCamera(\'centro\')" title="Centrar cámara" aria-label="Centrar cámara">◎</button>'+
        '<button type="button" onclick="MiBowlingLane3D.setCamera(\'derecha\')" title="Ver desde la derecha" aria-label="Cámara derecha">↷</button>'+
        '<button type="button" onclick="MiBowlingLane3D.changeZoom(-.1)" aria-label="Alejar cámara">−</button>'+
        '<button type="button" onclick="MiBowlingLane3D.changeZoom(.1)" aria-label="Acercar cámara">+</button></div>'+
      '</div>';
  }
  function update(k,board,ft){
    var el=document.getElementById(k);if(!el)return;
    var value=String(Math.round(clamp(board,1,39)*2)/2);
    if(el.value!==value){
      el.value=value;if(typeof window.changeLine==='function')window.changeLine(k,value);
    }
    if(k==='breakpoint'&&ft!==undefined){
      var d=document.getElementById('breakpointFt');
      if(d){
        var distance=String(clamp(Math.round(ft),25,55));
        if(d.value!==distance){d.value=distance;if(typeof window.changeLine==='function')window.changeLine('breakpointFt',distance);}
      }
    }
    if(window.MiBowlingLineEditor&&typeof window.MiBowlingLineEditor.refresh==='function')window.MiBowlingLineEditor.refresh();
    else refresh();
  }
  function hit(x,y){
    var name=null,best=38*38;
    Object.keys(last.projected).forEach(function(k){
      var p=last.projected[k],dist=(x-p.x)*(x-p.x)+(y-p.y)*(y-p.y);
      if(dist<best){best=dist;name=k;}
    });
    return name;
  }
  function down(evt){
    var canvas=evt.target;if(!canvas||canvas.id!=='lane3d-canvas'||selectedView!=='3d')return;
    var bounds=canvas.getBoundingClientRect(),x=evt.clientX-bounds.left,y=evt.clientY-bounds.top;
    drag={id:evt.pointerId,mode:hit(x,y)||'camera',canvas:canvas,x:x,y:y,yaw:cameraYaw,tilt:cameraTilt};
    if(canvas.setPointerCapture){try{canvas.setPointerCapture(evt.pointerId);}catch(e){}}
    evt.preventDefault();
  }
  function move(evt){
    if(!drag||drag.id!==evt.pointerId||selectedView!=='3d')return;
    var bounds=drag.canvas.getBoundingClientRect(),x=evt.clientX-bounds.left,y=evt.clientY-bounds.top;
    if(drag.mode==='camera'){
      cameraYaw=clamp(drag.yaw+(x-drag.x)/Math.max(210,last.width)*1.3,-.8,.8);
      cameraTilt=clamp(drag.tilt-(y-drag.y)*.14,-8,12);refresh();
    }else{
      var point=rayPlane(x,y,last.camera);
      if(point)update(drag.mode,20-point[0],drag.mode==='breakpoint'?point[2]:undefined);
    }
    evt.preventDefault();
  }
  function up(evt){
    if(!drag||drag.id!==evt.pointerId)return;
    if(drag.canvas.releasePointerCapture){try{drag.canvas.releasePointerCapture(evt.pointerId);}catch(e){}}
    drag=null;
  }
  document.addEventListener('pointerdown',down);
  document.addEventListener('pointermove',move,{passive:false});
  ['pointerup','pointercancel'].forEach(function(type){document.addEventListener(type,up);});
  document.addEventListener('keydown',function(evt){
    if(!evt.target||evt.target.id!=='lane3d-canvas'||selectedView!=='3d')return;
    if(evt.key==='ArrowLeft'){evt.preventDefault();cameraYaw=clamp(cameraYaw-.12,-.8,.8);refresh();}
    if(evt.key==='ArrowRight'){evt.preventDefault();cameraYaw=clamp(cameraYaw+.12,-.8,.8);refresh();}
    if(evt.key==='+'||evt.key==='='){evt.preventDefault();changeZoom(.1);}
    if(evt.key==='-'){evt.preventDefault();changeZoom(-.1);}
  });
  if(typeof window.addEventListener==='function'){
    window.addEventListener('resize',function(){if(selectedView==='3d')refresh();});
    window.addEventListener('orientationchange',function(){if(selectedView==='3d')refresh();});
  }
  window.MiBowlingLane3D={
    html:html,refresh:refresh,setView:setView,setCamera:setCamera,changeZoom:changeZoom,
    inspect:function(){return {view:selectedView,cameraYaw:cameraYaw,cameraTilt:cameraTilt,zoom:zoom,points:last.projected,width:last.width,height:last.height,markers:last.markers};},
    project:project,camera:camera,rayPlane:rayPlane
  };
})();