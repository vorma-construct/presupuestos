/* v251 · PRESUPUESTO EN BLANCO (César, 7-nov-2026: «lo meto en la aplicación y no le hace nada»).
   Hay PDF que traen las partidas con su código y su unidad, pero SIN cantidades ni precios (Base 0,00): una empresa o una
   comunidad las manda para que el albañil ponga su precio. El lector del arquitecto solo cogía las partidas con cantidad,
   así que no salía nada y la pantalla se quedaba en blanco.
   Ahora esas partidas se leen (con su capítulo), se enseñan y se meten de un toque: cada una con tu precio si está en tu
   tarifa (o el de mercado si no), y los metros vacíos para que los pongas tú (la app te los pide antes de sacar el PDF). */
(function(){
 function nrm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
 function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
 /* código (1.1 · 2,04 · 01.02.03 · E02.03 · 8.04/8.05) + unidad + título */
 var COD='(\\d{1,2}(?:[.,]\\d{1,3})+(?:\\/[\\d.,\\/]*\\d)?|[A-Z]{1,4}\\d{1,3}(?:[.,]\\d{1,3})*)',UNI='(ud|uds|u|m²|m2|ml|m3|m³|m|kg|pa|h|pp)';
 var RE_P=new RegExp('^'+COD+'\\s*'+UNI+'\\.?(?=\\s|[A-ZÁÉÍÓÚÑ])\\s*(.{3,})$','i');
 /* o la unidad al final, en su columna: «01.02 Picado de alicatado   m2» */
 var RE_P2=new RegExp('^'+COD+'\\s+([A-ZÁÉÍÓÚÑa-záéíóúñ].{2,}?)\\s+'+UNI+'\\.?$','i');
 var RE_CAP=/^(?:\d{1,2}[.,]\d{1,3}\s+)?C?AP[IÍ]?T?U?LO\s+(\d+)\s*[-–.:]?\s*(.+)$/i;
 function uni(u){u=nrm(u).replace('²','2').replace('³','3');return u==='uds'||u==='u'?'ud':u==='m'?'ml':u==='pp'?'ud':u}
 /* las partidas sin cantidad de una hoja (con su capítulo); las «INCLUIDO» van aparte */
 function sinCantidad(ls){var out=[],cap='',act=null,capN=0;
  (ls||[]).forEach(function(l){var ln=String(l||'').replace(/\s+/g,' ').trim();if(!ln)return;
   if(/^total\b/i.test(ln)||/^base imp/i.test(ln)){act=null;return}
   var c=ln.match(RE_CAP);if(c&&!/^total/i.test(ln)){capN=+c[1];cap=c[2].replace(/\s+/g,' ').trim().replace(/^[-–]\s*/,'');cap=cap.charAt(0)+cap.slice(1).toLowerCase();act=null;return}
   if(/^incluid[oa]$/i.test(ln)){if(act)act.incl=true;return}
   var m=ln.match(RE_P);
   if(!m){var m2=ln.match(RE_P2);if(m2)m=[m2[0],m2[1],m2[3],m2[2]]}
   if(m&&!/^\d/.test(m[3])){act={code:m[1].replace(',','.').split('/')[0],u:uni(m[2]),t:m[3].replace(/\.$/,'').trim(),cap:cap,desc:''};out.push(act);return}
   if(act&&act.desc.length<400&&!/^(p[aá]gina|\*\* suma|presupuesto|descripci[oó]n|referencia|fecha|cif)\b/i.test(ln))act.desc+=(act.desc?' ':'')+ln});
  /* el título partido en dos líneas («Casco contra golpes, destinado a proteger…»): se queda la primera frase */
  out.forEach(function(p){p.t=p.t.replace(/,\s*(destinado|que|para)\b.*$/i,'').trim()});
  return out}
 window.partidasSinCantidad=sinCantidad;

 var pm=window.parseMediciones;
 window.parseMediciones=function(ls){var r=pm.apply(this,arguments);try{
  var s=sinCantidad(ls);
  /* solo cuando la hoja NO trae cantidades (si trae, manda el lector de siempre) */
  if(!(r&&r.length)&&s.length>=1){ARQ.sinCant=(ARQ.sinCant||[]).concat(s);ARQ.dudosas=[]}}catch(e){}return r};

 /* el precio: 1) tu tarifa si es esa partida y va por la misma unidad; 2) lo que ya cobraste otra vez; 3) el de mercado de
    esa familia de trabajo; 4) tu tarifa si se parece mucho (solo por el título). Si no, a cero para que lo pongas tú. */
 function precioDe(p){var T=tarifa(),n=nrm(p.t),mismaU=function(a,b){return uni(a)===uni(b)},t=null,id=null;
  if(/\bcanon\b/.test(n))return {p:0,de:''};           /* el canon de vertido va aparte del contenedor: lo pones tú */
  try{id=window.casar?casar(p.t):null}catch(e){}
  if(id==='mon'&&/montaje|desmontaje|alquiler/.test(n))id=null; /* tu «mon» es el suplemento de subir material, no montar un montacargas */
  t=id&&T.find(function(x){return x.id===id});
  if(t&&t.p>0&&mismaU(t.u,p.u))return {p:t.p,de:'tarifa',id:t.id};
  try{var ap=window.precioAprendido?precioAprendido(p.t):0;if(ap>0)return {p:ap,de:'tuyo'}}catch(e){}
  try{var R=window.precioRealDe?precioRealDe({t:p.t+' '+(p.desc||'').slice(0,160),u:p.u,q:1,pa:0}):null;
   if(R&&R.p>0&&!R.sinMercado&&!(R.fam==='d_cubierta_completa'&&!/cubierta completa|tejado/.test(n)))return {p:Math.round(R.p*100)/100,de:'mercado'}}catch(e){}
  try{var z=window.parecida?parecida(p.t):null;if(z&&z.t&&z.score>=5&&!z.suelta&&mismaU(z.t.u,p.u)){var tz=T.find(function(x){return x.id===z.t.id});if(tz&&tz.p>0)return {p:tz.p,de:'tarifa',id:tz.id}}}catch(e){}
  return {p:0,de:''}}

 window.meterSinCantidad=function(){try{leer()}catch(e){}var L=ARQ.sinCant||[],n=0,sinP=0;cur.lineas=cur.lineas||[];
  L.forEach(function(p){if(p.incl||p.fuera)return;var pr=precioDe(p),d=p.t.charAt(0).toUpperCase()+p.t.slice(1);
   var l={d:d,q:0,u:p.u,p:pr.p,code:p.code,orig:(p.t+(p.desc?' — '+p.desc:'')).slice(0,300)};if(p.cap)l.cap=p.cap;
   if(/^(m2|ml|m3)$/.test(p.u))l.qPend=1;else{l.q=1;l.cuantas=1}
   if(!(pr.p>0))sinP++;cur.lineas.push(l);n++});
  ARQ.sinCant=[];cur.arqLeidas=(cur.arqLeidas||0)+n;renderArq();try{renderLineas();autoGuardar&&autoGuardar()}catch(e){}
  var m=document.getElementById('msg');if(m)m.textContent=n+' partidas metidas. Mide y pon los metros o las unidades de cada una'+(sinP?' y el precio de las '+sinP+' que no están en tu tarifa':'')+'.';
  try{document.getElementById('tb').scrollIntoView({behavior:'smooth',block:'start'})}catch(e){}};

 var ra=window.renderArq;
 window.renderArq=function(){var L=ARQ.sinCant||[];
  if(ARQ.med&&ARQ.med.length||!L.length)return ra.apply(this,arguments);
  try{setTimeout(function(){try{pintarContinuar();plegarDatos()}catch(e){}},60)}catch(e){}
  var box=document.getElementById('arqPanel');if(!box)return;
  var vale=L.filter(function(p){return !p.incl}),incl=L.length-vale.length,caps=[];
  vale.forEach(function(p){if(caps.indexOf(p.cap)<0)caps.push(p.cap)});
  var h='<div class="aviso" style="font-size:15px;line-height:1.45"><b>Este PDF trae '+vale.length+' partidas sin cantidades ni precios</b>: es un presupuesto en blanco para que le pongas tus precios.'+
   ' Las meto con tu precio (o el de mercado si no está en tu tarifa). <b>Hay que medir</b>: luego te pido los metros o las unidades de cada una.'+(incl?' Las '+incl+' que pone «incluido» no las meto.':'')+'</div>'+
   '<div class="row" style="margin:10px 0"><button class="ok" type="button" onclick="meterSinCantidad()">Meter las '+vale.length+' partidas</button><button class="sec" type="button" onclick="ARQ.sinCant=[];renderArq()">Descartar</button></div>'+
   '<details><summary style="cursor:pointer;color:var(--muted)">Ver las partidas</summary><div style="font-size:14px;margin-top:6px">'+
   caps.map(function(c){return (c?'<div style="font-weight:700;margin-top:8px">'+esc(c)+'</div>':'')+vale.filter(function(p){return p.cap===c}).map(function(p){return '<div>'+esc(p.code)+' · '+esc(p.u)+' · '+esc(p.t)+'</div>'}).join('')}).join('')+'</div></details>';
  box.style.display='block';box.innerHTML=h;try{box.scrollIntoView({behavior:'smooth',block:'start'})}catch(e){}};
 /* «Quitar el PDF» y un PDF nuevo empiezan de cero */
 var la=window.leerArquitecto;if(la)window.leerArquitecto=function(){if(window.ARQ&&!(ARQ.med&&ARQ.med.length))ARQ.sinCant=[];return la.apply(this,arguments)};
})();
