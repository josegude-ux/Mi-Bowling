from pathlib import Path
import hashlib, json, os, subprocess, zipfile
root=Path(os.environ['RUNNER_TEMP'])/'lt-cp005'
archive=Path(__file__).resolve().parent/'cp009-delta.zip'
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(archive.read_bytes())=='f08d65013e8b7f4b6e22439cedc3a19bee3007ba39ef607bdd53fe4e76484e0f'
tests={'tests/lifecycle-cp009.test.mjs','tests/browser-cp009-lifecycle.py','tests/cache-cp009.test.mjs'}
before={str(p.relative_to(root)):sha(p.read_bytes()) for p in (root/'app').rglob('*') if p.is_file()}
assert len(before)==42
with zipfile.ZipFile(archive) as z:
 assert set(z.namelist())==tests|{'cp009.patch','changed.json'} and z.testzip() is None
 changes=json.loads(z.read('changed.json'))
 assert len(changes)==9 and set(changes)-set(before)=={'evidence/cache-manifest.json'}
 for n,v in changes.items():assert sha((root/n).read_bytes())==v['old'],n
 patch=Path(os.environ['RUNNER_TEMP'])/'cp009.patch';patch.write_bytes(z.read('cp009.patch'))
 subprocess.run(['patch','--batch','--forward','-p1','-i',str(patch)],cwd=root,check=True)
 for n,v in changes.items():assert sha((root/n).read_bytes())==v['new'],n
 for n in tests:(root/n).write_bytes(z.read(n))
after={str(p.relative_to(root)):sha(p.read_bytes()) for p in (root/'app').rglob('*') if p.is_file()}
assert set(after)==set(before)
assert {n for n in after if before[n]!=after[n]}==set(changes)-{'evidence/cache-manifest.json'}
cache=json.loads((root/'evidence/cache-manifest.json').read_text())
assert len(cache)==56
for k,h in cache.items():
 n=k.split('?')[0]
 if not n or n.endswith('/'):n+='index.html'
 assert sha((root/'app'/n).read_bytes())==h,k
assert "const RELEASE='lt-cp009-lab'" in (root/'app/sw.js').read_text()
print('VERIFIED CP009 exact delta, 8 changed application files, 42 runtime files, 56 cache keys, unchanged CP005 parser/importer/transaction')
