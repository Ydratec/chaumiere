import json,copy,sys,evaluate as E
B0=json.load(open('balance.json'))
KNOBS={
 'contract_alpha':[0,0.5,1.0],
 'time_mult':[[[12,1.5],[24,1.2],[48,1.0]],[[24,1.1],[48,1.0]],[[48,1.0]]],
 'rush_power':[0.25,0.5,1.0],
 'defi_step':[1.2,1.5,2.0],
 'long_stars':[115,230,460],
}
def summary(m):
    t={a:m[a]['total'] for a in ('occasionnel','régulier','tryhard')}
    return dict(occ=round(t['occasionnel']),reg=round(t['régulier']),try_=round(t['tryhard']),
      ratio=round(t['tryhard']/t['régulier'],2),reg8=round(m['régulier']['arrive'][8][0],1),
      skill=round(m['_ranks']['p_more_skilled_tryhard_wins'],2),pwin=round(m['_ranks']['p_tryhard_wins'],2),
      regrank=round(m['_ranks']['best_regulier_rank'],2))
if __name__=='__main__':
  out={}
  n=int(sys.argv[1]) if len(sys.argv)>1 else 60
  for k,vals in KNOBS.items():
    for v in vals:
        B=copy.deepcopy(B0); B['tuning'][k]=v
        r=summary(E.metrics(E.run(B,n))); out[f"{k}={json.dumps(v)}"]=r; print(k,v,r,flush=True)
  json.dump(out,open('sweep.json','w'),indent=1,ensure_ascii=False)
