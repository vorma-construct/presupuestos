/* Plano → presupuesto SIN IA: lee lo que el plano trae ESCRITO (medidas, elementos, materiales, espesores)
   y monta las partidas con reglas fijas. Cada partida lleva su cálculo. Lo que no está escrito no se inventa:
   se dice qué falta por medir. Las supuestas (que el plano no dice pero hacen falta) van marcadas. */
(function(G){
function n(s){return parseFloat(String(s).replace(/\./g,'').replace(',','.'))}
function r2(x){return Math.round(x*100)/100}
function f2(x){return String(r2(x)).replace('.',',')}
function primero(t,re){var m=t.match(re);return m||null}
function todos(t,re){var o=[],m;re.lastIndex=0;while((m=re.exec(t)))o.push(m);return o}
G.leerPlanoTexto=function(T){
 var t=String(T||'').replace(/[​­]/g,'').replace(/\s+/g,' ');var L=t.toLowerCase();
 var P=[],falta=[],leido=[];
 var add=function(cap,d,q,u,fam,calc,sup){if(!(q>0))return;P.push({capitulo:cap,descripcion:d,cantidad:r2(q),unidad:u,familia:fam,calculo:calc||'',supuesto:!!sup})};
 /* --- geometría --- */
 var largo=null,fondo=null,ai=null,bi=null,area=null;
 var m=primero(t,/(\d+,\d+)\s*m?\s*de largo por\s*(\d+,\d+)\s*m?\s*de fondo/i);if(m){largo=n(m[1]);fondo=n(m[2])}
 if(!largo){m=primero(t,/(\d+,\d+)\s*(?:m\s*)?de fachada a fachada/i);if(m)largo=n(m[1])}
 m=primero(t,/interior libre\s*(\d+,\d+)\s*[×x]\s*(\d+,\d+)/i)||primero(t,/(\d+,\d+)\s*[×x]\s*(\d+,\d+)\s*=\s*\d+,\d+\s*m²/i);if(m){ai=n(m[1]);bi=n(m[2])}
 m=primero(t,/=\s*(\d+,\d+)\s*m²/);if(m)area=n(m[1]);if(!area&&ai&&bi)area=ai*bi;
 if(!largo&&bi)largo=bi+0.24;if(!fondo&&ai)fondo=ai+0.12;
 if(area)leido.push('superficie útil '+f2(area)+' m²');if(largo&&fondo)leido.push('planta exterior '+f2(largo)+' × '+f2(fondo)+' m');
 var adosado=/adosa|adosado|adosada/.test(L);
 var Lm=largo&&fondo?(adosado?largo+2*fondo:2*(largo+fondo)):null;/* metros de muro nuevo */
 if(Lm)leido.push((adosado?'adosado: ':'')+f2(Lm)+' m de muro nuevo');else falta.push('el largo de los muros nuevos (el plano no lo trae escrito)');
 var h=null;m=primero(t,/(\d,\d+)\s*(?:m\s*)?altura libre/i);if(m)h=n(m[1]);
 if(!h){m=primero(t,/(\d,\d+)\s*m\s*libres?[^.]{0,40}?\by\s*(\d,\d+)\s*m/i);if(m)h=(n(m[1])+n(m[2]))/2}
 if(!h){var hs=todos(t,/(\d,\d+)\s*m?\s*libres?\b/gi).map(function(x){return n(x[1])}).filter(function(x){return x>1.9&&x<5});if(hs.length)h=hs.reduce(function(a,b){return a+b},0)/hs.length}
 var hSup=!h;if(!h)h=2.5;leido.push('altura '+f2(h)+' m'+(hSup?' (supuesta)':''));
 m=primero(t,/\+\s?(0,\d+)\s*suelo/i);var cota=m?n(m[1]):0;
 var hExt=h+cota;
 /* --- huecos --- */
 var vent=[],puer=[];todos(t,/ventana\s*(\d,\d+)\s*[×x]\s*(\d,\d+)/gi).forEach(function(x){var k=x[1]+'x'+x[2];if(vent.indexOf(k)<0)vent.push(k)});
 todos(t,/puerta\s*(\d,\d+)\s*[×x]\s*(\d,\d+)/gi).forEach(function(x){var k=x[1]+'x'+x[2];if(puer.indexOf(k)<0)puer.push(k)});
 var aHuecos=vent.reduce(function(a,k){var p=k.split('x');return a+n(p[0])*n(p[1])},0);
 /* --- cimentación --- */
 var C='Movimiento de tierras y cimentación';
 var z=primero(t,/zapata corrida[^.]{0,25}?(\d{2})\s*[×x]\s*(\d{2})/i);
 if(z&&Lm){var za=n(z[1])/100,zh=n(z[2])/100;
  add(C,'Excavación de zanjas para la cimentación de los muros nuevos',Lm*(za+0.1)*(zh+0.5),'m3','t_zanja',f2(Lm)+' m × '+f2(za+0.1)+' × '+f2(zh+0.5));
  if(/hormig[oó]n de limpieza/.test(L))add(C,'Hormigón de limpieza de 10 cm en el fondo de la zanja',Lm*za,'m2','c_hormigon_limpieza',f2(Lm)+' m × '+f2(za));
  add(C,'Zapata corrida de hormigón armado de '+z[1]+'×'+z[2]+' cm',Lm*za*zh,'m3','c_zapata',f2(Lm)+' m × '+f2(za)+' × '+f2(zh));
  add(C,'Transporte de tierras sobrantes a vertedero, con canon',Lm*(za+0.1)*(zh+0.5)*1.05,'m3','t_tierras_vertedero','excavación + 5 % esponjamiento')}
 else if(/zapata|cimentaci[oó]n/.test(L))falta.push('la cimentación: el plano la nombra pero sin medidas escritas');
 /* --- solera --- */
 C='Solera';
 if(area&&/solera/.test(L)){
  if(/relleno compactado/.test(L))add(C,'Relleno compactado bajo la solera',area*0.25,'m3','t_relleno',f2(area)+' m² × 0,25',true);
  m=primero(t,/encachado[^.]{0,30}?(\d{2})\s*cm/i);if(m)add(C,'Encachado de grava de '+m[1]+' cm',area,'m2','c_encachado',f2(area)+' m²');
  if(/l[aá]mina/.test(L))add(C,'Lámina impermeable bajo la solera',area,'m2','c_lamina_solera',f2(area)+' m²');
  m=primero(t,/solera[^.]{0,20}?(\d{1,2})\s*cm/i);add(C,'Solera de hormigón'+(m?' de '+m[1]+' cm':'')+(/mallazo/.test(L)?' con mallazo':''),area,'m2','c_solera',f2(area)+' m²')}
 /* --- muros --- */
 C='Muros';var aMuro=Lm?Lm*h-aHuecos:0;
 if(Lm&&/arranque de bloque/.test(L))add(C,'Muro de arranque de bloque de hormigón relleno, con barrera antihumedad',Lm*(cota+0.45),'m2','f_bloque',f2(Lm)+' m × '+f2(cota+0.45)+' m');
 if(Lm&&/trasd[oó]s/.test(L)&&/impermeabiliza/.test(L))add(C,'Impermeabilización del trasdós del muro de arranque',Lm*0.5,'m2','c_impermeabilizacion_muro',f2(Lm)+' m × 0,50');
 var mat=/\blp\b|ladrillo perforado/.test(L)?['f_ladrillo_perforado','ladrillo perforado']:/termoarcilla/.test(L)?['f_termoarcilla','bloque de termoarcilla']:/cara vista/.test(L)?['f_ladrillo_cara_vista','ladrillo cara vista']:null;
 m=primero(t,/(?:LP|ladrillo|cerramiento)[^.]{0,15}?(\d{1,2})\s*cm/i);
 if(Lm&&mat)add(C,'Muro nuevo de '+mat[1]+(m?' de '+m[1]+' cm':'')+(/pilastra/.test(L)?' con pilastras':''),aMuro,'m2',mat[0],f2(Lm)+' m × '+f2(h)+' m'+(aHuecos?' − huecos '+f2(aHuecos)+' m²':''),hSup);
 else if(/muro nuevo|cerramiento/.test(L))falta.push('los muros nuevos: no encuentro su material o su largo escritos');
 if(Lm&&adosado&&/traba|conector/.test(L))add(C,'Encuentro de los muros nuevos con la fachada existente (traba o conectores y malla)',4,'h','x_hora_oficial','2 encuentros × 2 h');
 if(/cargadero/.test(L)&&vent.length)add(C,'Colocación del cargadero sobre la ventana',2*vent.length,'h','x_hora_oficial',vent.length+' × 2 h');
 /* --- hueco en muro existente --- */
 C='Hueco de paso en el muro existente';
 if(/hueco de paso|cortar el hueco|se abre para el hueco/.test(L)){
  if(/apear|apeo|apea/.test(L))add(C,'Apeo del muro existente antes de cortar el hueco',1,'ud','e_apeo','1 hueco');
  add(C,'Apertura del hueco de paso'+(puer[0]?' de '+puer[0].replace('x',' × ')+' m':'')+' en el muro existente, con dintel',1,'ud','hueco_ladrillo','1 hueco · si el muro es de piedra cambia el precio',true);
  if(/coronaci[oó]n/.test(L)&&largo)add(C,'Regularizar la coronación del muro existente con mortero',2,'h','x_hora_oficial','2 h')}
 /* --- cubierta --- */
 C='Cubierta';
 if(largo&&fondo&&/teja/.test(L)&&/cabio|fald[oó]n|cubierta|alero/.test(L)){var ac=largo*(fondo+0.3)*1.02;
  if(/retira la hilada|retirar? .{0,20}teja|hilada de borde/.test(L))add(C,'Retirada de la hilada de teja de borde',largo*0.4,'m2','d_teja',f2(largo)+' m × 0,40');
  if(/cabio|viga/.test(L))add(C,'Estructura de cubierta de madera (cabios) en prolongación de la existente',ac,'m2','k_estructura_madera_cubierta',f2(largo)+' × ('+f2(fondo)+' + 0,30 de alero) × 1,02 pendiente');
  if(/entablado/.test(L))add(C,'Entablado de cubierta',ac,'m2','k_tablero',f2(r2(ac))+' m²');
  add(C,'Cubierta de teja'+(/teja curva/.test(L)?' curva':'')+(/l[aá]mina/.test(L)?' con lámina impermeable':''),ac,'m2','k_cubierta_teja',f2(r2(ac))+' m²')}
 /* --- revestimientos --- */
 C='Revestimientos y pintura';var aExt=Lm?Lm*hExt-aHuecos:0;m=primero(t,/hidr[oó]fugo[^.]{0,30}?hasta\s*\+?\s*(\d,\d+)/i);var zoc=m?n(m[1]):0;
 if(Lm&&/enfoscad/.test(L)){var dos=/dos caras|a dos caras/.test(L);add(C,'Enfoscado de mortero de cemento'+(dos?' en las dos caras de los muros nuevos':' de los muros nuevos'),(dos?aMuro:0)+aExt-Lm*zoc,'m2','r_enfoscado',(dos?'interior '+f2(r2(aMuro))+' + ':'')+'exterior '+f2(r2(aExt-Lm*zoc))+' m²')}
 if(Lm&&zoc)add(C,'Zócalo de mortero hidrófugo hasta +'+f2(zoc)+' m',Lm*zoc,'m2','r_raseo',f2(Lm)+' m × '+f2(zoc));
 if(Lm&&/pintura|pintado/.test(L)&&/fachada|azul|exterior|existente/.test(L))add(C,'Pintura de fachada'+(/azul/.test(L)?' en azul, igual a la existente':''),aExt-Lm*zoc,'m2','f_pintura_fachada',f2(r2(aExt-Lm*zoc))+' m²');
 var ducha=primero(t,/plato de ducha\s*(\d{2,3})\s*[×x]\s*(\d{2,3})/i),banera=/ba[ñn]era/.test(L);
 if(area&&/aseo|ba[ñn]o/.test(L)){
  if(ducha){var dl=n(ducha[1])/100,dw=n(ducha[2])/100;add(C,'Impermeabilización de la zona de la ducha',dl*dw+(dl+dw)*0.3,'m2','r_impermeabilizacion_ducha','plato + 30 cm de pared',true);add(C,'Alicatado de la zona de la ducha hasta 2,10 m',(dl+dw)*2.1,'m2','r_alicatado','('+f2(dl)+' + '+f2(dw)+') × 2,10',true)}
  if(ai&&bi)add(C,'Pintura plástica de las paredes interiores',2*(ai+bi)*h-(ducha?(n(ducha[1])+n(ducha[2]))/100*2.1:0)-aHuecos,'m2','r_pintura','perímetro interior × '+f2(h)+' − alicatado − huecos',true)}
 if(area&&/cabio|vigas?\b/.test(L)&&/vist/.test(L))add(C,'Lasur de la madera vista por el interior',area*1.05,'m2','r_lasur',f2(area)+' m² × 1,05');
 if(area&&/pavimento|solado|suelo/.test(L)&&/aseo|ba[ñn]o|cocina|habitaci|sal[oó]n/.test(L))add(C,'Solado con gres porcelánico sobre mortero',area,'m2','r_gres',f2(area)+' m²');
 /* --- carpintería --- */
 C='Carpintería';vent.forEach(function(k){add(C,'Ventana de '+k.replace('x',' × ')+' m',1,'ud','l_ventana_pvc','1 ud')});
 puer.forEach(function(k){add(C,'Puerta interior de paso de '+k.replace('x',' × ')+' m',1,'ud','p_puerta_interior','1 ud')});
 /* --- instalaciones --- */
 C='Fontanería, sanitarios y electricidad';var lav=/lavabo/.test(L),ino=/inodoro|v[aá]ter/.test(L);
 if(ducha||banera||lav||ino){add(C,'Fontanería del aseo: agua fría y caliente y desagües',1,'ud','i_fontaneria_bano','1 baño');
  if(ducha)add(C,'Plato de ducha de '+ducha[1]+' × '+ducha[2]+' cm, suministrado y colocado',1,'ud','i_plato_ducha','1 ud');
  if(banera)add(C,'Bañera, suministrada y colocada',1,'ud','i_banera','1 ud');
  m=primero(t,/lavabo\s*(\d{2})\s*[×x]\s*(\d{2})/i);if(lav)add(C,'Lavabo'+(m?' de '+m[1]+' × '+m[2]+' cm':'')+', suministrado y colocado',1,'ud','i_lavabo','1 ud');
  if(ino)add(C,'Inodoro, suministrado y colocado',1,'ud','i_inodoro','1 ud');
  add(C,'Grifería',(lav?1:0)+(ducha||banera?1:0),'ud','i_griferia','lavabo y ducha');
  add(C,'Punto de luz con interruptor',1,'ud','el_punto_luz','el plano no lo dice: lo mínimo',true);add(C,'Enchufe con su línea',1,'ud','el_enchufe','el plano no lo dice: lo mínimo',true)}
 if(P.some(function(p){return /Excavaci|Retirada|Apertura/.test(p.descripcion)}))add('Residuos','Saco big-bag de escombro con recogida',2,'ud','x_saco_escombro','escombro de la obra',true);
 var exp=(t.match(/Exp\.?\s*([0-9]{4,}[A-Z]?)/)||[])[1]||'',obra=(t.match(/OBRA:\s*([^·|]{4,80}?)\s*(?:·|Exp|PLANO)/i)||[])[1]||'';
 var dir=(t.match(/OBRA:\s*[^·]*·\s*([^·]{3,60}?)\s*·/i)||[])[1]||'';
 return {obra:obra.trim(),direccion:dir.trim(),expediente:exp,leido:leido,falta:falta,partidas:P}};
})(typeof window!=='undefined'?window:globalThis);
/* en la app: botón en el aviso de plano */
(function(){if(typeof document==='undefined')return;
 var TXT='';var pm=window.parseMediciones;window.parseMediciones=function(ls){try{TXT+=' '+(ls||[]).join(' ')}catch(e){}return pm.apply(this,arguments)};
 var la=window.leerArquitecto;window.leerArquitecto=function(){TXT='';return la.apply(this,arguments)};
 var BASE=null;function precio(fam){var F=BASE&&(BASE.familias||[]).find(function(x){return x.id===fam});if(!F||!(F.tipico>0))return null;var A=window.AJ||{};
  var z=A.recargoZona===''||A.recargoZona==null?15:Number(String(A.recargoZona).replace(',','.'))||0,s=Number(String(A.subidaPrecios||0).replace(',','.'))||0;return {p:Math.round(F.tipico*(1+z/100)*(1+s/100)*100)/100,f:'mercado + '+z+' % zona'}}
 window.planoPorCodigo=function(){var box=document.getElementById('codPlano');if(!box)return;var R=leerPlanoTexto(TXT);
  (window.basePrecios?basePrecios():Promise.resolve(null)).then(function(B){BASE=B;
   if(!R.partidas.length){box.innerHTML='<b style="color:#B3261E">De este plano no puedo sacar partidas:</b> no trae las medidas escritas, solo dibujadas'+(R.falta.length?' (me falta: '+arqEsc(R.falta.join('; '))+')':'')+'. Pide al arquitecto las mediciones (el listado de partidas) y con ese PDF te lo hago solo, o cuéntalo con tus palabras.';return}
   try{leer()}catch(_){}var sup=0;
   R.partidas.forEach(function(p){var pr=precio(p.familia);if(p.supuesto)sup++;cur.lineas.push({d:p.descripcion+(p.supuesto?' (supuesto: compruébalo)':''),q:p.cantidad,u:p.unidad,p:pr?pr.p:0,cap:p.capitulo,fuente:pr?pr.f:'',calculo:p.calculo})});
   var pon=function(id,v){var e=document.getElementById(id);if(e&&!e.value&&v)e.value=v};pon('f_dir',R.direccion);var fd=document.getElementById('f_dir');if(fd&&/·\s*Exp\.?/i.test(fd.value))fd.value=fd.value.replace(/\s*·\s*Exp\.?.*$/i,'').trim();pon('f_nom',R.obra);
   var o=document.getElementById('f_obs');if(o&&!o.value)o.value='Cantidades sacadas de las cotas escritas en el plano'+(R.expediente?' (exp. '+R.expediente+')':'')+': '+R.leido.join(', ')+'.'+(sup?' Las partidas marcadas como supuesto no vienen en el plano y hay que confirmarlas.':'')+' No incluye la comprobación de normativa ni el cálculo estructural.';
   try{renderLineas();leer();autoGuardar&&autoGuardar()}catch(_){}
   box.innerHTML='<b style="color:#1B6B36">Hecho: '+R.partidas.length+' partidas sacadas de lo que trae escrito el plano</b>, con su precio real. He leído: '+arqEsc(R.leido.join(', '))+'.'+(sup?' '+sup+' van marcadas como «supuesto» porque el plano no las dice: compruébalas.':'')+(R.falta.length?' <b>Me falta:</b> '+arqEsc(R.falta.join('; '))+'.':'')+' Cada partida lleva su cálculo: repásalas antes de mandarlo.';
   var tb=document.getElementById('tb');if(tb)tb.scrollIntoView({behavior:'smooth',block:'start'})})};
 var ra=window.renderArq;window.renderArq=function(){var r=ra.apply(this,arguments);try{var box=document.getElementById('arqPanel');var av=box&&box.querySelector('.aviso');
  if(av&&/es un plano/.test(av.textContent)&&!document.getElementById('codPlano')){var pl=document.getElementById('planoListo');if(pl)pl.remove();
   av.insertAdjacentHTML('afterbegin','<div id="codPlano" style="margin-bottom:10px"><b>Puedo sacarte el presupuesto de lo que trae escrito este plano</b>: medidas, elementos y materiales, con reglas fijas y precios reales.<div style="margin-top:8px"><button class="ok" type="button" onclick="planoPorCodigo()">Sacar el presupuesto del plano</button></div></div>');
   var ia=document.getElementById('iaPlano');if(ia)ia.remove()}}catch(e){}return r};
})();
