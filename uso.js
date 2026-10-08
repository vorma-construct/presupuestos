/* Cuántas veces se abre y se usa la app de cada empresa (no Vorma): solo cuenta, nunca guarda lo que se escribe.
   Se guarda en la nube por cada móvil u ordenador y lo ve Asier en uso.html. */
(function(){
 if(!window.EMP||!EMP.id)return;
 var K='vr_uso',o;try{o=JSON.parse(localStorage.getItem(K)||'null')}catch(e){o=null}
 o=o||{dias:{},total:{}};
 /* el aparato de Asier se marca abriendo la app una vez con ?mio=1 (o ?mio=0 para quitarlo) */
 try{var qm=new URLSearchParams(location.search).get('mio');if(qm==='1')localStorage.setItem('vr_mio','1');if(qm==='0')localStorage.removeItem('vr_mio')}catch(e){}
 var MIO=false;try{MIO=localStorage.getItem('vr_mio')==='1'}catch(e){}
 var dev;try{dev=localStorage.getItem('vr_dev');if(!dev){dev=Math.random().toString(36).slice(2,10);localStorage.setItem('vr_dev',dev)}}catch(e){dev='x'}
 function hoy(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
 var UA=navigator.userAgent||'',DISP=/iPhone/.test(UA)?'iPhone':/iPad/.test(UA)?'iPad':/Android/.test(UA)?('Android'+((UA.match(/;\s*([^;)]+?)\s+Build/)||[])[1]?' · '+UA.match(/;\s*([^;)]+?)\s+Build/)[1]:'')):/Windows/.test(UA)?'Ordenador Windows':/Mac/.test(UA)?'Mac':'Otro';
 function instalada(){return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true}
 var t=null;
 function subir(){clearTimeout(t);t=setTimeout(function(){try{if(!(window.FB&&FB.uid&&FB.db))return;var u=(window.firebase&&firebase.auth&&firebase.auth().currentUser)||{};
   var nP=0,nM=0;try{Object.keys(DB.presus||{}).forEach(function(k){nP++;if(DB.presus[k].firmaTok)nM++})}catch(e){}
   /* como quedo lo ultimo que tocaron: cuantas partidas, cuantas a cero y cuantos avisos de la revision (sin guardar textos) */
   var est={};try{if(window.cur&&cur.lineas){est.partidas=cur.lineas.length;est.aCero=cur.lineas.filter(function(l){return !(num(l.p)>0)}).length;est.total=Math.round((cur.lineas.reduce(function(a,l){return a+num(l.q)*num(l.p)},0))||0);
     try{var rv=window.revisar?revisar(false,true):null;/* solo contar: el cuadro de la revisión no se toca por detrás */if(rv&&rv.E)est.avisos=rv.E.length}catch(e){}}}catch(e){}
   FB.db.collection('seguimiento').doc('uso_'+EMP.id+'_'+dev).set({tipo:'uso',empresa:EMP.id,marca:(window.AJ&&AJ.marca)||EMP.nombreApp||EMP.id,cuenta:u.email||'',uid:FB.uid,mio:MIO,disp:DISP,instalada:instalada(),ver:window.APP_VERSION||'',
    ultimo:o.ultimo||Date.now(),ultimoQue:o.ultimoQue||'',dias:o.dias,total:o.total,presupuestos:nP,mandados:nM,error:o.error||'',errorTs:o.errorTs||0,estado:est,log:o.log||[],ts:Date.now()},{merge:false}).catch(function(){})}catch(e){}},2500)}
 function apunta(q){var d=hoy();o.dias[d]=o.dias[d]||{};o.dias[d][q]=(o.dias[d][q]||0)+1;o.total[q]=(o.total[q]||0)+1;o.ultimo=Date.now();o.ultimoQue=q;
  /* la hora de cada cosa que hace (las sesenta últimas): solo qué y cuándo */
  o.log=(o.log||[]).concat([{t:Date.now(),q:q}]).slice(-60);
  var ks=Object.keys(o.dias).sort();while(ks.length>90)delete o.dias[ks.shift()];
  try{localStorage.setItem(K,JSON.stringify(o))}catch(e){}subir()}
 window.__usoApunta=apunta;
 /* abrir: una vez al entrar y otra si vuelve tras media hora */
 var ultAbre=0;function abre(){if(Date.now()-ultAbre<30*60000)return;ultAbre=Date.now();apunta('abre')}
 abre();document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')abre()});
 /* lo que hace */
 function envolver(n,q){var f=window[n];if(typeof f!=='function'||f.__uso)return;var g=function(){try{apunta(q)}catch(e){}return f.apply(this,arguments)};g.__uso=1;window[n]=g}
 setTimeout(function(){[['convertir','dicta'],['leerArquitecto','pdfArquitecto'],['planoPorCodigo','plano'],['hacerPresupuestos','presupuestosDelPdf'],['mandarFirma','mandar'],['imprimir','pdf'],
  ['nuevo','nuevo'],['fotosDeEste','fotos'],['abrirFotos','fotos'],['dictar','voz'],['abrirAgenda','agenda'],['duplicar','variante']].forEach(function(x){envolver(x[0],x[1])})},2500);
 /* fallos de la app, para poder ayudarles */
 window.addEventListener('error',function(e){try{var donde=(e&&e.filename)?' @'+String(e.filename).split('/').pop().split('?')[0]+':'+(e.lineno||0):'';o.error=String((e&&e.message)||'error').slice(0,180)+donde+' ('+(window.APP_VERSION||'')+')';o.errorTs=Date.now();apunta('fallo')}catch(x){}});
 /* cuando haya sesión, sube lo que haya */
 var n=0,iv=setInterval(function(){if(window.FB&&FB.uid){clearInterval(iv);subir()}else if(++n>60)clearInterval(iv)},2000);
})();
