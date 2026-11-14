from pathlib import Path
import hashlib,json,re,shutil,os
root=Path(os.environ['RUNNER_TEMP']);src=root/'tipo-release';out=root/'tipo-cp004';out.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
old={'index.html':'315c633b878255d42643045e6edad63ac40971516d67f3a8c9fc645797fb2188','sw.js':'ba75e73a85263fc54f42ce76fe35c0cb64c185e90846855687ce6e4702352f0b','app-tipo-3311-cp003.js':'449484ec253923fc9b4f95d75cae7853218bb033df0aebb9358502780711775d','tipo-partida-3311-cp003.css':'672105fe8ab67a0e1b9090eea4cf30d80a7d6c9380ce64a03bb860f324a5ee67','app.js':'1c04608ae8a125c8787b5602e1c0ca31aaa43d7de5c5464b8cac35eab5004409'}
for n,h in old.items():assert sha((src/n).read_bytes())==h,n
assert len(list(p for p in src.rglob('*') if p.is_file()))==81
css='tipo-partida-3311-cp004.css';oldcss='tipo-partida-3311-cp003.css'
release=out/'candidate';rollback=out/'rollback';shutil.copytree(src,release);shutil.copytree(src,rollback)
s=(src/oldcss).read_text();s=s.replace('@media(max-width:360px){#app .seg:has(button[onclick*="historyMode=\'pendiente\'"]) button{font-size:11px}}', '''@media(max-width:360px){
 #app .seg:has(button[onclick*="historyMode='pendiente'"]) {grid-template-columns:repeat(2,minmax(0,1fr))}
 #app .seg:has(button[onclick*="historyMode='pendiente'"]) button {font-size:11px;white-space:nowrap;overflow-wrap:normal;word-break:normal}
 #app .seg:has(button[onclick*="historyMode='pendiente'"]) button:last-child {grid-column:1/-1}
}''');assert s!=(src/oldcss).read_text();(release/css).write_text(s);(rollback/css).write_text(s)
(release/'index.html').write_text((src/'index.html').read_text().replace(oldcss,css))
worker=(src/'sw.js').read_text();orig=json.loads(re.search(r'const HASHES=(.*?);',worker).group(1));assert len(orig)==33
for name,folder,cachekeys in [('tipo-3311-cp004',release,[k if k!='./'+oldcss else './'+css for k in orig]),('tipo-3311-cp004-rollback-cp003',rollback,list(orig))]:
 hashes={k:sha((folder/(k[2:].split('?')[0] or 'index.html')).read_bytes()) for k in cachekeys}
 assert len(hashes)==33
 code=re.sub(r'const RELEASE=.*?;',f'const RELEASE={json.dumps(name)};',worker,count=1)
 code=re.sub(r'const HASHES=.*?;',f'const HASHES={json.dumps(hashes,separators=(",",":"))};',code,count=1)
 (folder/'sw.js').write_text(code)
 files={str(p.relative_to(folder)):sha(p.read_bytes()) for p in folder.rglob('*') if p.is_file()};assert len(files)==82
 assert set(n for n,h in files.items() if not (src/n).is_file() or sha((src/n).read_bytes())!=h)==({'sw.js','index.html',css} if folder==release else {'sw.js',css})
 (out/(folder.name+'-manifest.json')).write_text(json.dumps({'release':name,'files':files,'cache':hashes},indent=2)+'\n')
assert sha((release/'index.html').read_bytes())=='4be15b43f809b3fc5f73c4707845ddcd9b5287bc5283582baeace3ab1bd064c2'
assert sha((release/'sw.js').read_bytes())=='db27aef42e6e7fc4a0a7dd6b2638164cc44e8cce049cc0b88ea283356924359e'
assert sha((release/css).read_bytes())=='158838e14bb64faf6e087805eb175ad1f215c359f7b8cafd76258886ed25b72c'
assert sha((rollback/'sw.js').read_bytes())=='41a00752c6fba047137f5935a5d2e3fc24fa90c2d4c0cb0b9209fbc6dd451adf'
print('CP004 EXACT 82 files each, 33 cache keys each, immutable scripts and CSS preserved')
