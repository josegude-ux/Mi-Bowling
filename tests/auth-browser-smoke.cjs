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
const emailMock=pathToFileURL(path.join(__dirname,'auth-browser-email.html')).href;
function dumpWithBoundedRetry(url,width,height,budget,expected){
 let last=null;
 for(let attempt=1;attempt<=3;attempt++){
  const result=cp.spawnSync(chrome,[
   '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--allow-file-access-from-files','--disable-extensions','--window-size='+width+','+height,
   '--virtual-time-budget='+budget,'--dump-dom',url
  ],{encoding:'utf8',timeout:40000,maxBuffer:4*1024*1024});
  last=result;
  if(result.status===0&&result.stdout.includes(expected))return result;
  if(attempt<3)console.warn('Chromium: reintento limitado '+attempt+' por arranque incompleto en '+width);
 }
 assert.equal(last.status,0,'Chromium failed '+width+': '+(last.stderr||'').slice(-1000));
 assert.ok((last.stdout||'').includes(expected),
  'Chromium no renderizó '+expected+' a '+width+' px: '+(last.stdout||'').slice(-1600)+' stderr='+(last.stderr||'').slice(-800));
 return last;
}
for(const [width,height] of [[390,844],[768,1024],[1440,900]]){
 const result=dumpWithBoundedRetry(url,width,height,3500,'id="auth-form"');
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
 const auth=dumpWithBoundedRetry(mock,width,height,5000,'data-auth-mock-test="PASS"');
 assert.equal(auth.status,0,'Chromium fictitious login '+width);
 assert.ok(auth.stdout.includes('data-auth-mock-test="PASS"'),
  'Mock login '+width+': '+(auth.stdout.match(/data-auth-mock-error="([^"]*)"/)?.[1]||auth.stdout.slice(-1200)));
 console.log('OK · '+width+'x'+height+' · Login A/B mocked, offline denied, logout clears identity');
 const forms=dumpWithBoundedRetry(emailMock,width,height,7000,'data-auth-email-ui="PASS"');
 assert.equal(forms.status,0,'Chromium email workflow '+width);
 assert.ok(forms.stdout.includes('data-auth-email-ui="PASS"'),
  'Email and recovery UI '+width+': '+(forms.stdout.match(/data-auth-email-error="([^"]*)"/)?.[1]||forms.stdout.slice(-1400)));
 console.log('OK · '+width+'x'+height+' · Registration pending, confirmation resend, unconfirmed denied, recovery and new login');


}
