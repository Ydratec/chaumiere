import math, random, json, pickle
from PIL import Image
T=32; FR=4
def C(h,a=255): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(a,)
OUT=C('#16171c')
def mix(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))+(255,)

class Cv:
    def __init__(s,W,H): s.W,s.H=W,H; s.im=Image.new('RGBA',(W,H),(0,0,0,0)); s.px=s.im.load()
    def p(s,x,y,c):
        if 0<=x<s.W and 0<=y<s.H:
            if len(c)==4 and c[3]<255:
                o=s.px[x,y]; t=c[3]/255
                s.px[x,y]=(int(o[0]+(c[0]-o[0])*t),int(o[1]+(c[1]-o[1])*t),int(o[2]+(c[2]-o[2])*t),max(o[3],c[3]))
            else: s.px[x,y]=c
    def g(s,x,y): return s.px[x,y] if 0<=x<s.W and 0<=y<s.H else (0,0,0,0)
    def r(s,x0,y0,x1,y1,c):
        for y in range(y0,y1):
            for x in range(x0,x1): s.p(x,y,c)
    def box(s,x0,y0,x1,y1,F,top,face,shadow=True):
        ft=y1-F
        s.r(x0,y0,x1,ft,top); s.r(x0,ft,x1,y1,face)
        hi=mix(top,(255,255,255),.25); lo=mix(top,(0,0,0),.25)
        s.r(x0,y0,x1,y0+1,hi); s.r(x0,y0,x0+1,ft,hi); s.r(x1-1,y0,x1,ft,lo)
        s.r(x0,ft-1,x1,ft,mix(top,(255,255,255),.35))          # front lip catches light
        s.r(x0,ft,x1,ft+1,mix(face,(0,0,0),.35))               # crease
        s.r(x0,y1-3,x1,y1,mix(face,(0,0,0),.3)); s.r(x1-1,ft,x1,y1,mix(face,(0,0,0),.3))
        s.r(x0,ft+1,x0+1,y1-3,mix(face,(255,255,255),.12))
        for x in range(x0-1,x1+1): s.p(x,y0-1,OUT); s.p(x,y1,OUT)
        for y in range(y0,y1): s.p(x0-1,y,OUT); s.p(x1,y,OUT)
        if shadow:
            for x in range(x0+1,x1+2): s.p(x,y1+1,(0,0,0,80))
            for y in range(y0+3,y1+2): s.p(x1+1,y,(0,0,0,80))
        return ft
    def bolt(s,x,y):
        s.p(x,y,C('#d7dbe3')); s.p(x+1,y,C('#8a909c')); s.p(x,y+1,C('#8a909c')); s.p(x+1,y+1,C('#3a3d46'))
    def port(s,side,bt,body_x):
        """Belt hood in the same 3/4 projection as the conveyor.
        Belt: across -10..10, height 5 -> top bt+4..bt+24, face to bt+29.
        Hood: across -11..11, height 12 -> top bt-4..bt+18, face to bt+30."""
        x0,x1=(0,body_x) if side=='L' else (body_x,s.W)
        top=C('#737a8b'); face=C('#4e5361')
        yt,yf,yb=bt-4,bt+18,bt+30
        s.r(x0,yt,x1,yf,top); s.r(x0,yf,x1,yb,face)
        s.r(x0,yt,x1,yt+1,mix(top,(255,255,255),.3))
        s.r(x0,yf-1,x1,yf,mix(top,(255,255,255),.35))
        s.r(x0,yf,x1,yf+1,mix(face,(0,0,0),.35)); s.r(x0,yb-2,x1,yb,mix(face,(0,0,0),.3))
        # yellow rim on the open end, contact shadow against the machine wall
        oe=x0 if side=='L' else x1-1; ie=x1-1 if side=='L' else x0
        for y in range(yt,yb):
            s.p(oe,y,C('#f2bd3e') if y<yf else C('#b07a1c'))
            s.p(ie,y,(0,0,0,90))
        for x in range(x0,x1): s.p(x,yt-1,OUT); s.p(x,yb,OUT); s.p(x,yb+1,(0,0,0,70))
        # direction chevron (always pointing right = belt flow W->E)
        cx=(x0+x1)//2-1; cy=(yt+yf)//2
        for k in range(-3,4):
            xx=cx+(3-abs(k))//2
            s.p(xx,cy+k,C('#f2bd3e')); s.p(xx+1,cy+k,C('#f2bd3e'))
        # small rubber flaps visible just under the hood's open end
        fx=[x0+1,x0+2] if side=='L' else [x1-3,x1-2]
        for x in fx:
            for y in range(yf+2,yb-2): s.p(x,y,C('#2a2b31') if (y%2) else C('#3c3d45'))

