"""Chibi animal workers for the Christmas factory (32x32, 3/4 view, feet at y=30).
Same sheet layout as the elf: rows = anim x dir (idle,walk,work,carry x down,left,right,up), 4 frames."""
from lib import *
from PIL import ImageOps
INK=C('#1f2937')
COLORS=[('#f2a65a','#c9722b',0),('#3f3f46','#27272a',1),('#a1a1aa','#71717a',0),('#f4f4f5','#d4d4d8',0),
        ('#ead9b8','#c9b48a',0),('#8b5a3c','#6b412a',1),('#94a3b8','#64748b',0),('#7cb87a','#4f8a4d',0)]
PINK=C('#f9a8b8'); ORANGE=C('#f59e0b'); ORANGE2=C('#c2410c')
RAINBOW=[C(h) for h in ('#f472b6','#fb923c','#facc15','#4ade80','#60a5fa','#a78bfa')]
HOP={'fish','whale','shark','schrodinger','frog'}

def spec(sp,ci=0):
    if sp in ('cat','dog','bunny','duck','turtle','fish'):
        f,d,n=COLORS[ci]; fur,dark=C(f),C(d)
        s=dict(fur=fur,dark=dark,belly=lt(fur,.45),eye=C('#fef3c7') if n else INK)
        if sp=='turtle': s.update(skin=C('#a3c47a'),skind=C('#86a865'))
        return s
    return {
     'unicorn':dict(fur=C('#fdfcff'),dark=C('#ddd6fe'),belly=C('#ede9fe'),eye=INK),
     'penguin':dict(fur=C('#1e293b'),dark=C('#0f172a'),belly=C('#f8fafc'),eye=INK),
     'dragon':dict(fur=C('#22c55e'),dark=C('#15803d'),belly=C('#fde68a'),eye=C('#facc15')),
     'fox':dict(fur=C('#ea580c'),dark=C('#c2410c'),belly=C('#fff7ed'),eye=C('#78350f')),
     'whale':dict(fur=C('#3b82f6'),dark=C('#2563eb'),belly=C('#bfdbfe'),eye=INK),
     'schrodinger':dict(fur=C('#71717a'),dark=C('#52525b'),belly=C('#d4d4d8'),eye=C('#facc15')),
     'frog':dict(fur=C('#84c441'),dark=C('#6aaa3a'),belly=C('#9dd065'),eye=INK),
     'shark':dict(fur=C('#7c8ea6'),dark=C('#64748b'),belly=C('#f1f5f9'),eye=INK),
    }[sp]

def shade(c,u,v):
    l=-u*.5-v*.7
    return lt(c,.18) if l>.45 else c if l>-.35 else dk(c,.18)

