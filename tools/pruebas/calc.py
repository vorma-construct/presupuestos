import sys
sys.argv=['x',sys.argv[1],sys.argv[2]]
src=open('micro.py').read().split("fallos = []")[0]
exec(src)
from playwright.sync_api import sync_playwright
import re
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':412,'height':900});pg=ctx.new_page();rutas_pdf(pg);pg.on('dialog',lambda d:d.accept());pg.goto(URL);pg.wait_for_timeout(3500)
    r=pg.evaluate("""()=>{nuevo();document.getElementById('f_nom').value='Cliente de prueba';cur.lineas=[{d:'Partida A',q:12.35,u:'m2',p:19.99,ok:1},{d:'Partida B',q:3,u:'ud',p:0.335,ok:1},{d:'Partida C',q:7.777,u:'ml',p:12.5,ok:1}];renderLineas();
      var out=[];[21,10,0].forEach(function(iv){document.getElementById('f_iva').value=iv;calc();leer();
        var base=cur.lineas.reduce(function(a,l){return a+Math.round(num(l.q)*num(l.p)*100)/100},0);base=Math.round(base*100)/100;var iva=Math.round(base*iv)/100;
        out.push({iv:iv,base:base,iva:iva,tot:Math.round((base+iva)*100)/100,dom:[document.getElementById('t_base').textContent,document.getElementById('t_iva').textContent,document.getElementById('t_tot').textContent],doc:revisarDocumento()})});return out}""")
    for x in r: print(x)
    b.close()
