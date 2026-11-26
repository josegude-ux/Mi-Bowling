'use strict';
// MI BOWLING LAB · Circular 6249, 26/11/2026 · revisión de fuente exacta
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const before=read('official-calendar-2026-2027.js'),body=read('integracion/calendario-circulares.js'),sw=read('sw.js');
const ctx={};vm.runInNewContext(before,ctx);const baseline=JSON.stringify(ctx.BOWLING_OFFICIAL_CALENDAR_2026_27);
vm.runInNewContext(body,ctx);
const C=ctx.BOWLING_CIRCULAR_6249,events=ctx.BOWLING_CALENDAR_CONFIRMED;
assert(C&&Object.isFrozen(C.participants));assert.equal(C.participants.length,161);
assert.equal(new Set(C.participants.map(x=>x.code)).size,161);
for(const [id,num] of Object.entries({'FGB-2627-09':40,'FGB-2627-10':32,'FGB-2627-11':55,'FGB-2627-12':34})){
 assert.equal(C.participants.filter(x=>x.event===id).length,num,id);
 assert(events[id].source.includes('6246'));assert(events[id].details.some(x=>x.includes('6249')));
 assert(events[id].details.some(x=>x.includes('Pista ')));
}
assert.equal(JSON.stringify(ctx.BOWLING_OFFICIAL_CALENDAR_2026_27),baseline,'Calendario FGB original intacto');
const c=C.participants.filter(x=>x.event==='FGB-2627-10'&&x.pair==='CELTA XUNTA');
assert.deepEqual(Array.from(c,x=>x.code).sort(),['ES 0147','ES 1046']);
assert(c.every(x=>x.lane===17&&x.turn===0),'Turno impreso 0 debe quedar sin normalizar');
assert.equal(C.patterns['FGB-2627-10'].oil_distance_ft,41);
assert.equal(C.patterns['FGB-2627-10'].volume_ml,26.5);
assert.equal(C.patterns['FGB-2627-12'].ratio,'1.94:1');
assert.equal(C.patterns['FGB-2627-09'].oil_distance_ft,null);
assert.equal(C.patterns['FGB-2627-11'].oil_distance_ft,null);
const groups=Object.values(events).reduce((sum,e)=>sum+e.details.filter(x=>/^Pista |^Turno \d+ · Pista /.test(x)).length,0);
assert.equal(groups,82,'82 asignaciones por pista y grupo');
const hash=crypto.createHash('sha256').update(body).digest('hex');
assert(sw.includes('"./integracion/calendario-circulares.js":"'+hash+'"'),'SW cache digest exacto');
assert(!/localStorage\.|indexedDB\.|fetch\(|\.sessions\.push\(/.test(body),'Capa circular libre de escrituras/lecturas de datos personales');
console.log('Circular FEB 6249 LAB: PASS · 161 jugadores · 4 patrones · 82 grupos · cache OK · Celta turno 0');
