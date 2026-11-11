'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'catalogo-bolas/index.html'),'utf8');
const seed=JSON.parse(html.match(/<script id="seed" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
class El{constructor(id){this.id=id;this.value='';this.textContent='';this.innerHTML='';this.style={};this.listeners={};this.files=[];this.classes={};this.classList={toggle:(x,v)=>this.classes[x]=v};this.href='';this.open=false}
addEventListener(n,f){this.listeners[n]=f}click(){}remove(){}showModal(){this.open=true}close(){this.open=false}}
const fields='query brand filter count total chosen photos source empty cards status progress progressBar detail modalTitle modalSubtitle modalImage searchPhoto close save loadPdf pdfFile saveJson saveCsv saveArchive reset cover core rg diff finish oil image imageSource technicalSource notes'.split(' ');
const elements=new Map(fields.map(x=>[x,new El(x)])),e=id=>elements.get(id);e('filter').value='all';
const document={querySelector:s=>e(s.slice(1)),getElementById:s=>s==='seed'?{textContent:JSON.stringify(seed)}:e(s),createElement:x=>new El(x),body:{appendChild(){}},head:{appendChild(){throw Error('External load forbidden')}}};
const values=new Map;let quota=false,agree=true;
const localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>{if(quota){quota=false;throw Error('QuotaExceededError')}values.set(k,v)}};
const downloads=[],URL={createObjectURL:blob=>(downloads.push(blob.content),'blob:fixture'),revokeObjectURL(){}};
class FakeBlob{constructor(parts,options){this.content=parts.join('');this.type=options?.type}}
const fakePdf=rows=>{const pages=Array.from({length:25},(_,p)=>{const items=[];for(const [i,x] of rows.slice(p*4,p*4+4).entries()){
 const date=new Date(x.approved+'T00:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
 for(const [str,pos] of [[x.brand,80],[x.model,410],[date,825]])items.push({str,transform:[0,0,0,0,pos,600-24*i],width:20});
}return {view:[0,0,1000,1000],getTextContent:async()=>({items})}});return {numPages:25,getPage:async i=>pages[i-1],destroy:async()=>{}}};
const w={},ctx=vm.createContext({window:w,document,localStorage,structuredClone,confirm:()=>agree,console:{error:()=>{}},setTimeout:f=>f(),URL,Blob:FakeBlob});
vm.runInContext(fs.readFileSync(path.join(root,'catalogo-bolas/photo-registry-lab.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'catalogo-bolas/photo-view-lab.js'),'utf8'),ctx);
w.pdfjsLib={getDocument:()=>({promise:Promise.resolve(fakePdf(w.rows))})};
vm.runInContext(script,ctx);
const state=()=>vm.runInContext('({records:arr,archive,meta})',ctx);
const initial=seed.map(x=>({brand:x.brand,model:x.model,approved:x.approved}));
const input={size:50,arrayBuffer:async()=>new Uint8Array([1,2]).buffer};
async function importRows(rows){w.rows=rows;e('pdfFile').files=[input];await e('pdfFile').onchange({target:e('pdfFile')})}
let count=0;function test(name,passed){assert(passed,name);count++}
(async()=>{
 test('100 cards',(e('cards').innerHTML.match(/<article class=/g)||[]).length===100);
 test('14 official page links',(e('cards').innerHTML.match(/>Ver página oficial<\/a>/g)||[]).length===14);
 e('filter').value='images';e('filter').listeners.change();test('no photos',e('count').textContent==='Mostrando 0 de 100');
 e('filter').value='all';e('filter').listeners.change();e('query').value='Nebula';e('query').listeners.input();test('search',e('count').textContent==='Mostrando 1 de 100');e('query').value='';e('query').listeners.input();
 e('brand').value='Brunswick';e('brand').listeners.change();test('brand',e('count').textContent==='Mostrando 10 de 100');e('brand').value='';e('brand').listeners.change();
 for(const i of [0,99])e('cards').listeners.change({target:{dataset:{check:String(i)},checked:true,matches:s=>s==='[data-check]'}});
 test('selection',state().records.filter(x=>x.selected).length===2);
 e('filter').value='chosen';e('filter').listeners.change();test('chosen filter',e('count').textContent==='Mostrando 2 de 100');e('filter').value='all';e('filter').listeners.change();
 e('cards').listeners.click({target:{closest:()=>({dataset:{edit:'99'}})}});test('detail',e('modalTitle').textContent===seed[99].model);
 e('notes').value='Synthetic historical note';e('image').value='https://unlicensed.invalid/img.jpg';e('save').onclick();
 test('notes saved',state().records[99].notes==='Synthetic historical note');
 test('no IMG from unlicensed URL',!e('cards').innerHTML.includes('<img '));
 e('cards').listeners.click({target:{closest:()=>({dataset:{edit:'0'}})}});test('original official link',e('searchPhoto').href===w.MiBowlingPhotoLab.get(seed[0]).sourcePage);
 e('cards').listeners.click({target:{closest:()=>({dataset:{edit:'15'}})}});test('unverified candidate isolated',e('searchPhoto').href==='https://bowl.com/approved-ball-list');
 const synthetic=[...initial.slice(0,99),{brand:'LAB TEST',model:'Synthetic 2026',approved:'2026-12-01'}];
 agree=false;await importRows(synthetic);test('cancel preserves records',state().archive.length===0&&state().records[99].selected);agree=true;
 await importRows(synthetic);
 test('PDF synthetic 100',state().records.length===100);
 const old=state().records.find(x=>x.brand===seed[0].brand&&x.model===seed[0].model);
 test('stable original ID',old.id===seed[0].id);test('registry link',!!w.MiBowlingPhotoLab.get(old));
 test('14 links after import',(e('cards').innerHTML.match(/>Ver página oficial<\/a>/g)||[]).length===14);
 test('archive has displaced entry',state().archive.some(x=>x.id===seed[99].id));
 test('archive preserves notes',state().archive.some(x=>x.id===seed[99].id&&x.selected&&x.notes==='Synthetic historical note'));
 e('saveArchive').onclick();test('archive exports JSON',downloads.at(-1).includes('Synthetic historical note'));
 await importRows(initial);test('return restores ID',state().records.some(x=>x.id===seed[99].id));
 test('return restores notes and selection',state().records.some(x=>x.id===seed[99].id&&x.selected&&x.notes==='Synthetic historical note'));
 test('new record archived',state().archive.length===1&&state().archive[0].brand==='LAB TEST');
 await importRows(initial);test('archive dedup',state().archive.length===1);
 const prev=JSON.stringify(state());await importRows(initial.slice(0,90));test('PDF insufficient rollback',JSON.stringify(state())===prev);
 quota=true;await importRows(initial);test('storage quota rollback',JSON.stringify(state())===prev);
 console.log('PASS',count,'catalogue/LAB import, filtering, archive and rights checks; no external network or personal data');
})().catch(e=>{console.error(e);process.exitCode=1});
