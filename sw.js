const CACHE='tag-relay-test-v1';
const FILES=['./','./index.html','./app.js','./manifest.webmanifest','./icon.svg'];
const LIBS=['https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js','https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(FILES);for(const url of LIBS){const response=await fetch(url,{mode:'no-cors'});await c.put(url,response)}await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith((async()=>{const cached=await caches.match(event.request);if(cached)return cached;return fetch(event.request)})())});