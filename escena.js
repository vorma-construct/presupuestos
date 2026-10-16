/* La escena del dictado (se carga después de entiende.js; la llama el intérprete justo después de partir el dictado).
   Antes de traducir a partidas, saca del dictado QUÉ ESTANCIAS se nombran (con sus metros, si se dicen)
   y QUÉ SE HACE EN CADA UNA. Resuelve lo que antes se perdía al ir frase a frase:
     · «En el salón y en el principal, quitar el papel»            → lo mismo en las dos
     · «En el pasillo, salón y las dos habitaciones, poner tarima» → en cada una
     · «En las tres, pintar» · «esas mismas estancias» · «en todo eso» · «en los dos» → las de antes
     · «El salón tiene 18 metros, el principal 13…» y luego «pintar el salón» → con sus metros
     · dictado de corrido, sin comas: «… quitar gotelé en los tres pintar en los tres falso techo en el pasillo y en el salón no…»
   Cómo: el dictado se lee como una fila de piezas — ESTANCIAS (con sus metros), TRABAJOS (de pintar y suelos),
   MEDIDAS, NEGACIONES («el salón no») y LO DEMÁS (baños, cocinas, toda la casa, puertas…, que no se toca) —
   y cada grupo de estancias se engancha al trabajo que tiene delante («quitar gotelé en los tres») o, si ese ya tiene
   sitio, al de detrás («en los tres tarima flotante»). Después se vuelve a escribir una frase por estancia
   («en el salón de 18 metros quitar el papel, pintar paredes y techos»), que es como el intérprete lo entiende bien.
   Si una referencia no se sabe a qué estancias va, la frase se deja como se dijo.
   Para comparar con lo de antes: window.__sinEscena=true (la versión anterior de este archivo: tools/historial/escena_v1.js). */
