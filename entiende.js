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
/* una estancia nombrada dentro de «reformar … casa» */
var ESTANCIA_EN=/\b(banos?|aseos?|cocinas?|habitacion\w*|dormitorio\w*|salon\w*|cuartos?|terraza\w*|pasillo\w*|balcon\w*|trastero\w*|despensa\w*)\b/;
/* si la frase ya dice trabajos concretos, no es "la estancia entera" */
var CONCRETO_BANO=/tuberi|fontaner|banera|ducha|plato|azulej|sanitari|inodoro|vater|water|lavabo|mueble|techo|extractor|ventila|puerta|pint|picar|quitar|grifo|mampara|suelo/;
var CONCRETO_COC=/mueble|suelo|pared|fontaner|techo|puerta|corredera|lucir|azulej|tabique|abrir|encimera|fregadero|campana|pint|quitar|desmont|montar|alicat/;
var CONCRETO_HAB=/suelo|tarima|parquet|pint|gotel|puerta|armario|pared|techo|enchuf|ventana|quitar|tirar|juntar|dividir|tabique/;

var REGLAS=[
/* el micro no pone comas: «una casa de 87 metros cuadrados tirar el tabique…» → un trabajo nuevo detrás de una medida es otra frase */
[/(\d(?:[.,]\d+)?\s*(?:m2|m²|metros cuadrados|metros|mts?|m)|\bcuadrados)\s+(?=(?:quitar|poner|tirar|picar|pintar|cambiar|alicatar|lijar|enlucir|lucir|derribar|montar|instalar|colocar|reformar|renovar|abrir|cerrar|levantar|arrancar|sacar|nivelar|empapelar|alisar|rascar|arreglar|modernizar|desmontar|embaldosar|forrar|aislar|hacer|meter|echar|juntar|unir|dividir|separar|acuchillar|barnizar)\b)/g,'$1, '],
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
[/\b(?:cambiar|poner|colocar|montar|meter)\s+(?:el\s+|un\s+|uno\s+)?(?:vater|water|inodoro|retrete)(?:\s+nuev[oa]s?)?\b/g,' quitar sanitarios, colocar inodoro nuevo '],
[/(^|[,;.]|\by\b)\s*(?:un\s+|el\s+)?(?:vater|water|inodoro|retrete)\s+nuev[oa]s?\b/g,'$1 quitar sanitarios, colocar inodoro nuevo '],
[/\bno tiene ventana\b|\bsin ventana\b/g,' extractor '],
[/\bmueble\b(?!\s+(?:de\s+|del\s+)?(?:cocina|pladur|tele|television|bano|lavabo))/g,function(m,o,all){return /\b(bano|aseo|lavabo|ducha|plato)\b/.test(all)?'mueble de bano':m}]
];
function traducir(txt){REGLAS.forEach(function(r){txt=txt.replace(r[0],r[1])});return txt.replace(/\s+/g,' ').replace(/\s+,/g,',').replace(/,\s*,/g,',')}
window.traducirFrase=traducir;

/* medidas dichas en letra («cuatro metros», «noventa y cuatro metros cuadrados», «ciento veinte metros», «cuatro por tres») a número;
   solo delante de una medida o detrás de «por», para no tocar «dos baños» ni «una casa» */
var NUMLET={cero:0,un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintiun:21,veintiuna:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,cien:100,ciento:100,doscientos:200,doscientas:200,trescientos:300,trescientas:300,cuatrocientos:400,cuatrocientas:400,quinientos:500,quinientas:500,seiscientos:600,seiscientas:600,setecientos:700,setecientas:700,ochocientos:800,ochocientas:800,novecientos:900,novecientas:900};
function valorLetra(fr){var t=norm(fr).split(/\s+/).filter(Boolean),v=0,ok=false;for(var i=0;i<t.length;i++){var w=t[i];if(w==='y'||w==='con')continue;if(w==='medio'||w==='media'){v+=0.5;continue}if(w in NUMLET){v+=NUMLET[w];ok=true}else return null}return ok?v:null}
function cifrasMedida(s){var W='(?:'+Object.keys(NUMLET).sort(function(a,b){return b.length-a.length}).join('|')+')';
 var F='\\b('+W+'(?:\\s+(?:y\\s+)?'+W+')*(?:\\s+y\\s+medio)?)';
 var sinT=function(x){return x.normalize('NFD').replace(/[\u0300-\u036f]/g,'')};var t=sinT(String(s||''));
 t=t.replace(new RegExp(F+'(?=\\s*(?:metros?|mts?|m2|m²|m\\b|por\\b|x\\b|de\\s+(?:largo|ancho|alto)))','gi'),function(m,g){var v=valorLetra(g);return v==null?m:String(v).replace('.',',')});
 t=t.replace(new RegExp('(\\d(?:[.,]\\d+)?\\s*(?:metros?\\s+|m\\s+)?(?:de\\s+largo\\s+)?)(por|x)\\s+'+F+'\\b','gi'),function(m,a,p,g){var v=valorLetra(g);return v==null?m:a+p+' '+String(v).replace('.',',')});
 t=t.replace(/\b(\d+)\s+(metros?|m)\s+y\s+medio\b/gi,function(m,n,u){return n+',5 '+u});
 return t}
window.cifrasMedida=cifrasMedida;
/* el micro del móvil a veces repite lo dicho («quiero hacer una reforma quiero hacer una reforma de una casa…»):
   un trozo de 4 palabras o más dicho dos veces seguidas se queda en una */
function quitarRepes(s){var w=String(s||'').split(/\s+/).filter(Boolean),k=function(x){return norm(x).replace(/[^a-z0-9]/g,'')};
 for(var vuelta=0;vuelta<12;vuelta++){var hecho=false,K=w.map(k);
  fuera:for(var L=Math.floor(w.length/2);L>=4;L--){for(var i=0;i+2*L<=w.length;i++){var igual=true;for(var j=0;j<L;j++){if(K[i+j]!==K[i+L+j]){igual=false;break}}
   if(igual){w.splice(i+L,L);hecho=true;break fuera}}}
  if(!hecho)break}
 return w.join(' ')}
