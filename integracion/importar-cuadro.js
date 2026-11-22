'use strict';
/* MI BOWLING 3.3.26 · Importar el cuadro de enfrentamientos de la Liga Nacional desde PDF.
 * Lee el texto del PDF en el propio móvil (pdf.js, sin servidor) y deduce el orden de rivales
 * de «Mi equipo». Siempre muestra una vista previa; nada se aplica sin confirmar. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MiBowlingCuadro=api;})(globalThis,function(){
 const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[“”«»„‟″'`´’‘]/g,'"').replace(/\s+/g,' ').trim();
 const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 // 'CELTA XUNTA "B"' → acepta CELTA XUNTA "B", CELTA XUNTA B, CELTA-XUNTA 'B', BAT ROLLAN-AT VALOR "B"…
 function teamRegex(team){const t=norm(team),m=t.match(/^(.*?)\s*"([A-Z])"$/);const words=(m?m[1]:t).split(/[\s-]+/).filter(Boolean).map(esc).join('[\\s-]*');
  return m?new RegExp('(?<![A-Z0-9])'+words+'(?:[\\s-]+[A-Z][A-Z-]*){0,3}?\\s*"?\\s*'+m[2]+'(?![A-Z0-9])"?','g'):new RegExp('(?<![A-Z0-9])'+words+'(?![A-Z0-9])','g')}
 function findTeams(line,teams){const out=[];for(const t of teams){const re=teamRegex(t);let x;while((x=re.exec(line)))out.push({team:t,at:x.index,end:x.index+x[0].length})}
  out.sort((a,b)=>a.at-b.at);return out.filter((o,i)=>!out.slice(0,i).some(p=>o.at<p.end))}
 function lanes(s){const m=norm(s).match(/PISTAS?\s*(\d{1,2})\s*(?:-|–|Y|\/|A)\s*(\d{1,2})/);return m?m[1]+'-'+m[2]:''}
 // Estrategia 1: el nombre de mi equipo y el del rival en la misma línea («CELTA XUNTA "B" - LEVANTE»).
 function byNames(lines,teams,mine){const res=[];for(const raw of lines){const l=norm(raw),f=findTeams(l,teams);if(!f.some(x=>x.team===mine))continue;
   const others=f.filter(x=>x.team!==mine);
   if(others.length===1)res.push({rival:others[0].team,lanes:lanes(l)});
   else if(others.length>1){const me=f.findIndex(x=>x.team===mine),nb=f[me%2===0?me+1:me-1];if(nb&&nb.team!==mine)res.push({rival:nb.team,lanes:''})}}
  return res}
 // Estrategia 2: equipos numerados («Nº 5 · CELTA XUNTA "B"») y cruces por número («1ª · 2A-3A · 5B-8B…»).
 function byNumbers(lines,teams,mine){const num={};for(const raw of lines){const l=norm(raw);
   for(const t of teams){const re=new RegExp('(?:N\\s*[º°O]\\.?\\s*)?(\\d{1,2})\\s*[.·:)\\-]?\\s*'+teamRegex(t).source.replace(/\(\?<!\[A-Z0-9\]\)/,''),'g');let x;while((x=re.exec(l)))if(!(t in num))num[t]=Number(x[1])}}
  const n=num[mine];if(!n||Object.keys(num).length<4)return[];
  const team=Object.fromEntries(Object.entries(num).map(([t,k])=>[k,t])),res=[];
  for(const raw of lines){const l=norm(raw);if(findTeams(l,teams).length)continue;const re=/(?<!\d)(\d{1,2})\s*[AB]?\s*-\s*(\d{1,2})\s*[AB]?(?![\d])/g;let x,seen=new Set();
   while((x=re.exec(l))){const a=Number(x[1]),b=Number(x[2]);const o=a===n?b:b===n?a:null;if(o!==null&&team[o]&&!seen.has(o)){seen.add(o);res.push({rival:team[o],lanes:''})}}}
  return res}
 // Devuelve los 7 rivales en orden por jornada (si el PDF trae varias, en bloques de 7).
 function parse(lines,teams,mine){teams=teams.map(String);if(!teams.includes(mine))throw Error('Elige primero «Mi equipo».');
  const others=teams.filter(t=>t!==mine);
  for(const [method,fn] of [['nombres',byNames],['números',byNumbers]]){const found=fn(lines,teams,mine);if(found.length<others.length)continue;
   const rounds=[];let cur=[];for(const f of found){if(cur.some(x=>x.rival===f.rival)){rounds.push(cur);cur=[]}cur.push(f);if(cur.length===others.length){rounds.push(cur);cur=[]}}
   const ok=rounds.filter(r=>r.length===others.length&&new Set(r.map(x=>x.rival)).size===others.length);
   if(ok.length)return {method,rounds:ok.map(r=>r.map(x=>({rival:x.rival,lanes:x.lanes})))}}
  return null}
 async function pdfLines(buffer,base){const lib=await import(base+'vendor/pdfjs/pdf.min.mjs');lib.GlobalWorkerOptions.workerSrc=base+'vendor/pdfjs/pdf.worker.min.mjs';
  const doc=await lib.getDocument({data:new Uint8Array(buffer),isEvalSupported:false}).promise,lines=[];
  for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p),tc=await page.getTextContent(),rows=[];
   for(const it of tc.items){if(!it.str||!it.str.trim())continue;const y=it.transform[5],x=it.transform[4];let r=rows.find(r=>Math.abs(r.y-y)<3);if(!r)rows.push(r={y,items:[]});r.items.push({x,s:it.str})}
   rows.sort((a,b)=>b.y-a.y).forEach(r=>lines.push(r.items.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ')))}
  return lines}
 return Object.freeze({parse,pdfLines,norm,findTeams});
});
