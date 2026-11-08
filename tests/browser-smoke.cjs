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
const demo=pathToFileURL(path.join(__dirname,'..','lab','demo.html')).href+'?smoke=1';
const fullApp=pathToFileURL(path.join(__dirname,'..','lab','app.html')).href+'?smoke=1';
const shotFolder=path.join(__dirname,'artifacts');fs.mkdirSync(shotFolder,{recursive:true});
for(const [width,height] of [[390,844],[768,1024],[1440,900]]){
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
  console.log('OK · Chrome/Chromium '+width+'x'+height+' · 3D, cámara, zoom, sincronización 2D y ancho adaptable');
  const sample=cp.spawnSync(exe,[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--hide-scrollbars','--disable-extensions','--allow-file-access-from-files',
    '--window-size='+width+','+height,'--virtual-time-budget=5000',
    '--dump-dom',demo
  ],{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
  assert.equal(sample.status,0,'Falló la demo interactiva a '+width+'px: '+String(sample.stderr).slice(-700));
  assert.ok(sample.stdout.includes('data-demo-test="PASS"'),'La demo no supera sus pruebas a '+width+'px: '+sample.stdout.slice(-1200));
  console.log('OK · Demo interactiva '+width+'x'+height+' · Ejemplos, tiros ficticios y reinicio sin persistencia');
  const full=cp.spawnSync(exe,[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--hide-scrollbars','--disable-extensions','--allow-file-access-from-files',
    '--window-size='+width+','+height,'--virtual-time-budget=6000','--dump-dom',fullApp
  ],{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
  assert.equal(full.status,0,'Falló el inicio de MI BOWLING LAB '+width+'px: '+String(full.stderr).slice(-700));
  assert.ok(full.stdout.includes('data-lab-isolated="true"'),'Almacenamiento temporal no aislado '+width+'px: '+full.stdout.slice(-1200));
  assert.ok(full.stdout.includes('data-full-app-test="PASS"'),'La app LAB no supera prueba integrada '+width+'px: '+full.stdout.slice(-1400));
  console.log('OK · MI BOWLING LAB completo '+width+'x'+height+' · sesión ficticia y registro seguro');
  const screenshot=path.join(shotFolder,'pista-3d-'+width+'.png');
  const shot=cp.spawnSync(exe,[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--hide-scrollbars','--disable-extensions','--allow-file-access-from-files',
    '--window-size='+width+','+height,'--virtual-time-budget=5000',
    '--screenshot='+screenshot,fixture
  ],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.equal(shot.status,0,'Error al generar captura LAB a '+width+'px: '+String(shot.stderr).slice(-800));
  assert.ok(fs.existsSync(screenshot)&&fs.statSync(screenshot).size>10000,'Captura LAB vacía a '+width+'px');
}
