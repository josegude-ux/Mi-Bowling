"""WebKit-only remaining lifecycle tests. Adapt close to a script-opened popup,
as established by the independent WebKit controls. No application change."""
from pathlib import Path
import os,sys,subprocess
root=Path(os.environ['LAB']);engine='webkit'
source=(root/'tests/browser-cp009-lifecycle.py').read_text()
old=""" pg.mouse.click(2,2)
 with pg.expect_event('close',timeout=10000):pg.close(run_before_unload=True)"""
new=""" pg.evaluate(\"()=>{const b=document.createElement('button');b.id='lab-close-window';b.textContent='Cerrar ventana de prueba';b.onclick=()=>window.close();document.body.append(b);}\")
 with pg.expect_event('close',timeout=10000):pg.locator('#lab-close-window').click(no_wait_after=True)
 assert pg.is_closed();log('SCRIPT_POPUP_CLOSED')"""
assert source.count(old)==1
source=source.replace(old,new)
old="first=ctx.pages[0];first.set_default_timeout(12000);first.set_default_navigation_timeout(12000);dialogs=[]"
new="""opener=ctx.pages[0];opener.set_content('<button id="open-lab" onclick="window.open(\\'http://127.0.0.1:8767/\\',\\'_blank\\')">Abrir LAB</button>')
  with opener.expect_popup(timeout=12000) as opened:opener.locator('#open-lab').click()
  first=opened.value;first.set_default_timeout(12000);first.set_default_navigation_timeout(12000);dialogs=[]"""
assert source.count(old)==1
source=source.replace(old,new)
# The popup is already navigating; do not start an additional navigation just to open it.
old="log('UA',first.evaluate('navigator.userAgent'));load(first);log('STARTUP',held(first));before=seed(first);saved=storage(first)"
new="ready(first);log('UA',first.evaluate('navigator.userAgent'));log('STARTUP',held(first));before=seed(first);saved=storage(first)"
assert source.count(old)==1
source=source.replace(old,new)
script=root/'tests/browser-cp009-webkit-popup.py';script.write_text(source);compile(source,str(script),'exec')
cases=['reload-close','late-writers','pdf-abort','retire-backup','pending-before','pending-after','pdf-ui','bfcache']
failed=[]
for name in cases:
 print('BEGIN_CP009_WEBKIT',name,flush=True)
 try:
  r=subprocess.run([sys.executable,'-u',str(script),'--authorized','--engine','webkit','--scenario',name],timeout=90);code=r.returncode
 except subprocess.TimeoutExpired:code=124
 print('END_CP009_WEBKIT',name,code,flush=True)
 if code:failed.append(name)
print('CP009_WEBKIT_FAILURES',','.join(failed),flush=True)
sys.exit(bool(failed))
