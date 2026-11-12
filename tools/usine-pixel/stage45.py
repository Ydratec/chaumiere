from kit2 import *
from items import item
# ---------- tiles ----------
def floor_stone(v=0):
    cv=Cv(32,32); rnd=random.Random(v+10)
    for by in range(0,32,16):
        for bx in range(0,32,16):
            t=rnd.uniform(-.08,.08); base=mix(C('#8f8a84'),(255,255,255) if t>0 else (0,0,0),abs(t))
            for y in range(by,by+16):
                for x in range(bx,bx+16):
                    c=base
                    if x==bx or y==by: c=C('#5f5a55')
                    elif x==bx+1 or y==by+1: c=lt(base,.12)
                    elif (x*7+y*13+v)%17==0: c=dk(base,.1)
                    cv.p(x,y,c)
    if v==1:
        for k in range(6): cv.p(20+k,20+(k%3),C('#5f5a55'))
    return cv.im
def floor_concrete(v=0):
    cv=Cv(32,32)
    for y in range(32):
        for x in range(32):
            c=C('#9aa0a8')
            if (x*7+y*11)%19==0: c=C('#8a9098')
            if (x*3+y*5)%23==0: c=C('#a8aeb6')
            if x==0 or y==0: c=C('#7a808a')
            cv.p(x,y,c)
    if v==1: hazard(cv,0,28,32,32,4)
    if v==2:
        for y in range(32): cv.r(14,y,18,y+1,P['y1'] if (y//6)%2==0 else C('#9aa0a8'))
    return cv.im
def wall_brick(kind='plain'):
    cv=Cv(32,64)
    for y in range(64):
        row=y//6; off=0 if row%2 else 5
        for x in range(32):
            c=C('#9a4a36') if (row*7+(x+off)//10)%3 else C('#86402f')
            if y%6==5 or (x+off)%10==0: c=C('#5e3a2e')
            elif y%6==0: c=lt(c,.12)
            cv.p(x,y,c)
    cv.r(0,0,32,3,C('#6b6660')); cv.r(0,56,32,64,C('#4a4541')); cv.r(0,56,32,57,C('#6b6660'))
    if kind=='window':
        cv.r(5,10,27,44,C('#2a2a30'))
        for y in range(12,42):
            for x in range(7,25): cv.p(x,y,mix(C('#3a4a6a'),C('#8aa0c8'),(y-12)/30))
        for x in (12,19): cv.r(x,12,x+1,42,C('#2a2a30'))
        for y in (22,32): cv.r(7,y,25,y+1,C('#2a2a30'))
        cv.r(4,44,28,46,C('#6b6660'))
    if kind=='pipe':
        cv.r(0,20,32,26,P['c1']); cv.r(0,20,32,21,P['c0']); cv.r(0,25,32,26,P['c2'])
        cv.r(14,18,18,28,P['m2'])
    return cv.im
def wall_metal(kind='plain'):
    cv=Cv(32,64)
    for y in range(64):
        for x in range(32):
            k=x%6; c=[C('#a8b0bc'),C('#9aa2ae'),C('#8c94a0'),C('#7e8692'),C('#8c94a0'),C('#9aa2ae')][k]
            cv.p(x,y,c)
    cv.r(0,0,32,3,C('#5a606c')); cv.r(0,30,32,32,C('#5a606c'))
    for x in range(2,32,8): bolt(cv,x,31)
    cv.r(0,54,32,64,C('#3c404b')); hazard(cv,0,56,32,60,3)
    if kind=='sign':
        cv.r(6,10,26,24,P['g1']); cv.r(7,11,25,23,P['g2'])
        for k in range(5): cv.r(11+k,17-k//2,12+k,18+k//2,P['s0'])
        cv.r(16,15,22,18,P['s0'])
    if kind=='light':
        cv.r(10,8,22,12,C('#3c404b')); cv.ell(16,13,5,3,lambda u,v,d,x,y: None if y<12 else C('#fff6c2'))
        for y in range(14,40):
            w=(y-14)*.4+4
            for x in range(int(16-w),int(16+w)): cv.p(x,y,(255,246,194,int(50*(1-(y-14)/26))))
    return cv.im
def pipe_tile(kind,f=0):
    """steam pipes on the floor (1x1): h, v, ne, nw, se, sw, valve"""
    cv=Cv(32,32); c=P['c1']
    def hpipe(x0,x1):
        cv.r(x0,13,x1,19,c); cv.r(x0,13,x1,14,P['c0']); cv.r(x0,18,x1,19,P['c2']); cv.r(x0,19,x1,21,(0,0,0,60))
    def vpipe(y0,y1):
        cv.r(13,y0,19,y1,c); cv.r(13,y0,14,y1,P['c0']); cv.r(18,y0,19,y1,P['c2'])
    if kind=='h': hpipe(0,32); [cv.r(x,12,x+3,20,P['c2']) for x in (0,29)]
    if kind=='v': vpipe(0,32); [cv.r(12,y,20,y+3,P['c2']) for y in (0,29)]
    if 'n' in kind and len(kind)==2: vpipe(0,19)
    if 's' in kind and len(kind)==2: vpipe(13,32)
    if kind in('ne','se'): hpipe(13,32)
    if kind in('nw','sw'): hpipe(0,19)
    if len(kind)==2: cv.r(12,12,20,20,P['c2']); cv.r(13,13,19,19,c)
    if kind=='valve':
        hpipe(0,32); cv.r(12,10,20,22,P['m2'])
        a=f*math.pi/4; cv.r(15,4,17,11,P['m1'])
        for k in range(-5,6): cv.p(16+math.cos(a)*k,5+math.sin(a)*k*.4,P['r1'])
        puff(cv,22,10,f,1,rise=8)
    cv.outline(); return cv.im
# ---------- STAGE 4 : manufacture vapeur ----------
def boiler(f):
    cv=Cv(64,64)
    cv.shadow(32,61,28,3,90)
    # brick firebox base
    ft=box(cv,6,36,58,61,14,C('#8a8580'),C('#9a4a36'))
    for y in range(ft+1,59,4):
        for x in range(7,57): 
            if (x+(y//4)*4)%9==0 or y%4==0: cv.p(x,y,C('#5e3a2e'))
    # fire door
    cv.r(12,ft+3,24,59,C('#2a2a30')); 
    for y in range(ft+4,58):
        for x in range(13,23): cv.p(x,y,[P['f1'],P['f2'],P['f3']][(x+y+f)%3] if (x+y*3+f)%4 else P['f0'])
    # big copper boiler
    cyl_h(cv,8,52,26,12,P['c1'])
    for x in (16,30,44): cv.r(x,14,x+2,38,P['c2']); cv.r(x,14,x+1,38,P['c0'])
    for x in range(10,52,4): bolt(cv,x,15)
    gauge(cv,46,46,f)
    # chimney + steam
    cyl_v(cv,40,48,2,16,P['m2'])
    puff(cv,44,2,f,2,rise=4,drift=4)
    # safety valve puff
    cv.r(20,10,23,14,P['m1']); puff(cv,21,9,(f+2)%4,1,rise=8,drift=-3)
    cv.outline(); return cv.im
def steam_press(f):
    cv=Cv(64,64)
    ft=box(cv,8,40,56,61,12,C('#5a606c'),C('#3c404b'))
    cv.r(10,ft-8,54,ft-1,C('#2a2d36'))   # die bed
    cv.paste(item('ball_clear') if f>=2 else item('glass'),24,ft-12)
    # frame
    for x in (10,48): cv.r(x,6,x+6,ft,C('#6d7384')); cv.r(x,6,x+1,ft,C('#9aa2ae'))
    cv.r(8,4,56,10,C('#6d7384')); cv.r(8,4,56,5,C('#9aa2ae'))
    # piston
    k=[0,6,10,4][f]
    cyl_v(cv,26,38,10,16+k,C('#c9ced8'),cap=False)
    cv.r(20,16+k,44,22+k,P['c1']); cv.r(20,16+k,44,17+k,P['c0'])
    # steam pipe on the side + gauge
    cv.r(56,20,62,24,P['c1']); cv.r(58,24,62,58,P['c1']); cv.r(58,24,59,58,P['c0'])
    gauge(cv,14,ft+6,f,2.6)
    if f==2: puff(cv,46,18,1,2,rise=6,drift=4)
    cv.outline(); return cv.im
def steam_lamp():
    cv=Cv(32,64); cv.shadow(16,61,6,2,80)
    cv.r(15,14,17,60,C('#2a2a30')); cv.r(12,58,20,61,C('#2a2a30'))
    cv.r(10,8,22,18,C('#2a2a30')); cv.r(11,9,21,17,C('#ffd27a')); cv.r(13,10,19,16,C('#fff6c2'))
    cv.r(9,6,23,8,C('#2a2a30')); cv.p(16,5,C('#2a2a30'))
    cv.outline(); return cv.im
# ---------- STAGE 5 : usine électrique ----------
def paint_booth(f):
    cv=Cv(64,64)
    ft=box(cv,6,8,58,61,22,C('#e4e7ec'),C('#b8bec8'))
    # glass window into booth
    cv.r(12,12,52,ft-4,C('#2a2d36'))
    for y in range(13,ft-5):
        for x in range(13,51): cv.p(x,y,mix(C('#33405a'),C('#4a5a78'),(y-13)/30))
    # spray nozzles + coloured mist
    cols=[P['r1'],P['g1'],P['y1'],P['b1']]; c=cols[f]
    for i,nx in enumerate((20,32,44)):
        cv.r(nx-1,13,nx+2,17,C('#8a909c'))
        for k in range(12):
            for j in range(-k//3,k//3+1): cv.p(nx+j,17+k,(c[0],c[1],c[2],120-k*8))
    cv.ell(32,ft-9,5,5,lambda u,v,d,x,y: sphere(c,u,v,d))
    for x in range(13,51): cv.p(x,13,(255,255,255,80))
    # control panel face
    for i,col in enumerate(cols):
        cv.r(12+i*6,ft+5,16+i*6,ft+9,OUT); cv.r(13+i*6,ft+6,15+i*6,ft+8,col if i==f else dk(col,.5))
    cv.r(40,ft+4,54,ft+12,C('#0f2a1c')); cv.r(41,ft+5,41+((f+1)*3),ft+7,C('#4dff9a'))
    hazard(cv,7,59-3,57,59,3)
    cv.outline(); return cv.im
def generator(f):
    cv=Cv(64,64)
    ft=box(cv,4,22,60,61,18,C('#5e6475'),C('#444a59'))
    # coil housing (cylinder) on top
    cyl_h(cv,10,46,22,11,C('#3c8b5a'))
    for x in range(12,46,3): cv.r(x,13,x+1,31,dk(C('#3c8b5a'),.3))
    # spinning flywheel at the end
    a=f*math.pi/8
    cv.ell(50,22,9,10,lambda u,v,d,x,y: C('#2a2d36') if d>.8 else (C('#8a909c') if d>.2 else C('#c9ced8')))
    for k in range(3):
        t=a+k*2.094
        for r in range(2,8): cv.p(50+math.cos(t)*r,22+math.sin(t)*r*1.1,C('#2a2d36'))
    # insulators + spark
    for x in (14,28,42):
        cv.r(x,4,x+4,12,C('#e9e3d4')); cv.r(x,6,x+4,7,C('#b4aa94')); cv.r(x,9,x+4,10,C('#b4aa94'))
    if f%2==0:
        pts=[(16,4),(19,1),(23,4),(26,0),(30,3)]
        for (x0,y0),(x1,y1) in zip(pts,pts[1:]):
            for t in range(6): cv.p(x0+(x1-x0)*t/6,y0+(y1-y0)*t/6,C('#bfe6ff'))
    # face: lightning sign + meter
    cv.r(10,ft+4,22,ft+15,P['y1'])
    for k in range(5): cv.p(17-k,ft+6+k,OUT); cv.p(14+k,ft+10+k//2,OUT)
    cv.r(30,ft+4,54,ft+12,C('#0f2a1c'))
    for i in range(6): cv.r(32+i*4,ft+11-((i+f)%4)*2,34+i*4,ft+11,C('#4dff9a'))
    cv.outline(); return cv.im
