from lib import *
FR=4
# ---------- ground / walls ----------
def floor(v=0):
    cv=Cv(32,32); rnd=random.Random(v)
    for y in range(32):
        row=y//8; off=(row*13+v*7)%32
        for x in range(32):
            ly=y%8; seam=((x+off)%32)==0
            base=[P['w1'],lt(P['w1'],.06),dk(P['w1'],.06),P['w1']][row]
            c=base
            if ly==7 or seam: c=P['w3']
            elif ly==0: c=lt(base,.12)
            elif ly==6: c=dk(base,.1)
            elif (x*5+y*11+v)%13==0: c=dk(base,.12)
            cv.p(x,y,c)
    if v==1:
        cv.ell(20,12,2,1.3,lambda u,vv,d,x,y: P['w3'] if d<.4 else P['w2'])
    if v==2:
        for x,y in ((6,3),(26,19)): cv.p(x,y,P['m1']); cv.p(x+1,y,P['m2'])
    return cv.im
def wall(kind='plain'):
    cv=Cv(32,64)  # back wall: 2 tiles tall, base sits on the floor row
    WB=C('#7a4528')
    for y in range(64):
        for x in range(32):
            ly=y%8
            c=[lt(WB,.1),WB,WB,dk(WB,.08),dk(WB,.15),dk(WB,.25),P['w3'],lt(WB,.2)][ly]
            if (x*3+y*7)%19==0 and 0<ly<6: c=dk(c,.1)
            cv.p(x,y,c)
    for y in range(0,64,8):
        e=(y//8*11)%32
        cv.r(e,y+1,e+1,y+6,P['w3'])
    cv.r(0,0,32,3,P['s1']); cv.r(0,3,32,4,P['s2'])   # snow cap / beam
    for x in range(0,32,3): cv.p(x,4,P['s2'])
    cv.r(0,56,32,64,P['w3']); cv.r(0,56,32,57,P['w2'])  # skirting
    if kind=='window':
        x0,y0,x1,y1=6,12,26,44
        cv.r(x0-2,y0-2,x1+2,y1+3,P['w3']); cv.r(x0-2,y0-2,x1+2,y0-1,P['w2'])
        for y in range(y0,y1):
            for x in range(x0,x1):
                t=(y-y0)/(y1-y0)
                c=mix(C('#1c2a5a'),C('#4a6aa8'),t)
                if y>y1-6: c=P['s1'] if (x+y)%5 else P['s2']
                cv.p(x,y,c)
        for sx,sy in ((9,15),(20,18),(14,24),(23,29),(10,33)): cv.p(sx,sy,P['s0'])
        cv.r(15,y0,17,y1,P['w2']); cv.r(x0,27,x1,29,P['w2'])
        for x in range(x0,x1):  # frost in corners
            for y in range(y0,y1):
                if (x-x0)+(y-y0)<4 or (x1-x)+(y-y0)<4: cv.p(x,y,(255,255,255,150))
        cv.r(x0-3,y1+1,x1+3,y1+4,P['w0']); cv.r(x0-3,y1+3,x1+3,y1+4,P['w2'])
        cv.r(x0-3,y1,x1+3,y1+1,P['s0'])
    if kind=='shelf':
        for sy in (22,40):
            cv.r(3,sy,29,sy+3,P['w0']); cv.r(3,sy+2,29,sy+3,P['w2'])
            cv.r(5,sy+3,7,sy+6,P['w3']); cv.r(25,sy+3,27,sy+6,P['w3'])
        for i,(c,x) in enumerate(((P['r1'],8),(P['g1'],14),(P['y1'],20))):
            cv.ell(x+2,19,2.6,2.6,lambda u,v,d,xx,yy,c=c: sphere(c,u,v,d))
            cv.r(x+1,15,x+3,17,P['y2'])
        cv.r(7,33,13,40,P['b1']); cv.r(7,33,13,34,P['b0'])
        cv.r(16,35,24,40,P['r1']); cv.r(19,35,21,40,P['y1'])
    return cv.im
def rug():
    cv=Cv(64,32)
    cv.r(2,4,62,30,P['r2']); cv.r(4,6,60,28,P['r1'])
    for x in range(6,58,4):
        cv.p(x,8,P['y1']); cv.p(x+1,9,P['y1']); cv.p(x,26,P['y1']); cv.p(x+1,25,P['y1'])
    for y in range(12,23,3):
        for x in range(14,52,6): cv.p(x,y,P['s1']); cv.p(x+1,y+1,P['s1'])
    cv.r(30,13,34,23,P['g1']); cv.r(27,16,37,20,P['g1'])
    for x in range(2,62,2): cv.p(x,3,P['s1']); cv.p(x,30,P['s1'])
    return cv.im
# ---------- stations (sprite 64x64, footprint = bottom row 2x1) ----------
def kiln(f):
    cv=Cv(64,64); rnd=random.Random(f*7+3)
    cv.shadow(32,60,28,4,90)
    # stone base
    for y in range(46,61):
        for x in range(8,56):
            row=(y-46)//5; off=0 if row%2 else 4
            c=P['m1'] if ((x+off)%8 and (y-46)%5!=4) else P['m2']
            if (y-46)%5==0 and (x+off)%8: c=lt(P['m1'],.15)
            cv.p(x,y,c)
    cv.r(8,58,56,61,P['m3'])
    # clay dome
    cv.ell(32,36,23,19,lambda u,v,d,x,y: (sphere(P['c1'],u,v,d,False) if y<48 else None))
    for y in range(18,48):
        for x in range(9,56):
            if cv.g(x,y)[3] and (x*3+y*5)%17==0: cv.p(x,y,dk(cv.g(x,y),.12))
    cv.r(9,46,56,48,P['c2'])
    # chimney
    cv.r(38,8,46,22,P['c2']); cv.r(38,8,40,22,P['c1']); cv.r(38,7,46,9,P['c0'])
    cv.r(39,8,45,9,P['c3'])
    # smoke
    for i in range(2):
        t=(f/FR+i/2)%1; sy=6-t*6; sx=42+math.sin((t+i)*6)*2+t*3; rr=1.4+t*2
        cv.ell(sx,sy,rr,rr,lambda u,v,d,x,y,t=t:(210,210,215,int(180*(1-t))))
    # mouth with fire
    flick=[.6,.8,.65,.9][f]
    cv.ell(32,47,11,11,lambda u,v,d,x,y: None if y>=47 else (C('#3a1a10') if d>.68 else None))
    def fire(u,v,d,x,y):
        if y>=47 or d>.66: return None
        h=(47-y)/9+rnd.uniform(0,.3)+abs(u)*.5-math.sin(x*.9+f*2)*.1
        return [P['f0'],P['f1'],P['f2'],P['f3'],P['f4']][min(4,max(0,int(h*3.6)))]
    cv.ell(32,47,11,11,fire)
    for y in range(28,46):   # warm glow on clay
        for x in range(14,50):
            c=cv.g(x,y); d=math.hypot(x-32,(y-46)*1.2)
            if c[3] and d<18 and c[:3] not in [P[k][:3] for k in ('f0','f1','f2','f3','f4')]:
                cv.p(x,y,mix(c,(255,150,60),flick*.35*(1-d/18)))
    # blowpipe rack on the right
    cv.r(55,30,57,58,P['w2']); cv.r(54,30,58,31,P['w1'])
    for i,px_ in enumerate((52,56,60)):
        cv.r(px_,22+i,px_+1,52,P['m1']); cv.p(px_,22+i,P['m0'])
    cv.outline()
    return cv.im
def paint_table(f):
    cv=Cv(64,64)
    cv.shadow(32,61,29,3,90)
    # drying rack behind
    cv.r(6,6,9,40,P['w2']); cv.r(55,6,58,40,P['w2']); cv.r(6,6,58,9,P['w1']); cv.r(6,6,58,7,P['w0'])
    sw=[0,1,0,-1][f]
    for i,(c,x) in enumerate(((P['r1'],16),(P['g1'],26),(P['y1'],36),(P['b1'],46))):
        l=10+(i%2)*4; ox=sw if i%2 else -sw
        for y in range(9,9+l): cv.p(x+ox*(y-9)/l,y,P['s2'])
        cy=9+l+4
        cv.r(x-1+ox,cy-5,x+2+ox,cy-3,P['y2'])
        cv.ell(x+.5+ox,cy,4,4,lambda u,v,d,xx,yy,c=c: sphere(c,u,v,d))
    yt2,ya,yl=table(cv,3,61,38,12,5,7)
    # paint pots
    for i,(c,x) in enumerate(((P['r1'],8),(P['g1'],16),(P['y1'],24),(P['b1'],32))):
        cv.r(x,40,x+6,47,P['m1']); cv.r(x,40,x+1,47,P['m0']); cv.r(x+5,40,x+6,47,P['m2'])
        cv.ell(x+3,40.5,3,1.4,lambda u,v,d,xx,yy,c=c: c if d<.6 else dk(c,.3))
    cv.r(19,33,20,41,P['w2']); cv.r(19,32,20,34,P['w3'])
    # ball on stand + splats
    cv.r(46,44,52,47,P['w2']); cv.r(48,40,50,44,P['w3'])
    cv.ell(49,37,5,5,lambda u,v,d,x,y: sphere(P['s1'] if f<2 else P['r1'],u,v,d))
    for sx,sy,c in ((40,46,P['r1']),(56,42,P['g1']),(42,41,P['y1'])):
        cv.p(sx,sy,c); cv.p(sx+1,sy,c); cv.p(sx,sy+1,dk(c,.2))
    cv.outline()
    return cv.im
def wreath(cv,cx,cy,r,bow=True):
    cv.ell(cx,cy,r,r*.85,lambda u,v,d,x,y: None if d<.3 else (P['g0'] if (u+v)<-.3 and (x+y)%2 else P['g1'] if (x*3+y)%4 else P['g2']))
    for a in range(0,360,50):
        t=math.radians(a); cv.p(cx+math.cos(t)*r*.75,cy+math.sin(t)*r*.65,P['r1'])
    if bow:
        bx,by=cx,cy+r*.7
        cv.r(bx-3,by-1,bx,by+2,P['r1']); cv.r(bx+1,by-1,bx+4,by+2,P['r1']); cv.r(bx,by,bx+1,by+1,P['r2'])
        cv.p(bx-1,by+3,P['r1']); cv.p(bx+2,by+3,P['r1'])
def wreath_table(f):
    cv=Cv(64,64)
    cv.shadow(32,61,29,3,90)
    # pegboard behind
    cv.r(8,4,56,36,P['w2']); cv.r(8,4,56,5,P['w1'])
    for y in range(8,34,5):
        for x in range(12,54,5): cv.p(x,y,P['w3'])
    wreath(cv,20,17,8); wreath(cv,44,17,8)
    cv.r(19,8,21,10,P['m1']); cv.r(43,8,45,10,P['m1'])
    yt2,ya,yl=table(cv,3,61,38,12,5,7)
    # branches pile left
    for i in range(7):
        x=6+i*2; y=42+(i%3)
        for k in range(10): 
            cv.p(x+k*.4,y-k*.3,P['g2']); cv.p(x+k*.4+1,y-k*.3,P['g1'])
    cv.r(8,46,20,47,P['w3'])
    # wreath in progress centre (pulses as you work)
    wreath(cv,33,43,6.5,bow=f>=2)
    # ribbon spool right
    cv.ell(52,44,5,3,lambda u,v,d,x,y: P['r1'] if d>.25 else P['w2'])
    cv.r(47,44,57,48,P['r1']); cv.r(47,47,57,48,P['r2'])
    cv.ell(52,44,5,3,lambda u,v,d,x,y: lt(P['r1'],.2) if d>.3 else P['w3'])
    cv.outline()
    return cv.im
def sand_pile():
    cv=Cv(32,32); cv.shadow(16,28,13,3,80)
    cv.ell(16,23,13,8,lambda u,v,d,x,y: None if y>27 else sphere(C('#e2c27a'),u,v,d,False))
    for x,y in ((9,20),(14,18),(20,22),(23,19),(12,24),(18,25)): cv.p(x,y,C('#b8944a'))
    cv.r(21,6,23,20,P['w2']); cv.r(21,6,22,20,P['w1']); cv.r(19,4,25,7,P['w3'])
    cv.ell(22,21,3.5,2.5,lambda u,v,d,x,y: P['m1'] if u+v<0 else P['m2'])
    cv.outline(); return cv.im
def branch_bundle():
    cv=Cv(32,32); cv.shadow(16,28,13,3,80)
    for i in range(9):
        y=13+i*1.5
        for x in range(4,28):
            c=P['g1'] if (x+i)%3 else P['g2']
            if (x*7+i*5)%5==0: c=P['g0']
            cv.p(x,y+math.sin(x*.5+i)*1,c); cv.p(x,y+1+math.sin(x*.5+i),P['g2'])
    for x0 in (4,25): cv.r(x0,14,x0+3,27,P['w2'])
    for rx in (10,20): cv.r(rx,11,rx+2,28,C('#c9a46a')); cv.r(rx,11,rx+1,28,C('#e8c88a'))
    for x in range(5,27): 
        if x%2: cv.p(x,12+(x%3==0),P['s0'])
    cv.outline(); return cv.im
def ship_crate():
    cv=Cv(32,32); cv.shadow(17,29,14,3,80)
    x0,x1,yt,yf,yb=3,29,9,17,29
    cv.r(x0,yf,x1,yb,P['w2'])
    for y in range(yf,yb,4): cv.r(x0,y,x1,y+1,P['w3'])
    cv.r(x0,yf,x0+3,yb,P['w1']); cv.r(x1-3,yf,x1,yb,P['w3'])
    cv.r(x0,yt,x1,yf,P['w3'])  # inside
    for i in range(18):
        x=5+(i*7)%22; y=yt+1+(i*3)%6
        cv.r(x,y,x+3,y+1,C('#e8c66a'))
    cv.ell(12,yt+2,4,3.5,lambda u,v,d,x,y: sphere(P['r1'],u,v,d))
    cv.ell(21,yt+3,3.5,3,lambda u,v,d,x,y: sphere(P['g1'],u,v,d))
    cv.r(x0,yt,x1,yt+1,P['w1']); cv.r(x0,yf-1,x1,yf,P['w0'])
    # stamp arrow
    for k in range(5):
        cv.r(10,22,18,24,P['y1'])
        cv.p(18+k//2,23-(2-k//2)+k%2 if False else 23,P['y1'])
    for k in range(4): cv.r(18+k,20+k,19+k,26-k,P['y1'])
    cv.outline(); return cv.im
def deco_tree():
    cv=Cv(32,64); cv.shadow(16,61,10,2.5,90)
    cv.r(12,50,20,60,P['r1']); cv.r(12,50,20,52,P['r0']); cv.r(12,58,20,60,P['r2'])
    cv.r(14,41,18,51,P['w2']); cv.r(14,41,15,51,P['w1'])
    for i,(cy,w,h) in enumerate(((40,13,10),(30,10,10),(20,7,9))):
        for y in range(int(cy-h),int(cy+2)):
            t=(y-(cy-h))/h; ww=w*t
            for x in range(int(16-ww),int(16+ww)+1):
                c=P['g1'] if x<16 else P['g2']
                if y>=cy and (x%3==0): c=P['g3']
                if x<12-i and (x+y)%3==0: c=P['g0']
                cv.p(x,y,c)
        for x in range(int(16-w),int(16+w)+1):
            if (x+i)%2==0: cv.p(x,cy+1,P['s0'])
    for bx,by,c in ((10,38,P['r1']),(21,36,P['y1']),(14,28,P['b1']),(19,24,P['r1']),(9,42,P['y1']),(23,41,P['b1'])):
        cv.r(bx,by,bx+2,by+2,c); cv.p(bx,by,lt(c,.6))
    # star
    for (dx,dy) in ((0,-3),(0,3),(-3,0),(3,0),(0,0),(-1,-1),(1,-1),(-1,1),(1,1),(0,-2),(0,2),(-2,0),(2,0)):
        cv.p(16+dx,9+dy,P['y1'])
    cv.p(16,9,P['y0'])
    cv.outline(); return cv.im
