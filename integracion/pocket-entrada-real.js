'use strict';
/* MI BOWLING · Pocket estimado con una sola excepción manual.
 * Por acuerdo: primera bola sin check => pocket supuesto 1–3 (diestro);
 * check «Entró 1–2» => cruce no pocket. Para zurdos se invierte el lado.
 * Nunca se infiere trayectoria a partir de los bolos derribados.
 * Puro, sin persistencia ni efectos externos.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MiBowlingPocketReal=Object.freeze(api);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const CHOICES=Object.freeze(['1-3','1-2']);
 const clean=value=>CHOICES.includes(value)?value:null;
 const pocketSide=hand=>hand==='zurdo'?'1-2':'1-3';
 const crossSide=hand=>hand==='zurdo'?'1-3':'1-2';
 function analyze(throws,hand){
  const first=(Array.isArray(throws)?throws:[]).filter(r=>r&&r.ball===1&&r.frame>=1&&r.frame<=10&&!r.foul);
  const target=pocketSide(hand),crossSideValue=crossSide(hand);
  const crosses=first.filter(r=>clean(r.impactSide)===crossSideValue);
  const assumed=first.filter(r=>clean(r.impactSide)===null);
  const explicit=first.filter(r=>clean(r.impactSide)===target);
  const hit=assumed.length+explicit.length;
  // Diagnóstico antiguo: los bolos 1 y 3 derribados NO prueban pocket.
  const legacyHits=first.filter(r=>Array.isArray(r.pins)&&r.pins.includes(1)&&r.pins.includes(hand==='zurdo'?2:3)).length;
  return {hit,total:first.length,rate:first.length?Math.round(100*hit/first.length):null,
   cross:crosses.length,assumed:assumed.length,confirmed:explicit.length,
   target,crossSide:crossSideValue,legacyHits};
 }
 return Object.freeze({CHOICES,clean,pocketSide,crossSide,analyze});
});
