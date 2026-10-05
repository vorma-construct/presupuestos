/* Entiende como habla la gente ("modernizar el baño", "abrir la cocina al salon", "pintar toda la casa")
   y, cuando pide una estancia entera (baño, cocina, habitacion, piso), mete los trabajos de siempre
   y PREGUNTA lo que falta: medidas, ventana, puerta, ducha o bañera, techo, mueble...
   Cada respuesta rehace las lineas de esa estancia. Se carga despues de oficio.js. */
(function(){
var ALTO=2.5;
function T(id){return tarifa().find(function(t){return t.id===id})}
function n2(x){return Math.round(x*10)/10}
function fmt(x){return String(n2(x)).replace('.',',')}

/* ---------- 1) frases de la calle -> palabras del oficio ---------- */
var VERBO_ESTANCIA='reform\\w*|renov\\w*|arregl\\w*|moderniz\\w*|actualiz\\w*|rehacer|rehac\\w*|hacer(?:me|nos|le)?|hacerlo|cambiar(?:le)?|lavado de cara|obra|obras|dejar|meter mano|poner al dia|presupuesto (?:para|de)';
var RE_BANO=new RegExp('\\b(?:'+VERBO_ESTANCIA+')\\b[^,.;:]{0,45}?\\b(?:cuarto de )?(banos?|aseos?|servicio)\\b|\\b(banos?|aseos?)\\s+(?:completos?|enteros?|nuevos?|integral(?:es)?)\\b|\\breforma integral (?:del?|de los) (banos?|aseos?)\\b');
var RE_COCINA=new RegExp('\\b(?:'+VERBO_ESTANCIA+')\\b[^,.;:]{0,45}?\\bcocinas?\\b|\\bcocinas?\\s+(?:completa|entera|nueva|integral)\\b');
var RE_HAB=new RegExp('\\b(?:'+VERBO_ESTANCIA+')\\b[^,.;:]{0,35}?\\b(habitacion(?:es)?|dormitorios?|cuartos?(?! de bano)|salon|sala de estar)\\b');
var RE_PISO=/\b(?:reform\w*|renov\w*|reforma integral|obra integral|arregl\w*|rehacer)\b[^,.;:]{0,30}?\b(?:(?:el|un|una|la|toda la|todo el|mi)\s+)?(piso|casa|vivienda|apartamento|lonja)\b(?:\s+(?:entero|entera|completo|completa))?|\b(piso|casa|vivienda)\s+(?:entero|entera|completo|completa)\b|\breforma integral\b(?![^,.;]*\b(bano|aseo|cocina)\b)/;
/* si la frase ya dice trabajos concretos, no es "la estancia entera" */
var CONCRETO_BANO=/tuberi|fontaner|banera|ducha|plato|azulej|sanitari|inodoro|vater|water|lavabo|mueble|techo|extractor|ventila|puerta|pint|picar|quitar|grifo|mampara|suelo/;
var CONCRETO_COC=/mueble|suelo|pared|fontaner|techo|puerta|corredera|lucir|azulej|tabique|abrir|encimera|fregadero|campana|pint|quitar|desmont|montar|alicat/;
var CONCRETO_HAB=/suelo|tarima|parquet|pint|gotel|puerta|armario|pared|techo|enchuf|ventana|quitar|tirar|juntar|dividir|tabique/;

var REGLAS=[
/* separar "x y poner y" en frases */
[/\s+y\s+(?=(?:poner|colocar|hacer|montar|instalar|cambiar|quitar|picar|tirar|sacar|levantar|echar|meter|pintar|alicat|lijar|nivelar|alisar|enlucir|embaldos|acuchill|barniz|pulir|abrir|bajar|cerrar)\b)/g,', '],
[/\b(reform\w*|renov\w*|arregl\w*|moderniz\w*|hacer)\s+y\s+\w+\s+(?:(?:el|la|un|una|mi)\s+)?(banos?|aseos?|cocina|habitacion|dormitorio|piso|casa)\b/g,'$1 el $2'],
[/\s+y\s+(?!medio\b|cuarto\b|\d)/g,', '],
[/\b(?:tambien|ademas|luego|despues|aparte)\b/g,','],
[/\b(?:fontaneria nueva|hacer (?:la )?fontaneria|cambiar (?:la )?fontaneria|tuberias nuevas|cambiar (?:las )?tuberias)\b(?![^,.;]*\b(?:bano|aseo|cocina)\b)/g,function(m,o,all){var b=/\b(bano|aseo)\b/.test(all),c=/\bcocina\b/.test(all);return b&&!c?' fontaneria bano ':c&&!b?' fontaneria cocina ':m}],
[/\b(?:quitar|levantar|arrancar|sacar)\s+(?:la\s+)?moqueta\b/g,' quitar suelo '],
[/\b(?:quitar|levantar|picar|arrancar|sacar)\s+(?:el\s+)?terrazo\b/g,' picar suelo '],
[/\bpint\w*\b[^,.;]{0,20}?\b(?:toda la|todo el)\s+(?:piso|casa|vivienda)\b|\bpint\w*\b[^,.;]{0,15}?\b(?:techos? y paredes|paredes y techos?)\b/g,' pintar paredes, pintar techos '],
[/\bpladur\b[^,.;]{0,20}?\btechos?\b|\btechos?\b[^,.;]{0,12}?\bpladur\b/g,' falso techo '],
[/\bmueble\s+(?:de|del)\s+lavabo\b/g,'mueble de bano'],
[/\b(?:agrandar|ensanchar|ampliar|hacer mas grande)\s+(?:la\s+|el\s+)?(?:puerta|hueco|paso)\b/g,' abrir hueco '],
[/\blimpieza\b(?!\s+(?:final|periodica))/g,function(m,o,all){return /\b(final|acabar|terminar|terminad|acabad)\w*/.test(all)?' limpieza final ':m}],
[/\bal final\b/g,' '],
/* fontaneria */
[/\b(?:tuberi\w*|fontaner\w*|cañer\w*|caner\w*|instalacion de agua|el agua)\b[^,.;]{0,30}?\b(?:del?|en el|en la|de la)\s+(bano|aseo|cocina)\b/g,function(m,e){return ' fontaneria '+(e==='cocina'?'cocina':'bano')+' '}],
[/\b(?:tomas?|desagues?|enganches?)\b[^,.;]{0,30}\b(?:lavadora|fregadero|lavavajillas)\b/g,' fontaneria cocina '],
/* suelo: cambiar el suelo de baño/cocina = picar y poner baldosa; de salon/habitacion = quitar y tarima */
[/\b(?:cambiar|renovar|poner nuevo|hacer nuevo)\s+(?:el\s+)?suelo\s+(?:de\s+|del\s+)(?:la\s+)?(bano|aseo|cocina|terraza)\b/g,function(m,e){return ' picar suelo del '+e+', baldosa en el suelo del '+e+' '}],
[/\b(?:cambiar|renovar)\s+(?:el\s+)?suelo\s+de\s+(?:madera|parquet|tarima)\s+por\s+(?:un\s+)?(?:laminado|tarima|flotante|suelo flotante)\b/g,' quitar suelo, suelo flotante '],
[/\b(?:cambiar|renovar)\s+(?:el\s+)?suelo\b(?!\s+(?:de|del)\s+(?:la\s+)?(?:bano|aseo|cocina|terraza))/g,' quitar suelo, suelo flotante '],
[/\b(?:poner|colocar)\s+(baldosa|baldosas|gres|porcelanico)\b(?![^,.;]*\b(?:pared|paredes)\b)/g,' baldosa en el suelo '],
[/\bpulir\s+(?:el\s+)?(parquet|parque|suelo|tarima)\b/g,' acuchillar '],
[/\b(?:suelo|piso)\s+(?:esta\s+)?(?:desnivelad\w*|torcid\w*|hundid\w*)\b|\bdesnivel\w*/g,' nivelar '],
/* material del cliente */
[/\b(?:azulej\w*|baldosa\w*|ceramica|gres)\b[^,.;]{0,40}\b(?:cliente|los pone|lo pone|las pone|la pone|compra|suyo|suyos|suyas)\b|\b(?:cliente|los pone|lo pone|las pone)\b[^,.;]{0,30}\b(?:azulej\w*|baldosa\w*)\b|\bsolo (?:colocar|colocarlos|colocarlas|ponerlos|ponerlas)\b/g,' alicatado material del cliente '],
/* pintura */
[/\bpint\w*\s+(?:todo\s+)?(?:el\s+|la\s+)?(?:piso|casa|vivienda)(?:\s+(?:entero|entera|completo|completa))?\b|\bpint\w*\s+toda la casa\b|\bpint\w*\s+todo el piso\b/g,' pintar paredes, pintar techos '],
[/\bpint\w*\s+(?:el\s+|los\s+)?techos?\b/g,' pintar techos '],
[/\b(falso techo[^,.;]*?)\s*,?\s*(?:y\s+)?pintarlo\b/g,'$1, pintar techos'],
[/\b(?:dejar|poner)\s+(?:las\s+)?paredes\s+lisas\b/g,' lijar paredes '],
/* tabiques */
[/\b(?:abrir|unir|juntar)\s+(?:la\s+)?cocina\s+(?:al|con el|y el)\s+salon\b|\bcocina\s+(?:abierta|americana)\b|\bjuntar\s+(?:dos|las)\s+(?:habitaciones|cuartos)\b|\bunir\s+(?:dos|las)\s+(?:habitaciones|cuartos)\b/g,' tirar tabique '],
[/\b(?:dividir|separar|partir)\b[^,.;]{0,30}\b(?:con\s+)?(?:un\s+)?(?:tabique|pared|pladur)\b|\bhacer\s+(?:una\s+)?habitacion\s+(?:nueva|mas)\b/g,' hacer tabique de pladur '],
/* electricidad */
[/\b(?:sacar|hacer|tramitar|pedir)\s+(?:el\s+)?boletin\w*(?:\s+de\s+la\s+luz|\s+electrico)?\b/g,' boletin '],
[/\b(?:cambiar|renovar|poner nuevo)\s+(?:el\s+)?cablead\w*\b|\b(?:poner|cambiar)\s+enchufes\b[^,.;]{0,25}\b(?:todo|toda|casa|piso)\b|\binstalacion electrica\b[^,.;]{0,30}\b(?:vieja|antigua|mal)\b/g,' instalacion electrica '],
/* cocina y puertas */
[/\b(?:lucir|enlucir|dar yeso a)\s+(?:las\s+)?paredes\s+(?:de\s+)?(?:la\s+)?cocina\b/g,' lucir cocina '],
[/\b(?:cambiar|poner|colocar|montar)\s+(?:la\s+|una\s+)?puerta\s+(?:de\s+)?(?:la\s+)?(?:entrada|calle|principal|casa)\b|\bpuerta\s+(?:blindada|acorazada)\b/g,' puerta de entrada '],
/* baño suelto */
[/\bpicar\s+(?:todo\s+)?(?:el\s+)?(bano|aseo)\b/g,' quitar alicatado de las paredes del bano, picar suelo del bano '],
[/\b(?:cambiar|poner|colocar)\s+(?:el\s+|un\s+)?(?:vater|water|inodoro|retrete)\b/g,' quitar sanitarios, colocar inodoro nuevo '],
[/\bno tiene ventana\b|\bsin ventana\b/g,' extractor '],
[/\bmueble\b(?!\s+(?:de\s+|del\s+)?(?:cocina|pladur|tele|television|bano|lavabo))/g,function(m,o,all){return /\b(bano|aseo|lavabo|ducha|plato)\b/.test(all)?'mueble de bano':m}]
];
function traducir(txt){REGLAS.forEach(function(r){txt=txt.replace(r[0],r[1])});return txt.replace(/\s+/g,' ').replace(/\s+,/g,',').replace(/,\s*,/g,',')}
window.traducirFrase=traducir;

/* medidas de un trozo de frase: "2 por 1,80", "4 metros cuadrados", "de 5 metros" (en una estancia es suelo) */
function medidaTrozo(fr){var r={suelo:0,perim:0,alto:0};
var lxa=fr.match(/(\d+(?:[.,]\d+)?)\s*(?:m|metros)?\s*(?:de\s+largo\s+)?(?:x|por)\s*(\d+(?:[.,]\d+)?)/);
if(lxa){var L=num(lxa[1]),A=num(lxa[2]);if(L>0&&A>0&&L<40&&A<40){r.suelo=n2(L*A);r.perim=n2(2*(L+A))}}
if(!r.suelo){var m=fr.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metros cuadrados|metros|m)\b(?!\s*(?:de\s+)?(?:alto|altura|lineales))/);if(m)r.suelo=num(m[1])}
var al=fr.match(/(\d+(?:[.,]\d+)?)\s*(?:m|metros)?\s*de\s*(?:alto|altura)\b/);if(al)r.alto=num(al[1]);
return r}
var NUMS={un:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6};
function cuantos(fr,pal){var m=fr.match(new RegExp('\\b(un|una|dos|tres|cuatro|cinco|seis|\\d)\\s+(?:'+pal+')'));if(!m)return 1;return NUMS[m[1]]||parseInt(m[1])||1}