def bricks(cv,x0,y0,x1,y1,base,mortar,seed,bw=8,bh=4,glow=None):
    rnd=random.Random(seed)
    tints={}
    for y in range(y0,y1):
        row=(y-y0)//bh; ly=(y-y0)%bh; off=0 if row%2 else bw//2
        for x in range(x0,x1):
            col=(x-x0+off)//bw; lx=(x-x0+off)%bw
            if ly==bh-1 or lx==0: c=mortar
            else:
                key=(row,col)
                if key not in tints: tints[key]=rnd.uniform(-.12,.12)
                t=tints[key]; c=mix(base,(255,255,255) if t>0 else (0,0,0),abs(t))
                if ly==0: c=mix(c,(255,255,255),.15)
                if lx==bw-1: c=mix(c,(0,0,0),.12)
            if glow:
                gx,gy,gr,gi=glow; d=math.hypot(x-gx,(y-gy)*1.3)
                if d<gr: c=mix(c,(255,140,40),gi*(1-d/gr)**1.5)
            cv.p(x,y,c)

def furnace(f):
    cv=Cv(64,64); rnd=random.Random(100+f)
    x0,y0,x1,y1=9,7,55,61
    ft=cv.box(x0,y0,x1,y1,22,C('#9a938b'),C('#7a736c'))
    flick=[.55,.7,.6,.75][f]
    bricks(cv,x0+1,y0+1,x1-1,ft-1,C('#a59d94'),C('#6d6760'),1)
    bricks(cv,x0+1,ft+1,x1-1,y1-3,C('#857d75'),C('#58524c'),2,glow=(27,58,18,flick))
    cv.r(x0+1,ft-1,x1-1,ft,C('#c9c2b8'))
    # iron grate on top with glowing coals
    gx0,gy0,gx1,gy1=13,11,33,31
    cv.r(gx0-1,gy0-1,gx1+1,gy1+1,C('#2a2a30'))
    for y in range(gy0,gy1):
        for x in range(gx0,gx1):
            n=math.sin(x*1.7+f*1.3)*math.cos(y*1.3-f)+rnd.uniform(-.4,.4)
            c=C('#ffd36b') if n>.75 else C('#ff8a2a') if n>.2 else C('#b8361c') if n>-.4 else C('#4a1a12')
            cv.p(x,y,c)
    for x in range(gx0+1,gx1,4):
        cv.r(x,gy0,x+1,gy1,C('#55555d')); cv.r(x+1,gy0,x+2,gy1,C('#2b2b31'))
    cv.r(gx0-1,gy0-1,gx1+1,gy0,C('#6a6a72')); cv.r(gx0-1,gy1,gx1+1,gy1+1,C('#7a7a82'))
    # chimney (cylinder)
    cx0,cx1,ctop,cbot=37,50,9,33
    for x in range(cx0-1,cx1+3): cv.p(x,cbot+1,(0,0,0,90))
    for x in range(cx0,cx1):
        t=(x-cx0)/(cx1-cx0-1)
        sh=mix(C('#8e8a86'),C('#3e3a37'),t**.8) if t>.25 else mix(C('#b5b0aa'),C('#8e8a86'),t*4)
        for y in range(ctop+2,cbot): cv.p(x,y,sh)
        for by in (16,26):
            cv.p(x,by,mix(sh,(0,0,0),.4)); cv.p(x,by+1,mix(sh,(255,255,255),.15))
    for y in range(ctop+2,cbot): cv.p(cx0-1,y,OUT); cv.p(cx1,y,OUT)
    for x in range(cx0-1,cx1+1): cv.p(x,cbot,OUT)
    for x in range(cx0,cx1):   # rim + opening
        cv.p(x,ctop,C('#cfcac3')); cv.p(x,ctop+1,C('#cfcac3')); cv.p(x,ctop-1,OUT)
    cv.r(cx0+2,ctop,cx1-2,ctop+2,C('#1c1412')); cv.r(cx0+4,ctop+1,cx1-4,ctop+2,C('#7a2a14'))
    # smoke
    for i in range(3):
        t=(f/FR+i/3)%1
        sy=ctop-1-t*10; sx=43+math.sin((t+i)*5)*2.5+t*4; rr=1.6+t*2.8
        for y in range(int(sy-rr),int(sy+rr)+1):
            for x in range(int(sx-rr),int(sx+rr)+1):
                d=math.hypot(x-sx,y-sy)
                if d<=rr and y<ctop:
                    sh=200 if (x-sx)+(y-sy)<0 else 160
                    cv.p(x,y,(sh,sh,sh+8,int(190*(1-t))))
    # fire mouth: iron arch
    mx,my,mw,mh=27,58,11,13
    for y in range(my-mh-3,my+1):
        for x in range(mx-mw-3,mx+mw+3):
            dx=(x+.5-mx)/(mw+2.5); dy=(y+.5-my)/(mh+2.5)
            ex=(x+.5-mx)/mw; ey=(y+.5-my)/mh
            if ex*ex+ey*ey<1:
                h=(my-y)/mh+rnd.uniform(0,.35)+abs(ex)*.5-math.sin(x*.9+f*2)*.12
                c=[C('#fff6c2'),C('#ffd24a'),C('#ff8a24'),C('#d9461c'),C('#5a1810')][min(4,max(0,int(h*4)))]
                if y>=my-2: c=C('#ff6a1a') if (x+f)%3 else C('#ffd24a')
                cv.p(x,y,c)
            elif dx*dx+dy*dy<1:
                c=C('#4a4a52') if dy<-.2 and dx<0 else C('#2c2c33')
                cv.p(x,y,c)
    cv.r(mx-mw-4,my,mx+mw+4,my+1,C('#3a3a42')); cv.r(mx-mw-4,my+1,mx+mw+4,my+2,C('#22222a'))
    # pressure gauge
    gx,gy=46,47
    for y in range(gy-4,gy+5):
        for x in range(gx-4,gx+5):
            d=math.hypot(x-gx,y-gy)
            if d<4.6: cv.p(x,y,C('#2a2a30') if d>3.6 else C('#e9e3d4'))
    a=-2.4+[.0,.25,.12,.3][f]+1.6
    for k in range(4): cv.p(round(gx+math.cos(a)*k*.9),round(gy+math.sin(a)*k*.9),C('#c0281c'))
    cv.p(gx,gy,C('#2a2a30'))
    # belt ports on the bottom tile row
    cv.port('L',32,x0); cv.port('R',32,x1+1)
    return cv.im

