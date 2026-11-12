from kit2 import *
from items import item
from stage45 import floor_concrete
# ---------- STAGE 6 : automatisation ----------
def robot_arm(f):
    """inserter 1x1 (sprite 32x48): picks from the tile below, drops on the tile above. 4 frames = half swing; play 0-1-2-3-2-1."""
    cv=Cv(32,48); cv.shadow(16,45,8,2,90)
    box(cv,9,36,23,45,5,C('#5e6475'),C('#444a59'),shadow=False)
    hazard(cv,10,37,22,40,2)
    t=[0,.33,.66,1][f]
    ang=math.pi/2 - t*math.pi        # from pointing down (south) to up (north)
    bx,by=16,36
    ex,ey=bx+math.cos(ang)*0, by+math.sin(ang)*9
    hx,hy=16, by+math.sin(ang)*9-12+ (1-abs(math.sin(ang)))*0
    # upper arm (always goes up), forearm points toward target
    jx,jy=16,22
    def seg(p,q,w,c,ch):
        n=int(max(abs(q[0]-p[0]),abs(q[1]-p[1]))*2)+1
        for i in range(n+1):
            s=i/n; x=p[0]+(q[0]-p[0])*s; y=p[1]+(q[1]-p[1])*s
            cv.r(x-w,y-w,x+w+1,y+w+1,OUT)
        for i in range(n+1):
            s=i/n; x=p[0]+(q[0]-p[0])*s; y=p[1]+(q[1]-p[1])*s
            cv.r(x-w+1,y-w+1,x+w,y+w,ch if s<.5 else c)
    tip=(16,22+math.sin(ang)*16)
    seg((bx,by),(jx,jy),3,C('#d08a1e'),P['y1'])
    seg((jx,jy),tip,3,C('#8a909c'),C('#c3c8d2'))
    cv.ell(jx,jy,3,3,lambda u,v,d,x,y: C('#2a2d36') if d>.5 else C('#9aa0ad'))
    cv.r(tip[0]-4,tip[1]-1,tip[0]-2,tip[1]+3,C('#c3c8d2')); cv.r(tip[0]+2,tip[1]-1,tip[0]+4,tip[1]+3,C('#c3c8d2'))
    if f in (1,2): cv.paste(item('ball_red'),tip[0]-8,tip[1]-6)
    cv.r(19,40,22,42,P['g0'] if f%2 else C('#1f5c30'))
    cv.outline(); return cv.im
def scanner(f):
    """quality-control gate over a belt (1x1, sprite 32x48)"""
    cv=Cv(32,48)
    for x in (2,26): cv.r(x,8,x+4,44,C('#5e6475')); cv.r(x,8,x+1,44,C('#8a91a1'))
    cv.r(2,6,30,12,C('#444a59')); cv.r(2,6,30,7,C('#8a91a1'))
    cv.r(10,9,22,11,C('#ff3b3b') if f%2 else C('#ffb0b0'))
    ly=14+f*6
    for x in range(6,26): cv.p(x,ly,(255,60,60,200)); cv.p(x,ly+1,(255,60,60,90))
    cv.r(24,8,28,12,P['g0'] if f!=3 else P['r1'])
    cv.outline(); return cv.im
def splitter(f):
    """belt splitter, footprint 1x2 (32x64), input west, outputs east on both rows"""
    cv=Cv(32,64)
    ft=box(cv,2,4,30,62,8,C('#6d7384'),C('#4e5361'))
    hazard(cv,4,6,28,9,3)
    # two output arrows alternating
    for row,on in ((0,f%2==0),(1,f%2==1)):
        cy=20+row*28
        c=P['g0'] if on else C('#3c404b')
        for k in range(-3,4): cv.r(14+(3-abs(k)),cy+k,16+(3-abs(k)),cy+k+1,c)
        cv.r(6,cy-1,14,cy+1,c)
    cv.r(10,30,22,36,C('#2a2d36')); gear2d(cv,16,33,2,3.5,6,f*.4,C('#c9ced8'))
    return cv.im
