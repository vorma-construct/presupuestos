/* Dictar en rumano: el móvil reconoce el rumano y la app lo pasa al español de obra con un diccionario fijo (sin IA).
   Las partidas salen siempre en español: el cliente lo recibe en español. */
(function(){
 var LS='vr_dictLang';
 window.idiomaDictado=function(){try{return localStorage.getItem(LS)==='ro'?'ro-RO':'es-ES'}catch(e){return 'es-ES'}};
 function fold(s){return String(s||'').toLowerCase().replace(/[ăâ]/g,'a').replace(/î/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t')}
 var MARCAS=['si','baie','baia','perete','peretele','pereti','faianta','gresie','vopsit','vopsim','usa','usi','metri','metru','scoatem','punem','nou','noua','bucatarie','bucataria','tavan','tavanul','podea','pardoseala','rigips','cada','dus','chiuveta','schimbam','montam','apartament','dormitor','camera','facem','vrem','vrea','trebuie','sa','cu','pe','toata','tot','spargem','zugravim','parchet','geam','priza','prize','tevi','apa','lumina','vechi','veche','mp'];
 window.esRumano=function(t){if(/[ăâîșțşţ]/i.test(t))return true;var w=fold(t).split(/[^a-z]+/),n=0;w.forEach(function(x){if(MARCAS.indexOf(x)>=0)n++});return n>=2};
 var NUM={unu:1,una:1,doi:2,doua:2,trei:3,patru:4,cinci:5,sase:6,sapte:7,opt:8,zece:10,unsprezece:11,doisprezece:12,douasprezece:12,treisprezece:13,paisprezece:14,cincisprezece:15,saisprezece:16,saptesprezece:17,optsprezece:18,nouasprezece:19,douazeci:20,treizeci:30,patruzeci:40,cincizeci:50,saizeci:60,saptezeci:70,optzeci:80,nouazeci:90};
 var UNID='(?:metri|metru|mp|m2|bucati|bucata|buc|usi|ferestre|prize|ore|zile|calorifere)';
 /* [patrón (texto sin diacríticos), español que entiende la app]. Los largos primero. */
 var R=[
  [new RegExp('\\bnoua\\s+(?='+UNID+')','g'),'9 '],
  [/\b(douazeci|treizeci|patruzeci|cincizeci|saizeci|saptezeci|optzeci|nouazeci)\s+si\s+(unu|una|doi|doua|trei|patru|cinci|sase|sapte|opt|noua)\b/g,function(_,d,u){return ' '+(NUM[d]+(u==='noua'?9:NUM[u]))+' '}],
  [/\bo\s+suta\b/g,' 100 '],
  [/\b(unsprezece|doisprezece|douasprezece|treisprezece|paisprezece|cincisprezece|saisprezece|saptesprezece|optsprezece|nouasprezece|douazeci|treizeci|patruzeci|cincizeci|saizeci|saptezeci|optzeci|nouazeci|zece|unu|doi|doua|trei|patru|cinci|sase|sapte|opt)\b/g,function(m){return ' '+NUM[m]+' '}],
  [/(\d)\s*(?:virgula|punct)\s*(\d)/g,'$1,$2'],
  [/(\d)\s*(?:pe|ori|x)\s*(\d)/g,'$1 x $2'],
  [/\bmetri\s+(?:patrati|la\s+patrat)\b|\bmp\b/g,' metros cuadrados '],[/\bmetri\s+liniari\b|\bml\b/g,' metros lineales '],[/\bmetri\s+cubi\b/g,' metros cubicos '],
  [/\bmetri\b|\bmetru\b/g,' metros '],[/\b(?:de\s+)?(?:inaltime|inalt[ae]?)\b/g,' de alto '],
  [/\brenovare\s+(?:completa|totala|integrala)\b|\brenovam\s+(?:complet|tot)\b|\breabilitare\s+completa\b/g,' reforma integral '],
  [/\b(?:toata\s+casa|tot\s+apartamentul|toata\s+locuinta)\b/g,' todo el piso '],
  [/\b(?:renovare|renovam|renovat|renovata|reamenajare|reamenajam|modernizare|modernizam)\b/g,' reformar '],
  [/\b(?:baia|baie|baii|baile|bai)\b/g,' baño '],[/\b(?:bucataria|bucatarie|bucatariei)\b/g,' cocina '],
  [/\b(?:dormitorul|dormitor|dormitoare|camera|camere|camerele)\b/g,' habitacion '],[/\b(?:sufrageria|sufragerie|livingul|living)\b/g,' salon '],
  [/\b(?:holul|hol|holuri)\b/g,' pasillo '],[/\b(?:apartamentul|apartament|locuinta)\b/g,' piso '],[/\b(?:terasa|balconul|balcon)\b/g,' terraza '],
  [/\b(?:perete|zid)\s+despartitor\b|\bpereti\s+despartitori\b/g,' tabique '],
  [/\b(?:daramam|daramare|daramat|demolam|demolare|demolat|spargem|spargere|spart)\s+(?:si\s+)?(?:peretele|perete|zidul|zid|peretii|pereti)\b/g,' tirar tabique '],
  [/\b(?:tavan|plafon)\s+fals(?:\s+(?:din|de)\s+(?:rigips|gips\s*carton|gipscarton))?\b|\btavan\s+(?:din|de)\s+(?:rigips|gips\s*carton)\b/g,' falso techo de pladur '],
  [/\bgips\s*carton\b|\bgipscarton\b|\brigipsul\b|\brigips\b/g,' pladur '],
  [/\bparchet\s+laminat\b|\blaminatul\b|\blaminat\b/g,' suelo flotante '],[/\bparchetul\b|\bparchet\b/g,' parquet '],
  [/\b(?:sapa|sapa\s+autonivelanta|autonivelanta)\b/g,' nivelar el suelo '],
  [/\b(?:cada\s+de\s+dus|cadita\s+de\s+dus|cadita|cabina\s+de\s+dus|dus|dusul)\b/g,' plato de ducha '],[/\b(?:cada|cazi)\b/g,' bañera '],
  [/\b(?:vasul\s+de\s+toaleta|vas\s+de\s+toaleta|vas\s+wc|vasul\s+wc|wc|toaleta|closetul|closet)\b/g,' inodoro '],
  [/\b(?:chiuveta|chiuvete|lavoarul|lavoar)\b/g,' lavabo '],[/\b(?:bateria|baterie|baterii|robinetul|robinet|robineti)\b/g,' grifo '],
  [/\b(?:mobilier|mobila|dulap)\s+(?:de\s+)?baie\b/g,' mueble de baño '],[/\b(?:oglinda|oglinzi)\b/g,' espejo '],
  [/\b(?:mobila|mobilier|corpuri)\s+(?:de\s+)?bucatarie\b/g,' muebles de cocina '],
  [/\binstalati[ae]\s+electric[ae]\b|\binstalatii\s+electrice\b|\belectricitate\b|\belectrica\b|\bcurentul\b/g,' instalacion electrica '],
  [/\b(?:prizele|prize|priza)\b/g,' enchufes '],[/\b(?:intrerupatoare|intrerupator)\b/g,' interruptores '],[/\b(?:corpuri\s+de\s+iluminat|spoturi|spot)\b/g,' puntos de luz '],
  [/\binstalati[ae]\s+sanitar[ae]\b|\binstalatii\s+sanitare\b|\bapa\s+si\s+canalizare(?:a)?\b|\btevile\b|\btevi\b|\bteava\b/g,' fontaneria '],
  [/\bcentrala(?:\s+termica)?\b/g,' caldera '],[/\b(?:caloriferele|calorifere|calorifer|radiatoare|radiator)\b/g,' radiadores '],
  [/\b(?:faianta|faiantei|faiante)\b/g,' azulejos '],[/\b(?:gresia|gresie)\b/g,' baldosa en el suelo '],[/\b(?:placile|placi|placare|placaj)\b/g,' azulejos '],
  [/\b(?:peretele|peretii|perete|pereti|peretilor|zidul|ziduri)\b/g,' paredes '],[/\b(?:pardoseala|pardoseli|podeaua|podea|podele)\b/g,' suelo '],[/\b(?:tavanul|tavane|tavan)\b/g,' techo '],
  [/\b(?:usile|usa|usi|usii)\b/g,' puertas '],[/\b(?:ferestrele|fereastra|ferestre|geamurile|geamuri|geam|termopan)\b/g,' ventanas '],
  [/\b(?:izolatia|izolatie|izolare|polistiren|vata\s+minerala)\b/g,' aislamiento '],
  [/\b(?:container|moloz|deseuri|gunoiul|gunoi)\b/g,' contenedor de escombro '],[/\bcuratenie(?:\s+finala)?\b/g,' limpieza final '],
  [/\b(?:gletuim|gletuit|gletuire|glet)\b/g,' alisar paredes '],[/\b(?:tencuim|tencuit|tencuiala)\b/g,' enlucido de yeso '],
  [/\b(?:zugravim|zugravit|zugraveala|zugravire|vopsim|vopsit|vopsire|vopsea|lavabila)\b/g,' pintar '],
  [/\b(?:scoatem|scoate|scot|scos|scoaterea|demontam|demontare|demontat|dezafectam|dezafectare|dezafectat|indepartam)\b/g,' quitar '],
  [/\b(?:spargem|spart|spargere|demolam|demolare|demolat|daramam|daramare)\b/g,' picar '],
  [/\b(?:schimbam|schimba|schimbare|schimbat|schimbate|inlocuim|inlocuire|inlocuit)\b/g,' cambiar '],
  [/\b(?:punem|pune|pus|montam|monteaza|montaj|montare|montat|instalam|instalare|instalat|fixam|aplicam|aplicare)\b/g,' poner '],
  [/\b(?:facem|face|facut|executam|executie)\b/g,' hacer '],
  [/\b(?:noua|nou|noi|noile|nouă)\b/g,' nuevo '],[/\b(?:vechi|veche|vechea|vechiul)\b/g,' viejo '],
  [/\b(?:bucati|bucata|buc)\b/g,' unidades '],
  [/\b(?:usa|usile|usii)\s+de\s+(?:la\s+)?intrare\b/g,' puerta de entrada '],[/\bdulap(?:ul|uri)?\s+de\s+haine\b|\bdulap(?:ul|uri)?\b|\bsifonier(?:ul|e)?\b/g,' armario '],
  [/\bnis[ae]\b|\bnisa\b/g,' hornacina '],[/\bintrar(?:e|ea)\b/g,' entrada '],[/\btelevizor(?:ul)?\b/g,' television '],[/\blambriu(?:l)?\b/g,' friso de madera '],[/\bpervaz(?:ul|uri|urile)?\b/g,' alfeizar '],
  [/\bplinta\b|\bplintele\b|\bplinte\b/g,' rodapie '],[/\bscar[ae]\b|\bscarile\b/g,' escalera '],[/\bbalustrada\b/g,' barandilla '],[/\bjgheab(?:uri)?\b/g,' canalon '],[/\bacoperis(?:ul)?\b/g,' tejado '],[/\btigl[ae]\b/g,' tejas '],
  [/\bfatad[ae]\b|\bfatada\b/g,' fachada '],[/\bboiler(?:ul)?\b/g,' termo '],[/\bhot[ae]\b/g,' campana extractora '],[/\bblat(?:ul)?\b/g,' encimera '],[/\bmocheta\b/g,' moqueta '],[/\bpiatr[ae]\b/g,' piedra '],
  [/\bde\s+la\b/g,' de '],[/\bpentru\b/g,' para '],[/\b(?:dintre|intre)\b/g,' entre '],[/(^|\s)pe(?=\s)/g,'$1en '],[/(^|\s)sau(?=\s)/g,'$1o '],[/\bmare\b|\bmari\b/g,' grande '],[/\bmic[ai]?\b/g,' pequeño '],
  [/\btoate\b/g,' todas '],[/\btot(?:ul)?\b/g,' todo '],[/(^|\s)sa(?=\s)/g,'$1'],[/\b(?:vrem|vreau|vrea|trebuie|aici|acolo|asa|cam|aproximativ|deci|apoi|dupa|pana)\b/g,' '],[/(^|\s)o(?=\s)/g,'$1un '],[/(^|\s)la(?=\s)/g,'$1en '],
  [/\b(puertas|ventanas|baldosas|tuberias)\s+nuevo\b/g,'$1 nuevas'],[/\b(enchufes|interruptores|radiadores|azulejos|muebles)\s+nuevo\b/g,'$1 nuevos'],[/(^|\s)si(?=\s)/g,'$1y '],[/(^|\s)cu(?=\s)/g,'$1con '],[/\bfara\b/g,' sin '],[/(^|\s)in(?=\s)/g,'$1en '],[/(^|\s)din(?=\s)/g,'$1de ']
 ];
 var _WL=null;
 function listaEs(){if(_WL)return _WL;var W={},add=function(s){fold(s).split(/[^a-z0-9ñ]+/).forEach(function(w){if(w)W[w]=1})};
  try{(window.tarifa?tarifa():[]).forEach(function(t){add(t.d);(t.k||[]).forEach(add)})}catch(e){}
  R.forEach(function(x){if(typeof x[1]==='string')add(x[1])});
  add('de del el la los las un una unos unas y o con sin en a al por para que se le lo su sus mas muy todo toda todos todas cada otro otra este esta nuevo nueva nuevos nuevas viejo vieja poner colocar quitar cambiar hacer montar tirar picar pintar alicatar reformar reforma integral metros cuadrados lineales alto ancho largo unidades unidad ud entre hasta desde sobre bajo encima debajo dentro fuera lado frente pared paredes suelo techo puerta puertas ventana ventanas baño cocina habitacion salon pasillo piso casa terraza azulejos baldosa inodoro lavabo grifo ducha plato bañera mueble espejo pladur parquet flotante tabique falso enchufes interruptores puntos luz radiadores caldera fontaneria instalacion electrica aislamiento contenedor escombro limpieza final alisar enlucido yeso nivelar');
  _WL=W;return W}
 var FIN=[[/\bponer\s+(?:un\s+)?cocina(?:\s+nuevo)?\b/g,'montar cocina'],[/\ben\s+(ventanas|puertas|paredes)\b/g,'en las $1'],[/\bun\s+(hornacina|cocina|encimera|puerta|ventana|pared|escalera|fachada|campana|baldosa|bañera|ducha)\b/g,'una $1'],
  [/\b(cocina|puerta|ventana|pared|hornacina|encimera|escalera|fachada|campana|bañera|baldosa)\s+nuevo\b/g,'$1 nueva'],[/\ben\s+en\b/g,'en']];
 window.rumanoAEspanol=function(t){var s=' '+fold(t)+' ';R.forEach(function(r){s=s.replace(r[0],r[1])});FIN.forEach(function(r){s=s.replace(r[0],r[1])});return s.replace(/\s{2,}/g,' ').trim()};
 var conv0=window.convertir;
 if(conv0)window.convertir=function(){var ta=document.getElementById('dictado'),orig=ta?ta.value:'';
  if(!ta||!orig.trim()||!esRumano(orig))return conv0.apply(this,arguments);
  var es=rumanoAEspanol(orig),n0=((window.cur||{}).lineas||[]).length;ta.value=es;var r;try{r=conv0.apply(this,arguments)}finally{ta.value=orig}
  setTimeout(function(){var L0=((window.cur||{}).lineas||[]),quit=0,limp=0,noSe=[];
   /* garantía: ninguna palabra rumana en lo que verá el cliente. Las líneas de la tarifa ya están en español;
      en las demás solo se quedan palabras españolas conocidas (tarifa, diccionario y palabras de uso). */
   var WL=listaEs(),T=(window.tarifa?tarifa():[]);
   for(var i=L0.length-1;i>=n0;i--){var l=L0[i];if(T.some(function(t){return l.d===t.d||l.d.indexOf(t.d+' \u2014')===0}))continue;
    var ws=String(l.d||'').split(/\s+/),ok=ws.filter(function(w){var f=fold(w).replace(/[^a-z0-9ñ,.]/g,'').replace(/[,.]$/,'');return !f||/^\d/.test(f)||WL[f]});
    if(ok.length===ws.length)continue;var malas=ws.filter(function(w){return ok.indexOf(w)<0});noSe.push(malas.join(' '));L0.splice(i,1);quit++}
   if(quit||limp){try{renderLineas();leer();save()}catch(e){}}
   var L=L0.slice(n0),malas=L.filter(function(l){return esRumano(l.d||'')});
   var info=document.getElementById('convInfo');if(info)info.insertAdjacentHTML('afterbegin','<div style="color:#1B6B36;margin-bottom:4px"><b>Entendido en rumano.</b> Lo he pasado al español: «'+es.replace(/</g,'')+'»</div>'+(quit?'<div style="color:#b3261e;margin-bottom:4px"><b>No he sabido pasar al español:</b> «'+noSe.join('», «').replace(/</g,'')+'». Ese trabajo no lo he metido: añádelo a mano en español con «+ Escribir uno a mano».</div>':''))},300);
  return r};
 /* botón de idioma junto a «Dictar con voz» */
 function boton(){var v=document.getElementById('btnVoz');if(!v||document.getElementById('btnIdioma'))return;var b=document.createElement('button');b.type='button';b.id='btnIdioma';b.className='sec';
  var pinta=function(){var ro=idiomaDictado()==='ro-RO';b.innerHTML=ro?'Hablo en: <b>rumano</b>':'Hablo en: <b>español</b>';b.title=ro?'Vorbesc în română':'Cambiar a rumano'};pinta();
  b.onclick=function(){try{localStorage.setItem(LS,idiomaDictado()==='ro-RO'?'es':'ro')}catch(e){}pinta()};v.parentNode.insertBefore(b,v.nextSibling)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boton);else boton();setTimeout(boton,1500);
})();
