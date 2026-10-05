/* La misma app para otra empresa (marca blanca).
   Se activa una vez con el enlace ?e=<id> (por ejemplo ?e=lucas): carga empresas/<id>/empresa.json
   con sus datos, logo, fotos y tarifa, y lo deja guardado en el movil para que funcione siempre,
   tambien sin cobertura y abriendo la app desde el icono.
   Sin ?e= y sin nada guardado, la app es la de siempre (Vorma). */
(function(){
var q=new URLSearchParams(location.search),pid=(q.get('e')||'').replace(/[^a-z0-9_-]/gi,'').toLowerCase();
var guardado=null;try{guardado=JSON.parse(localStorage.getItem('vr_emp_cfg')||'null')}catch(e){}
function bajar(id){try{var x=new XMLHttpRequest();x.open('GET','empresas/'+id+'/empresa.json?'+Date.now(),false);x.send();if(x.status===200){var j=JSON.parse(x.responseText);if(j&&j.id===id)return j}}catch(e){}return null}
var E=null;
if(pid==='vorma'){try{localStorage.removeItem('vr_emp_cfg')}catch(e){}}
else if(pid){
 /* un movil que ya tiene presupuestos de otra empresa no se cambia: se mezclarian */
 var otra=guardado?guardado.id!==pid:!!localStorage.getItem('vr_db');
 if(otra&&!q.get('forzar')){window.__empOtra=pid;E=guardado}
 else{E=bajar(pid)||(guardado&&guardado.id===pid?guardado:null);if(E){try{localStorage.setItem('vr_emp_cfg',JSON.stringify(E))}catch(e){}}}
}else E=guardado;
/* refresco silencioso de los datos de la empresa (logo, tarifa), sin bloquear */
if(E&&!pid){try{fetch('empresas/'+E.id+'/empresa.json?'+Math.floor(Date.now()/36e5)).then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.id===E.id)try{localStorage.setItem('vr_emp_cfg',JSON.stringify(j))}catch(e){}}).catch(function(){})}catch(e){}}
window.EMP=E;
if(E){document.title=E.nombreApp+' · Presupuestos';
 var setL=function(rel,href){var l=document.querySelector('link[rel="'+rel+'"]');if(l)l.href=href};
 setL('manifest','empresas/'+E.id+'/manifest.json');setL('apple-touch-icon','empresas/'+E.id+'/icon-192.png');setL('icon','empresas/'+E.id+'/icon-192.png')}
})();
