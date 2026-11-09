/* LAB · Copia inicial abortada por cuota y catálogo corrupto: nunca borrar originales */
'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','profiles.js'),'utf8');
const key='mi-bowling-analitica-v2',meta='mi-bowling-local-profiles-v1';
function run(values,shouldFail){
 const map=new Map(Object.entries(values));let copies=0,appScripts=0;
 const local={
  getItem:k=>map.has(k)?map.get(k):null,
  setItem(k,v){
   if(shouldFail&&String(k).startsWith('mi-bowling-profile:')&&++copies>1)throw Error('QuotaExceededError');
   map.set(String(k),String(v));
  },
  removeItem:k=>map.delete(String(k))
 };
 const tab={getItem:()=>null,setItem(){},removeItem(){}};
 const nodes=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{hidden:false,innerHTML:'',textContent:'',value:'',addEventListener(){},
    querySelectorAll(){return []},querySelector(){return {addEventListener(){}}},focus(){},replaceChildren(){},setAttribute(){}});
  return nodes.get(id)}
 const document={body:{classList:{add(){},remove(){}},appendChild(){appScripts++}},
  getElementById:node,createElement(){return {src:''}}};
 const ctx={window:null,document,localStorage:local,sessionStorage:tab,console,Date,
  location:{reload(){}},crypto:require('node:crypto').webcrypto,TextEncoder};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(src,ctx);ctx.MiBowlingProfiles.init();
 return{map,nodes,appScripts,ctx};
}
// If storage is full during copying, original data remains bit-for-bit unchanged.
const oldJson=JSON.stringify({version:2,sessions:[{id:'precious'}],balls:[]});
let out=run({[key]:oldJson,'mi-bowling-liga-v1':'{"matches":[{"id":"legacy"}]}'},true);
assert.equal(out.map.get(key),oldJson);
assert.equal(out.map.has(meta),false,'Cannot create an incomplete catalogue');
assert.ok(![...out.map.keys()].some(x=>x.startsWith('mi-bowling-profile:')),'No partial player copies');
assert.equal(out.appScripts,0,'Do not open data when initial migration failed');
assert.match(out.nodes.get('player-fatal').textContent,/No hay espacio suficiente/);
// A corrupt catalogue must fail closed, never overwrite or reinitialize.
const corrupt='{"version":1,"profiles":[{"id":"../../", "name":"Other"}]}';
out=run({[meta]:corrupt,[key]:oldJson},false);
assert.equal(out.map.get(meta),corrupt);
assert.equal(out.map.get(key),oldJson);
assert.equal(out.appScripts,0);
assert.match(out.nodes.get('player-fatal').textContent,/no tiene un formato válido/);
// If only the oldest key exists, its bytes are still copied to legacy, not discarded.
out=run({'mi-bowling-v1':oldJson},false);
assert.equal(out.map.get('mi-bowling-profile:legacy:mi-bowling-v1'),oldJson);
assert.equal(out.map.get('mi-bowling-v1'),oldJson);
assert.equal(out.ctx.MiBowlingProfiles.profiles()[0].id,'legacy');
console.log('OK · Fallo de cuota reversible, catálogo corrupto bloqueado y copia de formato v1');
