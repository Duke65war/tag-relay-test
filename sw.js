const CACHE='mash-unit-v4-20261002f';
const CORE=['./','./index.html','./app.js','./manifest.webmanifest','./icon.svg','./eliminated.gif','./qrcode.min.js','./html5-qrcode.min.js','./dogtag.svg','./map1.jpeg','./dogtag-button.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);await cache.addAll(CORE);
 try{const logo=await fetch('./war-adventures-logo.png');if(logo.ok)await cache.put('./war-adventures-logo.png',logo)}catch(e){}
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if((key.startsWith('mash-unit-')||key.startsWith('tag-relay-test-'))&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith((async()=>{const cached=await caches.match(event.request);return cached||fetch(event.request)})())});
