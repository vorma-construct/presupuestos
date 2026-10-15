"""La prueba de la demo que salió mal (octubre 2026): se dicta con el micro (de mentira) como en un móvil y se comprueba
que la app no se lía. Hay que pasarla antes de publicar cada versión:  python3 tools/prueba_demo.py [empresa]
Comprueba:
  1. «Quiero hacer una reforma de una casa y quitar el gotelé de una casa de 90 metros cuadrados y reformar dos baños
     de 4 metros cuadrados» → el gotelé de la casa (243 m² de pared) y dos baños de 4 m², sin el piso entero ni baños de más.
  2. Lo mismo con los números en letra («noventa», «cuatro»).
  3. El micro de Android que devuelve cada vez todo desde el principio, y el del iPhone que repite la frase: sale lo mismo.
  4. Dictarlo dos veces en el mismo presupuesto: la segunda no se mete («Esto ya lo has dictado»).
  5. Lo que se dice después se suma sin repetir lo de antes.
  6. Presupuesto nuevo: el cuadro del dictado empieza vacío.
  7. Una medida disparatada (un baño de 194 m²) sale avisada en rojo.
Sale con código 1 si algo no cuadra. No usa la nube: todo en local."""
import asyncio, json, os, sys, threading, functools, socket
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMP = sys.argv[1] if len(sys.argv) > 1 else 'vorma'

JS = r"""async()=>{
 var tot=()=>Math.round(cur.lineas.reduce((a,l)=>a+num(l.q)*num(l.p),0));var out={};
 var mk=(t,fin)=>({0:{transcript:t},isFinal:fin,length:1});
 function falso(escena){return function(){var self=this;this.start=function(){var k=0;var paso=function(){if(k<escena.length){var ev=escena[k++];self.onresult({resultIndex:0,results:ev.map(x=>mk(x[0],x[1]))});setTimeout(paso,30)}else{self.onend()}};setTimeout(paso,30)};this.stop=function(){}}}
 navigator.mediaDevices.getUserMedia=()=>Promise.resolve({getTracks:()=>[]});
 var A1='Quiero hacer una reforma de una casa',A2='y quitar el gotelé de una casa de 90 metros cuadrados',A3='y reformar dos baños de 4 metros cuadrados';
 var ta=document.getElementById('dictado'),info=()=>document.getElementById('convInfo').innerText.replace(/\s+/g,' ');
 var espera=()=>new Promise(r=>setTimeout(r,2500));
 var foto=()=>({lineas:cur.lineas.length,total:tot(),gotele:(cur.lineas.find(l=>/^Lijado y decapado/.test(l.d))||{}).q||0,
   banos:(cur.paqs||[]).filter(p=>p.tipo==='bano').map(p=>p.suelo),pisos:(cur.paqs||[]).filter(p=>p.tipo==='piso').length,dice:info().slice(0,120)});
 async function voz(escena){window.SpeechRecognition=falso(escena);document.getElementById('btnVoz').click();await espera()}
 async function prueba(nombre,escena){nuevo();await voz(escena);out[nombre]=foto()}
 await prueba('normal',[[[A1,true]],[[A1,true],[A2,true]],[[A1,true],[A2,true],[A3,true]]]);
 await prueba('en_letra',[[['Quiero hacer una reforma de una casa y quitar el gotelé de una casa de noventa metros cuadrados y reformar dos baños de cuatro metros cuadrados',true]]]);
 await prueba('android_acumula',[[[A1,true]],[[A1,true],[A1+' '+A2,true]],[[A1,true],[A1+' '+A2,true],[A1+' '+A2+' '+A3,true]]]);
 await prueba('iphone_repite',[[[A1+' '+A2+' '+A3,true]],[[A1+' '+A2+' '+A3,true],[A1+' '+A2+' '+A3,true]]]);
 nuevo();await voz([[[A1+' '+A2+' '+A3,true]]]);var p1=foto();await voz([[[A1+' '+A2+' '+A3,true]]]);out.dos_veces={primero:p1,segundo:foto()};
 await voz([[['y pintar las paredes de la cocina de 10 metros',true]]]);out.y_luego=foto();
 nuevo();out.nuevo_vacio={cuadro:ta.value,dice:info()};
 nuevo();ta.value='reformar un baño de 194 metros cuadrados';convertir();await espera();out.disparate=foto();
 return out}"""


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
        ctx = await b.new_context(viewport={'width': 390, 'height': 844})
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errores.append(str(e)))
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await pg.route('**/*firebase*/**', lambda r: r.abort())
        url = f'http://127.0.0.1:{puerto}/index.html' + ('' if EMP == 'vorma' else f'?e={EMP}')
        await pg.goto(url, wait_until='domcontentloaded')
        await pg.wait_for_timeout(4000)
        r = await pg.evaluate(JS)
        await b.close()
    h.shutdown()
    mal = []
    base = r['normal']
    if not (base['pisos'] == 0 and base['banos'] == [4, 4] and abs(base['gotele'] - 243) < 1):
        mal.append('1. la frase de la demo no sale como debe: %s' % json.dumps(base, ensure_ascii=False))
    for k in ('en_letra', 'android_acumula', 'iphone_repite'):
        if (r[k]['lineas'], r[k]['total']) != (base['lineas'], base['total']):
            mal.append('%s: sale distinto que dictado normal: %s' % (k, json.dumps(r[k], ensure_ascii=False)))
    d = r['dos_veces']
    if (d['segundo']['lineas'], d['segundo']['total']) != (d['primero']['lineas'], d['primero']['total']) or 'ya lo has dictado' not in d['segundo']['dice']:
        mal.append('4. dictado dos veces: se ha metido otra vez: %s' % json.dumps(d, ensure_ascii=False))
    if not (0 < r['y_luego']['lineas'] - d['segundo']['lineas'] <= 3):
        mal.append('5. lo que se dice después no se ha sumado bien: %s' % json.dumps(r['y_luego'], ensure_ascii=False))
    if r['nuevo_vacio']['cuadro'] or r['nuevo_vacio']['dice']:
        mal.append('6. presupuesto nuevo con el dictado anterior: %s' % json.dumps(r['nuevo_vacio'], ensure_ascii=False))
    if 'no cuadra' not in r['disparate']['dice']:
        mal.append('7. el baño de 194 m² no sale avisado: %s' % json.dumps(r['disparate'], ensure_ascii=False))
    if errores:
        mal.append('errores de la página: %s' % errores[:3])
    print('Demo (%s): %d líneas, %s € sin IVA (gotelé %s m², baños %s)' % (EMP, base['lineas'], base['total'], base['gotele'], base['banos']))
    print('\n'.join(mal) if mal else 'TODO BIEN')
    sys.exit(1 if mal else 0)

asyncio.run(main())
