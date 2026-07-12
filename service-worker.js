const CACHE_VERSION='cyber-world-v42';
const CORE=['./','./index.html','./manifest.webmanifest','./asset-manifest.json','./public/pwa/icon-192.png','./public/pwa/icon-512.png','./public/pwa/icon-maskable-512.png','./public/pwa/apple-touch-icon.png'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_VERSION);
    await cache.addAll(CORE);
    try{
      const response=await fetch('./asset-manifest.json',{cache:'no-store'});
      const assets=await response.json();
      for(let i=0;i<assets.length;i+=12){
        await Promise.allSettled(assets.slice(i,i+12).map(url=>cache.add(url)));
      }
    }catch(error){console.warn('Optional asset precache incomplete',error)}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('cyber-world-')&&key!==CACHE_VERSION).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(event.request);
        const cache=await caches.open(CACHE_VERSION);cache.put('./index.html',fresh.clone());return fresh;
      }catch{return(await caches.match(event.request))||(await caches.match('./index.html'))}
    })());return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    try{
      const fresh=await fetch(event.request);
      if(fresh.ok){const cache=await caches.open(CACHE_VERSION);cache.put(event.request,fresh.clone())}
      return fresh;
    }catch{return new Response('',{status:504,statusText:'Offline'})}
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='CACHE_STATUS'){
    event.waitUntil((async()=>{const cache=await caches.open(CACHE_VERSION),keys=await cache.keys();event.source?.postMessage({type:'CACHE_STATUS',count:keys.length,version:CACHE_VERSION})})());
  }
});
