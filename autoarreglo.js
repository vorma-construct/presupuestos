/* Los presupuestos preparados (arreglos/*.json que salen en arreglos/auto.json) se ponen al dia SOLOS al abrir la app:
   si en el movil hay un presupuesto de ese cliente y esa obra con una version vieja, se le cambian las lineas y se avisa.
   Si ya tiene enlace mandado y el cliente no ha firmado, tambien se actualiza ese mismo enlace. */
(function(){
function espera(fn,ms){return new Promise(function(ok){var t0=Date.now();(function v(){if(fn())return ok(true);if(Date.now()-t0>ms)return ok(false);setTimeout(v,400)})()})}
function aviso(h){if(window.avisoVigila)return avisoVigila(h);alert(h.replace(/<[^>]+>/g,''))}
if(/[?&]arreglo=/.test(location.search))return;
espera(function(){return !!(window.FB&&FB.uid&&FB.db&&window.DB&&DB.presus)},60000).then(function(ok){if(!ok)return;setTimeout(correr,4000)});
/* mismo cliente y misma obra repetido: se queda uno (el firmado; si no, el que tiene enlace mandado y es más nuevo; si no, el de número más bajo).
   Los demás se borran; si alguno tenía enlace mandado, ese enlace pasa a enseñar el mismo presupuesto que el que se queda. Los firmados no se tocan nunca. */
function unoSolo(P,igual){var ks=Object.keys(DB.presus).filter(function(k){return igual(DB.presus[k],P)});if(ks.length<2)return [];
 var pts=function(k){var q=DB.presus[k];return (q.firmado?4:0)+(q.firmaTok?2:0)};
 ks.sort(function(a,b){var d=pts(b)-pts(a);if(d)return d;if(pts(a)>=2)return (DB.presus[b].ts||0)-(DB.presus[a].ts||0);return num(a)-num(b)});
 var queda=ks[0],fuera=[];
 ks.slice(1).forEach(function(k){var q=DB.presus[k];if(q.firmado)return;
  if(q.firmaTok){var tok=q.firmaTok;
   setTimeout(function(){var tq2=DB.presus[queda]&&DB.presus[queda].firmaTok;if(!tq2||tq2===tok)return;
    FB.db.collection('firmas').doc(tok).get().then(function(d){if(d.exists&&(d.data()||{}).firma)return;
     return FB.db.collection('firmas').doc(tq2).get().then(function(n){if(!n.exists)return;var x=n.data();x.num=queda;x.ts=Date.now();return FB.db.collection('firmas').doc(tok).set(x)})}).catch(function(){})},45000)}
  try{aPapelera(k,'repe')}catch(_){delete DB.presus[k];try{borrarNube(k)}catch(_){}}fuera.push(k)});
 if(fuera.length){save();if(window.cur&&fuera.indexOf(cur.num)>=0)try{abrir(queda)}catch(_){}try{renderClientes()}catch(_){}}
 return fuera}
function correr(){fetch('arreglos/auto.json?'+Date.now()).then(function(r){return r.json()}).then(function(L){
 (L.ids||[]).forEach(function(id){fetch('arreglos/'+id+'.json?'+Date.now()).then(function(r){return r.json()}).then(function(A){if(!A.ver)return;var hechos=[];
  var igual=function(q,P){return q&&norm(q.nom||'').trim()===norm(P.nom||'').trim()&&(window.mismaObra?mismaObra(q.dir,P.dir):(q.dir||'')===(P.dir||''))};
  var quitados=[];if(A.unico)A.presus.forEach(function(P){quitados=quitados.concat(unoSolo(P,igual))});
  A.presus.forEach(function(P){Object.keys(DB.presus).forEach(function(k){var q=DB.presus[k];if(!igual(q,P))return;if(q.arrVer===A.ver)return;if(q.firmado)return;
   var antes=totalCon(q.lineas,q.iva);q.lineas=JSON.parse(JSON.stringify(P.lineas));if(P.obs)q.obs=P.obs;q.arrVer=A.ver;q.ts=Date.now();
   save();subirPresu(k);hechos.push({k:k,nom:q.nom,antes:antes,ahora:totalCon(q.lineas,q.iva),tok:q.firmaTok});
   if(window.cur&&cur.num===k){cur=JSON.parse(JSON.stringify(q));try{pintar()}catch(_){}}})});
  if(!hechos.length){if(quitados.length)aviso('<b>He dejado un solo presupuesto por cliente.</b> Quitados los repetidos: '+quitados.map(function(x){return 'nº '+x}).join(', ')+'.');return}
  /* los que ya tienen enlace: se actualiza ESE MISMO enlace (si el cliente no ha firmado) */
  var conEnlace=hechos.filter(function(h){return h.tok});var volver=window.cur&&cur.num;var i=0;
  (function sig(){if(i>=conEnlace.length){if(volver&&DB.presus[volver])try{abrir(volver)}catch(_){}
    aviso((quitados.length?'<b>He dejado un solo presupuesto por cliente</b> (quitados los repetidos: '+quitados.map(function(x){return 'nº '+x}).join(', ')+').<br>':'')+'<b>He puesto al día '+(hechos.length===1?'el presupuesto':'los presupuestos')+' con los precios reales:</b><br>'+hechos.map(function(h){return 'nº '+h.k+' '+h.nom+': '+eur(h.antes)+' → <b>'+eur(h.ahora)+'</b>'+(h.tok?(h.ok?' · ya cambiado en el enlace que tiene el cliente':' · <b style="color:#B3261E">no he podido cambiar su enlace'+(h.firmado?': ya está firmado':'')+'</b>'):'')}).join('<br>'));return}
   var h=conEnlace[i++];
   FB.db.collection('firmas').doc(h.tok).get().then(function(d){if(d.exists&&(d.data()||{}).firma){h.firmado=true;return sig()}
    abrir(h.k);setTimeout(function(){var ow=window.open;window.open=function(){return null};window.__vigSilencio=true;var m=document.getElementById('msg');if(m)m.innerHTML='';
     try{mandarFirma()}catch(e){}window.__vigSilencio=false;var t0=Date.now();
     (function mira(){var m=document.getElementById('msg');var ok=m&&/Enlace actualizado/.test(m.textContent);if(ok||Date.now()-t0>20000){window.open=ow;h.ok=ok&&DB.presus[h.k].firmaTok===h.tok;sig();return}setTimeout(mira,400)})()},500)}).catch(function(){sig()})})();
  return;
 })})}).catch(function(){})}
})();
