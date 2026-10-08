/* Buzón: los presupuestos que llegan por correo se hacen solos, sin IA.
   - Un programa pequeño en el Gmail de la empresa (Google Apps Script; se pone una vez desde Ajustes) le pasa a la app
     los correos nuevos: el texto y los adjuntos. No manda ni borra nada.
   - La app mira cada correo. Si es una petición de presupuesto (la lista de trabajos escrita, capturas, fotos o el plano),
     hace el presupuesto con el mismo motor que las capturas: su número, el cliente (de la firma, del formulario o de quien
     lo manda), cada trabajo su partida con precio, y la obra del plano. No toca el presupuesto que esté abierto en pantalla.
   - Avisa arriba, lo deja en «Presupuestos» con la marca «por correo» y en Gmail le pone la etiqueta «Presupuesto hecho».
   - Si los dos móviles tienen la app abierta, cada correo lo coge uno solo (el programa del Gmail lo reparte). */
(function(){
 var LS='vr_buzon',CADA=5*60*1000,MARGEN=864e5;
 function M(){return window.__motor}
 function sa(s){return String(s||'').normalize('NFC').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
 function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
 /* lo que viene de un correo no puede meter código en la pantalla */
 function limpio(s){return String(s==null?'':s).replace(/[<>"`\\]/g,'').replace(/&/g,' y ').replace(/'/g,'’').replace(/[ \t ]+/g,' ').trim()}
 function est(){try{return JSON.parse(localStorage.getItem(LS)||'{}')||{}}catch(e){return {}}}
 function ponEst(f){var e=est();f(e);try{localStorage.setItem(LS,JSON.stringify(e))}catch(_){}return e}
 function disp(){var e=est();if(e.disp)return e.disp;var d=Math.random().toString(36).slice(2,10);ponEst(function(x){x.disp=d});return d}
 function A(){return window.AJ||{}}
 function conectado(){var a=A();return !!(a.correoUrl&&a.correoClave)}
 function cuenta(){try{var u=window.FB&&FB.uid;return u?(String(u).replace(/[^\w-]/g,'').slice(0,40)||'x'):'x'}catch(e){return 'x'}}
 function nn(v){return parseFloat(String(v==null?'':v).replace(',','.'))||0}
 function eu(n){try{return eur(n)}catch(e){return (Math.round(n*100)/100).toFixed(2).replace('.',',')+' €'}}

 /* ---------------- hablar con el programa del Gmail ---------------- */
 function urlDe(base,p){var q=[];Object.keys(p).forEach(function(k){if(p[k]!=null&&p[k]!=='')q.push(k+'='+encodeURIComponent(p[k]))});return base+(base.indexOf('?')<0?'?':'&')+q.join('&')}
 var nJ=0;
 function jsonp(u,ms){return new Promise(function(ok,ko){var cb='__buzon'+(++nJ)+'_'+Math.random().toString(36).slice(2,7),s=document.createElement('script'),fin=false;
  function cierra(){fin=true;clearTimeout(t);window[cb]=function(){};if(s.parentNode)s.parentNode.removeChild(s)}
  var t=setTimeout(function(){if(!fin){cierra();ko(new Error('el correo tarda demasiado en contestar'))}},ms||60000);
  window[cb]=function(r){if(fin)return;cierra();ok(r)};s.onerror=function(){if(!fin){cierra();ko(new Error('el correo no contesta'))}};
  s.src=urlDe(u,{cb:cb});document.head.appendChild(s)})}
 function porFetch(u,ms){var ctl=window.AbortController?new AbortController():null,t=setTimeout(function(){try{if(ctl)ctl.abort()}catch(e){}},ms||60000);
  return fetch(u,{method:'GET',cache:'no-store',redirect:'follow',credentials:'omit',signal:ctl?ctl.signal:undefined}).then(function(r){clearTimeout(t);if(!r.ok)throw new Error('el correo contesta con error '+r.status);return r.text()},function(e){clearTimeout(t);throw e})
   .then(function(tx){try{return JSON.parse(tx)}catch(e){var er=new Error('el correo contesta algo raro');er.rara=true;throw er}})}
 function llamar(p,ms,base,clave){var a=A();base=base||a.correoUrl;clave=clave||a.correoClave;if(!base)return Promise.reject(new Error('sin conectar'));
  var u=urlDe(base,Object.assign({},p,{clave:clave,q:cuenta(),disp:disp()}));
  if(est().jsonp)return jsonp(u,ms);
  return porFetch(u,ms).catch(function(e){if(e&&(e.rara||e.name==='AbortError'))throw e;if(navigator.onLine===false)throw e;
   return jsonp(u,ms).then(function(r){ponEst(function(x){x.jsonp=1});return r})})}
 function bajar(id,x){return llamar({a:'adjunto',id:id,i:x.i},180000).then(function(r){if(!r||!r.ok||!r.b64)return null;
  var bin=atob(r.b64),n=bin.length,u=new Uint8Array(n);for(var i=0;i<n;i++)u[i]=bin.charCodeAt(i);
  var tipo=r.tipo||x.tipo||'',nombre=r.nombre||x.nombre||'adjunto',f;try{f=new File([u],nombre,{type:tipo})}catch(e){f=new Blob([u],{type:tipo});f.name=nombre}return f})}

 /* ---------------- el correo, en texto limpio ---------------- */
 /* el HTML del correo a texto, con las listas como viñetas (así se sabe dónde empieza cada trabajo) */
 function htmlATexto(html){var doc;try{doc=new DOMParser().parseFromString(String(html||''),'text/html')}catch(e){return ''}if(!doc||!doc.body)return '';
  [].slice.call(doc.querySelectorAll('style,script,head,title,meta,link,noscript,template')).forEach(function(n){if(n.parentNode)n.parentNode.removeChild(n)});
  var out=[],linea='';
  function corta(){var l=linea.replace(/[ \t ]+/g,' ').trim();if(l)out.push(l);else if(out.length&&out[out.length-1]!=='')out.push('');linea=''}
  function rec(n){if(n.nodeType===3){linea+=n.nodeValue.replace(/\s+/g,' ');return}if(n.nodeType!==1)return;var t=n.tagName;
   if(t==='BR'){corta();return}if(t==='IMG')return;
   var bl=/^(P|DIV|LI|UL|OL|TR|TABLE|TBODY|H[1-6]|BLOCKQUOTE|PRE|SECTION|ARTICLE|HEADER|FOOTER|DL|DT|DD|HR|CENTER|ADDRESS)$/.test(t);
   if(bl)corta();if(t==='LI')linea+='• ';if(t==='TD'||t==='TH')linea+=' ';
   for(var c=n.firstChild;c;c=c.nextSibling)rec(c);if(bl)corta()}
  rec(doc.body);corta();return out.join('\n').replace(/\n{3,}/g,'\n\n').trim()}
 function persona(s){s=String(s||'').replace(/\*/g,'').trim();var em=(s.match(/[\w.+'-]+@[\w-]+(?:\.[\w-]+)+/)||[''])[0].toLowerCase();
  var nom=s.replace(/<[^>]*>|\[mailto:[^\]]*\]|\([^)]*@[^)]*\)/gi,'').replace(/[\w.+'-]+@[\w-]+(?:\.[\w-]+)+/g,'').replace(/["'<>]/g,'').replace(/\s+/g,' ').trim();
  if(nom&&nom===nom.toUpperCase()&&/[A-Z]/.test(nom))nom=nom.toLowerCase().replace(/(^|[\s\-])\S/g,function(m){return m.toUpperCase()});
  if(/^(info|admin|administracion|contacto|hola|noreply|no-reply|web|formulario)$/i.test(nom))nom='';return {nom:nom,email:em}}
 /* cabecera de un correo reenviado o citado: De / Enviado / Para / Asunto */
 function cabecera(L,i){var d={},k=i;
  for(;k<L.length&&k<i+10;k++){var s=L[k].replace(/\*/g,'').trim();if(!s){if(k>i)break;continue}
   var m=s.match(/^(de|from|enviado|sent|fecha|date|para|to|cc|cco|bcc|asunto|subject|enviado el)\s*:\s*(.*)$/i);if(!m)break;
   var c=sa(m[1]);if(c==='de'||c==='from'){var p=persona(m[2]);d.nom=p.nom;d.email=p.email}else if(c==='asunto'||c==='subject')d.asunto=m[2]}
  while(k<L.length&&!L[k].trim())k++;return {datos:d,fin:k}}
 var CORTE_FIN=/(confidencial|proteccion de datos|\blopd\b|\brgpd\b|aviso legal|antes de imprimir|medio ambiente|este (mensaje|correo|e-?mail)[^.]{0,90}(destinatario|confidencial|exclusiv|privileg))/;
 function limpiar(t,esRe){t=String(t||'');try{t=t.normalize('NFC')}catch(e){}
  t=t.replace(/\r\n?/g,'\n').replace(/ /g,' ').replace(/\t/g,' ').replace(/\[(?:image|imagen|cid)[^\]]*\]/gi,'').replace(/<(?:https?:|mailto:)[^>\s]*>/gi,'');
  var L=t.split('\n'),out=[],reenv=null,corte=-1;
  for(var i=0;i<L.length;i++){var s=L[i].trim(),n=sa(s);
   if(/^-{2,}\s*(forwarded message|mensaje reenviado|mensaje original|original message)\s*-{2,}$/.test(n)||/^(begin forwarded message|inicio del mensaje reenviado|mensaje reenviado)\s*:?$/.test(n)){
    if(esRe&&/original/.test(n))break;var h=cabecera(L,i+1);if(!reenv&&h.datos.email){reenv=h.datos;corte=out.length}i=h.fin-1;continue}
   if(/^_{8,}$/.test(s)&&esRe)break;
   if(/^\**(de|from)\**\s*:/i.test(s)&&/^\**(enviado|sent|fecha|date|para|to)\**\s*:/i.test((L[i+1]||'').trim())){if(esRe)break;var h2=cabecera(L,i);if(!reenv&&h2.datos.email){reenv=h2.datos;corte=out.length}i=h2.fin-1;continue}
   if(/^(el|on)\s.{4,240}(escribio|wrote)\s*:?$/.test(n)||(/^(el|on)\s.{4,200}$/.test(n)&&/^(escribio|wrote)\s*:?$|(escribio|wrote)\s*:\s*$/.test(sa((L[i+1]||'').trim()))&&(L[i+1]||'').trim().length<120))break;
   if(/^>/.test(s))continue;
   if(/^(enviado desde|sent from|obtener outlook|get outlook|descarga outlook)/.test(n)&&s.length<90)continue;
   if(CORTE_FIN.test(n)&&i>3)break;
   out.push(L[i].replace(/\s+$/,''))}
  function j(a){return a.join('\n').replace(/\n{3,}/g,'\n\n').trim()}
  return {texto:j(out),reenv:reenv,nota:corte>=0?j(out.slice(0,corte)):'',original:corte>=0?j(out.slice(corte)):j(out)}}

 /* formulario de una web: Nombre / Teléfono / Email / Dirección / Mensaje */
 var CAMPO={nombre:/^(nombre|nombre y apellidos?|nombre completo|tu nombre|su nombre|name|full name|cliente|contacto|persona de contacto)$/,
  tel:/^(telefono|telefono de contacto|tu telefono|tlf|tlfn|tfno|telf|tel|movil|celular|phone|whatsapp|numero de telefono)$/,
  email:/^(e-?mail|correo|correo electronico|email de contacto|tu email|tu correo|mail)$/,
  dir:/^(direccion|direccion de la obra|domicilio|calle|ubicacion|direccion completa|lugar de la obra|lugar)$/,
  pob:/^(poblacion|localidad|municipio|ciudad|pueblo|codigo postal|cp)$/,
  msg:/^(mensaje|comentarios?|descripcion|descripcion del trabajo|consulta|observaciones|detalles|tu mensaje|que necesitas|trabajos?|trabajos a realizar|servicio|servicios|tipo de (obra|reforma|trabajo|servicio)|cuentanos|cuentanos tu proyecto|proyecto)$/};
 function formulario(t){var o={},act=null,n=0;
  String(t||'').split('\n').forEach(function(l){var m=l.match(/^\s*[*•\-]?\s*\**([A-Za-zÁÉÍÓÚÑÜáéíóúñü¿? ]{2,40}?)\**\s*:\s*(.*)$/);
   if(m){var k=sa(m[1]).replace(/[¿?]/g,'').trim(),hit=null;for(var c in CAMPO)if(CAMPO[c].test(k)){hit=c;break}
    if(hit){act=hit;if(!o[hit])n++;o[hit]=((o[hit]?o[hit]+'\n':'')+m[2].replace(/\*/g,'').trim()).trim();return}}
   if(act==='msg'){if(l.trim())o.msg+='\n'+l.trim()}else act=null});
  o.esForm=!!((o.nombre||o.msg)&&(o.tel||o.email)&&((o.nombre?1:0)+(o.tel?1:0)+(o.email?1:0)+(o.msg?1:0))>=2);return o}

 /* ---------------- el texto del correo -> trabajos ---------------- */
 var SALAS='cocina|bano|banos|aseo|aseos|salon comedor|salon|comedor|sala de estar|sala|pasillos?|hall|entrada|recibidor|dormitorio principal|dormitorios?|habitacion principal|habitacion|habitaciones|cuartos?|terraza|balcon|despensa|trastero|lavadero|tendedero|txoko|garaje|lonja|local|fachada|tejado|cubierta|portal|escalera|zonas comunes|planta baja|primera planta|segunda planta|bajo cubierta|camarote|buhardilla|jardin|patio|vivienda|piso|casa';
 var RE_CAB=new RegExp('^(?:(?:en|el|la|los|las|del|de la|zona de|zona)\\s+)?(?:'+SALAS+')(?:\\s+(?:\\d{1,2}|[1-3][ºª]?|principal|grande|pequen[oa]|de arriba|de abajo|del fondo|de invitados|de matrimonio|de los nin[oa]s|uno|dos|tres))?\\s*[:.\\-]?$');
 var RE_INL=new RegExp('^((?:'+SALAS+')(?:\\s+(?:\\d{1,2}|principal|grande|pequen[oa]))?)\\s*[:\\-–]\\s+(.{3,})$','i');
 var RE_HAY_SALA=new RegExp('\\b(?:'+SALAS+'|dorm)\\b');
 var RE_SALA1=new RegExp('\\b('+SALAS+')\\b');
 var VERBOS='quitar|retirar|poner|colocar|cambiar|sustituir|pintar|alicatar|solar|embaldosar|picar|tirar|derribar|demoler|levantar|hacer|montar|desmontar|instalar|arreglar|reparar|lucir|enlucir|tapar|proteger|vaciar|limpiar|lijar|barnizar|empapelar|abrir|cerrar|forrar|aislar|impermeabilizar|sanear|nivelar|alisar|rozar|mover|trasladar|ampliar|renovar|reformar|soltar|volver|llevar|cambio|colocacion|sustitucion|pintura|pintado|instalacion|reparacion|retirada|demolicion|derribo|montaje|desmontaje|alicatado|solado|lucido|picado|suministro|arreglo|proteccion|limpieza|vaciado|traslado|empapelado';
 var RE_VINI=new RegExp('^(?:'+VERBOS+')\\b');
 var TRAB=/(pint|alicat|azulej|baldos|solad|suelo|tarima|parquet|laminad|vinilic|tabique|pladur|trasdos|escayol|moldur|rodapi|puerta|ventana|persian|bano|banera|ducha|plato|inodoro|lavabo|bide|mampara|sanitari|grifo|griferi|cocina|encimera|fregadero|campana|fontaner|tuberi|desag|bajante|electric|enchuf|interruptor|punto de luz|puntos de luz|cuadro electric|cablea|radiador|calefac|caldera|termo|aire acondic|tejad|cubierta|teja|canalon|fachada|humedad|goter|impermeab|aislam|demol|derrib|picad|picar|quitar|retir|desmont|lucid|enluc|lucir|yeso|gotel|alisad|papel|empapel|armario|carpinter|vaciad|vaciar|proteg|tapar|tapad|limpi|escombr|contenedor|garbigune|punto limpio|mudanza|mueble|mobiliario|almacen|traslad|cristal|barandill|reja|muro|pared|techo|forjado|viga|solera|hormig|mortero|zanja|arqueta|terraza|balcon|escalera|portal|ascensor|trastero|lonja|reforma|renov|instal|coloc|sustitu|cambi|repar|arregl|montaj|nivel|recrec|roza|ampli|soltar|lijar|barniz|tratamiento|sellad|junta|silicon|cerramiento|toldo|chimenea|frente|friso)/;
 var CONV=/^(hola|buen[oa]s|buenos dias|estimad|querid|(?:te|os|le|les)\s+(?:adjunt|pas|envi|mand|reenvi|dej|hag|comento|cuento)|reenvio|te mando|os mando|le mando|adjunt|en adjunto|como (hablamos|quedamos|te coment|os coment|le coment)|segun (hablamos|lo hablado|quedamos)|gracias|muchas gracias|un saludo|saludos|quedo|quedamos|espero|cualquier (duda|cosa)|llam|cuando (puedas|podais|pueda)|perdona|disculpa|un abrazo|atentamente|enviado desde|sent from|creo que no me dejo|en el presupuesto si quieres|si quieres poner|me pongo en contacto|os escribo|te escribo|le escribo|nos pondremos|cuando lo tengas|lo antes posible|para cuando|podriais venir|podrias venir|podeis venir|pasar a ver|venir a ver|ver la obra)/;
 var CIERRE=/^(un saludo|saludos|un abrazo|abrazos|gracias|muchas gracias|mil gracias|atentamente|cordialmente|un cordial saludo|reciba un cordial|recibe un cordial|quedo a la espera|quedamos a la espera|espero (tu|vuestra|su|noticias|respuesta)|creo que no me dejo|en el presupuesto si quieres|enviado desde|sent from)/;
 var HECHO=/^(el piso|la casa|la vivienda|la obra|el local|la lonja|el caserio|es un|es una|esta en|vivo en|mi direccion|la direccion|el telefono|mi telefono|mi movil)\b/;
 var HECHO2=/^(el|la|los|las|mi|nuestro|nuestra|son|es)\s+(?:\S+\s+){0,3}(tiene|tienen|mide|miden|ocupa|ocupan|es de|son de|son unos|son unas|hay)\b/;
 function esTrabajo(t){var s=sa(t).trim();if(s.length<4||s.length>600)return false;
  if(/sin ascensor|no (tiene|hay) ascensor/.test(s)&&!/(tapar|proteg|montacarg|subir|bajar)/.test(s))return false;
  if(HECHO.test(s)&&!RE_VINI.test(s.replace(HECHO,'').trim()))return false;
  if(HECHO2.test(s)&&!RE_VINI.test(s))return false;
  var medida=/\d+(?:[.,]\d+)?\s*(m2|m²|ml|m\b|uds?\b|unidades|rollos?)/.test(s);
  if(CONV.test(s)&&!medida)return false;
  return TRAB.test(s)}
 function quitarSaludo(t){return t.replace(/^\s*(?:hola|buen[oa]s(?:\s+(?:d[ií]as|tardes|noches))?|estimad[oa]s?|querid[oa]s?)\b[^.!?:\n]{0,40}?[.!?:,]\s*/i,'')}
 /* "Quería pedir presupuesto para quitar la bañera..." -> "quitar la bañera..." */
 var RE_PIDE=/(?:^|\s)(?:quer[ií]a(?:mos)?|quisiera(?:mos)?|necesit\w*|me\s+gustar[ií]a|nos\s+gustar[ií]a|pod[eé]is|podr[ií]ais|podr[ií]as|podr[ií]a|puedes|pueden|me\s+pasas|me\s+mandas|solicit\w*|pedir(?:os|te|le)?|os\s+pido|te\s+pido|le\s+pido|ser[ií]a\s+para|es\s+para)\b[^.:\n]{0,60}?\b(?:presupuestos?|precio|valoraci[oó]n|cotizaci[oó]n)\b\s*(?:para|de|del|por|sobre)?\s*(?:(?:los|unos)\s+(?:siguientes\s+)?trabajos|lo\s+siguiente|unas?\s+obras?|una\s+reforma)?\s*(?:[:,]|\s+(?:de|en|que\s+consiste\s+en))?\s*/i;
 function quitarPeticion(f){var m=f.match(RE_PIDE);if(m&&m.index<70)f=f.slice(m.index+m[0].length);
  return f.replace(/^\s*(?:habr[ií]a\s+que|hay\s+que|tendr[ií]a(?:mos)?\s+que|tenemos\s+que|tengo\s+que|la\s+idea\s+es|queremos|quiero|quer[ií]a(?:mos)?|necesit(?:o|amos|ar[ií]a(?:mos)?))\s+/i,'').replace(/^\s*(?:presupuestos?|precio)\s+(?:para|de|del)\s+/i,'').replace(/^\s*(?:tambi[eé]n|adem[aá]s|y|luego|despu[eé]s|por otro lado|otra cosa)\s*,?\s+/i,'').replace(/^\s*(?:me|nos|os)\s+(?:gustar[ií]a|interesa(?:r[ií]a)?)\s+/i,'').replace(/[\s,.;:!]+$/,'').trim()}
 var RE_PARTE=new RegExp('\\s*(?:,|;|\\s+y\\s+|\\s+e\\s+|\\s+tambi[eé]n\\s+|\\s+adem[aá]s\\s+)\\s*(?=(?:'+VERBOS.replace(/colocacion/,'colocaci[oó]n').replace(/sustitucion/,'sustituci[oó]n').replace(/instalacion/,'instalaci[oó]n').replace(/reparacion/,'reparaci[oó]n').replace(/demolicion/,'demolici[oó]n').replace(/proteccion/,'protecci[oó]n')+')\\b)','i');
 var OBJS='inodoros?|lavabos?|bid[eé]s?|ba[nñ]eras?|platos? de ducha|mamparas?|grifos?|grifer[ií]as?|puertas?|ventanas?|radiadores|radiador|termo|caldera|encimera|fregadero|campana|armarios?|persianas?|enchufes|interruptores';
 var RE_DOS=new RegExp('^(\\S+\\s+)((?:el|la|los|las|un|una|unos|unas)\\s+)?('+OBJS+')\\s+y\\s+((?:el|la|los|las|un|una|unos|unas)\\s+)?('+OBJS+')\\b(.*)$','i');
 function partir(f){var tr=f.split(RE_PARTE),out=[];
  for(var i=0;i<tr.length;i++){var t=(tr[i]||'').trim();if(!t)continue;if(t.split(/\s+/).length<=1&&i+1<tr.length){tr[i+1]=t+' y '+tr[i+1];continue}
   var d=t.match(RE_DOS);if(d&&RE_VINI.test(sa(d[1]).trim())){out.push(d[1]+(d[2]||'')+d[3]+d[6]);out.push(d[1]+(d[4]||'')+d[5]+d[6]);continue}
   out.push(t)}return out}
 /* una frase que solo dice dónde («la cocina de mi casa», «reformar el baño de mi piso») da la estancia a las siguientes y no es un trabajo */
 var RE_INTENCION=/^(reformar|reforma|reforma integral|renovar|renovacion|modernizar|rehacer|arreglar|hacer|actualizar|lavado de cara)\b/;
 var RE_CONCRETO=/banera|ducha|inodoro|lavabo|bide|mampara|alicat|azulej|pint|suelo|tarima|parquet|puerta|ventana|tabique|encimera|mueble|fontaner|electric|enchuf|techo|pared|gotel|radiador|caldera|persian/;
 function bonito(k){return {bano:'baño',banos:'baños',salon:'salón','salon comedor':'salón comedor',habitacion:'habitación','habitacion principal':'habitación principal',balcon:'balcón',jardin:'jardín'}[k]||k}
 function salaSola(c){var s=sa(c).trim();if(/\d/.test(s)||s.split(/\s+/).length>12)return '';var m=s.match(RE_SALA1);if(!m)return '';
  if(RE_VINI.test(s)&&!RE_INTENCION.test(s))return '';if(RE_INTENCION.test(s)&&RE_CONCRETO.test(s.replace(m[1],'')))return '';return bonito(m[1])}
 function frases(txt){var out=[],sala='';txt=quitarSaludo(txt);
  txt.replace(/([.!?;])\s+(?=[A-ZÁÉÍÓÚÑ¿¡0-9])/g,'$1\n').split('\n').forEach(function(f){f=quitarPeticion(f.trim());if(!f)return;
   var dp=f.match(/^([^:]{2,80}):\s*(.{3,})$/);if(dp&&TRAB.test(sa(dp[2]))&&!/\d\s*$/.test(dp[1])){var cab=dp[1].trim(),ms=sa(cab).match(RE_SALA1);f=dp[2];if(ms)sala=bonito(ms[1])}
   partir(f).forEach(function(c){c=quitarPeticion(c);if(!c)return;var ss=salaSola(c);if(ss){sala=ss;return}out.push(conSala(c,sala))})});
  return out}
 var ART={cocina:'la',sala:'la','sala de estar':'la',entrada:'la',terraza:'la',despensa:'la',habitacion:'la','habitacion principal':'la',fachada:'la',cubierta:'la',escalera:'la',vivienda:'la',casa:'la',lonja:'la','planta baja':'la','primera planta':'la','segunda planta':'la',buhardilla:'la',banos:'los',aseos:'los',pasillos:'los',dormitorios:'los',cuartos:'los',habitaciones:'las','zonas comunes':'las'};
 function deSala(s){s=String(s||'').replace(/[:.\-–]+\s*$/,'').trim();var t=s.toLowerCase(),k=sa(t).replace(/\s+(\d{1,2}|[1-3][ºª]?|principal|grande|pequen[oa]|de arriba|de abajo|del fondo|de invitados|de matrimonio|de los nin[oa]s|uno|dos|tres)$/,'').replace(/^(en|el|la|los|las|del|de la|zona de|zona)\s+/,'');
  t=t.replace(/^(en|el|la|los|las|del|de la|zona de|zona)\s+/,'');var a=ART[k]||(ART[k.split(' ')[0]])||'el';return a==='el'?'del '+t:'de '+a+' '+t}
 function conSala(it,sala){if(!sala||RE_HAY_SALA.test(sa(it)))return it;var ss=sa(sala);
  if(/bano|aseo/.test(ss)&&/banera|ducha|inodoro|lavabo|bide|mampara|sanitari/.test(sa(it)))return it;
  if(/cocina/.test(ss)&&/encimera|fregadero|campana|vitro|horno|muebles de cocina|mobiliario de cocina/.test(sa(it)))return it;var m=it.match(/\s\d+(?:[.,]\d+)?\s*(?:m2|m²|ml|m\b|metros|uds?\b|unidades|rollos?)/i);
  if(m&&m.index>3)return it.slice(0,m.index).replace(/[\s,]+$/,'')+' '+deSala(sala)+it.slice(m.index);return it.replace(/[\s.,;]+$/,'')+' '+deSala(sala)}
 function medidaLimpia(t){return t.replace(/\(\s*(?:de\s+)?(?:unos|unas|aprox\.?|aproximadamente|alrededor de|sobre|m[aá]s o menos)?\s*(\d+(?:[.,]\d+)?\s*(?:m2|m²|ml|m|metros(?:\s+cuadrados|\s+lineales)?|uds?|unidades|rollos?))\s*\)/gi,' $1').replace(/\b(?:unos|unas|aprox\.?|aproximadamente|alrededor de|m[aá]s o menos)\s+(?=\d)/gi,'').replace(/\s{2,}/g,' ').trim()}
 function esCab(l){var s=sa(l).replace(/\s*[\-–\/]\s*/g,' ').trim();return s.split(/\s+/).length<=5&&RE_CAB.test(s)}
 function listaSinVinetas(P){if(P.length<2)return false;var largos=P.filter(function(l){return l.length>130}).length;if(largos)return false;
  var ok=P.slice(1).filter(function(l){return /^[A-ZÁÉÍÓÚÑ0-9¿¡]/.test(l)||RE_VINI.test(sa(l))}).length;return ok/(P.length-1)>=0.7}
 function trabajosDe(texto){
  var L=String(texto||'').split('\n').map(function(l){return l.replace(/\s+$/,'')}),fin=L.length;
  for(var i=0;i<L.length;i++){var s=L[i].trim();if(/^--\s*$/.test(s)||(s.length<80&&CIERRE.test(sa(s)))){fin=i;break}}
  var firma=L.slice(fin).map(function(l){return l.trim()}).filter(Boolean);L=L.slice(0,fin);
  L=L.map(function(l){return medidaLimpia(l).replace(/^\s*(?:\d{1,2}|[a-hA-H])\s*[.)]\s+(?=\S)/,'• ').replace(/^\s*\d{1,2}\s*[\-–]\s+(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])/,'• ').replace(/^\s*[*·•●▪◦‣\-–—]\s*(?=\S)/,'• ')});
  var pars=[],act=[];L.forEach(function(l){if(!l.trim()){if(act.length)pars.push(act);act=[]}else act.push(l.trim())});if(act.length)pars.push(act);
  var items=[],sala='',lista=false,prosa=false;
  function mete(t,sl){t=t.trim();if(!t)return;var m=t.match(RE_INL);if(m&&RE_CAB.test(sa(m[1]))){sl=m[1];t=m[2]}items.push(conSala(t,sl))}
  pars.forEach(function(P){
   var nv=P.filter(function(l){return /^• /.test(l)}).length;
   if(nv){lista=true;var it=null;
    P.forEach(function(l){if(/^• /.test(l)){if(it!==null)mete(it,sala);it=l.slice(2)}
     else if(esCab(l)){if(it!==null){mete(it,sala);it=null}sala=l}
     else if(it!==null)it+=' '+l;
     else frases(l).forEach(function(f){mete(f,sala)})});
    if(it!==null)mete(it,sala);return}
   if(P.length===1&&esCab(P[0])){sala=P[0];return}
   if(listaSinVinetas(P)){lista=true;P.forEach(function(l){if(esCab(l))sala=l;else mete(l,sala)});return}
   var t0=P.join(' ');var mi=t0.match(RE_INL);if(mi&&RE_CAB.test(sa(mi[1]))){sala=mi[1];t0=mi[2]}
   prosa=true;frases(t0).forEach(function(f){mete(f,sala)})});
  items=items.map(function(t){return limpio(medidaLimpia(t.replace(/^[•\s]+/,'')))}).filter(esTrabajo);
  var todo=sa(L.join(' '));
  return {items:items,lista:lista,prosa:prosa,firma:firma,cuerpo:L.join('\n').trim(),asc:/sin ascensor|no (tiene|hay) ascensor|no tienen ascensor|sin elevador/.test(todo)}}

 /* dónde es la obra, si el correo lo dice */
 var PUEBLOS='Abadiño|Abanto|Ajangiz|Alonsotegi|Amorebieta|Amoroto|Arakaldo|Arantzazu|Areatza|Arrankudiaga|Arratzu|Arrieta|Arrigorriaga|Artea|Artzentales|Atxondo|Aulesti|Bakio|Balmaseda|Barakaldo|Barrika|Basauri|Bedia|Berango|Bermeo|Berriatua|Berriz|Bilbao|Bilbo|Busturia|Derio|Dima|Durango|Ea|Elantxobe|Elorrio|Erandio|Ereño|Ermua|Errigoiti|Etxebarri|Etxebarria|Forua|Fruiz|Galdakao|Galdácano|Galdames|Gamiz|Garai|Gatika|Gautegiz|Gernika|Guernica|Getxo|Algorta|Las Arenas|Areeta|Neguri|Gizaburuaga|Gordexola|Gorliz|Güeñes|Ibarrangelu|Igorre|Ispaster|Iurreta|Izurtza|Karrantza|Kortezubi|Lanestosa|Larrabetzu|Laukiz|Leioa|Lejona|Lekeitio|Lemoa|Lemoiz|Lezama|Loiu|Mallabia|Mañaria|Markina|Maruri|Mendata|Mendexa|Meñaka|Morga|Mundaka|Mungia|Munguía|Munitibar|Murueta|Muskiz|Muxika|Nabarniz|Ondarroa|Orozko|Ortuella|Otxandio|Plentzia|Portugalete|Santurtzi|Santurce|Sestao|Sondika|Sopela|Sopelana|Sopuerta|Sukarrieta|Trucios|Turtzioz|Ubide|Ugao|Urduliz|Urduña|Orduña|Trapagaran|Zaldibar|Zalla|Zamudio|Zaratamo|Zeanuri|Zeberio|Zierbena|Bolibar|Santutxu|Deusto|Begoña|Txurdinaga|Otxarkoaga|Rekalde|Indautxu|Abando|Zorrotza|Errekalde|Basurto|Uribarri|Zurbaran|Gasteiz|Vitoria|Donostia|Eibar|Elgoibar|Zarautz|Laredo|Castro Urdiales|Castro';
 var RE_PUEBLO=new RegExp('\\b(?:en|de|obra|piso|casa|vivienda|caser[ií]o|local|lonja|reforma)\\s+(?:en\\s+)?('+PUEBLOS+')\\b');
 var RE_CALLE=/\b((?:c\/|calle|avda\.?|avenida|plaza|pza\.?|paseo|p[ºo]\s|barrio|b[ºo]\s|camino|carretera|ctra\.?|urbanizaci[oó]n|urb\.?)\s*[A-ZÁÉÍÓÚÑ0-9][^\n,;:()]{2,40}?(?:,?\s*(?:n[ºo°]\.?\s*)?\d{1,4}(?:\s*[-,]?\s*\d{1,2}[ºª]?\s*[A-Za-z]?)?)?)(?=[\s,.;)]|$)/i;
 function direccionDe(texto,asunto){var t=String(texto||''),d='',m=t.match(RE_CALLE);if(m)d=m[1].replace(/\s+/g,' ').trim();
  var p=(t.match(RE_PUEBLO)||String(asunto||'').match(new RegExp('\\b('+PUEBLOS+')\\b'))||[])[1]||'';
  if(d&&p&&sa(d).indexOf(sa(p))<0)d+=', '+p;else if(!d)d=p;return limpio(d).slice(0,90)}
 function telDe(t){var m=String(t||'').match(/(?:\+?34[\s.\-]?)?\b([6-9]\d{2})[\s.\-]?(\d{2,3})[\s.\-]?(\d{2,3})[\s.\-]?(\d{0,3})\b/);if(!m)return '';var n=(m[1]+m[2]+m[3]+m[4]);return n.length===9?n.replace(/(\d{3})(\d{3})(\d{3})/,'$1 $2 $3'):''}
 function huella(s){var h=5381;s=String(s);for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)}

 /* ---------------- un correo: ¿es una petición de presupuesto? ---------------- */
 var FUERTE=/presupuest|reforma|\bobras?\b|partidas|mediciones|valoracion|cotizacion/;
 var PIDE=/\b(un|vuestro|tu|su)\s+presupuesto\b|\bpresupuesto\s+(para|de\s+(la|el|un|una|mi|nuestra|nuestro|los|las)|sin compromiso|aproximado)\b|\bcuanto\s+(costaria|cuesta|me cobrar|nos cobrar|sale|saldria)|\b(precio|valoracion|cotizacion)\s+(para|de)\s+(reformar|pintar|cambiar|hacer|poner|quitar|alicatar|la|el|un|una)\b/;
 var PIDE2=/(pedir|pido|pedimos|solicit|quer(ia|iamos|emos)|quisiera|necesit|gustar|podeis|podriais|podrias|podria|puedes|pueden|me (pasas|mandas|das|haces|hagas)|hacer(me|nos)|mandar(me|nos)|enviar(me|nos)|pasar(me|nos)|dar(me|nos)|interesa)/;
 var WEB=/no-?reply|noreply|donotreply|wordpress|formulario|form@|forms?\.|^web@|^webmaster@|notificaci|mailer|bounce|postmaster|newsletter|boletin|marketing|notification|alertas?@|avisos?@|auto-?confirm|confirmacion@|^pedidos?@|^orders?@|^envios?@|shipping|^facturas?@|facturacion@|billing|invoice|receipts?@|^recibos?@|^soporte@|^support@|^promo|^ofertas?@|^news@/;
 function esImgUtil(x){var t=sa(x.tipo),n=sa(x.nombre);if(!/^image\/(jpe?g|png|webp|heic|heif)/.test(t)&&!/\.(jpe?g|png|webp|heic)$/.test(n))return false;
  if((x.tam||0)<20000)return false;if(/^(logo|firma|signature|facebook|twitter|instagram|linkedin|whatsapp|youtube|icon|banner|outlook)/.test(n))return false;return true}
 function esPdf(x){return /pdf/.test(sa(x.tipo))||/\.pdf$/.test(sa(x.nombre))}
 function analizar(c){
  var asunto=String(c.asunto||''),esRe=/^\s*(re|aw|sv|antw)\s*:/i.test(asunto);
  /* si el correo es solo texto, Gmail lo da sin etiquetas: entonces vale el texto tal cual (con sus saltos de línea) */
  var esHtml=/<(html|body|div|p|br|li|ul|ol|table|tr|td|span|a|b|strong|font|h[1-6])\b/i.test(String(c.html||''));
  var t0=esHtml?htmlATexto(c.html):'';if(t0.replace(/\s/g,'').length<20)t0=String(c.texto||'');
  var Lp=limpiar(t0,esRe),de=persona(c.de),rt=persona(c.responder);
  var F=formulario(Lp.original);
  var T=trabajosDe(F.esForm&&F.msg?F.msg:Lp.original);
  if(Lp.nota){var Tn=trabajosDe(Lp.nota);T.items=Tn.items.concat(T.items);T.lista=T.lista||Tn.lista;T.prosa=T.prosa||Tn.prosa;T.asc=T.asc||Tn.asc;if(!T.firma.length)T.firma=Tn.firma}
  var todo=sa(asunto+'\n'+Lp.texto);
  var adj=c.adjuntos||[],imgs=adj.filter(esImgUtil),pdfs=adj.filter(esPdf);
  var web=WEB.test(de.email),fuerte=FUERTE.test(todo),pide=PIDE.test(todo)&&PIDE2.test(todo);
  var mio=sa(A().correoCuenta||''),propio=!!(mio&&de.email===mio);
  var candidato=!c.boletin&&!propio&&(fuerte||F.esForm||T.items.length>=2||pdfs.length>0||(imgs.length>0&&!web));
  return {asunto:asunto,esRe:esRe,cuerpo:Lp.texto,reenv:Lp.reenv,de:de,rt:rt,F:F,T:T,imgs:imgs,pdfs:pdfs,web:web,fuerte:fuerte,pide:pide||F.esForm,candidato:candidato,
   quien:limpio((F.esForm&&F.nombre)||(Lp.reenv&&Lp.reenv.nom)||de.nom||de.email||'un cliente')}}

 /* el cliente: del formulario, del correo reenviado, de la firma, o de quien lo manda */
 function clienteDe(c,a,firmaOcr,P){var mm=M(),F=a.F.esForm?a.F:{},base=(a.reenv&&a.reenv.email)?a.reenv:a.de;
  var mio=sa(A().correoCuenta||'');if(mio&&base.email===mio)base={nom:'',email:''};
  var cf={},co={};try{cf=mm.clienteDe(a.T.firma)||{}}catch(e){}try{co=mm.clienteDe(firmaOcr||[])||{}}catch(e){}
  function nf(x){return x.nombre?x.nombre+(x.empresa?' ('+x.empresa+')':''):''}
  /* el nombre: el del formulario, el de la firma del correo, el de quien lo manda, y si no, el de la firma de la captura */
  var nom=F.nombre||nf(cf)||(base.nom&&!a.web?base.nom:'')||nf(co)||cf.empresa||co.empresa||'';
  if(!nom&&base.email&&!a.web)nom=base.email.split('@')[0].replace(/[._\-]+/g,' ').replace(/\d+/g,'').trim().replace(/(^|\s)\S/g,function(m){return m.toUpperCase()});
  var deCo=!F.nombre&&!nf(cf)&&!(base.nom&&!a.web);if(!deCo)co={};
  var email=(F.email&&(F.email.match(/[\w.+'-]+@[\w-]+(?:\.[\w-]+)+/)||[''])[0])||(a.web?(a.rt.email&&!WEB.test(a.rt.email)?a.rt.email:''):base.email)||cf.email||co.email||'';
  var tel=telDe(F.tel)||cf.tel||cf.fijo||telDe(a.cuerpo.split('\n').slice(0,60).join('\n'))||co.tel||co.fijo||'';
  var dir=limpio([F.dir,F.pob].filter(Boolean).join(', '));if(!dir&&P&&P.sitio)dir=limpio(P.sitio);if(!dir)dir=direccionDe(a.cuerpo.split(/\n--\s*\n|\n(?:un saludo|saludos|gracias)/i)[0],a.asunto);
  return {nom:limpio(nom).slice(0,80),email:limpio(email).toLowerCase().slice(0,80),tel:limpio(tel).slice(0,20),dir:dir,dirDePlano:!!(P&&P.sitio&&dir===limpio(P.sitio))}}

 function libreDesde(n){while(DB.presus[n])n=String(Math.floor(nn(n))+1);return n}
 function numeroLibre(){var n;try{n=siguienteNum()}catch(e){n='1'}
  try{if(window.cur&&cur.num&&!DB.presus[cur.num]&&nn(cur.num)>=nn(n))n=String(Math.floor(nn(cur.num))+1)}catch(_){}
  return libreDesde(n)}
 function idNuevo(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
 /* el presupuesto se crea en la nube solo si ese número no lo tiene ya otro (el otro móvil puede haber hecho uno a la vez) */
 function reservar(p){var n=numeroLibre(),veces=0;
  if(!(window.FB&&FB.db&&FB.uid&&FB.db.runTransaction)||navigator.onLine===false){p.num=n;return Promise.resolve(n)}
  function prueba(n){p.num=n;var r=FB.db.collection('clientes').doc(FB.uid).collection('presupuestos').doc(n);
   return FB.db.runTransaction(function(t){return t.get(r).then(function(d){if(d.exists){var e=new Error('ocupado');e.ocupado=true;throw e}t.set(r,JSON.parse(JSON.stringify(p)))})})
    .then(function(){return n},function(e){if(e&&e.ocupado){if(++veces<30)return prueba(libreDesde(String(Math.floor(nn(n))+1)));throw e}p.num=n;return n})}
  return prueba(n)}
 function repetido(h){var hace=Date.now()-30*864e5;return Object.keys(DB.presus||{}).some(function(k){var p=DB.presus[k];return p&&p.correo&&p.correo.huella===h&&(p.ts||0)>hace})}
 function esArquitecto(ls){var t=ls.filter(function(l){return /^Total\s+\S+\s*:\s*[\d.,]/.test(l)}).length,p=ls.filter(function(l){return /^\d+(?:\.\d+)+\s+(m2|m²|m3|ml|m|ud|u|kg|pa)\b/i.test(l)}).length;return t>=3||p>=4}

 /* con lo leído del correo y de los adjuntos, el presupuesto */
 function montar(c,a,textos,P,arq,nCap,nPdf){var mm=M();
  var partes=textos.map(function(t){return mm.aItems(t)});
  var deAdj=[].concat.apply([],partes.map(function(p){return p.items})).map(limpio).filter(esTrabajo);
  var firmaOcr=[].concat.apply([],partes.map(function(p){return p.firma}));
  var items=mm.unirItems([a.T.items,deAdj]).filter(function(t){return t&&t.length>=4}).slice(0,80);
  if(P){P.sitio=limpio(P.sitio);P.plano=limpio(P.plano);P.escala=limpio(P.escala)}
  var cli=clienteDe(c,a,firmaOcr,P);
  var R=items.length?mm.lineas(items):{lineas:[],n:{tuyo:0,tarifa:0,cype:0,mercado:0,cero:0},notas:[],faltan:[],aj:[],ext:[]};
  var propias=R.lineas.length-R.ext.length,lista=a.T.lista||deAdj.length>=2;
  var crear=a.esRe?(propias>=2&&(a.fuerte||lista)):(propias>=1&&(a.fuerte||lista||propias>=3||a.F.esForm));
  var sinP=false;
  if(!crear&&!a.esRe&&a.pide&&(!a.web||a.F.esForm)){crear=true;sinP=true}
  if(!crear&&arq.length&&!a.web)crear=true;
  if(!crear)return Promise.resolve({n:''});
  var h=huella((cli.email||a.de.email)+'|'+R.lineas.map(function(l){return sa(l.d).slice(0,30)}).sort().join('|')+'|'+(sinP?sa(a.cuerpo).slice(0,200):''));
  if(repetido(h))return Promise.resolve({n:'',repe:true});
  var lineas=R.lineas.map(function(l){var o={d:limpio(l.d),q:l.q,u:l.u,p:l.p};if(l.orig)o.orig=limpio(l.orig).slice(0,300);if(l.src)o.src=l.src;if(l.p0)o.p0=l.p0;if(l.cap)o.cap=l.cap;return o});
  if(a.T.asc){try{var tm=tarifa().find(function(x){return x.id==='mon'});if(tm&&!lineas.some(function(l){return /montacargas/i.test(l.d)}))lineas.push({d:tm.d,q:1,u:tm.u,p:tm.p})}catch(_){}}
  var de=['del correo'];if(nCap)de.push(nCap===1?'de la captura':'de las '+nCap+' capturas');if(nPdf)de.push(P&&(P.sitio||P.plano)?'del plano':'del PDF');
  var deTxt=de.length>1?de.slice(0,-1).join(', ')+' y '+de[de.length-1]:de[0];
  var puesto=[cli.nom?'nombre':'',cli.tel?'teléfono':'',cli.email?'correo':''].filter(Boolean);
  if(sinP&&arq.length)sinP=false;
  var aviso=(!R.lineas.length&&arq.length)?(puesto.length?'Cliente: '+(puesto.length>1?puesto.slice(0,-1).join(', ')+' y '+puesto[puesto.length-1]:puesto[0])+' sacados del correo. ':''):sinP?'<b>Pide presupuesto, pero no he sacado los trabajos del correo.</b> Léelo abajo y cuéntamelo con tus palabras, o mételos a mano. ':
   mm.resumen(R,items,{leido:deTxt,puesto:puesto.length?'Cliente: '+(puesto.length>1?puesto.slice(0,-1).join(', ')+' y '+puesto[puesto.length-1]:puesto[0])+' sacados del correo. ':'',plano:mm.textoPlano(P,cli.dirDePlano),sinDir:!cli.dir});
  if(arq.length)aviso+=(aviso?'<br>':'')+'<b>Trae el PDF del arquitecto</b> ('+arq.map(function(x){return esc(limpio(x.nombre))}).join(', ')+'): tócalo abajo y lo leo como siempre. ';
  if(a.T.asc)aviso+='Dice que no hay ascensor: lo he marcado y he puesto el montacargas. ';
  var hoy=new Date().toISOString().slice(0,10);
  var p={num:'',idp:idNuevo(),fecha:hoy,creado:Date.now(),desde:(window.dispTxt?dispTxt():''),nom:cli.nom||('Correo del '+new Date(c.fecha||Date.now()).toLocaleDateString('es-ES')),tel:cli.tel,email:cli.email,dir:cli.dir,asc:a.T.asc?'1':'0',iva:'21',obs:'',suelo:false,
   lineas:lineas,estado:'borrador',c:{p1:30,p2:60,p3:10,plazo:'',inicio:'',gar:24},ts:Date.now(),nuevoCorreo:true,
   correo:{id:String(c.id||''),de:limpio(c.de).slice(0,160),asunto:limpio(c.asunto).slice(0,160),fecha:c.fecha||Date.now(),texto:String(a.cuerpo||'').slice(0,8000),
    adjuntos:(c.adjuntos||[]).filter(function(x){return esImgUtil(x)||esPdf(x)}).map(function(x){return limpio(x.nombre).slice(0,80)}).slice(0,12),
    aviso:aviso,huella:h,sinPartidas:sinP,arq:arq.map(function(x){return {i:x.i,nombre:limpio(x.nombre).slice(0,80)}}),prosa:!!(a.T.prosa&&!a.T.lista&&!deAdj.length&&!arq.length),items:items.slice(0,60),dictado:String((a.F.esForm&&a.F.msg)||a.T.cuerpo||'').slice(0,3000)}};
  return reservar(p).then(function(n){p.num=n;
   DB.presus[n]=p;if(nn(n)>nn(DB.contador||0))DB.contador=nn(n);
   try{guardarCliente(p)}catch(_){}try{save()}catch(_){}try{subirPresu(n)}catch(_){}
   try{if(window.__usoApunta)__usoApunta('correo')}catch(_){}
   ponEst(function(x){x.hechos=(x.hechos||[]).concat([{n:n,ts:Date.now()}]).slice(-50)});
   try{if(document.getElementById('page-clientes').classList.contains('on'))renderClientes()}catch(_){}
   return {n:n}})}

 function procesar(c,a){var mm=M(),textos=[],P=null,arq=[],nCap=0,nPdf=0,fallos=(est().fallos||{})[c.id]||0;
  /* si el correo ya trae la lista escrita, las fotos son de la obra o del diseño: no hace falta leerlas */
  var imgs=(a.T.items.length>=3||fallos)?[]:a.imgs.slice(0,6),pdfs=fallos>1?[]:a.pdfs.slice(0,3);
  var cadena=mm.base();
  pdfs.forEach(function(x){cadena=cadena.then(function(){avisando('Leyendo el PDF «'+limpio(x.nombre).slice(0,40)+'» del correo de '+a.quien+'…');return bajar(c.id,x)}).then(function(f){if(!f)return;
   return mm.abrirPdf(f).then(function(r){
    if(r.conTexto)return mm.textoPdf(f).then(function(ls){if(esArquitecto(ls)){arq.push(x);return}if(ls.length){textos.push(ls.join('\n'));nPdf++}});
    return mm.leerPlanos([r],null).then(function(PP){if(PP.sitio||PP.escala||PP.plano){P=P||PP;nPdf++}(PP.textos||[]).forEach(function(t){if(t&&t.trim()){textos.push(t);nPdf++}})})})}).catch(function(){})});
  imgs.forEach(function(x,i){cadena=cadena.then(function(){avisando('Leyendo '+(imgs.length>1?'la captura '+(i+1)+' de '+imgs.length:'la captura')+' del correo de '+a.quien+'…');return bajar(c.id,x)}).then(function(f){if(!f)return;
   return mm.leerImagenes([f],null).then(function(ts){var t=(ts||[]).join('\n');if(t.trim()){textos.push(t);nCap++}})}).catch(function(){})});
  return cadena.then(function(){avisando('');return montar(c,a,textos,P,arq,nCap,nPdf)})}

 /* ---------------- mirar el correo ---------------- */
 var ocupado=false,ultIntento=0,txtTrabajo='';
 function avisando(t){txtTrabajo=t||'';pintarAviso()}
 function uno(c){var e=est();if(((e.fallos||{})[c.id]||0)>=3)return Promise.resolve({visto:true});
  var a;try{a=analizar(c)}catch(err){a=null}
  if(!a||!a.candidato)return Promise.resolve({visto:true});
  return llamar({a:'coger',id:c.id},30000).then(function(r){if(!r||!r.ok)return {otro:true};
   avisando('Mirando el correo de '+a.quien+'…');
   return procesar(c,a).then(function(res){return llamar({a:'hecho',id:c.id,n:(res&&res.n)||''},30000).catch(function(){}).then(function(){return {n:res&&res.n}})},
    function(err){ponEst(function(x){x.fallos=x.fallos||{};x.fallos[c.id]=(x.fallos[c.id]||0)+1});throw err})})
   .catch(function(err){return {fallo:String((err&&err.message)||err)}})}
 function mirar(forzar){
  if(ocupado||!conectado()||!M())return Promise.resolve();if(navigator.onLine===false)return Promise.resolve();
  if(!forzar&&document.visibilityState==='hidden')return Promise.resolve();
  ocupado=true;ultIntento=Date.now();var vueltas=0;
  function ronda(){var e=est(),a=A(),desde=e.ult?(e.ult-MARGEN):(a.correoDesde||Date.now()-6*3600e3);if(e.unaVez)desde=Math.min(desde,e.unaVez);
   return llamar({a:'lista',desde:Math.round(desde)},120000).then(function(r){if(!r||r.error)throw new Error(r&&r.error==='clave'?'la clave no coincide: vuelve a poner el programa del correo':(r&&r.error)||'sin respuesta');
    if(r.cuenta&&r.cuenta!==A().correoCuenta){try{AJ.correoCuenta=r.cuenta;lsSet('vr_aj',JSON.stringify(AJ))}catch(_){}}
    var vistos=[],cadena=Promise.resolve();
    (r.correos||[]).forEach(function(c){cadena=cadena.then(function(){return uno(c).then(function(res){if(res&&res.visto)vistos.push(c.id)})})});
    return cadena.then(function(){if(vistos.length)return llamar({a:'hecho',ids:vistos.join(',')},30000).catch(function(){})}).then(function(){
     ponEst(function(x){if(!r.mas){x.ult=r.ahora||Date.now();delete x.unaVez}x.ok=Date.now();x.err=''});
     if(r.mas&&++vueltas<6)return ronda()})})}
  return ronda().catch(function(err){ponEst(function(x){x.err=String((err&&err.message)||err);x.errTs=Date.now()})})
   .then(function(){ocupado=false;avisando('');pintarAjustes(true)})}

 /* ---------------- el aviso de arriba ---------------- */
 function nuevos(){var D=(window.DB&&DB.presus)||{};return Object.keys(D).map(function(k){return D[k]}).filter(function(p){return p&&p.correo&&p.nuevoCorreo}).sort(function(x,y){return (y.ts||0)-(x.ts||0)})}
 function base(p){return (p.lineas||[]).reduce(function(s,l){return s+Math.round(nn(l.q)*nn(l.p)*100)/100},0)}
 function pintarAviso(){var b=document.getElementById('buzonAviso'),L=nuevos();
  if(!L.length&&!txtTrabajo){if(b)b.style.display='none';return}
  if(!b){b=document.createElement('div');b.id='buzonAviso';document.body.appendChild(b);
   b.addEventListener('click',function(e){var t=e.target.closest('[data-n],[data-x]');if(!t)return;if(t.hasAttribute('data-x')){quitarNuevos();return}abrirDeCorreo(t.getAttribute('data-n'))})}
  var h='';
  if(L.length){h+='<div style="font-weight:800;margin-bottom:4px">📩 '+(L.length===1?'Presupuesto nuevo que ha llegado por correo':L.length+' presupuestos nuevos que han llegado por correo')+'</div>';
   L.slice(0,3).forEach(function(p){var np=(p.lineas||[]).length;h+='<div style="display:flex;gap:8px;align-items:center;margin-top:6px"><div style="flex:1;min-width:0;line-height:1.3">'+esc(p.nom)+' · nº '+esc(p.num)+'<br><span style="opacity:.85;font-size:13px">'+(p.correo.sinPartidas?'Pide presupuesto: míralo':(!np&&(p.correo.arq||[]).length)?'Trae el PDF del arquitecto: ábrelo':np+(np===1?' partida':' partidas')+' · '+eu(base(p))+' sin IVA')+'</span></div><button type="button" data-n="'+esc(p.num)+'" style="background:#fff;color:#1B6B36;border:0;border-radius:8px;padding:9px 14px;font-weight:800;font-size:15px">Abrir</button></div>'});
   if(L.length>3)h+='<div style="margin-top:6px;font-size:13px">y '+(L.length-3)+' más en «Presupuestos»</div>';
   h+='<button type="button" data-x="1" title="Quitar el aviso" style="position:absolute;top:4px;right:6px;background:transparent;border:0;color:#fff;font-size:20px;padding:4px 8px">×</button>'}
  if(txtTrabajo)h+='<div style="'+(L.length?'margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,.25);':'')+'font-size:13px;opacity:.95">⏳ '+esc(txtTrabajo)+'</div>';
  var arriba=!!document.getElementById('instBox');
  b.innerHTML=h;b.style.cssText='position:fixed;left:10px;right:10px;'+(arriba?'top:calc(env(safe-area-inset-top,0px) + 10px)':'bottom:calc(env(safe-area-inset-bottom,0px) + 12px)')+';z-index:9600;max-width:560px;margin:0 auto;background:#1B6B36;color:#fff;border-radius:14px;padding:12px 40px 12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.3);font-size:15px;display:block'}
 function quitarNuevos(){nuevos().forEach(function(p){delete p.nuevoCorreo;try{subirPresu(p.num)}catch(_){}});try{save()}catch(_){}pintarAviso()}
 function abrirDeCorreo(n){if(!DB.presus[n])return;
  try{var gc=document.getElementById('guiaCapa');if(gc&&gc.classList.contains('on')){gc.classList.remove('on');document.body.style.overflow=''}}catch(_){}
  /* lo que hubiera abierto se guarda antes */
  try{leer();if(cur&&cur.num&&cur.num!==n&&(cur.nom||(cur.lineas||[]).length)){heredar(cur);DB.presus[cur.num]=JSON.parse(JSON.stringify(cur));lsSet('vr_db',JSON.stringify(DB));marcarPend(cur.num)}}catch(_){}
  abrir(n)}

 /* ---------------- dentro del presupuesto: de qué correo viene ---------------- */
 function pintarTarjeta(){var c=window.cur&&cur.correo,k=document.getElementById('cardCorreo');
  if(!c||c.oculto){if(k)k.style.display='none';return}
  if(!k){var pg=document.getElementById('page-presupuesto');if(!pg)return;k=document.createElement('div');k.className='card';k.id='cardCorreo';var pri=pg.querySelector('.card');if(pri&&pri.nextSibling)pg.insertBefore(k,pri.nextSibling);else pg.appendChild(k);
   k.addEventListener('click',function(e){var t=e.target.closest('[data-buzon]');if(!t)return;var q=t.getAttribute('data-buzon');
    if(q==='ocultar'){cur.correo.oculto=true;pintarTarjeta();try{autoGuardar()}catch(_){}}
    else if(q==='dictado')alDictado();
    else if(q==='arq')leerArq(+t.getAttribute('data-i'))})}
  var f=c.fecha?new Date(c.fecha):null,h='<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b style="font-size:17px">📩 Llegó por correo</b><div style="color:var(--muted);font-size:13px;margin-top:2px">'+esc(c.de)+(f?' · '+f.toLocaleDateString('es-ES')+' '+f.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'')+(c.asunto?'<br>«'+esc(c.asunto)+'»':'')+'</div></div><button class="mini sec" type="button" data-buzon="ocultar">Quitar</button></div>';
  h+='<div class="aviso" style="margin-top:8px;color:#1B6B36;line-height:1.45">'+(c.aviso||'')+'</div>';
  var bs='';(c.arq||[]).forEach(function(x,i){bs+='<button class="ok" type="button" data-buzon="arq" data-i="'+i+'">Leer el PDF del arquitecto «'+esc(x.nombre)+'»</button>'});
  if(c.prosa||c.sinPartidas)bs+='<button class="sec" type="button" data-buzon="dictado">Pasar el correo al dictado</button>';
  if(bs)h+='<div class="row" style="margin-top:8px">'+bs+'</div><div id="buzonTarjetaMsg" style="color:var(--muted);font-size:13px;margin-top:4px"></div>';
  h+='<details style="margin-top:8px"><summary>Ver el correo</summary><div id="buzonTexto" style="white-space:pre-wrap;font-size:13px;margin-top:6px;max-height:340px;overflow:auto;background:#f6f5f2;border-radius:8px;padding:8px"></div>'+(c.adjuntos&&c.adjuntos.length?'<div style="font-size:12px;color:var(--muted);margin-top:4px">Adjuntos: '+c.adjuntos.map(esc).join(', ')+'</div>':'')+'</details>';
  k.innerHTML=h;k.style.display='';k.style.borderLeft='5px solid #1B6B36';var tx=document.getElementById('buzonTexto');if(tx)tx.textContent=c.texto||'';
  if((cur.lineas||[]).length)try{var e0=document.getElementById('elegirModoMeter');if(e0)e0.style.display='none';['cardVoz','cardPdf'].forEach(function(id){var x=document.getElementById(id);if(x)x.style.display='none'});var mn=document.getElementById('cardMano');if(mn)mn.style.display=''}catch(_){}}
 function alDictado(){try{var t=(cur.correo.items&&cur.correo.items.length&&!cur.correo.sinPartidas)?cur.correo.items.join('. '):String(cur.correo.dictado||cur.correo.texto||'').split(/\n--\s*\n/)[0];
   meterPor('voz');var ta=document.getElementById('dictado');if(ta){ta.value=t.slice(0,3000);ta.scrollIntoView({behavior:'smooth',block:'center'})}
   var m=document.getElementById('buzonTarjetaMsg');if(m)m.textContent='Lo tienes en «Cuéntame lo que quiere el cliente»: repásalo y pulsa «Convertir en trabajos». Si sale algo repetido, quita lo que sobre.'}catch(e){}}
 function leerArq(i){var c=cur.correo,x=c&&c.arq&&c.arq[i],m=document.getElementById('buzonTarjetaMsg');if(!x)return;if(m)m.textContent='Bajando el PDF del correo…';
  bajar(c.id,x).then(function(f){if(!f)throw new Error('no ha llegado');if(m)m.textContent='';meterPor('pdf');leerArquitecto([f])}).catch(function(e){if(m)m.textContent='No he podido bajar el PDF ('+((e&&e.message)||e)+'). Ábrelo desde el correo y mételo en «Capturas, fotos, plano o PDF».'})}

 /* ---------------- Ajustes: conectar el Gmail ---------------- */
 function clave(){var a=A();if(a.correoClave)return a.correoClave;var b=new Uint8Array(18);try{crypto.getRandomValues(b)}catch(e){for(var i=0;i<b.length;i++)b[i]=Math.floor(Math.random()*256)}
  var k=[].map.call(b,function(x){return ('0'+x.toString(16)).slice(-2)}).join('');try{AJ.correoClave=k;lsSet('vr_aj',JSON.stringify(AJ));subirConfig()}catch(_){}return k}
 function codigo(){return GS.join('\n').replace('%%CLAVE%%',clave())}
 function hace(ts){if(!ts)return '';var m=Math.round((Date.now()-ts)/60000);return m<1?'ahora mismo':m===1?'hace un minuto':m<60?'hace '+m+' minutos':m<120?'hace una hora':m<1440?'hace '+Math.round(m/60)+' horas':'hace '+Math.round(m/1440)+' días'}
 function pintarAjustes(soloSiConectado){var pg=document.getElementById('page-ajustes');if(!pg)return;var box=document.getElementById('buzonCard');
  if(box&&box.contains(document.activeElement)&&document.activeElement.tagName==='INPUT')return;
  if(soloSiConectado&&box&&!conectado())return;
  if(!box){box=document.createElement('div');box.className='card';box.id='buzonCard';var pri=pg.querySelector('.card');if(pri&&pri.nextSibling)pg.insertBefore(box,pri.nextSibling);else pg.appendChild(box);
   box.addEventListener('click',function(e){var t=e.target.closest('[data-b]');if(!t)return;var q=t.getAttribute('data-b');
    if(q==='copiar')copiar();else if(q==='sig')paso((est().paso||0)+1);else if(q==='atras')paso(Math.max(0,(est().paso||0)-1));else if(q==='pegar')pegar();else if(q==='conectar')conectar();else if(q==='mirar')mirarYa();else if(q==='semana')semana();else if(q==='quitar')desconectar()})}
  var a=A(),e=est(),h='<h2 style="font-size:22px;margin-bottom:6px">📩 Presupuestos que llegan por correo</h2>';
  if(conectado()){var nh=(e.hechos||[]).length;
   h+='<p style="margin:0 0 8px"><b style="color:var(--ok)">✓ Conectado'+(a.correoCuenta?' a '+esc(a.correoCuenta):'')+'.</b> Cuando llega una petición de presupuesto (la lista de trabajos escrita, capturas o el plano), te lo hago solo: con su número, el cliente y cada trabajo con su precio. Miro el correo al abrir la app y cada cinco minutos mientras está abierta.</p>'+
    '<p style="margin:0 0 8px;color:var(--muted);font-size:13px">'+(e.ok?'Último vistazo: '+hace(e.ok)+'. ':'Todavía no he mirado el correo. ')+(nh?'Presupuestos hechos solos en este móvil: '+nh+'. ':'')+(e.err?'<span style="color:#b3261e">Último fallo: '+esc(e.err)+' ('+hace(e.errTs)+').</span>':'')+'</p>'+
    '<div class="row"><button class="ok" type="button" data-b="mirar">Mirar el correo ahora</button><button class="sec" type="button" data-b="semana">Mirar también los de la última semana</button><button class="sec" type="button" data-b="quitar">Desconectar</button></div><div id="buzonMsg" style="margin-top:6px;font-size:14px"></div>'}
  else{var n=Math.max(0,Math.min(PASOS.length-1,e.paso||0)),P=PASOS[n];
   if(!(window.FB&&FB.uid))h+='<div class="aviso" style="margin:0 0 8px">Primero entra en tu cuenta de la app: así, al conectarlo aquí, queda conectado también en todos los móviles de la empresa.</div>';
   h+='<p style="margin:0 0 10px">Cuando os llegue al Gmail una petición de presupuesto, la app la convierte sola en presupuesto. Hay que conectarla <b>una sola vez</b> con el Gmail de la empresa. Te lo voy diciendo paso a paso; se hace todo en este mismo móvil.</p>'+
    '<div style="border:2px solid #1B6B36;border-radius:12px;padding:14px">'+
    '<div style="font-size:13px;color:var(--muted);font-weight:700;letter-spacing:.3px">PASO '+(n+1)+' DE '+PASOS.length+'</div>'+
    '<div style="font-size:19px;font-weight:800;margin:2px 0 8px">'+P.t+'</div>'+
    '<div style="line-height:1.5;margin-bottom:10px">'+P.h+'</div>'+(P.nota?'<div style="font-size:13px;color:var(--muted);margin:-4px 0 10px">'+P.nota+'</div>':'')+P.b+
    '<div id="buzonMsg" style="margin-top:8px;font-size:14px"></div>'+
    (n?'<button type="button" data-b="atras" style="background:none;border:0;color:var(--muted);text-decoration:underline;padding:8px 0;margin-top:4px;font-size:14px">← Paso anterior</button>':'')+'</div>'+
    '<details style="margin-top:8px"><summary style="font-size:13px;color:var(--muted)">Ver el programa</summary><textarea id="buzonCodigo" readonly rows="6" style="width:100%;font-family:monospace;font-size:11px;margin-top:6px"></textarea></details>'}
  box.innerHTML=h;var ta=document.getElementById('buzonCodigo');if(ta)ta.value=codigo()}
 var BOTON='width:100%;padding:14px;font-size:17px',SIG='<button class="ok" type="button" data-b="sig" style="'+BOTON+'">Hecho, siguiente</button>';
 var IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),AND=/Android/.test(navigator.userAgent),MOVIL=IOS||AND;
 var PASOS=[
  {t:'Copia el programa',h:'Toca el botón y se copia solo.',b:'<button class="ok" type="button" data-b="copiar" style="'+BOTON+'">Copiar el programa</button>'},
  {t:'Entra con el Gmail de la empresa',
   h:(IOS?'Abre <b>Safari</b>, escribe arriba <b>script.new</b> y entra.':AND?'Abre Chrome en <b>incógnito</b> (los tres puntos de arriba → «Nueva pestaña de incógnito»), escribe arriba <b>script.new</b> y entra.':'Abre una ventana de <b>incógnito</b> del navegador, escribe arriba <b>script.new</b> y entra.')+' Google pide el <b>correo y la contraseña del Gmail</b> de la empresa: los pone el dueño del correo.',
   nota:IOS?'Si la página se ve rara, toca «aA», al lado de la dirección, y luego «Solicitar sitio web de escritorio».':AND?'Si la página se ve rara, en los tres puntos de Chrome marca «Sitio de escritorio».':'',b:SIG},
  {t:'Pega el programa',h:MOVIL?'Cuando salga una hoja con letras, toca debajo de todo, deja el dedo apretado y dale a <b>Pegar</b>. Luego toca el dibujo del <b>disquete</b> para guardar.':'Cuando salga una hoja con letras, haz clic debajo de todo y pega (Ctrl+V). Luego haz clic en el <b>disquete</b> para guardar.',b:SIG},
  {t:'Publícalo',h:'Arriba a la derecha toca <b>Implementar</b> y después <b>Nueva implementación</b>. En la ruedecita elige <b>Aplicación web</b>. En «Quién tiene acceso» pon <b>Cualquier usuario</b> y toca <b>Implementar</b>.',b:SIG},
  {t:'Dale permiso',h:'Toca <b>Autorizar acceso</b>, elige el Gmail de la empresa, luego <b>Configuración avanzada</b>, <b>Ir a…</b> y <b>Permitir</b>.',nota:'Google avisa de que no está verificado porque el programa es vuestro y no de una empresa. Solo deja leer los correos a la app: no manda ni borra nada.',b:SIG},
  {t:'Conéctalo con la app',h:'Debajo de «URL de la aplicación web», toca <b>Copiar</b>. Vuelve aquí y toca el botón.',b:'<button class="ok" type="button" data-b="pegar" style="'+BOTON+'">Pegar y conectar</button>'+
   '<div style="font-size:13px;color:var(--muted);margin:10px 0 4px">O pégala aquí a mano:</div><div class="row"><input id="buzonUrl" placeholder="https://script.google.com/macros/s/…/exec" style="flex:1;min-width:200px" autocomplete="off"><button class="sec" type="button" data-b="conectar">Conectar</button></div>'}];
 function paso(n){ponEst(function(x){x.paso=n});pintarAjustes();try{document.getElementById('buzonCard').scrollIntoView({behavior:'smooth',block:'start'})}catch(_){}}
 function pegar(){function aMano(){msg('Mantén el dedo en el recuadro de abajo, pega y toca «Conectar».',true);var i=document.getElementById('buzonUrl');if(i)i.focus()}
  if(navigator.clipboard&&navigator.clipboard.readText)navigator.clipboard.readText().then(function(t){var i=document.getElementById('buzonUrl');t=String(t||'').trim();if(!t){aMano();return}if(i)i.value=t;conectar()},aMano);else aMano()}
 function msg(t,mal){var m=document.getElementById('buzonMsg');if(m){m.style.color=mal?'#b3261e':'var(--ok)';m.innerHTML=t}}
 function copiar(){var t=codigo();function aMano(){var ta=document.getElementById('buzonCodigo');if(ta){ta.closest('details').open=true;ta.focus();ta.select();try{if(document.execCommand('copy')){paso(1);msg('✓ Copiado.')}else throw 0}catch(e){msg('Mantén el dedo en el programa de abajo, «Seleccionar todo» y «Copiar».',true)}}}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){paso(1);msg('✓ Copiado.')},aMano);else aMano()}
 function urlBuena(u){return /^https:\/\/script\.google\.com\/(?:a\/[^\/]+\/)?macros\/s\/[\w-]{20,}\/exec\/?$/.test(u)||(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u))}
 function conectar(){var i=document.getElementById('buzonUrl'),u=((i&&i.value)||'').trim().replace(/\?.*$/,'');
  if(/\/dev\/?$/.test(u)){msg('Esa es la dirección de pruebas (acaba en /dev). Copia la «URL de la aplicación web», la que acaba en /exec.',true);return}
  if(!urlBuena(u)){msg(u?'Eso no es la dirección buena. Copia la de debajo de «URL de la aplicación web» (acaba en /exec).':'Primero copia la dirección de debajo de «URL de la aplicación web».',true);return}
  msg('Probando…');var k=clave();
  llamar({a:'prueba'},25000,u,k).then(function(r){
   if(r&&r.error==='clave'){msg('Ese programa no es el de esta app. Vuelve al paso uno, cópialo otra vez y repite los pasos.',true);return}
   if(!r||!r.ok){msg('No me contesta bien. Mira el paso cuatro: en «Quién tiene acceso» tiene que poner «Cualquier usuario».',true);return}
   AJ.correoUrl=u;AJ.correoCuenta=String(r.cuenta||'');AJ.correoDesde=Date.now()-6*3600e3;try{lsSet('vr_aj',JSON.stringify(AJ));subirConfig()}catch(_){}
   ponEst(function(x){delete x.ult;delete x.err;delete x.jsonp;x.paso=0});pintarAjustes();
   /* ojo si se ha conectado otro Gmail que no es el de la empresa */
   var emp=String(AJ.email||'').trim().toLowerCase(),otro=emp&&r.cuenta&&emp.indexOf('@')>0&&emp!==String(r.cuenta).toLowerCase();
   var aviso=otro?'<br><span style="color:#b3261e"><b>Ojo:</b> se ha conectado el correo '+esc(r.cuenta)+' y el de la empresa es '+esc(emp)+'. Si no es el bueno, toca «Desconectar» y repite los pasos entrando con el de la empresa.</span>':'';
   msg('✓ Conectado'+(r.cuenta?' con '+esc(r.cuenta):'')+'. Miro el correo ahora…'+aviso);
   mirar(true).then(function(){msg(resultado()+aviso)})})
  .catch(function(e){msg('No me contesta. Mira el paso cuatro: en «Quién tiene acceso» tiene que poner «Cualquier usuario».',true)})}
 function resultado(){var e=est();if(e.err)return '<span style="color:#b3261e">No he podido mirar el correo: '+esc(e.err)+'</span>';var L=nuevos();return L.length?'Hecho: '+(L.length===1?'tienes un presupuesto nuevo del correo, en el aviso verde.':'tienes '+L.length+' presupuestos nuevos del correo, en el aviso verde.'):'Conectado y mirado: ahora no hay peticiones de presupuesto nuevas. Las que lleguen se harán solas al abrir la app.'}
 function mirarYa(){msg('Mirando el correo…');mirar(true).then(function(){msg(resultado())})}
 function semana(){ponEst(function(x){x.unaVez=Date.now()-7*864e5});mirarYa()}
 function desconectar(){if(!confirm('¿Desconecto el correo? Dejaré de hacer los presupuestos que lleguen por correo.'))return;delete AJ.correoUrl;delete AJ.correoCuenta;try{lsSet('vr_aj',JSON.stringify(AJ));subirConfig()}catch(_){}pintarAjustes()}

 /* ---------------- engancharse a la app ---------------- */
 function enganchar(){
  var ab=window.abrir;if(ab&&!ab.__buzon){window.abrir=function(n){var r=ab.apply(this,arguments);try{var p=DB.presus[n];if(p&&p.nuevoCorreo){delete p.nuevoCorreo;if(window.cur&&cur.num===n)delete cur.nuevoCorreo;save();subirPresu(n);pintarAviso()}}catch(_){}return r};window.abrir.__buzon=1}
  var pi=window.pintar;if(pi&&!pi.__buzon){window.pintar=function(){var r=pi.apply(this,arguments);try{pintarTarjeta()}catch(_){}return r};window.pintar.__buzon=1}
  var st=window.ST;if(st&&!st.__buzon){window.ST=function(t){var r=st.apply(this,arguments);if(t==='ajustes')try{pintarAjustes()}catch(_){}return r};window.ST.__buzon=1}
  var nu=window.nuevo;if(nu&&!nu.__buzon){window.nuevo=function(){var r=nu.apply(this,arguments);try{if(window.cur&&!cur.idp)cur.idp=idNuevo()}catch(_){}return r};window.nuevo.__buzon=1}
  var he=window.heredar;if(he&&!he.__buzon){window.heredar=function(c){try{var ant=c&&c.num&&DB.presus[c.num];
    if(ant&&ant!==c&&ant.idp&&c.idp&&ant.idp!==c.idp){var viejo=c.num;c.num=libreDesde(String(Math.floor(nn(siguienteNum()))));
     if(window.cur===c){var f=document.getElementById('f_num');if(f)f.value=c.num;var m=document.getElementById('msg');if(m)m.textContent='Este presupuesto pasa a ser el nº '+c.num+': el nº '+viejo+' ya lo tenía otro presupuesto'+(ant.correo?' (el que llegó por correo)':'')+'.'}}}catch(_){}
    return he.apply(this,arguments)};window.heredar.__buzon=1}
  var fc=window.fichaCli;if(fc&&!fc.__buzon){window.fichaCli=function(p){var h=fc.apply(this,arguments);try{if(p&&p.correo)h=h.replace('<div style="font-weight:700">','<div style="font-weight:700"><span class="chip" style="background:'+(p.nuevoCorreo?'#1B6B36':'#6b7a86')+';margin-right:6px">'+(p.nuevoCorreo?'📩 nuevo por correo':'📩 por correo')+'</span>')}catch(_){}return h};window.fichaCli.__buzon=1}}
 function arrancar(){enganchar();try{if(window.cur&&!cur.idp&&!DB.presus[cur.num])cur.idp=idNuevo()}catch(_){}pintarAviso();try{pintarTarjeta()}catch(_){}
  setTimeout(function(){mirar()},6000);setTimeout(pintarAviso,2500);setTimeout(pintarAviso,5000);
  setInterval(function(){if(Date.now()-ultIntento>CADA)mirar();pintarAviso()},30000);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&Date.now()-ultIntento>60000)setTimeout(function(){mirar()},1500)});
  window.addEventListener('online',function(){setTimeout(function(){mirar()},2000)})}
 var k=0,iv=setInterval(function(){if(window.DB&&window.AJ&&window.__motor&&document.getElementById('page-ajustes')){clearInterval(iv);arrancar()}else if(++k>200)clearInterval(iv)},150);

 window.__buzon={mirar:function(){return mirar(true)},analizar:analizar,trabajosDe:trabajosDe,limpiar:limpiar,htmlATexto:htmlATexto,formulario:formulario,codigo:codigo,pintarAjustes:pintarAjustes,estado:est,semana:semana};

 /* el programa que se pega en el Gmail (el mismo que tools/correo-gmail.gs) */
 var GS=/*GS*/["/* Programa del correo para la app de presupuestos.",
"   Vive en tu propio Gmail y solo hace esto: deja que tu app vea los correos nuevos (el texto y los",
"   adjuntos) para hacerte los presupuestos sola. Solo contesta a quien tenga la clave de abajo.",
"   No borra ni manda ningún correo: solo pone la etiqueta «Presupuesto hecho» al correo del que ha",
"   salido un presupuesto, para que lo veas en Gmail. */",
"var CLAVE = '%%CLAVE%%';",
"var RATO = 15 * 60 * 1000;",
"",
"function doGet(e) {",
"  var p = (e && e.parameter) || {}, r;",
"  if (!p.clave || p.clave !== CLAVE) r = {error: 'clave'};",
"  else {",
"    try {",
"      if (p.a === 'prueba') r = {ok: true, cuenta: yo(), version: 1};",
"      else if (p.a === 'lista') r = lista(p);",
"      else if (p.a === 'adjunto') r = adjunto(p);",
"      else if (p.a === 'coger') r = coger(p);",
"      else if (p.a === 'hecho') r = hecho(p);",
"      else r = {error: 'accion'};",
"    } catch (err) {",
"      r = {error: String((err && err.message) || err)};",
"    }",
"  }",
"  var t = JSON.stringify(r);",
"  if (p.cb && /^[A-Za-z_$][\\w$]{0,60}$/.test(p.cb)) {",
"    return ContentService.createTextOutput(p.cb + '(' + t + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);",
"  }",
"  return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.JSON);",
"}",
"",
"function yo() {",
"  try { return String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { return ''; }",
"}",
"function cuenta(p) {",
"  var q = String(p.q || 'x');",
"  return /^[\\w-]{1,40}$/.test(q) ? q : 'x';",
"}",
"function leer(k, d) {",
"  var v = PropertiesService.getScriptProperties().getProperty(k);",
"  if (!v) return d;",
"  try { return JSON.parse(v); } catch (e) { return d; }",
"}",
"function escribir(k, v) {",
"  PropertiesService.getScriptProperties().setProperty(k, JSON.stringify(v));",
"}",
"",
"/* los correos que han llegado desde «desde» y que la app todavía no ha mirado */",
"function lista(p) {",
"  var q = cuenta(p), ahora = Date.now(), mio = yo();",
"  var desde = Number(p.desde) || 0;",
"  if (!(desde > 0)) desde = ahora - 3 * 864e5;",
"  desde = Math.max(desde, ahora - 30 * 864e5);",
"  var vistos = leer('v_' + q, []), cog = leer('c_' + q, {});",
"  var busca = 'after:' + Math.floor(desde / 1000) + ' -in:chats -in:drafts -category:promotions -category:social -category:forums';",
"  var hilos = [];",
"  for (var pg = 0; pg < 3; pg++) {",
"    var h = GmailApp.search(busca, pg * 50, 50);",
"    hilos = hilos.concat(h);",
"    if (h.length < 50) break;",
"  }",
"  var out = [], mas = false;",
"  for (var i = 0; i < hilos.length; i++) {",
"    var ms = hilos[i].getMessages();",
"    for (var j = 0; j < ms.length; j++) {",
"      var m = ms[j], id = m.getId();",
"      if (vistos.indexOf(id) >= 0) continue;",
"      var c = cog[id];",
"      if (c && ahora - c[0] < RATO && c[1] !== String(p.disp || '')) continue;",
"      var f = m.getDate().getTime();",
"      if (f < desde) continue;",
"      if (m.isDraft() || m.isInTrash()) continue;",
"      var de = String(m.getFrom() || '');",
"      if (mio && de.toLowerCase().indexOf(mio) >= 0) continue;",
"      if (out.length >= 15) { mas = true; continue; }",
"      var adj = [], as = m.getAttachments({includeInlineImages: true, includeAttachments: true});",
"      for (var k = 0; k < as.length; k++) {",
"        adj.push({i: k, nombre: String(as[k].getName() || ''), tipo: String(as[k].getContentType() || ''), tam: as[k].getSize()});",
"      }",
"      var lu = '';",
"      try { lu = m.getHeader('List-Unsubscribe') || ''; } catch (e) {}",
"      out.push({",
"        id: id, hilo: hilos[i].getId(), fecha: f, de: de, responder: String(m.getReplyTo() || ''),",
"        para: String(m.getTo() || ''), asunto: String(m.getSubject() || ''), boletin: !!lu, adjuntos: adj,",
"        texto: String(m.getPlainBody() || '').slice(0, lu ? 2000 : 30000),",
"        html: lu ? '' : String(m.getBody() || '').slice(0, 120000)",
"      });",
"    }",
"  }",
"  out.sort(function (a, b) { return a.fecha - b.fecha; });",
"  return {ok: true, ahora: ahora, cuenta: mio, mas: mas, correos: out};",
"}",
"",
"/* un adjunto (foto, captura o PDF) en base64 */",
"function adjunto(p) {",
"  var m = GmailApp.getMessageById(String(p.id || ''));",
"  if (!m) return {error: 'no está'};",
"  var a = m.getAttachments({includeInlineImages: true, includeAttachments: true})[Number(p.i) || 0];",
"  if (!a) return {error: 'no está'};",
"  if (a.getSize() > 15 * 1024 * 1024) return {error: 'grande'};",
"  return {ok: true, nombre: String(a.getName() || ''), tipo: String(a.getContentType() || ''), b64: Utilities.base64Encode(a.getBytes())};",
"}",
"",
"/* un correo lo coge un solo móvil: así, si los dos tenéis la app abierta, no sale el presupuesto dos veces */",
"function coger(p) {",
"  var q = cuenta(p), id = String(p.id || ''), d = String(p.disp || '');",
"  if (!id) return {error: 'id'};",
"  var lock = LockService.getScriptLock();",
"  lock.waitLock(20000);",
"  try {",
"    var vistos = leer('v_' + q, []), cog = leer('c_' + q, {}), ahora = Date.now();",
"    if (vistos.indexOf(id) >= 0) return {ok: false, por: 'visto'};",
"    var c = cog[id];",
"    if (c && ahora - c[0] < RATO && c[1] !== d) return {ok: false, por: 'otro'};",
"    cog[id] = [ahora, d];",
"    for (var k in cog) if (ahora - cog[k][0] > 864e5) delete cog[k];",
"    escribir('c_' + q, cog);",
"    return {ok: true};",
"  } finally {",
"    lock.releaseLock();",
"  }",
"}",
"",
"/* mirado: ya no se vuelve a dar; si salió presupuesto (n), el correo lleva la etiqueta «Presupuesto hecho» */",
"function hecho(p) {",
"  var q = cuenta(p), ids = String(p.ids || p.id || '').split(',').filter(function (x) { return x; });",
"  var lock = LockService.getScriptLock();",
"  lock.waitLock(20000);",
"  try {",
"    var vistos = leer('v_' + q, []), cog = leer('c_' + q, {});",
"    ids.forEach(function (id) {",
"      if (vistos.indexOf(id) < 0) vistos.push(id);",
"      delete cog[id];",
"    });",
"    if (vistos.length > 400) vistos = vistos.slice(-400);",
"    escribir('v_' + q, vistos);",
"    escribir('c_' + q, cog);",
"  } finally {",
"    lock.releaseLock();",
"  }",
"  if (p.n && ids.length === 1) {",
"    try {",
"      var et = GmailApp.getUserLabelByName('Presupuesto hecho') || GmailApp.createLabel('Presupuesto hecho');",
"      GmailApp.getMessageById(ids[0]).getThread().addLabel(et);",
"    } catch (e) {}",
"  }",
"  return {ok: true};",
"}"]/*FIN GS*/;
})();
