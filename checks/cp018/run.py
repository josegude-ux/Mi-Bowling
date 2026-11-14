"""Only new CP018 browser scenarios, existing standard hosted runners; synthetic data."""
import os,sys,json,time,hashlib,base64,threading,tempfile,mimetypes,subprocess
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlsplit
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
root=Path(os.environ['RUNNER_TEMP'])/'cp018-check';manifests=json.loads((root/'manifests.json').read_text());stage={'dir':root/'base'}
class H(BaseHTTPRequestHandler):
 def do_GET(self):
  p=urlsplit(self.path).path
  if not p.startswith('/Mi-Bowling/'):self.send_error(404);return
  f=stage['dir']/(p[len('/Mi-Bowling/'):] or 'index.html')
  if not f.resolve().is_relative_to(stage['dir'].resolve()) or not f.is_file():self.send_error(404);return
  b=f.read_bytes();self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(f.name)[0] or 'application/octet-stream');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}/Mi-Bowling/'
engine=sys.argv[1];downloads=root/'downloads';downloads.mkdir()
if engine=='safari-native':driver=webdriver.Safari()
else:
 o=webdriver.ChromeOptions();o.add_argument('--headless=new');o.add_argument('--no-sandbox');o.add_argument('--disable-dev-shm-usage');o.add_argument('--window-size=390,844');o.add_experimental_option('prefs',{'download.default_directory':str(downloads),'download.prompt_for_download':False,'download.directory_upgrade':True});driver=webdriver.Chrome(options=o);driver.execute_cdp_cmd('Page.setDownloadBehavior',{'behavior':'allow','downloadPath':str(downloads)})
driver.set_page_load_timeout(25);driver.set_script_timeout(30)
def log(k,v=True):print('CP018',engine,k,json.dumps(v,ensure_ascii=False,default=str),flush=True)
def js(s,*a):return driver.execute_script(s,*a)
def aj(s,*a):
 v=driver.execute_async_script("const done=arguments[arguments.length-1];const args=Array.from(arguments).slice(0,-1);Promise.resolve().then(()=>("+s+")(...args)).then(done,e=>done({error:String(e)}))",*a)
 if isinstance(v,dict) and 'error' in v:raise AssertionError(v)
 return v
def wait(s):return WebDriverWait(driver,30).until(lambda _:aj(s) is True)
def snap():return js("return Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('mi-bowling-')).sort().map(k=>[k,localStorage.getItem(k)]))")
def state():return js("return {version:APP_VERSION,hand:db.hand,ids:db.sessions.map(s=>[s.id,classificationMode(s),s.games.map(g=>[g.id,complete(g)?score(g):null])]),balls:db.balls,patterns:db.patterns,selection:JSON.parse(localStorage.getItem(BALL_SELECTION_KEY)),league:JSON.parse(localStorage.getItem(LIGA32_KEY))}")
def cache(stage,release):
 x=aj("""async ({release,manifest})=>{const scope=(await navigator.serviceWorker.getRegistration()).scope;const key='mi-bowling-release-'+release+'-'+encodeURIComponent(scope);const names=await caches.keys();if(!names.includes(key))throw Error('missing cache '+key);const c=await caches.open(key),keys=await c.keys();for(const [p,h] of Object.entries(manifest)){const v=await c.match(new URL(p,scope).href);if(!v)throw Error('missing '+p);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await v.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');if(hash!==h)throw Error('hash '+p)}return {count:keys.length,names,controller:!!navigator.serviceWorker.controller}}""",{'release':release,'manifest':manifests[stage]});assert x['count']==len(manifests[stage]) and x['controller'],x;log('CACHE_'+stage,x);return x
def pdfcheck():
 b=aj("async()=>Array.from(new Uint8Array(await (await oilGet('F-P1')).arrayBuffer()))");assert bytes(b)==pdf
