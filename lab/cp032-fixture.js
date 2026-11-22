/* CP032 · Entirely fictitious real-shaped MI BOWLING v2/league fixture. */
(function(root,factory){
 const api=factory(
  typeof module==='object'&&module.exports?require('../integracion/autoridad-local.js'):root.MiBowlingAutoridad,
  typeof module==='object'&&module.exports?require('./registro-cp021/cp014-compat-bridge.js'):root.BowlingCp014Compat
 );
 if(typeof module==='object'&&module.exports)module.exports=api;else root.MiBowlingCP032Fixture=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(Authority,A){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const FAKE='cp032-fake-',LAB='cp015-synthetic-only';
 function make(){
  const line={approach:'22',arrow:'12',breakpoint:'8'};
  const game=(id,ballId,includeStats=true)=>({id,pair:[9,10],startLane:9,
   includeStats,segments:[],rolls:Array.from({length:20},(_,i)=>({
     frame:Math.floor(i/2)+1,ball:i%2+1,pins:[],ballId,line:copy(line),
     lane:Math.floor(i/2)%2===0?9:10,pair:[9,10],foul:false,
     createdAt:'2026-11-20T12:00:00.000Z'
   }))});
  const ball1=FAKE+'ball-strike',ball2=FAKE+'ball-spare';
  const old={version:2,hand:'diestro',balls:[
   {id:ball1,brand:'FICTICIA',model:'Bola de prueba',retired:false},
   {id:ball2,brand:'FICTICIA',model:'Bola retirada de prueba',retired:true}
  ],patterns:[{id:FAKE+'pattern-001',name:'PATRON FICTICIO'}],
   sessions:[
    {id:FAKE+'session-personal',type:'oficial',date:'2026-11-20',
     title:'Partida oficial FICTICIA',venue:'BOLERA FICTICIA',notes:'Notas sintéticas',
     competition:'Liga Nacional',leagueOther:false,leaguePlayer:'JUGADOR FICTICIO',
     pattern:'',patternId:FAKE+'pattern-001',patternNotes:'',goal:null,lane:9,
     currentBallId:ball1,currentLine:copy(line),
     games:[game(FAKE+'game-linked-personal',ball1)]},
    {id:FAKE+'session-visitor',type:'oficial',date:'2026-11-20',
     title:'Rival FICTICIO',venue:'BOLERA FICTICIA',notes:'',
     competition:'Liga Nacional',leagueOther:true,leaguePlayer:'RIVAL FICTICIO',
     currentBallId:ball2,currentLine:copy(line),
     games:[game(FAKE+'game-visitor',ball2)]},
    {id:FAKE+'session-training',type:'entrenamiento',date:'2026-11-18',
     title:'Entrenamiento FICTICIO',venue:'BOLERA FICTICIA',notes:'',
     goal:{kind:'strike',target:50},currentBallId:ball1,currentLine:copy(line),
     games:[game(FAKE+'game-training',ball1)]}
   ]};
  const match={id:FAKE+'match-01',round:1,match:1,date:'2026-11-20',
   myTeam:'FICTICIO A',rival:'FICTICIO B',players:[
    {id:FAKE+'player-1',name:'JUGADOR FICTICIO',team:'own',trio:1,
     scores:['',''],names:['',''],isMe:true,
     links:{0:{sessionId:FAKE+'session-personal',gameId:FAKE+'game-linked-personal'},
            1:{sessionId:'cp015-fake-session-001',gameId:'cp015-fake-final'}}},
    {id:FAKE+'player-2',name:'RIVAL FICTICIO',team:'rival',trio:1,
     scores:['199',''],names:['',''],links:{0:{sessionId:FAKE+'session-visitor',gameId:FAKE+'game-visitor'}}},
    {id:FAKE+'player-3',name:'TERCERO FICTICIO',team:'own',trio:2,
     scores:['201',''],names:['','']},
    {id:FAKE+'player-4',name:'PENDIENTE FICTICIO',team:'rival',trio:2,
     scores:['',''],names:['',''],links:{0:{sessionId:FAKE+'session-missing',gameId:FAKE+'game-missing'}}}
   ]};
  const rawMap=Object.fromEntries(Authority.KEYS.map(k=>[k,null]));
  rawMap['mi-bowling-analitica-v2']=JSON.stringify(old);
  rawMap['mi-bowling-liga-acta-v32']=JSON.stringify({matches:[match]});
  rawMap['mi-bowling-liga-rosters-v33']=JSON.stringify({'FICTICIO A':['JUGADOR FICTICIO'],'FICTICIO B':['RIVAL FICTICIO']});
  rawMap['mi-bowling-ball-selection-v1']=JSON.stringify({[FAKE+'session-personal']:[ball1]});
  rawMap['mi-bowling-quick-layout']='compact';
  const exact=A.newGame('cp015-fake-exact',{includeStats:true,pair:[9,10],startLane:9,segments:[]});
  A.addRoll(exact,10,{pinIds:[1,2,3,4,5,6,7,8,9,10],ballId:ball1});
  const count=A.newGame('cp015-fake-count',{includeStats:true,pair:[9,10],startLane:9,segments:[]});
  A.addRoll(count,7,{ballId:ball2});A.addRoll(count,3,{ballId:ball2});
  const final=A.newGame('cp015-fake-final',{includeStats:true,pair:[9,10],startLane:9,segments:[]});
  A.recordFinalOnly(final,225);
  const modern={format:A.FORMAT,version:3,labFixture:LAB,
   hand:'diestro',balls:[],patterns:[],sessions:[{
    id:'cp015-fake-session-001',type:'oficial',date:'2026-11-20',
    title:'Puntuación de liga FICTICIA',leagueOther:false,leaguePlayer:'JUGADOR FICTICIO',
    games:[exact,count,final]}]};
  const assets={photos:[{id:FAKE+'photo-01',ballId:ball1,label:'Foto FICTICIA (solo metadatos)'}],
    pdfs:[{id:FAKE+'pdf-01',label:'PDF FICTICIO (solo metadatos)'}]};
  return copy({rawMap,modern,assets});
 }
 return Object.freeze({make,allFictitious:true});
});