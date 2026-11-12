import json, sys, copy
import numpy as np
import season2 as S
def run(B,n=200,record=False):
    res=[]
    for sd in range(n): res.append(S.simulate(B,seed=1000+sd,record=record))
    return res
def metrics(res):
    A=list(S.ARCH); m={}
    for a in A:
        ps=[p for P in res for p in P if p['arch']==a]
        arr={s:[p['arrive'].get(s,np.nan) for p in ps] for s in range(2,9)}
        m[a]=dict(
          arrive={s:(np.nanmedian(v),np.nanpercentile(v,10),np.nanpercentile(v,90),float(np.mean(np.isnan(v)))) for s,v in arr.items()},
          stars={k:float(np.mean([p['stars'][k] for p in ps])) for k in ('jour','long','defi','rush')},
          total=float(np.mean([sum(p['stars'].values()) for p in ps])),
          mult=float(np.mean([np.mean(p['cmult']) if p['cmult'] else 0 for p in ps])),
          rush_rate=float(np.median([p['rush_rate'] for p in ps])))
    # ranking stats
    win_try=0; top2_try=0; best_reg_rank=[]; tie_gap=[]; skill_corr=[]; time_corr=[]
    for P in res:
        order=sorted(P,key=lambda p:-sum(p['stars'].values()))
        win_try+=order[0]['arch']=='tryhard'; top2_try+=all(p['arch']=='tryhard' for p in order[:2])
        best_reg_rank.append(1+next(i for i,p in enumerate(order) if p['arch']=='régulier'))
        th=[p for p in P if p['arch']=='tryhard']
        if len(th)==2:
            a,b=sorted(th,key=lambda p:p['skill'])
            tie_gap.append(sum(b['stars'].values())>sum(a['stars'].values()))
    n=len(res)
    m['_ranks']=dict(p_tryhard_wins=win_try/n,p_top2_tryhards=top2_try/n,best_regulier_rank=float(np.mean(best_reg_rank)),
                     p_more_skilled_tryhard_wins=float(np.mean(tie_gap)))
    return m
def show(m):
    for a,v in m.items():
        if a.startswith('_'): print(a,{k:round(x,3) for k,x in v.items()}); continue
        print(f"{a:12s} total {v['total']:6.0f} | jour {v['stars']['jour']:5.0f} long {v['stars']['long']:4.0f} défi {v['stars']['defi']:4.0f} rush {v['stars']['rush']:4.0f} | mult moy {v['mult']:.2f} | sapins/min fin {v['rush_rate']:.0f}")
        print('   arrivée (médiane j) ', {s:round(x[0],1) for s,x in v['arrive'].items()}, ' jamais 8 :',round(v['arrive'][8][3]*100),'%')
if __name__=='__main__':
    B=json.load(open('balance.json')); m=metrics(run(B,200)); show(m)
