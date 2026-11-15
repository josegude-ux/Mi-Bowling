'use strict';
const SOURCE_URL='https://bowl.com/approved-ball-list';
const PDF_URL='https://bowl.com/getmedia/8b570e80-761c-4486-8628-9d50d718dd60/approved_balllist_CURRENT.pdf';
const STORAGE='mi-bowling-plantilla-100-v1';
const seeds=JSON.parse(document.getElementById('seed').textContent), $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const evidence=window.MiBowlingCatalog100Compat.evidenceIndex(window.MiBowlingCatalog20.entries,seeds);
function evidenceHTML(x){const e=evidence.get(x);if(!e)return '<p>Sin ficha contrastada para esta aprobación.</p>';const safe=u=>typeof u==='string'&&/^https:\/\//i.test(u)?u:null;const link=(u,t)=>safe(u)?'<a target="_blank" rel="noopener noreferrer" href="'+esc(u)+'">'+esc(t)+'</a>':'';const verified=e.state==='ficha-fabricante-verificada';return '<p><strong>'+(verified?'Ficha técnica contrastada · fabricante/distribuidor':'Ficha técnica pendiente')+'</strong></p><p>'+esc(e.note)+'</p>'+(verified?'<p>'+['cover','core','rg','diff','intermediateDiff','finish','oil'].filter(k=>e[k]).map(k=>esc(({cover:'Cubierta',core:'Núcleo',rg:'RG',diff:'Diferencial',intermediateDiff:'Intermedio',finish:'Acabado',oil:'Aceite'})[k])+': '+esc(e[k])).join(' · ')+'</p>'+link(e.technicalSource,'Fuente técnica original'):'')+(e.identityEvidence?'<p>'+link(e.identityEvidence.source,'Identidad (no acredita ficha técnica)')+'</p>':'')+(e.commercialEvidence?'<p>'+link(e.commercialEvidence.source,'Consulta comercial no verificada')+'</p>':'');}
const keyOf=x=>String((x.brand||'')+'|'+(x.model||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9|]+/g,'');
const store=window.MiBowlingCatalogoPersistencia.create(localStorage,window.MiBowlingEscritura,seeds,{source:'Referencia reciente (ver aviso)',date:'2026-11-03',reviewed:false});
let snapshot=store.migrate();
let arr=snapshot.records,meta=snapshot.meta,archive=snapshot.archive;
function adopt(next){snapshot=next;arr=next.records;meta=next.meta;archive=next.archive;}
function saveLocal(){try{adopt(store.commit({...snapshot,records:arr,meta,archive}));return true}catch(e){adopt(store.read());msg('No se guardó: '+e.message,true);return false}}
function msg(text,error=false){const s=$('#status');s.textContent=text;s.classList.toggle('danger',!!error)}
function colorFor(s){let v=0;for(const c of s)v=(v*31+c.charCodeAt(0))>>>0;return ['#155183','#0b8a95','#6b65a8','#4d7e92','#a46549','#177a70'][v%6]}
function ballSVG(x){const col=colorFor(x.brand),gid="g"+keyOf(x).replaceAll("|", "").slice(0,22);return `<div class="placeholder"><svg viewBox="0 0 90 90" role="img" aria-label="Ilustración genérica, no foto del modelo"><defs><radialGradient id="${gid}"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".36" stop-color="${col}"/><stop offset="1" stop-color="#132b49"/></radialGradient></defs><circle cx="45" cy="45" r="39" fill="url(#${gid})"/><circle cx="35" cy="32" r="4" fill="#071827"/><circle cx="49" cy="30" r="4" fill="#071827"/><circle cx="41" cy="43" r="4" fill="#071827"/></svg><span>Foto real pendiente</span></div>`}
function photoHTML(x){return x.image?`<img src="${esc(x.image)}" alt="Fotografía proporcionada de ${esc(x.brand+' '+x.model)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode('Fotografía no disponible'))">`:(window.MiBowlingFotosPrivadas.img(window.MiBowlingFotosPrivadas.catalog(x))||ballSVG(x))}
function stat(){const chosen=arr.filter(x=>x.selected).length;$('#total').textContent=arr.length;$('#chosen').textContent=chosen;$('#photos').textContent=arr.filter(x=>x.image||window.MiBowlingFotosPrivadas.has(window.MiBowlingFotosPrivadas.catalog(x))).length;$('#source').textContent=meta.reviewed?`PDF USBC importado · ${meta.date||'fecha pendiente'} · 100 modelos ordenados por aprobación`: '100 referencias recientes · pendientes de contrastar contra lista completa USBC'}
function renderBrands(){const keep=$('#brand').value;const names=[...new Set(arr.map(x=>x.brand))].sort((a,b)=>a.localeCompare(b,'es'));$('#brand').innerHTML='<option value="">Todas las marcas</option>'+names.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');$('#brand').value=names.includes(keep)?keep:''}
function draw(){document.getElementById('private-photo-controls').innerHTML=window.MiBowlingFotosPrivadas.controls('draw');stat();const q=$('#query').value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),b=$('#brand').value,f=$('#filter').value;
 const shown=arr.filter(x=>(!b||x.brand===b)&&(!q||(x.brand+' '+x.model+' '+x.approved+' '+x.cover+' '+x.core).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q))&&(f==='all'||(f==='chosen'&&x.selected)||(f==='images'&&(x.image||window.MiBowlingFotosPrivadas.has(window.MiBowlingFotosPrivadas.catalog(x))))));
 $('#count').textContent=`Mostrando ${shown.length} de ${arr.length}`;$('#empty').classList.toggle('hidden',shown.length>0);
 $('#cards').innerHTML=shown.map(x=>{const i=arr.indexOf(x);return `<article class="item ${x.selected?'is-selected':''}"><div class="photo"><span class="num">#${i+1}</span>${photoHTML(x)}</div><div class="content"><div class="brand">${esc(x.brand)}</div><div class="model">${esc(x.model)}</div><div class="date">Aprobación: ${esc(x.approved)}</div><div class="tags"><span class="pill">${x.cover?esc(x.cover):'Cubierta pendiente'}</span><span class="pill">${x.rg?'RG '+esc(x.rg):'RG pendiente'}</span>${evidence.get(x)?'<span class="pill">'+(evidence.get(x).state==='ficha-fabricante-verificada'?'Ficha contrastada':'Ficha pendiente')+'</span>':''}</div><div class="selectRow"><label><input type="checkbox" data-check="${i}" ${x.selected?'checked':''} aria-label="Elegir ${esc(x.brand+' '+x.model)}"> Elegir</label><button class="btn small" data-edit="${i}">Ficha / foto</button></div></div></article>`}).join('')}
