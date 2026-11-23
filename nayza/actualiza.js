/* Precios viejos del arquitecto -> precios de hoy.
   Lee la fecha del PDF del arquitecto (la de su firma o creacion) y el Indice de costes de la
   construccion de Euskadi, edificacion (Eustat), que GitHub baja solo cada mes a indices.json.
   Con eso dice cuanto ha subido la obra desde entonces y deja poner sus precios ya actualizados. */
(function(){
var MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
var IDX=null;
function indices(){if(IDX)return Promise.resolve(IDX);return fetch('indices.json?'+Math.floor(Date.now()/36e5)).then(function(r){return r.json()}).then(function(j){IDX=j;return j}).catch(function(){return null})}
function valor(j,m){if(!j||!m)return null;if(j.meses[m])return j.meses[m];/* si falta ese mes: la media de su año */var a=(j.anual||{})[m.slice(0,4)];if(a)return a;
 var ks=Object.keys(j.meses).sort();if(m<ks[0])return null;return null}
function nombreMes(m){return MES[Number(m.slice(5,7))-1]+' de '+m.slice(0,4)}
/* cuanto ha subido desde el mes m: {f:1.075, pct:'7,5', desde:'marzo de 2025', hasta:'agosto de 2026'} */
function subida(m){return indices().then(function(j){var a=valor(j,m),b=j&&j.meses[j.ultimo];if(!a||!b||m>=j.ultimo)return null;
 var f=b/a;return {f:f,pct:String(Math.round((f-1)*1000)/10).replace('.',','),desde:nombreMes(m),hasta:nombreMes(j.ultimo)}})}
window.subidaDesde=subida;

/* fecha de cada PDF que se lee: la de su firma digital o, si no tiene, la de creacion */
window.__fechaPdf=window.__fechaPdf||{};
var pdfItems0=window.pdfItems;
window.pdfItems=function(file){var r=pdfItems0.apply(this,arguments);
 try{file.arrayBuffer().then(function(buf){return pdfjsLib.getDocument({data:buf}).promise}).then(function(doc){return doc.getMetadata().then(function(md){var d=(md&&md.info&&(md.info.CreationDate||md.info.ModDate))||'';
  var m=String(d).match(/D?:?(\d{4})(\d{2})/);if(m&&Number(m[1])>1990){window.__fechaPdf[file.name]={m:m[1]+'-'+m[2],t:Date.now(),pags:doc.numPages}}})}).catch(function(){})}catch(e){}
 return r};
/* la fecha del presupuesto del arquitecto: la del PDF leido hace poco con mas paginas (el de mediciones) */
function fechaArq(){if(ARQ&&ARQ.fecha)return ARQ.fecha;var F=window.__fechaPdf,best=null;Object.keys(F).forEach(function(k){var x=F[k];if(Date.now()-x.t<10*60*1000&&(!best||x.pags>best.pags))best=x});if(best&&ARQ){ARQ.fecha=best.m}return best?best.m:null}

/* los precios del arquitecto, ya subidos a hoy */
var ponerArq0=window.cypePonerArq;
window.cypePonerArq=function(){var S=window.__subida;if(!S)return ponerArq0.apply(this,arguments);
 var n=0;ARQ.med.forEach(function(p){if(p.on&&!(p.pr>0)&&p.pa>0){p.pr=Math.round(p.pa*S.f*100)/100;p.dePa=true;p.actualizado=true;n++}});abiertos();renderCype();
 var ai=document.getElementById('arqInfo');if(ai)ai.textContent=n+' partidas con el precio del arquitecto subido a hoy (+'+S.pct+' %). Están marcadas para que las repases.'};

/* aviso en la barra del presupuesto del arquitecto */
var barra0=window.cypeBarra;
window.cypeBarra=function(){var r=barra0.apply(this,arguments);try{var b=document.getElementById('cyBarra');if(!b||!ARQ||!ARQ.cype)return r;var m=fechaArq();if(!m)return r;
 var pinta=function(S){window.__subida=S;var old=document.getElementById('cyHoy');if(old)old.remove();var h='';
  if(S){h='<div id="cyHoy" style="background:#FFF4E5;border-left:4px solid #C24A00;padding:8px 10px;border-radius:6px;margin:6px 0;font-size:13px"><b>Los precios del arquitecto son de '+S.desde+'.</b> Desde entonces la obra de edificación en Euskadi ha subido un <b>'+S.pct+' %</b> (índice oficial de Eustat, '+S.hasta+'). Al poner sus precios, ya te los subo a hoy.</div>';
   b.querySelectorAll('button').forEach(function(x){if(/Poner el precio del arquitecto/.test(x.textContent)&&!/hoy/.test(x.textContent))x.textContent='Poner el precio del arquitecto, subido a hoy (+'+S.pct+' %)'})}
  else h='<div id="cyHoy" style="font-size:12px;color:#555;margin:4px 0">Los precios del arquitecto son de '+nombreMes(m)+': están al día.</div>';
  b.insertAdjacentHTML('afterbegin',h)};
 if(window.__subida!==undefined&&window.__subidaMes===m)pinta(window.__subida);else subida(m).then(function(S){window.__subidaMes=m;pinta(S)})}catch(e){}return r};
})();
