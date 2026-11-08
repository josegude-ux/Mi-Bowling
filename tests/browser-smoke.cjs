/* Chrome/Chromium headless smoke test using only Node built-ins.
   Run: node tests/browser-smoke.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const {pathToFileURL}=require('node:url');
const browsers=[
  process.env.BROWSER,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);
let exe=browsers.find(candidate=>fs.existsSync(candidate));
if(!exe){
  for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    const found=cp.spawnSync('which',[name],{encoding:'utf8'});
    if(found.status===0){exe=found.stdout.trim();break;}
  }
}
assert.ok(exe,'Chrome/Chromium no encontrado: no se puede completar la validación en navegador');
const fixture=pathToFileURL(path.join(__dirname,'lane-browser.html')).href;
for(const [width,height] of [[390,844],[1440,900]]){
  const args=[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--hide-scrollbars','--disable-extensions','--allow-file-access-from-files',
    '--window-size='+width+','+height,'--virtual-time-budget=5000','--dump-dom',fixture
  ];
  const p=cp.spawnSync(exe,args,{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
  if(p.error)throw p.error;
  const html=p.stdout||'';
  assert.equal(p.status,0,'Chrome/Chromium falló ('+width+'px): '+String(p.stderr).slice(-1200));
  assert.ok(html.includes('data-result="PASS"'),'Prueba fallida ('+width+'px): '+html.slice(-1900)+'\n'+String(p.stderr).slice(-900));
  console.log('OK · Chrome/Chromium '+width+'x'+height+' · Marcadores, entradas y ancho adaptable');
}
