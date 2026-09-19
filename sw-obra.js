var C='obra-v1';
self.addEventListener('install',function(e){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(clients.claim())});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET'||!/obra\.html|icons\/|obra\.webmanifest/.test(e.request.url))return;
  e.respondWith(fetch(e.request).then(function(r){var c=r.clone();caches.open(C).then(function(k){k.put(e.request,c)});return r}).catch(function(){return caches.match(e.request)}));
});
self.addEventListener('notificationclick',function(e){e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(function(w){if(w.length){w[0].focus();if(e.notification.data&&e.notification.data.url)w[0].navigate(e.notification.data.url)}else clients.openWindow(e.notification.data&&e.notification.data.url||'./obra.html')}))});
