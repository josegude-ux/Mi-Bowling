"""Read-only HTTPS verification. No account cookies, no browser storage, no data writes."""
import hashlib,json,re,time,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urljoin,urlparse
ORIGIN='https://josegude-ux.github.io/Mi-Bowling/'
EXPECTED={
'index.html':'4be15b43f809b3fc5f73c4707845ddcd9b5287bc5283582baeace3ab1bd064c2',
'sw.js':'db27aef42e6e7fc4a0a7dd6b2638164cc44e8cce049cc0b88ea283356924359e',
'app-tipo-3311-cp003.js':'449484ec253923fc9b4f95d75cae7853218bb033df0aebb9358502780711775d',
'tipo-partida-3311-cp003.css':'672105fe8ab67a0e1b9090eea4cf30d80a7d6c9380ce64a03bb860f324a5ee67',
'tipo-partida-3311-cp004.css':'158838e14bb64faf6e087805eb175ad1f215c359f7b8cafd76258886ed25b72c',
'app.js':'1c04608ae8a125c8787b5602e1c0ca31aaa43d7de5c5464b8cac35eab5004409'}
sha=lambda b:hashlib.sha256(b).hexdigest()
def fetch(key):
 url=urljoin(ORIGIN,key)
 assert url.startswith(ORIGIN)
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'MI-BOWLING-CP008-Integrity-ReadOnly/1.0','Cache-Control':'no-cache','Accept-Encoding':'identity'}),timeout=12) as r:
  body=r.read();assert r.status==200 and r.geturl()==url,(r.status,r.geturl(),url)
  return body
def verify():
 result={'origin':ORIGIN,'expected_version':'3.3.11-tipo-partida','files':{},'cache':{}}
 for name,want in EXPECTED.items():
  b=fetch(name);got=sha(b);assert got==want,(name,got,want)
  result['files'][name]=got
 root=fetch('./');assert sha(root)==EXPECTED['index.html']
 assert b'app-tipo-3311-cp003.js' in root and b'tipo-partida-3311-cp004.css' in root
 worker=fetch('sw.js').decode()
 assert 'const RELEASE="tipo-3311-cp004";' in worker
 hashes=json.loads(re.search(r'const HASHES=(.*?);',worker).group(1))
 assert len(hashes)==33
 # Exact SW hash additionally covers absence of forced activation/deletion.
 for key,want in hashes.items():
  got=sha(fetch(key));assert got==want,(key,got,want);result['cache'][key]=got
 app=fetch('app-tipo-3311-cp003.js')
 assert b"const APP_VERSION='3.3.11-tipo-partida';" in app and b'function classificationPlan' in app
 result['root_sha256']=sha(root);result['cache_count']=len(result['cache']);result['status']='PASS'
 return result
for n in range(12):
 try:
  result=verify();print('PUBLIC_CP004_VERIFIED '+json.dumps(result,ensure_ascii=False),flush=True);Path('public-cp004-results.json').write_text(json.dumps(result,indent=2)+'\n');break
 except Exception as e:
  print('PUBLIC_CP004_ATTEMPT',n+1,type(e).__name__,str(e)[:800],flush=True)
  if n==11:raise
  time.sleep(10)
