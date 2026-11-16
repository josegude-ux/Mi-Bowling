'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../catalogo/modelo-fase1.js'));else root.MiBowlingCatalogoPersistencia=factory(root.MiBowlingCatalogoModelo);})(globalThis,function(M){
 const copy=x=>JSON.parse(JSON.stringify(x));const fail=m=>{throw Error(m)};const norm=x=>String(x??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
 // Approval date is an identity dimension, NOT launch year. Keep punctuation and non-Latin chars.
 function identity(x){if(!/^\d{4}-\d{2}-\d{2}$/.test(x.approved||'')||!norm(x.brand)||!norm(x.model))return null;return JSON.stringify([norm(x.brand),norm(x.model),x.approved]);}
 function normalize(value,defaultMeta={}){const c=M.migrate(value);if(!Object.prototype.hasOwnProperty.call(c,'meta'))c.meta=copy(defaultMeta);else if(!c.meta||typeof c.meta!=='object'||Array.isArray(c.meta))fail('Metadatos de catálogo inválidos; no sustituir.');return c;}
 function planRefresh(catalog,rows,meta,idFactory=()=>globalThis.crypto.randomUUID()){
  const base=normalize(catalog),all=[...base.records,...base.archive],byIdentity=new Map(),byId=new Map(all.map(r=>[r.id,r]));
  for(const r of all){const key=identity(r);if(key){const group=byIdentity.get(key)||[];group.push(r);byIdentity.set(key,group)}}
  if(!Array.isArray(rows)||rows.length!==100)fail('Se requieren exactamente 100 referencias de la lista.');
  const seen=new Set(),activeIds=new Set(),records=rows.map(raw=>{
   const key=identity(raw);if(!key||seen.has(key))fail('Identidad USBC inválida o duplicada.');seen.add(key);
   const matches=byIdentity.get(key)||[];if(matches.length>1)fail('Variantes ambiguas: revisar sin reemplazar catálogo.');
   let r;if(matches.length===1)r=copy(matches[0]);else{
    // Never use a seed ID that already identifies another edition. A new row has no inferred specs.
    let id=typeof raw.id==='string'&&raw.id&&!byId.has(raw.id)&&!activeIds.has(raw.id)?raw.id:idFactory();
    if(!id||byId.has(id)||activeIds.has(id))fail('ID nuevo en conflicto.');
    r=M.newRecord({id,brand:raw.brand,model:raw.model,approved:raw.approved,selected:false},null);
   }
   activeIds.add(r.id);return r;
  });
  return normalize({...base,records,archive:all.filter(r=>!activeIds.has(r.id)),meta:{...base.meta,...meta}});
 }
 function create(storage,guard,seeds,meta){
  let expected=storage.getItem(M.KEY),value=normalize(M.decode(expected,seeds,meta),meta);
  function commit(next){guard.assertAuthority();if(storage.getItem(M.KEY)!==expected)fail('Catálogo obsoleto; recargar.');const validated=normalize(next,meta);const encoded=JSON.stringify(validated);if(encoded!==expected)guard.write(M.KEY,encoded);expected=encoded;value=validated;return copy(value);}
  return Object.freeze({read:()=>copy(value),migrate:()=>commit(value),commit,refresh:(rows,m)=>commit(planRefresh(value,rows,m)),expected:()=>expected});
 }
 return Object.freeze({identity,planRefresh,create});
});
