/* UI integration smoke of PR8 + PR10 on 3 players, no storage outside fixture. */
'use strict';
const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
let chrome=[process.env.BROWSER,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser']
 .filter(Boolean).find(x=>fs.existsSync(x));
if(!chrome)for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
 const w=cp.spawnSync('which',[cmd],{encoding:'utf8'});
 if(w.status===0){chrome=w.stdout.trim();break}
}
assert.ok(chrome,'Chromium missing');
const page=pathToFileURL(path.join(__dirname,'perfiles-estadisticas-browser.html')).href;
const dir=path.join(__dirname,'artifacts-integracion');
fs.mkdirSync(dir,{recursive:true});
const layouts=[[390,844],[768,1024],[1440,900]];
for(const [width,height] of layouts){
 for(const player of ['a','b','c']){
  const url=page+'?player='+player;
  const opts=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--hide-scrollbars',
    '--allow-file-access-from-files','--disable-extensions','--window-size='+width+','+height,
    '--virtual-time-budget=4500'];
  const result=cp.spawnSync(chrome,[...opts,'--dump-dom',url],
    {encoding:'utf8',timeout:35000,maxBuffer:5*1024*1024});
  if(result.error)throw result.error;
  assert.equal(result.status,0,'Chromium failure '+width+'/'+player+': '+result.stderr.slice(-600));
  const err=result.stdout.match(/data-error="([^"]*)"/)?.[1];
  assert.ok(result.stdout.includes('data-profiles-stats-result="PASS"'),
    'Integration '+width+'/'+player+': '+(err||result.stdout.slice(-1200)));
  console.log('OK '+width+'x'+height+' · Jugador '+player.toUpperCase()+' · modos, estadísticas, filtros, restauración segura');
  if(width===390){
   const img=path.join(dir,'jugador-'+player+'-390.png');
   const shot=cp.spawnSync(chrome,[...opts,'--screenshot='+img,url],
     {encoding:'utf8',timeout:35000,maxBuffer:1024*1024});
   assert.equal(shot.status,0,'No screenshot for '+player);
   assert.ok(fs.existsSync(img)&&fs.statSync(img).size>10000,'Empty screenshot for '+player);
  }
 }
}
