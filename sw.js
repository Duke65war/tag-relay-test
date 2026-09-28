const CACHE='mash-unit-v4-20260928b';
const CORE=['./','./index.html','./app.js','./manifest.webmanifest','./icon.svg'];
const LIBS=['https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js','https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);await cache.addAll(CORE);
 for(const url of LIBS){const response=await fetch(url,{mode:'no-cors'});if(!response.ok&&response.type!=='opaque')throw Error('QR library unavailable');await cache.put(url,response)}
 try{const logo=await fetch('./war-adventures-logo.png');if(logo.ok)await cache.put('./war-adventures-logo.png',logo)}catch(e){}
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if((key.startsWith('mash-unit-')||key.startsWith('tag-relay-test-'))&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith((async()=>{const cached=await caches.match(event.request);return cached||fetch(event.request)})())});
