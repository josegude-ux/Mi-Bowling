#!/usr/bin/env python3
"""CP028: Safari nativo macOS via safaridriver, sin Playwright WebKit.
Únicamente localhost y fixtures sintéticos; no toca fuentes de PWA ni datos reales.
La sesión de SafariDriver es temporal. Si el driver no funciona, NO GO técnico,
sin forzar políticas del sistema ni activar datos de producción.
"""
from __future__ import annotations
import hashlib
import http.server
import json
import mimetypes
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
SW_A=(ROOT/'sw.js').read_text(encoding='utf-8')
INDEX_A=(ROOT/'index.html').read_bytes()
release_match=re.search(r'^const RELEASE="([^"]+)";$',SW_A,re.M)
manifest_match=re.search(r'^const HASHES=(\{.*\});$',SW_A,re.M)
assert release_match and manifest_match, 'CP028: SW manifest format unsupported'
HASH_A=json.loads(manifest_match.group(1))
assert len(HASH_A)==68, 'CP028: expected CP025 68 hash-verified resources'
ALIASES=('./','./index.html','./?cp021lab=ficticio')
sha=lambda b:hashlib.sha256(b).hexdigest()
for key in ALIASES:assert HASH_A[key]==sha(INDEX_A), 'CP028: unsafe A HTML alias '+key
for resource,expected in HASH_A.items():
    path=urllib.parse.urlparse(resource).path
    relative=path.removeprefix('./').lstrip('/')
    if not relative or relative.endswith('/'):relative+='index.html'
    raw=(ROOT/relative).resolve()
    assert raw.is_relative_to(ROOT) and raw.is_file(), 'CP028: missing file '+resource
    assert sha(raw.read_bytes())==expected, 'CP028: source hash mismatch '+resource

MARKER='<meta name="cp028-synthetic-release" content="B">'
assert INDEX_A.count(b'</head>')==1,'CP028: HTML marker missing'
INDEX_B=INDEX_A.replace(b'</head>',('  '+MARKER+'\n</head>').encode('utf-8'))
HASH_B=dict(HASH_A)
for key in ALIASES:HASH_B[key]=sha(INDEX_B)
SW_B=(SW_A.replace(release_match.group(0),'const RELEASE="'+release_match.group(1)+'-cp028-safari-B";')
       .replace(manifest_match.group(0),'const HASHES='+json.dumps(HASH_B,separators=(',',':'),ensure_ascii=False)+';'))
assert SW_A.partition('\n\nconst CACHE=')[2]==SW_B.partition('\n\nconst CACHE=')[2], 'CP028: Cachefix2 changed'
assert 'skipWaiting()' not in SW_B, 'CP028: unsafe forced SW activation'
assert len(HASH_B)==68

serve={'version':'A','requests':{'A':0,'B':0},'errors':[]}
class LocalFiles(http.server.BaseHTTPRequestHandler):
    def log_message(self,fmt,*args): pass
    def do_GET(self):
        try:
            uri=urllib.parse.urlsplit(self.path)
            relative=urllib.parse.unquote(uri.path).lstrip('/')
            if not relative or relative.endswith('/'):relative+='index.html'
            local=(ROOT/relative).resolve()
            if not local.is_relative_to(ROOT):
                self.send_error(403);return
            if relative=='sw.js': data=(SW_A if serve['version']=='A' else SW_B).encode()
            elif relative=='index.html':data=INDEX_A if serve['version']=='A' else INDEX_B
            else:data=local.read_bytes()
            serve['requests'][serve['version']]+=1
            self.send_response(200)
            self.send_header('Content-Type',mimetypes.guess_type(relative)[0] or 'application/octet-stream')
            self.send_header('Content-Length',str(len(data)))
            self.send_header('Cache-Control','no-store')
            self.end_headers();self.wfile.write(data)
        except Exception as exc:
            serve['errors'].append({'path':self.path.split('?')[0],'reason':type(exc).__name__})
            self.send_error(404)


def unused_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0));return s.getsockname()[1]

