'use strict';
/* Read-only contract adapted from PR57; stable IDs and approval identity from CP002.
 * No duplicate seed, no fallback for damaged storage, no external fetch here. */
(function(root,factory){if(typeof module==='object'&&module.exports){require('./catalogo100-variant-policy.js');module.exports=factory(require('../catalogo/modelo-fase1.js'),require('./catalogo-persistencia.js'),root.MiBowlingCatalog100VariantPolicy);}else root.MiBowlingCatalog100Compat=factory(root.MiBowlingCatalogoModelo,root.MiBowlingCatalogoPersistencia,root.MiBowlingCatalog100VariantPolicy);})(globalThis,function(M,P,V){
 if(!M||!P||!V)throw Error('Faltan contratos de catálogo o variantes.');
 const SCHEMA='mi-bowling-template-balls-v1',LIMIT=1024*1024;
 const identity=P.identity;
 function exact(catalog,item){const row=M.lookup(catalog,item?.id);if(!row||!identity(item)||identity(row)!==identity(item))throw Error('Referencia no resuelta por ID y aprobación; revisar catálogo.');return row;}
 function metadata(r,db,archived=false){return {id:r.id,brand:r.brand,model:r.model,approved:r.approved,archived,selected:!!r.selected,linked:db.balls.filter(b=>b.catalogId===r.id).map(b=>b.id),review:V.inspect(r,db.balls)};}
 function list(catalog,db){return [...catalog.records.map(r=>metadata(r,db)),...catalog.archive.map(r=>metadata(r,db,true))];}
 function parseSelection(text,catalog,db){if(typeof text!=='string'||text.length>LIMIT)throw Error('Selección demasiado grande.');let p;try{p=JSON.parse(text)}catch{throw Error('Selección JSON inválida.');}if(p?.schema!==SCHEMA||!Array.isArray(p.items)||p.items.length<1||p.items.length>100)throw Error('Formato de selección inválido.');const seen=new Set();return p.items.map(item=>{if(!item||typeof item.id!=='string'||item.selected!==true||seen.has(item.id))throw Error('Selección inválida o ID repetido.');seen.add(item.id);const r=exact(catalog,item);return metadata(r,db,catalog.archive.some(x=>x.id===r.id));});}
 function planNewUnit(db,catalog,request){const r=exact(catalog,request);if(request.confirmed!==true)throw Error('Confirma una unidad física nueva y su variante.');if(V.inspect(r,db.balls).count||db.balls.some(b=>b.catalogId===r.id))throw Error('Coincidencia previa: revisión manual, nunca alta automática.');const id=request.ballId;if(typeof id!=='string'||!id||db.balls.some(b=>b.id===id))throw Error('ID personal inválido o repetido.');return {...db,balls:[...db.balls,{id,brand:r.brand,model:r.model,weight:'',kind:'',notes:'',photo:'',retired:false,catalogId:r.id}]};}
 function evidenceIndex(entries,seeds){const pairs=new Map();for(const e of entries){const s=seeds[e.rank-1];if(!s||s.brand!==e.brand||s.model!==e.model||!identity(s)||pairs.has(identity(s)))throw Error('Ficha técnica sin identidad exacta en la semilla original.');pairs.set(identity(s),e);}return Object.freeze({get:r=>pairs.get(identity(r))||null});}
 return Object.freeze({SCHEMA,LIMIT,identity,exact,list,parseSelection,planNewUnit,evidenceIndex});
});
