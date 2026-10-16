import json,sys
d=json.load(open(sys.argv[1])); pat=sys.argv[2] if len(sys.argv)>2 else ''
r=d['resultados'] if isinstance(d,dict) and 'resultados' in d else d
for k,x in enumerate(r):
  fs=[f for f in x.get('fallos',[]) if pat in f]
  if fs: print(k,'|',x['t']); [print('   -',f) for f in fs]
