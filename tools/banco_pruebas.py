"""Banco de pruebas masivo del dictado: mete cientos o miles de dictados en la app de verdad (como si se dictaran en
«Cuéntame lo que quiere el cliente») y comprueba SOLO cada resultado. Se pasa antes de publicar cualquier cambio del dictado.

Uso:
  python3 tools/banco_pruebas.py frases.json [vorma|lucas] [--variantes] [--hilos N] [--salida informe.json]

frases.json: lista de {"t": texto, "debe": [ids], "no_debe": [ids], "estancias": {"bano":[m2], "cocina":[m2], "hab":[m2], "piso": m2},
                       "cantidades": {id: cantidad}, "fuera": [trabajos fuera de tarifa],
                       "lugares": {id: [estancias]}, "sin_lugar": [ids]}  (también vale una lista de textos sueltos)

Comprueba en cada dictado:
  · que la página no da ningún error
  · que sale cada trabajo de "debe" y ninguno de "no_debe"
  · que las estancias dichas salen con sus metros (y que no hay estancias de más)
  · las cantidades dichas
  · que nada va a 1 m² si se dijo la medida, que no hay partidas repetidas y que cada partida de una estancia dice de cuál es
  · que el total tiene sentido (ni disparates ni cero)
  · que el documento del cliente (el PDF) lleva todas las partidas, la base y el total
Con --variantes, además, cada dictado se dice de otras formas (números en letra o en cifras, sin comas, todo repetido dos veces,
con muletillas, en minúsculas y sin tildes) y TIENE que salir exactamente lo mismo.
Sale con código 1 si algo falla. No usa la nube: todo en local."""
import asyncio, json, os, sys, re, threading, functools, socket, random, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.async_api import async_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
FRASES = json.load(open(args[0], encoding='utf-8'))
EMP = args[1] if len(args) > 1 and not args[1].startswith('--') else 'vorma'
VARIANTES = '--variantes' in args
HILOS = int(args[args.index('--hilos') + 1]) if '--hilos' in args else 6
SALIDA = args[args.index('--salida') + 1] if '--salida' in args else None
LIBS = os.environ.get('LIBS_PDF', '')  # carpeta con jspdf/html2canvas si no hay internet

FRASES = [f if isinstance(f, dict) else {'t': f} for f in FRASES]

# ---------- las otras formas de decir lo mismo ----------
UNID = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece',
        'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós',
        'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve']
DEC = {30: 'treinta', 40: 'cuarenta', 50: 'cincuenta', 60: 'sesenta', 70: 'setenta', 80: 'ochenta', 90: 'noventa'}
CEN = {100: 'ciento', 200: 'doscientos', 300: 'trescientos', 400: 'cuatrocientos', 500: 'quinientos'}


def en_letra(n):
    n = int(n)
    if n < 30: return UNID[n]
    if n < 100:
        d, u = n // 10 * 10, n % 10
        return DEC[d] + (' y ' + UNID[u] if u else '')
    if n == 100: return 'cien'
    if n < 600:
        c, r = n // 100 * 100, n % 100
        return CEN[c] + (' ' + en_letra(r) if r else '')
    return str(n)


UNIDADES = r'(?:m2|m²|metros cuadrados|metros|metro|mts|m\b|x\b|por\b|puertas?|radiadores?|baños?|de largo|de ancho|de alto)'


def a_letra(t):
    """las medidas en cifras pasan a letra («4 metros» → «cuatro metros», «3x2» → «tres por dos», «2,5 metros» → «dos metros y medio»)"""
    t = re.sub(r'(\d+)[.,]5\s*(metros?|m\b)', lambda m: en_letra(m.group(1)) + ' ' + m.group(2) + ' y medio', t)
    t = re.sub(r'(\d+)\s*[xX]\s*(\d+)', lambda m: en_letra(m.group(1)) + ' por ' + en_letra(m.group(2)), t)
    t = re.sub(r'\b(\d{1,3})(?=\s*' + UNIDADES + ')', lambda m: en_letra(m.group(1)) if int(m.group(1)) < 600 else m.group(1), t)
    return t


