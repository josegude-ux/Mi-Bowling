"""Real WebKit close modes with lifecycle evidence; no MI BOWLING writes."""
import argparse,json,tempfile,threading,time
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('mode',choices=['normal','script','direct']);a=p.parse_args()
script="""let release;const done=new Promise(r=>release=r);let writer=false;const trace=(name)=>{try{localStorage.setItem('lab-close-trace',JSON.stringify([...JSON.parse(localStorage.getItem('lab-close-trace')||'[]'),{name,writer}]))}catch(e){}};addEventListener('beforeunload',()=>trace('beforeunload'));addEventListener('pagehide',()=>{trace('pagehide');writer=false;release();},{once:true});void navigator.locks.request('lab-control-writer',{mode:'exclusive',ifAvailable:true},async lock=>{writer=!!lock;document.querySelector('#ready').textContent=lock?'ready':'blocked';if(lock)await done;});document.querySelector('#exit').onclick=()=>window.close();"""
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  if self.path=='/':
   body='<!doctype html><meta charset=utf-8><button id="open" onclick="window.open(\\'/held\\',\\'_blank\\')">Open</button>'
  elif self.path=='/held':
   body='<!doctype html><meta charset=utf-8><div id=ready>starting</div><button id=touch>Touch</button><button id=exit>Close</button><script type=module>'+script+'</script>'
  else:self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' blob:; object-src 'none'");self.end_headers();self.wfile.write(body.encode())
server=ThreadingHTTPServer(('127.0.0.1',8768),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
def log(s,v=None):print('CLOSE_CONTROL',a.mode,s,json.dumps(v,default=str),flush=True)
with sync_playwright() as pw,tempfile.TemporaryDirectory(prefix='wk-close-') as profile:
 ctx=pw.webkit.launch_persistent_context(profile,headless=True,service_workers='allow')
 try:
  root=ctx.pages[0];root.set_default_timeout(8000);root.goto('http://127.0.0.1:8768/',wait_until='commit')
  root.evaluate("localStorage.removeItem('lab-close-trace')")
  with root.expect_popup(timeout=8000) as pop:root.locator('#open').click()
  old=pop.value;old.set_default_timeout(8000);expect(old.locator('#ready')).to_have_text('ready',timeout=8000)
  old.locator('#touch').click()
  before=root.evaluate("()=>navigator.locks.query()");log('LOCK_BEFORE',before)
  if a.mode=='normal':
   with old.expect_event('close',timeout=8000):old.close(run_before_unload=True)
  elif a.mode=='script':
   with old.expect_event('close',timeout=8000):old.locator('#exit').click(no_wait_after=True)
  else:old.close()
  log('CLOSED',old.is_closed())
  trace=root.evaluate("JSON.parse(localStorage.getItem('lab-close-trace')||'[]')");log('LIFECYCLE',trace)
  # Query from an unrelated surviving same-origin document. Do not request a new
  # lock until after the real close and an observed release.
  after=None
  for _ in range(20):
   after=root.evaluate("()=>navigator.locks.query()")
   if not after['held']:break
   time.sleep(.15)
  log('LOCK_AFTER_CLOSE',after)
  with root.expect_popup(timeout=8000) as pop:root.locator('#open').click()
  new=pop.value;expect(new.locator('#ready')).not_to_have_text('starting',timeout=8000)
  state=new.locator('#ready').inner_text();log('REOPEN_STATE',state)
  current=root.evaluate("()=>navigator.locks.query()");log('LOCK_REOPEN',current)
  assert state=='ready' and len(current['held'])==1 and current['held'][0]['clientId']!=before['held'][0]['clientId'],(trace,after,state,current)
  log('PASS')
 finally:ctx.close()
server.shutdown()
