// Rehace los precios de arreglos/muxika.json con el mismo motor que usa la app (precios.js + precios.json + indice Eustat)
const fs=require('fs'),P=require('/home/claude/pres/cype.js');const {precioReal}=require('../precios.js');
const B=JSON.parse(fs.readFileSync(__dirname+'/../precios.json'));const I=JSON.parse(fs.readFileSync(__dirname+'/../indices.json'));
const f=I.meses[I.ultimo]/I.meses['2025-03'];
const arq={};P(fs.readFileSync('/home/claude/pres/presu.txt','utf8').split('\n')).forEach(p=>arq[p.code]=p);
const d=JSON.parse(fs.readFileSync(__dirname+'/../arreglos/muxika.json'));
d.presus.forEach(Pr=>{let b=0;Pr.lineas.forEach(l=>{const a=arq[l.code];let R;
  if(a)R=precioReal(B,{t:a.corto,u:a.u,q:l.q,pa:a.pa,indice:f});
  else if(!/^Suministro de contenedor/.test(l.d)){R=precioReal(B,{t:l.d,u:l.u,q:l.q,pa:0,indice:f});if(R&&R.p<l.p)R=null}
  if(R){l.p=R.p;l.fuente=R.fuente}else if(!l.fuente)l.fuente=/contenedor/.test(l.d)?'tarifa del albañil':'calculado del arquitecto al día + 19 %';
  b+=Math.round(l.q*l.p*100)/100});
  console.log(Pr.nom,b.toFixed(2),'con IVA',(b+Math.round(b*21)/100).toFixed(2));
  Pr.lineas.forEach(l=>console.log('  ',(l.code||'').padEnd(11),String(l.q).padStart(6),l.u.padEnd(3),String(l.p).padStart(8),'|',l.fuente,'|',l.d.slice(0,45)))});
fs.writeFileSync(__dirname+'/../arreglos/muxika.json',JSON.stringify(d,null,1));
