/* MI BOWLING LAB · cálculo real de precisión por bolo, regresión y aislamiento */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'stats-bolos.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const w={};w.window=w;w.render=function(){w.renders=(w.renders||0)+1};vm.createContext(w);
vm.runInContext(source,w,{filename:'stats-bolos.js',timeout:3000});
const api=w.MiBowlingPinStats;
const pin=(id)=>[id];
const A={
 first:[{pins:[1,2,3,4,5,6,7,8,9,10]},{pins:[1,2,3]}],
 opportunities:[
  {left:[4],second:[4],converted:true},
  {left:[4,5],second:[4],converted:false},
  {left:[7,10],second:[7,10],converted:true},
  {left:[1,3,6],second:[],converted:false}
 ]
};
const p=(list,n)=>list.pins[n-1];
const first=api.compute(A,'first');
assert.equal(first.events,2);
assert.equal(first.overallHit,13);
assert.equal(first.overallPossible,20);
assert.equal(first.overallRate,65);
assert.deepEqual([p(first,1).hit,p(first,1).attempts],[2,2]);
assert.deepEqual([p(first,10).hit,p(first,10).attempts],[1,2]);
const second=api.compute(A,'second');
assert.equal(second.events,4);
assert.equal(second.overallPossible,8);
assert.equal(second.overallHit,4);
assert.equal(second.overallRate,50);
assert.equal(second.converted,2);
assert.equal(second.spareRate,50);
assert.deepEqual([p(second,4).attempts,p(second,4).hit],[2,2]);
assert.equal(p(second,2).rate,null);
const single=api.compute(A,'single');
assert.equal(single.events,1);
assert.equal(single.overallRate,100);
assert.deepEqual([p(single,4).attempts,p(single,4).hit],[1,1]);
assert.equal(p(single,5).attempts,0);
const combos=api.compute(A,'combinations');
assert.equal(combos.events,3);
assert.equal(combos.overallPossible,7);
assert.equal(combos.overallHit,3);
assert.equal(combos.overallRate,42.9);
assert.equal(combos.converted,1);
assert.equal(combos.spareRate,33.3);
assert.equal(combos.combos.length,3);
assert.deepEqual(Array.from(combos.combos.find(v=>v.pins.join('-')==='7-10').pins),[7,10]);
assert.equal(api.compute({},'first').overallRate,null,'Never invent percentages with zero data');
assert.equal(api.compute({},'combinations').events,0);
assert.throws(()=>api.compute(A,'other'),/Modo/);
const before=JSON.stringify(A);
api.setMode('combinations');
assert.equal(api.getMode(),'combinations');
assert.equal(w.renders,1);
api.selectPin(7);
assert.equal(api.getSelectedPin(),7);
assert.equal(w.renders,2);
const view=api.html(A,{profileName:'Jugador A <script>alert(1)</script>',period:'year'});
assert.match(view,/Bolos 7 · 10/);
assert.match(view,/Combinaciones más frecuentes/);
assert.match(view,/Primer lanzamiento/);
assert.match(view,/2º lanzamiento/);
assert.match(view,/Bolos únicos/);
assert.match(view,/Combinaciones/);
assert.ok(!view.includes('<script>'),'Profile label must be escaped');
assert.ok(view.includes('Jugador A &lt;script&gt;'),'Profile label sanitized');
assert.equal((view.match(/class="pinmap-pin /g)||[]).length,10,'Exactly ten bowling pins');
assert.ok(view.includes('pinmap-period'),'Date filters kept');
assert.ok(view.includes('aria-pressed="true"'),'Selection state accessible');
assert.equal(JSON.stringify(A),before,'Analysis must not change source');
const B={first:[],opportunities:[]};
const empty=api.compute(B,'combinations');
assert.equal(empty.events,0);
assert.equal(empty.overallHit,0);
assert.equal(empty.overallRate,null);
const Bview=api.html(B,{profileName:'Jugador B'});
assert.ok(Bview.includes('Sin datos'));
assert.ok(!Bview.includes('3 de 7'),'No stats from other user must leak');
assert.ok(!/localStorage|indexedDB|sessionStorage|fetch\(/.test(source),'Statistics module must not read global data or network');
assert.ok(app.includes("MiBowlingPinStats.html(a,"),'Analysis must be fed filtered active player aggregate');
assert.ok(app.includes("pinAnalysisCombined(a)"),'Old pin analyses retained');
assert.ok(app.includes("const APP_VERSION='3.3.8-LAB-bolos-visual1'"),'Live app version unchanged');
for(const path of ['stats-bolos.css?v=1','stats-bolos.js?v=1','app.js?v=338-bolos-lab1']){
 assert.ok(html.includes(path),'Resource missing in HTML: '+path);
 assert.ok(sw.includes("'./"+path+"'"),'Offline resource missing: '+path);
}
assert.ok(html.indexOf('stats-bolos.js?v=1')<html.indexOf('app.js?v=338-bolos-lab1'));
console.log('OK · 4 modes, fractions and 10 bowling pins; no false percentages');
console.log('OK · 1st: 13/20, 2nd: 4/8, single 1/1, combinations 3/7 + 1/3 conversions');
console.log('OK · player A/B isolation, XSS escaping, source immutable, previous views retained');
console.log('OK · responsive module resources are precached by LAB service worker');