def transition(folder,new,old):
 stage['dir']=root/folder
 assert aj("async()=>{await (await navigator.serviceWorker.getRegistration()).update();return true}") is True
 wait("async()=>!!(await navigator.serviceWorker.getRegistration()).waiting")
 assert js('return typeof MiBowlingBackup')==old
 driver.get('about:blank');time.sleep(2);driver.get(origin)
 wait("async()=>!!navigator.serviceWorker.controller&&!(await navigator.serviceWorker.getRegistration()).waiting")
 assert js('return typeof MiBowlingBackup')==new
pdf=b'%PDF-1.4\n% synthetic CP018\n%%EOF\n'
try:
 driver.get(origin);log('CAPABILITIES',driver.capabilities.get('browserVersion'));assert js('return isSecureContext')
 wait("async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.state==='activated'}");driver.refresh();wait("async()=>!!navigator.serviceWorker.controller")
 a=cache('base','tipo-3311-cp004')
 assert aj("""async pdf=>{const pins=[1,2,3,4,5,6,7,8,9,10],rolls=Array.from({length:12},(_,i)=>({frame:Math.min(i+1,10),ball:i<10?1:i-8,pins,ballId:'F-B1'}));const common={date:'2026-11-01',venue:'Pista ficticia',patternId:'F-P1',pattern:'Patrón ficticio',currentBallId:'F-B1'};db=migrate({version:2,hand:'zurdo',balls:[{id:'F-B1',name:'Bola ficticia',brand:'Ficticia',photo:'data:image/png;base64,RklDVElDSU8='}],patterns:[{id:'F-P1',name:'Patrón ficticio',pdfName:'ficticio.pdf'}],sessions:[{...common,id:'F-S1',type:'oficial',title:'Oficial ficticia',games:[{id:'F-G1',rolls}]},{...common,id:'F-S2',type:'entrenamiento',title:'Ficticia [Tipo pendiente]',notes:LT_PENDING_NOTE,games:[{id:'F-G2',rolls:[]}]}]});save();localStorage.setItem(BALL_SELECTION_KEY,JSON.stringify({'F-S1':['F-B1']}));localStorage.setItem(LIGA_KEY,JSON.stringify(ligaData));localStorage.setItem(LIGA32_KEY,JSON.stringify(liga32));localStorage.setItem(LIGA33_ROSTER_KEY,JSON.stringify(liga33Roster));localStorage.setItem('mi-bowling-quick-layout','compact');localStorage.setItem('mi-bowling-fixture-extra','CP018 synthetic');await oilPut('F-P1',new Blob([Uint8Array.from(pdf)],{type:'application/pdf'}));return true}""",list(pdf)) is True
 driver.refresh();wait("async()=>!!navigator.serviceWorker.controller");before=snap();initial=state();assert initial['ids']==[['F-S1','oficial',[['F-G1',300]]],['F-S2','pendiente',[['F-G2',None]]]],initial['ids'];pdfcheck()
 transition('candidate','object','undefined');c=cache('candidate','backup-cp018-3311');assert set(a['names']).issubset(c['names']);assert snap()==before and state()==initial;pdfcheck();log('UPDATE_PRESERVED',{'keys':len(before),'games':initial['ids']})
 js("go('ajustes')");btn=driver.find_element(By.XPATH,"//button[normalize-space()='↓ Exportar copia completa']");assert btn.is_displayed();assert driver.find_element(By.XPATH,"//button[normalize-space()='↓ Exportar copia']").is_displayed();log('REAL_SETTINGS')
 # Snapshot actual browser API; verify complete contents on both engines.
 obj=aj("async()=>await MiBowlingBackup.snapshot()");assert obj['storage']==before and len(obj['pdfs'])==1;assert base64.b64decode(obj['pdfs'][0]['base64'])==pdf and obj['pdfs'][0]['sha256']==hashlib.sha256(pdf).hexdigest();assert snap()==before;log('REAL_IDB_AND_SNAPSHOT',{'keys':len(before),'pdf_sha256':obj['pdfs'][0]['sha256']})
 # Real download in Chromium. Safari native automation may restrict download location; keep it as explicit limitation.
 if engine=='chromium':
  btn.click();WebDriverWait(driver,10).until(lambda d:d.switch_to.alert).accept()
  def downloaded():
   return next(iter(downloads.glob('MI_BOWLING_COPIA_COMPLETA_*.json')),None)
  f=WebDriverWait(driver,20).until(lambda _:downloaded());d=json.loads(f.read_text());assert d['storage']==before and d['pdfs']==obj['pdfs'];log('REAL_FILE_DOWNLOAD',{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
 else:log('FILE_DOWNLOAD_NOT_RUN_SAFARI','Native Safari snapshot and IDB only; physical iOS still pending')
 # New browser-produced backup only; do not rerun the earlier synthetic extraction tests.
 actual=root/'browser-generated-backup.json'
 if engine=='chromium':actual.write_bytes(f.read_bytes())
 else:actual.write_text(json.dumps(obj,ensure_ascii=False))
 rec=root/'recovered';recover=Path(__file__).with_name('recover-backup.py');assert hashlib.sha256(recover.read_bytes()).hexdigest()=='4f311f0caca1b143baef57a2c361ee6d4f45b55fa6889bf1f293b65afb1fb2e4'
 subprocess.run([sys.executable,str(recover),str(actual),str(rec)],check=True)
 assert json.loads((rec/'localStorage-exacto.json').read_text())==before and (rec/'pdfs/patron-001.pdf').read_bytes()==pdf
 log('BROWSER_PRODUCED_BACKUP_EXTRACTION')
 # Candidate offline: stop listening, then resume same port without restarting browser.
 # Closing TCP connections temporarily gives real offline reload, no browser flag.
 server.shutdown();server.server_close();driver.refresh();assert js('return typeof MiBowlingBackup')=='object' and snap()==before;pdfcheck();log('OFFLINE_CANDIDATE')
 port=int(origin.split(':')[2].split('/')[0]);server=ThreadingHTTPServer(('127.0.0.1',port),H);threading.Thread(target=server.serve_forever,daemon=True).start()
 js("changeHand('diestro')");after=snap();assert json.loads(after['mi-bowling-analitica-v2'])['hand']=='diestro'
 transition('rollback','undefined','object');b=cache('rollback','rollback-backup-cp018-tipo3311');assert set(c['names']).issubset(b['names']);assert snap()==after;pdfcheck();assert state()['ids']==initial['ids'];log('ROLLBACK_PRESERVED_POST_UPDATE_EDIT')
 server.shutdown();server.server_close();driver.refresh();assert snap()==after and js('return APP_VERSION')=='3.3.11-tipo-partida';pdfcheck();log('OFFLINE_ROLLBACK')
 # Technical rehydration of extracted SYNTHETIC keys and PDF in a distinct, fresh loopback origin.
 # This is not an end-user restore UI and must not be applied to real data.
 fresh=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=fresh.serve_forever,daemon=True).start();freshorigin=f'http://127.0.0.1:{fresh.server_port}/Mi-Bowling/'
 try:
  driver.get(freshorigin);assert js('return localStorage.getItem(KEY)') is None
  assert aj("""async ({storage,pdf})=>{for(const [k,v] of Object.entries(storage))localStorage.setItem(k,v);await oilPut('F-P1',new Blob([Uint8Array.from(pdf)],{type:'application/pdf'}));return true}""",{'storage':json.loads((rec/'localStorage-exacto.json').read_text()),'pdf':list((rec/'pdfs/patron-001.pdf').read_bytes())}) is True
  driver.refresh();assert snap()==before and state()==initial;pdfcheck();log('TECHNICAL_REHYDRATION_SYNTHETIC')
 finally:fresh.shutdown();fresh.server_close()
 log('PASS')
finally:driver.quit()
