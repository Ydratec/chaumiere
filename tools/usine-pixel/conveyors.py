import math
from PIL import Image
T=32; P=8; FR=4; FACE=5
C=lambda h,a=255:tuple(int(h[i:i+2],16) for i in (1,3,5))+(a,)
belt=C('#3b3d47'); belt_e=C('#2c2e36'); rid_h=C('#62667a'); rid_d=C('#202128')
rail_o=C('#f2bd3e'); rail_i=C('#a86f18')
face=[C('#d49a2a'),C('#94631a'),C('#4f5462'),C('#4a4f5c'),C('#30333c')]
rivet=C('#8d93a2'); shadow=(0,0,0,70)
HC=14; VC=16  # horizontal centre y, vertical centre x

def straight(d):
    def f(x,y):
        if d in 'EW': a=y-HC; s=x if d=='E' else T-x
        else: a=x-VC; s=y if d=='S' else T-y
        return s,a
    return f
def corner(cin,cout):
    # centre is the tile corner touching both edges
    edges={'W':(0,HC),'E':(T,HC),'N':(VC,0),'S':(VC,T)}
    cx=0 if 'W' in (cin,cout) else T; cy=0 if 'N' in (cin,cout) else T
    rx=abs(VC-cx); ry=abs(HC-cy); R=(rx+ry)/2
    def ang(px,py): return math.atan2((py-cy)/ry,(px-cx)/rx)
    a0=ang(*edges[cin]); a1=ang(*edges[cout])
    d=a1-a0
    while d>math.pi: d-=2*math.pi
    while d<-math.pi: d+=2*math.pi
    def f(x,y):
        u=(x-cx)/rx; v=(y-cy)/ry; rho=math.hypot(u,v)
        t=ang(x,y)-a0
        while t>math.pi: t-=2*math.pi
        while t<-math.pi: t+=2*math.pi
        t/=d
        if t<-0.05 or t>1.05: return None
        rl=math.hypot(rx*u,ry*v)/max(rho,1e-6)
        return t*T,(rho-1)*rl
    return f

def tile(fn,frame):
    im=Image.new('RGBA',(T,T),(0,0,0,0)); px=im.load()
    foot=[[False]*T for _ in range(T)]
    off=frame*P/FR
    for y in range(T):
        for x in range(T):
            r=fn(x+.5,y+.5)
            if r is None: continue
            s,a=r; aa=abs(a)
            if aa>=10: continue
            foot[y][x]=True
            if aa>=9: px[x,y]=rail_o
            elif aa>=8: px[x,y]=rail_i
            else:
                ph=(s-off+0.6*aa)%P
                if ph<1: px[x,y]=rid_h
                elif ph<2: px[x,y]=rid_d
                else: px[x,y]=belt_e if aa>=6.5 else belt
    # 3/4 extrusion: front face below the footprint
    for x in range(T):
        for y in range(T-1):
            if foot[y][x] and not foot[y+1][x]:
                for k in range(FACE+1):
                    yy=y+1+k
                    if yy>=T or foot[yy][x]: break
                    if k<FACE:
                        c=face[k]
                        if k==2 and x%8==3: c=rivet
                        px[x,yy]=c
                    else: px[x,yy]=shadow
    return im

tiles=[('E',straight('E')),('W',straight('W')),('S',straight('S')),('N',straight('N'))]
for a,b in [('W','S'),('S','W'),('E','S'),('S','E'),('W','N'),('N','W'),('E','N'),('N','E')]:
    # name = enter-from edge -> exit edge
    tiles.append((f'{a}>{b}',corner(a,b)))
sheet=Image.new('RGBA',(T*FR,T*len(tiles)))
frames={}
for r,(n,fn) in enumerate(tiles):
    for f in range(FR):
        t=tile(fn,f); sheet.paste(t,(f*T,r*T)); frames[(n,f)]=t
sheet.save('conveyor_32x32_3-4_sheet.png')
import pickle; pickle.dump({k:v.tobytes() for k,v in frames.items()},open('fr.pkl','wb'))
print([n for n,_ in tiles])