$('#query').addEventListener('input',draw);$('#brand').addEventListener('change',draw);$('#filter').addEventListener('change',draw);
$('#cards').addEventListener('change',e=>{const i=Number(e.target.dataset.check);if(e.target.matches('[data-check]')&&arr[i]){arr[i].selected=e.target.checked;saveLocal();draw()}});
let editAt=-1;$('#cards').addEventListener('click',e=>{const btn=e.target.closest('[data-edit]');if(btn)openDetail(Number(btn.dataset.edit))});
function openDetail(i){editAt=i;const x=arr[i];if(!x)return;$('#modalTitle').textContent=x.model;$('#modalSubtitle').textContent=x.brand+' · aprobado '+x.approved;
 for(const id of ['cover','core','rg','diff','finish','oil','image','imageSource','technicalSource','notes'])$('#'+id).value=x[id]||'';
 $('#manufacturerEvidence').innerHTML=evidenceHTML(x);
 $('#modalImage').innerHTML=photoHTML(x)+window.MiBowlingFotosPrivadas.source(window.MiBowlingFotosPrivadas.catalog(x));
 $('#searchPhoto').href='https://www.google.com/search?tbm=isch&q='+encodeURIComponent(x.brand+' '+x.model+' bowling ball official');$('#detail').showModal()}
