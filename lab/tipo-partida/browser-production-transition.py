"""Actual SW update on a nested scope. All fixtures synthetic. No production."""
import argparse,base64,hashlib,json,os,tempfile,threading,time,urllib.parse,mimetypes
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('engine',choices=['chromium','webkit']);p.add_argument('scenario',choices=['visual','rollback']);a=p.parse_args()
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

cp3=release;cp4=tmp/'tipo-cp004/candidate';rb=tmp/'tipo-cp004/rollback-production'
def shell(pg,css):return pg.evaluate('APP_VERSION')==css
def verify_cache(pg,folder):
 m=json.loads((tmp/'tipo-cp004'/(folder.name+'-manifest.json')).read_text()) if folder!=cp3 else {'release':'tipo-3311-cp003','cache':hashes}
 result=pg.evaluate("""async m=>{const n='mi-bowling-release-'+m.release+'-'+encodeURIComponent(new URL('./',location.href).href);const c=await caches.open(n),rows=[];for(const [key,h] of Object.entries(m.cache)){const r=await c.match(new URL(key,location.href).href);const actual=r?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await r.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join(''):null;rows.push(actual===h)}return {name:n,count:rows.filter(Boolean).length,total:rows.length}}""",m)
 log('CACHE',result);assert result['count']==result['total']==33
 return result['name']
def visual(pg):
 pg.evaluate("go('historial');historyMode='pendiente';historyOpenDay='pendiente2026-01-01';render()")
 for width in (320,360,390):
  pg.set_viewport_size({'width':width,'height':844})
  data=pg.evaluate("""()=>{const q=document.querySelector('#app .seg');return {doc:document.documentElement.scrollWidth,viewport:innerWidth,buttons:[...q.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return {text:b.textContent,x:r.x,y:r.y,right:r.right,w:r.width,h:r.height,scroll:b.scrollWidth,client:b.clientWidth,whiteSpace:s.whiteSpace}})}}""")
  log('CP004_VISUAL',data);bs=data['buttons'];assert data['doc']<=width+1 and len(bs)==3 and all(b['right']<=width+1 and b['h']>=44 and b['scroll']<=b['client']+1 for b in bs)
  if width<=360:assert bs[0]['y']==bs[1]['y'] and bs[2]['y']>bs[0]['y'] and bs[2]['w']>bs[0]['w']*1.9 and all(b['whiteSpace']=='nowrap' for b in bs)
  pg.screenshot(path=str(tmp/f'tipo-cp004-{a.engine}-{width}.png'))
 log('VISUAL_PASS')
def change_release(pg,ctx,folder,oldcss,newcss,before):
 state['root']=folder
 pg.evaluate("async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()}")
 wait(pg,"async()=>!!(await navigator.serviceWorker.getRegistration()).waiting")
 assert shell(pg,oldcss) and snapshot(pg)==before
 names=pg.evaluate("async()=>await caches.keys()");log('WAITING_OLD_CLIENT',names)
 standby=ctx.new_page();pg.close();time.sleep(1);load(standby);gate(standby)
 wait(standby,"async()=>{const r=await navigator.serviceWorker.getRegistration();return !r.waiting&&r.active?.state==='activated'}")
 assert shell(standby,newcss) and snapshot(standby)==before;checkpdf(standby)
 return standby
with sync_playwright() as pw,tempfile.TemporaryDirectory(prefix='tipo-cp004-') as profile:
 engine=getattr(pw,a.engine)
 if a.scenario=='visual':
  state['root']=cp4
  ctx=engine.launch_persistent_context(profile,headless=True,service_workers='block',viewport={'width':390,'height':844})
  pg=ctx.pages[0];load(pg);seed(pg);pg.reload(wait_until='load');visual(pg);ctx.close()
 else:
  ctx=openctx(engine,profile);pg=ctx.pages[0];load(pg);wait(pg,"async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.state==='activated'}");pg.reload(wait_until='load');gate(pg)
  old_cache(pg);n0='mi-bowling-analitica-v3-3-10-catalogo-cp037';seed(pg);pg.reload(wait_until='load');gate(pg);before=snapshot(pg);checkpdf(pg)
  pg=change_release(pg,ctx,cp4,'3.3.10-catalogo','3.3.11-tipo-partida',before)
  n1=verify_cache(pg,cp4);pg.evaluate("db.hand='diestro';save()");before=snapshot(pg);assert json.loads(before['mi-bowling-analitica-v2'])['hand']=='diestro';log('POST_UPDATE_EDIT_SAVED')
  pg=change_release(pg,ctx,rb,'3.3.11-tipo-partida','3.3.10-catalogo',before)
  n2=verify_cache(pg,rb);assert {n0,n1,n2}.issubset(set(pg.evaluate("async()=>await caches.keys()")))
  ctx.close();ctx=openctx(engine,profile);pg=ctx.pages[0];load(pg);gate(pg);assert snapshot(pg)==before and shell(pg,'3.3.10-catalogo');checkpdf(pg)
  server.shutdown();server.server_close();pg.reload(wait_until='load');assert snapshot(pg)==before and shell(pg,'3.3.10-catalogo');checkpdf(pg);verify_cache(pg,rb);log('ROLLBACK_OFFLINE_PRESERVED_DATA_AND_ALL_CACHES');ctx.close()
 log('PASS')
