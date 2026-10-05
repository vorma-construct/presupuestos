/* Los presupuestos preparados (arreglos/*.json que salen en arreglos/auto.json) se ponen al dia SOLOS al abrir la app:
   si en el movil hay un presupuesto de ese cliente y esa obra con una version vieja, se le cambian las lineas y se avisa.
   Si ya tiene enlace mandado y el cliente no ha firmado, tambien se actualiza ese mismo enlace. */
(function(){
function espera(fn,ms){return new Promise(function(ok){var t0=Date.now();(function v(){if(fn())return ok(true);if(Date.now()-t0>ms)return ok(false);setTimeout(v,400)})()})}
function aviso(h){if(window.avisoVigila)return avisoVigila(h);alert(h.replace(/<[^>]+>/g,''))}
espera(function(){return !!(window.FB&&FB.uid&&FB.db&&window.DB&&DB.presus)},60000).then(function(ok){if(!ok)return;setTimeout(correr,4000)});
function correr(){fetch('arreglos/auto.json?'+Date.now()).then(function(r){return r.json()}).then(function(L){
 (L.ids||[]).forEach(function(id){fetch('arreglos/'+id+'.json?'+Date.now()).then(function(r){return r.json()}).then(function(A){if(!A.ver)return;var hechos=[];
  A.presus.forEach(function(P){Object.keys(DB.presus).forEach(function(k){var q=DB.presus[k];if(!q||q.nom!==P.nom||(q.dir||'')!==(P.dir||''))return;if(q.arrVer===A.ver)return;
   var antes=totalCon(q.lineas,q.iva);q.lineas=JSON.parse(JSON.stringify(P.lineas));if(P.obs)q.obs=P.obs;q.arrVer=A.ver;q.ts=Date.now();
   save();subirPresu(k);hechos.push({k:k,nom:q.nom,antes:antes,ahora:totalCon(q.lineas,q.iva),tok:q.firmaTok});
   if(window.cur&&cur.num===k){cur=JSON.parse(JSON.stringify(q));try{pintar()}catch(_){}}})});
  if(!hechos.length)return;
  aviso('<b>He puesto al día '+(hechos.length===1?'el presupuesto':'los presupuestos')+' con los precios reales:</b><br>'+hechos.map(function(h){return 'nº '+h.k+' '+h.nom+': '+eur(h.antes)+' → <b>'+eur(h.ahora)+'</b>'}).join('<br>')+(hechos.some(function(h){return h.tok})?'<br>Si ya se lo habías mandado, ábrelo y dale a «Enviar al cliente»: se actualiza el mismo enlace.':''))})})}).catch(function(){})}
})();