def paint_robot(f):
    cv=Cv(64,64)
    ft=box(cv,4,28,60,61,10,C('#6d7384'),C('#4e5361'))
    hazard(cv,6,30,58,33,3)
    # turntable with ball
    cv.ell(22,42,10,5,lambda u,v,d,x,y: C('#2a2d36') if d>.7 else C('#8a909c'))
    cols=[P['r1'],P['g1'],P['y1'],P['b1']]
    cv.ell(22,36,6,6,lambda u,v,d,x,y: sphere(cols[f],u,v,d))
    # robot arm with spray head, swinging
    base=(46,40); sw=[-.3,0,.3,0][f]
    j=(46+math.cos(-math.pi/2-0.6+sw)*14, 40+math.sin(-math.pi/2-0.6+sw)*14)
    tip=(j[0]-10,j[1]+4)
    def seg(p,q,w,c,ch):
        n=int(max(abs(q[0]-p[0]),abs(q[1]-p[1]))*2)+1
        for i in range(n+1):
            s=i/n; x=p[0]+(q[0]-p[0])*s; y=p[1]+(q[1]-p[1])*s; cv.r(x-w,y-w,x+w+1,y+w+1,OUT)
        for i in range(n+1):
            s=i/n; x=p[0]+(q[0]-p[0])*s; y=p[1]+(q[1]-p[1])*s; cv.r(x-w+1,y-w+1,x+w,y+w,ch)
    cv.ell(46,42,6,4,lambda u,v,d,x,y: C('#2a2d36') if d>.6 else C('#9aa0ad'))
    seg(base,j,3,0,P['y1']); seg(j,tip,2,0,C('#e4e7ec'))
    for k in range(8):
        for jj in range(-k//3,k//3+1): cv.p(tip[0]-k+jj*0,tip[1]+k*.4+jj,(cols[f][0],cols[f][1],cols[f][2],140-k*14))
    cv.outline(); return cv.im
def control_terminal(f):
    cv=Cv(32,48); cv.shadow(16,45,10,2,80)
    ft=box(cv,5,20,27,45,12,C('#5e6475'),C('#444a59'),shadow=False)
    cv.r(6,4,26,20,OUT); cv.r(7,5,25,19,C('#0f2a1c'))
    for i in range(4): cv.r(9,7+i*3,9+((i*5+f*3)%14),8+i*3,C('#4dff9a'))
    for i,c in enumerate((P['r1'],P['y1'],P['g0'])): cv.r(8+i*6,ft+3,11+i*6,ft+6,c if (i+f)%3 else dk(c,.5))
    return cv.im
# ---------- STAGE 7 : complexe industriel ----------
def floor_asphalt(v=0):
    cv=Cv(32,32)
    for y in range(32):
        for x in range(32):
            c=C('#4a4d55') if (x*5+y*9)%7 else C('#40434a')
            if (x*13+y*7)%29==0: c=C('#5a5d65')
            cv.p(x,y,c)
    if v==1: cv.r(0,14,32,18,C('#f4f7ff'))
    if v==2:
        for x in range(0,32,8): cv.r(x,14,x+5,17,P['y1'])
    if v==3:  # snowy edge
        for x in range(32):
            h=4+int(2*math.sin(x*.7))
            cv.r(x,0,x+1,h,P['s1']); cv.p(x,h,P['s2'])
    return cv.im
def floor_snow(v=0):
    cv=Cv(32,32)
    for y in range(32):
        for x in range(32):
            c=P['s1'] if (x*3+y*7+v)%11 else P['s2']
            if (x*11+y*5+v)%37==0: c=P['s0']
            cv.p(x,y,c)
    if v==1:
        for x,y in ((6,8),(20,22),(25,5)): cv.r(x,y,x+3,y+2,P['g2']); cv.p(x+1,y-1,P['g1'])
    return cv.im
def warehouse(f):
    """building 4x3 (128x112 sprite, footprint bottom 96 rows)"""
    cv=Cv(128,112); cv.shadow(66,108,62,4,90)
    ft=box(cv,4,30,124,108,44,C('#8a5a3c'),C('#b8bec8'))
    # roof ridges (top surface = roof)
    for x in range(6,122,8): cv.r(x,31,x+2,ft-1,C('#7a4e32'))
    cv.r(4,30,124,34,P['s1']); 
    for x in range(4,124,3): cv.p(x,34+(x%2),P['s2'])
    # snow drifts on roof
    for x in range(10,120,23): cv.ell(x,ft-6,6,2.5,lambda u,v,d,xx,yy: P['s0'] if v<0 else P['s1'])
    # facade panels
    for x in range(6,122,6): cv.r(x,ft+1,x+1,106,C('#9aa2ae'))
    # big doors with roller shutters
    for i,dx in enumerate((14,52,90)):
        cv.r(dx,ft+10,dx+26,106,C('#3c404b'))
        op=[0,4,8,4][(f+i)%4] if i==1 else 0
        for y in range(ft+10,106-op,3): cv.r(dx+1,y,dx+25,y+2,C('#6d7384'))
        cv.r(dx,ft+8,dx+26,ft+10,P['y1'])
    # sign
    cv.r(44,ft-14,84,ft-2,P['r1']); cv.r(45,ft-13,83,ft-3,P['r2'])
    cv.paste(item('gift'),50,ft-16); cv.paste(item('star'),64,ft-16)
    # lights
    for x in (8,118): cv.r(x,ft+2,x+4,ft+6,C('#fff6c2'))
    cv.outline(); return cv.im
def loading_dock(f):
    """3x2 (96x64): raised concrete platform + dock levelers + pallets"""
    cv=Cv(96,64)
    ft=box(cv,2,6,94,62,14,C('#9aa0a8'),C('#6d7380'))
    hazard(cv,3,ft-3,93,ft,3)
    for x in (10,40,70): cv.r(x,ft+2,x+16,61,C('#2a2d36')); cv.r(x+2,ft+4,x+14,ft+6,C('#5e6475'))
    # pallets with gift boxes
    for px,stack in ((8,('gift','gift')),(36,('ball_red',)),(62,('wreath','tree'))):
        cv.r(px,ft-14,px+20,ft-9,P['w1']); cv.r(px,ft-10,px+20,ft-9,P['w3'])
        for k,n in enumerate(stack): cv.paste(item(n),px+2+k*9,ft-24-(k%2)*2)
    # dock light blinking
    cv.r(88,8,92,12,P['g0'] if f%2 else C('#1f5c30'))
    cv.outline(); return cv.im
def truck(f,d='right'):
    """delivery truck, side view, 96x64, footprint 3x1 lane. f animates wheels."""
    cv=Cv(96,64); cv.shadow(48,60,44,3,100)
    # trailer box
    ft=box(cv,4,8,66,52,30,C('#e4e7ec'),C('#d8382f'),shadow=False)
    for x in range(6,64,6): cv.r(x,ft+1,x+1,50,C('#b5302a'))
    cv.paste(item('gift'),14,ft+6); cv.paste(item('star'),30,ft+6); cv.paste(item('ball_gold'),46,ft+6)
    cv.r(4,8,66,11,P['s1'])
    # cab
    box(cv,66,22,90,52,22,C('#3d8be0'),C('#23549c'),shadow=False)
    cv.r(76,32,88,40,C('#bfe6ff')); cv.r(76,32,88,33,C('#ffffff'))
    cv.r(89,44,92,47,C('#fff6c2'))
    cv.r(4,50,92,54,C('#2a2d36'))
    # wheels
    a=f*math.pi/4
    for wx in (16,30,78):
        cv.ell(wx,54,6,6,lambda u,v,dd,x,y: C('#1c1d23') if dd>.45 else C('#8a909c'))
        for k in range(2):
            t=a+k*math.pi/2; cv.p(wx+math.cos(t)*2.5,54+math.sin(t)*2.5,C('#2a2d36')); cv.p(wx-math.cos(t)*2.5,54-math.sin(t)*2.5,C('#2a2d36'))
    cv.outline()
    im=cv.im
    return im.transpose(Image.FLIP_LEFT_RIGHT) if d=='left' else im
def forklift(f,d='right'):
    cv=Cv(32,32); cv.shadow(16,29,13,2.5,90)
    bob=[0,-1,0,-1][f]
    box(cv,6,12+bob,22,27+bob,8,P['y1'],P['y2'],shadow=False)
    cv.r(8,6+bob,10,13+bob,C('#2a2d36')); cv.r(18,6+bob,20,13+bob,C('#2a2d36')); cv.r(8,5+bob,20,7+bob,C('#2a2d36'))
    cv.r(22,6,25,27,C('#5e6475')); cv.r(25,24,31,27,C('#8a909c'))
    cv.paste(item('gift'),23,10)
    for wx in (10,19): cv.ell(wx,27,3,3,lambda u,v,dd,x,y: C('#1c1d23') if dd>.3 else C('#8a909c'))
    cv.outline(); im=cv.im
    return im.transpose(Image.FLIP_LEFT_RIGHT) if d=='left' else im
# ---------- STAGE 8 : multinationale ----------
def water(f):
    cv=Cv(32,32)
    for y in range(32):
        for x in range(32):
            w=math.sin((x+f*2)*.4+y*.3)+math.sin((y-f)*.5-x*.2)
            c=C('#2a6cb0') if w>.9 else C('#1f5a96') if w>-.6 else C('#184a80')
            cv.p(x,y,c)
    for x in range(32):
        if (x+f*3)%11==0: cv.p(x,(x*7)%32,C('#7cc0f0'))
    return cv.im
def quay(v=0):
    cv=Cv(32,32)
    cv.paste(floor_concrete(0),0,0)
    cv.r(0,24,32,32,C('#5a606c')); cv.r(0,24,32,25,C('#7a808a'))
    for x in range(2,32,10): cv.r(x,22,x+4,26,C('#2a2d36'))
    if v==1: cv.r(12,10,20,18,C('#3c404b')); cv.r(13,8,19,10,C('#3c404b'))   # bollard
    return cv.im
CONT=[('#d8382f','#9a1f22'),('#2f9a4c','#1f6a3a'),('#3d8be0','#23549c'),('#f6c445','#c88a1e')]
def container(i):
    cv=Cv(64,40)
    t,fc=C(CONT[i][0]),C(CONT[i][1])
    ft=box(cv,2,4,62,38,18,lt(t,.1),t)
    for x in range(4,62,3): cv.r(x,ft+2,x+1,36,fc)
    cv.r(48,ft+3,58,36,dk(t,.15)); cv.r(52,ft+3,54,36,dk(t,.4))
    cv.paste(item('star'),20,ft+3)
    cv.outline(); return cv.im
def cargo_ship(f):
    """container ship 6x3 (192x112), bobs on water"""
    cv=Cv(192,112); b=[0,-1,-1,0][f]
    # hull
    for y in range(60,104):
        t=(y-60)/44; inset=int(t*t*14)
        xe=172+ (104-y)*.35
        col=C('#2a2d36') if y<70 else C('#c0281c') if y>92 else C('#3c404b')
        cv.r(6+inset,y+b,xe,y+1+b,col)
    cv.r(6,58+b,180,62+b,C('#e4e7ec'))
    cv.r(20,66+b,60,70+b,C('#f4f7ff'))   # name plate
    # containers stacked on deck
    for row in range(2):
        for k in range(5):
            ci=(k+row)%4
            cv.paste(container(ci).crop((0,0,64,40)).resize((30,20),Image.NEAREST),40+k*26,36-row*16+b)
    # bridge tower aft
    box(cv,10,18+b,36,58+b,24,C('#f4f7ff'),C('#d4d8e0'),shadow=False)
    for x in range(13,34,4): cv.r(x,38+b,x+2,42+b,C('#2a6cb0'))
    cyl_v(cv,26,32,6+b,18+b,P['r1'])
    puff(cv,29,6+b,f,2,col=(210,212,220),rise=6,drift=-4)
    # waterline foam
    for x in range(4,186,3): cv.p(x+(f%2),104+b,C('#e4ecf8'))
    cv.outline(); return cv.im
def port_crane(f):
    """gantry crane 3x4 (96x144)"""
    cv=Cv(96,144); cv.shadow(48,140,44,3,90)
    for x in (12,76):
        cv.r(x,30,x+8,140,P['y1']); cv.r(x,30,x+2,140,P['y0']); cv.r(x+6,30,x+8,140,P['y2'])
        for y in range(36,136,12):
            for k in range(8): cv.p(x+k,y+k,P['y2'])
    cv.r(4,22,92,32,P['y1']); cv.r(4,22,92,24,P['y0'])
    cv.r(36,8,60,22,P['y2']); cv.r(40,12,56,18,C('#bfe6ff'))
    # trolley + cable + container moving
    tx=20+[0,16,32,16][f]
    cv.r(tx,30,tx+16,36,C('#3c404b'))
    cl=40+[30,10,30,50][f]
    cv.r(tx+7,36,tx+9,cl,C('#2a2d36'))
    c=container((f)%4).resize((32,20),Image.NEAREST); cv.paste(c,tx-8,cl)
    for x in (12,76): cv.r(x-2,136,x+10,141,C('#2a2d36'))
    cv.outline(); return cv.im
def cargo_plane(f):
    """cargo plane parked, 5x3 (160x96), propellers spinning"""
    cv=Cv(160,96); cv.shadow(80,90,70,5,90)
    # wings (back)
    for y in range(30,46):
        w=(y-30)*2
        cv.r(60-w*.2,y,104+w*.6,y+1,C('#c9ced8') if y<40 else C('#a8aeb6'))
    # fuselage
    cyl_h(cv,10,140,56,14,C('#e4e7ec'))
    for y in range(42,70):
        cv.r(140,y,140+(14-abs(y-56))*1.0,y+1,C('#d4d8e0'))
    cv.r(10,50,140,54,P['r1'])
    for x in range(30,130,10): cv.r(x,46,x+4,50,C('#2a6cb0'))
    cv.r(142,48,150,54,C('#2a6cb0'))
    # tail
    for y in range(18,46): cv.r(10,y,10+(y-18)*.7,y+1,C('#d4d8e0'))
    cv.r(10,20,16,40,P['r1'])
    cv.paste(item('star'),10,24)
    # engines + propellers
    for ex in (74,104):
        cyl_h(cv,ex,ex+14,64,5,C('#8a909c'))
        a=f*math.pi/4
        for k in range(2):
            t=a+k*math.pi/2
            for r in range(9): cv.p(ex+14+math.cos(t)*0+1,64+math.sin(t)*r,C('#2a2d36')); cv.p(ex+15,64-math.sin(t)*r,C('#2a2d36'))
    # landing gear
    for gx in (40,110): cv.r(gx,70,gx+2,82,C('#3c404b')); cv.ell(gx+1,84,4,4,lambda u,v,d,x,y: C('#1c1d23'))
    cv.outline(); return cv.im
def hq_tower(f):
    """headquarters tower 3x4 (96x192), windows lighting up"""
    cv=Cv(96,192); cv.shadow(48,188,44,4,90)
    ft=box(cv,8,12,88,188,140,C('#5e6475'),C('#2a3550'))
    rnd=random.Random(7)
    for fy in range(ft+6,180,10):
        for wx in range(12,84,8):
            lit=rnd.random()<.5 if f%2==0 else rnd.random()<.6
            cv.r(wx,fy,wx+5,fy+6,C('#ffe08a') if lit else C('#3a5a8a'))
    # roof: helipad + globe sign
    cv.ell(48,ft/2+6,18,8,lambda u,v,d,x,y: C('#3c404b') if d>.7 else C('#4a4d55'))
    cv.r(44,ft/2+2,46,ft/2+10,C('#f4f7ff')); cv.r(50,ft/2+2,52,ft/2+10,C('#f4f7ff')); cv.r(46,ft/2+5,50,ft/2+7,C('#f4f7ff'))
    cv.ell(48,ft+20,14,14,lambda u,v,d,x,y: C('#2f9a4c') if (math.sin(u*6+f)+math.cos(v*5))>.6 else C('#3d8be0'))
    cv.r(30,ft+36,66,ft+46,P['r1'])
    for k in range(5): cv.paste(item('star').resize((8,8),Image.NEAREST),32+k*7,ft+37)
    # entrance
    cv.r(36,168,60,188,C('#bfe6ff')); cv.r(47,168,49,188,C('#2a3550'))
    cv.r(32,164,64,168,P['r1'])
    cv.outline(); return cv.im
def globe_icon(f):
    cv=Cv(32,32)
    cv.ell(16,16,13,13,lambda u,v,d,x,y: (P['g1'] if (math.sin(u*5+f*.8)+math.cos(v*4+u*2))>.5 else P['b1']) if d<.92 else P['b2'])
    for a in range(0,360,20):
        t=math.radians(a); cv.p(16+math.cos(t)*14,16+math.sin(t)*5,P['y1'])
    cv.outline(); return cv.im
