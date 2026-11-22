/* MI BOWLING CP025 — lector/activador de contrato v3 integrado exclusivamente en LAB.
 * Derivado del contrato CP024 homologado; no lee v2 de producción ni migra automáticamente.
 * Solo usa CP018 y su base IndexedDB con prefijo mi-bowling-cp018-synthetic-.
 */
(function(root){
'use strict';
const KEY_NAMES=Object.freeze(['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-liga-v1','mi-bowling-ball-selection-v1']);
const copy=x=>JSON.parse(JSON.stringify(x));
const fail=message=>{throw Error(message)};
const assert=(test,message)=>{if(!test)fail(message)};
function gate(){
 const host=root.location?.hostname,search=root.location?.search||'';
 assert((host==='localhost'||host==='127.0.0.1')&&new URLSearchParams(search).get('cp021lab')==='ficticio','CP025_LAB_ONLY');
 try{assert(KEY_NAMES.every(key=>root.localStorage.getItem(key)===null),'CP025_EXISTING_DATA_PROTECTED')}
 catch(e){if(e.message==='CP025_EXISTING_DATA_PROTECTED')throw e;fail('CP025_STORAGE_UNAVAILABLE')}
 assert(!!root.BowlingCp014Compat&&!!root.BowlingCp016Coexist&&!!root.MiBowlingCP018,'CP025_DEPENDENCIES_MISSING');
}
async function get(ctx){
 gate();assert(ctx&&typeof ctx.getStore==='function','CP025_INVALID_CONTEXT');
 const store=await ctx.getStore();gate();
 assert(store&&typeof store.stage==='function'&&typeof store.row==='function'&&typeof store.activate==='function'&&typeof store.rollback==='function','CP025_INVALID_STORE');
 assert(typeof store.name==='string'&&store.name.startsWith('mi-bowling-cp018-synthetic-'),'CP025_FORBIDDEN_DATABASE');
 return store;
}
async function promote(ctx){
 const store=await get(ctx),A=root.BowlingCp014Compat,C=root.BowlingCp016Coexist;
 const raw=await store.row('sources');
 assert(raw&&typeof raw.legacy==='string'&&typeof raw.modern==='string','CP025_SOURCES_REQUIRED');
 let legacy,modern;
 try{legacy=JSON.parse(raw.legacy);modern=JSON.parse(raw.modern)}catch(e){fail('CP025_INVALID_SOURCE_JSON')}
 assert(legacy.version===2&&legacy.format===undefined,'CP025_LEGACY_NOT_V2');
 assert(modern.version===A.VERSION&&modern.format===A.FORMAT,'CP025_MODERN_NOT_V3');
 const before=C.analyse({legacy:raw.legacy,modern:raw.modern});
 const current=await store.read();
 assert(!current.recoveryRequired,'CP025_RECOVERY_REQUIRED');
 const staged=await store.stage();
 const backup=JSON.parse(await store.exportBackup());
 assert(backup.raw.legacy===raw.legacy&&backup.raw.modern===raw.modern,'CP025_LOSSY_BACKUP');
 const shadow=await store.row('shadow:'+staged.transaction);
 assert(shadow&&shadow.seal===staged.shadowSeal,'CP025_UNVERIFIED_SHADOW');
 const doc=shadow.document;A.validateDocument(doc);
 assert(doc.version===3&&doc.format===A.FORMAT,'CP025_NOT_V3');
 // Exact v2 roundtrip and source-envelope preservation are mandatory before activation.
 assert(JSON.stringify(A.toLegacyV2(A.fromLegacyV2(legacy)))===JSON.stringify(legacy),'CP025_LOSSY_LEGACY_ROUNDTRIP');
 assert(doc.sourceEnvelope?.legacy&&doc.sourceEnvelope?.modern,'CP025_SOURCE_ENVELOPE_LOST');
 const games=doc.sessions.flatMap(session=>session.games);
 assert(games.some(game=>game.entryKind==='final_only'&&game.rolls.length===0),'CP025_FINAL_ONLY_LOST');
 assert(games.some(game=>game.entryKind==='rolls'),'CP025_ROLLS_LOST');
 const summary=A.summary(doc);
 for(const key of ['totalGames','qualifyingGames','averageScore','bestScore','frameAnalysisEligibleGames','pinPatternEligibleGames','finalOnlyGames'])
  assert(summary[key]===before.stats[key],'CP025_STATS_CHANGED_'+key);
 const expected=(key)=>[...(legacy[key]||[]),...(modern[key]||[])];
 for(const key of ['balls','patterns'])assert(JSON.stringify(doc[key])===JSON.stringify(expected(key)),'CP025_METADATA_LOST_'+key);
 // Guard again after every potentially asynchronous preflight and immediately before committing the pointer.
 gate();const commit=await store.activate();gate();
 assert(commit.mode==='shadow-v3'&&commit.transaction===staged.transaction,'CP025_COMMIT_FAILED');
 const after=await store.read();assert(after.mode==='shadow-v3'&&!after.recoveryRequired,'CP025_POSTCOMMIT_NOT_VERIFIED');
 return Object.freeze({contract:'v3',version:3,format:doc.format,transaction:staged.transaction,
  backupSeal:backup.seal,shadowSeal:shadow.seal,mode:after.mode,
  averageScore:summary.averageScore,totalGames:summary.totalGames,
  finalOnlyGames:summary.finalOnlyGames,pinPatternEligibleGames:summary.pinPatternEligibleGames,
  balls:doc.balls.length,patterns:doc.patterns.length,legacySourceUnmodified:true});
}
async function read(ctx){
 const store=await get(ctx),A=root.BowlingCp014Compat;
 const state=await store.read();
 assert(!state.recoveryRequired&&state.mode==='shadow-v3','CP025_V3_UNAVAILABLE');
 const shadow=await store.row('shadow:'+state.transaction);
 assert(shadow&&shadow.document,'CP025_SHADOW_MISSING');
 A.validateDocument(shadow.document);
 assert(shadow.document.version===3&&shadow.document.format===A.FORMAT,'CP025_CONTRACT_INVALID');
 return copy(shadow.document);
}
async function rollback(ctx){
 const store=await get(ctx);
 const state=await store.rollback();gate();
 assert(state.mode==='dual-read'&&!state.recoveryRequired,'CP025_ROLLBACK_FAILED');
 return copy(state);
}
root.BowlingCp025V3=Object.freeze({version:3,format:'mi-bowling-v3-lab',promote,read,rollback});
})(typeof window!=='undefined'?window:globalThis);
