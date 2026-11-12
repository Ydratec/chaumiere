"""Season model v2. 9 players, hourly steps, 20 days. Production runs 24/7; players act only in sessions."""
import json, math, random
import numpy as np
import chains as CH
PRODUCTS=['boule_peinte','boule_finie','etoile_doree','guirlande','couronne','sapin_decore']
ARCH={  # sessions = hours of the day the player plays, minutes per session
 'occasionnel':dict(sessions=[20],minutes=20,skill=(0.55,0.06),build=0.7,attend=0.65),
 'régulier':   dict(sessions=[12,20],minutes=30,skill=(0.70,0.05),build=1.0,attend=0.85),
 'tryhard':    dict(sessions=[9,13,18,22],minutes=60,skill=(0.90,0.03),build=1.5,attend=0.97),
}
ROSTER=['tryhard','tryhard','régulier','régulier','régulier','régulier','occasionnel','occasionnel','occasionnel']
TARGET_ARRIVAL={2:1,3:2,4:4,5:7,6:11,7:14,8:17}      # day (start of day = arrival before that day ends) for a median régulier
def economy(B):
    CH.B=B; CH.R=B['recipes']; E=B['energy']; eco={}
    for s in range(1,9):
        S=B['stages'][str(s)]; prods={}
        for p in PRODUCTS:
            try: r=CH.report({p:1.0},s)
            except ValueError: continue
            m=sum(r['machines'].values())
            prods[p]=dict(m=m,v=B['price'][p]/m,sable=r['raw'].get('sable',0)/m)
        kw=S['power_kw']; steam=S['steam']+kw/E['generator_kw']*E['generator_steam']
        energy=kw/E['generator_kw']*E['generator_cost']+steam/E['boiler_steam']*E['boiler_cost']
        cost=S['machine_cost']+S['tiles_per_machine']*S['belt_cost']+energy
        best=max(prods,key=lambda p:prods[p]['v'])
        eco[s]=dict(prods=prods,best=best,v=prods[best]['v'],cost=cost,tiles=S['tiles_per_machine'],build_s=S['build_s'],
                    raw=np.mean([pp['sable'] for pp in prods.values()])+0.05)
    return eco
