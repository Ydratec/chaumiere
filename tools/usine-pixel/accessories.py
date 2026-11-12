from lib import *
from PIL import ImageOps
import animals as A
INK=A.INK
ACCS=['bow','flower','glasses','scarf','hat','crown','witch','santa']
TOP={'turtle':1,'schrodinger':1}
def head_pos(sp,anim,f):
    walk=anim in('walk','carry'); hop=sp in A.HOP
    if walk and hop: oy=[0,-2,-3,-1][f]
    elif walk: oy=[0,-1,0,-1][f]
    elif anim=='idle': oy=[0,0,-1,-1][f]
    else: oy=0
    return 16,12+oy
def draw(sp,acc,d,anim,f):
    cv=char_canvas(); hx,hy=head_pos(sp,anim,f); side=d=="right"
    if side: hx+=1
    t=hy-6+TOP.get(sp,0)
    if acc=='hat':
        cv.r(hx-6,t,hx+7,t+2,C('#27272a')); cv.r(hx-4,t-6,hx+5,t,C('#27272a'))
        cv.r(hx-4,t-2,hx+5,t,C('#e5484d')); cv.r(hx-4,t-6,hx-3,t-2,C('#3f3f46'))
    elif acc=='crown':
        g=C('#f5c542'); cv.r(hx-5,t-2,hx+6,t+1,g)
        for x in (hx-5,hx,hx+5): cv.r(x,t-5,x+1,t-2,g); cv.p(x,t-6,C('#fff0a0'))
        cv.r(hx-3,t-4,hx-2,t-2,g); cv.r(hx+3,t-4,hx+4,t-2,g)
        cv.p(hx,t-1,C('#e5484d')) if d!='up' else None
        cv.r(hx-5,t,hx+6,t+1,C('#d9a520'))
    elif acc=='flower':
        fx=hx-4 if d=='down' else hx-2 if side else hx+4
        for dx,dy in ((0,-2),(2,0),(1,2),(-1,2),(-2,0)): cv.r(fx+dx-1,t+dy,fx+dx+1,t+dy+2,C('#f472b6'))
        cv.r(fx-1,t+1,fx+1,t+3,C('#facc15'))
    elif acc=='witch':
        p=C('#4c1d95'); cv.r(hx-7,t,hx+8,t+2,C('#3b0f7a'))
        for k in range(9):
            w=5-k*.55; cx=hx+ (k*k)/20
            cv.r(cx-w,t-k-1,cx+w+1,t-k,p)
        cv.r(hx-5,t-2,hx+6,t,C('#f59e0b'))
    elif acc=='santa':
        r1,r2=C('#d8382f'),C('#9a1f22')
        flop=1
        for i in range(7):
            w=6-i; cx=hx+flop*(i*0.9)
            cv.r(cx-w,t-i,cx+w+1,t+1-i,r1); cv.p(cx+w,t-i,r2)
        cv.r(hx-7,t,hx+8,t+3,C('#f4f7ff')); cv.r(hx-7,t+2,hx+8,t+3,C('#b4c2da'))
        cv.ell(hx+9,t-5,2,2,lambda u,v,dd,x,y: C('#ffffff') if u+v<.3 else C('#b4c2da'))
    elif acc=='glasses':
        y=hy-2
        if d=='down':
            for x0 in (hx-5,hx+1):
                cv.r(x0,y,x0+4,y+4,INK); cv.r(x0+1,y+1,x0+3,y+3,(255,255,255,90))
            cv.r(hx-1,y+1,hx+1,y+2,INK)
        elif side:
            cv.r(hx+2,y,hx+6,y+4,INK); cv.r(hx+3,y+1,hx+5,y+3,(255,255,255,90)); cv.r(hx-3,y+1,hx+2,y+2,INK)
        else: return cv.im
    elif acc=='bow':
        if d=='up': return cv.im
        bx=hx+(3 if side else 0); by=hy+6
        cv.r(bx-3,by-1,bx,by+2,C('#e5484d')); cv.r(bx+1,by-1,bx+4,by+2,C('#e5484d')); cv.r(bx,by,bx+1,by+1,C('#b91c1c'))
    elif acc=='scarf':
        b=C('#3b82f6'); y=hy+5
        cv.r(hx-6,y,hx+7,y+2,b); cv.r(hx-6,y+1,hx+7,y+2,C('#2563eb'))
        if d=='down': cv.r(hx-4,y+2,hx-2,y+6,C('#2563eb'))
        elif d=='up': cv.r(hx+2,y+2,hx+4,y+7,C('#2563eb'))
        else: cv.r(hx-5,y+2,hx-3,y+6,C('#2563eb'))
    cv.outline()
    return cv.im
def frame(sp,acc,d,a,f):
    if d=='left': return ImageOps.mirror(draw(sp,acc,'right',a,f))
    return draw(sp,acc,d,a,f)
def sheet(sp,acc):
    S=Image.new('RGBA',(128,512)); r=0
    for a in A.ANIMS:
        for d in A.DIRS:
            for f in range(4): S.paste(frame(sp,acc,d,a,f),(f*32,r*32))
            r+=1
    return S
