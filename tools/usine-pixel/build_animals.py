import os, json, sys
import animals as A, accessories as X
OUT=sys.argv[1]
os.makedirs(f'{OUT}/personnages',exist_ok=True); os.makedirs(f'{OUT}/accessoires',exist_ok=True)
BASE=['cat','dog','bunny','duck','turtle','fish']
for sp in A.SPECIES:
    if sp in BASE:
        for ci in range(8): A.sheet(sp,ci).save(f'{OUT}/personnages/{sp}-{ci}.png',optimize=True)
    else: A.sheet(sp).save(f'{OUT}/personnages/{sp}.png',optimize=True)
    for acc in X.ACCS: X.sheet(sp,acc).save(f'{OUT}/accessoires/{sp}-{acc}.png',optimize=True)
rows=[f'{a}_{d}' for a in A.ANIMS for d in A.DIRS]
json.dump({'frame':[32,32],'frames':4,'rows':rows,'anchorFeet':[16,30],'carryAnchor':[16,4],
  'fps':{'idle':3,'walk':8,'work':8,'carry':8},
  'colorable':BASE,'colors':8,'accessories':X.ACCS},open(f'{OUT}/personnages.json','w'),indent=2)
