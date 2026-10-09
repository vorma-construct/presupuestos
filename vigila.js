/* Revisa el presupuesto DOS veces antes de que salga (una vez mandado ya es tarde):
   1) las partidas: quita lo repetido y lo vacio, y no deja salir partidas a cero ni estancias sin medir.
   2) el documento que va a recibir el cliente: que salgan todas las partidas, ninguna de mas,
      la base y el total correctos, el nombre y la direccion. */
(function(){

/* arreglos seguros: no inventa nada, solo quita lo que sobra */
function autoCorregir(c){var cambios=[];if(!c||!c.lineas)return cambios;
 var antes=c.lineas.length;c.lineas=c.lineas.filter(function(l){return (l.d||'').trim()||num(l.p)>0});
 if(c.lineas.length<antes)cambios.push('quitadas '+(antes-c.lineas.length)+' líneas vacías');
 var vistos={},fuera=[];c.lineas=c.lineas.filter(function(l){if(l.imp)return true;var k=(l.code||'')+'|'+norm(l.d||'').replace(/\s+/g,' ').trim()+'|'+l.u+'|'+num(l.q)+'|'+num(l.p);if(vistos[k]){fuera.push(l.d);return false}vistos[k]=1;return true});
 fuera.forEach(function(d){cambios.push('quitada una partida repetida: «'+d.slice(0,60)+'»')});
 c.lineas.forEach(function(l){var q=Math.round(num(l.q)*100)/100;if(q!==num(l.q)&&num(l.q)>0)l.q=q});
 return cambios}
window.autoCorregir=autoCorregir;

/* lo que no puede salir: se suma a la revision de siempre */
var revisar0=window.revisar;
window.revisar=function(mostrar,calla){var r=revisar0.apply(this,arguments);try{
 var sin=(cur.paqs||[]).filter(function(pk){return !(pk.suelo>0)&&cur.lineas.some(function(l){return l.paqId===pk.id&&l.u==='m2'})});
 sin.forEach(function(pk){var nom={bano:'del baño',cocina:'de la cocina',hab:'de la habitación',piso:'del piso'}[pk.tipo]||'de una estancia';r.E.push('Faltan los metros '+nom+(pk.n>1?' '+pk.n:'')+': sus partidas van con cantidad 1. Ponlos arriba, en «Para afinar el precio».')});
 if(sin.length&&!calla){var box=document.getElementById('revBox');if(box)box.insertAdjacentHTML('afterbegin','<div class="aviso" style="border-color:#b3261e;background:#fbe3e0">'+sin.length+' estancia(s) sin medir. ✕ '+r.E.slice(-sin.length).join('<br>✕ ')+'</div>')}
 if(cur.dir&&(cur.dir.length>80||/\b(haremos|haremos|vamos a|queremos|autoconstruccion|presupuesto|solicitamos)\b/.test(norm(cur.dir)))){r.A.push('La dirección de la obra parece una frase, no una dirección: «'+cur.dir.slice(0,60)+'».')}
}catch(e){}return r};

/* segunda revision: el documento tal como lo va a ver el cliente */
function baseDe(c){return Math.round((c.lineas||[]).filter(function(l){return !l.imp}).reduce(function(a,l){return a+Math.round(num(l.q)*num(l.p)*100)/100},0)*100)/100}
function revisarDocumento(){var P=[];try{pintarDocs();var el=document.getElementById('sh_presu');var txt=(el.innerText||el.textContent||'').replace(/\s+/g,' ');
 var sin=function(x){return x.replace(/\./g,'')};var T=sin(txt);
 var cuenta={};(cur.lineas||[]).forEach(function(l){var d=(l.d||'').replace(/\s+/g,' ').slice(0,28);if(!d)return;cuenta[d]=(cuenta[d]||0)+1});
 Object.keys(cuenta).forEach(function(d){var veces=txt.split(d).length-1;if(veces<cuenta[d])P.push('la partida «'+d+'…» no sale en el documento');else if(veces>cuenta[d])P.push('la partida «'+d+'…» sale más veces de las que tiene el presupuesto')});
 var base=baseDe(cur),iva=num((document.getElementById('f_iva')||{}).value||cur.iva||21);var tot=Math.round((base+Math.round(base*iva)/100)*100)/100;
 if(base>0&&T.indexOf(sin(eur(base)))<0)P.push('la base del documento no es '+eur(base));
 if(base>0&&T.indexOf(sin(eur(tot)))<0)P.push('el total del documento no es '+eur(tot));
 if(cur.nom&&txt.indexOf(cur.nom.trim().slice(0,20))<0)P.push('no sale el nombre del cliente');
 if(cur.dir&&txt.indexOf(cur.dir.trim().slice(0,20))<0)P.push('no sale la dirección de la obra');
}catch(e){P.push('no he podido leer el documento')}return P}
window.revisarDocumento=revisarDocumento;

/* antes de mandar, dos veces: 1) las partidas  2) el documento que va a recibir el cliente */
var mandar0=window.mandarFirma;
window.mandarFirma=function(){if(window.__vigSilencio)return mandar0.apply(this,arguments);
 leer();var ch=autoCorregir(cur);if(ch.length){renderLineas();leer()}
 var r=revisar(true);
 if(r.E.length){var b=document.getElementById('revBox');if(b)b.scrollIntoView({behavior:'smooth',block:'center'});
  /* avisa, pero decide él: si quiere, lo manda igualmente */
  if(!confirm('Hay '+r.E.length+' cosa(s) marcadas en rojo en «Revisar el presupuesto»:\n\n· '+r.E.slice(0,4).join('\n· ')+(r.E.length>4?'\n…':'')+'\n\n¿Lo mandas igualmente?'))return}
 var P=revisarDocumento();if(P.length){P=revisarDocumento()}/* si falla, se pinta otra vez y se vuelve a mirar */
 /* avisa, pero decide él (como con lo rojo) */
 if(P.length&&!confirm('Al mirar el documento que va a recibir el cliente he visto esto:\n\n· '+P.slice(0,4).join('\n· ')+(P.length>4?'\n…':'')+'\n\n¿Lo mandas igualmente?'))return
 var res=mandar0.apply(this,arguments);
 var t0=Date.now();(function mira(){var m=document.getElementById('msg');if(m&&/Enlace (actualizado|mandado)/.test(m.textContent)&&!m.querySelector('.vig2')){try{if(window.__usoApunta)__usoApunta('mandado')}catch(_){}m.insertAdjacentHTML('beforeend','<div class="vig2" style="margin-top:6px;font-size:13px;color:#1B7A3A"><b>Revisado dos veces antes de salir:</b> las partidas, cantidades y precios, y el documento tal como lo ve el cliente.'+(ch.length?'<br>He corregido: '+ch.join('; ')+'.':'')+'</div>');return}if(Date.now()-t0<30000)setTimeout(mira,500)})();
 return res};

/* aviso que se queda hasta que lo tocas */
function aviso(html,rojo){var d=document.createElement('div');d.className='vigAviso';d.style.cssText='position:fixed;left:10px;right:10px;bottom:14px;z-index:9500;background:'+(rojo?'#FBE3E0':'#E6F3EA')+';border-left:5px solid '+(rojo?'#B3261E':'#1B7A3A')+';padding:12px 14px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.25);font-size:14px;color:#222';d.innerHTML=html+'<div style="text-align:right;margin-top:6px"><button class="mini sec" type="button">Vale</button></div>';d.querySelector('button').onclick=function(){d.remove()};document.body.appendChild(d)}
window.avisoVigila=aviso;

/* sin presupuestos repetidos: mismo cliente y misma obra, sin mandar -> uno solo (el numero mas antiguo, con lo ultimo que se hizo).
   No toca los ya mandados ni las variantes (101-B...). */
var VAC_D={calle:1,c:1,avenida:1,avda:1,plaza:1,barrio:1,piso:1,portal:1,bizkaia:1,vizcaya:1,the:1};
function tokD(d){return norm(d||'').replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(function(w){return w.length>=3&&!VAC_D[w]||/^\d+$/.test(w)})}
function mismaObra(a,b){var x=tokD(a),y=tokD(b);if(!x.length||!y.length)return true;var c=x.filter(function(w){return y.indexOf(w)>=0}).length;return c>=2||c/Math.min(x.length,y.length)>=0.6}
function mandado(p){return !!(p.firmaTok||p.segTok||p.firmado||(p.estado&&p.estado!=='borrador'))}
window.mismaObra=mismaObra;
window.juntarRepes=function(){var map={};try{var P=DB.presus||{};var ks=Object.keys(P).filter(function(k){var p=P[k];return p&&p.nom&&!/-[A-Z]$/.test(k)&&!mandado(p)});
 var hecho={};ks.forEach(function(k){if(hecho[k])return;var g=ks.filter(function(j){return !hecho[j]&&norm(P[j].nom).trim()===norm(P[k].nom).trim()&&mismaObra(P[j].dir,P[k].dir)});if(g.length<2)return;
  g.forEach(function(j){hecho[j]=1});
  var nuevo=g.slice().sort(function(a,b){return (P[b].ts||0)-(P[a].ts||0)})[0],viejo=g.slice().sort(function(a,b){return num(a)-num(b)})[0];
  if(nuevo!==viejo){try{copiaAntes(viejo,'repe')}catch(_){}var c=JSON.parse(JSON.stringify(P[nuevo]));c.num=viejo;P[viejo]=c}
  g.forEach(function(j){if(j===viejo)return;map[j]=viejo;try{aPapelera(j,'repe')}catch(_){delete P[j];try{borrarNube(j)}catch(_){}}});
  try{subirPresu(viejo)}catch(_){}});
 if(Object.keys(map).length){save();if(cur&&map[cur.num]){try{abrir(map[cur.num])}catch(_){}}try{renderClientes()}catch(_){}}}catch(e){}return map};
setTimeout(juntarRepes,4000);setTimeout(juntarRepes,15000);
/* al hacer los presupuestos de los duenos desde el PDF: si ya existia el de ese cliente, se actualiza ese */
var hacer0=window.hacerPresupuestos;
if(hacer0)window.hacerPresupuestos=function(){var r=hacer0.apply(this,arguments);setTimeout(function(){var m=juntarRepes();var ks=Object.keys(m);if(!ks.length)return;
 ['msg','arqInfo'].forEach(function(id){var e=document.getElementById(id);if(e)ks.forEach(function(k){e.innerHTML=e.innerHTML.split('nº '+k+' ').join('nº '+m[k]+' ')})});
 var e=document.getElementById('arqInfo');if(e)e.insertAdjacentHTML('beforeend',' <b>Ya tenías presupuesto de este cliente para esta obra: lo he actualizado en vez de hacer otro.</b>')},2800);return r};

})();
