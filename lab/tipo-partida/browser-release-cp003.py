"""Actual SW update on a nested scope. All fixtures synthetic. No production."""
import argparse,base64,hashlib,json,os,tempfile,threading,time,urllib.parse,mimetypes
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('engine',choices=['chromium','webkit']);p.add_argument('scenario',choices=['upgrade','bad-resource']);a=p.parse_args()
tmp=Path(os.environ['RUNNER_TEMP']);base=tmp/'tipo-base';release=tmp/'tipo-release';hashes=json.loads((tmp/'tipo-cache.json').read_text())
state={'root':base,'bad':False};requests=[]
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
  if not path.startswith('/Mi-Bowling/'):self.send_error(404);return
  name=path[len('/Mi-Bowling/'):] or 'index.html';f=(state['root']/name).resolve()
  if not f.is_relative_to(state['root'].resolve()) or not f.is_file():self.send_error(404);return
  data=f.read_bytes()
  if state['bad'] and name=='app-tipo-3311-cp003.js':data+=b'\n/* corrupt synthetic */'
  requests.append((name,state['root'].name,state['bad']))
  self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(name)[0] or 'application/octet-stream');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
origin=f'http://127.0.0.1:{server.server_port}/Mi-Bowling/'
def log(tag,value=None):print('TIPO_RELEASE',a.engine,a.scenario,tag,json.dumps(value,ensure_ascii=False,default=str),flush=True)
def wait(pg,fn,limit=20):
 end=time.monotonic()+limit
 while time.monotonic()<end:
  v=pg.evaluate(fn)
  if v:return v
  time.sleep(.15)
 raise AssertionError('deadline: '+fn)
def version(pg):return pg.evaluate("typeof APP_VERSION==='undefined'?null:APP_VERSION")
def load(pg):
 pg.goto(origin,wait_until='load');expect(pg.locator('#app')).to_be_visible(timeout=15000)
def snapshot(pg):return pg.evaluate("""()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('mi-bowling-')).sort().map(k=>[k,localStorage.getItem(k)]))""")
def caches(pg):return pg.evaluate("""async()=>{const out={};for(const n of await window.caches.keys()){const c=await window.caches.open(n);out[n]=(await c.keys()).map(r=>r.url).sort()}return out}""")
def cachecheck(pg):
 result=pg.evaluate("""async expected=>{const n=(await caches.keys()).find(x=>x.includes('tipo-3311-cp003'));if(!n)return {missing:'cache'};const c=await caches.open(n),rows=[];for(const [key,h] of Object.entries(expected)){const r=await c.match(new URL(key,location.href).href);const hash=r?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await r.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join(''):null;rows.push({key,ok:hash===h})}return {name:n,rows}}""",hashes)
 log('CACHE_INTEGRITY',result);assert len(result.get('rows',[]))==33 and all(x['ok'] for x in result['rows'])
pdf=b'%PDF-1.4\n% synthetic cache upgrade fixture\n%%EOF\n'
def seed(pg):
 data={'version':2,'hand':'zurdo','balls':[{'id':'LAB-B','brand':'Ficticia','model':'Prueba'}],'patterns':[{'id':'LAB-P','name':'Patrón ficticio','pdfName':'ficticio.pdf'}],'sessions':[{'id':'LAB-S','type':'entrenamiento','date':'2026-01-01','title':'Jornada ficticia [Tipo pendiente]','notes':'Tipo de jornada no confirmado en la copia de origen. Se muestra provisionalmente en Entrenamientos por compatibilidad y no se incluye en las estadísticas de entrenamiento hasta que se confirme su clasificación.','venue':'Bolera ficticia','patternId':'LAB-P','games':[{'id':'LAB-G','includeStats':False,'pair':[7,8],'startLane':7,'rolls':[{'frame':min(i+1,10),'ball':1 if i<10 else i-8,'pins':list(range(1,11)),'ballId':'LAB-B','lane':7,'pair':[7,8]} for i in range(12)]}]}]}
 pg.evaluate("""async ({data,pdf})=>{localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(migrate(data)));localStorage.setItem('mi-bowling-ball-selection-v1',JSON.stringify({'LAB-S':['LAB-B'],__next__:[]}));localStorage.setItem('mi-bowling-quick-layout','compact');await oilPut('LAB-P',new File([Uint8Array.from(atob(pdf),c=>c.charCodeAt(0))],'ficticio.pdf',{type:'application/pdf'}));}""",{'data':data,'pdf':base64.b64encode(pdf).decode()})
