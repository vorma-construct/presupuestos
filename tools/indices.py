# (columna EDIFICACION) Baja el Indice de costes de la construccion de Euskadi (Eustat, base 2021=100, mensual)
# y lo deja en indices.json para que la app actualice los precios viejos de los arquitectos.
import urllib.request, json, re, datetime, sys
URL='https://es.eustat.eus/elementos/xls0010249_c.csv'
MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
raw=urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0'}),timeout=60).read()
for enc in ('utf-8-sig','latin-1'):
    try: txt=raw.decode(enc); break
    except Exception: pass
open('tools/icce_ultimo.csv','w',encoding='utf-8').write(txt)
sep=';' if txt.count(';')>txt.count(',') else ','
filas=[[c.strip().strip('"') for c in l.split(sep)] for l in txt.splitlines()]
def numero(s):
    s=s.replace('(p)','').strip()
    if not re.fullmatch(r'-?\d{1,4}([.,]\d+)?',s): return None
    return float(s.replace(',','.'))
meses={}
# 1) filas tipo "2025 marzo ; 121,7"  o  "marzo 2025 ; 121,7"
anio=None
for f in filas:
    t=' '.join(f).lower()
    for c in f:
        m=re.fullmatch(r'(19|20)\d\d',c.replace('(p)','').strip())
        if m: anio=int(m.group(0))
    lab=(f[0] if f else '').lower()
    mm=[i for i,n in enumerate(MESES) if re.search(r'\b'+n+r'\b',lab)]
    ya=re.search(r'\b(19|20)\d\d\b',lab)
    if ya: anio=int(ya.group(0))
    if mm and anio:
        # columnas: Total(4) Edificacion(4) Ingenieria civil(4) -> el indice de edificacion es la 6a celda
        v=numero(f[5]) if len(f)>5 else None
        if v is None:
            vals=[x for x in (numero(c) for c in f[1:]) if x is not None and 50<x<400]
            v=vals[0] if vals else None
        if v and 50<v<400: meses['%d-%02d'%(anio,mm[0]+1)]=v
# 2) tabla con meses en columnas y años en filas
if len(meses)<6:
    cab=None
    for f in filas:
        idx={i:MESES.index(c.lower().replace('(p)','').strip()) for i,c in enumerate(f) if c.lower().replace('(p)','').strip() in MESES}
        if len(idx)>=6: cab=idx; continue
        if cab and f and re.fullmatch(r'(19|20)\d\d',f[0].replace('(p)','').strip()):
            a=int(f[0][:4])
            for i,mi in cab.items():
                if i<len(f):
                    v=numero(f[i])
                    if v and 50<v<400: meses['%d-%02d'%(a,mi+1)]=v
if len(meses)<6:
    print('NO HE PODIDO LEER EL INDICE'); print(txt[:3000]); sys.exit(1)
# se juntan con lo que ya habia (el CSV solo trae trece meses) y con el historico copiado a mano
import os
todo={}
h=json.load(open('tools/icce_historico.json',encoding='utf-8'))
todo.update(h['meses'])
if os.path.exists('indices.json'):
    try:
        old=json.load(open('indices.json',encoding='utf-8'))
        if old.get('columna')=='edificacion': todo.update(old.get('meses',{}))
    except Exception: pass
todo.update(meses)
meses=todo
k=sorted(meses)
json.dump({'fuente':'Eustat, Índice de costes de la construcción de la C.A. de Euskadi, edificación (base 2021=100)','url':URL,'leido':datetime.date.today().isoformat(),'columna':'edificacion','anual':h['anual'],'ultimo':k[-1],'meses':{x:meses[x] for x in k}},open('indices.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('OK',len(k),'meses, ultimo',k[-1],meses[k[-1]])
