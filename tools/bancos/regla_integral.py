"""Regla nueva (Asier, 16-oct-2026): «reforma integral» no mete por sí sola partidas ni metros supuestos; lo no dicho
queda como pregunta. Este script quita de los resultados esperados de los bancos lo que solo salía por la reforma
integral por defecto (electricidad, pintura, suelos, puertas, baño, cocina, contenedor, limpieza…) cuando el dictado no
lo dice. Deja escrito en regla_integral.log qué cambia en cada frase."""
import json, re, sys, unicodedata, glob, os
def n(x): return ''.join(c for c in unicodedata.normalize('NFD', x.lower()) if unicodedata.category(c) != 'Mn')
INTEGRAL = re.compile(r'\b(integral|(?:toda la|todo el)\s+(?:piso|casa|vivienda)|(?:piso|casa|vivienda)\b[^.;]{0,40}\benter[oa]\b|reform\w*\s+(?:del?\s+|el\s+|la\s+|toda\s+la\s+|todo\s+el\s+)?(?:piso|casa|vivienda)|(?:piso|casa|vivienda)\s+(?:entera|entero|completa|completo)|(?:piso|casa|vivienda)\b[^.;]{0,40}\b(?:reforma\w*|se hace|lo hacen|hacer)\s+(?:enter[oa]|complet[oa]|todo)|(?:piso|casa|vivienda)\b[^.;]{0,30}\btodo nuevo|se hace entero|lo hacen entero|casa entera|piso entero|toda la casa reformada|reforma total|reforma completa(?!\s+del?\s+(?:bano|aseo|cocina)))\b')
EVID = {'ele': r'electric|luz|cablead|enchufe', 'bol': r'boletin', 'ins': r'electric|luz|instalacion|cablead|fontaner',
        'cal': r'calefacc|radiador|caldera', 'lija': r'gotele|lij', 'pip': r'pint(?!ado)\w*(?! (?:la |el )?(?:fachada|tejado|trastero))|gotele', 'pit': r'pint\w*[^.;]{0,30}\btechos?|techos?[^.;]{0,20}\bpint|pintura|pintar (?:todo|toda|el piso|la casa)',
        'sue': r'(?:quitar|levantar|cambiar|arrancar|sacar)\w*[^.;]{0,20}\b(?:suelos?|parquet|tarima|moqueta|baldosa)|suelos? nuevos?|moqueta', 'rod': r'rodapie', 'flo': r'flotante|tarima|laminad|parquet nuevo|vinilo|suelo nuevo|cambiar el suelo|poner suelo',
        'ron': r'rodapie', 'pue': r'(?:quitar|cambiar|sustituir|renovar|cambio)\w*[^.;]{0,25}\bpuertas|todo nuevo[^.]{0,80}\bpuertas|\bpuertas\s+nuevas', 'pub': r'puertas|puerta(?!s| blindada| de (?:entrada|la calle|casa|acceso)| (?:de )?entrada)', 'con': r'contenedor|escombro', 'limf': r'limpieza'}
BANO = r'\bban|\baseo|\bservicio\b'; COCINA = r'\bcocina\b(?!\s+(?:y\s+(?:el\s+)?salon|abierta|americana\s+al))'
NEG = [r'\b(?:menos|sin tocar|sin|excepto|salvo)\s+(?:el |la |los |las )?(?:banos?|aseo|cocina|suelos?|puertas|instalacion electrica|electricidad|luz)(?:\s+(?:ni|y)\s+(?:el |la |los |las )?(?:banos?|aseo|cocina|suelos?|puertas|instalacion electrica|electricidad|luz))?',
       r'\b(?:el |la |los |las )?(?:banos?|aseo|cocina|suelos?|puertas|instalacion electrica|electricidad|luz)\b[^.,;()]{0,40}?\b(?:no se toca\w*|se queda\w*|no q\b|no que\b|lo hace el cliente|la hace el cliente|ya esta\w*|lo hicieron|la hicieron|dejarla|esta nuev\w*|es nuev\w*|son nuev\w*|no\b)',
       r'\bpremarcos?\s+(?:en|para|de)\s+(?:todas\s+)?las\s+puertas\b|\babrir la cocina\b|\btabique\w*[^.;]{0,30}\bcocina\b|\bradiador\w*[^.;]{0,30}\bcocina\b|\bcocina\b[^.;]{0,15}\bsalon\b|\bsalon\b[^.;]{0,15}\bcocina\b|\b(?:puertas?|correderas?)[^.;]{0,30}\b(?:cocina|bano)\b(?:[^.;]{0,15}\b(?:cocina|bano)\b)?']
def sin_neg(t):
    for r in NEG: t = re.sub(r, ' ', t)
    return t
BANO_IDS = {'san', 'fba', 'mba', 'pd7', 'pd8', 'mam'}; COC_IDS = {'coc', 'fco', 'mco'}
log = []
DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
for p in sorted(glob.glob(os.path.join(DIR, 'frases_*.json'))):
    d = json.load(open(p)); cambia = False
    for e in d:
        if not isinstance(e, dict): continue
        t = n(e['t'])
        if not INTEGRAL.search(t) or not re.search(r'\b(piso|casa|vivienda|integral|reforma total|bajo)\b', t): continue
        quita = []; t0 = t; t = sin_neg(t)
        for i in list(e.get('debe', [])):
            if i in EVID and not re.search(EVID[i], t): quita.append(i)
            elif i in BANO_IDS and not re.search(BANO, t): quita.append(i)
            elif i in COC_IDS and not re.search(COCINA, t): quita.append(i)
            elif i in ('ali', 'alc', 'sol', 'dfon') and not re.search(BANO + '|' + COCINA, t): quita.append(i)
            elif i == 'tec' and not re.search(BANO + '|' + COCINA + '|falso techo', t): quita.append(i)
        if not quita: continue
        for i in quita:
            e['debe'].remove(i)
            for k in ('cantidades', 'lugares'):
                (e.get(k) or {}).pop(i, None)
            for k in ('sin_lugar', 'sin_medida'):
                if i in (e.get(k) or []): e[k].remove(i)
        t = t0; cambia = True; log.append('%s | %s | quitado de «debe»: %s' % (os.path.basename(p), e['t'][:120], ', '.join(quita)))
    if cambia: json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)
open(os.path.join(DIR, 'regla_integral.log'), 'w').write('\n'.join(log) + '\n')
print(len(log), 'frases cambiadas')
