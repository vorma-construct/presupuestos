"""Saca la app de una empresa como pagina aparte (su propio enlace, su icono, nada de Vorma).
Uso: python3 tools/hacer_empresa.py <id> <url_publica> <carpeta_salida>
Ej.:  python3 tools/hacer_empresa.py lucas https://reformas-lucas.github.io/ /tmp/salida
Copia la app, deja solo la carpeta de esa empresa, pone su icono en todos los tamanos,
su manifest, y quita del codigo los precios y datos de Vorma (la tarifa de Ioan no viaja)."""
import sys,os,re,json,shutil
from PIL import Image
ID,URL,OUT=sys.argv[1],sys.argv[2].rstrip('/')+'/',sys.argv[3]
SRC=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E=json.load(open(f'{SRC}/empresas/{ID}/empresa.json'))
FUERA={'.git','.github','tools','servidor','README.md','revision.py','firestore.rules','empresas','arreglos'}
if os.path.exists(OUT):
    for x in os.listdir(OUT):
        if x in ('.git','.github','CNAME','empresa.txt','_app'):continue
        p=os.path.join(OUT,x);shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
os.makedirs(OUT,exist_ok=True)
for x in os.listdir(SRC):
    if x in FUERA or x.startswith('copia-seguridad') or os.path.abspath(os.path.join(SRC,x))==os.path.abspath(OUT):continue
    s,d=os.path.join(SRC,x),os.path.join(OUT,x)
    shutil.copytree(s,d) if os.path.isdir(s) else shutil.copy2(s,d)
shutil.copytree(f'{SRC}/empresas/{ID}',f'{OUT}/empresas/{ID}')
os.makedirs(f'{OUT}/arreglos',exist_ok=True);open(f'{OUT}/arreglos/auto.json','w').write(json.dumps({"ids":E.get('auto',[])}))
# presupuestos preparados para esta empresa (enlace ?arreglo=<nombre>)
if os.path.isdir(f'{SRC}/empresas/{ID}/arreglos'):
    for x in os.listdir(f'{SRC}/empresas/{ID}/arreglos'):shutil.copy2(f'{SRC}/empresas/{ID}/arreglos/{x}',f'{OUT}/arreglos/{x}')
for a in E.get('arreglos',[]):shutil.copy2(f'{SRC}/arreglos/{a}.json',f'{OUT}/arreglos/{a}.json')
# iconos: el suyo en todos los tamanos
big=Image.open(f'{SRC}/empresas/{ID}/icon-512.png').convert('RGBA')
for f in os.listdir(f'{OUT}/icons'):
    m=re.match(r'icon-(\d+)\.png$',f)
    if m:n=int(m.group(1));big.resize((n,n),Image.LANCZOS).save(f'{OUT}/icons/{f}')
