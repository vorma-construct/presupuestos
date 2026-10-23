/* PORTERO: lo último que mira la app antes de que un presupuesto salga al cliente (mandar el enlace o sacar el PDF).
   Es aparte del que entiende el dictado: no le importa cómo se entendió la frase, solo mira el resultado.
   Para tres cosas que no pueden salir sin que alguien las mire:
   1) una línea que no es de la tarifa y que copia lo dictado («Quiere hacer una obra de una casa con…»)
   2) una línea que no es de la tarifa y que se lleva un trozo enorme del presupuesto
   3) las mismas medidas puestas en tres o más estancias (puestas a ojo, no medidas)
   Y no deja sacar nada con una versión vieja de la app: primero se actualiza.
   Cada aviso se resuelve con un toque: «Quitar» o «Está bien así». */
(function(){

function nrm(x){try{return norm(String(x||''))}catch(_){return String(x||'').toLowerCase()}}
function base(d){var s=String(d||''),k=s.indexOf(' — ');return k>-1?s.slice(0,k):s}
function lugar(d){var s=String(d||''),k=s.indexOf(' — ');return k>-1?s.slice(k+3).split(',')[0].trim():''}
function imp(l){return Math.round(num(l.q)*num(l.p)*100)/100}

function deTarifa(l){var b=nrm(base(l.d)).replace(/\s+/g,' ').trim();if(!b)return false;var T=[];try{T=tarifa()}catch(_){}
 return T.some(function(t){var d=nrm(t.d).replace(/\s+/g,' ').trim();if(!d)return false;var n=Math.min(40,d.length,b.length);return n>=12&&d.slice(0,n)===b.slice(0,n)})}

var DICHO=/^(quiere|quieren|queremos|quiero|vamos a|hay que|habria que|el cliente|la clienta|los clientes|me ha dicho|me dice|dice que|tiene una|tiene un|es una casa|es un piso|seria|tenemos que|necesita)\b/;

function problemas(c){var P=[];if(!c||!c.lineas)return P;var L=c.lineas.filter(function(l){return !l.imp});
 var tot=L.reduce(function(a,l){return a+imp(l)},0);
 var dict=nrm((document.getElementById('dictado')||{}).value||c.dictado||'').replace(/\s+/g,' ');
 L.forEach(function(l){if(l.okPortero||!(imp(l)>0)||deTarifa(l))return;var b=nrm(base(l.d)).replace(/\s+/g,' ').trim();
  var copia=DICHO.test(b)||(b.length>=18&&tot>0&&imp(l)/tot>0.15&&dict.indexOf(b.slice(0,Math.min(b.length,40)))>-1);
  var grande=tot>0&&imp(l)>=1000&&imp(l)/tot>0.3;
  if(copia)P.push({tipo:'copia',lineas:[l],txt:'«'+base(l.d).slice(0,60)+'» no es un trabajo de tu tarifa: parece un trozo de lo que dictaste, y cobra '+eur(imp(l))+'.'});
  else if(grande)P.push({tipo:'grande',lineas:[l],txt:'«'+base(l.d).slice(0,60)+'» no es de tu tarifa y es '+Math.round(imp(l)/tot*100)+' % de todo el presupuesto ('+eur(imp(l))+').'})});
 /* las mismas medidas en 3 o más estancias */
 var g={};/* las de un baño, cocina o piso ya pasan por sus preguntas de medidas («Son esos»): aquí solo las sueltas */
 L.forEach(function(l){if(l.okPortero||l.paqId||l.u!=='m2'||!(num(l.q)>0))return;var lu=lugar(l.d);if(!lu)return;var k=nrm(base(l.d)).slice(0,50)+'|'+num(l.q);(g[k]=g[k]||[]).push(l)});
 var vistos={};Object.keys(g).forEach(function(k){var ls=g[k],lus={};ls.forEach(function(l){lus[lugar(l.d)]=1});var n=Object.keys(lus);if(n.length<3)return;
  var tipos={};n.forEach(function(x){tipos[nrm(x).replace(/\s*\d+$/,'').replace(/^(otro|otra|segundo|segunda|tercer|tercero|tercera|el|la)\s+/,'').replace(/\s+(de arriba|de abajo|grande|pequeno|pequena|principal)$/,'').trim()]=1});if(Object.keys(tipos).length<2)return;/* «tres habitaciones de 12 metros» sí son iguales: solo salta si se repite en estancias de distinto tipo */
  var clave=n.sort().join('|');if(vistos[clave])return;vistos[clave]=1;
  /* todas las líneas de esas estancias que tienen esa misma medida u otra repetida igual */
  var todas=L.filter(function(l){return l.u==='m2'&&!l.paqId&&n.indexOf(lugar(l.d))>-1&&!l.okPortero});
  P.push({tipo:'medidas',lineas:todas,txt:String(num(ls[0].q)).replace('.',',')+' m² iguales en '+n.length+' sitios ('+n.slice(0,5).join(', ')+'). Parecen puestas a ojo: pon las medidas de verdad o confirma que son esas.'})});
 /* OBRA DE CASA ENTERA: lo que toda casa lleva (y si el total por metro es de risa). Con la tarifa del albañil una casa entera completa sale sobre 300 €/m²; por debajo de 250 falta algo seguro */
 try{var pz=(c.paqs||[]).find(function(p){return p.tipo==='piso'&&num(p.suelo)>0});
  /* con preguntas de la casa sin contestar todavía no: al contestarlas se completa sola */
  var sinC=pz&&['banos','cocina','luz','paredes','suelo','puertas'].some(function(k){return !(pz.hechas||{})[k]});
  if(pz&&!sinC&&!c.okTotal){var r=pz.r||{},hh=pz.hechas||{},m2=num(pz.suelo),ids=L.map(function(l){var t='';try{t=(l.tid||'')}catch(_){}return t+' '+nrm(l.d)});
   var hay=function(re){return ids.some(function(x){return re.test(x)})},falta=[];
   if(!(hh.luz&&r.luz===false)&&!hay(/^ele\b|instalacion electrica nueva/))falta.push('la electricidad');
   if(!(hh.suelo&&r.suelo==='no')&&!hay(/^(flo|sue|tar|par|vin)\b|suelo flotante|tarima|laminado/))falta.push('los suelos');
   if(!(hh.puertas&&!(num(r.puertas)>0))&&!hay(/^pub\b|puertas? batiente|puerta de paso/))falta.push('las puertas');
   if(!(hh.paredes&&r.paredes==='no')&&!hay(/^pip\b|paramentos verticales \(paredes\)/))falta.push('la pintura de las paredes');
   var eurM2=m2>0?Math.round(tot/m2):0;/* ojo: no llamarla «eur», que taparía la función eur() en todo problemas() */
   var entera=r.cocina!==false&&num(r.banos)>0;/* sin cocina o sin baño es normal que salga barata: ahí solo se mira lo que falta */
   if(falta.length||(entera&&eurM2>0&&eurM2<250))P.push({tipo:'total',lineas:[],txt:'Es una obra de casa entera de '+String(m2).replace('.',',')+' m² y sale a '+eurM2+' €/m²'+(falta.length?'. Falta '+falta.join(', ').replace(/, ([^,]*)$/,' y $1')+'.':', muy poco para una casa entera: mira qué falta.')});
   else if(eurM2>1200)P.push({tipo:'total',lineas:[],txt:'Es una obra de casa entera de '+String(m2).replace('.',',')+' m² y sale a '+eurM2+' €/m²: mucho para una reforma. Mira si hay algo repetido.'})}}catch(_){}
 return P}
window.porteroProblemas=problemas;

function vNum(v){var m=String(v||'').match(/(\d+)/);return m?+m[1]:0}

/* ventana con cada problema y sus dos botones */
function mostrar(P,seguir){var vie=document.getElementById('porteroBox');if(vie)vie.remove();
 var d=document.createElement('div');d.id='porteroBox';d.style.cssText='position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center';
 var h='<div style="background:#fff;max-width:560px;width:100%;max-height:85vh;overflow:auto;border-radius:16px 16px 0 0;padding:16px 16px 20px;font-size:15px;color:#222">'
  +'<div style="font-weight:700;font-size:17px;margin-bottom:4px">Antes de que salga, mira esto</div>'
  +'<div style="color:#555;font-size:13px;margin-bottom:10px">El cliente todavía no lo ha visto.</div>';
 P.forEach(function(p,i){h+='<div style="border-left:5px solid #B3261E;background:#FBE3E0;border-radius:8px;padding:10px 12px;margin:8px 0">'+p.txt
  +'<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">'
  +(p.tipo==='total'?'<button type="button" data-i="'+i+'" data-a="ver" class="mini">Mirar el presupuesto</button>':p.tipo==='medidas'?'<button type="button" data-i="'+i+'" data-a="ver" class="mini">Poner medidas</button>':'<button type="button" data-i="'+i+'" data-a="quitar" class="mini">Quitar la línea</button>')
  +'<button type="button" data-i="'+i+'" data-a="ok" class="mini sec">Está bien así</button></div></div>'});
 h+='</div>';d.innerHTML=h;document.body.appendChild(d);
 d.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('button');if(!b){if(ev.target===d)d.remove();return}try{leer()}catch(_){}P=problemas(cur);/* leer() rehace las líneas: se buscan otra vez */var p=P[+b.getAttribute('data-i')],a=b.getAttribute('data-a');if(!p){d.remove();if(seguir)seguir();return}
  if(a==='quitar'){cur.lineas=cur.lineas.filter(function(l){return p.lineas.indexOf(l)<0})}
  else if(a==='ok'){p.lineas.forEach(function(l){l.okPortero=1});if(p.tipo==='total')cur.okTotal=1}
  else if(a==='ver'){d.remove();try{renderLineas()}catch(_){}var e=document.getElementById('revBox')||document.getElementById('lineas');if(e)e.scrollIntoView({behavior:'smooth',block:'center'});return}
  try{renderLineas()}catch(_){}try{autoGuardar()}catch(_){}
  var R=problemas(cur);if(R.length){P=R;mostrar(R,seguir)}else{d.remove();if(seguir)seguir()}})}

