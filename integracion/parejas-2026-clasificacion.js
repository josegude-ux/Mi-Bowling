'use strict';
/* MI BOWLING · Clasificaciones Campeonato España Parejas 2026.
 * Modelo puro y lector pdf.js existente, local/offline, sin envío ni escrituras.
 * No deduce datos de PDFs que no tengan texto accesible. La revisión es obligatoria.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MiBowlingParejasClasificacion=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const MAX_PDF_BYTES=8*1024*1024,MAX_ROWS=100,MAX_SNAPSHOTS=36,MAX_PAGES=12;
 const DAYS=Object.freeze(['2026-11-28','2026-11-29']),CATEGORIES=Object.freeze(['2ª','3ª']);
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
 const category=s=>{
  const t=norm(s).replace(/\s/g,'');
  if(/^(2M|2ª|2A|SEGUNDA|2)$/.test(t))return '2ª';
  if(/^(3M|3ª|3A|TERCERA|3)$/.test(t))return '3ª';
  return null;
 };
 const isCelta=s=>norm(s)==='CELTA XUNTA';
 const score=v=>Number.isInteger(v)&&v>=0&&v<=300;
 const blank=()=>({schema:1,lazaro:[null,null,null,null,null,null],rankings:[]});
 function cleanState(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  const s=blank();
  if(Array.isArray(input.lazaro))s.lazaro=input.lazaro.slice(0,6).map(v=>score(v)?v:null);
  while(s.lazaro.length<6)s.lazaro.push(null);
  if(Array.isArray(input.rankings))for(const r of input.rankings.slice(0,MAX_SNAPSHOTS)){
   try{const checked=validateSnapshot(r);if(checked)s.rankings.push(checked)}catch(_){}
  }
  return s;
 }
 function updateLazaro(current,index,value){
  if(!Number.isInteger(index)||index<0||index>=6)throw Error('PARTIDA_INVALIDA');
  if(value!==null&&!score(value))throw Error('PUNTUACION_0_300');
  const next=cleanState(current)||blank();
  next.lazaro[index]=value;
  return next;
 }
 function pairs(sessions,complete,scoreFn){
  const out=[],sByDay={};
  for(const s of sessions||[]){if(!DAYS.includes(s?.date)||!String(s.notes||'').split('\n').includes('[FEB6249:PAREJAS-2M3M:'+s.date+']'))continue;sByDay[s.date]=s}
  for(const day of DAYS){const s=sByDay[day],p=cleanState(s?.parejas2026),list=[];
   for(let i=0;i<6;i++){const game=s?.games?.[i],mine=game&&complete(game)?scoreFn(game):null,theirs=p?.lazaro[i]??null;
    list.push({day,game:i+1,jose:mine,lazaro:theirs,total:mine!==null&&theirs!==null?mine+theirs:null,lane:game?.startLane??null});
   }
   out.push({day,rows:list,played:list.filter(r=>r.total!==null).length,joseTotal:list.reduce((t,r)=>t+(r.jose??0),0),
    lazaroTotal:list.reduce((t,r)=>t+(r.lazaro??0),0),combinedTotal:list.reduce((t,r)=>t+(r.total??0),0)});
  }
  return out;
 }
 function parseTextLines(lines){
  if(!Array.isArray(lines))throw Error('LECTURA_NO_VALIDA');
  const rows=[],seen=new Set();let currentCategory=null,recognized=0,skipped=0;
  for(const raw of lines.slice(0,3000)){
   const line=String(raw||'').replace(/\s+/g,' ').trim();
   if(!line)continue;
   const n=norm(line);
   if(/^(SEGUNDA|2ª|2A)\s+CATEGORIA\b/.test(n)||/^CATEGORIA\s+(SEGUNDA|2ª|2A)\b/.test(n)||/^CLASIFICACION\s+(2ª|2A|SEGUNDA)\s+MASCULINA/.test(n))currentCategory='2ª';
   if(/^(TERCERA|3ª|3A)\s+CATEGORIA\b/.test(n)||/^CATEGORIA\s+(TERCERA|3ª|3A)\b/.test(n)||/^CLASIFICACION\s+(3ª|3A|TERCERA)\s+MASCULINA/.test(n))currentCategory='3ª';
   // Formato original FEB 28/11/2026, hoja Excel exportada a PDF:
   // «3 Total CELTA XUNTA 464 343 415 281 398 328 12 2229 185,750 464»
   // Solo extraemos filas Total COMPLETAS; las de jugadores no duplican parejas.
   // La 3ª categoría contiene «8 Total CELTA XUNTA» SIN resultados: ignorar.
   const feb=line.match(/^(\d{1,2})\s+Total\s+(.+?)\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,2})\s+(\d{1,5})\s+(\d{1,3}[,.]\d{3})\s+(\d{1,3})$/i);
   if(feb){
    const pos=Number(feb[1]),team=feb[2].trim(),
      games=feb.slice(3,9).map(Number),part=Number(feb[9]),bolos=Number(feb[10]),
      mean=Number(feb[11].replace(',','.')),maxpt=Number(feb[12]),cat=currentCategory;
    const valid=!!cat&&pos>=1&&pos<=100&&team.length>=2&&team.length<=110&&
      games.every(v=>Number.isInteger(v)&&v>=0&&v<=600)&&part===12&&
      bolos===games.reduce((t,v)=>t+v,0)&&Math.abs(bolos/12-mean)<0.002&&
      maxpt===Math.max(...games);
    if(!valid){skipped++;continue}
    const key=[cat,pos,norm(team)].join('|');
    if(seen.has(key)){skipped++;continue}
    seen.add(key);recognized++;rows.push({pos,cat,team,bolos,part});
    if(rows.length>=MAX_ROWS)break;
    continue;
   }
   if(/^\d{1,2}\s+Total\b/i.test(line)){skipped++;continue}
   if(/^(?:POS(?:ICION)?\s+|CLASIFICACION|TOTAL|CTO |CAMPEONATO|PAGINA|FIRMA|PAREJAS 2026|FEDERACION)/.test(n))continue;
   // Formato reconocible: «POS [2M|3M] NOMBRE [PART] BOLOS».
   // No asignar categoría cuando no aparece en la fila ni en un encabezado de bloque.
   const m=line.match(/^(\d{1,2})\s+(?:(2M|3M|2ª|3ª|2A|3A|SEGUNDA|TERCERA)\s+)?(.{2,110}?)\s+(?:(\d{1,2})\s+)?(\d{1,2}\.\d{3}|\d{1,5})$/i);
   if(!m){skipped++;continue}
   const pos=Number(m[1]),cat=category(m[2])||currentCategory,name=m[3].trim(),
    part=m[4]===undefined?null:Number(m[4]),bolos=Number(m[5].replace(/\./g,''));
   if(pos<1||pos>100||!name||bolos<0||bolos>7200||!Number.isInteger(bolos)||part!==null&&(part<1||part>12))continue;
   if(/(?:\bPOS\b|\bBOLOS\b)/.test(norm(name)))continue;
   const key=[cat||'?',pos,norm(name)].join('|');
   if(seen.has(key))continue;seen.add(key);recognized++;
   rows.push({pos,cat,team:name,bolos,part});
   if(rows.length>=MAX_ROWS)break;
  }
  return {rows,recognized,skipped,needsCategory:rows.some(r=>!r.cat),celta:rows.filter(r=>isCelta(r.team))};
 }
 async function pdfLines(file,base){
  if(!file||typeof file.arrayBuffer!=='function'||file.size<8||file.size>MAX_PDF_BYTES)throw Error('PDF_INVALIDO_TAMANO');
  if(file.type&&file.type!=='application/pdf'&&!String(file.name||'').toLowerCase().endsWith('.pdf'))throw Error('FORMATO_NO_PDF');
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-')throw Error('FIRMA_PDF_INVALIDA');
  const lib=await import(base+'vendor/pdfjs/pdf.min.mjs');
  lib.GlobalWorkerOptions.workerSrc=base+'vendor/pdfjs/pdf.worker.min.mjs';
  const loading=lib.getDocument({data:bytes,isEvalSupported:false});
  let doc;
  try{
   doc=await loading.promise;
   if(doc.numPages<1||doc.numPages>MAX_PAGES)throw Error('PAGINAS_FUERA_LIMITE');
   const lines=[];
   for(let p=1;p<=doc.numPages;p++){
    const page=await doc.getPage(p),groups=[];
    // WebKit (Safari) puede no exponer ReadableStream[Symbol.asyncIterator].
    // pdf.js getTextContent() usa for-await interno y falla en esas versiones.
    // Leer explícitamente con getReader() evita tocar pdf.js y conserva el orden.
    const reader=page.streamTextContent().getReader();
    try{
     for(;;){
      const part=await reader.read();if(part.done)break;
      for(const item of part.value?.items||[]){
       if(!item.str||!item.str.trim()||!item.transform)continue;
       const y=item.transform[5],x=item.transform[4];let row=groups.find(r=>Math.abs(r.y-y)<3);
       if(!row)groups.push(row={y,items:[]});row.items.push({x,value:item.str});
      }
     }
    }finally{try{reader.releaseLock()}catch(_){}}
    groups.sort((a,b)=>b.y-a.y).forEach(r=>lines.push(r.items.sort((a,b)=>a.x-b.x).map(t=>t.value).join(' ')));
   }
   if(lines.length===0)throw Error('PDF_SIN_CAPA_TEXTO');
   return lines;
  }finally{try{await loading.destroy()}catch(_){}}
 }
 function validateRows(rows,selectedCategory){
  if(!CATEGORIES.includes(selectedCategory))throw Error('CATEGORIA_OBLIGATORIA');
  if(!Array.isArray(rows)||rows.length<2||rows.length>MAX_ROWS)throw Error('FILAS_INSUFICIENTES');
  const result=[],used=new Set();
  for(const x of rows){
   const pos=Number(x.pos),bolos=Number(x.bolos),cat=category(x.cat),team=String(x.team||'').trim().slice(0,110);
   if(!Number.isInteger(pos)||pos<1||pos>100||!Number.isInteger(bolos)||bolos<0||bolos>7200||!team||!cat)throw Error('REVISAR_FILA');
   const key=cat+'|'+pos;
   if(used.has(key))throw Error('POSICION_DUPLICADA');
   used.add(key);result.push({pos,cat,team,bolos});
  }
  const own=result.filter(x=>x.cat===selectedCategory&&isCelta(x.team));
  if(own.length!==1)throw Error('IDENTIFICAR_CELTA_XUNTA');
  if(result.filter(x=>x.cat===selectedCategory).length<2)throw Error('CATEGORIA_INCOMPLETA');
  return result;
 }
 function validateSnapshot(s){
  if(!s||s.schema!==1||!DAYS.includes(s.day)||!Number.isInteger(s.game)||s.game<1||s.game>6)return null;
  if(!CATEGORIES.includes(s.category)||typeof s.digest!=='string'||!/^[a-f0-9]{64}$/.test(s.digest))return null;
  if(typeof s.fileName!=='string'||s.fileName.length>150||typeof s.savedAt!=='string'||!Array.isArray(s.rows))return null;
  if(!Number.isInteger(s.version)||s.version<1||s.version>MAX_SNAPSHOTS)return null;
  return {schema:1,day:s.day,game:s.game,category:s.category,version:s.version,digest:s.digest,fileName:s.fileName,
   savedAt:s.savedAt,rows:validateRows(s.rows,s.category)};
 }
 function addSnapshot(current,snapshot){
  const state=cleanState(current)||blank();
  if(state.rankings.length>=MAX_SNAPSHOTS)throw Error('LIMITE_VERSIONES');
  const checked=validateSnapshot({...snapshot,schema:1,version:state.rankings.length+1});
  if(!checked)throw Error('SNAPSHOT_INVALIDO');
  if(state.rankings.some(x=>x.day===checked.day&&x.game===checked.game&&x.digest===checked.digest))throw Error('PDF_YA_GUARDADO');
  state.rankings.push(checked);return state;
 }
 function rankingView(snapshots,categoryName,day,game){
  const all=(snapshots||[]).filter(s=>s.category===categoryName&&s.rows&&DAYS.includes(s.day));
  const current=all.filter(s=>s.day===day&&s.game===game).slice(-1)[0]||all.at(-1);
  if(!current)return null;
  const people=current.rows.filter(x=>x.cat===categoryName).sort((a,b)=>a.pos-b.pos);
  const me=people.find(x=>isCelta(x.team));if(!me)return null;
  const leader=people.find(x=>x.pos===1),third=people.find(x=>x.pos===3),
   above=people.filter(x=>x.pos<me.pos).at(-1);
  const previous=all.filter(x=>x!==current).at(-1);
  const older=previous?.rows?.find(x=>x.cat===categoryName&&isCelta(x.team));
  return {current,me,leader,third,above,change:older?older.pos-me.pos:null,
   gapLeader:leader?leader.bolos-me.bolos:null,
   gapPodium:third?third.bolos-me.bolos:null,
   gapAbove:above?above.bolos-me.bolos:null,
   rows:people};
 }
 return Object.freeze({MAX_PDF_BYTES,MAX_ROWS,MAX_SNAPSHOTS,DAYS,CATEGORIES,blank,cleanState,score,category,isCelta,
  updateLazaro,pairs,parseTextLines,pdfLines,validateRows,validateSnapshot,addSnapshot,rankingView,norm});
});
