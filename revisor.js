/* REVISOR CON IA: lo último antes de que el presupuesto salga al cliente, después del portero.
   Compara lo que pidió el cliente (el correo de origen o lo dictado) con las líneas del presupuesto y pregunta al servidor
   (que se lo pregunta a Claude con los datos personales tapados) si falta algún trabajo pedido, si alguna cantidad o unidad
   no cuadra con lo pedido o si algo va cobrado dos veces. Lo que conteste sale en una ventana como la del portero:
   «Añadir» cuando es una partida de la tarifa, «Mirar el presupuesto» cuando hay que tocarlo a mano, y «Está bien así».
   🛑 Nunca bloquea por un fallo técnico: si tarda más de diez segundos, falla o no hay conexión, se sigue como siempre.
   La misma revisión no se repite: se guarda una huella de lo pedido y las líneas.
   La app no lleva ninguna llave: el servidor solo contesta a las direcciones de las apps y con un tope al día. */
(function(){
var URL_REV='https://azkar-presupuestos-production.up.railway.app/api/revision-presupuesto';
var ESPERA=10000;

function nrm(x){try{return norm(String(x||''))}catch(_){return String(x||'').toLowerCase()}}
function hs(s){var h=5381,i;s=String(s);for(i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)+'.'+s.length}
function escH(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function T_(id){try{return (window.T?T(id):null)||tarifa().find(function(t){return t.id===id})||null}catch(_){return null}}

/* lo que pidió el cliente: lo dictado (lo que hay ahora en el cuadro y lo que se guardó al convertir) y el correo de origen */
function loPedido(c){var partes=[],vistos={};
 function mete(t){t=String(t||'').trim();if(t.length<4)return;var k=nrm(t).replace(/\s+/g,' ');if(vistos[k])return;
  if(Object.keys(vistos).some(function(v){return v.indexOf(k)>-1}))return;vistos[k]=1;partes.push(t)}
 mete(c.loPedido);mete((document.getElementById('dictado')||{}).value);
 var co=c.correo;if(co&&!co.oculto){mete(co.dictado||co.texto);if(!(co.dictado||co.texto)&&co.items&&co.items.length)mete(co.items.join('. '))}
 return partes.join('\n\n').slice(0,6000)}

function idDe(l){if(l.tid)return l.tid;var d=nrm(String(l.d||'').split(' — ')[0]).replace(/\s+/g,' ').trim();if(!d)return '';var T0=[];try{T0=tarifa()}catch(_){}
 var t=T0.find(function(t){var x=nrm(t.d).replace(/\s+/g,' ').trim();var n=Math.min(40,x.length,d.length);return n>=12&&x.slice(0,n)===d.slice(0,n)});return t?t.id:''}

function preparar(c){if(!c||!c.lineas||!c.lineas.length)return null;var pedido=loPedido(c);if(pedido.length<8)return null;
 var L=c.lineas.filter(function(l){return l&&!l.imp&&String(l.d||'').trim()}).slice(0,120).map(function(l){var o={d:String(l.d).slice(0,220),q:num(l.q),u:l.u||'',p:num(l.p)};var id=idDe(l);if(id)o.id=id;return o});
 if(!L.length)return null;
 var TT=[];try{TT=tarifa().filter(function(t){return t&&t.id&&t.d}).slice(0,260)}catch(_){}
 var largo=100,datos;
 for(var i=0;i<4;i++){datos={pedido:pedido,lineas:L,tarifa:TT.map(function(t){return {id:t.id,d:String(t.d).slice(0,largo),u:t.u||''}})};
  if(JSON.stringify(datos).length<28000)return datos;largo=Math.max(30,Math.round(largo*0.6));if(i===2)datos.pedido=pedido=pedido.slice(0,3000)}
 return JSON.stringify(datos).length<29500?datos:null}
function huella(d){return hs(JSON.stringify([d.pedido,d.lineas.map(function(l){return [l.d,l.q,l.u,l.p]})]))}

function clave(a){return a.tipo+'|'+nrm(a.trabajo).replace(/[^a-z0-9]+/g,' ').trim()}
function pendientes(avisos){var ok=(cur.revIAok||[]),yaP=(cur.okPedidoT||[]);return (avisos||[]).filter(function(a){return ok.indexOf(clave(a))<0&&!(a&&a.id_tarifa&&yaP.indexOf(a.id_tarifa)>=0)})}
function hecho(a){cur.revIAok=(cur.revIAok||[]).concat([clave(a)]).slice(-60)}

function preguntar(datos){
 if(window.__revisorFalso)return Promise.resolve(window.__revisorFalso(datos));
 var ac=null;try{ac=new AbortController()}catch(_){}
 var t=null;var tiempo=new Promise(function(_,no){t=setTimeout(function(){try{ac&&ac.abort()}catch(_){}no(new Error('tarde'))},ESPERA)});
 /* text/plain: así el navegador no tiene que preguntar antes al servidor (una ida y vuelta menos) */
 var f=fetch(window.REVISOR_URL||URL_REV,{method:'POST',headers:{'content-type':'text/plain'},body:JSON.stringify(datos),signal:ac?ac.signal:undefined,credentials:'omit',cache:'no-store'})
  .then(function(r){return r.json().then(function(j){if(!r.ok||!j||!j.ok||!Array.isArray(j.avisos))throw new Error('sin revisión');return j.avisos})});
 return Promise.race([f,tiempo]).then(function(v){clearTimeout(t);return v},function(e){clearTimeout(t);throw e})}

/* el cartelito mientras se repasa: se puede seguir sin esperar */
function esperando(si,saltar){var e=document.getElementById('revisorEspera');if(!si){if(e)e.remove();return}
 if(e)e.remove();e=document.createElement('div');e.id='revisorEspera';
 e.style.cssText='position:fixed;left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:9601;max-width:560px;margin:0 auto;background:#1F2A37;color:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.3);font-size:15px;display:flex;gap:10px;align-items:center;justify-content:space-between';
 e.innerHTML='<span>Mirando que no falte nada de lo que pidió el cliente…</span><button type="button" class="mini sec" style="flex:none">Seguir sin mirar</button>';
 e.querySelector('button').onclick=saltar;document.body.appendChild(e)}

/* la ventana, igual que la del portero */
function mostrar(P,seguir){var vie=document.getElementById('revisorBox');if(vie)vie.remove();
 var d=document.createElement('div');d.id='revisorBox';d.style.cssText='position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center';
 var h='<div style="background:#fff;max-width:560px;width:100%;max-height:85vh;overflow:auto;border-radius:16px 16px 0 0;padding:16px 16px 20px;font-size:15px;color:#222">'
  +'<div style="font-weight:700;font-size:17px;margin-bottom:4px">Antes de que salga, mira esto</div>'
  +'<div style="color:#555;font-size:13px;margin-bottom:10px">Comparado con lo que pidió el cliente. Él todavía no lo ha visto.</div>';
 P.forEach(function(a,i){var t=a.id_tarifa?T_(a.id_tarifa):null;
  var q=a.cantidad>0?String(a.cantidad).replace('.',','):'';var u=t?(t.u==='m2'?'m²':t.u):'';
  h+='<div style="border-left:5px solid #B3261E;background:#FBE3E0;border-radius:8px;padding:10px 12px;margin:8px 0">'+escH(a.detalle||a.trabajo)
   +(a.tipo==='falta'&&t?'<div style="color:#555;font-size:13px;margin-top:4px">Se añade: '+escH(String(t.d).slice(0,90))+(String(t.d).length>90?'…':'')+(q?' · '+q+' '+escH(u):'')+'</div>':'')
   +'<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">'
   +(a.tipo==='falta'&&t?'<button type="button" data-i="'+i+'" data-a="anadir" class="mini">Añadir</button>':'<button type="button" data-i="'+i+'" data-a="ver" class="mini">Mirar el presupuesto</button>')
   +'<button type="button" data-i="'+i+'" data-a="ok" class="mini sec">Está bien así</button></div></div>'});
 h+='</div>';d.innerHTML=h;document.body.appendChild(d);
 d.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('button');if(!b){if(ev.target===d)d.remove();return}
  var a=P[+b.getAttribute('data-i')],q=b.getAttribute('data-a');if(!a){d.remove();return}
  try{leer()}catch(_){}
  if(q==='ver'){d.remove();try{renderLineas()}catch(_){}var e=document.getElementById('lineas')||document.getElementById('tb');if(e)e.scrollIntoView({behavior:'smooth',block:'center'});return}
  if(q==='anadir'){var t=T_(a.id_tarifa);if(t){var n=num(a.cantidad)>0?num(a.cantidad):1;cur.lineas.push({d:t.d,q:n,u:t.u,p:t.p,tid:t.id});try{renderLineas()}catch(_){}}}
  hecho(a);
  /* lo ya mirado no se vuelve a preguntar: la huella pasa a ser la de ahora */
  var R=P.filter(function(x){return x!==a});try{leer()}catch(_){}try{var dd=preparar(cur);if(dd)cur.revIA={h:huella(dd),avisos:pendientes((cur.revIA||{}).avisos)}}catch(_){}
  try{autoGuardar()}catch(_){}
  if(R.length){P=R;mostrar(R,seguir)}else{d.remove();seguir()}})}

function envolver(fn,nombre){var g=function(){var self=this,args=arguments;
  if(nombre==='imprimir'&&args[0]==='precios')return fn.apply(self,args);
  if(window.__vigSilencio||window.__revisorPasa)return fn.apply(self,args);
  if(window.__revisorEspera)return;/* ya está mirando: un segundo toque no hace nada */
  try{leer()}catch(_){}
  /* lo del portero va primero: cuando se resuelve, vuelve a llamar y entonces se mira esto */
  try{if(window.porteroProblemas&&porteroProblemas(cur).length)return fn.apply(self,args)}catch(_){}
  var datos=null;try{datos=preparar(cur)}catch(_){}
  var seguir=function(){window.__revisorPasa=1;try{return fn.apply(self,args)}finally{window.__revisorPasa=0}};
  if(!datos)return fn.apply(self,args);
  var h=huella(datos);
  if(cur.revIA&&cur.revIA.h===h){var P0=pendientes(cur.revIA.avisos);if(P0.length)return mostrar(P0,seguir);return fn.apply(self,args)}
  if(navigator.onLine===false)return fn.apply(self,args);
  var hecha=false,num0=cur.num;
  var fin=function(av){if(hecha)return;hecha=true;window.__revisorEspera=0;esperando(false);
   if(av&&window.cur&&cur.num===num0){cur.revIA={h:h,avisos:av};try{autoGuardar()}catch(_){}var P=pendientes(av);if(P.length)return mostrar(P,seguir)}
   seguir()};
  window.__revisorEspera=1;esperando(true,function(){fin(null)});
  preguntar(datos).then(function(av){fin(av)},function(){fin(null)})};
 g.__revisor=1;return g}

/* lo dictado se apunta en el presupuesto al convertirlo: el cuadro se vacía al abrir otro, y la revisión lo necesita después */
function apuntarDictado(){var c0=window.convertir;if(typeof c0!=='function'||c0.__revisor)return;
 var g=function(){try{var t=String((document.getElementById('dictado')||{}).value||'').trim();if(t&&window.cur){var pr=String(cur.loPedido||'');
   if(!pr||t.indexOf(pr)===0)cur.loPedido=t.slice(-6000);else if(pr.indexOf(t)<0)cur.loPedido=(pr+'\n'+t).slice(-6000)}}catch(_){}
  return c0.apply(this,arguments)};g.__revisor=1;window.convertir=g}

/* se engancha encima del portero (que va justo antes) */
function enganchar(){if(window.__revisorOn)return;if(!window.__porteroOn||typeof window.mandarFirma!=='function'||typeof window.imprimir!=='function')return setTimeout(enganchar,300);
 window.__revisorOn=1;window.mandarFirma=envolver(window.mandarFirma,'mandarFirma');window.imprimir=envolver(window.imprimir,'imprimir')}
enganchar();
setTimeout(apuntarDictado,0);
window.revisorIA={preparar:preparar,huella:huella,loPedido:loPedido};
})();