C=(E.get('colores') or {}).get('oscuro','#111214')
man={"name":E['nombreApp']+' · Presupuestos',"short_name":E['nombreApp'],"start_url":"./","scope":"./","display":"standalone",
     "background_color":C,"theme_color":C,"icons":[{"src":f"icons/icon-{n}.png?e={ID}","sizes":f"{n}x{n}","type":"image/png"} for n in (72,96,128,144,152,192,384,512)]+[{"src":f"icons/icon-512.png?e={ID}","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
man["share_target"]={"action": "./?compartir=1", "method": "POST", "enctype": "multipart/form-data", "params": {"title": "title", "text": "text", "files": [{"name": "archivos", "accept": ["application/pdf", ".pdf"]}]}}
json.dump(man,open(f'{OUT}/manifest.json','w'),ensure_ascii=False)
def cambia(f,fn):
    p=f'{OUT}/{f}';s=open(p,encoding='utf-8').read();s2=fn(s);open(p,'w',encoding='utf-8').write(s2)
def idx(s):
    s=s.replace('?v=80"',f'?e={ID}"')
    s=re.sub(r'<title>[^<]*</title>',f"<title>{E['nombreApp']} · Presupuestos</title>",s,count=1)
    s=s.replace('<script src="empresa.js',f"<script>window.EMP_FIJA='{ID}'</script><script src=\"empresa.js",1)
    s=re.sub(r"PUB_CLIENTES='[^']*'",f"PUB_CLIENTES='{URL}'",s)
    # los precios de la tarifa de Vorma no viajan: a cero (la empresa trae los suyos)
    i=s.index('var TARIFA_BASE=[');j=s.index('\n];',i)
    s=s[:i]+re.sub(r",p:[0-9.]+,",",p:0,",s[i:j])+s[j:]
    # los datos y logos de Vorma tampoco
    i=s.index('var AJ_DEF={');j=s.index('};',i)+2
    s=s[:i]+"var AJ_DEF={recargoZona:'15',subidaPrecios:'0',iban:'',webSeg:''};"+s[j:]
    for v in ('LOGO','LOGO_PIN','LOGO_T'):s=re.sub(r"var "+v+r"='data:[^']*';","var "+v+"='';",s,count=1)
    s=re.sub(r'(<div class="sheet" id="sh_dosier">.*?)(<div class="foot">)',lambda m:re.sub(r'src="data:image/[^"]*"','src="data:,"',m.group(1))+m.group(2),s,count=1,flags=re.S)
    if os.path.exists(f'{SRC}/empresas/{ID}/doc.css'):
        import base64
        d=open(f'{SRC}/empresas/{ID}/doc.css',encoding='utf-8').read()
        for k,f in (('{{M800}}','montserrat-latin-800-normal.woff2'),('{{M700}}','montserrat-latin-700-normal.woff2')):
            fp=f'{SRC}/empresas/{ID}/fonts/{f}'
            if os.path.exists(fp):d=d.replace(k,base64.b64encode(open(fp,'rb').read()).decode())
        k=s.index('</style>');s=s[:k]+'\n'+d+'\n'+s[k:]
    if os.path.exists(f'{SRC}/empresas/{ID}/tema.css'):
        s=s.replace('</head>',f'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Figtree:wght@400;500;600;700&display=swap"><link rel="stylesheet" href="empresas/{ID}/tema.css?{int(os.path.getmtime(f"{SRC}/empresas/{ID}/tema.css"))}"></head>',1)
    if os.path.exists(f'{SRC}/empresas/{ID}/tema.js'):
        k=s.rindex('</body>');s=s[:k]+f'<script src="empresas/{ID}/tema.js?{int(os.path.getmtime(f"{SRC}/empresas/{ID}/tema.js"))}"></script>'+s[k:]
    assert 'Y4429633P' not in s and 'Vornicu' not in s.split('</style>')[0]
    return s
cambia('index.html',idx)
if os.path.exists(f'{SRC}/empresas/{ID}/doc.css'):
    cambia('index.html',lambda s:s.replace("backgroundColor:'#FAF6EC'","backgroundColor:'#FFFFFF'").replace("c2.fillStyle='#FAF6EC'","c2.fillStyle='#FFFFFF'").replace("Math.abs(d[x]-250)>6||Math.abs(d[x+1]-246)>6||Math.abs(d[x+2]-236)>6","Math.abs(d[x]-255)>6||Math.abs(d[x+1]-255)>6||Math.abs(d[x+2]-255)>6"))
    cambia('firma.html',lambda s:s.replace("'TitAzk','DejaVu Serif Condensed',Georgia,serif!important","'LucasTit',sans-serif!important"))
cambia('oficio.js',lambda s:'\n'.join(l for l in s.split('\n') if 'Ioan cobra' not in l))
def obra(s):
    s=s.replace('Vorma Construct',E['nombreApp']).replace('icons/logo.svg',f'empresas/{ID}/logo_t.png')
    C=E.get('colores')
    if C:s=re.sub(r'--oro:#[0-9A-Fa-f]{6};--oro2:#[0-9A-Fa-f]{6}',f"--oro:{C['boton']};--oro2:{C['marca']}",s)
    return s
cambia('obra.html',obra)
def colores(s):
    C=E.get('colores')
    if not C:return s
    s=s.replace('--brick2:#F7EED9',f"--brick2:{C['claro']}")
    for v,n in (('A87B18','boton'),('8A6A12','fuerte'),('C99A2E','marca'),('8B6914','fuerte')):s=re.sub('#'+v,C[n],s,flags=re.I)
    return s
for f in ('index.html','firma.html','obra.html','arquitecto.js'):cambia(f,colores)
if os.path.exists(f'{OUT}/icons/logo.svg'):os.remove(f'{OUT}/icons/logo.svg')
cambia('obra.webmanifest',lambda s:s.replace('Vorma Construct',E['nombreApp']))
for f in ('firma.html','obra.html'):
    if os.path.exists(f'{OUT}/{f}'):cambia(f,lambda s:s.replace('icons/icon-192.png"',f'icons/icon-192.png?e={ID}"'))
print('hecho',OUT)
