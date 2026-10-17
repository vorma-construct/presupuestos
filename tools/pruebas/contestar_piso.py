"""Reforma integral: lo que se contesta para toda la casa («Suelo: tarima nueva», «Paredes: quitar gotelé y pintar», «Solo pintar»)
no repite lo dicho ya en una estancia. Dicta en la página de verdad, PULSA el botón de la respuesta y mira lo que suma cada partida.
Uso: python3 tools/pruebas/contestar_piso.py [raíz de la app] [casos.json]   (sale con código 1 si algo falla)"""
import sys, os, json, functools, threading, socket
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
AQUI = os.path.dirname(os.path.abspath(__file__))
raiz = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(AQUI))
casos = json.load(open(sys.argv[2] if len(sys.argv) > 2 else os.path.join(AQUI, 'contestar_piso.json'), encoding='utf-8'))
class C(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
h = ThreadingHTTPServer(('127.0.0.1', port), functools.partial(C, directory=raiz)); threading.Thread(target=h.serve_forever, daemon=True).start()
LINEAS = "()=>{leer();var T=tarifa();return cur.lineas.map(function(l){var d=String(l.d||'');return {id:l.tid||(T.find(function(x){return d===x.d||d.indexOf(x.d+' — ')===0})||{}).id||'',q:num(l.q),d:d}})}"
PULSA = """(a)=>{var b=[].slice.call(document.querySelectorAll('button')).filter(function(x){var o=x.getAttribute('onclick')||'';return /pendResp\\(|paqResp\\(/.test(o)&&o.indexOf("'"+a[0]+"'")>-1&&(typeof a[1]==='string'?o.indexOf('"'+a[1]+'"')>-1:o.indexOf("'"+a[0]+"',"+a[1]+")")>-1)});if(!b.length)return false;b[0].click();return true}"""
fallos = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.on('dialog', lambda d: d.accept())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:150]))
    pg.goto('http://127.0.0.1:%d/index.html' % port); pg.wait_for_timeout(2500)
    pg.evaluate("()=>{try{localStorage.setItem('vr_guia_off','1');var g=document.getElementById('guiaCapa');if(g)g.classList.remove('on')}catch(e){}}")
    for n, c in enumerate(casos, 1):
        pg.evaluate("(t)=>{nuevo();document.getElementById('dictado').value=t;convertir()}", c['t']); pg.wait_for_timeout(900)
        F = []
        for k, v in c.get('resp', []):
            if not pg.evaluate(PULSA, [k, v]): F.append('no está el botón %s=%s' % (k, v))
            pg.wait_for_timeout(500)
        L = pg.evaluate(LINEAS)
        for i, q in c.get('total', {}).items():
            tot = round(sum(l['q'] for l in L if l['id'] == i), 2)
            if abs(tot - q) > 0.6: F.append('«%s» suma %s y debería %s (%s)' % (i, tot, q, [(l['q'], l['d'].split(' — ')[1] if ' — ' in l['d'] else 'casa') for l in L if l['id'] == i]))
        print('%s %d %s' % ('MAL' if F else 'bien', n, c['t'][:90]))
        for x in F: print('   !! ' + x)
        fallos += ['%d: %s' % (n, x) for x in F]
    b.close()
if errs: fallos.append('errores de la página: %s' % errs[:3])
print('\n%d de %d casos con fallos' % (len(set(x.split(':')[0] for x in fallos)), len(casos)))
sys.exit(1 if fallos else 0)
