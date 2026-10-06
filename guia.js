/* Asistente para quien abre la app por primera vez: una pregunta por pantalla, letra grande,
   y una barra arriba que dice siempre cual es el siguiente paso. En espanol y en rumano.
   Se quita solo cuando el albanil ya ha mandado tres presupuestos, o cuando pulsa «Ya me apaño». */
(function(){
 var LS_OFF='vr_guia_off', LS_LANG='vr_guia_lang';
 function g(k){try{return localStorage.getItem(k)}catch(e){return null}}
 function s(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){}}
 var lang=g(LS_LANG)||(g('vr_dictLang')==='ro'?'ro':'es');

 var T={
  es:{que:'¿Qué quieres hacer?',nuevo:'Hacer un presupuesto nuevo',ver:'Ver mis presupuestos',como:'¿Cómo tienes los trabajos?',
      voz:'Lo cuento yo, hablando o escribiendo',pdf:'Tengo un PDF, una foto o una captura de la lista',mano:'Los elijo yo de mi lista de precios',
      atras:'Atrás',solo:'Ya me apaño, quitar la ayuda',lang:'Română',
      p1:'Paso 1 de 4 · Cuenta los trabajos abajo y pulsa «Convertir en trabajos»',
      p1pdf:'Paso 1 de 4 · Elige el PDF o la captura (botón «Elegir archivo», abajo)',
      leyendo:'Leyendo… espera unos segundos y no cierres la app',
      p1mano:'Paso 1 de 4 · Busca cada trabajo en el buscador de abajo y tócalo para añadirlo',
      cero:'Paso 2 de 4 · Hay {n} sin precio: toca el precio y escríbelo',cero1:'Paso 2 de 4 · Hay 1 trabajo sin precio: toca el precio y escríbelo',
      cli:'Paso 3 de 4 · Pon el nombre y el teléfono del cliente',cliBtn:'Ir al cliente',
      datos:'Antes de nada · Pon tu nombre y teléfono (una vez)',datosBtn:'Ponerlos',
      firma:'Paso 4 de 4 · Antes de enviar, deja tu firma para los contratos (una vez)',firmaBtn:'Firmar',
      env:'Paso 4 de 4 · Todo listo: envíaselo al cliente',envBtn:'Enviar al cliente',
      ok:'Enviado. Cuando el cliente firme, te avisamos aquí.',ayuda:'Ayuda',cero_btn:'Ver cuáles',
      q1:'Paso 2 de 4 · A 1 trabajo le falta la cantidad (cuántas puertas, cuántos metros): escríbela',qn:'Paso 2 de 4 · A {n} trabajos les falta la cantidad (cuántas puertas, cuántos metros): escríbela'},
  ro:{que:'Ce vrei să faci?',nuevo:'Fac un deviz nou',ver:'Văd devizele mele',como:'Cum ai lucrările?',
      voz:'Le spun eu, vorbind sau scriind',pdf:'Am un PDF, o poză sau o captură cu lista',mano:'Le aleg eu din lista mea de prețuri',
      atras:'Înapoi',solo:'Mă descurc, scoate ajutorul',lang:'Español',
      p1:'Pasul 1 din 4 · Spune lucrările mai jos și apasă «Convertir en trabajos»',
      p1pdf:'Pasul 1 din 4 · Alege PDF-ul arhitectului (butonul «Elegir archivo», mai jos)',
      leyendo:'Citesc… așteaptă câteva secunde și nu închide aplicația',
      p1mano:'Pasul 1 din 4 · Caută fiecare lucrare în căutare și atinge-o ca să o adaugi',
      cero:'Pasul 2 din 4 · Sunt {n} fără preț: atinge prețul și scrie-l',cero1:'Pasul 2 din 4 · E 1 lucrare fără preț: atinge prețul și scrie-l',
      cli:'Pasul 3 din 4 · Pune numele și telefonul clientului',cliBtn:'La client',
      datos:'Înainte de toate · Pune numele și telefonul tău (o dată)',datosBtn:'Pune-le',
      firma:'Pasul 4 din 4 · Înainte de a trimite, lasă semnătura ta pentru contracte (o dată)',firmaBtn:'Semnează',
      env:'Pasul 4 din 4 · Totul gata: trimite-l clientului',envBtn:'Trimite clientului',
      ok:'Trimis. Când clientul semnează, te anunțăm aici.',ayuda:'Ajutor',cero_btn:'Vezi care',
      q1:'Pasul 2 din 4 · La 1 lucrare lipsește cantitatea (câte uși, câți metri): scrie-o',qn:'Pasul 2 din 4 · La {n} lucrări lipsește cantitatea (câte uși, câți metri): scrie-o'}
 };
 function t(k){return (T[lang]||T.es)[k]||T.es[k]||k}

 /* ---- estilos ---- */
 var css=document.createElement('style');css.textContent=
 '#guiaCapa{position:fixed;inset:0;z-index:9500;background:var(--slate,#111214);color:#fff;display:none;flex-direction:column;padding:max(18px,env(safe-area-inset-top)) 18px 24px;overflow:auto}'+
 '#guiaCapa.on{display:flex}'+
 '#guiaCapa .cab{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6vh}'+
 '#guiaCapa .marca{font-weight:800;letter-spacing:1px;font-size:15px;opacity:.9}'+
 '#guiaCapa .lang{background:transparent;border:1px solid rgba(255,255,255,.35);color:#fff;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer}'+
 '#guiaCapa h1{font-size:30px;line-height:1.1;margin:0 0 22px}'+
 '#guiaCapa .ops{display:flex;flex-direction:column;gap:12px;flex:1}'+
 '#guiaCapa .op{display:flex;align-items:center;gap:14px;background:#fff;color:#141414;border:0;border-radius:14px;padding:18px 16px;font-size:19px;font-weight:700;text-align:left;cursor:pointer;line-height:1.2}'+
 '#guiaCapa .op .ic{font-size:30px;flex:none;width:40px;text-align:center}'+
 '#guiaCapa .op.sec{background:rgba(255,255,255,.12);color:#fff}'+
 '#guiaCapa .pie{display:flex;justify-content:space-between;gap:10px;margin-top:18px}'+
 '#guiaCapa .pie button{background:transparent;border:0;color:rgba(255,255,255,.75);font-size:14px;cursor:pointer;padding:8px 0;text-decoration:underline}'+
 '#guiaBarra{position:sticky;top:0;z-index:45;background:#1a7a3f;color:#fff;padding:12px 14px;display:none;flex-wrap:wrap;align-items:center;gap:8px 10px;font-size:16px;font-weight:700;line-height:1.25;box-shadow:0 2px 8px rgba(0,0,0,.2)}'+
 '#guiaBarra.on{display:flex}#guiaBarra.aviso{background:#C24A00}#guiaBarra.listo{background:#1a7a3f}'+
 '#guiaBarra span{flex:1 1 100%}#guiaBarra button{flex:1;background:#fff;color:#141414;border:0;border-radius:10px;padding:12px 14px;font-weight:800;font-size:16px;cursor:pointer}'+
 '#guiaBarra #guiaBtnAyuda{flex:none;background:transparent;border:1px solid rgba(255,255,255,.5);color:#fff;border-radius:999px;padding:8px 14px;font-size:14px}';
 document.head.appendChild(css);

 /* ---- la capa de preguntas ---- */
 var capa=document.createElement('div');capa.id='guiaCapa';document.body.appendChild(capa);
 var paso='que';
 function marca(){return (window.AJ&&AJ.marca)||(window.EMP&&EMP.nombreApp)||''}
 function nPresus(){try{return Object.keys(DB.presus||{}).length}catch(e){return 0}}
 function nMandados(){try{return Object.values(DB.presus||{}).filter(function(p){return p.firmaTok}).length}catch(e){return 0}}
 function pinta(){
  var h='<div class="cab"><div class="marca">'+marca()+'</div><button class="lang" type="button" id="guiaLang">'+t('lang')+'</button></div>';
  if(paso==='que'){h+='<h1>'+t('que')+'</h1><div class="ops">'+
   '<button class="op" type="button" data-a="nuevo"><span class="ic">📝</span>'+t('nuevo')+'</button>'+
   (nPresus()?'<button class="op sec" type="button" data-a="ver"><span class="ic">📂</span>'+t('ver')+'</button>':'')+'</div>'}
  else{h+='<h1>'+t('como')+'</h1><div class="ops">'+
   '<button class="op" type="button" data-a="voz"><span class="ic">🎙️</span>'+t('voz')+'</button>'+
   '<button class="op" type="button" data-a="pdf"><span class="ic">📄</span>'+t('pdf')+'</button>'+
   '<button class="op sec" type="button" data-a="mano"><span class="ic">📋</span>'+t('mano')+'</button></div>'}
  h+='<div class="pie">'+(paso==='como'?'<button type="button" data-a="atras">← '+t('atras')+'</button>':'<span></span>')+'<button type="button" data-a="solo">'+t('solo')+'</button></div>';
  capa.innerHTML=h;
 }
 capa.addEventListener('click',function(e){var b=e.target.closest('[data-a],#guiaLang');if(!b)return;
  if(b.id==='guiaLang'){lang=lang==='es'?'ro':'es';s(LS_LANG,lang);try{localStorage.setItem('vr_dictLang',lang)}catch(_){}pinta();return}
  var a=b.getAttribute('data-a');
  if(a==='nuevo'){paso='como';pinta();return}
  if(a==='atras'){paso='que';pinta();return}
  if(a==='ver'){cerrar();try{ST('clientes')}catch(_){}return}
  if(a==='solo'){s(LS_OFF,'1');cerrar();barra();return}
  if(a==='pdf'){var fi=document.getElementById('pdfArq');if(fi){try{fi.click()}catch(_){}}}
  if(a==='voz'||a==='pdf'||a==='mano'){cerrar();empezar(a);return}
 });
 function abrir(p){paso=p||'que';pinta();capa.classList.add('on');document.body.style.overflow='hidden'}
 function cerrar(){capa.classList.remove('on');document.body.style.overflow=''}
 window.guiaAbrir=function(){abrir('que')};

 var modo=null;
 function empezar(k){modo=k;
  try{if(window.cur&&(cur.lineas||[]).length){/* ya hay algo empezado: no lo pisamos */}else if(typeof nuevo==='function'&&!(window.cur&&cur.nom))nuevo()}catch(_){}
  try{ST('presupuesto')}catch(_){}
  setTimeout(function(){try{meterPor(k)}catch(_){}
   if(k==='pdf'){var f=document.getElementById('pdfArq');if(f){f.scrollIntoView({behavior:'smooth',block:'center'})}}
   if(k==='voz'){var ta=document.getElementById('dictado');if(ta){ta.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(function(){try{ta.focus()}catch(_){}},400)}}
   barra()},150)}

 /* ---- la barra del siguiente paso ---- */
 var bar=document.createElement('div');bar.id='guiaBarra';
 function colocarBarra(){var p=document.getElementById('page-presupuesto');if(p&&bar.parentNode!==p)p.insertBefore(bar,p.firstChild)}
 function estado(){var ai=document.getElementById('arqInfo');if(ai&&/^(Leyendo|Preparando)/.test(ai.textContent||''))return {c:'listo',m:t('leyendo'),b:null};
  try{if(typeof leer==='function')leer()}catch(_){}
  var L=(window.cur&&cur.lineas)||[];var cero=L.filter(function(l){return !(parseFloat(l.p)>0)}).length;
  if(window.AJ&&(!AJ.nombre||!AJ.tel))return {c:'aviso',m:t('datos'),b:t('datosBtn'),f:'irAAjustes'};
  if(!L.length)return {c:'listo',m:modo==='pdf'?t('p1pdf'):modo==='mano'?t('p1mano'):t('p1'),b:null};
  var sinQ=L.filter(function(l){return !(parseFloat(l.q)>0)}).length;
  if(sinQ)return {c:'aviso',m:(sinQ===1?t('q1'):t('qn').replace('{n}',sinQ)),b:t('cero_btn'),f:'irACero'};
  if(cero)return {c:'aviso',m:cero===1?t('cero1'):t('cero').replace('{n}',cero),b:t('cero_btn'),f:'irACero'};
  if(!(cur.nom&&String(cur.nom).trim())||!(cur.tel&&String(cur.tel).trim()))return {c:'listo',m:t('cli'),b:t('cliBtn'),f:'irACliente'};
  if(cur.firmaTok)return {c:'listo',m:t('ok'),b:null};
  if(window.AJ&&!AJ.firma)return {c:'aviso',m:t('firma'),b:t('firmaBtn'),f:'irAFirma'};
  return {c:'listo',m:t('env'),b:t('envBtn'),f:'enviar'};
 }
 function barra(){if(g(LS_OFF)==='1'||nMandados()>=3){bar.classList.remove('on');return}
  colocarBarra();var e=estado();bar.className='on '+e.c;
  bar.innerHTML='<span>'+e.m+'</span>'+(e.b?'<button type="button" data-f="'+e.f+'">'+e.b+'</button>':'')+'<button id="guiaBtnAyuda" type="button" title="'+t('ayuda')+'">?</button>';
 }
 bar.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
  if(b.id==='guiaBtnAyuda'){abrir('que');return}
  var f=b.getAttribute('data-f');
  if(f==='enviar'){try{menuEnviar()}catch(_){}return}
  if(f==='irACero'){var rows=[].slice.call(document.querySelectorAll('#tb tr')),vale=function(r,c){var x=r.querySelector(c);return x&&parseFloat(String(x.value).replace(',','.'))>0};
   var rq=rows.find(function(r){return !vale(r,'.lq')}),rp=rows.find(function(r){return !vale(r,'.lp')}),r=rq||rp;
   if(!r){var tb=document.getElementById('tb');if(tb)tb.scrollIntoView({behavior:'smooth',block:'center'});return}
   r.scrollIntoView({block:'center'});var inp=r.querySelector(rq?'.lq':'.lp');try{inp.focus({preventScroll:true});inp.select()}catch(_){}return}
  if(f==='irACliente'){var n=document.getElementById('f_nom');if(n){n.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(function(){n.focus()},400)}return}
  try{var L=(typeof problemas==='function')?problemas():[];var x=L.find(function(y){return y.f===f});if(x&&typeof continuar==='function'){continuar();return}}catch(_){}
  if(f==='irAAjustes'||f==='irAFirma'){try{ST('ajustes')}catch(_){}}
 });
 window.guiaBarra=barra;
 /* se repinta cuando cambia algo */
 document.addEventListener('input',function(){clearTimeout(window.__gT);window.__gT=setTimeout(barra,400)},true);
 document.addEventListener('click',function(){clearTimeout(window.__gT2);window.__gT2=setTimeout(barra,500)},true);
 setInterval(barra,4000);

 /* ---- arranque: la primera vez, el asistente; despues, la barra ---- */
 function arranque(){if(g(LS_OFF)==='1'||nMandados()>=3){return}
  if(window.__compartido){barra();return}
  var vacio=true;try{vacio=!(window.cur&&(cur.lineas||[]).length)&&!(window.cur&&cur.nom)}catch(_){}
  if(vacio)abrir('que');else barra()}
 var n=0,iv=setInterval(function(){if(window.DB&&window.AJ&&document.getElementById('page-presupuesto')){clearInterval(iv);setTimeout(arranque,600)}else if(++n>80)clearInterval(iv)},150);
})();