/* versión: con una vieja no sale nada; se guarda y se actualiza */
function versionOk(){return fetch('version.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){
  if(j&&j.min&&vNum(APP_VERSION)<vNum(j.min)){var ya='';try{ya=sessionStorage.getItem('porteroIr')||''}catch(_){}if(ya===j.v)return true;try{sessionStorage.setItem('porteroIr',j.v)}catch(_){}try{leer();autoGuardar()}catch(_){}
   setTimeout(function(){try{var n=String(cur&&cur.num||'');if(n)sessionStorage.setItem('vr_reabrir',n)}catch(_){}var q=new URLSearchParams(location.search);q.set('v',j.v);location.replace(location.pathname+'?'+q.toString()+location.hash)},900);
   alert('Hay una versión nueva de la app. Se actualiza ahora (tu presupuesto queda guardado) y luego lo mandas.');return false}
  return true}).catch(function(){return true})}

function portero(fn,nombre){return function(){var self=this,args=arguments;
  if(nombre==='imprimir'&&args[0]==='precios')return fn.apply(self,args);
  try{leer()}catch(_){}
  var P=problemas(cur);if(P.length){mostrar(P,function(){window[nombre].apply(self,args)});return}
  return fn.apply(self,args)}}

/* se engancha cuando ya están cargados mandarFirma e imprimir (vigila.js va antes) */
function enganchar(){if(window.__porteroOn)return;if(typeof window.mandarFirma!=='function'||typeof window.imprimir!=='function')return setTimeout(enganchar,300);
 window.__porteroOn=1;window.mandarFirma=portero(window.mandarFirma,'mandarFirma');window.imprimir=portero(window.imprimir,'imprimir')}
enganchar();

/* al abrir y al volver a la app: si la versión está por debajo de la mínima, se actualiza aunque haya un presupuesto a medias (queda guardado) */
function mirar(){versionOk()}
setTimeout(mirar,4000);document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(mirar,800)});

/* lo mismo en la revisión de siempre (cuadro «Revisar el presupuesto»), en rojo */
var rev0=window.revisar;if(typeof rev0==='function')window.revisar=function(){var r=rev0.apply(this,arguments);try{problemas(cur).forEach(function(p){r.E.push(p.txt)})}catch(_){}return r};
})();
