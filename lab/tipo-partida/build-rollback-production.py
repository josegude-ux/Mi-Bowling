from pathlib import Path
import hashlib,json,re,shutil,os
root=Path(os.environ['RUNNER_TEMP']);base=root/'tipo-base';src=root/'tipo-cp004/candidate';out=root/'tipo-cp004';folder=out/'rollback-production';shutil.copytree(src,folder)
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha((base/'index.html').read_bytes())=='7d8d6d0b1ba0ad804cf1d9d9a962971c11cb5cc4dca532a3603ae09a96a36c37'
assert sha((src/'sw.js').read_bytes())=='db27aef42e6e7fc4a0a7dd6b2638164cc44e8cce049cc0b88ea283356924359e'
(folder/'index.html').write_bytes((base/'index.html').read_bytes())
code=(src/'sw.js').read_text();keys=list(json.loads(re.search(r'const HASHES=(.*?);',code).group(1)));assert len(keys)==33
hashes={k:sha((folder/(k[2:].split('?')[0] or 'index.html')).read_bytes()) for k in keys}
name='tipo-3311-cp004-rollback-production';code=re.sub(r'const RELEASE=.*?;',f'const RELEASE={json.dumps(name)};',code,count=1);code=re.sub(r'const HASHES=.*?;',f'const HASHES={json.dumps(hashes,separators=(",",":"))};',code,count=1);(folder/'sw.js').write_text(code)
assert sha((folder/'sw.js').read_bytes())=='c4fb37a7fa71d30a50b40fbc074a072983ac8fd4186e75961d1a297119c20d7b'
files={str(p.relative_to(folder)):sha(p.read_bytes()) for p in folder.rglob('*') if p.is_file()};assert len(files)==82
assert set(n for n,h in files.items() if sha((src/n).read_bytes())!=h)=={'index.html','sw.js'}
(out/'rollback-production-manifest.json').write_text(json.dumps({'release':name,'files':files,'cache':hashes},indent=2)+'\n')
print('Rollback production exact, protected worker, 82 files/33 cache keys')
