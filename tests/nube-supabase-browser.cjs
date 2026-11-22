'use strict';
/* MI BOWLING 3.3.21 · Copia en la nube con Supabase SIMULADO (sin red ni datos reales).
 * Historial ficticio de ~2 años. Comprueba: login, cifrado+gzip, copia automática, sin duplicados,
 * restaurar copia anterior, iPhone nuevo (almacenamiento vacío) que recupera todo, contraseña incorrecta,
 * separación entre usuarios y que el servidor nunca recibe texto en claro. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let rel=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/,'');if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(file,(e,v)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(v)})});
// --- Supabase simulado ---
const USERS={'jose@example.test':{id:'11111111-1111-4111-8111-111111111111',pass:'clave-jose'},'irene@example.test':{id:'22222222-2222-4222-8222-222222222222',pass:'clave-irene'}};
const COPIAS=[];const tokens=new Map();let rx=[];
async function fake(route){const req=route.request(),u=new URL(req.url());const body=req.postData()?JSON.parse(req.postData()):{};rx.push(req.postData()||'');
 const json=(st,o)=>route.fulfill({status:st,contentType:'application/json',body:JSON.stringify(o)});
 assert.equal(req.headers()['apikey'],'sb_publishable_HH9O16zA-hT7ElScoYOSUQ_u-tcD-ei');
 if(u.pathname==='/auth/v1/token'){const g=u.searchParams.get('grant_type');let user;
  if(g==='password'){const x=USERS[body.email];if(!x||x.pass!==body.password)return json(400,{error:'invalid_grant',error_description:'Invalid login credentials'});user={id:x.id,email:body.email}}
  else{const t=tokens.get(body.refresh_token);if(!t)return json(400,{error:'invalid_grant'});user=t}
  const a='at-'+crypto.randomUUID(),r='rt-'+crypto.randomUUID();tokens.set(a,user);tokens.set(r,user);return json(200,{access_token:a,refresh_token:r,expires_in:3600,user})}
 if(u.pathname==='/auth/v1/logout')return route.fulfill({status:204,body:''});
 const auth=(req.headers()['authorization']||'').replace('Bearer ',''),user=tokens.get(auth);if(!user)return json(401,{message:'JWT required'});
 if(u.pathname==='/rest/v1/rpc/mibowling_guardar_copia'){const mine=COPIAS.filter(c=>c.user===user.id);const last=mine[mine.length-1];if(last&&last.huella===body.p_huella)return json(200,[{id:last.id,creada:last.creada,nueva:false}]);
  const c={id:crypto.randomUUID(),user:user.id,creada:new Date(Date.now()+COPIAS.length*1000).toISOString(),version_app:body.p_version,dispositivo:body.p_dispositivo,huella:body.p_huella,tamano:body.p_tamano,cifrado:body.p_cifrado};COPIAS.push(c);return json(200,[{id:c.id,creada:c.creada,nueva:true}])}
 if(u.pathname==='/rest/v1/rpc/mibowling_listar_copias')return json(200,COPIAS.filter(c=>c.user===user.id).slice().reverse().map(({cifrado,user,...r})=>r));
 if(u.pathname==='/rest/v1/rpc/mibowling_obtener_copia'){const c=COPIAS.find(c=>c.id===body.p_id&&c.user===user.id);return json(200,c?[{id:c.id,creada:c.creada,version_app:c.version_app,huella:c.huella,tamano:c.tamano,cifrado:c.cifrado}]:[])}
 return json(404,{})}
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
  const nuevo=async(seed)=>{const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await ctx.route('https://oevetnszmfxeukcncwji.supabase.co/**',fake);
   if(seed)await ctx.addInitScript(([v])=>{if(!sessionStorage.getItem('s')){localStorage.setItem('mi-bowling-analitica-v2',v);sessionStorage.setItem('s','1')}},[JSON.stringify(seed)]);
   const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto(base);await p.waitForFunction(()=>!!window.MiBowlingCatalogoLocal&&!!window.MiBowlingNube,null,{timeout:30000});return {ctx,p,errs}};
  const snap=p=>p.evaluate(()=>JSON.stringify(window.MiBowlingEscritura.snapshot()));
  // 1. Login y primera copia
  let {ctx,p,errs}=await nuevo(SEED);const original=await snap(p);
  console.log('Historial ficticio:',sessions.length,'sesiones ·',(original.length/1024/1024).toFixed(2),'MB sin comprimir');
  await p.evaluate(()=>go('ajustes'));await p.waitForSelector('#nube-email');
  await p.fill('#nube-email','jose@example.test');await p.fill('#nube-pass','mal');await p.click('#nube-card button[type=submit]');
  await p.waitForSelector('#nube-card .nube-err');assert.match(await p.textContent('#nube-card .nube-err'),/incorrectos/);
  await p.fill('#nube-pass','clave-jose');await p.click('#nube-card button[type=submit]');
  try{await p.waitForSelector('#nube-card .nube-ok',{timeout:30000})}catch(e){console.log('TARJETA:',await p.textContent('#nube-card'),'ERRORES:',errs);throw e}assert.match(await p.textContent('#nube-card .nube-ok'),/Primera copia guardada/);
  assert.equal(COPIAS.length,1);const c1=COPIAS[0];
  assert.equal(c1.cifrado.z,'gzip','Comprimida');assert.equal(c1.cifrado.v,1);
  const almacenado=JSON.stringify(c1.cifrado).length;console.log('Copia cifrada y comprimida:',(almacenado/1024).toFixed(0),'KB');
  assert(almacenado<7000000,'Por debajo del límite del servidor');
  assert(!rx.some(b=>/Bolera Centro|Phaze|mi-bowling-analitica/.test(b)),'El servidor nunca recibe texto en claro');
  assert.equal(c1.huella,crypto.createHash('sha256').update(original).digest('hex'));
  // 2. Sin cambios no duplica; con cambios, copia nueva
  await p.evaluate(()=>MiBowlingNube._test.copiar(false));assert.equal(COPIAS.length,1,'Sin cambios no hay copia nueva');
  await p.evaluate(()=>{db.sessions[0].title='Sesión modificada';save()});
  await p.evaluate(()=>MiBowlingNube._test.copiar(false));assert.equal(COPIAS.length,2,'Cambio → copia nueva');
  const modificado=await snap(p);
  // 3. Restaurar la copia anterior desde la lista
  await p.evaluate(()=>go('ajustes'));await p.click('text=Ver copias y restaurar');await p.waitForSelector('.nube-lista .list-item:nth-child(2)');
  await p.evaluate(()=>{window.__antes=1});await p.click('.nube-lista .list-item:nth-child(2) button');
  await p.waitForFunction(()=>!window.__antes&&!!window.MiBowlingCatalogoLocal,null,{timeout:60000});
  assert.equal(await snap(p),original,'Restaurado exactamente el estado anterior');
  assert.equal(COPIAS.filter(c=>c.user===USERS['jose@example.test'].id).length,2,'Antes de restaurar se guardó copia del estado actual (sin duplicar)');
  assert.equal(await p.evaluate(()=>db.sessions.length),300);assert.deepEqual(errs,[]);
  await ctx.close();
  // 4. iPhone nuevo, vacío: entrar y recuperar la última copia
  ({ctx,p,errs}=await nuevo(null));
  await p.evaluate(()=>go('ajustes'));await p.fill('#nube-email','jose@example.test');await p.fill('#nube-pass','clave-jose');await p.click('#nube-card button[type=submit]');
  await p.waitForSelector('#nube-card .nube-ok',{timeout:60000});
  await p.click('text=Ver copias y restaurar');await p.waitForSelector('.nube-lista .list-item');
  const n=await p.locator('.nube-lista .list-item').count();
  // la más reciente que no sea la copia vacía recién hecha en este móvil
  const idx=await p.evaluate(async()=>{const l=await MiBowlingNube._test.listar();return l.findIndex(c=>c.tamano>100000)});
  await p.evaluate(()=>{window.__antes=1});await p.click(`.nube-lista .list-item:nth-child(${idx+1}) button`);await p.waitForFunction(()=>!window.__antes&&!!window.MiBowlingCatalogoLocal,null,{timeout:60000});
  assert.equal(await p.evaluate(()=>db.sessions.length),300,'iPhone nuevo con todo el historial');
  assert.deepEqual(errs,[]);await ctx.close();
  // 5. Otra persona no ve las copias de Jose
  ({ctx,p}=await nuevo(null));await p.evaluate(()=>go('ajustes'));await p.fill('#nube-email','irene@example.test');await p.fill('#nube-pass','clave-irene');await p.click('#nube-card button[type=submit]');
  await p.waitForSelector('#nube-card .nube-ok',{timeout:60000});const deIrene=await p.evaluate(async()=>(await MiBowlingNube._test.listar()).length);
  assert.equal(deIrene,1,'Irene solo ve su propia copia');await ctx.close();
  console.log(`NUBE PASS · login, contraseña incorrecta, cifrado+gzip, ${n} copias, sin duplicados, restaurar, iPhone nuevo, separación por usuario, servidor sin texto en claro.`);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
