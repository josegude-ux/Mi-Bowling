'use strict';
/* 3.3.22 · El journal de escritura ya no desborda localStorage con historiales grandes.
 * Almacén falso con la cuota real de los navegadores (5.242.880 caracteres). */
const assert=require('assert');const A=require('../integracion/autoridad-local.js');
const QUOTA=5*1024*1024;
function store(init={}){const m=new Map(Object.entries(init));const used=()=>{let n=0;for(const [k,v] of m)n+=k.length+v.length;return n};
 return {m,getItem:k=>m.has(k)?m.get(k):null,removeItem:k=>m.delete(k),setItem:(k,v)=>{v=String(v);const old=m.has(k)?k.length+m.get(k).length:0;
  if(used()-old+k.length+v.length>QUOTA){const e=Error("Setting the value of '"+k+"' exceeded the quota.");e.name='QuotaExceededError';throw e}m.set(k,v)},used}}
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

const big=JSON.stringify(SEED);const DB='mi-bowling-analitica-v2';
console.log('Historial:',(big.length/1048576).toFixed(2),'M caracteres');
const base=()=>Object.fromEntries(A.KEYS.map(k=>[k,null]));
// 1) Compresión sin pérdida (incluye unicode, surrogates y repetición patológica).
const {lzw,unlzw}=A._journal;
for(const s of ['','a','aaaaaaaaaaaaaaaaaaaaaaaa','ñandú 🎳 bolos «»','abababababababab'.repeat(5000),big]){const z=lzw(s);assert.equal(unlzw(z,s.length),s);}
let t=Date.now();const z=lzw(big);console.log('Comprimido:',(z.length/1024).toFixed(0),'K caracteres en',Date.now()-t,'ms');
// 2) Restaurar desde archivo: historial grande → copia más pequeña (antes fallaba por cuota).
{const init={[DB]:big,'mi-bowling-v1':'{"x":1}'};const st=store(init);const g=A.create(st,()=>true);
 const small=JSON.stringify({...SEED,sessions:SEED.sessions.slice(0,80)});const after={...g.snapshot(),[DB]:small};
 t=Date.now();assert.equal(g.transaction(after),true);console.log('Restauración grande→pequeña OK en',Date.now()-t,'ms');
 assert.equal(st.getItem(DB),small);assert.equal(st.getItem(A.JOURNAL),null);}
// 3) Vincular bola del catálogo: cambia el historial grande y otra clave.
{const st=store({[DB]:big});const g=A.create(st,()=>true);const sel='mi-bowling-ball-selection-v1';
 const nd=big.replace('"balls":[','"balls":[{"id":"nueva","brand":"Storm","model":"IQ"},');
 assert.equal(g.transaction({...g.snapshot(),[DB]:nd,[sel]:'{"id":"nueva"}'}),true);assert.equal(st.getItem(DB),nd);assert.equal(st.getItem(sel),'{"id":"nueva"}');}
// 4) Fallo a mitad (segunda clave revienta la cuota) → vuelve exactamente al estado anterior.
{const st=store({[DB]:big,'mi-bowling-v1':'v'});const g=A.create(st,()=>true);const before=A.snapshot(st);
 assert.throws(()=>g.transaction({...before,[DB]:'{"pequeño":1}','mi-bowling-v1':'x'.repeat(QUOTA)}),/quota/);
 assert.deepEqual(A.snapshot(st),before);assert.equal(st.getItem(A.JOURNAL),null);assert.equal(g.isBlocked(),false);}
// 5) La app se cierra a mitad de transacción: el journal v2 queda y al arrancar se revierte.
{const st=store({[DB]:big,'mi-bowling-v1':'antes'});const before=A.snapshot(st);const after={...before,[DB]:'{"nuevo":1}','mi-bowling-v1':null};
 st.setItem(A.JOURNAL,JSON.stringify(A._journal.buildJournal(before,after)));st.setItem(DB,'{"nuevo":1}'); // corte tras la primera clave
 const g=A.create(st,()=>true);assert.deepEqual(A.snapshot(st),before);assert.equal(st.getItem(A.JOURNAL),null);g.assertAuthority();}
// 6) Corte con todas las claves ya escritas: también se revierte a 'before' (misma semántica que v1).
{const st=store({[DB]:big});const before=A.snapshot(st);const after={...before,[DB]:'{"n":2}'};
 st.setItem(A.JOURNAL,JSON.stringify(A._journal.buildJournal(before,after)));st.setItem(DB,'{"n":2}');A.create(st,()=>true);assert.deepEqual(A.snapshot(st),before);}
// 7) Conflicto: una clave con un valor ajeno a before/after → no se toca nada y no arranca.
{const st=store({[DB]:'{"a":1}'});const before=A.snapshot(st);const after={...before,[DB]:'{"b":1}'};
 st.setItem(A.JOURNAL,JSON.stringify(A._journal.buildJournal(before,after)));st.setItem(DB,'{"otro":1}');
 assert.throws(()=>A.create(st,()=>true),/Conflicto/);assert.equal(st.getItem(DB),'{"otro":1}');assert.notEqual(st.getItem(A.JOURNAL),null);}
// 8) Compatibilidad: un journal v1 pendiente de una versión anterior se sigue recuperando.
{const st=store({[DB]:'{"a":1}'});const before=A.snapshot(st);const after={...before,[DB]:'{"b":1}'};
 st.setItem(A.JOURNAL,JSON.stringify({version:1,before,after}));st.setItem(DB,'{"b":1}');A.create(st,()=>true);assert.deepEqual(A.snapshot(st),before);assert.equal(st.getItem(A.JOURNAL),null);}
// 9) Journal manipulado (datos comprimidos alterados) → se detecta, no se aplica.
{const st=store({[DB]:'{"a":1,"texto":"'+'bolos '.repeat(50)+'"}'});const before=A.snapshot(st);const after={...before,[DB]:'{"b":1}'};
 const j=A._journal.buildJournal(before,after);j.keys[DB].v.z=j.keys[DB].v.z.slice(0,-3)+'AAA';st.setItem(A.JOURNAL,JSON.stringify(j));
 assert.throws(()=>A.create(st,()=>true),/Journal dañado/);}
// 10) Escrituras normales siguen igual y el journal de v1 hubiera desbordado aquí.
{const st=store({[DB]:big});const g=A.create(st,()=>true);g.write('mi-bowling-v1','ok');assert.equal(st.getItem('mi-bowling-v1'),'ok');
 const v1len=JSON.stringify({version:1,before:A.snapshot(st),after:{...A.snapshot(st),[DB]:'{}'}}).length;assert.ok(v1len+st.used()>QUOTA,'el escenario reproduce el fallo antiguo');}
console.log('autoridad-journal-cuota: 10/10 OK');
