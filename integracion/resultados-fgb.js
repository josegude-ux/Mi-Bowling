'use strict';
/* MI BOWLING 3.3.28 · PDFs de resultados de la Federación Galega (texto, no escaneados).
 * Formatos: clasificación general, parejas (podio/resumen), copa (resumen por series),
 * orden de pistas y distribución de series. Funciones puras: se prueban en Node. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MiBowlingFGB=api;})(globalThis,function(){
 const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[“”«»„‟″'`´’‘]/g,'"').replace(/\s+/g,' ').trim();
 const CLUBS=['S. OLEIROS','LIMITE 200','SOLBOWLING','MILESIOS','CORUÑA','CELTA','CENTED','INDIVIDUAL'];
 const CLUBK='('+CLUBS.map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')',CLUBG='([A-ZÑÁÉÍÓÚ][A-ZÑÁÉÍÓÚ0-9.\\-]*(?: [A-ZÑÁÉÍÓÚ0-9.\\-]+){0,2}?)';
 // Primero clubs conocidos; el comodín solo si ninguno encaja.
 const mt=(l,src)=>l.match(new RegExp(src.replace('§',CLUBK)))||l.match(new RegExp(src.replace('§',CLUBG)));
 const num=s=>Number(String(s).replace(/\./g,'').replace(',','.'));
 const MONTHS={ENERO:1,FEBRERO:2,MARZO:3,ABRIL:4,MAYO:5,JUNIO:6,JULIO:7,AGOSTO:8,SEPTIEMBRE:9,SETIEMBRE:9,OCTUBRE:10,NOVIEMBRE:11,DICIEMBRE:12};
 function findDate(lines){for(const l of lines){const m=norm(l).match(/\b(\d{1,2})(?:\s*-\s*\d{1,2})?\s+(?:DE\s+)?([A-Z]+)\s+(?:DE\s+)?(20\d\d)(?:\s+(\d{1,2}:\d{2}))?/);if(m&&MONTHS[m[2]])return {date:`${m[3]}-${String(MONTHS[m[2]]).padStart(2,'0')}-${m[1].padStart(2,'0')}`,time:m[4]||''}}return {date:'',time:''}}
 function detect(lines){const all=norm(lines.slice(0,8).join(' ')),txt=norm(lines.join(' '));
  if(/CLASIFICACION GENERAL/.test(all)&&/POS CAT NOMBRE CLUB PART BOLOS/.test(txt))return 'general';
  if(/POS PAREJA CLUB BOLOS/.test(txt))return 'parejas';
  if(/POS NOMBRE CLUB (HDCP )?BOLOS SCRATCH SERIE/.test(txt))return 'copa';
  if(/ORDEN PISTAS/.test(all))return 'pistas';
  if(/POS JUGADOR CLUB/.test(txt)&&/SERIE/.test(all))return 'series';
  return null}
 const CATS={PRIMERA:'1ª',SEGUNDA:'2ª',TERCERA:'3ª'};
 function parse(lines){const kind=detect(lines);if(!kind)return null;const title=lines[0]?.trim()||'',sub=(lines[1]||'').trim();const {date,time}=findDate(lines);const rows=[];let sect='',gender='M',head='';
  for(const raw of lines){const l=raw.replace(/\s+/g,' ').trim(),n=norm(l);let m;
   if(/^MASCULINA$/.test(n))gender='M';if(/^FEMENINA$/.test(n))gender='F';
   if((m=n.match(/^CATEGORIA\s+"?([A-Z])"?(?:\s|$)/)))sect='Cat. '+m[1];if(/^CATEGORIA UNICA FEMENINA/.test(n)){sect='Única femenina';gender='F'}
   if((m=n.match(/^(PRIMERA|SEGUNDA|TERCERA) CATEGORIA$/)))sect=CATS[m[1]]+' categoría';
   if(/^JUGADORES INDIVIDUALES/.test(n))sect='Individuales';
   if((m=n.match(/^(PRIMERA|SEGUNDA|TERCERA|CUARTA) SERIE$/)))head=m[1][0]+m[1].slice(1).toLowerCase()+' serie';
   if((m=n.match(/^SERIE (SABADO|DOMINGO|VIERNES) \((\d{1,2}:\d{2})\)$/)))head=m[1][0]+m[1].slice(1).toLowerCase()+' '+m[2];
   if(/^(POS|CAT) /.test(n)&&/HDCP|HCDP|HC1/.test(n))sect=sect;
   if(kind==='general'&&(m=mt(l,'^(\\d{1,3})\\s+(1M|2M|3M|UF|U|1F|2F)\\s+(.+?,.*?)\\s*§\\s+(\\d+)\\s+(\\d{1,2}\\.\\d{3}|\\d+)\\s+(\\d+,\\d+)\\s+(\\d+)(?:\\s+(\\d+))?$')))
    rows.push({pos:+m[1],cat:m[2],name:m[3].trim().replace(/\s*,\s*/,', ').replace(/\s+/g,' '),club:m[4].trim(),part:+m[5],bolos:num(m[6]),prom:num(m[7]),max:+m[8],hdcp:m[9]?+m[9]:null,gender});
   else if(kind==='parejas'&&sect!=='Individuales'&&(m=mt(l,'^(\\d{1,3})\\s+(.+?)\\s+/\\s+(.+?)\\s+§\\s+(\\d+)\\s+(\\d+,\\d+)(?:\\s+(\\d+)\\s+(\\d+))?(?:\\s+(\\d+)\\s+(\\d+))?$')))
    rows.push({pos:+m[1],sect,names:[m[2].trim(),m[3].trim()],club:m[4].trim(),bolos:+m[5],prom:num(m[6]),parts:m[7]?[+m[7],+m[8]]:[],hdcp:m[9]?[+m[9],+m[10]]:null});
   else if(kind==='parejas'&&sect==='Individuales'&&(m=mt(l,'^(\\d{1,3})\\s+([A-ZÑÁÉÍÓÚ .]+?)\\s+§\\s+(\\d+)\\s+(\\d+,\\d+)(?:\\s+(\\d+))?(?:\\s+(\\d+))?$')))
    rows.push({pos:+m[1],sect,names:[m[2].trim()],club:m[3].trim(),bolos:+m[4],prom:num(m[5]),scratch:m[6]?+m[6]:null});
   else if(kind==='copa'&&(m=mt(l,'^(\\d{1,3})\\s+([A-ZÑÁÉÍÓÚ .]+?)\\s+§\\s+(?:(\\d{1,2})\\s+)?(\\d+)\\s+(\\d+)\\s+(S\\d)$')))
    rows.push({pos:+m[1],sect,cat:{'1ª categoría':'1M','2ª categoría':'2M','3ª categoría':'3M'}[sect]||null,names:[m[2].trim()],club:m[3].trim(),hdcp:m[4]?+m[4]:null,bolos:+m[5],scratch:+m[6],serie:m[7]});
   else if(kind==='pistas'&&(m=mt(l,'^(\\d{1,3})\\s+(1M|2M|3M|UF|U)\\s+([A-ZÑÁÉÍÓÚ .]+?)\\s+§\\s+(\\d+,\\d+)\\s+(\\d{1,2}[A-D])\\s+(\\d{1,2}[A-D])$')))
    rows.push({cat:m[2],names:[m[3].trim()],club:m[4].trim(),prom:num(m[5]),lanes:[m[6],m[7]],serie:head});
   else if(kind==='series'&&(m=mt(l,'^(\\d{1,3})\\s+([A-ZÑÁÉÍÓÚ .]+?)\\s+§\\s+(?:(\\d+,\\d+)\\s+)?(SABADO|DOMINGO|VIERNES)\\s*\\((\\d{1,2}:\\d{2})\\)$')))
    rows.push({names:[m[2].trim()],club:m[3].trim(),serie:head||(m[5]&&(m[5][0]+m[5].slice(1).toLowerCase()+' '+m[6]))});
  }
  // Series de pistas: la fecha/hora de cada serie va en la línea siguiente al título de la serie.
  if(kind==='pistas'){const dates={};let h='';for(const l of lines){const n=norm(l),s=n.match(/^(PRIMERA|SEGUNDA|TERCERA|CUARTA) SERIE$/);if(s)h=s[1][0]+s[1].slice(1).toLowerCase()+' serie';else if(h&&!dates[h]){const d=findDate([l]);if(d.date)dates[h]=d}}rows.forEach(r=>{const d=dates[r.serie];if(d){r.date=d.date;r.time=d.time}})}
  return {kind,title,sub,date,time,rows}}
 // ---- Identificación de jugadores entre formatos ----
 const toks=s=>norm(s).replace(/[^A-Z ,.]/g,' ').split(/[\s.]+/).filter(Boolean);
 function personKey(full){const [sur,giv]=norm(full).split(',');return (sur||'').trim().replace(/\s+/g,'_')+'|'+(giv||'').trim().split(/\s+/)[0]}
 function resolve(raw,club,registry,catHint){const nclub=norm(club),r=norm(raw);if(r.includes(','))return registry.find(p=>personKey(p.name)===personKey(raw))?.key||null;
  const words=r.replace(/\./g,'. ').split(/\s+/).filter(Boolean),initials=words.filter(w=>/^[A-Z]{1,3}\.$/.test(w)).map(w=>w.slice(0,-1)),plain=words.filter(w=>!/\.$/.test(w));
  let best=[],score=-1;
  for(const p of registry){if(norm(p.club)!==nclub)continue;const [sur,giv]=norm(p.name).split(','),S=sur.trim().split(/\s+/),G=(giv||'').trim().split(/\s+/).filter(Boolean);
   let sc=0;const surHit=plain.findIndex(w=>w.length>1&&(w===S[0]||(S.includes(w)&&w.length>=3)));if(surHit<0)continue;sc+=plain.some(w=>w===S[0])?3:2;
   const rest=plain.filter((w,i)=>i!==surHit&&!S.includes(w));
   for(const w of rest){if(G[0]===w)sc+=4;else if(G.some(g=>g===w))sc+=3;else if(G.some(g=>w.length>=3&&(g.startsWith(w)||w.startsWith(g))))sc+=2}
   for(const ini of initials){if(G[0]&&G[0][0]===ini[0])sc+=2;if(ini.length>1&&G[1]&&G[1][0]===ini[1])sc+=1;else if(G.some(g=>g[0]===ini[0]))sc+=1;else sc-=3}
   if(catHint&&p.cat===catHint)sc+=1;
   if(sc>score){score=sc;best=[p]}else if(sc===score)best.push(p)}
  return best.length===1&&score>=4?best[0].key:null}
 return Object.freeze({parse,detect,resolve,personKey,norm});
});
