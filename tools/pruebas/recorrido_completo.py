"""Recorrido de principio a fin, paso a paso, comparando las partidas en cada sitio donde viven:
dictar → partidas → preguntas pendientes (PDF y «mandar a firmar» frenados, el borrador SÍ se guarda) → contestar →
corregir una cantidad → total → guardar → cerrar la app y reabrir → PDF real (datos escondidos en el PDF + OCR de la imagen).
En cada paso: ninguna partida desaparece, se duplica o cambia de estancia; los importes cuadran.
Uso: python3 recorrido_completo.py <raiz de la app> <vorma|lucas> <salida_dir> <frases.json (lista de textos)>"""
import sys, os, json, functools, threading, socket, subprocess, re, base64, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import rutas_pdf
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

raiz, emp, out, fich = sys.argv[1:5]
dictados = json.load(open(fich, encoding='utf-8'))
os.makedirs(out, exist_ok=True)


class C(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
h = ThreadingHTTPServer(('127.0.0.1', port), functools.partial(C, directory=raiz))
threading.Thread(target=h.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html%s' % (port, '' if emp == 'vorma' else '?e=' + emp)

ESTADO = r"""()=>{try{leer()}catch(e){}
 var L=(cur.lineas||[]).map(function(l){return {d:String(l.d||''),q:num(l.q),u:l.u||'',p:num(l.p),imp:!!l.imp}});
 var base=Math.round(L.filter(function(l){return !l.imp}).reduce(function(a,l){return a+Math.round(l.q*l.p*100)/100},0)*100)/100;
 var iva=num((document.getElementById('f_iva')||{}).value||cur.iva||21);
 var dom={base:(document.getElementById('t_base')||{}).textContent||'',iva:(document.getElementById('t_iva')||{}).textContent||'',tot:(document.getElementById('t_tot')||{}).textContent||''};
 var P=(window.pendientesCosas?pendientesCosas():[]).map(function(p){return p.t+(p.k?':'+p.k:'')});
 return {L:L,base:base,ivaP:iva,dom:dom,pend:P,num:cur.num}}"""
GUARDADO = r"""(n)=>{var p=(DB.presus||{})[n];if(!p)return null;var raw=null;try{raw=JSON.parse(localStorage.getItem('vr_db')||'{}').presus[n]}catch(e){}
 var f=function(x){return x?(x.lineas||[]).map(function(l){return {d:String(l.d||''),q:num(l.q),u:l.u||'',p:num(l.p),imp:!!l.imp}}):null};
 return {mem:f(p),disco:f(raw),borrador:!!p.borrador}}"""

filas = []
fallos = []


def eur(t):
    t = (t or '').replace('€', '').replace('.', '').replace(',', '.').strip()
    try: return float(re.findall(r'-?\d+(?:\.\d+)?', t)[0])
    except Exception: return None


def r2(x):  # redondeo como Math.round de la app (medio hacia arriba), no el «del banquero» de Python
    import math
    return math.floor(x * 100 + 0.5 + 1e-9) / 100


def total_de(base, ivaP):
    return r2(base + r2(base * ivaP / 100))


def firma(L):
    return collections.Counter((l['d'], l['u'], round(l['q'], 2), round(l['p'], 2)) for l in L if not l.get('imp'))


def estancia(d):
    return d.split(' — ')[1] if ' — ' in d else ''


def diferencia(A, B):
    """qué partidas faltan / sobran / se duplican / cambian de estancia entre dos listas"""
    a, b = firma(A), firma(B)
    if a == b: return ''
    falta, sobra = a - b, b - a
    txt = []
    # misma partida (sin la estancia) en otra estancia
    for k in list(falta):
        base = k[0].split(' — ')[0]
        for j in list(sobra):
            if j[0].split(' — ')[0] == base and j[1:] == k[1:] and estancia(j[0]) != estancia(k[0]):
                txt.append('cambia de estancia «%s»: %s → %s' % (base[:40], estancia(k[0]), estancia(j[0])))
                falta[k] -= 1; sobra[j] -= 1; break
    for k, n in (+falta).items(): txt.append('falta «%s» %s %s x %s' % (k[0][:55], k[2], k[1], k[3]))
    for k, n in (+sobra).items(): txt.append('sobra%s «%s» %s %s x %s' % (' (duplicada)' if k in a else '', k[0][:55], k[2], k[1], k[3]))
    return '; '.join(txt)


def repetidas(L):
    c = firma(L)
    return ['«%s»' % k[0][:50] for k, n in c.items() if n > 1]


def fmt(x):
    s = '%.2f' % x; e, d = s.split('.')
    e = re.sub(r'(\d)(?=(\d{3})+$)', r'\1.', e)
    return e + ',' + d


CONTESTA = r"""()=>{var ch=document.querySelector('#tb tr.pendiente .pendChip')||document.querySelector('#pendBanner .pendChip');if(!ch)return 'sin aviso';
  var inp=ch.querySelector('input');var bs=[].slice.call(ch.querySelectorAll('button'));var t=ch.textContent.replace(/\s+/g,' ').slice(0,90);
  if(inp&&/^pmx_/.test(inp.id)){inp.value='5';var bb=bs.find(function(x){return /Vale|Poner/.test(x.textContent)})||bs[0];bb.click();return t+' ⇒ 5 m'}
  if(inp&&/^pn_/.test(inp.id)){inp.value='3';bs[0].click();return t+' ⇒ 3'}
  var tr=ch.closest('tr');
  if(tr&&/No has dicho cu[aá]nt|cu[aá]ntos metros|cu[aá]ntas/i.test(t)){var q=tr.querySelector('.lq');q.value='12';q.dispatchEvent(new Event('input',{bubbles:true}));leer();renderLineas();return t+' ⇒ cantidad 12 a mano'}
  if(tr&&/precio/i.test(t)){var pp=tr.querySelector('.lp');pp.value='50';pp.dispatchEvent(new Event('input',{bubbles:true}));leer();renderLineas();return t+' ⇒ precio 50'}
  if(bs.length){var pick=bs.find(function(x){return /Sí, entero|Sí, inclúyelo|^Sí|Correcto|Vale/.test(x.textContent.trim())})||bs[0];var tx=pick.textContent.trim();pick.click();return t+' ⇒ «'+tx+'»'}
  return 'nada que tocar: '+t}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 412, 'height': 900}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
    pg = ctx.new_page(); rutas_pdf(pg)
    errores = []
    pg.on('pageerror', lambda ex: errores.append(str(ex)[:200]))
    dialogos = []
    pg.on('dialog', lambda d: (dialogos.append(d.message[:200]), d.accept()))

    def cargar():
        pg.goto(URL); pg.wait_for_timeout(3500)
        pg.evaluate("()=>{try{localStorage.setItem('vr_guia_off','1');var g=document.getElementById('guiaCapa');if(g)g.classList.remove('on');document.body.style.overflow=''}catch(e){}}")
    cargar()
    for n, texto in enumerate(dictados, 1):
        F = []  # fallos de esta frase
        fila = {'n': n, 'frase': texto}
        pg.evaluate("(a)=>{nuevo();document.getElementById('f_nom').value='Cliente de prueba '+a[1];document.getElementById('f_dir').value='Calle Prueba 1, Bilbao';document.getElementById('dictado').value=a[0];convertir()}", [texto, n])
        pg.wait_for_timeout(2000)
        e0 = pg.evaluate(ESTADO); numero = e0['num']
        fila['partidas_dictado'] = len(e0['L']); fila['pend_dictado'] = len(e0['pend']); fila['base_dictado'] = e0['base']
        if repetidas(e0['L']): F.append('dictado: partidas repetidas %s' % repetidas(e0['L']))
        print('\n=== %d %s\n  dictado: %d partidas, base %.2f, %d pendientes %s' % (n, texto[:110], len(e0['L']), e0['base'], len(e0['pend']), e0['pend'][:5]))
        # con pendientes: PDF y firma frenados, borrador guardable
        if e0['pend']:
            nd = len(dialogos); baj = []
            alBajar = lambda d: baj.append(d)
            pg.on('download', alBajar)
            pg.evaluate("()=>imprimir('todo')"); pg.wait_for_timeout(2500)
            if baj: F.append('con pendientes ha sacado el PDF')
            if len(dialogos) == nd or 'faltan' not in dialogos[-1]: F.append('con pendientes el PDF no avisa (%s)' % (dialogos[nd:] or '-'))
            nd = len(dialogos)
            pg.evaluate("()=>imprimir('presu')"); pg.wait_for_timeout(1500)
            if len(dialogos) == nd or 'faltan' not in dialogos[-1]: F.append('con pendientes «Solo el presupuesto» no frena')
            nd = len(dialogos)
            pg.evaluate("()=>mandarFirma()"); pg.wait_for_timeout(1200)
            if baj: F.append('con pendientes ha bajado algo al mandar a firmar')
            if len(dialogos) == nd or 'faltan' not in dialogos[-1] or 'firmar' not in dialogos[-1]: F.append('con pendientes «mandar a firmar» no frena (%s)' % (dialogos[nd:] or '-'))
            pg.remove_listener('download', alBajar)
            ef = pg.evaluate(ESTADO)
            d = diferencia(e0['L'], ef['L'])
            if d: F.append('al frenar cambian las partidas: ' + d)
            pg.evaluate("()=>guardar()"); pg.wait_for_timeout(900)
            g = pg.evaluate(GUARDADO, numero)
            if not g: F.append('con pendientes NO se ha guardado el borrador')
            else:
                if diferencia(ef['L'], g['mem']): F.append('borrador guardado distinto: ' + diferencia(ef['L'], g['mem']))
                if g['disco'] is None or diferencia(ef['L'], g['disco']): F.append('borrador no llega al disco: ' + (diferencia(ef['L'], g['disco']) if g['disco'] else 'no está'))
            fila['frenos'] = 'PDF frenado, firma frenada, borrador guardado' if not [x for x in F if 'pendientes' in x or 'borrador' in x] else 'MAL'
        else:
            fila['frenos'] = 'sin pendientes'
        # contestar
        resp = []
        for vuelta in range(80):
            e = pg.evaluate(ESTADO)
            if not e['pend']: break
            antes = e
            r = pg.evaluate(CONTESTA); pg.wait_for_timeout(400)
            resp.append(r)
            despues = pg.evaluate(ESTADO)
            if repetidas(despues['L']): F.append('al contestar «%s» salen repetidas %s' % (r[:60], repetidas(despues['L'])))
            if r.startswith('sin aviso') or r.startswith('nada'):
                F.append('pendientes sin aviso tocable: %s' % e['pend'][:3]); break
            if despues['pend'] == antes['pend'] and firma(despues['L']) == firma(antes['L']):
                F.append('contestar «%s» no hace nada' % r[:80]); break
        fila['respuestas'] = resp
        for r in resp[:14]: print('   · ' + r[:150])
        e1 = pg.evaluate(ESTADO)
        if e1['pend']: F.append('quedan pendientes tras contestar: %s' % e1['pend'][:4])
        # una corrección: +3 en la primera partida por metros
        i = pg.evaluate("()=>{var i=cur.lineas.findIndex(function(l){return /^(m2|ml)$/.test(l.u)&&num(l.p)>0});if(i<0)return -1;var q=document.querySelectorAll('#tb tr')[i].querySelector('.lq');q.value=String(Math.round((num(cur.lineas[i].q)+3)*100)/100).replace('.',',');q.dispatchEvent(new Event('input',{bubbles:true}));leer();return i}")
        pg.wait_for_timeout(1200)
        e2 = pg.evaluate(ESTADO)
        if i >= 0:
            if abs(e2['L'][i]['q'] - e1['L'][i]['q'] - 3) > 0.01: F.append('la cantidad corregida no se queda (%s → %s)' % (e1['L'][i]['q'], e2['L'][i]['q']))
            esperado = round(e1['base'] + round((e1['L'][i]['q'] + 3) * e1['L'][i]['p'], 2) - round(e1['L'][i]['q'] * e1['L'][i]['p'], 2), 2)
            if abs(e2['base'] - esperado) > 0.02: F.append('al corregir la base no cambia lo que debe (%.2f, esperaba %.2f)' % (e2['base'], esperado))
            otras = diferencia([l for k, l in enumerate(e1['L']) if k != i], [l for k, l in enumerate(e2['L']) if k != i])
            if otras: F.append('al corregir una cantidad cambian otras partidas: ' + otras)
            fila['correccion'] = '%s: %s → %s %s' % (e1['L'][i]['d'][:45], e1['L'][i]['q'], e2['L'][i]['q'], e1['L'][i]['u'])
        else:
            fila['correccion'] = '(no hay partida por metros)'
        if e2['pend']: F.append('la corrección deja pendientes: %s' % e2['pend'][:3])
        # total en pantalla
        tot_calc = total_de(e2['base'], e2['ivaP'])
        db, dt = eur(e2['dom']['base']), eur(e2['dom']['tot'])
        if db is None or abs(db - e2['base']) > 0.011: F.append('base en pantalla %s ≠ suma %.2f' % (e2['dom']['base'], e2['base']))
        if dt is None or abs(dt - tot_calc) > 0.011: F.append('total en pantalla %s ≠ base+IVA %.2f' % (e2['dom']['tot'], tot_calc))
        fila['tot_pantalla'] = dt
        # guardar
        pg.evaluate("()=>guardar()"); pg.wait_for_timeout(900)
        g = pg.evaluate(GUARDADO, numero)
        if not g: F.append('no se ha guardado'); fila['tot_guardado'] = None
        else:
            dif = diferencia(e2['L'], g['disco'] or [])
            if dif: F.append('lo guardado no es lo de la pantalla: ' + dif)
            bg = round(sum(round(l['q'] * l['p'], 2) for l in (g['disco'] or []) if not l['imp']), 2)
            fila['tot_guardado'] = total_de(bg, e2['ivaP'])
        # cerrar la app y reabrir
        cargar()
        pg.evaluate("(n)=>abrir(n)", numero); pg.wait_for_timeout(1800)
        e3 = pg.evaluate(ESTADO)
        dif = diferencia(e2['L'], e3['L'])
        if dif: F.append('al reabrir: ' + dif)
        if [l['d'] for l in e3['L']] != [l['d'] for l in e2['L']] and not dif: F.append('al reabrir cambia el orden de las partidas')
        if e3['pend']: F.append('al reabrir vuelven pendientes: %s' % e3['pend'][:4])
        fila['tot_reabierto'] = eur(e3['dom']['tot'])
        if fila['tot_reabierto'] is None or abs(fila['tot_reabierto'] - total_de(e3['base'], e3['ivaP'])) > 0.011: F.append('al reabrir el total de pantalla %s no cuadra (%.2f)' % (e3['dom']['tot'], total_de(e3['base'], e3['ivaP'])))
        # PDF real
        nd = len(dialogos)
        ruta = '%s/%s_%02d.pdf' % (out, emp, n)
        try:
            with pg.expect_download(timeout=240000) as dl:
                pg.evaluate("()=>imprimir('todo')")
            dl.value.save_as(ruta)
            if len(dialogos) > nd: F.append('al sacar el PDF ya resuelto pregunta: %s' % dialogos[nd:][:2])
            rd = PdfReader(ruta)
            kw = (rd.metadata or {}).get('/Keywords', '') or ''
            datos = json.loads(base64.b64decode(kw.split('PRESUAPP1:')[1]).decode('utf-8')) if 'PRESUAPP1:' in kw else None
            if not datos: F.append('el PDF no lleva las partidas dentro')
            else:
                Lp = [{'d': l['d'], 'q': float(str(l['q']).replace(',', '.') or 0), 'u': l['u'], 'p': float(str(l['p']).replace(',', '.') or 0)} for l in datos['lineas']]
                dif = diferencia([l for l in e3['L'] if not l['imp']], Lp)
                if dif: F.append('PDF (datos) distinto de lo reabierto: ' + dif)
            txt = subprocess.run(['pdftotext', ruta, '-'], capture_output=True, text=True).stdout
            fila['pdftotext_chars'] = len(txt.strip())
            # OCR de la hoja del presupuesto
            subprocess.run(['pdftoppm', '-r', '170', '-png', ruta, ruta[:-4]], check=True)
            pags = sorted(x for x in os.listdir(out) if x.startswith(os.path.basename(ruta[:-4]) + '-') and x.endswith('.png'))
            ocr = ''
            for pgn in pags:
                ocr += subprocess.run(['tesseract', os.path.join(out, pgn), '-', '-l', 'eng', '--psm', '6'], capture_output=True, text=True).stdout + '\n'
            open(ruta[:-4] + '_ocr.txt', 'w').write(ocr)
            plano = re.sub(r'[\s.]', '', ocr)
            tot_r = total_de(e3['base'], e3['ivaP'])
            fila['tot_pdf'] = tot_r if fmt(tot_r).replace('.', '') in plano else None
            if fila['tot_pdf'] is None: F.append('el total %s no se lee en el PDF (OCR)' % fmt(tot_r))
            base_ok = fmt(e3['base']).replace('.', '') in plano
            if not base_ok: F.append('la base %s no se lee en el PDF (OCR)' % fmt(e3['base']))
            imps = [(l['d'][:40], fmt(round(l['q'] * l['p'], 2)).replace('.', '')) for l in e3['L'] if not l['imp'] and l['q'] * l['p'] > 0]
            vis = sum(1 for d, x in imps if x in plano)
            fila['no_ocr'] = [d + ' ' + x for d, x in imps if x not in plano]
            fila['importes_ocr'] = '%d/%d' % (vis, len(imps))
            fila['paginas'] = len(rd.pages)
        except Exception as ex:
            F.append('no ha salido el PDF: %s' % str(ex)[:150]); fila['tot_pdf'] = None
        # el documento HTML del que sale la imagen: cada partida y su importe
        tdoc = pg.evaluate("()=>{var el=document.getElementById('sh_presu');return el?(el.innerText||'').replace(/\\s+/g,' '):''}")
        tdoc = tdoc.replace('.', '').replace(' ', '')
        faltan = [l['d'][:50] for l in e3['L'] if not l['imp'] and fmt(round(l['q'] * l['p'], 2)).replace('.', '') not in tdoc]
        if faltan: F.append('en la hoja del presupuesto no sale el importe de: %s' % faltan[:4])
        fila['partidas_final'] = len([l for l in e3['L'] if not l['imp']])
        fila['fallos'] = F
        fallos += ['%d: %s' % (n, x) for x in F]
        print('  pantalla %.2f · guardado %s · reabierto %s · PDF %s · importes en OCR %s · %s' % (fila['tot_pantalla'] or 0, fila.get('tot_guardado'), fila.get('tot_reabierto'), fila.get('tot_pdf'), fila.get('importes_ocr'), fila['frenos']))
        for x in F: print('  !! ' + x)
        filas.append(fila)
        json.dump(filas, open('%s/%s_filas.json' % (out, emp), 'w'), ensure_ascii=False, indent=1)
    if errores: fallos.append('errores de la página: %s' % errores[:5])
    b.close()

print('\n' + ('TODO BIEN' if not fallos else 'FALLOS:\n  - ' + '\n  - '.join(fallos)))
json.dump({'filas': filas, 'fallos': fallos, 'errores': errores}, open('%s/%s_resultado.json' % (out, emp), 'w'), ensure_ascii=False, indent=1)
