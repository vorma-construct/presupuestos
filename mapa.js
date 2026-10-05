/* Mapa de la obra en el presupuesto: grande, con el punto en el color de la empresa y su logo encima.
   Y el PDF / el enlace al cliente esperan a que el mapa esté hecho (antes salía casi siempre sin él). */
(function(){
var T=256;
function color(){try{return (getComputedStyle(document.documentElement).getPropertyValue('--brick')||'#D7481D').trim()||'#D7481D'}catch(e){return '#D7481D'}}
function carga(src){return new Promise(function(ok){if(!src)return ok(null);var im=new Image();im.onload=function(){ok(im)};im.onerror=function(){ok(null)};im.src=src})}
window.mapaImagen=function(lat,lon,z){z=z||16;return new Promise(function(ok){
 var W=4,H=2,cx=lon2x(lon,z),cy=lat2y(lat,z);var cv=document.createElement('canvas');cv.width=W*T;cv.height=H*T;var c=cv.getContext('2d');
 c.fillStyle='#ECEAE6';c.fillRect(0,0,cv.width,cv.height);
 var x0=Math.floor(cx-W/2),y0=Math.floor(cy-H/2),offx=(cx-x0)*T-cv.width/2,offy=(cy-y0)*T-cv.height/2,pend=(W+1)*(H+1),malos=0;
 var fin=function(){if(--pend>0)return;if(malos>(W+1)*(H+1)/2)return ok(null);
  /* un velo blanco suave para que el mapa no compita con el presupuesto */
  c.fillStyle='rgba(255,255,255,.18)';c.fillRect(0,0,cv.width,cv.height);
  var px=cv.width/2,py=cv.height/2+36,col=color();
  /* sombra y chincheta */
  c.save();c.fillStyle='rgba(0,0,0,.22)';c.beginPath();c.ellipse(px,py+4,16,6,0,0,Math.PI*2);c.fill();c.restore();
  c.fillStyle=col;c.beginPath();c.arc(px,py-30,20,Math.PI,0);c.bezierCurveTo(px+20,py-14,px+6,py-6,px,py);c.bezierCurveTo(px-6,py-6,px-20,py-14,px-20,py-30);c.fill();
  c.fillStyle='#fff';c.beginPath();c.arc(px,py-30,7.5,0,Math.PI*2);c.fill();
  /* el logo de la empresa en una tarjeta blanca encima del punto */
  carga(window.LOGO_T||window.LOGO).then(function(lg){
   if(lg){var bh=150,bw=Math.min(300,Math.max(110,bh*lg.width/lg.height+28)),bx=px-bw/2,by=py-30-24-bh-14;
    c.save();c.shadowColor='rgba(0,0,0,.25)';c.shadowBlur=18;c.shadowOffsetY=4;c.fillStyle='#fff';
    var r=14;c.beginPath();c.moveTo(bx+r,by);c.arcTo(bx+bw,by,bx+bw,by+bh,r);c.arcTo(bx+bw,by+bh,bx,by+bh,r);c.arcTo(bx,by+bh,bx,by,r);c.arcTo(bx,by,bx+bw,by,r);c.closePath();c.fill();c.restore();
    c.fillStyle='#fff';c.beginPath();c.moveTo(px-11,by+bh-1);c.lineTo(px+11,by+bh-1);c.lineTo(px,by+bh+12);c.closePath();c.fill();
    var ih=bh-22,iw=Math.min(bw-24,ih*lg.width/lg.height);c.drawImage(lg,px-iw/2,by+11+(ih-iw*lg.height/lg.width)/2,iw,iw*lg.height/lg.width)}
   c.fillStyle='rgba(255,255,255,.85)';c.fillRect(cv.width-150,cv.height-18,150,18);c.fillStyle='#555';c.font='11px sans-serif';c.fillText('© OpenStreetMap',cv.width-140,cv.height-5);
   try{ok(cv.toDataURL('image/jpeg',0.88))}catch(e){ok(null)}})};
 for(var i=0;i<=W;i++)for(var j=0;j<=H;j++)(function(i,j){var im=new Image();im.crossOrigin='anonymous';im.onload=function(){c.drawImage(im,i*T-offx,j*T-offy);fin()};im.onerror=function(){malos++;fin()};im.src=tileURL(x0+i,y0+j,z)})(i,j)})};
/* el bloque del mapa en el presupuesto */
(function(){var s=document.createElement('style');s.textContent='#p_mapa{margin-top:7mm!important;page-break-inside:avoid;break-inside:avoid}#p_mapa>div:first-child{font-weight:700;color:#141414!important;font-size:11px!important;text-transform:uppercase;letter-spacing:1px;margin-bottom:2mm!important}#p_mapaimg{max-height:none!important;height:70mm;border-radius:3mm!important;border:0!important;box-shadow:0 1px 0 rgba(0,0,0,.06)}#p_mapatxt{font-size:11.5px!important;margin-top:2mm!important;color:#3a3733}';document.head.appendChild(s)})();
/* esperar al mapa antes de sacar el PDF o mandar el enlace (como mucho unos segundos) */
var pm0=window.pintarMapaDoc,ultimo=null;
window.pintarMapaDoc=function(){ultimo=Promise.resolve(pm0.apply(this,arguments)).catch(function(){});return ultimo};
function esperaMapa(ms){var t=new Promise(function(ok){setTimeout(ok,ms||7000)});return Promise.race([ultimo||Promise.resolve(),t])}
var pdf0=window.pdfSinMargenes;if(pdf0)window.pdfSinMargenes=function(){var a=arguments,self=this;try{pintarDocs()}catch(_){}return esperaMapa().then(function(){return pdf0.apply(self,a)})};
var mf0=window.mandarFirma;if(mf0)window.mandarFirma=function(){var a=arguments,self=this;if(window.__mapaListo)return mf0.apply(self,a);try{pintarDocs()}catch(_){}
 var m=document.getElementById('msg');if(m)m.textContent='Preparando el presupuesto…';return esperaMapa().then(function(){window.__mapaListo=true;try{return mf0.apply(self,a)}finally{window.__mapaListo=false}})};
})();
