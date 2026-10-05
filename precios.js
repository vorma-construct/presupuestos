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
function precioReal(B,o){/* o: {t, u, q, pa, indice (factor), zona (%), subida (%)} */
 var t=nrm(o.t),u=String(o.u||'').toLowerCase(),c=[];
 var idx=o.indice>0?o.indice:1;
 if(o.pa>0)c.push({p:o.pa*idx*GG,f:'arquitecto'+(idx>1.001?' al día':'')+' + 19 %'});
 var k=clave(o.t);(B.cype||[]).forEach(function(e){if(e.u===u&&k.indexOf(e.clave.slice(0,60))===0)c.push({p:e.precio*GG,f:'CYPE de hoy'+(e.minimo?' (mínimo)':'')+' + 19 %'})});
 var fam=null;(B.familias||[]).some(function(F){if(new RegExp(F.re).test(t)){fam=F;return true}return false});
 var zona=(o.zona==null?(B.zona_def||0):Number(o.zona))||0;
 if(fam&&fam.u===u&&fam.tipico>0)c.push({p:fam.tipico*(1+zona/100),f:'mercado'+(zona?' + '+zona+' % zona':'')});
 if(!c.length)return null;
 var best=c.reduce(function(a,b){return b.p>a.p?b:a});
 var p=best.p*(1+(Number(o.subida)||0)/100),f=best.f,min=false;
 if(fam&&fam.minimo&&o.q>0&&o.q*p<fam.minimo){p=fam.minimo/o.q;f='mínimo de una visita ('+fam.minimo+' €)';min=true}
 return {p:r2(p),fuente:f,fam:fam?fam.id:null,famU:fam?fam.u:null,sinMercado:!fam||fam.u!==u,minimo:min,opciones:c.map(function(x){return {p:r2(x.p),f:x.f}})}}
root.precioReal=precioReal;
if(typeof module!=='undefined')module.exports={precioReal:precioReal};

/* ---------- en la app ---------- */
if(typeof window==='undefined')return;
var BASE=null;function base(){if(BASE)return Promise.resolve(BASE);return fetch('precios.json?'+Math.floor(Date.now()/36e5)).then(function(r){return r.json()}).then(function(j){BASE=j;return j}).catch(function(){return null})}
base();
function ajustes(){var A=window.AJ||{};return {zona:A.recargoZona==null||A.recargoZona===''?null:Number(String(A.recargoZona).replace(',','.')),subida:Number(String(A.subidaPrecios||0).replace(',','.'))||0}}
window.precioRealDe=function(p){if(!BASE)return null;var a=ajustes();return precioReal(BASE,{t:p.corto||p.t,u:p.u,q:p.q,pa:p.pa,indice:(window.__subida&&window.__subida.f)||1,zona:a.zona,subida:a.subida})};
/* "Poner el precio del arquitecto" ahora pone el PRECIO REAL (el que el albañil ya tenga, se respeta) */
var poner0=window.cypePonerArq;
window.cypePonerArq=function(){if(!BASE){return base().then(function(){window.cypePonerArq()})}
 var n=0,m=0,sinM=[];ARQ.med.forEach(function(p){if(p.on&&!(p.pr>0)&&p.pa>0){var R=precioRealDe(p);if(!R)return;p.pr=R.p;p.real=R.fuente;p.dePa=false;n++;if(R.sinMercado)sinM.push(p.code)}});
 abiertos();renderCype();var ai=document.getElementById('arqInfo');if(ai)ai.textContent=n+' partidas con precio real (el mayor entre el arquitecto al día, CYPE de hoy y el mercado). '+(sinM.length?sinM.length+' no tienen precio de mercado en la base: van con el del arquitecto al día; repásalas.':'')};
/* el texto del boton */
var barra0=window.cypeBarra;
window.cypeBarra=function(){var r=barra0.apply(this,arguments);try{var b=document.getElementById('cyBarra');if(b)b.querySelectorAll('button').forEach(function(x){if(/Poner el precio del arquitecto/.test(x.textContent))x.textContent='Poner precios reales'})}catch(e){}return r};
})(typeof window!=='undefined'?window:globalThis);