window.quitarRepes=quitarRepes;
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
 {k:'banos',t:'¿Cuántos baños se reforman?',num:[0,6]},
 {k:'cocina',t:'¿Se reforma la cocina?',ops:[[true,'Sí'],[false,'No']]},
 {k:'luz',t:'¿Instalación eléctrica nueva?',ops:[[true,'Sí'],[false,'No']]},
 {k:'calef',t:'¿Calefacción nueva?',ops:[[true,'Sí'],[false,'No']]},
 {k:'paredes',t:'Paredes:',ops:[['gotele','Quitar gotelé y pintar'],['pintar','Solo pintar']]},
 {k:'suelo',t:'Suelo:',ops:[['tarima','Quitar el que hay y tarima nueva'],['no','No se toca']]},
 {k:'puertas',t:'¿Cuántas puertas de paso nuevas?',num:[0,40]}],
 def:{banos:1,cocina:true,luz:true,calef:false,paredes:'gotele',suelo:'tarima',puertas:4}}
};
var EST={bano:'el baño',cocina:'la cocina',hab:'la habitación',piso:'el piso'};

/* lineas de una estancia segun sus respuestas */
function lineasDe(pk){var s=pk.r,S=pk.suelo>0?pk.suelo:0,A=pk.alto>0?pk.alto:ALTO,L=[];
/* en el presupuesto cada partida dice de qué estancia es («— baño», «— cocina»): si no, el techo del baño y el de la cocina parecen la misma partida repetida */
var tag={bano:'baño',cocina:'cocina',hab:'habitación'}[pk.tipo]||'';if(tag&&pk.n>1)tag+=' '+pk.n;
var perim=pk.perim>0?pk.perim:(S>0?n2(4*Math.sqrt(S)):0);
function pared(puertas,ventanas){if(!(S>0))return 1;return Math.max(1,n2(perim*A-puertas*1.6-ventanas*1.2))}
function add(id,q,suf){var t=T(id);if(!t)return;var sf=suf||'';if(tag&&id!=='con'&&id!=='limf')sf=' — '+tag+(sf?', '+sf.replace(/^\s*—\s*/,''):'');L.push({d:t.d+sf,q:q>0?q:1,u:t.u,p:t.p,tid:id})}
function libre(d,q,u){var pr=(window.aprendidoParecido?aprendidoParecido(d):0)||0;L.push({d:tag?d+' — '+tag:d,q:q,u:u,p:pr})}
var sq=S>0?S:1;
if(pk.tipo==='bano'){var W=pared(1,s.ventana?1:0);
 add('san',1);add('ali',W);add('sol',sq);add('dfon',1);add('fba',1);
 add('alc',W,' — en las paredes');add('alc',sq,' — en el suelo');
 if(s.ducha==='ducha')add('pd7',1);else if(s.ducha==='banera'){add('ban',1);L.forEach(function(l){if(l.tid==='fba')l.d=l.d.replace('plato de ducha','bañera')})}
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
 if(s.suelo==='tarima'){add('sue',Sseco);add('rod',S>0?n2(Sseco*0.9):1);add('flo',Sseco);add('ron',S>0?n2(Sseco*0.9):1)}
 if(s.puertas>0){add('pue',s.puertas);add('pub',s.puertas)}
 add('con',1);add('limf',1)}
L.forEach(function(l){l.paqId=pk.id;l.paquete=PAQ[pk.tipo].nombre+(pk.n>1?' '+pk.n:'')});
return L}

function unaVez(){var v={};cur.lineas=cur.lineas.filter(function(l){if(!l.paqId||['con','limf'].indexOf(l.tid)<0)return true;if(v[l.tid])return false;v[l.tid]=1;return true})}
function paqs(){cur.paqs=cur.paqs||[];return cur.paqs}
/* la misma partida de la misma estancia, aunque cambie cómo se llama (para respetar el precio que ya se haya puesto a mano) */
function claveL(l){var d=String(l.d||'');return (l.tid||d.replace(/ — .*$/,''))+'|'+(/en las paredes/.test(d)?'p':/en el suelo/.test(d)?'s':'')}
/* los metros de un baño o una cocina sin medir, sacados de los de la casa (se dice en su tarjeta y en la revisión) */
function metrosCalculados(tipo,S){var r=function(x){return Math.round(x*2)/2},c=function(x,a,b){return Math.min(b,Math.max(a,x))};
 if(!(S>0))return 0;if(tipo==='bano')return c(r(S*0.05),3.5,6);if(tipo==='cocina')return c(r(S*0.11),6,14);return 0}
window.metrosCalculados=metrosCalculados;
/* los metros que se dicen de un baño o de la cocina dentro de la frase del piso: «con dos baños de 4 metros», «la cocina de 10» */
function medidasDichas(t){var r={bano:[],cocina:[]},re=/\b(?:(un|una|dos|tres|\d)\s+)?(banos?|aseos?|cocinas?)\b(?=\s*(?:de|que mide|que tiene|mide|tiene|son)\s+\d)/g,m;
 while((m=re.exec(t))){var tipo=/^coc/.test(m[2])?'cocina':'bano',sub=t.slice(m.index+m[0].length,m.index+m[0].length+40).replace(/^\s*(?:de|que mide|que tiene|mide|tiene|son)\s+/,'');
  if(!/^\d+(?:[.,]\d+)?\s*(?:m2|m²|metros|mts?|m\b|x\b|por\b)/.test(sub))continue;var md=medidaTrozo(sub);if(!(md.suelo>0)||md.suelo>60)continue;
  var n=tipo==='cocina'?1:({un:1,una:1,dos:2,tres:3}[m[1]]||parseInt(m[1])||1);for(var k=0;k<n&&k<6;k++)r[tipo].push(md.suelo)}
 return r}
