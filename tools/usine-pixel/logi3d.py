"""Logistics + energy pieces, same 3D engine (m3d.py) and same belt geometry."""
from m3d import *
from cat3d import d_hatch, d_lights, d_screen, d_label, d_hazard, d_sign, d_vents, I, top_rect, STEEL, STEELF, IRON, IRONF, planks_top
from mach import FAM
BELT_KIND={
 'bois':dict(belt=C('#a8743f'),ridge=C('#d9a066'),rail=C('#c48f55'),raild=C('#6b4223'),face=C('#8c5530')),
 'fonte':dict(belt=C('#3a3f3c'),ridge=C('#5c6560'),rail=C('#e08a5a'),raild=C('#8a4428'),face=C('#3e4a45')),
 'metal':dict(belt=C('#3b3d47'),ridge=C('#62667a'),rail=C('#f2bd3e'),raild=C('#a86f18'),face=C('#4f5462')),
 'express':dict(belt=C('#2e3140'),ridge=C('#5a6a9a'),rail=C('#4f9cf0'),raild=C('#23549c'),face=C('#3a4668')),
}
def lanes(ob):
    """local w of each lane across the footprint (centre of each tile row/col, belt geometry)"""
    n=ob.D//32; out=[]
    for k in range(n):
        if ob.o=='e': out.append(k*32+19)
        elif ob.o=='w': out.append(ob.D-(k*32+19))
        elif ob.o=='s': out.append(ob.D-(k*32+16))
        else: out.append(k*32+16)
    return out
def belt_strip(ob,u0,u1,lw,kind,f,key_z=0):
    """a straight piece of belt surface (height 5) along u, chevrons moving with the flow"""
    K=BELT_KIND[kind]
    ob.box(u0,u1,lw-10,lw-8,0,5,K['rail'],K['raild'],out=False)
    ob.box(u0,u1,lw+8,lw+10,0,5,K['rail'],K['raild'],out=False)
    def surf(fr):
        X0,Y0,X1,Y1=top_rect(ob,u0,u1,lw-8,lw+8,5)
        ob.cv.r(X0,Y0,X1,Y1,K['belt'])
        for uu in range(int(u0),int(u1)):
            if (uu-fr*2)%8 in (0,):
                a,b=ob.P(uu,lw-7,5),ob.P(uu,lw+7,5)
                if abs(a[1]-b[1])<1: ob.cv.r(min(a[0],b[0]),a[1],max(a[0],b[0]),a[1]+1,K['ridge'])
                else: ob.cv.r(a[0],min(a[1],b[1]),a[0]+1,max(a[1],b[1]),K['ridge'])
    ob.custom((5,ob.depth((u0,u1),(lw+8,))),surf)
# ---------------- underground belt ----------------
def underground(o,kind='metal',end='in'):
    ob=Obj(1,1,o); ob.shadow=False; K=BELT_KIND[kind]; lw=lanes(ob)[0]
    top,side=(STEEL,STEELF) if kind!='express' else (C('#9fb3d6'),C('#4e6694'))
    def mouth(cv,r,f):
        x0,y0,x1,y1=I(r); cv.r(x0+2,y0+3,x1-2,y1,C('#0d0d10')); cv.r(x0,y0,x1,y0+2,K['rail'])
    def sidef(cv,r,f):
        x0,y0,x1,y1=I(r); cv.r(x0,y0,x1,y0+2,K['rail']); hazard(cv,x0+1,y1-4,x1-1,y1-1,3)
    def back(cv,r,f): x0,y0,x1,y1=I(r); cv.r(x0+3,y0+3,x1-3,y1-3,dk(side,.2)); bolt(cv,x0+2,y0+2)
    if end=='in':
        belt_strip(ob,0,14,lw,kind,0)
        ob.box(12,32,lw-12,lw+12,0,14,top,side,faces={'u-':mouth,'u+':back,'w+':sidef,'w-':sidef})
    else:
        belt_strip(ob,18,32,lw,kind,0)
        ob.box(0,20,lw-12,lw+12,0,14,top,side,faces={'u+':mouth,'u-':back,'w+':sidef,'w-':sidef})
    def arrow(f):
        a=ob.P(16 if end=='in' else 6,lw,14); b=ob.P(28 if end=='in' else 16,lw,14)
        ob.cv.r(min(a[0],b[0])-1,min(a[1],b[1])-1,max(a[0],b[0])+2,max(a[1],b[1])+2,K['rail'])
    ob.custom((14,ob.depth((12,32),(lw+12,))),arrow)
    return ob
