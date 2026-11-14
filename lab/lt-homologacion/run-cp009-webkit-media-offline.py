"""WebKit-only remaining lifecycle tests. Adapt close to a script-opened popup,
as established by the independent WebKit controls. No application change."""
from pathlib import Path
import os,sys,subprocess
root=Path(os.environ['LAB']);engine='webkit'
source=(root/'tests/browser-cp009-lifecycle.py').read_text()
old=""" pg.mouse.click(2,2)
 with pg.expect_event('close',timeout=10000):pg.close(run_before_unload=True)"""
new=""" pg.evaluate(\"()=>{const b=document.createElement('button');b.id='lab-close-window';b.textContent='Cerrar ventana de prueba';b.onclick=()=>window.close();b.style.cssText='position:fixed;top:8px;left:8px;z-index:2147483647;background:white;color:black;padding:12px;';document.body.append(b);}\")
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
# New WebKit functional cases. Reuse the exact existing fixture, seed, preview, and journal helpers.
source=source.replace("'bfcache','pdf-ui']", "'bfcache','pdf-ui','aux-before','aux-after','terminal-edit','cancel-preview','quota','full-import','pdf-view','offline']")
anchor="  elif a.scenario=='bfcache':"
extra="""  elif a.scenario.startswith('aux-'):
   phase=a.scenario.split('-')[1];aux='mi-bowling-ball-selection-v1';first.evaluate(start,{'fixture':base64.b64encode(fixture.read_bytes()).decode(),'phase':phase});waitjs(first,"()=>window.__cp004Phase==='barrier'||window.__cp004Phase?.startsWith('error:')");assert first.evaluate('window.__cp004Phase')=='barrier';pending=first.evaluate('()=>window.MiBowlingLTGate.journal.get()');assert pending['status']=='prepared';expected=pending['oldRaw'] if phase=='before' else pending['nextRaw'];assert first.evaluate('(k)=>localStorage.getItem(k)',key)==expected
   other=newpage(ctx);other.goto(origin,wait_until='commit');expect(other.locator('#lt-gate-status')).to_contain_text('Otra ventana');other.evaluate('k=>localStorage.setItem(k,JSON.stringify({__next__:[]}))',aux);diverged=storage(other);assert diverged[aux]!=saved[aux];close_normal(first);other.reload(wait_until='commit');expect(other.locator('#lt-gate-status')).to_contain_text('Resultado divergente',timeout=20000);assert not other.evaluate('!!window.MiBowlingLTHost');assert storage(other)==diverged;assert other.evaluate('()=>window.MiBowlingLTGate.journal.get()')==pending
   with other.expect_download() as dl:other.get_by_role('button',name='Descargar copia completa anterior',exact=True).click()
   assert json.loads(Path(dl.value.path()).read_text())==pending['backup'];log('PASS_AUX_DIVERGENCE',phase)
  elif a.scenario=='cancel-preview':
   preview(first);assert first.evaluate('()=>window.MiBowlingLTGate.journal.get()') is None;first.locator('#lt-close').click();expect(first.locator('#lt-dialog')).to_have_count(0);first.reload(wait_until='commit');ready(first);assert storage(first)==saved and snapshot(first)['pdfs']==before['pdfs'];assert first.evaluate('()=>window.MiBowlingLTGate.journal.get()') is None;log('PASS_CANCEL_PREVIEW')
  elif a.scenario=='quota':
   preview(first);assert first.evaluate('()=>window.MiBowlingLTGate.journal.get()') is None
   found=first.evaluate("()=>{const k='lab-cp009-quota-only',cap=8*1024*1024;let lo=0,hi=cap;const write=n=>{try{localStorage.setItem(k,'x'.repeat(n));return true}catch(e){if(e.name!=='QuotaExceededError')throw e;return false}};if(write(hi)){localStorage.removeItem(k);return false}while(hi-lo>1){const m=Math.floor((hi+lo)/2);if(write(m))lo=m;else hi=m}if(!write(lo))throw Error('quota changed');return true}")
   if not found:raise RuntimeError('PENDING actual quota not reached under cap')
   try:
    confirm(first);waitjs(first,"async()=>{const r=await window.MiBowlingLTGate.journal.get();return r?.status==='not-applied'&&!document.querySelector('#lt-apply').disabled}");assert first.evaluate('(k)=>localStorage.getItem(k)',key)==saved[key]
   finally:first.evaluate("localStorage.removeItem('lab-cp009-quota-only')")
   assert storage(first)==saved;first.locator('#lt-close').click();first.reload(wait_until='commit');ready(first);assert storage(first)==saved and snapshot(first)['pdfs']==before['pdfs'];assert first.evaluate('()=>window.MiBowlingLTGate.journal.get()')['status']=='not-applied';log('PASS_REAL_QUOTA')
  elif a.scenario in ('terminal-edit','full-import'):
   preview(first);confirm(first);expect(first.locator('#lt-status')).to_contain_text('6 partidas añadidas',timeout=20000)
   with first.expect_download() as dl:first.locator('#lt-backup').click()
   backup=json.loads(Path(dl.value.path()).read_text());assert backup['storage']==before['storage'] and backup['pdfs']==before['pdfs'];first.locator('#lt-close').click();after=snapshot(first);assert after['pdfs']==before['pdfs'];assert all(v==after['storage'][k] for k,v in before['storage'].items() if k!=key);assert first.evaluate("aggregate('oficial').totals.join(',')")=='300,150,90';assert first.evaluate("aggregate('entrenamiento').games.length")==2;terminal=first.evaluate('()=>window.MiBowlingLTGate.journal.get()');assert terminal['status']=='applied'
   if a.scenario=='terminal-edit':
    first.evaluate("go('ajustes')");first.locator('#mano-bowling').select_option('diestro');edited=storage(first);assert json.loads(edited[key])['hand']=='diestro' and edited[key]!=terminal['nextRaw'];first.reload(wait_until='commit');ready(first);assert storage(first)==edited and first.evaluate('()=>window.MiBowlingLTGate.journal.get()')==terminal;first.evaluate("go('ajustes')")
    with first.expect_download() as dl:first.get_by_role('button',name='↓ Exportar copia',exact=True).click()
    exported=json.loads(Path(dl.value.path()).read_text());assert exported['hand']=='diestro' and exported['sessions']==json.loads(edited[key])['sessions'];log('PASS_TERMINAL_EDIT_EXPORT')
   else:
    first.reload(wait_until='commit');ready(first);assert first.evaluate("aggregate('oficial').totals.join(',')")=='300,150,90';preview(first);expect(first.locator('#lt-summary')).to_contain_text('6 duplicadas');first.locator('#lt-close').click();first.evaluate("selectedPatternId='LAB-PDF';go('patrones')")
    with first.expect_download() as dl:first.get_by_role('button',name='Descargar PDF',exact=True).click()
    assert Path(dl.value.path()).read_bytes()==pdf.read_bytes();log('PASS_FULL_IMPORT_STATS_BACKUP_DEDUP_PDF_DOWNLOAD')