/* el piso con baños y cocina: cada uno con sus preguntas; los que no tienen metros, calculados por los de la casa */
function hijosDelPiso(pk){var hijos=paqs().filter(function(x){return x.padre===pk.id});
 var quiere={bano:pk.r.banos||0,cocina:pk.r.cocina?1:0};
 ['bano','cocina'].forEach(function(tp){var ya=hijos.filter(function(h){return h.tipo===tp});
  for(var i=ya.length;i<quiere[tp];i++){var h=nuevoPaq(tp,{suelo:0,perim:0,alto:pk.alto},i+1);h.padre=pk.id;var e=metrosCalculados(tp,pk.suelo);if(e>0){h.suelo=e;h.calculado=1}cur.lineas=cur.lineas.concat(lineasDe(h))}
  ya.slice(quiere[tp]).forEach(function(h){cur.lineas=cur.lineas.filter(function(l){return l.paqId!==h.id});cur.paqs=paqs().filter(function(x){return x!==h})})});
 if(pk.suelo>0)paqs().filter(function(h){return h.padre===pk.id&&(!(h.suelo>0)||h.calculado)}).forEach(function(h){var e=metrosCalculados(h.tipo,pk.suelo);if(e>0&&e!==h.suelo){h.suelo=e;h.perim=0;h.calculado=1;rehacer(h,true)}})}
function rehacer(pk,sinLeer){if(!sinLeer)leer();
if(pk.tipo==='piso')hijosDelPiso(pk);
var antes={};cur.lineas.forEach(function(l){if(l.paqId===pk.id)antes[claveL(l)]=l});
var idx=cur.lineas.findIndex(function(l){return l.paqId===pk.id});if(idx<0)idx=cur.lineas.length;
cur.lineas=cur.lineas.filter(function(l){return l.paqId!==pk.id});
var nuevas=lineasDe(pk).map(function(l){var a=antes[claveL(l)];if(a&&a.p>0)l.p=a.p;return l});/* respeta el precio que ya haya puesto */
cur.lineas.splice.apply(cur.lineas,[Math.min(idx,cur.lineas.length),0].concat(nuevas));
unaVez()}
var __n=0;
function nuevoPaq(tipo,med,n){var pk={id:'pq'+Date.now().toString(36)+(__n++),tipo:tipo,suelo:med.suelo||0,perim:med.perim||0,alto:med.alto||0,n:n||1,r:Object.assign({},PAQ[tipo].def),hechas:{}};paqs().push(pk);return pk}

/* una pregunta de cuántos: − número + */
function pasoNum(id,k,v,lim){var b='min-width:44px;font-size:20px;line-height:1;padding:6px 10px';
 return '<span style="display:inline-flex;align-items:center;gap:8px;vertical-align:middle;margin-top:2px">'+
 '<button class="mini sec" style="'+b+'" onclick="paqResp(\''+id+'\',\''+k+'\','+Math.max(lim[0],v-1)+')">\u2212</button>'+
 '<input value="'+v+'" inputmode="numeric" onchange="paqNum(\''+id+'\',\''+k+'\',this.value,'+lim[0]+','+lim[1]+')" style="width:58px;text-align:center;font-size:18px;font-weight:700;color:#111;padding:6px">'+
 '<button class="mini sec" style="'+b+'" onclick="paqResp(\''+id+'\',\''+k+'\','+Math.min(lim[1],v+1)+')">+</button></span>'}