# ---------------- splitter (simple / filter) ----------------
def splitter(o,filt=False,kind='metal'):
    ob=Obj(1,2,o); K=BELT_KIND[kind]; L0,L1=lanes(ob)
    top,side=(STEEL,STEELF) if not filt else (C('#c9b6e8'),C('#6a4fa0'))
    wa,wb=min(L0,L1)-12,max(L0,L1)+12
    def mouths(cv,r,f):
        x0,y0,x1,y1=I(r); w=(x1-x0)
        for k in (0,1):
            a=x0+k*w//2; cv.r(a+5,y0+3,a+w//2-5,y1,C('#0d0d10'))
        cv.r(x0,y0,x1,y0+2,K['rail'])
    def sidef(cv,r,f): x0,y0,x1,y1=I(r); cv.r(x0,y0,x1,y0+2,K['rail']); bolt(cv,x0+2,y0+4); bolt(cv,x1-4,y0+4)
    ob.box(4,28,wa,wb,0,14,top,side,faces={'u-':mouths,'u+':mouths,'w+':sidef,'w-':sidef})
    def topdeco(f):
        X0,Y0,X1,Y1=top_rect(ob,4,28,wa,wb,14)
        hazard(ob.cv,X0+2,Y0+2,X1-2,Y0+5,3) if X1-X0>Y1-Y0 else hazard(ob.cv,X0+2,Y0+2,X0+5,Y1-2,3)
        for k,lw in enumerate((L0,L1)):
            on=(f%2)==k; c=P['g0'] if on else C('#3c404b')
            for uu in range(9,24):          # shaft
                X,Y=ob.P(uu,lw,14); ob.cv.r(X,Y,X+1,Y+1,c); X2,Y2=ob.P(uu,lw+.6,14); ob.cv.r(X2,Y2,X2+1,Y2+1,c)
            for k2 in range(5):             # head : a chevron in local coords, so it turns with the flow
                for sgn in (-1,1):
                    X,Y=ob.P(24-k2,lw+sgn*k2,14); ob.cv.r(X,Y,X+1,Y+1,c)
        m=ob.P(16,(L0+L1)/2,14); gear2d(ob.cv,m[0],m[1],2,3.5,6,f*.4,C('#c9ced8'))
        if filt:
            ob.cv.r(m[0]-6,m[1]-9,m[0]+6,m[1]-5,C('#2a2d36'))
            for i,c in enumerate((P['r1'],P['y1'],P['g1'],P['b1'])): ob.cv.r(m[0]-5+i*3,m[1]-8,m[0]-3+i*3,m[1]-6,c)
    ob.custom((14,ob.depth((4,28),(wb,))),topdeco)
    return ob
