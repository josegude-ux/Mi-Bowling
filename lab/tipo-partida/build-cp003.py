from pathlib import Path
import hashlib,json,re,ast,os,shutil
base=Path(os.environ['RUNNER_TEMP'])/'tipo-base'
out=Path(os.environ['RUNNER_TEMP'])/'tipo-release'
sha=lambda b:hashlib.sha256(b).hexdigest()
# tipo-base has just been reconstructed through CP002. Keep old app.js at its original URL.
assert sha((base/'app.js').read_bytes())=='d5a57cae36fa8bb26c6b70c62a4b18f0841b904b808908aed9f2b404ef21591c'
shutil.copytree(base,out)
(base/'app.js').write_bytes(__import__('subprocess').check_output(['git','show','d16b941a5889b52b1cd2b4bfb51e99b10b25887a:app.js']))
assert hashlib.sha1(b'blob '+str((base/'app.js').stat().st_size).encode()+b'\0'+(base/'app.js').read_bytes()).hexdigest()=='e653869f2def6cedba563c7c46529de8ef2bbe9e'
version='3.3.11-tipo-partida';release='tipo-3311-cp003';js='app-tipo-3311-cp003.js';css='tipo-partida-3311-cp003.css'
s=(out/'app.js').read_text();(out/'app.js').write_bytes((base/'app.js').read_bytes())
s=s.replace("const APP_VERSION='3.3.10-catalogo';",f"const APP_VERSION='{version}';")
s=s.replace("await reg.update();if(updateAvailable)","await reg.update();if(reg.waiting){updateAvailable=true;updateStatus('Nueva versión preparada. Cierra todas las ventanas de MI BOWLING y vuelve a abrir para actualizar sin interrumpir una partida.',true)}else if(updateAvailable)")
s=s.replace("function applyUpdate(){if(!updateAvailable)return;window.location.reload()}","function applyUpdate(){if(!updateAvailable)return;if(swRegistration?.waiting){updateStatus('Cierra todas las ventanas de MI BOWLING y vuelve a abrir. Tus datos permanecen en este dispositivo.',true);return}window.location.reload()}")
(out/js).write_text(s)
html=(base/'index.html').read_text().replace('app.js?v=3310cat1',js).replace('  <title>',f'  <link rel="stylesheet" href="{css}">\n  <title>')
(out/'index.html').write_text(html)
(out/css).write_text('''/* Scoped to the three history tabs; existing views unchanged. */
#app .seg:has(button[onclick*="historyMode='pendiente'"]) {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
#app .seg:has(button[onclick*="historyMode='pendiente'"]) button {min-width:0;min-height:44px;overflow-wrap:anywhere;padding:9px 4px;line-height:1.25}
@media(max-width:360px){#app .seg:has(button[onclick*="historyMode='pendiente'"]) button{font-size:11px}}
''')
keys=ast.literal_eval(re.search(r'const ASSETS=(\[.*?\]);',(base/'sw.js').read_text()).group(1))+['./'+js,'./'+css]
hashes={k:sha((out/((k[2:].split('?')[0]) or 'index.html')).read_bytes()) for k in keys}
worker=f"const RELEASE={json.dumps(release)};\nconst HASHES={json.dumps(hashes,separators=(',',':'))};\n"+r'''
const CACHE='mi-bowling-release-'+RELEASE+'-'+encodeURIComponent(self.registration.scope);
const entries=new Map(Object.entries(HASHES).map(([name,hash])=>[new URL(name,self.registration.scope).href,hash]));
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
async function checked(response,hash){if(!response||!response.ok||response.redirected)throw Error('Recurso de actualización no disponible');const bytes=await response.clone().arrayBuffer();if(hex(await crypto.subtle.digest('SHA-256',bytes))!==hash)throw Error('Integridad de actualización incorrecta');return response;}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 for(const [url,hash] of entries){const response=await checked(await fetch(url,{cache:'no-store'}),hash);await cache.put(url,response);}
 // A worker may report a successful put while the cache remains empty. Fail closed.
 for(const [url,hash] of entries)await checked(await cache.match(url),hash);
 // Normal activation only: no skipWaiting, no forced reload of active games.
})()));
self.addEventListener('activate',event=>event.waitUntil(Promise.resolve()));
// Preserve older caches for rollback; never touch LocalStorage or IndexedDB.
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 const hash=entries.get(url.href);if(!hash)return; // Other views retain ordinary network semantics.
 event.respondWith((async()=>{const cache=await caches.open(CACHE);try{return await checked(await cache.match(url.href),hash)}catch(e){const response=await checked(await fetch(url.href,{cache:'no-store'}),hash);await cache.put(url.href,response.clone());await checked(await cache.match(url.href),hash);return response;}})());
});
'''
(out/'sw.js').write_text(worker)
assert len(hashes)==33
expected={'index.html':'315c633b878255d42643045e6edad63ac40971516d67f3a8c9fc645797fb2188','sw.js':'ba75e73a85263fc54f42ce76fe35c0cb64c185e90846855687ce6e4702352f0b',js:'449484ec253923fc9b4f95d75cae7853218bb033df0aebb9358502780711775d',css:'672105fe8ab67a0e1b9090eea4cf30d80a7d6c9380ce64a03bb860f324a5ee67'}
for n,h in expected.items():assert sha((out/n).read_bytes())==h,n
bf={str(p.relative_to(base)):sha(p.read_bytes()) for p in base.rglob('*') if p.is_file()};nf={str(p.relative_to(out)):sha(p.read_bytes()) for p in out.rglob('*') if p.is_file()}
assert len(bf)==79 and len(nf)==81 and {n for n,h in nf.items() if bf.get(n)!=h}==set(expected)
(Path(os.environ['RUNNER_TEMP'])/'tipo-cache.json').write_text(json.dumps(hashes))
print('CP003 EXACT release 81 files, 33 cache keys, 4 deltas, old app.js preserved')
