/* Prueba de UI real de perfiles MI BOWLING en Chromium, sin datos personales. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
let chrome=[process.env.BROWSER,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser']
  .filter(Boolean).find(v=>fs.existsSync(v));
if(!chrome){
 for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
  const find=cp.spawnSync('which',[cmd],{encoding:'utf8'});
  if(find.status===0){chrome=find.stdout.trim();break}
 }
}
assert.ok(chrome,'No hay Chromium para validar el selector');
const fixture=pathToFileURL(path.join(__dirname,'profiles-browser.html')).href;
const demo=pathToFileURL(path.join(__dirname,'..','lab','perfiles.html')).href;
for(const [w,h] of [[390,844],[768,1024],[1440,900]]){
 // La derivación WebCrypto del PIN se verifica en Node; --dump-dom finaliza demasiado pronto
 // para usarlo como verificación fiable de tareas criptográficas asíncronas en Chromium.
 for(const mode of ['simple']){
  const opts=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--allow-file-access-from-files','--disable-extensions','--window-size='+w+','+h,
    '--virtual-time-budget=9500','--dump-dom',fixture+'?mode='+mode+(mode==='pin'?'&pin=1':'')];
  const res=cp.spawnSync(chrome,opts,{encoding:'utf8',timeout:40000,maxBuffer:5*1024*1024});
  if(res.error)throw res.error;
  assert.equal(res.status,0,'Falló Chromium '+w+'/'+mode+': '+String(res.stderr).slice(-900));
  assert.ok(res.stdout.includes('data-profiles-test="PASS"'),
    'Fallo interfaz '+w+'/'+mode+': '+(res.stdout.match(/data-profiles-error="([^"]*)"/)||[])[1]+' · '+res.stdout.slice(0,1100)+' · '+String(res.stderr).slice(-400));
  console.log('OK · '+w+' × '+h+' · Selector, '+mode+', partida nueva y legado intacto');
 }
}

const probe=cp.spawnSync(chrome,[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--allow-file-access-from-files','--window-size=390,844',
  '--virtual-time-budget=3000','--dump-dom',demo
],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});
assert.equal(probe.status,0,'No se pudo cargar la vista previa LAB');
assert.ok(probe.stdout.includes('data-lab-safe="true"')&&probe.stdout.includes('id="player-show-create"'),
  'La vista previa LAB no muestra el selector seguro: '+probe.stdout.slice(0,750));
console.log('OK · Vista previa manual de perfiles LAB con almacenamiento temporal');
