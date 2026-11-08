/* MI BOWLING Auth LAB · Smoke in real Chromium (unconfigured login fail-closed). */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
let chrome=[process.env.BROWSER,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser']
 .filter(Boolean).find(x=>fs.existsSync(x));
if(!chrome)for(const n of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
 const w=cp.spawnSync('which',[n],{encoding:'utf8'});if(w.status===0){chrome=w.stdout.trim();break}
}
assert.ok(chrome,'Chromium missing');
const url=pathToFileURL(path.join(__dirname,'..','index.html')).href;
const mock=pathToFileURL(path.join(__dirname,'auth-browser-mock.html')).href;
for(const [width,height] of [[390,844],[768,1024],[1440,900]]){
 const result=cp.spawnSync(chrome,[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--allow-file-access-from-files','--disable-extensions','--window-size='+width+','+height,
  '--virtual-time-budget=2500','--dump-dom',url
 ],{encoding:'utf8',timeout:25000,maxBuffer:3*1024*1024});
 assert.equal(result.status,0,'Chromium process error '+width);
 assert.ok(result.stdout.includes('id="auth-form"'),'Login form missing '+width);
 assert.ok(result.stdout.includes('auth-lab-primary" disabled'),'Unconfigured login is not disabled '+width);
 assert.ok(result.stdout.includes('Acceso deshabilitado'),'Missing explicit fail-closed status');
 assert.ok(result.stdout.includes('type="email"'),'Email input missing');
 assert.ok(result.stdout.includes('type="password"'),'Password input missing');
 assert.ok(!result.stdout.includes('<script src="app.js'),'The app must not be imported');
 const scan=result.stdout.match(/<body[\s\S]*?<\/body>/)?.[0]||'';
 assert.ok(scan.includes('auth-stage'),'Auth-only screen missing');
 console.log('OK · '+width+'x'+height+' · Login visible; no provider, no data access, no app boot');
 const auth=cp.spawnSync(chrome,[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--allow-file-access-from-files','--disable-extensions','--window-size='+width+','+height,
  '--virtual-time-budget=5000','--dump-dom',mock
 ],{encoding:'utf8',timeout:25000,maxBuffer:3*1024*1024});
 assert.equal(auth.status,0,'Chromium fictitious login '+width);
 assert.ok(auth.stdout.includes('data-auth-mock-test="PASS"'),
  'Mock login '+width+': '+(auth.stdout.match(/data-auth-mock-error="([^"]*)"/)?.[1]||auth.stdout.slice(-1200)));
 console.log('OK · '+width+'x'+height+' · Login A/B mocked, offline denied, logout clears identity');

}