/* ---------- 2) paquetes con preguntas ---------- */
var PAQ={
bano:{nombre:'Baño',preg:[
 {k:'ducha',t:'¿Ducha o bañera?',ops:[['ducha','Plato de ducha'],['banera','Bañera'],['nada','Se deja la que hay']]},
 {k:'ventana',t:'¿Tiene ventana?',ops:[[true,'Sí'],[false,'No (pongo extractor)']]},
 {k:'puerta',t:'¿Se cambia la puerta?',ops:[[true,'Sí'],[false,'No']]},
 {k:'techo',t:'¿Falso techo de pladur?',ops:[[true,'Sí'],[false,'No, solo pintar']]},
 {k:'mueble',t:'¿Mueble de lavabo con espejo?',ops:[[true,'Sí'],[false,'No']]}],
 def:{ducha:'ducha',ventana:true,puerta:false,techo:true,mueble:true}},
cocina:{nombre:'Cocina',preg:[
 {k:'paredes',t:'Paredes: ¿azulejo o lucidas y pintadas?',ops:[['azulejo','Azulejo'],['lucir','Lucir y pintar']]},
 {k:'suelo',t:'¿Suelo nuevo de baldosa?',ops:[[true,'Sí'],[false,'No']]},
 {k:'muebles',t:'¿Montamos los muebles nuevos?',ops:[[true,'Sí'],[false,'No, los monta otro']]},
 {k:'ventana',t:'¿Tiene ventana?',ops:[[true,'Sí'],[false,'No']]},
 {k:'puerta',t:'¿Puerta?',ops:[['no','No se toca'],['normal','Puerta nueva'],['corredera','Corredera empotrada']]},
 {k:'techo',t:'¿Falso techo de pladur?',ops:[[true,'Sí'],[false,'No']]}],
 def:{paredes:'azulejo',suelo:true,muebles:true,ventana:true,puerta:'no',techo:false}},
hab:{nombre:'Habitación',preg:[
 {k:'paredes',t:'Paredes:',ops:[['gotele','Quitar gotelé y pintar'],['pintar','Solo pintar']]},
 {k:'suelo',t:'Suelo:',ops:[['tarima','Quitar el que hay y tarima nueva'],['tarima0','Tarima nueva encima'],['no','No se toca']]},
 {k:'puerta',t:'¿Puerta nueva?',ops:[[true,'Sí'],[false,'No']]},
 {k:'ventana',t:'¿Tiene ventana?',ops:[[true,'Sí'],[false,'No']]},
 {k:'armario',t:'¿Montar armario?',ops:[[true,'Sí'],[false,'No']]}],
 def:{paredes:'pintar',suelo:'no',puerta:false,ventana:true,armario:false}},
piso:{nombre:'Piso entero',preg:[
 {k:'banos',t:'¿Cuántos baños se reforman?',ops:[[0,'Ninguno'],[1,'Uno'],[2,'Dos']]},
 {k:'cocina',t:'¿Se reforma la cocina?',ops:[[true,'Sí'],[false,'No']]},
 {k:'luz',t:'¿Instalación eléctrica nueva?',ops:[[true,'Sí'],[false,'No']]},
 {k:'calef',t:'¿Calefacción nueva?',ops:[[true,'Sí'],[false,'No']]},
 {k:'paredes',t:'Paredes:',ops:[['gotele','Quitar gotelé y pintar'],['pintar','Solo pintar']]},
 {k:'suelo',t:'Suelo:',ops:[['tarima','Quitar el que hay y tarima nueva'],['no','No se toca']]},
 {k:'puertas',t:'¿Cuántas puertas de paso nuevas?',ops:[[0,'Ninguna'],[3,'Tres'],[4,'Cuatro'],[5,'Cinco'],[6,'Seis']]}],
 def:{banos:1,cocina:true,luz:true,calef:false,paredes:'gotele',suelo:'tarima',puertas:4}}
};
var EST={bano:'el baño',cocina:'la cocina',hab:'la habitación',piso:'el piso'};

