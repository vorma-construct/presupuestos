import json,collections,sys
r=json.load(open(sys.argv[1]));c=collections.Counter()
for x in r:
  for k in set(f.split(':')[0] for f in x['fallos'] if ': sale distinto' in f): c[k]+=1
print(c)
