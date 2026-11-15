'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./autoridad-local.js'),require('../catalogo/modelo-fase1.js'));else root.MiBowlingRespaldo=factory(root.MiBowlingAutoridad,root.MiBowlingCatalogoModelo);})(globalThis,function(A,M){
 const DB=M.DB_KEY,OLD='mi-bowling-v1',SEL='mi-bowling-ball-selection-v1',CAT=M.KEY,LEAGUE='mi-bowling-liga-acta-v32',ROSTER='mi-bowling-liga-rosters-v33',LEGACY_LEAGUE='mi-bowling-liga-v1',QUICK='mi-bowling-quick-layout';
 const schema='mi-bowling-respaldo-local-f1-v1';const fail=m=>{throw Error(m)};const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);const parse=(raw,k)=>{try{return JSON.parse(raw)}catch{fail('JSON inválido: '+k)}};
 function validateDB(v){if(!obj(v)||!Array.isArray(v.balls)||!Array.isArray(v.sessions)||!Array.isArray(v.patterns))fail('Base personal inválida.');let ids=new Set();for(const b of v.balls){if(!obj(b)||typeof b.id!=='string'||!b.id||ids.has(b.id))fail('ID personal inválido.');ids.add(b.id);}for(const s of v.sessions)if(!obj(s)||typeof s.id!=='string'||!Array.isArray(s.games)||s.games.some(g=>!obj(g)||!Array.isArray(g.rolls)))fail('Sesiones inválidas.');return v;}
 function validate(map){A.validateRawMap(map);if(map[DB]!==null)validateDB(parse(map[DB],DB));if(map[OLD]!==null&&!obj(parse(map[OLD],OLD)))fail('Base anterior inválida.');if(map[CAT]!==null){const c=M.decode(map[CAT]);if(own(c,'meta')&&!obj(c.meta))fail('Metadatos de catálogo inválidos.');}if(map[SEL]!==null){const s=parse(map[SEL],SEL);if(!obj(s)||Object.values(s).some(v=>!Array.isArray(v)||v.some(x=>typeof x!=='string')))fail('Selecciones inválidas.');}for(const k of [LEAGUE,LEGACY_LEAGUE])if(map[k]!==null){const v=parse(map[k],k);if(!obj(v)||!Array.isArray(v.matches))fail('Liga inválida.');}if(map[ROSTER]!==null&&!obj(parse(map[ROSTER],ROSTER)))fail('Plantillas inválidas.');if(map[QUICK]!==null&&!['standard','compact','large'].includes(map[QUICK]))fail('Preferencia inválida.');return map;}
 // Raw exact snapshot; top-level legacy fields remain readable by previous exports.
 function exportBundle(guard,legacy,now=new Date().toISOString()){
  const raw=validate(guard.snapshot());validateDB(legacy);return {...legacy,exportedAt:now,localBackup:{schema,raw,excluded:['IndexedDB PDF','CacheStorage','otras claves no gestionadas']}};
 }
 function planRestore(bundle,current,migrateLegacy){validate(current);if(!obj(bundle))fail('Copia no reconocida.');
  if(own(bundle,'localBackup')){if(!obj(bundle.localBackup)||bundle.localBackup.schema!==schema)fail('Versión de copia no compatible.');const raw=validate(bundle.localBackup.raw);return {...raw};}
  // Legacy import: keep current catalog and selections; never erase them implicitly.
  if(!Array.isArray(bundle.sessions)||!Array.isArray(bundle.balls))fail('Copia anterior inválida.');if(typeof migrateLegacy!=='function')fail('Migrador original necesario.');const next={...current,[DB]:JSON.stringify(validateDB(migrateLegacy(bundle)))};
  if(bundle.leagueNational?.matches&&Array.isArray(bundle.leagueNational.matches))next[LEAGUE]=JSON.stringify(bundle.leagueNational);
  if(obj(bundle.leagueRosters))next[ROSTER]=JSON.stringify(bundle.leagueRosters);
  return validate(next);
 }
 return Object.freeze({schema,validate,exportBundle,planRestore});
});
