const CACHE='mi-bowling-analitica-v3-3-3-3d-lab-r4';
const ASSETS=['./','./index.html','./styles.css','./styles.css?v=333-lab-r4','./line-editor.css','./line-editor.css?v=2','./line-editor.js','./line-editor.js?v=2','./lane-3d.css','./lane-3d.css?v=1','./lane-3d.js','./lane-3d.js?v=1','./app.js','./app.js?v=333-lab-r4','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png','./icon-180.png','./premium-bowling-hero.jpg','./icon-competition.svg','./portada-opcion-2.jpg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys()){if(name.startsWith('mi-bowling-')&&name!==CACHE)await caches.delete(name)}await self.clients.claim()})())});
self.addEventListener('fetch',event=>{const request=event.request;const url=new URL(request.url);if(request.method!=='GET'||url.origin!==location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request,{cache:'no-store'}).then(res=>res).catch(()=>caches.match('./index.html')));return}
 event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>caches.match(request)));
});
