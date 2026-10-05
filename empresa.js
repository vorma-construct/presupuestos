/* La misma app para otra empresa (marca blanca).
   Se activa con el enlace ?e=<id> (por ejemplo ?e=lucas): carga empresas/<id>/empresa.json
   con sus datos, logo, colores, fotos y tarifa, y lo deja guardado en el movil.
   Cada empresa guarda sus presupuestos y su sesion APARTE: en el mismo movil pueden estar
   la app de Vorma y la de otra empresa sin mezclarse.
   Sin ?e= la app es la de siempre (Vorma), salvo en un movil que solo tiene la otra empresa. */
(function(){
var LS=window.localStorage,G=Storage.prototype.getItem,S=Storage.prototype.setItem,R=Storage.prototype.removeItem;
var q=new URLSearchParams(location.search),pid=(q.get('e')||'').replace(/[^a-z0-9_-]/gi,'').toLowerCase();
var guardado=null;try{guardado=JSON.parse(G.call(LS,'vr_emp_cfg')||'null')}catch(e){}
function bajar(id){try{var x=new XMLHttpRequest();x.open('GET','empresas/'+id+'/empresa.json?'+Date.now(),false);x.send();if(x.status===200){var j=JSON.parse(x.responseText);if(j&&j.id===id)return j}}catch(e){}return null}
var E=null;
if(pid==='vorma'){}
else if(pid){E=bajar(pid)||(guardado&&guardado.id===pid?guardado:null);if(E){try{S.call(LS,'vr_emp_cfg',JSON.stringify(E))}catch(e){}}}
else if(guardado&&!G.call(LS,'vr_db'))E=guardado;/* movil que solo tiene la otra empresa (abierta desde el icono) */
if(!E){window.EMP=null;return}
window.EMP=E;
/* sus datos en el movil, aparte: vr_db -> emp_lucas:vr_db */
var P='emp_'+E.id+':',mia=function(k){return typeof k==='string'&&/^vr_/.test(k)&&k!=='vr_emp_cfg'};
/* si la version anterior ya guardo datos de esta empresa sin apartar, se pasan a su sitio */
try{var aj=JSON.parse(G.call(LS,'vr_aj')||'{}');if(aj.emp===E.id&&!G.call(LS,P+'vr_db')){for(var i=LS.length-1;i>=0;i--){var k=LS.key(i);if(mia(k)){S.call(LS,P+k,G.call(LS,k));R.call(LS,k)}}}}catch(e){}
Storage.prototype.getItem=function(k){return G.call(this,this===LS&&mia(k)?P+k:k)};
Storage.prototype.setItem=function(k,v){return S.call(this,this===LS&&mia(k)?P+k:k,v)};
Storage.prototype.removeItem=function(k){return R.call(this,this===LS&&mia(k)?P+k:k)};
/* su sesion de la nube, aparte de la de Vorma */
window.__fbInit=function(cfg){var app=firebase.initializeApp(cfg,'emp_'+E.id);if(!app||typeof app.auth!=='function')return app;
 var copia=function(f,nf){Object.getOwnPropertyNames(f).forEach(function(k){if(['length','name','prototype','arguments','caller'].indexOf(k)<0)try{nf[k]=f[k]}catch(e){}});return nf};
 firebase.auth=copia(firebase.auth,function(){return app.auth()});firebase.firestore=copia(firebase.firestore,function(){return app.firestore()});return app};
/* refresco silencioso de los datos de la empresa (logo, tarifa, colores) */
if(!pid){try{fetch('empresas/'+E.id+'/empresa.json?'+Math.floor(Date.now()/36e5)).then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.id===E.id)try{S.call(LS,'vr_emp_cfg',JSON.stringify(j))}catch(e){}}).catch(function(){})}catch(e){}}
document.title=E.nombreApp+' · Presupuestos';
var setL=function(rel,href){var l=document.querySelector('link[rel="'+rel+'"]');if(l)l.href=href};
setL('manifest','empresas/'+E.id+'/manifest.json');setL('apple-touch-icon','empresas/'+E.id+'/icon-192.png');setL('icon','empresas/'+E.id+'/icon-192.png');
var C=E.colores;if(C){var m=document.querySelector('meta[name="theme-color"]');if(m&&C.oscuro)m.content=C.oscuro}
})();