def variantes(t):
    v = {}
    letra = a_letra(t)
    if letra != t: v['en letra'] = letra
    sin = re.sub(r'(?<!\d)\s*[,.;:]\s*|\s*[,.;:]\s*(?!\d)', ' ', t).strip()  # sin comas (las de los decimales se quedan: «4,5»)
    if sin != t: v['sin comas'] = sin
    v['dicho dos veces'] = t.rstrip('. ') + ' ' + t
    v['con muletillas'] = 'pues mira ' + re.sub(r'(?<!\d),\s*|,\s+', ', eh, ', t, count=1)
    plano = t.lower()
    for a, b in zip('áéíóú', 'aeiou'): plano = plano.replace(a, b)
    if plano != t: v['minúsculas sin tildes'] = plano
    return v


# ---------- la app ----------
class Callado(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def servidor():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close()
    h = ThreadingHTTPServer(('127.0.0.1', p), functools.partial(Callado, directory=RAIZ))
    threading.Thread(target=h.serve_forever, daemon=True).start()
    return h, p


JS = r"""async (t)=>{
 var err0=(window.__errs||[]).length;
 nuevo();document.getElementById('dictado').value=t;
 try{convertir()}catch(e){return {fallo:'convertir: '+e.message}}
 await new Promise(r=>setTimeout(r,450));
 var T=tarifa(),idDe=function(l){if(l.tid)return l.tid;var d=String(l.d||'');var x=T.find(function(t){return t.d===d||d.indexOf(t.d+' — ')===0});return x?x.id:''};
 var PE={};try{(window.pendientes?pendientes():[]).forEach(function(x){PE[x.i]=x.t})}catch(e){}
 var L=(cur.lineas||[]).map(function(l,i){return {id:idDe(l),d:String(l.d||''),q:num(l.q),u:l.u||'',p:num(l.p),paq:l.paqId||'',fb:!!l.fb,pend:PE[i]||''}});
 var P=(cur.paqs||[]).filter(function(pk){return cur.lineas.some(function(l){return l.paqId===pk.id})}).map(function(pk){return {id:pk.id,tipo:pk.tipo,suelo:pk.suelo||0,calc:!!pk.calculado,padre:pk.padre||'',n:pk.n||1}});
 var rev={E:[],A:[]};try{rev=revisar(false,true)}catch(e){rev.E=['revisar: '+e.message]}
 var doc=[];try{doc=revisarDocumento()}catch(e){doc=['documento: '+e.message]}
 var ci=document.getElementById('convInfo');
 return {L:L,P:P,E:rev.E,A:rev.A,doc:doc,info:ci?ci.innerText.replace(/\s+/g,' ').slice(0,400):'',errs:(window.__errs||[]).slice(err0)}}"""


async def trabajador(ctx, url, cola, res):
    pg = await ctx.new_page()
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
    await pg.add_init_script("window.__errs=[];window.addEventListener('error',function(e){window.__errs.push(String(e.message||e))});")
    if os.environ.get('ESC_SP'):  # prueba: la escena también en dictados sin puntos
        await pg.add_init_script('window.__escSP=true;')
    if os.environ.get('SIN_ESCENA'):  # para comparar con el intérprete de antes (sin la escena)
        await pg.add_init_script("window.__sinEscena=true;")
    await pg.goto(url, wait_until='domcontentloaded')
    await pg.wait_for_timeout(3500)
    while True:
        try:
            k, t = cola.get_nowait()
        except asyncio.QueueEmpty:
            break
        try:
            r = await pg.evaluate(JS, t)
        except Exception as e:
            r = {'fallo': 'página: ' + str(e)[:200]}
        res[k] = r
    await pg.close()


async def correr(textos):
    h, puerto = servidor()
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844})
        await ctx.route('**/*firebase*/**', lambda r: r.abort())
        await ctx.route('**/*gstatic*/**', lambda r: r.abort())
        if LIBS:
            await ctx.route('**/cdnjs.cloudflare.com/ajax/libs/jspdf/**', lambda r: asyncio.ensure_future(r.fulfill(path=os.path.join(LIBS, 'jspdf-2.5.1/package/dist/jspdf.umd.min.js'), content_type='application/javascript')))
            await ctx.route('**/cdnjs.cloudflare.com/ajax/libs/html2canvas/**', lambda r: asyncio.ensure_future(r.fulfill(path=os.path.join(LIBS, 'html2canvas-1.4.1/package/dist/html2canvas.min.js'), content_type='application/javascript')))
        url = f'http://127.0.0.1:{puerto}/index.html' + ('' if EMP == 'vorma' else f'?e={EMP}')
        cola = asyncio.Queue()
        for k, t in textos.items():
            cola.put_nowait((k, t))
        await asyncio.gather(*[trabajador(ctx, url, cola, res) for _ in range(HILOS)])
        await b.close()
    h.shutdown()
    return res


