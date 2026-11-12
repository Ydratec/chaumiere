from lib import *
FR=4
def box(cv,x0,y0,x1,y1,F,top,face,shadow=True,out=True):
    """3/4 box: top surface y0..y1-F, front face y1-F..y1. returns ft"""
    ft=y1-F
    cv.r(x0,y0,x1,ft,top); cv.r(x0,ft,x1,y1,face)
    cv.r(x0,y0,x1,y0+1,lt(top,.25)); cv.r(x0,y0,x0+1,ft,lt(top,.2)); cv.r(x1-1,y0,x1,ft,dk(top,.2))
    cv.r(x0,ft-1,x1,ft,lt(top,.35)); cv.r(x0,ft,x1,ft+1,dk(face,.35))
    cv.r(x0,y1-2,x1,y1,dk(face,.3)); cv.r(x1-1,ft,x1,y1,dk(face,.3)); cv.r(x0,ft+1,x0+1,y1-2,lt(face,.12))
    if out:
        for x in range(x0-1,x1+1): cv.p(x,y0-1,OUT); cv.p(x,y1,OUT)
        for y in range(y0,y1): cv.p(x0-1,y,OUT); cv.p(x1,y,OUT)
    if shadow:
        for x in range(x0+1,x1+2): cv.p(x,y1+1,(0,0,0,80))
        for y in range(y0+3,y1+2): cv.p(x1+1,y,(0,0,0,80))
    return ft
def bolt(cv,x,y):
    cv.p(x,y,C('#d7dbe3')); cv.p(x+1,y,C('#8a909c')); cv.p(x,y+1,C('#8a909c')); cv.p(x+1,y+1,C('#3a3d46'))
def cyl_v(cv,x0,x1,y0,y1,c,cap=True):
    """vertical cylinder (tank/chimney) seen in 3/4: shaded columns + elliptical top"""
    x0,x1,y0,y1=int(x0),int(x1),int(y0),int(y1); w=x1-x0
    for x in range(x0,x1):
        t=(x-x0)/max(1,w-1)
        col=lt(c,.3) if t<.2 else c if t<.6 else dk(c,.25) if t<.85 else dk(c,.4)
        cv.r(x,y0,x+1,y1,col)
    if cap:
        cv.ell((x0+x1)/2,y0,w/2,max(1.5,w/6),lambda u,v,d,x,y: lt(c,.35) if d>.5 else lt(c,.15))
    cv.ell((x0+x1)/2,y1,w/2,max(1.5,w/6),lambda u,v,d,x,y: None if y<y1 else dk(c,.4))
def cyl_h(cv,x0,x1,yc,r,c):
    """horizontal cylinder (boiler) : shaded rows + end cap"""
    x0,x1=int(x0),int(x1)
    for y in range(int(yc-r),int(yc+r)):
        t=(y-(yc-r))/(2*r)
        col=lt(c,.3) if t<.2 else c if t<.6 else dk(c,.25) if t<.85 else dk(c,.4)
        cv.r(x0,y,x1,y+1,col)
    cv.ell(x1,yc,max(2,r/3),r,lambda u,v,d,x,y: lt(c,.1) if d<.6 else dk(c,.2))
def gauge(cv,gx,gy,f,r=3.6):
    cv.ell(gx,gy,r+1,r+1,lambda u,v,d,x,y: C('#2a2a30') if d>.65 else C('#e9e3d4'))
    a=-0.8+[.0,.35,.15,.45][f]
    for k in range(int(r)): cv.p(round(gx+math.cos(a)*k),round(gy+math.sin(a)*k),C('#c0281c'))
def puff(cv,sx,sy,f,n=2,col=(225,228,235),rise=10,drift=3,cut=None):
    for i in range(n):
        t=(f/FR+i/n)%1
        y=sy-t*rise; x=sx+math.sin((t+i)*5)*1.5+t*drift; rr=1.4+t*2.6
        cv.ell(x,y,rr,rr,lambda u,v,d,xx,yy,t=t:(col[0] if u+v<0 else col[0]-30,col[1] if u+v<0 else col[1]-30,col[2] if u+v<0 else col[2]-25,int(200*(1-t))))
def gear2d(cv,cx,cy,ri,ro,teeth,ang,c,sq=1.0):
    mask=set()
    for y in range(int(cy-ro-2),int(cy+ro+3)):
        for x in range(int(cx-ro-2),int(cx+ro+3)):
            dx=x+.5-cx; dy=(y+.5-cy)*sq; r=math.hypot(dx,dy); a=math.atan2(dy,dx)-ang
            R=ro if math.cos(a*teeth)>0.2 else ri
            if r<R:
                mask.add((x,y))
                cv.p(x,y,C('#1d1f25') if r<ri*.3 else (lt(c,.2) if dy<0 else dk(c,.15)))
    for (x,y) in mask:
        for n in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if n not in mask: cv.p(*n,OUT)
def sheet(fn,w,h,n=FR):
    S=Image.new('RGBA',(w*n,h))
    for f in range(n): S.paste(fn(f),(f*w,0))
    return S
def recolor(im,mapping):
    px=im.load(); W,H=im.size
    for y in range(H):
        for x in range(W):
            c=px[x,y]
            if c[3] and c[:3] in mapping: px[x,y]=mapping[c[:3]]+(c[3],)
    return im
def hazard(cv,x0,y0,x1,y1,w=3):
    for y in range(y0,y1):
        for x in range(x0,x1): cv.p(x,y,P['y1'] if ((x+y)//w)%2==0 else C('#24252c'))
