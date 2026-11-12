from lib import *
from props import wreath
def item(name):
    cv=Cv(16,16)
    sh=lambda: cv.shadow(8,14.5,5,1.3,60)
    if name.startswith('ball_'):
        col={'clear':C('#cfe8ff'),'red':P['r1'],'green':P['g1'],'gold':P['y1'],'blue':P['b1']}[name[5:]]
        sh()
        cv.ell(8,9,5.5,5.5,lambda u,v,d,x,y: (lambda c: (c[0],c[1],c[2],170) if name=='ball_clear' and c!=lt(col,.85) else c)(sphere(col,u,v,d)))
        if name!='ball_clear':
            for x in range(3,14): 
                if cv.g(x,9)[3]: cv.p(x,9,lt(P['y1'],.3) if name!='ball_gold' else P['r1'])
        cv.r(6,2,10,4,P['y2']); cv.r(6,2,10,3,P['y1']); cv.p(8,1,P['m1'])
    elif name=='sand':
        sh(); cv.ell(8,11,6.5,4,lambda u,v,d,x,y: None if y>13 else sphere(C('#e2c27a'),u,v,d,False))
        for x,y in ((5,10),(9,9),(11,11)): cv.p(x,y,C('#b8944a'))
    elif name=='glass':
        sh(); cv.r(1,9,9,10,P['m1'])
        cv.ell(10,9,4.5,4.5,lambda u,v,d,x,y: P['f0'] if d<.15 else P['f1'] if d<.45 else P['f2'] if d<.8 else P['f3'])
    elif name=='branch':
        for k in range(12):
            x=2+k; y=12-k*.7
            cv.p(x,y,P['w2'])
            if k>1:
                cv.p(x,y-2,P['g1']); cv.p(x,y+2,P['g2']); cv.p(x-1,y-1,P['g0']); cv.p(x-1,y+1,P['g1'])
    elif name=='wreath':
        sh(); wreath(cv,8,8,6.2)
    elif name=='ribbon':
        sh(); cv.r(3,6,7,10,P['r1']); cv.r(9,6,13,10,P['r1']); cv.r(7,7,9,9,P['r2'])
        cv.r(5,10,7,14,P['r1']); cv.r(9,10,11,14,P['r1']); cv.p(3,6,P['r0']); cv.p(9,6,P['r0'])
    elif name=='star':
        sh()
        pts=[]
        for i in range(10):
            a=-math.pi/2+i*math.pi/5; r=6.5 if i%2==0 else 2.8
            pts.append((8+math.cos(a)*r,8+math.sin(a)*r))
        def inside(x,y):
            c=False; j=len(pts)-1
            for i in range(len(pts)):
                xi,yi=pts[i]; xj,yj=pts[j]
                if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi)+xi: c=not c
                j=i
            return c
        for y in range(16):
            for x in range(16):
                if inside(x+.5,y+.5): cv.p(x,y,P['y0'] if x+y<14 else P['y1'] if x+y<18 else P['y2'])
    elif name=='wood_star':
        for y in range(16):
            for x in range(16):
                pass
        cv.paste(item('star'),0,0)
        for y in range(16):
            for x in range(16):
                c=cv.g(x,y)
                if c[3] and c[:3] in (P['y0'][:3],P['y1'][:3],P['y2'][:3]):
                    cv.p(x,y,{P['y0'][:3]:P['w0'],P['y1'][:3]:P['w1'],P['y2'][:3]:P['w2']}[c[:3]])
        return cv.im
    elif name=='garland':
        for x in range(1,15):
            y=5+math.sin(x/14*math.pi)*6
            cv.p(x,y,P['g2']); cv.p(x,y-1,P['g1'])
            if x%3==1:
                c=[P['r1'],P['y1'],P['b1'],P['g0']][(x//3)%4]
                cv.r(x,y+1,x+2,y+3,c); cv.p(x,y+1,lt(c,.6))
    elif name=='tree':
        sh(); cv.r(7,12,9,15,P['w2'])
        for y in range(2,13):
            w=(y-1)*.55
            for x in range(int(8-w),int(8+w)+1): cv.p(x,y,P['g1'] if x<8 else P['g2'])
        for bx,by,c in ((6,8,P['r1']),(10,10,P['y1']),(8,5,P['b1'])): cv.p(bx,by,c)
        cv.p(8,1,P['y1'])
    elif name=='wood':
        sh()
        for i,y in enumerate((7,10)):
            cv.r(2,y,14,y+3,P['w1']); cv.r(2,y,14,y+1,P['w0'])
            cv.ell(13.5,y+1.5,1.6,1.6,lambda u,v,d,x,yy: P['w0'] if d<.4 else P['w2'])
    elif name=='paint':
        sh(); cv.r(4,5,12,14,P['m1']); cv.r(4,5,5,14,P['m0']); cv.r(11,5,12,14,P['m2'])
        cv.ell(8,5.5,4,1.6,lambda u,v,d,x,y: P['r1'] if d<.6 else P['r2']); cv.r(5,7,8,9,P['r1'])
    elif name=='coin':
        cv.ell(8,8,6,6,lambda u,v,d,x,y: sphere(P['y1'],u,v,d))
        cv.ell(8,8,3.6,3.6,lambda u,v,d,x,y: P['y2'] if d>.6 else None)
        for dx,dy in ((0,-2),(0,2),(-2,0),(2,0),(0,0)): cv.p(7.5+dx,7.5+dy,P['y3'])
    elif name=='gift':
        sh(); cv.r(3,7,13,14,P['r1']); cv.r(3,7,13,8,P['r0']); cv.r(7,4,9,14,P['y1'])
        cv.r(2,6,14,8,P['r2']); cv.r(2,6,14,7,P['r1']); cv.r(7,6,9,8,P['y1'])
        cv.r(4,3,7,5,P['y1']); cv.r(9,3,12,5,P['y1'])
    cv.outline()
    return cv.im
ITEMS=['sand','glass','ball_clear','ball_red','ball_green','ball_gold','ball_blue','paint',
       'branch','ribbon','wreath','wood','wood_star','star','garland','tree','gift','coin']
