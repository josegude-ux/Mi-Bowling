from pathlib import Path
import os,sys,subprocess,traceback
root=Path(os.environ['LAB']); engine=os.environ['ENGINE']
tests=root/'tests'
# Only adapt acceptance harnesses, not the CP005 application.
a=(tests/'browser-authorized.py').read_text()
a=a.replace(" page.close();second.reload", " print('PASS CP003 import, writer, SQLite, real IDB, scores and backup',flush=True)\n page.close();second.reload")
a=a.replace(" # Real worker activation", " print('PASS CP003 reload, persisted receipt, duplicate preview',flush=True)\n # Real worker activation")
(tests/'ci-core.py').write_text(a)
b=(tests/'browser-cp004-authorized.py').read_text()
for phase in ('before','after','bfcache'):
 s=b.replace("for phase in ['before','after']:", "for phase in "+repr([] if phase=='bfcache' else [phase])+":")
 if phase!='bfcache':s=s.split(' # Observe actual BFCache')[0]+' b.close()\n'
 else:
  s=s.replace("import argparse, base64, hashlib, pathlib, json","import argparse, base64, hashlib, pathlib, json, time")
  s=s.replace("def ready(page):",'''def poll(page):
 deadline=time.monotonic()+20
 while time.monotonic()<deadline:
  if page.evaluate("()=>document.querySelector('#lt-app-shell')?.hidden===false || document.querySelector('#lt-gate-status')?.textContent.includes('Otra ventana')"):return
  time.sleep(.1)
 raise AssertionError('gate did not reach terminal UI state')
def ready(page):''')
  predicate="document.querySelector('#lt-app-shell')?.hidden===false || document.querySelector('#lt-gate-status')?.textContent.includes('Otra ventana')"
  s=s.replace('first.wait_for_function("'+predicate+'")','poll(first)')
  s=s.replace('other.wait_for_function("'+predicate+'")','poll(other)')
  # Chromium's test launcher disables BFCache by default. Enable the normal
  # browser feature without bypassing origin, CSP, locks or app guards.
  s=s.replace("getattr(pw,a.engine).launch()","getattr(pw,a.engine).launch(**({'ignore_default_args':['--disable-back-forward-cache']} if a.engine=='chromium' else {}))")

 (tests/('ci-'+phase+'.py')).write_text(s)
# Each scenario is a separate process; failures do not prevent collecting other evidence.
cases=[('core','ci-core.py',[]),('close-before','ci-before.py',[]),('close-after','ci-after.py',[]),('bfcache','ci-bfcache.py',[])]
cases += [(s,'browser-cp005-authorized.py',['--scenario',s]) for s in ('aux-before','aux-after','terminal-edit','cancel-preview','quota')]
cases += [(s,'ci-extra.py',['--scenario',s]) for s in ('cancel-backup','ui-pdf')]
# Extend only the harness. The original scripts are kept byte-exact.
c=(tests/'browser-cp005-authorized.py').read_text()
c=c.replace("'cancel-preview', 'quota']", "'cancel-preview', 'quota', 'cancel-backup', 'ui-pdf']")
extra="""
        elif a.scenario == 'cancel-backup':
            preview(first); saved=storage(first); assert receipt(first) is None
            first.evaluate('''()=>{const original=Blob.prototype.arrayBuffer;let release;const wait=new Promise(r=>release=r);window.__ltBackupBarrier={entered:false,release};Blob.prototype.arrayBuffer=async function(){const bytes=await original.call(this);if(this.type==='application/pdf'){window.__ltBackupBarrier.entered=true;await wait;}return bytes;}}''')
            confirm(first)
            import time
            deadline=time.monotonic()+20
            while time.monotonic()<deadline and not first.evaluate("()=>!!window.__ltBackupBarrier?.entered"):
                time.sleep(.05)
            assert first.evaluate("()=>!!window.__ltBackupBarrier?.entered"), 'backup barrier not entered'
            first.locator('#lt-close').click()
            expect(first.locator('#lt-status')).to_contain_text('Cancelación solicitada')
            first.evaluate('window.__ltBackupBarrier.release()')
            expect(first.locator('#lt-status')).to_contain_text('Cancelado antes de escribir',timeout=20000)
            assert receipt(first) is None and storage(first)==saved
            first.locator('#lt-close').click(); first.reload(wait_until='commit'); ready(first)
            assert receipt(first) is None and storage(first)==saved
        elif a.scenario == 'ui-pdf':
            preview(first); confirm(first)
            expect(first.locator('#lt-status')).to_contain_text('6 partidas añadidas',timeout=20000)
            first.locator('#lt-close').click()
            first.evaluate("historyMode='oficial';go('historial')")
            first.locator('.v25-day-head').first.click()
            expect(first.locator('#app')).to_contain_text('Evento ficticio')
            expect(first.locator('#app')).to_contain_text('300')
            first.evaluate("statMode='oficial';statPane='general';go('estadisticas')")
            expect(first.locator('#app')).to_contain_text('Estadísticas')
            assert first.evaluate("aggregate('oficial').totals.join(',')")=='300,150,90'
            first.locator('#stats-pane-select').select_option('bolos')
            expect(first.locator('#app')).to_contain_text('Mapa de derribo por bolo')
            # Original pin analysis contract and imported strike pin identity.
            assert first.evaluate("aggregate('oficial').games[0].rolls[0].pins.length")==10
            print('PASS UI history and statistics, scores and pins',flush=True)
            first.evaluate("selectedPatternId='LAB-CP006-PDF';go('patrones')")
            with first.expect_download() as dl:
                first.get_by_role('button',name='Descargar PDF',exact=True).click()
            assert Path(dl.value.path()).read_bytes()==pdf.read_bytes()
            print('PASS real PDF download byte equality',flush=True)
            # PDF viewers differ by engine; never infer rendering from download.
            try:
                with first.expect_popup(timeout=8000) as pop:
                    first.get_by_role('button',name='Ver PDF',exact=True).click()
                viewer=pop.value
                viewer.wait_for_timeout(1500)
                shot=viewer.screenshot(timeout=8000)
                print('PDF_VIEWER_SCREENSHOT_B64',base64.b64encode(shot).decode(),flush=True)
                print('PENDING visual review: screenshot captured; no automatic visual PASS',flush=True)
            except Exception as e:
                print('PENDING PDF viewer:',type(e).__name__,str(e)[:200],flush=True)
"""
marker='        else:\n            # Real browser quota'
assert marker in c
c=c.replace(marker,extra+'\n'+marker)
c=c.replace("browser = getattr(pw, a.engine).launch()", "browser = getattr(pw, a.engine).launch(**({'channel':'chromium'} if a.engine=='chromium' and a.scenario=='ui-pdf' else {}))")
(tests/'ci-extra.py').write_text(c)