# ---------------- QC tunnel ----------------
def qc_tunnel(o):
    ob=Obj(1,1,o); ob.shadow=False; lw=lanes(ob)[0]
    def mouth(cv,r,f):
        x0,y0,x1,y1=I(r); cv.r(x0+3,y0+3,x1-3,y1,C('#0d0d10'))
        for x in range(x0+3,x1-3,2): cv.r(x,y0+3,x+1,y1-1,C('#3a1010'))
    def window(cv,r,f):
        x0,y0,x1,y1=I(r); cv.r(x0+3,y0+3,x1-3,y0+9,C('#1a1c22')); lx=x0+4+f*((x1-x0-8)//3); cv.r(lx,y0+3,lx+1,y0+9,C('#ff3b3b'))
        cv.r(x0+4,y1-5,x0+8,y1-2,P['g0'] if f!=3 else P['r1'])
    ob.box(8,24,lw-12,lw+12,0,18,STEEL,STEELF,faces={'u-':mouth,'u+':mouth,'w+':window,'w-':lambda cv,r,f: d_vents(cv,(r[0]+3,r[1]+3,r[2]-3,r[3]-3))})
    def glow(f):
        for uu in (5,6,7,25,26,27):
            a=ob.P(uu,lw-8,5); b=ob.P(uu,lw+8,5)
            ob.cv.r(min(a[0],b[0]),min(a[1],b[1]),max(a[0],b[0])+1,max(a[1],b[1])+1,(255,60,60,60))
    ob.custom((5,ob.depth((8,),(lw,))),glow)
    return ob
# ---------------- arms ----------------
ARMS={'simple':(P['y1'],1),'rapide':(P['b1'],1),'long':(P['r1'],2),'filtrant':(C('#9a6ad8'),1)}
def arm(o,kind='simple',t=0.0):
    col,reach=ARMS[kind]; ob=Obj(1,1,o); lw=lanes(ob)[0]
    def bodyf(cv,r,f): x0,y0,x1,y1=I(r); hazard(cv,x0+1,y0+1,x1-1,y0+4,2)
    ob.box(7,25,lw-9,lw+9,0,5,STEELF,dk(STEELF,.2),faces={k:bodyf for k in ('w+','w-','u+','u-')})
    ob.cylz(16,lw,6,5,10,STEEL)                       # turntable
    def ring(f): X,Y=ob.P(16,lw,10); ob.cv.ell(X,Y,5,2,lambda a,b,d,x,y: col if d>.5 else STEELF)
    ob.custom((10,ob.g(16,lw)[1]+6),ring,bounds=((10,22),(lw-6,lw+6),10,11))
    pick_u=16-32*reach; drop_u=16+32*reach
    hu=pick_u+(drop_u-pick_u)*t; hz=9+math.sin(math.pi*t)*(12+6*reach)
    sh=(16,lw,22); el=((16+hu)/2,lw,30+math.sin(math.pi*t)*4+6*(reach-1)); hand=(hu,lw,hz)
    from cat3d import arm3d
    store={}
    def draw(f):
        ob.box  # noqa
        X,Y=ob.P(16,lw,10); ob.cv.r(X-3,Y-12,X+3,Y,STEELF); ob.cv.r(X-3,Y-12,X-2,Y,STEEL)
        hp=arm3d(ob,[sh,el,hand],4 if kind!='rapide' else 3,col,C('#c3c8d2'))
        for dx in (-5,4): ob.cv.r(hp[0]+dx,hp[1]-1,hp[0]+dx+2,hp[1]+5,C('#c3c8d2')); ob.cv.p(hp[0]+dx,hp[1]+5,OUT)
        if kind=='filtrant':
            Xb,Yb=ob.P(16,lw,8); ob.cv.r(Xb-4,Yb-3,Xb+4,Yb-1,C('#9a6ad8'))
        store['hand']=hp
    ob.custom((40,ob.depth((16,),(lw+8,))),draw)
    ob._store=store
    return ob
def arm_frames(o,kind):
    frames=[]; hands=[]
    for t in (0,1/3,2/3,1):
        ob=arm(o,kind,t); im=ob.render(0); frames.append(im); hands.append(ob._store['hand'])
    fr,org=finish(ob,frames)
    # hand positions relative to the cropped frame
    dx=org[0]-PAD; dy=org[1]-PAD
    return fr,org,[(round(h[0]+dx),round(h[1]+dy)) for h in hands],(ob.FW,ob.FH)
# ---------------- pipes ----------------
PIPE_KIND={'vap':(P['c1'],P['c2']),'eau':(C('#6d7384'),C('#4e5361'))}
def pipe(o,shape='straight',valve=False):
    ob=Obj(1,1,o); ob.shadow=False; col,dcol=PIPE_KIND['vap']
    con={'straight':('u-','u+'),'corner':('u-','w+'),'tee':('u-','u+','w+'),'cross':('u-','u+','w-','w+')}[shape]
    for c in con:
        if c=='u-': ob.cyl_lie('u',0,16,16,7,4,col,caps=False)
        if c=='u+': ob.cyl_lie('u',16,32,16,7,4,col,caps=False)
        if c=='w-': ob.cyl_lie('w',0,16,16,7,4,col,caps=False)
        if c=='w+': ob.cyl_lie('w',16,32,16,7,4,col,caps=False)
    # flanges where the pipe leaves the tile (so neighbours read as one line)
    for c in con:
        if c=='u-': ob.box(0,2,11,21,2,12,dcol,dk(dcol,.2))
        if c=='u+': ob.box(30,32,11,21,2,12,dcol,dk(dcol,.2))
        if c=='w-': ob.box(11,21,0,2,2,12,dcol,dk(dcol,.2))
        if c=='w+': ob.box(11,21,30,32,2,12,dcol,dk(dcol,.2))
    if shape!='straight' or valve: ob.box(11,21,11,21,2,12,lt(col,.1),dcol)
    if valve:
        def wheel(f):
            X,Y=ob.P(16,16,12); ob.cv.r(X-1,Y-8,X+1,Y,P['m1'])
            a=f*math.pi/4
            for k in range(-5,6): ob.cv.p(X+math.cos(a)*k,Y-9+math.sin(a)*k*.4,P['r1'])
        ob.custom((12,ob.g(16,16)[1]+6),wheel)
    return ob
# ---------------- power ----------------
def pole(o='e',big=False):
    if not big:
        ob=Obj(1,1,o); ob.shadow=False
        ob.box(12,20,12,20,0,4,STEELF,dk(STEELF,.2))                     # concrete-steel foot
        ob.cylz(16,16,2,4,44,C('#8a909c'))                                  # steel mast
        ob.box(8,24,15,18,40,43,C('#6d7384'),C('#4e5361'))                  # cross-arm
        for uu in (9,23): ob.cylz(uu,16.5,1.5,43,47,C('#e9e3d4'))
        def tag(f): X,Y=ob.P(16,18,24); ob.cv.r(X-2,Y-3,X+2,Y+1,P['y1']); ob.cv.p(X,Y-2,OUT)
        ob.custom((24,18),tag,bounds=((14,18),(18,18),20,26))
        return ob,(16,16,47)
    ob=Obj(2,2,o)
    for (u,w) in ((8,8),(56,8),(8,56),(56,56)): ob.box(u-2,u+2,w-2,w+2,0,6,STEELF,STEELF)
    def lattice(f):
        cv=ob.cv
        legs=[(8,8),(56,8),(8,56),(56,56)]
        for (u,w) in legs:
            a=ob.P(u,w,0); b=ob.P(32+(u-32)*.25,32+(w-32)*.25,90)
            n=int(abs(a[1]-b[1]))+1
            for i in range(n): t=i/n; cv.r(a[0]+(b[0]-a[0])*t-1,a[1]+(b[1]-a[1])*t,a[0]+(b[0]-a[0])*t+1,a[1]+(b[1]-a[1])*t+1,C('#8a909c'))
        for z in range(15,90,15):
            pts=[ob.P(32+(u-32)*(1-z/120),32+(w-32)*(1-z/120),z) for (u,w) in ((8,8),(56,8),(56,56),(8,56))]
            for p,q in zip(pts,pts[1:]+pts[:1]):
                n=int(max(abs(q[0]-p[0]),abs(q[1]-p[1])))+1
                for i in range(n): t=i/n; cv.p(p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,C('#6d7384'))
        a=ob.P(4,32,88); b=ob.P(60,32,88); cv.r(min(a[0],b[0]),min(a[1],b[1])-2,max(a[0],b[0]),max(a[1],b[1])+1,C('#6d7384'))
        for uu in (6,58): X,Y=ob.P(uu,32,88); cv.r(X-1,Y-6,X+2,Y-2,C('#e9e3d4'))
    ob.custom((0,64),lattice)
    return ob,(32,32,94)
def accumulator(o='e'):
    ob=Obj(2,2,o); D=ob.D
    def front(cv,r,f):
        x0,y0,x1,y1=I(r); lvl=[1,2,3,4][f]
        for i in range(4): cv.r(x0+6+i*6,y0+5,x0+10+i*6,y0+11,P['g0'] if i<lvl else C('#1f3a2a'))
        d_label(cv,(x1-20,y0+4,x1-6,y0+11))
    ob.box(2,62,2,62,0,14,STEEL,STEELF,faces={'w+':front,'w-':front,'u+':front,'u-':front})
    for (u,w) in ((16,16),(46,16),(16,46),(46,46)):
        ob.cylz(u,w,10,14,34,C('#5e6475'))
        def cap(f,u=u,w=w): X,Y=ob.P(u,w,34); ob.cv.r(X-3,Y-2,X+3,Y,P['y1'])
        ob.custom((34,ob.g(u,w)[1]+10),cap)
    return ob
def crank(o):
    ob=Obj(1,1,o); D=ob.D
    ob.box(6,26,6,26,0,14,P['w1'],P['w2'],faces={'w+':lambda cv,r,f: d_hatch(cv,(r[0]+4,r[1]+3,r[2]-4,r[3]-3),P['w1'])},topfn=planks_top(ob,6,26,6,26,14))
    ob.disc('w',16,27,22,7,P['m1'],spokes=4,ang=lambda f:f*math.pi/2)
    def handle(f):
        a=f*math.pi/2; X,Y=ob.P(16,28,22)
        ob.cv.r(X+math.cos(a)*7-1,Y+math.sin(a)*7-1,X+math.cos(a)*7+2,Y+math.sin(a)*7+2,P['r1'])
    ob.custom((22,ob.g(16,28)[1]+1),handle)
    return ob