class WebDriverError(Exception): pass
class Driver:
    def __init__(self,port):self.port=port;self.session=None
    def rpc(self,verb,suffix,payload=None,timeout=70):
        endpoint='http://127.0.0.1:'+str(self.port)+suffix
        body=json.dumps(payload).encode() if payload is not None else None
        request=urllib.request.Request(endpoint,data=body,method=verb,headers={'Content-Type':'application/json;charset=UTF-8'})
        try:
            with urllib.request.urlopen(request,timeout=timeout) as resp:data=json.loads(resp.read())
        except urllib.error.HTTPError as e:
            raise WebDriverError('HTTP '+str(e.code)+' '+e.read().decode('utf-8',errors='replace')[:650]) from e
        if isinstance(data.get('value'),dict) and data['value'].get('error'):
            raise WebDriverError(str(data['value'])[:750])
        return data
    def start(self):
        r=self.rpc('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'safari'}}},timeout=40)
        self.session=r.get('value',{}).get('sessionId') or r.get('sessionId')
        assert self.session, 'CP028 SafariDriver returned no session ID'
    def get(self,url):self.rpc('POST',f'/session/{self.session}/url',{'url':url},timeout=45)
    def js(self,script):return self.rpc('POST',f'/session/{self.session}/execute/sync',{'script':script,'args':[]})['value']
    def js_async(self,script,timeout=35):
        self.rpc('POST',f'/session/{self.session}/timeouts',{'script':timeout*1000})
        return self.rpc('POST',f'/session/{self.session}/execute/async',{'script':script,'args':[]},timeout=timeout+10)['value']
    def stop(self):
        if self.session:
            try:self.rpc('DELETE',f'/session/{self.session}',timeout=12)
            except Exception: pass
            self.session=None

def poll(label,fn,seconds=36):
    end=time.monotonic()+seconds;result=None
    while time.monotonic()<end:
        try:
            result=fn()
            if isinstance(result,dict) and result.get('ok'):return result
        except Exception as e:result={'error':str(e)[:180]}
        time.sleep(.35)
    raise AssertionError('CP028_TIMEOUT_'+label+' '+json.dumps(result,ensure_ascii=False)[:1000])

async_state='''var done=arguments[arguments.length-1];
Promise.all([navigator.serviceWorker.getRegistration(),caches.keys()]).then(function(v){
 var r=v[0];done({active:r&&r.active&&r.active.state,waiting:r&&r.waiting&&r.waiting.state,
 installing:r&&r.installing&&r.installing.state,controlled:!!navigator.serviceWorker.controller,
 marker:document.querySelector('meta[name="cp028-synthetic-release"]')?.content||'A',
 count:v[1].filter(x=>x.indexOf('mi-bowling-release-')===0).length,
 compact:!!document.querySelector('.cp021-root')});
}).catch(function(e){done({error:String(e)})});'''
def inspect(d):return d.js_async(async_state,timeout=14)
def info(d):
    z=inspect(d)
    z['ok']=z['active']=='activated' and z['count']>=1
    return z

def source_guard(d):
    return d.js("return ['mi-bowling-analitica-v2','mi-bowling-v1','mi-bowling-liga-v1','mi-bowling-ball-selection-v1'].map(k=>localStorage.getItem(k))")

server=http.server.ThreadingHTTPServer(('127.0.0.1',0),LocalFiles)
origin='http://127.0.0.1:'+str(server.server_address[1]);lab=origin+'/?cp021lab=ficticio'
thread=threading.Thread(target=server.serve_forever,daemon=True)
driver_port=unused_port();proc=None;d=Driver(driver_port);serverOff=False
try:
    thread.start()
    proc=subprocess.Popen(['/usr/bin/safaridriver','-p',str(driver_port)],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
    ready=False
    for _ in range(80):
        if proc.poll() is not None:break
        try:
            d.rpc('GET','/status',timeout=2);ready=True;break
        except Exception:time.sleep(.15)
    if not ready:raise WebDriverError('CP028_SAFARIDRIVER_NOT_READY; environment cannot start real Safari WebDriver')
    d.start()
    d.get(lab)
    poll('LAB_MOUNT',lambda:{'ok':bool(d.js("return !!(window.MiBowlingRegistroCP021?.enabled&&document.querySelector('.cp021-root'))"))},seconds=25)
    assert source_guard(d)==[None]*4,'CP028_PROTECTED_KEYS_FOUND: stop'
    state=poll('A_ACTIVATED',lambda:info(d),seconds=45)
    print('CP028_SAFARI_A_ACTIVATED '+json.dumps(state),flush=True)
    d.get(lab)
    poll('A_CONTROLLER',lambda:(lambda z:dict(z,ok=z.get('controlled') and z.get('marker')=='A'))(inspect(d)),seconds=20)
    migration=d.js_async('''var done=arguments[arguments.length-1];
window.MiBowlingRegistroCP021.promoteV3Demo().then(function(v){done(v)},function(e){done({error:String(e)})});''',timeout=35)
    assert not migration.get('error'), 'CP028 V3 migration error '+str(migration)[:250]
    assert migration['totalGames']==2 and migration['averageScore']==289
    read=d.js_async('''var done=arguments[arguments.length-1];
window.MiBowlingRegistroCP021.readV3Synthetic().then(function(v){done(v)},function(e){done({error:String(e)})});''')
    assert read.get('version')==3 or read.get('format')=='v3', 'CP028 v3 reader failed '+str(read)[:250]
    assert source_guard(d)==[None]*4
    print('CP028_SAFARI_V3_INTEGRATED '+json.dumps({'games':migration['totalGames'],'average':migration['averageScore'],'protectedKeys':'unchanged'}),flush=True)
    serve['version']='B'
    d.js_async('''var done=arguments[arguments.length-1];navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>done({ok:true}),e=>done({error:String(e)}));''')
    waiting=poll('B_WAITING',lambda:(lambda z:dict(z,ok=z.get('waiting')=='installed' and z.get('active')=='activated'))(inspect(d)),seconds=45)
    assert waiting['marker']=='A','CP028 B interrupted A client'
    print('CP028_SAFARI_B_WAITING '+json.dumps(waiting),flush=True)
    d.get('about:blank');time.sleep(1);d.get(lab)
    upgraded=poll('B_ACTIVATED',lambda:(lambda z:dict(z,ok=z.get('marker')=='B' and z.get('active')=='activated' and z.get('controlled')))(inspect(d)),seconds=50)
    print('CP028_SAFARI_B_ACTIVATED '+json.dumps(upgraded),flush=True)
    stored=d.js_async('''var done=arguments[arguments.length-1];window.MiBowlingRegistroCP021.inspectSynthetic().then(v=>done({mode:v.mode,average:v.stats.averageScore}),e=>done({error:String(e)}));''')
    assert stored.get('mode')=='shadow-v3' and stored.get('average')==289
    serve['version']='A'
    d.js_async('''var done=arguments[arguments.length-1];navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>done({ok:true}),e=>done({error:String(e)}));''')
    poll('A_ROLLBACK_WAITING',lambda:(lambda z:dict(z,ok=z.get('waiting')=='installed'))(inspect(d)),seconds=50)
    d.get('about:blank');time.sleep(1);d.get(lab)
    reverted=poll('A_ROLLBACK',lambda:(lambda z:dict(z,ok=z.get('marker')=='A' and z.get('controlled') and z.get('active')=='activated'))(inspect(d)),seconds=50)
    print('CP028_SAFARI_A_ROLLBACK '+json.dumps(reverted),flush=True)
    # True network-off scenario: localhost server shutdown, original SafariDriver session stays open.
    server.shutdown();server.server_close();serverOff=True
    d.get(lab)
    poll('OFFLINE_MOUNT',lambda:{'ok':bool(d.js("return !!(window.MiBowlingRegistroCP021?.enabled&&document.querySelector('.cp021-root')&&navigator.serviceWorker.controller)"))},seconds=25)
    offline=d.js_async('''var done=arguments[arguments.length-1];window.MiBowlingRegistroCP021.inspectSynthetic().then(v=>done({mode:v.mode,average:v.stats.averageScore}),e=>done({error:String(e)}));''')
    assert offline.get('mode')=='shadow-v3' and offline.get('average')==289
    assert not serve['errors'], 'Unexpected localhost 404 '+str(serve['errors'][:4])
    print('CP028_SAFARI_OFFLINE_PASS '+json.dumps({'serverOff':True,'sameSafariSession':True,'mode':offline['mode'],'average':offline['average']}),flush=True)
    print('CP028_FINAL_PASS: native Safari macOS A->B wait->activate->A rollback->localhost off; synthetic v3 preserved',flush=True)
except Exception as exc:
    print('CP028_FINAL_NO_GO '+type(exc).__name__+': '+str(exc)[:1000],file=sys.stderr,flush=True)
    print('CP028_DIAGNOSTIC '+json.dumps({'serving':serve['version'],'requests':serve['requests'],'404':serve['errors'][:6]}),file=sys.stderr,flush=True)
    sys.exit(1)
finally:
    d.stop()
    if proc:
        proc.terminate()
        try:proc.wait(timeout=4)
        except subprocess.TimeoutExpired:proc.kill()
    if not serverOff:
        server.shutdown();server.server_close()
