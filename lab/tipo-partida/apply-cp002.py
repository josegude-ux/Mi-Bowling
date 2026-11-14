from pathlib import Path
import hashlib,os
p=Path(os.environ['RUNNER_TEMP'])/'tipo-base/app.js'
s=p.read_text()
assert hashlib.sha256(p.read_bytes()).hexdigest()=='ef9c2fbada8cf5196b444cef5350cdb123b6269a2e1bb7c13bebb710701d3ddd'
a="""function classificationControls(s,g=null){
 if(classificationLocked(s))return '<p class="hint">Tipo protegido: partida vinculada a Liga.</p>';"""
b="""// Consultar también la Liga persistida: otra pestaña puede haber creado un vínculo.
function classificationLeagueSnapshot(){
 const raw=localStorage.getItem(LIGA32_KEY);let league=null;
 if(raw!==null){league=JSON.parse(raw);if(!league||!Array.isArray(league.matches))throw Error('No se puede verificar el estado guardado de Liga.');}
 return {raw,league};
}
function classificationControls(s,g=null){
 try{if(classificationLocked(s)||classificationLocked(s,classificationLeagueSnapshot().league))return '<p class="hint">Tipo protegido: partida vinculada a Liga.</p>';}
 catch{return '<p class="hint">Tipo protegido: no se puede verificar el estado guardado de Liga.</p>';}"""
assert s.count(a)==1
s=s.replace(a,b)
a="  const raw=localStorage.getItem(KEY),legacy=localStorage.getItem(OLDKEY);"
b="""  const leagueSnapshot=classificationLeagueSnapshot();
  if(classificationLocked(source,liga32)||classificationLocked(source,leagueSnapshot.league))throw Error('La jornada está vinculada a Liga. No se puede cambiar su tipo aquí.');
  const raw=localStorage.getItem(KEY),legacy=localStorage.getItem(OLDKEY);"""
assert s.count(a)==1
s=s.replace(a,b)
a="  const encoded=JSON.stringify(plan.db);primaryAttempted=true;localStorage.setItem(KEY,encoded);"
b="  if(localStorage.getItem(LIGA32_KEY)!==leagueSnapshot.raw)throw Error('El estado guardado de Liga cambió durante la operación. Recarga antes de continuar.');\n"+a
assert s.count(a)==1
s=s.replace(a,b)
p.write_text(s)
assert hashlib.sha256(p.read_bytes()).hexdigest()=='d5a57cae36fa8bb26c6b70c62a4b18f0841b904b808908aed9f2b404ef21591c'
print('CP002 candidate exact SHA256 verified')
