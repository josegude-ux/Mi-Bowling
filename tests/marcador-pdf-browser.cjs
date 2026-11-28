'use strict';
/* Chromium/WebKit: seis marcadores reales como documento PDF,
 * con bolos ficticios y sin operaciones sobre los datos del usuario. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),KEY='mi-bowling-analitica-v2';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,'')}catch{res.writeHead(400);return res.end()}
 if(!rel||rel.endsWith('/'))rel+='index.html';
 const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.readFile(file,(err,b)=>{if(err){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b)});
});
const PINS=[1,2,3,4,5,6,7,8,9,10],first=PINS.filter(x=>x!==10);
const rolls=()=>Array.from({length:10},(_,i)=>[
 {frame:i+1,ball:1,pins:[...first],lane:17+i%2,ballId:'x',foul:false},
 {frame:i+1,ball:2,pins:[],lane:17+i%2,ballId:'x',foul:false}
]).flat();
const session=(day,id)=>({
 id,type:'oficial',date:day,title:'Campeonato de parejas ficticio',venue:'Bolera ficticia',
 notes:'[FEB6249:PAREJAS-2M3M:'+day+']',pattern:'',patternId:'',patternNotes:'',currentBallId:'x',currentLine:{approach:'',arrow:'',breakpoint:''},
 lane:17,parejas2026:{schema:1,lazaro:[150,151,152,153,154,155],rankings:[]},
 games:Array.from({length:6},(_,i)=>({id:id+'-g'+i,includeStats:true,pair:[17,18],startLane:17+2*i,segments:[],rolls:rolls()}))
});
const seed={version:2,hand:'diestro',balls:[],patterns:[],sessions:[session('2026-11-28','sat'),session('2026-11-29','sun')]};
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await (process.env.BOWLING_BROWSER==='webkit'?webkit:chromium).launch();
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  await ctx.addInitScript(([k,v])=>{
   if(!sessionStorage.getItem('pdf-sharing-seed')){
    localStorage.setItem(k,v);
    localStorage.setItem('mibowling.pref.registro-modo','bolos');
    sessionStorage.setItem('pdf-sharing-seed','yes');
   }
   Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
   Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
    window.__lastSharedPdf=data.files?.[0]||null;
    window.__shareCount=(window.__shareCount||0)+1;
   }});
  },[KEY,JSON.stringify(seed)]);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('http://localhost:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof compartirMarcadorPDF==='function'&&window.MiBowlingMarcadorPDF&&typeof abrirTorneoParejas==='function',null,{timeout:16000});
  const old=await page.evaluate(k=>localStorage.getItem(k),KEY);
  await page.evaluate(()=>abrirTorneoParejas());
  const btn=page.getByRole('button',{name:'Compartir marcadores del torneo PDF · 6 por página'});
  await btn.click();
  const check=await page.evaluate(async()=>{
   if(!window.__lastSharedPdf)throw Error('Web Share File no recibido');
   const f=window.__lastSharedPdf,bytes=new Uint8Array(await f.arrayBuffer());
   const lib=await import('./vendor/pdfjs/pdf.min.mjs');
   lib.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',location.href).href;
   const doc=await lib.getDocument({data:bytes}).promise;
   const page1=await doc.getPage(1),vp=page1.getViewport({scale:1});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
   await page1.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
   return {name:f.name,size:f.size,type:f.type,pages:doc.numPages,media:[vp.width,vp.height],header:String.fromCharCode(...bytes.slice(0,8)),shareCount:window.__shareCount||0,
    rgba:Array.from(canvas.getContext('2d').getImageData(170,94,1,1).data)};
  });
  assert.equal(check.pages,2,'12 partidas, seis por página');
  assert.equal(check.name,'MI-BOWLING-Parejas-2026-marcadores.pdf');
  assert.equal(check.type,'application/pdf');
  assert(check.header.startsWith('%PDF-1.4'));
  assert.deepEqual(check.media,[842,595],'A4 horizontal');
  assert(check.size>12000&&check.size<16*1024*1024,'Tamaño PDF razonable');
  assert.equal(check.shareCount,1,'Uso de compartir nativo');
  const red=await page.evaluate(()=>{
   const M=window.MiBowlingMarcadorPDF;
   const fake={
    date:'2026-11-28',title:'Prueba',venue:'LAB',
    games:Array.from({length:6},(_,i)=>({
     date:'2026-11-28',lane:17+i,score:90,complete:true,finalOnly:false,
     frames:Array.from({length:10},(_,j)=>({
      marks:'9 –',cumulative:9*(j+1),
      rolls:[{pins:[1,2,3,4,5,6,7,8,9]},{pins:[]}]
     }))
    }))
   };
   const r=M.prepareReport(fake),canvas=M.canvasPage(r,0,()=>document.createElement('canvas'));
   return [...canvas.getContext('2d').getImageData(340,187,1,1).data];
  });
  assert(red[0]>red[1]*1.3&&red[0]>red[2]*1.3,'Pin rojo fallado aparece en hoja');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),old,'Compartir PDF nunca modifica partidas');
  // Un único sábado produce una única página.
  await page.evaluate(()=>{activeId='sat';go('detalle')});
  await page.getByRole('button',{name:'Compartir marcador PDF (6 por página)'}).click();
  const alone=await page.evaluate(async()=>{
   const doc=await (await import('./vendor/pdfjs/pdf.min.mjs')).getDocument({data:new Uint8Array(await window.__lastSharedPdf.arrayBuffer())}).promise;
   return{pages:doc.numPages,size:window.__lastSharedPdf.size};
  });
  assert.equal(alone.pages,1,'Sábado 6 partidas = 1 hoja');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),old);
  assert(errors.length===0,'Errores JS: '+errors.join(' | '));
  console.log('MARCADOR-PDF-BROWSER '+(process.env.BOWLING_BROWSER==='webkit'?'WEBKIT':'CHROMIUM')+' PASS: 6 juegos/página, 12→2, A4 PDF válido, pin rojo visible, compartir iPhone, sin tocar datos');
  await ctx.close();
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(err=>{console.error(err);process.exitCode=1});
