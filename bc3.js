/* El presupuesto en formato BC3 (FIEBDC-3/2012), el que abren Presto, Arquímedes, TCQ y los demás
   programas de mediciones de los arquitectos. Lleva lo mismo que el documento: los mismos capítulos,
   las mismas partidas (con el código del arquitecto si lo tenían), sus mediciones y sus precios, sin IVA.
   El total se comprueba al hacerlo. Sin gastos generales ni beneficio: el arquitecto pone los suyos si quiere. */
(function(){
/* Windows-1252: lo que piden los programas (en UTF-8 salen mal los acentos) */
var CP={8364:128,8218:130,402:131,8222:132,8230:133,8224:134,8225:135,710:136,8240:137,352:138,8249:139,338:140,381:142,
 8216:145,8217:146,8220:147,8221:148,8226:149,8211:150,8212:151,732:152,8482:153,353:154,8250:155,339:156,382:158,376:159};
function cabe(c){return c<128||(c>=160&&c<=255)||CP[c]!=null}
function bytes(s){var o=new Uint8Array(s.length);for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);o[i]=c<128||(c>=160&&c<=255)?c:(CP[c]!=null?CP[c]:63)}return o}
/* texto sin los separadores del formato (| \ ~), sin saltos ni caracteres que no caben */
function txt(s){s=String(s==null?'':s);try{s=s.normalize('NFC')}catch(e){}
 s=s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
  .replace(/\u2264/g,'<=').replace(/\u2265/g,'>=').replace(/\u2032/g,"'").replace(/\u2033/g,'"').replace(/[\u00A0\u2007\u202F]/g,' ')
  .replace(/[|\\]/g,'/').replace(/~/g,'-').replace(/[\u0000-\u001F\u007F]/g,' ');
 var o='';for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);if(c>=0xD800&&c<=0xDBFF){i++;continue}if(cabe(c))o+=s[i]}
 return o.replace(/\s+/g,' ').trim()}
/* números con punto decimal y sin separador de miles */
function n2(x,d){var k=Math.pow(10,d);return (Math.round(Number(x||0)*k)/k).toFixed(d)}
function nq(x,d){var s=n2(x,d);return s.indexOf('.')>=0?s.replace(/0+$/,'').replace(/\.$/,''):s}
function decs(x,max){x=Number(x||0);for(var d=0;d<max;d++){var k=Math.pow(10,d);if(Math.abs(Math.round(x*k)/k-x)<1e-9)return d}return max}
function r2(x){return Math.round(Number(x||0)*100)/100}
/* importe de una línea como lo calculan los programas: medición x precio, redondeado a céntimos (5 hacia arriba), sin errores de coma flotante */
function importe(q,qd,p,pd){var a=Math.round(Math.abs(q)*Math.pow(10,qd)),b=Math.round(Math.abs(p)*Math.pow(10,pd)),s=(q<0)!==(p<0)?-1:1,e=qd+pd-2,c;
 if(typeof BigInt==='function'){var P=BigInt(a)*BigInt(b),D=BigInt(Math.pow(10,e));c=Number((P*2n+D)/(2n*D))}else{var D2=Math.pow(10,e);c=Math.floor(a*b/D2+0.5)}
 return s*c/100}
function num(v){if(typeof v==='number')return isFinite(v)?v:0;var s=String(v==null?'':v).replace(/[^\d,.\-]/g,'');if(s.indexOf(',')>=0)s=s.replace(/\./g,'').replace(',','.');return parseFloat(s)||0}
function uni(u){var x=String(u||'').trim().toLowerCase().replace(/²/g,'2').replace(/³/g,'3').replace(/\s+/g,'').replace(/\.$/,'');
 if(/^(m2|mt2|m\^2|metroscuadrados)$/.test(x))return 'm2';if(/^(m3|mt3|m\^3)$/.test(x))return 'm3';
 if(/^(m|ml|mt|mts|mtl|metro|metros|metrolineal|metroslineales)$/.test(x))return 'm';
 if(/^(ud|u|uds|un|und|unid|unidad|unidades)$/.test(x))return 'ud';if(/^(kg|kgs|kilo|kilos)$/.test(x))return 'kg';
 if(/^(h|hr|hrs|hora|horas)$/.test(x))return 'h';if(/^(pa|p\.a|partidaalzada|alzada)$/.test(x))return 'PA';
 if(/^(l|lt|lts|litro|litros)$/.test(x))return 'l';if(/^(t|tn|tm|ton|tonelada|toneladas)$/.test(x))return 't';
 return txt(u).replace(/\s+/g,'').slice(0,8)||'ud'}
