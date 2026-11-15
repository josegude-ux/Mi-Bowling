'use strict';
/* Auditoría PRIVADA local en runner; no incorporar PDF USBC al repositorio/artifacts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pdfjs=require('pdfjs-dist/legacy/build/pdf.js');
const file=process.argv[2];if(!file)throw Error('Argumento PDF ausente');
const bytes=fs.readFileSync(file);assert(bytes.subarray(0,5).toString()==='%PDF-','No es un PDF');
const months={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
const isodate=s=>{const m=s.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d\d)/i);return m?m[3]+'-'+String(months[m[1].toLowerCase()]).padStart(2,'0')+'-'+m[2].padStart(2,'0'):''};
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
(async()=>{
const pdf=await pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
let candidates=[],sample=[],partsPreview=[],pageCounts=[];
try{
 for(let p=1;p<=pdf.numPages;p++){
  const page=await pdf.getPage(p),t=await page.getTextContent(),width=page.view[2]-page.view[0],rows=[];
  for(const item of t.items){const text=(item.str||'').trim();if(!text)continue;
   const x=(item.transform?.[4]||0)+((item.width||0)/2),y=item.transform?.[5]||0;
   let row=rows.find(r=>Math.abs(r.y-y)<2.1);if(!row){row={y,parts:[]};rows.push(row)}row.parts.push({x,text});
  }
  let hit=0;
  for(const row of rows){const parts=row.parts.sort((a,b)=>a.x-b.x),all=parts.map(i=>i.text).join(' '),date=isodate(all);
   if(!date||date<'2024-01-01')continue;
   let brand=parts.filter(i=>i.x<width*.305).map(i=>i.text).join(' ').trim();
   let model=parts.filter(i=>i.x>=width*.305&&i.x<width*.775).map(i=>i.text).join(' ').trim();
   model=model.replace(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*20\d\d/ig,'').trim();
   if(brand&&model&&brand.length<90&&model.length<170&&model.toLowerCase()!=='ball name'&&date<='2027-12-31'){candidates.push({brand,model,date});hit++;}
   else if(sample.length<12)sample.push({p,brand,model,date,line:all.slice(0,120),width});
  }
  if(p<=2&&partsPreview.length<10)partsPreview.push(...rows.slice(1,6).map(r=>({p,line:r.parts.map(x=>x.text).join(' / ').slice(0,100),xs:r.parts.slice(0,4).map(x=>Math.round(x.x))})));
  pageCounts.push(hit);
 }
} finally {await pdf.destroy();}
const uniq=new Map();for(const x of candidates){const k=clean(x.brand)+'/'+clean(x.model);if(!uniq.has(k)||x.date>uniq.get(k).date)uniq.set(k,x)}
const sorted=[...uniq.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.brand.localeCompare(b.brand)||a.model.localeCompare(b.model));
console.log(JSON.stringify({pdfPages:pageCounts.length,pdfKB:Math.round(bytes.length/1024),detected:candidates.length,unique:sorted.length,latest:sorted.slice(0,20),totalRecognizedPages:pageCounts.filter(x=>x>0).length,parsedErrors:sample.slice(0,6),sampleLines:partsPreview.slice(0,8)},null,2));
assert(pdf.numPages>=100&&pdf.numPages<200,'Documento inesperado para listado USBC');
assert(sorted.length>=100,'No se pudieron reconocer 100 filas recientes del PDF REAL');
assert(sorted[0].date>='2026-08-01','La fecha máxima del PDF es demasiado antigua');
console.log('PASS REAL PDF: se han extraído >=100 referencias, con fechas de aprobación sin procesar datos de usuarios');
})().catch(e=>{console.error(e);process.exitCode=1});
