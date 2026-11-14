"""Native Safari only: use Apple's official WebDriver; no Playwright WebKit."""
import os,json,time,threading,hashlib,base64,urllib.parse,mimetypes
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
root=Path(os.environ['RUNNER_TEMP']);cp3=root/'tipo-release';cp4=root/'tipo-cp004/candidate';rb=root/'tipo-cp004/rollback';state={'root':cp3}
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
 m=json.loads((root/'tipo-cache.json').read_text()) if folder==cp3 else json.loads((root/'tipo-cp004'/(folder.name+'-manifest.json')).read_text())['cache']
 r=asyncjs("""async m=>{const name=(await caches.keys()).find(n=>n.startsWith('mi-bowling-release-')&&n.includes(arguments[0]||''));const names=await caches.keys(),results={};for(const n of names){const c=await caches.open(n);let count=0;for(const [key,h] of Object.entries(m)){const x=await c.match(new URL(key,location.href).href);if(x&&Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await x.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('')===h)count++}results[n]=count}return results}""",m)
 log('CACHE_HASH_COUNTS',r);assert any(v==33 for v in r.values()),r
def checkpdf():
 r=asyncjs("""async()=>{const f=await oilGet('LAB-P');return f?await f.text():null}""");assert r=='%PDF-1.4\n% synthetic native safari\n%%EOF\n',r
try:
 driver.get(origin);log('CAPABILITIES',driver.capabilities);log('UA',js('return navigator.userAgent'))
 probe=asyncjs("""async()=>{const c=await caches.open('lab-native-probe'),u=new URL('probe',location.href).href;await c.put(u,new Response('synthetic'));const r=await c.match(u);return {keys:(await c.keys()).length,body:r?await r.text():null}}""");log('CACHE_CONTROL',probe);assert probe=={'keys':1,'body':'synthetic'},probe
 wait("async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.state==='activated'}");driver.refresh();wait("async()=>!!navigator.serviceWorker.controller");checkcache(cp3)
 fixture={'version':2,'hand':'zurdo','balls':[],'patterns':[{'id':'LAB-P','name':'Ficticio','pdfName':'ficticio.pdf'}],'sessions':[{'id':'LAB-S','type':'entrenamiento','date':'2026-01-01','title':'Ficticio','games':[{'id':'LAB-G','includeStats':True,'rolls':[]}]}]}
 assert asyncjs("""async d=>{localStorage.setItem('mi-bowling-analitica-v2',JSON.stringify(migrate(d)));localStorage.setItem('mi-bowling-ball-selection-v1',JSON.stringify({__next__:[]}));await oilPut('LAB-P',new File(['%PDF-1.4\\n% synthetic native safari\\n%%EOF\\n'],'ficticio.pdf',{type:'application/pdf'}));return true}""",fixture) is True
 driver.refresh();wait("async()=>!!navigator.serviceWorker.controller");before=snap();checkpdf()
 for folder,css in [(cp4,'tipo-partida-3311-cp004.css'),(rb,'tipo-partida-3311-cp003.css')]:
  old=js("return document.querySelector('link[href*=\"tipo-partida-3311\"]').getAttribute('href')")
  state['root']=folder;assert asyncjs("async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();return true}") is True
  wait("async()=>!!(await navigator.serviceWorker.getRegistration()).waiting")
  assert js("return document.querySelector('link[href*=\"tipo-partida-3311\"]').getAttribute('href')")==old and snap()==before
  driver.get('about:blank');time.sleep(2);driver.get(origin);wait("async()=>!!navigator.serviceWorker.controller");wait("async()=>{const r=await navigator.serviceWorker.getRegistration();return !r.waiting&&r.active?.state==='activated'}")
  assert js("return document.querySelector('link[href*=\"tipo-partida-3311\"]').getAttribute('href')")==css and snap()==before;checkpdf();checkcache(folder);log('TRANSITION_PASS',folder.name)
 server.shutdown();server.server_close();driver.refresh();assert snap()==before;checkpdf();log('OFFLINE_ROLLBACK_PASS')
finally:driver.quit()