/* lineas de una estancia segun sus respuestas */
function lineasDe(pk){var s=pk.r,S=pk.suelo>0?pk.suelo:0,A=pk.alto>0?pk.alto:ALTO,L=[];
var perim=pk.perim>0?pk.perim:(S>0?n2(4*Math.sqrt(S)):0);
function pared(puertas,ventanas){if(!(S>0))return 1;return Math.max(1,n2(perim*A-puertas*1.6-ventanas*1.2))}
function add(id,q,suf){var t=T(id);if(!t)return;L.push({d:t.d+(suf||''),q:q>0?q:1,u:t.u,p:t.p,tid:id})}
function libre(d,q,u){L.push({d:d,q:q,u:u,p:(window.aprendidoParecido?aprendidoParecido(d):0)||0})}
var sq=S>0?S:1;
if(pk.tipo==='bano'){var W=pared(1,s.ventana?1:0);
 add('san',1);add('ali',W);add('sol',sq);add('dfon',1);add('fba',1);
 add('alc',W,' — en las paredes');add('alc',sq,' — en el suelo');
 if(s.ducha==='ducha')add('pd7',1);else if(s.ducha==='banera')libre('Suministro y colocación de bañera de acero esmaltado de 160x70 cm',1,'ud');
 if(s.techo)add('tec',sq);add('pit',sq);
 if(s.mueble)add('mba',1);
 if(s.ventana===false)add('vent',1);
 if(s.puerta){add('pue',1);add('pub',1)}
 add('con',1)}
if(pk.tipo==='cocina'){var W2=pared(1,s.ventana?1:0);
 add('coc',1);add('ali',W2);if(s.suelo)add('sol',sq);add('dfon',1);add('fco',1);
 if(s.paredes==='azulejo')add('alc',W2,s.suelo?' — en las paredes':'');else{add('luc',W2);add('pip',W2)}
 if(s.suelo)add('alc',sq,' — en el suelo');
 if(s.techo)add('tec',sq);add('pit',sq);
 if(s.muebles)add('mco',1);
 if(s.puerta==='normal'){add('pue',1);add('pub',1)}else if(s.puerta==='corredera'){add('pue',1);add('cor',1)}
 add('con',1)}
if(pk.tipo==='hab'){var W3=pared(1,s.ventana?1:0);
 if(s.paredes==='gotele')add('lija',W3);add('pip',W3);add('pit',sq);
 if(s.suelo==='tarima'){add('sue',sq);add('rod',perim>0?n2(perim-0.8):1)}
 if(s.suelo!=='no'){add('flo',sq);add('ron',perim>0?n2(perim-0.8):1)}
 if(s.puerta){add('pue',1);add('pub',1)}
 if(s.armario)add('mar',1)}
if(pk.tipo==='piso'){var mojado=paqs().filter(function(h){return h.padre===pk.id}).reduce(function(a,h){return a+(h.suelo||0)},0);var Sseco=S>0?Math.max(1,n2(S-mojado)):1;var Wp=S>0?n2(Sseco*2.7):1;/* paredes de un piso: unas 2,7 veces el suelo */
 if(s.luz){add('ins',1);add('ele',1);add('bol',1)}
 if(s.calef)add('cal',1);
 if(s.paredes==='gotele')add('lija',Wp);add('pip',Wp);add('pit',Sseco);
 if(s.suelo==='tarima'){add('sue',Sseco);add('rod',S>0?n2(S*0.9):1);add('flo',Sseco);add('ron',S>0?n2(S*0.9):1)}
 if(s.puertas>0){add('pue',s.puertas);add('pub',s.puertas)}
 add('con',1);add('limf',1)}
L.forEach(function(l){l.paqId=pk.id;l.paquete=PAQ[pk.tipo].nombre+(pk.n>1?' '+pk.n:'')});
return L}

