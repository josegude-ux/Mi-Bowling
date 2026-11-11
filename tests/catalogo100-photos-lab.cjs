'use strict';
/* node tests/catalogo100-photos-lab.cjs; datos 100 ficticios/sintéticos ya presentes en seed, sin PWA ni datos personales. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(dir,'catalogo-bolas/index.html'),'utf8');
const seed=JSON.parse(html.match(/<script id="seed" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(dir,'catalogo-bolas/photo-registry-lab.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(path.join(dir,'catalogo-bolas/photo-view-lab.js'),'utf8'),context);
const registry=context.window.MiBowlingPhotoLab,view=context.window.MiBowlingPhotoView;
assert.equal(seed.length,100);assert.equal(registry.entries.length,100);
assert.equal(new Set(registry.entries.map(e=>e.id)).size,100);
for(const item of seed){const x=registry.get(item);assert(x,'Cada ID, marca, edición y fecha coincide');assert.equal(x.rightsStatus,'PENDIENTE');assert.equal(x.assetPath,null);assert.equal(x.rightsEvidenceRef,null);assert.equal(view.hasPhoto(item),false);}
assert.equal(registry.summary.officialPages,14);assert.equal(registry.summary.candidates,1);
assert.equal(registry.summary.licensed,0);assert.equal(registry.entries.filter(x=>x.matchStatus==='pendiente').length,85);
const stub='<div class="placeholder">Foto real pendiente</div>';
for(const item of seed){const out=view.photoHTML(item,stub);assert(!out.includes('<img'),'No debe mostrarse una imagen sin permiso');assert(out.includes('Foto real pendiente'));}
const injection={...seed[0],image:'https://unlicensed.example/test.jpg'};
assert(!view.photoHTML(injection,stub).includes('<img'),'URL de ficha no concede autorización');
assert(!view.photoHTML(seed[15],stub).includes('Ver página oficial'),'Team Brunswick White no debe pasar como coincidencia USBC exacta');
assert(view.photoHTML(seed[0],stub).includes('Ver página oficial'),'La página oficial exacta se enlaza sin embeber');
assert(!registry.get({...seed[0],model:'modelo manipulado'}),'Bloqueo de variante no coincidente');
const fake={...registry.entries[0],rightsStatus:'CONCEDIDA',rightsHolder:'Titular ficticio acreditado',rightsEvidenceRef:'FAKE-LICENSE-TEST-0001',rightsScope:['web','pwa'],rightsExpiry:'2099-12-31',assetPath:'./licensed-ball-photos/'+seed[0].id+'.webp'};
assert.equal(view.approvedAsset(fake,Date.parse('2026-11-11T00:00:00Z')),fake.assetPath,'Solo activo local con evidencia y alcance correcto');
assert.equal(view.approvedAsset({...fake,rightsStatus:'REVOCADA'},0),null);
assert.equal(view.approvedAsset({...fake,rightsEvidenceRef:null},0),null);
assert.equal(view.approvedAsset({...fake,assetPath:'https://example.com/foreign.jpg'},0),null);
assert.equal(view.approvedAsset({...fake,rightsExpiry:'2020-01-01'},Date.parse('2026-11-11T00:00:00Z')),null);
assert.equal(view.approvedAsset({...fake,rightsScope:['web']},0),null);
assert(html.includes('photo-lab-responsive')&&html.includes('photo-registry-lab.js')&&html.includes('photo-view-lab.js'));
assert(html.includes('MiBowlingPhotoView.hasPhoto(x)'),'Filtro y contador solo fotos autorizadas');
assert(!html.includes("$('#modalImage').innerHTML=x.image?"),'La URL arbitraria no se renderiza en modal');
assert(!html.includes("function photoHTML(x){return x.image?"),'La URL arbitraria no se renderiza en las tarjetas');
console.log('PASS LAB photos: 100/100 IDs exactos, 14 páginas, 1 candidata, 85 pendientes, 0 licencias; bloqueos de foto sin permiso y pruebas ficticias de concesión, revocación, expiración, hotlink y variante.');
