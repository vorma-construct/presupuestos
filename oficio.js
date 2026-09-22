/* ---------- lenguaje de obra: lo que se dice en la obra -> lo que pone en la tarifa ---------- */
/* Se carga despues del programa principal y mejora tres cosas:
   1) el dictado entiende mas formas de decir lo mismo (embaldosar, enlosar, alisar, echar yeso...)
   2) los metros de pared salen solos desde los metros de suelo, con un alto de 2,5 m si no se dice otro
   3) lo que no esta en la tarifa no se pierde: entra como linea a cero y se pide el precio, y se aprende */
(function(){
var ALTO_DEFECTO=2.5;
/* palabras de obra -> palabras que la tarifa conoce. Orden: de lo mas concreto a lo mas general. */
var VOCAB=[
[/\b(enlos\w*|solar|solad\w*|poner (?:el )?suelo de (?:baldosa|gres|porcelanico|ceramica|azulejo))\b(?:\s+(?:el|la|los|las|del|de la|de|un|una))*\s*(bano|banos|cocina|terraza|pasillo|salon|habitacion|piso|suelo)?/g,function(m,v,d){return 'baldosa en el suelo'+(d?' del '+d:'')}],
[/\b(chapar|chapad\w*|revestir|aplacar|aplacad\w*)\b(?:\s+(?:el|la|los|las|del|de la|de))*\s*(pared|paredes|bano|cocina)?/g,'alicatar'],
[/\b(azulejar|azulejad\w*|poner azulejo\w*|colocar azulejo\w*|alikatar|aligatar)\b/g,'alicatar'],
[/\b(alisar|alisad\w*|dejar lisas?|lisar)\b(?:\s+(?:las|la|el|los))?\s*(pared|paredes)?/g,'lijar paredes'],
[/\b(quitar|rascar|sacar|eliminar)\s+(?:el\s+)?gotel[eé]\w*/g,'lijar paredes'],
[/\b(echar|tirar|dar|meter)\s+(?:el\s+)?yeso\b/g,'enlucir'],
[/\b(enyesar|rasear|rase[oa]r?|guarnecer|revocar|enfoscar)\b/g,'enlucir'],
[/\bpladur\w*\b/g,'pladur'],
[/\b(bajar|hacer|poner|colocar|meter)\s+(?:el\s+|un\s+)?(?:falso\s+)?techo\b/g,'falso techo'],
[/\b(poner|colocar|hacer|meter|echar)\s+(?:el\s+|un\s+)?(parquet|parque|parket|tarima|laminado|suelo laminado|suelo flotante)\b/g,'suelo flotante'],
[/\b(quitar|arrancar|levantar|sacar)\s+(?:el\s+)?(parquet|parque|parket|tarima|laminado|suelo de madera)\b/g,'quitar suelo'],
[/\b(picar|levantar|arrancar|quitar)\s+(?:el\s+|la\s+|las\s+)?(baldosa\w*|gres|ceramica|suelo ceramico|suelo del bano|suelo de la cocina)\b/g,'picar suelo'],
[/\b(picar|arrancar|quitar|levantar)\s+(?:el\s+|los\s+)?(azulejo\w*|alicatado|alicatao)\b/g,'quitar alicatado'],
[/\b(pintar|dar (?:una|dos|tres) manos?|repintar|dar pintura)\b/g,'pintar'],
[/\b(cambiar|sustituir|renovar)\s+(?:la\s+)?banera\b/g,'plato de ducha'],
[/\b(poner|colocar|hacer|montar)\s+(?:una\s+|la\s+|el\s+)?ducha\b/g,'plato de ducha'],
[/\b(cambiar|renovar|hacer nueva|nueva)\s+(?:la\s+)?(?:instalacion\s+)?(?:de\s+)?(luz|electricidad|electrica)\b/g,'instalacion electrica'],
[/\b(cambiar|renovar|hacer nueva)\s+(?:la\s+)?(?:instalacion\s+)?(?:de\s+)?(agua|fontaneria)\s+(?:del?\s+)?(bano|cocina)\b/g,function(m,v,a,d){return 'fontaneria '+d}],
[/\b(cambiar|renovar|poner)\s+(?:las?\s+)?puertas?\s+(?:de\s+)?(?:paso|interior\w*|de las habitaciones|de la casa)?\b/g,'puertas nuevas'],
[/\b(cambiar|poner|colocar)\s+(?:la\s+)?puerta\s+(?:de\s+)?(entrada|calle|blindada|acorazada|principal)\b/g,'puerta de entrada'],
[/\b(poner|colocar|cambiar|meter)\s+(?:el\s+|los\s+)?rodapi\w*\b/g,'rodapie nuevo'],
[/\b(quitar|arrancar|sacar)\s+(?:el\s+|los\s+)?rodapi\w*\b/g,'quitar rodapie'],
[/\b(quitar|sacar|arrancar|desmontar)\s+(?:el\s+|la\s+|los\s+)?(inodoro|water|vater|lavabo|bide|bidet|sanitarios?|banera)\b/g,'quitar sanitarios'],
[/\b(quitar|sacar|arrancar|desmontar|tirar)\s+(?:la\s+|los\s+)?(cocina vieja|cocina|muebles de la cocina|muebles de cocina)\b/g,'quitar cocina'],
[/\b(montar|poner|colocar|instalar)\s+(?:la\s+|los\s+)?(cocina nueva|cocina|muebles de la cocina|muebles de cocina)\b/g,'montar cocina'],
[/\b(montar|poner|colocar)\s+(?:un\s+|el\s+)?mueble\s+(?:de\s+|del\s+)?bano\b/g,'mueble de baño'],
[/\b(montar|poner|colocar|hacer)\s+(?:un\s+|el\s+|los\s+)?armario\w*\b/g,'montar armario'],
[/\b(tirar|derribar|quitar|abrir|echar abajo)\s+(?:el\s+|la\s+|un\s+)?(tabique|pared|muro)\b/g,'tirar tabique'],
[/\b(hacer|levantar|poner|subir)\s+(?:un\s+|el\s+)?(tabique|pared)\b/g,'tabique nuevo'],
[/\b(abrir|agrandar|hacer)\s+(?:un\s+|el\s+)?hueco\b/g,'abrir hueco'],
[/\b(nivelar|recrecer|autonivelante|echar autonivelante)\b/g,'nivelar'],
[/\b(acuchillar|barnizar|lijar)\s+(?:el\s+)?(suelo|parquet|parque|tarima)\b/g,'acuchillar'],
[/\b(poner|colocar|instalar)\s+(?:un\s+|el\s+)?(extractor|ventilacion)\b/g,'extractor'],
[/\b(quinto|cuarto|tercero|segundo|sexto|septimo|primero)\s+sin\s+ascensor\b/g,'sin ascensor'],
[/\bcontenedor\w*\b|\bsaca\w*\s+de\s+escombro\w*\b|\bescombro\w*\b/g,'contenedor']
];
/* paquetes: una frase que engloba varios trabajos. Cada uno entra en su linea y el albañil quita lo que no toque. */
var PAQUETES=[
{re:/\b(bano|aseo)\s+(completo|entero|nuevo|integral)\b|\b(reformar|reforma de|reforma del|hacer|rehacer|cambiar)\s+(?:el\s+|un\s+|todo el\s+)?(bano|aseo)\b/,nombre:'baño completo',ids:['san','ali','sol','dfon','fba','alc','pd7','pit','con'],pared:['ali','alc'],suelo:['sol','pit'],alcSuelo:true},
{re:/\bcocina\s+(completa|entera|nueva|integral)\b|\b(reformar|reforma de|reforma de la|hacer|rehacer|cambiar)\s+(?:la\s+|toda la\s+)?cocina\b/,nombre:'cocina completa',ids:['coc','ali','sol','dfon','fco','alc','luc','pit','mco','con'],pared:['ali','alc','luc'],suelo:['sol','pit'],alcSuelo:true},
{re:/\b(pintar|pintura de)\s+(?:todo\s+)?(?:el\s+|la\s+)?(piso|casa|vivienda)\s+(entero|entera|completo|completa)?\b/,nombre:'pintar el piso',ids:['pip','pit'],pared:['pip'],suelo:['pit']}
];
var DEMOL_RE=/\b(quitar|picar|picad\w*|tirar|sacar|levant\w*|retir\w*|desmont\w*|derrib\w*|demol\w*|desescombr\w*|arranc\w*|eliminar)\b/;
var HACER_RE=/\b(poner|colocar|hacer|montar|instalar|suministr\w*|colocaci\w*|instalaci\w*|nuev[oa]s?|formaci\w*|ejecuci\w*)\b/;
/* raiz de palabra: para que "alicatado", "alicatar" y "alicatao" cuenten como lo mismo */
var VACIAS={de:1,del:1,la:1,el:1,los:1,las:1,en:1,y:1,con:1,por:1,para:1,un:1,una:1,al:1,a:1,o:1,su:1,sus:1,tipo:1,segun:1,incluso:1,mm:1,cm:1,m:1,m2:1,ml:1,ud:1,existente:1,actual:1,medios:1,manuales:1,totalmente:1,terminado:1,color:1,blanco:1,blanca:1};
function raices(t){return norm(t).replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(function(w){return w.length>2&&!VACIAS[w]}).map(function(w){return w.slice(0,5)})}
var GENERIC={metro:1,cuadr:1,linea:1,alto:1,ancho:1,largo:1,altur:1,cuadra:1,poner:1,cambi:1,quita:1,hacer:1,monta:1,coloc:1,insta:1,sacar:1,tirar:1,picar:1,bano:1,cocin:1,salon:1,pared:1,suelo:1,techo:1,pasil:1,habit:1,casa:1,piso:1,vivie:1,nuevo:1,nueva:1,viejo:1,vieja:1,sumin:1,retir:1,tirad:1,centr:1,autor:1,resid:1,escom:1,todo:1,toda:1,entre:1,parte:1};
function fuertes(rs){return rs.filter(function(r){return !GENERIC[r]})}
var IDX=null;
function indice(){var T=tarifa();if(IDX&&IDX.n===T.length)return IDX.l;IDX={n:T.length,l:T.map(function(t){var r={};raices(t.d+' '+(t.k||[]).join(' ')).forEach(function(x){r[x]=1});return{t:t,r:r,dem:t.c==='Demoliciones'&&['con','con7','mon','limp','limf'].indexOf(t.id)<0}})};return IDX.l}
/* la partida de la tarifa que mas se parece a un texto libre. Devuelve {t,score} o null */
function parecida(txt){var n=norm(txt||'');if(!n)return null;var rs=raices(n);if(!rs.length)return null;var dem=DEMOL_RE.test(n)&&!HACER_RE.test(n);var mejor=null;
indice().forEach(function(e){if(e.dem!==dem)return;if(!fuertes(rs).some(function(r){return e.r[r]}))return;if(e.t.id==='recp'&&!/recuper|recoloc|volver a poner|la misma|existente/.test(n))return;var s=0;rs.forEach(function(r){if(e.r[r])s+=(r.length>=5?2:1)});
/* palabras fuertes: si la tarifa la tiene y el texto tambien, cuenta doble */
if(s>0){var fuerte=/pladur|alicat|solad|pint|yeso|enluc|tabiq|tarima|flotan|rodapi|puert|ducha|contened|fontan|electr|calefac|techo|armario|cocina|sanitar|premarc|corred|nivel|acuchill|extract|ventilac/;var mf=n.match(fuerte),tf=norm(e.t.d+' '+e.t.k.join(' ')).match(fuerte);if(mf&&tf&&mf[0]===tf[0])s+=3}
if(s>0&&(!mejor||s>mejor.score))mejor={t:e.t,score:s}});
return mejor&&mejor.score>=3?mejor:null}
window.parecida=parecida;
var precioAprendido0=window.precioAprendido;
/* precio que ya puso otra vez a un trabajo parecido (aunque lo dijera con otras palabras) */
function aprendidoParecido(txt){var ex=(precioAprendido0?precioAprendido0(txt):0)||0;if(ex>0)return ex;if(!window.aprendidos)return 0;var A=aprendidos(),rs=raices(txt);if(!rs.length)return 0;var mejor=0,ms=0;Object.keys(A).forEach(function(k){var e=A[k];if(!(e&&e.p>0))return;var kr=raices(k);var comun=rs.filter(function(r){return kr.indexOf(r)>-1});var fu=fuertes(comun).length;var sc=comun.length/Math.max(rs.length,kr.length)+fu;if(fu>=1&&sc>ms){ms=sc;mejor=e.p}});return mejor}
window.aprendidoParecido=aprendidoParecido;
if(precioAprendido0){window.precioAprendido=function(txt){var ex=precioAprendido0(txt);return ex>0?ex:aprendidoParecido(txt)}}
/* tabiques: un tabique de piso de los 70-90 son unos 7,5 m2 (3 m x 2,5 m de alto; los de pasillo con puerta, los de habitacion a habitacion sin ella).
   Ioan cobra el derribo por lote: 440 y 650 euros por DOS tabiques (presupuestos 544 y 545).
   Hasta dos tabiques = un lote a su precio; con mas, por metro cuadrado (precio aparte, que decide el). */
var M2_TABIQUE=7.5,MAX_POR_UD=2;
if(!TARIFA_BASE.some(function(t){return t.id==='tabm'}))TARIFA_BASE.push({id:'tabm',c:'Demoliciones',d:'Derribo de tabiquería de ladrillo por metro cuadrado (obra de varios tabiques), retirada de escombro y tirada al centro autorizado',u:'m2',p:0,k:['derribo de tabiqueria','tabiqueria por metro','tabiques por metro']});
function tabiqueSegunMetros(m2){var n=Math.max(1,Math.round(m2/M2_TABIQUE));var T=tarifa();
 if(n<=MAX_POR_UD){var t=T.find(function(x){return x.id==='tab'});return{id:'tab',q:1,u:'ud',p:t.p,d:t.d+' \u2014 '+(n===1?'un tabique':'dos tabiques')+' ('+String(m2).replace('.',',')+' m\u00b2 medidos)'}}
 var tm=T.find(function(x){return x.id==='tabm'});return{id:'tabm',q:m2,u:'m2',p:tm.p,d:tm.d+' \u2014 unos '+n+' tabiques'}}
window.tabiqueSegunMetros=tabiqueSegunMetros;
function convertirTabiquesArq(){(ARQ.med||[]).forEach(function(p){if(p.tabHecho)return;var id=window.casar?casar(p.t):null;if(id!=='tab'||!/^m2$/.test(p.u))return;var r=tabiqueSegunMetros(p.q);p.tabHecho=true;p.sel=r.id;p.u=r.u;p.q=r.q;p.pr=r.p;p.dTab=r.d})}
var renderArq0=window.renderArq;window.renderArq=function(){try{convertirTabiquesArq()}catch(e){}return renderArq0.apply(this,arguments)};
var addMed0=window.addMediciones;window.addMediciones=function(){try{convertirTabiquesArq()}catch(e){}return addMed0.apply(this,arguments)};
/* 1) las demoliciones no saltan sin verbo de derribo: "tabique de pladur" ya no añade "derribo de tabique" */
TARIFA_BASE.forEach(function(t){if(t.c!=='Demoliciones')return;t.k=t.k.filter(function(k){return !/^(tabique|derribo|derribar)$/.test(norm(k))});if(t.id==='tab')t.k=t.k.concat(['tirar tabique','derribar tabique','quitar tabique','derribo de tabique','tirar pared','quitar pared'])});
/* 2) medidas: alto de 2,5 m si no lo dices */
var medidasDe0=window.medidasDe;
window.medidasDe=function(txt){var r=medidasDe0(txt);var pared=/pared|alicat|azulej|chapa|pintar|pintura|enluc|lucir|yeso|lijar|alisar|gotele|pladur|tabique|trasdos/.test(txt);var suelo=/suelo|solad|pavimento|baldosa|tarima|laminado|parquet|flotante/.test(txt);if(r.suelo>0&&!(r.alto>0)&&pared&&!((suelo||window.__ENSUELO)&&!/pared/.test(txt))){r.alto=ALTO_DEFECTO;r.altoSupuesto=true}return r};
/* unidad y cantidad de una frase suelta */
function cantidadDe(fr){var m=fr.match(/(\d+(?:[.,]\d+)?)\s*(m2|m\u00b2|metros cuadrados)\b/);if(m)return{q:num(m[1]),u:'m2'};m=fr.match(/(\d+(?:[.,]\d+)?)\s*(ml|metros lineales)\b/);if(m)return{q:num(m[1]),u:'ml'};m=fr.match(/(\d+(?:[.,]\d+)?)\s*(metros|m)\b/);if(m)return{q:num(m[1]),u:/pared|suelo|techo|alicat|pint|yeso|pladur|tarima|flotante/.test(fr)?'m2':'ml'};m=fr.match(/(\d+)\s*(ud|uds|unidades|puertas|armarios|radiadores|ventanas)?\b/);if(m)return{q:num(m[1]),u:'ud'};return{q:1,u:'ud'}}
/* 3) el dictado, mejorado */
var convertir0=window.convertir;
window.convertir=function(){var ta=document.getElementById('dictado');var bruto=ta.value;if(!bruto.trim())return;var txt=norm(bruto);
txt=txt.replace(/\b(poner|colocar|meter|echar|hacer|cambiar|pintar|quitar)(?:le|les|lo|la|los|las)\b/g,'$1').replace(/\bponle\b/g,'poner');
/* baldosa / azulejo en una estancia */
txt=txt.split(/([,;.])/).map(function(fr){
 if(!/\b(embaldos\w*|baldosa\w*|azulej\w*|gres|porcelanico\w*|ceramica|plaqueta\w*|alicatado en el suelo)\b/.test(fr))return fr;
 if(/\b(quitar|picar|arrancar|levantar|sacar|tirar)\b/.test(fr)){var e2=(fr.match(/\b(bano|aseo|cocina)\b/)||[])[1];var s2=/\b(suelo|solado)\b/.test(fr),p2=/\b(pared|paredes)\b/.test(fr);var m2=(fr.match(/(\d+(?:[.,]\d+)?\s*(?:m2|m\u00b2|metros cuadrados|metros|m)\b)/)||[''])[0];
  if(e2&&!s2&&!p2)return ' quitar alicatado de las paredes del '+e2+' '+m2+' , picar suelo del '+e2+' '+m2+' ';return fr}
 var est=(fr.match(/\b(bano|aseo|cocina|terraza|pasillo|salon|habitacion|entrada|galeria)\b/)||[])[1]||'';
 var med=(fr.match(/(\d+(?:[.,]\d+)?\s*(?:m2|m\u00b2|metros cuadrados|metros|m)\b(?:\s*(?:x|por)\s*\d+(?:[.,]\d+)?\s*(?:m|metros)?)?)/)||[])[1]||'';
 var resto=fr.replace(/(\d+(?:[.,]\d+)?\s*(?:de\s+)?(?:alto|altura))/,' $1 ');var alto=(fr.match(/\d+(?:[.,]\d+)?\s*(?:m|metros)?\s*de\s*(?:alto|altura)/)||[''])[0];
 var sue=/\b(suelo|solado|pavimento|enlos\w*)\b/.test(fr),par=/\b(pared|paredes|paramento\w*)\b/.test(fr);
 var donde=(sue&&!par)?'suelo':(par&&!sue)?'paredes':(est==='bano'||est==='aseo'||est==='cocina')?'paredes y suelo':'suelo';
 return ' alicatar '+donde+(est?' del '+est:'')+(med?' '+med:'')+(alto?' '+alto:'')+' ';
}).join('');
VOCAB.forEach(function(r){txt=txt.replace(r[0],r[1])});
/* "20 metros cuadrados de suelo" es una medida, no un trabajo en el suelo */
txt=txt.replace(/(metros cuadrados|m2)\s+(?:de\s+)?(?:suelo|planta)\b/g,'$1');
/* paquetes */
var MD=window.medidasDe(txt),paq=[];PAQUETES.forEach(function(p){if(p.re.test(txt))paq.push(p)});if(paq.length&&MD.suelo>0&&!(MD.alto>0)){MD.alto=ALTO_DEFECTO;MD.altoSupuesto=true}
ta.value=txt;try{convertir0()}finally{ta.value=bruto}
leer();var T=tarifa(),añad=0;
/* si ya esta el derribo de solado, no se cobra el suelo otra vez como demolicion de alicatado */
(function(){var ali=T.find(function(x){return x.id==='ali'}),sol=T.find(function(x){return x.id==='sol'});if(!ali||!sol)return;
if(cur.lineas.some(function(l){return l.d===sol.d})){var n0=cur.lineas.length;cur.lineas=cur.lineas.filter(function(l){return l.d!==ali.d+' \u2014 en el suelo'});
cur.lineas.forEach(function(l){if(l.d===ali.d+' \u2014 en las paredes')l.d=ali.d});if(cur.lineas.length!==n0)renderLineas()}})();
var yaD={};cur.lineas.forEach(function(l){yaD[norm(l.d).slice(0,40)]=1});
paq.forEach(function(p){p.ids.forEach(function(id){var t=T.find(function(x){return x.id===id});if(!t||yaD[norm(t.d).slice(0,40)])return;var q=1;
if(t.u==='m2'){if(p.pared.indexOf(id)>-1&&MD.suelo>0)q=paredNeta(MD);else if(p.suelo.indexOf(id)>-1&&MD.suelo>0)q=MD.suelo}
var dd=t.d;if(id==='alc'&&p.alcSuelo)dd=t.d+' \u2014 en las paredes';
cur.lineas.push({d:dd,q:q,u:t.u,p:t.p,paquete:p.nombre});yaD[norm(t.d).slice(0,40)]=1;añad++;
if(id==='alc'&&p.alcSuelo){cur.lineas.push({d:t.d+' \u2014 en el suelo',q:MD.suelo>0?MD.suelo:1,u:t.u,p:t.p,paquete:p.nombre});añad++}})});
/* frases que no han encajado con nada de la tarifa: entran a cero, con su cantidad, y se pide el precio */
var frases=txt.split(/[,;.]| y (?=(?:poner|colocar|hacer|montar|instalar|cambiar|quitar|picar|tirar|sacar|levantar|echar|meter|pintar|alicat|lijar|nivelar|reformar|arreglar|sustituir|renovar|abrir|forrar|revestir|alisar|enlucir|chapar|embaldos|enlos|acuchill|barniz)\b)/).map(function(f){return f.trim()}).filter(function(f){return f.replace(/[^a-z]/g,'').length>=6});
var sinPrecio=[];
frases.forEach(function(fr){if(/^(?:un|una|dos|tres|\d+)\s+(?:puertas?|ventanas?)$/.test(fr.trim()))return;if(paq.some(function(p){return p.re.test(fr)}))return;
var fr2=fr;(window.SINON||[]).forEach(function(r){fr2=fr2.replace(r[0],r[1])});
var enc=T.some(function(t){return t.k.some(function(k){var kk=norm(k);var rx=new RegExp('\\b'+kk.split(' ').map(function(w){return w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}).join('(?:\\s+(?:el|la|los|las|un|una|de|del))?\\s+')+'\\b');return rx.test(fr2)})});
if(enc)return;
if(!/\b(poner|colocar|hacer|montar|instalar|cambiar|quitar|picar|tirar|sacar|levantar|echar|meter|pintar|alicat\w*|lijar|nivelar|reformar|arreglar|reparar|sustituir|renovar|abrir|cerrar|tapar|forrar|revestir|sellar|impermeabilizar|desatascar|limpiar|acuchillar|barnizar|lacar|enlucir|rasear|microcemento|mampara|grifo|grifer\w*|radiador|caldera|persiana|encimera|silicona|marmol|granito|piedra|madera|hierro|aluminio|cristal|espejo)\b/.test(fr))return;
var par=parecida(fr),c=cantidadDe(fr);
if(par){var t=par.t;if(yaD[norm(t.d).slice(0,40)])return;var q=c.q;if(t.u==='m2'&&PARED.indexOf(t.id)>-1&&MD.suelo>0&&!/m2|metros cuadrados/.test(fr))q=paredNeta(MD);cur.lineas.push({d:t.d,q:q,u:t.u,p:t.p});yaD[norm(t.d).slice(0,40)]=1;añad++;return}
var dl=fr.replace(/(?:de\s+|unos\s+)?\d+(?:[.,]\d+)?\s*(?:m2|m\u00b2|metros cuadrados|metros lineales|metros|ml|m|ud|uds|unidades)\b/g,'').replace(/^(?:quiero|hay que|habria que|tambien|y)\s+/,'').replace(/\s+/g,' ').replace(/[\s,]+$/,'').trim();if(dl.length<4)dl=fr;var d=dl.charAt(0).toUpperCase()+dl.slice(1);var ap=aprendidoParecido(dl);
if(yaD[norm(d).slice(0,40)])return;
cur.lineas.push({d:d,q:c.q,u:c.u,p:ap});yaD[norm(d).slice(0,40)]=1;añad++;if(!(ap>0))sinPrecio.push(d)});
(function(){var m=txt.match(/tirar tabique[^,.;]*?(\d+(?:[.,]\d+)?)\s*(?:m2|m\u00b2|metros cuadrados|metros)\b/);var tabT=T.find(function(x){return x.id==='tab'});if(!m||!tabT)return;var l=cur.lineas.find(function(x){return x.d===tabT.d});if(!l)return;var r=tabiqueSegunMetros(num(m[1]));l.d=r.d;l.q=r.q;l.u=r.u;l.p=r.p;añad=añad||1})();
if(añad)renderLineas();
var ci=document.getElementById('convInfo');if(!ci)return;var extra='';
if(MD.altoSupuesto&&(window.__PARED||[]).length)extra+='<div style="margin-top:6px;font-size:13px">Alto de pared supuesto: <b>2,5 m</b>. Si es otro, dilo («2,7 de alto») y lo recalculo.</div>';
if(paq.length)extra+='<div style="background:#E8F1FB;border-left:4px solid #2B6CB0;padding:9px;border-radius:6px;margin-top:8px;font-size:13px"><b>'+paq.map(function(p){return p.nombre}).join(' y ')+':</b> he metido todos los trabajos que suele llevar. Quita los que no toquen y revisa las cantidades.</div>';
if(sinPrecio.length)extra+='<div style="background:#FBE9E2;border-left:4px solid var(--brick);padding:9px;border-radius:6px;margin-top:8px;font-size:13px"><b>No está en tu tarifa:</b> '+sinPrecio.map(function(d){return '«'+d.slice(0,60)+'»'}).join(', ')+'.<br>Pon su precio abajo y me lo quedo para la próxima.</div>';
if(añad&&!/trabajo/.test(ci.textContent))ci.innerHTML='<b style="color:#1E6B3A">'+añad+(añad===1?' trabajo añadido':' trabajos añadidos')+'.</b> Revisa abajo las cantidades.';
ci.innerHTML+=extra};
/* 4) listas de otros (arquitecto, estudio, otro albañil): si el diccionario no encuentra, se busca la partida mas parecida;
      y una colocacion nunca se empareja con una demolicion */
var casar0=window.casar;
var SIN_PARTIDA=[/mampara/,/manta impermeable|lamina impermeable|impermeabiliz/,/conexion\w* a bajante/,/sacado de esquina/,/proteccion en zonas comunes|revestimientos? de proteccion/,/(levante|formacion|cerrar|cegar|tapiar).{0,40}hueco de puerta|para cerrar hueco/,/relleno (en suelo )?de huecos/,/rozas en suelo/];
var FORZAR=[[/(derribo|demolici\w*|levant\w*).{0,20}tabiquer|derribo de tabique/,'tab'],[/lucido.*(perliescayola|yeso).*cocina|(perliescayola|yeso).*cocina/,'luc'],[/tapado de rozas|ayuda a gremios|ayuda gremios/,'ayf'],[/desescombro general.*ba.o/,'san'],[/levantad\w* de alicatad|levantad\w*.*azulej/,'ali'],[/levantad\w* de solado|picado de solado/,'sol']];
window.casar=function(titulo){var n=norm(titulo||'');if(/mampara/.test(n)&&!/plato/.test(n))return null;
for(var i=0;i<SIN_PARTIDA.length;i++)if(SIN_PARTIDA[i].test(n))return null;
for(var j=0;j<FORZAR.length;j++)if(FORZAR[j][0].test(n))return FORZAR[j][1];
var id=casar0(titulo);var T=tarifa();var t=id&&T.find(function(x){return x.id===id});
var esDem=DEMOL_RE.test(n)&&!HACER_RE.test(n);
if(t&&t.c==='Demoliciones'&&['con','con7','mon','limp','limf'].indexOf(t.id)<0&&!esDem)t=null;
if(t)return t.id;var p=parecida(titulo);return p?p.t.id:null};
/* 5) lo que se pone a mano en una linea a cero, se aprende para la proxima */
document.addEventListener('change',function(e){var inp=e.target;if(!inp||!inp.classList||!inp.classList.contains('lp'))return;var tr=inp.closest('tr');if(!tr)return;var d=tr.querySelector('.ld');var p=num(inp.value);if(d&&p>0&&window.aprendePrecio){var txt=d.value||d.textContent||'';if(txt&&!tarifa().some(function(t){return t.d===txt}))aprendePrecio(txt,p,(tr.querySelector('.lu')||{}).value||'')}},true);

/* lector de listas: la unidad que va al final de la linea de abajo, y las notas a mano ("añadir rozas...") */
var parseMed0=window.parseMediciones;
window.parseMediciones=function(lineas){var out=parseMed0(lineas);var L=lineas.map(function(l){return l.replace(/\s+/g,' ').trim()});
var UN=/(?:^|\s)(m²|m2|m3|ml\.?|ud\.?|uds\.?|pa)\s*$/i;
out.forEach(function(p){var k=p.t.slice(0,35);var i=L.findIndex(function(l){return l.indexOf(k)>-1});if(i<0)return;
 for(var j=i;j<Math.min(L.length,i+3);j++){if(j>i&&/\d+,\d{2}\s*$/.test(L[j])&&!UN.test(L[j]))break;var m=L[j].match(UN);if(m){var u=m[1].toLowerCase().replace('²','2').replace(/\.$/,'').replace('uds','ud');if(u!==p.u){p.u=u;p.uCorregida=true}break}}});
L.forEach(function(l){var m=l.match(/^(?:a[ñn]adir|incluir|sumar|anadir)\s+(.{8,})$/i);if(m&&!out.some(function(p){return p.t.indexOf(m[1].slice(0,20))>-1}))out.push({code:'',u:'pa',t:m[1].replace(/\.$/,'').replace(/^./,function(c){return c.toUpperCase()}),q:1,pa:null,anadida:true})});
return out};
})();
