'use strict';
/* 3.3.24 · Circular FEB 6246 sobre el calendario provisional FGB, sin tocar la transcripción original. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sb={};vm.runInNewContext(read('official-calendar-2026-2027.js'),sb);vm.runInNewContext(read('integracion/calendario-circulares.js'),sb);
const meta=JSON.parse(read('data/calendario-fgb-2026-2027.json'));
assert.deepEqual(JSON.parse(JSON.stringify(sb.BOWLING_OFFICIAL_CALENDAR_2026_27)),meta.events,'transcripción FGB intacta');
const conf=sb.BOWLING_CALENDAR_CONFIRMED;assert.deepEqual(Object.keys(conf).sort(),['FGB-2627-09','FGB-2627-10','FGB-2627-11','FGB-2627-12']);
for(const id in conf){const e=meta.events.find(x=>x.id===id);assert.equal(e.start,'2026-11-28');assert.equal(e.end,'2026-11-29');assert.match(conf[id].url,/^https:\/\/static\.febolos\.es\//);assert.match(conf[id].source,/6246/)}
assert.match(conf['FGB-2627-12'].venue,/Torrevieja/);assert.match(conf['FGB-2627-09'].venue,/Zaragoza/);assert.match(conf['FGB-2627-10'].venue,/X-Madrid/);assert.match(conf['FGB-2627-11'].venue,/Chamartín/);
const app=read('releases/catalogo-local-f1-fotos1/app.js');assert(app.includes('BOWLING_CALENDAR_CONFIRMED'));
assert(read('index.html').includes('integracion/calendario-circulares.js'));assert(read('sw.js').includes('./integracion/calendario-circulares.js'));
console.log('calendario-circulares: OK');
