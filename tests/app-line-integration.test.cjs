/* Prueba de integración real de app.js con navegador y almacenamiento simulados.
   Ejecutar: node tests/app-line-integration.test.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const KEY='mi-bowling-analitica-v2';
const start={
  version:2,hand:'diestro',balls:[],patterns:[],
  sessions:[{
    id:'session-1',type:'entrenamiento',date:'2026-11-08',title:'Prueba LAB',
    venue:'Bolera ficticia',notes:'Datos inventados',currentBallId:'',
    currentLine:{approach:'25',arrow:'15',breakpoint:'8'},
    lane:3, games:[{
      id:'game-1',includeStats:true,pair:null,startLane:3,segments:[],
      rolls:[
        {frame:1,ball:1,pins:[1,2,3,4,5,6,7],ballId:'',line:{approach:'25',arrow:'15',breakpoint:'8'},lane:3,pair:null,foul:false,createdAt:'2026-11-08T09:00:00Z'},
        {frame:1,ball:2,pins:[8,9],ballId:'',line:{approach:'26',arrow:'15',breakpoint:'8'},lane:3,pair:null,foul:false,createdAt:'2026-11-08T09:00:01Z'}
      ]
    }]
  }]
};
const values=new Map([[KEY,JSON.stringify(start)]]);
const storage={
  getItem:k=>values.has(k)?values.get(k):null,
  setItem:(k,v)=>values.set(k,String(v)),
  removeItem:k=>values.delete(k)
};
const nodes={
  'restore-file':{addEventListener(){}},
  'bottom-nav':{innerHTML:''},
  'app':{innerHTML:''}
};
const messages=[];
const document={
  getElementById:id=>nodes[id]||null,
  querySelector:()=>null,
  body:{classList:{toggle(){}}}
};
const context=vm.createContext({
  window:{scrollTo(){},addEventListener(){}},
  document,
  localStorage:storage,
  navigator:{},
  location:{protocol:'file:'},
  MiBowlingLineEditor:{html(){return '<div class="mock-lane-editor">Pista LAB</div>';},refresh(){}},
  alert:msg=>messages.push(String(msg)),
  confirm:()=>false,
  console,
  setTimeout() {},
  clearTimeout() {}
});
vm.runInContext(script,context,{timeout:2000,filename:'app.js'});
assert.match(nodes.app.innerHTML,/Mi Bowling/,'La portada se muestra');
vm.runInContext("activeId='session-1';go('registro')",context);
assert.match(nodes.app.innerHTML,/mock-lane-editor/,'Editor visual integrado en el registro');
assert.match(nodes.app.innerHTML,/Editar línea/,'Corrección histórica disponible');
vm.runInContext('editLoggedLine(0)',context);
assert.match(nodes.app.innerHTML,/id="shot-log-edit"/,'El formulario de corrección se abre');
for(const [k,v] of Object.entries({approach:'27',arrow:'15.5',breakpoint:'9',breakpointFt:'44'})){
  nodes['log-line-'+k]={value:v};
}
vm.runInContext('saveLoggedLine(0)',context);
let saved=JSON.parse(values.get(KEY));
let rolls=saved.sessions[0].games[0].rolls;
assert.equal(rolls.length,2,'Conserva todas las tiradas');
assert.deepEqual(rolls[0].pins,[1,2,3,4,5,6,7],'No toca los bolos');
assert.equal(rolls[0].line.approach,'27');
assert.equal(rolls[0].line.arrow,'15.5');
assert.equal(rolls[0].line.breakpoint,'9');
assert.equal(rolls[0].line.breakpointFt,'44');
assert.equal(rolls[1].line.approach,'26','No modifica los tiros posteriores');
assert.equal(saved.sessions[0].currentLine.approach,'25','No afecta automáticamente la línea de juego actual');
vm.runInContext('editLoggedLine(0)',context);
nodes['log-line-approach']={value:'44'};
nodes['log-line-arrow']={value:'15'};
nodes['log-line-breakpoint']={value:'8'};
nodes['log-line-breakpointFt']={value:'43'};
vm.runInContext('saveLoggedLine(0)',context);
saved=JSON.parse(values.get(KEY));
assert.equal(saved.sessions[0].games[0].rolls[0].line.approach,'27','Rechaza posición fuera de rango');
assert.ok(messages.length>=1,'Advierte al introducir un valor inválido');
vm.runInContext('cancelLoggedLine()',context);
for(const [k,v] of Object.entries({approach:'29.5',arrow:'17',breakpoint:'10',breakpointFt:'45'}))nodes[k]={value:v};
nodes['roll-ball']={value:''};
vm.runInContext('recordRoll()',context);
saved=JSON.parse(values.get(KEY));
rolls=saved.sessions[0].games[0].rolls;
assert.equal(rolls.length,3,'Registra una nueva tirada');
assert.equal(rolls[2].line.approach,'29.5','Pies conservados');
assert.equal(rolls[2].line.arrow,'17','Flecha conservada');
assert.equal(rolls[2].line.breakpoint,'10','Breakpoint conservado');
assert.equal(rolls[2].line.breakpointFt,'45','Distancia conservada');
assert.equal(saved.sessions[0].currentLine.breakpointFt,'45','La siguiente tirada recuerda distancia');
assert.equal(saved.sessions[0].games[0].rolls[0].line.approach,'27','La corrección anterior sobrevive nuevos registros');
console.log('OK · Integración de registro, historial, corrección y guardado con partidas ficticias');
