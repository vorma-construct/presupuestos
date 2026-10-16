"""Micrófono simulado, tercera tanda: compara lo que sale DICTANDO (reconocimiento de voz falso, con
resultados provisionales y finales, pausas, cortes, volver a pulsar, dictar dos veces, corregir hablando)
con lo que sale TECLEANDO lo mismo. No sustituye a la prueba con audio de verdad en el móvil.
Uso: python3 tools/pruebas/micro3.py <raíz de la app> [vorma]"""
import sys, os, json, functools, threading, socket
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import rutas_pdf
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

raiz = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
emp = sys.argv[2] if len(sys.argv) > 2 else 'vorma'


class C(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
h = ThreadingHTTPServer(('127.0.0.1', port), functools.partial(C, directory=raiz)); threading.Thread(target=h.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html%s' % (port, '' if emp == 'vorma' else '?e=' + emp)

# el reconocimiento de voz falso: cada sesión es una lista de sucesos
#  {prov:'…'}  trozo provisional (sustituye a los provisionales anteriores)
#  {provs:['…','…']} varios trozos provisionales a la vez (como Chrome, que los da por separado)
#  {fin:'…'}   trozo final
#  {todo:[[texto,final],…]} el móvil manda la lista entera de nuevo
#  {error:'no-speech'}; ms = espera hasta el siguiente suceso
# Al acabar la lista la sesión termina sola (silencio o corte) SIN pasar a final lo provisional.
FAKE = r"""
window.__sesiones=[];window.__srLog=[];
function FakeSR(){this.lang='';this.continuous=false;this.interimResults=false;}
FakeSR.prototype.start=function(){var me=this,ses=window.__sesiones.shift()||[],acum=[];window.__srLog.push('start');
 var paso=function(k){if(me.__parado)return;if(k>=ses.length)return fin();var ev=ses[k];
  if(ev.error){me.onerror&&me.onerror({error:ev.error});return fin()}
  if(ev.fin!=null){acum=acum.filter(function(x){return x.f});acum.push({t:ev.fin,f:true})}
  if(ev.prov!=null){acum=acum.filter(function(x){return x.f});if(ev.prov)acum.push({t:ev.prov,f:false})}
  if(ev.provs){acum=acum.filter(function(x){return x.f});ev.provs.forEach(function(t){acum.push({t:t,f:false})})}
  if(ev.todo){acum=ev.todo.map(function(x){return {t:x[0],f:x[1]}})}
  me.__acum=acum;var res=acum.map(function(x){var r=[{transcript:x.t}];r.isFinal=x.f;return r});
  me.onresult&&me.onresult({results:res,resultIndex:0});
  setTimeout(function(){paso(k+1)},ev.ms||60)};
 var fin=function(){if(me.__fin)return;me.__fin=1;window.__srLog.push('end');setTimeout(function(){me.onend&&me.onend()},30)};
 setTimeout(function(){paso(0)},50)};
FakeSR.prototype.stop=function(){var me=this;me.__parado=1;setTimeout(function(){if(me.__fin)return;if(me.__acum){me.__acum.forEach(function(x){x.f=true});var res=me.__acum.map(function(x){var r=[{transcript:x.t}];r.isFinal=true;return r});me.onresult&&me.onresult({results:res,resultIndex:0})}me.__fin=1;window.__srLog.push('end');setTimeout(function(){me.onend&&me.onend()},30)},80)};
FakeSR.prototype.abort=function(){this.__parado=1};
window.SpeechRecognition=FakeSR;window.webkitSpeechRecognition=FakeSR;
try{Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:function(){return Promise.resolve({getTracks:function(){return []}})}},configurable:true})}catch(e){}
"""

DUMP = """()=>({L:cur.lineas.map(l=>[l.d.split(' — ')[0].slice(0,60)+(l.d.split(' — ')[1]?' — '+l.d.split(' — ')[1]:''),num(l.q),l.u,num(l.p)>0?'€':'sin precio',(l.cuantas?'¿cuántas?':'')+(l.calc?'calc':'')]),
 P:(window.pendientesCosas?pendientesCosas():[]).map(p=>p.t+(p.k?':'+p.k:'')+(p.m?':'+p.m.slice(0,50):'')),
 aviso:((document.getElementById('convInfo')||{}).innerText||'').replace(/\\s+/g,' ').slice(0,140)})"""


def frase(t, trozos=None, prov=True):
    """una frase dicha de corrido: provisionales que crecen y luego el final"""
    ev = []
    if prov:
        w = t.split()
        for k in range(3, len(w), 4):
            ev.append({'prov': ' '.join(w[:k])})
    ev.append({'fin': t})
    return ev


# (nombre, sesiones de voz, [trozos tecleados uno tras otro], texto tecleado entero con puntuación, cómo pulsa)
CASOS = [
    ('1 baños en letra, de corrido',
     [frase('dos baños uno de cuatro metros y otro de seis metros los dos con plato de ducha')],
     ['dos baños uno de cuatro metros y otro de seis metros los dos con plato de ducha'],
     'Dos baños, uno de cuatro metros y otro de seis metros, los dos con plato de ducha.'),
    ('2 baños con cifras y m² (como suele escribir Chrome)',
     [frase('2 baños uno de 4 m² y otro de 6 m² los dos con plato de ducha')],
     ['2 baños uno de 4 m² y otro de 6 m² los dos con plato de ducha'],
     'Dos baños, uno de cuatro metros y otro de seis metros, los dos con plato de ducha.'),
    ('3 con mayúscula inicial y m2',
     [frase('Dos baños uno de 4 m2 y otro de 6 m2 los dos con plato de ducha')],
     ['Dos baños uno de 4 m2 y otro de 6 m2 los dos con plato de ducha'],
     'Dos baños, uno de cuatro metros y otro de seis metros, los dos con plato de ducha.'),
    ('4 pausas: tres finales sin espacio delante',
     [[{'fin': 'cambiar cinco puertas por nuevas', 'ms': 400}, {'fin': 'y recuperar las otras dos', 'ms': 400}]],
     ['cambiar cinco puertas por nuevas y recuperar las otras dos'],
     'Cambiar cinco puertas por nuevas y recuperar las otras dos.'),
    ('5 pausas: finales con espacio delante (Chrome escritorio)',
     [[{'fin': 'cambiar cinco puertas por nuevas'}, {'fin': ' y recuperar las otras dos'}]],
     ['cambiar cinco puertas por nuevas y recuperar las otras dos'],
     'Cambiar cinco puertas por nuevas y recuperar las otras dos.'),
    ('6 corrección hablada en la misma sesión',
     [frase('en el salón quitar el suelo y poner porcelánico no mejor flotante veinte metros')],
     ['en el salón quitar el suelo y poner porcelánico no mejor flotante veinte metros'],
     'En el salón quitar el suelo y poner porcelánico, no, mejor flotante, veinte metros.'),
    ('7 corrección después de cortarse el micro (dos pulsaciones)',
     [[{'fin': 'en el salón quitar el suelo y poner porcelánico veinte metros'}], [{'fin': 'no mejor flotante'}]],
     ['en el salón quitar el suelo y poner porcelánico veinte metros', 'no mejor flotante'],
     'En el salón quitar el suelo y poner porcelánico, no, mejor flotante, veinte metros.'),
    ('8 paredes y techo con medidas distintas',
     [frase('pintar las paredes del dormitorio treinta y cinco metros y el techo doce metros')],
     ['pintar las paredes del dormitorio treinta y cinco metros y el techo doce metros'],
     'Pintar las paredes del dormitorio, treinta y cinco metros, y el techo, doce metros.'),
    ('9 negación y trabajo del cliente',
     [frase('en la cocina sin falso techo y los azulejos los quita el cliente alicatar doce metros')],
     ['en la cocina sin falso techo y los azulejos los quita el cliente alicatar doce metros'],
     'En la cocina sin falso techo, y los azulejos los quita el cliente. Alicatar doce metros.'),
    ('10 reforma integral',
     [frase('reforma integral de un piso de ochenta metros')],
     ['reforma integral de un piso de ochenta metros'],
     'Reforma integral de un piso de ochenta metros.'),
    ('11 móvil que repite todo lo dicho en cada resultado',
     [[{'todo': [['dos baños uno de cuatro metros', True]]},
       {'todo': [['dos baños uno de cuatro metros', True], ['dos baños uno de cuatro metros y otro de seis metros', True]]},
       {'todo': [['dos baños uno de cuatro metros', True], ['dos baños uno de cuatro metros y otro de seis metros', True], ['dos baños uno de cuatro metros y otro de seis metros los dos con plato de ducha', True]]}]],
     ['dos baños uno de cuatro metros y otro de seis metros los dos con plato de ducha'],
     'Dos baños, uno de cuatro metros y otro de seis metros, los dos con plato de ducha.'),
    ('12 se corta con dos provisionales sin espacio entre ellos (sin final)',
     [[{'fin': 'pintar las paredes del dormitorio'}, {'provs': ['treinta y cinco metros', 'y el techo doce metros']}]],
     ['pintar las paredes del dormitorio treinta y cinco metros y el techo doce metros'],
     'Pintar las paredes del dormitorio, treinta y cinco metros, y el techo, doce metros.'),
    ('13 se corta solo y vuelve a pulsar para seguir',
     [[{'fin': 'un baño de cuatro metros con plato de ducha'}], [{'fin': 'y otro baño de tres metros con bañera'}]],
     ['un baño de cuatro metros con plato de ducha', 'y otro baño de tres metros con bañera'],
     'Un baño de cuatro metros con plato de ducha y otro baño de tres metros con bañera.'),
    ('14 dicta dos veces lo mismo (no lo cogió bien y lo repite)',
     [frase('cambiar cinco puertas por nuevas'), frase('cambiar cinco puertas por nuevas')],
     ['cambiar cinco puertas por nuevas', 'cambiar cinco puertas por nuevas'],
     'Cambiar cinco puertas por nuevas.'),
    ('15 dicta dos cosas seguidas en dos pulsaciones',
     [frase('cambiar cinco puertas por nuevas'), frase('pintar el salón cuarenta metros')],
     ['cambiar cinco puertas por nuevas', 'pintar el salón cuarenta metros'],
     'Cambiar cinco puertas por nuevas. Pintar el salón, cuarenta metros.'),
    ('16 toca el botón para parar con un trozo aún provisional',
     [[{'fin': 'cambiar cinco puertas por nuevas'}, {'prov': 'y recuperar las otras dos', 'ms': 5000}]],
     ['cambiar cinco puertas por nuevas y recuperar las otras dos'],
     'Cambiar cinco puertas por nuevas y recuperar las otras dos.', 'parar'),
    ('17 decimales: «cuatro y medio» y «4,5»',
     [frase('alicatar el baño 4,5 metros')],
     ['alicatar el baño 4,5 metros'],
     'Alicatar el baño, cuatro metros y medio.'),
    ('18 tras una pausa repite el final de lo anterior',
     [[{'fin': 'pintar el salón cuarenta metros'}, {'fin': 'cuarenta metros y el techo'}]],
     ['pintar el salón cuarenta metros y el techo'],
     'Pintar el salón, cuarenta metros, y el techo.'),
    ('19 segunda frase que está dentro de la primera',
     [[{'fin': 'alicatar el baño y pintar el baño'}, {'fin': 'el baño'}]],
     ['alicatar el baño y pintar el baño el baño'],
     'Alicatar el baño y pintar el baño.'),
    # las frases de la prueba del móvil (tools/pruebas/prueba_microfono.md)
    ('P1 dos baños completos con medidas distintas',
     [frase('dos baños completos uno de cinco metros con plato de ducha y otro de tres metros con bañera')],
     ['dos baños completos uno de cinco metros con plato de ducha y otro de tres metros con bañera'],
     'Dos baños completos, uno de cinco metros con plato de ducha y otro de tres metros con bañera.'),
    ('P2 puertas nuevas y recuperadas',
     [frase('cambiar cuatro puertas por nuevas y las dos del baño se recuperan')],
     ['cambiar cuatro puertas por nuevas y las dos del baño se recuperan'],
     'Cambiar cuatro puertas por nuevas, y las dos del baño se recuperan.'),
    ('P5 negación y lo que pone el cliente',
     [frase('en el baño cambiar el plato de ducha sin tocar los azulejos y la mampara la pone el cliente')],
     ['en el baño cambiar el plato de ducha sin tocar los azulejos y la mampara la pone el cliente'],
     'En el baño cambiar el plato de ducha, sin tocar los azulejos, y la mampara la pone el cliente.'),
    ('P7 parar y seguir (paredes y luego techo)',
     [frase('pintar las paredes del salón cuarenta metros'), frase('y el techo del salón dieciocho metros')],
     ['pintar las paredes del salón cuarenta metros', 'y el techo del salón dieciocho metros'],
     'Pintar las paredes del salón, cuarenta metros, y el techo del salón, dieciocho metros.'),
    ('P7b parar y seguir (la segunda parte con su verbo)',
     [frase('pintar las paredes del salón cuarenta metros'), frase('y pintar el techo del salón dieciocho metros')],
     ['pintar las paredes del salón cuarenta metros', 'y pintar el techo del salón dieciocho metros'],
     'Pintar las paredes del salón, cuarenta metros, y pintar el techo del salón, dieciocho metros.'),
    ('P8 repetir la frase de las puertas',
     [frase('cambiar cuatro puertas por nuevas y las dos del baño se recuperan'), frase('cambiar cuatro puertas por nuevas y las dos del baño se recuperan')],
     ['cambiar cuatro puertas por nuevas y las dos del baño se recuperan', 'cambiar cuatro puertas por nuevas y las dos del baño se recuperan'],
     'Cambiar cuatro puertas por nuevas, y las dos del baño se recuperan.'),
]

tecleo = lambda pg, t: pg.evaluate("(t)=>{var ta=document.getElementById('dictado');ta.value=(ta.value?ta.value+' ':'')+t;convertir()}", t)

res = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 412, 'height': 900}, is_mobile=True, has_touch=True)
    ctx.add_init_script(FAKE)
    pg = ctx.new_page(); rutas_pdf(pg); err = []; pg.on('pageerror', lambda e: err.append(str(e)[:150])); pg.on('dialog', lambda d: d.accept())
    pg.goto(URL); pg.wait_for_timeout(3500)
    pg.evaluate("()=>{try{localStorage.setItem('vr_guia_off','1');var g=document.getElementById('guiaCapa');if(g)g.classList.remove('on')}catch(e){}}")
    nuevo = lambda: pg.evaluate("()=>{nuevo();document.getElementById('dictado').value='';window.__ultDict=null}")
    for caso in CASOS:
        nombre, sesiones, trozos, entero = caso[:4]; modo = caso[4] if len(caso) > 4 else ''
        # tecleado en los mismos trozos
        nuevo()
        for t in trozos:
            tecleo(pg, t); pg.wait_for_timeout(900)
        rT = pg.evaluate(DUMP)
        # tecleado entero, con puntuación
        nuevo(); tecleo(pg, entero); pg.wait_for_timeout(900); rE = pg.evaluate(DUMP)
        # dictado
        nuevo(); pg.evaluate("(s)=>{window.__sesiones=s;window.__srLog=[]}", sesiones); textos = []
        for k in range(len(sesiones)):
            pg.evaluate("()=>{var b=document.getElementById('btnVoz');b.click()}")
            if modo == 'parar':
                pg.wait_for_timeout(600); pg.evaluate("()=>document.getElementById('btnVoz').click()")
            for _ in range(80):
                pg.wait_for_timeout(100)
                if pg.evaluate("()=>window.__srLog.filter(x=>x=='end').length") > k: break
            pg.wait_for_timeout(1300)
            textos.append(pg.evaluate("()=>document.getElementById('dictado').value"))
        rV = pg.evaluate(DUMP)
        res.append({'caso': nombre, 'texto_voz': textos, 'voz': rV, 'tecleado_trozos': rT, 'tecleado_entero': rE,
                    'igual_trozos': (rV['L'], rV['P']) == (rT['L'], rT['P']), 'igual_entero': (rV['L'], rV['P']) == (rE['L'], rE['P'])})
        print('%s %s | igual que tecleado en trozos: %s | igual que tecleado entero: %s' % ('✔' if res[-1]['igual_trozos'] and res[-1]['igual_entero'] else '✘', nombre, res[-1]['igual_trozos'], res[-1]['igual_entero']))
        print('    cuadro: ' + ' ⟶ '.join('«%s»' % x for x in textos))
        for nm, r in (('voz', rV), ('tecl', rT), ('entero', rE)):
            if nm != 'voz' and (r['L'], r['P']) == (rV['L'], rV['P']): continue
            print('    %-6s %s' % (nm, json.dumps(r['L'], ensure_ascii=False)))
            print('           pendientes: %s' % json.dumps(r['P'], ensure_ascii=False))
    if err: print('ERRORES JS:', err[:5])
    b.close()
out = os.environ.get('SALIDA')
if out: json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
print('\n(simulado: la prueba con audio de verdad en el móvil sigue pendiente)')