# CP015 established that WebKit's ephemeral context can reject a Blob IDB seed.
# Use a fresh persistent temporary profile, and a File matching the application's upload path.
if engine=='webkit':
 helper="""import tempfile
class Persistent:
 def __init__(self,engine):
  self.engine=engine;self.version='WebKit persistent / Playwright 1.56.0';self.items=[]
 def new_context(self,**kwargs):
  profile=tempfile.TemporaryDirectory(prefix='lt-webkit-')
  ctx=self.engine.launch_persistent_context(profile.name,headless=True,service_workers='allow',**kwargs)
  self.items.append((ctx,profile))
  print('WEBKIT_PERSISTENT_PROFILE',ctx.pages[0].evaluate('navigator.userAgent'),flush=True)
  return ctx
 def close(self):
  for ctx,profile in self.items:
   try:ctx.close()
   except Exception:pass
   profile.cleanup()
"""
 originals=[(tests/'browser-cp005-authorized.py',tests/'ci-wk-cp005.py')]+[(p,p) for p in tests.glob('ci-*.py')]
 for src,dest in originals:
  s=src.read_text()
  s=s.replace('with sync_playwright() as pw:',helper+'\nwith sync_playwright() as pw:')
  s=s.replace("getattr(pw,a.engine).launch(**({'ignore_default_args':['--disable-back-forward-cache']} if a.engine=='chromium' else {}))","Persistent(pw.webkit)")
  s=s.replace("getattr(pw, a.engine).launch(**({'channel':'chromium'} if a.engine=='chromium' and a.scenario=='ui-pdf' else {}))","Persistent(pw.webkit)")
  s=s.replace("getattr(pw,a.engine).launch()","Persistent(pw.webkit)").replace("getattr(pw, a.engine).launch()","Persistent(pw.webkit)")
  s=s.replace("new Blob(['%PDF-1.4","new File(['%PDF-1.4").replace("%%EOF'],{type:'application/pdf'})","%%EOF'],'ficticio.pdf',{type:'application/pdf'})")
  s=s.replace("new Blob([bytes],{type:'application/pdf'})","new File([bytes],'patron-ficticio.pdf',{type:'application/pdf'})")
  s=s.replace("new Blob([Uint8Array.from(atob(pdf),c=>c.charCodeAt(0))],{type:'application/pdf'})","new File([Uint8Array.from(atob(pdf),c=>c.charCodeAt(0))],'patron-ficticio.pdf',{type:'application/pdf'})")
  dest.write_text(s)
 cases=[(name,'ci-wk-cp005.py' if script=='browser-cp005-authorized.py' else script,args) for name,script,args in cases]

for script in tests.glob('ci-*.py'):compile(script.read_text(),str(script),'exec')
failed=[]
# All WebKit scenarios previously blocked at seeding or BFCache harness; no WebKit PASS repeated.
for name,script,args in cases:
 print('BEGIN_SCENARIO',engine,name,flush=True)
 try:
  r=subprocess.run([sys.executable,str(tests/script),'--authorized','--engine',engine,*args],timeout=150)
  code=r.returncode
 except subprocess.TimeoutExpired:code=124
 print('END_SCENARIO',engine,name,'EXIT',code,flush=True)
 if code:failed.append(name)
print('SCENARIO_FAILURES',engine,','.join(failed),flush=True)
sys.exit(bool(failed))
