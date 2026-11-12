"""Steady-state chain solver: for a target rate of a product, how many machines of each type, how much
raw material, power and floor area, at a given stage. Byproducts are recycled when the stage allows it."""
import json, math
B=json.load(open('balance.json'))
R=B['recipes']; RAW=set(B['raw'])
def recipe_for(item,stage):
    best=None
    for n,r in R.items():
        if r['stage']<=stage and list(r['out'])[0]==item and n!='recyclage_eclats':
            if n=='boule_artisanale' and stage>=3: continue
            best=n if best is None or R[n]['stage']>R[best]['stage'] else best
    return best
def solve(target,stage,recycle=True):
    """target: {item: rate/s}. returns crafts/s per recipe, raw needs, byproducts"""
    need={}; crafts={}; raw={}; byp={}
    def add(item,q):
        if item in RAW or item=='pigment': raw[item]=raw.get(item,0)+q; return
        rn=recipe_for(item,stage)
        if rn is None: raise ValueError(f'{item} indisponible à l\'étape {stage}')
        r=R[rn]; n=q/r['out'][item]; crafts[rn]=crafts.get(rn,0)+n
        for o,k in r['out'].items():
            if o!=item: byp[o]=byp.get(o,0)+n*k
        for i,k in r['in'].items(): add(i,n*k)
    for it,q in target.items(): add(it,q)
    # recycle shards into glass (reduces glass crafts, needs recycler crafts)
    if recycle and stage>=4 and byp.get('eclats',0)>0 and 'verre' in [x for rn in crafts for x in R[rn]['out']]:
        e=byp.pop('eclats'); glass=e/4; crafts['recyclage_eclats']=e/R['recyclage_eclats']['in']['eclats']
        # less glass needed from sand
        crafts['verre']=max(0,crafts.get('verre',0)-glass); raw['sable']=raw.get('sable',0)-glass*2
    return crafts,raw,byp
def machines(crafts,stage):
    sp=B['stages'][str(stage)]['speed']; per={}
    for rn,n in crafts.items():
        m=R[rn]['machine']; per[m]=per.get(m,0)+n*R[rn]['t']/sp
    return per   # fractional machines per type
def report(target,stage):
    c,raw,byp=solve(target,stage); m=machines(c,stage)
    S=B['stages'][str(stage)]; nm=sum(math.ceil(v-1e-9) for v in m.values())
    tiles=nm*S['tiles_per_machine']; kw=nm*S['power_kw']; steam=nm*S['steam']
    E=B['energy']
    gens=math.ceil(kw/E['generator_kw']) if kw else 0
    steam_total=steam+gens*E['generator_steam']; boilers=math.ceil(steam_total/E['boiler_steam']) if steam_total else 0
    fuel_bois=steam_total/E['bois_steam_units']
    sciure=byp.get('sciure',0); fuel_after=max(0,(steam_total-sciure*E['sciure_steam_units'])/E['bois_steam_units'])
    cost=nm*S['machine_cost']+tiles*S['belt_cost']+gens*E['generator_cost']+boilers*E['boiler_cost']
    return dict(stage=stage,target=target,machines={k:round(v,2) for k,v in m.items()},n_machines=nm,tiles=tiles,kw=kw,
                generators=gens,boilers=boilers,fuel_bois_s=round(fuel_after,3),raw={k:round(v,3) for k,v in raw.items()},
                byproducts={k:round(v,3) for k,v in byp.items()},cost=cost)
if __name__=='__main__':
    for s,g in B['gates'].items():
        s=int(s)
        if not g['rate']: continue
        r=report(g['rate'],s-1)   # what the player must build with the tech of the previous stage
        print(f"Porte {s} (avec la tech de l'étape {s-1}) : {g['rate']}")
        print('   machines',r['machines'],'total',r['n_machines'],'| tuiles',r['tiles'],'| kW',r['kw'],'gén',r['generators'],'chaud',r['boilers'],'bois/s comb.',r['fuel_bois_s'])
        print('   matières',r['raw'],'| coût',r['cost'],'| sous-produits',r['byproducts'])