def checkpdf(pg):
 h=pg.evaluate("""async()=>{const f=await oilGet('LAB-P');return f?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join(''):null}""")
 assert h==hashlib.sha256(pdf).hexdigest();log('PDF_BYTES_PASS',h)
def gate(pg):wait(pg,"()=>!!navigator.serviceWorker.controller")
def openctx(engine,profile):return engine.launch_persistent_context(profile,headless=True,service_workers='allow',accept_downloads=True,viewport={'width':390,'height':844})
def old_cache(pg):
 names=caches(pg);old=[(k,len(v)) for k,v in names.items() if k=='mi-bowling-analitica-v3-3-10-catalogo-cp037'];log('OLD_CACHE',old)
 assert old and old[0][1]>=31,'Previous worker cache not populated; environment or prior worker limitation'
def check_ui(pg):
 pg.evaluate("go('historial');historyMode='pendiente';historyOpenDay='pendiente2026-01-01';render()")
 expect(pg.locator('#app')).to_contain_text('Jornada ficticia')
 for width in (320,390,768,1280):
  pg.set_viewport_size({'width':width,'height':844})
  rows=pg.evaluate("""()=>{const q=document.querySelector('#app .seg');return {viewport:innerWidth,doc:document.documentElement.scrollWidth,tabs:[...q.querySelectorAll('button')].map(x=>{const r=x.getBoundingClientRect();return {w:r.width,h:r.height,x:r.x,right:r.right,scroll:x.scrollWidth,client:x.clientWidth}}),buttons:[...document.querySelectorAll('#app button')].filter(x=>x.textContent.trim().startsWith('Cambiar tipo')).map(x=>{const r=x.getBoundingClientRect();return {x:r.x,right:r.right,h:r.height}})}}""")
  log('VISUAL',rows);assert rows['doc']<=width+1 and len(rows['tabs'])==3 and all(x['x']>=0 and x['right']<=width+1 and x['h']>=44 and x['scroll']<=x['client']+1 for x in rows['tabs']) and len(rows['buttons'])==2 and all(x['x']>=0 and x['right']<=width+1 for x in rows['buttons'])
  pg.screenshot(path=str(tmp/f'tipo-{a.engine}-{width}.png'),full_page=True)
 pg.set_viewport_size({'width':390,'height':844})
 log('VISUAL_PASS')
