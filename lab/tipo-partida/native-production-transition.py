"""Native Safari only: use Apple's official WebDriver; no Playwright WebKit."""
import os,json,time,threading,hashlib,base64,urllib.parse,mimetypes
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
root=Path(os.environ['RUNNER_TEMP']);cp3=root/'tipo-base';cp4=root/'tipo-cp004/candidate';rb=root/'tipo-cp004/rollback-production';state={'root':cp3}
def log(k,v=None):print('SAFARI_NATIVE',k,json.dumps(v,default=str),flush=True)
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  p=urllib.parse.urlsplit(self.path).path
  if not p.startswith('/Mi-Bowling/'):self.send_error(404);return
  f=state['root']/(p[len('/Mi-Bowling/'):] or 'index.html')
  if not f.resolve().is_relative_to(state['root'].resolve()) or not f.is_file():self.send_error(404);return
  b=f.read_bytes();self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(f.name)[0] or 'application/octet-stream');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}/Mi-Bowling/'
driver=webdriver.Safari();driver.set_page_load_timeout(25);driver.set_script_timeout(20)
def js(s,*args):return driver.execute_script(s,*args)
def asyncjs(s,*args):return driver.execute_async_script("const done=arguments[arguments.length-1];const args=Array.from(arguments).slice(0,-1);Promise.resolve().then(()=>("+s+")(...args)).then(done,e=>done({error:String(e)}))",*args)
def wait(s):return WebDriverWait(driver,25).until(lambda _:asyncjs(s) is True)
def snap():return js("return Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('mi-bowling-')).sort().map(k=>[k,localStorage.getItem(k)]))")
def checkcache(folder):
 m={'release':'tipo-3311-cp003','cache':json.loads((root/'tipo-cache.json').read_text())} if folder==cp3 else json.loads((root/'tipo-cp004'/(folder.name+'-manifest.json')).read_text())
 r=asyncjs("""async m=>{const n='mi-bowling-release-'+m.release+'-'+encodeURIComponent(new URL('./',location.href).href);const names=await caches.keys();if(!names.includes(n))return {name:n,count:0,names};const c=await caches.open(n);let count=0;for(const [key,h] of Object.entries(m.cache)){const x=await c.match(new URL(key,location.href).href);if(x&&Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await x.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('')===h)count++}return {name:n,count,names}}""",m)
 log('CACHE_HASH_COUNTS',r);assert r['count']==33,r

def checkpdf():
 r=asyncjs("""async()=>{const f=await oilGet('LAB-P');return f?await f.text():null}""");assert r=='%PDF-1.4\n% synthetic native safari\n%%EOF\n',r
try:
 driver.get(origin);log('CAPABILITIES',driver.capabilities);log('UA',js('return navigator.userAgent'))
 probe=asyncjs("""async()=>{const c=await caches.open('lab-native-probe'),u=new URL('probe',location.href).href;await c.put(u,new Response('synthetic'));const r=await c.match(u);return {keys:(await c.keys()).length,body:r?await r.text():null}}""");log('CACHE_CONTROL',probe);assert probe=={'keys':1,'body':'synthetic'},probe
 wait("async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.state==='activated'}");driver.refresh();wait("async()=>!!navigator.serviceWorker.controller");log('LEGACY_CACHE',asyncjs("async()=>{const c=await caches.open('mi-bowling-analitica-v3-3-10-catalogo-cp037');return (await c.keys()).length}"));assert asyncjs("async()=>{const c=await caches.open('mi-bowling-analitica-v3-3-10-catalogo-cp037');return (await c.keys()).length}")==31
 fixture={'version':2,'hand':'zurdo','balls':[],'patterns':[{'id':'LAB-P','name':'Ficticio','pdfName':'ficticio.pdf'}],'sessions':[{'id':'LAB-S','type':'entrenamiento','date':'2026-01-01','title':'Ficticio','games':[{'id':'LAB-G','includeStats':True,'rolls':[]}]}]}
 assert asyncjs("""async d=>{localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(migrate(d)));localStorage.setItem('mi-bowling-ball-selection-v1',JSON.stringify({__next__:[]}));await oilPut('LAB-P',new File(['%PDF-1.4\\n% synthetic native safari\\n%%EOF\\n'],'ficticio.pdf',{type:'application/pdf'}));return true}""",fixture) is True
 driver.refresh();wait("async()=>!!navigator.serviceWorker.controller");before=snap();checkpdf();assert js('return APP_VERSION')=='3.3.10-catalogo'
 for folder,css in [(cp4,'3.3.11-tipo-partida'),(rb,'3.3.10-catalogo')]:
  old=js('return APP_VERSION')
  state['root']=folder;assert asyncjs("async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();return true}") is True
  wait("async()=>!!(await navigator.serviceWorker.getRegistration()).waiting")
  assert js('return APP_VERSION')==old and snap()==before
  driver.get('about:blank');time.sleep(2);driver.get(origin);wait("async()=>!!navigator.serviceWorker.controller");wait("async()=>{const r=await navigator.serviceWorker.getRegistration();return !r.waiting&&r.active?.state==='activated'}")
  assert js('return APP_VERSION')==css and snap()==before;checkpdf();checkcache(folder);log('TRANSITION_PASS',folder.name)
  if folder==cp4:
   # Make a new legitimate change through the candidate, and demand its preservation by rollback.
   js("db.hand='diestro';save()")
   before=snap();assert json.loads(before['mi-bowling-analitica-v2'])['hand']=='diestro';log('POST_UPDATE_EDIT_SAVED')
 server.shutdown();server.server_close();driver.refresh();assert snap()==before and js('return APP_VERSION')=='3.3.10-catalogo';checkpdf();checkcache(rb);log('OFFLINE_PRODUCTION_ROLLBACK_PASS')
finally:driver.quit()