def gear(cv,cx,cy,r_in,r_out,teeth,ang,light,dark,hub,sq=1.25,clip=None):
    mask={}
    for y in range(int(cy-r_out/sq-2),int(cy+r_out/sq+3)):
        for x in range(int(cx-r_out-2),int(cx+r_out+3)):
            dx=x+.5-cx; dy=(y+.5-cy)*sq; r=math.hypot(dx,dy); a=math.atan2(dy,dx)-ang
            R=r_out if math.cos(a*teeth)>0.2 else r_in
            if r<R: mask[(x,y)]=(r,dx,dy)
    for (x,y),(r,dx,dy) in mask.items():
        if r<hub*.55: c=C('#1d1f25')
        elif r<hub: c=C('#d9dde5')
        elif r<hub+2: c=dark
        else:
            c=light if (dx*-.6+dy*-.8)>0 else mix(light,dark,.5)
            if abs(r-(r_in-2.5))<.7: c=mix(c,(0,0,0),.25)
        cv.p(x,y,c)
    for (x,y) in mask:
        for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if (nx,ny) not in mask: cv.p(nx,ny,OUT)
    for (x,y) in mask:   # drop shadow
        if (x+1,y+2) not in mask: pass

def assembler(f):
    cv=Cv(96,96)
    x0,y0,x1,y1=9,5,86,93
    ft=cv.box(x0,y0,x1,y1,26,C('#8a91a1'),C('#5e6475'))
    # subtle brushed-metal dither on top
    for y in range(y0+1,ft-1):
        for x in range(x0+1,x1-1):
            if (x*3+y*5)%11==0: cv.p(x,y,C('#959cab'))
    # hazard frame
    for y in range(y0+2,ft-2):
        for x in range(x0+2,x1-2):
            if x<x0+5 or x>=x1-5 or y<y0+5 or y>=ft-5:
                cv.p(x,y,C('#f2bd3e') if ((x+y)//3)%2==0 else C('#24252c'))
    for (bx,by) in ((x0+7,y0+7),(x1-9,y0+7),(x0+7,ft-9),(x1-9,ft-9)): cv.bolt(bx,by)
    # recessed bay
    bx0,by0,bx1,by1=19,13,76,56
    cv.r(bx0,by0,bx1,by1,C('#2c303a'))
    for x in range(bx0,bx1):
        for y in range(by0,by1):
            if (x+y)%2==0 and ((y-by0)%6==0): cv.p(x,y,C('#343844'))
    cv.r(bx0,by0,bx1,by0+3,C('#1a1c22')); cv.r(bx0,by0,bx0+2,by1,C('#1a1c22'))
    cv.r(bx0,by1,bx1,by1+1,C('#b7bdca')); cv.r(bx1,by0,bx1+1,by1+1,C('#a3aab9'))
    cv.r(bx0-1,by0-1,bx1+1,by0,OUT); cv.r(bx0-1,by0,bx0,by1,OUT)
    # gears
    a=f*(2*math.pi/10)/FR
    gear(cv,35,36,13,16,10,a,C('#c3c8d2'),C('#6e7482'),5)
    gear(cv,56.5,24,6,8.5,6,-a*10/6+math.pi/6,C('#d9a64a'),C('#7a5418'),3)
    # robotic arm swinging over a work plate
    cv.r(59,40,74,52,C('#454a57')); cv.r(59,40,74,41,C('#6a7080'))
    for x in range(60,73,4): cv.r(x,44,x+2,46,C('#f2bd3e'))
    base=(67,27); sw=[-.45,-.15,.2,-.15][f]
    j=(base[0]+math.cos(math.pi/2+sw)*12, base[1]+math.sin(math.pi/2+sw)*9)
    def thick(p,q,w,c,ch):
        n=int(max(abs(q[0]-p[0]),abs(q[1]-p[1]))*2)+1
        for i in range(n+1):
            t=i/n; x=p[0]+(q[0]-p[0])*t; y=p[1]+(q[1]-p[1])*t
            for dx in range(-w,w+1):
                for dy in range(-w,w+1):
                    if dx*dx+dy*dy<=w*w+1: cv.p(int(x+dx),int(y+dy),OUT)
        for i in range(n+1):
            t=i/n; x=p[0]+(q[0]-p[0])*t; y=p[1]+(q[1]-p[1])*t
            for dx in range(-w+1,w):
                for dy in range(-w+1,w):
                    cv.p(int(x+dx),int(y+dy),ch if dy<0 else c)
    thick(base,j,3,C('#d08a1e'),C('#f2bd3e'))
    tip=(j[0]+math.cos(sw*1.5)*1, j[1]+7)
    thick(j,tip,2,C('#8a909c'),C('#c3c8d2'))
    for k in (-3,3):
        for q in range(3): cv.p(int(tip[0]+k),int(tip[1]+q),C('#c3c8d2') if q<2 else OUT)
    for dx in range(-3,4):
        for dy in range(-3,4):
            if dx*dx+dy*dy<=10: cv.p(base[0]+dx,base[1]+dy,OUT if dx*dx+dy*dy>6 else C('#9aa0ad') if dy<0 else C('#5e6475'))
    # pipe along back edge
    for x in range(14,82):
        cv.p(x,y0+1,C('#e0a070')); cv.p(x,y0+2,C('#b8703c')); cv.p(x,y0+3,C('#7a4220'))
    for x in (26,48,70): cv.r(x,y0,x+2,y0+4,C('#5a5f6c'))
    # ---- front face ----
    for sx in (33,63): cv.r(sx,ft+2,sx+1,y1-3,C('#444a59')); cv.r(sx+1,ft+2,sx+2,y1-3,C('#7a8192'))
    # screen with scrolling bars
    sx0,sy0,sx1,sy1=38,ft+5,59,ft+17
    cv.r(sx0-1,sy0-1,sx1+1,sy1+1,OUT); cv.r(sx0,sy0,sx1,sy1,C('#0f2a1c'))
    for i in range(sx0+1,sx1-1,3):
        h=2+int((math.sin(i*.9+f*1.6)+1)*4)
        cv.r(i,sy1-1-h,i+2,sy1-1,C('#4dff9a'))
    for x in range(sx0,sx1): cv.p(x,sy0,C('#1f4a33'))
    # lit vents
    pulse=[.6,.85,1,.8][f]
    for i in range(4):
        y=ft+5+i*4
        cv.r(14,y,30,y+2,C('#1a1b20'))
        cv.r(15,y+1,29,y+2,mix(C('#7a2a10'),C('#ff9a3a'),pulse))
    # lights + lever
    cv.r(66,ft+5,71,ft+10,OUT); cv.r(67,ft+6,70,ft+9,C('#4dff7a') if f%2==0 else C('#1f5c30'))
    cv.r(74,ft+5,79,ft+10,OUT); cv.r(75,ft+6,78,ft+9,C('#ffb02a') if f in (1,2) else C('#6a4410'))
    cv.r(66,ft+13,80,ft+15,C('#2a2d36')); cv.r(74,ft+11,76,ft+15,C('#c0281c'))
    # kick plate
    for x in range(x0+1,x1-1):
        for y in range(y1-6,y1-3): cv.p(x,y,C('#f2bd3e') if ((x+y)//3)%2==0 else C('#24252c'))
    for (bx,by) in ((x0+3,ft+3),(x1-5,ft+3)): cv.bolt(bx,by)
    cv.port('L',64,x0); cv.port('R',64,x1+1)
    return cv.im

def chest(f):
    cv=Cv(32,32)
    x0,y0,x1,y1=4,7,28,29
    ft=cv.box(x0,y0,x1,y1,10,C('#b07a42'),C('#8a5a2e'))
    rnd=random.Random(5)
    for y in range(y0+1,ft-1):
        for x in range(x0+1,x1-1):
            if (y-y0)%4==0: cv.p(x,y,C('#7a4e26'))
            elif rnd.random()<.12: cv.p(x,y,C('#9c6a38'))
    for y in range(ft+1,y1-3):
        for x in range(x0+1,x1-1):
            if rnd.random()<.12: cv.p(x,y,C('#76491f'))
    cv.r(x0,ft-1,x1,ft,C('#d9a066'))
    cv.r(x0,ft+3,x1,ft+4,C('#5a3615'))   # lid seam
    for bx in (x0+3,x1-5):
        cv.r(bx,y0,bx+2,y1-1,C('#7b8190')); cv.r(bx,y0,bx+1,y1-1,C('#aab0bd'))
    cv.r(14,ft+2,18,ft+7,OUT); cv.r(15,ft+3,17,ft+6,C('#f2c14e')); cv.p(15,ft+3,C('#fff0b0')); cv.p(16,ft+5,OUT)
    return cv.im

M={'furnace':(furnace,2,2),'assembler':(assembler,3,3),'chest':(chest,1,1)}
meta={}; frames={}
for n,(fn,tw,th) in M.items():
    sheet=Image.new('RGBA',(tw*T*FR,th*T))
    for f in range(FR):
        im=fn(f); frames[(n,f)]=im; sheet.paste(im,(f*tw*T,0))
    sheet.save(f'machine_{n}_{tw}x{th}.png')
    meta[n]={'file':f'machine_{n}_{tw}x{th}.png','tilesW':tw,'tilesH':th,'frameW':tw*T,'frameH':th*T,'frames':FR}
meta['furnace']['ports']={'in':{'side':'left','tileRow':1},'out':{'side':'right','tileRow':1}}
meta['assembler']['ports']={'in':{'side':'left','tileRow':2},'out':{'side':'right','tileRow':2}}
json.dump(meta,open('machines.json','w'),indent=2)
pickle.dump({k:(v.size,v.tobytes()) for k,v in frames.items()},open('mfr.pkl','wb'))
