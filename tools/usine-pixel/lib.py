import math, random
from PIL import Image
T=32
def C(h,a=255): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(a,)
OUT=C('#1c1820')
def mix(a,b,t): t=max(0,min(1,t)); return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))+(255,)
def lt(c,t=.25): return mix(c,(255,255,255),t)
def dk(c,t=.25): return mix(c,(0,0,0),t)
P=dict(
 w0=C('#d9a066'),w1=C('#b77a45'),w2=C('#8c5530'),w3=C('#5e3620'),w4=C('#3d2216'),
 r0=C('#ff7a66'),r1=C('#d8382f'),r2=C('#9a1f22'),
 g0=C('#6cc46a'),g1=C('#2f9a4c'),g2=C('#1f6a3a'),g3=C('#134428'),
 y0=C('#fff0a0'),y1=C('#f6c445'),y2=C('#c88a1e'),y3=C('#7a4e12'),
 b0=C('#9ad8ff'),b1=C('#3d8be0'),b2=C('#23549c'),
 s0=C('#ffffff'),s1=C('#e4ecf8'),s2=C('#b4c2da'),
 k0=C('#f6cfae'),k1=C('#e0a483'),k2=C('#b9725a'),
 m0=C('#c9ced8'),m1=C('#8a909c'),m2=C('#555a66'),m3=C('#33363f'),
 c0=C('#e08a5a'),c1=C('#b5603a'),c2=C('#8a4428'),c3=C('#5a2a1a'),
 f0=C('#fff6c2'),f1=C('#ffd24a'),f2=C('#ff8a24'),f3=C('#d9461c'),f4=C('#5a1810'),
)
class Cv:
    def __init__(s,W,H): s.W,s.H=W,H; s.im=Image.new('RGBA',(W,H),(0,0,0,0)); s.px=s.im.load()
    def p(s,x,y,c):
        x=int(x);y=int(y)
        if 0<=x<s.W and 0<=y<s.H:
            if c[3]<255:
                o=s.px[x,y]; t=c[3]/255
                if o[3]==0: s.px[x,y]=c; return
                s.px[x,y]=(int(o[0]+(c[0]-o[0])*t),int(o[1]+(c[1]-o[1])*t),int(o[2]+(c[2]-o[2])*t),max(o[3],c[3]))
            else: s.px[x,y]=c
    def g(s,x,y): return s.px[x,y] if 0<=x<s.W and 0<=y<s.H else (0,0,0,0)
    def r(s,x0,y0,x1,y1,c):
        for y in range(int(y0),int(y1)):
            for x in range(int(x0),int(x1)): s.p(x,y,c)
    def ell(s,cx,cy,rx,ry,fn):
        for y in range(int(cy-ry-1),int(cy+ry+2)):
            for x in range(int(cx-rx-1),int(cx+rx+2)):
                u=(x+.5-cx)/rx; v=(y+.5-cy)/ry; d=u*u+v*v
                if d<1:
                    c=fn(u,v,d,x,y)
                    if c: s.p(x,y,c)
    def shadow(s,cx,cy,rx,ry,a=70):
        s.ell(cx,cy,rx,ry,lambda u,v,d,x,y:(0,0,0,a))
    def outline(s,col=OUT,thr=100):
        px=s.px; W,H=s.W,s.H; pts=[]
        for y in range(H):
            for x in range(W):
                if px[x,y][3]<thr:
                    for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                        if 0<=nx<W and 0<=ny<H and px[nx,ny][3]>=thr and px[nx,ny][:3]!=col[:3]:
                            pts.append((x,y)); break
        for x,y in pts:
            if px[x,y][3]==0: px[x,y]=col
    def paste(s,im,x,y): s.im.alpha_composite(im,(int(x),int(y)))
def sphere(base,u,v,d,spec=True):
    l=(-u*.6-v*.7)*.5+.5-d*.35
    if spec and (u+.38)**2+(v+.42)**2<.03: return lt(base,.85)
    if l>.62: return lt(base,.3)
    if l>.38: return base
    if l>.18: return dk(base,.25)
    return dk(base,.45)
def table(cv,x0,x1,ytop,depth,apron,legh,wood=None):
    """3/4 wooden table. top surface from ytop to ytop+depth, apron below, legs."""
    w0,w1,w2,w3=P['w0'],P['w1'],P['w2'],P['w3']
    yt2=ytop+depth; ya=yt2+apron; yl=ya+legh
    for lx in (x0+1,x1-5):
        cv.r(lx,ya,lx+4,yl,w2); cv.r(lx,ya,lx+1,yl,w1); cv.r(lx+3,ya,lx+4,yl,w3)
    for lx in (x0+3,x1-7): cv.r(lx,ytop+2,lx+3,ya,w3)  # back legs hint hidden
    for y in range(ytop,yt2):
        for x in range(x0,x1):
            c=w1 if ((y-ytop)//4)%2==0 else lt(w1,.08)
            if (y-ytop)%4==3: c=w2
            if (x*7+y*3)%17==0: c=lt(c,.12)
            cv.p(x,y,c)
    cv.r(x0,ytop,x1,ytop+1,w0); cv.r(x0,yt2-1,x1,yt2,w0)
    cv.r(x0,yt2,x1,ya,w2); cv.r(x0,ya-1,x1,ya,w3)
    return yt2,ya,yl