def draw(sp,ci,d,anim,f):
    """d in down/right/up ; left is mirrored right."""
    s=spec(sp,ci); fur,dark,belly,eye=s['fur'],s['dark'],s['belly'],s['eye']
    cv=char_canvas()
    walk=anim in('walk','carry'); hop=sp in HOP
    if walk and hop: oy=[0,-2,-3,-1][f]
    elif walk: oy=[0,-1,0,-1][f]
    elif anim=='idle': oy=[0,0,-1,-1][f]
    else: oy=0
    legA=[0,-2,0,0][f] if walk and not hop else 0
    legB=[0,0,0,-2][f] if walk and not hop else 0
    sw=[0,1,0,-1][f] if walk else 0
    cv.shadow(16,30,7 if not hop or oy==0 else 6,2,80)
    hx,hy=16,12+oy          # head centre
    by=22+oy                # body centre
    bodyc=s.get('skin',fur) if sp=='turtle' else fur
    side=d=='right'
    # ---- tail (behind) ----
    def tail():
        tx,ty=(9,22+oy) if side else (16,24+oy)
        if sp=='cat':
            pts=[(tx,ty),(tx-2,ty-2),(tx-3,ty-5),(tx-2,ty-8)] if side else [(21,24+oy),(23,22+oy),(24,19+oy),(23,17+oy)]
            for x,y in pts: cv.r(x,y,x+2,y+2,fur)
        elif sp=='dog':
            w=[0,1,0,-1][f]
            for k in range(4): cv.r((tx-1-k*.5+w*.3) if side else 21+k*.6,(ty-k) if side else 23+oy-k,(tx+1-k*.5) if side else 23+k*.6,(ty+2-k) if side else 25+oy-k,fur)
        elif sp=='bunny':
            cv.ell(tx if side else 16,ty if side else 26+oy,2.4,2.2,lambda u,v,dd,x,y: C('#ffffff') if u+v<.5 else C('#e5e7eb'))
        elif sp=='fox':
            cv.ell(tx-3 if side else 23,ty-2 if side else 22+oy,4,3.2 if side else 4,lambda u,v,dd,x,y: belly if (u<-.45 if side else v<-.5) else fur)
        elif sp=='dragon':
            for k in range(6): cv.r(tx-k,ty+k*.3-1,tx-k+2,ty+k*.3+2,fur if k<5 else dark)
            cv.r(tx-7,ty,tx-5,ty+3,ORANGE)
        elif sp=='unicorn':
            for i,c in enumerate(RAINBOW[:4]): cv.r(tx-2-i*.5 if side else 20+i,ty-2+i,tx if side else 22+i,ty+3+i,c)
        elif sp in('whale','shark','fish'):
            c=dark
            if side:
                cv.r(tx-1,ty-1,tx+1,ty+2,c); cv.r(tx-3,ty-4,tx-1,ty,c); cv.r(tx-3,ty+1,tx-1,ty+4,c)
        elif sp=='duck' or sp=='penguin':
            if side: cv.r(tx-1,ty,tx+2,ty+2,dark)
    # ---- feet ----
    def feet():
        if sp=='schrodinger':
            return
        if hop and sp!='frog':
            # little fins as feet
            for fx in ((12,17) if not side else (14,)):
                cv.r(fx,27+oy,fx+4,29+oy,dark)
            return
        if sp=='frog':
            for fx in ((10,18) if not side else (13,)):
                cv.r(fx,27+oy,fx+5,29+oy,dark); cv.p(fx,29+oy,dark); cv.p(fx+4,29+oy,dark)
            return
        fc={'duck':ORANGE,'penguin':C('#f97316'),'fox':C('#1c1917'),'unicorn':C('#a78bfa')}.get(sp,dark)
        if sp=='turtle': fc=s['skind']
        if side:
            for lx,ll in ((13,legA),(17,legB)):
                cv.r(lx,25+oy,lx+3,29+ll+oy,fc if sp in('fox','unicorn') else dark if sp not in('duck','penguin','turtle') else fc)
                if sp in('duck','penguin'): cv.r(lx,28+ll+oy,lx+5,30+ll+oy,fc)
        else:
            for lx,ll in ((12,legA),(17,legB)):
                cv.r(lx,25+oy,lx+3,29+ll+oy,fc if sp in('fox','unicorn','duck','penguin','turtle') else dark)
                if sp in('duck','penguin'): cv.r(lx-1,28+ll+oy,lx+4,30+ll+oy,fc)
    # ---- body ----
    def body():
        if sp=='schrodinger':
            # cardboard box body
            x0,x1=9,23; yt,yf,yb=18+oy,21+oy,29+oy
            cv.r(x0,yt,x1,yf,C('#a8743f')); cv.r(x0,yf,x1,yb,C('#c8945a'))
            cv.r(x0,yf,x1,yf+1,C('#d9a86e')); cv.r(x1-2,yf,x1,yb,C('#a8743f'))
            if d!='up':
                cv.r(x0-2,yt-2,x0+1,yt,C('#d9a86e')); cv.r(x1-1,yt-2,x1+2,yt,C('#d9a86e'))
            if d=='down':
                cv.r(13,23+oy,19,27+oy,C('#fef3c7')); cv.r(15,24+oy,17,25+oy,C('#92400e')); cv.p(16,26+oy,C('#92400e'))
            return
        rx,ry=(6,5) if not side else (5.5,5)
        cv.ell(16 if not side else 15.5,by,rx,ry,lambda u,v,dd,x,y: shade(bodyc,u,v))
        if sp=='turtle':
            sh=fur; shd=dark
            if d=='up':
                cv.ell(16,by-1,7,6,lambda u,v,dd,x,y: shd if (abs(u)<.08 or abs(v)<.08 or dd>.8) else shade(sh,u,v))
            elif side:
                cv.ell(13,by-1,5.5,5.5,lambda u,v,dd,x,y: None if u>.6 else (shd if (dd>.8 or abs(u+.1)<.1) else shade(sh,u,v)))
            else:
                for x in range(9,24):
                    cv.p(x,by-4,shd); cv.p(x,by-5,sh)
                cv.ell(16,by+1,4,3.5,lambda u,v,dd,x,y: C('#e8e0b0') if (abs(v)>.15 or dd<.5) else C('#c9bf86'))
            return
        if d=='down' or (side and sp not in('fish',)):
            bx=16 if d=='down' else 17
            cv.ell(bx,by+1,3.6 if d=='down' else 2.8,3.4,lambda u,v,dd,x,y: belly if sp!='dragon' or (y%2) else dk(belly,.1))
        if sp=='dragon' and d!='down':
            wx=12 if side else 11
            for k,(x,y) in enumerate(((wx,by-6),(wx-1,by-8),(wx+3,by-7))): pass
        if sp=='dragon':
            flap=[0,-1,-2,-1][f]
            for wx,dirx in (((10,-1),(22,1)) if not side else ((11,-1),)):
                for k in range(5):
                    cv.r(wx+dirx*k*.8,by-5-k+flap+(k>2)*1,wx+dirx*k*.8+2,by-1-k//2+flap,C('#86efac') if k%2 else C('#4ade80'))
        if sp=='fish' and side:
            cv.r(14,by-7,19,by-5,dark)
        if sp=='shark':
            if side: cv.r(12,by-8,15,by-4,dark); cv.p(13,by-9,dark)
            elif d=='up': cv.r(15,by-8,17,by-3,dark)
        if sp=='penguin' and d=='up': pass
    # ---- arms ----
    def arms(front_only=False):
        ac=dark if sp not in('penguin',) else C('#0f172a')
        if sp=='turtle': ac=s['skind']
        if sp=='schrodinger':
            ac=fur
        hand=lt(ac,.15)
        if anim=='work':
            k=[0,-2,-4,-1][f]
            if d=='up':
                for ax in (9,21): cv.r(ax,15+oy+k,ax+2,21+oy,ac); cv.r(ax,14+oy+k,ax+2,16+oy+k,hand)
            elif side:
                cv.r(19,17+oy+k//2,24,19+oy+k//2,ac); cv.r(23,16+oy+k//2,25,19+oy+k//2,hand)
            else:
                for ax,kk in ((9,k),(21,-k-2 if k else 0)): cv.r(ax,18+oy+kk,ax+2,23+oy+kk,ac)
            return
        if anim=='carry':
            if side: cv.r(19,6+oy,21,20+oy,ac); cv.r(19,5+oy,21,7+oy,hand); return
            for ax in (7,23): cv.r(ax,6+oy,ax+2,19+oy,ac); cv.r(ax,5+oy,ax+2,7+oy,hand)
            return
        if side:
            cv.r(19+sw,20+oy,22+sw,23+oy,ac); cv.r(20+sw,23+oy,22+sw,24+oy,ac)
        else:
            cv.r(9,19+oy+sw,11,24+oy+sw,ac); cv.r(21,19+oy-sw,23,24+oy-sw,ac)
    # ---- head ----
    def head():
        hc=s.get('skin',fur) if sp=='turtle' else fur
        rx,ry=7,6
        if sp in ('whale','shark','fish'): rx,ry=7.5,6.2
        if sp=='turtle': rx,ry=5.5,5
        if sp=='penguin' and d!='up':
            cv.ell(hx,hy,rx,ry,lambda u,v,dd,x,y: shade(fur,u,v))
            cx=hx+(2 if side else 0)
            cv.ell(cx,hy+1,4.6 if not side else 3.6,4,lambda u,v,dd,x,y: C('#f8fafc'))
            if not side: cv.r(hx-6,hy+3,hx-4,hy+5,C('#fbbf24')); cv.r(hx+4,hy+3,hx+6,hy+5,C('#fbbf24'))
            else: cv.r(hx-1,hy+3,hx+1,hy+5,C('#fbbf24'))
            return
        if sp=='schrodinger':
            def fn(u,v,dd,x,y):
                c=shade(fur,u,v)
                if (u>0) != (d=='up'): c=(c[0]+(228-c[0])//2,c[1]+(228-c[1])//2,c[2]+(231-c[2])//2,150)
                return c
            cv.ell(hx,hy+1,rx-.5,ry-.5,fn); return
        cv.ell(hx+(1 if side else 0),hy,rx,ry,lambda u,v,dd,x,y: shade(hc,u,v))
        if sp=='whale' and d!='up':
            cv.ell(hx+(1 if side else 0),hy+4,5,2.2,lambda u,v,dd,x,y: belly if y%2 else dk(belly,.08))
        if sp=='shark' and d!='up':
            cv.ell(hx+(2 if side else 0),hy+3.5,5,2.5,lambda u,v,dd,x,y: belly)
    # ---- ears / head features (behind = before head, front = after head) ----
    def ears(phase):
        e=hx; t=hy-6
        if sp=='cat' or sp=='schrodinger':
            if phase!='front': return
            pts=((e-6,e-3),(e+3,e+6)) if not side else ((e-3,e),(e+2,e+5))
            for i,(a,b) in enumerate(pts):
                for k in range(4):
                    cv.r(a+k*.5,t-k+1,b-k*.5,t-k+2,fur if sp=='cat' else (fur if (i==0)!=(d=='up') else C('#c4c4cc',160)))
                cv.p((a+b)/2,t,PINK)
        elif sp=='fox':
            if phase!='front': return
            pts=((e-7,e-3),(e+3,e+7)) if not side else ((e-3,e+1),(e+2,e+6))
            for a,b in pts:
                for k in range(5): cv.r(a+k*.4,t-k+1,b-k*.4,t-k+2,fur if k<3 else C('#1f2937'))
        elif sp=='dog':
            if phase!='front': return
            if side: cv.r(e-3,t+2,e+1,t+9,dark); cv.r(e-3,t+8,e,t+9,dk(dark,.2))
            else:
                cv.r(e-8,t+2,e-5,t+9,dark); cv.r(e+5,t+2,e+8,t+9,dark)
        elif sp=='bunny':
            if phase!='back': return
            pts=(e-4,e+2) if not side else (e-2,e+1)
            for i,a in enumerate(pts):
                cv.r(a,t-8,a+3,t+2,fur); cv.r(a,t-8,a+3,t-7,lt(fur,.15))
                if d!='up': cv.r(a+1,t-6,a+2,t+1,PINK)
        elif sp=='unicorn':
            if phase=='back':
                for i,c in enumerate(RAINBOW):
                    if side: cv.r(e-5+i*.0,t+1+i*1.6,e-3,t+3+i*1.6,c)
                    elif d=='up': cv.r(e-5+i*1.7,t+1,e-3+i*1.7,t+10,c)
                return
            if d!='up':
                hx2=e+(3 if side else 0)
                for k in range(5): cv.r(hx2-1+k*.2*(1 if side else 0),t-4+k,hx2+1,t-3+k,C('#fcd34d') if k%2 else C('#f59e0b'))
            for a in ((e-6,e+4) if not side else (e-1,)):
                cv.r(a,t,a+2,t+3,fur); cv.p(a+.5,t+1,PINK)
            if d=='down':
                for i,c in enumerate(RAINBOW[:4]): cv.r(e-3+i*1.5,t+1,e-1+i*1.5,t+3,c)
        elif sp=='dragon':
            if phase!='front': return
            for a in ((e-5,e+3) if not side else (e-2,e+1)):
                cv.r(a,t-2,a+2,t+2,C('#fef3c7')); cv.p(a+1,t-3,C('#fef3c7'))
            if d=='up' or side:
                for k in range(4): cv.r(e-1-(k*1.5 if side else 0),t+3+k*2,e+1-(k*1.5 if side else 0),t+5+k*2,ORANGE)
        elif sp=='frog':
            if phase!='front': return
            for a in ((e-5,e+5) if not side else (e+1,)):
                cv.ell(a,t+1,3,3,lambda u,v,dd,x,y: shade(fur,u,v))
                if d!='up':
                    cv.ell(a,t+1,2.2,2.2,lambda u,v,dd,x,y: C('#ffffff'))
                    cv.r(a-1+(1 if side else 0),t,a+1+(1 if side else 0),t+3,C('#111111')); cv.p(a-1+(1 if side else 0),t,C('#ffffff'))
        elif sp=='fish':
            if phase!='front' or side: return
            cv.r(e-2,t-2,e+3,t+1,dark); cv.r(e-1,t-3,e+2,t-2,dark)
        elif sp=='shark':
            if phase!='front': return
            if not side: cv.r(e-1,t-3,e+2,t+1,dark); cv.p(e,t-4,dark)
        elif sp=='whale':
            if phase!='front': return
            if f in (1,2) or anim=='idle':
                h=[1,3,4,2][f]
                cv.r(e,t-h,e+1,t,C('#93c5fd')); cv.p(e-1,t-h,C('#bfdbfe')); cv.p(e+1,t-h,C('#bfdbfe'))
        elif sp=='duck':
            if phase=='front' and d!='down': cv.r(e-1,t-1,e+1,t+1,dark)
        elif sp=='turtle': pass
    # ---- face ----
    def face():
        if d=='up':
            return
        y=hy
        ec=eye
        def eye2(x,yy,c=ec):
            cv.r(x,yy-.7,x+2,yy+2,c); cv.p(x+.4,yy-.5,C('#ffffff')); cv.p(x+1.3,yy+1.3,lt(c,.5) if c==INK else lt(c,.4))
        if sp=='frog':
            cv.p(hx-3,y+3,PINK); cv.p(hx+3,y+3,PINK)
            cv.r(hx-2,y+2,hx+3,y+3,INK) if not side else cv.r(hx+2,y+2,hx+6,y+3,INK)
            return
        if sp=='schrodinger':
            if side:
                eye2(hx+3,y)
            else:
                eye2(hx-4,y); cv.p(hx+2,y,C('#52525b')); cv.p(hx+4,y+2,C('#52525b')); cv.p(hx+3,y+1,C('#52525b')); cv.p(hx+2,y+2,C('#52525b')); cv.p(hx+4,y,C('#52525b'))
                cv.p(hx,y+3,PINK)
            return
        if side:
            ex=hx+3
            if sp=='turtle': ex=hx+2
            eye2(ex,y-1)
            nx=hx+7
            if sp=='duck': cv.r(hx+6,y+1,hx+10,y+3,ORANGE); cv.r(hx+6,y+2,hx+10,y+3,ORANGE2)
            elif sp=='penguin': cv.r(hx+6,y,hx+9,y+2,C('#f97316'))
            elif sp=='dog': cv.r(hx+5,y+1,hx+9,y+4,lt(fur,.3)); cv.r(hx+8,y+1,hx+10,y+3,INK)
            elif sp=='fox': cv.r(hx+5,y+1,hx+9,y+4,C('#fff7ed')); cv.r(hx+8,y+1,hx+10,y+2,INK)
            elif sp=='shark':
                cv.r(hx+3,y+3,hx+8,y+4,INK)
                for x in range(hx+3,hx+8,2): cv.p(x,y+3,C('#ffffff'))
            elif sp in('cat','bunny'): cv.p(nx,y+1,PINK); cv.p(hx+5,y+3,dk(fur,.3)); 
            elif sp=='unicorn': cv.r(hx+5,y+1,hx+9,y+4,C('#fbcfe8')); cv.p(hx+8,y+2,C('#9d174d'))
            elif sp=='dragon': cv.r(hx+5,y+1,hx+9,y+4,fur); cv.p(hx+8,y+1,dk(fur,.4)); cv.r(hx+5,y+3,hx+8,y+4,dk(fur,.35))
            elif sp in('whale','fish'): cv.p(hx+6,y+3,INK); cv.p(hx+5,y+3,INK)
            if sp in('cat','bunny','unicorn','fox','dog','whale','fish','dragon','duck','turtle'): cv.p(hx+3,y+3,PINK if sp!='dragon' else C('#fda4af'))
            return
        # front
        if sp=='dragon': eye2(hx-4,y-1,C('#facc15')); eye2(hx+2,y-1,C('#facc15')); cv.p(hx-3,y-1,INK); cv.p(hx+3,y-1,INK); cv.p(hx-3,y,INK); cv.p(hx+3,y,INK)
        elif sp=='turtle': eye2(hx-3,y-1); eye2(hx+1,y-1)
        else: eye2(hx-4,y-1); eye2(hx+2,y-1)
        if sp in('fish','whale','shark'):
            pass
        cheek=PINK
        if sp not in('penguin','shark'): cv.p(hx-5,y+2,cheek); cv.p(hx+5,y+2,cheek)
        if sp in('cat','bunny','schrodinger'): cv.p(hx,y+2,PINK); cv.p(hx-1,y+3,dk(fur,.35)); cv.p(hx+1,y+3,dk(fur,.35))
        elif sp=='dog': cv.r(hx-2,y+1,hx+3,y+5,lt(fur,.3)); cv.r(hx-1,y+1,hx+2,y+3,INK)
        elif sp=='fox': cv.r(hx-3,y+2,hx+4,y+5,C('#fff7ed')); cv.r(hx-1,y+2,hx+2,y+3,INK)
        elif sp=='duck': cv.r(hx-3,y+2,hx+4,y+4,ORANGE); cv.r(hx-3,y+3,hx+4,y+4,ORANGE2)
        elif sp=='penguin': cv.r(hx-1,y+1,hx+2,y+3,C('#f97316'))
        elif sp=='unicorn': cv.r(hx-2,y+2,hx+3,y+5,C('#fbcfe8')); cv.p(hx-1,y+3,C('#9d174d')); cv.p(hx+1,y+3,C('#9d174d'))
        elif sp=='dragon': cv.r(hx-2,y+2,hx+3,y+4,lt(fur,.2)); cv.p(hx-1,y+2,dk(fur,.4)); cv.p(hx+1,y+2,dk(fur,.4))
        elif sp=='shark':
            cv.r(hx-4,y+3,hx+5,y+4,INK)
            for x in range(hx-3,hx+5,2): cv.p(x,y+3,C('#ffffff'))
        elif sp in('fish','whale','turtle'): cv.p(hx,y+3,INK); cv.p(hx-1,y+2,INK); cv.p(hx+1,y+2,INK)
    # order
    if d=='up':
        feet(); body(); arms(); ears('back'); head(); ears('front'); tail()
        if anim=='carry': arms()
        if sp=='dragon':  # wings over the back
            flap=[0,-1,-2,-1][f]
            for wx,dx in ((13,-1),(19,1)):
                for k in range(5): cv.r(wx+dx*k*.8,by-5-k+flap,wx+dx*k*.8+2,by-1-k//2+flap,C('#86efac') if k%2 else C('#4ade80'))
        if sp=='penguin': cv.ell(16,by,4,4,lambda u,v,dd,x,y: None)
    else:
        tail(); feet(); body(); arms(); ears('back'); head(); ears('front'); face()
        if anim=='carry': arms()
    cv.outline()
    return cv.im

DIRS=['down','left','right','up']; ANIMS=['idle','walk','work','carry']
def frame(sp,ci,d,a,f):
    if d=='left': return ImageOps.mirror(draw(sp,ci,'right',a,f))
    return draw(sp,ci,d,a,f)
def sheet(sp,ci=0):
    S=Image.new('RGBA',(128,512))
    r=0
    for a in ANIMS:
        for d in DIRS:
            for f in range(4): S.paste(frame(sp,ci,d,a,f),(f*32,r*32))
            r+=1
    return S
SPECIES=['cat','dog','bunny','duck','turtle','fish','unicorn','penguin','dragon','fox','whale','schrodinger','frog','shark']
if __name__=='__main__':
    B=Image.new('RGBA',(14*36,4*36*2),(232,220,200,255))
    for i,sp in enumerate(SPECIES):
        for j,d in enumerate(DIRS):
            B.alpha_composite(frame(sp,0,d,'idle',0),(i*36,j*36))
            B.alpha_composite(frame(sp,0,d,'walk',1),(i*36,(j+4)*36))
    B.resize((B.width*3,B.height*3),Image.NEAREST).save('animals_board.png')
