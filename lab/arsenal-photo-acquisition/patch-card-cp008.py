"""After the verified CP005 apply, avoid the duplicate placeholder in Mis bolas."""
import pathlib,sys
root=pathlib.Path(sys.argv[1])
def once(s,a,b):
    if s.count(a)!=1:raise ValueError('Anchor not unique: '+a[:100])
    return s.replace(a,b,1)
p=root/'app.js';s=p.read_text()
a="const cards=db.balls.map(b=>{const photo=b.photo?`<img src=\"${esc(b.photo)}\" alt=\"Fotografía de ${esc(b.model)}\">`:'<span>🎳</span>';"
b="const cards=db.balls.map(b=>{const photo=b.photo?`<img src=\"${esc(b.photo)}\" alt=\"Fotografía de ${esc(b.model)}\">`:(window.MiBowlingArsenalPhotoIntegration?.physicalArtHTML(b)||'<span>🎳</span>');"
s=once(s,a,b);s=once(s,"${window.MiBowlingArsenalPhotoIntegration?.physicalHTML(b)||''}<div class=\"ball-name\">","${window.MiBowlingArsenalPhotoIntegration?.physicalReferenceHTML(b)||''}<div class=\"ball-name\">");p.write_text(s)
p=root/'arsenal-photo-integration-lab.js';s=p.read_text()
s=once(s,'function markup(e,physical,hasPersonalPhoto=false){','function markup(e,physical,hasPersonalPhoto=false,showImage=true){')
s=once(s,"+(a?'<img class=\"arsenal-reference-image\"", "+(a&&showImage?'<img class=\"arsenal-reference-image\"")
a=" if(root.document?.addEventListener)root.document.addEventListener('error',event=>{const img=event.target;if(!img?.matches?.('img[data-arsenal-reference-image]'))return;const wrapper=img.closest('.arsenal-photo-reference');img.remove();const hint=wrapper?.querySelector('.arsenal-photo-fallback');if(hint)hint.hidden=false;},true);"
b=""" function physicalArtHTML(b){const e=physicalEntry(b);const a=(!b?.photo&&e?.profileId!=='rhino')?approvedAsset(e):null;return a?'<img class="arsenal-reference-image" data-arsenal-reference-image="true" data-arsenal-reference-art="true" width="160" height="160" style="object-fit:contain" loading="lazy" decoding="async" src="'+esc(a)+'" alt="Fotografía de referencia de '+esc(e.brand+' '+e.model)+'">':'';}
 if(root.document?.addEventListener)root.document.addEventListener('error',event=>{const img=event.target;if(!img?.matches?.('img[data-arsenal-reference-image]'))return;const wrapper=img.closest('.arsenal-photo-reference')||img.closest('.ball-card');if(img.hasAttribute('data-arsenal-reference-art')){const fallback=root.document.createElement('span');fallback.textContent='🎳';fallback.setAttribute('aria-label','Fotografía no disponible');img.replaceWith(fallback);}else img.remove();const hint=wrapper?.querySelector('.arsenal-photo-fallback');if(hint)hint.hidden=false;},true);"""
s=once(s,a,b)
s=once(s,'physicalHTML:b=>markup(physicalEntry(b),true,Boolean(b?.photo))','physicalHTML:b=>markup(physicalEntry(b),true,Boolean(b?.photo)),physicalArtHTML,physicalReferenceHTML:b=>markup(physicalEntry(b),true,Boolean(b?.photo),false)')
p.write_text(s)
print('CP008: card reference replaces generic art; personal photo and reference/fallback remain separate')
