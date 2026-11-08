const CACHE='mi-bowling-analitica-v3-3-8-integration-profiles-stats-r1';
const ASSETS=['./','./index.html','./styles.css','./app.js','./styles.css?v=338prueba','./stats-bolos.css','./stats-bolos.css?v=1','./stats-bolos.js','./stats-bolos.js?v=1','./profiles.js','./profiles.js?v=1','./profiles.css','./profiles.css?v=1','./app.js?v=338-int-perfiles-stats1','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png','./icon-180.png','./premium-bowling-hero.jpg','./icon-competition.svg','./portada-opcion-2.jpg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys()){if(name.startsWith('mi-bowling-')&&name!==CACHE)await caches.delete(name)}await self.clients.claim()})())});
self.addEventListener('fetch',event=>{const request=event.request;const url=new URL(request.url);if(request.method!=='GET'||url.origin!==location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request,{cache:'no-store'}).then(res=>res).catch(()=>caches.match('./index.html')));return}
 event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>caches.match(request)));
});
