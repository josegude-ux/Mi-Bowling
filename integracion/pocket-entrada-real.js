'use strict';
/* MI BOWLING · Lectura real del pocket (trayectoria observada, no bolos caídos).
 * Sin I/O ni escritura. Datos anteriores sin marca se consideran DESCONOCIDOS.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MiBowlingPocketReal=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const CHOICES=Object.freeze(['1-3','1-2','other']);
 function clean(value){return CHOICES.includes(value)?value:null}
 function pocketSide(hand){return hand==='zurdo'?'1-2':'1-3'}
 function otherSide(hand){return hand==='zurdo'?'1-3':'1-2'}
 function analyze(throws,hand){
  const first=(Array.isArray(throws)?throws:[]).filter(r=>r&&r.ball===1&&r.frame>=1&&r.frame<=10&&!r.foul);
  const target=pocketSide(hand);
  const confirmed=first.filter(r=>clean(r.impactSide)!==null);
  const hit=confirmed.filter(r=>r.impactSide===target).length;
  const cross=confirmed.filter(r=>r.impactSide===otherSide(hand)).length;
  const other=confirmed.filter(r=>r.impactSide==='other').length;
  // El indicador histórico NO cuenta entradas reales: solo caída de 1 y lateral.
  const legacyHits=first.filter(r=>Array.isArray(r.pins)&&r.pins.includes(1)&&r.pins.includes(hand==='zurdo'?2:3)).length;
  return {hit,confirmed:confirmed.length,unknown:first.length-confirmed.length,total:first.length,
   cross,other,target,legacyHits,rate:confirmed.length?Math.round(100*hit/confirmed.length):null};
 }
 return Object.freeze({CHOICES,clean,pocketSide,otherSide,analyze});
});