# ---------- las comprobaciones ----------
NOMBRE = {'bano': 'baño', 'cocina': 'cocina', 'hab': 'habitación'}


def huella(r):
    """lo que tiene que salir igual se diga como se diga: las partidas (sin el orden) y las estancias"""
    if 'fallo' in r: return ('fallo',)
    L = sorted((l['id'] or l['d'][:60], round(l['q'], 1), l['u'], round(l['p'], 2)) for l in r['L'])
    P = sorted((p['tipo'], round(p['suelo'], 1)) for p in r['P'])
    return (tuple(L), tuple(P))


def tipo_fallo(m):
    """de qué clase es un fallo: lo que cambia el alcance o el dinero va primero"""
    if m.startswith('sobra'): return 'inventado'
    if m.startswith('falta') and 'cantidad' not in m: return 'omitido'
    if 'no ha sacado nada' in m: return 'omitido'
    if m.startswith('sin medida'): return 'cantidad inventada'
    if 'pendiente' in m: return 'pendiente'
    if 'no dice que es de' in m or 'sale como de' in m or 'sin su estancia' in m: return 'etiqueta'
    if 'total' in m or 'precio' in m or '€' in m: return 'precio'
    if 'documento' in m: return 'documento'
    if ': sale distinto' in m: return 'variante'
    return 'cantidad'


ORDEN_TIPOS = ['inventado', 'omitido', 'cantidad inventada', 'cantidad', 'precio', 'pendiente', 'documento', 'etiqueta', 'variante']


