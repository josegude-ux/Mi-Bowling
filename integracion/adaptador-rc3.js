'use strict';
/* Adapter for private LAB: no auto-install, no writes on load. The host explicitly
   supplies its current db, the exact existing seed/snapshot, and its write guard.
   Never invokes the legacy save() or sets the primary key directly. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../catalogo/modelo-fase1.js'));else root.MiBowlingCatalogoFase1=factory(root.MiBowlingCatalogoModelo);})(typeof globalThis==='object'?globalThis:this,function(M){
 if(!M)throw Error('Modelo de catálogo no cargado');
 // Extract the seed already embedded in the existing catalog page; no duplicate list.
 function seedFromExistingPage(html){
  if(typeof html!=='string')throw Error('Página original del catálogo necesaria');
  const matches=[...html.matchAll(/<script\s+id="seed"\s+type="application\/json">([\s\S]*?)<\/script>/g)];
  if(matches.length!==1)throw Error('Semilla original no identificada de forma inequívoca');
  let seeds;try{seeds=JSON.parse(matches[0][1])}catch{throw Error('Semilla original inválida')}
  if(!Array.isArray(seeds)||seeds.length!==100)throw Error('Se esperaban las 100 referencias de la plantilla original');
  // Validate without creating any persistent data.
  M.migrate(null,seeds);return seeds;
 }
 function readCatalog(storage,originalHtml,meta){
  const raw=storage.getItem(M.KEY);
  return M.decode(raw,raw===null?seedFromExistingPage(originalHtml):undefined,meta);
 }
 function create({getDB,getCatalog}){
  if(typeof getDB!=='function'||typeof getCatalog!=='function')throw Error('Adaptador sin fuente autorizada');
  return Object.freeze({
   ficha:id=>M.project(getCatalog(),getDB(),id),
   revisarVinculos:()=>M.issues(getCatalog(),getDB()),
   prepararVinculo:request=>M.planLink(getDB(),getCatalog(),request),
   prepararDesvinculo:request=>M.planUnlink(getDB(),request)
  });
 }
 return Object.freeze({create,seedFromExistingPage,readCatalog});
});
