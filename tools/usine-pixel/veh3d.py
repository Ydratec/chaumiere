from m3d import *
from items import item
def truck(o):
    """delivery truck, local L=3 (driving along +u), D=2 ; o = driving direction"""
    ob=Obj(3,2,o); D=ob.D
    red,redd,white=C('#d8382f'),C('#b5302a'),C('#e4e7ec')
    cab_t,cab_f=C('#3d8be0'),C('#23549c')
    def sidef(cv,r,f):
        x0,y0,x1,y1=[int(v) for v in r]
        for x in range(x0+3,x1-3,6): cv.r(x,y0+2,x+1,y1-2,redd)
        if x1-x0>40:
            cv.paste(item('gift'),x0+8,y0+6); cv.paste(item('star'),x0+26,y0+6); cv.paste(item('ball_gold'),x0+44,y0+6)
    def back(cv,r,f):
        x0,y0,x1,y1=[int(v) for v in r]; cx=(x0+x1)//2; cv.r(cx-1,y0+2,cx+1,y1-2,redd)
        cv.r(cx-5,y0+12,cx-3,y0+20,P['m1']); cv.r(cx+3,y0+12,cx+5,y0+20,P['m1'])
        cv.r(x0+2,y1-6,x0+6,y1-3,C('#ff3b3b')); cv.r(x1-6,y1-6,x1-2,y1-3,C('#ff3b3b'))
    def cabfront(cv,r,f):
        x0,y0,x1,y1=[int(v) for v in r]; cv.r(x0+4,y0+3,x1-4,y0+11,C('#bfe6ff')); cv.r(x0+4,y0+3,x1-4,y0+4,C('#ffffff'))
        cv.r(x0+2,y1-8,x0+7,y1-4,C('#fff6c2')); cv.r(x1-7,y1-8,x1-2,y1-4,C('#fff6c2')); cv.r(x0+12,y1-8,x1-12,y1-4,C('#2a2d36'))
    def cabside(cv,r,f):
        x0,y0,x1,y1=[int(v) for v in r]; cv.r(x0+4,y0+3,x1-6,y0+10,C('#bfe6ff'))
    def cabback(cv,r,f): pass
    wob=[0,1,0,1][f] if False else 0
    ob.box(4,64,6,D-6,8,44,white,red,faces={'w+':sidef,'w-':sidef,'u-':back,'u+':lambda cv,r,f: None})
    ob.box(64,92,6,D-6,8,34,cab_t,cab_f,faces={'u+':cabfront,'w+':cabside,'w-':cabside,'u-':cabback})
    for uu in (16,34,80):
        for ww in (5,D-5):
            ob.disc('w',uu,ww,7,7,C('#1c1d23'),spokes=2,ang=lambda f:f*math.pi/4,rim=C('#1c1d23'))
    return ob
def forklift(o):
    ob=Obj(1,1,o); Y,YD=P['y1'],P['y2']
    ob.box(3,8,7,25,3,17,YD,dk(YD,.2))                       # counterweight at the back
    ob.box(8,21,7,25,3,13,Y,YD,faces={'w+':lambda cv,r,f: cv.r(r[0]+3,r[1]+3,r[0]+9,r[1]+6,C('#2a2d36'))})
    ob.box(9,15,11,21,13,17,C('#2a2d36'),C('#2a2d36'))       # seat
    for (u,w) in ((8,8),(8,23),(19,8),(19,23)): ob.box(u,u+1,w,w+1,13,30,C('#2a2d36'),C('#2a2d36'),out=False)
    for (u0,u1,w0,w1) in ((7,21,7,9),(7,21,23,25),(7,9,7,25),(19,21,7,25),(13,15,7,25)):   # open roof guard (bars)
        ob.box(u0,u1,w0,w1,30,32,C('#3c404b'),C('#2a2d36'))
    ob.box(21,23,9,23,2,30,C('#6d7384'),C('#4e5361'))        # mast
    ob.box(23,31,10,13,2,4,C('#a8b0bc'),C('#6d7384')); ob.box(23,31,19,22,2,4,C('#a8b0bc'),C('#6d7384'))
    for (u,w) in ((7,6),(7,26),(18,6),(18,26)): ob.disc('w',u,w,4,4,C('#1c1d23'),rim=C('#1c1d23'))
    def load(f): X,Yy=ob.P(27,16,4); ob.cv.paste(item('gift'),X-8,Yy-14)
    ob.custom((4,ob.g(27,16)[1]),load,bounds=((23,31),(9,23),4,16))
    return ob
