'use strict';
// CP-004: regresión NUEVA de dos pestañas: evita sobreescribir historial con estado obsoleto.
// No usa recursos remotos, archivos de fotos, datos reales ni Service Worker.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const html=read('catalogo-bolas/index.html');
const seed=JSON.parse(html.match(/<script id="seed" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const inline=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const registry=read('catalogo-bolas/photo-registry-lab.js');
const viewer=read('catalogo-bolas/photo-view-lab.js');
const shared=new Map([['mi-bowling-analitica-v2','DO_NOT_TOUCH_SENTINEL']]);
let quota=false,passed=0;
const storage={getItem:k=>shared.get(k)||null,setItem:(k,v)=>{if(quota){quota=false;throw Error('QuotaExceededError')}shared.set(k,v)}};
function check(label,condition){assert(condition,label);passed++}
class Elem{constructor(id){this.id=id;this.value='';this.textContent='';this.innerHTML='';this.style={};this.files=[];this.listeners={};this.classList={toggle(){}};this.open=false}addEventListener(k,f){this.listeners[k]=f}click(){}remove(){}showModal(){this.open=true}close(){this.open=false}}
const ids='query brand filter count total chosen photos source empty cards status progress progressBar detail modalTitle modalSubtitle modalImage searchPhoto close save loadPdf pdfFile saveJson saveCsv saveArchive reset cover core rg diff finish oil image imageSource technicalSource notes'.split(' ');
function pdf(rows){const pages=Array.from({length:25},(_,p)=>{const items=[];for(let j=0;j<4;j++){const x=rows[p*4+j];if(!x)continue;const date=new Date(x.approved+'T00:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});for(const [str,pos] of [[x.brand,80],[x.model,415],[date,825]])items.push({str,transform:[0,0,0,0,pos,600-j*24],width:20})}return {view:[0,0,1000,1000],getTextContent:async()=>({items})}});return {numPages:25,getPage:async n=>pages[n-1],destroy:async()=>{}}}
function tab(){const els=new Map(ids.map(x=>[x,new Elem(x)]));els.get('filter').value='all';
const doc={querySelector:s=>els.get(s.slice(1)),getElementById:s=>s==='seed'?{textContent:JSON.stringify(seed)}:els.get(s),createElement:s=>new Elem(s),body:{appendChild(){}},head:{appendChild(){throw Error('Remote script prohibited')}}};
const w={},ctx=vm.createContext({window:w,document:doc,localStorage:storage,structuredClone,confirm:()=>true,console:{error:()=>{}},setTimeout:f=>f(),URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){}},Blob:class FakeBlob{}});
vm.runInContext(registry,ctx);vm.runInContext(viewer,ctx);vm.runInContext(inline,ctx);
w.pdfjsLib={getDocument:()=>({promise:Promise.resolve(pdf(w.rows))})};
return {w,e:id=>els.get(id),current:()=>vm.runInContext('({records:arr,archive,meta})',ctx)};}
async function importRows(t,rows){t.w.rows=rows;t.e('pdfFile').files=[{size:40,arrayBuffer:async()=>new Uint8Array([0]).buffer}];await t.e('pdfFile').onchange({target:t.e('pdfFile')})}
(async()=>{const original=seed.map(x=>({brand:x.brand,model:x.model,approved:x.approved}));
const changed=[...original.slice(0,99),{brand:'TEST LAB',model:'Synthetic 2026',approved:'2026-12-01'}];
const a=tab(),b=tab();await importRows(a,changed);const snapshot=shared.get('mi-bowling-plantilla-100-v1');
check('Tab A: archive created',JSON.parse(snapshot).archive.length===1);
b.e('cards').listeners.change({target:{dataset:{check:'1'},checked:true,matches:s=>s==='[data-check]'}});
check('Tab B: stale selection blocked',shared.get('mi-bowling-plantilla-100-v1')===snapshot&&!b.current().records[1].selected);
check('Conflict warning',b.e('status').textContent.includes('Conflicto de pestañas'));
b.e('cards').listeners.click({target:{closest:()=>({dataset:{edit:'0'}})}});
b.e('notes').value='Stale fake note';b.e('save').onclick();
check('Stale edit blocked',shared.get('mi-bowling-plantilla-100-v1')===snapshot&&!b.current().records[0].notes);
check('Modal remains open',b.e('detail').open);
b.e('reset').onclick();check('Stale reset blocked',shared.get('mi-bowling-plantilla-100-v1')===snapshot);
await importRows(b,original);check('Stale import blocked',shared.get('mi-bowling-plantilla-100-v1')===snapshot);
const c=tab();check('Fresh tab sees history and new ball',c.current().archive.length===1&&c.current().records.some(x=>x.brand==='TEST LAB'));
c.e('cards').listeners.change({target:{dataset:{check:'0'},checked:true,matches:s=>s==='[data-check]'}});
check('Fresh selection saves',JSON.parse(shared.get('mi-bowling-plantilla-100-v1')).records[0].selected);
const saved=shared.get('mi-bowling-plantilla-100-v1');
quota=true;c.e('cards').listeners.change({target:{dataset:{check:'1'},checked:true,matches:s=>s==='[data-check]'}});
check('Failed quota write does not misreport saved state',shared.get('mi-bowling-plantilla-100-v1')===saved&&!c.current().records[1].selected);
check('PWA data untouched',shared.get('mi-bowling-analitica-v2')==='DO_NOT_TOUCH_SENTINEL');
console.log('PASS '+passed+' new multi-tab regression cases; no remote connections');
})().catch(err=>{console.error(err);process.exitCode=1});
