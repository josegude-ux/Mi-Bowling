'use strict';
// LAB CP-005: test del código HTML real en Node con entorno sintético de dos pestañas.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('catalogo-bolas/index.html'),seed=JSON.parse(html.match(/<script id="seed" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1],registry=read('catalogo-bolas/photo-registry-lab.js'),viewer=read('catalogo-bolas/photo-view-lab.js');
class Elem{constructor(id){this.id=id;this.value='';this.textContent='';this.innerHTML='';this.files=[];this.listeners={};this.style={};this.classList={toggle(){}};this.open=false}addEventListener(k,f){this.listeners[k]=f}click(){}showModal(){this.open=true}close(){this.open=false}remove(){}}
const ids='query brand filter count total chosen photos source empty cards status progress progressBar detail modalTitle modalSubtitle modalImage searchPhoto close save loadPdf pdfFile saveJson saveCsv saveArchive reset cover core rg diff finish oil image imageSource technicalSource notes'.split(' ');
const state=new Map([['mi-bowling-analitica-v2','PRIVATE_SENTINEL']]);let hook=null,hookPromise=null,assertions=0;
const storage={getItem:k=>state.get(k)||null,setItem(k,v){if(hook&&k==='mi-bowling-plantilla-100-v1'){const fn=hook;hook=null;hookPromise=fn()}state.set(k,v)}};
const queue=[];let busy=false;const names=[];
function pump(){if(busy||!queue.length)return;busy=true;const j=queue.shift();Promise.resolve().then(j.fn).then(j.resolve,j.reject).finally(()=>{busy=false;pump()})}
const locks={request(name,opts,fn){names.push(name);return new Promise((resolve,reject)=>{queue.push({fn,resolve,reject});pump()})}};
const navigator={locks};
function tab(){const elements=new Map(ids.map(id=>[id,new Elem(id)]));elements.get('filter').value='all';const el=id=>elements.get(id);
 const document={querySelector:s=>el(s.slice(1)),getElementById:s=>s==='seed'?{textContent:JSON.stringify(seed)}:el(s),createElement:s=>new Elem(s),body:{appendChild(){}},head:{appendChild(){throw Error('External script denied')}}};
 const w={},ctx=vm.createContext({window:w,document,localStorage:storage,navigator,structuredClone,confirm:()=>true,console:{error:()=>{}},setTimeout:f=>f(),URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){}},Blob:class FakeBlob{}});
 vm.runInContext(registry,ctx);vm.runInContext(viewer,ctx);vm.runInContext(script,ctx);
 return {el,select:i=>el('cards').listeners.change({target:{dataset:{check:String(i)},checked:true,matches:s=>s==='[data-check]'}}),current:()=>vm.runInContext('({records:arr,archive,meta})',ctx)};
}
function check(name,value){assert(value,name);assertions++}
(async()=>{
 const a=tab(),b=tab();hook=()=>b.select(1);
 await a.select(0);if(hookPromise)await hookPromise;
 const snap=JSON.parse(state.get('mi-bowling-plantilla-100-v1'));
 check('Writer A persisted',snap.records[0].selected===true);
 check('Writer B stale blocked',snap.records[1].selected===false&&!b.current().records[1].selected);
 check('Writer B conflict text',b.el('status').textContent.includes('Conflicto de pestañas'));
 check('Same cross-tab lock name',names.length===2&&new Set(names).size===1);
 check('No actual PWA state touched',state.get('mi-bowling-analitica-v2')==='PRIVATE_SENTINEL');
 const c=tab();await c.select(1);
 const final=JSON.parse(state.get('mi-bowling-plantilla-100-v1'));
 check('Fresh tab persists both selections',final.records[0].selected&&final.records[1].selected);
 check('100 initial records intact',seed.length===100&&final.records.length===100);
 check('No photograph injected',!final.records.some(x=>x.image));
 console.log('PASS '+assertions+' new synthetic Web Locks cross-tab assertions (Node, no network)');
})().catch(e=>{console.error(e);process.exitCode=1});
