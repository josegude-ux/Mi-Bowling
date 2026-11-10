'use strict';
/* BOWLING-CATALOG100-VARIANTS-LAB-001. Conservative identity review ONLY.
 * Matching brand+model is never proof of the same drilling, year, weight,
 * color, SKU, edition, USBC approval identity or physical unit.
 * No storage writes, remote calls or technical specification inference.
 */
(function(root){
 const canonical=s=>String(s||'').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const key=x=>canonical(x?.brand)+'|'+canonical(x?.model);
 function inspect(candidate,inventory){
  const matches=(Array.isArray(inventory)?inventory:[]).filter(b=>b&&key(b)===key(candidate));
  return Object.freeze({
   kind:matches.length?'name-collision':'new-model-name',
   confirmedSameVariant:false,
   count:matches.length,
   // ID and retired status are for navigation, NOT identity verification.
   matches:Object.freeze(matches.map(b=>Object.freeze({id:b.id,retired:!!b.retired})))
  });
 }
 function plan(selected,inventory){
  const existing=new Set((Array.isArray(inventory)?inventory:[]).filter(Boolean).map(key));
  const add=[],review=[];
  for(const x of Array.isArray(selected)?selected:[]){
   const k=key(x);
   if(existing.has(k)){review.push(x);continue}
   existing.add(k);add.push(x);
  }
  return Object.freeze({add:Object.freeze(add),review:Object.freeze(review),
   proofOfVariant:false});
 }
 root.MiBowlingCatalog100VariantPolicy=Object.freeze({key,inspect,plan});
})(typeof window==='undefined'?globalThis:window);
