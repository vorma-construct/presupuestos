/* Capturas o fotos con la lista de trabajos (un correo, un WhatsApp, un papel) -> presupuesto hecho.
   - Lee el texto en el propio movil (lector optico, sin IA ni servidores).
   - Saca el cliente de la firma (nombre, empresa, telefono, correo).
   - Cada linea del correo es una partida: ninguna se pierde, y se escribe como la pondria un arquitecto.
   - Medidas: las que trae el correo; si una falta y el mismo correo la da en otra linea (paredes de la
     cocina, altura hasta techo), la usa y lo dice.
   - Precio: 1) el que el albanil ya puso a un trabajo igual o parecido; 2) su tarifa; 3) la tabla de
     mercado; 4) si no se sabe, a cero para que lo ponga el. Lo que corrige lo aprende, y aprende
     tambien si cobra por encima o por debajo de la tarifa. */
(function(){
 var RAIZ=(function(){try{var sc=document.currentScript&&document.currentScript.src;return sc?sc.replace(/[^/]*$/,''):''}catch(e){return ''}})();

 /* ---------------- lector optico ---------------- */
 function cargarTess(){return new Promise(function(ok,ko){if(window.Tesseract)return ok();var s=document.createElement('script');s.src=RAIZ+'ocr/tesseract.min.js';s.onload=ok;s.onerror=ko;document.head.appendChild(s)})}
 /* la imagen se agranda y se pasa a blanco y negro (y se invierte si es modo oscuro): el lector acierta mucho mas */
 function preparar(file){return new Promise(function(ok,ko){var fr=new FileReader();fr.onload=function(){var im=new Image();im.onload=function(){
   var esc=Math.min(3,Math.max(1,1800/Math.max(im.width,1)));var w=Math.round(im.width*esc),h=Math.round(im.height*esc);
   var cv=document.createElement('canvas');cv.width=w;cv.height=h;var c=cv.getContext('2d');c.drawImage(im,0,0,w,h);
   var d=c.getImageData(0,0,w,h),p=d.data,suma=0;
   for(var i=0;i<p.length;i+=4){var g=0.299*p[i]+0.587*p[i+1]+0.114*p[i+2];p[i]=p[i+1]=p[i+2]=g;suma+=g}
   var oscuro=suma/(p.length/4)<110;
   for(var j=0;j<p.length;j+=4){var v=p[j];if(oscuro)v=255-v;v=v>150?255:(v<90?0:v);p[j]=p[j+1]=p[j+2]=v}
   c.putImageData(d,0,0);ok(cv)};im.onerror=ko;im.src=fr.result};fr.onerror=ko;fr.readAsDataURL(file)})}
 function leerImagenes(files,info){
  if(info)info.innerHTML='<b>Preparando el lector de capturas…</b> La primera vez tarda un poco más, porque se lo baja al móvil.';
  return cargarTess().then(function(){return Tesseract.createWorker('spa',1,{workerPath:RAIZ+'ocr/worker.min.js',corePath:RAIZ+'ocr/',langPath:RAIZ+'ocr/',gzip:true})}).then(function(w){
   var textos=[],cadena=Promise.resolve();
   [].forEach.call(files,function(f,i){cadena=cadena.then(function(){if(info)info.innerHTML='<b>Leyendo la captura '+(i+1)+' de '+files.length+'…</b>';return preparar(f)}).then(function(cv){return w.recognize(cv)}).then(function(r){textos.push(r.data.text||'')})});
   return cadena.then(function(){return w.terminate()}).then(function(){return textos})})}

 /* ---------------- utilidades ---------------- */
 function sa(s){return String(s||'').normalize('NFC').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
 function nm(s){return parseFloat(String(s).replace(',','.'))||0}
 function r2(x){return Math.round(x*100)/100}
 function fm(x){return String(r2(x)).replace('.',',')}
 function f2(x){return (Math.round(x*100)/100).toFixed(2).replace('.',',')}
 function cap(s){s=String(s||'').trim();return s.charAt(0).toUpperCase()+s.slice(1)}
 function minus(s){s=String(s||'').trim();return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(s)?s.charAt(0).toLowerCase()+s.slice(1):s}
 function uN(u){u=sa(u).replace('²','2').trim();return u==='m2'?'m2':(u==='ml'||u==='m')?'ml':u==='m3'?'m3':'ud'}

 /* ---------------- texto del cliente a texto de obra ---------------- */
 var TILDES=[['salon','salón'],['sofa','sofá'],['sofas','sofás'],['almacen','almacén'],['rodapies','rodapiés'],['rodapie','rodapié'],['habitacion','habitación'],['bano','baño'],['banos','baños'],['cajon','cajón'],['electrica','eléctrica'],['electrico','eléctrico'],['instalacion','instalación'],['proteccion','protección'],['demolicion','demolición'],['colocacion','colocación'],['reparacion','reparación'],['jardin','jardín'],['balcon','balcón'],['segun','según'],['tambien','también'],['metalico','metálico'],['ceramico','cerámico'],['plastica','plástica'],['valvula','válvula'],['ultimo','último']];
 function pulir(t){
  t=String(t||'').normalize('NFC');
  t=t.replace(/[.…]{2,}/g,', ').replace(/\+\s*-(?!\d)|\+\/-|±/g,' ');
  t=t.replace(/\b([A-ZÁÉÍÓÚÑ]{2,})\b/g,function(w){return /^(PVC|LED|DM|WC|IVA)$/.test(w)?w:w.toLowerCase()});
  t=t.replace(/\bdorm\b\.?/gi,'dormitorio').replace(/\bhab\b\.?/gi,'habitación').replace(/\b(\d+)\s*[l1]?uds?\b/gi,'$1 ud').replace(/\b[l1]uds?\b/gi,'1 ud');
  TILDES.forEach(function(p){t=t.replace(new RegExp('\\b'+p[0]+'\\b','gi'),function(w){return w.charAt(0)!==w.charAt(0).toLowerCase()?cap(p[1]):p[1]})});
  t=t.replace(/\bque esta\b/gi,'que está').replace(/\bde lato\b/gi,'de alto').replace(/\bsera\b/gi,'será').replace(/\bcuanto\b/gi,'cuánto');
  /* medidas en centimetros a metros, como en un presupuesto: 146cm -> 1,46 m; 2,26cm (errata) -> 2,26 m */
  t=t.replace(/(\d+(?:,\d+)?)\s*(?:cm|cem|centimetros?)\b/gi,function(all,n){if(n.indexOf(',')>0&&nm(n)>=1)return n+' m';var v=nm(n);return v>=10?(v/100).toFixed(2).replace('.',',')+' m':all});
  t=t.replace(/m\?\s*2/g,'m2').replace(/(techo)(\d)/gi,'$1 $2').replace(/(\d)\s*\+\s*(\d)/g,'$1 + $2');
  t=t.replace(/\(\s+/g,'(').replace(/\s+\)/g,')').replace(/\s+([,.;:])/g,'$1').replace(/,(?=[^\s\d])/g,', ').replace(/\s{2,}/g,' ').trim();
  return t.replace(/[\s.,;:]+$/,'')}

 /* ---------------- partir el texto en trabajos ---------------- */
 function esMorralla(l){var s=String(l||'');var letras=(s.match(/[a-záéíóúñü]/gi)||[]).length;var pal=s.replace(/[.,;:()]/g,' ').split(/\s+/).filter(function(w){return /^[a-záéíóúñü]{3,}$/i.test(w)}).length;
  return letras/Math.max(1,s.length)<0.55||pal<2||/^(responder|reenviar|tel\.?|mvl|mvi|movil|www\.|facebook|instagram|c\/)/i.test(s)||/@|\.com\b|\.es\b|\b\d{5}\s+\w+/i.test(s)||/^\d{1,2}:\d{2}/.test(s)}
 var FIN=/^(creo que no|en el presupuesto|o unidad como|un saludo|saludos|gracias|muchas gracias|atentamente|quedo a la espera|espero tu|espero vuestr|cualquier duda|--\s*$)/i;
 function aItems(txt){var items=[],act='',fin=false,firma=[];var lineas=String(txt||'').split(/\r?\n/);
  for(var i=0;i<lineas.length;i++){var raw=lineas[i],l=raw.replace(/\s+/g,' ').trim();if(!l)continue;
   if(fin){firma.push(l);continue}
   if(FIN.test(l)){fin=true;continue}
   /* firma: un nombre de persona con un telefono o correo justo debajo */
   if(/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}$/.test(l)&&/\d{3}\s?\d{3}\s?\d{3}|@/.test((lineas[i+1]||'')+' '+(lineas[i+2]||''))){fin=true;firma.push(l);continue}
   var empieza=/^[\s•·\-–—*●▪º°»>]*(?:e|o|a|«|\*)?\s+(?=[A-ZÁÉÍÓÚÑ])/.test(raw)||/^[•·●▪\-–*]/.test(raw)||(act&&/[.)]$/.test(act)&&/^[A-ZÁÉÍÓÚÑ]/.test(l));
   var limpia=l.replace(/^[\s•·\-–—*●▪º°»>]*(?:e|o|a|«|\*)?\s+(?=[A-ZÁÉÍÓÚÑ])/,'').replace(/^[•·●▪\-–*]+\s*/,'');
   /* restos de la pantalla delante del primer trabajo ("< Ba o So e Tapar ascensor.") */
   var mm=limpia.match(/^(.{1,18}?)\s(?:e|o|a|•|·)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\b.*)$/);if(mm&&esMorralla(mm[1])&&!esMorralla(mm[2])){limpia=mm[2];empieza=true}
   var soloMedida=act&&!/[a-záéíóúñ]{2,}/i.test(limpia)&&/\d+(?:[.,]\d+)?\s*(?:\+|m\b|cm|x)/i.test(limpia)&&limpia.length<40;
   if(!soloMedida&&esMorralla(limpia)&&(!act||/^[^a-záéíóúñ]*$/i.test(limpia)||/responder|reenviar/i.test(limpia)))continue;
   if(empieza&&act){items.push(act);act=''}
   act=act?act+' '+limpia:limpia}
  if(act)items.push(act);
  items=items.map(function(t){return t.replace(/\s*(€\s*)?(Responder|Reenviar).*$/i,'').replace(/\s+\d{1,2}:\d{2}\b.*$/,'').trim()}).filter(function(t){return t&&!esMorralla(t)});
  return {items:items,firma:firma.concat(lineas.slice(-14).map(function(x){return x.trim()}))}}
 function unirItems(listas){var out=[],vistos={};
  listas.forEach(function(L){L.forEach(function(t){var k=sa(t).replace(/[^a-z]+/g,' ').trim().slice(0,40);
   if(vistos[k]!=null){if(t.length>out[vistos[k]].length)out[vistos[k]]=t;return}vistos[k]=out.length;out.push(t)})});
  return out}

 /* nombre, empresa, telefono y correo de la firma */
 function clienteDe(ls){var c={};ls.forEach(function(l,i){
   var tel=l.match(/(?:\+?34)?\s*\b([6-7]\d{2})[\s.\-]?(\d{3})[\s.\-]?(\d{3})\b/);if(tel&&!c.tel)c.tel=tel[1]+' '+tel[2]+' '+tel[3];
   var fijo=l.match(/(?:\+?34)?\s*\b(9\d{2})[\s.\-]?(\d{2,3})[\s.\-]?(\d{2,3})[\s.\-]?(\d{0,3})\b/);if(fijo&&!c.fijo)c.fijo=(fijo[1]+fijo[2]+fijo[3]+fijo[4]).replace(/(\d{3})(\d{3})(\d{3})/,'$1 $2 $3');
   var em=l.match(/[\w.+-]+@[\w-]+\.[\w.]+/);if(em&&!c.email)c.email=em[0].toLowerCase();
   if(!c.empresa&&/\b(S\.?\s?L\.?U?|S\.?\s?A\.?|S\.?\s?Coop)\b\.?\s*$/i.test(l)&&l.length<60)c.empresa=l.replace(/\s+/g,' ').replace(/\b([a-záéíóúñ])([a-záéíóúñ]{2,})/g,function(_,a,b){return a.toUpperCase()+b});
   if(!c.nombre&&/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}$/.test(l)&&!/interiores|reformas|construc|estudio|arquitect|bizkaia|gernika|bilbao/i.test(l)){var sig=(ls[i+1]||'')+' '+(ls[i+2]||'');if(/\d{3}\s?\d{3}\s?\d{3}|@/i.test(sig))c.nombre=l}});
  return c}

 /* ---------------- familia y objeto de un trabajo (para no casar churras con merinas) ---------------- */
 function familia(t){t=sa(t);
  if(/papel|empapel/.test(t))return 'papel';
  if(/pint/.test(t))return 'pintura';
  if(/lucid|enluc|lucir|guarnec|yeso/.test(t))return 'yeso';
  if(/roza/.test(t))return 'rozas';
  if(/almacen|traslad|mudanz|devoluc/.test(t))return 'traslado';
  if(/proteg|proteccion|tapar/.test(t))return 'proteccion';
  if(/derrib|demol|picad|picar|quitar|retir|desmont|tirar|soltar|arranc|levantado/.test(t))return 'demolicion';
  if(/moldur|escayol/.test(t))return 'escayola';
  if(/corredera|armazon|casoneto/.test(t))return 'carpinteria';
  if(/tabique|pladur|trasdos/.test(t))return 'tabiqueria';
  if(/suministr|coloc|instal|montaj|poner/.test(t))return 'colocacion';
  return 'otro'}
 var OBJ=[['persiana',/persian/],['moldura',/moldur|escayol/],['rodapie',/rodapi/],['corredera',/corredera|casoneto|armazon/],['puerta',/puerta/],['ventana',/ventana/],['alicatado',/azulej|alicat/],['ascensor',/ascensor|zonas comunes/],['roza',/roza/],['cocina_muebles',/(mobiliario|muebles) de (la )?cocina|cocina (actual|existente)|demolicion de cocina/],['mobiliario',/mobiliario|mueble|sofa|cama|mesa|escritorio/],['tabique',/tabique|pladur/],['techo',/techo|paramentos? horizontal/],['pared',/pared|paramentos? vertical/],['suelo',/suelo|solad|pavimento|tarima|parquet/],['sanitario',/inodoro|lavabo|banera|plato de ducha|sanitari/],['radiador',/radiador/]];
 function objeto(t){t=sa(t);for(var i=0;i<OBJ.length;i++)if(OBJ[i][1].test(t))return OBJ[i][0];return 'otro'}

 /* ---------------- medidas ---------------- */
 var ESTANCIAS='cocina|bano|aseo|salon|comedor|pasillo|hall|entrada|dormitorio principal|dormitorio|habitacion|habitaciones|terraza|balcon|despensa|trastero|lavadero|txoko|garaje|vivienda|casa|piso';
 function estanciaDe(n){var m=n.match(new RegExp('\\b('+ESTANCIAS+')\\b'));return m?m[1]:''}
 function m2De(n){var m=n.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metros cuadrados)/);return m?nm(m[1]):0}
 function mlDe(n){var m=n.match(/(\d+(?:[.,]\d+)?)\s*(?:ml\b|metros lineales)/);return m?nm(m[1]):0}
 function longitudes(n){var m=n.match(/(\d+(?:,\d+)?)(?:\s*m)?\s*\+\s*(\d+(?:,\d+)?)(?:\s*\+\s*(\d+(?:,\d+)?))?/);if(m)return [m[1],m[2],m[3]].filter(Boolean).map(nm);var u=n.match(/(\d+(?:,\d+)?)\s*m\b(?!2| de alto| de ancho)/);return u?[nm(u[1])]:[]}
 function contexto(items){var c={paredes:{},alto:0};items.forEach(function(t){var n=sa(pulir(t));
  var a=n.match(/hasta (?:el )?techo,?\s*(?:de\s*)?(\d+(?:,\d+)?)\s*m/)||n.match(/altura (?:de )?(?:techo )?(?:de )?(\d+(?:,\d+)?)\s*m/)||n.match(/(\d+(?:,\d+)?)\s*m de alto/);if(a&&!c.alto){var v=nm(a[1]);if(v>=2&&v<=4)c.alto=v}
  if(/pared/.test(n)&&!/techo/.test(n)){var q=m2De(n),e=estanciaDe(n.replace(/.*pared\w*/,''));if(q&&e&&!c.paredes[e])c.paredes[e]=q}});return c}

 /* ---------------- precios: lo suyo, su tarifa, la tabla de mercado ---------------- */
 function claveDe(s){return typeof clavePartida==='function'?clavePartida(s):sa(s).replace(/[^a-z0-9]+/g,' ').trim()}
 var VACIAS={para:1,con:1,desde:1,hasta:1,todo:1,toda:1,todos:1,parte:1,zona:1,segun:1,incluso:1,existente:1,existentes:1,actual:1,nuevo:1,nueva:1,vivienda:1,casa:1,piso:1,durante:1,obra:1,marcado:1,plano:1,precio:1,metro:1,lineal:1};
 function fuertes(s){return sa(s).replace(/[^a-z ]+/g,' ').split(/\s+/).filter(function(w){return w.length>=4&&!VACIAS[w]}).map(function(w){return w.replace(/(es|s)$/,'')})}
 function aprendido(textos,u,fam,obj){var A=(window.aprendidos?aprendidos():(window.DB&&DB.aprend)||{});
  for(var i=0;i<textos.length;i++){if(!textos[i])continue;var e=A[claveDe(textos[i])];if(e&&e.p>0&&(!e.u||uN(e.u)===uN(u)))return {p:e.p,exacto:true}}
  var R=fuertes(textos[0]),mejor=null,ms=0;
  Object.keys(A).forEach(function(k){var e=A[k];if(!(e&&e.p>0))return;if(e.u&&uN(e.u)!==uN(u))return;if(familia(k)!==fam||objeto(k)!==obj)return;
   var K=fuertes(k),c=R.filter(function(r){return K.indexOf(r)>-1}).length,s=c/Math.max(R.length,K.length,1);if(s>ms){ms=s;mejor=e}});
  return ms>=0.5?{p:mejor.p,exacto:false}:null}
 function deTarifa(id,u){try{var t=tarifa().find(function(x){return x.id===id});if(t&&t.p>0&&uN(t.u)===uN(u))return t.p}catch(e){}return 0}
 function deMercado(fam,txt,u){try{if(!window.precioRealDe)return 0;var R=precioRealDe({t:txt,u:u,q:1,pa:0});if(R&&R.p>0&&R.fam===fam)return r2(R.p)}catch(e){}return 0}
 /* como cobra respecto a la tarifa: se aprende de sus correcciones (mediana, por familia si hay datos) */
 function ratio(fam){var L=(window.DB&&DB.ratios)||[];var f=L.filter(function(x){return x.f===fam}).map(function(x){return x.r});if(f.length<2){f=L.map(function(x){return x.r});if(f.length<3)return 1}
  f.sort(function(a,b){return a-b});return Math.max(0.5,Math.min(2,f[Math.floor(f.length/2)]))}
 window.apuntaRatio=function(desc,r){if(!(r>0.2&&r<5)||!window.DB)return;DB.ratios=(DB.ratios||[]).concat([{f:familia(desc),r:Math.round(r*1000)/1000,ts:Date.now()}]).slice(-60);try{save()}catch(e){}};

 /* ---------------- cada trabajo del correo -> partidas ---------------- */
 function L(d,q,u,o){o=o||{};return {d:cap(d),q:q,u:u,tar:o.tar||'',mer:o.mer||null,falta:o.falta||'',nota:o.nota||'',notaTar:o.notaTar||''}}
 function zonasDe(p,re){var m=p.match(re);if(!m)return '';return m[1].replace(/\s*,?\s*\d+(?:,\d+)?\s*(?:m2|ml|m²)\b.*$/i,'').replace(/\s*-\s*/g,', ').replace(/\s*,\s*y\s+/g,' y ').replace(/^la zona de\s+/i,'').replace(/[\s,.]+$/,'').trim()}
 function conArt(z){var t=sa(z).trim();if(/^(la|el|los|las)\s/.test(t)||/,| y /.test(t))return z;if(/^(cocina|habitacion|terraza|entrada|despensa|vivienda|casa|zona)\b/.test(t))return 'la '+z;if(/^(bano|salon|pasillo|comedor|dormitorio|hall|aseo|txoko|garaje|piso|trastero)\b/.test(t))return 'el '+z;return z}
 function de(z){z=conArt(z);return ('de '+z).replace(/^de el\b/,'del')}
 function garbi(n){return /garbigune|punto limpio/.test(n)?' (Garbigune)':''}
 /* "DORM PRINCIPAL, vaciar y retirar al Garbigune, SALON: tapar y proteger el mueble..., y mesa con sofa retirar al almacen, resto habitaciones..."
    -> "Dormitorio principal: vaciado y retirada a punto limpio (Garbigune); salón: protección del mueble... y retirada a almacén de la mesa y el sofá; ..." */
 var MUEB={mesa:'la mesa',mesas:'las mesas',sofa:'el sofá',sofas:'los sofás',cama:'la cama',camas:'las camas',escritorio:'el escritorio',escritorios:'los escritorios',armario:'el armario',armarios:'los armarios',silla:'la silla',sillas:'las sillas',comoda:'la cómoda',mesilla:'la mesilla',mesillas:'las mesillas',estanteria:'la estantería',estanterias:'las estanterías',colchon:'el colchón',colchones:'los colchones',aparador:'el aparador',libreria:'la librería',televisor:'el televisor',lampara:'la lámpara',alfombra:'la alfombra'};
 function lista(a){return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' y '+a[a.length-1]}
 function objetosDe(s,fuera){var out=[];sa(s).replace(/[^a-z ]/g,' ').split(/\s+/).forEach(function(w){var m=MUEB[w];if(m&&out.indexOf(m)<0&&(!fuera||fuera.indexOf(w.replace(/s$/,''))<0))out.push(m)});return out}
 var SALAS='dormitorio principal|dormitorio|salon|comedor|cocina|bano|pasillo|hall|entrada|terraza|resto (?:de )?(?:las )?habitaciones|habitaciones|habitacion';
 function detalleMuebles(det){var n=sa(det),re=new RegExp('(?:^|[,;]\\s*)('+SALAS+')(?=\\s*[:,]|\\s+(?:los|las|el|la)\\b)','g'),cortes=[],m;
  while((m=re.exec(n))){cortes.push({i:m.index+m[0].indexOf(m[1]),sala:m[1]})}
  if(cortes.length<2)return '';
  var partes=cortes.map(function(c,k){var fin=k+1<cortes.length?cortes[k+1].i:det.length;return {sala:c.sala,t:det.slice(c.i+c.sala.length,fin).replace(/^[\s:,]+|[\s,;]+$/g,'')}});
  var out=partes.map(function(pt){var t=sa(pt.t),acc=[],guarda=[];
   if(/vaciar|vaciado/.test(t))acc.push('vaciado'+(/garbigune|punto limpio/.test(t)?' y retirada a punto limpio (Garbigune)':/almacen/.test(t)?' y traslado a almacén':''));
   var q=t.match(/(los|las|el|la)\s+(\w+)\s+se\s+quedan?/);
   if(q){acc.push('protección de '+(MUEB[q[2]]||(q[1]+' '+q[2]))+', que se quedan,');guarda.push(q[2].replace(/s$/,''))}
   else{var pr=pt.t.match(/(?:tapar y proteger|proteger y tapar|proteger|tapar)\s+(.+?)(?=,\s*y\s|,|\s+y\s+(?:mesa|el resto|la mesa|las|los)\b|$)/i);
    if(pr){var o=pr[1].replace(/\s+del?\s+(?:salón|salon)\b/i,'').replace(/que est[aá] suspendido a la pared/i,'suspendido de la pared').replace(/\s+/g,' ').trim();acc.push('protección '+(/^(el|los)\s/i.test(o)?o.replace(/^el\s/i,'del ').replace(/^los\s/i,'de los '):'de '+o));sa(o).split(/\s+/).forEach(function(w){if(MUEB[w])guarda.push(w.replace(/s$/,''))})}}
   if(/retirar\w*\s+al?\s+almacen|al almacen/.test(t)){var antes=t.split(/retirar\w*\s+al?\s+almacen/)[0];var ob=objetosDe(antes.replace(/.*proteger/,''),guarda);if(!ob.length)ob=objetosDe(antes,guarda);if(ob.length)acc.push('retirada a almacén de '+lista(ob))}
   var sala=pt.sala.replace(/^resto (?:de )?(?:las )?habitaciones$/,'resto de habitaciones');sala=pulir(sala);
   var txt=acc.length===2?acc[0]+' y '+acc[1]:lista(acc);return acc.length?minus(sala)+': '+txt.replace(/,\s*$/,''):''}).filter(Boolean);
  return out.length?cap(out.join('; ')):''}

 var REGLAS=[
  /* proteccion */
  [/\b(tapar|proteger|proteccion)\b.*\bascensor\b/,function(n,p){return [L('Protección del ascensor y de las zonas comunes durante la obra',1,'ud',{mer:['x_proteccion','Protección de zonas comunes durante la obra']})]}],
  /* muebles a almacen y vuelta */
  [/^(retirada|retirar|sacar|llevar|quitar)\b.*\b(mobiliario|muebles)\b.*\balmacen\b/,function(n,p){var i=p.indexOf('(');var det=i>=0?p.slice(i+1):p.replace(/^.*?almac[eé]n\.?\s*/i,'');det=det.replace(/\)\s*$/,'').replace(/\s*,\s*,/g,',').trim();
   var bien=detalleMuebles(det);return [L('Retirada del mobiliario existente y traslado a almacén'+(bien?'. '+bien:(det?': '+minus(det):'')),1,'ud')]}],
  [/^(volver a (llevar|traer|subir|meter|colocar)|devolver|devolucion|traer de nuevo|subir de nuevo)\b.*\balmacen\b/,function(n,p){var m=p.match(/al? (?:piso|casa|vivienda)\s+(.*)$/i);var que=m?m[1]:p.replace(/^.*?almac[eé]n\s*/i,'');que=que.replace(/^el\s+/i,'del ').replace(/\s*,\s*y\s+/g,' y ');
   return [L('Traslado desde almacén y colocación en la vivienda '+(/^del\s/.test(que)?'':'de ')+que,1,'ud')]}],
  /* tabiques */
  [/^(derribo|derribar|demoler|demolicion|tirar|quitar)\b.*\btabiques?\b/,function(n,p,c){var lg=longitudes(n),col=(n.match(/\ben (rojo|verde|azul|amarillo|naranja)\b/)||[])[1];
   var alto=(c&&c.alto)||0,suma=lg.reduce(function(a,b){return a+b},0),m2=suma&&alto?r2(suma*alto):0;
   return [L('Demolición de tabique'+(/plano/.test(n)?' según plano':'')+(col?' (marcado en '+col+')':'')+(lg.length?', de '+lg.map(f2).join(' m + ')+' m de longitud'+(m2?' y '+f2(alto)+' m de altura ('+f2(m2)+' m²)':''):'')+', con retirada de escombro a vertedero autorizado',1,'ud',{tar:'tab',nota:m2?'el tabique a derribar mide '+f2(m2)+' m² ('+lg.map(f2).join(' + ')+' m de largo por '+f2(alto)+' m de alto); tu tarifa lo cobra por unidad':''})]}],
  [/^(levantar|hacer|construir|ejecutar|formar|formacion|colocar|poner|cerrar con)\b.*\btabique\b/,function(n,p,c){var lg=(n.match(/tabique(?: nuevo)?(?: de)?\s*(\d+(?:,\d+)?)\s*m\b/)||[])[1];lg=lg?nm(lg):0;
   var col=(n.match(/\ben (rojo|verde|azul|amarillo|naranja)\b/)||[])[1];var alto=c.alto||0;var out=[];
   var d='Formación de tabique nuevo'+(lg?' de '+f2(lg)+' m de longitud':'')+(alto?' hasta techo ('+f2(alto)+' m de altura)':'')+(/plano|marcado/.test(n)?', según plano':'')+(col?' (marcado en '+col+')':'');
   if(lg&&alto)out.push(L(d,r2(lg*alto),'m2',{tar:'pla',nota:'el tabique nuevo lo he medido con '+f2(lg)+' m de largo por '+f2(alto)+' m de altura hasta techo, que es la que da el correo'}));
   else out.push(L(d,lg||0,lg?'ml':'m2',{falta:lg?'':'los m² del tabique'}));
   if(/\b(caja|cala|cajon|armazon|casoneto|kit)\b.*\bcorredera\b/.test(n)){var an=(n.match(/(\d+(?:,\d+)?)\s*m de ancho/)||[])[1],al=(n.match(/(\d+(?:,\d+)?)\s*m de alto/)||[])[1];
    out.push(L('Suministro y colocación de armazón para puerta corredera empotrada'+(/hasta (el )?techo/.test(n)?', hasta techo':'')+(an||al?', de '+(an?an+' m de ancho':'')+(an&&al?' y ':'')+(al?al+' m de alto':''):''),1,'ud',{tar:'cor',notaTar:/hasta (el )?techo/.test(n)?'el armazón de la corredera es hasta techo'+(al?' ('+al+' m de alto)':'')+' y el precio de tu tarifa es el del normal: revísalo':''}))}
   return out}],
  /* puertas y rodapies */
  [/^(soltar|quitar|desmontar|retirar|levantar|arrancar)\b.*\bpuertas?\b.*\brodapies?\b/,function(n,p){var np=(n.match(/(\d+)\s*puertas/)||[])[1];var ml=mlDe(n);
   return [L('Desmontaje de puertas interiores existentes con marcos y premarcos, y transporte a punto limpio'+garbi(n),np?+np:0,'ud',{tar:'pue',falta:np?'':'cuántas puertas'}),
           L('Arranque de rodapiés existentes y transporte a punto limpio'+garbi(n),ml||0,'ml',{tar:'rod',falta:ml?'':'los metros de rodapié'})]}],
  [/^(soltar|quitar|desmontar|retirar|levantar)\b(?!.*\b(tabique|corredera)\b).*\bpuertas?\b/,function(n,p){var np=(n.match(/(\d+)\s*puertas/)||[])[1];return [L('Desmontaje de puertas interiores existentes con marcos y premarcos, y transporte a punto limpio'+garbi(n),np?+np:(/\bpuerta\b/.test(n)?1:0),'ud',{tar:'pue',falta:np||/\bpuerta\b/.test(n)?'':'cuántas puertas'})]}],
  [/^(soltar|quitar|arrancar|retirar|levantar)\b.*\brodapies?\b/,function(n,p){var ml=mlDe(n);return [L('Arranque de rodapiés existentes y transporte a punto limpio'+garbi(n),ml||0,'ml',{tar:'rod',falta:ml?'':'los metros de rodapié'})]}],
  /* cocina */
  [/^(derribo|derribar|desmontaje|desmontar|quitar|retirar|tirar|demoler|demolicion)\b.*\b(mobiliario|muebles)\b.*\bcocina\b/,function(n,p){return [L('Desmontaje del mobiliario de cocina existente, con bajada y transporte a punto limpio',1,'ud',{tar:'coc'})]}],
  /* alicatado */
  [/^(quitar|picar|picado|retirar|arrancar|demoler|derribo|derribar|demolicion|tirar)\b.*\b(azulejos?|alicatados?)\b/,function(n,p,c){var e=estanciaDe(n.replace(/.*(azulejo|alicatado)s?/,''))||estanciaDe(n);var q=m2De(n),nota='';
   if(!q&&e&&c.paredes[e]){q=c.paredes[e];nota='el picado de azulejos lo he medido con los '+fm(q)+' m² de paredes de '+pulir(e)+' que da el mismo correo'}
   return [L('Picado de alicatado en paredes'+(e?' '+de(pulir(e)):'')+', con retirada de escombro a vertedero autorizado',q||0,'m2',{tar:'ali',falta:q?'':'los m² de azulejo',nota:nota})]}],
  /* rozas */
  [/\b(tapar|tapado|cerrar|rellenar)\b.*\brozas?\b/,function(n,p){var el=/electric|luz/.test(n),fo=/fontaner|agua|tuber/.test(n);
   return [L('Tapado con yeso de las rozas de la instalación'+(el?' eléctrica':fo?' de fontanería':'')+' y remates de albañilería',1,'ud',{tar:el?'aye':fo?'ayf':''})]}],
  /* yeso */
  [/^(lucido|lucir|enlucido|enlucir|guarnecido|guarnecer|dar yeso)\b/,function(n,p){var z=zonasDe(p,/paredes?\s+(?:de\s+|del\s+)?(.*)$/i)||zonasDe(p,/^\S+\s+(?:de\s+)?(.*)$/i);var q=m2De(n);
   return [L('Lucido de yeso en paredes'+(z?' '+de(z):'')+', lijado y listo para pintar',q||0,'m2',{tar:'luc',falta:q?'':'los m²'})]}],
  /* papel pintado */
  [/^(empapelar|empapelado|colocar papel|poner papel|papel pintado)\b.*\b(caja|cajon)\b.*\bpersiana/,function(n,p){var e=estanciaDe(n.replace(/.*persiana/,''));var med=(p.match(/\((\d+(?:,\d+)?\s*m)\)/)||[])[1]||'';
   return [L('Colocación de papel pintado en cajón de persiana'+(e?' de la '+pulir(e):'')+(med?' ('+med+')':''),1,'ud')]}],
  [/\b(colocar|poner|empapelar|colocacion de)\b.*\bpapel\b|^empapelar\b/,function(n,p){var z=zonasDe(p,/paredes?\s+(?:de\s+|del\s+)?(.*?)(?:\s+\d.*)?$/i);var ro=n.match(/(\d+)\s*(?:-|a|o)\s*(\d+)\s*rollos?/)||n.match(/(\d+)\s*rollos?/);var q=m2De(n);
   if(ro){var max=+(ro[2]||ro[1]);return [L('Colocación de papel pintado en paredes'+(z?' '+de(z):'')+' ('+(ro[2]?ro[1]+' a '+ro[2]:ro[1])+' rollos)',max,'ud')]}
   return [L('Colocación de papel pintado en paredes'+(z?' '+de(z):''),q||0,'m2',{falta:q?'':'los m²'})]}],
  /* pintura */
  [/^(pintado|pintar|pintura)\b.*\b(cajas?|cajon(es)?)\b.*\bpersianas?\b/,function(n,p){var c=n.match(/persianas?(?:\s+(?:de|del|de la|de toda la)\s+[a-z ]+?)?[.,]?\s*(\d+)\s*\(/)||n.match(/(\d+)\s*(?:cajas|cajones)/);var q=c?+c[1]:0;
   var det=(p.match(/\(([^)]*)\)/)||[])[1]||'';det=det.replace(/(\d+)\s*ud\s+de\s+/gi,'$1 de ').replace(/\s*\+\s*/g,' y ');
   return [L('Pintura de cajones de persiana'+(det?' ('+det+')':''),q||1,'ud')]}],
  [/^(pintado|pintar|pintura|dar (una|dos|tres) manos?)\b.*\btechos?\b/,function(n,p){var z=zonasDe(p,/techos?\s+(?:de\s+|del\s+)?(.*)$/i);var q=m2De(n);var man=(n.match(/\b(una|dos|tres) manos?\b/)||[])[0]||'';
   return [L('Pintura plástica'+(man?', '+man+',':'')+' en techos'+(z?' '+de(z):''),q||0,'m2',{tar:'pit',falta:q?'':'los m²'})]}],
  [/^(pintado|pintar|pintura|dar (una|dos|tres) manos?)\b.*\bparedes?\b/,function(n,p){var z=zonasDe(p,/paredes?\s+(?:de\s+|del\s+)?(.*)$/i);var q=m2De(n);var man=(n.match(/\b(una|dos|tres) manos?\b/)||[])[0]||'';
   return [L('Pintura plástica'+(man?', '+man+',':'')+' en paredes'+(z?' '+de(z):''),q||0,'m2',{tar:'pip',falta:q?'':'los m²'})]}],
  /* molduras */
  [/^(arreglo|arreglar|reparacion|reparar|restaurar|restauracion|reponer)\b.*\bmolduras?\b/,function(n,p){var z=zonasDe(p,/(?:zona de|en el|en la|en|del|de la)\s+((?:salón|salon|pasillo|cocina|dormitorio|habitación|habitacion|comedor|hall|entrada)[^,.]*)/i);var porMl=/por ml|metro lineal|por metro/.test(n);var q=mlDe(n);
   return [L('Reparación de molduras de techo'+(z?' en '+z.replace(/\s*,\s*/g,' y '):'')+(porMl&&!q?'. Precio por metro lineal; se medirá en obra':''),q||1,'ml')]}],
 ];

 /* lo que no encaja en ninguna regla: verbo del cliente -> nombre de partida, y sus medidas */
 function generica(n,p){var r=p.replace(/^quitar\s+/i,'Retirada de ').replace(/^tirar\s+/i,'Demolición de ').replace(/^derribo de\s+/i,'Demolición de ').replace(/^levantar\s+/i,'Formación de ').replace(/^colocar\s+/i,'Colocación de ').replace(/^poner\s+/i,'Colocación de ').replace(/^pintar\s+/i,'Pintura plástica de ').replace(/^pintado de\s+/i,'Pintura de ').replace(/^cambiar\s+/i,'Sustitución de ').replace(/^arreglar\s+|^arreglo de\s+/i,'Reparación de ').replace(/^soltar\s+/i,'Desmontaje de ').replace(/^desmontar\s+/i,'Desmontaje de ').replace(/^montar\s+/i,'Montaje de ').replace(/^instalar\s+/i,'Instalación de ').replace(/^tapar\s+/i,'Protección de ').replace(/^limpiar\s+/i,'Limpieza de ').replace(/retirar al garbigune/i,'transporte a punto limpio (Garbigune)').replace(/\bde el\b/g,'del');
  var q=m2De(n),u='m2';if(!q){q=mlDe(n);u='ml'}if(!q){var c=n.match(/\b(\d+)\s*(?:ud|uds|unidades|puntos|piezas)\b/);q=c?+c[1]:1;u='ud'}
  r=r.replace(/[,\s]*\d+(?:,\d+)?\s*(m2|m²|ml)\b.*$/i,'');
  return [L(r,q,u)]}

 function partidasDe(t,ctx){var p=pulir(t),n=sa(p);
  for(var i=0;i<REGLAS.length;i++){if(REGLAS[i][0].test(n)){var o=REGLAS[i][1](n,p,ctx);o.forEach(function(x){x.orig=t});return o}}
  var g=generica(n,p);g.forEach(function(x){x.orig=t;x.generica=true});return g}

 function ponerPrecio(x){var fam=familia(x.d),obj=objeto(x.d),s=null,p0=0;
  var a=aprendido([x.d,x.orig],x.u,fam,obj);if(a){x.p=a.p;x.src='tuyo';return}
  if(x.tar){p0=deTarifa(x.tar,x.u);if(p0>0)s='tarifa'}
  if(!s&&x.mer){p0=deMercado(x.mer[0],x.mer[1],x.u);if(p0>0)s='mercado'}
  if(!s&&x.generica){try{var pz=window.parecida?parecida(x.orig):null;if(pz&&pz.t&&pz.t.p>0&&uN(pz.t.u)===uN(x.u)&&familia(pz.t.d)===fam&&objeto(pz.t.d)===obj){p0=pz.t.p;s='tarifa'}}catch(e){}
   if(!s){try{var R=window.precioRealDe?precioRealDe({t:x.d,u:x.u,q:x.q||1,pa:0}):null;if(R&&R.p>0&&!R.sinMercado&&R.famDesc&&familia(R.famDesc)===fam&&objeto(R.famDesc)===obj){p0=r2(R.p);s='mercado'}}catch(e){}}}
  if(s){x.p0=p0;x.r=ratio(fam);x.p=r2(p0*x.r);x.src=s;if(s==='tarifa'&&x.notaTar)x.nota=(x.nota?x.nota+'; ':'')+x.notaTar}else{x.p=0;x.src=''}}

 /* ---------------- al elegir capturas: montar el presupuesto ---------------- */
 var leer0=window.leerArquitecto;
 window.leerArquitecto=function(files){
  var imgs=[].filter.call(files||[],function(f){return /^image\//.test(f.type)||/\.(jpe?g|png|heic|webp)$/i.test(f.name||'')}),pdfs=[].filter.call(files||[],function(f){return imgs.indexOf(f)<0});
  if(pdfs.length&&leer0)leer0.call(this,pdfs);
  if(!imgs.length)return;
  try{var gc=document.getElementById('guiaCapa');if(gc&&gc.classList.contains('on')){gc.classList.remove('on');document.body.style.overflow=''}}catch(e){}
  var info=document.getElementById('arqInfo');if(info){info.innerHTML='<b>Leyendo…</b>';try{var cp=document.getElementById('cardPdf');if(cp&&cp.style.display!=='none')cp.scrollIntoView({behavior:'smooth',block:'start'})}catch(e){}}
  try{if(window.guiaBarra)setTimeout(guiaBarra,50)}catch(e){}
  Promise.all([leerImagenes(imgs,info),window.basePrecios?basePrecios():null]).then(function(res){var textos=res[0];
   var partes=textos.map(aItems),items=unirItems(partes.map(function(x){return x.items}));
   var firma=[].concat.apply([],partes.map(function(x){return x.firma}));var cli=clienteDe(firma);
   if(!items.length){if(info)info.textContent='No he sacado texto de la captura. Prueba con una más nítida, o copia el texto y pégalo en «Lo cuento yo».';return}
   try{if(typeof leer==='function')leer()}catch(e){}
   /* si hay otro presupuesto a medias de otro cliente, se empieza uno nuevo */
   var nombre=cli.nombre?(cli.nombre+(cli.empresa?' ('+cli.empresa+')':'')):'';
   try{if(nombre&&cur&&cur.nom&&sa(cur.nom).indexOf(sa(cli.nombre))<0&&(cur.lineas||[]).length&&typeof nuevo==='function'){nuevo()}}catch(e){}
   var puesto=[];try{var fn=document.getElementById('f_nom'),ft=document.getElementById('f_tel'),fe=document.getElementById('f_email');
    if(nombre&&fn&&!fn.value.trim()){fn.value=nombre;puesto.push('nombre')}
    if((cli.tel||cli.fijo)&&ft&&!ft.value.trim()){ft.value=cli.tel||cli.fijo;puesto.push('teléfono')}
    if(cli.email&&fe&&!fe.value.trim()){fe.value=cli.email;puesto.push('correo')}
    if(typeof leer==='function')leer()}catch(e){}
   var ctx=contexto(items),notas=[],faltan=[],aj=[],n={tuyo:0,tarifa:0,mercado:0,cero:0},total=0;
   items.forEach(function(it){partidasDe(it,ctx).forEach(function(x){ponerPrecio(x);if(x.nota)notas.push(x.nota);if(!(x.q>0)&&x.falta)faltan.push(x.falta);
     if(x.p>0)n[x.src]++;else n.cero++;total++;if(x.r&&x.r!==1){aj.push(x.r)}
     var l={d:x.d,q:x.q,u:x.u,p:x.p,orig:x.orig};if(x.src)l.src=x.src;if(x.p0)l.p0=x.p0;cur.lineas.push(l)})});
   try{renderLineas()}catch(e){}
   try{var e0=document.getElementById('elegirModoMeter');if(e0)e0.style.display='none';['cardVoz','cardPdf'].forEach(function(id){var x=document.getElementById(id);if(x)x.style.display='none'});var mn=document.getElementById('cardMano');if(mn)mn.style.display='';try{sessionStorage.setItem('vr_meter','mano')}catch(_){}}catch(e){}
   var conP=n.tuyo+n.tarifa+n.mercado;
   var msg='<b>Leído de '+(imgs.length===1?'la captura':'las '+imgs.length+' capturas')+':</b> '+items.length+' trabajos del cliente, '+total+' partidas. '+
    (conP?conP+' con precio ('+[n.tuyo?n.tuyo+' tuyos de otras veces':'',n.tarifa?n.tarifa+' de tu tarifa':'',n.mercado?n.mercado+' de la tabla de mercado':''].filter(Boolean).join(', ')+'). ':'')+
    (n.cero?'<b>'+n.cero+' sin precio</b>: ponles el tuyo tocando el precio, y me lo quedo para la próxima. ':'')+
    (faltan.length?'<b>Falta la cantidad</b> de '+faltan.length+': '+faltan.join(', ')+'. ':'')+
    (puesto.length?'Cliente: '+puesto.join(', ')+' cogidos de la firma. ':'')+
    (!(cur.dir||'').trim()?'La dirección de la obra no viene: pídesela. ':'')+
    (aj.length?(function(){var m=aj.reduce(function(a,b){return a+b},0)/aj.length,pc=Math.round(Math.abs(m-1)*100);return pc?'Los precios de tarifa y de mercado van '+(m>1?'subidos':'bajados')+' un '+pc+' % de media, que es como cobras tú por lo que has corregido otras veces. ':''})():'')+
    (notas.length?'<div style="margin-top:6px">'+notas.map(function(t){return '· '+cap(t)+'.'}).join('<br>')+'</div>':'')+
    '<details style="margin-top:6px"><summary>Ver lo que he leído</summary><ol style="margin:6px 0 0 18px;padding:0">'+items.map(function(t){return '<li>'+String(t).replace(/[<>&]/g,'')+'</li>'}).join('')+'</ol></details>';
   var cm=document.getElementById('cardMano');var av=document.getElementById('avisoCapturas');if(av)av.remove();
   if(cm){cm.insertAdjacentHTML('afterbegin','<div id="avisoCapturas" class="aviso" style="margin-bottom:8px;color:#1B6B36;line-height:1.45">'+msg+'</div>')}
   if(info)info.textContent='';
   try{if(cur.nom&&typeof guardar==='function')guardar()}catch(e){}
   setTimeout(function(){try{var a=document.getElementById('avisoCapturas')||document.getElementById('tb');a.scrollIntoView({block:'start'});var tn=document.getElementById('topnav'),h=0;if(tn){var r=tn.getBoundingClientRect();if(r.top<=2)h=r.bottom}window.scrollBy(0,-(h+10))}catch(e){}},300);
   try{if(window.__usoApunta)__usoApunta('imagen')}catch(e){}
   try{if(window.guiaBarra)guiaBarra()}catch(e){}
  }).catch(function(e){if(info)info.textContent='No he podido leer la captura ('+(e&&e.message||e)+'). Copia el texto y pégalo en «Lo cuento yo».'})};

 /* para probar sin capturas: el mismo motor con texto */
 window.__capturasTexto=function(textos){return textos.map(aItems)};
 window.__partidasDe=function(items){var ctx=contexto(items),o=[];items.forEach(function(it){partidasDe(it,ctx).forEach(function(x){ponerPrecio(x);o.push(x)})});return o};

 /* el selector acepta fotos y capturas, y los textos lo dicen */
 function ajustar(){var f=document.getElementById('pdfArq');if(f&&!/image/.test(f.getAttribute('accept')||''))f.setAttribute('accept','application/pdf,image/*');
  var c=document.getElementById('cardPdf');if(c&&!c.__img){c.__img=1;var h=c.querySelector('h2');if(h)h.textContent='¿Tienes un PDF, una foto o una captura de la lista?';
   var p=c.querySelector('p');if(p)p.textContent='Vale el PDF del arquitecto, el plano con medidas, o las capturas del correo o del WhatsApp con la lista de trabajos (puedes elegir varias). La app lee el texto, saca el cliente de la firma, escribe cada trabajo como una partida y le pone tu precio.'}}
 var k=0,iv=setInterval(function(){if(document.getElementById('pdfArq')){clearInterval(iv);ajustar()}else if(++k>80)clearInterval(iv)},150);
})();
