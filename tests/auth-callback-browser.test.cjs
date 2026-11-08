/* MI BOWLING · LAB A3 · Chromium checks of real callback and isolated iOS/PWA mock. */
'use strict';
const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
let chrome=[process.env.BROWSER,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(x=>fs.existsSync(x));
if(!chrome)for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
 const r=cp.spawnSync('which',[name],{encoding:'utf8'});if(r.status===0){chrome=r.stdout.trim();break}
}
assert.ok(chrome,'Chromium not found');
const hex='ab'.repeat(32);
const real=pathToFileURL(path.join(__dirname,'..','auth','callback.html')).href;
const fake=pathToFileURL(path.join(__dirname,'auth-callback-browser.html')).href;
const screenshots=path.join(__dirname,'artifacts-callback');
fs.mkdirSync(screenshots,{recursive:true});
for(const [width,height] of [[390,844],[768,1024],[1440,900]]){
 const flags=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--allow-file-access-from-files','--disable-extensions','--window-size='+width+','+height,
  '--virtual-time-budget=3500'];
 for(const [label,url] of [
  ['disabled',real+'#token_hash='+hex+'&type=email'],
  ['email',fake+'#token_hash='+hex+'&type=email'],
  ['recovery',fake+'#token_hash='+hex+'&type=recovery']
 ]){
  const proc=cp.spawnSync(chrome,[...flags,'--dump-dom',url],{
   encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024
  });
  assert.equal(proc.status,0,'Chromium failed '+label+' '+width+': '+proc.stderr.slice(-450));
  if(label==='disabled'){
   assert.ok(proc.stdout.includes('id="auth-link-gate"'),'Real callback page not loaded '+width);
   assert.ok(proc.stdout.includes('Verificar enlace'),'Missing link validation view');
   assert.ok(proc.stdout.includes('Acceso')||proc.stdout.includes('LAB'),'Missing LAB indicator');
   assert.ok(proc.stdout.includes('disabled'),'A3 must be disabled without real backend');
  }else{
   const error=proc.stdout.match(/data-callback-error="([^"]*)"/)?.[1];
   assert.ok(proc.stdout.includes('data-callback-smoke="PASS"'),'Callback '+label+' failed at '+width+': '+(error||proc.stdout.slice(-1200)));
   assert.ok(proc.stdout.includes('data-callback-type="'+label+'"'),'Wrong callback type');
  }
  console.log('OK · '+width+'×'+height+' · '+label+' · Callback isolated from scorer/PWA');
 }
 const img=path.join(screenshots,'email-link-'+width+'.png');
 const shot=cp.spawnSync(chrome,[...flags,'--screenshot='+img,real+'#token_hash='+hex+'&type=email'],{
  encoding:'utf8',timeout:30000,maxBuffer:1024*1024
 });
 assert.equal(shot.status,0,'Chrome screenshot failed');
 assert.ok(fs.existsSync(img)&&fs.statSync(img).size>9000,'Empty callback screenshot');
}
