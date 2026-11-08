const CACHE='mi-bowling-auth-correo-lab-a1';
const ASSETS=[
 './','./index.html','./auth-lab.css?v=1','./auth-supabase-adapter.js?v=1',
 './auth-private-repository.js?v=1','./auth-lab.js?v=1','./auth-boot.js?v=1',
 './icon-192.png','./icon-180.png'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys()){if(name.startsWith('mi-bowling-')&&name!==CACHE)await caches.delete(name)}await self.clients.claim()})())});
self.addEventListener('fetch',event=>{const request=event.request;const url=new URL(request.url);if(request.method!=='GET'||url.origin!==location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request,{cache:'no-store'}).then(res=>res).catch(()=>caches.match('./index.html')));return}
 event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>caches.match(request)));
});
