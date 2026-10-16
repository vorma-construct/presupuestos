import sys
sys.argv=['x','/home/claude/vorma','vorma']
src=open('micro.py').read()
src=src.split("fallos = []")[0]
exec(src)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':412,'height':900},is_mobile=True,has_touch=True);ctx.add_init_script(FAKE)
    pg=ctx.new_page();rutas_pdf(pg);pg.on('dialog',lambda d:d.accept());pg.goto(URL);pg.wait_for_timeout(3500)
    pg.evaluate("()=>{nuevo();document.getElementById('dictado').value='';window.__sesiones=[[{'fin':'baño completo de cuatro metros con plato de ducha'}],[{'fin':'y cambiar cinco puertas'}]]}")
    pg.evaluate("()=>window.dictar()");pg.wait_for_timeout(2200)
    a=pg.evaluate("()=>({n:cur.lineas.length,p:pendientesCosas().length})");print('tras el corte:',a)
    pg.evaluate("()=>{var pk=cur.paqs[0];pendTodo(pk.id)}");pg.wait_for_timeout(400)
    print('contestado:',pg.evaluate("()=>({n:cur.lineas.length,p:pendientesCosas().length})"))
    pg.evaluate("()=>{var b=document.getElementById('btnVoz');(b.onclick||window.dictar)()}");pg.wait_for_timeout(2500)
    print('sigue dictando:',pg.evaluate("()=>({n:cur.lineas.length,p:pendientesCosas().map(x=>x.t+':'+(x.k||'')),t:document.getElementById('dictado').value,ids:cur.lineas.map(l=>l.tid||'?')})"))
    b.close()
