import json,sys,os
mode=sys.argv[1] if len(sys.argv)>1 else 'cmp'
for b in ['AB','CD','E','F','G','H','I','J','K','JKs']:
    d=json.load(open('inf_%s.json'%b)); r=d['resultados'] if isinstance(d,dict) else d
    fails={x['t']:x['fallos'] for x in r if x.get('fallos')}
    bp='base_%s.json'%b
    if mode=='save' or not os.path.exists(bp): json.dump(fails,open(bp,'w'),ensure_ascii=False); continue
    base=json.load(open(bp))
    new=[t for t in fails if t not in base]; fixed=[t for t in base if t not in fails]
    if new or fixed: print(b,'nuevos:',len(new),'arreglados:',len(fixed))
    for t in new: print('  +',t[:200]); [print('     ',f) for f in fails[t][:3]]
