"""Pieces that sit on / over belts, in the same projection as the belts.
Horizontal belt in its tile: surface across a in [-10,10] at screen y = 14+a, ground y = 19+a.
Vertical belt: surface across x = 16+a, ground y = tile y + 5."""
from kit2 import *
from mach import FAM
def _seg(cv,p,q,w,c):
    n=int(max(abs(q[0]-p[0]),abs(q[1]-p[1]))*2)+1
    for i in range(n+1):
        s=i/n; x=p[0]+(q[0]-p[0])*s; y=p[1]+(q[1]-p[1])*s; cv.r(x-w,y-w,x+w+1,y+w+1,OUT)
    for i in range(n+1):
        s=i/n; x=p[0]+(q[0]-p[0])*s; y=p[1]+(q[1]-p[1])*s; cv.r(x-w+1,y-w+1,x+w,y+w,c)
ZG=18
def gate(f,o='h',fam='elec'):
    """Quality-control tunnel over a belt (same projection as the hoods, height ZG).
    sprite 32 x (32+ZG), bottom = bottom of the belt tile."""
    F=FAM[fam]; cv=Cv(32,32+ZG); oy=ZG
    top,face=F['top'],F['face']; scan=[0,1,2,3][f]
    if o=='h':
        x0,x1,g0,g1=8,24,7,31
        box(cv,x0,oy+g0-ZG,x1,oy+g1,ZG,top,face,shadow=False)
        # glass slot on top with a scanning red line
        cv.r(x0+3,oy+g0-ZG+3,x1-3,oy+g1-ZG-3,C('#1a1c22'))
        ly=oy+g0-ZG+4+scan*((g1-g0-8)//3)
        cv.r(x0+3,ly,x1-3,ly+1,C('#ff3b3b')); cv.r(x0+3,ly+1,x1-3,ly+2,(255,60,60,90))
        # red glow spilling on the belt at both ends + status light on the face
        for x in (x0-3,x0-2,x0-1,x1,x1+1,x1+2):
            a=90-abs((x0-1 if x<x0 else x1)-x)*25
            cv.r(x,oy+4,x+1,oy+24,(255,60,60,max(0,a)))
        cv.r(x0+5,oy+g1-ZG+5,x1-5,oy+g1-ZG+8,P['g0'] if f!=3 else P['r1'])
    else:
        x0,x1,g0,g1=4,28,8,24
        box(cv,x0,oy+g0-ZG,x1,oy+g1,ZG,top,face,shadow=False)
        cv.r(x0+3,oy+g0-ZG+3,x1-3,oy+g1-ZG-3,C('#1a1c22'))
        lx=x0+4+scan*((x1-x0-8)//3)
        cv.r(lx,oy+g0-ZG+3,lx+1,oy+g1-ZG-3,C('#ff3b3b'))
        # open mouth on the south face: the belt comes out here
        cv.r(x0+3,oy+g1-ZG+3,x1-3,oy+g1,C('#0d0d10'))
        for x in range(x0+3,x1-3,2): cv.r(x,oy+g1-ZG+3,x+1,oy+g1-1,C('#3a1010'))
        for y in (oy+g0-ZG-2,oy+g0-ZG-1): cv.r(x0+2,y,x1-2,y+1,(255,60,60,60))
    cv.outline(); return cv.im
def arm(f,o='ns',fam='elec'):
    """Robot arm on its own tile, moving items between the two neighbouring belts.
    o='ns': picks on the belt south of it, drops on the belt north of it (play 0-1-2-3-2-1; reverse for N->S).
    o='we': picks west, drops east (for vertical belts). Returns (image, hand position per frame in sprite px, footprint origin)."""
    F=FAM[fam]; t=[0,1/3,2/3,1][f]
    if o=='ns':
        W,Hs=32,114; oy=50; ox=0
        def scr(gx,gy,h): return (ox+gx, oy+gy-h)
        hand_g=(16,51-t*64); 
    else:
        W,Hs=96,72; oy=36; ox=32
        def scr(gx,gy,h): return (ox+gx, oy+gy-h)
        hand_g=(-16+t*64,16)
    cv=Cv(W,Hs)
    # base on the footprint tile (ground 8..24), height 8
    bx0,by0=ox+8,oy+8
    cv.shadow(ox+16,oy+24,9,3,90)
    box(cv,bx0,by0-8,bx0+16,by0+16,8,F['top'],F['face'],shadow=False)
    hazard(cv,bx0+1,by0-7,bx0+15,by0-4,2)
    sh=scr(16,16,22)            # shoulder
    hh=9+math.sin(math.pi*t)*12  # hand height
    hand=scr(hand_g[0],hand_g[1],hh)
    el_g=((16+hand_g[0])/2,(16+hand_g[1])/2); el=scr(el_g[0],el_g[1],30+math.sin(math.pi*t)*4)
    cv.r(sh[0]-2,sh[1],sh[0]+3,by0-6,F['face'])
    _seg(cv,sh,el,4,F['rim']); _seg(cv,el,hand,3,C('#c3c8d2'))
    cv.ell(sh[0],sh[1],3.5,3.5,lambda u,v,d,x,y: C('#2a2d36') if d>.5 else C('#9aa0ad'))
    cv.ell(el[0],el[1],2.5,2.5,lambda u,v,d,x,y: C('#2a2d36') if d>.5 else C('#9aa0ad'))
    cv.r(hand[0]-4,hand[1],hand[0]-2,hand[1]+4,C('#c3c8d2')); cv.r(hand[0]+2,hand[1],hand[0]+4,hand[1]+4,C('#c3c8d2'))
    cv.r(bx0+11,by0+2,bx0+14,by0+5,P['g0'] if f%2 else C('#1f5c30'))
    cv.outline()
    return cv.im,(round(hand[0]),round(hand[1])),(ox,oy)
def splitter(f,o='h',fam='elec'):
    """o='h': flow W->E, footprint 1x2 (two rows). o='v': flow N->S, footprint 2x1 (two columns)."""
    F=FAM[fam]; top,face=F['htop'],F['hface']; Hd=12
    if o=='h':
        cv=Cv(32,64+Hd); oy=Hd
        yt,yf,yb=oy+8-Hd,oy+62-Hd,oy+62
        cv.r(0,yt,32,yf,top); cv.r(0,yf,32,yb,face)
        cv.r(0,yt,32,yt+1,lt(top,.3)); cv.r(0,yf-1,32,yf,F['rim']); cv.r(0,yf,32,yf+1,dk(face,.35)); cv.r(0,yb-2,32,yb,dk(face,.3))
        hazard(cv,2,yt+2,30,yt+5,3)
        for row,on in ((0,f%2==0),(1,f%2==1)):
            c=P['g0'] if on else C('#3c404b'); cyy=oy+row*32+14-Hd+3
            cv.r(8,cyy-1,16,cyy+1,c)
            for k in range(-3,4): cv.r(16+(3-abs(k)),cyy+k,18+(3-abs(k)),cyy+k+1,c)
        gear2d(cv,16,(yt+yf)//2,2,3.5,6,f*.4,C('#c9ced8'))
        for x in range(0,32): cv.p(x,yt-1,OUT); cv.p(x,yb,OUT)
    else:
        cv=Cv(64,32+Hd); oy=Hd
        yt,yf,yb=oy-Hd,oy+32-Hd,oy+32
        cv.r(5,yt,59,yf,top); cv.r(5,yf,59,yb,face)
        cv.r(5,yt,59,yt+1,lt(top,.3)); cv.r(5,yf-1,59,yf,F['rim']); cv.r(5,yf,59,yf+1,dk(face,.35))
        hazard(cv,7,yt+2,57,yt+5,3)
        for col,on in ((0,f%2==0),(1,f%2==1)):
            c=P['g0'] if on else C('#3c404b'); cxx=col*32+16
            cv.r(cxx-1,yt+8,cxx+1,yt+15,c)
            for k in range(-3,4): cv.r(cxx+k,yt+15+(3-abs(k)),cxx+k+1,yt+17+(3-abs(k)),c)
            cv.r(cxx-9,yf+3,cxx+9,yb,C('#0d0d10'))
            for x in range(cxx-9,cxx+9,2): cv.r(x,yf+3,x+1,yb-1,C('#2a2b31'))
        gear2d(cv,32,(yt+yf)//2,2,3.5,6,f*.4,C('#c9ced8'))
        for y in range(yt,yb): cv.p(4,y,OUT); cv.p(59,y,OUT)
        for x in range(5,59): cv.p(x,yt-1,OUT); cv.p(x,yb,OUT)
    return cv.im
def belt_family(name):
    """wood (étape 3), iron (étape 4), metal (étapes 5+) : same geometry, different palette"""
    src=open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'conveyors.py')).read()
    pal={'wood':("belt=C('#a8743f'); belt_e=C('#8a5a2e'); rid_h=C('#d9a066'); rid_d=C('#5e3620')","rail_o=C('#c48f55'); rail_i=C('#6b4223')","face=[C('#b77a45'),C('#8c5530'),C('#6b4223'),C('#5e3620'),C('#3d2216')]","rivet=C('#c9a46a')"),
         'iron':("belt=C('#3a3f3c'); belt_e=C('#2a2e2c'); rid_h=C('#5c6560'); rid_d=C('#1c1f1e')","rail_o=C('#e08a5a'); rail_i=C('#8a4428')","face=[C('#b5603a'),C('#8a4428'),C('#3e4a45'),C('#35403b'),C('#232a27')]","rivet=C('#e08a5a')"),
         'metal':None}[name]
    if pal:
        src=src.replace("belt=C('#3b3d47'); belt_e=C('#2c2e36'); rid_h=C('#62667a'); rid_d=C('#202128')",pal[0])
        src=src.replace("rail_o=C('#f2bd3e'); rail_i=C('#a86f18')",pal[1])
        src=src.replace("face=[C('#d49a2a'),C('#94631a'),C('#4f5462'),C('#4a4f5c'),C('#30333c')]",pal[2])
        src=src.replace("rivet=C('#8d93a2')",pal[3])
    src=src.replace("sheet.save('conveyor_32x32_3-4_sheet.png')","SHEET=sheet")
    src=src.replace("import pickle; pickle.dump({k:v.tobytes() for k,v in frames.items()},open('fr.pkl','wb'))","")
    g={}; exec(src.split("print([n")[0],g)
    return g['SHEET'],g['frames'],[n for n,_ in g['tiles']]