(function(){
var API=function(){return window.__paqApi||{}};
var nrm=function(s){return (window.norm?norm(String(s||'')):String(s||'').toLowerCase())};
var LIG='salon(?:es)?(?:\\s+comedor)?|comedor(?:es)?|pasillos?|recibidor(?:es)?|hall|dormitorios?|habitacion(?:es)?|despachos?|vestidor(?:es)?|cuartos?(?!\\s+de\\s+(?:bano|aseo|banos|estar))|sala de estar';
var PES=/\b(cuarto de bano|banos?|aseos?|cocinas?|terrazas?|galerias?|trasteros?|buhardillas?|garajes?|fachadas?|escaleras?|portal(?:es)?|balcon(?:es)?|lonjas?|bajeras?|txoko)\b/;
var CASA=/\b(piso|casa|vivienda|apartamento|chalet|adosado|toda la planta|todas las estancias|todas las habitaciones|todo el resto|lo demas|el resto)\b/;
var CONT=/\b(premarcos?|puertas?|radiador\w*|ventanas?|persianas?|armarios?|enchufes?|puntos? de luz|luz|electric\w*|instalacion\w*|calefacc\w*|fontaner\w*|boletin|contenedor\w*|limpieza|ascensor|montacargas|caldera|aire acondicionado|tabiques?|derrib\w*|tirar|abrir|cerrar|ventanal\w*|sanitarios|mampara|plato|ducha)\b/;
var TRAB=/\b(pint\w*|gotele|papel(?:es)?|lij\w*|rasc\w*|alis\w*|tarima|flotante|parquet|laminad\w*|vinil\w*|moqueta|suelos?|falso techo|techos?|paredes|pared|lucir|lucid\w*|enluc\w*|rodapie\w*|nivel\w*|pladur|moldura\w*|escayola|acuchill\w*|barniz\w*|yeso|empapel\w*)\b/;
var APE='principal|grande|pequen[oa]|chic[oa]|de matrimonio|del matrimonio|de los ninos|de las ninas|del nino|de la nina|de los crios|de invitados|de la abuela|del abuelo|de arriba|de abajo|del fondo|de al lado|de la derecha|de la izquierda|del medio|de dentro|interior|exterior|doble|individual|de la nena|del nene|de la chica|del chico|de los chicos';
var NUMW='(?:\\d+(?:[.,]\\d+)?|(?:veinti\\w+|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|diez|once|doce|trece|catorce|quince|dieci\\w+|veinte|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)(?:\\s+y\\s+(?:uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|medio))?)';
var CNTW={dos:2,tres:3,cuatro:4,cinco:5,seis:6,ambos:2,ambas:2};
function numDe(x){x=String(x||'').trim();if(/^\d/.test(x))return parseFloat(x.replace(',','.'));var v=API().valorLetra?API().valorLetra(x):null;return v==null?NaN:v}
function sing(b){if(/^habitaciones$/.test(b))return 'habitacion';if(/^salones$/.test(b))return 'salon';if(/^(comedores|recibidores|vestidores)$/.test(b))return b.replace(/es$/,'');if(/^(dormitorios|pasillos|despachos|cuartos)$/.test(b))return b.replace(/s$/,'');return b}
function fem(b){return /^(habitacion|sala de estar)$/.test(sing(b))}
function apeN(a){return String(a||'').replace(/pequen[oa]/,'pequen').replace(/chic[oa]/,'chic').replace(/^del matrimonio$/,'de matrimonio')}
function nombreDe(e){var b=sing(e.base);if(e.n>1||e.n===0){var pl=b==='habitacion'?'habitaciones':(b==='salon'?'salones':(/r$/.test(b)?b+'es':b+'s'));return (fem(b)?'las ':'los ')+(e.n?({2:'dos',3:'tres',4:'cuatro',5:'cinco'}[e.n]||e.n)+' ':'')+pl+(e.ape?' '+e.ape:'')}
 return (fem(b)?'la ':'el ')+(e.otro?(fem(b)?'otra ':'otro '):'')+b+(e.ape?' '+e.ape:'')}
function fmt(n){return String(Math.round(n*100)/100).replace('.',',')}
function mDe(r){return r.m2!=null?r.m2:(r.ms&&r.ms.length?r.ms.reduce(function(a,b){return a+b},0):null)}

/* ---- las piezas ---- */
var PRE='(?:(?:en|de|del|para|a|al|y|e|tambien|ademas|luego|despues|solo|o)\\s+)*';
/* una estancia dicha: «en el dormitorio principal de 13 metros», «las dos habitaciones de 12 y de 10», «el despacho nueve» */
var R_EXP=new RegExp(PRE+'(?:(el|la|los|las|esos|esas|estos|estas|este|esta|su|sus|mi|mis)\\s+)?(?:(dos|tres|cuatro|cinco|seis|\\d)\\s+)?(?:(otr[oa]s?)\\s+)?('+LIG+')\\b(?:\\s+('+APE+')\\b)?'+
 '(?:\\s+(?:(?:que\\s+)?(?:tiene|mide|son|es de|tendra|tendran|tienen|miden)\\s+|que\\s+son\\s+|de\\s+|con\\s+)?(?:unos\\s+|unas\\s+|mas o menos\\s+)?('+NUMW+'(?:\\s*(?:,|y)\\s*(?:de\\s+)?'+NUMW+')*)(?:\\s*(?:m2|metros cuadrados|metros|m)\\b(?!\\s*(?:lineales|de\\s+(?:alto|largo|ancho|altura|rodapie|pared|paredes))))?(?![\\w])(?!\\s*(?:puertas|radiador\\w*|ventanas|armarios|enchufes|ml\\b|metros lineales|lineales)))?','y');
/* una estancia corta: «el principal», «la de matrimonio», «el pequeño», «el otro» */
var R_EL=new RegExp(PRE+'(el|la)\\s+('+APE+'|otr[oa])\\b(?!\\s+(?:'+LIG+'|bano|aseo|cocina|puerta|ventana|radiador|armario|metros|m2|\\d))','y');
/* las de antes: «en los tres», «de esas dos», «ambos», «esas mismas estancias», «todo eso» */
var R_ANA=new RegExp(PRE+'(?:(?:esas|esos|estas|estos)\\s+(dos|tres|cuatro|cinco)(?:\\s+(?:mismas|mismos))?(?:\\s+(?:estancias|zonas|piezas|habitaciones|cuartos|sitios|partes|dormitorios))?|(?:los|las)\\s+(dos|tres|cuatro|cinco|[2-6])\\b(?!\\s*(?:[.,]\\d|'+LIG+'|bano|banos|aseos?|cocinas?|puertas|radiadores|ventanas|armarios|metros|m2|m\\b|veces|manos|capas|plantas|pisos|mamparas|y medio|primer\\w*))(?:\\s+(?:mismas|mismos))?|(ambos|ambas)\\b|(?:esas|esos|estas|estos)\\s+(?:mismas\\s+|mismos\\s+)?(?:estancias|zonas|piezas|habitaciones|cuartos|sitios|partes)\\b|todo eso\\b|todo lo anterior\\b|esas mismas\\b|esos mismos\\b|(?:las|los) mism[oa]s (?:estancias|zonas|sitios)\\b)','y');
/* una medida suelta: «son 42 metros en total», «unos 35 metros lineales», «pon 42 metros lineales» */
var R_MED=new RegExp('(?<!\\b(?:por|x)\\s)(?:(?:y\\s+)?(?:que\\s+)?(?:son|seran|sera|serian|es|de|pon|ponle|calcula|unos|unas|mas o menos|aproximadamente|en total)\\s+)*(\\d+(?:[.,]\\d+)?)(?![.,]?\\d)\\s*(m2|metros cuadrados|metros lineales|metros|ml|m)?\\b(?:\\s*(?:lineales|cuadrados))?(?:\\s+(?:en total|mas o menos|aproximadamente|o asi|y pico|y algo))?(?!\\s*(?:puertas|radiador\\w*|ventanas|armarios|enchufes|x\\b|por\\b|de\\s+(?:alto|largo|ancho)))','y');
/* «… y en el salón no», «el salón está bien», «el salón ni tocar» */
var R_NEG=/^(?:no\b(?!\s+(?:se\s+)?(?:pinta|quita|pone|cambia)\b)(?:\s+se\s+toca\w*)?|nada\b|ni\s+tocar\w*|ni\s+se\s+toca\w*|esta\s+bien|estan\s+bien|se\s+queda\w*(?:\s+como\s+esta\w*)?|no\s+se\s+toca\w*|tampoco\b)/;
var CONN=/^(?:y|e|o|tambien|ademas|luego|despues|que|pero|primero|bueno|vale|mira|pues|es|entonces|solo|antes|ahora|tal|cual|venga|a ver|ver|a|en|de|del|el|la|los|las|lo|eso|esto|asi)$/;
var TRABW='pint\\w*|gotele|papel pintado|papel|lij\\w*|tarima|flotante|parquet|laminad\\w*|vinil\\w*|moqueta|falso techo|rodapie\\w*|lucir|enluc\\w*|quitar|poner|cambiar|levantar|arrancar|acuchill\\w*|barniz\\w*|alis\\w*|rasc\\w*';
var NOSEP=/^(?:y|e|o|de|del|con|el|la|los|las|en|a|al|sin|que|para|un|una|unos|unas|su|sus|hay|quiere|quieren|tambien|solo|nuevo|nueva|ni|hay que|tiene que|tienen que)$/;

function piezas(s){var T=[],i=0,m,VS=(API().VERBO_OBRA||/pintar|quitar|poner/).source.replace(/^\\b\(|\)\\b$/g,'');
 var try_=function(re){re.lastIndex=i;var x=re.exec(s);return x&&x[0].trim()?x:null};
 while(i<s.length){var ch=s[i];if(ch===' '){i++;continue}
  if(ch===','||ch===':'){T.push({t:'sep',c:ch});i++;continue}
  var lastR=T.length&&T[T.length-1].t==='R';
  if((m=try_(R_EXP))){T.push({t:'R',k:'exp',m:m,x:m[0]});i+=m[0].length;continue}
  if((m=try_(R_ANA))){T.push({t:'R',k:'ana',m:m,x:m[0]});i+=m[0].length;continue}
  if((m=try_(R_EL))){T.push({t:'R',k:'el',m:m,x:m[0]});i+=m[0].length;continue}
  if(lastR){var mn=s.slice(i).match(R_NEG);if(mn){T.push({t:'N',x:mn[0]});i+=mn[0].length;continue}}
  if((m=try_(R_MED))){T.push({t:'M',x:m[0],v:parseFloat(m[1].replace(',','.')),lin:/lineal|\bml\b/.test(m[0])});i+=m[0].length;continue}
  var w=s.slice(i).match(/^[a-z0-9]+(?:[.,]\d+)?/);if(!w){i++;continue}T.push({t:'w',x:w[0]});i+=w[0].length}
 return T}

function escena(bruto,op){op=op||{};
 if(window.__sinEscena)return null;
 var t=' '+nrm(bruto).replace(/[…!?¡¿"«»()]/g,' ')+' ';
 t=t.replace(/\b(?:eh+|em+|mm+|ehm+)\b/g,' ').replace(/[ \t]+/g,' ');
 if(!new RegExp('\\b('+LIG+')\\b').test(t))return null;
 /* «de salón y habitaciones son 60 metros», «en salón y habitaciones 50 metros»: con dos o más estancias, la medida es del trabajo (de todas), no de la última */
 var listaTot=false;t=t.replace(new RegExp('(\\b(?:'+LIG+')\\b\\s+(?:y|e)\\s+(?:(?:el|la|los|las|en|de|del)\\s+)*(?:dos\\s+|tres\\s+)?(?:'+LIG+')\\b(?:\\s+(?:'+APE+')\\b)?)\\s+(?:(?:que\\s+)?(?:son|seran|en total)\\s+)?(?=(?:unos\\s+|unas\\s+)?\\d+(?:[.,]\\d+)?\\s*(?:m2|metros|m\\b))','g'),function(x,a){listaTot=true;return a+', son '});
 var VS=(API().VERBO_OBRA||/pintar|quitar|poner/).source.replace(/^\\b\(|\)\\b$/g,'');
 /* frases: por punto o punto y coma (no los decimales) */
 var frases=[],buf='';t.replace(/(\d)[.,](\d)/g,'$1#$2').split(/([.;])/).forEach(function(x,i){if(i%2){frases.push(buf);buf='';return}buf+=x});if(buf.trim())frases.push(buf);
 frases=frases.map(function(f){return f.replace(/(\d)#(\d)/g,'$1,$2').replace(/\s+/g,' ')});
 var ultWs=null; var reg=[],excl={},ultSet=null,ultAcc=null,cambia=false,info=[],todasUsadas={};
 var clave=function(e){return sing(e.base)+(e.n>1?'#'+e.n:(e.n===0?'#pl':''))+(e.otro?'#otro':'')+(e.ape?'|'+apeN(e.ape):'')};
 var frAct=0;var alta=function(e){var k=clave(e),x=reg.find(function(r){return r.k===k});
  /* «las habitaciones» después de «dos habitaciones de 12 y de 10»: son esas */
  if(!x&&e.n===0&&!(e.ms&&e.ms.length)){var pls=reg.filter(function(r){return sing(r.base)===sing(e.base)&&r.n>1&&apeN(r.ape)===apeN(e.ape)});if(pls.length===1)x=pls[0]}
  if(!x){x={k:k,base:e.base,ape:e.ape||'',n:e.n===0?0:(e.n||1),otro:e.otro,m2:null,ms:null};reg.push(x)}
  if(e.ms&&e.ms.length){x.mFr=frAct;if(x.n>1&&e.ms.length===x.n)x.ms=e.ms;else if(e.ms.length===1&&x.n===1)x.m2=e.ms[0]}return x};
 var hechos=frases.map(function(fr,ifr){frAct=ifr;var orig=fr;
  if(!fr.replace(/[^a-z0-9]/g,''))return {lit:fr};
  var T=piezas(fr);if(!T.some(function(p){return p.t==='R'}))return {lit:orig};
  /* «reformar el salón», «el salón entero», «reforma integral»: estancias enteras, las lleva el intérprete como siempre */
  if(/\b(?:reform\w*|renov\w*|rehac\w*|moderniz\w*)\b(?!(?:\s+[a-z]+){0,3}?\s+(?:banos?|aseos?|cocinas?)\b)/.test(fr)||new RegExp('\\b(?:'+LIG+')\\b(?:\\s+(?:'+APE+'))?(?:\\s+(?:de\\s+|que tiene\\s+)?\\d+(?:[.,]\\d+)?(?:\\s*(?:m2|metros cuadrados|metros))?)?\\s+(?:tambien\\s+)?(?:enter[oa]s?|complet[oa]s?|integral(?:es)?|de cero|nuev[oa]s?\\b(?!\\s+(?:de|con)\\b))').test(fr)||/\b(?:reforma integral|obra integral|integral\b|todo nuevo|toda nueva|(?:se|lo|la)\s+(?:hacen?|reforman?)\s+(?:todo\s+)?enter[oa]|(?:piso|casa|vivienda)\s+(?:enter[oa]|complet[oa])|reformar\s+(?:el|la|todo el|toda la)\s+(?:piso|casa|vivienda))\b/.test(fr))return {lit:orig};
  /* 1) las estancias de cada pieza (las de antes, las cortas) */
  var malo=false,usaRef=false,ultBase=null,vistos=[];
  T.forEach(function(p){if(p.t!=='R'||malo)return;var m=p.m;var nxT=T[T.indexOf(p)+1];p.tambien=/\b(?:tambien|ademas)\b/.test(p.x)||!!(nxT&&nxT.t==='w'&&/^(?:tambien|igual)$/.test(nxT.x)&&(function(){var n2=T[T.indexOf(p)+2];return !n2||n2.t==='sep'||n2.t==='w'&&/^(?:y|e)$/.test(n2.x)})());p.tamTras=p.tambien&&!/\b(?:tambien|ademas)\b/.test(p.x);
   if(p.k==='exp'){var art=m[1],cnt=m[2],otro=m[3],base=m[4],ape=m[5],ms=m[6];var n=1;if(cnt)n=CNTW[cnt]||+cnt||1;else if(/(?:es|os|as)$/.test(base)&&!/^sala de estar$/.test(base))n=0;
    var arr=null;if(ms){arr=ms.replace(/^\s*de\s+/,'').split(/\s*(?:,|\by\b)\s*(?:de\s+)?/).filter(Boolean).map(numDe);if(arr.some(isNaN))arr=null;else if(arr.length===2&&n===1&&arr[1]<1)arr=[arr[0]+arr[1]]}
    if(/^(esos|esas|estos|estas)$/.test(art||'')&&!cnt)usaRef=true;
    p.rs=[alta({base:base,ape:ape||'',n:n||(arr&&arr.length>1?arr.length:0),otro:!!otro,ms:arr})];ultBase=base}
   else if(p.k==='el'){var ap=m[2],a=apeN(ap);var cand=reg.filter(function(r){return /^otr/.test(ap)?r.otro:apeN(r.ape)===a&&r.n===1});
    if(cand.length===1)p.rs=[cand[0]];
    /* «el dormitorio grande y el pequeño», «la de los niños y la de matrimonio»: otra estancia como la de antes */
    else if(!cand.length&&ultBase&&!/^otr/.test(ap))p.rs=[alta({base:ultBase,ape:ap,n:1})];
    else if(!cand.length&&ultBase&&/^otr/.test(ap))p.rs=[alta({base:ultBase,ape:'',n:1,otro:true})];
    else {malo=true;return}usaRef=true}
   else{var n2=CNTW[m[1]||m[2]||m[3]]||(/^[2-6]$/.test(m[2]||'')?+m[2]:0);var cand2=reg.filter(function(r){return !excl[r.k]});var set=null;
    if(n2){if(ultSet&&ultSet.reduce(function(a,r){return a+r.n},0)===n2)set=ultSet;else{var s2=[],tot=0;for(var i=cand2.length-1;i>=0&&tot<n2;i--){if(!cand2[i].n){tot=-99;break}s2.unshift(cand2[i]);tot+=cand2[i].n}if(tot===n2)set=s2}}
    else set=ultSet||(cand2.length?cand2:null);
    if(!set||!set.length){malo=true;return}p.rs=set.slice();usaRef=true}
   p.rs.forEach(function(r){if(vistos.indexOf(r)<0)vistos.push(r)});
   /* para «en los tres» de luego: el último grupo de estancias seguidas */
   var j=T.indexOf(p),prevR=null;for(var k=j-1;k>=0;k--){var q=T[k];if(q.t==='sep'||q.t==='N'||q.t==='w'&&CONN.test(q.x))continue;if(q.t==='R')prevR=q;break}
   ultSet=prevR&&prevR.__grupo?prevR.__grupo.concat(p.rs.filter(function(r){return prevR.__grupo.indexOf(r)<0})):p.rs.slice();p.__grupo=ultSet});
  if(malo)return {lit:orig};
  /* 2) en grupos: trozos de palabras (trabajos y lo demás), grupos de estancias, medidas */
  var I=[],cur=null;
  var cerrar=function(){if(cur){I.push(cur);cur=null}};
  T.forEach(function(p){
   if(p.t==='w'){if(!cur)cur={t:'S',w:[]};cur.w.push(p.x);return}
   cerrar();
   if(p.t==='sep'){I.push({t:'sep'});return}
   if(p.t==='R'){var u=I.length?I[I.length-1]:null,u2=I.length>1?I[I.length-2]:null;
    /* «… en el salón y en el pasillo también»: un mismo grupo (con «y», «también», comas) */
    var prepDe=function(x){return /^\s*(?:y\s+|e\s+)?(?:tambien\s+)?(?:en|de|del|para)\b/.test(x)};if(u&&u.t==='G')u.rs.push(p);else if(u&&u.t==='sep'&&u2&&u2.t==='G'&&(/^\s*(?:y|e)\b/.test(p.x)||!op.sinPuntos||!(prepDe(u2.rs[u2.rs.length-1].x)&&/^\s*(?:el|la|los|las)\b/.test(p.x))))u2.rs.push(p);else I.push({t:'G',rs:[p]});return}
   if(p.t==='N'){var g=I.length?I[I.length-1]:null;if(g&&g.t==='G'){g.rs[g.rs.length-1].neg=true;g.cerrado=true}else I.push({t:'S',w:[p.x]});return}
   if(p.t==='M'){I.push({t:'M',x:p.x,v:p.v,lin:p.lin});return}});
  cerrar();
  /* los trozos de palabras: trabajo, lo demás (se queda), o relleno */
  var I2=[];I.forEach(function(it){if(it.t!=='S'){I2.push(it);return}
   var tx=' '+it.w.join(' ')+' ';
   if(PES.test(tx)||CASA.test(tx)||CONT.test(tx)){
    /* «tarima flotante y pintar y las tres puertas de arriba»: lo de las puertas aparte */
    var mC=tx.match(new RegExp('^(.*?\\b(?:'+TRABW+')\\b.*?)\\s+((?:y\\s+)?(?:(?:las|los|el|la)\\s+)?(?:\\d+\\s+|dos\\s+|tres\\s+|cuatro\\s+|cinco\\s+|seis\\s+)?(?:puertas?|radiador\\w*|ventanas?|armarios?|persianas?|enchufes?)\\b.*)$'));
    /* «el baño no, que lo hicieron hace poco, luego quitar el gotelé»: lo del baño aparte y luego el trabajo */
    var mL=tx.match(/^(.*?)\s+((?:y\s+)?(?:luego|despues|ademas|y tambien)\s+.*)$/);
    if(mL&&TRAB.test(' '+mL[2]+' ')&&!PES.test(' '+mL[2]+' ')&&!CASA.test(' '+mL[2]+' ')&&!CONT.test(' '+mL[2]+' ')){I2.push({t:'X',x:mL[1].trim()});partirW(mL[2]).forEach(function(x){I2.push({t:TRAB.test(' '+x+' ')?'W':'O',x:x})});return}
    if(mC&&TRAB.test(' '+mC[1]+' ')&&!PES.test(mC[1])&&!CASA.test(mC[1])&&!CONT.test(mC[1])){partirW(mC[1]).forEach(function(x){I2.push({t:'W',x:x})});I2.push({t:'X',x:mC[2].trim()});return}
    I2.push({t:'X',x:tx.trim()});return}
   /* «… y en el dormitorio lo mismo y el suelo flotante…»: «lo mismo» aparte de lo que viene detrás */
   var mLm=tx.match(/^\s*((?:y\s+)?(?:lo mismo|igual|tambien lo mismo))\s+(?:y\s+)?(.+)$/);if(mLm&&TRAB.test(' '+mLm[2]+' ')){I2.push({t:'O',x:mLm[1]});partirW(mLm[2]).forEach(function(x){I2.push({t:TRAB.test(' '+x+' ')?'W':'O',x:x})});return}
   if(TRAB.test(tx)){partirW(tx).forEach(function(x){I2.push({t:TRAB.test(' '+x+' ')?'W':'O',x:x})});return}
   I2.push({t:'O',x:tx.trim(),vacio:it.w.every(function(w){return CONN.test(w)})})});
  function partirW(tx){var ws=tx.trim().split(/\s+/),out=[],cu=[];var reIni=new RegExp('^(?:rodapie\\w*|tarima|parquet|moqueta|gotele|'+VS+')$');
   ws.forEach(function(w,k){var prev=cu.length?cu[cu.length-1]:'';var dos=prev+' '+w;
    if(cu.length&&!(k===ws.length-1&&new RegExp('^(?:'+VS+')$').test(w))&&!(new RegExp('^(?:'+VS+')$').test(w)&&!cu.some(function(x){return new RegExp('^(?:'+VS+')$').test(x)}))&&(reIni.test(w)||w==='falso'&&ws[k+1]==='techo'||w==='papel'&&ws[k+1]==='pintado'&&!/^(?:quitar|poner)$/.test(prev))&&new RegExp('\\b(?:'+TRABW+')\\b').test(cu.join(' '))&&!NOSEP.test(prev)&&!new RegExp('^(?:'+VS+'|quitando|poniendo|cambiando)$').test(prev)&&!/^(tarima|suelo|rodapie|papel|techo|paredes|pared|techos|falso)$/.test(prev)){out.push(cu.join(' '));cu=[]}
    cu.push(w)});if(cu.length)out.push(cu.join(' '));return out}
  /* 3) cada grupo de estancias, a su trabajo */
  var transp=function(it){return it.t==='sep'||it.t==='O'&&it.vacio};
  var vecino=function(j,d){for(var k=j+d;k>=0&&k<I2.length;k+=d){if(transp(I2[k]))continue;return I2[k]}return null};
  var vecinoIdx=function(j,d){for(var k=j+d;k>=0&&k<I2.length;k+=d){if(transp(I2[k]))continue;return k}return -1};
  /* primero, detrás de un trabajo («quitar gotelé en los tres»); luego, delante de uno («en los tres tarima flotante») */
  I2.forEach(function(it){if(it.t!=='G')return;var rs=[],neg=[];it.rs.forEach(function(p){(p.neg?neg:rs).push.apply(p.neg?neg:rs,p.rs)});it.rooms=rs;it.negs=neg});
  /* «en el salón y en el pasillo quitar el gotelé y pintar, y en el dormitorio lo mismo»: el grupo con «lo mismo» detrás es una copia; el de delante, el del trabajo */
  I2.forEach(function(it,j){if(it.t!=='G'||it.usado)return;var k=vecinoIdx(j,1),o=k>-1?I2[k]:null;if(!o||o.t!=='O'||!/^\s*(?:y\s+)?(?:lo mismo|igual|tambien lo mismo)\s*$/.test(o.x))return;var kw=vecinoIdx(j,-1),w=kw>-1?I2[kw]:null;if(!w||w.t!=='W')return;var kg=vecinoIdx(kw,-1),g0=kg>-1?I2[kg]:null;
   if(!w.rooms&&g0&&g0.t==='G'&&!g0.usado&&g0.rooms.length){w.rooms=g0.rooms.slice();w.delante=true;g0.usado='delante'}
   if(!w.rooms)return;var q=kw;while(q>=0){var z=I2[q];if(z.t==='W'&&z.rooms===w.rooms||z===w){it.rooms.forEach(function(r){if(w.rooms.indexOf(r)<0)w.rooms.push(r)})}q=-1}
   it.usado='tras';o.x='';o.vacio=true;usaRef=true});
  I2.forEach(function(it,j){if(it.t!=='G')return;var rs=it.rooms,neg=it.negs;
   var pv=vecino(j,-1),tamb=it.rs.some(function(p){return p.tambien});
   if(pv&&pv.t==='W'&&!pv.rooms){var kpv=I2.indexOf(pv),gAnt=vecino(kpv,-1);
    /* «en el salón papel pintado quitar, en el pasillo también…»: el de delante y los de «también», juntos */
    /* «quitar el gotelé del pasillo y pintarlo, y la habitación también»: lo de antes y esto, también en la habitación */
    if(tamb&&it.rs.some(function(p){return p.tamTras})&&gAnt&&gAnt.t==='G'&&gAnt.usado==='tras'){var wA=vecino(I2.indexOf(gAnt),-1);if(wA&&wA.t==='W'&&wA.rooms){rs.forEach(function(r){if(wA.rooms.indexOf(r)<0)wA.rooms.push(r)});pv.rooms=wA.rooms;pv.tras=true;it.usado='tras';usaRef=true;var oT=I2[j+1];if(oT&&oT.t==='O'&&/^\s*(?:tambien|igual)\s*$/.test(oT.x)){oT.x='';oT.vacio=true}return}}
    if(tamb&&gAnt&&gAnt.t==='G'&&!gAnt.usado&&gAnt.rooms&&gAnt.rooms.length){pv.rooms=gAnt.rooms.concat(rs.filter(function(r){return gAnt.rooms.indexOf(r)<0}));gAnt.usado='delante';pv.delante=true}else pv.rooms=rs.slice();
    pv.negs=neg;pv.tras=true;it.usado='tras';return}
   if(pv&&pv.t==='W'&&pv.rooms&&pv.tras&&tamb){rs.forEach(function(r){if(pv.rooms.indexOf(r)<0)pv.rooms.push(r)});it.usado='tras'}});
  /* «quitar el gotelé y pintar en el salón y en el dormitorio, y lo mismo en el pasillo»: el pasillo, al mismo trabajo */
  I2.forEach(function(it,j){if(it.t!=='G'||it.usado||!it.rooms.length)return;var k=vecinoIdx(j,-1);var o=k>-1?I2[k]:null;
   if(!o||o.t!=='O'||!/^\s*(?:y\s+)?(?:lo mismo|igual|exactamente igual|tambien lo mismo)\s*$/.test(o.x))return;
   var w=null;for(var q=k-1;q>=0;q--){var z=I2[q];if(z.t==='W'){w=z;break}if(z.t==='X')break}
   if(!w||!w.rooms||!w.rooms.length)return;var dest=[w];for(var q2=I2.indexOf(w)-1;q2>=0;q2--){var z2=I2[q2];if(z2.t==='W'&&z2.rooms===w.rooms)dest.unshift(z2);else if(z2.t==='W'&&z2.rooms&&w.rooms&&z2.rooms.length===w.rooms.length&&z2.rooms.every(function(r,i){return r===w.rooms[i]}))dest.unshift(z2);else if(!transp(z2)&&z2.t!=='G')break}
   dest.forEach(function(d){it.rooms.forEach(function(r){if(d.rooms.indexOf(r)<0)d.rooms.push(r)})});it.usado='tras';o.vacio=true;o.x='';usaRef=true});
  I2.forEach(function(it,j){if(it.t!=='G'||it.usado)return;var rs=it.rooms,neg=it.negs;
   var pv=vecino(j,-1),nx=vecino(j,1),tamb=it.rs.some(function(p){return p.tambien});
   if(pv&&pv.t==='W'&&pv.rooms&&tamb){rs.forEach(function(r){if(pv.rooms.indexOf(r)<0)pv.rooms.push(r)});it.usado='tras';return}
   if(nx&&nx.t==='W'&&!nx.rooms&&rs.length){nx.rooms=rs.slice();nx.delante=true;it.usado='delante';return}
   /* nada que hacer en ellas aquí: es cómo es la casa («el salón tiene 18 metros»), o «el salón no» */
   it.usado=false;if(neg.length&&!rs.length)neg.forEach(function(r){excl[r.k]=1})});
  /* un trabajo sin sitio detrás de otro con sitio: el mismo sitio («… tarima flotante y pintar») */
  var ultW=null;I2.forEach(function(it){if(it.t==='X'){ultW=null;return}if(it.t!=='W')return;
   if(!it.rooms&&ultW&&ultW.rooms&&ultW.rooms.length&&!/^\s*(?:y\s+)?(?:luego\s+|despues\s+)?(?:rodapie)/.test(it.x))it.rooms=ultW.rooms.slice(),it.hereda=true;
   if(it.rooms)ultW=it});
  /* «el parquet del salón, acuchillar y barnizar»: el suelo es lo que se acuchilla, no un suelo nuevo */
  I2.forEach(function(it,j){if(it.t!=='W'||new RegExp('\\b(?:'+VS+')\\b').test(it.x)||!/\b(?:suelo|parquet|tarima|madera|terrazo|marmol|gotele|papel|moqueta)\b/.test(it.x))return;
   var k=vecinoIdx(j,1);while(k>-1&&(I2[k].t==='G'&&I2[k].usado==='tras'||I2[k].t==='M'))k=vecinoIdx(k,1);var nx=k>-1?I2[k]:null;
   if(nx&&nx.t==='O'&&/^\s*(?:y\s+)?(quit|levant|arranc|sac|pint|lij|acuchill)(ar)(?:lo|la|los|las)\b/.test(nx.x)&&/\b(?:gotele|papel|moqueta|parquet|suelo|tarima)\b/.test(it.x)){var mv=nx.x.match(/^\s*(?:y\s+)?(quit|levant|arranc|sac|pint|lij|acuchill)(ar)(?:lo|la|los|las)\b/);it.x=mv[1]+'ar '+it.x.replace(/^\s*(?:mira|y)\s+/,'').trim();nx.x=nx.x.slice(mv[0].length).replace(/^\s*todo\b/,'').trim();if(!nx.x||/^(?:a ver|bueno|pues|vale)$/.test(nx.x)){nx.x='';nx.vacio=true}return}
   if(nx&&nx.t==='W'&&/^\s*(?:y\s+)?(?:acuchill|barniz|lij|pul|abrillant|tratar|arregl|reparar|restaur|quitar|levantar|arrancar|sacar)\w*/.test(nx.x)&&!/\b(?:suelo|parquet|tarima)\b/.test(nx.x)){nx.x=nx.x.trim()+' '+it.x.trim().replace(/^y\s+/,'');if(!nx.rooms&&it.rooms)nx.rooms=it.rooms;if(it.total&&!nx.total){nx.total=it.total;nx.totV=it.totV;nx.lin=it.lin}it.t='O';it.x='';it.vacio=true}});
  /* «Dormitorio principal: quitar papel, lijar y pintar. Dormitorio pequeño: lo mismo, diez metros.»: lo de la frase de antes, en este */
  if(ultWs&&ultWs.length&&!I2.some(function(z){return z.t==='W'})){I2.forEach(function(it,j){if(it.t!=='O'||!/^\s*(?:y\s+)?(?:lo mismo|igual|exactamente igual|tambien lo mismo|lo mismo tambien)\s*$/.test(it.x))return;var k=vecinoIdx(j,-1),g=k>-1?I2[k]:null;if(!g||g.t!=='G'||g.usado||!g.rooms.length)return;
   it.t='W';it.copia=ultWs.slice();it.rooms=g.rooms.slice();it.delante=true;g.usado='delante';usaRef=true;var km=vecinoIdx(j,1),mm=km>-1?I2[km]:null;if(mm&&mm.t==='M'&&!mm.lin&&g.rooms.length===1&&g.rooms[0].n===1&&g.rooms[0].m2==null){g.rooms[0].m2=mm.v;g.rooms[0].mFr=-1;mm.usado=true}})}
  /* las medidas sueltas: del trabajo de antes */
  I2.forEach(function(it,j){if(it.t!=='M'||it.usado)return;var k=vecinoIdx(j,-1),pv=k>-1?I2[k]:null;
   if(pv&&pv.t==='G'&&pv.usado==='delante'){/* «en el salón, 25 metros, quitar…» */var r0=pv.rooms;if(r0.length===1&&r0[0].n===1&&r0[0].m2==null&&!it.lin){r0[0].m2=it.v;r0[0].mFr=-1;it.usado=true;return}}
   if(pv&&pv.t==='G'&&pv.usado==='tras'){var kk=vecinoIdx(k,-1);if(kk>-1&&I2[kk].t==='W')pv=I2[kk]}
   var alFinal=I2.slice(j+1).every(function(z){return z.t==='sep'||z.t==='O'&&z.vacio});
   if(pv&&pv.t==='W'&&alFinal&&!it.lin&&(pv.delante||pv.hereda)&&!I2.some(function(z){return z.t==='W'&&(z.total||/^\s*(?:y\s+)?(?:el|la|los|las)\s+(?:techos?|paredes|suelos?)\s*$/.test(z.x))})&&I2.filter(function(z){return z.t==='W'&&z.rooms&&z.rooms.length===1&&pv.rooms&&z.rooms[0]===pv.rooms[0]}).length>=2&&pv.rooms&&pv.rooms.length===1&&pv.rooms[0].n===1&&pv.rooms[0].m2==null&&!/rodapie|moldura|zocalo/.test(pv.x)){pv.rooms[0].m2=it.v;pv.rooms[0].mFr=-1;it.usado=true;return}
   if(pv&&(pv.t==='W'||pv.t==='X')&&!pv.total){pv.total=it.x.trim();pv.totV=it.v;if(it.lin)pv.lin=true;it.usado=true}});
  /* «acuchillar el suelo de salón y habitaciones, son 60 metros, acuchillar y barnizar»: lo mismo dicho otra vez, no otra partida */
  var mismasSalas=function(a,b){return a&&b&&a.length===b.length&&a.every(function(r){return b.indexOf(r)>-1})};
  I2.forEach(function(it,j){if(it.t!=='W'||!it.rooms||it.total)return;var vs=limpiar(it.x).split(/\s+/).filter(function(w){return !/^(y|e|el|la|los|las|de|del|todo)$/.test(w)});if(!vs.length)return;
   for(var q=j-1;q>=0;q--){var p0=I2[q];if(p0.t!=='W'||!p0.total||!mismasSalas(p0.rooms,it.rooms))continue;var px=' '+limpiar(p0.x)+' ';var raiz=function(w){return w.replace(/(ar|er|ir|ado|ados|ada|adas)$/,'')};
    if(vs.every(function(w){return px.indexOf(' '+w+' ')>-1||/^barniz/.test(w)||new RegExp('\\b'+raiz(w)).test(px)})){it.t='O';it.x='';it.vacio=true}break}});
  /* «lo mismo» */
  I2.forEach(function(it){if(it.t==='W'&&!it.copia&&/^\s*(?:y\s+)?(?:lo mismo|igual|exactamente igual)\s*$/.test(it.x)&&ultAcc)it.copia=ultAcc;if(it.t==='W'&&it.rooms&&it.rooms.length)ultAcc=[it.x]});
  /* si en un grupo «… y en el salón no» se dice que no: fuera de ese trabajo */
  I2.forEach(function(it){if(it.t==='W'&&it.rooms&&it.negs&&it.negs.length)it.rooms=it.rooms.filter(function(r){return it.negs.indexOf(r)<0})});
  if(window.__escDebug)window.__escDebug.push(I2.map(function(it){return it.t+':'+(it.x||(it.rs?it.rs.map(function(p){return p.x+(p.neg?'[no]':'')}).join('|'):''))+(it.rooms?' →'+it.rooms.map(function(r){return r.k}).join('+'):'')+(it.total?' T='+it.total:'')}));
  var conSala=I2.filter(function(it){return it.t==='W'&&it.rooms&&it.rooms.length});
  if(conSala.length&&!conSala.some(function(it){return it.copia}))ultWs=conSala.map(function(it){return it.x});
  if(!conSala.length)return {lit:orig,descr:I2.every(function(it){return it.t!=='W'}),salas:vistos};
  conSala.forEach(function(it){it.rooms.forEach(function(r){todasUsadas[r.k]=1})});
  var nS={};conSala.forEach(function(it){it.rooms.forEach(function(r){nS[r.k]=1})});
  var util=usaRef||Object.keys(nS).length>1||conSala.some(function(it){return it.rooms.some(function(r){return (r.m2!=null||r.ms)&&r.mFr!==ifr})});
  if(op.sinPuntos&&!usaRef&&!listaTot&&!window.__escSP)util=false;
  return {I:I2,orig:orig,util:util,salas:vistos}});
 /* 4) se escribe otra vez: una frase por estancia */
 var algo=hechos.some(function(h){return h.I&&h.util});if(!algo)return null;
 var out=[];
 hechos.forEach(function(h){
  if(!h.I||!h.util){if(h.descr&&h.salas&&h.salas.length&&h.salas.some(function(r){return todasUsadas[r.k]})&&h.salas.every(function(r){return todasUsadas[r.k]||mDe(r)==null}))return;out.push(h.lit!=null?h.lit:h.orig);return}
  var items=[],porSala={};
  var lit=function(x){x=String(x||'').trim();if(!x)return;var u=items[items.length-1];if(u&&u.lit!=null&&!u.cerrado){var pega=/\b(?:puertas?|radiador(?:es)?|ventanas?|armarios?|persianas?)(?:\s+(?:de|del|nuev[oa]s|de paso|blancas|viej[oa]s|arriba|abajo|la|el|casa|piso|esas|zonas|entrada|dentro)){0,3}\s*$/.test(u.lit)&&new RegExp('^(?:'+VS+')\\b').test(x);
   /* «… y las cuatro puertas, cambiar»: «cambiar las cuatro puertas» */
   if(pega){var vb=x.split(/\s+/)[0],resto=x.slice(vb.length).trim();if(/^(?:dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|\d+)$/.test(resto))resto='';u.lit=u.lit.replace(/\s*((?:\by\s+)?(?:(?:las|los|el|la)\s+)?(?:[a-z0-9]+\s+)?(?:puertas?|radiador(?:es)?|ventanas?|armarios?|persianas?)(?:\s+(?:de|del|nuev[oa]s|de paso|blancas|viej[oa]s|arriba|abajo|la|el|casa|piso|esas|zonas|entrada|dentro)){0,3})\s*$/,function(m0,g){var pre=u.lit.slice(0,u.lit.length-m0.length).trim();return (pre?', ':'')+vb+' '+g.replace(/^y\s+/,'')})+(resto?' '+resto:'');u.coma=false;return}
   u.lit+=(u.coma?', ':' ')+x;u.coma=false}else items.push({lit:x})};
  h.I.forEach(function(it){
   if(it.t==='sep'){var u=items[items.length-1];if(u&&u.lit!=null)u.coma=true;return}
   if(it.t==='G'){if(it.usado)return;
    /* cómo es la casa: si sus estancias ya van con lo suyo, sobra */
    var todas=it.rooms.concat(it.negs||[]);if(!(it.negs&&it.negs.length)&&todas.length&&todas.every(function(r){return todasUsadas[r.k]||mDe(r)==null}))return;
    lit(it.rs.map(function(p){return p.x+(p.neg?' no':'')}).join(' '));return}
   if(it.t==='M'){if(!it.usado)lit(it.x);return}
   if(it.t==='O'||it.t==='X'){lit(it.x+(it.total?' '+it.total:''));return}
   /* un trabajo */
   var acc=limpiar(it.x);
   if(!it.rooms||!it.rooms.length){lit(acc+(it.total?' '+it.total:''));return}
   var rooms=it.rooms,sum=rooms.reduce(function(s,r){return s+(mDe(r)||0)},0),todasM=rooms.every(function(r){return mDe(r)!=null});
   if(rooms.length>1&&it.total&&(it.lin||/rodapie|moldura|zocalo/.test(acc)||!todasM||Math.abs(sum-it.totV)>Math.max(1,it.totV*0.1))){
    /* una medida para todas juntas: una partida, de todas */
    var totS=it.total.replace(/^\s*(?:y\s+)?(?:que\s+)?(?:(?:son|seran|sera|es|de|pon|ponle|unos|unas|calcula)\s+)+/,'');if((it.lin||/rodapie|moldura|zocalo/.test(acc))&&!/lineal|\bml\b/.test(totS))totS=totS.replace(/\s*(?:metros|m)\b|$/,' metros lineales').replace(/\s+/g,' ');
    items.push({lit:acc+' '+rooms.map(function(r,i){return (i?' y ':'')+'en '+nombreDe(r)}).join('')+', son '+totS.trim(),cerrado:true});return}
   var accs=it.copia||[acc];
   rooms.forEach(function(r){var s=porSala[r.k];if(!s){s={sala:r,acc:[]};porSala[r.k]=s;items.push(s)}accs.forEach(function(x){var xx=limpiar(x)+(it.total&&rooms.length===1?' '+it.total:'');if(s.acc.indexOf(xx)<0)s.acc.push(xx)})})});
  var frs=items.map(function(it){if(it.lit!=null)return it.lit;var r=it.sala,med='';
   if(r.n>1&&r.ms&&r.ms.length===r.n)med=' de '+r.ms.map(fmt).join(' y de ')+' metros';else if(r.m2!=null)med=' de '+fmt(r.m2)+' metros';
   return 'en '+nombreDe(r)+med+' '+it.acc.join(', ')});
  cambia=true;info.push(frs);out.push(frs.join('. '))});
 function limpiar(x){var a=String(x||'').replace(/^\s*(?:(?:y|e|tambien|ademas|luego|despues|pues|bueno)\s+)+/,' ').replace(/^\s*(?:y|e|luego|despues)\s+/,' ').replace(/\b(pint|lij|quit|pon|cambi|lev|arranc|empapel|luc|alis|rasc)(ar|er|ir)(?:lo|la|los|las)\b/g,'$1$2').replace(/\b(pintar|lijar|lucir)\s+todo\b/g,'$1').replace(/\btambien\b/g,' ').replace(/\s+(?:y|e|de|del|en|y luego|que)\s*$/,'').replace(/\s+/g,' ').trim();
  a=a.replace(/^(?:y\s+)?con\s+(?=(?:el\s+|la\s+|su\s+)?(?:rodapie|tarima|flotante|parquet|laminado|vinilo|falso techo|papel pintado)\b)/,'poner ');
  /* «papel pintado quitar», «gotelé quitar»: el verbo delante */
  var mV2=a.match(new RegExp('^((?:(?!\\b(?:'+VS+')\\b)[a-z0-9]+\\s+){1,3})('+VS+')\\s+(.+)$'));if(mV2&&TRAB.test(mV2[1])&&!/\b(?:y|e|o|ni)\s*$/.test(mV2[1])){var hd=(mV2[1].match(/\b(papel|gotele|moqueta|suelo|parquet|tarima|rodapie|azulejo)\b/)||[])[1];if(hd&&new RegExp('\\b'+hd+'\\b').test(mV2[3]))a=mV2[2]+' '+mV2[3];else if(hd)a=mV2[2]+' '+mV2[1].trim()+' '+mV2[3]}
  var mV=a.match(new RegExp('^((?:(?!\\b(?:'+VS+')\\b)[a-z0-9]+\\s+){1,4})('+VS+')$'));if(mV&&TRAB.test(mV[1])&&!/\b(?:y|e|o|ni)\s*$/.test(mV[1]))a=mV[2]+' '+mV[1].trim();
  var VB=API().VERBO_OBRA;if(VB&&!VB.test(' '+a+' ')&&/^(?:el\s+|la\s+|un\s+|una\s+)?(rodapie|tarima|flotante|parquet|laminado|vinilo|papel pintado|falso techo|moqueta)/.test(a))a='poner '+a;return a}
 if(!cambia)return null;
 var texto=out.map(function(x){return x.trim()}).filter(Boolean).join('. ').replace(/\s+/g,' ').replace(/\s+([.,])/g,'$1')+'.';
 return {texto:texto,salas:reg.map(function(r){return {nombre:nombreDe(r),metros:r.ms||(r.m2!=null?r.m2:null),fuera:!!excl[r.k]}}),frases:info,antes:String(bruto)};
}
window.escena=escena;
})();