/* códigos: solo letras, números, punto y guion bajo; veinte como mucho */
function cod(s){s=String(s||'');try{s=s.normalize('NFD')}catch(e){}return s.replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._]/g,'_').slice(0,18)}
function resumen(d){d=txt(d);if(d.length<=64)return d;var p=d.search(/[.;:](\s|$)/);if(p>=12&&p<=63)return d.slice(0,p);
 var c=d.slice(0,61),k=c.lastIndexOf(' ');return (k>30?c.slice(0,k):c).replace(/[\s,;:.\-]+$/,'')+'...'}
function fecha(f){var m=String(f||'').match(/^(\d{4})-(\d{2})-(\d{2})/);var d=m?new Date(+m[1],+m[2]-1,+m[3]):new Date();
 var p=function(x){return (x<10?'0':'')+x};return p(d.getDate())+p(d.getMonth()+1)+d.getFullYear()}

/* lo que lleva el presupuesto: capítulos con sus partidas, en el mismo orden que el documento */
function limpia(S){var caps=[];(S&&S.caps||[]).forEach(function(C){var l=(C.l||[]).map(function(x){return {c:/^\d+(\.\d+)+$/.test(String(x.c||''))?String(x.c):'',u:x.u,d:txt(x.d),q:num(x.q),p:num(x.p)}})
  .filter(function(x){return x.d&&(x.q!==0||x.p!==0)});if(l.length)caps.push({t:txt(C.t)||'Partidas',l:l})});return {caps:caps}}
/* enlaces viejos: se lee la tabla del propio documento */
function deTabla(raiz){var caps=[],act=null;var tb=raiz&&raiz.querySelector('#p_rows');if(!tb)return {caps:[]};
 [].slice.call(tb.querySelectorAll('tr')).forEach(function(tr){var td=tr.querySelectorAll('td');
  if(tr.classList.contains('cap')||td.length===1){act={t:(tr.textContent||'').trim(),l:[]};caps.push(act);return}
  if(td.length<4)return;if(!act){act={t:'Partidas',l:[]};caps.push(act)}
  var sp=td[0].querySelector('span'),c=sp&&/^\d+(\.\d+)+$/.test((sp.textContent||'').trim())?sp.textContent.trim():'';
  var d=(td[0].textContent||'').trim();if(c&&d.indexOf(c)===0)d=d.slice(c.length).trim();
  var qt=(td[1].textContent||'').trim(),m=qt.match(/^(-?[\d.]*\d(?:,\d+)?)\s*(.*)$/);
  var q=m?num(m[1]):0,pr=num(td[2].textContent),im=num(td[3].textContent);
  /* el precio sale en el documento con dos decimales: si con él no da el importe de la línea, se saca del importe */
  if(q&&Math.abs(r2(q*pr)-im)>0.004){for(var dd=2;dd<=4;dd++){var k=Math.pow(10,dd),pp=Math.round(im/q*k)/k;if(Math.abs(r2(q*pp)-im)<0.004){pr=pp;break}}}
  act.l.push({c:c,u:m?m[2]:'',d:d,q:q,p:pr})});
 return {caps:caps}}

