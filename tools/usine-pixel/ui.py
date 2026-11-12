from lib import *
def button(state):
    # 48x16, 9-slice borders = 4px
    cv=Cv(48,16)
    face={'normal':P['r1'],'hover':P['r0'],'pressed':P['r2'],'disabled':P['m1']}[state]
    dy=1 if state=='pressed' else 0
    cv.r(1,2,47,16,dk(face,.45))
    cv.r(1,1+dy,47,14+dy,face)
    cv.r(2,1+dy,46,2+dy,lt(face,.35)); cv.r(1,2+dy,2,13+dy,lt(face,.2))
    cv.r(2,12+dy,46,14+dy,dk(face,.18))
    if state!='disabled':   # snow on top
        for x in range(2,46):
            h=1+((x*7)%5==0)+((x*3)%7==0)
            cv.r(x,0+dy,x+1,h+dy,P['s0'])
    cv.outline(); return cv.im
def panel():
    cv=Cv(48,48)
    cv.r(1,1,47,47,P['w3']); cv.r(3,3,45,45,P['w1'])
    for y in range(4,44,6): cv.r(3,y,45,y+1,P['w2'])
    cv.r(3,3,45,4,P['w0'])
    for (x,y) in ((4,4),(42,4),(4,42),(42,42)): cv.r(x,y,x+2,y+2,P['y1']); cv.p(x,y,P['y0'])
    for x in range(1,47):
        h=2+((x*5)%7==0)*2+((x*3)%4==0)
        cv.r(x,0,x+1,h,P['s0']); cv.p(x,h,P['s2'])
    cv.outline(); return cv.im
def bar(fill):
    cv=Cv(64,10)
    cv.r(1,1,63,9,P['w4']); cv.r(2,2,62,8,P['w3'])
    w=int(60*fill)
    if w:
        cv.r(2,2,2+w,8,P['g1']); cv.r(2,2,2+w,4,P['g0']); cv.r(2,7,2+w,8,P['g2'])
        for x in range(2,2+w,6): cv.r(x,2,x+2,8,(255,255,255,60))
    cv.outline(); return cv.im
def cursor(kind):
    cv=Cv(16,16)
    if kind=='hand':
        cv.r(5,1,8,9,P['k0']); cv.r(8,5,14,12,P['k0']); cv.r(3,7,5,11,P['k0']); cv.r(5,9,14,14,P['k0'])
        for x in (8,10,12): cv.r(x,5,x+1,8,P['k1'])
        cv.r(5,13,14,14,P['k1']); cv.r(5,9,14,10,P['k1']) if False else None
    if kind=='work':   # progress ring above a station
        for a in range(0,360,15):
            t=math.radians(a); cv.p(8+math.cos(t)*6,8+math.sin(t)*6,P['s1'])
        for a in range(-90,180,15):
            t=math.radians(a); cv.p(8+math.cos(t)*6,8+math.sin(t)*6,P['g0']); cv.p(8+math.cos(t)*5,8+math.sin(t)*5,P['g1'])
        cv.r(7,4,9,9,P['m1']); cv.r(5,4,11,6,P['m1'])
    if kind=='exclaim':
        cv.ell(8,8,6.5,6.5,lambda u,v,d,x,y: P['y1'] if u+v<.4 else P['y2'])
        cv.r(7,4,9,10,OUT); cv.r(7,11,9,13,OUT)
    cv.outline(); return cv.im
