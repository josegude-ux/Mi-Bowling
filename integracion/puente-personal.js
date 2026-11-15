'use strict';
(function(root){
 const M=root.MiBowlingCatalogoModelo,A=root.MiBowlingCatalogoFase1,P=root.MiBowlingCatalogoPersistencia,C=root.MiBowlingCatalog100Compat;
 if(!M||!A||!P||!C)throw Error('Módulos de catálogo no disponibles');
 function create({guard,getDB,setDB,canWrite,fetchPage}){
  if(!guard||typeof getDB!=='function'||typeof setDB!=='function'||typeof canWrite!=='function'||typeof fetchPage!=='function')throw Error('Host no autorizado');
  let pending=false;
  async function catalog(){guard.assertAuthority();let raw=localStorage.getItem(M.KEY);let seeds;
   if(raw===null){const html=await fetchPage();guard.assertAuthority();raw=localStorage.getItem(M.KEY);if(raw===null)seeds=A.seedFromExistingPage(html);}
   return P.create(localStorage,guard,seeds,{source:'Referencia reciente (ver aviso)',date:'2026-11-03',reviewed:false});}
  async function withCatalog(op){if(pending)throw Error('Operación de catálogo en curso.');pending=true;try{if(!canWrite())throw Error('No guardar desde una partida activa o con cambios sin guardar.');const c=await catalog();if(!canWrite())throw Error('Estado de aplicación cambiado.');guard.assertAuthority();const db=getDB();const a=A.create({getDB:()=>db,getCatalog:()=>c.read()});return await op(c,a,db);}finally{pending=false;}}
  function persist(plan,db,catalog,request,link){if(!plan.changed)return false;guard.assertAuthority();if(getDB()!==db||!canWrite())throw Error('Base personal cambió.');
   // Apply the same operation to the persisted raw DB, NOT a serialization of migrate(db).
   // The original migrator normalizes sessions and may discard unrelated unknown fields.
   const before=guard.snapshot();if(before[M.DB_KEY]===null)throw Error('Guarda primero la bola mediante el flujo existente.');
   const raw=JSON.parse(before[M.DB_KEY]),rawBall=raw.balls?.find(b=>b.id===request.ballId),memBall=db.balls.find(b=>b.id===request.ballId);
   if(!rawBall||JSON.stringify(rawBall)!==JSON.stringify(memBall))throw Error('La unidad guardada no coincide con la memoria; recarga.');
   const rawPlan=link?M.planLink(raw,catalog.read(),request):M.planUnlink(raw,request);
   if(!rawPlan.changed)throw Error('Vínculo persistido divergente.');
   const next={...before,[M.DB_KEY]:JSON.stringify(rawPlan.db)};
   if(link)next[M.KEY]=JSON.stringify(catalog.read());
   guard.transaction(next);setDB(plan.db);return true;}

  function register(c,db,request){guard.assertAuthority();if(getDB()!==db||!canWrite())throw Error('Base personal cambió.');
   const before=guard.snapshot(),catalog=c.read(),plan=C.planNewUnit(db,catalog,request);
   // Do not create the main DB by normalizing an old existing DB. Require a saved base or a genuinely empty installation.
   let raw;if(before[M.DB_KEY]===null){if(before['mi-bowling-v1']!==null||db.balls.length||db.sessions.length||db.patterns.length)throw Error('Guarda primero la base existente mediante el flujo habitual.');raw=JSON.parse(JSON.stringify(db));}else raw=JSON.parse(before[M.DB_KEY]);
   if(JSON.stringify(raw.balls)!==JSON.stringify(db.balls))throw Error('Arsenal persistido divergente; recarga.');
   const next=C.planNewUnit(raw,catalog,request);
   guard.transaction({...before,[M.DB_KEY]:JSON.stringify(next),[M.KEY]:JSON.stringify(catalog)});setDB(plan);return true;
  }
  return Object.freeze({list:()=>withCatalog((c,a,db)=>C.list(c.read(),db)),selection:text=>withCatalog((c,a,db)=>C.parseSelection(text,c.read(),db)),register:request=>withCatalog((c,a,db)=>register(c,db,request)),ficha:id=>withCatalog((c,a)=>a.ficha(id)),revisarVinculos:()=>withCatalog((c,a)=>a.revisarVinculos()),link:request=>withCatalog((c,a,db)=>{if(request.reference)C.exact(c.read(),request.reference);if(request.reference&&request.reference.id!==request.catalogId)throw Error('Referencia divergente.');if(request.expectedUnit&&JSON.stringify(db.balls.find(b=>b.id===request.ballId))!==request.expectedUnit)throw Error('La unidad personal cambió desde la confirmación.');return persist(a.prepararVinculo(request),db,c,request,true)}),unlink:request=>withCatalog((c,a,db)=>persist(a.prepararDesvinculo(request),db,c,request,false))});
 }
 root.MiBowlingPuentePersonal=Object.freeze({create});
})(globalThis);
