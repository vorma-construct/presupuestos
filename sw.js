/* Recibe los PDF que se comparten desde WhatsApp u otra app (Android: Compartir → la app) */
self.addEventListener('install',function(e){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){
  var u=new URL(e.request.url);
  if(e.request.method!=='POST'||!u.searchParams.has('compartir'))return;
  e.respondWith((async function(){
    try{var f=await e.request.formData(),fs=f.getAll('archivos'),c=await caches.open('compartido'),ks=await c.keys();
      for(var k of ks)await c.delete(k);
      for(var i=0;i<fs.length;i++){var x=fs[i];if(!x||!x.size)continue;
        await c.put(new Request(self.registration.scope+'compartido/'+i),new Response(x,{headers:{'content-type':x.type||'application/pdf','x-nombre':encodeURIComponent(x.name||('archivo'+i+'.pdf'))}}))}
    }catch(err){}
    return Response.redirect(self.registration.scope+'?compartido=1',303)})());
});
