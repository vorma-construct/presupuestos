/* Reformas Lucas: logo en la cabecera y barra de abajo (movil) que usa las pestañas de siempre */
(function(){
var LOGO_SRC='empresas/lucas/casa.png';
function cab(){var b=document.getElementById('brandTxt');if(b&&!b.querySelector('img')){b.innerHTML='<img src="'+LOGO_SRC+'" alt=""><span class="lucasMarca">'+((window.AJ&&AJ.marca)||'REFORMAS LUCAS').toUpperCase()+'</span>'}}
var IC={
 presupuesto:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>',
 clientes:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path></svg>',
 mapa:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
 mas:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>'};
function nav(){if(document.getElementById('lucasNav'))return;var n=document.createElement('nav');n.id='lucasNav';n.setAttribute('aria-label','Secciones');
 [['presupuesto','Presupuesto'],['clientes','Presupuestos'],['mapa','Obras'],['mas','Más']].forEach(function(x){var b=document.createElement('button');b.type='button';b.dataset.t=x[0];b.innerHTML=IC[x[0]]+'<span>'+x[1]+'</span>';
  b.onclick=function(){if(x[0]==='mas'){var t=document.getElementById('masTabs');document.body.classList.add('lucasMas');menuMas();return}var t=document.querySelector('#topnav .ntab[data-t="'+x[0]+'"]');if(t)t.click();marca()};n.appendChild(b)});
 document.body.appendChild(n);marca()}
function marca(){var on=(document.querySelector('#topnav .ntab.on')||{}).dataset;var t=on&&on.t;document.querySelectorAll('#lucasNav button').forEach(function(b){b.classList.toggle('on',b.dataset.t===t||(b.dataset.t==='mas'&&['contrato','tarifa','precios','ajustes','legal','ayuda'].indexOf(t)>=0))})}
function menuMas(){var m=document.getElementById('lucasMas');if(m){m.remove();return}m=document.createElement('div');m.id='lucasMas';
 m.style.cssText='position:fixed;left:10px;right:10px;bottom:80px;z-index:45;background:#fff;border:1px solid #E1DDD7;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:8px;display:grid;gap:4px';
 [['tarifa','Mis precios'],['precios','Lista de precios'],['contrato','Contrato'],['ajustes','Ajustes'],['legal','Mis papeles'],['ayuda','Ayuda']].forEach(function(x){if(!document.querySelector('#topnav .ntab[data-t="'+x[0]+'"]'))return;var b=document.createElement('button');b.type='button';b.className='sec';b.style.cssText='text-align:left;border:0;min-height:48px;font-size:16px';b.textContent=x[1];b.onclick=function(){m.remove();document.querySelector('#topnav .ntab[data-t="'+x[0]+'"]').click();marca();window.scrollTo(0,0)};m.appendChild(b)});
 document.body.appendChild(m);setTimeout(function(){document.addEventListener('click',function f(e){if(!m.contains(e.target)&&!e.target.closest('#lucasNav')){m.remove();document.removeEventListener('click',f)}})},0)}
/* presupuesto: capítulos numerados y su total, para que el cliente lo lea de un vistazo */
function capitulos(){var tb=document.getElementById('p_rows');if(!tb||tb.__caps===tb.innerHTML.length)return;tb.querySelectorAll('tr.sub').forEach(function(r){r.remove()});
 var num=function(t){return parseFloat(String(t).replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'))||0};var eu=function(n){return (Math.round(n*100)/100).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'};
 var caps=[].slice.call(tb.querySelectorAll('tr.cap'));if(caps.length<2){tb.__caps=tb.innerHTML.length;return}
 caps.forEach(function(c,i){var td=c.querySelector('td');if(td&&!td.querySelector('.cnum'))td.insertAdjacentHTML('afterbegin','<span class="cnum">'+String(i+1).padStart(2,'0')+'</span>');
  var s=0,e=c.nextElementSibling,last=c;while(e&&!e.classList.contains('cap')){var tds=e.querySelectorAll('td');if(tds.length>=4)s+=num(tds[tds.length-1].textContent);last=e;e=e.nextElementSibling}
  if(last!==c)last.insertAdjacentHTML('afterend','<tr class="sub"><td colspan="4">Total '+((td&&td.textContent.replace(/^\d+/,''))||'capítulo').trim().toLowerCase()+'<b>'+eu(s)+'</b></td></tr>')});
 tb.__caps=tb.innerHTML.length}
var pd1=window.pintarDocs;if(typeof pd1==='function'&&!pd1.__lucas){window.pintarDocs=function(){var r=pd1.apply(this,arguments);try{capitulos()}catch(e){}return r};window.pintarDocs.__lucas=1}
function todo(){cab();nav();marca()}
(function(){var b=document.getElementById('brandTxt');if(b&&window.MutationObserver)new MutationObserver(function(){if(!b.querySelector('img'))cab()}).observe(b,{childList:true,characterData:true,subtree:true})})();
todo();document.addEventListener('DOMContentLoaded',todo);setTimeout(todo,800);setTimeout(todo,2000);
document.addEventListener('click',function(e){if(e.target.closest('.ntab'))setTimeout(marca,50)},true);
var st0=window.ST;if(typeof st0==='function')window.ST=function(){var r=st0.apply(this,arguments);setTimeout(marca,30);return r};
})();
