'use strict';
/* MI BOWLING 3.3.35 · Fotos privadas compartidas por la nube (Supabase SIMULADO, paquete de fotos simulado).
 * Móvil A con fotos → las sube; móvil B sin fotos → las descarga al entrar; importar en A → se vuelven a subir;
 * un usuario sin copias de Mi Bowling no tiene acceso. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let rel=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/,'');if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(file,(e,v)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(v)})});
// --- Supabase simulado ---
const USERS={'jose@example.test':{id:'11111111-1111-4111-8111-111111111111',pass:'clave-jose'},'irene@example.test':{id:'22222222-2222-4222-8222-222222222222',pass:'clave-irene'}};
const COPIAS=[],RECURSOS={};let SUBIDAS=0;const tokens=new Map();let rx=[];
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
 if(u.pathname==='/rest/v1/rpc/mibowling_obtener_recurso'||u.pathname==='/rest/v1/rpc/mibowling_guardar_recurso'){
  if(!COPIAS.some(c=>c.user===user.id))return json(403,{code:'42501',message:'No autorizado'});
  if(u.pathname.endsWith('guardar_recurso')){RECURSOS[body.p_nombre]={huella:body.p_huella,contenido:body.p_contenido};SUBIDAS++;return json(200,body.p_huella)}
  const r=RECURSOS[body.p_nombre];return json(200,r?[{huella:r.huella,contenido:r.huella===body.p_huella?null:r.contenido,actualizado:new Date().toISOString()}]:[])}
 return json(404,{})}
// Paquete simulado: el módulo real valida 19 fotos WebP con su SHA-256; aquí se sustituye por un doble con la misma interfaz.
const STUB=pkg=>`window.__pkg=${JSON.stringify(pkg)};window.__saved=null;window.MiBowlingFotosPrivadas=Object.freeze({entries:[1,2,3],count:()=>window.__pkg?3:0,packageText:async()=>window.__pkg,save:async t=>{window.__pkg=t;window.__saved=t;return 3},controls:()=>'',has:()=>false,img:()=>'',catalog:()=>null,profile:()=>null,physical:()=>null,source:()=>'',init:async()=>0,importFile:()=>{}})`;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://localhost:${server.address().port}/`;const browser=await chromium.launch();
 try{
  const nuevo=async(pkg)=>{const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await ctx.route('https://oevetnszmfxeukcncwji.supabase.co/**',fake);
   const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());await p.goto(base);await p.waitForFunction(()=>!!window.MiBowlingNube&&!!window.MiBowlingEscritura,null,{timeout:30000});
   await p.evaluate(STUB(pkg));return {ctx,p,errs}};
  const espera=async(p,fn)=>{for(let i=0;i<60;i++){if(await p.evaluate(fn))return;await p.waitForTimeout(100)}throw Error('timeout: '+fn)};
  // 1. Móvil A con fotos: al entrar aún no es miembro (sin copias) → no falla; tras la primera copia, sube el paquete.
  const A=await nuevo('PAQUETE-A');await A.p.evaluate(()=>MiBowlingNube._test.entrar('jose@example.test','clave-jose'));await A.p.waitForTimeout(300);
  assert.equal(SUBIDAS,0);assert.match(await A.p.evaluate(()=>MiBowlingNube.fotosMsg()),/primera copia/);
  await A.p.evaluate(()=>MiBowlingNube._test.copiar(true));await A.p.evaluate(()=>MiBowlingNube.fotosSync());
  assert.equal(RECURSOS['fotos-v1'].contenido,'PAQUETE-A');assert.equal(SUBIDAS,1);
  // 2. Volver a sincronizar sin cambios no vuelve a subir ni descargar.
  await A.p.evaluate(()=>MiBowlingNube.fotosSync());assert.equal(SUBIDAS,1);
  // 3. Móvil B sin fotos: al entrar las descarga solo.
  const B=await nuevo(null);await B.p.evaluate(()=>MiBowlingNube._test.entrar('jose@example.test','clave-jose'));await espera(B.p,()=>window.__saved==='PAQUETE-A');
  assert.match(await B.p.evaluate(()=>MiBowlingNube.fotosMsg()),/descargadas/);
  // 4. Importar un paquete nuevo en A → se sube; un móvil nuevo recibe el nuevo.
  await A.p.evaluate(()=>{window.__pkg='PAQUETE-A2';window.dispatchEvent(new CustomEvent('mibowling-fotos-importadas'))});await espera(A.p,()=>true);await A.p.waitForTimeout(400);
  assert.equal(RECURSOS['fotos-v1'].contenido,'PAQUETE-A2');
  const C=await nuevo(null);await C.p.evaluate(()=>MiBowlingNube._test.entrar('jose@example.test','clave-jose'));await espera(C.p,()=>window.__saved==='PAQUETE-A2');
  // 5. Otro usuario sin copias de Mi Bowling: sin acceso, sin errores visibles.
  const D=await nuevo(null);await D.p.evaluate(()=>MiBowlingNube._test.entrar('irene@example.test','clave-irene'));await D.p.waitForTimeout(500);assert.equal(await D.p.evaluate(()=>window.__saved),null);
  for(const x of [A,B,C,D])assert.deepEqual(x.errs,[]);
  console.log('FOTOS NUBE PASS · subida tras primera copia, sin repeticiones, descarga automática al entrar, reimportación, sin acceso para no miembros');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
