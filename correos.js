/* Correo del cliente: guarda cada correo usado y, al escribir, sugiere los que ya conoce
   (agenda + presupuestos) y, tras la @, los finales más comunes. Se toca y se pone. */
(function(){
 var LS='vr_correos',DOM=['gmail.com','hotmail.com','hotmail.es','outlook.es','outlook.com','yahoo.es','icloud.com','euskaltel.net','telefonica.net','live.com'];
 function okMail(v){return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v||'')}
 function propios(){try{return JSON.parse(localStorage.getItem(LS)||'[]')}catch(e){return []}}
 function guardar(v){v=(v||'').trim().toLowerCase();if(!okMail(v))return;var a=propios().filter(function(x){return x!==v});a.unshift(v);try{localStorage.setItem(LS,JSON.stringify(a.slice(0,300)))}catch(e){}}
 function todos(){var s={},out=[];function add(v,n){v=(v||'').trim().toLowerCase();if(okMail(v)&&!s[v]){s[v]=1;out.push({m:v,n:n||''})}}
  try{var C=clientes();Object.keys(C).sort(function(a,b){return (C[b].ts||0)-(C[a].ts||0)}).forEach(function(k){add(C[k].email,C[k].nom)})}catch(e){}
  try{Object.keys(DB.presus||{}).sort(function(a,b){return b-a}).forEach(function(k){var p=DB.presus[k];add(p.email,p.nom)})}catch(e){}
  propios().forEach(function(v){add(v,'')});return out}
 function sugerir(q){q=(q||'').trim().toLowerCase();if(!q)return [];var r=[];
  todos().forEach(function(x){if(x.m!==q&&(x.m.indexOf(q)===0||(x.n&&x.n.toLowerCase().indexOf(q)>=0)))r.push(x)});
  var at=q.indexOf('@');if(at>0&&r.length<4){var u=q.slice(0,at),d=q.slice(at+1);DOM.forEach(function(D){var m=u+'@'+D;if(D.indexOf(d)===0&&m!==q&&!r.some(function(x){return x.m===m}))r.push({m:m,n:''})})}
  return r.slice(0,4)}
 function enganchar(e){if(!e||e.dataset.corr)return;e.dataset.corr=1;
  e.setAttribute('inputmode','email');e.setAttribute('autocapitalize','off');e.setAttribute('autocorrect','off');e.setAttribute('spellcheck','false');e.setAttribute('autocomplete','off');
  var box=document.createElement('div');box.id='corrSug';box.style.cssText='display:none;margin-top:4px;border:1px solid var(--line,#ddd);border-radius:10px;overflow:hidden;background:#fff';e.parentNode.insertBefore(box,e.nextSibling);
  function pinta(){var L=sugerir(e.value);if(!L.length||document.activeElement!==e){box.style.display='none';return}
   box.innerHTML=L.map(function(x,i){return '<button type="button" data-m="'+x.m+'" style="display:block;width:100%;text-align:left;border:0;'+(i?'border-top:1px solid var(--line,#eee);':'')+'background:#fff;padding:11px 12px;font:inherit;font-size:15px;min-height:44px;color:inherit">'+x.m+(x.n?'<span style="display:block;font-size:12.5px;opacity:.65">'+x.n.replace(/</g,'')+'</span>':'')+'</button>'}).join('');box.style.display='block'}
  box.addEventListener('mousedown',function(ev){ev.preventDefault()});
  box.addEventListener('click',function(ev){var b=ev.target.closest('button[data-m]');if(!b)return;e.value=b.dataset.m;box.style.display='none';guardar(e.value);try{e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));if(e.id==='f_email'&&window.leer)leer()}catch(x){}});
  e.addEventListener('input',pinta);e.addEventListener('focus',pinta);
  e.addEventListener('blur',function(){setTimeout(function(){box.style.display='none'},150);guardar(e.value)});
  e.addEventListener('change',function(){guardar(e.value)})}
 function montar(){enganchar(document.getElementById('f_email'))}
 /* En «¿Qué hago?»: mandar a firmar por correo, con el correo escrito y sugerencias */
 function bloqueCorreo(){var c=document.getElementById('cajaEnviar');if(!c)return;var card=c.querySelector('.card');if(!card)return;
  var b=document.getElementById('envCorreo');if(!b){b=document.createElement('div');b.id='envCorreo';b.style.cssText='margin:0 0 10px;padding:10px;border:1px solid var(--line,#ddd);border-radius:12px';
   b.innerHTML='<label class="f" for="envMail" style="margin:0 0 4px;display:block">Correo del cliente</label><input id="envMail" type="email" placeholder="nombre@gmail.com" style="width:100%;box-sizing:border-box">'+
    '<div id="envAviso" style="display:none;color:#b3261e;font-size:13.5px;margin-top:4px">Escribe un correo bien puesto, por ejemplo nombre@gmail.com</div>'+
    '<button class="ok" type="button" style="width:100%;margin-top:8px;padding:14px" onclick="mandarPorCorreo()">Mandar a firmar por correo</button>';
   var first=card.querySelector('button');if(first&&first.nextSibling)card.insertBefore(b,first.nextSibling);else card.appendChild(b);
   var w=card.querySelector('button.ok');if(w&&w.textContent==='Mandar a firmar')w.textContent='Mandar a firmar por WhatsApp';
   enganchar(document.getElementById('envMail'))}
  var i=document.getElementById('envMail'),f=document.getElementById('f_email');i.value=(f&&f.value)||(window.cur&&cur.email)||'';document.getElementById('envAviso').style.display='none'}
 window.mandarPorCorreo=function(){var i=document.getElementById('envMail'),v=(i.value||'').trim();if(!okMail(v)){document.getElementById('envAviso').style.display='block';i.focus();return}
  var f=document.getElementById('f_email');if(f)f.value=v;guardar(v);try{leer();save()}catch(e){}
  window.__porCorreo=true;cerrarEnviar();mandarFirma()};
 var me0=window.menuEnviar;if(me0)window.menuEnviar=function(){window.__porCorreo=false;var r=me0.apply(this,arguments);try{bloqueCorreo()}catch(e){}return r};
 document.addEventListener('click',function(ev){var a=ev.target.closest&&ev.target.closest('a[href^="mailto:"]');if(a)window.__abreCorreo=Date.now()},true);
 window.correoSugerencias=sugerir;window.guardarCorreo=guardar;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',montar);else montar();
 setTimeout(montar,1500);
})();
