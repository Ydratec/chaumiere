"""Common 3/4 machine engine.
Projection: an object of height Z standing on a footprint of W x H tiles is drawn in a sprite of
W*32 x (H*32 + Z). The footprint's ground occupies sprite rows Z .. Z+H*32 ; a box of ground rect
(gx0,gy0,gx1,gy1) has its top surface at sprite rows gy0..gy1 and its front face at gy1..gy1+Z.
Belts use the same rule (belt height 5), so ports line up with belts by construction.
Orientation 'h' : belt flows W<->E, ports on the left/right of the bottom row ("vue de face").
Orientation 'v' : belt flows N<->S, ports on the top/bottom of column (W-1)//2 ("vue de côté")."""
from kit2 import *
from items import item
HOOD=12
FAM={
 'art':dict(top=P['w1'],face=P['w2'],htop=P['w1'],hface=P['w3'],rim=P['w0'],rimd=P['w2']),
 'vap':dict(top=C('#55625c'),face=C('#3e4a45'),htop=C('#5f6b66'),hface=C('#3e4a45'),rim=P['c0'],rimd=P['c2']),
 'elec':dict(top=C('#a8b0bc'),face=C('#6d7384'),htop=C('#737a8b'),hface=C('#4e5361'),rim=P['y1'],rimd=P['y2']),
 'robot':dict(top=C('#e8ecf2'),face=C('#b8c2d0'),htop=C('#cfd6e0'),hface=C('#8f9aab'),rim=P['b1'],rimd=P['b2']),
}
class M:
    def __init__(s,fam,W,H,Z,o='h',ports=True,head=30):
        s.fam=FAM[fam]; s.famname=fam; s.W,s.H,s.Z,s.o,s.ports=W,H,Z,o,ports
        s.head=head; s.oy=head+Z          # sprite row of the footprint's ground origin
        s.cv=Cv(W*32,H*32+Z+head)
        if o=='h':
            s.g=[6 if ports else 2,2,W*32-(6 if ports else 2),H*32-2]
        else:
            s.g=[2,6 if ports else 2,W*32-2,H*32-(6 if ports else 2)]
        gx0,gy0,gx1,gy1=s.g
        s.top=(gx0,gy0+head,gx1,gy1+head); s.face=(gx0,gy1+head,gx1,gy1+head+Z)
        s.cv.shadow(W*16+2,H*32+Z+head-1,W*16,3,80)
    def body(s,top=None,face=None):
        gx0,gy0,gx1,gy1=s.g
        if s.ports and s.o=='v': s.hood_v('N')
        box(s.cv,gx0,gy0+s.head,gx1,gy1+s.head+s.Z,s.Z,top or s.fam['top'],face or s.fam['face'],shadow=False)
        if s.ports:
            if s.o=='h': s.hood_h('W'); s.hood_h('E')
            else: s.hood_v('S')
    # ---- ports ----
    def hood_h(s,side):
        cv=s.cv; bt=s.oy+(s.H-1)*32
        x0,x1=(0,s.g[0]) if side=='W' else (s.g[2],s.W*32)
        top,face=s.fam['htop'],s.fam['hface']
        yt,yf,yb=bt-4,bt+18,bt+30
        cv.r(x0,yt,x1,yf,top); cv.r(x0,yf,x1,yb,face)
        cv.r(x0,yt,x1,yt+1,lt(top,.3)); cv.r(x0,yf-1,x1,yf,lt(top,.35)); cv.r(x0,yf,x1,yf+1,dk(face,.35)); cv.r(x0,yb-2,x1,yb,dk(face,.3))
        oe=x0 if side=='W' else x1-1; ie=x1-1 if side=='W' else x0
        for y in range(yt,yb): cv.p(oe,y,s.fam['rim'] if y<yf else s.fam['rimd']); cv.p(ie,y,(0,0,0,90))
        for x in range(x0,x1): cv.p(x,yt-1,OUT); cv.p(x,yb,OUT)
        fx=[x0+1,x0+2] if side=='W' else [x1-3,x1-2]
        for x in fx:
            for y in range(yf+2,yb-2): cv.p(x,y,C('#2a2b31') if y%2 else C('#3c3d45'))
    def hood_v(s,side):
        cv=s.cv; c=(s.W-1)//2; x0,x1=c*32+5,c*32+27
        top,face=s.fam['htop'],s.fam['hface']
        if side=='S': g0,g1=s.H*32-6,s.H*32
        else: g0,g1=0,6
        yt,yf,yb=s.oy+g0-HOOD,s.oy+g1-HOOD,s.oy+g1
        cv.r(x0,yt,x1,yf,top); cv.r(x0,yf,x1,yb,face)
        cv.r(x0,yt,x1,yt+1,lt(top,.3)); cv.r(x0,yf-1,x1,yf,s.fam['rim']); cv.r(x0,yf,x1,yf+1,dk(face,.35))
        for y in range(yt-1,yb+1): cv.p(x0-1,y,OUT); cv.p(x1,y,OUT)
        for x in range(x0,x1): cv.p(x,yt-1,OUT)
        if side=='S':   # dark mouth with rubber flaps, the belt goes in under it
            cv.r(x0+2,yf+3,x1-2,yb,C('#0d0d10'))
            for x in range(x0+2,x1-2,2): cv.r(x,yf+3,x+1,yb-1,C('#2a2b31'))
            cv.r(x0+1,yb-1,x1-1,yb,(0,0,0,0))
    # ---- helpers for decorations ----
    def done(s): s.cv.outline(); return s.cv.im
def crop_frames(frames):
    """crop the same empty top rows from all frames (sprites stay bottom-anchored)"""
    top=min((im.getbbox() or (0,0,0,im.height))[1] for im in frames)
    top=max(0,top-1)
    return [im.crop((0,top,im.width,im.height)) for im in frames]
def ports_info(W,H,o):
    if o=='h': return {'in':{'side':'W','row':H-1},'out':{'side':'E','row':H-1}}
    return {'in':{'side':'N','col':(W-1)//2},'out':{'side':'S','col':(W-1)//2}}
