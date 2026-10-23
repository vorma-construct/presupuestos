"""Prueba del lector de correos con listas de trabajos (imagenes.js y buzon.js).

Uso: python3 tools/pruebas/correos.py [carpeta de la app] [tools/pruebas/correos_casos.json]

Cada caso se lee por los dos caminos que usa la app:
  - el del cuerpo del correo (buzon.js: analizar -> sus trabajos -> unirItems -> lineas, como montar)
  - el de las capturas y adjuntos (imagenes.js: aItems -> unirItems -> lineas)
y se comprueba que salen las partidas que deben salir (descripción, cantidad y unidad),
que no sale ninguna de las prohibidas y que no hay más partidas sin precio de las permitidas.
La última línea dice cuántos fallos hay.
"""
import sys, os, re, json, functools, threading, socket
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

AQUI = os.path.dirname(os.path.abspath(__file__))
APP = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(os.path.join(AQUI, '..', '..'))
CASOS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(AQUI, 'correos_casos.json')


class Callado(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def servidor():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); puerto = s.getsockname()[1]; s.close()
    h = ThreadingHTTPServer(('127.0.0.1', puerto), functools.partial(Callado, directory=APP))
    threading.Thread(target=h.serve_forever, daemon=True).start()
    return puerto


LEER = """(t)=>window.__motor.base().then(()=>{var out={};
  /* el correo, como lo lee el buzón de verdad (analizar), y el mismo texto como si llegara en una captura o un PDF */
  var a=window.__buzon?__buzon.analizar({asunto:'Presupuesto',texto:t,html:'',de:'Cliente <cliente@example.com>',adjuntos:[]}):null;
  var caminos=[['correo',a?a.T.items:null],['capturas',__motor.aItems(t).items]];
  caminos.forEach(function(z){if(!z[1])return;var u=__motor.unirItems([z[1]]).filter(function(x){return x&&x.length>=4}).slice(0,80);var R=__motor.lineas(u);
   out[z[0]]={items:u.length,lineas:R.lineas.map(function(x){return {d:String(x.d),q:x.q,u:x.u,p:x.p||0}})}});return out})"""


def compara(caso, r):
    F = []
    if caso.get('items') is not None and r['items'] != caso['items']:
        F.append('trabajos leídos %d, deben ser %d' % (r['items'], caso['items']))
    L = r['lineas']
    for e in caso.get('deben', []):
        ok = [l for l in L if re.search(e['d'], l['d']) and abs((l['q'] or 0) - e['q']) < 0.01 and (l['u'] or '') == e['u']]
        if not ok:
            casi = [l for l in L if re.search(e['d'], l['d'])]
            F.append('falta «%s» %s %s%s' % (e['d'], e['q'], e['u'], (' (sale %s %s)' % (casi[0]['q'], casi[0]['u'])) if casi else ''))
    for no in caso.get('no', []):
        fl = 0
        if no.startswith('(?i)'):
            no = no[4:]; fl = re.I
        for l in L:
            if re.search(no, l['d'], fl):
                F.append('sobra «%s»' % l['d'][:60])
    cero = [l for l in L if not l['p']]
    if caso.get('sin_precio_max') is not None and len(cero) > caso['sin_precio_max']:
        F.append('%d sin precio (máximo %d): %s' % (len(cero), caso['sin_precio_max'], '; '.join(l['d'][:40] for l in cero)))
    return F


def main():
    casos = json.load(open(CASOS, encoding='utf8'))
    puerto = servidor()
    fallos = 0
    with sync_playwright() as p:
        b = p.chromium.launch()
        for caso in casos:
            ctx = b.new_context()
            # sin Firebase: la prueba no toca la nube
            ctx.route('**/*', lambda r: r.abort() if any(k in r.request.url for k in ('firebase', 'gstatic', 'googleapis', 'firestore')) else r.continue_())
            pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept())
            emp = caso.get('empresa') or ''
            pg.goto('http://127.0.0.1:%d/index.html%s' % (puerto, ('?e=' + emp) if emp else '')); pg.wait_for_timeout(4000)
            R = pg.evaluate(LEER, caso['texto'])
            for camino, r in R.items():
                F = compara(caso, r)
                base = sum((l['q'] or 0) * (l['p'] or 0) for l in r['lineas'])
                print('%s [%s] %s: %d partidas, base %.2f €' % ('MAL' if F else 'BIEN', camino, caso['nombre'], len(r['lineas']), base))
                for f in F:
                    print('    - ' + f)
                fallos += 1 if F else 0
            ctx.close()
        b.close()
    print('correos: %d fallos de %d' % (fallos, len(casos) * 2))


if __name__ == '__main__':
    main()
