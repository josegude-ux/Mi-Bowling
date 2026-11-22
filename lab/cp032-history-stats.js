/* CP032 · Proyección de historial y estadísticas v3, sin I/O. */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./registro-cp021/cp014-compat-bridge.js'):root.BowlingCp014Compat);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.MiBowlingCP032Views=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(A){
 'use strict';
 if(!A||typeof A.validateDocument!=='function')throw Error('CP032_REQUIERE_CP014');
 const clone=v=>JSON.parse(JSON.stringify(v));
 function project(input){
  const original=JSON.stringify(input),doc=clone(input);A.validateDocument(doc);
  const sessions=doc.sessions.map(s=>({
   id:s.id,date:s.date||null,title:s.title||'',type:s.type||null,
   games:s.games.map(g=>{
    const result=A.validateGame(g),included=result.complete&&g.includeStats!==false,
      detailed=g.entryKind==='rolls',exact=detailed&&g.rolls.every(r=>r.pinDetail==='exact'&&Array.isArray(r.pinIds));
    return {
      id:g.id,entryKind:g.entryKind,complete:result.complete,score:result.complete?result.score:null,
      includedInAverage:included,
      frameStatisticsEligible:included&&detailed,
      pinStatisticsEligible:included&&exact,
      framesAvailable:detailed,exactPositionsAvailable:exact,
      // Count-only rolls have no position IDs; final-only games have zero rolls.
      rolls:detailed?g.rolls.map(r=>({
       frame:r.frame,ball:r.ball,count:r.count,foul:!!r.foul,ballId:r.ballId||'',
       pinDetail:r.pinDetail,pinIds:r.pinDetail==='exact'?clone(r.pinIds):null,
       lane:r.lane??null,pair:r.pair??null,source:r.source||r.pinDetail
      })):[],
      finalOnlyScore:g.entryKind==='final_only'?g.finalOnlyScore:null
    };
   })
  }));
  const summary=A.summary(doc),all=sessions.flatMap(s=>s.games);
  if(summary.qualifyingGames!==all.filter(g=>g.includedInAverage).length||
     summary.frameAnalysisEligibleGames!==all.filter(g=>g.frameStatisticsEligible).length||
     summary.pinPatternEligibleGames!==all.filter(g=>g.pinStatisticsEligible).length)
     throw Error('CP032_STATS_COVERAGE_INCONSISTENT');
  if(JSON.stringify(input)!==original)throw Error('CP032_INPUT_MUTATION');
  return {sessions,summary,precision:{
   exact:all.filter(g=>g.exactPositionsAvailable).length,
   countOnly:all.filter(g=>g.rolls.some(r=>r.pinDetail==='count'&&r.pinIds===null)).length,
   finalOnly:all.filter(g=>g.entryKind==='final_only').length
  },sourceUnchanged:true};
 }
 function legacyProjection(doc){
  const copy=clone(doc);A.validateDocument(copy);
  // Never fabricate pin IDs or frames when downgrading to v2.
  return A.toLegacyV2(copy);
 }
 return Object.freeze({project,legacyProjection,writesProduction:false,version:'CP032-views-1'});
});