function generar(S,M){M=M||{};S=limpia(S);var caps=S.caps,F=fecha(M.fecha);
 var qd=2,pd=2;caps.forEach(function(C){C.l.forEach(function(l){qd=Math.max(qd,decs(l.q,3));pd=Math.max(pd,decs(l.p,4))})});
 caps.forEach(function(C){C.l.forEach(function(l){l.q=Number(n2(l.q,qd));l.p=Number(n2(l.p,pd));l.imp=importe(l.q,qd,l.p,pd)});C.imp=r2(C.l.reduce(function(a,l){return a+l.imp},0))});
 var total=r2(caps.reduce(function(a,C){return a+C.imp},0)),partidas=caps.reduce(function(a,C){return a+C.l.length},0);
 var usados={};function unico(c,fin){fin=fin||'';var b=c,i=2;while(usados[c+fin]){c=b.slice(0,15)+'_'+i;i++}usados[c+fin]=1;return c+fin}
 var root=unico('P'+(cod(M.num)||'1'),'##');
 caps.forEach(function(C,i){var seg=null;C.l.forEach(function(l){var s=l.c?l.c.split('.')[0]:'';seg=(seg===null)?s:(seg===s?seg:'')});
  /* capítulo con letra delante (C01#): con un código solo de números algunos lectores lo confunden con una cantidad */
  var nc=seg&&/^\d{1,3}$/.test(seg)?+seg:i+1;C.code=unico('C'+(nc<10?'0':'')+nc,'#');
  var pre=(i<9?'0':'')+(i+1);C.l.forEach(function(l,j){l.code=unico(l.c&&l.c.length<=20?l.c:pre+'.'+(j<9?'0':'')+(j+1))})});
 var marca=txt(M.marca)||'Contratista',tit=resumen('Presupuesto n\u00ba '+txt(M.num)+(M.cliente?' - '+txt(M.cliente):'')+(M.obra?' - '+txt(M.obra):''));
 var iva=num(M.iva);
 var R=[];
 R.push('~V|'+marca+'|FIEBDC-3/2012|'+marca+' - presupuestos||ANSI|'+tit+'|2|');
 R.push('~K|'+qd+'\\2\\'+qd+'\\3\\2\\2\\'+pd+'\\2\\EUR\\|0\\0\\0\\0\\'+nq(iva,2)+'\\|3\\2\\3\\3\\'+pd+'\\2\\'+pd+'\\'+qd+'\\2\\'+qd+'\\'+qd+'\\2\\EUR\\|');
 R.push('~C|'+root+'||'+tit+'|'+n2(total,2)+'|'+F+'|0|');
 R.push('~T|'+root+'|'+txt('Presupuesto n\u00ba '+(M.num||'')+' de '+marca+(M.cliente?' para '+M.cliente:'')+(M.obra?'. Obra: '+M.obra:'')+'. Precios sin IVA. Sin gastos generales ni beneficio industrial a\u00f1adidos.')+'|');
 R.push('~D|'+root+'|'+caps.map(function(C){return C.code+'\\1\\1\\'}).join('')+'|');
 caps.forEach(function(C,i){
  R.push('~C|'+C.code+'||'+resumen(C.t)+'|'+n2(C.imp,2)+'|'+F+'|0|');
  if(txt(C.t).length>64)R.push('~T|'+C.code+'|'+txt(C.t)+'|');
  R.push('~D|'+C.code+'|'+C.l.map(function(l){return l.code+'\\1\\'+nq(l.q,qd)+'\\'}).join('')+'|');
  C.l.forEach(function(l,j){
   R.push('~C|'+l.code+'|'+uni(l.u)+'|'+resumen(l.d)+'|'+n2(l.p,pd)+'|'+F+'|0|');
   R.push('~T|'+l.code+'|'+txt(l.d)+'|');
   R.push('~M|'+C.code+'\\'+l.code+'|'+(i+1)+'\\'+(j+1)+'\\|'+nq(l.q,qd)+'|\\\\'+nq(l.q,qd)+'\\\\\\\\|')})});
 var texto=R.join('\r\n')+'\r\n';
 return {texto:texto,bytes:(function(){var b=bytes(texto),o=new Uint8Array(b.length+1);o.set(b);o[b.length]=26;return o})(),caps:caps.length,partidas:partidas,total:total}}

function nombreFichero(M){var s=('Presupuesto '+(M.num||'')+(M.cliente?' '+M.cliente:'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 _-]+/g,'').replace(/\s+/g,'_').slice(0,60);return (s||'Presupuesto')+'.bc3'}
function descargar(res,M){var nom=nombreFichero(M);var blob=new Blob([res.bytes],{type:'application/octet-stream'});
 try{var f=new File([blob],nom,{type:'application/octet-stream'});if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[f]}))return navigator.share({files:[f],title:nom}).catch(function(){bajar(blob,nom)})}catch(e){}
 bajar(blob,nom);return Promise.resolve()}
function bajar(blob,nom){var u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=nom;document.body.appendChild(a);a.click();setTimeout(function(){a.remove();URL.revokeObjectURL(u)},4000)}

window.BC3PRESU={generar:generar,deTabla:deTabla,descargar:descargar,nombreFichero:nombreFichero,txt:txt,bytes:bytes};
})();
