/* Lo que se ha dicho y lo que falta por confirmar.
   El dictado saca partidas; las que NO salen de lo dicho quedan PENDIENTES hasta que el usuario las confirme:
   · una respuesta que nadie ha dado (la estancia trae «falso techo: sí» por defecto),
   · unos metros que no se han dicho (nada de poner «1 m²» como si fuera verdad),
   · unos metros calculados por los de la casa,
   · una partida sin precio,
   · una partida que el dictado ha supuesto pero no se ha dicho («rodapié» al poner suelo flotante).
   Con algo pendiente se puede guardar el borrador, pero no sacar el PDF ni mandarlo a firmar. */
(function(){
var calc0=null;
function api(){return window.__paqApi||{}}
function normT(x){return (window.norm?norm(String(x||'')):String(x||'').toLowerCase()).replace(/\s+/g,' ')}
function idL(l){if(l.tid)return l.tid;var d=String(l.d||'');var t=(window.tarifa?tarifa():[]).find(function(x){return x.d===d||d.indexOf(x.d+' — ')===0});return t?t.id:''}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function paqDe(id){return (api().paqs?api().paqs():(cur.paqs||[])).find(function(p){return p.id===id})}

/* de qué pregunta depende cada partida de una estancia */
var DEP={bano:{pd7:'ducha',pd8:'ducha',tec:'techo',tecq:'techo',mba:'mueble',vent:'ventana',pue:'puerta',pub:'puerta'},
 cocina:{luc:'paredes',sol:'suelo',mco:'muebles',pue:'puerta',pub:'puerta',cor:'puerta',tec:'techo',tecq:'techo'},
 hab:{lija:'paredes',pip:'paredes',pit:'paredes',sue:'suelo',rod:'suelo',flo:'suelo',ron:'suelo',pue:'puerta',pub:'puerta',mar:'armario'},
 piso:{ins:'luz',ele:'luz',bol:'luz',cal:'calef',lija:'paredes',pip:'paredes',pit:'paredes',sue:'suelo',rod:'suelo',flo:'suelo',ron:'suelo',pue:'puertas',pub:'puertas'}};
function depDe(pk,l,id){var d=String(l.d||'');
 if(pk.tipo==='bano'&&!id&&/ba[ñn]era/i.test(d))return 'ducha';
 if(pk.tipo==='cocina'&&id==='alc')return /en el suelo/.test(d)?'suelo':'paredes';
 if(pk.tipo==='cocina'&&id==='pip')return 'paredes';
 return (DEP[pk.tipo]||{})[id]||''}
/* partidas que van por metros de la estancia */
function usaMetros(l){return /^(m2|ml|m²)$/.test(String(l.u||''))}

/* palabras que tienen que haberse dicho para que una partida suelta no sea un supuesto */
var EVID={pip:/pint|pared/,pit:/techo|pint\w*\s+(?:todo|tod[ao]s?|la casa|el piso|entero|entera)\b|pintura/,pip3:/pint|pared/,pit3:/techo/,
 lija:/gotele|lij|alisar/,qpa:/papel/,ppa:/papel/,pic:/picar|yeso/,yes:/yeso|enluc|tendido/,
 flo:/flotante|tarima|laminad|parquet|vinilo|suelo/,sue:/suelo|parquet|tarima|moqueta|flotante|laminad|madera/,niv:/nivel|recrecid|solera/,acu:/acuchill|barniz/,
 ron:/rodapie/,rod:/rodapie/,pub:/puerta/,pue:/puerta/,pen:/entrada|blindad|acorazad/,cor:/corredera/,pre:/premarco/,
 ele:/electric|luz|cablead|enchufe/,bol:/boletin|electric|luz/,cal:/calefacc|radiador|caldera/,rad:/radiador/,
 limf:/limpieza/,mon:/ascensor|montacargas/,tec:/falso techo|pladur|escayola/,tecq:/falso techo|pladur|escayola/,
 mam:/mampara/,qma:/mampara/,pd7:/plato|ducha/,pd8:/plato|ducha/,mba:/mueble|lavabo/,mco:/mueble/,mar:/armario/};

/* al dictar: las partidas sueltas nuevas se miran contra lo dicho */
function marcarSupuestos(txt){var t=normT(txt);(cur.lineas||[]).forEach(function(l){if(l.__ev)return;l.__ev=1;if(l.paqId||l.fb)return;var id=idL(l),re=EVID[id];if(re&&!re.test(t))l.sup=1})}

/* partidas parecidas que el dictado no elige en silencio: la pregunta y sus respuestas (cada una, la partida de la tarifa que queda) */
var ELIGE={material:{m:'¿El azulejo lo pone el cliente o lo ponemos nosotros?',ops:[['alc','Lo ponemos nosotros'],['alsm','Lo pone el cliente']]},
 plato:{m:'¿De qué medida es el plato de ducha?',ops:[['pd7','70x110'],['pd8','80x80']]}};
/* lo que falta de cada partida (null si nada) */
function pendDe(l){if(l.ok)return null;var id=idL(l);
 if(!(num(l.p)>0))return {t:'precio',m:'No tiene precio: escríbelo.'};
 if(l.paqId){var pk=paqDe(l.paqId);if(pk){var A=api(),P=A.PAQ&&A.PAQ[pk.tipo];
   if(pk.padre){var pd=paqDe(pk.padre);var kk=pk.tipo==='bano'?'banos':pk.tipo==='cocina'?'cocina':'';if(pd&&kk&&!(pd.hechas&&pd.hechas[kk])&&!pd.okTodo)return {t:'pregunta',pk:pd.id,k:kk}}
   if(pk.blando&&!pk.okEntero)return {t:'entero',pk:pk.id};
   if(usaMetros(l)&&!(pk.suelo>0))return {t:'medidaPaq',pk:pk.id,m:'Faltan los metros '+delPaq(pk)+'.'};
   if(usaMetros(l)&&pk.calculado&&!pk.okMed)return {t:'medidaCalc',pk:pk.id,v:pk.suelo};
   var k=depDe(pk,l,id);if(k&&!(pk.hechas&&pk.hechas[k])&&!pk.okTodo&&P)return {t:'pregunta',pk:pk.id,k:k}
   if(l.calc&&!l.okQ&&num(l.q)>1)return {t:'calc',m:'Estos '+(l.u==='ml'?'metros lineales':'metros')+' ('+String(num(l.q)).replace('.',',')+') los he calculado yo'+(l.calcDe?' ('+l.calcDe+')':' con los del suelo')+': ¿valen?'}}
  return null}
 if(l.adiv&&!l.ok)return {t:'adiv',m:'Has dicho «'+(l.adivTxt||'')+'»: no lo tengo con esas palabras en la tarifa. ¿Es esta partida?'};
 if(usaMetros(l)&&!(num(l.q)>1)&&!l.okQ)return {t:'medida',m:'No has dicho cuántos '+(l.u==='ml'?'metros lineales':'metros')+' son: escríbelos.'};
 if(usaMetros(l)&&l.calc&&!l.okQ&&num(l.q)>1)return {t:'calc',m:'Estos '+(l.u==='ml'?'metros lineales':'metros')+' ('+String(num(l.q)).replace('.',',')+') los he calculado yo con los del suelo: ¿valen?'};
 /* dos partidas de la tarifa para lo mismo y el dictado no dijo cuál: se pregunta (después de los metros, que se vacían si no se dijeron) */
 if(l.elige&&ELIGE[l.elige]&&!l.okElige)return {t:l.elige,m:ELIGE[l.elige].m};
 if(l.cuantas&&!l.okQ)return {t:'cuantas',m:'No has dicho cuántas son ('+num(l.q)+'): ¿es '+(num(l.q)===1?'una sola':'esa cantidad')+'?'};
 if(l.sup)return {t:'supuesto',m:'Esto no lo has dicho: ¿lo incluyo?'};
 return null}
/* unos metros que no se han dicho no valen 1: se quedan a cero (no suman) hasta que se escriban */
function sinMetrosInventados(){(cur.lineas||[]).forEach(function(l){if(l.ok||l.okQ||!usaMetros(l)||num(l.q)!==1)return;var pk=l.paqId&&paqDe(l.paqId);if(l.paqId&&!(pk&&!(pk.suelo>0)))return;l.q=0;l.qPend=1})}
function pendientes(){sinMetrosInventados();var L=[];(cur.lineas||[]).forEach(function(l,i){var p=pendDe(l);if(p){p.i=i;L.push(p)}});
 /* reforma integral: lo que no se ha dicho ni contestado no entra; queda como pregunta (sin partida) */
 (api().paqs?api().paqs():(cur.paqs||[])).forEach(function(pk){if(pk.tipo!=='piso'||pk.okTodo)return;var P=api().PAQ&&api().PAQ.piso;(P&&P.preg||[]).forEach(function(q){if(!(pk.hechas&&pk.hechas[q.k]))L.push({t:'pregunta',pk:pk.id,k:q.k,i:-1})})});
 return L}
window.pendientes=pendientes;

/* una sola cosa por resolver aunque afecte a varias partidas (la misma pregunta de la misma estancia) */
function cosas(){var vis={},C=[];pendientes().forEach(function(p){var k=p.t==='pregunta'?'q|'+p.pk+'|'+p.k:p.t==='entero'?'e|'+p.pk:(p.t==='medidaPaq'||p.t==='medidaCalc')?'m|'+p.pk:'l|'+p.i;if(vis[k])return;vis[k]=1;C.push(p)});return C}
window.pendientesCosas=cosas;

function nomPaq(pk){var n=pk.nom||({bano:'baño',cocina:'cocina',hab:'habitación',piso:'piso'})[pk.tipo]||'estancia';n=String(n).replace(/^(el|la|los|las)\s+/,'');var fem=/^(cocina|habitaci|sala|terraza|galer|entrada|buhardilla|otra)/.test(n);return (fem?'la ':'el ')+n+(pk.n>1?' '+pk.n:'')}
function delPaq(pk){var n=nomPaq(pk);return n.replace(/^el /,'del ').replace(/^la /,'de la ')}
function preg(pk,k){var P=api().PAQ&&api().PAQ[pk.tipo];return P?(P.preg||[]).find(function(q){return q.k===k}):null}

/* el aviso de cada partida pendiente */
function chip(p){var b='class="mini" style="padding:4px 10px;margin:4px 6px 0 0;font-size:14px"',h='';
 if(p.t==='pregunta'){var pk=paqDe(p.pk),q=pk&&preg(pk,p.k);if(!q)return '';h='<b>Falta saber, '+esc(delPaq(pk))+':</b> '+esc(q.t)+'<br>';
  if(q.ops)h+=q.ops.map(function(o){return '<button '+b+' onclick="pendResp(\''+pk.id+'\',\''+p.k+'\','+esc(JSON.stringify(o[0]))+')">'+esc(o[1])+'</button>'}).join('');
  else h+='<input id="pn_'+pk.id+'_'+p.k+'" inputmode="numeric" style="width:70px;font-size:16px" value="'+esc(pk.r[p.k])+'"> <button '+b+' onclick="pendNum(\''+pk.id+'\',\''+p.k+'\')">Vale</button>';
  if(pk.tipo!=='piso')h+='<button '+b.replace('class="mini"','class="mini sec"')+' onclick="pendTodo(\''+pk.id+'\')">Todo lo '+esc(delPaq(pk))+' está bien</button>'}
 else if(p.t==='entero'){var pk3=paqDe(p.pk);h='<b>Has nombrado '+esc(nomPaq(pk3))+', pero no has dicho que se reforme entero.</b> ¿Lo reformo entero?<br><button '+b+' onclick="pendEntero(\''+p.pk+'\',1)">Sí, entero</button><button '+b.replace('class="mini"','class="mini sec"')+' onclick="pendEntero(\''+p.pk+'\',0)">No, quítalo</button>'}
 else if(p.t==='medidaPaq'){h='<b>'+esc(p.m)+'</b> <input id="pmx_'+p.pk+'" inputmode="decimal" placeholder="m² o 3x2" style="width:90px;font-size:16px"> <button '+b+' onclick="pendMed(\''+p.pk+'\')">Vale</button>'}
 else if(p.t==='medidaCalc'){var pk2=paqDe(p.pk);h='<b>Los metros '+esc(delPaq(pk2))+' los he calculado yo ('+String(p.v).replace('.',',')+' m²).</b> <input id="pmx_'+p.pk+'" inputmode="decimal" placeholder="m² de verdad" style="width:90px;font-size:16px"> <button '+b+' onclick="pendMed(\''+p.pk+'\')">Poner</button><button '+b+' onclick="pendMedOk(\''+p.pk+'\')">Son esos</button>'}
 else if(p.t==='medida'){h='<b>'+esc(p.m)+'</b>'}
 else if(p.t==='precio'){h='<b>'+esc(p.m)+'</b>'}
 else if(p.t==='cuantas'){h='<b>'+esc(p.m)+'</b> Si no, escribe cuántas en la cantidad.<br><button '+b+' onclick="pendQok('+p.i+')">Sí, es así</button>'}
 else if(p.t==='calc'){h='<b>'+esc(p.m)+'</b> Si no, escríbelos en la cantidad.<br><button '+b+' onclick="pendQok('+p.i+')">Sí, valen</button>'}
 else if(ELIGE[p.t]){h='<b>'+esc(p.m)+'</b><br>'+ELIGE[p.t].ops.map(function(o){return '<button '+b+' onclick="pendElige('+p.i+',\''+o[0]+'\')">'+esc(o[1])+'</button>'}).join('')}
 else if(p.t==='adiv'){h='<b>'+esc(p.m)+'</b><br><button '+b+' onclick="pendOk('+p.i+')">Sí, es esta</button><button '+b.replace('class="mini"','class="mini sec"')+' onclick="delLinea('+p.i+')">No, quítala</button>'}
 else if(p.t==='supuesto'){h='<b>'+esc(p.m)+'</b><br><button '+b+' onclick="pendOk('+p.i+')">Sí, inclúyelo</button><button '+b.replace('class="mini"','class="mini sec"')+' onclick="delLinea('+p.i+')">Quítalo</button>'}
 return '<div class="pendChip" style="background:#FFF4D6;border-left:4px solid #C98A00;border-radius:6px;padding:6px 8px;margin-top:4px;font-size:14px;line-height:1.35">'+h+'</div>'}

function pintar(){var tb=document.getElementById('tb');if(!tb)return;var rows=tb.querySelectorAll('tr'),P=pendientes(),porI={};P.forEach(function(p){porI[p.i]=p});
 var mostradas={},cambiado=false;
 [].forEach.call(rows,function(r,i){var old=r.querySelector('.pendChip');if(old)old.remove();var p=porI[i];r.classList.toggle('pendiente',!!p);if(!p)return;
  var k=p.t==='pregunta'?'q|'+p.pk+'|'+p.k:p.t==='entero'?'e|'+p.pk:(p.t==='medidaPaq'||p.t==='medidaCalc')?'m|'+p.pk:'l|'+i;var td=r.querySelector('td');if(!td)return;
  if(mostradas[k]){td.insertAdjacentHTML('beforeend','<div class="pendChip" style="color:#8A5A00;font-size:13px;margin-top:2px">Pendiente (lo de arriba)</div>');return}
  mostradas[k]=1;td.insertAdjacentHTML('beforeend',chip(p))});
 [].forEach.call(rows,function(r,i){var l=cur.lineas[i],qi=r.querySelector('.lq');if(!l||!qi)return;var p=porI[i];if(p&&(p.t==='medida'||p.t==='medidaPaq')&&!(num(l.q)>0)){qi.value='';qi.placeholder='¿?';qi.style.borderColor='#C98A00';var im=r.querySelector('.imp');if(im)im.textContent='—';cambiado=true}});
 if(cambiado&&calc0)try{calc0()}catch(_){}
 var C=cosas(),ban=document.getElementById('pendBanner'),tabla=tb.closest('table');
 if(!C.length){if(ban)ban.remove();return}
 var h='<b>Faltan '+C.length+(C.length===1?' cosa':' cosas')+' por confirmar.</b> Mientras tanto se guarda como borrador; el PDF y el envío a firmar esperan. <button class="mini" style="margin-left:6px" onclick="pendSiguiente()">Ir a la siguiente</button>';
 if(!ban&&tabla){tabla.insertAdjacentHTML('beforebegin','<div id="pendBanner" style="background:#FFF4D6;border:1px solid #C98A00;border-radius:8px;padding:10px;margin:8px 0;font-size:15px"></div>');ban=document.getElementById('pendBanner')}
 var sueltas=C.filter(function(p){return p.i<0});if(sueltas.length)h+=sueltas.map(chip).join('');
 if(ban)ban.innerHTML=h}
window.pintarPendientes=pintar;

window.pendSiguiente=function(){var tr=document.querySelector('#tb tr.pendiente');if(!tr)return;tr.scrollIntoView({behavior:'smooth',block:'center'});tr.style.outline='3px solid #C98A00';setTimeout(function(){tr.style.outline=''},1600);var i=tr.querySelector('.pendChip input,.pendChip button');if(i&&i.tagName==='INPUT')setTimeout(function(){i.focus()},300)};
function despues(){try{leer()}catch(_){}renderLineas();try{autoGuardar()}catch(_){}try{api().pintarTarjeta&&api().pintarTarjeta()}catch(_){}}
window.pendResp=function(id,k,v){if(window.paqResp)paqResp(id,k,v);else{var pk=paqDe(id);pk.r[k]=v;pk.hechas[k]=1;api().rehacer(pk);despues()}};
window.pendNum=function(id,k){var i=document.getElementById('pn_'+id+'_'+k),v=parseInt(String(i&&i.value||'').replace(/\D/g,''),10);if(!(v>=0)){if(i)i.focus();return}pendResp(id,k,v)};
window.pendTodo=function(id){try{leer()}catch(_){}var pk=paqDe(id);if(!pk)return;pk.okTodo=1;pk.hechas=pk.hechas||{};var P=api().PAQ[pk.tipo];(P.preg||[]).forEach(function(q){pk.hechas[q.k]=1});if(pk.calculado)pk.okMed=1;renderLineas();try{autoGuardar()}catch(_){}};
window.pendMed=function(id){var i=document.getElementById('pmx_'+id),pk=paqDe(id);if(!pk||!i)return;var v=normT(i.value||'');var m=api().medidaTrozo(/\d\s*(x|por)\s*\d/.test(v)?v:v+' metros');if(!(m.suelo>0)){i.style.borderColor='#B3261E';i.focus();return}try{leer()}catch(_){}pk.suelo=m.suelo;pk.perim=m.perim;if(m.alto)pk.alto=m.alto;delete pk.calculado;api().rehacer(pk,true);if(pk.padre){var pd=paqDe(pk.padre);if(pd)api().rehacer(pd,true)}despues()};
window.pendEntero=function(id,si){try{leer()}catch(_){}var pk=paqDe(id);if(!pk)return;if(si){pk.okEntero=1;delete pk.blando}else{cur.lineas=cur.lineas.filter(function(l){return l.paqId!==id});cur.paqs=(cur.paqs||[]).filter(function(x){return x!==pk})}renderLineas();try{autoGuardar()}catch(_){}try{api().pintarTarjeta()}catch(_){}};
window.pendMedOk=function(id){try{leer()}catch(_){}var pk=paqDe(id);if(pk)pk.okMed=1;renderLineas();try{autoGuardar()}catch(_){}};
window.pendQok=function(i){try{leer()}catch(_){}var l=cur.lineas[i];if(l){l.okQ=1;delete l.calc}renderLineas();try{autoGuardar()}catch(_){}};
/* la respuesta cambia solo esa partida (alc ↔ alsm, pd7 ↔ pd8): misma cantidad y misma estancia */
window.pendElige=function(i,id){try{leer()}catch(_){}var l=cur.lineas[i],t=(window.tarifa?tarifa():[]).find(function(x){return x.id===id});if(l&&t){var k=String(l.d||'').indexOf(' — ');l.d=t.d+(k>-1?l.d.slice(k):'');l.p=t.p;l.u=t.u;if(l.tid)l.tid=id;l.okElige=1;delete l.elige}renderLineas();try{autoGuardar()}catch(_){}};
window.pendOk=function(i){try{leer()}catch(_){}var l=cur.lineas[i];if(l){l.ok=1;delete l.sup;delete l.adiv}renderLineas();try{autoGuardar()}catch(_){}};

/* lo que escribe a mano el usuario resuelve: unos metros > 1 o un precio */
var leer0=window.leer;window.leer=function(){var antes=(cur.lineas||[]).map(function(l){return {q:num(l.q),p:num(l.p)}});var r=leer0.apply(this,arguments);(cur.lineas||[]).forEach(function(l,i){var a=antes[i];if(!a)return;if(num(l.q)!==a.q&&(usaMetros(l)||l.cuantas)&&!l.paqId)l.okQ=num(l.q)>0;if(num(l.q)!==a.q&&l.paqId&&num(l.q)>0){l.qMano=1;l.okQ=1}if(num(l.p)!==a.p&&num(l.p)>0)l.okP=1});return r};

var render0=window.renderLineas;window.renderLineas=function(){var r=render0.apply(this,arguments);try{pintar()}catch(e){}return r};
calc0=window.calc;if(calc0)window.calc=function(){var r=calc0.apply(this,arguments);clearTimeout(window.__tPend);window.__tPend=setTimeout(function(){try{leer();pintar()}catch(_){}},700);return r};

/* las partidas que añade el usuario a mano no son supuestos */
var add0=window.addLinea;if(add0)window.addLinea=function(){var r=add0.apply(this,arguments);var l=cur.lineas[cur.lineas.length-1];if(l){l.__ev=1;l.ok=l.ok||(num(l.p)>0?1:0)}try{pintar()}catch(_){}return r};

var conv0=window.convertir;window.convertir=function(){(cur.lineas||[]).forEach(function(l){l.__ev=1});var txt=(document.getElementById('dictado')||{}).value||'';var r=conv0.apply(this,arguments);try{marcarSupuestos(txt)}catch(e){}try{pintar()}catch(e){}return r};

/* sin confirmar no sale el presupuesto definitivo */
function frena(que){try{leer()}catch(_){}var C=cosas();if(!C.length)return false;try{renderLineas()}catch(_){}
 alert('Antes de '+que+' faltan '+C.length+(C.length===1?' cosa':' cosas')+' por confirmar (en amarillo). El borrador queda guardado.');try{guardarBorrador()}catch(_){}setTimeout(pendSiguiente,200);return true}
function guardarBorrador(){cur.borrador=1;try{autoGuardar()}catch(_){}}
var imp0=window.imprimir;window.imprimir=function(m){if(m!=='precios'&&frena('sacar el PDF'))return;return imp0.apply(this,arguments)};
var man0=window.mandarFirma;window.mandarFirma=function(){if(frena('mandarlo a firmar'))return;return man0.apply(this,arguments)};
window.__frenaPendientes=frena;
})();
