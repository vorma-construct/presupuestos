"""El micrófono simulado: se cambia el reconocimiento de voz del navegador por uno que «oye» un guion
(resultados provisionales y finales, frases repetidas, cortes, errores). Comprueba lo que la app escribe y lo que saca.
No sustituye a una prueba con audio de verdad en un móvil."""
import sys, json, functools, threading, socket
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import rutas_pdf
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
raiz, emp = sys.argv[1], sys.argv[2]


class C(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
h = ThreadingHTTPServer(('127.0.0.1', port), functools.partial(C, directory=raiz)); threading.Thread(target=h.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html%s' % (port, '' if emp == 'vorma' else '?e=' + emp)

FAKE = r"""
window.__sesiones=[];window.__srLog=[];
function FakeSR(){this.lang='';this.continuous=false;this.interimResults=false;}
FakeSR.prototype.start=function(){var me=this,ses=window.__sesiones.shift()||[],acum=[];window.__srLog.push('start');
 var paso=function(k){if(me.__parado)return fin();if(k>=ses.length)return fin();var ev=ses[k];
  if(ev.error){me.onerror&&me.onerror({error:ev.error});return fin()}
  if(ev.reset)acum=[];
  if(ev.fin)acum.push({t:ev.fin,f:true});
  if(ev.prov!=null){acum=acum.filter(function(x){return x.f});if(ev.prov)acum.push({t:ev.prov,f:false})}
  if(ev.todo){acum=ev.todo.map(function(x){return {t:x[0],f:x[1]}})}
  me.__acum=acum;var res=acum.map(function(x){var r=[{transcript:x.t}];r.isFinal=x.f;return r});
  me.onresult&&me.onresult({results:res,resultIndex:0});
  setTimeout(function(){paso(k+1)},ev.ms||60)};
 var fin=function(){if(me.__fin)return;me.__fin=1;window.__srLog.push('end');setTimeout(function(){me.onend&&me.onend()},30)};
 setTimeout(function(){paso(0)},50)};
FakeSR.prototype.stop=function(){var me=this;me.__parado=1;setTimeout(function(){if(me.__fin)return;if(me.__acum){me.__acum.forEach(function(x){x.f=true});var res=me.__acum.map(function(x){var r=[{transcript:x.t}];r.isFinal=true;return r});me.onresult&&me.onresult({results:res,resultIndex:0})}me.__fin=1;window.__srLog.push('end');setTimeout(function(){me.onend&&me.onend()},30)},80)};FakeSR.prototype.abort=function(){this.__parado=1};
window.SpeechRecognition=FakeSR;window.webkitSpeechRecognition=FakeSR;
try{Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:function(){return Promise.resolve({getTracks:function(){return []}})}},configurable:true})}catch(e){}
"""

FRASE = 'baño completo de cuatro metros con plato de ducha y cambiar cinco puertas'
CASOS = [
    ('normal: frases finales seguidas',
     [[{'prov': 'baño completo'}, {'fin': 'baño completo de cuatro metros'}, {'prov': 'con plato'}, {'fin': ' con plato de ducha'}, {'fin': ' y cambiar cinco puertas'}]], FRASE),
    ('móvil que repite todo lo dicho en cada resultado',
     [[{'todo': [['baño completo de cuatro metros', True]]}, {'todo': [['baño completo de cuatro metros', True], ['baño completo de cuatro metros con plato de ducha', True]]},
       {'todo': [['baño completo de cuatro metros', True], ['baño completo de cuatro metros con plato de ducha', True], ['baño completo de cuatro metros con plato de ducha y cambiar cinco puertas', True]]}]], FRASE),
    ('la misma frase final dos veces',
     [[{'fin': 'baño completo de cuatro metros con plato de ducha'}, {'fin': 'baño completo de cuatro metros con plato de ducha'}, {'fin': 'y cambiar cinco puertas'}]], FRASE),
    ('se para solo a mitad (silencio) y el usuario vuelve a darle',
     [[{'fin': 'baño completo de cuatro metros con plato de ducha'}], [{'fin': 'y cambiar cinco puertas'}]], FRASE),
    ('se para al tocar el botón con un trozo provisional sin terminar',
     [[{'fin': 'baño completo de cuatro metros con plato de ducha'}, {'prov': 'y cambiar cinco puertas', 'ms': 4000}]], FRASE),
    ('no oye nada',
     [[{'error': 'no-speech'}]], ''),
    ('sin internet',
     [[{'error': 'network'}]], ''),
]

fallos = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 412, 'height': 900}, is_mobile=True, has_touch=True)
    ctx.add_init_script(FAKE)
    pg = ctx.new_page(); rutas_pdf(pg); err = []; pg.on('pageerror', lambda e: err.append(str(e)[:150])); pg.on('dialog', lambda d: d.accept())
    pg.goto(URL); pg.wait_for_timeout(3500)
    pg.evaluate("()=>{try{localStorage.setItem('vr_guia_off','1');var g=document.getElementById('guiaCapa');if(g)g.classList.remove('on')}catch(e){}}")
    # la referencia: lo mismo escrito a mano
    ref = pg.evaluate("(t)=>{nuevo();document.getElementById('dictado').value=t;convertir();return new Promise(r=>setTimeout(()=>r(cur.lineas.map(l=>[l.d,num(l.q),l.u,num(l.p)])),900))}", FRASE)
    for nombre, sesiones, esperado in CASOS:
        pg.evaluate("()=>{nuevo();document.getElementById('dictado').value=''}")
        pg.evaluate("(s)=>{window.__sesiones=s}", sesiones)
        for k in range(len(sesiones)):
            pg.evaluate("()=>{var b=document.getElementById('btnVoz');(b&&b.onclick?b.onclick:window.dictar)()}")
            pg.wait_for_timeout(700 if 'botón' not in nombre else 500)
            if 'botón' in nombre:  # el usuario toca para parar
                pg.evaluate("()=>{var b=document.getElementById('btnVoz');if(b&&b.onclick)b.onclick()}")
            pg.wait_for_timeout(1500)
        txt = pg.evaluate("()=>document.getElementById('dictado').value")
        aviso = pg.evaluate("()=>{var c=document.getElementById('convInfo');return c?c.innerText.slice(0,120):''}")
        L = pg.evaluate("()=>cur.lineas.map(l=>[l.d,num(l.q),l.u,num(l.p)])")
        norm = lambda x: ' '.join(x.lower().split())
        ok_txt = norm(txt) == norm(esperado)
        ok_l = (L == ref) if esperado else (L == [])
        print('%s %s\n    escrito: «%s»\n    partidas: %d (iguales que escrito a mano: %s)  aviso: %s' % ('✔' if ok_txt and ok_l else '✘', nombre, txt, len(L), ok_l, aviso.replace('\n', ' ')[:90]))
        if not ok_txt: fallos.append('%s: escribe «%s»' % (nombre, txt))
        if not ok_l: fallos.append('%s: las partidas no son las mismas que escribiéndolo (%d frente a %d)' % (nombre, len(L), len(ref)))
    if err: fallos.append('errores: %s' % err[:3])
    b.close()
print('\n' + ('TODO BIEN (simulado; falta probar con audio de verdad en el móvil)' if not fallos else 'FALLOS:\n  - ' + '\n  - '.join(fallos)))
