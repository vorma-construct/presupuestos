/* Marca blanca, segunda parte: lo que cambia en pantalla y en los documentos cuando la app es de otra empresa */
(function(){
var E=window.EMP;
/* una cuenta solo entra en la app de su empresa (para no mezclar datos ni marcas) */
window.__empCuenta=function(aj){var mia=E?E.id:'',suya=(aj&&aj.emp)||'';if(mia===suya)return false;
 try{firebase.auth().signOut()}catch(e){}
 setTimeout(function(){var m=document.getElementById('lg_msg');if(m)m.textContent=suya?'Esta cuenta es de otra empresa: entra desde su propio enlace.':'Esta cuenta no es de '+(E?E.aj.marca:'esta app')+'.'},400);return true};
if(!E)return;
/* sus colores: en la app, en los documentos y en la pagina donde firma el cliente (va en el primer <style>) */
var C=E.colores;if(C){var st=document.querySelector('style');var css='\n:root{--brick:'+C.boton+';--ok:'+C.fuerte+';--brick2:'+C.claro+';--gold:'+C.fuerte+';--oro:'+C.boton+';--oro2:'+C.marca+'}';
 if(st&&st.textContent.indexOf('--brick:'+C.boton)<0)st.textContent+=css}
var T=E.tarifa||{};
TARIFA_BASE.forEach(function(t){if(!(t.p>0)&&T[t.id]>0)t.p=T[t.id]});/* las partidas que se añaden despues (oficio.js) */
function marca(){var lt=document.getElementById('loginTitle');if(lt)lt.textContent=AJ.marca;var li=document.querySelector('#login img');if(li)li.src='empresas/'+E.id+'/icon-192.png';
 var bt=document.getElementById('brandTxt');if(bt)bt.textContent=(AJ.marca||'').toUpperCase()
 var lg=1;if(lg){
  var em=document.getElementById('lg_email');if(em&&!em.value&&AJ.email)em.value=AJ.email}
 /* una empresa, una sola cuenta: todos sus moviles entran con el mismo correo y la misma clave y asi ven y guardan lo mismo.
    El boton de crear otra cuenta solo sale con ?alta=1 (para dar de alta una empresa nueva) */
 try{if(!/[?&]alta=1/.test(location.search)){var cb=document.querySelector('#login button[onclick="crearCuenta()"]');if(cb)cb.style.display='none';
  var lp=document.querySelector('#login p');if(lp)lp.textContent='Entra con el mismo correo y la misma clave en todos los móviles de la empresa: así todos ven lo mismo.'}}catch(_){}}
marca();document.addEventListener('DOMContentLoaded',marca);setTimeout(marca,1500);
/* dosier: sus fotos, sus servicios, nada de lo de otra empresa */
function dosier(){var d=document.getElementById('sh_dosier');if(!d||d.__emp)return;d.__emp=1;var F=E.fotos||{};
 var p=d.querySelector('.portada > img');if(p&&F.portada)p.src=F.portada;
 d.querySelectorAll('.fotos img').forEach(function(im,i){if(F.fotos&&F.fotos[i])im.src=F.fotos[i];else im.remove()});
 d.querySelectorAll('.segimg img').forEach(function(im,i){if(F.segui&&F.segui[i])im.src=F.segui[i];else im.remove()});
 var v=d.querySelector('.vals');if(v&&!E.vals)v.remove();
 var s=d.querySelector('ul.serv');if(s&&E.servicios)s.innerHTML=E.servicios.map(function(x){return '<li>'+x+'</li>'}).join('')}
dosier();document.addEventListener('DOMContentLoaded',dosier);
var pd0=window.pintarDocs;
window.pintarDocs=function(){dosier();var r=pd0.apply(this,arguments);try{
 var ds=document.getElementById('d_sub');if(ds)ds.textContent=(E.sub||'')+(AJ.tel?' · '+AJ.tel:'');
 var cb=document.getElementById('c_body');if(cb&&E.ciudad)cb.innerHTML=cb.innerHTML.replace('En Bilbao, a ','En '+E.ciudad+', a ');
 var dl=document.getElementById('d_logo');if(dl)dl.src=LOGO_T}catch(e){}return r};
})();
