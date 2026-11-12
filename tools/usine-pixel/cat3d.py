"""All production machines, modelled in local 3D (see m3d.py). Each face is drawn on its own:
'w+' operator side (controls), 'w-' service side (pipes, cables, hatches), 'u+' output end, 'u-' input end."""
from m3d import *
from mach import FAM
from items import item
from props import wreath
I=lambda r:[int(v) for v in r]
# ---------------- face decals ----------------
def d_planks(c):
    def fn(cv,r,f):
        x0,y0,x1,y1=I(r)
        for y in range(y0+3,y1-1,4): cv.r(x0+1,y,x1-1,y+1,dk(c,.22))
    return fn
def d_bricks(cv,r,f,base=C('#9a4a36'),mortar=C('#5e3a2e')):
    x0,y0,x1,y1=I(r)
    for y in range(y0+1,y1-1):
        row=(y-y0)//4
        for x in range(x0+1,x1-1):
            if (y-y0)%4==3 or (x+(0 if row%2 else 4))%8==0: cv.p(x,y,mortar)
def d_stone(cv,r,f): d_bricks(cv,r,f,C('#8a909c'),C('#5f6470'))
def d_screen(cv,r,f,col=C('#4dff9a')):
    x0,y0,x1,y1=I(r); cv.r(x0-1,y0-1,x1+1,y1+1,OUT); cv.r(x0,y0,x1,y1,C('#0f2a1c'))
    for i in range(x0+1,x1-1,3):
        h=1+int((math.sin(i*.9+f*1.6)+1)*(y1-y0-2)/2.5); cv.r(i,y1-1-h,i+2,y1-1,col)
def d_lights(cv,x,y,f,n=2):
    cols=[P['g0'],P['y1'],P['r1']]
    for i in range(n):
        on=(f+i)%2==0; cv.r(x+i*5,y,x+i*5+4,y+4,OUT); cv.r(x+i*5+1,y+1,x+i*5+3,y+3,cols[i%3] if on else dk(cols[i%3],.55))
def d_vents(cv,r,lit=None):
    x0,y0,x1,y1=I(r)
    for y in range(y0,y1-1,3):
        cv.r(x0,y,x1,y+2,C('#1a1b20'))
        if lit: cv.r(x0+1,y+1,x1-1,y+2,lit)
