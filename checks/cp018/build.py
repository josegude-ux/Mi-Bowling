"""Exact CP018 bytes, CP004 git archive, no deployment."""
from pathlib import Path
import os, json, hashlib, shutil, re, subprocess, tarfile, io
root=Path(os.environ['RUNNER_TEMP'])/'cp018-check'
root.mkdir()
base=root/'base';base.mkdir()
commit='2f2fd46bad01e75e12ae7b78303f388587a77208'
assert subprocess.check_output(['git','rev-parse',commit+'^{tree}'],text=True).strip()=='419943377f4cd244c8ebafb91a175465e01492e0'
with tarfile.open(fileobj=io.BytesIO(subprocess.check_output(['git','archive',commit]))) as t:t.extractall(base,filter='data')
sha=lambda b:hashlib.sha256(b).hexdigest()
sw=(base/'sw.js').read_text();idx=(base/'index.html').read_text()
assert sha(sw.encode())=='db27aef42e6e7fc4a0a7dd6b2638164cc44e8cce049cc0b88ea283356924359e'
assert sha(idx.encode())=='4be15b43f809b3fc5f73c4707845ddcd9b5287bc5283582baeace3ab1bd064c2'
candidate=root/'candidate';rb=root/'rollback'
shutil.copytree(base,candidate);shutil.copytree(base,rb)
names=['backup-completo.js','backup-ui.js']
expected=['d10a59d7b9437ed7ac2cf1532123f2b33c5e35e2d085bf9a6fdb5bfcc950c3e3','e9e3f7bffcea379bb68ced5fe730446e026e7a8bbf5c6eca4962abe15b112803']
for folder in [candidate,rb]:
 d=folder/'releases/backup-cp018-3311';d.mkdir(parents=True)
 for n,h in zip(names,expected):
  content=(Path(__file__).parent/n).read_bytes();assert sha(content)==h,(n,sha(content));(d/n).write_bytes(content)
anchor=' <script src="app-tipo-3311-cp003.js"></script>'
assert idx.count(anchor)==1
idx2=idx.replace(anchor,anchor+''.join('\n <script src="releases/backup-cp018-3311/'+n+'"></script>' for n in names))
assert sha(idx2.encode())=='497076dc1a70f000e75455d40f4e85430c598162a114b5d3dc2e6805c15c39dc'
(candidate/'index.html').write_text(idx2)
match=re.search(r'const HASHES=(\{.*\});',sw);H=json.loads(match.group(1));assert len(H)==33
H2=dict(H);H2['./']=H2['./index.html']=sha(idx2.encode())
for n,h in zip(names,expected):H2['./releases/backup-cp018-3311/'+n]=h
sw2=sw.replace('const RELEASE="tipo-3311-cp004";','const RELEASE="backup-cp018-3311";').replace(match.group(1),json.dumps(H2,separators=(',',':')))
sw3=sw.replace('const RELEASE="tipo-3311-cp004";','const RELEASE="rollback-backup-cp018-tipo3311";')
assert sha(sw2.encode())=='78c37d6cc5364336111cdb58b08c91a5b3ffa6d94f79bd52630da8c7034b4dfa',sha(sw2.encode())
assert sha(sw3.encode())=='082eeda62cbc95b655b8ddbc831be95c95f0412b19a2469c2a3564307c6fb559'
(candidate/'sw.js').write_text(sw2);(rb/'sw.js').write_text(sw3)
for folder,manifest in [(base,H),(candidate,H2),(rb,H)]:
 for k,v in manifest.items():assert sha((folder/(k[2:].split('?')[0] or 'index.html')).read_bytes())==v,k
 print('EXACT',folder.name,len(manifest),flush=True)
(root/'manifests.json').write_text(json.dumps({'base':H,'candidate':H2,'rollback':H}))
