import base64, hashlib, io, json, os, pathlib, re
from urllib.parse import urljoin,urlparse
import requests
from bs4 import BeautifulSoup
from PIL import Image
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
P=pathlib.Path(__file__).parent
HOSTS={'brunswickbowling.com','www.brunswickbowling.com','brunswickbowling.nyc3.cdn.digitaloceanspaces.com','trackbowling.com','www.trackbowling.com','cdn.shopify.com'}
def get(u,maxbytes):
 if urlparse(u).scheme!='https' or urlparse(u).hostname not in HOSTS:raise ValueError('Unexpected URL host')
 with requests.get(u,timeout=(10,35),stream=True,allow_redirects=False,headers={'User-Agent':'Mozilla/5.0'}) as r:
  r.raise_for_status()
  if r.status_code!=200:raise ValueError('Unexpected HTTP status')
  b=bytearray()
  for c in r.iter_content(65536):
   b.extend(c)
   if len(b)>maxbytes:raise ValueError('Too large')
  return bytes(b)
def image_url(e,s):
 if e['image']:return e['image']
 if e['brand']=='Brunswick':
  for img in s.select('img'):
   alt=img.get('alt','').lower()
   if 'purple' in alt and 'rhino pro' in alt and 'logo' in alt and 'core' not in alt:
    u=img.get('data-src') or img.get('src')
    if u and not u.startswith('data:'):return urljoin(e['page'],u)
  raise ValueError('Exact ball image alt not found')
 meta=s.find('meta',property='og:image')
 if not meta or not meta.get('content'):raise ValueError('No OG image')
 u=urljoin(e['page'],meta['content'])
 if 'synthesis' not in u.lower() or 'prime' not in u.lower():raise ValueError('OG image not exact model filename')
 return u
b64=lambda x:base64.b64encode(x).decode('ascii')
key=ChaCha20Poly1305.generate_key()
pub=serialization.load_pem_public_key((P/'public.pem').read_bytes())
wrapped=pub.encrypt(key,padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
print('CP010_KEY|'+b64(wrapped),flush=True)
manifest=[]
for e in json.loads((P/'candidates.json').read_text()):
 try:
  page=get(e['page'],5_000_000);s=BeautifulSoup(page,'html.parser')
  if e['sku'] not in s.get_text(' ',strip=True) or not any(e['title'].lower() in h.get_text(' ',strip=True).lower() for h in s.select('h1')):raise ValueError('Official title/SKU mismatch')
  u=image_url(e,s);raw=get(u,25_000_000)
  with Image.open(io.BytesIO(raw)) as original:
   if original.format not in {'PNG','JPEG','WEBP'} or original.width*original.height>20_000_000:raise ValueError('Invalid image')
   im=original.convert('RGBA');im.thumbnail((640,640),Image.Resampling.LANCZOS)
   if min(im.size)<150:raise ValueError('Too small')
   out=io.BytesIO();im.save(out,'WEBP',quality=88,method=6);data=out.getvalue()
  h=hashlib.sha256(data).hexdigest();nonce=os.urandom(12);sealed=b64(ChaCha20Poly1305(key).encrypt(nonce,data,(e['id']+':'+h).encode()))
  chunks=[sealed[i:i+6000] for i in range(0,len(sealed),6000)]
  rec={**e,'image':u,'status':'REVIEW_REQUIRED','sourceSha256':hashlib.sha256(raw).hexdigest(),'sha256':h,'dimensions':list(im.size),'bytes':len(data)}
  print('CP010_META|'+e['id']+'|'+h+'|'+b64(nonce)+'|'+str(len(chunks)),flush=True)
  for i,c in enumerate(chunks):print('CP010_DATA|'+e['id']+'|'+str(i)+'|'+c,flush=True)
 except Exception as exc:
  rec={**e,'status':'FAILED','reason':str(exc)}
 manifest.append(rec)
print('CP010_MANIFEST|'+json.dumps(manifest,separators=(',',':')),flush=True)
raise SystemExit(0 if all(e['status']=='REVIEW_REQUIRED' for e in manifest) else 1)
