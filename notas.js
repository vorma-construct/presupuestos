/* NOTAS PARA UNA EMPRESA: un aviso que le sale una sola vez al abrir la app, sobre un presupuesto suyo,
   SIN tocar el presupuesto (por ejemplo, «revisa el nº 146: faltan las puertas que pedía el correo»).
   Se escriben en empresas/<empresa>/notas.json: {"notas":[{"id":"…","num":"146","texto":"…"}]}. */
(function(){
var E=(window.EMP_FIJA||new URLSearchParams(location.search).get('e')||'').replace(/[^a-z0-9_-]/gi,'').toLowerCase();if(!E)return;
function espera(fn,ms){return new Promise(function(ok){var t0=Date.now();(function v(){if(fn())return ok(true);if(Date.now()-t0>ms)return ok(false);setTimeout(v,500)})()})}
espera(function(){return !!(window.DB&&DB.presus&&window.avisoVigila)},60000).then(function(ok){if(!ok)return;setTimeout(mirar,5000)});
function mirar(){fetch('empresas/'+E+'/notas.json?'+Date.now()).then(function(r){return r.ok?r.json():{notas:[]}}).then(function(j){
 var vistas={};try{vistas=JSON.parse(localStorage.getItem('vr_notasVistas')||'{}')}catch(_){}
 (j.notas||[]).forEach(function(n,i){if(!n||!n.id||vistas[n.id])return;if(n.num&&!(DB.presus&&DB.presus[String(n.num)]))return;
  setTimeout(function(){try{avisoVigila('<b>'+(n.num?'Revisa el presupuesto nº '+n.num:'Aviso')+'</b><br>'+String(n.texto||'').replace(/</g,'&lt;'),true)}catch(_){}},i*1500);
  vistas[n.id]=Date.now()});
 try{localStorage.setItem('vr_notasVistas',JSON.stringify(vistas))}catch(_){}}).catch(function(){})}
})();
