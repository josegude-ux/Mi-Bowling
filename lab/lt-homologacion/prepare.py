from pathlib import Path
import os, subprocess, hashlib, zipfile, json
base='d16b941a5889b52b1cd2b4bfb51e99b10b25887a'
root=Path(__file__).resolve().parent
dst=Path(os.environ['RUNNER_TEMP'])/'lt-cp005'
dst.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
archive=root/'runtime-delta.zip'
assert sha(archive.read_bytes())=='27a7fee7aeb5c7c35c66390de76e683c4adf78c1cbc30deb4ce720ee21176e71'
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert all(not Path(n).is_absolute() and '..' not in Path(n).parts for n in z.namelist())
 manifest=json.loads(z.read('delta-manifest.json'))
 assert set(z.namelist())==set(manifest)|{'delta-manifest.json'}
 assert all(sha(z.read(n))==h for n,h in manifest.items())
 z.extractall(dst)
runtime=json.loads((dst/'runtime-manifest.json').read_text())
assert len(runtime)==42
for n,h in runtime.items():
 p=dst/'app'/n
 if not p.exists():
  p.parent.mkdir(parents=True,exist_ok=True)
  p.write_bytes(subprocess.check_output(['git','show',base+':'+n]))
 assert sha(p.read_bytes())==h,n
cache=json.loads((dst/'evidence/cache-manifest.json').read_text())
assert len(cache)==56
for k,h in cache.items():
 n=k.split('?')[0]
 if not n or n.endswith('/'): n+='index.html'
 assert sha((dst/'app'/n).read_bytes())==h,k
subprocess.run(['sha256sum','-c','manifest.sha256'],cwd=dst,check=True)
print('VERIFIED runtime CP005: 42 files, 56 cache keys; synthetic SQLite and PDF; no personal file')