def comprobar(f, r):
    fallos = []
    if 'fallo' in r:
        return [r['fallo']]
    if r.get('errs'): fallos.append('error en la página: ' + '; '.join(r['errs'][:2]))
    L, P = r['L'], r['P']
    ids = {l['id'] for l in L}
    if not L and (f.get('debe') or f.get('estancias')):
        fallos.append('no ha sacado nada')
    for i in f.get('debe', []):
        if i not in ids: fallos.append('falta «%s»' % i)
    for i in f.get('no_debe', []):
        if i in ids: fallos.append('sobra «%s»' % i)
    for grupo in f.get('uno_de', []):
        if not any(i in ids for i in grupo): fallos.append('falta uno de %s' % grupo)
    est = f.get('estancias') or {}
    for tipo in ('bano', 'cocina', 'hab'):
        dichos = sorted(float(x) for x in (est.get(tipo) or []) if x)
        if not dichos: continue
        hay = sorted(round(p['suelo'], 1) for p in P if p['tipo'] == tipo and not p['calc'])
        # habitaciones de trabajos sueltos («pintar el salón de 20 metros»): sus metros se miran en las cantidades
        if tipo == 'hab' and not any(p['tipo'] == 'hab' for p in P): continue
        for m in dichos:
            if not any(abs(m - x) < 0.15 for x in hay):
                fallos.append('%s de %s m² no sale con sus metros (salen: %s)' % (NOMBRE[tipo], m, hay or 'ninguno'))
        if len([p for p in P if p['tipo'] == tipo]) > max(len(dichos), 1) and tipo != 'hab':
            fallos.append('salen %d %s y se dijeron %d' % (len([p for p in P if p['tipo'] == tipo]), NOMBRE[tipo] + 's', len(dichos)))
    if est.get('piso'):
        pi = [p for p in P if p['tipo'] == 'piso']
        if not pi or abs(pi[0]['suelo'] - float(est['piso'])) > 0.5:
            fallos.append('la casa de %s m² no sale con sus metros' % est['piso'])
    for i, q in (f.get('cantidades') or {}).items():
        qs = [l['q'] for l in L if l['id'] == i]
        if qs and not any(abs(x - float(q)) < 0.15 for x in qs) and abs(sum(qs) - float(q)) > 0.15:
            fallos.append('«%s» con %s y se dijo %s' % (i, qs, q))
        if not qs and i not in f.get('debe', []):
            fallos.append('falta «%s» (cantidad %s)' % (i, q))
    # «sin_medida»: [ids] — no se dijo cuánto: tiene que quedar pendiente, no un número inventado
    for i in f.get('sin_medida', []):
        for l in L:
            if l['id'] == i and not l.get('pend') and l['u'] in ('m2', 'm²', 'ml'):
                fallos.append('sin medida «%s»: puso %s %s sin que se dijera' % (i, l['q'], l['u'])); break
    # «lugares»: {id: ["salón", "pasillo"]} — entre las partidas de ese trabajo salen esas estancias
    import unicodedata
    def _n(x): return ''.join(c for c in unicodedata.normalize('NFD', x.lower()) if unicodedata.category(c) != 'Mn')
    for i, sitios in (f.get('lugares') or {}).items():
        tags = ' '.join(_n(l['d'].split(' — ', 1)[1]) for l in L if l['id'] == i and ' — ' in l['d'])
        for s_ in sitios:
            if _n(s_) not in tags: fallos.append('«%s» no dice que es de %s' % (i, s_))
    # «sin_lugar»: [ids] — son de toda la casa, no de una estancia
    for i in f.get('sin_lugar', []):
        for l in L:
            if l['id'] == i and ' — ' in l['d'] and not l['paq']: fallos.append('«%s» sale como de %s' % (i, l['d'].split(' — ', 1)[1][:30])); break
    # nada a un metro si la estancia tiene metros
    for p in P:
        if p['suelo'] > 0:
            unos = [l['d'][:50] for l in L if l['paq'] == p['id'] and l['u'] in ('m2', 'm²') and abs(l['q'] - 1) < 1e-9 and abs(p['suelo'] - 1) > 1e-9]
            if unos: fallos.append('%s con metros pero partidas a 1 m²: %s' % (p['tipo'], unos[:2]))
    # repetidas de verdad
    vist = {}
    for l in L:
        k = (l['d'], l['u'], round(l['q'], 2))
        if k in vist: fallos.append('partida repetida: «%s»' % l['d'][:60])
        vist[k] = 1
    # cada partida de una estancia dice de cuál es (si hay más de una estancia)
    tiposP = [p for p in P if p['tipo'] in ('bano', 'cocina', 'hab')]
    if len(tiposP) >= 1:
        for l in L:
            pk = next((p for p in P if p['id'] == l['paq']), None)
            if pk and pk['tipo'] in ('bano', 'cocina', 'hab') and l['id'] not in ('con', 'limf') and ' — ' not in l['d']:
                fallos.append('partida sin su estancia: «%s»' % l['d'][:60]); break
    # total con sentido
    tot = sum(l['q'] * l['p'] for l in L)
    # lo que no está en la tarifa entra a cero para poner el precio: eso no es un fallo
    if L and tot <= 0 and not all(l['fb'] or l['p'] <= 0 or l.get('pend') for l in L): fallos.append('total a cero')
    sup = float(est.get('piso') or 0) + sum(float(x) for t in ('bano', 'cocina', 'hab') for x in (est.get(t) or []))
    if tot > 150000: fallos.append('total disparatado: %.0f €' % tot)
    if est.get('piso') and tot / float(est['piso']) > 1500: fallos.append('casa a %.0f €/m²' % (tot / float(est['piso'])))
    for l in L:
        if l['u'] in ('m2', 'm²', 'ml') and l['q'] > 1200: fallos.append('cantidad disparatada: «%s» %s %s' % (l['d'][:40], l['q'], l['u']))
        if l['u'] == 'ud' and l['q'] > 40: fallos.append('unidades disparatadas: «%s» %s' % (l['d'][:40], l['q']))
    # el documento del cliente
    for d in r.get('doc') or []:
        if 'nombre del cliente' in d or 'dirección' in d: continue
        fallos.append('documento: ' + d)
    return fallos


