/* CP032 · Non-mutating dual-read risk classifier. No production storage writes. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('../registro-cp021/cp014-compat-bridge.js'):root.BowlingCp014Compat);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MiBowlingCP032Audit=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(A){
 'use strict';
 if(!A||typeof A.fromLegacyV2!=='function')throw Error('CP032 requires original CP014');
 const copy=x=>JSON.parse(JSON.stringify(x));
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function inspect(legacy,modern){
  const before=copy({legacy,modern});
  const v2=legacy===null?null:A.fromLegacyV2(legacy);
  const v3=modern===null?null:A.roundTripJSON(modern);
  const docs=[v2,v3].filter(Boolean);
  const all=docs.flatMap(d=>d.sessions.flatMap(s=>s.games.map(g=>({session:s.id,game:g}))));
  const countOnly=all.filter(({game:g})=>g.rolls.some(r=>r.pinDetail==='count'&&r.pinIds===null)).map(x=>x.game.id);
  const finalOnly=all.filter(({game:g})=>g.entryKind==='final_only').map(x=>x.game.id);
  const exact=all.filter(({game:g})=>g.entryKind==='rolls'&&g.rolls.every(r=>r.pinDetail==='exact'&&Array.isArray(r.pinIds))).map(x=>x.game.id);
  if(!same(before,{legacy,modern}))throw Error('CP032 INPUT_MUTATION');
  const summary=docs.map(d=>A.summary(d));
  return Object.freeze({
    legacySessions:v2?.sessions.length||0,modernSessions:v3?.sessions.length||0,
    totalGames:all.length,countOnlyGames:countOnly,finalOnlyGames:finalOnly,exactPinGames:exact,
    frameStatEligible:summary.reduce((n,x)=>n+x.frameAnalysisEligibleGames,0),
    pinStatEligible:summary.reduce((n,x)=>n+x.pinPatternEligibleGames,0),
    totalQualifyingGames:summary.reduce((n,x)=>n+x.qualifyingGames,0),
    unsafeToWriteAsV2:countOnly.length>0||finalOnly.length>0,
    legacySnapshotUnchanged:true,writePermission:false
  });
 }
 function projectLegacy(modern){
  // CP014 fails closed for count-only/final-only, never replaces unknown pins with placeholders.
  return A.toLegacyV2(modern);
 }
 return Object.freeze({inspect,projectLegacy,writesProduction:false,version:'CP032-audit-1'});
});