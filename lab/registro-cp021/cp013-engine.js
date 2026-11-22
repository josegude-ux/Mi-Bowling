/* MI BOWLING CP013 — isolated ten-pin scoring prototype.
 * Pure, ephemeral model. Not linked to production, database or history.
 */
(function(root,factory){
  const engine=factory();
  if(typeof module==='object' && module.exports)module.exports=engine;
  if(root)root.BowlingCp013Engine=engine;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const PINS=[1,2,3,4,5,6,7,8,9,10];
 const newGame=()=>({rolls:[],finalOnly:null});
 const inFrame=(game,f)=>game.rolls.filter(r=>r.frame===f);
 const remaining=(previous,capacity)=>{
   if(capacity===10)return [...PINS];
   if(!previous)return null;
   if(previous.pinIds!==null)return PINS.filter(p=>!previous.pinIds.includes(p));
   if(previous.count===0)return [...PINS];
   return null;
 };
 function next(game){
   if(game.finalOnly!==null)return{done:true};
   for(let f=1;f<=10;f++){
     const r=inFrame(game,f), x=r[0]?.count??0, y=r[1]?.count??0;
     if(f<10){
       if(!r.length)return{frame:f,ball:1,capacity:10,available:[...PINS]};
       if(x===10)continue;
       if(r.length===1)return{frame:f,ball:2,capacity:10-x,available:remaining(r[0],10-x)};
       continue;
     }
     if(!r.length)return{frame:10,ball:1,capacity:10,available:[...PINS]};
     if(r.length===1){
       if(x===10)return{frame:10,ball:2,capacity:10,available:[...PINS]};
       return{frame:10,ball:2,capacity:10-x,available:remaining(r[0],10-x)};
     }
     if(r.length===2){
       if(x===10){
         if(y===10)return{frame:10,ball:3,capacity:10,available:[...PINS]};
         return{frame:10,ball:3,capacity:10-y,available:remaining(r[1],10-y)};
       }
       if(x+y===10)return{frame:10,ball:3,capacity:10,available:[...PINS]};
     }
     return{done:true};
   }
   return{done:true};
 }
 const complete=game=>game.finalOnly!==null||next(game).done;
 function record(game,count,options={}){
   if(game.finalOnly!==null)throw Error('La partida solo tiene puntuación final');
   const turn=next(game);
   if(turn.done)throw Error('La partida ya está terminada');
   if(!Number.isInteger(count)||count<0||count>turn.capacity)throw Error('Cantidad fuera de los bolos disponibles');
   const foul=!!options.foul;
   if(foul&&count!==0)throw Error('Una falta no puede contar bolos');
   let pins=options.pinIds===undefined?null:options.pinIds;
   if(pins!==null){
     if(!Array.isArray(pins)||pins.length!==count||new Set(pins).size!==count||pins.some(p=>!PINS.includes(p)))throw Error('Bolos individuales incoherentes');
     if(turn.available===null||pins.some(p=>!turn.available.includes(p)))throw Error('No se pueden atribuir posiciones desconocidas');
     pins=[...pins].sort((a,b)=>a-b);
   }else if(count===0)pins=[];
   else if(count===10&&turn.capacity===10)pins=[...PINS];
   game.rolls.push({frame:turn.frame,ball:turn.ball,count,pinIds:pins,foul,source:options.source||'cantidad',ballKind:options.ballKind||null});
   return next(game);
 }
 function undo(game){
   if(game.finalOnly!==null){game.finalOnly=null;return true;}
   if(game.rolls.length){game.rolls.pop();return true;}
   return false;
 }
 function recordFinal(game,value){
   if(game.rolls.length)throw Error('No se puede sustituir una partida con lanzamientos por un total');
   if(game.finalOnly!==null)throw Error('La partida ya tiene puntuación final');
   if(!Number.isInteger(value)||value<0||value>300)throw Error('Resultado final fuera de 0–300');
   game.finalOnly=value;
 }
 function frameScores(game){
   if(game.finalOnly!==null)return Array(10).fill(null);
   const a=game.rolls.map(r=>r.count);
   let pos=0,sum=0;
   const scores=[];
   for(let f=1;f<=10;f++){
     const fr=inFrame(game,f);
     if(!fr.length){scores.push(null);continue;}
     let v=null,first=fr[0].count,second=fr[1]?.count??0;
     if(f===10){if(complete(game))v=fr.reduce((total,r)=>total+r.count,0);}
     else if(first===10){if(a.length>=pos+3)v=10+a[pos+1]+a[pos+2];}
     else if(fr.length===2){
       if(first+second===10){if(a.length>=pos+3)v=10+a[pos+2];}
       else v=first+second;
     }
     if(v===null)scores.push(null);
     else{sum+=v;scores.push(sum);}
     pos+=fr.length;
   }
   return scores;
 }
 function score(game){
   if(game.finalOnly!==null)return game.finalOnly;
   return [...frameScores(game)].reverse().find(n=>n!==null)??0;
 }
 function marks(game,f){
   if(game.finalOnly!==null)return[];
   const fr=inFrame(game,f),res=[];
   fr.forEach((r,i)=>{
     if(r.foul){res.push('F');return;}
     if(r.count===10 && (i===0||f===10&&(i===1&&fr[0].count===10||i===2&&(fr[1].count===10||fr[0].count<10&&fr[0].count+fr[1].count===10)))){res.push('X');return;}
     if(i===1&&fr[0].count<10&&fr[0].count+r.count===10){res.push('/');return;}
     if(f===10&&i===2&&fr[0].count===10&&fr[1].count<10&&fr[1].count+r.count===10){res.push('/');return;}
     res.push(r.count===0?'-':String(r.count));
   });
   return res;
 }
 return Object.freeze({PINS:Object.freeze(PINS),newGame,inFrame,next,complete,record,undo,recordFinal,frameScores,score,marks});
});
