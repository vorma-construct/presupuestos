/* Todo lo que se dicta o se escribe en «Contándolo con mis palabras» se guarda, con lo que la app sacó de ello:
   en el móvil, en el presupuesto y en la nube de la cuenta. Se ve en Ayuda → «Lo que se ha dictado». */
(function(){
 var LS='vr_dictados',MAX=300;
 function lee(){try{return JSON.parse(localStorage.getItem(LS)||'[]')}catch(e){return []}}
 function graba(a){try{localStorage.setItem(LS,JSON.stringify(a.slice(0,MAX)))}catch(e){}}
 var porVoz=false;
 document.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('#btnVoz');if(b)porVoz=true},true);
 function subir(a){try{if(window.FB&&FB.uid&&window.ref)ref().set({dictados:a.slice(0,150)},{merge:true}).catch(function(){})}catch(e){}}
 function apuntar(txt,antes){var c=window.cur||{},L=(c.lineas||[]);
  var nuevas=L.slice(antes).map(function(l){return {d:String(l.d||'').slice(0,160),q:l.q,p:l.p}});
  var info=((document.getElementById('convInfo')||{}).innerText||'').trim().slice(0,300);
  var e={ts:Date.now(),fecha:new Date().toLocaleString('es-ES'),num:c.num||'',cliente:c.nom||'',origen:porVoz?'voz':'escrito',texto:String(txt).slice(0,3000),
   trabajos:nuevas.length,lineas:nuevas.slice(0,40),aviso:info,ver:window.APP_VERSION||'',fallo:!nuevas.length};
  porVoz=false;
  var a=lee();a.unshift(e);graba(a);subir(a);
  try{if(c&&c.num){c.dictados=(c.dictados||[]).concat([{ts:e.ts,origen:e.origen,texto:e.texto,trabajos:e.trabajos}]).slice(-30);if(window.save)save()}}catch(x){}
  try{pinta()}catch(x){}}
 var conv0=window.convertir;
 if(conv0)window.convertir=function(){var ta=document.getElementById('dictado'),txt=ta?ta.value:'',antes=((window.cur||{}).lineas||[]).length,r;
  try{r=conv0.apply(this,arguments)}catch(err){if(txt.trim()){var a=lee();a.unshift({ts:Date.now(),fecha:new Date().toLocaleString('es-ES'),num:(cur||{}).num||'',origen:porVoz?'voz':'escrito',texto:txt.slice(0,3000),trabajos:0,fallo:true,error:String(err&&err.message||err).slice(0,300),ver:window.APP_VERSION||''});graba(a);subir(a)}throw err}
  if(txt.trim())setTimeout(function(){apuntar(txt,antes)},900);return r};
 /* juntar con lo que haya en la nube (otro móvil u ordenador de la misma cuenta) */
 function traer(){try{if(!(window.FB&&FB.uid&&window.ref))return;ref().get().then(function(s){var d=s.data()||{},n=d.dictados||[];if(!n.length)return;var a=lee(),ya={};a.forEach(function(x){ya[x.ts+'|'+x.texto]=1});n.forEach(function(x){if(!ya[x.ts+'|'+x.texto])a.push(x)});a.sort(function(x,y){return y.ts-x.ts});graba(a);pinta()}).catch(function(){})}catch(e){}}
 setTimeout(traer,4000);
 function esc(t){return String(t||'').replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
 function texto(){return lee().map(function(e){return e.fecha+' · nº '+(e.num||'-')+(e.cliente?' · '+e.cliente:'')+' · '+e.origen+(e.fallo?' · NO SACÓ NADA':' · '+e.trabajos+' trabajos')+'\n«'+e.texto+'»'+(e.error?'\nError: '+e.error:'')+(e.lineas&&e.lineas.length?'\n'+e.lineas.map(function(l){return '  - '+l.d+' ('+l.q+' x '+l.p+' €)'}).join('\n'):'')}).join('\n\n')}
 window.copiarDictados=function(){var t=texto();if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){alert('Copiado')});else prompt('Copia esto',t)};
 window.waDictados=function(){window.open('https://wa.me/?text='+encodeURIComponent('Lo que se ha dictado en la app:\n\n'+texto().slice(0,6000)),'_blank')};
 function pinta(){var pg=document.getElementById('page-ayuda');if(!pg)return;var box=document.getElementById('dictBox');
  if(!box){box=document.createElement('details');box.id='dictBox';box.className='card';box.style.marginTop='12px';pg.appendChild(box)}
  var a=lee(),f=a.filter(function(e){return e.fallo}).length;
  box.innerHTML='<summary style="font-weight:700;font-size:16px;cursor:pointer">Lo que se ha dictado ('+a.length+')'+(f?' · <span style="color:#b3261e">'+f+' sin sacar nada</span>':'')+'</summary>'+
   '<p style="color:var(--muted);margin:6px 0">Todo lo que se ha dicho o escrito en «Contándolo con mis palabras», con lo que sacó la app. Sirve para arreglarlo si algo no salió bien.</p>'+
   '<div class="row" style="margin-bottom:8px"><button class="sec" type="button" onclick="copiarDictados()">Copiar todo</button><button class="sec" type="button" onclick="waDictados()">Mandarlo por WhatsApp</button></div>'+
   (a.length?a.slice(0,100).map(function(e){return '<div style="border-top:1px solid var(--line);padding:8px 0"><div style="font-size:12.5px;color:var(--muted)">'+esc(e.fecha)+' · nº '+esc(e.num||'-')+(e.cliente?' · '+esc(e.cliente):'')+' · '+(e.origen==='voz'?'por voz':'escrito')+'</div><div style="margin:3px 0">«'+esc(e.texto)+'»</div><div style="font-size:13px;color:'+(e.fallo?'#b3261e':'#1B7A3A')+'">'+(e.fallo?'No sacó ningún trabajo'+(e.error?' · '+esc(e.error):''):e.trabajos+' trabajos: '+esc((e.lineas||[]).map(function(l){return l.d.split(/[,(—]/)[0]}).slice(0,6).join(' · ')))+'</div></div>'}).join(''):'<p>Todavía no se ha dictado nada.</p>')}
 window.pintarDictados=pinta;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pinta);else pinta();
})();
