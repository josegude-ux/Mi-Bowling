'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'releases/catalogo-local-f1-fotos1/app.js'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function section(a,b){const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert(i>=0&&j>i,'Missing section '+a);return app.slice(i,j)}
const src=[
 section('function catalog100Cards(rows){','function filterCatalog100('),
 section('async function linkCatalog100Unit(id){','function arsenalInsightView(){'),
 section('function arsenalInsightView(){','function ballForm(){'),
 section('function retireBall(id){','function settings(){')
].join('\n');
const a={id:'fake-a',brand:'PRUEBA',model:'ACTIVA FICTICIA',photo:'foto-ficticia-A',notes:'ficticio',retired:false};
const r={id:'fake-r',brand:'PRUEBA',model:'RETIRADA FICTICIA',photo:'foto-ficticia-R',notes:'taladro ficticio',retired:true};
const db={version:2,hand:'diestro',balls:[a,r],patterns:[],sessions:[{id:'sesion-ficticia',games:[{rolls:[{ballId:r.id}]}]}]};
const history=JSON.stringify(db.sessions),photos=db.balls.map(x=>x.photo).join('|');
let chosen=[a.id,r.id],confirmed=true,saved=0,advisor=null,promptText='';
const p={physical:()=>null,img:()=>'<span loading="lazy">FOTO FICTICIA</span>',source:()=>'',count:()=>0,entries:[],controls:()=>'',catalog:()=>null};
const c={db,tab:'bolas',arsenalPanel:'list',arsenalIssue:'pocket',arsenalDetailId:'',arsenalCatalogQuery:'',ballPickTarget:'__next__',BALL_SELECTION_NEXT:'__next__',ballPickReturn:'inicio',ballEditingId:null,catalog100Rows:[],catalog100Busy:false,
 selectedBallsFor:()=>chosen.filter(id=>db.balls.some(b=>b.id===id&&!b.retired)),
 removeRetiredBallFromSelections:id=>{chosen=chosen.filter(x=>x!==id)},
 save:()=>{saved++},render:()=>{},confirm:()=>confirmed,prompt:txt=>{promptText=txt;return null},
 esc:v=>String(v??''),head:title=>'<h1>'+title+'</h1>',uiLineIcon:()=>'<svg></svg>',
 window:{MiBowlingFotosPrivadas:p,MiBowlingArsenalView:{render:opts=>{advisor=opts;return '<div class="fake-advisor"></div>'}}}
};
vm.runInNewContext(src+'\nthis.testApi={ballsView,arsenalInsightView,retireBall,restoreRetiredBall,retiredBallsSettings,catalog100Cards,linkCatalog100Unit}',c,{timeout:4000});
const api=c.testApi,live=api.ballsView();
assert(live.includes('ACTIVA FICTICIA')&&!live.includes('RETIRADA FICTICIA'),'Retired ball in live arsenal');
assert(!live.includes('mb-retired'),'Retired section still in arsenal');
assert(api.retiredBallsSettings().includes('RETIRADA FICTICIA'),'Retired settings missing');
assert(app.includes('retiredBallsSettings()}'),'Settings hook missing');
for(const mode of ['compare','assistant','catalog','detail']){c.arsenalPanel=mode;api.arsenalInsightView();assert(advisor&&advisor.balls.length===1&&advisor.balls[0].id===a.id,'Retired in '+mode)}
c.arsenalPanel='list';
const cards=api.catalog100Cards([{id:'fake-cat',brand:'FICTICIO',model:'REF FICTICIA',approved:'NO REAL',linked:[r.id],review:{matches:[{id:r.id}]}}]);
assert(!cards.includes('1 unidad(es) vinculada(s)'),'Retired association leaked into catalog');
c.catalog100Rows=[{id:'fake-cat',brand:'FICTICIO',model:'REF FICTICIA',approved:'NO REAL',review:{matches:[{id:r.id}]}}];
(async()=>{
 await api.linkCatalog100Unit('fake-cat');
 assert(promptText.includes('ACTIVA FICTICIA')&&!promptText.includes('RETIRADA FICTICIA'),'Catalog offered retired unit');
 api.retireBall(a.id);assert(a.retired&&!chosen.includes(a.id),'Retirement not applied');
 assert(!api.ballsView().includes('ACTIVA FICTICIA'),'Retired active ball still visible');
 api.restoreRetiredBall(a.id);assert(a.retired,'Restored outside Settings');
 c.tab='ajustes';confirmed=false;api.restoreRetiredBall(a.id);assert(a.retired,'Cancelled restore changed state');
 confirmed=true;api.restoreRetiredBall(a.id);assert(!a.retired,'Settings restore failed');
 assert(!chosen.includes(a.id),'Restored unit selected automatically');
 assert(saved===2&&db.balls.length===2,'Unexpected writes/deletions');
 assert(JSON.stringify(db.sessions)===history,'Historical rolls changed');
 assert(db.balls.map(x=>x.photo).join('|')===photos,'Photos changed');
 assert(app.includes("const KEY='mi-bowling-analitica-v2', OLDKEY='mi-bowling-v1'"),'Data schema key changed');
 assert(/const RELEASE="[^"]*cachefix2[^"]*cp030-retired-settings-v3332-nueva-compacta-prueba"/.test(sw),'Cachefix2 or candidate release marker missing');
 assert(!sw.includes('skipWaiting()'),'Forced SW activation');
 const hashes=JSON.parse(sw.match(/^const HASHES=(\{.*\});$/m)[1]);
 assert(Object.keys(hashes).length===68,'Expected 68 PWA hashes');
 for(const [url,digest] of Object.entries(hashes)){
  let rel=url.replace(/^\.\//,'').split('?')[0];if(!rel||rel.endsWith('/'))rel+='index.html';
  const file=path.resolve(root,rel);assert(file.startsWith(root+path.sep),'Unsafe path '+rel);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),digest,'Hash mismatch '+url);
 }
 console.log('CP030 PASS: only active balls, Settings-only restore, histories/photos intact, 68 PWA SHA256 checks.');
})().catch(e=>{console.error(e);process.exitCode=1});
