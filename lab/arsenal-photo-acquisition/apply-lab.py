"""Apply only to clean isolated checkout at exact PR58 HEAD; no git/network mutations."""
import argparse, hashlib, pathlib, subprocess, shutil, json, re
from PIL import Image
HEAD='859a25960e99a1ee7a9dbf82f117dee5bc66f48e'
BLOBS={'arsenal-insights.js':'991439a7c13d99456153c0c3f563e7f91c8be573','arsenal-view-lab.js':'3bd5af9f1f50fc784cdaea77f034c51e6b7eae48','app.js':'f2d10fdef6483eaecbdae6ab0a27bc7e1438953e','index.html':'5205b740f8824c09f8c4d9a07ef33576e7726434'}
HERE=pathlib.Path(__file__).resolve().parent
NEW=['photo-sources.js','arsenal-photo-integration-lab.js']
def blob(b):return hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()
def once(s,old,new):
 if s.count(old)!=1:raise ValueError('Anchor not unique: '+old[:100])
 return s.replace(old,new,1)
def validate_bundle(root):
 registry={e['profileId']:e for e in json.loads((HERE/'photo-sources.json').read_text())}
 manifest=json.loads((root/'reviewed-arsenal-assets.json').read_text())
 if not isinstance(manifest,dict) or not manifest:raise ValueError('No reviewed assets to activate')
 expected_js='globalThis.MiBowlingReviewedArsenalAssets=Object.freeze('+json.dumps(manifest,ensure_ascii=False)+');\n'
 if (root/'reviewed-arsenal-assets.js').read_text()!=expected_js:raise ValueError('JS manifest mismatch')
 for i,a in manifest.items():
  e=registry.get(i);p=root/'licensed-arsenal-photos'/(i+'.webp')
  if not e or e['permissionStatus']!='USER_CONFIRMED_BOWLING_CHAMARTIN' or a.get('reviewed') is not True or a.get('source')!=(e['imageUrl'] or e['sourcePage']) or a.get('path')!='./licensed-arsenal-photos/'+i+'.webp' or not re.fullmatch(r'[a-f0-9]{64}',a.get('sourceSha256','')) or not a.get('reviewNote'):raise ValueError('Invalid reviewed record '+i)
  if i=='rhino' and (a.get('originalReference')!='60-101536' or a.get('pdfPageIndex')!=1):raise ValueError('Original Rhino review evidence missing')
  if p.is_symlink() or not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=a.get('sha256'):raise ValueError('Reviewed bytes mismatch '+i)
  with Image.open(p) as im:
   if im.format!='WEBP' or not 150<=min(im.size)<=max(im.size)<=640:raise ValueError('Invalid asset '+i)
   im.load()
 return manifest

def transform(files,reviewed=False):
 out=dict(files)
 out['index.html']=once(files['index.html'],'  <script src="arsenal-view-lab.js?v=arsenal-catalog-cp037"></script>',' <script src="photo-sources.js?v=arsenal-photo-cp004"></script>\n <script src="arsenal-photo-integration-lab.js?v=arsenal-photo-cp004"></script>\n  <script src="arsenal-view-lab.js?v=arsenal-catalog-cp037-photo-cp004"></script>')
 if reviewed:out['index.html']=once(out['index.html'],' <script src="arsenal-photo-integration-lab.js?v=arsenal-photo-cp004"></script>',' <script src="reviewed-arsenal-assets.js?v=arsenal-photo-cp005"></script>\n <script src="arsenal-photo-integration-lab.js?v=arsenal-photo-cp004"></script>')
 s=files['arsenal-view-lab.js']
 s=once(s,"+add+source+'</div></article>';","+add+source+'</div>'+(p.origin==='historical'?(root.MiBowlingArsenalPhotoIntegration?.templateHTML(p)||''):'')+'</article>';")
 s=once(s,"</h2><p class=\"hint\">Análisis individual · orientativo</p><dl class=\"arsenal-facts\">","</h2><p class=\"hint\">Análisis individual · orientativo</p>'+(ctx.mode==='detail'?(root.MiBowlingArsenalPhotoIntegration?.physicalHTML(registered)||''):(root.MiBowlingArsenalPhotoIntegration?.templateHTML(p)||''))+'<dl class=\"arsenal-facts\">")
 out['arsenal-view-lab.js']=s
 out['app.js']=once(files['app.js'],'<div class="ball-art">${photo}</div><div class="ball-name">','<div class="ball-art">${photo}</div>${window.MiBowlingArsenalPhotoIntegration?.physicalHTML(b)||\'\'}<div class="ball-name">')
 return out
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('checkout',type=pathlib.Path);p.add_argument('--apply',action='store_true');p.add_argument('--reviewed',type=pathlib.Path);a=p.parse_args();root=a.checkout.resolve()
 def git(*args):return subprocess.check_output(['git','-C',str(root),*args],text=True).strip()
 if git('rev-parse','HEAD')!=HEAD or git('status','--porcelain'):raise SystemExit('STOP: need clean exact PR58 checkout')
 branch=git('branch','--show-current')
 if a.apply and not branch.startswith('lab/'):raise SystemExit('STOP: apply only to lab/ branch')
 files={}
 for name,sha in BLOBS.items():
  b=(root/name).read_bytes()
  if blob(b)!=sha:raise SystemExit('STOP: blob mismatch '+name)
  files[name]=b.decode('utf-8')
 if any((root/n).exists() for n in NEW):raise SystemExit('STOP: new file already exists')
 bundle=validate_bundle(a.reviewed.resolve()) if a.reviewed else None
 if bundle and any((root/n).exists() for n in ['reviewed-arsenal-assets.js','licensed-arsenal-photos']):raise SystemExit('STOP: reviewed destination exists')
 out=transform(files,bool(bundle))
 if a.apply:
  for n in files:
   if out[n]!=files[n]:(root/n).write_bytes(out[n].encode('utf-8'))
  for n in NEW:shutil.copyfile(HERE/n,root/n)
  if bundle:
   shutil.copyfile(a.reviewed/'reviewed-arsenal-assets.js',root/'reviewed-arsenal-assets.js')
   dest=root/'licensed-arsenal-photos';dest.mkdir()
   for i in bundle:shutil.copyfile(a.reviewed/'licensed-arsenal-photos'/(i+'.webp'),dest/(i+'.webp'))
 print('Verified 4 blobs; 3 edits + 2 new modules; reviewed assets='+str(len(bundle or {}))+'; '+('applied locally' if a.apply else 'dry-run only'))