"""
extra+= """  elif a.scenario=='pdf-view':
   first.evaluate("selectedPatternId='LAB-PDF';go('patrones')")
   with ctx.expect_page(timeout=15000) as popup:first.get_by_role('button',name='Ver PDF',exact=True).click()
   viewer=popup.value;viewer.wait_for_load_state('domcontentloaded',timeout=15000);assert viewer.url.startswith('blob:'+origin.rstrip('/'));log('PDF_VIEWER_OPENED',viewer.url.split(':')[0]);first.wait_for_timeout(1500)
   image=viewer.screenshot(timeout=15000);log('PDF_VIEWER_SCREENSHOT_B64',base64.b64encode(image).decode());log('PENDING_VISUAL_REVIEW_PDF')
  elif a.scenario=='offline':
   import os,signal,urllib.request
   preview(first);confirm(first);expect(first.locator('#lt-status')).to_contain_text('6 partidas añadidas',timeout=20000);first.locator('#lt-close').click();after=snapshot(first);assert first.evaluate("aggregate('oficial').totals.join(',')")=='300,150,90'
   first.evaluate('navigator.serviceWorker.ready.then(()=>true)');first.reload(wait_until='commit');ready(first);waitjs(first,'()=>!!navigator.serviceWorker.controller')
   log('SW_CONTROLLER',first.evaluate('navigator.serviceWorker.controller.scriptURL'));os.kill(int(os.environ['LAB_SERVER_PID']),signal.SIGTERM)
   unreachable=False
   for _ in range(30):
    try:urllib.request.urlopen(origin,timeout=0.5).close()
    except OSError:unreachable=True;break
    time.sleep(0.1)
   assert unreachable,'Loopback server still reachable';log('LOOPBACK_SERVER_STOPPED')
   first.reload(wait_until='commit');ready(first);assert first.evaluate("aggregate('oficial').totals.join(',')")=='300,150,90';assert snapshot(first)['storage']==after['storage'] and snapshot(first)['pdfs']==after['pdfs'];assert len(held(first))==1;log('PASS_OFFLINE_WITH_REAL_SERVER_STOP')
"""
assert source.count(anchor)==1
source=source.replace(anchor,extra+anchor)
script=root/'tests/browser-cp009-webkit-popup.py';script.write_text(source);compile(source,str(script),'exec')
cases=['pdf-view','offline']
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
