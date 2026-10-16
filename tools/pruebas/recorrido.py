"""Recorrido completo de la app como lo haría el usuario (cliente de prueba, sin mandar nada a nadie):
dictar → intentar sacar el PDF (tiene que frenar si hay pendientes) → contestar las preguntas → corregir una cantidad
→ añadir una partida → quitar otra → guardar → cerrar y volver a abrir → sacar el PDF.
En cada paso se comprueban las partidas y los importes (base, IVA, total, repetidas).
Uso: python3 recorrido.py <raiz de la app> <vorma|lucas> <salida_dir> "<dictado>" ["<dictado2>" ...]"""
import sys, os, json, functools, threading, socket, subprocess, re
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import rutas_pdf
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

raiz, emp, out = sys.argv[1], sys.argv[2], sys.argv[3]
dictados = sys.argv[4:]
os.makedirs(out, exist_ok=True)


class C(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
h = ThreadingHTTPServer(('127.0.0.1', port), functools.partial(C, directory=raiz))
threading.Thread(target=h.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html%s' % (port, '' if emp == 'vorma' else '?e=' + emp)

ESTADO = r"""()=>{try{leer()}catch(e){}
 var L=(cur.lineas||[]).map(function(l){return {d:String(l.d||''),q:num(l.q),u:l.u||'',p:num(l.p)}});
 var base=Math.round(L.reduce(function(a,l){return a+Math.round(l.q*l.p*100)/100},0)*100)/100;
 var iva=num((document.getElementById('f_iva')||{}).value||cur.iva||21);
 var dom={base:(document.getElementById('t_base')||{}).textContent||'',iva:(document.getElementById('t_iva')||{}).textContent||'',tot:(document.getElementById('t_tot')||{}).textContent||''};
 var P=(window.pendientesCosas?pendientesCosas():[]).map(function(p){return p.t+(p.k?':'+p.k:'')});
 return {L:L,base:base,ivaP:iva,dom:dom,pend:P,num:cur.num}}"""

fallos = []


def eur_num(t):
    t = (t or '').replace('€', '').replace('.', '').replace(',', '.').strip()
    try: return float(re.findall(r'-?\d+(?:\.\d+)?', t)[0])
    except Exception: return None


def comprobar(paso, e):
    base = e['base']; iva = round(base * e['ivaP']) / 100 if False else round(base * e['ivaP'] / 100 * 100) / 100
    tot = round((base + iva) * 100) / 100
    db = eur_num(e['dom']['base']); dt = eur_num(e['dom']['tot'])
    if db is not None and abs(db - base) > 0.011: fallos.append('%s: la base de la pantalla (%s) no es la suma de las partidas (%.2f)' % (paso, e['dom']['base'], base))
    if dt is not None and abs(dt - tot) > 0.03: fallos.append('%s: el total de la pantalla (%s) no es base + IVA (%.2f)' % (paso, e['dom']['tot'], tot))
    vis = {}
    for l in e['L']:
        k = (l['d'], l['u'], round(l['q'], 2), round(l['p'], 2))
        if k in vis: fallos.append('%s: partida repetida «%s»' % (paso, l['d'][:60]))
        vis[k] = 1
        if l['q'] < 0 or l['p'] < 0: fallos.append('%s: cantidad o precio negativo en «%s»' % (paso, l['d'][:50]))
    return tot


def resumen(e):
    return '%d partidas · base %.2f € · %d pendientes %s' % (len(e['L']), e['base'], len(e['pend']), e['pend'][:6])


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 412, 'height': 900}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
    pg = ctx.new_page(); rutas_pdf(pg)
    errores = []
    pg.on('pageerror', lambda ex: errores.append(str(ex)[:200]))
    dialogos = []
    pg.on('dialog', lambda d: (dialogos.append(d.message[:160]), d.accept()))
    pg.goto(URL); pg.wait_for_timeout(3500)
    pg.evaluate("()=>{try{localStorage.setItem('vr_guia_off','1');var g=document.getElementById('guiaCapa');if(g)g.classList.remove('on');document.body.style.overflow=''}catch(e){}}")
    for n, texto in enumerate(dictados, 1):
        pre = 'Dictado %d' % n
        print('\n=== %s: %s' % (pre, texto[:120]))
        pg.evaluate("(t)=>{nuevo();document.getElementById('f_nom').value='Cliente de prueba %d';document.getElementById('f_dir').value='Calle Prueba 1, Bilbao';document.getElementById('dictado').value=t;convertir()}".replace('%d', str(n)), texto)
        pg.wait_for_timeout(1800)
        e = pg.evaluate(ESTADO); comprobar(pre + ' · dictar', e); print('  dictado      →', resumen(e))
        pg.screenshot(path='%s/%s_%d_1dictado.png' % (out, emp, n))
        # sacar el PDF con pendientes: tiene que frenar y no descargar nada
        if e['pend']:
            nd = len(dialogos); bajado = []
            pg.once('download', lambda d: bajado.append(d))
            pg.evaluate("()=>imprimir('todo')"); pg.wait_for_timeout(1500)
            if bajado: fallos.append(pre + ': con pendientes ha sacado el PDF igualmente')
            if len(dialogos) == nd: fallos.append(pre + ': con pendientes no ha avisado')
            nd = len(dialogos)
            pg.evaluate("()=>mandarFirma()"); pg.wait_for_timeout(800)
            if len(dialogos) == nd: fallos.append(pre + ': con pendientes deja mandar a firmar')
            print('  PDF con pendientes → frenado:', dialogos[-1][:90] if dialogos else '-')
        # contestar las preguntas como lo haría el usuario: tocando los botones del aviso amarillo
        for vuelta in range(60):
            e = pg.evaluate(ESTADO)
            if not e['pend']: break
            hecho = pg.evaluate(r"""()=>{var ch=document.querySelector('#tb tr.pendiente .pendChip');if(!ch)return 'sin aviso';
              var inp=ch.querySelector('input');var bs=[].slice.call(ch.querySelectorAll('button'));
              if(inp&&/^pmx_/.test(inp.id)){inp.value='5';var bb=bs.find(function(x){return /Vale|Poner/.test(x.textContent)});bb.click();return 'metros de la estancia: 5'}
              if(inp&&/^pn_/.test(inp.id)){inp.value='3';bs[0].click();return 'número: 3'}
              var t=ch.textContent;var tr=ch.closest('tr');
              if(/No has dicho cu[aá]ntos/.test(t)){var q=tr.querySelector('.lq');q.value='12';q.dispatchEvent(new Event('input',{bubbles:true}));leer();renderLineas();return 'metros de la partida: 12'}
              if(/precio/.test(t)){var pp=tr.querySelector('.lp');pp.value='50';pp.dispatchEvent(new Event('input',{bubbles:true}));leer();renderLineas();return 'precio: 50'}
              if(bs.length){var pick=bs.find(function(x){return /Sí, entero|Sí, inclúyelo/.test(x.textContent)})||bs[0];var tx=pick.textContent;pick.click();return 'botón: '+tx}
              return 'nada que tocar: '+t.slice(0,60)}""")
            pg.wait_for_timeout(350)
            if vuelta < 12: print('   · contesto →', hecho)
            if hecho.startswith('sin aviso') or hecho.startswith('nada'):
                fallos.append(pre + ': hay pendientes sin aviso que se pueda tocar (%s)' % e['pend'][:3]); break
        e = pg.evaluate(ESTADO); t1 = comprobar(pre + ' · contestado', e); print('  contestado   →', resumen(e))
        if e['pend']: fallos.append(pre + ': no se han podido resolver todos los pendientes')
        # corregir una cantidad
        i = pg.evaluate("()=>{var i=cur.lineas.findIndex(function(l){return /^(m2|ml)$/.test(l.u)});if(i<0)return -1;var q=document.querySelectorAll('#tb tr')[i].querySelector('.lq');q.value=String(num(cur.lineas[i].q)+3);q.dispatchEvent(new Event('input',{bubbles:true}));leer();return i}")
        pg.wait_for_timeout(900)
        e2 = pg.evaluate(ESTADO); t2 = comprobar(pre + ' · corregir', e2)
        if i >= 0 and abs(e2['L'][i]['q'] - e['L'][i]['q'] - 3) > 0.01: fallos.append(pre + ': la cantidad corregida no se ha quedado')
        if i >= 0 and abs((e2['base'] - e['base']) - 3 * e['L'][i]['p']) > 0.05: fallos.append(pre + ': al corregir, la base no cambia lo que tiene que cambiar')
        print('  corregido    →', resumen(e2))
        # añadir una partida de la tarifa y quitar otra
        pg.evaluate("()=>{var ya={};cur.lineas.forEach(function(l){ya[l.tid||'']=1;ya[l.d]=1});var t=tarifa().find(function(x){return x.u==='ud'&&!ya[x.id]&&!ya[x.d]&&num(x.p)>0});addLinea(t)}"); pg.wait_for_timeout(500)
        e3 = pg.evaluate(ESTADO); comprobar(pre + ' · añadir', e3)
        if len(e3['L']) != len(e2['L']) + 1: fallos.append(pre + ': al añadir no hay una partida más')
        if e3['pend']: fallos.append(pre + ': la partida añadida a mano sale como pendiente (%s)' % e3['pend'])
        pg.evaluate("()=>{var b=document.querySelectorAll('#tb tr')[0].querySelector('button[title=Quitar]');b.click()}"); pg.wait_for_timeout(500)
        e4 = pg.evaluate(ESTADO); comprobar(pre + ' · quitar', e4)
        if len(e4['L']) != len(e3['L']) - 1: fallos.append(pre + ': al quitar no hay una partida menos')
        print('  añadir/quitar→', resumen(e4))
        # guardar, cerrar la app y volver a abrir
        pg.evaluate("()=>guardar()"); pg.wait_for_timeout(800)
        numero = e4['num']
        pg.goto(URL); pg.wait_for_timeout(3500)
        pg.evaluate("()=>{try{var g=document.getElementById('guiaCapa');if(g)g.classList.remove('on');document.body.style.overflow=''}catch(e){}}")
        pg.evaluate("(n)=>abrir(n)", numero); pg.wait_for_timeout(1500)
        e5 = pg.evaluate(ESTADO); comprobar(pre + ' · reabrir', e5)
        if [(l['d'], l['q'], l['u'], l['p']) for l in e5['L']] != [(l['d'], l['q'], l['u'], l['p']) for l in e4['L']]: fallos.append(pre + ': al volver a abrir no salen las mismas partidas')
        if abs(e5['base'] - e4['base']) > 0.01: fallos.append(pre + ': al volver a abrir cambia la base (%.2f → %.2f)' % (e4['base'], e5['base']))
        if e5['pend']: fallos.append(pre + ': al volver a abrir vuelven pendientes (%s)' % e5['pend'][:4])
        print('  reabierto    →', resumen(e5))
        # el PDF de verdad
        doc = pg.evaluate("()=>{try{return revisarDocumento()}catch(e){return ['ERR '+e.message]}}")
        doc = [d for d in doc if 'nombre del cliente' not in d and 'dirección' not in d]
        if doc: fallos.append(pre + ': el documento no cuadra: %s' % doc[:3])
        try:
            with pg.expect_download(timeout=180000) as dl:
                pg.evaluate("()=>imprimir('todo')")
            ruta = '%s/%s_%d.pdf' % (out, emp, n); dl.value.save_as(ruta)
            pags = subprocess.run(['pdfinfo', ruta], capture_output=True, text=True).stdout
            np_ = int(re.findall(r'Pages:\s+(\d+)', pags)[0]) if 'Pages' in pags else 0
            subprocess.run(['pdftoppm', '-r', '50', '-png', ruta, ruta[:-4]])
            print('  PDF          →', ruta, np_, 'páginas')
            if np_ < 2: fallos.append(pre + ': el PDF tiene %d páginas' % np_)
        except Exception as ex:
            fallos.append(pre + ': no ha salido el PDF (%s)' % str(ex)[:100])
        # el documento que va al cliente: total y partidas
        tdoc = pg.evaluate("()=>{var el=document.getElementById('sh_presu');return el?(el.innerText||'').replace(/\\s+/g,' '):''}")
        tot = round((e5['base'] + round(e5['base'] * e5['ivaP'] / 100 * 100) / 100) * 100) / 100
        tot_txt = ('%.2f' % tot).replace('.', ',')
        if tot_txt.split(',')[0][-3:] not in tdoc.replace('.', ''): fallos.append(pre + ': el total %.2f no sale en el documento' % tot)
    if errores: fallos.append('errores de la página: %s' % errores[:3])
    b.close()

print('\n' + ('TODO BIEN' if not fallos else 'FALLOS:\n  - ' + '\n  - '.join(fallos)))
json.dump({'fallos': fallos}, open('%s/%s_resultado.json' % (out, emp), 'w'), ensure_ascii=False, indent=1)
