'use strict';
/* MI BOWLING 3.3.22 · Historial grande (~2,6 M caracteres) en Chrome real: restaurar copia desde archivo
 * y transacción de catálogo ya no fallan por la cuota de localStorage (journal v2 comprimido). */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let rel=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/,'');if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(file,(e,v)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(v)})});
// --- Historial ficticio de ~2 años ---
const ALL=[1,2,3,4,5,6,7,8,9,10],line={approach:'20',arrow:'12',breakpoint:'8'};
function partida(id,seed){const rolls=[];let r=seed;const rnd=()=>{r=(r*16807)%2147483647;return r/2147483647};
 for(let f=1;f<=10;f++){const strike=rnd()<.45;if(strike){rolls.push({frame:f,ball:1,pins:ALL,ballId:'b1',line,lane:9+(f%2),pair:[9,10],foul:false,createdAt:'2025-01-01T10:00:00.000Z'});if(f<10)continue;}
  else{const left=[10,7].slice(0,1+Math.floor(rnd()*2));const k=ALL.filter(p=>!left.includes(p));rolls.push({frame:f,ball:1,pins:k,ballId:'b1',line,lane:9+(f%2),pair:[9,10],foul:false,createdAt:null});rolls.push({frame:f,ball:2,pins:rnd()<.7?left:[],ballId:'b1',line,lane:9+(f%2),pair:[9,10],foul:false,createdAt:null})}
  if(f===10){const g={rolls};}}
 const g={id,includeStats:true,pair:[9,10],startLane:9,segments:[],rolls};
 // completar 10º frame si hace falta (bolas extra)
 const f10=rolls.filter(x=>x.frame===10);const a=f10[0],b=f10[1];
 if(a&&a.pins.length===10){if(!b)rolls.push({frame:10,ball:2,pins:ALL,ballId:'b1',line,lane:10,pair:[9,10],foul:false,createdAt:null});rolls.push({frame:10,ball:3,pins:ALL,ballId:'b1',line,lane:10,pair:[9,10],foul:false,createdAt:null})}
 else if(a&&b&&a.pins.length+b.pins.length===10)rolls.push({frame:10,ball:3,pins:[1,2,3],ballId:'b1',line,lane:10,pair:[9,10],foul:false,createdAt:null});
 return g}
const sessions=[];for(let i=0;i<300;i++){const d=new Date(Date.UTC(2025,0,1)+i*2.4*864e5).toISOString().slice(0,10);sessions.push({id:'s'+i,type:i%5?'entrenamiento':'oficial',date:d,title:'Sesión '+i,venue:'Bolera Centro',notes:'',pattern:'',patternId:'',patternNotes:'',competition:'',leagueOther:false,leaguePlayer:'',goal:null,currentBallId:'b1',currentLine:line,lane:9,games:[0,1,2].map(k=>partida('g'+i+'-'+k,i*7+k+1))})}
const SEED={version:2,hand:'diestro',balls:[{id:'b1',brand:'Storm',model:'Phaze'}],patterns:[],sessions};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://localhost:${server.address().port}/`;
 const browser=await chromium.launch();
 try{
  const nuevo=async(seed)=>{const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',acceptDownloads:true});
   await ctx.addInitScript(([v])=>{if(!sessionStorage.getItem('s')){localStorage.setItem('mi-bowling-analitica-v2',v);sessionStorage.setItem('s','1')}},[JSON.stringify(seed)]);
   const p=await ctx.newPage();const errs=[],dialogs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{dialogs.push(d.message());d.accept()});
   await p.goto(base);await p.waitForFunction(()=>!!window.MiBowlingCatalogoLocal&&!!window.MiBowlingEscritura,null,{timeout:30000});return {ctx,p,errs,dialogs}};
  // Copia pequeña (80 sesiones) generada por la propia app.
  const small={...SEED,sessions:SEED.sessions.slice(0,80)};
  const a=await nuevo(small);const copia=await a.p.evaluate(()=>JSON.stringify(currentLocalBackup()));await a.ctx.close();
  // Dispositivo con el historial completo.
  const b=await nuevo(SEED);
  const usado=await b.p.evaluate(()=>Object.keys(localStorage).reduce((n,k)=>n+k.length+localStorage.getItem(k).length,0));
  console.log('Ocupado en localStorage:',(usado/1048576).toFixed(2),'M caracteres');assert.ok(usado>2.5*1048576);
  // 1. Transacción tipo catálogo (cambia el historial y la selección) en Chrome real.
  const r=await b.p.evaluate(()=>{const g=window.MiBowlingEscritura,s=g.snapshot(),k='mi-bowling-analitica-v2',d=JSON.parse(s[k]);d.balls.push({id:'b2',brand:'Storm',model:'IQ Tour'});
   const t=performance.now();g.transaction({...s,[k]:JSON.stringify(d)});return {ms:Math.round(performance.now()-t),balls:JSON.parse(localStorage.getItem(k)).balls.length,journal:localStorage.getItem('mi-bowling-f1-restore-journal-v1')}});
  console.log('Transacción con historial grande:',r.ms,'ms');assert.equal(r.balls,2);assert.equal(r.journal,null);
  // 2. Restaurar copia desde archivo (flujo real de Ajustes).
  await b.p.setInputFiles('#restore-file',{name:'copia.json',mimeType:'application/json',buffer:Buffer.from(copia)});
  await b.p.waitForFunction(()=>window.MiBowlingEscritura&&db.sessions.length===80,null,{timeout:30000}).catch(async e=>{console.log('DIÁLOGOS:',b.dialogs,'ERRORES:',b.errs);throw e});
  assert.ok(!b.dialogs.some(m=>/No se pudo importar/.test(m)),b.dialogs.join(' | '));
  assert.equal(await b.p.evaluate(()=>localStorage.getItem('mi-bowling-f1-restore-journal-v1')),null);
  assert.deepEqual(b.errs,[]);
  console.log('Restaurar copia desde archivo con historial grande: OK');
  await b.ctx.close();
  console.log('journal-cuota-browser: OK');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