def main():
    t0 = time.time()
    textos = {}
    for i, f in enumerate(FRASES):
        textos[(i, 'tal cual')] = f['t']
        if VARIANTES:
            for nom, v in variantes(f['t']).items():
                textos[(i, nom)] = v
    claves = list(textos.keys())
    print('Probando %d dictados (%d frases%s) en la app de %s…' % (len(claves), len(FRASES), ' y sus variantes' if VARIANTES else '', EMP), flush=True)
    res = asyncio.run(correr({str(k): textos[k] for k in claves}))
    malos, informe = 0, []
    for i, f in enumerate(FRASES):
        base = res.get(str((i, 'tal cual')), {'fallo': 'sin resultado'})
        fl = comprobar(f, base)
        if VARIANTES:
            hb = huella(base)
            for nom in variantes(f['t']):
                rv = res.get(str((i, nom)), {'fallo': 'sin resultado'})
                if 'fallo' in rv or rv.get('errs'):
                    fl.append('%s: %s' % (nom, rv.get('fallo') or rv.get('errs')))
                elif huella(rv) != hb:
                    a = {(x['id'] or x['d'][:40], round(x['q'], 1)) for x in base.get('L', [])}
                    b2 = {(x['id'] or x['d'][:40], round(x['q'], 1)) for x in rv.get('L', [])}
                    if a == b2:
                        a = {(x['id'] or x['d'][:40], round(x['q'], 1), round(x['p'], 2)) for x in base.get('L', [])} | {('estancia', p['tipo'], round(p['suelo'], 1)) for p in base.get('P', [])}
                        b2 = {(x['id'] or x['d'][:40], round(x['q'], 1), round(x['p'], 2)) for x in rv.get('L', [])} | {('estancia', p['tipo'], round(p['suelo'], 1)) for p in rv.get('P', [])}
                        if a == b2:
                            ca = sorted((x['id'] or x['d'][:40]) for x in base.get('L', [])); cb = sorted((x['id'] or x['d'][:40]) for x in rv.get('L', []))
                            a, b2 = set(['n%d' % len(ca)]), set(['n%d' % len(cb)])
                    fl.append('%s: sale distinto (falta %s · sobra %s)' % (nom, sorted(map(str, a - b2))[:4], sorted(map(str, b2 - a))[:4]))
        tot = sum(l['q'] * l['p'] for l in base.get('L', []))
        informe.append({'t': f['t'], 'fallos': fl, 'tipos': sorted({tipo_fallo(m) for m in fl}), 'lineas': len(base.get('L', [])), 'total': round(tot, 2),
                        'ids': sorted({l['id'] for l in base.get('L', []) if l['id']}),
                        'estancias': [(p['tipo'], p['suelo'], p['calc']) for p in base.get('P', [])], 'info': base.get('info', '')})
        if fl: malos += 1
    if SALIDA:
        json.dump(informe, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for x in informe:
        if x['fallos']:
            print('\n✗ «%s»' % x['t'][:150])
            for m in x['fallos'][:8]: print('    - ' + m)
    import collections
    cuenta = collections.Counter()
    for x in informe:
        for t in {tipo_fallo(m) for m in x['fallos']}: cuenta[t] += 1
    if cuenta: print('\nFrases por tipo de fallo: ' + ' · '.join('%s %d' % (t, cuenta[t]) for t in ORDEN_TIPOS if cuenta[t]))
    print('\n%d de %d frases con fallos · %d dictados probados en %d s' % (malos, len(FRASES), len(claves), time.time() - t0))
    sys.exit(1 if malos else 0)


if __name__ == '__main__':
    main()