function unaVez(){var v={};cur.lineas=cur.lineas.filter(function(l){if(!l.paqId||['con','limf'].indexOf(l.tid)<0)return true;if(v[l.tid])return false;v[l.tid]=1;return true})}
function paqs(){cur.paqs=cur.paqs||[];return cur.paqs}
function rehacer(pk,sinLeer){if(!sinLeer)leer();var antes={};cur.lineas.forEach(function(l){if(l.paqId===pk.id)antes[l.d]=l});
var idx=cur.lineas.findIndex(function(l){return l.paqId===pk.id});if(idx<0)idx=cur.lineas.length;
cur.lineas=cur.lineas.filter(function(l){return l.paqId!==pk.id});
var nuevas=lineasDe(pk).map(function(l){var a=antes[l.d];if(a&&a.p>0)l.p=a.p;return l});/* respeta el precio que ya haya puesto */
cur.lineas.splice.apply(cur.lineas,[Math.min(idx,cur.lineas.length),0].concat(nuevas));
/* el piso con baños y cocina: cada uno con sus preguntas */
if(pk.tipo==='piso'){var hijos=paqs().filter(function(x){return x.padre===pk.id});
 var quiere={bano:pk.r.banos||0,cocina:pk.r.cocina?1:0};
 ['bano','cocina'].forEach(function(tp){var ya=hijos.filter(function(h){return h.tipo===tp});
  for(var i=ya.length;i<quiere[tp];i++){var h=nuevoPaq(tp,{suelo:0,perim:0,alto:pk.alto},i+1);h.padre=pk.id;cur.lineas=cur.lineas.concat(lineasDe(h))}
  ya.slice(quiere[tp]).forEach(function(h){cur.lineas=cur.lineas.filter(function(l){return l.paqId!==h.id});cur.paqs=paqs().filter(function(x){return x!==h})})})}
unaVez()}
var __n=0;
function nuevoPaq(tipo,med,n){var pk={id:'pq'+Date.now().toString(36)+(__n++),tipo:tipo,suelo:med.suelo||0,perim:med.perim||0,alto:med.alto||0,n:n||1,r:Object.assign({},PAQ[tipo].def),hechas:{}};paqs().push(pk);return pk}

