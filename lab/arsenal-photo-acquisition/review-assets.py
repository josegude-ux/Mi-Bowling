"""Build a fail-closed reviewed manifest. No fetch, publishing, or Git writes."""
import argparse, hashlib, json, pathlib, re, shutil
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parent
HEX=re.compile(r'^[0-9a-f]{64}$')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def build(registry,staging,review,output):
 entries={e['profileId']:e for e in registry}
 records=json.loads((staging/'manifest.json').read_text())
 if len(records)!=len(entries) or {r['profileId'] for r in records}!=set(entries):raise ValueError('Manifest must contain all 10 distinct IDs')
 if not isinstance(review,dict) or set(review)-set(entries):raise ValueError('Unknown review IDs')
 accepted={}
 for r in records:
  i=r['profileId'];e=entries[i];v=review.get(i)
  if v is None:continue
  if not isinstance(v,dict) or v.get('reviewed') is not True or not isinstance(v.get('reviewNote'),str) or not v['reviewNote'].strip():raise ValueError('Explicit visual review required: '+i)
  if e['permissionStatus']!='USER_CONFIRMED_BOWLING_CHAMARTIN':raise ValueError('Permission missing: '+i)
  if r.get('status')!='REVIEW_REQUIRED' or r.get('source')!=(e['imageUrl'] or e['sourcePage']) or r.get('file')!=i+'.webp':raise ValueError('Invalid staged identity: '+i)
  if not HEX.fullmatch(r.get('sourceSha256','')) or not HEX.fullmatch(r.get('sha256','')) or v.get('sha256')!=r['sha256']:raise ValueError('Missing or mismatched reviewed digest: '+i)
  p=staging/(i+'.webp')
  if p.is_symlink() or not p.is_file() or digest(p)!=r['sha256']:raise ValueError('Asset bytes mismatch: '+i)
  with Image.open(p) as im:
   if im.format!='WEBP' or list(im.size)!=r.get('dimensions') or not 150<=min(im.size)<=max(im.size)<=640:raise ValueError('Invalid WebP or dimensions: '+i)
   im.load()
  if i=='rhino' and (v.get('originalReference')!='60-101536' or v.get('pdfPageIndex')!=1):raise ValueError('Original Rhino review required')
  accepted[i]={'reviewed':True,'source':r['source'],'path':'./licensed-arsenal-photos/'+i+'.webp','sha256':r['sha256'],'sourceSha256':r['sourceSha256'],'reviewNote':v['reviewNote']}
  if i=='rhino':accepted[i].update(originalReference='60-101536',pdfPageIndex=1)
 # Validate everything before writing anything; output must be new, never overwrite.
 if output.exists():raise ValueError('Output already exists')
 output.mkdir(parents=True); assets=output/'licensed-arsenal-photos';assets.mkdir()
 for i in accepted:shutil.copyfile(staging/(i+'.webp'),assets/(i+'.webp'))
 (output/'reviewed-arsenal-assets.js').write_text('globalThis.MiBowlingReviewedArsenalAssets=Object.freeze('+json.dumps(accepted,ensure_ascii=False)+');\n')
 (output/'reviewed-arsenal-assets.json').write_text(json.dumps(accepted,ensure_ascii=False,indent=2)+'\n')
 return accepted
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('review',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);p.add_argument('--staging',type=pathlib.Path,default=ROOT/'staged-assets');a=p.parse_args();print('Accepted:',len(build(json.loads((ROOT/'photo-sources.json').read_text()),a.staging,json.loads(a.review.read_text()),a.output)))
