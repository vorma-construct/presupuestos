/* El dinero de cada obra, en la lista de clientes (solo para la empresa, el cliente no lo ve):
   1) Cobros: los plazos del contrato (a la firma, a mitad de obra, al terminar) y los extras aprobados.
      Se apunta lo que paga el cliente (también pagos a medias), se le recuerda por WhatsApp
      y arriba sale lo que te deben ahora y lo que te deberán más adelante.
   2) Gastos: con la foto del ticket se lee el importe (en el propio móvil) o se mete a mano,
      y sale lo que te queda de la obra: presupuesto menos gastos, sin IVA.
   Todo va en el presupuesto, así que lo ven todas las cuentas de la empresa. */
(function(){
var FASES=[['f1','p1','A la firma'],['f2','p2','A mitad de obra'],['f3','p3','Al terminar']];
function n(v){if(typeof v==='number')return isFinite(v)?v:0;var s=String(v==null?'':v).replace(/[^\d,.\-]/g,'');if(s.indexOf(',')>=0)s=s.replace(/\./g,'').replace(',','.');return parseFloat(s)||0}
function r2(x){return Math.round(x*100)/100}
function e(x){return typeof eur==='function'?eur(x):r2(x).toFixed(2)+' €'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fecha(ts){try{return new Date(ts).toLocaleDateString('es-ES')}catch(_){return ''}}
function contratado(p){return !!(p&&((window.estaFirmado&&estaFirmado(p))||/^(aceptado|obra|finalizado|cobrado)$/.test(p.estado||'')))}

/* lo que hay que cobrar: los plazos del contrato sobre el total firmado (con IVA) y los extras aprobados */
function plazos(p){var iva=n(p.iva||21),L=p.lineas||[];
 var base=r2(L.filter(function(l){return !l.imp}).reduce(function(a,l){return a+r2(n(l.q)*n(l.p))},0)),tot=r2(base+r2(base*iva/100));
 var c=p.c||{},pc=FASES.map(function(f){var v=c[f[1]];return v===''||v==null?({p1:30,p2:60,p3:10})[f[1]]:n(v)});
 var out=[],suma=0,ult=-1;pc.forEach(function(v,i){if(v>0)ult=i});
 FASES.forEach(function(f,i){if(!(pc[i]>0))return;var imp=i===ult&&pc.reduce(function(a,b){return a+b},0)===100?r2(tot-suma):r2(tot*pc[i]/100);suma=r2(suma+imp);out.push({k:f[0],t:f[2],pct:pc[i],imp:imp})});
 var ex=r2(L.filter(function(l){return l.imp}).reduce(function(a,l){return a+r2(n(l.q)*n(l.p))},0));
 if(ex>0)out.push({k:'ex',t:'Extras aprobados',pct:null,imp:r2(ex+r2(ex*iva/100))});
 var co=p.cobros||{},hay=Object.keys(co).some(function(k){return (co[k]||[]).length});
 /* «Pagado y cerrado» sin cobros apuntados (de antes de esto): se da por cobrado */
 var cerrado=p.estado==='cobrado'&&!hay;
 out.forEach(function(x){x.pagos=(co[x.k]||[]);x.pagado=cerrado?x.imp:r2(x.pagos.reduce(function(a,y){return a+n(y.imp)},0));x.falta=r2(Math.max(0,x.imp-x.pagado));x.toca=toca(p,x.k);x.cerrado=cerrado});
 return {base:base,tot:tot,extrasBase:ex,lista:out}}
/* cuándo toca cada plazo: a la firma ya; a mitad de obra cuando va por la mitad (o no hay fechas y está en obra); al terminar y los extras, al acabar */
function toca(p,k){var est=p.estado||'';if(k==='f1')return true;if(/^(finalizado|cobrado)$/.test(est))return true;
 if(k==='f2'&&est==='obra'){if(p.obraIni&&p.obraFinPrev){var a=new Date(p.obraIni+'T00:00:00'),b=new Date(p.obraFinPrev+'T00:00:00');if(!isNaN(a)&&!isNaN(b))return Date.now()>=a.getTime()+(b-a)/2}return true}
 return false}

/* los gastos de la obra (importe del ticket con IVA y sin IVA) */
function gastos(p){var G=p.gastos||[];return {lista:G,total:r2(G.reduce(function(a,g){return a+n(g.imp)},0)),base:r2(G.reduce(function(a,g){return a+n(g.base!=null?g.base:n(g.imp)/1.21)},0))}}

function guardar(num,cambia){var p=DB.presus[num];if(!p)return;cambia(p);p.ts=Date.now();DB.presus[num]=p;try{save()}catch(_){}try{subirPresu(num)}catch(_){}try{renderClientes()}catch(_){}}

window.dineroCobrar=function(num,k){var p=DB.presus[num];if(!p)return;var x=plazos(p).lista.filter(function(y){return y.k===k})[0];if(!x)return;
 var v=prompt('¿Cuánto te ha pagado '+p.nom+' de «'+x.t+'»?',String(x.falta||x.imp).replace('.',','));if(v===null)return;var imp=r2(n(v));if(!(imp>0))return;
 guardar(num,function(q){q.cobros=q.cobros||{};q.cobros[k]=(q.cobros[k]||[]).concat([{ts:Date.now(),imp:imp}]);
  var P=plazos(q);if(P.lista.every(function(y){return y.falta<0.005})&&q.estado==='finalizado')q.estado='cobrado'});
 try{if(window.__usoApunta)__usoApunta('cobro')}catch(_){}};
window.dineroDeshacer=function(num,k){var p=DB.presus[num];if(!p||!p.cobros||!(p.cobros[k]||[]).length)return;var u=p.cobros[k][p.cobros[k].length-1];
 if(!confirm('¿Quitar el último cobro apuntado ('+e(u.imp)+' el '+fecha(u.ts)+')?'))return;
 guardar(num,function(q){q.cobros[k]=q.cobros[k].slice(0,-1);if(q.estado==='cobrado')q.estado='finalizado'})};
window.dineroRecordar=function(num,k){var p=DB.presus[num];if(!p)return;var x=plazos(p).lista.filter(function(y){return y.k===k})[0];if(!x)return;
 var t='Hola '+p.nom+', te recuerdo el pago '+(x.k==='ex'?'de los trabajos extra aprobados':'«'+x.t.toLowerCase()+'»')+' del presupuesto nº '+p.num+': '+e(x.falta||x.imp)+'.'+(window.AJ&&AJ.iban?' Cuenta: '+AJ.iban+'.':'')+' Gracias, '+((window.AJ&&AJ.marca)||'');
 window.open(waURL(t,p.tel),'_blank');try{if(window.__usoApunta)__usoApunta('recordarCobro')}catch(_){}};

/* ---------- gastos ---------- */
var TIENDAS=/(leroy\s*merlin|bricomart|brico\s*d[eé]p[oô]t|bricoking|obramat|saltoki|porcelanosa|bigmat|cadena\s*88|ferreter[ií]a\s+\w+|ferreter[ií]a|ikea|aki\b|mercadona|eroski|carrefour|lidl|repsol|cepsa|galp|petronor|bp\b|shell|würth|wurth|hilti|ceramica\s+\w+|cer[aá]mica\s+\w+|maderas\s+\w+|almac[eé]n\s+\w+)/i;
function importesDe(l){var r=[],re=/(?:^|[^\d])(\d{1,3}(?:[.\s]\d{3})+|\d+)\s?[,.]\s?(\d{2})(?!\d)/g,m;while((m=re.exec(l))){r.push(n(m[1].replace(/[.\s]/g,'')+','+m[2]))}return r}
/* lee el total del ticket: la línea del TOTAL (no subtotal, ni base, ni IVA, ni lo entregado o la vuelta); si no, el importe más alto */
function leerTicket(txt){var L=String(txt||'').split(/\r?\n/).map(function(s){return s.replace(/\s+/g,' ').trim()}).filter(Boolean);
 var sa=function(s){return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')};
 var total=0,base=0,cand=[];
 L.forEach(function(l,i){var s=sa(l),im=importesDe(l);if(!im.length){var sig=L[i+1]?importesDe(L[i+1]):[];if(/\btotal\b/.test(s)&&sig.length)im=sig;else return}
  if(/\b(entregad|efectivo|cambio|devoluci|vuelta|propina)/.test(s))return;
  if(/\btotal\b/.test(s)&&!/sub\s*-?total|total\s+(iva|cuota|base|imp\.?\s*iva)|base|cuota|descuento|dto|ahorro|unidades|uds|articulos|lineas/.test(s))cand.push({v:im[im.length-1],peso:/a\s+pagar|factura|eur|€|total\s*$/.test(s)?2:1,i:i});
  if(/\bbase(\s+imponible)?\b/.test(s)&&!base)base=im[im.length-1]});
 if(cand.length){cand.sort(function(a,b){return b.peso-a.peso||b.i-a.i});total=cand[0].v}
 if(!total){var todos=[];L.forEach(function(l){var s=sa(l);if(/\b(entregad|efectivo|cambio|vuelta|tel|telefono|cif|nif|cp\b)/.test(s))return;importesDe(l).forEach(function(v){todos.push(v)})});total=todos.length?Math.max.apply(null,todos):0}
 if(base&&!(base<total&&base>total/1.3))base=0;
 var prov='',t=L.join(' \n ').match(TIENDAS);if(t)prov=t[1].replace(/\s+/g,' ').trim();
 if(!prov){for(var i=0;i<Math.min(L.length,5);i++){var w=L[i].replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ .&-]/g,'').trim();if(w.length>=4&&(w.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/g)||[]).length>=4&&!/factura|ticket|simplificada|cif|nif|fecha|hora|caja/i.test(w)){prov=w.slice(0,40);break}}}
 /* LEROY MERLIN -> Leroy Merlin */
 if(prov&&prov===prov.toUpperCase())prov=prov.toLowerCase().replace(/(^|\s)(\S)/g,function(a,b,c){return b+c.toUpperCase()});
 return {total:r2(total),base:base?r2(base):0,prov:prov}}
window.__leerTicket=leerTicket;

function apuntarGasto(num,g){guardar(num,function(q){q.gastos=(q.gastos||[]).concat([g])});try{if(window.__usoApunta)__usoApunta('gasto')}catch(_){}}
window.dineroGastoFoto=function(num){var p=DB.presus[num];if(!p)return;var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
 inp.onchange=function(){var f=inp.files&&inp.files[0];if(!f)return;var info=document.getElementById('dinInfo_'+num);if(info)info.innerHTML='<b>Leyendo el ticket…</b>';
  var M=window.__motor;var leer=M&&M.leerImagenes?M.leerImagenes([f],info):Promise.reject(new Error('sin lector'));
  leer.then(function(ts){var R=leerTicket((ts||[]).join('\n'));if(info)info.innerHTML='';pedir(num,R,'foto')},function(){if(info)info.innerHTML='';pedir(num,{total:0,base:0,prov:''},'foto')})};
 document.body.appendChild(inp);inp.click();setTimeout(function(){inp.remove()},60000)};
window.dineroGastoMano=function(num){pedir(num,{total:0,base:0,prov:''},'mano')};
function pedir(num,R,de){var v=prompt(R.total?'He leído en el ticket'+(R.prov?' de '+R.prov:'')+': '+e(R.total)+'. Si no es, pon el importe bueno (con IVA):':'Importe del gasto, con IVA:',R.total?String(R.total).replace('.',','):'');if(v===null)return;var imp=r2(n(v));if(!(imp>0))return;
 var c=prompt('¿Qué es? (por ejemplo: azulejo, fontanería, contenedor)',R.prov||'');if(c===null)c=R.prov||'';
 var base=R.base&&Math.abs(imp-R.total)<0.005?R.base:r2(imp/1.21);
 apuntarGasto(num,{id:Date.now().toString(36),ts:Date.now(),imp:imp,base:base,prov:String(c||'').slice(0,60),de:de})}
window.dineroQuitarGasto=function(num,id){var p=DB.presus[num];if(!p||!p.gastos)return;var g=p.gastos.filter(function(x){return x.id===id})[0];if(!g)return;
 if(!confirm('¿Quitar el gasto de '+e(g.imp)+(g.prov?' ('+g.prov+')':'')+'?'))return;guardar(num,function(q){q.gastos=q.gastos.filter(function(x){return x.id!==id})})};
window.dineroVerGastos=function(num){var el=document.getElementById('dinG_'+num);if(el)el.style.display=el.style.display==='none'?'block':'none'};

/* ---------- el bloque de la ficha ---------- */
function bloque(p){if(!contratado(p))return '';var P=plazos(p),G=gastos(p),num=esc(p.num),cobrado=r2(P.lista.reduce(function(a,x){return a+x.pagado},0)),totalCobrar=r2(P.lista.reduce(function(a,x){return a+x.imp},0));
 var filas=P.lista.map(function(x){var ok=x.falta<0.005,parcial=!ok&&x.pagado>0,ult=x.pagos[x.pagos.length-1];
  return '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:4px">'+
   '<span style="flex:1 1 180px">'+(ok?'<span style="font-weight:700;color:var(--ok)">✓</span> ':'<span style="color:'+(x.toca?'#C24A00':'var(--muted)')+'">○</span> ')+esc(x.t)+(x.pct!=null?' · '+x.pct+' %':'')+' · <span style="font-weight:700">'+e(x.imp)+'</span>'+
   (ok?' <span style="color:var(--muted)">— cobrado'+(ult?' el '+fecha(ult.ts):'')+'</span>':parcial?' <span style="color:#C24A00">— cobrado '+e(x.pagado)+', faltan '+e(x.falta)+'</span>':(x.toca?' <span style="color:#C24A00">— toca cobrar</span>':''))+'</span>'+
   (ok?'':'<button class="mini ok" onclick="dineroCobrar(\''+num+'\',\''+x.k+'\')">Cobrado</button>'+(x.toca&&p.tel?'<button class="mini sec" onclick="dineroRecordar(\''+num+'\',\''+x.k+'\')">Recordar</button>':''))+
   (x.pagos.length?'<button class="mini sec" title="Quitar el último cobro" onclick="dineroDeshacer(\''+num+'\',\''+x.k+'\')">Deshacer</button>':'')+'</div>'}).join('');
 var ingresos=r2(P.base+P.extrasBase),queda=r2(ingresos-G.base);
 var lista=G.lista.slice().sort(function(a,b){return b.ts-a.ts}).map(function(g){return '<div style="display:flex;gap:6px;align-items:center;margin-top:3px"><span style="flex:1">'+fecha(g.ts)+' · '+esc(g.prov||'Gasto')+'</span><span style="font-weight:700">'+e(g.imp)+'</span><button class="mini sec" onclick="dineroQuitarGasto(\''+num+'\',\''+esc(g.id)+'\')">Quitar</button></div>'}).join('');
 return '<div class="dinero" style="grid-column:1/-1;margin-top:6px;padding-top:6px;border-top:1px dashed var(--line);font-size:13px">'+
  '<span style="font-weight:700;font-size:12px">Cobros</span> <span style="color:var(--muted);font-size:12px">cobrado '+e(cobrado)+' de '+e(totalCobrar)+'</span>'+filas+
  '<div style="margin-top:8px"><span style="font-weight:700;font-size:12px">Gastos de la obra</span> <span style="color:var(--muted);font-size:12px">'+(G.lista.length?G.lista.length+(G.lista.length===1?' gasto':' gastos')+' · '+e(G.total)+' ('+e(G.base)+' sin IVA)':'sin gastos apuntados')+'</span></div>'+
  '<div style="margin-top:3px">Presupuesto sin IVA '+e(ingresos)+' − gastos '+e(G.base)+' = <span style="font-weight:700;color:'+(queda<0?'#b3261e':'var(--ok)')+'">te quedan '+e(queda)+'</span></div>'+
  '<div id="dinInfo_'+num+'" style="font-size:12px;color:var(--muted)"></div>'+
  '<div class="row" style="margin-top:4px"><button class="mini ok" onclick="dineroGastoFoto(\''+num+'\')">+ Gasto con foto del ticket</button><button class="mini sec" onclick="dineroGastoMano(\''+num+'\')">+ Gasto a mano</button>'+(G.lista.length?'<button class="mini sec" onclick="dineroVerGastos(\''+num+'\')">Ver gastos</button>':'')+'</div>'+
  '<div id="dinG_'+num+'" style="display:none;margin-top:4px">'+lista+'</div></div>'}
window.__dineroBloque=bloque;window.__dineroPlazos=plazos;

/* lo que te deben, arriba de la lista */
function resumen(){var ahora=0,luego=0,nA=0;Object.keys(DB.presus||{}).forEach(function(k){var p=DB.presus[k];if(!contratado(p))return;
 plazos(p).lista.forEach(function(x){if(x.falta<0.005)return;if(x.toca){ahora+=x.falta;nA++}else luego+=x.falta})});
 if(!(ahora>0||luego>0))return '';
 return '<div id="dineroResumen" style="background:#fff;border:1px solid var(--line);border-left:4px solid #C24A00;border-radius:8px;padding:10px 12px;margin:0 0 10px;font-size:14px">'+
  (ahora>0?'<b>Te deben ahora '+e(ahora)+'</b> ('+nA+(nA===1?' cobro':' cobros')+')':'<b>Nada pendiente de cobrar ahora</b>')+
  (luego>0?'<div style="color:var(--muted);font-size:13px;margin-top:2px">Más adelante, según avancen las obras: '+e(luego)+'</div>':'')+'</div>'}

var fc0=window.fichaCli;
if(fc0&&!fc0.__dinero){window.fichaCli=function(p){var h=fc0.apply(this,arguments);try{var b=bloque(p);if(!b)return h;
  var marca='<div class="row"><button class="mini ok" onclick="verFotos(';var i=h.lastIndexOf(marca);
  if(i>=0)return h.slice(0,i)+b+h.slice(i);var j=h.lastIndexOf('</div>');return j>=0?h.slice(0,j)+b+h.slice(j):h+b}catch(e){return h}};window.fichaCli.__dinero=1}
var rc0=window.renderClientes;
if(rc0&&!rc0.__dinero){window.renderClientes=function(){var r=rc0.apply(this,arguments);try{var box=document.getElementById('listaCli');var fi=document.getElementById('firmasInfo');
  var ya=document.getElementById('dineroResumen');if(ya)ya.remove();var h=resumen();if(h&&box){var fila=fi&&fi.closest('.row');if(fila)fila.insertAdjacentHTML('afterend',h);else box.insertAdjacentHTML('afterbegin',h)}}catch(e){}return r};window.renderClientes.__dinero=1}
})();