def d_hatch(cv,r,c):
    x0,y0,x1,y1=I(r); cv.r(x0,y0,x1,y1,dk(c,.12)); cv.r(x0,y0,x1,y0+1,lt(c,.2)); cv.r(x1-1,y0,x1,y1,dk(c,.35))
    cv.r(x1-4,(y0+y1)//2-1,x1-2,(y0+y1)//2+2,C('#c9ced8'))
def d_porthole(cv,cx,cy,rr,f,glow=None):
    cv.ell(cx,cy,rr+1.5,rr+1.5,lambda a,b,d,x,y: P['c0'] if d>.6 else None)
    cv.ell(cx,cy,rr,rr,lambda a,b,d,x,y: (mix(P['f3'],P['f0'],(1-d)*[.6,.9,.7,1][f]) if glow else C('#2a4a6a') if d>.3 else C('#6a9ac8')))
def d_gauge(cv,cx,cy,f,rr=3): gauge(cv,cx,cy,f,rr)
def d_hazard(cv,r): x0,y0,x1,y1=I(r); hazard(cv,x0,y0,x1,y1,3)
def d_fire(cv,r,f):
    rnd=random.Random(f*13); x0,y0,x1,y1=I(r)
    for y in range(y0,y1):
        for x in range(x0,x1):
            h=(y1-y)/max(1,(y1-y0))+rnd.uniform(0,.35)-math.sin(x*.9+f*2)*.1
            cv.p(x,y,[P['f0'],P['f1'],P['f2'],P['f3'],P['f4']][min(4,max(0,int(h*3.5)))])
def d_sign(cv,cx,cy,kind):
    cv.r(cx-4,cy-4,cx+4,cy+4,P['y1']); cv.r(cx-4,cy-4,cx+4,cy-3,P['y0'])
    if kind=='fire': cv.r(cx-1,cy-2,cx+1,cy+3,P['r1']); cv.p(cx,cy-3,P['r1'])
    if kind=='volt': [cv.p(cx+1-k,cy-3+k,OUT) for k in range(4)]; [cv.p(cx-1+k,cy+k//2,OUT) for k in range(3)]
    if kind=='paint': cv.r(cx-2,cy-2,cx+2,cy+2,P['b1'])
def d_cables(cv,r,f=0,cols=(P['r1'],C('#2a2d36'),P['y1'])):
    x0,y0,x1,y1=I(r)
    for i,c in enumerate(cols):
        x=x0+4+i*4
        if x+2>x1: break
        cv.r(x,y0+2,x+2,y1-1,c); cv.r(x,y0+2,x+1,y1-1,lt(c,.25))
def d_pipes_v(cv,r,f=0,c=None):
    c=c or P['c1']
    x0,y0,x1,y1=I(r)
    for x in (x0+4,x1-8):
        if x+4>x1: continue
        cv.r(x,y0+1,x+4,y1-1,c); cv.r(x,y0+1,x+1,y1-1,lt(c,.3)); cv.r(x+3,y0+1,x+4,y1-1,dk(c,.3))
        for y in range(y0+4,y1-2,7): cv.r(x-1,y,x+5,y+2,dk(c,.35))
def d_rivets(cv,r,f=0,c=None):
    c=c or P['c0']; x0,y0,x1,y1=I(r)
    for x in range(x0+2,x1-2,6): cv.p(x,y0+2,c); cv.p(x,y1-3,c)
def d_label(cv,r,c=C('#e4e7ec')):
    x0,y0,x1,y1=I(r); cv.r(x0,y0,x1,y1,c); cv.r(x0+2,y0+2,x1-2,y0+3,C('#5e6475')); cv.r(x0+2,y0+5,x1-5,y0+6,C('#5e6475'))
def compose(*fns):
    def fn(cv,r,f):
        for g in fns: g(cv,r,f)
    return fn
def inset(r,a,b=None,c=None,d=None):
    """sub-rect relative to a face rect: offsets (left, top, right, bottom) ; negative = from the far edge"""
    x0,y0,x1,y1=r; b=a if b is None else b; c=a if c is None else c; d=b if d is None else d
    return (x0+a,y0+b,x1-c,y1-d)
# ---------------- shared bodies ----------------
def table(ob,u0,u1,w0,w1,zt,fam,faces=None,apron=5):
    """wooden table: 4 legs + top slab (with apron faces)"""
    for (u,w) in ((u0+1,w0+1),(u1-4,w0+1),(u0+1,w1-4),(u1-4,w1-4)):
        ob.box(u,u+3,w,w+3,0,zt-apron,P['w2'],P['w2'],out=True)
    ob.box(u0,u1,w0,w1,zt-apron,zt,P['w1'],P['w2'],faces=faces,topfn=planks_top(ob,u0,u1,w0,w1,zt))
def planks_top(ob,u0,u1,w0,w1,z):
    def fn(f):
        for w in range(int(w0)+4,int(w1)-1,4):
            (xa,ya),(xb,yb)=ob.P(u0+1,w,z),ob.P(u1-1,w,z)
            if abs(ya-yb)<1: ob.cv.r(min(xa,xb),ya,max(xa,xb),ya+1,P['w2'])
            else: ob.cv.r(xa,min(ya,yb),xa+1,max(ya,yb),P['w2'])
    return fn
def bands_top(ob,u0,u1,w0,w1,z,c,step=12):
    def fn(f):
        for u in range(int(u0)+step//2,int(u1),step):
            (xa,ya),(xb,yb)=ob.P(u,w0+1,z),ob.P(u,w1-1,z)
            if abs(ya-yb)<1: ob.cv.r(min(xa,xb),ya,max(xa,xb),ya+2,c)
            else: ob.cv.r(xa,min(ya,yb),xa+2,max(ya,yb),c)
    return fn
def hazard_top(ob,u0,u1,w0,w1,z):
    def fn(f):
        (xa,ya),(xb,yb)=ob.P(u0,w0,z),ob.P(u1,w1,z)
        X0,X1,Y0,Y1=min(xa,xb),max(xa,xb),min(ya,yb),max(ya,yb)
        for y in range(int(Y0),int(Y1)):
            for x in range(int(X0),int(X1)):
                if x<X0+3 or x>=X1-3 or y<Y0+3 or y>=Y1-3: ob.cv.p(x,y,P['y1'] if ((x+y)//3)%2==0 else C('#24252c'))
    return fn
def top_rect(ob,u0,u1,w0,w1,z):
    (xa,ya),(xb,yb)=ob.P(u0,w0,z),ob.P(u1,w1,z); return (min(xa,xb),min(ya,yb),max(xa,xb),max(ya,yb))
def ports_body(ob,fam,ports):
    if ports: ob.hoods(fam); return 6,ob.L-6
    return 2,ob.L-2
def chimney(ob,u,w,z0,z1,c,f_smoke=True,r=3.5):
    ob.cylz(u,w,r,z0,z1,c,cap_dark=True)
    if f_smoke:
        def fn(f):
            X,Y=ob.P(u,w,z1); puff(ob.cv,X,Y-1,f,2,rise=12,drift=3)
        ob.custom((30,ob.g(u,w)[1]+r+1),fn)
# ======================= ARTISANAL =======================
def A_kiln(o,ports=False,bellows=False):
    F=FAM['art']; ob=Obj(2,1,o); D=ob.D; L=ob.L
    u0,u1=ports_body(ob,F,ports)
    stone=C('#9aa0a8'); sf=C('#8a909c')
    def ash_door(cv,r,f):   # output end : small iron ash door, glow in the gaps
        d_stone(cv,r,f); x0,y0,x1,y1=I(r); cx=(x0+x1)//2
        cv.r(cx-5,y1-9,cx+5,y1-2,C('#2a2a30')); cv.r(cx-4,y1-8,cx+4,y1-7,P['f2'] if f%2 else P['f3'])
    def stoke(cv,r,f):      # input end : wood stack against the base
        d_stone(cv,r,f); x0,y0,x1,y1=I(r)
        for k in range(3): cv.r(x0+3+k*5,y1-7,x0+7+k*5,y1-2,P['w1']); cv.p(x0+5+k*5,y1-5,P['w0'])
    def back(cv,r,f): d_stone(cv,r,f); x0,y0,x1,y1=I(r); cv.r(x0+6,y0+3,x0+10,y1-2,P['m2'])
    ob.box(u0,u1,2,D-2,0,12,stone,sf,faces={'w+':d_stone,'u+':ash_door,'u-':stoke,'w-':back})
    uc,wc=(u0+u1)/2,D/2
    duc,R=u0+20,13
    def dome(f):
        cv=ob.cv
        X,Yg=ob.P(duc,D/2,12); cy0=Yg-R*.45; cut=Yg+R*.8
        cv.ell(X,cy0,R+1,R*1.25,lambda a,b,d,x,y: (sphere(P['c1'],a,b,d,False) if y<=cut else None))
        for y in range(int(cy0-R*1.3),int(cut)):
            for x in range(int(X-R),int(X+R)):
                c=cv.g(x,y)
                if c[3] and c[:3]==P['c1'][:3] and (x*3+y*5)%13==0: cv.p(x,y,P['c2'])
        Xf,Yf=ob.P(duc,D/2+R-2,12)   # point of the dome facing the operator side
        if o=='e':
            mw=7; cv.ell(Xf,Yf,mw+2,mw+3,lambda a,b,d,x,y: C('#3a1a10') if y<=Yf else None); d_fire(cv,(Xf-mw+1,Yf-mw,Xf+mw-1,Yf+1),f)
        elif o in('s','n'):
            for y in range(int(Yg-10),int(Yg+2)): cv.r(Xf-1,y,Xf+1,y+1,(255,150,60,int(160*[.6,.9,.7,1][f])))
        else:
            cv.ell(X,cy0-R*.3,3,2,lambda a,b,d,x,y: C('#3a1a10'))
    ob.custom((12,ob.depth((duc,),(D/2+R,))),dome)
    chimney(ob,u1-12,D/2,12,40,P['c2'])
    if bellows:
        def bel(cv,r,f):
            x0,y0,x1,y1=I(r); sq=[0,2,3,2][f]
            cv.r(x0,y0+sq,x1,y1,P['w2']); cv.r(x0,y0+sq,x1,y0+1+sq,P['w0'])
            for x in range(x0+1,x1,3): cv.r(x,y0+1+sq,x+1,y1,P['w3'])
        ob.box(u0-2 if not ports else u0,u0+12,D-12,D-2,0,8,P['w1'],P['w2'],faces={'w+':bel,'u-':bel,'w-':bel,'u+':bel})
    return ob
def A_paint_table(o,ports=False):
    F=FAM['art']; ob=Obj(2,1,o); D=ob.D
    u0,u1=ports_body(ob,F,ports)
    if ports: ob.box(u0,u1,2,D-2,0,8,P['w2'],P['w3'],faces={'w+':d_planks(P['w3'])})
    def apron_front(cv,r,f):
        x0,y0,x1,y1=I(r); cv.r((x0+x1)//2-6,y0+1,(x0+x1)//2+6,y1,P['w0']); cv.r((x0+x1)//2-1,y0+2,(x0+x1)//2+1,y0+3,P['m1'])
        for sx,c in ((x0+4,P['r1']),(x1-8,P['b1'])): cv.p(sx,y1-1,c); cv.p(sx+1,y1-1,c)
    def apron_end(cv,r,f): x0,y0,x1,y1=I(r); cv.r(x0+3,y0+1,x1-3,y1-1,P['w2'])
    table(ob,u0,u1,4,D-4,16,F,faces={'w+':apron_front,'u+':apron_end,'u-':apron_end,'w-':apron_end})
    # drying rack on the service side: 2 posts + bar along u, balls hanging from it
    ob.box(u0+2,u0+5,4,7,16,46,P['w2'],P['w2']); ob.box(u1-5,u1-2,4,7,16,46,P['w2'],P['w2'])
    ob.box(u0+2,u1-2,4,7,43,46,P['w1'],P['w2'])
    cols=[P['r1'],P['g1'],P['y1'],P['b1']]
    def balls(f):
        n=4; sw=[0,1,0,-1][f]
        for i in range(n):
            u=u0+10+i*((u1-u0-20)/(n-1)); z=34
            X,Y=ob.P(u,5.5,43); X2,Y2=ob.P(u,5.5,z)
            off=sw if i%2 else -sw
            for y in range(int(Y),int(Y2)): ob.cv.p(X+off*(y-Y)/max(1,Y2-Y),y,P['s2'])
            ob.cv.ell(X2+off,Y2,3.5,3.5,lambda a,b,d,x,y,c=cols[i]: sphere(c,a,b,d))
    ob.custom((44,ob.depth((u0,u1),(5,6))),balls)
    # paint pots on the table + ball on its stand
    for i,c in enumerate(cols):
        ob.cylz(u0+8+i*7,D-10,2.5,16,22,P['m1'],key=(16,ob.depth((u0+8+i*7,),(D-8,))))
        ob.sphere(u0+8+i*7,D-10,22,1.6,c,key=(17,ob.depth((u0+8+i*7,),(D-8,))))
    def ball(f):
        X,Y=ob.P(u1-10,D-12,22); ob.cv.r(X-1,Y,X+1,Y+5,P['w3']); ob.cv.ell(X,Y-3,4,4,lambda a,b,d,x,y: sphere(P['s1'] if f<2 else P['r1'],a,b,d))
    ob.custom((16,ob.depth((u1-10,),(D-10,))),ball)
    return ob
def A_wreath_table(o,ports=False):
    F=FAM['art']; ob=Obj(2,1,o); D=ob.D
    u0,u1=ports_body(ob,F,ports)
    if ports: ob.box(u0,u1,2,D-2,0,8,P['w2'],P['w3'],faces={'w+':d_planks(P['w3'])})
    def apron(cv,r,f):
        x0,y0,x1,y1=I(r)
        for k in range(0,x1-x0-4,6): cv.r(x0+2+k,y0+1,x0+4+k,y0+3,P['g1'])
    table(ob,u0,u1,4,D-4,16,F,faces={'w+':apron,'u+':d_planks(P['w3']),'u-':d_planks(P['w3']),'w-':d_planks(P['w3'])})
    # pegboard on the service side: its front ('w+') carries the hanging wreaths, its back is bare
    def peg_front(cv,r,f):
        x0,y0,x1,y1=I(r)
        for y in range(y0+3,y1-1,5):
            for x in range(x0+3,x1-2,5): cv.p(x,y,P['w3'])
        n=max(1,(x1-x0)//22)
        for i in range(n): wreath(cv,x0+11+i*22,y0+12,7)
    def peg_edge(cv,r,f): x0,y0,x1,y1=I(r); cv.r(x0,y0,x1,y1,P['w3'])
    ob.box(u0+3,u1-3,3,6,16,46,P['w2'],P['w2'],faces={'w+':peg_front,'u+':peg_edge,'u-':peg_edge,'w-':d_planks(P['w3'])})
    def work(f):
        X,Y=ob.P((u0+u1)/2,D-12,16); wreath(ob.cv,X,Y-2,5.5,bow=f>=2)
        Xb,Yb=ob.P(u0+8,D-12,16)
        for k in range(6): ob.cv.p(Xb+k,Yb-2+k%2,P['g1'])
        Xr,Yr=ob.P(u1-8,D-12,16); ob.cv.r(Xr-3,Yr-4,Xr+3,Yr,P['r1'])
    ob.custom((16,ob.depth((u0,u1),(D-10,))),work)
    return ob
def A_lathe(o,ports=False):
    F=FAM['art']; ob=Obj(2,1,o); D=ob.D
    u0,u1=ports_body(ob,F,ports)
    if ports: ob.box(u0,u1,2,D-2,0,8,P['w2'],P['w3'])
    table(ob,u0,u1,4,D-4,16,F,faces={'w+':d_planks(P['w3']),'u+':d_planks(P['w3']),'u-':d_planks(P['w3']),'w-':d_planks(P['w3'])})
    ob.box(u0+3,u0+11,8,D-8,16,28,P['m1'],P['m2'],faces={'u-':compose(lambda cv,r,f: d_rivets(cv,r,f,P['m0']))})
    ob.box(u1-11,u1-3,10,D-10,16,26,P['m1'],P['m2'])
    def wood(f):
        a,b=ob.P(u0+11,D/2,22),ob.P(u1-11,D/2,22)
        if abs(a[1]-b[1])<1:
            for x in range(int(min(a[0],b[0])),int(max(a[0],b[0]))): ob.cv.r(x,a[1]-3,x+1,a[1]+3,P['w0'] if (x+f*2)%6<3 else P['w1'])
        else:
            for y in range(int(min(a[1],b[1])),int(max(a[1],b[1]))): ob.cv.r(a[0]-3,y,a[0]+3,y+1,P['w0'] if (y+f*2)%6<3 else P['w1'])
    ob.custom((17,ob.depth((u0+11,u1-11),(D/2,))),wood)
    ob.disc('w',u0+12,D-3,7,6,P['m1'],spokes=4,ang=lambda f:f*math.pi/8)   # flywheel under the table, wheel plane u-z
    def star(f):
        X,Y=ob.P(u1-14,D-8,16); ob.cv.paste(item('wood_star'),X-8,Y-14)
    ob.custom((16,ob.depth((u1-14,),(D-6,))),star)
    return ob
def A_tree_bench(o,ports=False):
    F=FAM['art']; ob=Obj(2,1,o); D=ob.D
    u0,u1=ports_body(ob,F,ports)
    table(ob,u0,u1,4,D-4,16,F,faces={'w+':d_planks(P['w3']),'u+':d_planks(P['w3']),'u-':d_planks(P['w3']),'w-':d_planks(P['w3'])})
    def tree(f):
        X,Y=ob.P(u0+(u1-u0)*.4,D/2,16)
        for y in range(int(Y-24),int(Y)):
            w=(y-(Y-24))*.36
            for x in range(int(X-w),int(X+w)+1): ob.cv.p(x,y,P['g1'] if x<X else P['g2'])
        ob.cv.r(X-1,Y-1,X+2,Y+1,P['w3']); ob.cv.p(X,Y-25,P['y1'])
        for k,(dx,dy) in enumerate(((-3,-6),(2,-11),(-1,-16))):
            if k<=f: ob.cv.p(X+dx,Y+dy,[P['r1'],P['y1'],P['b1']][k])
    ob.custom((16,ob.depth((u0+(u1-u0)*.4,),(D/2,))),tree)
    ob.box(u1-14,u1-4,D-12,D-5,16,21,P['w3'],P['w3'],faces={'w+':lambda cv,r,f:[cv.p(r[0]+2+k*3,r[1]+2,[P['r1'],P['y1'],P['b1']][k]) for k in range(3)]})
    return ob
def A_star_press(o):
    F=FAM['art']; ob=Obj(2,1,o); D=ob.D
    u0,u1=ports_body(ob,F,True)
    def front(cv,r,f): d_planks(P['w3'])(cv,r,f); x0,y0,x1,y1=I(r); d_hatch(cv,(x0+6,y0+4,x0+18,y1-3),P['w1'])
    def outend(cv,r,f): d_planks(P['w3'])(cv,r,f); x0,y0,x1,y1=I(r); cv.r(x0+3,y0+3,x1-3,y0+6,P['m2'])
    def back(cv,r,f): d_planks(P['w3'])(cv,r,f); x0,y0,x1,y1=I(r); [cv.r(x,y0+3,x+3,y1-3,P['m2']) for x in range(x0+8,x1-8,16)]
    ob.box(u0,u1,2,D-2,0,18,P['w1'],P['w2'],faces={'w+':front,'u+':outend,'u-':outend,'w-':back},topfn=planks_top(ob,u0,u1,2,D-2,18))
    uc=(u0+u1)/2
    for du in (-12,9): ob.box(uc+du,uc+du+3,12,D-12,18,40,P['m2'],P['m2'])
    ob.box(uc-14,uc+14,12,D-12,40,44,P['m1'],P['m2'])
    def screw(f):
        k=[0,2,4,2][f]; X,Y=ob.P(uc,D/2,40); X2,Y2=ob.P(uc,D/2,24-k)
        ob.cv.r(X-1,Y,X+2,Y2,P['m0']); ob.cv.r(X-8,Y2,X+8,Y2+3,P['m1'])
        a=f*math.pi/2; Xh,Yh=ob.P(uc,D/2,48)
        ob.cv.r(Xh-9,Yh,Xh+9,Yh+2,P['r1']); ob.cv.r(Xh+math.cos(a)*8-1,Yh-4,Xh+math.cos(a)*8+2,Yh,P['w0'])
    ob.custom((41,ob.depth((uc,),(D/2+1,))),screw)
    return ob
def A_loom(o):
    F=FAM['art']; ob=Obj(2,1,o); D=ob.D
    u0,u1=ports_body(ob,F,True)
    def front(cv,r,f):
        d_planks(P['w3'])(cv,r,f); x0,y0,x1,y1=I(r)
        for i,c in enumerate((P['r1'],P['y1'],P['b1'])): cv.r(x0+4+i*8,y0+3,x0+10+i*8,y0+8,c)
    ob.box(u0,u1,2,D-2,0,16,P['w1'],P['w2'],faces={'w+':front,'u+':d_planks(P['w3']),'u-':d_planks(P['w3']),'w-':d_planks(P['w3'])},topfn=planks_top(ob,u0,u1,2,D-2,16))
    for uu in (u0+8,u1-8):
        ob.box(uu-2,uu+2,D/2-2,D/2+2,16,30,P['w2'],P['w2'])
        ob.disc('w',uu,D/2+3,30,6,P['g1'],spokes=3,ang=lambda f:f*math.pi/4,rim=P['g2'])
    def strand(f):
        a,b=ob.P(u0+12,D/2+3,30),ob.P(u1-12,D/2+3,30)
        n=int(max(abs(a[0]-b[0]),abs(a[1]-b[1])))
        for i in range(n):
            t=i/max(1,n); x=a[0]+(b[0]-a[0])*t; y=a[1]+(b[1]-a[1])*t+math.sin(t*math.pi)*7
            ob.cv.p(x,y,P['g2']); ob.cv.p(x,y-1,P['g1'])
            if (i+f*2)%5==0: ob.cv.r(x,y+1,x+2,y+3,[P['r1'],P['y1'],P['b1']][(i//5)%3])
    ob.custom((31,ob.depth((u0,u1),(D/2+3,))),strand)
    return ob
# ======================= VAPEUR =======================
IRON=C('#55625c'); IRONF=C('#3e4a45')
def v_body(ob,u0,u1,Z,faces):
    D=ob.D; ob.box(u0,u1,2,D-2,0,Z,IRON,IRONF,faces=faces,topfn=bands_top(ob,u0,u1,2,D-2,Z,P['c1'],14))
def v_feed_pipe(ob,u):
    """steam inlet on the service side, rising from the floor: seen in w/s/n, hidden behind the body in e"""
    ob.box(u-3,u+3,0,4,0,26,P['c1'],P['c1'],faces={'w-':lambda cv,r,f: cv.r(r[0],r[1],r[0]+1,r[3],P['c0'])})
def V_furnace(o):
    F=FAM['vap']; ob=Obj(2,1,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    def front(cv,r,f):
        x0,y0,x1,y1=I(r); cx=(x0+x1)//2
        cv.r(cx-8,y0+5,cx+8,y1-3,C('#22262a')); d_fire(cv,(cx-6,y0+7,cx+6,y1-4),f); cv.r(cx-9,y0+4,cx+9,y0+6,P['c1'])
        d_gauge(cv,x1-8,y0+9,f); d_rivets(cv,r)
    def outend(cv,r,f): x0,y0,x1,y1=I(r); d_porthole(cv,(x0+x1)//2,y0+8,3.5,f,glow=True); d_rivets(cv,r)
    def inend(cv,r,f): x0,y0,x1,y1=I(r); cv.r(x0+4,y0+4,x1-4,y0+8,C('#22262a')); d_rivets(cv,r)
    def back(cv,r,f): d_pipes_v(cv,r); d_rivets(cv,r)
    v_feed_pipe(ob,u0+10)
    v_body(ob,u0,u1,24,{'w+':front,'u+':outend,'u-':inend,'w-':back})
    def grill(f):
        X0,Y0,X1,Y1=top_rect(ob,u0+4,u0+22,6,D-6,24); ob.cv.r(X0,Y0,X1,Y1,C('#2a2d32'))
        for x in range(int(X0)+1,int(X1),3): ob.cv.r(x,Y0+1,x+1,Y1-1,P['f2'] if (x+f)%2 else P['f3'])
    ob.custom((24,ob.depth((u0,u1),(2,D-2))),grill)
    chimney(ob,u1-12,10,24,44,IRONF)
    return ob
def V_sprayer(o):
    F=FAM['vap']; ob=Obj(2,1,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    cols=[P['r1'],P['g1'],P['y1'],P['b1']]
    def front(cv,r,f):
        x0,y0,x1,y1=I(r); d_gauge(cv,x0+8,y0+9,f)
        for i,c in enumerate(cols): cv.r(x0+16+i*5,y0+6,x0+19+i*5,y0+10,c if i==f else dk(c,.5))
        d_rivets(cv,r)
    def outend(cv,r,f): x0,y0,x1,y1=I(r); d_vents(cv,(x0+4,y0+4,x1-4,y1-4)); d_rivets(cv,r)
    def back(cv,r,f): d_pipes_v(cv,r); d_rivets(cv,r)
    v_feed_pipe(ob,u0+12)
    v_body(ob,u0,u1,20,{'w+':front,'u+':outend,'u-':outend,'w-':back})
    ob.cyl_lie('u',u0+3,u1-18,7,26,6,P['c1'])     # paint tank lying on the service side
    def booth(f):
        X0,Y0,X1,Y1=top_rect(ob,u1-18,u1-3,4,D-4,20); ob.cv.r(X0,Y0,X1,Y1,C('#22262a'))
        c=cols[f]; X,Y=(X0+X1)/2,(Y0+Y1)/2
        for k in range(8):
            for j in range(-k//3,k//3+1): ob.cv.p(X+j,Y0+1+k,(c[0],c[1],c[2],150-k*15))
        ob.cv.ell(X,Y1-4,3.5,3.5,lambda a,b,d,x,y: sphere(c,a,b,d))
    ob.custom((20,ob.depth((u1-18,u1-3),(4,D-4))),booth)
    return ob
def V_press(o):
    F=FAM['vap']; ob=Obj(2,1,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    def front(cv,r,f): x0,y0,x1,y1=I(r); d_gauge(cv,x1-8,y0+8,f); d_label(cv,(x0+4,y0+4,x0+16,y0+11)); d_rivets(cv,r)
    def back(cv,r,f): d_pipes_v(cv,r); d_rivets(cv,r)
    def endf(cv,r,f): d_rivets(cv,r)
    v_feed_pipe(ob,u1-12)
    v_body(ob,u0,u1,16,{'w+':front,'u+':endf,'u-':endf,'w-':back})
    uc=(u0+u1)/2
    for du in (-14,11): ob.box(uc+du,uc+du+3,8,D-8,16,42,IRONF,IRONF)
    ob.box(uc-16,uc+16,8,D-8,42,46,IRON,IRONF)
    ob.disc('u',u1-1,D/2,30,9,P['c1'],spokes=4,ang=lambda f:f*math.pi/4)   # flywheel on the output end
    def piston(f):
        k=[0,6,10,5][f]; X,Y=ob.P(uc,D/2,42); X2,Y2=ob.P(uc,D/2,30-k)
        cyl_v(ob.cv,X-3,X+3,Y,Y2,C('#c9ced8')); ob.cv.r(X-9,Y2,X+9,Y2+3,P['c1'])
        Xs,Ys=ob.P(uc,D/2,16); ob.cv.paste(item('star') if f>=2 else item('wood_star'),Xs-8,Ys-14)
    ob.custom((17,ob.depth((uc,),(D/2+1,))),piston)
    return ob
def V_loom(o):
    F=FAM['vap']; ob=Obj(2,1,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    def front(cv,r,f): x0,y0,x1,y1=I(r); d_gauge(cv,x0+8,y0+8,f); d_rivets(cv,r)
    def outend(cv,r,f): d_rivets(cv,r)
    def back(cv,r,f): d_pipes_v(cv,r); d_rivets(cv,r)
    v_feed_pipe(ob,u0+10)
    v_body(ob,u0,u1,16,{'w+':front,'u+':outend,'u-':outend,'w-':back})
    for uu in (u0+9,u1-9): ob.disc('w',uu,D/2+2,28,7,P['c1'],spokes=6,ang=lambda f,uu=uu:(f*.5 if uu<40 else -f*.5))
    ob.disc('u',u1-2,8,22,5,P['c0'],spokes=3,ang=lambda f:f*.6)   # drive pulley on the output end
    def strand(f):
        a,b=ob.P(u0+14,D/2+2,28),ob.P(u1-14,D/2+2,28); n=int(max(abs(a[0]-b[0]),abs(a[1]-b[1])))
        for i in range(n):
            t=i/max(1,n); x=a[0]+(b[0]-a[0])*t; y=a[1]+(b[1]-a[1])*t+math.sin(t*math.pi)*6
            ob.cv.p(x,y,P['g2']); ob.cv.p(x,y-1,P['g1'])
            if (i+f*2)%5==0: ob.cv.r(x,y+1,x+2,y+3,[P['r1'],P['y1'],P['b1']][(i//5)%3])
    ob.custom((29,ob.depth((u0,u1),(D/2+2,))),strand)
    puff_at(ob,u1-14,6,16)
    return ob
def puff_at(ob,u,w,z):
    def fn(f): X,Y=ob.P(u,w,z); puff(ob.cv,X,Y-2,f,1,rise=8)
    ob.custom((40,ob.g(u,w)[1]),fn)
def V_wreath(o):
    F=FAM['vap']; ob=Obj(2,1,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    def front(cv,r,f): x0,y0,x1,y1=I(r); d_gauge(cv,x1-8,y0+8,f); d_rivets(cv,r)
    def back(cv,r,f): d_pipes_v(cv,r); d_rivets(cv,r)
    v_feed_pipe(ob,u0+12)
    v_body(ob,u0,u1,16,{'w+':front,'u+':d_rivets,'u-':d_rivets,'w-':back})
    uc=(u0+u1)/2
    def mould(f):
        X,Y=ob.P(uc,D/2,16); ob.cv.ell(X,Y,10,6,lambda a,b,d,x,y: C('#22262a') if d>.35 else None); wreath(ob.cv,X,Y,6,bow=f>=2)
    ob.custom((16,ob.depth((uc,),(D/2,))),mould)
    for du in (-14,11): ob.box(uc+du,uc+du+3,10,D-10,16,40,IRONF,IRONF)
    ob.box(uc-16,uc+16,10,D-10,40,43,IRON,IRONF)
    def ram(f):
        k=[0,3,5,2][f]; X,Y=ob.P(uc,D/2,40); X2,Y2=ob.P(uc,D/2,28-k)
        ob.cv.r(X-1,Y,X+1,Y2,C('#c9ced8')); ob.cv.r(X-11,Y2,X+11,Y2+3,P['c1'])
    ob.custom((41,ob.depth((uc,),(D/2+1,))),ram)
    return ob
def V_tree(o):
    F=FAM['vap']; ob=Obj(2,2,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    def front(cv,r,f): x0,y0,x1,y1=I(r); d_gauge(cv,x1-8,y0+8,f); d_label(cv,(x0+4,y0+4,x0+18,y0+11)); d_rivets(cv,r)
    def back(cv,r,f): d_pipes_v(cv,r); d_rivets(cv,r)
    v_feed_pipe(ob,u0+12)
    v_body(ob,u0,u1,18,{'w+':front,'u+':d_rivets,'u-':d_rivets,'w-':back})
    uc,wc=(u0+u1)/2,D/2
    ob.disc('z',uc,wc+6,18,10,P['c1'],spokes=0)
    def tree(f):
        X,Y=ob.P(uc,wc+6,18)
        for y in range(int(Y-28),int(Y-1)):
            w=(y-(Y-28))*.38
            for x in range(int(X-w),int(X+w)+1): ob.cv.p(x,y,P['g1'] if x<X else P['g2'])
        for k,(dx,dy) in enumerate(((-4,-6),(3,-11),(-2,-17),(1,-22))):
            if k<=f: ob.cv.r(X+dx,Y+dy,X+dx+2,Y+dy+2,[P['r1'],P['y1'],P['b1'],P['r1']][k])
        ob.cv.p(X,Y-29,P['y1'])
    ob.custom((19,ob.depth((uc,),(wc+6,))+1),tree)
    for uu in (u0+8,u1-8): ob.disc('w',uu,D-4,26,5,P['c1'],spokes=6,ang=lambda f:f*.5)
    chimney(ob,u1-10,8,18,34,IRONF)
    return ob
def V_boiler(o):
    F=FAM['vap']; ob=Obj(2,2,o); D=ob.D; L=ob.L
    def front(cv,r,f):
        d_bricks(cv,r,f); x0,y0,x1,y1=I(r); cv.r(x0+6,y0+5,x0+18,y1-3,C('#22262a')); d_fire(cv,(x0+7,y0+7,x0+17,y1-4),f); d_gauge(cv,x1-10,y0+9,f)
    def endf(cv,r,f):
        d_bricks(cv,r,f); x0,y0,x1,y1=I(r); cv.r(x0+4,y0+4,x0+7,y1-4,C('#bfe6ff')); cv.r(x0+4,y0+4+[6,5,6,7][f],x0+7,y1-4,C('#3d8be0'))
    def back(cv,r,f): d_bricks(cv,r,f); x0,y0,x1,y1=I(r); cv.r(x0+6,y0+6,x0+16,y1-4,C('#3a3531'))
    ob.box(2,L-2,2,D-2,0,18,C('#6b6660'),C('#9a4a36'),faces={'w+':front,'u+':endf,'u-':endf,'w-':back})
    ob.cyl_lie('u',6,L-14,D/2,32,13,P['c1'])
    for uu in (16,32,46):
        def band(f,uu=uu):
            a=ob.P(uu,D/2,45); b=ob.P(uu,D/2,19)
            ob.cv.r(a[0]-1,a[1],a[0]+1,b[1],P['c2']) if abs(ob.P(uu,0,0)[1]-ob.P(uu,D,0)[1])>1 else None
        ob.custom((46,ob.depth((uu,),(D/2,))),band)
    chimney(ob,L-10,D/2,18,58,IRONF,r=5)
    def valve(f): X,Y=ob.P(14,8,45); ob.cv.r(X-1,Y-4,X+2,Y,P['m1']); puff(ob.cv,X,Y-5,(f+2)%4,1,rise=8,drift=-3)
    ob.custom((46,ob.g(14,8)[1]),valve)
    return ob
# ======================= ELECTRIQUE =======================
STEEL=FAM['elec']['top']; STEELF=FAM['elec']['face']
def e_body(ob,u0,u1,Z,faces,frame=True,w0=2,w1=None):
    D=ob.D; w1=w1 or D-2
    ob.box(u0,u1,w0,w1,0,Z,STEEL,STEELF,faces=faces,topfn=hazard_top(ob,u0,u1,w0,w1,Z) if frame else None)
def e_front_std(extra=None):
    def fn(cv,r,f):
        x0,y0,x1,y1=I(r); hazard(cv,x0+1,y1-5,x1-1,y1-2,3); bolt(cv,x0+2,y0+2); bolt(cv,x1-4,y0+2)
        if extra: extra(cv,r,f)
    return fn
def e_back(cv,r,f):
    x0,y0,x1,y1=I(r); d_cables(cv,(x0,y0,x1,y1),f); d_vents(cv,(x1-14,y0+4,x1-4,y1-4))
def e_end(kind):
    def fn(cv,r,f):
        x0,y0,x1,y1=I(r); cx=(x0+x1)//2
        if kind=='fan':
            cv.ell(cx,y0+9,6,6,lambda a,b,d,x,y: C('#2a2d36') if d>.75 else C('#4e5361'))
            for k in range(3):
                t=f*.8+k*2.094
                for q in range(1,5): cv.p(cx+math.cos(t)*q,y0+9+math.sin(t)*q,C('#c9ced8'))
        if kind=='door': d_hatch(cv,(x0+4,y0+3,x1-4,y1-4),STEELF)
        if kind=='label': d_label(cv,(x0+4,y0+4,x1-4,y0+11))
        bolt(cv,x0+1,y0+1); bolt(cv,x1-3,y0+1)
    return fn
def E_furnace(o):
    F=FAM['elec']; ob=Obj(2,1,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    glow=lambda f:[.7,.9,.8,1][f]
    def x(cv,r,f): x0,y0,x1,y1=I(r); d_vents(cv,(x0+5,y0+5,x0+20,y1-7),lit=mix(C('#7a2a10'),C('#ff9a3a'),glow(f))); d_screen(cv,(x1-21,y0+5,x1-6,y0+12),f,C('#ffb02a'))
    def outend(cv,r,f): e_end('fan')(cv,r,f); d_sign(cv,r[2]-8,r[1]+8,'fire') if r[2]-r[0]>26 else None
    e_body(ob,u0,u1,24,{'w+':e_front_std(x),'w-':e_back,'u+':outend,'u-':e_end('label')})
    def crucible(f):
        X,Y=ob.P((u0+u1)/2,D/2,24); g=glow(f)
        ob.cv.ell(X,Y,9,6,lambda a,b,d,x,y: C('#2a2d36') if d>.6 else mix(P['f3'],P['f0'],g*(1-d)))
        for a in range(0,360,30): t=math.radians(a); ob.cv.p(X+math.cos(t)*10.5,Y+math.sin(t)*7,P['c1'])
    ob.custom((24,ob.depth(((u0+u1)/2,),(D/2,))),crucible)
    return ob
def E_paint(o):
    F=FAM['elec']; ob=Obj(2,2,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    cols=[P['r1'],P['g1'],P['y1'],P['b1']]
    def x(cv,r,f):
        x0,y0,x1,y1=I(r)
        for i,c in enumerate(cols): cv.r(x0+6+i*6,y0+6,x0+10+i*6,y0+10,OUT); cv.r(x0+7+i*6,y0+7,x0+9+i*6,y0+9,c if i==f else dk(c,.5))
        if x1-x0>44: d_screen(cv,(x1-22,y0+5,x1-6,y0+15),f)
    def outend(cv,r,f):   # drying tunnel exit : plastic curtain strips
        x0,y0,x1,y1=I(r); cv.r(x0+4,y0+4,x1-4,y1-6,C('#2a2d36'))
        for xx in range(x0+5,x1-5,3): cv.r(xx,y0+5,xx+2,y1-7,(200,230,255,150))
        bolt(cv,x0+1,y0+1); bolt(cv,x1-3,y0+1)
    def inend(cv,r,f): e_end('fan')(cv,r,f); d_sign(cv,r[2]-8,r[1]+8,'paint')
    e_body(ob,u0,u1,28,{'w+':e_front_std(x),'w-':e_back,'u+':outend,'u-':inend},frame=False)
    def glass(f):
        X0,Y0,X1,Y1=[int(v) for v in top_rect(ob,u0+4,u1-4,4,D-4,28)]
        for y in range(Y0,Y1):
            for xx in range(X0,X1): ob.cv.p(xx,y,mix(C('#33405a'),C('#4a5a78'),(y-Y0)/max(1,Y1-Y0)))
        for xx in range(X0,X1): ob.cv.p(xx,Y0,(255,255,255,90))
        c=cols[f]
        for i in range(3):
            # nozzles placed along u, in local coords -> they turn with the machine
            Xn,Yn=ob.P(u0+12+i*((u1-u0-24)/2),D/2-6,28)
            ob.cv.r(Xn-1,Yn-1,Xn+2,Yn+2,C('#8a909c'))
            for k in range(8):
                for j in range(-k//3,k//3+1): ob.cv.p(Xn+j,Yn+2+k,(c[0],c[1],c[2],120-k*12))
        Xb,Yb=ob.P((u0+u1)/2,D/2+8,28); ob.cv.ell(Xb,Yb,5,5,lambda a,b,d,x,y: sphere(c,a,b,d))
    ob.custom((28,ob.depth((u0,u1),(4,D-4))),glass)
    return ob
def E_assembler(o):
    F=FAM['elec']; ob=Obj(2,2,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    def x(cv,r,f): x0,y0,x1,y1=I(r); d_screen(cv,((x0+x1)//2-9,y0+5,(x0+x1)//2+9,y0+15),f); d_lights(cv,x1-14,y0+6,f); d_vents(cv,(x0+6,y0+5,x0+16,y1-7),C('#ff9a3a'))
    e_body(ob,u0,u1,26,{'w+':e_front_std(x),'w-':e_back,'u+':e_end('door'),'u-':e_end('label')})
    def bay(f):
        X0,Y0,X1,Y1=[int(v) for v in top_rect(ob,u0+6,u1-6,6,D-6,26)]
        ob.cv.r(X0,Y0,X1,Y1,C('#2c303a')); ob.cv.r(X0,Y0,X1,Y0+2,C('#1a1c22')); ob.cv.r(X0,Y1,X1,Y1+1,C('#b7bdca'))
        a=f*(2*math.pi/10)/4
        g1=ob.P(u0+18,D/2,26); g2=ob.P(u0+34,D/2-10,26)
        gear2d(ob.cv,g1[0],g1[1],8,10,10,a,C('#c3c8d2')); gear2d(ob.cv,g2[0],g2[1],4,5.5,6,-a*1.7,P['y1'])
        s=ob.P(u1-16,D/2+8,26); ob.cv.paste(item('star'),s[0]-8,s[1]-8)
    ob.custom((26,ob.depth((u0,u1),(6,D-6))),bay)
    return ob
def E_loom(o):
    F=FAM['elec']; ob=Obj(2,1,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    def x(cv,r,f): x0,y0,x1,y1=I(r); d_lights(cv,x0+6,y0+6,f); d_screen(cv,(x1-20,y0+5,x1-6,y0+12),f)
    e_body(ob,u0,u1,22,{'w+':e_front_std(x),'w-':e_back,'u+':e_end('fan'),'u-':e_end('label')})
    for uu in (u0+10,u1-10): ob.disc('z',uu,D/2,22,6,P['g1'],spokes=3,ang=lambda f:f*.8)
    def strand(f):
        a,b=ob.P(u0+16,D/2,23),ob.P(u1-16,D/2,23); n=int(max(abs(a[0]-b[0]),abs(a[1]-b[1])))
        for i in range(n):
            t=i/max(1,n); xx=a[0]+(b[0]-a[0])*t; y=a[1]+(b[1]-a[1])*t
            ob.cv.p(xx,y,P['g2']); ob.cv.p(xx,y-1,P['g1'])
            if (i+f*2)%5==0: ob.cv.r(xx,y+1,xx+2,y+3,[P['r1'],P['y1'],P['b1']][(i//5)%3])
    ob.custom((23,ob.depth((u0,u1),(D/2,))),strand)
    return ob
def E_wreath(o):
    F=FAM['elec']; ob=Obj(2,1,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    def x(cv,r,f): d_lights(cv,r[0]+6,r[1]+6,f,3)
    e_body(ob,u0,u1,22,{'w+':e_front_std(x),'w-':e_back,'u+':e_end('door'),'u-':e_end('label')})
    uc=(u0+u1)/2
    def ring(f):
        X,Y=ob.P(uc,D/2,22); ob.cv.ell(X,Y,9,6,lambda a,b,d,x,y: C('#2c303a') if d>.3 else None); wreath(ob.cv,X,Y,6,bow=f>=2)
        a=f*math.pi/2; Xa,Ya=ob.P(uc+math.cos(a)*10,D/2+math.sin(a)*6,22); ob.cv.r(Xa-1,Ya-7,Xa+2,Ya,C('#c3c8d2'))
    ob.custom((22,ob.depth((uc,),(D/2,))),ring)
    return ob
def E_tree(o):
    F=FAM['elec']; ob=Obj(2,2,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    def x(cv,r,f): x0,y0,x1,y1=I(r); d_screen(cv,((x0+x1)//2-9,y0+5,(x0+x1)//2+9,y0+14),f); d_lights(cv,x1-14,y0+6,f)
    e_body(ob,u0,u1,26,{'w+':e_front_std(x),'w-':e_back,'u+':e_end('door'),'u-':e_end('fan')})
    uc,wc=(u0+u1)/2,D/2+4
    ob.disc('z',uc,wc,26,9,C('#8a909c'))
    def tree(f):
        X,Y=ob.P(uc,wc,26)
        for y in range(int(Y-28),int(Y-1)):
            w=(y-(Y-28))*.38
            for xx in range(int(X-w),int(X+w)+1): ob.cv.p(xx,y,P['g1'] if xx<X else P['g2'])
        for k,(dx,dy) in enumerate(((-4,-6),(3,-11),(-2,-17),(1,-22))):
            if k<=f: ob.cv.r(X+dx,Y+dy,X+dx+2,Y+dy+2,[P['r1'],P['y1'],P['b1'],P['r1']][k])
        ob.cv.p(X,Y-29,P['y1'])
    ob.custom((27,ob.depth((uc,),(wc,))+1),tree)
    for uu,sgn in ((u0+8,1),(u1-8,-1)):
        def arm(f,uu=uu,sgn=sgn):
            k=[0,3,5,3][f]; a=ob.P(uu,8,26); b=ob.P(uu,8,40); c=ob.P(uu+sgn*12,wc-4,34+k)
            for p,q in ((a,b),(b,c)):
                n=int(max(abs(q[0]-p[0]),abs(q[1]-p[1])))+1
                for i in range(n+1):
                    t=i/n; ob.cv.r(p[0]+(q[0]-p[0])*t-1,p[1]+(q[1]-p[1])*t-1,p[0]+(q[0]-p[0])*t+2,p[1]+(q[1]-p[1])*t+2,P['y1'])
        ob.custom((27,ob.g(uu,8)[1]),arm)
    return ob
def E_generator(o):
    F=FAM['elec']; ob=Obj(2,2,o); D=ob.D; L=ob.L
    def x(cv,r,f):
        x0,y0,x1,y1=I(r); cv.r(x0+6,y0+5,x0+16,y1-7,P['y1'])
        for k in range(4): cv.p(x0+12-k,y0+7+k,OUT); cv.p(x0+9+k,y0+11+k//2,OUT)
        d_screen(cv,(x1-24,y0+5,x1-6,y0+14),f)
    def outs(cv,r,f): x0,y0,x1,y1=I(r); [cv.r(x0+6+i*8,y0+4,x0+10+i*8,y1-4,c) for i,c in enumerate((P['r1'],C('#2a2d36'),P['b1']))]
    e_body(ob,2,L-2,2*0+20,{'w+':e_front_std(x),'w-':e_back,'u+':outs,'u-':e_end('label')},frame=False)
    ob.cyl_lie('u',6,L-14,D/2,32,11,C('#3c8b5a'))
    ob.disc('u',L-10,D/2,32,9,C('#8a909c'),spokes=3,ang=lambda f:f*math.pi/8)
    for i,uu in enumerate((10,20,30)): ob.cylz(uu,6,2,20,30,C('#e9e3d4'))
    def spark(f):
        if f%2: return
        pts=[ob.P(10,6,31),ob.P(15,6,35),ob.P(20,6,31),ob.P(25,6,35),ob.P(30,6,31)]
        for (a0,b0),(a1,b1) in zip(pts,pts[1:]):
            for t in range(6): ob.cv.p(a0+(a1-a0)*t/6,b0+(b1-b0)*t/6,C('#bfe6ff'))
    ob.custom((40,0),spark)
    def steam_in(cv,r,f): cv.r(r[0],r[1],r[0]+1,r[3],P['c0'])
    ob.box(4,10,0,4,0,16,P['c1'],P['c1'],faces={'w-':steam_in})
    return ob
def E_silo(o):
    F=FAM['elec']; ob=Obj(1,1,o)
    ob.box(2,30,2,30,0,6,STEEL,STEELF,faces={k:(lambda cv,r,f: d_hazard(cv,(r[0]+1,r[1]+1,r[2]-1,r[3]-1))) for k in ('w+','w-','u+','u-')})
    ob.cylz(16,16,12,6,46,C('#c9ced8'))
    def band(f): X,Y=ob.P(16,16,30); ob.cv.r(X-12,Y-2,X+12,Y+2,P['y1'])
    ob.custom((30,ob.g(16,16)[1]+12),band)
    return ob
def E_chest(o):
    F=FAM['elec']; ob=Obj(1,1,o)
    def front(cv,r,f): x0,y0,x1,y1=I(r); cv.r((x0+x1)//2-2,y0+3,(x0+x1)//2+2,y0+8,P['y1'])
    def sidef(cv,r,f): x0,y0,x1,y1=I(r); cv.r(x0+3,y0+4,x1-3,y0+6,C('#2a2d36'))
    def back(cv,r,f): d_label(cv,(r[0]+4,r[1]+3,r[2]-4,r[1]+9))
    ob.box(3,29,4,28,0,14,STEEL,STEELF,faces={'w+':front,'u+':sidef,'u-':sidef,'w-':back})
    return ob
def A_chest(o):
    ob=Obj(1,1,o)
    def front(cv,r,f): x0,y0,x1,y1=I(r); cv.r(x0,y0+3,x1,y0+4,P['w3']); cv.r((x0+x1)//2-2,y0+2,(x0+x1)//2+2,y0+7,P['y1'])
    def sidef(cv,r,f): x0,y0,x1,y1=I(r); cv.r(x0,y0+3,x1,y0+4,P['w3']); cv.r(x0+4,y0+5,x1-4,y0+7,P['m1'])
    ob.box(4,28,6,28,0,12,P['w1'],P['w2'],faces={'w+':front,'u+':sidef,'u-':sidef,'w-':sidef},topfn=planks_top(ob,4,28,6,28,12))
    return ob
# ======================= ROBOT =======================
WHITE=FAM['robot']['top']; WHITEF=FAM['robot']['face']
def arm3d(ob,pts,w,col,tip=C('#e8ecf2')):
    """draw an arm through 3D points (u,w,z): it turns with the machine"""
    sp=[ob.P(*p) for p in pts]
    for k,(p,q) in enumerate(zip(sp,sp[1:])):
        n=int(max(abs(q[0]-p[0]),abs(q[1]-p[1]))*2)+1
        for i in range(n+1):
            t=i/n; x=p[0]+(q[0]-p[0])*t; y=p[1]+(q[1]-p[1])*t; ob.cv.r(x-w,y-w,x+w+1,y+w+1,OUT)
        for i in range(n+1):
            t=i/n; x=p[0]+(q[0]-p[0])*t; y=p[1]+(q[1]-p[1])*t; ob.cv.r(x-w+1,y-w+1,x+w,y+w,col if k==0 else tip)
    for p in sp[:-1]: ob.cv.ell(p[0],p[1],w+1,w+1,lambda a,b,d,x,y: C('#2a2d36') if d>.5 else C('#9aa0ad'))
    return sp[-1]
def R_paint(o):
    F=FAM['robot']; ob=Obj(2,2,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    cols=[P['r1'],P['g1'],P['y1'],P['b1']]
    def x(cv,r,f): d_lights(cv,r[0]+6,r[1]+5,f,3); d_hazard(cv,(r[0]+1,r[3]-4,r[2]-1,r[3]-1))
    def endf(cv,r,f): x0,y0,x1,y1=I(r); cv.r(x0+4,y0+3,x1-4,y0+6,F['rim'])
    ob.box(u0,u1,2,D-2,0,14,WHITE,WHITEF,faces={'w+':x,'w-':d_cables,'u+':endf,'u-':endf})
    def scene(f):
        c=cols[f]; uc=u0+(u1-u0)*.35; wc=D/2+6
        X,Y=ob.P(uc,wc,14); ob.cv.ell(X,Y,9,5,lambda a,b,d,x,y: C('#2a2d36') if d>.7 else C('#8a909c'))
        ob.cv.ell(X,Y-6,5.5,5.5,lambda a,b,d,x,y: sphere(c,a,b,d))
        sw=[-.35,0,.35,0][f]; bu=u0+(u1-u0)*.72; bw=D/2-6
        tipp=arm3d(ob,[(bu,bw,14),(bu,bw,34),(uc+math.cos(sw)*10,wc-8+math.sin(sw)*8,30)],3,F['rim'])
        for k in range(7):
            for jj in range(-k//3,k//3+1): ob.cv.p(tipp[0]+jj,tipp[1]+k*.8,(c[0],c[1],c[2],140-k*16))
    ob.custom((14,ob.depth((u0,u1),(2,D-2))),scene)
    return ob
def R_assembly(o):
    F=FAM['robot']; ob=Obj(2,2,o); D=ob.D; u0,u1=ports_body(ob,F,True)
    def x(cv,r,f): x0,y0,x1,y1=I(r); d_screen(cv,((x0+x1)//2-9,y0+3,(x0+x1)//2+9,y1-3),f); d_lights(cv,x1-14,y0+4,f)
    def endf(cv,r,f): x0,y0,x1,y1=I(r); cv.r(x0+4,y0+3,x1-4,y0+6,F['rim']); d_vents(cv,(x0+6,y0+7,x1-6,y1-2))
    ob.box(u0,u1,2,D-2,0,14,WHITE,WHITEF,faces={'w+':x,'w-':d_cables,'u+':endf,'u-':endf})
    def scene(f):
        uc,wc=(u0+u1)/2,D/2+4
        X,Y=ob.P(uc,wc,14); ob.cv.paste(item(['star','garland','tree','wreath'][f]),X-8,Y-14)
        k=[0,.3,.6,.3][f]
        for bu,sg in ((u0+8,1),(u1-8,-1)):
            arm3d(ob,[(bu,wc-6,14),(bu,wc-6,32),(uc-sg*8,wc,22+k*6)],2,F['rim'])
        ob.cv.ell(X,Y-6,17,13,lambda a,b,d,x,y: (200,230,255,40) if d<.92 else (255,255,255,120))
    ob.custom((14,ob.depth((u0,u1),(2,D-2))),scene)
    return ob
# ---------------- registry ----------------
# name: (maker(o), stage, family, type, role)
MACHINES={
 'kiln':(lambda o:A_kiln(o),1,'art','four','sable -> boule transparente (recette 1)'),
 'paint_table':(lambda o:A_paint_table(o),1,'art','peinture','boule -> boule peinte'),
 'wreath_table':(lambda o:A_wreath_table(o),1,'art','couronnes','couronne'),
 'chest_wood':(lambda o:A_chest(o),1,'art','stockage','coffre 16 piles'),
 'kiln_bellows':(lambda o:A_kiln(o,False,True),2,'art','four','four à soufflet'),
 'lathe':(lambda o:A_lathe(o),2,'art','façonnage','planche, étoile en bois'),
 'tree_bench':(lambda o:A_tree_bench(o),2,'art','sapins','sapin décoré'),
 'kiln_belt':(lambda o:A_kiln(o,True,True),3,'art','four','four à tapis'),
 'paint_table_belt':(lambda o:A_paint_table(o,True),3,'art','peinture','table à tapis'),
 'wreath_table_belt':(lambda o:A_wreath_table(o,True),3,'art','couronnes','table à tapis'),
 'star_press':(lambda o:A_star_press(o),3,'art','façonnage','presse à manivelle'),
 'loom':(lambda o:A_loom(o),3,'art','métier','ruban, guirlande'),
 'steam_furnace':(V_furnace,4,'vap','four','fourneau à vapeur'),
 'steam_sprayer':(V_sprayer,4,'vap','peinture','pulvérisateur'),
 'steam_press':(V_press,4,'vap','façonnage','presse à vapeur'),
 'steam_loom':(V_loom,4,'vap','métier','métier à vapeur'),
 'steam_wreath':(V_wreath,4,'vap','couronnes','presse à couronnes'),
 'steam_tree':(V_tree,4,'vap','sapins','décoratrice à vapeur'),
 'boiler':(V_boiler,4,'vap','énergie','chaudière 6 u/s'),
 'elec_furnace':(E_furnace,5,'elec','four','four à induction'),
 'paint_booth':(E_paint,5,'elec','peinture','cabine de peinture'),
 'assembler':(E_assembler,5,'elec','façonnage','assembleur'),
 'elec_loom':(E_loom,5,'elec','métier','métier électrique'),
 'elec_wreath':(E_wreath,5,'elec','couronnes','machine à couronnes'),
 'tree_decorator':(E_tree,5,'elec','sapins','décoratrice électrique'),
 'generator':(E_generator,5,'elec','énergie','générateur 900 kW (10 u/s de vapeur)'),
 'silo':(E_silo,5,'elec','source','extracteur de matière première'),
 'chest_metal':(E_chest,5,'elec','stockage','coffre 32 piles'),
 'paint_robot':(R_paint,6,'robot','peinture','robot peintre'),
 'assembly_robot':(R_assembly,6,'robot','façonnage','robot d\'assemblage (toutes recettes, une à la fois)'),
}
