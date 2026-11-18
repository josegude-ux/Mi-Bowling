/* Regresiones de perfiles LAB. Sin red ni escrituras de producción. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'..','profiles.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const stats=fs.readFileSync(path.join(__dirname,'..','stats-bolos.js'),'utf8');
const BASE='mi-bowling-analitica-v2',META='mi-bowling-local-profiles-v1',SELECTED='mi-bowling-local-selected-v1';
const originals=new Map([
 [BASE,JSON.stringify({version:2,hand:'zurdo',balls:[{id:'old-ball',brand:'Original',model:'Intocable'}],patterns:[],sessions:[{id:'old-s',type:'entrenamiento',date:'2026-11-08',games:[{id:'old-g',rolls:[]}]}]})],
 ['mi-bowling-liga-v1',JSON.stringify({matches:[{id:'old-liga',players:[]}]})],
 ['mi-bowling-liga-acta-v32',JSON.stringify({matches:[{id:'old-acta',players:[]}]})],
 ['mi-bowling-liga-rosters-v33',JSON.stringify({own:['Nombre original']})],
 ['mi-bowling-quick-layout','compact']
]);
class Store{
 constructor(map){this.map=map}
 getItem(k){return this.map.has(String(k))?this.map.get(String(k)):null}
 setItem(k,v){this.map.set(String(k),String(v))}
 removeItem(k){this.map.delete(String(k))}
 clear(){this.map.clear()}
}
const storage=new Store(new Map(originals)),session=new Store(new Map());
function environment(){
 const elements={};
 function el(id){
  return elements[id]||(elements[id]={id,value:'',hidden:false,innerHTML:'',textContent:'',disabled:false,style:{},
   classList:{add(){},remove(){},toggle(){}},addEventListener(){},setAttribute(){},focus(){},
   replaceChildren(){},querySelectorAll(){return []},querySelector(){return {disabled:false}}})
 }
 const document={body:{classList:{add(){},remove(){},toggle(){}},appendChild(node){this.lastScript=node}},
  createElement(t){return {tagName:t,src:''}},querySelector(){return null},
  getElementById(id){return ['app','bottom-nav','restore-file','profile-gate','player-current','player-switch'].includes(id)||id.startsWith('player-')?el(id):null}};
 const ctx={document,localStorage:storage,sessionStorage:session,crypto:webcrypto,TextEncoder,console,
   location:{protocol:'file:',reload(){}},navigator:{},alert(msg){throw Error(String(msg))},
   confirm(){return false},setTimeout(){},clearTimeout(){},scrollTo(){}};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(source,ctx,{filename:'profiles.js',timeout:3000});
 ctx.MiBowlingProfiles.init();return ctx;
}
function active(id,withApp){
 if(id)session.setItem(SELECTED,id);else session.removeItem(SELECTED);
 const ctx=environment();
 if(withApp){vm.runInContext(stats,ctx,{filename:'stats-bolos.js',timeout:3000});vm.runInContext(app,ctx,{filename:'app.js',timeout:8000});}
 return ctx;
}
(async()=>{
 let ctx=active(null,false);
 assert.deepEqual(Array.from(ctx.MiBowlingProfiles.profiles(),p=>p.id),['legacy']);
 for(const [key,value] of originals){
   assert.equal(storage.getItem(key),value,'Original intacto '+key);
   assert.equal(storage.getItem('mi-bowling-profile:legacy:'+key),value,'Copia literal '+key);
 }
 assert.equal(ctx.MiBowlingProfiles.current(),null);
 const a=await ctx.MiBowlingProfiles.create('Jugador A','','');
 assert.equal(storage.getItem(ctx.MiBowlingProfiles.storageKey(BASE)),null);
 assert.equal(ctx.MiBowlingProfiles.isLegacy(),false);
 ctx=active(a.id,true);
 assert.equal(vm.runInContext('db.sessions.length',ctx),0);
 assert.equal(vm.runInContext('db.balls.length',ctx),0);
 assert.equal(vm.runInContext('db.hand',ctx),'diestro');
 // Un juego completo de doce strikes de A, 300 puntos.
 vm.runInContext("db.balls.push({id:'ba',brand:'Bola A',model:'Prueba'});db.sessions.push({id:'sa',type:'entrenamiento',date:'2026-11-08',games:[{id:'ga',includeStats:true,rolls:Array.from({length:12},(_,i)=>({frame:Math.min(i+1,10),ball:i>9?i-8:1,pins:[1,2,3,4,5,6,7,8,9,10],ballId:'ba'}))}]});db.hand='zurdo';save()",ctx);
 const dbA=storage.getItem(ctx.MiBowlingProfiles.storageKey(BASE));
 assert.ok(dbA.includes('sa') && dbA.includes('ba'));
 assert.equal(vm.runInContext("aggregate('entrenamiento').avg",ctx),300);
 assert.equal(vm.runInContext("MiBowlingPinStats.compute(periodAggregate(aggregate('entrenamiento')),'first').overallRate",ctx),100);
 assert.equal(vm.runInContext("MiBowlingPinStats.compute(periodAggregate(aggregate('entrenamiento','otra-bola')),'first').events",ctx),0);
 assert.equal(vm.runInContext("MiBowlingPinStats.compute(periodAggregate(aggregate('oficial')),'first').events",ctx),0);
 const aBackup=vm.runInContext("({...db,localPlayer:MiBowlingProfiles.current()})",ctx);
 ctx=active(null,false);
 const b=await ctx.MiBowlingProfiles.create('Jugador B','','');
 ctx=active(b.id,true);
 assert.equal(vm.runInContext('db.sessions.length',ctx),0);
 assert.equal(vm.runInContext('db.balls.length',ctx),0);
 assert.equal(vm.runInContext('db.hand',ctx),'diestro');
 assert.equal(vm.runInContext("aggregate('entrenamiento').games.length",ctx),0);
 assert.equal(vm.runInContext("aggregate('oficial').games.length",ctx),0);
 for(const view of ['first','second','single','combinations']){
  const q=vm.runInContext("MiBowlingPinStats.compute(periodAggregate(aggregate('entrenamiento')),'"+view+"')",ctx);
  assert.equal(q.events,0,'New player B has no results for '+view);
  assert.equal(q.overallRate,null,'New player B has no fabricated percentages for '+view);
 }
 assert.match(vm.runInContext("MiBowlingPinStats.html(periodAggregate(aggregate('entrenamiento')),{profileName:MiBowlingProfiles.current().name})",ctx),/Jugador B/);
 assert.throws(()=>ctx.MiBowlingProfiles.validateRestore(aBackup),/otro jugador/i);
 assert.throws(()=>ctx.MiBowlingProfiles.validateRestore({version:2,sessions:[],balls:[]}),/copia antigua/i);
 assert.equal(ctx.MiBowlingProfiles.validateRestore({...aBackup,localPlayer:ctx.MiBowlingProfiles.current()}),true);
 assert.equal(storage.getItem(ctx.MiBowlingProfiles.storageKey(BASE)),null);
 assert.ok(!storage.getItem(ctx.MiBowlingProfiles.storageKey('mi-bowling-liga-rosters-v33')).includes('Nombre original'),'No se heredan jugadores antiguos de Liga');
 const league=JSON.parse(storage.getItem(ctx.MiBowlingProfiles.storageKey('mi-bowling-liga-acta-v32')));
 assert.equal(league.matches[0].demo,false);
 assert.ok(league.matches[0].players.every(p=>p.scores.every(score=>!score)));
 assert.notEqual(ctx.MiBowlingProfiles.pdfDatabase(),'mi-bowling-patrones-pdf-legacy');
 assert.equal(storage.getItem('mi-bowling-profile:'+a.id+':'+BASE),dbA);
 for(const [key,value] of originals)assert.equal(storage.getItem(key),value,'Original conservado '+key);
 // Restauración real en la capa de 3.3.8: otros perfiles se rechazan antes de cualquier escritura.
 const bKey=ctx.MiBowlingProfiles.storageKey(BASE);
 const leagueKey=ctx.MiBowlingProfiles.storageKey('mi-bowling-liga-acta-v32');
 const rosterKey=ctx.MiBowlingProfiles.storageKey('mi-bowling-liga-rosters-v33');
 ctx.restoreInput=aBackup;
 assert.throws(()=>vm.runInContext('restorePlayerData(restoreInput)',ctx),/otro jugador/i);
 assert.equal(storage.getItem(bKey),null);
 const bBackup={version:2,hand:'diestro',balls:[{id:'b-ball',brand:'B',model:'Prueba'}],patterns:[],
   sessions:[{id:'restored-b',date:'2026-11-08',type:'entrenamiento',games:[]}],
   localPlayer:ctx.MiBowlingProfiles.current(),
   leagueNational:{matches:[{id:'league-b',players:[]}]},
   leagueRosters:{own:['Jugador B ficticio']}
 };
 ctx.restoreInput=bBackup;
 vm.runInContext('restorePlayerData(restoreInput)',ctx);
 assert.match(storage.getItem(bKey),/restored-b/);
 assert.equal(JSON.parse(storage.getItem(leagueKey)).matches[0].id,'league-b');
 assert.ok(storage.getItem(rosterKey).includes('Jugador B ficticio'));
 assert.equal(storage.getItem('mi-bowling-profile:'+a.id+':'+BASE),dbA);
 // Simular cuota llena durante escritura de partidas: acta y roster deben revertirse.
 const storedBefore=[storage.getItem(bKey),storage.getItem(leagueKey),storage.getItem(rosterKey)];
 ctx.restoreInput={...bBackup, sessions:[{id:'b-new-due-to-quota',date:'2026-11-08',games:[]}],
   leagueNational:{matches:[{id:'overwritten-league',players:[]}]},
   leagueRosters:{own:['Otra lista']}
 };
 const originalSet=storage.setItem.bind(storage);
 storage.setItem=(key,value)=>{if(key===bKey)throw Error('QuotaExceededError');return originalSet(key,value)};
 try{
  assert.throws(()=>vm.runInContext('restorePlayerData(restoreInput)',ctx),/datos anteriores se han restablecido/i);
 }finally{storage.setItem=originalSet}
 assert.deepEqual([storage.getItem(bKey),storage.getItem(leagueKey),storage.getItem(rosterKey)],storedBefore);
 assert.equal(storage.getItem('mi-bowling-profile:'+a.id+':'+BASE),dbA);
 console.log('OK · Restauración B verificada; rechazo A→B y rollback de acta y roster ante cuota');
 ctx=active('legacy',false);
 assert.equal(ctx.MiBowlingProfiles.validateRestore({version:2,sessions:[],balls:[]}),true,'Only legacy may restore unmarked old backups');
 ctx=active(null,false);
 const pinPlayer=await ctx.MiBowlingProfiles.create('Jugador PIN','1234','1234');
 const pinRecord=JSON.parse(storage.getItem(META)).profiles.find(p=>p.id===pinPlayer.id);
 assert.ok(pinRecord.pin.salt&&/^[0-9a-f]{64}$/.test(pinRecord.pin.hash));
 assert.ok(!JSON.stringify(pinRecord).includes('"1234"'));
 assert.equal(await ctx.MiBowlingProfiles.verifyPin(pinRecord,'1234'),true);
 assert.equal(await ctx.MiBowlingProfiles.verifyPin(pinRecord,'9999'),false);
 ctx=active(null,false);
 await assert.rejects(ctx.MiBowlingProfiles.create('Jugador A','',''),/Ya existe/);
 await assert.rejects(ctx.MiBowlingProfiles.create('Jugador X','1234','9999'),/no coinciden/);
 assert.equal(storage.getItem('mi-bowling-profile:'+a.id+':'+BASE),dbA);
 console.log('OK · A 300 puntos / B 0, bolas, mano y actas de Liga independientes');
 console.log('OK · Datos anteriores copiados literalmente sin tocar claves originales');
 console.log('OK · PIN opcional sal+PBKDF2 sin texto claro, rechaza PIN incorrecto');
})().catch(e=>{console.error(e);process.exitCode=1});