with sync_playwright() as pw,tempfile.TemporaryDirectory(prefix='tipo-release-') as profile:
 engine=getattr(pw,a.engine);ctx=openctx(engine,profile);pg=ctx.pages[0];pg.set_default_timeout(15000)
 try:
  load(pg);log('UA',pg.evaluate('navigator.userAgent'));assert version(pg)=='3.3.10-catalogo'
  wait(pg,"async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.state==='activated'}");gate(pg);old_cache(pg)
  seed(pg);pg.reload(wait_until='load');gate(pg);before=snapshot(pg);checkpdf(pg);assert pg.evaluate("score(db.sessions[0].games[0])")==300
  pg.evaluate("openSession('LAB-S')");expect(pg.locator('#app')).to_be_visible()
  # Capture actual updatefound/installing states; no activation request.
  pg.evaluate("""async()=>{const r=await navigator.serviceWorker.getRegistration();window.__updateStates=[];r.addEventListener('updatefound',()=>{const w=r.installing;window.__updateStates.push(w.state);w.addEventListener('statechange',()=>window.__updateStates.push(w.state))})}""")
  state['root']=release;state['bad']=a.scenario=='bad-resource'
  pg.evaluate("async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()}")
  if a.scenario=='bad-resource':
   wait(pg,"()=>window.__updateStates.includes('redundant')");assert not pg.evaluate("async()=>!!(await navigator.serviceWorker.getRegistration()).waiting");assert version(pg)=='3.3.10-catalogo' and snapshot(pg)==before;checkpdf(pg);old_cache(pg);log('BAD_RESOURCE_REJECTED',pg.evaluate('window.__updateStates'));log('PASS');ctx.close();server.shutdown();raise SystemExit(0)
  wait(pg,"async()=>!!(await navigator.serviceWorker.getRegistration()).waiting");log('WAITING',pg.evaluate('window.__updateStates'))
  assert version(pg)=='3.3.10-catalogo' and snapshot(pg)==before
  assert pg.evaluate("tab")== 'registro'
  old_hash=pg.evaluate("""async()=>{const r=await fetch('app.js?v=3310cat1');return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await r.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('')}""")
  assert old_hash==hashlib.sha256((base/'app.js').read_bytes()).hexdigest();log('OLD_CLIENT_UNINTERRUPTED')
  cachecheck(pg)
  standby=ctx.new_page();pg.close()
  # All old controlled documents closed, then new navigation can activate the new worker.
  time.sleep(1.0);load(standby);gate(standby);pg=standby
  wait(pg,"()=>typeof APP_VERSION!=='undefined'&&APP_VERSION==='3.3.11-tipo-partida'")
  wait(pg,"async()=>{const r=await navigator.serviceWorker.getRegistration();return !r.waiting&&r.active?.state==='activated'}")
  cachecheck(pg);assert snapshot(pg)==before;checkpdf(pg);old_cache(pg);log('UPGRADE_DATA_PASS')
  check_ui(pg)
  # One affected smoke test through the new shell, not a rerun of the CP002 suite.
  pg.locator('button').filter(has_text='Cambiar tipo').last.click()
  pg.locator('button[data-game="LAB-G"][data-type="oficial"]').click() if False else None
  pg.on('dialog',lambda d:d.accept())
  pg.locator('button[data-game="LAB-G"][data-type="oficial"]').click()
  assert pg.evaluate("aggregate('oficial').totals.join(',')")=='300'
  after=snapshot(pg);oldgame=json.loads(before['mi-bowling-analitica-v2'])['sessions'][0]['games'][0];newgame=json.loads(after['mi-bowling-analitica-v2'])['sessions'][0]['games'][0];assert newgame=={**oldgame,'includeStats':True};assert all(after[k]==v for k,v in before.items() if k!='mi-bowling-analitica-v2')
  checkpdf(pg);log('CLASSIFICATION_SMOKE_PASS')
 finally:
  if a.scenario!='bad-resource':ctx.close()
 # New browser process, same profile and origin, then real server shutdown.
 ctx=openctx(engine,profile);pg=ctx.pages[0]
 try:
  load(pg);gate(pg);assert version(pg)=='3.3.11-tipo-partida' and snapshot(pg)==after;checkpdf(pg);cachecheck(pg);log('REOPEN_PROFILE_PASS')
  server.shutdown();server.server_close();log('SERVER_STOPPED')
  pg.reload(wait_until='load',timeout=15000);expect(pg.locator('#app')).to_be_visible();assert version(pg)=='3.3.11-tipo-partida' and snapshot(pg)==after;checkpdf(pg)
  pg.goto(origin+'index.html',wait_until='load',timeout=15000);assert version(pg)=='3.3.11-tipo-partida' and snapshot(pg)==after;log('OFFLINE_ROOT_AND_INDEX_PASS')
 finally:ctx.close()
 log('PASS')
