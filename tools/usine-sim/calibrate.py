import json, math, time, sys
import numpy as np
import season2 as S
B=json.load(open('balance.json'))
SEEDS=list(range(int(sys.argv[1]) if len(sys.argv)>1 else 10))
def set_costs(B):
    eco=S.economy(B)
    for s in range(1,9):
        St=B['stages'][str(s)]; e=eco[s]
        vmean=np.mean([pp['v'] for pp in e['prods'].values()])
        allin=B['tuning']['payback_h'][str(s)]*3600*vmean*0.7
        extra=e['cost']-St['machine_cost']
        St['machine_cost']=int(round(max(St['machine_cost']*0.05,allin-extra),-1)) or 10
def arrivals(B,stage):
    out=[]
    for sd in SEEDS:
        P=S.simulate(B,seed=sd)
        out+=[p['arrive'].get(stage,99) for p in P if p['arch']=='régulier']
    return float(np.median(out))
def calibrate(B):
    set_costs(B)
    for k in range(2,9):
        target=S.TARGET_ARRIVAL[k]-0.5
        lo,hi=math.log(50),math.log(5e9)
        for it in range(16):
            mid=(lo+hi)/2; B['gates'][str(k)]['coins']=int(math.exp(mid))
            a=arrivals(B,k)
            if a<target: lo=mid
            else: hi=mid
        B['gates'][str(k)]['coins']=int(round(math.exp((lo+hi)/2),-1))
        print('porte',k,'pièces',B['gates'][str(k)]['coins'],'arrivée régulier ≈',round(arrivals(B,k),2),'cible',target,flush=True)
    return B
if __name__=='__main__':
    t=time.time(); P=S.simulate(B,seed=0); print('1 saison en %.2fs'%(time.time()-t))
    calibrate(B); json.dump(B,open('balance.json','w'),indent=2,ensure_ascii=False)
    print({s:B['stages'][str(s)]['machine_cost'] for s in range(1,9)})
