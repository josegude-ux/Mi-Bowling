const CACHE='mi-bowling-analitica-v3-3-8-prueba-visref1';
const ASSETS=['./','./index.html','./styles.css','./app.js','./styles.css?v=338visref1','./app.js?v=338visref1','./manifest.json?v=338icon1','./icon.svg','./icon-192.png?v=338icon1','./icon-512.png?v=338icon1','./icon-180.png?v=338icon1','./premium-bowling-hero.jpg','./icon-competition.svg','./portada-opcion-2.jpg','./home-registro.jpg','./home-partidas.jpg','./home-estadisticas.jpg','./home-estadisticas-limpio.jpg','./icon-registro-3d.svg','./icon-partidas-3d.svg','./icon-estadisticas-3d.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys()){if(name.startsWith('mi-bowling-')&&name!==CACHE)await caches.delete(name)}await self.clients.claim()})())});
self.addEventListener('fetch',event=>{const request=event.request;const url=new URL(request.url);if(request.method!=='GET'||url.origin!==location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request,{cache:'no-store'}).then(res=>res).catch(()=>caches.match('./index.html')));return}
 event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>caches.match(request)));
});
