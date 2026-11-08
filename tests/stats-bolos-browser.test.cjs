/* Chromium smoke tests of original 3.3.8 app + visual pin stats. */
'use strict';
const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
let chrome=[process.env.BROWSER,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser']
 .filter(Boolean).find(x=>fs.existsSync(x));
if(!chrome)for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
 const r=cp.spawnSync('which',[name],{encoding:'utf8'});
 if(r.status===0){chrome=r.stdout.trim();break}
}
assert.ok(chrome,'Chromium is needed for UI verification');
const fixture=pathToFileURL(path.join(__dirname,'stats-bolos-browser.html')).href;
const out=path.join(__dirname,'artifacts-bolos');
fs.mkdirSync(out,{recursive:true});
for(const [width,height] of [[390,844],[768,1024],[1440,900]]){
 const flags=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--disable-extensions','--allow-file-access-from-files',
   '--hide-scrollbars','--window-size='+width+','+height,
   '--virtual-time-budget=5000'];
 const page=cp.spawnSync(chrome,[...flags,'--dump-dom',fixture],{
   encoding:'utf8',timeout:40000,maxBuffer:5*1024*1024
 });
 if(page.error)throw page.error;
 assert.equal(page.status,0,'Chrome exit failed '+width+': '+String(page.stderr).slice(-500));
 const failure=page.stdout.match(/data-browser-error="([^"]*)"/)?.[1];
 assert.ok(page.stdout.includes('data-browser-test="PASS"'),
   'App stats UI failure '+width+': '+(failure||page.stdout.slice(-1400)));
 console.log('OK · '+width+'×'+height+' · Four modes + actual scoring data + profile separation');
 const img=path.join(out,'estadisticas-bolos-'+width+'.png');
 const shot=cp.spawnSync(chrome,[...flags,'--screenshot='+img,fixture],{
   encoding:'utf8',timeout:40000,maxBuffer:1024*1024
 });
 assert.equal(shot.status,0,'Chrome screenshot error '+width);
 assert.ok(fs.existsSync(img)&&fs.statSync(img).size>10000,'Screenshot empty '+width);
}
