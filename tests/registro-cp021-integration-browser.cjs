'use strict';
// CP021: new integration-only test, synthetic lab browser origin. No historic suite is repeated.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const recorded={
 'lab/registro-cp021/cp013-engine.js':'72b3b386f0ef443c4dc4457ca06ee754b73e3589f906adcb43d156fedd6e1bc8',
 'lab/registro-cp021/cp014-compat-bridge.js':'f192167c7c10a6508d4839a4b9a09a6eef22b75fe1b4e4ee7f2ea86366bd7921',
 'lab/registro-cp021/cp016-readonly-coexist.js':'9bcb20438bccf40b95439a1cac63d95ed5dbeddb2acc9856f9e0fe353d783a82',
 'lab/registro-cp021/cp015-controller-mount.js':'033d17135ab7c16d704b249d3d9d81b7a7c7d9c299d6b64bc2e9d878687299b1',
 'lab/registro-cp021/cp021-entry.js':'4b10b99d1bfef2bd906ab3f733d37a513576f5ff7fd49b412549213b5cfb9c8b',
 'lab/registro-cp021/cp018-persistence.js':'1cd4d8d7ff66f93049a940888ccfe34df2c14ed42f1831fa3cdd61b46e13942a',
};
const script=fs.readFileSync(path.join(root,'sw.js'),'utf8'),h=script.match(/^const HASHES=(\{.*\});$/m);
assert(h,'Cache manifest not found');
const hashes=JSON.parse(h[1]);
assert.equal(Object.keys(hashes).length,66);
for(const [file,expected] of Object.entries(recorded)){
 const src=fs.readFileSync(path.join(root,file));
 assert.equal(digest(src),expected,'CP021 source modified unexpectedly: '+file);
 assert.equal(hashes['./'+file],expected,'CP021 resource missing from SW: '+file);
}
for(const file of ['index.html','releases/catalogo-local-f1-fotos1/app.js'])
 assert.equal(hashes[file==='index.html'?'./index.html':'./'+file],digest(fs.readFileSync(path.join(root,file))),'Modified resource manifest hash');
const mime={'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.txt':'text/plain'};
const server=http.createServer((req,res)=>{
 try{const url=new URL(req.url,'http://127.0.0.1');let rel=decodeURIComponent(url.pathname);if(rel.endsWith('/'))rel+='index.html';rel=rel.replace(/^\/+/,'');const abs=path.resolve(root,rel);
 if(!abs.startsWith(root+path.sep)){res.writeHead(403).end();return}
 const content=fs.readFileSync(abs);
 res.writeHead(200,{'Content-Type':mime[path.extname(rel)]||'application/octet-stream','Cache-Control':'no-store'}).end(content);
 }catch(e){res.writeHead(404).end();}
});
async function browserChecks(){
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,667],[390,844],[430,932]]){
   const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block',isMobile:true,hasTouch:true});
   const page=await ctx.newPage(),errors=[],external=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const url=route.request().url();if(url.startsWith('data:')||new URL(url).origin===origin)route.continue();else{external.push(url);route.abort()}
   });
   try{
    await page.goto(origin+'/?cp021lab=ficticio',{waitUntil:'load',timeout:30000});
    await page.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB,null,{timeout:30000});
    let state=await page.evaluate(()=>window.__CP015_LAB.snapshot());
    assert.equal(state.document.labFixture,'cp015-synthetic-only');
    assert.equal(state.document.sessions[0].id,'cp015-fake-session-01');
    for(const mode of ['bolos','cantidad','final']){
     await page.locator('#tab-'+mode).click();
     const v=await page.evaluate(()=>({
      w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,
      topbar:getComputedStyle(document.querySelector('.topbar')).display,
      mode:document.querySelector('[aria-selected=true][data-mode]')?.dataset.mode,
      minHeight:Math.min(...[...document.querySelectorAll('.cp021-root button')].filter(x=>x.getClientRects().length).map(x=>x.getBoundingClientRect().height))
     }));
     assert.equal(v.scrollW,width,'horizontal overflow: '+mode+' '+JSON.stringify(v));
     assert.equal(v.scrollH,height,'vertical overflow: '+mode+' '+JSON.stringify(v));
     assert.equal(v.topbar,'none');
     assert.equal(v.mode,mode);
     assert(v.minHeight>=44,'Touch height insufficient '+JSON.stringify(v));
    }
    await page.locator('#tab-cantidad').click();
    await page.locator('[data-key="7"]').click();
    await page.locator('#submit').click();
    state=await page.evaluate(()=>window.__CP015_LAB.snapshot());
    const roll=state.document.sessions[0].games[0].rolls[0];
    assert.equal(roll.count,7);assert.equal(roll.pinIds,null);
    const dual=await page.evaluate(()=>{
     const C=window.BowlingCp016Coexist;
     return window.MiBowlingRegistroCP021.summarySynthetic(JSON.stringify(C.buildLegacyFixture()),JSON.stringify(C.buildFinalFixture(278))).stats;
    });
    assert.equal(dual.averageScore,289);
    assert.equal(dual.pinPatternEligibleGames,1);
    // Incremental CP018 integration: actual isolated IndexedDB, explicit synthetic action only.
    if(width===390){
     const before=await page.evaluate(()=>['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-liga-v1','mi-bowling-ball-selection-v1'].map(key=>localStorage.getItem(key)));
     const migrated=await page.evaluate(()=>window.MiBowlingRegistroCP021.migrateSynthetic());
     assert.equal(migrated.result.mode,'shadow-v3');
     assert.equal(migrated.result.stats.averageScore,289);
     assert.equal(migrated.result.stats.pinPatternEligibleGames,1);
     const names=await page.evaluate(()=>indexedDB.databases().then(d=>d.map(x=>x.name)));
     assert(names.includes('mi-bowling-cp018-synthetic-v3'));
     const after=await page.evaluate(()=>['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-liga-v1','mi-bowling-ball-selection-v1'].map(key=>localStorage.getItem(key)));
     assert.deepEqual(after,before,'CP018 changed legacy storage keys');
     await page.reload({waitUntil:'load',timeout:30000});
     await page.waitForFunction(()=>window.MiBowlingRegistroCP021?.enabled&&!!window.__CP015_LAB,null,{timeout:30000});
     const reopened=await page.evaluate(()=>window.MiBowlingRegistroCP021.inspectSynthetic());
     assert.equal(reopened.mode,'shadow-v3');
     assert.equal(reopened.stats.averageScore,289);
     const reverted=await page.evaluate(()=>window.MiBowlingRegistroCP021.rollbackSynthetic());
     assert.equal(reverted.mode,'dual-read');
     assert.equal(reverted.stats.averageScore,289);
     const retest=await page.evaluate(()=>window.MiBowlingRegistroCP021.recoverSynthetic());
     assert.equal(retest.mode,'dual-read');
     console.log('CP021 REAL IDB PASS: synthetic CP018 shadow, reload, legacy keys unchanged, rollback/recovery');
    }
    assert.deepEqual(errors,[]);
    assert.deepEqual(external,[]);
    console.log('CP021 INTEGRATED PASS '+width+'x'+height+' 3 modes no scroll, 44px, synthetic quantity, v2/v3 average 289');
   }finally{await ctx.close()}
  }
  console.log('CP021 RESULT PASS: existing PWA route works in isolated synthetic origin. No IndexedDB, no live migration, no publishing.');
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
}
browserChecks().catch(e=>{console.error('CP021 RESULT FAIL:',e.stack||e);process.exitCode=1;});
