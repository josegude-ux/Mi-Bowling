"""Minimal WebKit reload controls, no application code/data or external requests."""
import argparse, json, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('mode',choices=['plain','held']);a=p.parse_args()
script="""document.querySelector('#ready').textContent='ready';"""
if a.mode=='held':
    script="""await navigator.locks.request('lab-control-writer',{mode:'exclusive',ifAvailable:true},async lock=>{document.querySelector('#ready').textContent=lock?'ready':'blocked';if(lock)await new Promise(()=>{});});"""
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path!='/':self.send_error(404);return
        b=('<!doctype html><meta charset=utf-8><div id=ready>starting</div><script type=module>'+script+'</script>').encode()
        self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' blob:; object-src 'none'");self.end_headers();self.wfile.write(b)
server=ThreadingHTTPServer(('127.0.0.1',8768),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
def log(s,v=None):print('CONTROL',a.mode,s,json.dumps(v,default=str),flush=True)
with sync_playwright() as pw, tempfile.TemporaryDirectory(prefix='wk-control-') as profile:
    ctx=pw.webkit.launch_persistent_context(profile,headless=True,service_workers='allow')
    try:
        page=ctx.pages[0];page.set_default_timeout(8000);page.set_default_navigation_timeout(8000)
        page.on('pageerror',lambda e:log('PAGE_ERROR',str(e)))
        log('NAV',page.goto('http://127.0.0.1:8768/',wait_until='commit').status)
        page.locator('#ready').get_by_text('ready',exact=True).count() if False else None
        from playwright.sync_api import expect
        expect(page.locator('#ready')).to_have_text('ready',timeout=8000)
        log('INITIAL',page.evaluate("()=>({state:document.readyState,text:document.querySelector('#ready').textContent})"))
        if a.mode=='held':log('LOCK_BEFORE',page.evaluate("()=>navigator.locks.query()"))
        log('RELOAD_BEGIN')
        log('RELOAD_HTTP',page.reload(wait_until='commit').status)
        log('LOCATOR_BEGIN')
        expect(page.locator('#ready')).to_have_text('ready',timeout=8000)
        log('LOCATOR_READY')
        log('EVAL_AFTER',page.evaluate("()=>({state:document.readyState,text:document.querySelector('#ready').textContent})"))
        if a.mode=='held':log('LOCK_AFTER',page.evaluate("()=>navigator.locks.query()"))
        log('PASS')
    finally:
        ctx.close()
server.shutdown()
