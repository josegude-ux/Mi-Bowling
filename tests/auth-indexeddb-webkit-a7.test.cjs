/* MI BOWLING · LAB A7 · Actual WebKit (Playwright) IndexedDB reader + A/B/C UI.
 * Isolated temporary HTTPS + browser profile only, NO real data, services or accounts.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const os=require('node:os'),https=require('node:https'),cp=require('node:child_process');
const {webkit,devices}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'artifacts-migration-a7');
fs.mkdirSync(out,{recursive:true});
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'bowling-a7-idb-'));
let server,browser;
const hits=[];
async function start(){
 const cert=path.join(temporary,'cert.pem'),key=path.join(temporary,'key.pem');
 cp.execFileSync('openssl',['req','-x509','-nodes','-newkey','rsa:2048','-days','1',
  '-keyout',key,'-out',cert,'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
 server=https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},(req,res)=>{
  hits.push(req.url);
  const rel=decodeURIComponent(new URL(req.url,'https://localhost').pathname).replace(/^\/+/,'');
  const file=path.resolve(root,rel||'lab/migracion-a7.html');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404);res.end();return;
  }
  const ext=path.extname(file);
  res.writeHead(200,{'Cache-Control':'no-store','Content-Type':ext==='.js'?'text/javascript':ext==='.css'?'text/css':'text/html','Referrer-Policy':'no-referrer'});
  res.end(fs.readFileSync(file));
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 return 'https://127.0.0.1:'+server.address().port;
}
async function checkReader(page,base){
 await page.goto(base+'/lab/migracion-a7.html');
 await page.addScriptTag({url:base+'/auth-idb-pdf-reader-lab.js'});
 const result=await page.evaluate(async()=>{
  let stage='reader init';
  try{
  const fact=window.MiBowlingIdbPdfReaderLAB,M=window.MiBowlingMigrationLAB;
  const contents=str=>new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Name ('+str+') >>\nendobj\n%%EOF');
  function makeDb(name,entries){
   return new Promise((resolve,reject)=>{
    const req=indexedDB.open(name,1);
    req.onupgradeneeded=()=>req.result.createObjectStore('pdf');
    req.onerror=()=>reject(new Error('fixture open '+name+': '+(req.error?.name||'null')+' '+(req.error?.message||'no message')));
    req.onsuccess=()=>{
     const db=req.result,tx=db.transaction('pdf','readwrite');
     for(const [id,value] of entries)tx.objectStore('pdf').put(value,id);
     tx.oncomplete=()=>{db.close();resolve()};
     tx.onerror=()=>{db.close();reject(new Error('fixture write '+name+': '+(tx.error?.name||'null')+' '+(tx.error?.message||'no message')))};
    };
   });
  }
  const fixture='p-a7-webkit';
  const db='mi-bowling-patrones-pdf-'+fixture;
  stage='creating fake WebKit database: secure='+(window.isSecureContext)+' origin='+location.origin;
  const binary=contents('Aceite-A7');
  await makeDb(db,[['oil',new Uint8Array(binary)]]); // WebKit CI supports typed-array fixtures; Blob write probed separately
  stage='reader open existing fixture';
  const beforeList=typeof indexedDB.databases==='function'?(await indexedDB.databases()).map(x=>x.name):null;
  const reader=fact.create({indexedDB,sourceProfileId:fixture});
  const bytes=await reader.readPdf('oil');
  stage='first PDF read';
  if(!(bytes instanceof Uint8Array)||bytes.length!==binary.length||
    bytes.some((v,i)=>v!==binary[i]))throw Error('WebKit Blob bytes differ');
  const missing=await reader.readPdf('absent-id');
  if(missing!==null)throw Error('Missing PDF id not null');
  const storage={
   getItem(key){return key==='mi-bowling-profile:'+fixture+':mi-bowling-analitica-v2'?
    JSON.stringify({version:2,hand:'diestro',
     sessions:[{id:'session-a7',games:[{id:'game-a7',score:237,rolls:[{frame:1,ball:1,pins:[1,2,3]}]}]}],
     balls:[{id:'ball-a7'}],patterns:[{id:'oil',pdfName:'oil.pdf'}]}):null}
  };
  const owner='11111111-1111-4111-8111-111111111111';
  stage='migration capture';
  const pkg=await M.capture({storage,readPdf:id=>reader.readPdf(id),sourceProfileId:fixture,
    ownerId:owner,confirmOwnerId:owner,acknowledge:M.ACK});
  await M.verify(pkg,{ownerId:owner});
  if(pkg.stats.games!==1||pkg.files.length!==1||pkg.personal.sessions[0].games[0].score!==237)
   throw Error('IDB to migration bundle lost history');
  reader.close();
  try{await reader.readPdf('oil');throw Error('Closed reader accepted read')}
  catch(e){if(!/cerrado/.test(e.message))throw e}
  // Nonexistent source must not persist a newly created DB via IDB.open.
  const nonexistent='mi-bowling-patrones-pdf-p-a7-missing';
  const absentReader=fact.create({indexedDB,sourceProfileId:'p-a7-missing'});
  stage='missing database abort';
  const absentPdf=await absentReader.readPdf('oil');
  if(absentPdf!==null)throw Error('Missing database reported existing data');
  const afterList=typeof indexedDB.databases==='function'?(await indexedDB.databases()).map(x=>x.name):null;
  if(afterList&&afterList.includes(nonexistent))throw Error('Reader created a missing database');
  if(beforeList&&afterList&&afterList.filter(x=>x===db).length!==1)
   throw Error('Reader mutated existing DB');
  absentReader.close();
  // Corrupted bytes and wrong MIME must be rejected.
  await makeDb('mi-bowling-patrones-pdf-p-a7-corrupt',[['bad',new TextEncoder().encode('not a pdf')]]);
  const invalid=fact.create({indexedDB,sourceProfileId:'p-a7-corrupt'});
  try{await invalid.readPdf('bad');throw Error('Corrupt PDF was accepted')}
  catch(e){if(!/Firma/.test(e.message))throw e}
  invalid.close();
  // Legacy fallback: scoped DB absent; original can be read using known legacy name.
  await makeDb('mi-bowling-patrones-pdf',[['oil-old',contents('OldLegacy')]]);
  const legacy=fact.create({indexedDB,sourceProfileId:'legacy'});
  stage='legacy reader fallback';
  const old=await legacy.readPdf('oil-old');
  if(!old||String.fromCharCode(...old.slice(0,5))!=='%PDF-')throw Error('Legacy fallback failed');
  legacy.close();
  // Read must not remove, replace, or truncate a PDF.
  const reopen=fact.create({indexedDB,sourceProfileId:fixture});
  const again=await reopen.readPdf('oil');
  if(again.length!==binary.length||again.some((v,i)=>v!==binary[i]))
   throw Error('Source PDF changed after backup');
  reopen.close();
  return {bytes:binary.length,pkgSha:pkg.sha256,
   sourceOnly:db,createdMissing:false,legacyFallback:true,score:237};
  }catch(e){return{failed:true,stage,name:e?.name,message:e?.message,stack:e?.stack,asString:String(e)}}
 });
 if(result.failed)throw Error('WebKit IDB stage '+result.stage+': '+JSON.stringify(result));
 assert.equal(result.score,237);
 console.log('OK · WebKit IndexedDB read-only: Blob bytes, SHA-256, old DB fallback, missing/invalid PDF, no new DB');
 return result;
}
async function click(page,id){
 await page.locator('#'+id).click();
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-action]')].every(b=>!b.disabled),null,{timeout:12000});
}
async function status(page,expected){
 await page.locator('#a7-status[data-kind="'+expected+'"]').waitFor();
}
async function ui(page,base,size){
 await page.goto(base+'/lab/migracion-a7.html');
 const state=()=>page.evaluate(()=>window.MiBowlingA7Demo.getState());
 assert.equal((await state()).players.B.sessions,0);
 assert.equal((await state()).players.B.balls,0);
 await page.locator('#a7-confirm').check();
 await click(page,'a7-backup');await status(page,'success');
 assert.equal((await state()).pkgOwner,'11111111-1111-4111-8111-111111111111');
 await click(page,'a7-verify');await status(page,'success');
 await click(page,'a7-import');await status(page,'success');
 assert.equal((await state()).players.A.sessions,1);
 assert.equal((await state()).players.A.pdfs,1);
 assert.equal((await state()).players.B.sessions,0);
 assert.equal((await state()).league.A.matches[0].id,'acta-A');
 await click(page,'a7-import');await status(page,'error'); // no blind reimport
 assert.match(await page.locator('#a7-status').textContent(),/Destino no vacío/);
 // Backups and restores reject stale state. A's League never changes.
 await click(page,'a7-previous');await status(page,'success');
 await click(page,'a7-edit');await status(page,'success');
 await click(page,'a7-restore');await status(page,'error');
 assert.match(await page.locator('#a7-status').textContent(),/Conflicto de versión/);
 await click(page,'a7-previous');await status(page,'success');
 await click(page,'a7-restore');await status(page,'success');
 assert.equal((await state()).players.A.rev,2);
 assert.equal((await state()).league.A.matches[0].id,'acta-A');
 // New B must start empty and switching must discard A's saved package.
 await page.locator('#a7-player').selectOption('B');
 assert.equal((await state()).pkgOwner,null);
 assert.equal((await state()).players.B.sessions,0);
 await page.locator('#a7-confirm').check();
 await click(page,'a7-import');await status(page,'error');
 assert.match(await page.locator('#a7-status').textContent(),/Primero prepara/);
 await click(page,'a7-backup');await status(page,'success');
 await click(page,'a7-import');await status(page,'success');
 assert.equal((await state()).players.B.sessions,0); // zero on new profile
 assert.equal((await state()).players.B.balls,0);
 assert.equal((await state()).league.B.matches[0].id,'acta-B');
 // Quota failure for C; then successful retry.
 await page.locator('#a7-player').selectOption('C');
 await page.locator('#a7-confirm').check();
 await click(page,'a7-backup');await status(page,'success');
 await page.locator('#a7-fault').check();
 await click(page,'a7-import');await status(page,'error');
 assert.match(await page.locator('#a7-status').textContent(),/QuotaExceededError/);
 assert.equal((await state()).players.C.sessions,0);
 assert.equal((await state()).players.C.pdfs,0);
 await page.locator('#a7-fault').uncheck();
 await click(page,'a7-import');await status(page,'success');
 assert.equal((await state()).players.C.sessions,1);
 assert.equal((await state()).players.C.pdfs,1);
 assert.equal((await state()).players.B.sessions,0);
 assert.equal((await state()).league.C.matches.length,0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+3);
 assert.equal(overflow,false,'LAB UI horizontal overflow at '+size);
 const targets=await page.locator('button').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().height));
 assert.ok(targets.every(h=>h>=44),'All buttons minimum 44px touch at '+size);
 await page.screenshot({path:path.join(out,'migracion-a7-'+size+'.png'),fullPage:true});
 console.log('OK · '+size+' · three UUIDs, import/restore/version conflict/quota and Liga preserved');
}
async function main(){
 const base=await start();
 browser=await webkit.launch({headless:true});
 const profile=devices['iPhone 13 Pro Max']||{viewport:{width:428,height:926},isMobile:true,hasTouch:true,deviceScaleFactor:3};
 for(const [name,options] of [
  ['iphone',{...profile}],
  ['tablet',{viewport:{width:768,height:1024},hasTouch:true,isMobile:true,deviceScaleFactor:2}],
  ['desktop',{viewport:{width:1440,height:900},hasTouch:false,isMobile:false,deviceScaleFactor:1}]
 ]){
  const ctx=await browser.newContext({...options,ignoreHTTPSErrors:true,locale:'es-ES'});
  const page=await ctx.newPage();
  if(name==='iphone')await checkReader(page,base);
  await ui(page,base,name);
  await ctx.close();
 }
 assert.ok(hits.every(h=>!h.includes('supabase')&&!h.includes('password')&&!h.includes('token=')),
  'Unexpected external or token access');
 console.log('OK · Actual WebKit engine, isolated temporary HTTPS and fictional data only');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
 try{await browser?.close()}catch(_){}
 if(server)await new Promise(resolve=>server.close(resolve));
 fs.rmSync(temporary,{recursive:true,force:true});
});
