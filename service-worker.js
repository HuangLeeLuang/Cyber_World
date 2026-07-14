const CACHE_VERSION='cyber-world-v71';
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
    const update=fetch(event.request).then(async fresh=>{if(fresh.ok){const cache=await caches.open(CACHE_VERSION);await cache.put('./index.html',fresh.clone())}return fresh});
    event.waitUntil(update.catch(()=>{}));
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_VERSION);
      const cached=await cache.match('./index.html',{ignoreSearch:true})||await cache.match('./',{ignoreSearch:true});
      if(cached)return cached;
      try{return await update}catch{return new Response('<!doctype html><meta charset="utf-8"><title>離線啟動失敗</title><h1>遊戲尚未完成離線安裝</h1><p>請先連線開啟遊戲，按下「準備完整離線資料」，等待完成後再加入主畫面。</p>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}})}
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
  if(event.data?.type==='PREPARE_OFFLINE'){
    event.waitUntil((async()=>{let failures=0,cache=await caches.open(CACHE_VERSION);for(const url of CORE){try{await cache.add(url)}catch{failures++}}try{const response=await fetch('./asset-manifest.json',{cache:'no-store'}),assets=await response.json();for(let i=0;i<assets.length;i+=8){const results=await Promise.allSettled(assets.slice(i,i+8).map(url=>cache.add(url)));failures+=results.filter(x=>x.status==='rejected').length}}catch{failures++}const keys=await cache.keys();event.source?.postMessage({type:'OFFLINE_READY',count:keys.length,version:CACHE_VERSION,failures})})());
  }
});
