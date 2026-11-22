/* CP032 · Synthetic adapter for the actual MI BOWLING v2 keys, league, backups and v3 games.
 * No localStorage/IDB access. No migration or writes to production. */
(function(root,factory){
 const api=factory(
  typeof module==='object'&&module.exports?require('../integracion/autoridad-local.js'):root.MiBowlingAutoridad,
  typeof module==='object'&&module.exports?require('../integracion/respaldo-local.js'):root.MiBowlingRespaldo,
  typeof module==='object'&&module.exports?require('./registro-cp021/cp014-compat-bridge.js'):root.BowlingCp014Compat,
  typeof module==='object'&&module.exports?require('./cp032-history-stats.js'):root.MiBowlingCP032Views
 );
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MiBowlingCP032PWA=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(Authority,Backup,A,Views){
 'use strict';
 if(!Authority?.KEYS||!Backup?.validate||!A?.validateDocument||!Views?.project)throw Error('CP032_PWA_REQUIRES_ORIGINAL_CONTRACTS');
 const SCHEMA='mi-bowling-cp032-pwa-fixture-v1',BACKUP_SCHEMA='mi-bowling-cp032-extended-fictitious-v1',FAKE='cp032-fake-',LAB='cp015-synthetic-only';
 const DB='mi-bowling-analitica-v2',LEAGUE='mi-bowling-liga-acta-v32',ROSTER='mi-bowling-liga-rosters-v33';
 const clone=x=>JSON.parse(JSON.stringify(x)),assert=(v,k)=>{if(!v)throw Error(k)};
 const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),fake=x=>typeof x==='string'&&x.startsWith(FAKE);
 function rawMap(map){
  assert(isObj(map)&&Object.keys(map).length===Authority.KEYS.length,'CP032_RAW_KEY_COUNT');
  assert(Authority.KEYS.every(k=>Object.prototype.hasOwnProperty.call(map,k)&&(map[k]===null||typeof map[k]==='string')),'CP032_UNMANAGED_KEY');
  const copy=clone(map);Backup.validate(copy);return copy;
 }
 function validateLegacy(map){
  const raw=rawMap(map),value=raw[DB];
  assert(typeof value==='string','CP032_V2_REQUIRED');
  const old=JSON.parse(value);
  assert(old.version===2&&Array.isArray(old.balls)&&Array.isArray(old.sessions)&&Array.isArray(old.patterns),'CP032_REAL_V2_SHAPE_REQUIRED');
  assert(old.balls.every(b=>fake(b.id))&&old.sessions.every(s=>fake(s.id)&&s.games.every(g=>
    fake(g.id)&&Array.isArray(g.rolls)&&g.rolls.every(r=>!r.ballId||fake(r.ballId)))),'CP032_ONLY_FAKE_LEGACY_IDS');
  assert(old.patterns.every(p=>fake(p.id)),'CP032_ONLY_FAKE_PATTERN_IDS');
  const v3=A.fromLegacyV2(old);
  assert(JSON.stringify(A.toLegacyV2(v3))===JSON.stringify(old),'CP032_V2_NOT_EXACTLY_REVERSIBLE');
  const league=raw[LEAGUE]===null?{matches:[]}:JSON.parse(raw[LEAGUE]);
  assert(isObj(league)&&Array.isArray(league.matches),'CP032_LEAGUE_SHAPE');
  for(const match of league.matches){
   assert(fake(match.id)&&Array.isArray(match.players),'CP032_ONLY_FAKE_LEAGUE');
   for(const p of match.players){
    assert(isObj(p)&&(!p.id||fake(p.id))&&Array.isArray(p.scores),'CP032_PLAYER_SHAPE');
    if(p.links!==undefined){
     assert(isObj(p.links),'CP032_LINK_SHAPE');
     for(const link of Object.values(p.links))
      assert(isObj(link)&&[FAKE,'cp015-fake-'].some(p=>link.sessionId.startsWith(p))&&[FAKE,'cp015-fake-'].some(p=>link.gameId.startsWith(p)),'CP032_ONLY_FAKE_LINKS');
    }
   }
  }
  const roster=raw[ROSTER]===null?{}:JSON.parse(raw[ROSTER]);
  assert(isObj(roster)&&Object.values(roster).every(v=>Array.isArray(v)),'CP032_ROSTER_SHAPE');
  return {raw,old,legacyV3:v3,league,roster};
 }
 function assetList(list,category){
  assert(Array.isArray(list)&&list.length<=25,'CP032_ASSET_LIST');
  return list.map(x=>{
   assert(isObj(x)&&fake(x.id)&&(!x.ballId||fake(x.ballId)),'CP032_ONLY_FAKE_ASSET');
   assert(!Object.keys(x).some(k=>/data|blob|base64|url|binary/i.test(k)),'CP032_NO_BINARY_OR_REMOTE_ASSETS');
   assert(typeof x.label==='string'&&x.label.length<=120,'CP032_ASSET_LABEL');
   return {id:x.id,ballId:x.ballId||null,label:x.label,kind:category};
  });
 }
 function attach(doc,map,{photos=[],pdfs=[]}={}){
  const modern=clone(doc);A.validateDocument(modern);
  assert(modern.labFixture===LAB&&modern.sessions.length===1&&modern.sessions.every(s=>
   typeof s.id==='string'&&s.id.startsWith('cp015-fake-')&&s.games.every(g=>g.id.startsWith('cp015-fake-'))),'CP032_MODERN_NOT_SYNTHETIC');
  assert(!modern.cp032Mirror,'CP032_NO_OVERWRITE_EXISTING_MIRROR');
  const l=validateLegacy(map),meta={schema:SCHEMA,raw:l.raw,photos:assetList(photos,'photo'),pdfs:assetList(pdfs,'pdf')};
  const merged=dualRead(modern,meta);
  assert(merged.games.length>=modern.sessions[0].games.length,'CP032_DUAL_READ_LOST_GAME');
  modern.cp032Mirror=meta;
  return modern;
 }
 function verifyMirror(doc){
  A.validateDocument(doc);
  if(!doc.cp032Mirror)return true;
  const m=doc.cp032Mirror;
  assert(isObj(m)&&m.schema===SCHEMA,'CP032_MIRROR_SCHEMA');
  validateLegacy(m.raw);assetList(m.photos,'photo');assetList(m.pdfs,'pdf');
  dualRead(doc,m);
  return true;
 }
 function dualRead(doc,mirror){
  const modern=clone(doc);delete modern.cp032Mirror;A.validateDocument(modern);
  const legacy=validateLegacy(mirror.raw);
  const allSessions=[...clone(legacy.legacyV3.sessions),...modern.sessions];
  const sessionIds=new Set(),gameIds=new Set(),allBalls=new Set();
  for(const s of allSessions){
   assert(!sessionIds.has(s.id),'CP032_DUPLICATE_SESSION_ID');sessionIds.add(s.id);
   for(const g of s.games){
    assert(!gameIds.has(g.id),'CP032_DUPLICATE_GAME_ID');gameIds.add(g.id);
   }
  }
  for(const b of [...legacy.legacyV3.balls,...modern.balls||[]]){
   assert(!allBalls.has(b.id),'CP032_DUPLICATE_BALL_ID');allBalls.add(b.id);
  }
  const combined={...modern,balls:[...legacy.legacyV3.balls,...modern.balls||[]],
   patterns:[...legacy.legacyV3.patterns,...modern.patterns||[]],sessions:allSessions};
  A.validateDocument(combined);
  return {legacy,modern,combined,games:allSessions.flatMap(s=>s.games),sessionIds,gameIds};
 }
 function read(doc){
  const original=JSON.stringify(doc);verifyMirror(doc);
  assert(doc.cp032Mirror?.schema===SCHEMA,'CP032_NO_SYNTHETIC_MIRROR');
  const d=dualRead(doc,doc.cp032Mirror),fullHistory=Views.project(d.combined);
  const sessions=d.combined.sessions.filter(s=>!s.leagueOther),personal={...d.combined,sessions};
  const summary=A.summary(personal);
  const perMode={};
  for(const type of ['entrenamiento','oficial']){
   perMode[type]=A.summary({...personal,sessions:sessions.filter(s=>s.type===type)});
  }
  const totals={count:summary.qualifyingGames,average:summary.averageScore,best:summary.bestScore,
   frameEligible:summary.frameAnalysisEligibleGames,pinEligible:summary.pinPatternEligibleGames};
  const byBall={};
  for(const s of sessions)for(const g of s.games){
   if(g.includeStats===false||g.entryKind!=='rolls'||!A.validateGame(g).complete)continue;
   for(const roll of g.rolls){
    if(!roll.ballId)continue;
    const entry=byBall[roll.ballId]||(byBall[roll.ballId]={throws:0,pins:0,exact:0,countOnly:0});
    entry.throws++;entry.pins+=roll.count;
    if(roll.pinDetail==='exact')entry.exact++;else entry.countOnly++;
   }
  }
  const linkIndex=new Map();
  for(const s of d.combined.sessions)for(const g of s.games)linkIndex.set(s.id+'/'+g.id,{s,g});
  const league=d.legacy.league.matches.map(match=>({
    id:match.id,round:match.round??null,match:match.match??null,
    players:match.players.map((p,i)=>{
      const scores=p.scores.map((v,n)=>{
       const link=p.links?.[n];
       if(link){
        const target=linkIndex.get(link.sessionId+'/'+link.gameId);
        if(!target)return {source:'linked-missing',score:null,linkedId:link.gameId};
        const status=A.validateGame(target.g);
        return {source:status.complete?'linked-complete':'linked-pending',
         score:status.complete?status.score:null,linkedId:target.g.id};
       }
       if(v===null||v===undefined||v==='')return {source:'empty',score:null};
       const value=Number(v);
       assert(Number.isInteger(value)&&value>=0&&value<=300,'CP032_INVALID_LEAGUE_SCORE');
       return {source:'quick',score:value};
      });
      return {index:i,playerId:p.id||null,name:p.name||'',team:p.team||'',scores};
    })
  }));
  assert(JSON.stringify(doc)===original,'CP032_INPUT_MUTATED');
  return {sessions:fullHistory.sessions,sourceMetadata:{hand:d.legacy.old.hand,
   balls:d.combined.balls,patterns:d.combined.patterns,roster:d.legacy.roster,
   photos:clone(doc.cp032Mirror.photos),pdfs:clone(doc.cp032Mirror.pdfs)},
   totals,perMode,byBall,league,legacyExact:d.legacy.old,legacyUnchanged:true,
   safety:{v2Write:false,v3WriteOnlySynthetic:true,withoutFabricatedPins:true}};
 }
 const stable=v=>{
  if(Array.isArray(v))return '['+v.map(stable).join(',')+']';
  if(isObj(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
  return JSON.stringify(v);
 };
 async function digest(text){
  if(globalThis.crypto?.subtle){
   const b=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
   return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
  }
  if(typeof require==='function')return require('node:crypto').createHash('sha256').update(text).digest('hex');
  throw Error('CP032_HASH_UNAVAILABLE');
 }
 async function exportExtended(doc){
  const result=read(doc),payload={schema:BACKUP_SCHEMA,exportVersion:1,
   modern:clone(doc),raw:clone(doc.cp032Mirror.raw),photoManifest:clone(doc.cp032Mirror.photos),
   pdfManifest:clone(doc.cp032Mirror.pdfs),
   historyCount:result.sessions.reduce((n,s)=>n+s.games.length,0)};
  const signature=await digest(stable(payload));
  return JSON.stringify({payload,sha256:signature},null,2);
 }
 async function restoreExtended(content){
  assert(typeof content==='string'&&content.length<=2097152,'CP032_RESTORE_SIZE');
  const original=JSON.parse(content);assert(isObj(original)&&isObj(original.payload)&&typeof original.sha256==='string','CP032_BACKUP_ENVELOPE');
  assert(await digest(stable(original.payload))===original.sha256,'CP032_BACKUP_SEAL_MISMATCH');
  const p=original.payload;assert(p.schema===BACKUP_SCHEMA&&p.exportVersion===1,'CP032_BACKUP_SCHEMA');
  const d=clone(p.modern);verifyMirror(d);
  assert(stable(d.cp032Mirror.raw)===stable(p.raw),'CP032_RAW_BACKUP_DRIFT');
  assert(stable(d.cp032Mirror.photos)===stable(p.photoManifest)&&stable(d.cp032Mirror.pdfs)===stable(p.pdfManifest),'CP032_ASSETS_BACKUP_DRIFT');
  const x=read(d);assert(p.historyCount===x.sessions.reduce((n,s)=>n+s.games.length,0),'CP032_HISTORY_BACKUP_DRIFT');
  return d;
 }
 return Object.freeze({SCHEMA,BACKUP_SCHEMA,attach,verifyMirror,read,exportExtended,restoreExtended,
  writesProduction:false,requiresSynthetic:true});
});