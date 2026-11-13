"""Acquire only exact official sources; local staging, not deployment. Requires Internet, Pillow, PyMuPDF, requests."""
import pathlib, json, io, hashlib, sys
from urllib.parse import urlparse
import requests
from PIL import Image,ImageOps
import fitz
P=pathlib.Path(__file__).parent
ENTRIES=json.loads((P/'photo-sources.json').read_text())
HOSTS={'columbia300.com','brunswickbowling.nyc3.cdn.digitaloceanspaces.com','dv8bowling.nyc3.cdn.digitaloceanspaces.com','hammerbowling.com','trackbowling.com'}
MAX=25*1024*1024

def fetch(url):
 if urlparse(url).scheme!='https' or urlparse(url).hostname not in HOSTS: raise ValueError('Unapproved host')
 with requests.get(url,timeout=(10,40),stream=True,allow_redirects=False) as r:
  r.raise_for_status()
  if r.status_code!=200: raise ValueError('Unexpected status '+str(r.status_code))
  chunks=[]; n=0
  for c in r.iter_content(65536):
   n+=len(c)
   if n>MAX:raise ValueError('File too large')
   chunks.append(c)
 return b''.join(chunks)

def convert(e,data):
 if e['profileId']=='rhino':
  with fitz.open(stream=data,filetype='pdf') as d:
   p=d[e['pdfPageIndex']]; text=p.get_text()
   # Some catalog scans have no text layer; verify original reference visually before activation.
   if text.strip() and '60-101536' not in text: raise ValueError('Unexpected PDF page')
   a,b,c,f=e['cropNormalized']; r=p.rect
   pix=p.get_pixmap(matrix=fitz.Matrix(3,3),clip=fitz.Rect(r.x0+a*r.width,r.y0+b*r.height,r.x0+c*r.width,r.y0+f*r.height),alpha=False)
   im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
 else:
  with Image.open(io.BytesIO(data)) as src:
   if src.format not in {'PNG','JPEG','WEBP'}:raise ValueError('Unexpected format')
   if src.width*src.height>20_000_000:raise ValueError('Oversized dimensions')
   im=src.convert('RGBA')
 im.thumbnail((640,640),Image.Resampling.LANCZOS)
 if min(im.size)<150:raise ValueError('Image too small')
 out=io.BytesIO();im.save(out,'WEBP',quality=88,method=6);return out.getvalue(),im.size

def main():
 dest=P/'staged-assets';dest.mkdir(exist_ok=True); results=[]
 for e in ENTRIES:
  url=e['imageUrl'] or e['sourcePage']; name=e['profileId']+'.webp'; item={'profileId':e['profileId'],'source':url}
  try:
   original=fetch(url); data,size=convert(e,original); (dest/name).write_bytes(data)
   item.update(status='REVIEW_REQUIRED',file=name,sourceSha256=hashlib.sha256(original).hexdigest(),sha256=hashlib.sha256(data).hexdigest(),dimensions=size)
  except Exception as exc:item.update(status='FAILED',reason=str(exc))
  results.append(item); print(e['profileId'],item['status'],flush=True)
 (dest/'manifest.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
 return 0 if all(x['status']=='REVIEW_REQUIRED' for x in results) else 1
if __name__=='__main__':sys.exit(main())
