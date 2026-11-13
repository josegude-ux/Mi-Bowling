/* CP015 release cache: immutable snapshot, only known assets, no user data deletion. */
const RELEASE=__RELEASE__;
const CACHE='mi-bowling-release-'+RELEASE+'-'+encodeURIComponent(self.registration.scope);
const HASHES=Object.freeze(__HASHES__);
const scope=new URL(self.registration.scope);
const key=name=>new URL(name,scope).href;
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try{for(const [name,expected] of Object.entries(HASHES)){
  const url=key(name),r=await fetch(url,{cache:'no-store',credentials:'same-origin',redirect:'follow'});
  if(!r.ok||new URL(r.url).origin!==scope.origin||await digest(await r.clone().arrayBuffer())!==expected)throw Error('Release integrity: '+name);
  await cache.put(url,r);
 }}catch(e){await caches.delete(CACHE);throw e}
 // No skipWaiting: current windows finish using their previous release.
})()));
self.addEventListener('activate',event=>event.waitUntil(Promise.resolve()));
self.addEventListener('fetch',event=>{
 const r=event.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname))return;
 const name=u.pathname.slice(scope.pathname.length)+u.search;
 let target=Object.hasOwn(HASHES,name)?name:null;
 if(r.mode==='navigate'){
  const relative=u.pathname.slice(scope.pathname.length);
  if(relative===''||relative==='index.html')target='index.html';
  if(relative==='catalogo-bolas/'||relative==='catalogo-bolas/index.html')target='catalogo-bolas/index.html';
 }
 if(target===null)return;
 event.respondWith((async()=>{const c=await caches.open(CACHE);const hit=await c.match(key(target));if(hit)return hit;
  // Evicted resource: verify exact bytes, never substitute HTML or a different version.
  const response=await fetch(key(target),{cache:'no-store',credentials:'same-origin'});
  if(!response.ok||new URL(response.url).origin!==scope.origin||await digest(await response.clone().arrayBuffer())!==HASHES[target])throw Error('Release integrity: '+target);
  await c.put(key(target),response.clone());return response;
 })());
});
