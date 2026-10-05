/* Revisa el presupuesto antes de que salga y lo vuelve a revisar solo a los quince minutos.
   - Antes de mandar: arregla lo que es claramente un error (partidas repetidas, lineas vacias) y
     no deja salir lo que esta mal (partidas a cero, estancias sin medir).
   - A los quince minutos: relee lo que se mando. Si algo esta mal o no coincide, lo corrige y lo
     actualiza en el MISMO enlace que tiene el cliente (si aun no ha firmado), y avisa de que ha cambiado. */
(function(){
var ESPERA=15*60*1000;

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
window.revisar=function(mostrar){var r=revisar0.apply(this,arguments);try{
 var sin=(cur.paqs||[]).filter(function(pk){return !(pk.suelo>0)&&cur.lineas.some(function(l){return l.paqId===pk.id&&l.u==='m2'})});
 sin.forEach(function(pk){var nom={bano:'del baño',cocina:'de la cocina',hab:'de la habitación',piso:'del piso'}[pk.tipo]||'de una estancia';r.E.push('Faltan los metros '+nom+(pk.n>1?' '+pk.n:'')+': sus partidas van con cantidad 1. Ponlos arriba, en «Para afinar el precio».')});
 if(sin.length){var box=document.getElementById('revBox');if(box)box.insertAdjacentHTML('afterbegin','<div class="aviso" style="border-color:#b3261e;background:#fbe3e0">'+sin.length+' estancia(s) sin medir. ✕ '+r.E.slice(-sin.length).join('<br>✕ ')+'</div>')}
 if(cur.dir&&(cur.dir.length>80||/\b(haremos|haremos|vamos a|queremos|autoconstruccion|presupuesto|solicitamos)\b/.test(norm(cur.dir)))){r.A.push('La dirección de la obra parece una frase, no una dirección: «'+cur.dir.slice(0,60)+'».')}
}catch(e){}return r};

/* antes de mandar: corrige lo seguro y para si hay algo mal */
var mandar0=window.mandarFirma;
window.mandarFirma=function(){if(window.__vigSilencio)return mandar0.apply(this,arguments);
 leer();var ch=autoCorregir(cur);if(ch.length){renderLineas();leer()}
 var r=revisar(true);
 if(r.E.length){var b=document.getElementById('revBox');if(b)b.scrollIntoView({behavior:'smooth',block:'center'});aviso('<b>No lo mando todavía.</b> Hay '+r.E.length+' cosa(s) que arreglar: están marcadas en rojo, en «Revisar el presupuesto».',true);return}
 cur.revisarEn=Date.now()+ESPERA;cur.revHecha=false;
 var res=mandar0.apply(this,arguments);
 var t0=Date.now();(function mira(){var m=document.getElementById('msg');if(m&&/Enlace (actualizado|mandado)/.test(m.textContent)&&!m.querySelector('.vig15')){m.insertAdjacentHTML('beforeend','<div class="vig15" style="margin-top:6px;font-size:13px;color:#2B6CB0"><b>En quince minutos lo vuelvo a revisar yo solo.</b> Si encuentro algo, lo corrijo en el mismo enlace y te aviso.'+(ch.length?'<br>Antes de mandarlo he corregido: '+ch.join('; ')+'.':'')+'</div>');return}if(Date.now()-t0<30000)setTimeout(mira,500)})();
 return res};

/* aviso que se queda hasta que lo tocas */
function aviso(html,rojo){var d=document.createElement('div');d.className='vigAviso';d.style.cssText='position:fixed;left:10px;right:10px;bottom:14px;z-index:9500;background:'+(rojo?'#FBE3E0':'#E6F3EA')+';border-left:5px solid '+(rojo?'#B3261E':'#1B7A3A')+';padding:12px 14px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.25);font-size:14px;color:#222';d.innerHTML=html+'<div style="text-align:right;margin-top:6px"><button class="mini sec" type="button">Vale</button></div>';d.querySelector('button').onclick=function(){d.remove()};document.body.appendChild(d)}
window.avisoVigila=aviso;

function baseDe(c){return Math.round((c.lineas||[]).filter(function(l){return !l.imp}).reduce(function(a,l){return a+num(l.q)*num(l.p)},0)*100)/100}
function ocupado(n){/* no le quito de delante el presupuesto que esta tocando */
 var enPresu=document.querySelector('.ntab.on')&&document.querySelector('.ntab.on').dataset.t==='presupuesto';
 return enPresu&&cur&&cur.num!==n&&cur.lineas&&cur.lineas.length>0}

/* la segunda revision */
var enMarcha=false;
function vigilar(){if(enMarcha||!window.DB||!DB.presus||!window.FB||!FB.uid||!FB.db)return;var ahora=Date.now();
 var p=Object.keys(DB.presus).map(function(k){return DB.presus[k]}).find(function(p){return p&&p.firmaTok&&p.revisarEn&&p.revisarEn<=ahora&&!p.revHecha});
 if(!p)return;if(ocupado(p.num))return;enMarcha=true;
 FB.db.collection('firmas').doc(p.firmaTok).get().then(function(d){var f=d.exists?d.data():null;
  var copia=JSON.parse(JSON.stringify(p));var ch=autoCorregir(copia);
  var nube=f?Math.round(num(f.base)*100)/100:null,aqui=baseDe(copia);
  if(f&&Math.abs(nube-baseDe(p))>0.01)ch.push('lo que ve el cliente ('+eur(nube)+' sin IVA) no coincide con lo guardado ('+eur(baseDe(p))+')');
  if(!f)ch.push('el enlace no estaba en la nube');
  if(!ch.length){DB.presus[p.num].revHecha=true;save();aviso('<b>Revisado otra vez el nº '+p.num+' de '+(p.nom||'')+':</b> todo bien, el cliente lo ve correcto.');enMarcha=false;return}
  if(f&&f.firma){DB.presus[p.num].revHecha=true;save();aviso('<b>El nº '+p.num+' de '+(p.nom||'')+' ya está firmado</b>, así que no lo toco. He visto esto: '+ch.join('; ')+'. Si hace falta, mándale un imprevisto.',true);enMarcha=false;return}
  /* corregir y actualizar el mismo enlace */
  var volver=cur&&cur.num!==p.num&&DB.presus[cur.num]?cur.num:null;
  abrir(p.num);setTimeout(function(){try{leer();autoCorregir(cur);renderLineas();leer();cur.revHecha=true;cur.revisarEn=0;guardar();
   var ow=window.open;window.open=function(){return null};window.__vigSilencio=true;
   mandarFirma();window.__vigSilencio=false;
   var t0=Date.now();(function mira(){var m=document.getElementById('msg');var ok=m&&/Enlace (actualizado|mandado)/.test(m.textContent);
    if(ok||Date.now()-t0>25000){window.open=ow;DB.presus[p.num].revHecha=true;DB.presus[p.num].revisarEn=0;save();
     aviso(ok?'<b>He corregido el nº '+p.num+' de '+(p.nom||'')+'</b> en la revisión de los quince minutos: '+ch.join('; ')+'. El cliente ya lo ve bien en el mismo enlace; no hace falta mandarle otro.':'<b>No he podido actualizar el enlace del nº '+p.num+'.</b> Ábrelo y dale a «Enviar al cliente».',!ok);
     if(volver)setTimeout(function(){try{abrir(volver)}catch(_){}},400);enMarcha=false;return}
    setTimeout(mira,500)})()}catch(e){enMarcha=false}},300)
 }).catch(function(){enMarcha=false})}
window.vigilarAhora=vigilar;
setInterval(vigilar,60000);setTimeout(vigilar,8000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(vigilar,1500)});
})();