def simulate(B,seed=0,roster=ROSTER,days=20,record=False,overrides=None):
    rnd=random.Random(seed); eco=economy(B); T=B['tuning']
    players=[]
    for i,a in enumerate(roster):
        A=ARCH[a]
        players.append(dict(id=i,arch=a,skill=min(.98,max(.3,rnd.gauss(*A['skill']))),build=A['build']*rnd.uniform(.85,1.15),
            minutes=A['minutes']*rnd.uniform(.7,1.3),sessions=A['sessions'],attend=A['attend'],stage=1,coins=T['start_coins'],
            fleet={1:T['start_machines']},stars=dict(jour=0.0,long=0.0,defi=0.0,rush=0.0),arrive={1:0.0},blocks=0,gis=0,research=None,queue=0,
            tiles=B['terrain']['start'][0]*B['terrain']['start'][1],hist=[] ,cdone=0,cmult=[]))
        if overrides and i in overrides: players[-1].update(overrides[i])
    G=B['gisement_upgrade']
    def V(p):     # coins/s produced
        raw=sum(n*eco[s]['raw']*p['skill'] for s,n in p['fleet'].items())
        cap=T['gis_base']*G['gain']**p['gis']
        v=sum(n*eco[s]['v']*p['skill'] for s,n in p['fleet'].items())
        return v*min(1,cap/raw) if raw>0 else v, raw/cap if cap else 0
    mcache={}
    def mof(s,prod):
        if prod in eco[s]['prods']: return eco[s]['prods'][prod]['m']
        if (s,prod) not in mcache:
            try: r=CH.report({prod:1.0},s); mcache[(s,prod)]=sum(r['machines'].values())
            except ValueError: mcache[(s,prod)]=None
        return mcache[(s,prod)]
    def prate(p,prod):
        return sum(n*p['skill']/mof(s,prod) for s,n in p['fleet'].items() if mof(s,prod))
    def tiles_used(p): return sum(n*eco[s]['tiles'] for s,n in p['fleet'].items())
    contracts=[]; unlocked={}
    for h in range(days*24):
        day,hod=divmod(h,24)
        reg=[V(p)[0] for p in players if p['arch']=='régulier']; refv=float(np.median(reg))
        if hod==18:
            for k in range(3):
                diff=rnd.choice(T['contract_diff'])
                contracts.append(dict(t0=h,value=refv*86400*diff,stars=T['contract_stars'][str(diff)],kind='jour',dl=48,prog={},done={}))
        if hod==0 and day in (0,7,14):
            contracts.append(dict(t0=h,value=refv*86400*T['long_size'],stars=T['long_stars'],kind='long',dl=96,prog={},done={}))
        for p in players:
            if p['research'] and h>=p['research'][1]:
                k=p['research'][0]; p['stage']=k; p['arrive'][k]=h/24; unlocked[k]=unlocked.get(k,0)+1; p['research']=None
            # offline builders (lutins constructeurs) place what the player has queued
            ab=T['auto_build'].get(str(p['stage']),0)
            if ab and p['queue']>0:
                e=eco[p['stage']]; k=min(p['queue'],ab,int(p['coins']//e['cost']))
                room=int((p['tiles']-sum(n*eco[s]['tiles'] for s,n in p['fleet'].items()))//e['tiles'])
                if room<k and p['tiles']<B['terrain']['max'][0]*B['terrain']['max'][1]:
                    bc=B['terrain']['block_cost']*B['terrain']['block_growth']**p['blocks']
                    if p['coins']>=bc+k*e['cost']: p['coins']-=bc; p['blocks']+=1; p['tiles']+=64
                    room=int((p['tiles']-sum(n*eco[s]['tiles'] for s,n in p['fleet'].items()))//e['tiles'])
                k=max(0,min(k,room))
                if k>0: p['coins']-=k*e['cost']; p['fleet'][p['stage']]=p['fleet'].get(p['stage'],0)+k; p['queue']-=k
            v,sat=V(p); inc=v*3600
            act=[c for c in contracts if p['id'] not in c['done'] and h-c['t0']<c['dl']]
            share=T['contract_share'] if act else 0
            p['coins']+=inc*(1-share)
            for c in act:
                norm=(refv/v)**T.get('contract_alpha',0) if v>0 else 1
                c['prog'][p['id']]=c['prog'].get(p['id'],0)+inc*share/len(act)*norm
                if c['prog'][p['id']]>=c['value']:
                    age=h-c['t0']; c['done'][p['id']]=age; p['coins']+=c['value']*T['contract_pay']
                    if c['kind']=='jour':
                        mult=next((x for lim,x in T['time_mult'] if age<lim),0); p['stars']['jour']+=c['stars']*mult; p['cdone']+=1; p['cmult'].append(mult)
                    else: p['stars']['long']+=c['stars']
            if hod in p['sessions'] and rnd.random()<p['attend']:
                mins=p['minutes']
                nxt=p['stage']+1
                if nxt<=8 and not p['research']:
                    g=B['gates'][str(nxt)]; cost=g['coins']
                    if unlocked.get(nxt,0)>=len(players)/2: cost*=1-T['research_discount']
                    if all(prate(p,k)>=q for k,q in g['rate'].items()) and p['coins']>=cost:
                        p['coins']-=cost; p['research']=(nxt,h+T['research_hours'][str(nxt)]); mins*=0.6
                e=eco[p['stage']]
                nbuild=int(mins*60/e['build_s']*p['build'])
                reserve=0
                if p['stage']<8:
                    g=B['gates'][str(p['stage']+1)]
                    if all(prate(p,k)>=q for k,q in g['rate'].items()):
                        need=g['coins']-p['coins']
                        hrs=need/max(1e-9,v*3600); payback=e['cost']/(e['v']*p['skill']*3600)
                        if payback>hrs*T['invest_horizon']: reserve=g['coins']
                if p['research']: reserve=0
                # deposits first if saturated
                if sat>0.95:
                    uc=G['cost']*G['growth']**p['gis']
                    if p['coins']-reserve>uc: p['coins']-=uc; p['gis']+=1
                budget=max(0,p['coins']-reserve); n=min(nbuild,int(budget//e['cost']))
                while tiles_used(p)+n*e['tiles']>p['tiles'] and p['tiles']<B['terrain']['max'][0]*B['terrain']['max'][1]:
                    bc=B['terrain']['block_cost']*B['terrain']['block_growth']**p['blocks']
                    if p['coins']-n*e['cost']<bc: n=max(0,int((p['tiles']-tiles_used(p))//e['tiles'])); break
                    p['coins']-=bc; p['blocks']+=1; p['tiles']+=64
                n=max(0,min(n,int(p['coins']//e['cost']))); p['coins']-=n*e['cost']; p['fleet'][p['stage']]=p['fleet'].get(p['stage'],0)+n
                # plan more for the builders: what the money of the next hours will pay for
                if T['auto_build'].get(str(p['stage']),0):
                    p['queue']=int(max(0,(v*3600*T['plan_hours'])-reserve*0)//e['cost'])
            if hod==23 and record: p['hist'].append(dict(day=day+1,stage=p['stage'],stars=sum(p['stars'].values()),v=V(p)[0]))
        if T.get('tiers'):
            for c in contracts:
                if c['kind']=='jour' and h-c['t0']==c['dl']-1:
                    for p in players:
                        if p['id'] in c['done']: continue
                        fr=c['prog'].get(p['id'],0)/c['value']
                        part=max([x for th,x in T['tiers'] if fr>=th] or [0])
                        if part: p['stars']['jour']+=c['stars']*part; p['cmult'].append(part)
        if hod==23:   # daily challenge: everybody who played today, ranked by skill + noise
            sc=sorted([(p['skill']+rnd.gauss(0,T['defi_noise']),p['id']) for p in players if rnd.random()<p['attend']],reverse=True)
            for rank,(x,i) in enumerate(sc): players[i]['stars']['defi']+=max(0,T['defi_max']-rank*T['defi_step'])
    rates=[prate(p,'sapin_decore')*min(1,1/max(1e-9,V(p)[1])) for p in players]; best=max(rates) or 1
    for p,r in zip(players,rates): p['stars']['rush']=T['rush_max']*(r/best)**T['rush_power']; p['rush_rate']=r*60
    return players
