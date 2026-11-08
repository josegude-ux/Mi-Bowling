/* Pruebas sin dependencias: node tests/line-editor.test.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const editorSource=fs.readFileSync(path.join(root,'line-editor.js'),'utf8');
const appSource=fs.readFileSync(path.join(root,'app.js'),'utf8');
new vm.Script(editorSource);
new vm.Script(appSource);
const events={},changes={},inputs={};
for(const key of ['approach','arrow','breakpoint','breakpointFt'])inputs[key]={value:''};
const footGuide={setAttribute(k,v){this[k]=v}},lineGuide={setAttribute(k,v){this[k]=v}},summary={textContent:''},markers={};
const svg={
  id:'shot-lane',
  getBoundingClientRect(){return {left:0,top:0,width:380,height:644};},
  querySelector(sel){
    if(sel==='#shot-foot-guide')return footGuide;
    if(sel==='#shot-line-path')return lineGuide;
    const found=sel.match(/data-point="([^"]+)"/);
    return found?markers[found[1]]:null;
  }
};
for(const key of ['approach','arrow','breakpoint']){
  markers[key]={
    attrs:{'data-point':key},
    closest(selector){return selector==='.shot-marker'?this:(selector==='svg'||selector==='#shot-lane')?svg:null;},
    getAttribute(name){return this.attrs[name];},
    setAttribute(name,value){this.attrs[name]=value;},
    querySelector(){return this.label||(this.label={textContent:''});}
  };
}
const document={
  addEventListener(type,fn){(events[type]||(events[type]=[])).push(fn);},
  getElementById(id){return id==='shot-lane'?svg:id==='shot-line-summary'?summary:inputs[id]||null;}
};
const window={changeLine(k,value){changes[k]=value;}};
vm.runInNewContext(editorSource,{document,window});
const api=window.MiBowlingLineEditor;
assert.ok(api,'Editor visual disponible');
const markup=api.html({approach:'25',arrow:'15',breakpoint:'8',breakpointFt:'43'});
assert.equal((markup.match(/class="shot-marker"/g)||[]).length,3);
for(const name of ['approach','arrow','breakpoint','breakpointFt'])assert.ok(markup.includes('id="'+name+'"'));
assert.match(markup,/id="approach"[^>]*value="25"/);
assert.ok(!api.html({approach:'"><img src=x>'}).includes('<img src=x>'),'HTML escapado');
assert.ok(api.boardX(1)>api.boardX(39),'Tabla 1 al lado derecho');
const fire=(type,event)=>{for(const fn of events[type]||[])fn(event);};
const pointer=(key,x,y,id=1)=>({target:markers[key],clientX:x,clientY:y,pointerId:id,preventDefault(){}});
fire('pointerdown',pointer('approach',api.boardX(25),601));
fire('pointermove',pointer('approach',api.boardX(29.5),601));
fire('pointerup',pointer('approach',api.boardX(29.5),601));
assert.equal(inputs.approach.value,'29.5');
fire('pointerdown',pointer('breakpoint',api.boardX(9),150,2));
fire('pointerup',pointer('breakpoint',api.boardX(9),150,2));
assert.equal(inputs.breakpoint.value,'9');
assert.equal(inputs.breakpointFt.value,'45');
fire('keydown',{target:markers.arrow,key:'ArrowLeft',preventDefault(){}});
assert.equal(inputs.arrow.value,'15.5');
assert.equal(changes.breakpointFt,'45');
assert.match(summary.textContent,/29\.5.*15\.5.*9.*45 pies/);
assert.match(lineGuide.d,/L /);
const match=appSource.match(/const cleanLine=o=>\([^;]*\);/);
assert.ok(match,'Migración de línea disponible');
const cleanLine=vm.runInNewContext(match[0]+' cleanLine;', {});
assert.equal(cleanLine({approach:'22',arrow:'14',breakpoint:'7'}).breakpointFt,'','Datos antiguos compatibles');
assert.equal(cleanLine({approach:'22',arrow:'14',breakpoint:'7',breakpointFt:'44'}).breakpointFt,'44','Distancia conservada');
assert.equal(cleanLine({}).approach,'','No inventa posiciones');
assert.ok(appSource.includes("['approach','arrow','breakpoint','breakpointFt']"),'Todos los campos guardados por tirada');
console.log('OK · 15 comprobaciones del editor de línea visual');
