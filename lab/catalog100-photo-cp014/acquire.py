import base64,hashlib,io,json,os,re,pathlib
from urllib.parse import urljoin,urlparse,unquote
import requests
from bs4 import BeautifulSoup
from PIL import Image
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
P=pathlib.Path(__file__).parent
HOSTS={'www.sunbridge-group.com','sunbridge-group.com','brunswickkorea.co.kr','www.brunswickkorea.co.kr','www.perfectkorea.com','ww.perfectkorea.com','shop.perfectkorea.com','perfectkorea.com','brunswickbowling.nyc3.cdn.digitaloceanspaces.com','trackbowling.com','hammerbowling.com','cdn.shopify.com'}
def safe(u):
 p=urlparse(u)
 return p.scheme=='https' and (p.hostname in HOSTS or (p.hostname or '').endswith('.cafe24.com') or (p.hostname or '').endswith('.cafe24img.com') or (p.hostname or '').endswith('.cafe24cdn.com'))
def get(url,limit):
 for _ in range(4):
  if not safe(url):raise ValueError('Host not approved: '+str(urlparse(url).hostname))
  with requests.get(url,timeout=(8,25),allow_redirects=False,stream=True,headers={'User-Agent':'Mozilla/5.0'}) as r:
   if r.is_redirect: url=urljoin(url,r.headers['Location']);continue
   r.raise_for_status()
   data=bytearray()
   for c in r.iter_content(65536):
    data.extend(c)
    if len(data)>limit:raise ValueError('Too large')
   return bytes(data),url
 raise ValueError('Too many redirects')
def norm(s):return re.sub(r'[^a-z0-9]','',unquote(s).lower())
def page(url):
 b,u=get(url,8_000_000);return BeautifulSoup(b,'html.parser'),u
def urls(s,u):
 out=[]
 for m in s.select('meta[property="og:image"],meta[property="og:image:secure_url"]'):
  if m.get('content'):out.append((urljoin(u,m['content']),'og:image'))
 for i in s.select('img'):
  for k in ('data-src','src','data-original'):
   v=i.get(k)
   if v and not v.startswith('data:'):out.append((urljoin(u,v),str(i.get('alt',''))+' '+str(i.get('class',''))))
 return out
def choose(e,s,u):
 n=norm(e['title'])
 arr=urls(s,u)
 filtered=[]
 for v,alt in arr:
  if not safe(v):continue
  z=norm(v+' '+alt)
  if any(x in z for x in ['core','logoicon','banner','trajectory','chart','youtube','sprite','icon','backside','rear']):continue
  score=100 if n in z else 0
  if 'og:image'==alt:score+=40
  if '正面' in alt or 'front' in z:score+=20
  if e['kind']=='jp' and score<20:continue
  if e['kind']=='kr' and score<40:continue
  if v not in [a[1] for a in filtered]:filtered.append((score,v,alt))
 return sorted(filtered,reverse=True)
def find_kr(e):
 s,u=page(e['page'])
 if '/product/' in u and '/list' not in u:return s,u
 for a in s.select('a[href]'):
  href=a['href']; t=a.get_text(' ',strip=True)+' '+href+' '+str(a.find('img'))
  if norm(e['title']) in norm(t) and re.search(r'/product/(?!list)',href):
   return page(urljoin(u,href))
 raise ValueError('Exact product link missing')
entries=[
 {'id':'ref-3140e407647b','title':'Pure Effect','kind':'jp','page':'https://www.sunbridge-group.com/product/ball/all-balls/pure-effect/'},
 {'id':'ref-fd76484f5bed','title':'Black Widow 3.0 Ruby','kind':'jp','page':'https://www.sunbridge-group.com/product/ball/all-balls/black-widow-3-0-ruby/'},
 {'id':'ref-fc8914b864ef','title':'Hyperize','kind':'kr','page':'https://brunswickkorea.co.kr/product/hyperize/531/'},
 {'id':'ref-00abc69702e8','title':'LT-48 Pro Obsidian','kind':'kr','page':'https://brunswickkorea.co.kr/category/%EB%B3%BC%EB%A7%81%EB%B3%BC/78/'},
 {'id':'ref-c4165731ca8c','title':'Melee Redholic X','kind':'kr','page':'https://brunswickkorea.co.kr/product/list.html?cate_no=78'},
 {'id':'ref-50912bf7dc16','title':'Purple Titan Nirvana','kind':'kr','page':'https://brunswickkorea.co.kr/product/list.html?cate_no=78'}]
b64=lambda b:base64.b64encode(b).decode()
key=ChaCha20Poly1305.generate_key()
pub=serialization.load_pem_public_key((P/'public.pem').read_bytes())
print('CP014_KEY|'+b64(pub.encrypt(key,padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),algorithm=hashes.SHA256(),label=None))),flush=True)
records=[]
for e in entries:
 try:
  s,u=find_kr(e) if e['kind']=='kr' else page(e['page'])
  if norm(e['title']) not in norm(s.get_text(' ',strip=True)+' '+str(s.title)):raise ValueError('Exact title not found')
  candidates=choose(e,s,u); accepted=None; errors=[]
  for score,v,alt in candidates[:8]:
   try:
    raw,final=get(v,25_000_000)
    with Image.open(io.BytesIO(raw)) as orig:
     if orig.format not in {'PNG','JPEG','WEBP'} or min(orig.size)<300 or max(orig.size)/min(orig.size)>1.8 or orig.width*orig.height>20_000_000:raise ValueError('Invalid image dimensions/type')
     im=orig.convert('RGBA');im.thumbnail((640,640),Image.Resampling.LANCZOS);out=io.BytesIO();im.save(out,'WEBP',quality=88,method=6);data=out.getvalue()
    accepted=(data,raw,final,im.size,alt);break
   except Exception as ex:errors.append(str(ex)[:120])
  if not accepted:raise ValueError('No eligible product photo: '+str(errors))
  data,raw,v,dim,alt=accepted; h=hashlib.sha256(data).hexdigest();nonce=os.urandom(12)
  rec={**e,'page':u,'imageSource':v,'sourceSha256':hashlib.sha256(raw).hexdigest(),'sha256':h,'dimensions':list(dim),'bytes':len(data),'alt':alt,'status':'REVIEW_REQUIRED'}
  sealed=b64(ChaCha20Poly1305(key).encrypt(nonce,data,(e['id']+':'+h).encode()))
  chunks=[sealed[i:i+6000] for i in range(0,len(sealed),6000)]
  print('CP014_META|'+e['id']+'|'+h+'|'+b64(nonce)+'|'+str(len(chunks)),flush=True)
  for i,c in enumerate(chunks):print('CP014_DATA|'+e['id']+'|'+str(i)+'|'+c,flush=True)
 except Exception as ex:rec={**e,'status':'FAILED','reason':str(ex)}
 records.append(rec)
print('CP014_MANIFEST|'+json.dumps(records,separators=(',',':')),flush=True)
