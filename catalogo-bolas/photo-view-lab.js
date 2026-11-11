/* MI BOWLING · LAB componente de fotografía: bloqueo de derechos por defecto. */
(function(root){'use strict';
const catalog=root.MiBowlingPhotoLab;
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});}
function approvedAsset(entry,now){
  if(!entry||entry.rightsStatus!=='CONCEDIDA'||typeof entry.rightsHolder!=='string'||entry.rightsHolder.trim().length<3)return null;
  if(typeof entry.rightsEvidenceRef!=='string'||entry.rightsEvidenceRef.trim().length<8)return null;
  if(!Array.isArray(entry.rightsScope)||!entry.rightsScope.includes('web')||!entry.rightsScope.includes('pwa'))return null;
  if(typeof entry.rightsExpiry!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(entry.rightsExpiry))return null;
  if(Date.parse(entry.rightsExpiry+'T23:59:59Z')<(now==null?Date.now():now))return null;
  const path=entry.assetPath;
  if(typeof path!=='string'||!new RegExp('^\\./licensed-ball-photos/'+entry.id+'\\.(?:webp|avif)$').test(path))return null;
  return path;
}
function hasPhoto(item){const e=catalog&&catalog.get(item);return !!approvedAsset(e);}
function photoHTML(item,placeholder){
  const e=catalog&&catalog.get(item);
  const asset=approvedAsset(e);
  const source=e&&e.matchStatus==='oficial-exacto'&&typeof e.sourcePage==='string'&&/^https:\/\//.test(e.sourcePage)?e.sourcePage:null;
  let result='<div class="photo-lab-shell" data-rights="'+(asset?'concedida':'pendiente')+'">'+placeholder;
  if(asset)result+='<img class="photo-lab-asset" data-lab-photo="true" loading="lazy" decoding="async" width="320" height="320" alt="'+esc('Bola '+item.brand+' '+item.model)+'" src="'+esc(asset)+'">';
  if(source)result+='<a class="photo-lab-source" href="'+esc(source)+'" rel="noopener noreferrer" target="_blank" aria-label="'+esc('Ver página oficial de '+item.brand+' '+item.model)+'">Ver página oficial</a>';
  if(e&&e.matchStatus==='candidata-sku-usbc')result+='<span class="photo-lab-candidate">Variante pendiente de verificar</span>';
  return result+'</div>';
}
if(root.document&&root.document.addEventListener){
 root.document.addEventListener('error',function(event){
   const target=event.target;
   if(target&&target.matches&&target.matches('img[data-lab-photo]'))target.remove();
 },true);
}
root.MiBowlingPhotoView=Object.freeze({photoHTML,hasPhoto,approvedAsset});
})(typeof window==='undefined'?globalThis:window);
