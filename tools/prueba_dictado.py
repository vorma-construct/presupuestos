"""Pasa frases de dictado por la app (como si se escribieran en «Cuéntame lo que quiere el cliente») y saca lo que monta.
Sirve para enseñar palabras nuevas sin romper las que ya entiende: se pasa ANTES y DESPUÉS del cambio y se comparan.
Uso:  python3 tools/prueba_dictado.py [frases.json] [empresa] > salida.txt
      (por defecto tools/frases_prueba.json y la empresa lucas; «vorma» = la app de Vorma)
Sale con código 1 si la página da algún error. No usa la nube: todo en local."""
import asyncio, json, os, sys, threading, functools, socket
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRASES = json.load(open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, 'tools', 'frases_prueba.json'), encoding='utf-8'))
EMP = sys.argv[2] if len(sys.argv) > 2 else 'lucas'


class Callado(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def servidor():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close()
    h = ThreadingHTTPServer(('127.0.0.1', p), functools.partial(Callado, directory=RAIZ))
    threading.Thread(target=h.serve_forever, daemon=True).start()
    return h, p


async def main():
    h, puerto = servidor()
    errores = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844},
                                  user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148')
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errores.append(str(e)))
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await pg.route('**/*firebase*/**', lambda r: r.abort())
        url = f'http://127.0.0.1:{puerto}/index.html' + ('' if EMP == 'vorma' else f'?e={EMP}')
        await pg.goto(url, wait_until='domcontentloaded')
        await pg.wait_for_timeout(4000)
        for t in FRASES:
            r = await pg.evaluate("""t=>{nuevo();document.getElementById('dictado').value=t;convertir();
              return new Promise(res=>setTimeout(()=>{var ci=document.getElementById('convInfo');
                res({lineas:(cur.lineas||[]).map(l=>[String(l.d).slice(0,80),l.q,l.u||'',l.p]),
                     info:ci?ci.innerText.replace(/\\s+/g,' ').slice(0,300):''})},1500))}""", t)
            print('\n>>', t)
            for l in r['lineas']:
                print('   ', l)
            if r['info']:
                print('    [dice]', r['info'])
        await b.close()
    h.shutdown()
    print('\nerrores de la página:', errores[:5])
    sys.exit(1 if errores else 0)

asyncio.run(main())
