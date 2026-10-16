/* La escena del dictado (se carga después de entiende.js).
   Antes de traducir a partidas, saca del dictado QUÉ ESTANCIAS se nombran (con sus metros, si se dicen)
   y QUÉ SE HACE EN CADA UNA. Resuelve lo que antes se perdía al ir frase a frase:
     · «En el salón y en el principal, quitar el papel»            → lo mismo en las dos
     · «En el pasillo, salón y las dos habitaciones, poner tarima» → en cada una
     · «En las tres, pintar» · «esas mismas estancias» · «en todo eso» · «en los dos» → las de antes
     · «El salón tiene 18 metros, el principal 13…» y luego «pintar el salón» → con sus metros
   y lo vuelve a escribir de la forma que el intérprete entiende bien: una frase por estancia
   («en el salón de 18 metros quitar el papel, pintar paredes y techos»).
   Solo toca estancias «de pintar y suelos» (salón, comedor, pasillo, dormitorios, habitaciones, despacho, vestidor…).
   Baños, cocinas, toda la casa, puertas, radiadores, electricidad… se quedan como se dijeron.
   Si algo no se entiende seguro (una referencia que no se sabe a qué estancias va), la frase se deja tal cual.
   Para comparar con lo de antes: window.__sinEscena=true. */
(function(){
var API=function(){return window.__paqApi||{}};
var nrm=function(s){return (window.norm?norm(String(s||'')):String(s||'').toLowerCase())};
var LIG='salon(?:es)?(?:\\s+comedor)?|comedor(?:es)?|pasillos?|recibidor(?:es)?|hall|dormitorios?|habitacion(?:es)?|despachos?|vestidor(?:es)?|cuartos?(?!\\s+de\\s+(?:bano|aseo|banos|estar))|sala de estar';
var PES=/\b(cuarto de bano|banos?|aseos?|cocinas?|terrazas?|galerias?|trasteros?|buhardillas?|garajes?|fachadas?|escaleras?|portal(?:es)?|balcon(?:es)?|lonjas?|bajeras?|txoko)\b/;
var CASA=/\b(piso|casa|vivienda|apartamento|chalet|adosado|toda la planta|todas las estancias|todas las habitaciones|todo el resto|lo demas|el resto)\b/;
var CONT=/\b(puertas?|radiador\w*|ventanas?|persianas?|armarios?|enchufes?|puntos? de luz|luz|electric\w*|instalacion\w*|calefacc\w*|fontaner\w*|boletin|contenedor\w*|limpieza|ascensor|montacargas|caldera|aire acondicionado|tabiques?|derrib\w*|tirar|abrir|cerrar|ventanal\w*|sanitarios|mampara|plato|ducha)\b/;
var TRAB=/\b(pint\w*|gotele|papel(?:es)?|lij\w*|rasc\w*|alis\w*|tarima|flotante|parquet|laminad\w*|vinil\w*|moqueta|suelos?|falso techo|techos?|paredes|pared|lucir|lucid\w*|enluc\w*|rodapie\w*|nivel\w*|pladur|moldura\w*|escayola|acuchill\w*|barniz\w*|yeso|empapel\w*)\b/;
var APE='principal|grande|pequen[oa]|chic[oa]|de matrimonio|del matrimonio|de los ninos|de las ninas|del nino|de la nina|de los crios|de invitados|de la abuela|del abuelo|de arriba|de abajo|del fondo|de al lado|de la derecha|de la izquierda|del medio|de dentro|interior|exterior|doble|individual|de la nena|del nene|de la chica|del chico|de los chicos';
var NUMW='(?:\\d+(?:[.,]\\d+)?|(?:veinti\\w+|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|diez|once|doce|trece|catorce|quince|dieci\\w+|veinte|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)(?:\\s+y\\s+(?:uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|medio))?)';
var CNTW={dos:2,tres:3,cuatro:4,cinco:5,seis:6,ambos:2,ambas:2};
function numDe(x){x=String(x||'').trim();if(/^\d/.test(x))return parseFloat(x.replace(',','.'));var v=API().valorLetra?API().valorLetra(x):null;return v==null?NaN:v}
function sing(b){b=b.replace(/\s+comedor$/,' comedor');if(/^habitaciones$/.test(b))return 'habitacion';if(/^salones$/.test(b))return 'salon';if(/^(comedores|recibidores|vestidores)$/.test(b))return b.replace(/es$/,'');if(/^(dormitorios|pasillos|despachos|cuartos)$/.test(b))return b.replace(/s$/,'');return b}
function fem(b){return /^(habitacion|sala de estar)$/.test(sing(b))}
function apeN(a){return String(a||'').replace(/pequen[oa]/,'pequen').replace(/chic[oa]/,'chic').replace(/^del matrimonio$/,'de matrimonio')}
function nombreDe(e){var b=sing(e.base);if(e.n>1||e.n===0){var pl=b==='habitacion'?'habitaciones':(b==='salon'?'salones':(/r$/.test(b)?b+'es':b+'s'));return (fem(b)?'las ':'los ')+(e.n?({2:'dos',3:'tres',4:'cuatro',5:'cinco'}[e.n]||e.n)+' ':'')+pl+(e.ape?' '+e.ape:'')}
 return (fem(b)?'la ':'el ')+(e.otro?(fem(b)?'otra ':'otro '):'')+b+(e.ape?' '+e.ape:'')}
function fmt(n){return String(Math.round(n*100)/100).replace('.',',')}

/* las estancias que se nombran en un trozo: explícitas («el dormitorio principal de 13 metros»), cortas («el principal»)
   y las de antes («en los tres», «esas mismas estancias», «en todo eso») */
var RE_M=new RegExp('(?:\\b(?:en|de|del|para|a|al|y|e)\\s+)*(?:\\b(el|la|los|las|esos|esas|estos|estas|este|esta|su|sus|mi|mis)\\s+)?(?:\\b(dos|tres|cuatro|cinco|seis|\\d)\\s+)?(?:\\b(otr[oa]s?)\\s+)?\\b('+LIG+')\\b(?:\\s+('+APE+')\\b)?'+
 '(?:\\s+(?:(?:que\\s+)?(?:tiene|mide|son|es de|tendra|tendran|tienen|miden)\\s+|que\\s+son\\s+|de\\s+|con\\s+)?(?:unos\\s+|unas\\s+|mas o menos\\s+)?('+NUMW+'(?:\\s*(?:,|y)\\s*(?:de\\s+)?'+NUMW+')*)(?:\\s*(?:m2|metros cuadrados|metros|m)\\b(?!\\s*(?:lineales|de\\s+(?:alto|largo|ancho|altura|rodapie|pared|paredes))))?(?![\\w])(?!\\s*(?:puertas|radiador\\w*|ventanas|armarios|enchufes|ml\\b|metros lineales)))?','g');
var RE_EL=new RegExp('(?:\\b(?:en|de|del|para|a|al|y|e)\\s+)*\\b(el|la)\\s+('+APE+'|otr[oa])\\b(?!\\s+(?:'+LIG+'|bano|aseo|cocina|puerta|ventana|radiador|armario|metros|m2))','g');
var RE_ANA=new RegExp('(?:\\b(?:en|de|del|para|a|al|y|e)\\s+)*(?:\\b(?:esas|esos|estas|estos)\\s+(dos|tres|cuatro|cinco)(?:\\s+(?:mismas|mismos))?(?:\\s+(?:estancias|zonas|piezas|habitaciones|cuartos|sitios|partes|dormitorios))?|\\b(?:los|las)\\s+(dos|tres|cuatro|cinco)\\b(?!\\s+(?:'+LIG+'|bano|banos|aseos?|cocinas?|puertas|radiadores|ventanas|armarios|metros|veces|manos|capas|plantas|pisos|mamparas|y medio|primer\\w*))(?:\\s+(?:mismas|mismos))?|\\b(ambos|ambas)\\b|\\b(?:esas|esos|estas|estos)\\s+(?:mismas\\s+|mismos\\s+)?(?:estancias|zonas|piezas|habitaciones|cuartos|sitios|partes)\\b|\\btodo eso\\b|\\btodo lo anterior\\b|\\besas mismas\\b|\\besos mismos\\b|\\b(?:las|los) mismas?o?s? (?:estancias|zonas|sitios)\\b)','g');

function escena(bruto,op){op=op||{};
 if(window.__sinEscena)return null;
 var t=' '+nrm(bruto).replace(/[…!?¡¿"«»()]/g,' ')+' ';
 t=t.replace(/\b(?:eh+|em+|mm+|ehm+)\b/g,' ').replace(/[ \t]+/g,' ');
 var sinDec=t.replace(/(\d)[.,](\d)/g,'$1$2');
 if(!/[.;]/.test(sinDec)&&(sinDec.match(/,/g)||[]).length<2)return null; /* dictado sin puntos: lo parte el intérprete */
 if(!new RegExp('\\b('+LIG+')\\b').test(t))return null;
 /* frases: por punto o punto y coma (no los decimales) */
 var frases=[],buf='';t.replace(/(\d)[.,](\d)/g,'$1#$2').split(/([.;])/).forEach(function(x,i){if(i%2){frases.push(buf);buf='';return}buf+=x});if(buf.trim())frases.push(buf);
 frases=frases.map(function(f){return f.replace(/(\d)#(\d)/g,'$1,$2')});
 var reg=[],excl={},ultSet=null,ultAcc=null,usados={},cambia=false,info=[];
 var clave=function(e){return sing(e.base)+(e.n>1?'#'+e.n:(e.n===0?'#pl':''))+(e.otro?'#otro':'')+(e.ape?'|'+apeN(e.ape):'')};
 var frAct=0;var alta=function(e){var k=clave(e),x=reg.find(function(r){return r.k===k});
  /* «las habitaciones» después de «dos habitaciones de 12 y de 10»: son esas */
  if(!x&&e.n===0&&!(e.ms&&e.ms.length)){var pls=reg.filter(function(r){return sing(r.base)===sing(e.base)&&r.n>1&&apeN(r.ape)===apeN(e.ape)});if(pls.length===1)x=pls[0]}if(!x){x={k:k,base:e.base,ape:e.ape||'',n:e.n===0?0:(e.n||1),otro:e.otro,m2:null,ms:null};reg.push(x)}if(e.ms&&e.ms.length){x.mFr=frAct;if(x.n>1&&e.ms.length===x.n)x.ms=e.ms;else if(e.ms.length===1&&x.n===1)x.m2=e.ms[0]}return x};
 var hechos=frases.map(function(fr,ifr){frAct=ifr;
  var orig=fr;if(!fr.replace(/[^a-z0-9]/g,''))return {lit:fr};
  if(!new RegExp('\\b('+LIG+')\\b').test(fr)&&!RE_ANA.test(fr)&&!/\b(?:el|la)\s+(?:principal|grande|pequen[oa])\b/.test(fr)){RE_ANA.lastIndex=0;return {lit:fr}}RE_ANA.lastIndex=0;
  /* trozos: comas y dos puntos (no decimales); y «… y pintar» (otro verbo) */
  var tz=[];fr.replace(/(\d),(\d)/g,'$1#$2').split(/\s*[,:]\s*/).forEach(function(p){var V=API().VERBO_OBRA;var re=new RegExp('\\s+y\\s+(?=(?:luego\\s+|despues\\s+|tambien\\s+|ademas\\s+)?(?:'+(V?V.source.replace(/^\\b\(|\)\\b$/g,''):'pintar|quitar|poner')+')\\b)','g');var partes=p.split(re),jn=[];partes.forEach(function(q){if(jn.length&&new RegExp('\\b(?:'+(V?V.source.replace(/^\\b\(|\)\\b$/g,''):'pintar')+')\\s*$').test(jn[jn.length-1]))jn[jn.length-1]+=' y '+q;else jn.push(q)});jn.forEach(function(q){q=q.replace(/(\d)#(\d)/g,'$1,$2');if(q.replace(/[^a-z0-9]/g,''))tz.push(' '+q.trim()+' ')})});
  if(window.__escDebug)window.__escDebug.push(tz.slice());
  var pegar=null,movida=false,vistos=[],scope=null,acc=[],malo=false,usaRef=false,nRooms={},prevAcc=null,ultMen=null,descr=true,lits=[];
  tz.forEach(function(c){if(malo)return;
   var tieneL=new RegExp('\\b('+LIG+')\\b').test(c);
   /* lo que no es de pintar y suelos se queda como está */
   if(PES.test(c)||CASA.test(c)||CONT.test(c)){if(tieneL&&PES.test(c)&&!/\b(?:con|entre)\s+(?:la|el)\s+(?:cocina|bano)\b/.test(c))malo=true;acc.push({lit:c,scope:scope});descr=false;prevAcc=null;return}
   /* las estancias del trozo */
   var men=[],resto=c,m;
   RE_M.lastIndex=0;resto=resto.replace(RE_M,function(x,art,cnt,otro,base,ape,ms){var n=1;if(cnt)n=CNTW[cnt]||+cnt||1;else if(/(?:es|os|as)$/.test(base)&&!/^(?:salon comedor)$/.test(base)&&!/^sala de estar$/.test(base))n=0;
    var arr=null;if(ms){arr=ms.replace(/^\s*de\s+/,'').split(/\s*(?:,|\by\b)\s*(?:de\s+)?/).filter(Boolean).map(numDe);if(arr.some(isNaN))arr=null;else if(arr.length===2&&n===1&&arr[1]<1)arr=[arr[0]+arr[1]]}
    if(/^(esos|esas|estos|estas)$/.test(art||'')&&!cnt){usaRef=true}
    men.push({base:base,ape:ape||'',n:n||(arr&&arr.length>1?arr.length:0),otro:!!otro,ms:arr});return ' '});
   resto=resto.replace(RE_EL,function(x,art,ape){var a=apeN(ape);var cand=reg.filter(function(r){return /^otr/.test(ape)?r.otro:apeN(r.ape)===a&&r.n===1});if(cand.length!==1){malo=true;return x}men.push({ref:cand[0]});usaRef=true;return ' '});
   RE_ANA.lastIndex=0;resto=resto.replace(RE_ANA,function(x,n1,n2,n3){var n=CNTW[n1||n2||n3]||0;var cand=reg.filter(function(r){return !excl[r.k]});var set=null;
    if(n){var s2=[],tot=0;for(var i=cand.length-1;i>=0&&tot<n;i--){if(!cand[i].n){tot=-99;break}s2.unshift(cand[i]);tot+=cand[i].n}if(tot===n)set=s2;
      /* «en los tres» justo después de nombrar tres: esos */
      if(ultSet&&ultSet.reduce(function(a,r){return a+r.n},0)===n)set=ultSet}
    else set=ultSet||(cand.length?cand:null);
    if(!set||!set.length){malo=true;return x}set.forEach(function(r){men.push({ref:r})});usaRef=true;return ' '});
   if(malo)return;
   var es=men.map(function(e){return e.ref||alta(e)});es.forEach(function(r){if(vistos.indexOf(r)<0)vistos.push(r)});
   resto=resto.replace(/\b(?:en|de|del|para|y|e|tambien|ademas|luego|despues|solo|al|a|que|son|tiene|mide|unos|unas|el|la|los|las)\b/g,function(w){return ' '+w+' '}).replace(/\s+/g,' ');
   var rLimpio=resto.replace(/\b(?:en|de|del|para|y|e|tambien|ademas|luego|al|a|que|el|la|los|las|tiene|tienen|mide|miden|es|son|mismo|mismas|mismos|todo|toda|bueno|vale|mira|pues|tal|cual|y tal|hay|ahi)\b/g,' ').replace(/[^a-z0-9]/g,'');
   /* «… salón 20, perdona, 22»: corrige lo último */
   var mCorr=c.match(/^\s*(?:no\s+)?(?:perdona|perdon|digo|bueno|mejor|no)?\s*(?:,\s*)?(?:son\s+|de\s+|unos\s+)?(\d+(?:[.,]\d+)?|[a-z]+(?:\s+y\s+[a-z]+)?)\s*(?:m2|metros cuadrados|metros|m)?\s*$/);
   if(!es.length&&mCorr&&!isNaN(numDe(mCorr[1]))&&ultMen&&ultMen.m2!=null&&!acc.some(function(a){return a.accion})){ultMen.m2=numDe(mCorr[1]);return}
   if(!es.length&&/^\s*(?:y\s+)?(?:no\s+)?(?:perdona|perdon|digo|bueno|vale|mira|espera|o sea|bueno no|no perdona|mejor dicho|o mejor)\s*$/.test(c)){var pc=acc[acc.length-1];if(pc&&pc.accion&&/(?:perdona|perdon|digo|bueno|mejor|no)/.test(c)){pc.accion+=' '+c.trim();pc.orig+=', '+c.trim();pegar=pc}return}
   if(pegar&&!es.length){pegar.accion+=' '+c.trim();pegar.orig+=', '+c.trim();pegar=null;return}pegar=null;
   /* «el salón no», «el baño y el salón ni tocar», «el salón está bien»: fuera */
   if(es.length&&/\b(no|nada|ni|queda\w*|esta bien|estan bien|se deja\w*|dejar\w*|tocar\w*|bien)\b/.test(resto)&&!TRAB.test(resto.replace(/\btocar\w*\b/g,''))){es.forEach(function(r){excl[r.k]=1});acc.push({lit:c,scope:null});return}
   if(es.length)ultMen=es[es.length-1];
   if(es.length&&!rLimpio){/* solo estancias */
    var pv=acc[acc.length-1];
    if(pv&&pv.accion&&pv.trasera&&!scope){es.forEach(function(r){if(pv.rooms.indexOf(r)<0)pv.rooms.push(r)});return}
    scope=(scope&&acc.length===0?scope:[]).concat(es);return}
   /* solo una medida: de lo de antes */
   var mMed=c.match(/^\s*(?:y\s+)?(?:que\s+)?(?:son|seran|sera|es|serian?|de|unos|unas|en total|mas o menos)?\s*(?:unos\s+|unas\s+)?(\d+(?:[.,]\d+)?)\s*(m2|metros cuadrados|metros lineales|metros|ml|m)?\s*(?:lineales|cuadrados)?\s*(?:en total|mas o menos|aproximadamente)?\s*$/);
   if(!es.length&&mMed&&scope&&scope.length===1&&scope[0].n===1&&scope[0].m2==null&&!/lineal|ml/.test(mMed[0])&&!acc.some(function(a){return a.total})){scope[0].m2=parseFloat(mMed[1].replace(',','.'));scope[0].mFr=-1;movida=true;return}
   if(!es.length&&mMed){var pa=acc[acc.length-1];if(pa&&pa.accion&&!pa.total){pa.total=mMed[0].trim();if(/lineal|\bml\b/.test(pa.total)||/rodapie|moldura|zocalo/.test(pa.accion))pa.lineal=true;pa.orig=(pa.orig||'')+', '+c.trim();return}acc.push({lit:c,scope:scope});return}
   if(!TRAB.test(resto)){acc.push({lit:c,scope:scope});return}
   descr=false;
   var rooms=es.length?es.slice():(scope?scope.slice():(prevAcc&&TRAB.test(resto)&&/^\s*(?:y\s+)?(?:luego\s+|despues\s+|tambien\s+)?(?:pint|lij|lucir|empapel|poner|quitar|alis|rasc)/.test(resto)?prevAcc.rooms.slice():null));
   var accTxt=resto.replace(/\b(?:en|de|del)\s*$/,'').replace(/^\s*(?:y|e|tambien|ademas|luego|despues)\s+/,' ').replace(/\b(pint|lij|quit|pon|cambi|lev|arranc|empapel|luc|alis|rasc)(ar|er|ir)(?:lo|la|los|las)\b/g,'$1$2').replace(/\b(pintar|lijar|lucir)\s+todo\b/g,'$1').replace(/\btambien\b/g,' ').replace(/\s+/g,' ').trim();
   var mTot=accTxt.match(/\b\d+(?:[.,]\d+)?\s*(?:m2|metros cuadrados|metros lineales|metros|ml)\b/);
   accTxt=accTxt.replace(/^(?:y\s+)?con\s+(?=(?:el\s+|la\s+|su\s+)?(?:rodapie|tarima|flotante|parquet|laminado|vinilo|falso techo|papel pintado)\b)/,'poner ');
   var VB=API().VERBO_OBRA;if(VB&&!VB.test(' '+accTxt+' ')&&/^(?:el\s+|la\s+|un\s+|una\s+)?(rodapie|tarima|flotante|parquet|laminado|vinilo|papel pintado|falso techo|moqueta)/.test(accTxt))accTxt='poner '+accTxt;
   var a={orig:c.trim(),accion:accTxt,rooms:rooms||[],trasera:!!es.length,total:mTot?mTot[0]:null,lineal:/\b(?:lineales|ml)\b/.test(accTxt)||!!mTot&&/rodapie|moldura|zocalo/.test(accTxt)};
   if(/^\s*(?:lo mismo|igual|exactamente igual)\s*$/.test(accTxt)&&ultAcc){a.copia=ultAcc}
   acc.push(a);if(rooms)prevAcc=a});
  if(malo)return {lit:orig};
  var conSala=acc.filter(function(a){return a.accion&&a.rooms.length});
  if(!conSala.length){if(descr&&vistos.length)return {lit:orig,descr:true,salas:vistos};return {lit:orig}}
  conSala.forEach(function(a){if(a.copia)a.acciones=a.copia;else a.acciones=[a.accion];ultAcc=a.acciones});
  var nSalas={};conSala.forEach(function(a){a.rooms.forEach(function(r){nSalas[r.k]=1})});
  ultSet=null;conSala.forEach(function(a){ultSet=a.rooms});
  if(op.sinPuntos&&!usaRef)return {lit:orig};
  return {acc:acc,orig:orig,util:usaRef||movida||Object.keys(nSalas).length>1||conSala.some(function(a){return a.rooms.some(function(r){return (r.m2!=null||r.ms)&&r.mFr!==ifr})})}});
 /* se escribe otra vez: una frase por estancia */
 var out=[],todasUsadas={};
 hechos.forEach(function(h){if(!h.acc||!h.util)return;h.acc.forEach(function(a){if(a.accion&&a.rooms.length)a.rooms.forEach(function(r){todasUsadas[r.k]=1})})});
 if(!Object.keys(todasUsadas).length)return null;
 hechos.forEach(function(h,ih){
  if(!h.acc||!h.util){if(h.descr&&h.salas&&reg.length&&frasesDescr(h))return;out.push(h.lit!=null?h.lit:h.orig);return}
  var items=[],porSala={};
  h.acc.forEach(function(a){
   if(a.lit!=null){if(a.scope&&a.scope.length===1&&porSala[a.scope[0].k]){porSala[a.scope[0].k].acc.push(a.lit.trim());return}items.push({lit:a.lit.trim()});return}
   if(!a.rooms.length){items.push({lit:a.accion+(a.total&&a.accion.indexOf(a.total)<0?' '+a.total:'')});return}
   var mDe=function(r){return r.m2!=null?r.m2:(r.ms&&r.ms.length?r.ms.reduce(function(a,b){return a+b},0):null)};var sum=a.rooms.reduce(function(s,r){return s+(mDe(r)||0)},0),todasM=a.rooms.every(function(r){return mDe(r)!=null});
   var nT=a.total?parseFloat(a.total.replace(',','.')):0;
   if(a.rooms.length>1&&a.total&&(a.lineal||!todasM||Math.abs(sum-nT)>Math.max(1,nT*0.1))){
    /* una medida para todas juntas: una partida, de todas */
    var acc0=a.accion.replace(a.total,' ').replace(/\s+/g,' ').trim(),totS=a.total.replace(/^\s*(?:y\s+)?(?:que\s+)?(?:son|seran|sera|es|de)\s+/,'');
    items.push({lit:acc0+' '+a.rooms.map(function(r,i){return (i?' y ':'')+'en '+nombreDe(r)}).join('')+', '+totS});return}
   a.rooms.forEach(function(r){var it=porSala[r.k];if(!it){it={sala:r,acc:[]};porSala[r.k]=it;items.push(it)}(a.acciones||[a.accion]).forEach(function(x){var xx=a.rooms.length>1&&a.total&&!a.lineal?x.replace(a.total,' ').replace(/\s+/g,' ').trim():x;if(it.acc.indexOf(xx)<0)it.acc.push(xx)})})});
  var frs=items.map(function(it){if(it.lit!=null)return it.lit;var r=it.sala,med='';
   if(r.n>1&&r.ms&&r.ms.length===r.n)med=' de '+r.ms.map(fmt).join(' y ')+' metros';else if(r.m2!=null)med=' de '+fmt(r.m2)+' metros';
   return 'en '+nombreDe(r)+med+' '+it.acc.join(', ')});
  cambia=true;info.push(frs);out.push(frs.join('. '))});
 function frasesDescr(h){return h.salas.some(function(r){return todasUsadas[r.k]})&&h.salas.every(function(r){return todasUsadas[r.k]||(r.m2==null&&!r.ms)})}
 if(!cambia)return null;
 var texto=out.map(function(x){return x.trim()}).filter(Boolean).join('. ').replace(/\s+/g,' ').replace(/\s+([.,])/g,'$1')+'.';
 return {texto:texto,salas:reg.map(function(r){return {nombre:nombreDe(r),metros:r.ms||(r.m2!=null?r.m2:null),fuera:!!excl[r.k]}}),frases:info,antes:String(bruto)};
}
window.escena=escena;
})();
