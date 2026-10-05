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

function arqEsCype(){return ARQ.med&&ARQ.med.length&&ARQ.med[0].cype}
function arqUnidadIgual(a,b){a=(a||'').replace(/^pa$/,'ud');b=(b||'').replace(/^pa$/,'ud');return a===b||(/^ml?$/.test(a)&&/^ml?$/.test(b))}
function arqPrecioTuyo(p){if(p.pr!=null)return p.pr;var ap=precioAprendido(p.largo||p.t);if(!(ap>0))ap=precioAprendido(p.t);if(ap>0){p.deMemoria=true;return ap}
return 0}
function arqUd(u){return ({m2:'m²',m3:'m³'})[u]||u}
function arqEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function arqNum(n){return (Math.round(n*1000)/1000).toLocaleString('es-ES',{maximumFractionDigits:3})}

/* pantalla: capitulos plegados, marcas lo que haces tu */
function renderCype(){var box=document.getElementById('arqPanel');var M=ARQ.med,R=(ARQ.cype&&ARQ.cype.resumen)||{};
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
h+='<details class="cyc"'+(C.abierto?' open':'')+' data-cap="'+arqEsc(C.n)+'" ontoggle="cypeAbre(this)"><summary><span class="cyt">'+arqEsc(C.n)+'. '+arqEsc(C.t)+'</span><span class="cym" id="cyc_'+arqEsc(C.n)+'"></span><span class="cyi">'+eur(imp)+'</span></summary>';
h+='<label class="cys"><input type="checkbox" onchange="cypeGrupo(\'cap\',\''+arqEsc(C.n)+'\',this.checked)"> Todo el capítulo</label>';
C.secs.forEach(function(S){h+='<div class="cyh"><label><input type="checkbox" onchange="cypeGrupo(\'sec\',\''+arqEsc(S.k)+'\',this.checked)"> <b>'+arqEsc(S.k)+' '+arqEsc(S.t)+'</b></label></div>';
S.ps.forEach(function(p){var sinMed=!(p.q>0);
h+='<div class="cyp'+(p.on?' on':'')+(p.metida?' ya':'')+'" id="cyp_'+p.i+'"><label class="cyl"><input type="checkbox" data-i="'+p.i+'" data-cap="'+arqEsc(p.cap)+'" data-sec="'+arqEsc(p.sec||p.cap)+'"'+(p.on?' checked':'')+' onchange="cypeMarca('+p.i+',this.checked)"><span>'+arqEsc(p.t)+'</span></label>'+
'<div class="cyd">'+arqEsc(p.code)+' · arquitecto: '+(sinMed?'sin medición':arqNum(p.q)+' '+arqUd(p.u))+' a '+eur(p.pa||0)+(p.metida?' · <b>ya metida en el presupuesto '+arqEsc(p.metida)+'</b>':'')+'</div>'+
'<div class="cyv"><span>Cantidad <input inputmode="decimal" value="'+(p.q>0?String(p.q).replace('.',','):'')+'" onchange="cypeCant('+p.i+',this.value)"> '+arqUd(p.u)+'</span>'+
'<span>Tu precio <input inputmode="decimal" value="'+(p.pr>0?String(p.pr).replace('.',','):'')+'" placeholder="0" onchange="cypePrecio('+p.i+',this.value)"'+(p.pr>0?'':' class="falta"')+'> €</span></div>'+
(p.mitad?'<div class="cyn ok">la mitad de lo que mide el arquitecto</div>':'')+(p.dePa?'<div class="cyn">precio del arquitecto, repásalo</div>':(p.deMemoria?'<div class="cyn ok">tu precio de otras veces</div>':(p.deTarifa?'<div class="cyn ok">de tu tarifa</div>':'')))+'</div>'})});
h+='</details>'});
h+='<div class="cyb" id="cyBarra"></div>';
box.style.display='block';box.innerHTML=h;cypeBarra();cypeContar();
setTimeout(function(){try{pintarContinuar();plegarDatos()}catch(_){}},60)}
function cypeAbre(d){var c=d.getAttribute('data-cap');ARQ.med.forEach(function(p){if(p.cap===c)p.__ab=d.open});}
function cypeContar(){var n={};ARQ.med.forEach(function(p){if(!n[p.cap])n[p.cap]=[0,0];n[p.cap][1]++;if(p.on)n[p.cap][0]++});Object.keys(n).forEach(function(c){var e=document.getElementById('cyc_'+c);if(e)e.textContent=n[c][0]?n[c][0]+' marcadas':''})}
function cypeBarra(){var b=document.getElementById('cyBarra');if(!b)return;var M=ARQ.med.filter(function(p){return p.on});var tot=M.reduce(function(a,p){return a+(p.q||0)*(p.pr||0)},0);var falt=M.filter(function(p){return !(p.pr>0)}).length;var arq=M.reduce(function(a,p){return a+(p.imp!=null&&p.q===p.q0?p.imp:(p.q||0)*(p.pa||0))},0);
b.innerHTML=M.length?'<div><b>'+M.length+' marcadas</b> · con tus precios <b>'+eur(tot)+'</b>'+(falt?' · <span style="color:#b3261e">'+falt+' sin tu precio</span>':'')+'<br><small>Lo mismo con los precios del arquitecto: '+eur(arq)+'</small></div>'+
'<div class="row" style="margin-top:6px"><button class="sec" onclick="cypeMitad()">Cantidades a la mitad (obra a medias entre dos dueños)</button>'+(falt?'<button class="sec" onclick="cypePonerArq()">Poner el precio del arquitecto a las '+falt+' sin precio</button>':'')+'<button class="ok" onclick="addCype()">Meter las '+M.length+' en el presupuesto</button></div>':
'<div>Marca las partidas que vas a hacer tú.</div>'}
function cypeMitad(){var n=0;ARQ.med.forEach(function(p){if(p.on&&p.q>0&&!p.mitad){p.q=Math.round(p.q/2*1000)/1000;p.mitad=true;n++}});abiertos();renderCype();var ai=document.getElementById('arqInfo');if(ai)ai.textContent=n?'Puesta la mitad de la cantidad en '+n+' partidas marcadas.':'Las marcadas ya estaban a la mitad.'}
function cypeMarca(i,v){var p=ARQ.med[i];p.on=v;var e=document.getElementById('cyp_'+i);if(e)e.classList.toggle('on',v);cypeBarra();cypeContar()}
function cypeGrupo(tipo,k,v){document.querySelectorAll('#arqPanel .cyl input[data-'+tipo+'="'+k+'"]').forEach(function(c){c.checked=v;cypeMarca(+c.getAttribute('data-i'),v)});
if(tipo==='cap')document.querySelectorAll('#arqPanel details[data-cap="'+k+'"] .cyh input').forEach(function(c){c.checked=v})}
function cypeTodo(v){ARQ.med.forEach(function(p){p.on=v&&!p.metida});renderCype()}
function arqLee(v){v=String(v||'').trim();if(/,/.test(v))v=v.replace(/\./g,'').replace(',','.');return parseFloat(v)||0}
function cypeCant(i,v){ARQ.med[i].q=arqLee(v);cypeBarra()}
function cypePrecio(i,v){var p=ARQ.med[i];p.pr=arqLee(v);p.dePa=false;if(p.pr>0)aprendePrecio(p.largo||p.t,p.pr,p.u);var e=document.querySelector('#cyp_'+i+' .cyv span:nth-child(2) input');if(e)e.classList.toggle('falta',!(p.pr>0));cypeBarra()}
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
cur.arqLeidas=(cur.arqLeidas||0)+M.length;window.ULT_ARQ={med:ARQ.med,cype:ARQ.cype,cab:ARQ.cab,nombre:ARQ.nombre};
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
