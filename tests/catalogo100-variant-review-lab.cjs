'use strict';
/* New, targeted regression ONLY for variant identity and explicit JSON handoff.
 * All data are fictitious. This does not rerun closed CP-001 acceptance suites.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),
 path=require('node:path'),http=require('node:http');
const ROOT=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const src=read('catalogo100-variant-policy.js'),app=read('app.js'),
 view=read('arsenal-view-lab.js'),index=read('index.html'),
 bridgeSource=read('catalogo100-mis-bolas-bridge.js');
for(const js of [src,app,view,bridgeSource])new vm.Script(js);
const ctx={};ctx.window=ctx;ctx.globalThis=ctx;
vm.runInNewContext(bridgeSource,ctx);vm.runInNewContext(src,ctx);
const policy=ctx.MiBowlingCatalog100VariantPolicy,bridge=ctx.MiBowlingCatalog100Bridge;
assert.equal(bridge.SEED.length,100);
const item=bridge.SEED.find(x=>x.model==='The Code Black');
const generic=bridge.SEED.find(x=>x.model==='Team Brunswick');
const newcomer=bridge.SEED.find(x=>x.model==='Black Widow 3.0 Ruby');
assert(item&&generic&&newcomer);
const already=[
 {id:'FICTICIA-2016',brand:'Storm',model:'The Code Black',weight:'15 lb',notes:'Unidad 2016 ficticia y taladro ficticio'},
 {id:'FICTICIA-GENERICO',brand:'Brunswick',model:'Team Brunswick',weight:'',notes:'Color/SKU por verificar'}
];
assert.equal(policy.inspect(item,already).kind,'name-collision');
assert.equal(policy.inspect(item,already).confirmedSameVariant,false);
assert.equal(policy.inspect({...item,model:'The Code Black (edition 2026)'},already).kind,'new-model-name');
assert.equal(policy.inspect(generic,already).kind,'name-collision');
const plan=policy.plan([item,generic,newcomer],already);
assert.equal(plan.add.length,1);assert.equal(plan.add[0].model,'Black Widow 3.0 Ruby');
assert.equal(plan.review.length,2);assert.equal(plan.proofOfVariant,false);
assert.deepEqual(JSON.parse(JSON.stringify(already)),[
 {id:'FICTICIA-2016',brand:'Storm',model:'The Code Black',weight:'15 lb',notes:'Unidad 2016 ficticia y taladro ficticio'},
 {id:'FICTICIA-GENERICO',brand:'Brunswick',model:'Team Brunswick',weight:'',notes:'Color/SKU por verificar'}
],'Policy is read only');
assert(view.includes('Coincidencia de nombre: edición, peso, SKU y unidad sin verificar'));
assert(app.includes('openCatalog100Manual('));
assert(app.includes('const planned=variantPolicy.plan(selected,db.balls)'));
assert(index.indexOf('catalogo100-variant-policy.js')>index.indexOf('catalogo100-mis-bolas-bridge.js'));
assert(index.indexOf('catalogo100-variant-policy.js')<index.indexOf('arsenal-view-lab.js'));
assert(!src.includes('localStorage.setItem')&&!src.includes('fetch('));
console.log('PASS VARIANT STATIC: old/new homonyms, unverified SKU/peso, explicit review, no writes');
if(!process.argv.includes('--browser'))process.exit(0);

const {chromium,webkit}=require('playwright');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript',
 '.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 const p=path.resolve(ROOT,'.'+(new URL(req.url,'http://127.0.0.1').pathname==='/'?
  '/index.html':decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname)));
 if(!p.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
 fs.readFile(p,(err,buffer)=>{
  if(err){res.writeHead(404).end();return}
  res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});
  res.end(buffer);
 });
});
const fakeDB={version:2,hand:'diestro',balls:already.map(x=>({
 ...x,kind:'Reactiva',photo:'',retired:false
})),patterns:[],sessions:[{id:'SESION-FICTICIA-001',type:'entrenamiento',
 date:'2026-11-10',title:'LAB sin información personal',games:[]}]};
const pick={__next__:['FICTICIA-2016']};
async function verify(kind,origin){
 const browser=await kind.launch({headless:true});
 const c=await browser.newContext({viewport:{width:390,height:844},
 isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await c.newPage(),
 errors=[],dialogs=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>{dialogs.push({type:d.type(),message:d.message()});d.accept()});
 try{
  await page.goto(origin,{waitUntil:'load'});
  await page.evaluate(({db,picks})=>{
   localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(db));
   localStorage.setItem('mi-bowling-ball-selection-v1',JSON.stringify(picks));
  },{db:fakeDB,picks:pick});
  await page.reload({waitUntil:'load'});
  const snapshot=await page.evaluate(()=>({
   balls:JSON.parse(JSON.stringify(db.balls)),
   sessions:JSON.parse(JSON.stringify(db.sessions)),
   selection:localStorage.getItem('mi-bowling-ball-selection-v1')
  }));
  await page.evaluate(()=>{go('bolas');setArsenalPanel('catalog100')});
  await page.locator('#arsenal-catalog-search').fill('The Code Black');
  assert.equal(await page.locator('.arsenal-model:visible').count(),1);
  assert.match(await page.locator('.arsenal-model:visible').innerText(),/Coincidencia de nombre/);
  assert.equal(await page.locator('.arsenal-model:visible').getByRole('button',{name:'Añadir a Mis bolas'}).count(),0);
  await page.locator('.arsenal-model:visible').getByRole('button',{name:/Revisar variante/}).click();
  assert(await page.locator('form input[name="brand"]').count()===1,'Manual form for another physical unit');
  assert.equal(await page.evaluate(()=>db.balls.length),2,'No automatic add before manual form');
  await page.locator('form input[name="brand"]').fill('Storm');
  await page.locator('form input[name="model"]').fill('The Code Black');
  await page.locator('form input[name="weight"]').fill('14 lb');
  await page.locator('form input[name="notes"]').fill('Edición 2026 FICTICIA; SKU y taladro pendientes');
  await page.locator('form button[type="submit"]').click();
  assert.equal(await page.evaluate(()=>db.balls.length),3,'Explicit manual second unit');
  const manual=await page.evaluate(()=>db.balls.slice());
  assert.equal(manual[0].notes,'Unidad 2016 ficticia y taladro ficticio','Older unit preserved');
  assert.equal(manual[2].weight,'14 lb','Explicit user-entered weight only');
  await page.evaluate(()=>setArsenalPanel('catalog100'));
  const chosen={schema:bridge.SCHEMA,items:[item,generic,newcomer].map(x=>({...x,selected:true}))};
  await page.locator('#catalog100-selection-file').setInputFiles({
   name:'SELECCION-IDENTIDADES-FICTICIAS.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(chosen))});
  await page.waitForFunction(()=>db.balls.length===4,{timeout:10000});
  const after=await page.evaluate(()=>({
   balls:JSON.parse(JSON.stringify(db.balls)),
   sessions:JSON.parse(JSON.stringify(db.sessions)),
   picks:localStorage.getItem('mi-bowling-ball-selection-v1')
  }));
  assert.equal(after.balls.length,4);
  assert(after.balls.some(x=>x.model==='Black Widow 3.0 Ruby'));
  assert.equal(after.balls[0].id,snapshot.balls[0].id);
  assert.deepEqual(after.balls.slice(0,2),snapshot.balls);
  assert.deepEqual(after.sessions,snapshot.sessions);
  assert.equal(after.picks,snapshot.selection);
  assert(dialogs.some(x=>x.message.includes('Se añadirán 1')&&
   x.message.includes('2 coincidencia(s)')),JSON.stringify(dialogs));
  assert(errors.length===0,errors.join('; '));
  console.log('PASS VARIANT '+(kind===chromium?'chromium':'webkit')+
   ' 390x844: homonym blocked, manual second unit, batch conflicts, original history and selections preserved');
 }finally{await c.close();await browser.close()}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const origin='http://127.0.0.1:'+server.address().port+'/';
  await verify(chromium,origin);await verify(webkit,origin)}
 finally{await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
