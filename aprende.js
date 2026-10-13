/* Mientras se le enseña la app a una empresa (en su empresa.json, "aprende": true):
   lo que se dicta, lo que sacó la app, lo que preguntó, lo que se contestó y el presupuesto tal como sale hacia el cliente.
   Se guarda CIFRADO con la clave pública de Vorma: en la nube solo hay letras sin sentido, y solo se puede leer
   con la clave privada, que está en el repositorio privado vigilante (aprende.yml lo deja en aprende/<empresa>.md).
   Antes de cifrar se tapan teléfonos, correos, documentos y cuentas. Para apagarlo: quitar "aprende" de su empresa.json. */
(function(){
 if(!window.EMP||!EMP.id||!EMP.aprende)return;
 if(!(window.crypto&&crypto.subtle&&window.TextEncoder&&window.Promise))return;
 var PUB='MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA67DkUaYB87zgAofuuFKp8Z7fEHDYPl5CJc2MoJZhSFXeXWR8ZM4xPIOUdE3Ha4GXvNPmY096Iug4f5Muni9oM13v0bRUaUcXIakU/uioIElpuZgDLxiv1Jgr1N9HwbI/7DJWdp/hagMWKNcHM52CPDfhmod9GBojQV/fb3SRWFbjjpWoaDe1WvbKJjtOqUY4l6wW6nxnU/a0MMzvXuVKg02tdwC6Pyuxs94EDvdetdO211IDvQpBFXhZ8R5Bh9oJXPtn0TFU018cKRx/BEvXXj4ftYT7ARAhsFr+fvLKbB+x5UrMJMK4BIVsMe2HocNQsxh8/VL8BMYFMr1KvO1xjA6LAxNptixoUcF00HSnw9M6EYELJWqmN1k2KBftDqxcYi1AB7MwKtqupmHSTwR116/iMvK29DIPmoKVxqwTYulvhJraL/YnNBoU6Tn8ujtwbai2hDl6TsZ7c9f2qZl2F2OTxLXek/wCTUOQRTGiYqJcLq1sDQTCwVn4q2LgdWDzAgMBAAE=';
 var LS='vr_apr',MAXN=25;
 function lee(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(e){return d}}
 function graba(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
 /* fuera datos personales antes de cifrar */
 function tapa(s){return String(s==null?'':s)
  .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,'[correo]')
  .replace(/\bES\d{2}(?:[\s-]?\d{4}){5}\b/gi,'[cuenta]')
  .replace(/(^|[^\w])[XYZ]?-?\d{7,8}[\s-]?[A-Z]\b/gi,'$1[documento]')
  .replace(/(?:\+|\b00)?\d(?:[\s.-]?\d){8,}/g,'[teléfono]')}
 function n(x){try{return window.num?num(x):parseFloat(String(x).replace(',','.'))||0}catch(e){return 0}}
 function fila(L){return (L||[]).slice(0,80).map(function(l){return [tapa(String(l.d||'').slice(0,160)),l.q,l.u||'',l.p,l.fb||'']})}
 function total(L){try{return Math.round((L||[]).reduce(function(a,l){return a+n(l.q)*n(l.p)},0)*100)/100}catch(e){return 0}}
 function huella(L){var s=JSON.stringify((L||[]).map(function(l){return [l.d,l.q,l.p]})),h=0;for(var i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0}return String(h)}

 /* cifrado: AES-GCM para el texto y RSA-OAEP (la clave pública) para la llave del AES */
 var kP=null;
 function clave(){if(!kP){var b=atob(PUB),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);
  kP=crypto.subtle.importKey('spki',u.buffer,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt'])}return kP}
 function b64(buf){var u=new Uint8Array(buf),s='';for(var i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
 function comprime(u8){if(!window.CompressionStream)return Promise.resolve(null);
  try{var cs=new CompressionStream('gzip'),w=cs.writable.getWriter();w.write(u8);w.close();
   return new Response(cs.readable).arrayBuffer().then(function(b){return new Uint8Array(b)}).catch(function(){return null})}catch(e){return Promise.resolve(null)}}
 function cifra(obj){var datos=new TextEncoder().encode(JSON.stringify(obj));
  return comprime(datos).then(function(z){var plano=z||datos,iv=crypto.getRandomValues(new Uint8Array(12));
   return Promise.all([clave(),crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt'])]).then(function(r){var pk=r[0],ak=r[1];
    return Promise.all([crypto.subtle.exportKey('raw',ak).then(function(raw){return crypto.subtle.encrypt({name:'RSA-OAEP'},pk,raw)}),
     crypto.subtle.encrypt({name:'AES-GCM',iv:iv},ak,plano)]).then(function(x){return {t:obj.t,k:b64(x[0]),i:b64(iv),c:b64(x[1]),z:z?1:0}})})})}

 var cola=Promise.resolve();
 function apunta(r){r.t=r.t||Date.now();r.ver=window.APP_VERSION||'';r.emp=EMP.id;
  cola=cola.then(function(){return cifra(r)}).then(function(x){var a=lee(LS,[]);if(!Array.isArray(a))a=[];a.push(x);graba(LS,a.slice(-MAXN));
   try{if(window.__usoSubir)__usoSubir()}catch(e){}}).catch(function(){})}

 /* lo que está marcado en las preguntas (lo que ha puesto la app o lo que ha tocado él) */
 function marcadas(){var out=[];try{document.querySelectorAll('#paqBox div, #encBox').forEach(function(d){
   var b=Array.prototype.filter.call(d.children,function(x){return x.tagName==='BUTTON'&&x.classList.contains('ok')&&!/paqMedida/.test(x.getAttribute('onclick')||'')});if(!b.length)return;
   var t=d.firstChild&&d.firstChild.nodeType===3?d.firstChild.textContent:((d.querySelector('b')||{}).textContent||'');
   var caja=d.parentElement,tit=(d.id!=='encBox'&&caja&&caja.firstElementChild&&caja.firstElementChild!==d)?caja.firstElementChild.textContent:'';
   out.push((tit?tit+' · ':'')+String(t).trim()+' → '+b.map(function(x){return x.textContent}).join(', '))})}catch(e){}return out.slice(0,40)}

 /* lo que dijo la app debajo del dictado, con los botones entre corchetes y ✓ en el marcado */
 function aviso(){var ci=document.getElementById('convInfo');if(!ci)return '';try{var cl=ci.cloneNode(true);
  cl.querySelectorAll('button').forEach(function(b){b.textContent=' ['+b.textContent.trim()+(b.classList.contains('ok')&&!/paqMedida/.test(b.getAttribute('onclick')||'')?' ✓':'')+'] '});
  cl.querySelectorAll('input').forEach(function(i){i.replaceWith(document.createTextNode(i.value?' «'+i.value+'» ':''))});
  cl.querySelectorAll('div,b,p,br').forEach(function(d){d.parentNode.insertBefore(document.createTextNode('\n'),d)});
  return cl.textContent.replace(/[ \t]+/g,' ').replace(/ *\n[ \n]*/g,'\n').trim()}catch(e){return String(ci.innerText||'')}}
 /* presupuestos que han tenido dictado: para ver luego cómo quedaron */
 function marcar(nm){if(!nm)return;var m=lee('vr_apr_d',{});m[nm]=Date.now();var ks=Object.keys(m);ks.forEach(function(k){if(Date.now()-m[k]>7*864e5)delete m[k]});graba('vr_apr_d',m)}
 function dictado(nm){var m=lee('vr_apr_d',{});return !!(nm&&m[nm]&&Date.now()-m[nm]<7*864e5)}

 /* lo que la app no entiende: se le dice que ya nos ha llegado y para cuándo estará (la revisión sale cada hora, de siete a diez de la noche)
    y que se va a quedar escrito y medido como lo demás, en ese mismo presupuesto: solo le faltará el precio */
 function cuando(){var d=new Date(),h=d.getHours(),m=d.getMinutes();return (h<6||h>=22||(h===21&&m>=50))?'mañana a primera hora':'en una hora más o menos'}
 function esc(t){return String(t||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
 var CAJA='background:#FFF4E5;border-left:4px solid #C24A00;padding:10px;border-radius:6px;margin-top:8px;font-size:14px;color:#3B2412;line-height:1.4';
 /* oficio.js la pone en vez de «No está en tu tarifa» */
 window.__aprendeCaja=function(lista){return '<div id="aprCaja" style="'+CAJA+'"><b>Esto aún no lo entiendo:</b> '+lista.map(function(d){return '«'+esc(String(d).slice(0,60))+'»'}).join(', ')+
  '.<br>Ya nos ha llegado: '+cuando()+' estará arreglado aquí mismo, escrito y medido como lo demás. Solo te faltará poner el precio. Mientras, sigue con lo demás.</div>'};
 /* si no ha sacado nada: lo dicho entra como una línea pendiente, para que la revisión la deje escrita en este mismo presupuesto */
 function lineaPendiente(txt){var ci=document.getElementById('convInfo');var d=String(txt||'').replace(/\s+/g,' ').trim();if(d.replace(/[^a-zA-Záéíóúñ]/g,'').length<4||!window.cur)return null;
  d=d.charAt(0).toUpperCase()+d.slice(1,140);var l={d:d,q:1,u:'ud',p:0,fb:'f'+Math.random().toString(36).slice(2,9)};
  try{if(window.leer&&document.querySelectorAll('#tb tr').length===(cur.lineas||[]).length)leer()}catch(e){}
  cur.lineas=(cur.lineas||[]).concat([l]);try{renderLineas()}catch(e){}try{autoGuardar()}catch(e){}
  if(ci&&!document.getElementById('aprCaja'))ci.insertAdjacentHTML('beforeend',window.__aprendeCaja([d]));return l}

 /* 1) cada dictado (lo llama dictados.js cuando ya están las líneas y las preguntas) */
 window.__aprende=function(r){try{
  if(r.q==='dicta'){var L=(window.cur&&cur.lineas)||[];var desde=r.desde||0;delete r.desde;
   r.texto=tapa(String(r.texto||'').slice(0,4000));r.lineas=fila(L.slice(desde));r.antes=desde;r.n=L.length;r.total=total(L);
   if(!r.lineas.length&&lineaPendiente(r.texto)){L=cur.lineas;r.lineas=fila(L.slice(desde));r.n=L.length;r.pendiente=1}
   r.aviso=tapa(aviso().slice(0,3000));r.marcado=marcadas();
   if(r.error)r.error=tapa(String(r.error).slice(0,300));marcar(r.num)}
  apunta(r)}catch(e){}};

 /* 2) lo que contesta a las preguntas: se junta lo que toca seguido en la misma pregunta */
 var pend={};
 window.__usoPregunta=function(que,resp){try{var k=String(que);if(pend[k])clearTimeout(pend[k].t);
  pend[k]={t:setTimeout(function(){delete pend[k];apunta({q:'resp',num:(window.cur&&cur.num)||'',que:tapa(k.slice(0,200)),r:tapa(String(resp).slice(0,200)),n:((window.cur&&cur.lineas)||[]).length,total:total((window.cur&&cur.lineas)||[])})},4000)}}catch(e){}};

 /* 3) cómo sale hacia el cliente (mandar o PDF) y cómo se queda un presupuesto dictado al dejarlo */
 function foto(q,c){c=c||window.cur;if(!c||!c.num)return;var L=c.lineas||[];if(!L.length)return;
  if(q==='deja'&&!dictado(c.num))return;
  var H=lee('vr_apr_h',{}),h=huella(L);if(Object.keys(H).length>300)H={};
  if(H[c.num+'|'+q]===h||(q==='deja'&&H[c.num+'|ult']===h))return;
  H[c.num+'|'+q]=h;H[c.num+'|ult']=h;graba('vr_apr_h',H);
  apunta({q:q,num:c.num,lineas:fila(L),n:L.length,total:total(L),iva:c.iva||'',firmado:!!c.firmaTok})}
 function envolver(nombre,antes){var f=window[nombre];if(typeof f!=='function'||f.__apr)return;
  var g=function(){try{antes.apply(this,arguments)}catch(e){}return f.apply(this,arguments)};g.__apr=1;window[nombre]=g}
 setTimeout(function(){
  envolver('mandarFirma',function(){try{if(window.leer)leer()}catch(e){}if(window.cur&&cur.nom)foto('mandar')});
  envolver('imprimir',function(m){if(m!=='precios')foto('pdf')});
  envolver('nuevo',function(){foto('deja')});
  envolver('abrir',function(){foto('deja')});
  /* los dictados de los últimos días que se cambiaron en otro momento */
  try{var m=lee('vr_apr_d',{});Object.keys(m).forEach(function(k){if(window.DB&&DB.presus&&DB.presus[k]&&!(window.cur&&cur.num===k))foto('deja',DB.presus[k])})}catch(e){}
 },3000);
 document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')try{foto('deja')}catch(e){}});

 /* 4) lo que la revisión ya ha dejado escrito: empresas/<id>/arreglos.json = {"lineas": {"<fb>": [{"d": "…", "q": 12.5, "u": "m2", "id": "<de la tarifa>"}]}}
       Cada línea marcada fb que siga sin precio se cambia por las suyas, con el precio de su tarifa si lo tiene (si no, a cero: solo falta ponerlo).
       Nunca se toca un presupuesto ya mandado o aceptado. */
 var ARR=null,ultArr=0;
 function norm2(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
 function enviado(p){return !!(p&&(p.firmaTok||(p.estado&&p.estado!=='borrador')))}
 function precioDe(r){try{if(r.id&&window.tarifa){var t=tarifa().find(function(x){return x.id===r.id});if(t&&n(t.p)>0)return n(t.p)}var k=window.precioAprendido?precioAprendido(r.d):0;return k>0?k:0}catch(e){return 0}}
 function arregla(L){if(!ARR||!L)return null;var ya={},hechos=[],out=[];
  L.forEach(function(x){if(!(x&&x.fb&&ARR[x.fb]&&!(n(x.p)>0)))ya[norm2(x&&x.d)]=1});
  L.forEach(function(l){var R=l&&l.fb&&!(n(l.p)>0)&&ARR[l.fb];if(!R){out.push(l);return}
   var nuevas=[];(Array.isArray(R)?R:[]).forEach(function(r){if(!r||!r.d||ya[norm2(r.d)])return;ya[norm2(r.d)]=1;
    nuevas.push({d:String(r.d),q:n(r.q)>0?n(r.q):(n(l.q)||1),u:r.u||l.u||'ud',p:precioDe(r),arr:1})});
   out=out.concat(nuevas);hechos.push({antes:String(l.d||''),ahora:nuevas.map(function(x){return x.d}),sinPrecio:nuevas.filter(function(x){return !(x.p>0)}).length})});
  return hechos.length?{lineas:out,hechos:hechos}:null}
 function aplicar(){if(!ARR||!window.DB)return;var avisos=[];
  try{if(window.cur&&cur.num&&!enviado(cur)&&(cur.lineas||[]).some(function(l){return l.fb&&ARR[l.fb]})){
    var filas=document.querySelectorAll('#tb tr').length;
    if(filas===(cur.lineas||[]).length){try{leer()}catch(e){}var a=arregla(cur.lineas);
     if(a){cur.lineas=a.lineas;try{renderLineas()}catch(e){}try{autoGuardar()}catch(e){}avisos.push({num:cur.num,nom:cur.nom||'',h:a.hechos,abierto:1})}}}
   Object.keys(DB.presus||{}).forEach(function(k){if(window.cur&&cur.num===k)return;var p=DB.presus[k];if(!p||enviado(p))return;var a=arregla(p.lineas);if(!a)return;
    p.lineas=a.lineas;avisos.push({num:k,nom:p.nom||'',h:a.hechos});try{if(window.subirPresu)subirPresu(k)}catch(e){}});
   if(avisos.length)try{lsSet('vr_db',JSON.stringify(DB))}catch(e){}}catch(e){}
  if(!avisos.length)return;
  avisos.forEach(function(v){apunta({q:'arreglo',num:v.num,hechos:v.h.map(function(x){return {antes:tapa(x.antes.slice(0,160)),ahora:x.ahora.map(function(d){return tapa(String(d).slice(0,160))}),sinPrecio:x.sinPrecio}})})});
  barra(avisos)}
 function barra(avisos){var b=document.getElementById('aprArreglo');if(b)b.remove();
  var sp=avisos.reduce(function(a,v){return a+v.h.reduce(function(x,h){return x+h.sinPrecio},0)},0);
  var h='<div id="aprArreglo" style="position:fixed;left:8px;right:8px;top:8px;z-index:9850;background:#1B7A3A;color:#fff;padding:12px 14px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.35);font-size:15px;line-height:1.4;max-height:70vh;overflow:auto">'+
   '<b>Ya está arreglado lo que la app no entendía.</b>'+avisos.map(function(v){return '<div style="margin-top:6px">Presupuesto nº '+esc(v.num)+(v.nom?' ('+esc(v.nom)+')':'')+': '+
    v.h.map(function(x){return '«'+esc(x.antes.slice(0,50))+'» ahora es '+(x.ahora.length?x.ahora.map(function(d){return '«'+esc(d.slice(0,70))+(d.length>70?'…':'')+'»'}).join(' y '):'nada (ya estaba)')}).join('; ')+'.</div>'}).join('')+
   (sp?'<div style="margin-top:6px"><b>Solo te falta poner el precio</b> de lo que está en rojo.</div>':'<div style="margin-top:6px">Ya lleva tu precio: revísalo y listo.</div>')+
   '<div style="display:flex;gap:8px;margin-top:10px">'+(avisos.length===1&&!avisos[0].abierto?'<button class="ok" style="flex:1" onclick="document.getElementById(\'aprArreglo\').remove();try{abrir(\''+String(avisos[0].num).replace(/[^\w-]/g,'')+'\')}catch(e){}">Abrirlo</button>':'')+
   '<button class="sec" style="flex:1;background:#fff;color:#1B7A3A" onclick="document.getElementById(\'aprArreglo\').remove()">Vale</button></div></div>';
  document.body.insertAdjacentHTML('beforeend',h)}
 function traer(forzar){if(!forzar&&Date.now()-ultArr<5*60000)return;ultArr=Date.now();
  try{fetch('empresas/'+EMP.id+'/arreglos.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.lineas&&typeof j.lineas==='object'){ARR=j.lineas;aplicar()}}).catch(function(){})}catch(e){}}
 window.__aprendeArreglos=function(){traer(true)};
 setTimeout(function(){traer(true)},6000);
 setInterval(function(){if(document.visibilityState==='visible')traer()},10*60000);
 document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(traer,1500)});

 /* que se sepa: debajo del dictado */
 function nota(){var cv=document.getElementById('cardVoz');if(!cv||document.getElementById('aprNota'))return;
  cv.insertAdjacentHTML('beforeend','<p id="aprNota" style="font-size:12px;color:var(--muted);margin:8px 0 0">Mientras la app aprende, revisamos lo que dictas para enseñarle tus palabras.</p>')}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',nota);else nota();
})();
