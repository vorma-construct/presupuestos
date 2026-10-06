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
  [/\b(puertas|ventanas|baldosas|tuberias)\s+nuevo\b/g,'$1 nuevas'],[/\b(enchufes|interruptores|radiadores|azulejos|muebles)\s+nuevo\b/g,'$1 nuevos'],[/\bsi\b/g,' y '],[/\bcu\b/g,' con '],[/\bfara\b/g,' sin '],[/\bin\b/g,' en '],[/\bdin\b/g,' de ']
 ];
 window.rumanoAEspanol=function(t){var s=' '+fold(t)+' ';R.forEach(function(r){s=s.replace(r[0],r[1])});return s.replace(/\s{2,}/g,' ').trim()};
 var conv0=window.convertir;
 if(conv0)window.convertir=function(){var ta=document.getElementById('dictado'),orig=ta?ta.value:'';
  if(!ta||!orig.trim()||!esRumano(orig))return conv0.apply(this,arguments);
  var es=rumanoAEspanol(orig),n0=((window.cur||{}).lineas||[]).length;ta.value=es;var r;try{r=conv0.apply(this,arguments)}finally{ta.value=orig}
  setTimeout(function(){var L=((window.cur||{}).lineas||[]).slice(n0),malas=L.filter(function(l){return esRumano(l.d||'')});
   var info=document.getElementById('convInfo');if(info)info.insertAdjacentHTML('afterbegin','<div style="color:#1B6B36;margin-bottom:4px"><b>Entendido en rumano.</b> Lo he pasado al español: «'+es.replace(/</g,'')+'»</div>'+(malas.length?'<div style="color:#b3261e;margin-bottom:4px">'+malas.length+' línea(s) han quedado con palabras en rumano: escríbelas en español antes de mandar.</div>':''))},300);
  return r};
 /* botón de idioma junto a «Dictar con voz» */
 function boton(){var v=document.getElementById('btnVoz');if(!v||document.getElementById('btnIdioma'))return;var b=document.createElement('button');b.type='button';b.id='btnIdioma';b.className='sec';
  var pinta=function(){var ro=idiomaDictado()==='ro-RO';b.innerHTML=ro?'Hablo en: <b>rumano</b>':'Hablo en: <b>español</b>';b.title=ro?'Vorbesc în română':'Cambiar a rumano'};pinta();
  b.onclick=function(){try{localStorage.setItem(LS,idiomaDictado()==='ro-RO'?'es':'ro')}catch(e){}pinta()};v.parentNode.insertBefore(b,v.nextSibling)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boton);else boton();setTimeout(boton,1500);
})();
