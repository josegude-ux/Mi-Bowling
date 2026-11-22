/* MI BOWLING CP014 · Adaptador de contrato en LAB.
   In-memory, pure JSON, no database/storage/network. Requires CP013 scoring engine.
   This is NOT an authorised replacement for the app's legacy migration function.
 */
(function(root, factory){
  const api=factory(typeof module==='object'&&module.exports ? require('./cp013-engine.js') : root.BowlingCp013Engine);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BowlingCp014Compat=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(E){
  'use strict';
  if(!E||typeof E.record!=='function')throw Error('Se requiere el motor aislado CP013');
  const FORMAT='mi-bowling-v3-lab', VERSION=3;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const obj=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const integer=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
  const ensure=(condition,message)=>{if(!condition)throw Error(message)};
  const getSessions=doc=>{
    ensure(obj(doc)&&Array.isArray(doc.sessions),'Se requieren sesiones válidas');
    return doc.sessions;
  };
  const knownIds=new Set(E.PINS);
  function exactPinIds(pins){
    ensure(Array.isArray(pins),'Las posiciones exactas deben tener un array');
    ensure(pins.length<=10&&new Set(pins).size===pins.length&&pins.every(n=>knownIds.has(n)),'Posiciones de bolo inválidas');
    return [...pins];
  }
  function engineGame(g){
    return {rolls:g.rolls.map(r=>({frame:r.frame,ball:r.ball,count:r.count,
      pinIds:r.pinIds===null?null:[...r.pinIds],foul:!!r.foul})),
      finalOnly:g.entryKind==='final_only'?g.finalOnlyScore:null};
  }
  function validateGame(g){
    ensure(obj(g)&&typeof g.id==='string'&&g.id.length>0,'Cada partida necesita un id');
    ensure(Array.isArray(g.rolls),'Las partidas necesitan una lista de lanzamientos');
    ensure(g.entryKind==='rolls'||g.entryKind==='final_only','Tipo de partida no compatible');
    if(g.entryKind==='final_only'){
      ensure(integer(g.finalOnlyScore,0,300),'Puntuación final inválida');
      ensure(g.rolls.length===0,'Una partida de puntuación final no puede inventar lanzamientos');
      return {complete:true,score:g.finalOnlyScore};
    }
    ensure(g.finalOnlyScore===null,'Una partida con tiros no debe tener puntuación final manual');
    const mock=E.newGame();
    for(let i=0;i<g.rolls.length;i++){
      const r=g.rolls[i];
      ensure(obj(r)&&integer(r.count,0,10),'Cantidad de lanzamiento inválida #'+i);
      ensure(r.pinDetail==='exact'||r.pinDetail==='count','Detalle de lanzamiento inválido #'+i);
      if(r.pinDetail==='count')ensure(r.pinIds===null,'No atribuir bolos concretos sin haberlos anotado #'+i);
      if(r.pinDetail==='exact'){
        exactPinIds(r.pinIds);
        ensure(r.pinIds.length===r.count,'Cantidad y bolos discordantes #'+i);
      }
      ensure(typeof r.foul==='undefined'||typeof r.foul==='boolean','Indicador de falta inválido #'+i);
      const expected=E.next(mock);
      ensure(!expected.done,'Más lanzamientos de los permitidos #'+i);
      ensure(r.frame===expected.frame&&r.ball===expected.ball,'Secuencia de frames incoherente #'+i);
      E.record(mock,r.count,{pinIds:r.pinIds,foul:!!r.foul,source:r.pinDetail});
    }
    return {complete:E.complete(mock),score:E.score(mock)};
  }
  function validateDocument(doc){
    ensure(obj(doc)&&doc.format===FORMAT&&doc.version===VERSION,'Documento no es formato LAB v3');
    for(const [i,s] of getSessions(doc).entries()){
      ensure(obj(s)&&typeof s.id==='string'&&Array.isArray(s.games),'Sesión inválida #'+i);
      for(const g of s.games)validateGame(g);
    }
    return true;
  }
  function fromLegacyV2(source){
    ensure(obj(source)&&source.version===2,'Solo se importa una instantánea v2');
    getSessions(source);
    const doc=clone(source);
    doc.format=FORMAT;doc.version=VERSION;
    for(const session of doc.sessions){
      ensure(obj(session)&&typeof session.id==='string'&&Array.isArray(session.games),'Sesión legacy inválida');
      for(const game of session.games){
        ensure(obj(game)&&typeof game.id==='string'&&Array.isArray(game.rolls),'Partida legacy inválida');
        game.entryKind='rolls';game.finalOnlyScore=null;
        game.rolls=game.rolls.map(r=>{
          ensure(obj(r),'Lanzamiento legacy inválido');
          const pins=exactPinIds(r.pins);
          return {...r,count:pins.length,pinDetail:'exact',pinIds:pins};
        });
      }
    }
    validateDocument(doc);return doc;
  }
  function toLegacyV2(document){
    validateDocument(document);
    const doc=clone(document);
    delete doc.format;doc.version=2;
    for(const session of doc.sessions)for(const game of session.games){
      ensure(game.entryKind==='rolls','Proyección v2 NO GO: partida de puntuación final');
      game.rolls=game.rolls.map(r=>{
        ensure(r.pinDetail==='exact'&&Array.isArray(r.pinIds),'Proyección v2 NO GO: posiciones desconocidas');
        const result={...r,pins:[...r.pinIds]};
        delete result.count;delete result.pinDetail;delete result.pinIds;
        return result;
      });
      delete game.entryKind;delete game.finalOnlyScore;
    }
    return doc;
  }
  function newGame(id,extra={}){
    ensure(typeof id==='string'&&id.length>0,'Id de partida obligatorio');
    ensure(obj(extra),'Metadatos de partida inválidos');
    return {...clone(extra),id,entryKind:'rolls',finalOnlyScore:null,rolls:[]};
  }
  function addRoll(g,count,options={}){
    validateGame(g);
    ensure(g.entryKind==='rolls','No mezclar tiros con puntuación final');
    ensure(obj(options),'Opciones inválidas');
    const mock=engineGame(g);
    const hasPositions=Object.prototype.hasOwnProperty.call(options,'pinIds');
    const pinIds=hasPositions?exactPinIds(options.pinIds):null;
    const turn=E.next(mock);
    E.record(mock,count,{pinIds:hasPositions?pinIds:null,foul:!!options.foul,source:hasPositions?'bolos':'cantidad'});
    const result={frame:turn.frame,ball:turn.ball,count,pinDetail:hasPositions?'exact':'count',
      pinIds:hasPositions?pinIds:null,foul:!!options.foul,
      ballId:typeof options.ballId==='string'?options.ballId:'',source:hasPositions?'bolos':'cantidad'};
    g.rolls.push(result);
    return {next:E.next(engineGame(g)),score:E.score(engineGame(g)),roll:clone(result)};
  }
  function recordFinalOnly(g,value){
    validateGame(g);
    ensure(g.entryKind==='rolls'&&g.rolls.length===0,'No reemplazar tiros por resultado final');
    const mock=E.newGame();E.recordFinal(mock,value);
    g.entryKind='final_only';g.finalOnlyScore=value;
    return value;
  }
  function undo(g){
    validateGame(g);
    if(g.entryKind==='final_only'){g.entryKind='rolls';g.finalOnlyScore=null;return true;}
    return g.rolls.length?!!g.rolls.pop():false;
  }
  function score(g){validateGame(g);return E.score(engineGame(g));}
  function next(g){validateGame(g);return E.next(engineGame(g));}
  function summary(doc){
    validateDocument(doc);
    const results=[];
    for(const s of doc.sessions)for(const g of s.games){
      const eg=engineGame(g),completed=E.complete(eg);
      const included=completed&&g.includeStats!==false;
      const positionsExact=g.entryKind==='rolls'&&completed&&g.rolls.every(r=>r.pinDetail==='exact');
      results.push({sessionId:s.id,gameId:g.id,kind:g.entryKind,completed,
        score:completed?E.score(eg):null,
        eligibleForOverallAverage:included,
        eligibleForFrameAnalysis:included&&g.entryKind==='rolls',
        eligibleForPinPatternAnalysis:included&&positionsExact});
    }
    const completeGames=results.filter(r=>r.eligibleForOverallAverage);
    return {totalGames:results.length,qualifyingGames:completeGames.length,
      averageScore:completeGames.length?completeGames.reduce((v,r)=>v+r.score,0)/completeGames.length:null,
      bestScore:completeGames.length?Math.max(...completeGames.map(r=>r.score)):null,
      pinPatternEligibleGames:results.filter(r=>r.eligibleForPinPatternAnalysis).length,
      frameAnalysisEligibleGames:results.filter(r=>r.eligibleForFrameAnalysis).length,
      finalOnlyGames:results.filter(r=>r.kind==='final_only').length,
      perGame:results};
  }
  function roundTripJSON(doc){validateDocument(doc);return JSON.parse(JSON.stringify(doc));}
  return Object.freeze({FORMAT,VERSION,fromLegacyV2,toLegacyV2,newGame,addRoll,
    recordFinalOnly,undo,score,next,summary,validateGame,validateDocument,roundTripJSON});
});