window.paqNum=function(id,k,val,mn,mx){var v=parseInt(String(val||'').replace(/\D/g,''),10);if(!(v>=0))v=mn;setTimeout(function(){window.paqResp(id,k,Math.min(mx,Math.max(mn,v)))},0)};
/* tarjeta de preguntas */
function tarjeta(){var P=paqs().filter(function(pk){return cur.lineas.some(function(l){return l.paqId===pk.id})});if(!P.length)return '';
var h='<div id="paqBox" style="background:#E8F1FB;border-left:4px solid #2B6CB0;padding:10px;border-radius:8px;margin-top:8px;font-size:14px">';
h+='<b>Para afinar el precio, contesta esto</b><div style="font-size:12px;color:#555;margin-bottom:6px">Lo marcado en color es lo que he puesto. Cada respuesta cambia las líneas al momento.</div>';
P.forEach(function(pk){var tit=PAQ[pk.tipo].nombre+(pk.n>1?' '+pk.n:'');
 h+='<div style="background:#fff;border-radius:8px;padding:8px;margin-top:8px"><div style="font-weight:700;margin-bottom:4px">'+tit+'</div>';
 var faltaMed=!(pk.suelo>0),calc=!faltaMed&&pk.calculado,padre=calc&&paqs().find(function(x){return x.id===pk.padre});
 h+='<div style="margin:4px 0'+(faltaMed?';background:#FDECEA;padding:6px;border-radius:6px':calc?';background:#FFF4E5;padding:6px;border-radius:6px':'')+'">'+(faltaMed?'<b style="color:#B3261E">¿Cuántos metros tiene '+EST[pk.tipo]+'?</b> Sin esto las cantidades van a 1.':calc?'<b>Unos '+fmt(pk.suelo)+' m²</b>, calculados por '+(padre&&padre.suelo>0?'los '+fmt(padre.suelo)+' m² de la casa':'los metros de la casa')+'. Si sabes los metros, ponlos aquí.':'Mide <b>'+fmt(pk.suelo)+' m²</b>'+(pk.perim>0?' ('+fmt(pk.perim)+' m de perímetro)':'')+'.')+
  '<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap"><input id="pm_'+pk.id+'" inputmode="decimal" placeholder="'+(pk.tipo==='piso'?'Metros de la casa':'2 x 1,8 o 4')+'" style="flex:1;min-width:110px;padding:8px;font-size:15px"><button class="mini ok" onclick="paqMedida(\''+pk.id+'\')">'+(faltaMed?'Poner':'Cambiar')+'</button></div>'+
  (pk.tipo!=='piso'?'<div style="font-size:12px;color:#555;margin-top:2px">Largo por ancho o los metros cuadrados. Alto de pared: '+fmt(pk.alto>0?pk.alto:ALTO)+' m.</div>':'')+'</div>';
 PAQ[pk.tipo].preg.forEach(function(q){h+='<div style="margin-top:6px">'+q.t+' ';
  if(q.num){h+=pasoNum(pk.id,q.k,+pk.r[q.k]||0,q.num)+'</div>';return}
  q.ops.forEach(function(o){var on=pk.r[q.k]===o[0];h+='<button class="mini '+(on?'ok':'sec')+'" style="margin:2px" onclick="paqResp(\''+pk.id+'\',\''+q.k+'\','+JSON.stringify(o[0]).replace(/"/g,'&quot;')+')">'+o[1]+'</button>'});h+='</div>'});
 h+='</div>'});
var ceros=cur.lineas.filter(function(l){return l.paqId&&!(l.p>0)});if(ceros.length)h+='<div style="margin-top:8px;background:#FBE9E2;border-left:4px solid #B3261E;padding:8px;border-radius:6px"><b>Sin precio en tu tarifa:</b> '+ceros.map(function(l){return '«'+l.d.slice(0,50)+'»'}).join(', ')+'. Ponle el precio abajo y la próxima vez ya lo sabe.</div>';
return h+'</div>'}
function pintarTarjeta(){var ci=document.getElementById('convInfo');if(!ci)return;var old=document.getElementById('paqBox');if(old)old.remove();var h=tarjeta();if(h)ci.insertAdjacentHTML('beforeend',h)}
window.paqResp=function(id,k,v){var pk=paqs().find(function(x){return x.id===id});if(!pk)return;pk.r[k]=v;pk.hechas[k]=1;rehacer(pk);renderLineas();try{autoGuardar()}catch(_){}pintarTarjeta();
 /* mientras se enseña la app (aprende.js): qué pregunta contestó y qué eligió */
 try{if(window.__usoPregunta){var qq=(PAQ[pk.tipo].preg||[]).find(function(x){return x.k===k})||{},oo=(qq.ops||[]).find(function(o){return o[0]===v});__usoPregunta(PAQ[pk.tipo].nombre+(pk.n>1?' '+pk.n:'')+' · '+(qq.t||k),oo?oo[1]:String(v))}}catch(_){}};
window.paqMedida=function(id){var pk=paqs().find(function(x){return x.id===id});var i=document.getElementById('pm_'+id);if(!pk||!i)return;var v=norm(i.value||'');
 var m=medidaTrozo(/\d\s*(x|por)\s*\d/.test(v)?v:v+' metros');if(!(m.suelo>0)){i.style.borderColor='#B3261E';i.focus();return}pk.suelo=m.suelo;pk.perim=m.perim;if(m.alto)pk.alto=m.alto;delete pk.calculado;rehacer(pk);if(pk.padre){var pd=paqs().find(function(x){return x.id===pk.padre});if(pd)rehacer(pd,true)}renderLineas();try{autoGuardar()}catch(_){}pintarTarjeta();
 try{if(window.__usoPregunta)__usoPregunta(PAQ[pk.tipo].nombre+(pk.n>1?' '+pk.n:'')+' · metros',i.value)}catch(_){}};
window.pintarPreguntasPaq=pintarTarjeta;

/* ---------- 3) el dictado: traduce, saca las estancias enteras y llama al de siempre ---------- */
var convertir0=window.convertir;
/* al abrir la app el cuadro del dictado empieza vacío (el navegador a veces devuelve lo de la última vez, y se volvería a meter) */
(function(){var v=function(){try{var d=document.getElementById('dictado');if(d){d.value='';d.setAttribute('autocomplete','off')}}catch(_){}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',v);else v();window.addEventListener('pageshow',function(e){if(e&&e.persisted)v()})})();
window.convertir=function(){var ta=document.getElementById('dictado');var brutoTal=ta.value;if(!brutoTal.trim())return;leer();
/* el micro va AÑADIENDO al cuadro lo que se dice: si el cuadro empieza por lo que ya se convirtió en este presupuesto, solo se convierte lo nuevo.
   Y el mismo dictado otra vez (se repite para enseñarlo, o por si no lo cogió) no se mete dos veces mientras lo de antes siga abajo */
var U=window.__ultDict&&__ultDict.num===cur.num&&__ultDict.creado===cur.creado?__ultDict:null;
var huella=function(x){return norm(cifrasMedida(x)).replace(/[^a-z0-9]/g,'')};
var siguenU=function(){if(!U||!U.ds||!U.ds.length)return false;var n=U.ds.filter(function(d){return cur.lineas.some(function(l){return l.d===d})}).length;return n>=Math.ceil(U.ds.length*0.8)};
var yaEsta=function(){var ci0=document.getElementById('convInfo');if(ci0)ci0.innerHTML='<b style="color:#B3261E">Esto ya lo has dictado y está abajo: no lo meto dos veces.</b><div>Si quieres cambiar algo, díctame solo lo que cambia o tócalo en la lista.</div>'};
var aConv=brutoTal,repe=function(parte){window.__ultConv={tal:brutoTal,parte:parte,repetido:true};yaEsta()};
if(U&&brutoTal===U.tal){if(siguenU()){repe(U.parte||brutoTal);return}aConv=U.parte||brutoTal}
else if(U&&U.tal&&brutoTal.indexOf(U.tal)===0){aConv=brutoTal.slice(U.tal.length);if(!aConv.trim())return;if(huella(aConv)===U.h&&siguenU()){ta.value=U.tal;repe(aConv);return}}
else if(U&&huella(brutoTal)===U.h&&siguenU()){repe(brutoTal);return}
/* lo que se convierte de verdad (para «Lo que se ha dictado» y para la revisión de César): solo lo nuevo */
window.__ultConv={tal:brutoTal,parte:aConv,repetido:false};
/* «dos baños de cuatro metros», «noventa metros cuadrados», «cuatro por tres»: las medidas en letra pasan a número */
var bruto=quitarRepes(cifrasMedida(aConv));
/* el mensaje de debajo es de este dictado: lo de dictados anteriores fuera */
var ciL=document.getElementById('convInfo');if(ciL)ciL.innerHTML='';
var txt=traducir(' '+norm(bruto)+' ');var nuevos=[],pisoGen=[],usados=[];
var trozos=txt.replace(/(\d)[,.](\d)/g,'$1#$2').split(/([,;.:])/).map(function(x){return x.replace(/(\d)#(\d)/g,'$1,$2')});var resto=[];
var ultEst=null,ultObj=null,ultPaq=null;
var vistos={};
for(var i=0;i<trozos.length;i++){var fr=trozos[i],fr0=fr;if(/^[,;.:]$/.test(fr)){resto.push(fr);continue}
 /* la misma frase dos veces en el mismo dictado (el micro a veces la repite): una vez */
 var clv=fr.replace(/\s+/g,' ').trim();if(clv.length>8){if(vistos[clv]){resto.push(' ');continue}vistos[clv]=1}
 var tipo=null,c=1;
 /* lo que se refiere a lo dicho antes: "quiero ponerlo moderno", "hay que hacerla nueva", "y la cocina" */
 var estAqui=(fr.match(/\b(banos?|aseos?|cocina|piso|casa|vivienda|habitacion|salon|dormitorio)\b/)||[])[1];
 if(/\b(?:poner|hacer|dejar|reformar|renovar|cambiar|arreglar|modernizar)(?:lo|la|los|las)\b|\b(?:ponerlo|hacerla)\b/.test(fr)&&/\b(modern\w*|nuev\w*|entero|entera|bonit\w*|al dia|a estrenar|completo|completa|todo|toda)\b|\breformarl[oa]\b|\brenovarl[oa]\b/.test(fr)){var e=estAqui||ultEst;if(e)fr=' reformar el '+e+' '+(fr.match(/\d+(?:[.,]\d+)?\s*(?:x|por)?\s*\d*(?:[.,]\d+)?\s*(?:m2|metros cuadrados|metros|m)?/)||[''])[0]}
 else if(ultPaq&&/^\s*(?:en\s+)?(?:el|la|los|las|mi)?\s*(banos?|aseos?|cocina|habitacion(?:es)?|salon|dormitorios?)\b[^a-z]*(?:de\s+\d.*)?$/.test(fr)){fr=' reformar el '+fr.trim()+' '}
 else if(/^\s*(?:y\s+)?(?:poner|colocar|montar|meter)\s+(?:uno|una|otro|otra|los|las)?\s*(?:nuev[oa]s?)\s*$/.test(fr)&&ultObj){fr={cocina:' montar cocina ',rodapie:' rodapie nuevo ',puerta:' puertas nuevas ',suelo:' suelo flotante ',plato:' plato de ducha ',banera:' banera nueva '}[ultObj]||fr}
 if(estAqui)ultEst=estAqui;var ob=(fr.match(/\b(cocina|rodapie|puerta|suelo|plato|banera)\w*/)||[])[1];if(ob)ultObj=ob;
 /* «reformar el baño de mi casa» es el baño, no la casa entera */
 var mPiso=fr.match(RE_PISO);
 if(mPiso&&!ESTANCIA_EN.test(mPiso[0])){
  /* «quiero hacer una reforma de una casa», sin decir cuánto mide ni que sea entera: si luego se dicen los trabajos con sus medidas, es solo el contexto (se decide al acabar) */
  var medP=medidaTrozo(fr);if(!(medP.suelo>0)&&trozos[i+2]&&/^\s*(?:que\s+)?(?:tiene|mide|son|de)\b/.test(trozos[i+2]))medP=medidaTrozo(trozos[i+2]);/* «reformar el piso, tiene 70 metros» */
  if(!/\b(integral|entera|entero|completa|completo|toda|todo)\b/.test(fr)&&!(medP.suelo>0)){pisoGen.push({fr:fr});resto.push(' ');ultPaq='piso';continue}
  tipo='piso'}
 /* lo concreto cuenta también si va entre el verbo y la estancia: «cambiar la puerta del baño» es la puerta, no el baño entero */
 else if(RE_BANO.test(fr)&&!CONCRETO_BANO.test(fr.replace(/\b(?:cuarto de )?(?:banos?|aseos?|servicio)\b|\bcon\s+(?:una\s+)?(?:banera|ducha|plato de ducha)\b/g,' ')))tipo='bano';
 else if(RE_COCINA.test(fr)&&!CONCRETO_COC.test(fr.replace(/\bcocinas?\b/g,' ')))tipo='cocina';
 else if(RE_HAB.test(fr)&&!CONCRETO_HAB.test(fr.replace(/\b(?:habitacion(?:es)?|dormitorios?|cuartos?|salon|sala de estar)\b/g,' ')))tipo='hab';
 /* "baño: quitar bañera, plato..." -> son trabajos sueltos del baño, no el paquete */
 if(!tipo){resto.push(fr);ultPaq=null;continue}
 ultPaq=tipo;
 if(tipo==='bano')c=cuantos(fr,'banos|aseos');if(tipo==='hab')c=cuantos(fr,'habitaciones|dormitorios|cuartos');if(tipo==='cocina')c=1;
 var med=medidaTrozo(fr);
 /* la medida puede venir en la frase de al lado: "reformar el baño, que tiene 4 metros" */
 if(!(med.suelo>0)&&trozos[i+2]&&/^\s*(?:que\s+)?(?:tiene|mide|son|de)\b/.test(trozos[i+2])){med=medidaTrozo(trozos[i+2]);usados.push(trozos[i+2]);trozos[i+2]=''}
 /* "y alicatar" dentro del baño: ya va en el paquete */
 for(var k=1;k<=c;k++)nuevos.push({tipo:tipo,med:med,n:c>1?k:1});resto.push(' ');usados.push(fr0)}
/* el «reformar la casa» suelto: si luego se dicen trabajos con sus medidas, son esos trabajos; si no, es el piso entero, como siempre */
var pisoFuera=false;
if(pisoGen.length){var otros=trozos.filter(function(x){return !pisoGen.some(function(pg){return pg.fr===x})}).join(' ');
 var detalla=/\b(quitar|pintar|picar|poner|cambiar|alicatar|lijar|enlucir|tirar|derribar|montar|instalar|colocar|reformar|renovar|abrir|cerrar|levantar|arrancar|sacar|nivelar|empapelar|alisar|rascar|arreglar|modernizar|desmontar|embaldosar|forrar|aislar|hacer)\b/.test(otros)&&/\d\s*(?:m2|metros?|mts?|m\b|x|por)/.test(otros);
 if(!detalla)pisoGen.forEach(function(pg){nuevos.push({tipo:'piso',med:medidaTrozo(pg.fr),n:1})});else pisoFuera=true}
var txt2=resto.join('');
var n0=cur.lineas.length;cur.lineas.forEach(function(l){l.__v=1});
/* lo dicho tal cual, para que el de siempre vea «la casa de 90 metros»: sin las estancias que ya van aparte («quitar el gotelé de la casa de 90 metros y reformar dos baños» son las paredes de la casa, no de un cuarto) */
var crudoB=' '+norm(bruto).replace(/\s+/g,' ')+' ';usados.forEach(function(u){u=String(u||'').trim();if(u.length<4)return;var k=crudoB.indexOf(u);if(k>=0)crudoB=crudoB.slice(0,k)+' '+crudoB.slice(k+u.length)});
if(txt2.replace(/[^a-z]/g,'').length>=3){ta.value=txt2;window.__BRUTO=crudoB;try{convertir0()}finally{ta.value=brutoTal;window.__BRUTO=null}leer()}
var hechos=[];
var sinVent=/\b(no tiene|sin|no hay|no lleva)\s+(?:ninguna\s+)?ventana/.test(norm(bruto)),conVent=!sinVent&&/\b(tiene|con|hay)\s+(?:una\s+)?ventana/.test(norm(bruto));
var CUANT={un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20};
function cuantosDe(t,que){var m=norm(t).match(new RegExp('\\b(\\d+|'+Object.keys(CUANT).join('|')+')\\s+(?:'+que+')\\b'));return m?(CUANT[m[1]]||+m[1]):null}
var nBan=cuantosDe(bruto,'banos|aseos'),nPue=cuantosDe(bruto,'puertas');
/* «con bañera», «poner una bañera nueva»: el baño lleva bañera, no plato (salvo que también diga plato o ducha) */
var nb=norm(bruto),conBan=/\b(?:con|poner|colocar|montar|instalar|meter|cambiar)\s+(?:una|la|otra)?\s*(?:nueva\s+)?banera\b|\bbanera nueva\b/.test(nb)&&!/\bplato\b|\b(?:poner|con|colocar|montar)\s+(?:una\s+)?ducha\b/.test(nb);
nuevos.forEach(function(x){var pk=nuevoPaq(x.tipo,x.med,x.n);if((sinVent||conVent)&&'ventana' in pk.r){pk.r.ventana=!sinVent;pk.hechas.ventana=1}
if(conBan&&x.tipo==='bano'){pk.r.ducha='banera';pk.hechas.ducha=1}
if(x.tipo==='piso'){if(nBan!=null){pk.r.banos=Math.min(6,nBan);pk.hechas.banos=1}if(nPue!=null){pk.r.puertas=Math.min(40,nPue);pk.hechas.puertas=1}}
cur.lineas=cur.lineas.concat(lineasDe(pk));hechos.push(pk)});
/* el piso y las estancias dichas aparte («reformar la casa de 87 metros… y arreglar el baño»): ese baño y esa cocina son DEL piso.
   Así no salen baños de más, y el suelo, las paredes y los techos del piso van sin ellos (no se cobran dos veces) */
hechos.filter(function(h){return h.tipo==='piso'}).forEach(function(pi){
 var suyos=hechos.filter(function(h){return (h.tipo==='bano'||h.tipo==='cocina')&&!h.padre});suyos.forEach(function(h){h.padre=pi.id});
 var eb=suyos.filter(function(h){return h.tipo==='bano'}).length;if(eb){pi.r.banos=Math.min(6,Math.max(eb,nBan!=null?nBan:0));pi.hechas.banos=1}
 if(suyos.some(function(h){return h.tipo==='cocina'})){pi.r.cocina=true;pi.hechas.cocina=1}
 rehacer(pi,true);
 /* «la casa de 90 metros con un baño de 5 metros»: los metros dichos para el baño o la cocina mandan sobre los calculados */
 var dichos=medidasDichas(norm(bruto));suyos.forEach(function(h){var L=dichos[h.tipo]||[],k=L.indexOf(h.suelo);if(h.suelo>0&&k>=0)L.splice(k,1)});
 var cambio=false;paqs().filter(function(h){return h.padre===pi.id&&(h.calculado||!(h.suelo>0))}).forEach(function(h){var L=dichos[h.tipo]||[];if(L.length){h.suelo=L.shift();h.perim=0;delete h.calculado;rehacer(h,true);cambio=true}});
 if(cambio)rehacer(pi,true)});
/* lo que el de siempre metio y ya va en una estancia: fuera duplicados */
if(hechos.length){unaVez();cur.lineas=cur.lineas.filter(function(l){if(l.paqId)return true;var dup=cur.lineas.some(function(o){return o.paqId&&o.d.indexOf(l.d)===0});return !dup})}
/* un solo baño o cocina: el suelo suelto ya va en la estancia (es de baldosa), y «la puerta del baño» es su pregunta de la puerta */
if(hechos.length===1&&/^(bano|cocina)$/.test(hechos[0].tipo)&&!/\b(habitacion\w*|dormitorio\w*|salon|pasillo\w*|terraza\w*|toda la casa|todo el piso|casa entera|piso entero)\b/.test(norm(bruto))){
 var pk1=hechos[0],TT=tarifa(),idDe=function(l){var t=TT.find(function(x){return x.d===l.d});return t?t.id:''},SUELO={sue:1,flo:1,sol:1,niv:1},conPuerta=false;
 if((pk1.tipo==='bano'&&/\bpuertas? del? (?:bano|aseo)\b/.test(norm(bruto)))||(pk1.tipo==='cocina'&&/\bpuertas? de la cocina\b/.test(norm(bruto)))){pk1.r.puerta=pk1.tipo==='bano'?true:'normal';pk1.hechas.puerta=1;conPuerta=true}
 cur.lineas=cur.lineas.filter(function(l){if(l.paqId||l.__v)return true;var id=idDe(l);if(SUELO[id])return false;if(conPuerta&&(id==='pub'||id==='pue'))return false;return true});
 if(conPuerta)rehacer(pk1,true)}
var nuevasDs=cur.lineas.filter(function(l){return !l.__v}).map(function(l){return l.d});
cur.lineas.forEach(function(l){delete l.__v});
window.__ultDict={num:cur.num,creado:cur.creado,tal:ta.value,parte:aConv,h:huella(aConv),ds:nuevasDs};
/* dictar en un presupuesto que ya se mandó (tiene enlace de firma): si se vuelve a mandar, el cliente verá esto */
if(cur.firmaTok&&!cur.firmado){var ciF=document.getElementById('convInfo');if(ciF)ciF.insertAdjacentHTML('beforeend','<div style="margin-top:6px;background:#FFF4E5;border-left:4px solid #C24A00;padding:6px 8px;border-radius:6px"><b>Ojo: este presupuesto ya se mandó a un cliente</b> (nº '+cur.num+'). Si es otra obra, dale a «Nuevo presupuesto» y díctalo allí.</div>')}
if(pisoFuera){var ciP=document.getElementById('convInfo');if(ciP)ciP.insertAdjacentHTML('beforeend','<div style="margin-top:6px">«Reforma de la casa» lo he tomado como los trabajos que dices con sus medidas. Si es la reforma de la casa entera, di «reforma integral de la casa» o «la casa entera».</div>')}
renderLineas();try{autoGuardar()}catch(_){}
var ci=document.getElementById('convInfo');if(!ci)return;
var añad=cur.lineas.length-n0;
if(hechos.length||añad>0){if(/No he reconocido/.test(ci.textContent)||!ci.textContent.trim()||hechos.length&&!/trabajo/.test(ci.textContent)){
 /* se cambia la cuenta, pero sin perder los avisos de debajo (lo que no está en la tarifa o no se ha entendido) */
 var guardar=Array.prototype.filter.call(ci.children,function(d){return d.tagName==='DIV'&&!/No he reconocido/.test(d.textContent)});
 ci.innerHTML='<b style="color:#1E6B3A">'+añad+(añad===1?' trabajo añadido':' trabajos añadidos')+'.</b>';guardar.forEach(function(d){ci.appendChild(d)})}
 /* el de siempre solo cuenta lo suyo: la cuenta buena es la de todas las líneas nuevas (estancias y lo que entra a cero) */
 else{var bb=ci.querySelector('b');if(bb&&/\d+\s+trabajos?\s+añadidos?/.test(bb.textContent))bb.textContent=bb.textContent.replace(/\d+\s+trabajos?\s+añadidos?/,añad+(añad===1?' trabajo añadido':' trabajos añadidos'))}
 /* el aviso viejo de "baño completo: he metido todos..." sobra: ahora pregunto */
 ci.querySelectorAll('div').forEach(function(d){if(/he metido todos los trabajos que suele llevar/.test(d.textContent))d.remove()})}
pintarTarjeta();
/* «encastrar una puerta» sin decir cuál: va la corredera dentro de la pared y se pregunta, por si es una puerta normal con su premarco */
if(RX_ENC.test(norm(bruto))&&!/corredera|abatible|batiente/.test(norm(bruto))){var tc=T('cor');var lc=tc&&cur.lineas.find(function(l){return l.d===tc.d&&!l.enc});
 if(lc){lc.enc='cor';var vb=document.getElementById('encBox');if(vb)vb.remove();ci.insertAdjacentHTML('beforeend',cajaEnc('cor'))}}
avisoDisparate(hechos)};
/* nunca un disparate sin avisar: una medida o un total que no cuadra con lo que se ha dicho (un baño de 194 m², 198.000 €…) */
function avisoDisparate(hechos){try{var raro=[],tot=0,nn=function(x){return window.num?num(x):(parseFloat(String(x).replace(',','.'))||0)};
 cur.lineas.forEach(function(l){var q=nn(l.q)||0,p=nn(l.p)||0;tot+=q*p;if(/^(m2|m²|ml|m)$/.test(String(l.u||'').trim())&&q>2000)raro.push('«'+String(l.d).slice(0,45)+'…» con '+String(q).replace('.',',')+' '+l.u)});
 (hechos||[]).forEach(function(pk){var lim={bano:30,cocina:50,hab:60,piso:800}[pk.tipo];if(lim&&pk.suelo>lim)raro.push((PAQ[pk.tipo]?PAQ[pk.tipo].nombre.toLowerCase():pk.tipo)+' de '+String(pk.suelo).replace('.',',')+' m²')});
 if(tot>150000)raro.push('el total sale en '+Math.round(tot).toLocaleString('es-ES')+' € sin IVA');
 var cr=document.getElementById('convInfo'),old=document.getElementById('dispBox');if(old)old.remove();
 if(raro.length&&cr)cr.insertAdjacentHTML('afterbegin','<div id="dispBox" style="background:#FDECEA;border:1px solid #B3261E;color:#B3261E;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-weight:600">Ojo, esto no cuadra: '+raro.join('; ')+'. Revisa las medidas antes de mandarlo.</div>')}catch(_){}}
window.avisoDisparate=avisoDisparate;
var RX_ENC=/\b(?:encastr|empotr)\w*\s+(?:(?:la|una|las|unas|el|un)\s+)?(?:\w+\s+)?puertas?\b|\bpuertas?\s+(?:encastrad|empotrad)\w*/;
function cajaEnc(sel){return '<div id="encBox" style="background:#E8F1FB;border-left:4px solid #2B6CB0;padding:10px;border-radius:8px;margin-top:8px;font-size:14px">'+
 '<b>«Encastrar una puerta»: ¿cuál es?</b><div style="font-size:12px;color:#555;margin:2px 0 6px">He puesto la corredera que va dentro de la pared. Si es otra, tócala y lo cambio.</div>'+
 '<button class="mini '+(sel==='cor'?'ok':'sec')+'" style="margin:2px" onclick="encPuerta(\'cor\')">Corredera dentro de la pared</button>'+
 '<button class="mini '+(sel==='normal'?'ok':'sec')+'" style="margin:2px" onclick="encPuerta(\'normal\')">Puerta normal con su premarco</button></div>'}
window.encPuerta=function(que){leer();var c=T('cor'),pr=T('pre'),pb=T('pub');if(!c||!pr||!pb)return;
 var iC=cur.lineas.findIndex(function(l){return l.enc==='cor'}),iN=cur.lineas.findIndex(function(l){return l.enc==='normal'});
 if(que==='normal'&&iC>-1){var q=cur.lineas[iC].q||1;cur.lineas.splice(iC,1,{d:pr.d,q:q,u:pr.u,p:pr.p,enc:'normal'},{d:pb.d,q:q,u:pb.u,p:pb.p,enc:'normal2'})}
 if(que==='cor'&&iN>-1){var q2=cur.lineas[iN].q||1;cur.lineas=cur.lineas.filter(function(l){return l.enc!=='normal'&&l.enc!=='normal2'});cur.lineas.splice(iN,0,{d:c.d,q:q2,u:c.u,p:c.p,enc:'cor'})}
 renderLineas();try{autoGuardar()}catch(_){}var b=document.getElementById('encBox');if(b)b.outerHTML=cajaEnc(que);try{if(window.__usoPregunta)__usoPregunta('Encastrar una puerta',que==='cor'?'Corredera dentro de la pared':'Puerta normal con su premarco')}catch(_){}};

/* al abrir un presupuesto con estancias sin medir, vuelven las preguntas */
var renderLineas0=window.renderLineas;
})();
/* Dictar con voz: pide permiso al micrófono, escribe mientras hablas y, si no puede escuchar, dice por qué y qué hacer */
(function(){
 function aviso(h){var b=document.getElementById('convInfo');if(b){b.innerHTML=h;b.style.display='block';b.style.marginTop='8px'}}
 var SIN_PERMISO='<span style="color:#B3261E;font-weight:700">No tengo permiso para usar el micrófono.</span> Toca el candado o los tres puntos de arriba en Chrome, entra en «Permisos» y activa el micrófono. Mientras tanto, puedes tocar el micro del teclado y hablar igual.';
 function clave(x){return norm(String(x||'')).replace(/[^a-z0-9]+/g,' ').trim()}
 function juntarVoz(arr){var out=[];(arr||[]).forEach(function(t){t=String(t||'').trim();if(!t)return;var w=clave(t).split(' ');
  if(w.length>=4&&w.length%2===0&&w.slice(0,w.length/2).join(' ')===w.slice(w.length/2).join(' ')){var tw=t.split(/\s+/);t=tw.slice(0,Math.ceil(tw.length/2)).join(' ')}
  var p=out.length?out[out.length-1]:'',nt=clave(t),np=clave(p);
  if(np&&nt===np)return;if(np&&nt.indexOf(np)===0){out[out.length-1]=t;return}if(np&&np.indexOf(nt)>=0)return;out.push(t)});return out.join(' ')}
 window.juntarVoz=juntarVoz;
 window.dictar=function(){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;var b=document.getElementById('btnVoz'),ta=document.getElementById('dictado');
  if(!SR){aviso('Este navegador no dicta. Toca el micro del teclado (al lado de la barra espaciadora) y habla igual; en Android, mejor con Chrome.');if(ta)ta.focus();return}
  var arranca=function(){var r=new SR();r.lang=(window.idiomaDictado?idiomaDictado():'es-ES');r.continuous=true;r.interimResults=true;var base=ta.value,oido=false;
   b.textContent='● Te escucho… (toca para parar)';b.classList.add('warn');aviso('Habla tranquilo: voy escribiendo lo que dices.');
   /* hay móviles que devuelven la misma frase dos veces, o cada vez todo lo dicho desde el principio: se junta sin repetir */
   r.onresult=function(e){var fins=[],prov='';for(var i=0;i<e.results.length;i++){var t=e.results[i][0].transcript;if(e.results[i].isFinal)fins.push(t);else prov+=t}
    var fin=juntarVoz(fins),kf=clave(fin),kp=clave(prov);if(kf&&kp&&kp.indexOf(kf)===0){fin='';}else if(kf&&kp&&kf.indexOf(kp)>=0)prov='';
    oido=true;ta.value=(base?base+' ':'')+fin+(prov?(fin?' ':'')+prov.trim():'')};
   r.onerror=function(e){var c=e&&e.error;if(c==='not-allowed'||c==='service-not-allowed')aviso(SIN_PERMISO);else if(c==='no-speech')aviso('No te he oído. Vuelve a darle a «Dictar con voz» y habla cerca del móvil.');else if(c==='network')aviso('Para dictar hace falta internet. Si no tienes, toca el micro del teclado.');else if(c==='audio-capture')aviso('No encuentro el micrófono. Toca el micro del teclado y habla igual.');else if(c!=='aborted')aviso('No he podido escucharte ('+c+'). Toca el micro del teclado y habla igual.')};
   r.onend=function(){b.textContent='Dictar con voz';b.classList.remove('warn');b.onclick=window.dictar;if(oido&&ta.value.trim()){aviso('');setTimeout(function(){try{convertir()}catch(_){}} ,300)}};
   b.onclick=function(){try{r.stop()}catch(_){}};try{r.start()}catch(err){aviso('No he podido arrancar el micrófono. Toca el micro del teclado y habla igual.')}};
  if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){try{s.getTracks().forEach(function(t){t.stop()})}catch(_){}arranca()}).catch(function(err){if(err&&(err.name==='NotAllowedError'||err.name==='SecurityError'))aviso(SIN_PERMISO);else arranca()})}
  else arranca()};
})();
