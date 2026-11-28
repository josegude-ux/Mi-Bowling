'use strict';
/* MI BOWLING · Marcador PDF A4 apaisado, seis partidas por página.
 * Sin bibliotecas, servidores ni persistencia. PDF imagen raster de calidad 2x.
 * Blanco = quedaron en pie tras 1a bola; rojo = fallados tras 2a bola.
 * Replica el mini triángulo de integracion/registro-compacto.js.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MiBowlingMarcadorPDF=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const PAGE_W=1684,PAGE_H=1190,PDF_W=842,PDF_H=595,PER_PAGE=6,MAX_GAMES=60;
 const PINS=Object.freeze([1,2,3,4,5,6,7,8,9,10]);
 const RACK_POS=Object.freeze({7:[4,3],8:[10,3],9:[16,3],10:[22,3],4:[7,9],5:[13,9],6:[19,9],2:[10,15],3:[16,15],1:[13,21]});
 const text=(s,max=96)=>String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
 const number=(v)=>Number.isInteger(v)&&v>=0&&v<=300?v:null;
 const slicePages=games=>{
  if(!Array.isArray(games)||!games.length||games.length>MAX_GAMES)throw Error('PARTIDAS_PDF_INVALIDAS');
  const pages=[];for(let i=0;i<games.length;i+=PER_PAGE)pages.push(games.slice(i,i+PER_PAGE));
  return pages;
 };
 function pinMap(rolls,frame,finalOnly){
  if(finalOnly||!Array.isArray(rolls)||!rolls.length||rolls.some(r=>r?.pinDetail==='count'||!Array.isArray(r?.pins)))return null;
  let i=0;
  if(frame===10){while(i<rolls.length&&rolls[i].pins.length===10)i++;if(i>=rolls.length)return null}
  else if(rolls[0].pins.length===10)return null;
  const first=rolls[i],second=frame===10&&i>=2?null:rolls[i+1];
  if(!first||first.pins.some(p=>!PINS.includes(p)))return null;
  const standing=PINS.filter(p=>!first.pins.includes(p));
  const missed=second?.pins?standing.filter(p=>!second.pins.includes(p)):null;
  const marks={};
  for(const p of PINS)marks[p]=!standing.includes(p)?'knocked':missed?.includes(p)?'missed':'standing';
  return marks;
 }
 function prepareReport(input){
  if(!input||!Array.isArray(input.games)||!input.games.length||input.games.length>MAX_GAMES)throw Error('SIN_PARTIDAS_PARA_PDF');
  const games=input.games.map((g,i)=>{
   const frames=Array.from({length:10},(_,j)=>{
    const f=g.frames?.[j]||{},rolls=Array.isArray(f.rolls)?f.rolls:[];
    return {number:j+1,marks:text(f.marks,16),cumulative:Number.isInteger(f.cumulative)?f.cumulative:null,
     rack:pinMap(rolls,j+1,!!g.finalOnly)};
   });
   const score=number(g.score),partner=number(g.partnerScore);
   return {index:i+1,date:text(g.date,24),lane:Number.isInteger(g.lane)?g.lane:null,
    score,partner,team:partner!==null&&score!==null?score+partner:null,
    finalOnly:!!g.finalOnly,complete:!!g.complete,frames};
  });
  const done=games.filter(g=>g.complete&&g.score!==null);
  const sum=done.reduce((a,g)=>a+g.score,0);
  const partnerGames=games.filter(g=>g.team!==null&&g.complete);
  return {title:text(input.title)||'Marcadores MI BOWLING',
   date:text(input.date,40),venue:text(input.venue,75),competition:text(input.competition,75),
   games,totals:{completed:done.length,played:games.length,score:sum,
    average:done.length?sum/done.length:null,best:done.length?Math.max(...done.map(g=>g.score)):null,
    combined:partnerGames.length?partnerGames.reduce((a,g)=>a+g.team,0):null,
    combinedCount:partnerGames.length},pages:slicePages(games)};
 }
 function format(v){return v===null||v===undefined?'—':Number(v).toLocaleString('es-ES')}
 function canvasPage(report,pageIndex,makeCanvas){
  const canvas=makeCanvas();canvas.width=PAGE_W;canvas.height=PAGE_H;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('CANVAS_NO_DISPONIBLE');
  const ink='#192431',light='#607083',border='#ccd4df',bg='#ffffff',shade='#f5f8fc',
   orange='#e75a29',red='#d6273c',gray='#b3bdc9';
  ctx.fillStyle=bg;ctx.fillRect(0,0,PAGE_W,PAGE_H);
  const line=(x,y,x2,y2,color=border,width=1)=>{ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke()};
  const label=(s,x,y,size=23,weight=500,color=ink,align='left')=>{
   ctx.fillStyle=color;ctx.font=weight+' '+size+'px Arial, sans-serif';ctx.textAlign=align;
   ctx.fillText(String(s),x,y);ctx.textAlign='left';
  };
  const top=30,margin=40;
  label('MI BOWLING',margin,top+29,31,800,ink);
  label(report.title,margin+235,top+29,29,700,ink);
  label('Pág. '+(pageIndex+1)+' de '+report.pages.length,PAGE_W-margin,top+29,20,600,light,'right');
  label([report.date,report.venue,report.competition].filter(Boolean).join('  ·  '),margin,top+67,20,500,light);
  line(margin,112,PAGE_W-margin,112,orange,3);
  const rows=report.pages[pageIndex],rowY=128,rowH=162,headW=210,
   boardX=margin+headW,boardW=PAGE_W-margin*2-headW,colW=boardW/10;
  rows.forEach(g=>{
   const y=rowY+(g.index-1-pageIndex*PER_PAGE)*rowH;
   ctx.fillStyle=(g.index%2===0)?shade:bg;ctx.fillRect(margin,y,PAGE_W-2*margin,rowH-4);
   ctx.strokeStyle=border;ctx.lineWidth=1;ctx.strokeRect(margin,y,PAGE_W-2*margin,rowH-4);
   label('PARTIDA '+g.index,margin+14,y+32,23,800,ink);
   label([g.date,g.lane?'Pista '+g.lane:null].filter(Boolean).join(' · '),margin+14,y+58,16,500,light);
   label(g.score===null?'En curso':format(g.score),margin+14,y+115,44,800,orange);
   if(g.partner!==null)label('Lázaro '+format(g.partner)+' · Pareja '+format(g.team),margin+14,y+143,16,600,ink);
   if(g.finalOnly){
    ctx.fillStyle=shade;ctx.fillRect(boardX,y+10,boardW-12,rowH-24);
    label('Solo resultado final · detalle de frames y bolos no registrado',boardX+boardW/2,y+88,25,500,light,'center');
    return;
   }
   for(let f=0;f<10;f++){
    const fr=g.frames[f],x=boardX+f*colW;
    if(f)line(x,y+12,x,y+rowH-16);
    label(String(f+1),x+10,y+23,15,700,light);
    label(fr.marks||'·',x+colW/2,y+46,25,800,ink,'center');
    if(fr.rack){
     const x0=x+colW/2-26,y0=y+53;
     for(const [pin,pos] of Object.entries(RACK_POS)){
      const mode=fr.rack[pin];
      const px=x0+pos[0]*2.1,py=y0+pos[1]*2.1;
      ctx.beginPath();ctx.arc(px,py,mode==='knocked'?3.5:5.7,0,Math.PI*2);
      ctx.fillStyle=mode==='missed'?red:mode==='standing'?bg:gray;ctx.fill();
      if(mode==='standing'){ctx.strokeStyle='#657588';ctx.lineWidth=2;ctx.stroke()}
     }
    }
    label(fr.cumulative===null?'·':format(fr.cumulative),x+colW/2,y+144,25,800,ink,'center');
   }
  });
  const footerY=1117;
  line(margin,footerY-13,PAGE_W-margin,footerY-13,border,2);
  label('Serie: '+report.totals.completed+'/'+report.totals.played+' completas  ·  '+format(report.totals.score)+' bolos  ·  Media '+(report.totals.average===null?'—':report.totals.average.toFixed(2)),margin,footerY+13,22,650,ink);
  if(report.totals.combined!==null)
   label('Pareja: '+format(report.totals.combined)+' bolos ('+report.totals.combinedCount+' con ambos resultados)',PAGE_W-margin,footerY+13,18,600,ink,'right');
  label('Bolos: blanco = en pie tras 1.ª bola  ·  rojo = fallados tras 2.ª  ·  gris = derribados  ·  marca X / = strike / spare',margin,footerY+45,19,500,light);
  return canvas;
 }
 const encoder=new TextEncoder();
 function makePdf(canvases){
  if(!canvases.length)throw Error('NO_HAY_PAGINAS');
  const chunks=[],offsets=[],totalObjs=2+canvases.length*3;let size=0;
  const add=part=>{const bytes=typeof part==='string'?encoder.encode(part):part;chunks.push(bytes);size+=bytes.byteLength};
  const obj=(n,body)=>{offsets[n]=size;add(n+' 0 obj\n');body();add('\nendobj\n')};
  add('%PDF-1.4\n%\xC2\xB5\xC2\xB5\n');
  obj(1,()=>add('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2,()=>add('<< /Type /Pages /Count '+canvases.length+' /Kids [ '+canvases.map((_,i)=>(3+i*3)+' 0 R').join(' ')+' ] >>'));
  canvases.forEach((canvas,i)=>{
   const pageId=3+i*3,imgId=pageId+1,contentId=pageId+2;
   const jpegData=canvas.toDataURL('image/jpeg',0.90).split(',')[1];
   if(!jpegData)throw Error('CANVAS_JPEG_NO_DISPONIBLE');
   const binary=atob(jpegData),image=new Uint8Array(binary.length);
   for(let p=0;p<binary.length;p++)image[p]=binary.charCodeAt(p);
   obj(pageId,()=>add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PDF_W+' '+PDF_H+'] /Resources << /XObject << /Im0 '+imgId+' 0 R >> >> /Contents '+contentId+' 0 R >>'));
   obj(imgId,()=>{add('<< /Type /XObject /Subtype /Image /Width '+PAGE_W+' /Height '+PAGE_H+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+image.length+' >>\nstream\n');add(image);add('\nendstream')});
   const stream='q\n'+PDF_W+' 0 0 '+PDF_H+' 0 0 cm\n/Im0 Do\nQ\n';
   const len=encoder.encode(stream).length;
   obj(contentId,()=>add('<< /Length '+len+' >>\nstream\n'+stream+'endstream'));
  });
  const xref=size;
  add('xref\n0 '+(totalObjs+1)+'\n0000000000 65535 f \n');
  for(let id=1;id<=totalObjs;id++)add(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
  add('trailer\n<< /Size '+(totalObjs+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
  const out=new Uint8Array(size);let offset=0;
  for(const c of chunks){out.set(c,offset);offset+=c.byteLength}
  if(size>16*1024*1024)throw Error('PDF_DEMASIADO_GRANDE');
  return new Blob([out],{type:'application/pdf'});
 }
 function generate(input,makeCanvas){
  const report=prepareReport(input);
  const create=makeCanvas||(()=>document.createElement('canvas'));
  const canvases=report.pages.map((_,i)=>canvasPage(report,i,create));
  return {blob:makePdf(canvases),report};
 }
 return Object.freeze({PAGE_W,PAGE_H,PER_PAGE,MAX_GAMES,pinMap,prepareReport,canvasPage,makePdf,generate});
});
