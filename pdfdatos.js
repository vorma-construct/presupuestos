/* Los PDF que saca la app llevan dentro el presupuesto (partidas, cantidades y precios), escondido en sus datos.
   Si alguien vuelve a meter ese PDF en la app —él mismo u otra empresa que lo recibe—, se meten las partidas tal cual.
   Y si se mete un PDF sin texto (una foto, un escaneado, un PDF viejo de la app), se avisa en vez de no hacer nada. */
(function(){
var MARCA='PRESUAPP1:';
function empaqueta(){try{leer()}catch(_){}var c=window.cur||{};var d={v:1,num:c.num,nom:c.nom,dir:c.dir,tel:c.tel,email:c.email,iva:c.iva,obs:c.obs,marca:(window.AJ||{}).marca,
 lineas:(c.lineas||[]).filter(function(l){return !l.imp}).map(function(l){return {d:l.d,q:l.q,u:l.u,p:l.p,cap:l.cap||'',code:l.code||''}})};
 return MARCA+btoa(unescape(encodeURIComponent(JSON.stringify(d))))}
function desempaqueta(k){try{k=String(k||'');var i=k.indexOf(MARCA);if(i<0)return null;return JSON.parse(decodeURIComponent(escape(atob(k.slice(i+MARCA.length).trim()))))}catch(e){return null}}
function conJspdf(){return (window.jspdf?Promise.resolve():cargarJS(JSPDF_URL,function(){return !!window.jspdf})).then(function(){var J=window.jspdf.jsPDF;if(J.__datos)return;
 var N=function(){var d=new (Function.prototype.bind.apply(J,[null].concat([].slice.call(arguments))))();try{if(window.__pdfDatos)d.setProperties({title:'Presupuesto '+((window.cur||{}).num||''),subject:'Presupuesto',creator:(window.AJ||{}).marca||'',keywords:window.__pdfDatos})}catch(e){}return d};
 Object.keys(J).forEach(function(k){try{N[k]=J[k]}catch(_){}});N.API=J.API;N.prototype=J.prototype;N.__datos=1;window.jspdf.jsPDF=N})}
var pdf0=window.pdfSinMargenes;
if(pdf0)window.pdfSinMargenes=function(){var a=arguments,self=this;window.__pdfDatos=empaqueta();return conJspdf().catch(function(){}).then(function(){return pdf0.apply(self,a)})};
/* al meter PDFs: los de la app se leen con sus partidas; los que no tienen texto se avisan */
function info(h){var ai=document.getElementById('arqInfo');if(ai)ai.innerHTML=h}
function mira(f){return cargarPdfjs().then(function(){return f.arrayBuffer()}).then(function(buf){return pdfjsLib.getDocument({data:buf}).promise}).then(function(doc){
 return doc.getMetadata().catch(function(){return {}}).then(function(md){var k=(md&&md.info&&(md.info.Keywords||md.info.Subject))||'';var datos=desempaqueta(k);if(datos)return {f:f,datos:datos};
  var n=Math.min(doc.numPages,2),cuenta=0,ps=[];for(var i=1;i<=n;i++)ps.push(doc.getPage(i).then(function(p){return p.getTextContent()}).then(function(t){cuenta+=t.items.filter(function(x){return String(x.str||'').trim()}).length}));
  return Promise.all(ps).then(function(){return {f:f,sinTexto:cuenta<5}})})}).catch(function(){return {f:f}})}
function meter(d){try{leer()}catch(_){}var c=window.cur;var nuevas=(d.lineas||[]).map(function(l){return {d:l.d,q:l.q,u:l.u,p:l.p,cap:l.cap,code:l.code}});
 var cambiar=function(id,v){var e=document.getElementById(id);if(e&&!e.value&&v)e.value=v};cambiar('f_nom',d.nom);cambiar('f_dir',d.dir);cambiar('f_tel',d.tel);cambiar('f_email',d.email);
 var o=document.getElementById('f_obs');if(o&&!o.value&&d.obs)o.value=d.obs;try{leer()}catch(_){}
 c.lineas=(c.lineas||[]).concat(nuevas);try{renderLineas();leer();autoGuardar&&autoGuardar()}catch(_){}
 return nuevas.length}
var la0=window.leerArquitecto;
if(la0)window.leerArquitecto=function(files){var lista=[].slice.call(files||[]);if(!lista.length)return la0.apply(this,arguments);info('Leyendo…');
 return Promise.all(lista.map(mira)).then(function(rs){var resto=[],msgs=[];
  rs.forEach(function(r){if(r.datos){var n=meter(r.datos);msgs.push('<b>'+arqEsc(r.f.name)+'</b> es un presupuesto hecho con la app'+(r.datos.num?' (nº '+arqEsc(r.datos.num)+(r.datos.marca?' de '+arqEsc(r.datos.marca):'')+')':'')+': he metido sus '+n+' partidas con sus cantidades y precios. Repásalas.')}
   else if(r.sinTexto){var m=(r.f.name||'').match(/presupuesto\s*(\d+)/i),num=m&&m[1],hay=num&&window.DB&&DB.presus&&DB.presus[num];
    msgs.push('<b>'+arqEsc(r.f.name)+'</b> no tiene texto que leer: es una foto, un escaneado o un PDF antiguo de la app.'+(hay?' <button class="ok" type="button" style="margin-top:6px" onclick="abrir(\''+num+'\');window.scrollTo(0,0)">Abrir el presupuesto nº '+num+'</button>':' Pide el PDF original al arquitecto o cuéntalo con tus palabras.'))}
   else resto.push(r.f)});
  if(resto.length)la0.call(window,resto);
  setTimeout(function(){var ai=document.getElementById('arqInfo');if(!msgs.length)return;var prev=resto.length&&ai?ai.innerHTML:'';info('<div class="aviso" style="font-size:14.5px;line-height:1.45">'+msgs.join('<br><br>')+'</div>'+(prev&&!/Leyendo/.test(prev)?prev:''))},resto.length?1500:0)})};
})();
/* «Quitar el PDF» siempre a mano en cuanto se elige un archivo (también si es un plano o uno equivocado) */
(function(){
 function boton(v){var q=document.getElementById('btnQuitarPdf');if(q)q.style.display=v?'':'none'}
 document.addEventListener('change',function(e){if(e.target&&e.target.id==='pdfArq')boton(e.target.files&&e.target.files.length)},true);
 var q0=window.quitarPdf;
 window.quitarPdf=function(){var ap=document.getElementById('arqPanel'),pa=document.getElementById('pdfArq');
  if(!(ARQ&&ARQ.med&&ARQ.med.length)){ARQ={med:[],plano:null,cab:null,dudosas:[]};window.ULT_ARQ=null;if(ap){ap.innerHTML='';ap.style.display='none'}var ai=document.getElementById('arqInfo');if(ai)ai.innerHTML='';if(pa)pa.value='';boton(false);return}
  return q0&&q0.apply(this,arguments)};
})();
/* un plano para el que ya hay presupuesto preparado (por su número de expediente): se ofrece meterlo de un toque */
(function(){
 var ra=window.renderArq;
 window.renderArq=function(){var P=window.__esPlano,txt=window.__planoTxt||'';var r=ra.apply(this,arguments);try{
  var E=window.EMP||{},M=E.planos||{},box=document.getElementById('arqPanel');var id=null;Object.keys(M).forEach(function(k){if(txt.indexOf(k)>=0)id=M[k]});
  if(id&&box&&box.querySelector('.aviso')&&!box.querySelector('#planoListo')){box.querySelector('.aviso').insertAdjacentHTML('afterbegin','<div id="planoListo" style="margin-bottom:10px"><b>Para este plano ya tienes el presupuesto hecho</b>, con las medidas sacadas del dibujo y precios de mercado.<div style="margin-top:8px"><button class="ok" type="button" onclick="location.href=location.pathname+\'?arreglo='+id+'\'">Meter el presupuesto de este plano</button></div></div>')}
 }catch(e){}window.__planoTxt='';return r};
 var pm=window.parseMediciones;
 window.parseMediciones=function(ls){try{window.__planoTxt=(window.__planoTxt||'')+' '+(ls||[]).join(' ')}catch(e){}return pm.apply(this,arguments)};
})();