$('#close').onclick=()=>$('#detail').close();$('#save').onclick=()=>{const x=arr[editAt];if(!x)return;const draft={...x};for(const id of ['cover','core','rg','diff','finish','oil','image','imageSource','technicalSource','notes'])draft[id]=$('#'+id).value.trim().slice(0,500);
 for(const id of ['image','imageSource','technicalSource'])if(draft[id]&&!/^https:\/\//i.test(draft[id])){msg('Se requieren enlaces HTTPS para fotos y fuentes.',true);return}
 arr[editAt]=draft;if(!saveLocal()){draw();return}$('#detail').close();draw();msg('Ficha guardada en este navegador; no modifica MI BOWLING.')};
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('#saveJson').onclick=()=>{const chosen=arr.filter(x=>x.selected);if(!chosen.length)return msg('Marca una o más bolas antes de exportar.',true);download(JSON.stringify({schema:'mi-bowling-template-balls-v1',created:new Date().toISOString(),items:chosen},null,2),'MI_BOWLING_Bolas_elegidas.json','application/json');msg(`${chosen.length} bolas exportadas en JSON.`)};
$('#saveCsv').onclick=()=>{const chosen=arr.filter(x=>x.selected);if(!chosen.length)return msg('Marca una o más bolas antes de exportar.',true);const cols=['brand','model','approved','cover','core','rg','diff','finish','oil','image','technicalSource','notes'];const csv=[cols.join(';'),...chosen.map(x=>cols.map(c=>'"'+String(x[c]||'').replaceAll('"','""')+'"').join(';'))].join('\r\n');download('\ufeff'+csv,'MI_BOWLING_Bolas_elegidas.csv','text/csv;charset=utf-8');msg(`${chosen.length} bolas exportadas en CSV.`)};
$('#reset').onclick=()=>{if(!confirm('¿Restaurar las 100 referencias iniciales conservando las fichas, IDs, selecciones y archivo histórico?'))return;try{adopt(store.refresh(seeds,{source:'Referencia reciente',date:'2026-11-03',reviewed:false}));renderBrands();draw();msg('Referencias iniciales restauradas; historial conservado.')}catch(e){msg('No se guardó: '+e.message,true)}};
$('#loadPdf').onclick=()=>$('#pdfFile').click();
function isodate(s){const mon={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};const m=s.trim().match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d\d)/i);if(!m)return '';const month=mon[m[1].toLowerCase()];return `${m[3]}-${String(month).padStart(2,'0')}-${m[2].padStart(2,'0')}`}
async function loadPdfJs(){if(window.pdfjsLib)return window.pdfjsLib;msg('Cargando lector PDF…');await new Promise((resolve,reject)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';sc.onload=resolve;sc.onerror=()=>reject(new Error('No se pudo cargar el lector PDF (requiere conexión).'));document.head.appendChild(sc)});window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';return window.pdfjsLib}
async function parsePdf(file){if(file.size>35e6)throw Error('PDF demasiado grande (máximo 35 MB).');const lib=await loadPdfJs();const doc=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise; if(doc.numPages<25||doc.numPages>350)throw Error('El documento no parece la lista USBC (número de páginas inesperado).');
 const rows=[],$prog=$('#progress');$prog.style.display='block';try{for(let p=1;p<=doc.numPages;p++){
  const page=await doc.getPage(p),t=await page.getTextContent(),width=page.view[2]-page.view[0],buckets=[];
  for(const item of t.items){const text=(item.str||'').trim();if(!text)continue;const x=(item.transform?.[4]||0)+((item.width||0)/2),y=item.transform?.[5]||0;let row=buckets.find(r=>Math.abs(r.y-y)<2.1);if(!row){row={y,parts:[]};buckets.push(row)}row.parts.push({x,text})}
  for(const row of buckets){const parts=row.parts.sort((a,b)=>a.x-b.x),all=parts.map(i=>i.text).join(' '),date=isodate(all);if(!date||date<'2024-01-01')continue;
   let brand=parts.filter(i=>i.x<width*.305).map(i=>i.text).join(' ').trim();let name=parts.filter(i=>i.x>=width*.305&&i.x<width*.775).map(i=>i.text).join(' ').trim();
   name=name.replace(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*20\d\d/ig,'').trim();
   if(brand&&name&&brand.length<90&&name.length<170&&name.toLowerCase()!=='ball name'&&date<='2027-12-31')rows.push({brand,model:name,approved:date})
  }
  $('#progressBar').style.width=Math.round(100*p/doc.numPages)+'%';if(p%7===0){msg(`Analizando página ${p}/${doc.numPages}… (${rows.length} fechas recientes reconocidas)`);await new Promise(r=>setTimeout(r,0))}
 } }finally{$prog.style.display='none';await doc.destroy()}
 const unique=new Map();for(const r of rows){const k=window.MiBowlingCatalogoPersistencia.identity(r);if(k&&!unique.has(k))unique.set(k,r)}
 const sorted=[...unique.values()].sort((a,b)=>b.approved.localeCompare(a.approved)||a.brand.localeCompare(b.brand)||a.model.localeCompare(b.model));
 if(sorted.length<100)throw Error(`Se identificaron solo ${sorted.length} registros recientes. No se ha sustituido el catálogo. El formato del PDF puede haber cambiado.`);
 return {rows:sorted.slice(0,100),detected:sorted.length,totalPages:doc.numPages}
}
$('#pdfFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const result=await parsePdf(file);const plan=window.MiBowlingCatalogoPersistencia.planRefresh(snapshot,result.rows,{source:'PDF USBC elegido por el usuario',date:new Date().toISOString().slice(0,10),reviewed:true});
  const preserved=plan.records.filter(x=>x.selected).length;const message=`PDF: ${result.totalPages} páginas, ${result.detected} referencias. ${preserved} selecciones activas conservadas. ${plan.archive.length} fichas históricas conservadas. ¿Confirmas?`;
  if(!confirm(message))return;
  adopt(store.commit(plan));
  renderBrands();$('#query').value='';$('#filter').value='all';draw();msg('Catálogo actualizado desde tu PDF local: 100 registros ordenados por fecha.');
 }catch(err){console.error(err);msg('No se aplicó la actualización: '+err.message,true)}finally{$('#pdfFile').value=''}};
renderBrands();draw();

$('#saveArchive').onclick=()=>{download(JSON.stringify({schema:'mi-bowling-template-archive-v1',items:archive},null,2),'MI_BOWLING_Archivo_bolas.json','application/json');};
window.MiBowlingCatalogoBooted=true;
