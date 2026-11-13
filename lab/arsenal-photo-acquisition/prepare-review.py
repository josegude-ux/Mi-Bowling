"""CP007: verify reacquisition, isolate the Rhino crop and encrypt review bytes.
No storage upload, deploy, repo writes, or automatic approval. Run alongside CP005 inputs.
"""
import base64, hashlib, importlib.util, io, json, os, pathlib, sys
from PIL import Image, ImageDraw
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
P=pathlib.Path(__file__).resolve().parent
# Bounds inside CP005 rectangular crop, derived from page 2 of official 1995 catalogue.
# The rectangle also intersects the adjacent teal ball / core diagram. Review the output.
RHINO_ELLIPSE=(.018,.018,.987,.995)
def mask_rhino(im):
    im=im.convert('RGBA'); w,h=im.size; s=4
    mask=Image.new('L',(w*s,h*s),0)
    ImageDraw.Draw(mask).ellipse(tuple(round(f*d*s) for f,d in zip(RHINO_ELLIPSE,(w,h,w,h))),fill=255)
    im.putalpha(mask.resize((w,h),Image.Resampling.LANCZOS))
    return im

def load_acquirer():
    spec=importlib.util.spec_from_file_location('cp005_fetch',P/'fetch-assets.py')
    f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)
    original=f.convert
    def convert(e,data):
        if e['profileId']!='rhino':return original(e,data)
        with f.fitz.open(stream=data,filetype='pdf') as d:
            p=d[e['pdfPageIndex']];text=p.get_text()
            if text.strip() and '60-101536' not in text:raise ValueError('Unexpected PDF page')
            a,b,c,g=e['cropNormalized'];r=p.rect
            pix=p.get_pixmap(matrix=f.fitz.Matrix(3,3),clip=f.fitz.Rect(r.x0+a*r.width,r.y0+b*r.height,r.x0+c*r.width,r.y0+g*r.height),alpha=False)
            im=mask_rhino(Image.frombytes('RGB',(pix.width,pix.height),pix.samples))
        im.thumbnail((640,640),Image.Resampling.LANCZOS)
        if min(im.size)<150:raise ValueError('Image too small')
        out=io.BytesIO();im.save(out,'WEBP',quality=88,method=6);return out.getvalue(),im.size
    f.convert=convert;return f

def verify(records,prior):
    old={r['profileId']:r for r in prior}
    if len(records)!=10 or len(old)!=10 or {r['profileId'] for r in records}!=set(old):raise ValueError('Expected ten exact IDs')
    for r in records:
        i=r['profileId'];o=old[i]
        if r.get('status')!='REVIEW_REQUIRED' or r.get('source')!=o['source'] or r.get('sourceSha256')!=o['sourceSha256']:raise ValueError('Source hash/identity changed: '+i)
        if i!='rhino' and r['sha256']!=o['sha256']:raise ValueError('Unexpected WebP change: '+i)
        if i=='rhino' and r['sha256']==o['sha256']:raise ValueError('Expected corrected Rhino crop')
        p=P/'staged-assets'/r['file']
        if hashlib.sha256(p.read_bytes()).hexdigest()!=r['sha256']:raise ValueError('Output hash mismatch: '+i)
    return records

def encrypt(records):
    pub=serialization.load_pem_public_key((P/'review-public.pem').read_bytes())
    key=ChaCha20Poly1305.generate_key(); cipher=ChaCha20Poly1305(key)
    wrapped=pub.encrypt(key,padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
    b64=lambda b:base64.b64encode(b).decode('ascii')
    print('CP007_KEY|'+b64(wrapped),flush=True)
    for r in records:
        i=r['profileId'];h=r['sha256'];nonce=os.urandom(12);data=(P/'staged-assets'/r['file']).read_bytes()
        sealed=b64(cipher.encrypt(nonce,data,(i+':'+h).encode('ascii')))
        chunks=[sealed[j:j+8000] for j in range(0,len(sealed),8000)]
        print('CP007_META|'+i+'|'+h+'|'+b64(nonce)+'|'+str(len(chunks)),flush=True)
        for j,c in enumerate(chunks):print('CP007_DATA|'+i+'|'+str(j)+'|'+c,flush=True)
    print('CP007_REVIEW_MANIFEST|'+json.dumps(records,separators=(',',':')),flush=True)

if __name__=='__main__':
    f=load_acquirer()
    if f.main()!=0:sys.exit(1)
    records=json.loads((P/'staged-assets/manifest.json').read_text())
    prior=json.loads((P/'manifest-acquisition-cp006.json').read_text())
    encrypt(verify(records,prior))
