/* PRECIO REAL de cualquier partida.
   Toma el mayor de:
     1) el precio del arquitecto (CYPE) subido con el indice de Eustat desde la fecha de su PDF, + 19 % (13 % gastos generales + 6 % beneficio)
     2) el precio de CYPE de hoy para esa misma partida (si lo tenemos leido), + 19 %
     3) el precio de mercado de su familia de trabajo (precios.json), + el recargo de la zona (Euskadi, por defecto 15 %)
   y encima la subida que el albañil ponga en Ajustes. Si la cantidad es tan pequeña que no llega al minimo de una
   visita (maquina, porte), cobra ese minimo. El precio que el albañil ya tenga para esa partida manda siempre (eso lo
   decide quien llama). Funciona en la app y en node (pruebas). */
(function(root){
var GG=1.19;
function nrm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
function clave(s){return nrm(s).replace(/[^a-z0-9 ]/g,'').slice(0,70)}
function r2(x){return Math.round(x*100)/100}
var DEM=/^(?:\S+\s+){0,2}(demolicion|desmontaje|desmontar|levantado|levantar|picado|picar|derribo|derribar|arranque|arrancar|retirada|retirar|desescombro|quitar|tirar|eliminacion|vaciado)\b/;
var VACIA={de:1,del:1,la:1,el:1,los:1,las:1,en:1,y:1,e:1,con:1,por:1,para:1,un:1,una:1,al:1,a:1,o:1,su:1,sus:1,que:1,actual:1,actuales:1,existente:1,existentes:1,incluso:1,incluido:1,tipo:1,segun:1,mediante:1,formado:1,formada:1,general:1,completo:1,completa:1,nuevo:1,nueva:1,suministro:1,colocacion:1,instalacion:1,montaje:1,formacion:1,ejecucion:1,poner:1,colocar:1,instalar:1,hacer:1,realizacion:1};
var SIN=[[/^(demolic|desmontaj|desmontar|levant|picad|picar|derrib|arranq|arranc|retira|desesc|quitar|tirar|elimin|demole|vaciad)/,'#dem'],[/^(porcel|gres|cerami|azulej|baldos|plaque)/,'#cer'],[/^(precer|premar|marco)/,'#marc']];
function raiz(w){w=w.replace(/(es|s)$/,'');for(var i=0;i<SIN.length;i++)if(SIN[i][0].test(w))return SIN[i][1];return w.length<=7?w:w.slice(0,7)}
function raices(t){return nrm(t).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(function(w){return w&&w.length>1&&!VACIA[w]&&!/^\d/.test(w)}).map(raiz)}
/* la familia de trabajo de un titulo de partida, por sus nombres; los trabajos de derribo no se mezclan con los de hacer */
function familiaDe(B,titulo,u){if(/amortizable|provisional|portatil/.test(nrm(titulo)))return null;var t=nrm(titulo).replace(/\s+/g,' '),dem=DEM.test(t),R=raices(titulo),set={};R.forEach(function(r){set[r]=1});var best=null;
 (B.familias||[]).forEach(function(F){var sc=0;if(F.re){try{var mm=new RegExp(F.re).exec(t);if(mm&&mm.index<35)sc=100}catch(e){}}
  (F.claves||[]).forEach(function(c){var cr=raices(c);if(!cr.length)return;var cab=cr.filter(function(r){return r!=='#dem'})[0];if(cab&&R.slice(0,4).indexOf(cab)<0)return;/* la palabra principal de la clave tiene que ir al principio del titulo */
   var m=cr.filter(function(r){return set[r]}),noDem=m.filter(function(r){return r!=='#dem'});
   if(!noDem.length)return;if(cr.length===1&&c.length<7)return;if(m.length<(cr.length>=4?cr.length-1:cr.length))return;
   var v=m.length*10+(t.indexOf(c)>-1?5:0)+m.length/cr.length*5;if(v>sc&&sc<100)sc=v});
  if(!sc)return;var fdem=/^(d_|hueco_)/.test(F.id);if(fdem!==dem)sc=sc*0.2;if(F.u===u)sc+=8;
  if(!best||sc>best.sc)best={F:F,sc:sc}});
 return best&&best.sc>=18?best.F:null}
function precioReal(B,o){/* o: {t, u, q, pa, indice (factor), zona (%), subida (%)} */
 var t=nrm(o.t),u=String(o.u||'').toLowerCase().replace('²','2').replace('³','3').replace(/\.$/,'').replace(/^ml$/,'m').replace(/^uds?$/,'ud').replace(/^u$/,'ud'),c=[];
 var idx=o.indice>0?o.indice:1;
 if(o.pa>0)c.push({p:o.pa*idx*GG,f:'arquitecto'+(idx>1.001?' al día':'')+' + 19 %'});
 var k=clave(o.t);(B.cype||[]).forEach(function(e){if(e.u===u&&k.indexOf(e.clave.slice(0,60))===0)c.push({p:e.precio*GG,f:'CYPE de hoy'+(e.minimo?' (mínimo)':'')+' + 19 %'})});
 var fam=familiaDe(B,o.t,u),revisar=false;
 var zona=(o.zona==null?(B.zona_def||0):Number(o.zona))||0;
 var mio=fam&&o.propios&&o.propios[fam.id]>0;if(mio&&fam.u===u){return {p:r2(o.propios[fam.id]),fuente:'tu precio',fam:fam.id,famU:fam.u,famDesc:fam.desc,sinMercado:false,revisar:false,opciones:[]}}
 else if(fam&&fam.u===u&&fam.tipico>0){var pm=fam.tipico*(1+zona/100);
  /* si el mercado sale 15 veces el del arquitecto, no es la misma cosa (otra medida u otro alcance): no se usa, se avisa */
  if(o.pa>0&&pm>o.pa*idx*(u==='ud'?4:15))revisar=true;else c.push({p:pm,f:'mercado'+(zona?' + '+zona+' % zona':'')})}
 if(!c.length)return null;
 var best=c.reduce(function(a,b){return b.p>a.p?b:a});
 var p=best.p*(1+(Number(o.subida)||0)/100),f=best.f;
 return {p:r2(p),fuente:f,fam:fam?fam.id:null,famU:fam?fam.u:null,famDesc:fam?fam.desc:null,sinMercado:!fam||fam.u!==u||revisar,revisar:revisar,opciones:c.map(function(x){return {p:r2(x.p),f:x.f}})}}
root.familiaDe=familiaDe;
root.precioReal=precioReal;
if(typeof module!=='undefined')module.exports={precioReal:precioReal,familiaDe:familiaDe};

/* ---------- en la app ---------- */
if(typeof window==='undefined')return;
var BASE=null;function base(){if(BASE)return Promise.resolve(BASE);return fetch('precios.json?'+Math.floor(Date.now()/36e5)).then(function(r){return r.json()}).then(function(j){BASE=j;return j}).catch(function(){return null})}
base();window.basePrecios=base;
function ajustes(){var A=window.AJ||{};return {zona:A.recargoZona==null||A.recargoZona===''?null:Number(String(A.recargoZona).replace(',','.')),subida:Number(String(A.subidaPrecios||0).replace(',','.'))||0}}
window.precioRealDe=function(p){if(!BASE)return null;var a=ajustes();return precioReal(BASE,{t:p.corto||p.t,u:p.u,q:p.q,pa:p.pa||0,indice:(window.__subida&&window.__subida.f)||1,zona:a.zona,subida:a.subida,propios:(window.AJ||{}).preciosMercado})};
/* "Poner el precio del arquitecto" ahora pone el PRECIO REAL (el que el albañil ya tenga, se respeta) */
var poner0=window.cypePonerArq;
window.cypePonerArq=function(){if(!BASE){return base().then(function(){window.cypePonerArq()})}
 var n=0,m=0,sinM=[];ARQ.med.forEach(function(p){if(p.on&&!(p.pr>0)&&p.pa>0){var R=precioRealDe(p);if(!R)return;p.pr=R.p;p.real=R.fuente;p.dePa=false;n++;if(R.sinMercado)sinM.push(p.code)}});
 abiertos();renderCype();var ai=document.getElementById('arqInfo');if(ai)ai.textContent=n+' partidas con precio real (el mayor entre el arquitecto al día, CYPE de hoy y el mercado). '+(sinM.length?sinM.length+' no tienen precio de mercado en la base: van con el del arquitecto al día; repásalas.':'')};
/* el texto del boton */
var barra0=window.cypeBarra;
window.cypeBarra=function(){var r=barra0.apply(this,arguments);try{var b=document.getElementById('cyBarra');if(b)b.querySelectorAll('button').forEach(function(x){if(/Poner el precio del arquitecto/.test(x.textContent))x.textContent='Poner precios reales'})}catch(e){}return r};

/* al marcar una partida sin tu precio, coge sola el precio real (si la dejas a 0 a mano, se queda a 0) */
var precio0=window.cypePrecio;
window.cypePrecio=function(i,v){try{ARQ.med[i].aMano0=!(arqLee(v)>0)}catch(e){}return precio0.apply(this,arguments)};
var barra1=window.cypeBarra,auto=false;
window.cypeBarra=function(){var r=barra1.apply(this,arguments);try{
 var q=document.getElementById('btnQuitarPdf');if(q)q.style.display=(ARQ&&ARQ.med&&ARQ.med.length)?'':'none';
 if(!auto&&ARQ&&ARQ.cype&&ARQ.med.some(function(p){return p.on&&!(p.pr>0)&&p.pa>0&&!p.aMano0})){
  if(!BASE){base().then(function(){window.cypeBarra()});return r}
  auto=true;try{var ai=document.getElementById('arqInfo'),t=ai?ai.textContent:'';var y=window.scrollY;
   var ant={};ARQ.med.forEach(function(p,i){if(p.aMano0&&p.on)ant[i]=1});
   ARQ.med.forEach(function(p){if(p.aMano0)p.__off=p.on,p.on=false});
   window.cypePonerArq();
   ARQ.med.forEach(function(p){if(p.aMano0){p.on=p.__off;delete p.__off}});renderCype();
   window.scrollTo(0,y);if(ai)ai.textContent=t}finally{auto=false}}
}catch(e){}return r};
/* quitar el PDF del arquitecto: se borra lo leido y se puede subir otro */
window.quitarPdf=function(){if(!confirm('¿Quitar el PDF del arquitecto? Lo que ya hayas metido en el presupuesto se queda.'))return;
 ARQ={med:[],plano:null,cab:null,dudosas:[]};window.ULT_ARQ=null;
 var ap=document.getElementById('arqPanel');if(ap){ap.innerHTML='';ap.style.display='none'}
 ['arqInfo'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=''});
 ['arqAnt','cyHoy'].forEach(function(id){var e=document.getElementById(id);if(e)e.remove()});
 var pa=document.getElementById('pdfArq');if(pa)pa.value='';var q=document.getElementById('btnQuitarPdf');if(q)q.style.display='none';
 var c=document.getElementById('cardPdf');if(c)c.querySelectorAll('.arqEscrito,#arqEsc').forEach(function(e){e.remove()})};
})(typeof window!=='undefined'?window:globalThis);
/* listas sin precio (estudios, otros albañiles, arquitectos que no son CYPE): lo que no tenga precio tuyo entra con el de mercado */
(function(){if(typeof window==='undefined')return;var r0=window.renderArq;if(!r0)return;
window.renderArq=function(){try{if(BASE_OK()&&!(window.arqEsCype&&arqEsCype())){var T=tarifa(),n=0;(ARQ.med||[]).forEach(function(p){if(p.pr>0||p.sinMercadoVisto)return;
  var ap=window.precioAprendido?precioAprendido(p.t):0;if(ap>0)return;var id=window.casar?casar(p.t):null,t=id&&T.find(function(x){return x.id===id});
  var eq=function(a,b){a=(a||'').replace(/^pa$/,'ud');b=(b||'').replace(/^pa$/,'ud');return a===b||(/^ml?$/.test(a)&&/^ml?$/.test(b))};if(t&&eq(t.u,p.u)&&t.p>0)return;
  var R=precioRealDe({t:p.t,u:p.u,q:p.q,pa:p.pa||0});if(R&&!R.sinMercado){p.pr=R.p;p.real=R.fuente;n++}else p.sinMercadoVisto=true});window.__nMercado=n}}catch(e){}
 var res=r0.apply(this,arguments);
 try{var otra=false;(ARQ.med||[]).forEach(function(p){if(p.real&&!(p.pr>0)){var R=precioRealDe({t:p.t,u:p.u,q:p.q,pa:p.pa||0});if(R&&!R.sinMercado){p.pr=R.p;otra=true}}});if(otra&&!window.__rArq2){window.__rArq2=1;try{res=r0.apply(this,arguments)}finally{window.__rArq2=0}}}catch(e){}
 try{var rows2=document.querySelectorAll('#arqPanel table.lines tbody tr');(ARQ.med||[]).forEach(function(p,i){if(p.real||!(p.pr>0)||!rows2[i]||rows2[i].querySelector('.mbaj'))return;var R=precioRealDe({t:p.t,u:p.u,q:p.q,pa:0});if(R&&!R.sinMercado&&p.pr<R.p*0.5)rows2[i].cells[0].insertAdjacentHTML('beforeend','<div class="mbaj" style="font-size:12px;color:#B3261E"><b>Ojo:</b> el mercado anda por '+eur(R.p)+' ('+(R.famDesc||'')+'). Tu precio de '+eur(p.pr)+' puede ser de otra partida: míralo.</div>')})}catch(e){}
 try{var rows=document.querySelectorAll('#arqPanel table.lines tbody tr');(ARQ.med||[]).forEach(function(p,i){if(p.real&&rows[i]&&!rows[i].querySelector('.mrc'))rows[i].cells[0].insertAdjacentHTML('beforeend','<div class="mrc" style="font-size:12px;color:#1B7A3A">precio de mercado de ahora ('+p.real+'): repásalo</div>')})}catch(e){}
 return res};
function BASE_OK(){return !!window.precioRealDe&&precioRealDe({t:'x',u:'ud',q:1,pa:1})!==null}
})();
/* pantalla «Precios de mercado» en Ajustes: ver la base, buscar y poner tu precio (manda sobre el de mercado) */
(function(){if(typeof window==='undefined')return;
var BASE=null;function pinta(){var pg=document.getElementById('page-ajustes');if(!pg||!BASE)return;var box=document.getElementById('pmBox');
 if(!box){box=document.createElement('div');box.className='card';box.id='pmBox';pg.appendChild(box)}
 var A=window.AJ||{},Z=A.recargoZona==null||A.recargoZona===''?(BASE.zona_def||0):Number(String(A.recargoZona).replace(',','.'))||0,S=Number(String(A.subidaPrecios||0).replace(',','.'))||0,O=A.preciosMercado||{};
 var q=(document.getElementById('pmQ')||{}).value||'';var nq=q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
 var F=(BASE.familias||[]).filter(function(f){return f.tipico>0}).filter(function(f){if(!nq)return true;return (f.desc+' '+(f.claves||[]).join(' ')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').indexOf(nq)>-1});
 var h='<h2 style="font-size:22px;margin-bottom:6px">Precios de mercado</h2><p style="color:var(--muted);margin:0 0 8px">'+(BASE.familias||[]).length+' trabajos con su precio real de ahora (mano de obra y material, sin IVA), con el '+Z+' % de zona'+(S?' y tu subida del '+S+' %':'')+'. Si pones tu precio en uno, manda el tuyo.</p>'+
  '<input id="pmQ" placeholder="Buscar: alicatado, solera, puerta…" value="'+q.replace(/"/g,'')+'" oninput="pintarPM()" style="width:100%;padding:10px;font-size:16px;margin-bottom:8px">'+
  '<div style="max-height:60vh;overflow:auto">'+F.slice(0,80).map(function(f){var p=Math.round(f.tipico*(1+Z/100)*(1+S/100)*100)/100;var o=O[f.id];
   return '<div style="border-bottom:1px solid var(--line);padding:8px 0"><div style="font-weight:600">'+f.desc+'</div><div style="font-size:12px;color:var(--muted)">También se llama: '+(f.claves||[]).slice(0,4).join(' · ')+(f.fuentes&&f.fuentes[0]?' · <a href="'+f.fuentes[0]+'" target="_blank" rel="noopener">fuente</a>':'')+'</div>'+
   '<div style="display:flex;gap:8px;align-items:center;margin-top:4px"><span>Mercado: <b>'+eur(p)+'</b> / '+f.u+'</span><span style="margin-left:auto">Tu precio</span><input inputmode="decimal" style="width:90px" value="'+(o>0?String(o).replace('.',','):'')+'" placeholder="—" onchange="ponPM(\''+f.id+'\',this.value)"></div></div>'}).join('')+(F.length>80?'<div style="padding:8px;color:var(--muted)">Hay '+F.length+'; escribe arriba para buscar.</div>':'')+'</div>';
 box.innerHTML=h;var i=document.getElementById('pmQ');if(i&&q){i.focus();i.setSelectionRange(q.length,q.length)}}
window.pintarPM=pinta;
window.ponPM=function(id,v){var A=window.AJ;if(!A)return;A.preciosMercado=A.preciosMercado||{};var n=num(v);if(n>0)A.preciosMercado[id]=n;else delete A.preciosMercado[id];try{lsSet('vr_aj',JSON.stringify(A));subirConfig()}catch(e){}};
var st0=window.ST;if(st0)window.ST=function(t){var r=st0.apply(this,arguments);if(t==='ajustes')basePrecios().then(function(B){BASE=B;pinta()});return r};
})();
