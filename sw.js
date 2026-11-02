/* AuraLib service worker: the app shell works offline; Supabase requests always go to the network.
   Bump VERSION when shipping changes so clients drop the old cache. */
var VERSION='auralib-v2.0.0';
var SHELL=['./','index.html','js/config.js','js/i18n.js','js/catalog.js','js/store.js','js/app.js','manifest.webmanifest',
  'icons/icon.svg','icons/icon-192.png','icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/dist/umd/supabase.js'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){return c.addAll(SHELL)}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==VERSION}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
self.addEventListener('fetch',function(e){
  var req=e.request,url=new URL(req.url);
  if(req.method!=='GET'||/supabase\.co$/.test(url.hostname))return;
  var own=url.origin===self.location.origin;
  if(own){
    /* Network first, so a new deploy shows up on the next load; cache as the offline fallback. */
    e.respondWith(fetch(req).then(function(res){
      if(res.ok){var copy=res.clone();caches.open(VERSION).then(function(c){c.put(req,copy)})}
      return res;
    }).catch(function(){
      return caches.match(req,{ignoreSearch:true}).then(function(r){return r||(req.mode==='navigate'?caches.match('index.html'):undefined)});
    }));
    return;
  }
  if(/(^|\.)jsdelivr\.net$|fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    /* Versioned CDN files and fonts: cache first. */
    e.respondWith(caches.match(req).then(function(hit){
      return hit||fetch(req).then(function(res){
        if(res.ok||res.type==='opaque'){var copy=res.clone();caches.open(VERSION).then(function(c){c.put(req,copy)})}
        return res;
      });
    }));
  }
});
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
    for(var i=0;i<list.length;i++){if('focus' in list[i])return list[i].focus()}
    return self.clients.openWindow('./#loans');
  }));
});
