/* Instalar la app según el móvil (iPhone: Safari → Compartir → Añadir a pantalla de inicio; Android: botón)
   y recibir los PDF compartidos desde WhatsApp (Android). En iPhone, cómo coger un PDF de WhatsApp. */
(function(){
 var UA=navigator.userAgent||'',IOS=/iPhone|iPad|iPod/.test(UA)||(/Macintosh/.test(UA)&&navigator.maxTouchPoints>1),AND=/Android/.test(UA);
 var SAFARI=IOS&&/Safari/.test(UA)&&!/CriOS|FxiOS|EdgiOS|GSA|OPiOS|FBAN|FBAV|Instagram/.test(UA);
 var MOVIL=IOS||AND;
 function instalada(){return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true}
 var K='vr_instNo';
 function callado(){try{return Date.now()-(+localStorage.getItem(K)||0)<3*864e5}catch(e){return false}}
 function callar(){try{localStorage.setItem(K,Date.now())}catch(e){}cerrar()}
 var nombre=(document.title||'la aplicación').split('·')[0].trim()||'la aplicación';
 var ev=null;
 window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();ev=e;if(!instalada()&&!callado())pinta()});
 window.addEventListener('appinstalled',function(){cerrar()});
 var ICO_SH='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-5px"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8"/></svg>';
 var ICO_ADD='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" style="vertical-align:-4px"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
 var ICO_DOTS='<b style="font-size:20px;letter-spacing:-1px;vertical-align:-2px">⋮</b>';
 function caja(html,abajo){cerrar();var d=document.createElement('div');d.id='instBox';
  d.style.cssText='position:fixed;left:10px;right:10px;'+(abajo?'bottom:14px':'top:10px')+';z-index:99990;background:#fff;color:#141414;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:16px 16px 12px;font:15px/1.45 system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto';
  d.innerHTML=html+'<div style="text-align:right;margin-top:8px"><button type="button" id="instNo" style="border:0;background:none;color:#666;font:inherit;font-size:14px;padding:8px">Ahora no</button></div>'+(abajo&&SAFARI?'<div style="position:absolute;left:50%;bottom:-9px;margin-left:-9px;width:18px;height:18px;background:#fff;transform:rotate(45deg)"></div>':'');
  document.body.appendChild(d);document.getElementById('instNo').onclick=callar;return d}
 function cerrar(){var d=document.getElementById('instBox');if(d)d.remove()}
 function paso(n,t){return '<div style="display:flex;gap:10px;align-items:flex-start;margin:7px 0"><span style="flex:0 0 24px;height:24px;border-radius:50%;background:var(--accent,#E04209);color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center">'+n+'</span><span>'+t+'</span></div>'}
 var TIT='<div style="font-weight:800;font-size:17px;margin-bottom:4px">Instala '+nombre+' en el móvil</div>';
 function pinta(){if(instalada()||callado())return;
  if(IOS&&SAFARI){var V=+((UA.match(/Version\/(\d+)/)||[])[1]||0),NUEVO=V>=26;
   caja(TIT+'<div style="color:#555;font-size:14px;margin-bottom:4px">Así la tienes como una aplicación más, con su icono.</div>'+
     (NUEVO?paso(1,'Toca <b style="font-size:18px">···</b> abajo a la derecha y luego «Compartir» '+ICO_SH+'.'):paso(1,'Toca el botón de compartir '+ICO_SH+' de abajo, en el centro. Si no lo ves, toca <b style="font-size:18px">···</b> y luego «Compartir».'))+
     paso(2,'Toca «Añadir a pantalla de inicio» '+ICO_ADD+'. Si no sale, toca «Ver más».')+
     paso(3,(NUEVO?'Deja activado «Abrir como app web» y ':'')+'toca «Añadir».'),true);
   var fl=document.querySelector('#instBox > div:last-child');if(fl&&NUEVO&&fl.style.transform){fl.style.left='auto';fl.style.right='28px'}return}
  if(IOS){var d=caja(TIT+'<div>En iPhone solo se puede instalar desde <b>Safari</b>.</div>'+paso(1,'Toca «Copiar el enlace».')+paso(2,'Abre <b>Safari</b> (la brújula azul), pega el enlace arriba y entra.')+paso(3,'Allí te saldrá cómo instalarla.')+
     '<button type="button" id="instCopiar" style="width:100%;margin-top:8px;border:0;border-radius:12px;background:var(--accent,#E04209);color:#fff;font:inherit;font-weight:700;min-height:48px">Copiar el enlace</button>');
   document.getElementById('instCopiar').onclick=function(){var u=location.origin+location.pathname,b=this;var ok=function(){b.textContent='Copiado. Ahora ábrelo en Safari'};if(navigator.clipboard)navigator.clipboard.writeText(u).then(ok,function(){prompt('Copia este enlace',u)});else prompt('Copia este enlace',u)};return}
  if(ev){var d2=caja(TIT+'<div style="color:#555;font-size:14px">Así la tienes como una aplicación más, con su icono, y se abre más rápido.</div><button type="button" id="instSi" style="width:100%;margin-top:10px;border:0;border-radius:12px;background:var(--accent,#E04209);color:#fff;font:inherit;font-weight:700;min-height:50px">Instalar la aplicación</button>');
   document.getElementById('instSi').onclick=function(){var e=ev;ev=null;e.prompt();e.userChoice.then(function(r){if(r&&r.outcome==='accepted')cerrar();else setTimeout(function(){manual()},300)}).catch(manual)};return}
  if(AND)manual()}
 function manual(){if(instalada())return;caja(TIT+paso(1,'Toca '+ICO_DOTS+' arriba a la derecha de Chrome.')+paso(2,'Toca «Instalar aplicación» o «Añadir a pantalla de inicio».')+
   '<div style="font-size:13.5px;color:#555;margin-top:6px">¿No te sale? Si lo has abierto desde WhatsApp, toca '+ICO_DOTS+' y «Abrir en Chrome». Si dice que no hay espacio, borra algún vídeo o foto grande y vuelve a probar. Mientras tanto la puedes usar igual desde aquí.</div>')}
 window.mostrarInstalar=function(){try{localStorage.removeItem(K)}catch(e){}pinta()};
 function arranque(){if(!MOVIL||instalada()||callado())return;if(/[?&](t|arreglo|compartido)=/.test(location.search))return;setTimeout(function(){if(!document.getElementById('instBox'))pinta()},AND?3500:1500)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arranque);else arranque();

 /* iPhone: cómo coger un PDF que ha llegado por WhatsApp */
 function pista(){if(!IOS)return;['pdfArq','pdfPrecios'].forEach(function(id){var i=document.getElementById(id);if(!i||document.getElementById('iosP_'+id))return;var p=document.createElement('div');p.id='iosP_'+id;
  p.style.cssText='font-size:13px;color:#555;background:#F4F3F1;border-radius:10px;padding:8px 10px;margin-top:6px;line-height:1.4';
  p.innerHTML='<b>¿El PDF te ha llegado por WhatsApp?</b> Ábrelo en WhatsApp, toca compartir '+ICO_SH+' y «Guardar en Archivos». Luego aquí toca el botón, «Explorar» o «Archivos», y elígelo.';
  i.parentNode.insertBefore(p,i.nextSibling)})}
 setTimeout(pista,1200);setTimeout(pista,5000);

 /* Android: PDF compartido desde WhatsApp → entra solo en «Tengo el PDF del arquitecto» */
 if(/[?&]compartido=1/.test(location.search)&&window.caches){
  history.replaceState(null,'',location.pathname);
  caches.open('compartido').then(function(c){return c.keys().then(function(ks){return Promise.all(ks.map(function(k){return c.match(k).then(function(r){return r.blob().then(function(b){var n=decodeURIComponent(r.headers.get('x-nombre')||'archivo.pdf');return new File([b],n,{type:b.type||'application/pdf'})})})})).then(function(fs){ks.forEach(function(k){c.delete(k)});return fs})})}).then(function(fs){
   fs=(fs||[]).filter(function(f){return /pdf/i.test(f.type)||/\.pdf$/i.test(f.name)});if(!fs.length)return;
   var meter=function(){try{if(window.cur&&cur.lineas&&cur.lineas.length&&window.nuevo)nuevo();var b=document.querySelector('button.ntab[data-t="presupuesto"]');if(b)b.click();if(window.meterPor)meterPor('pdf');
     var inp=document.getElementById('pdfArq');if(!inp)return;var dt=new DataTransfer();fs.forEach(function(f){dt.items.add(f)});inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}));
     var cp=document.getElementById('cardPdf');if(cp)cp.scrollIntoView({behavior:'smooth',block:'start'})}catch(e){}};
   setTimeout(meter,1800)}).catch(function(){})}
})();
