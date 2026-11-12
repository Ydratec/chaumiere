from kit2 import *
from items import item
import stage678 as S8
def truck(f,d='right'):
    if d in ('right','left'): return S8.truck(f,d)
    # N/S : footprint 2 wide x 3 long ; drawn with the 3/4 box rule (sprite 64 x (96+40))
    Z=40; cv=Cv(64,96+Z); oy=Z
    cv.shadow(32,oy+93,26,4,100)
    red,redd,white=C('#d8382f'),C('#b5302a'),C('#e4e7ec')
    cab_t,cab_f=C('#3d8be0'),C('#23549c')
    wob=[0,1,0,1][f]
    if d=='down':   # cab at the south end, seen from the front
        box(cv,10,oy+2-Z+wob,54,oy+64,Z,white,red,shadow=False)
        for y in range(oy+64-Z+2,oy+62,6): pass
        cv.paste(item('gift'),16,oy+64-Z+8); cv.paste(item('star'),32,oy+64-Z+8)
        box(cv,8,oy+64-28+wob,56,oy+92,28,cab_t,cab_f,shadow=False)
        cv.r(13,oy+92-24,51,oy+92-14,C('#bfe6ff')); cv.r(13,oy+92-24,51,oy+92-23,C('#ffffff'))
        for hx in (11,49): cv.r(hx,oy+92-9,hx+5,oy+92-5,C('#fff6c2'))
        cv.r(22,oy+92-9,42,oy+92-5,C('#2a2d36'))
    else:           # going up : trailer back doors face the viewer, cab hidden behind
        box(cv,8,oy+2-28,56,oy+30,28,cab_t,cab_f,shadow=False)
        box(cv,10,oy+28-Z+wob,54,oy+92,Z,white,red,shadow=False)
        cv.r(31,oy+92-Z+2,33,oy+90,redd)
        for hx in (12,48): cv.r(hx,oy+92-8,hx+4,oy+92-5,C('#ff3b3b'))
        cv.r(28,oy+92-Z+12,30,oy+92-Z+20,P['m1']); cv.r(34,oy+92-Z+12,36,oy+92-Z+20,P['m1'])
    for wx in (8,52):
        for wy in ((oy+30,oy+80) if True else ()):
            cv.r(wx-3 if wx<32 else wx-1,wy-6,wx+1 if wx<32 else wx+3,wy+2,C('#1c1d23'))
    cv.outline(); return cv.im
def forklift(f,d='right'):
    if d in ('right','left'): return S8.forklift(f,d)
    Z=14; cv=Cv(32,32+Z+14); oy=Z+14
    cv.shadow(16,oy+30,12,2.5,90); bob=[0,-1,0,-1][f]
    if d=='down':
        box(cv,7,oy+2-Z+bob,25,oy+22,Z,P['y1'],P['y2'],shadow=False)
        cv.r(9,oy+2-Z-12+bob,11,oy+4-Z+bob,C('#2a2d36')); cv.r(21,oy+2-Z-12+bob,23,oy+4-Z+bob,C('#2a2d36')); cv.r(9,oy-Z-12+bob,23,oy-Z-10+bob,C('#2a2d36'))
        cv.r(8,oy+22-Z,24,oy+30,C('#5e6475')); cv.r(10,oy+28,14,oy+32,C('#8a909c')); cv.r(18,oy+28,22,oy+32,C('#8a909c'))
        cv.paste(item('gift'),8,oy+10-Z)
    else:
        box(cv,7,oy+8-Z+bob,25,oy+30,Z,P['y1'],P['y2'],shadow=False)
        cv.r(9,oy+8-Z-12+bob,11,oy+10-Z+bob,C('#2a2d36')); cv.r(21,oy+8-Z-12+bob,23,oy+10-Z+bob,C('#2a2d36')); cv.r(9,oy+6-Z-12+bob,23,oy+8-Z-10+bob,C('#2a2d36'))
        cv.r(8,oy-14,24,oy+8-Z,C('#5e6475')); cv.paste(item('gift'),8,oy-22)
        cv.r(10,oy+30-6,22,oy+30-3,C('#2a2d36'))
    cv.outline(); return cv.im