/* tarjeta de preguntas */
function tarjeta(){var P=paqs().filter(function(pk){return cur.lineas.some(function(l){return l.paqId===pk.id})});if(!P.length)return '';
var h='<div id="paqBox" style="background:#E8F1FB;border-left:4px solid #2B6CB0;padding:10px;border-radius:8px;margin-top:8px;font-size:14px">';
h+='<b>Para afinar el precio, contesta esto</b><div style="font-size:12px;color:#555;margin-bottom:6px">Lo marcado en color es lo que he puesto. Cada respuesta cambia las líneas al momento.</div>';
P.forEach(function(pk){var tit=PAQ[pk.tipo].nombre+(pk.n>1?' '+pk.n:'');
 h+='<div style="background:#fff;border-radius:8px;padding:8px;margin-top:8px"><div style="font-weight:700;margin-bottom:4px">'+tit+'</div>';
 var faltaMed=!(pk.suelo>0);
 h+='<div style="margin:4px 0'+(faltaMed?';background:#FDECEA;padding:6px;border-radius:6px':'')+'">'+(faltaMed?'<b style="color:#B3261E">¿Cuántos metros tiene '+EST[pk.tipo]+'?</b> Sin esto las cantidades van a 1.':'Mide <b>'+fmt(pk.suelo)+' m²</b>'+(pk.perim>0?' ('+fmt(pk.perim)+' m de perímetro)':'')+'.')+
  '<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap"><input id="pm_'+pk.id+'" inputmode="decimal" placeholder="'+(pk.tipo==='piso'?'80':'2 x 1,8 o 4')+'" style="flex:1;min-width:110px;padding:8px;font-size:15px"><button class="mini ok" onclick="paqMedida(\''+pk.id+'\')">'+(faltaMed?'Poner':'Cambiar')+'</button></div>'+
  (pk.tipo!=='piso'?'<div style="font-size:12px;color:#555;margin-top:2px">Largo por ancho o los metros cuadrados. Alto de pared: '+fmt(pk.alto>0?pk.alto:ALTO)+' m.</div>':'')+'</div>';
 PAQ[pk.tipo].preg.forEach(function(q){h+='<div style="margin-top:6px">'+q.t+' ';
  q.ops.forEach(function(o){var on=pk.r[q.k]===o[0];h+='<button class="mini '+(on?'ok':'sec')+'" style="margin:2px" onclick="paqResp(\''+pk.id+'\',\''+q.k+'\','+JSON.stringify(o[0]).replace(/"/g,'&quot;')+')">'+o[1]+'</button>'});h+='</div>'});
 h+='</div>'});
var ceros=cur.lineas.filter(function(l){return l.paqId&&!(l.p>0)});if(ceros.length)h+='<div style="margin-top:8px;background:#FBE9E2;border-left:4px solid #B3261E;padding:8px;border-radius:6px"><b>Sin precio en tu tarifa:</b> '+ceros.map(function(l){return '«'+l.d.slice(0,50)+'»'}).join(', ')+'. Ponle el precio abajo y la próxima vez ya lo sabe.</div>';
return h+'</div>'}
function pintarTarjeta(){var ci=document.getElementById('convInfo');if(!ci)return;var old=document.getElementById('paqBox');if(old)old.remove();var h=tarjeta();if(h)ci.insertAdjacentHTML('beforeend',h)}
window.paqResp=function(id,k,v){var pk=paqs().find(function(x){return x.id===id});if(!pk)return;pk.r[k]=v;pk.hechas[k]=1;rehacer(pk);renderLineas();try{autoGuardar()}catch(_){}pintarTarjeta()};
window.paqMedida=function(id){var pk=paqs().find(function(x){return x.id===id});var i=document.getElementById('pm_'+id);if(!pk||!i)return;var v=norm(i.value||'');
 var m=medidaTrozo(/\d\s*(x|por)\s*\d/.test(v)?v:v+' metros');if(!(m.suelo>0)){i.style.borderColor='#B3261E';i.focus();return}pk.suelo=m.suelo;pk.perim=m.perim;if(m.alto)pk.alto=m.alto;rehacer(pk);if(pk.padre){var pd=paqs().find(function(x){return x.id===pk.padre});if(pd)rehacer(pd,true)}renderLineas();try{autoGuardar()}catch(_){}pintarTarjeta()};
window.pintarPreguntasPaq=pintarTarjeta;

/* ---------- 3) el dictado: traduce, saca las estancias enteras y llama al de siempre ---------- */
var convertir0=window.convertir;
window.convertir=function(){var ta=document.getElementById('dictado');var bruto=ta.value;if(!bruto.trim())return;leer();
var txt=traducir(' '+norm(bruto)+' ');var nuevos=[];
var trozos=txt.replace(/(\d)[,.](\d)/g,'$1#$2').split(/([,;.:])/).map(function(x){return x.replace(/(\d)#(\d)/g,'$1,$2')});var resto=[];
var ultEst=null,ultObj=null,ultPaq=null;
for(var i=0;i<trozos.length;i++){var fr=trozos[i];if(/^[,;.:]$/.test(fr)){resto.push(fr);continue}
 var tipo=null,c=1;
 /* lo que se refiere a lo dicho antes: "quiero ponerlo moderno", "hay que hacerla nueva", "y la cocina" */
 var estAqui=(fr.match(/\b(banos?|aseos?|cocina|piso|casa|vivienda|habitacion|salon|dormitorio)\b/)||[])[1];
 if(/\b(?:poner|hacer|dejar|reformar|renovar|cambiar|arreglar|modernizar)(?:lo|la|los|las)\b|\b(?:ponerlo|hacerla)\b/.test(fr)&&/\b(modern\w*|nuev\w*|entero|entera|bonit\w*|al dia|a estrenar|completo|completa|todo|toda)\b|\breformarl[oa]\b|\brenovarl[oa]\b/.test(fr)){var e=estAqui||ultEst;if(e)fr=' reformar el '+e+' '+(fr.match(/\d+(?:[.,]\d+)?\s*(?:x|por)?\s*\d*(?:[.,]\d+)?\s*(?:m2|metros cuadrados|metros|m)?/)||[''])[0]}
 else if(ultPaq&&/^\s*(?:en\s+)?(?:el|la|los|las|mi)?\s*(banos?|aseos?|cocina|habitacion(?:es)?|salon|dormitorios?)\b[^a-z]*(?:de\s+\d.*)?$/.test(fr)){fr=' reformar el '+fr.trim()+' '}
 else if(/^\s*(?:y\s+)?(?:poner|colocar|montar|meter)\s+(?:uno|una|otro|otra|los|las)?\s*(?:nuev[oa]s?)\s*$/.test(fr)&&ultObj){fr={cocina:' montar cocina ',rodapie:' rodapie nuevo ',puerta:' puertas nuevas ',suelo:' suelo flotante ',plato:' plato de ducha ',banera:' plato de ducha '}[ultObj]||fr}
 if(estAqui)ultEst=estAqui;var ob=(fr.match(/\b(cocina|rodapie|puerta|suelo|plato|banera)\w*/)||[])[1];if(ob)ultObj=ob;
 if(RE_PISO.test(fr))tipo='piso';
 else if(RE_BANO.test(fr)&&!CONCRETO_BANO.test(fr.replace(RE_BANO,'')))tipo='bano';
 else if(RE_COCINA.test(fr)&&!CONCRETO_COC.test(fr.replace(RE_COCINA,'')))tipo='cocina';
 else if(RE_HAB.test(fr)&&!CONCRETO_HAB.test(fr.replace(RE_HAB,'')))tipo='hab';
 /* "baño: quitar bañera, plato..." -> son trabajos sueltos del baño, no el paquete */
 if(!tipo){resto.push(fr);ultPaq=null;continue}
 ultPaq=tipo;
 if(tipo==='bano')c=cuantos(fr,'banos|aseos');if(tipo==='hab')c=cuantos(fr,'habitaciones|dormitorios|cuartos');if(tipo==='cocina')c=1;
 var med=medidaTrozo(fr);
 /* la medida puede venir en la frase de al lado: "reformar el baño, que tiene 4 metros" */
 if(!(med.suelo>0)&&trozos[i+2]&&/^\s*(?:que\s+)?(?:tiene|mide|son|de)\b/.test(trozos[i+2])){med=medidaTrozo(trozos[i+2]);trozos[i+2]=''}
 /* "y alicatar" dentro del baño: ya va en el paquete */
 for(var k=1;k<=c;k++)nuevos.push({tipo:tipo,med:med,n:c>1?k:1});resto.push(' ')}
var txt2=resto.join('');
var n0=cur.lineas.length;
if(txt2.replace(/[^a-z]/g,'').length>=3){ta.value=txt2;try{convertir0()}finally{ta.value=bruto}leer()}
var hechos=[];
var sinVent=/\b(no tiene|sin|no hay|no lleva)\s+(?:ninguna\s+)?ventana/.test(norm(bruto)),conVent=!sinVent&&/\b(tiene|con|hay)\s+(?:una\s+)?ventana/.test(norm(bruto));
nuevos.forEach(function(x){var pk=nuevoPaq(x.tipo,x.med,x.n);if((sinVent||conVent)&&'ventana' in pk.r){pk.r.ventana=!sinVent;pk.hechas.ventana=1}cur.lineas=cur.lineas.concat(lineasDe(pk));hechos.push(pk);if(x.tipo==='piso')rehacer(pk)});
/* lo que el de siempre metio y ya va en una estancia: fuera duplicados */
if(hechos.length){unaVez();cur.lineas=cur.lineas.filter(function(l){if(l.paqId)return true;var dup=cur.lineas.some(function(o){return o.paqId&&o.d.indexOf(l.d)===0});return !dup})}
renderLineas();try{autoGuardar()}catch(_){}
var ci=document.getElementById('convInfo');if(!ci)return;
var añad=cur.lineas.length-n0;
if(hechos.length||añad>0){if(/No he reconocido/.test(ci.textContent)||!ci.textContent.trim()||hechos.length&&!/trabajo/.test(ci.textContent)){ci.innerHTML='<b style="color:#1E6B3A">'+añad+(añad===1?' trabajo añadido':' trabajos añadidos')+'.</b>'}
 /* el aviso viejo de "baño completo: he metido todos..." sobra: ahora pregunto */
 ci.querySelectorAll('div').forEach(function(d){if(/he metido todos los trabajos que suele llevar/.test(d.textContent))d.remove()})}
pintarTarjeta()};

/* al abrir un presupuesto con estancias sin medir, vuelven las preguntas */
var renderLineas0=window.renderLineas;
})();
/* Dictar con voz: pide permiso al micrófono, escribe mientras hablas y, si no puede escuchar, dice por qué y qué hacer */
(function(){
 function aviso(h){var b=document.getElementById('convInfo');if(b){b.innerHTML=h;b.style.display='block';b.style.marginTop='8px'}}
 var SIN_PERMISO='<span style="color:#B3261E;font-weight:700">No tengo permiso para usar el micrófono.</span> Toca el candado o los tres puntos de arriba en Chrome, entra en «Permisos» y activa el micrófono. Mientras tanto, puedes tocar el micro del teclado y hablar igual.';
 window.dictar=function(){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;var b=document.getElementById('btnVoz'),ta=document.getElementById('dictado');
  if(!SR){aviso('Este navegador no dicta. Toca el micro del teclado (al lado de la barra espaciadora) y habla igual; en Android, mejor con Chrome.');if(ta)ta.focus();return}
  var arranca=function(){var r=new SR();r.lang='es-ES';r.continuous=true;r.interimResults=true;var base=ta.value,oido=false;
   b.textContent='● Te escucho… (toca para parar)';b.classList.add('warn');aviso('Habla tranquilo: voy escribiendo lo que dices.');
   r.onresult=function(e){var fin='',prov='';for(var i=0;i<e.results.length;i++){var t=e.results[i][0].transcript;if(e.results[i].isFinal)fin+=(fin?' ':'')+t;else prov+=t}oido=true;ta.value=(base?base+' ':'')+fin+(prov?' '+prov:'')};
   r.onerror=function(e){var c=e&&e.error;if(c==='not-allowed'||c==='service-not-allowed')aviso(SIN_PERMISO);else if(c==='no-speech')aviso('No te he oído. Vuelve a darle a «Dictar con voz» y habla cerca del móvil.');else if(c==='network')aviso('Para dictar hace falta internet. Si no tienes, toca el micro del teclado.');else if(c==='audio-capture')aviso('No encuentro el micrófono. Toca el micro del teclado y habla igual.');else if(c!=='aborted')aviso('No he podido escucharte ('+c+'). Toca el micro del teclado y habla igual.')};
   r.onend=function(){b.textContent='Dictar con voz';b.classList.remove('warn');b.onclick=window.dictar;if(oido&&ta.value.trim()){aviso('');setTimeout(function(){try{convertir()}catch(_){}} ,300)}};
   b.onclick=function(){try{r.stop()}catch(_){}};try{r.start()}catch(err){aviso('No he podido arrancar el micrófono. Toca el micro del teclado y habla igual.')}};
  if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){try{s.getTracks().forEach(function(t){t.stop()})}catch(_){}arranca()}).catch(function(err){if(err&&(err.name==='NotAllowedError'||err.name==='SecurityError'))aviso(SIN_PERMISO);else arranca()})}
  else arranca()};
})();
