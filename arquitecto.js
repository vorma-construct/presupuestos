/* Vorma · lector de presupuestos de arquitecto completos (capitulos, partidas, mediciones) */
function parseCype(lineas){
var L=lineas.map(function(l){return String(l).replace(/\s+/g,' ').trim()}).filter(Boolean);
var nT=L.filter(function(l){return /^Total\s+\S+\s*:\s*[\d.,]/.test(l)}).length;
if(nT<3)return null;
/* cabeceras y pies que se repiten en cada pagina */
var cuenta={};L.forEach(function(l){cuenta[l]=(cuenta[l]||0)+1});
var npag=L.filter(function(l){return /^P[aá]gina:?\s*\d+/i.test(l)}).length||1;
var repe=function(l){return cuenta[l]>=Math.max(4,npag*0.5)&&!/^Total\s/.test(l)};
var nEs=function(x){return Number(String(x).replace(/\./g,'').replace(',','.'))||0};
var UNI='M²|M2|M³|M3|Ml|ML|M|m²|m2|m³|m3|ml|m|Ud|UD|ud|U|u|Kg|KG|kg|PA|Pa|pa|P\\.A\\.|H|h|L|l|T|t|Mes|mes';
var reP=new RegExp('^(\\d+(?:\\.\\d+)+|#{2,}\\S*)\\s+('+UNI+')\\s+(.+)$');
var reSec=/^(\d+(?:\.\d+)*)\.-\s+(.+?)(?:\s+([\d.]+,\d{2})\s*€)?$/;
var reCap=/^Cap[ií]tulo\s+n[ºo°]\s*(\d+)\s+(.+)$/i;
var reTot=/^Total\s+(\S+)\s*:\s*(?:([\d.]+,\d+)\s+)?([\d.]+,\d+)\s*€(?:\s+([\d.]+,\d+)\s*€)?/;
var reParcial=/^Parcial\s+n[ºo°]\s*(\d+)\s+(.+?)\s*:\s*([\d.]+,\d{2})\s*€/i;
var out=[],act=null,cap={n:'',t:''},secs={},sec='',cont={},enResumen=false,resumen={},capsCon={},capTit={};
function cerrar(){if(act){act.t=act.t.replace(/\s+/g,' ').trim();out.push(act);act=null}}
L.forEach(function(l){
 if(repe(l)||/^P[aá]gina:?\s*\d+/i.test(l)||/^N[ºo°]\s+Ud\s+Descripci/i.test(l))return;
 var c=l.match(reCap);if(c){if(c[1]===cap.n)return;cerrar();cap={n:c[1],t:c[2].trim()};capTit[c[1]]=cap.t;return}
 if(/^Total\s*\.{2,}\s*:/.test(l)){enResumen=true;var g=l.match(/([\d.]+,\d{2})\s*€/);if(g)resumen.total=nEs(g[1]);return}
 var pc=l.match(reParcial);if(pc){cerrar();resumen['cap'+pc[1]]=nEs(pc[3]);if(!capsCon[pc[1]]&&nEs(pc[3])>0){out.push({code:pc[1]+'.0',u:'pa',t:pc[2].trim(),q:1,pa:nEs(pc[3]),imp:nEs(pc[3]),cap:pc[1],capT:pc[2].trim(),sec:pc[1],secT:pc[2].trim(),alzada:true});capsCon[pc[1]]=1}return}
 var s=l.match(reSec);
 if(s&&!reP.test(l)){cerrar();if(s[3]){resumen[s[1]]=nEs(s[3])}
  else{secs[s[1]]=s[2].trim();sec=s[1]}return}
 var rc=l.match(/^(\d+)\s+(.+?)\s+([\d.]+,\d{2})\s*€$/);if(rc&&!act){resumen['cap'+rc[1]]=nEs(rc[3]);return}
 var p=l.match(reP);
 if(p&&/\(Continuaci/i.test(p[3])){if(!act&&out.length)act=out.pop();if(act&&/^\d+(\.\d+)+$/.test(p[1]))act.code=p[1];return}
 if(p){cerrar();var code=p[1];if(/^#/.test(code)){cont[sec]=(cont[sec]||0)+1;code=(sec||cap.n)+'.'+cont[sec]}else{var pre=code.replace(/\.\d+$/,'');cont[pre]=Math.max(cont[pre]||0,Number(code.split('.').pop())||0)}
  var u=p[2].toLowerCase().replace('²','2').replace('³','3').replace(/^u$/,'ud').replace('p.a.','pa').replace(/^h$/,'h');
  var secCode=sec&&code.indexOf(sec+'.')===0?sec:(code.indexOf('.')>0?code.replace(/\.\d+$/,''):sec);
  act={code:code,u:u,t:p[3],q:null,pa:null,imp:null,cap:cap.n,capT:cap.t,sec:secCode,secT:secs[secCode]||'',fin:false};capsCon[cap.n]=1;return}
 var t=l.match(reTot);
 if(t&&act){act.u=act.u||t[1].toLowerCase();
  if(t[2]){act.q=nEs(t[2]);act.pa=nEs(t[3]);act.imp=t[4]?nEs(t[4]):Math.round(act.q*act.pa*100)/100}
  else{act.q=0;act.pa=nEs(t[3]);act.imp=0}
  cerrar();return}
 if(act&&!act.fin){if(/^(Criterio de|Incluye:|Uds\.\s+Largo|Uds\s+Largo|Nota:|Total\s)/i.test(l)){act.fin=true;return}
  act.t+=' '+l}});
cerrar();
out.forEach(function(p){delete p.fin;var t=p.t;
 /* titulo corto para la lista: hasta el primer punto, como mucho 160 letras */
 var corto=t.split(/\.\s/)[0];if(corto.length>160)corto=corto.slice(0,160).replace(/\s\S*$/,'')+'…';p.corto=corto;p.largo=t;p.t=corto;
 p.on=false;p.q0=p.q});
out.resumen=resumen;out.capitulos=capTit;out.secciones=secs;
return out}

/* ---- el parseMediciones de siempre, pero si es un presupuesto de arquitecto completo se lee con su estructura ---- */
var _pm=window.parseMediciones;
window.parseMediciones=function(lineas){var c=null;try{c=parseCype(lineas)}catch(e){c=null}
if(c&&c.length){ARQ.dudosas=[];ARQ.cype={resumen:c.resumen,capitulos:c.capitulos,secciones:c.secciones};var a=[].slice.call(c);a.forEach(function(p){p.cype=true});return a}
return _pm(lineas)};

function arqEsCype(){return !!(ARQ.med&&ARQ.med.some(function(p){return p.cype}))}
function arqUnidadIgual(a,b){a=(a||'').replace(/^pa$/,'ud');b=(b||'').replace(/^pa$/,'ud');return a===b||(/^ml?$/.test(a)&&/^ml?$/.test(b))}
function arqPrecioTuyo(p){if(p.pr!=null)return p.pr;var ap=precioAprendido(p.largo||p.t);if(!(ap>0))ap=precioAprendido(p.t);if(ap>0){p.deMemoria=true;return ap}
return 0}
function arqUd(u){return ({m2:'m²',m3:'m³'})[u]||u}
function arqEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function arqNum(n){return (Math.round(n*1000)/1000).toLocaleString('es-ES',{maximumFractionDigits:3})}

/* pantalla: capitulos plegados, marcas lo que haces tu */
function renderCype(){var box=document.getElementById('arqPanel');if(box&&box.querySelector('details.cyc'))abiertos();var AB=ARQ.__ab||{};var M=ARQ.med,R=(ARQ.cype&&ARQ.cype.resumen)||{};
M.forEach(function(p){p.pr=arqPrecioTuyo(p)});
var tot=M.reduce(function(a,p){return a+(p.imp!=null?p.imp:p.q*(p.pa||0))},0);
var cuadra=R.total?Math.abs(tot-R.total)<0.05:null;
var caps=[],porCap={};M.forEach(function(p,i){p.i=i;if(!porCap[p.cap]){porCap[p.cap]={n:p.cap,t:p.capT,secs:[],porSec:{}};caps.push(porCap[p.cap])}var C=porCap[p.cap];
var sk=p.sec||p.cap;if(!C.porSec[sk]){C.porSec[sk]={k:sk,t:p.secT||'',ps:[]};C.secs.push(C.porSec[sk])}C.porSec[sk].ps.push(p)});
var h='<h3 style="font-size:19px;margin-bottom:4px">Presupuesto del arquitecto: '+M.length+' partidas</h3>'+
(cuadra?'<div class="aviso" style="border-left-color:var(--ok);margin:4px 0 8px">Leído entero y comprobado: suma <b>'+eur(tot)+'</b>, igual que el total del arquitecto.</div>':
(R.total?'<div class="aviso" style="margin:4px 0 8px;border-left-color:#b3261e">Lo leído suma '+eur(tot)+' y el arquitecto dice '+eur(R.total)+'. Repásalo.</div>':''))+
'<p style="margin:0 0 8px"><b>Marca solo lo que vas a hacer tú.</b> Toca un capítulo para abrirlo. Puedes cambiar la cantidad y poner tu precio.</p>'+
'<div class="row" style="margin-bottom:8px"><button class="mini sec" onclick="cypeTodo(true)">Marcar todo</button><button class="mini sec" onclick="cypeTodo(false)">Desmarcar todo</button></div>';
caps.forEach(function(C){var ps=[].concat.apply([],C.secs.map(function(s){return s.ps}));var imp=ps.reduce(function(a,p){return a+(p.imp||0)},0);
h+='<details class="cyc"'+(AB[C.n]?' open':'')+' data-cap="'+arqEsc(C.n)+'" ontoggle="cypeAbre(this)"><summary><span class="cyt">'+arqEsc(C.n)+'. '+arqEsc(C.t)+'</span><span class="cym" id="cyc_'+arqEsc(C.n)+'"></span><span class="cyi">'+eur(imp)+'</span></summary>';
h+='<label class="cys"><input type="checkbox" onchange="cypeGrupo(\'cap\',\''+arqEsc(C.n)+'\',this.checked)"> Todo el capítulo</label>';
C.secs.forEach(function(S){h+='<div class="cyh"><label><input type="checkbox" onchange="cypeGrupo(\'sec\',\''+arqEsc(S.k)+'\',this.checked)"> <b>'+arqEsc(S.k)+' '+arqEsc(S.t)+'</b></label></div>';
S.ps.forEach(function(p){var sinMed=!(p.q>0);
h+='<div class="cyp'+(p.on?' on':'')+(p.metida?' ya':'')+'" id="cyp_'+p.i+'"><label class="cyl"><input type="checkbox" data-i="'+p.i+'" data-cap="'+arqEsc(p.cap)+'" data-sec="'+arqEsc(p.sec||p.cap)+'"'+(p.on?' checked':'')+' onchange="cypeMarca('+p.i+',this.checked)"><span>'+arqEsc(p.t)+'</span></label>'+
'<div class="cyd">'+arqEsc(p.code)+' · arquitecto: '+(sinMed?'sin medición':arqNum(p.q)+' '+arqUd(p.u))+' a '+eur(p.pa||0)+(p.metida?' · <b>ya metida en el presupuesto '+arqEsc(p.metida)+'</b>':'')+'</div>'+
'<div class="cyv"><span>Cantidad <input inputmode="decimal" value="'+(p.q>0?String(p.q).replace('.',','):'')+'" oninput="cypeCant('+p.i+',this.value)"> '+arqUd(p.u)+'</span>'+
'<span>Tu precio <input inputmode="decimal" value="'+(p.pr>0?String(p.pr).replace('.',','):'')+'" placeholder="0" oninput="cypePrecio('+p.i+',this.value)"'+(p.pr>0?'':' class="falta"')+'> €</span></div>'+
(p.mitad?'<div class="cyn ok">la mitad de lo que mide el arquitecto</div>':'')+(p.estimado?'<div class="cyn">sacado con tu proporción, repásalo</div>':'')+(p.real&&p.pr>0?'<div class="cyn ok">precio real: '+p.real+'</div>':'')+(p.dePa?'<div class="cyn">precio del arquitecto, repásalo</div>':(p.deMemoria?'<div class="cyn ok">tu precio de otras veces</div>':(p.deTarifa?'<div class="cyn ok">de tu tarifa</div>':'')))+'</div>'})});
h+='</details>'});
h+='<div class="cyb" id="cyBarra"></div>';
box.style.display='block';box.innerHTML=h;cypeBarra();cypeContar();
setTimeout(function(){try{pintarContinuar();plegarDatos()}catch(_){}},60)}
function cypeAbre(d){var c=d.getAttribute('data-cap');ARQ.med.forEach(function(p){if(p.cap===c)p.__ab=d.open});}
function cypeContar(){var n={};ARQ.med.forEach(function(p){if(!n[p.cap])n[p.cap]=[0,0];n[p.cap][1]++;if(p.on)n[p.cap][0]++});Object.keys(n).forEach(function(c){var e=document.getElementById('cyc_'+c);if(e)e.textContent=n[c][0]?n[c][0]+' marcadas':''})}
function cypeBarra(){var b=document.getElementById('cyBarra');if(!b)return;var M=ARQ.med.filter(function(p){return p.on});var tot=M.reduce(function(a,p){return a+(p.q||0)*(p.pr||0)},0);var falt=M.filter(function(p){return !(p.pr>0)}).length;var arq=M.reduce(function(a,p){return a+(p.imp!=null&&p.q===p.q0?p.imp:(p.q||0)*(p.pa||0))},0);
var __h=M.length?'<div><b>'+M.length+' marcadas</b> · con tus precios <b>'+eur(tot)+'</b>'+(falt?' · <span style="color:#b3261e">'+falt+' sin tu precio</span>':'')+'<br><small>Lo mismo con los precios del arquitecto: '+eur(arq)+' · con gastos generales y beneficio (+19 %), que es lo comparable con una empresa: <b>'+eur(arq*1.19)+'</b></small></div>'+
'<div class="row" style="margin-top:6px"><button class="sec" onclick="cypeMitad()">Cantidades a la mitad (obra a medias entre dos dueños)</button>'+(falt?'<button class="sec" onclick="cypePonerArq()">Poner el precio del arquitecto a las '+falt+' sin precio</button>':'')+'<button class="ok" onclick="addCype()">Meter las '+M.length+' en el presupuesto</button></div>':
'<div>Marca las partidas que vas a hacer tú.</div>';if(b.__h===__h)return;b.__h=__h;b.innerHTML=__h}
function cypeMitad(){var n=0;ARQ.med.forEach(function(p){if(p.on&&p.q>0&&!p.mitad){p.q=Math.round(p.q/2*1000)/1000;p.mitad=true;n++}});abiertos();renderCype();var ai=document.getElementById('arqInfo');if(ai)ai.textContent=n?'Puesta la mitad de la cantidad en '+n+' partidas marcadas.':'Las marcadas ya estaban a la mitad.'}
function cypeMarca(i,v){var p=ARQ.med[i];p.on=v;var e=document.getElementById('cyp_'+i);if(e)e.classList.toggle('on',v);cypeBarra();cypeContar()}
function cypeGrupo(tipo,k,v){document.querySelectorAll('#arqPanel .cyl input[data-'+tipo+'="'+k+'"]').forEach(function(c){c.checked=v;cypeMarca(+c.getAttribute('data-i'),v)});
if(tipo==='cap')document.querySelectorAll('#arqPanel details[data-cap="'+k+'"] .cyh input').forEach(function(c){c.checked=v})}
function cypeTodo(v){ARQ.med.forEach(function(p){p.on=v&&!p.metida});renderCype()}
function arqLee(v){v=String(v||'').trim();if(/,/.test(v))v=v.replace(/\./g,'').replace(',','.');return parseFloat(v)||0}
function cypeCant(i,v){ARQ.med[i].q=arqLee(v);cypeBarra()}
function cypePrecio(i,v){var p=ARQ.med[i];p.pr=arqLee(v);p.dePa=false;p.estimado=false;if(p.pr>0)aprendePrecio(p.largo||p.t,p.pr,p.u);var e=document.querySelector('#cyp_'+i+' .cyv span:nth-child(2) input');if(e)e.classList.toggle('falta',!(p.pr>0));cypeBarra()}
function cypePonerArq(){var n=0;ARQ.med.forEach(function(p){if(p.on&&!(p.pr>0)&&p.pa>0){p.pr=p.pa;p.dePa=true;n++}});abiertos();renderCype();var ai=document.getElementById('arqInfo');if(ai)ai.textContent=n+' partidas con el precio del arquitecto. Están marcadas para que las repases.'}
function abiertos(){var o={};document.querySelectorAll('#arqPanel details.cyc').forEach(function(d){if(d.open)o[d.getAttribute('data-cap')]=1});ARQ.__ab=o}
var _renderArq=window.renderArq;
window.renderArq=function(){if(arqEsCype()){var o=ARQ.__ab||{};renderCype();document.querySelectorAll('#arqPanel details.cyc').forEach(function(d){if(o[d.getAttribute('data-cap')])d.open=true});return}return _renderArq.apply(this,arguments)};
/* texto para el presupuesto: la descripcion del arquitecto hasta el primer punto y aparte */
function arqTexto(p){var t=(p.largo||p.t||'').replace(/\s+/g,' ').trim();var f=t.match(/^(.+?\.)(\s|$)/);var d=f?f[1]:t;if(d.length<40&&t.length>d.length)d=t.slice(0,Math.min(t.length,260));return d.replace(/^./,function(c){return c.toUpperCase()})}
function addCype(){leer();var M=ARQ.med.filter(function(p){return p.on});if(!M.length){alert('Marca primero las partidas que vas a hacer');return}
var falt=M.filter(function(p){return !(p.pr>0)}).length;
if(falt&&!confirm(falt+' partidas van sin precio (a cero). Puedes ponérselo luego en el presupuesto. ¿Las meto así?'))return;
M.forEach(function(p){cur.lineas.push({d:arqTexto(p),q:p.q>0?p.q:1,u:p.u,p:p.pr>0?p.pr:0,code:p.code,cap:p.secT||p.capT||''});
cur.arq=cur.arq||[];cur.arq.push({code:p.code,t:p.t,q:p.q,u:p.u,pa:p.pa});p.metida=cur.num;p.on=false});
cur.arqLeidas=(cur.arqLeidas||0)+M.length;window.ULT_ARQ={med:ARQ.med,cype:ARQ.cype,cab:ARQ.cab||(window.ULT_ARQ&&ULT_ARQ.cab),nombre:ARQ.nombre};
abiertos();renderCype();renderLineas();try{autoGuardar()}catch(_){}
document.getElementById('msg').textContent=M.length+' partidas del arquitecto metidas en el presupuesto '+cur.num+'. Para hacer otro presupuesto con este mismo PDF (por ejemplo, para el otro dueño), dale a «Nuevo presupuesto» y luego a «Usar el PDF de antes».';
document.getElementById('tb').scrollIntoView({behavior:'smooth',block:'start'})}
/* el mismo PDF para otro presupuesto, sin volver a subirlo */
function usarArqAnterior(){var U=window.ULT_ARQ;if(!U)return;ARQ.med=U.med;ARQ.cype=U.cype;ARQ.med.forEach(function(p){p.on=false});meterPor('pdf');renderArq()}
var _nuevo=window.nuevo;window.nuevo=function(){var r=_nuevo.apply(this,arguments);try{pintarArqAnterior()}catch(_){}return r};
function pintarArqAnterior(){var c=document.getElementById('cardPdf');if(!c)return;var b=document.getElementById('arqAnt');if(!window.ULT_ARQ){if(b)b.remove();return}
if(!b){b=document.createElement('div');b.id='arqAnt';b.style.margin='8px 0';c.insertBefore(b,document.getElementById('arqPanel'))}
var n=ULT_ARQ.med.length,ya=ULT_ARQ.med.filter(function(p){return p.metida}).length;
b.innerHTML='<button class="ok" style="width:100%" onclick="usarArqAnterior()">Usar el PDF de antes ('+n+' partidas'+(ya?', '+ya+' ya metidas en otro presupuesto':'')+')</button>'}
/* estilos de la lista por capitulos */
(function(){var s=document.createElement('style');s.textContent=
'#arqPanel details.cyc{border:1px solid var(--line);border-radius:10px;margin:8px 0;background:#fff}'+
'#arqPanel details.cyc>summary{display:flex;gap:8px;align-items:center;padding:12px;cursor:pointer;font-weight:700;list-style:none}'+
'#arqPanel details.cyc>summary::-webkit-details-marker{display:none}'+
'#arqPanel details.cyc>summary:before{content:"▸";color:var(--gold,#8B6914)}#arqPanel details.cyc[open]>summary:before{content:"▾"}'+
'#arqPanel .cyt{flex:1}#arqPanel .cym{font-size:12px;color:var(--ok);font-weight:600}#arqPanel .cyi{font-size:12px;color:var(--muted);font-weight:400;white-space:nowrap}'+
'#arqPanel .cys{display:block;padding:0 12px 6px;font-size:14px}#arqPanel .cyh{padding:8px 12px 2px;border-top:1px solid var(--line);font-size:14px}'+
'#arqPanel .cyp{padding:8px 12px 10px 14px;border-top:1px dashed var(--line);opacity:.75}#arqPanel .cyp.on{opacity:1;background:#FBF6E9}#arqPanel .cyp.ya{opacity:.5}'+
'#arqPanel .cyl{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.3}#arqPanel .cyl input,#arqPanel .cys input,#arqPanel .cyh input{width:22px;height:22px;flex:0 0 22px;margin-top:1px}'+
'#arqPanel .cyd{font-size:12px;color:var(--muted);margin:3px 0 0 32px}'+
'#arqPanel .cyv{display:flex;flex-wrap:wrap;gap:6px 14px;margin:6px 0 0 32px;font-size:14px;align-items:center}#arqPanel .cyv input{width:92px;text-align:right;padding:6px}#arqPanel .cyv input.falta{border-color:#b3261e;background:#FDF0EE}'+
'#arqPanel .cyp:not(.on) .cyv,#arqPanel .cyp:not(.on) .cyn{display:none}'+
'#arqPanel .cyn{font-size:12px;color:var(--brick);margin:3px 0 0 32px}#arqPanel .cyn.ok{color:var(--ok)}'+
'#arqPanel .cyb{position:sticky;bottom:0;background:#fff;border:2px solid var(--gold,#8B6914);border-radius:10px;padding:10px;margin-top:10px;box-shadow:0 -4px 14px rgba(0,0,0,.08);z-index:5}'+
'#arqPanel .cyb button{flex:1;min-width:160px}'+
'@media(max-width:640px){#arqPanel table.lines,#arqPanel table.lines tbody,#arqPanel table.lines tr,#arqPanel table.lines td{display:block;width:100%}#arqPanel table.lines thead{display:none}#arqPanel table.lines tr{border-bottom:1px solid var(--line);padding:6px 0}#arqPanel table.lines td input,#arqPanel table.lines td select{width:100%}#arqPanel table.lines td{padding:3px 0;border:0;white-space:normal}#arqPanel table.lines td b{white-space:normal;word-break:break-word}#arqPanel table.lines td:nth-child(2):before{content:"Cantidad";font-size:12px;color:var(--muted)}#arqPanel table.lines td:nth-child(3):before{content:"Tu partida";font-size:12px;color:var(--muted)}#arqPanel table.lines td:nth-child(4):before{content:"Tu precio";font-size:12px;color:var(--muted)}}';
document.head.appendChild(s)})();
/* dos duenos en el PDF ("Fulano eta Mengana", "Fulano y Mengana"): cada presupuesto se lleva su nombre */
var _aplCab=window.aplicarCabecera;
window.aplicarCabecera=function(){var c=ARQ.cab;if(c&&c.cli&&!c.nombres){var ns=c.cli.split(/\s+(?:eta|y|e)\s+/i).map(function(s){return s.trim()}).filter(function(s){return s.split(/\s+/).length>=2});if(ns.length>1){c.nombres=ns;c.idx=0;c.cliTodo=c.cli}}
if(c&&c.nombres)c.cli=c.nombres[c.idx||0];return _aplCab.apply(this,arguments)};
var _usarAnt=window.usarArqAnterior;
window.usarArqAnterior=function(){var U=window.ULT_ARQ;if(U&&U.cab){var c=JSON.parse(JSON.stringify(U.cab));if(c.nombres){c.idx=((c.idx||0)+1)%c.nombres.length;U.cab.idx=c.idx}ARQ.cab=c}
var r=_usarAnt.apply(this,arguments);try{aplicarCabecera()}catch(_){}return r};
/* su proporcion: con los precios que ya ha puesto el, cuantas veces cobra lo del arquitecto, y con eso rellena el resto */
function cypeRatio(){var r=[];ARQ.med.forEach(function(p){if(p.pr>0&&p.pa>0&&!p.dePa&&!p.estimado)r.push(p.pr/p.pa)});r.sort(function(a,b){return a-b});if(r.length<2)return null;var m=Math.floor(r.length/2);return {k:r.length%2?r[m]:(r[m-1]+r[m])/2,n:r.length}}
function cypeProporcion(){var R=cypeRatio();if(!R)return;var n=0;ARQ.med.forEach(function(p){if(p.on&&!(p.pr>0)&&p.pa>0){var v=p.pa*R.k;p.pr=v>=20?Math.round(v):Math.round(v*100)/100;p.estimado=true;n++}});abiertos();renderCype();
var ai=document.getElementById('arqInfo');if(ai)ai.textContent=n+' precios sacados con tu proporción: cobras '+R.k.toFixed(2).replace('.',',')+' veces lo del arquitecto. Están marcados para que los repases.'}
var _barra=window.cypeBarra;
window.cypeBarra=function(){_barra.apply(this,arguments);var b=document.getElementById('cyBarra');if(!b)return;var R=cypeRatio();var falt=ARQ.med.filter(function(p){return p.on&&!(p.pr>0)&&p.pa>0}).length;if(!R||!falt){var v=document.getElementById('cyRatio');if(v)v.remove();return}
var row=b.querySelector('.row');if(!row)return;var txt='Rellenar las '+falt+' sin precio con tu proporción ('+R.k.toFixed(2).replace('.',',')+' veces el arquitecto)';var ya=document.getElementById('cyRatio');if(ya&&ya.textContent===txt)return;if(ya)ya.remove();var bt=document.createElement('button');bt.id='cyRatio';bt.className='ok';bt.style.background='#5B4A12';bt.textContent=txt;bt.onclick=cypeProporcion;row.insertBefore(bt,row.firstChild)};
/* presupuesto que viene de un proyecto de arquitecto: se explica como se trabaja y se enlaza a la web */
function esDeArquitecto(c){c=c||cur;return !!(c&&((c.arqLeidas||0)>0||(c.lineas||[]).some(function(l){return /^\d+(\.\d+)+$/.test(l.code||'')})))}
function webSeguimiento(){return (AJ.webSeg||'https://reformas-en-bilbao.es/seguimiento-de-obra')}
var _pintarDocs=window.pintarDocs;
window.pintarDocs=function(){var r=_pintarDocs.apply(this,arguments);try{var obs=document.getElementById('p_obs');if(!obs)return r;var b=document.getElementById('p_como');
if(!esDeArquitecto()){if(b)b.style.display='none';return r}
if(!b){b=document.createElement('div');b.id='p_como';obs.parentNode.insertBefore(b,obs.nextSibling)}
var u=webSeguimiento(),uc=u.replace(/^https?:\/\//,'');
b.style.cssText='display:block;margin-top:10px;padding:10px 12px;border:1px solid var(--line);border-left:3px solid var(--gold,#8B6914);border-radius:4px;font-size:11.5px;line-height:1.45;page-break-inside:avoid';
b.innerHTML='<b style="font-size:12.5px">Así trabajamos su obra</b>'+
'<div style="margin-top:4px">· Este presupuesto sigue las partidas y la numeración del proyecto del arquitecto, para que se puedan comparar una a una.</div>'+
'<div>· El contrato se firma desde el móvil, sin papeles.</div>'+
'<div>· Al empezar le damos un enlace privado con su obra: las fases y fotos cada semana y en cada avance. No hace falta ir a la obra para saber cómo va.</div>'+
'<div>· Si aparece algo que no estaba previsto, le llega con su foto, su explicación y su precio. No se hace nada sin que usted lo apruebe, y queda por escrito.</div>'+
'<div style="margin-top:5px">Véalo aquí: <a href="'+u+'" data-pdfurl="'+u+'" target="_blank" rel="noopener" style="color:var(--gold,#8B6914);font-weight:700;text-decoration:underline">'+uc+'</a></div>'}catch(e){}return r};
var _msgCli=window.mensajeCliente;
window.mensajeCliente=function(nom,num,url){var t=_msgCli.apply(this,arguments);try{if(esDeArquitecto())t=t.replace(/(\n\nCualquier duda)/,'\n\n📱 Cómo trabajamos y cómo seguirá su obra desde el móvil, con fotos: '+webSeguimiento()+'$1')}catch(_){}return t};

/* ===== el escrito del cliente (lo que pide cada dueño) junto al PDF del arquitecto ===== */
/* las lineas de un PDF que no es del arquitecto se guardan como "escrito" para leerlo despues */
var _pmEsc=window.parseMediciones;
window.parseMediciones=function(lineas){var r=_pmEsc.apply(this,arguments);
 if(r&&r.length&&r[0].cype){try{ARQ.cabCype=parseCabecera(lineas)}catch(_){}return r}
 ARQ.escritos=(ARQ.escritos||[]).concat([lineas]);return r};
var _aplCab2=window.aplicarCabecera;
window.aplicarCabecera=function(){if(ARQ.cabCype){var n=ARQ.cab&&ARQ.cab.nombres;ARQ.cab=JSON.parse(JSON.stringify(ARQ.cabCype));if(n){ARQ.cab.nombres=n}}return _aplCab2.apply(this,arguments)};
function arqDuenos(){var c=ARQ.cab||ARQ.cabCype||{};var t=c.cliTodo||c.cli||'';var ns=c.nombres||t.split(/\s+(?:eta|y|e)\s+/i).map(function(s){return s.trim()}).filter(function(s){return s.split(/\s+/).length>=2});return ns.length>1?ns:[]}
function arqPal(s){return norm(String(s||'')).replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(function(w){return w.length>2&&!VACIAS_E[w]})}
var VACIAS_E={con:1,del:1,los:1,las:1,por:1,para:1,una:1,que:1,sus:1,mas:1,muy:1,este:1,esta:1,cada:1,sin:1,sobre:1,entre:1};
/* lee el escrito: secciones (comun / de cada dueno), partidas que nombra, metros que da y lo que pide que no es partida */
function leerEscrito(L,M,duenos){
 var lin=L.map(function(l){return String(l).replace(/[​­]/g,'').replace(/\s+/g,' ').trim()}).filter(Boolean);
 var cnt={};lin.forEach(function(l){cnt[l]=(cnt[l]||0)+1});
 var balas=[],act=null;
 lin.forEach(function(l){if(cnt[l]>=3&&l.length<70)return;if(/^\d{1,2}$/.test(l))return;
  var m=l.match(/^[-–•·]\s*(.*)$/);if(m){act={t:m[1]};balas.push(act)}else if(act){act.t+=' '+l}});
 var unicos=duenos.map(function(n,i){var mios=arqPal(n),otros=[].concat.apply([],duenos.filter(function(_,j){return j!==i}).map(arqPal));return mios.filter(function(w){return otros.indexOf(w)<0})});
 var quien=function(t){var ws=arqPal(t);if(/comun/i.test(t))return 'comun';var hit=-1;unicos.forEach(function(u,i){if(ws.some(function(w){return w.length>=4&&u.some(function(x){return x.indexOf(w)===0||w.indexOf(x)===0})}))hit=i});return hit};
 var claves=M.map(function(p){return arqPal(p.largo||p.t).slice(0,7)});
 var sec=null,area=null,res={marcas:[],notas:[]};
 balas.forEach(function(b){var t=b.t.trim();if(!t)return;
  var h=t.match(/^[A-Z]\s*\.\s*-\s*(.+)$/);if(h){var q=quien(h[1]);sec={dueno:q===-1?'comun':q,t:h[1]};area=null;return}
  if(!sec)return;
  if(/^\d+(\.\d+)*\.-\s/.test(t))return;
  var am=t.match(/(\d+(?:[.,]\d+)?)\s*m\s*2\b/i);if(am&&t.length<70&&!/suelo|pavimento|ceramic/i.test(t)){area=arqLee(am[1]);return}
  var ws=arqPal(t.replace(/^#+\S*\s+\S+\s+/,'')).slice(0,30);var mejor=-1,mp=0;
  var cod=(t.match(/^(\d+(?:\.\d+)+)\s/)||[])[1];
  M.forEach(function(p,i){if(cod&&p.code===cod){mejor=i;mp=9;return}var k=claves[i];if(k.length<4)return;var ok=k.filter(function(w){return ws.indexOf(w)>=0}).length/k.length;if(ok>mp||(ok===mp&&mejor>=0&&p.cap<M[mejor].cap)){mp=ok;mejor=i}});
  if(mejor>=0&&mp>=0.85){res.marcas.push({i:mejor,dueno:sec.dueno,area:area});return}
  if(t.length>8)res.notas.push({dueno:sec.dueno,t:t.replace(/\s*…\s*$/,'')})});
 return res}
/* aplica el escrito a la lista del arquitecto */
function aplicarEscritos(){if(!ARQ.escritos||!ARQ.escritos.length||!arqEsCype())return;var duenos=arqDuenos();var nd=Math.max(1,duenos.length);
 var todos={marcas:[],notas:[]};ARQ.escritos.forEach(function(L){var r=leerEscrito(L,ARQ.med,duenos.length?duenos:['cliente']);todos.marcas=todos.marcas.concat(r.marcas);todos.notas=todos.notas.concat(r.notas)});ARQ.escritos=[];
 var porP={};todos.marcas.forEach(function(m){(porP[m.i]=porP[m.i]||[]).push(m)});
 Object.keys(porP).forEach(function(i){var p=ARQ.med[i],ms=porP[i];p.on=true;p.delEscrito=true;
  if(ms.some(function(m){return m.dueno==='comun'})||nd<2){p.para='comun'}
  else{var ds=ms.map(function(m){return m.dueno}).filter(function(d,k,a){return a.indexOf(d)===k});p.para=ds.length===1?String(ds[0]):'comun';if(ds.length>1)p.repartido=true}
  var a=ms.map(function(m){return m.area}).filter(Boolean)[0];if(a&&/^m2$/.test(p.u)){if(!(p.q>0)){p.q=a;p.qEscrito=true}else if(p.q>a*1.05){p.qArq=p.q;p.q=a;p.qZona=true}}});
 ARQ.notas=todos.notas;ARQ.duenos=duenos;
 var ai=document.getElementById('arqInfo');if(ai)ai.textContent='He leído también lo que pide el cliente: '+Object.keys(porP).length+' partidas marcadas solas'+(duenos.length>1?', repartidas entre '+duenos.join(' y '):'')+'. Repásalas.'}
/* pantalla: a quien va cada partida, lo que pide sin partida, y el boton de hacer los presupuestos */
var _renderCype=window.renderCype;
window.renderCype=function(){ARQ.med=ARQ.med.filter(function(p){return p.cype});aplicarEscritos();if(!ARQ.duenos)ARQ.duenos=arqDuenos();var r=_renderCype.apply(this,arguments);var D=ARQ.duenos||[];
 if(D.length>1)ARQ.med.forEach(function(p){var e=document.getElementById('cyp_'+p.i);if(!e)return;var v=e.querySelector('.cyv');if(!v)return;var s=document.createElement('span');
  s.innerHTML='Para <select onchange="ARQ.med['+p.i+'].para=this.value;cypeBarra()" style="padding:5px"><option value="comun">'+(D.length===2?'los dos, a medias':'todos, a partes iguales')+'</option>'+D.map(function(n,k){return '<option value="'+k+'"'+(String(p.para)===String(k)?' selected':'')+'>solo '+arqEsc(n.split(' ')[0]+' '+(n.split(' ')[1]||''))+'</option>'}).join('')+'</select>';v.appendChild(s);
  if(p.qEscrito){var n2=document.createElement('div');n2.className='cyn';n2.textContent='metros sacados de lo que pide el cliente (el arquitecto no lo midió), repásalos';e.appendChild(n2)}
  if(p.qZona){var n4=document.createElement('div');n4.className='cyn';n4.textContent='el arquitecto mide '+arqNum(p.qArq)+' m² en todo el edificio; he puesto los '+arqNum(p.q)+' m² de la zona que dice el cliente';e.appendChild(n4)}
  if(p.repartido){var n3=document.createElement('div');n3.className='cyn';n3.textContent='lo piden los dos: la cantidad del arquitecto se reparte a partes iguales, ajústala a lo de cada uno';e.appendChild(n3)}});
 var N=ARQ.notas||[];if(N.length){var box=document.getElementById('arqPanel');var d=document.createElement('details');d.className='cyc';d.open=true;
  var grupos={};N.forEach(function(n){var k=String(n.dueno);(grupos[k]=grupos[k]||[]).push(n.t)});
  d.innerHTML='<summary><span class="cyt">Lo que pide el cliente y no es una partida del arquitecto ('+N.length+')</span></summary><div style="padding:0 12px 10px;font-size:14px">'+Object.keys(grupos).map(function(k){return '<div style="margin-top:6px"><b>'+(k==='comun'?'Para los dos':'Para '+arqEsc(D[+k]||''))+'</b><ul style="margin:4px 0 0 18px;padding:0">'+grupos[k].map(function(t){return '<li style="margin-bottom:3px">'+arqEsc(t)+'</li>'}).join('')+'</ul></div>'}).join('')+'<p style="color:var(--muted);font-size:12px;margin:8px 0 0">Para que no se te olvide nada: añádelo tú en el presupuesto si lo haces.</p></div>';
  box.insertBefore(d,document.getElementById('cyBarra'))}
 return r};
/* precios: X veces el del arquitecto, en las que no tengan el suyo */
function cypeFactor(){var e=document.getElementById('cyFac');var k=arqLee(e&&e.value);if(!(k>0)){alert('Escribe cuántas veces el precio del arquitecto, por ejemplo 1,5');return}var n=0;ARQ.med.forEach(function(p){if(p.on&&!(p.pr>0)&&p.pa>0){var v=p.pa*k;p.pr=v>=20?Math.round(v):Math.round(v*100)/100;p.estimado=true;n++}});renderCype();var ai=document.getElementById('arqInfo');if(ai)ai.textContent=n+' precios puestos a '+String(k).replace('.',',')+' veces el del arquitecto. Repásalos.'}
/* hacer un presupuesto por dueno de una vez */
function hacerPresupuestos(){var D=ARQ.duenos||[];var M=ARQ.med.filter(function(p){return p.on});if(!M.length){alert('Marca primero las partidas');return}
 var falt=M.filter(function(p){return !(p.pr>0)}).length;if(falt&&!confirm(falt+' partidas van sin precio (a cero). ¿Hago los presupuestos así?'))return;
 leer();var dir=cur.dir||((ARQ.cab||{}).dir)||'',tel=cur.tel,email=cur.email;var cab=ARQ.cab,cype=ARQ.cype,med=ARQ.med,nombreDoc=ARQ.nombre;var hechos=[];
 var primero=!(cur.lineas||[]).length;
 D.forEach(function(nombre,k){if(!(primero&&k===0)){window.__sinPintarAnt=true;nuevo();window.__sinPintarAnt=false}
  document.getElementById('f_nom').value=nombre;document.getElementById('f_dir').value=dir;try{rellenarDeAgenda()}catch(_){}leer();
  M.forEach(function(p){var parte=p.para==='comun'?1/D.length:(String(p.para)===String(k)?1:0);if(p.repartido&&p.para==='comun')parte=1/D.length;if(!parte)return;
   var q=Math.round((p.q>0?p.q:1)*parte*1000)/1000;cur.lineas.push({d:arqTexto(p),q:q,u:p.u,p:p.pr>0?p.pr:0,code:p.code,cap:p.secT||p.capT||''})});
  cur.arqLeidas=M.length;renderLineas();guardar();
  var b=cur.lineas.reduce(function(a,l){return a+l.q*l.p},0);hechos.push({n:cur.num,nom:nombre,b:b,l:cur.lineas.length})});
 ARQ.cab=cab;ARQ.cype=cype;ARQ.med=med;ARQ.nombre=nombreDoc;M.forEach(function(p){p.metida=hechos.map(function(h){return h.n}).join(' y ')});
 window.ULT_ARQ={med:ARQ.med,cype:ARQ.cype,cab:ARQ.cab,nombre:ARQ.nombre};
 var htmlHechos='<b>Hechos los '+hechos.length+' presupuestos:</b> '+hechos.map(function(h){return 'nº '+h.n+' de '+arqEsc(h.nom)+' ('+h.l+' partidas, '+eur(h.b)+' + IVA)'}).join(' · ')+'. Estás en el último; los demás los tienes en <b>Clientes</b>. Revísalos y dale a «Enviar al cliente» en cada uno.';var pon=function(){var m=document.getElementById('msg');if(m)m.innerHTML=htmlHechos;var ai=document.getElementById('arqInfo');if(ai)ai.innerHTML=htmlHechos};pon();setTimeout(pon,2600);
 try{renderCype()}catch(_){}document.getElementById('tb').scrollIntoView({behavior:'smooth',block:'start'})}
var _barra2=window.cypeBarra;
window.cypeBarra=function(){_barra2.apply(this,arguments);var b=document.getElementById('cyBarra');if(!b)return;var M=ARQ.med.filter(function(p){return p.on});var row=b.querySelector('.row');if(!row||!M.length)return;
 if(!document.getElementById('cyFacBox')){var f=document.createElement('div');f.id='cyFacBox';f.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap;width:100%;font-size:14px';f.innerHTML='Las que no tengan precio, a <input id="cyFac" inputmode="decimal" placeholder="1,5" style="width:64px;text-align:right;padding:6px"> veces el del arquitecto <button class="sec mini" onclick="cypeFactor()">Poner</button>';row.parentNode.insertBefore(f,row)}
 var D=ARQ.duenos||[];var hb=document.getElementById('cyHacer');
 if(D.length>1){var txt='Hacer los '+D.length+' presupuestos ('+D.map(function(n){return n.split(' ')[0]}).join(' y ')+')';if(!hb){hb=document.createElement('button');hb.id='cyHacer';hb.className='ok';hb.onclick=hacerPresupuestos;row.appendChild(hb)}if(hb.textContent!==txt)hb.textContent=txt;
  var met=[].slice.call(row.querySelectorAll('button')).filter(function(x){return /^Meter las/.test(x.textContent)})[0];if(met){met.className='sec';met.textContent='Meter las '+M.length+' solo en este presupuesto'}}};
var _pintAnt=window.pintarArqAnterior;window.pintarArqAnterior=function(){if(window.__sinPintarAnt)return;return _pintAnt.apply(this,arguments)};
/* en el movil la barra entera tapaba media pantalla: va al final de la lista y arriba queda una tira fina */
(function(){var s=document.createElement('style');s.textContent='#arqPanel .cyb{position:static!important;box-shadow:none!important}'+
'#arqPanel .cymini{position:sticky;bottom:0;z-index:6;display:flex;gap:8px;align-items:center;justify-content:space-between;background:#fff;border:2px solid var(--gold,#8B6914);border-radius:10px;padding:8px 10px;margin-top:8px;box-shadow:0 -4px 14px rgba(0,0,0,.1);font-size:14px}'+
'#arqPanel .cymini button{flex:0 0 auto;padding:8px 12px}';document.head.appendChild(s)})();
var _barra3=window.cypeBarra;
window.cypeBarra=function(){_barra3.apply(this,arguments);var b=document.getElementById('cyBarra');if(!b)return;var box=document.getElementById('arqPanel');var mi=document.getElementById('cyMini');
 var M=ARQ.med.filter(function(p){return p.on});var tot=M.reduce(function(a,p){return a+(p.q||0)*(p.pr||0)},0);var falt=M.filter(function(p){return !(p.pr>0)}).length;
 if(!mi){mi=document.createElement('div');mi.id='cyMini';mi.className='cymini';box.insertBefore(mi,b)}
 var t=M.length?'<span><b>'+M.length+' marcadas</b> · '+eur(tot)+(falt?' · <span style="color:#b3261e">'+falt+' sin precio</span>':'')+'</span><button class="ok" onclick="document.getElementById(\'cyBarra\').scrollIntoView({behavior:\'smooth\',block:\'center\'})">Precios y presupuestos ↓</button>':'<span>Marca las partidas que vas a hacer tú.</span>';
 if(mi.__t!==t){mi.__t=t;mi.innerHTML=t}
 if((ARQ.duenos||[]).length>1)[].slice.call(b.querySelectorAll('button')).forEach(function(x){if(/^Cantidades a la mitad/.test(x.textContent))x.style.display='none'})};
/* planos de proyecto (muchas hojas): las estancias se repiten; no se suman ni se marcan solas */
var _parsePlano=window.parsePlano;
window.parsePlano=function(items){var pl=_parsePlano.apply(this,arguments);try{if(!pl||!pl.rooms||!pl.rooms.length)return pl;
 var visto={},unicas=[],rep=0;pl.rooms.forEach(function(r){var k=norm(r.n||'')+'|'+r.a;if(visto[k]){rep++;return}visto[k]=1;unicas.push(r)});
 var muchas=pl.rooms.length>25||rep>=3||!(pl.paredes>0);
 if(rep||muchas){pl.rooms=unicas;pl.repetidas=rep;pl.suelo=unicas.reduce(function(s,r){return s+r.a},0);if(muchas)pl.proyecto=true}}catch(e){}return pl};
/* si en la misma tanda viene el presupuesto del arquitecto, los planos no hacen falta: las medidas salen de las mediciones */
var _renderArq2=window.renderArq;
window.renderArq=function(){if(ARQ.plano&&ARQ.plano.proyecto&&!(ARQ.med||[]).length)ARQ.dudosas=[];if(arqEsCype()&&ARQ.plano){ARQ.plano=null;var ai=document.getElementById('arqInfo');if(ai&&!/planos/.test(ai.textContent))ai.textContent=(ai.textContent?ai.textContent+' ':'')+'Los planos no los uso: las medidas salen de las mediciones del arquitecto.'}return _renderArq2.apply(this,arguments)};
/* cabecera: "obra" solo cuenta si va como etiqueta ("Obra: ...", "Situación: ..."), no una frase cualquiera con la palabra obra */
var _parseCab=window.parseCabecera;
window.parseCabecera=function(ls){var out=_parseCab.apply(this,arguments);try{var L=(ls||[]).slice(0,120).map(function(l){return String(l).replace(/[​]/g,'').trim()});
 var et=function(rx){for(var i=0;i<L.length;i++){var m=L[i].match(rx);if(m){var v=(m[1]||'').trim();if(v.length<2&&L[i+1])v=L[i+1].trim();if(v.length>2&&v.length<90)return v}}return ''};
 out.dir=et(/^\s*(?:emplazamiento|situaci[oó]n|direcci[oó]n(?: de la obra)?|obra|inmueble)\s*:\s*(.*)$/i);
 out.cli=out.cli&&/^\s*(?:promotor|propietario|propiedad|cliente|peticionario)\s*:/i.test(L.filter(function(l){return l.indexOf(out.cli)>=0})[0]||'')?out.cli:et(/^\s*(?:promotor|propietario|propiedad|cliente|peticionario)\s*:\s*(.*)$/i)}catch(e){}return out};
/* ===== arreglo de presupuestos ya mandados: ?arreglo=ID abre una tarjeta que corrige esos presupuestos y actualiza sus mismos enlaces ===== */
(function(){var id=new URLSearchParams(location.search).get('arreglo');if(!id)return;
 function caja(h){var d=document.getElementById('arrBox');if(!d){d=document.createElement('div');d.id='arrBox';d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99990;display:flex;align-items:center;justify-content:center;padding:16px';document.body.appendChild(d)}d.innerHTML='<div class="card" style="max-width:460px;width:100%;max-height:85vh;overflow:auto">'+h+'</div>';return d}
 function espera(fn,ms){return new Promise(function(ok){var t0=Date.now();(function v(){if(fn())return ok(true);if(Date.now()-t0>ms)return ok(false);setTimeout(v,250)})()})}
 fetch('arreglos/'+id+'.json?'+Date.now()).then(function(r){return r.json()}).then(function(A){
  var NV=A.presus.every(function(p){return p.nuevo});caja('<h2 style="font-size:20px">'+(NV?'Presupuesto preparado':'Corregir presupuestos ya mandados')+'</h2><p>'+(NV?'Te he dejado hecho el presupuesto de '+A.presus.map(function(p){return '<b>'+p.nom+'</b>'}).join(' y ')+', con todas sus partidas y precios. Pulsa el botón y te aparece en la aplicación, listo para mandar.':'Voy a corregir '+A.presus.map(function(p){return 'el nº '+p.num+' ('+p.nom+')'}).join(' y ')+'. El cliente lo verá corregido <b>en el mismo enlace</b> que ya tiene: no hace falta mandarle nada.')+'</p><button class="ok" style="width:100%" id="arrGo">'+(NV?'Meterlo en la aplicación':'Corregir ahora')+'</button><button class="sec" style="width:100%;margin-top:6px" onclick="document.getElementById(\'arrBox\').remove()">Ahora no</button><div id="arrMsg" style="margin-top:8px"></div>');
  document.getElementById('arrGo').onclick=function(){var b=this;b.disabled=true;var msg=document.getElementById('arrMsg');msg.textContent='Entrando en tu cuenta…';
   espera(function(){return !!(window.FB&&FB.uid&&FB.db)},20000).then(function(ok){if(!ok){msg.innerHTML='<b style="color:#b3261e">No has entrado en tu cuenta.</b> Entra y vuelve a abrir este enlace.';b.disabled=false;return}
    var hechos=[],i=0;var ow=window.open;window.open=function(){return null};
    (function sig(){if(i>=A.presus.length){window.open=ow;var nv=A.presus.some(function(p){return p.nuevo});msg.innerHTML='<b style="color:#1b7a3a">Hecho.</b> '+hechos.join(' · ')+(nv?'<br>Te lo dejo abierto: revísalo y dale a <b>Enviar al cliente</b>.':(window.__arrMal?'<br><b style="color:#b3261e">Algo no ha salido: no le digas nada al cliente todavía y avísame.</b>':'<br>Los clientes ya lo ven bien en su enlace.'))+(nv?'<button class="ok" style="width:100%;margin-top:8px" onclick="document.getElementById(\'arrBox\').remove();window.scrollTo(0,0)">Ver el presupuesto</button>':'');if(nv&&window.__arrAbrir){try{abrir(window.__arrAbrir);document.querySelector("button.ntab[data-t=presupuesto]").click()}catch(_){}}b.style.display='none';try{history.replaceState({},'',location.pathname)}catch(_){}return}
     var P=A.presus[i++];msg.textContent='Corrigiendo el nº '+P.num+'…';
     try{var ya=P.nuevo&&Object.keys(DB.presus).filter(function(k){var q=DB.presus[k];return q&&q.nom===P.nom&&(q.dir||'')===(P.dir||'')}).pop();if(ya){abrir(ya)}else if(P.nuevo){nuevo()}else if(DB.presus[P.num])abrir(P.num);else{nuevo();cur.num=P.num}}catch(_){}
     setTimeout(function(){try{
      if(!P.nuevo&&P.num){var fn=document.getElementById('f_num');if(fn)fn.value=P.num;cur.num=P.num}document.getElementById('f_nom').value=P.nom;if(P.dir)document.getElementById('f_dir').value=P.dir;if(P.asc!=null)document.getElementById('f_asc').value=P.asc;if(P.tel)document.getElementById('f_tel').value=P.tel;document.getElementById('f_obs').value=P.obs||'';
      cur.lineas=JSON.parse(JSON.stringify(P.lineas));if(P.arq)cur.arqLeidas=P.lineas.length;if(A.ver)cur.arrVer=A.ver;renderLineas();leer();
      if(P.nuevo){guardar();window.__arrAbrir=cur.num;var tt=totalCon(cur.lineas,cur.iva);hechos.push('nº '+cur.num+' '+P.nom+': '+eur(tt)+', listo para mandar');return sig()}
      cur.firmaTok=P.tok;guardar();cur.firmaTok=P.tok;DB.presus[P.num].firmaTok=P.tok;save();
      var m=document.getElementById('msg');if(m)m.innerHTML='';
      mandarFirma();
      var baseOk=Math.round(cur.lineas.filter(function(l){return !l.imp}).reduce(function(a,l){return a+Math.round(num(l.q)*num(l.p)*100)/100},0)*100)/100;var leido=null;espera(function(){if(leido===null){leido=false;FB.db.collection('firmas').doc(P.tok).get().then(function(d){var x=d.exists?d.data():{};leido=(Math.abs(num(x.base)-baseOk)<0.01)?'ok':false;if(leido!=='ok')setTimeout(function(){leido=null},1200)}).catch(function(){setTimeout(function(){leido=null},1200)})}return leido==='ok'},25000).then(function(){var mismo=leido==='ok';
       var tot=totalCon(cur.lineas,cur.iva);if(!mismo)window.__arrMal=1;
       hechos.push('nº '+P.num+' '+P.nom+': '+eur(tot)+(mismo?' (mismo enlace)':' (<b style="color:#b3261e">no se ha cambiado su enlace</b>)'));sig()})}catch(e){window.__arrMal=1;hechos.push('nº '+P.num+': <b style="color:#b3261e">no se ha podido: '+e.message+'</b>');sig()}},900)})()})}}).catch(function(){})})();
