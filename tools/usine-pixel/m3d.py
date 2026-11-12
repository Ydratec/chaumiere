"""Tiny 3/4 renderer for factory objects.
Local frame of an object: u = along the item flow (input at u=0, output at u=L), w = across (w=0 service
side, w=D operator side), z = height. Four orientations = the flow direction on screen:
  e : flow west->east   -> we see the operator side (face 'w+')
  s : flow north->south -> we see the output end   (face 'u+')
  w : flow east->west   -> we see the service side  (face 'w-')
  n : flow south->north -> we see the input end     (face 'u-')
Screen: X right, Y down; a point (u,w,z) lands at X, Ygr - z where (X, Ygr) is its ground position.
Footprint: L x D tiles for e/w, D x L for s/n. After drawing, the frame is cropped; 'origin' = where the
footprint's top-left corner sits in the frame (the engine places the sprite with it)."""
from kit2 import *
ORI=('e','s','w','n')
VIS={'e':'w+','s':'u+','w':'w-','n':'u-'}
PAD=96
class Obj:
    def __init__(s,L,D,o):
        s.L,s.D,s.o=L*32,D*32,o
        s.FW,s.FH=((L,D) if o in('e','w') else (D,L))
        s.cv=Cv(s.FW*32+2*PAD,s.FH*32+2*PAD); s.parts=[]; s.shadow=True
    # ---- projection ----
    def g(s,u,w):
        L,D,o=s.L,s.D,s.o
        if o=='e': return u,w
        if o=='s': return D-w,u
        if o=='w': return L-u,D-w
        return w,L-u
    def P(s,u,w,z=0):
        X,Y=s.g(u,w); return PAD+X,PAD+Y-z
    def axis(s,a):
        """screen axis of a local axis: ('X'|'Y', sign)"""
        o=s.o
        m={'e':{'u':('X',1),'w':('Y',1)},'s':{'u':('Y',1),'w':('X',-1)},'w':{'u':('X',-1),'w':('Y',-1)},'n':{'u':('Y',-1),'w':('X',1)}}
        return m[o][a]
    def lane_w(s):
        D=s.D
        return {'e':D-13,'w':D-19,'s':D-16,'n':D-16}[s.o]
    # ---- parts ----
    def add(s,key,fn,b=None):
        if b is None:   # bounds from a legacy key (z0, depth): a point, overlapping everything in x
            z0,depth=key; b=(-1e9,1e9,depth,depth,z0,z0+1)
        s.parts.append((b,len(s.parts),fn))
    def gb(s,us,ws,z0,z1):
        pts=[s.g(u,w) for u in us for w in ws]
        return (min(p[0] for p in pts),max(p[0] for p in pts),min(p[1] for p in pts),max(p[1] for p in pts),z0,z1)
    def depth(s,us,ws): return max(s.g(u,w)[1] for u in us for w in ws)
    def box(s,u0,u1,w0,w1,z0,z1,top,side,faces=None,topfn=None,out=True,key=None):
        faces=faces or {}
        def fn(f):
            xs=[s.g(u,w)[0] for u in (u0,u1) for w in (w0,w1)]; ys=[s.g(u,w)[1] for u in (u0,u1) for w in (w0,w1)]
            X0,X1,Y0,Y1=PAD+min(xs),PAD+max(xs),PAD+min(ys),PAD+max(ys)
            cv=s.cv
            if z1>z0: cv.r(X0,Y1-z1,X1,Y1-z0,side)   # visible (south) face
            cv.r(X0,Y0-z1,X1,Y1-z1,top)               # top
            # bevels
            cv.r(X0,Y0-z1,X1,Y0-z1+1,lt(top,.25)); cv.r(X0,Y1-z1-1,X1,Y1-z1,lt(top,.35))
            if z1>z0:
                cv.r(X0,Y1-z1,X1,Y1-z1+1,dk(side,.35)); cv.r(X1-1,Y1-z1,X1,Y1-z0,dk(side,.3)); cv.r(X0,Y1-z1+1,X0+1,Y1-z0,lt(side,.12))
                if z1-z0>6: cv.r(X0,Y1-z0-2,X1,Y1-z0,dk(side,.3))
            if topfn: topfn(f)
            fc=faces.get(VIS[s.o])
            if fc and z1>z0: fc(cv,(X0,Y1-z1,X1,Y1-z0),f)
            if out:
                for x in range(int(X0)-1,int(X1)+1): cv.p(x,Y0-z1-1,OUT); cv.p(x,Y1-z0,OUT)
                for y in range(int(Y0-z1),int(Y1-z0)): cv.p(X0-1,y,OUT); cv.p(X1,y,OUT)
        s.add(None,fn,b=s.gb((u0,u1),(w0,w1),z0,z1))
    def cylz(s,u,w,r,z0,z1,c,key=None,cap_dark=False):
        def fn(f):
            X,Y=s.P(u,w,0)
            cyl_v(s.cv,X-r,X+r,Y-z1,Y-z0,c)
            if cap_dark: s.cv.ell(X,Y-z1,r-1.5,max(1,r/3-.5),lambda a,b,d,x,y: C('#1c1412'))
            for y in range(int(Y-z1),int(Y-z0)): s.cv.p(X-r-1,y,OUT); s.cv.p(X+r,y,OUT)
        s.add(None,fn,b=s.gb((u-r,u+r),(w-r,w+r),z0,z1))
    def cyl_lie(s,axis,a0,a1,c,zc,r,col,key=None,caps=True):
        """lying cylinder along local axis ('u' or 'w') from a0 to a1, axis at cross coord c, height zc"""
        def fn(f):
            cv=s.cv
            if axis=='u': pts=[s.P(a0,c,zc),s.P(a1,c,zc)]
            else: pts=[s.P(c,a0,zc),s.P(c,a1,zc)]
            (xa,ya),(xb,yb)=pts
            if abs(ya-yb)<1:   # along screen X
                x0,x1=sorted((xa,xb))
                if caps: cyl_h(cv,x0,x1-2,ya,r,col)
                else:
                    for y in range(int(ya-r),int(ya+r)):
                        t=(y-(ya-r))/(2*r); cc=lt(col,.3) if t<.2 else col if t<.6 else dk(col,.25) if t<.85 else dk(col,.4)
                        cv.r(x0,y,x1,y+1,cc)
                for x in range(int(x0),int(x1)): cv.p(x,ya-r-1,OUT); cv.p(x,ya+r,OUT)
            else:              # along screen Y (we see its top and its near end)
                y0,y1=sorted((ya,yb)); xc=xa
                for dx in range(-int(r),int(r)+1):
                    h=math.sqrt(max(0,r*r-dx*dx)); t=(dx+r)/(2*r)
                    cc=lt(col,.3) if t<.25 else col if t<.6 else dk(col,.25) if t<.85 else dk(col,.4)
                    cv.r(xc+dx,y0-h,xc+dx+1,y1-h,cc)
                if caps: cv.ell(xc,y1,r,r,lambda a,b,d,x,y: lt(col,.08) if d<.55 else dk(col,.18))
                for y in range(int(y0-r),int(y1-(0 if caps else r))): cv.p(xc-r-1,y,OUT); cv.p(xc+r+1,y,OUT)
        us=(a0,a1) if axis=='u' else (c-r,c+r); ws=(c-r,c+r) if axis=='u' else (a0,a1)
        s.add(None,fn,b=s.gb(us,ws,zc-r,zc+r))
    def sphere(s,u,w,z,r,c,key=None):
        def fn(f):
            X,Y=s.P(u,w,z); s.cv.ell(X,Y,r,r,lambda a,b,d,x,y: sphere(c,a,b,d))
        s.add(None,fn,b=s.gb((u-r,u+r),(w-r,w+r),z-r,z+r))
    def disc(s,normal,u,w,z,r,col,spokes=0,ang=0,key=None,rim=None):
        """flat wheel; normal in 'u','w','z'. Face-on when its normal points at the viewer (screen Y)."""
        def fn(f):
            cv=s.cv; X,Y=s.P(u,w,z)
            if normal=='z': face=True; ry=r*.55
            else:
                sa=s.axis(normal)[0]; face=(sa=='Y'); ry=r
            if face:
                cv.ell(X,Y,r,ry,lambda a,b,d,x,y: (rim or dk(col,.3)) if d>.7 else col)
                a=ang if not callable(ang) else ang(f)
                for k in range(spokes):
                    t=a+k*2*math.pi/max(1,spokes)
                    for q in range(1,int(r*.75)): cv.p(X+math.cos(t)*q,Y+math.sin(t)*q*ry/r,dk(col,.4))
                cv.ell(X,Y,max(1,r*.2),max(1,ry*.2),lambda a,b,d,x,y: C('#2a2d36'))
                cv.ell(X,Y,r+1,ry+1,lambda a,b,d,x,y: OUT if d>.8 else None)
            else:
                cv.r(X-1,Y-r,X+2,Y+r,dk(col,.1)); cv.r(X-1,Y-r,X,Y+r,lt(col,.2))
                for y in range(int(Y-r)-1,int(Y+r)+1): cv.p(X-2,y,OUT); cv.p(X+2,y,OUT)
        if normal=='z': b=s.gb((u-r,u+r),(w-r,w+r),z,z+1)
        elif normal=='u': b=s.gb((u,u),(w-r,w+r),z-r,z+r)
        else: b=s.gb((u-r,u+r),(w,w),z-r,z+r)
        s.add(None,fn,b=b)
    def custom(s,key,fn,bounds=None):
        """bounds = (us, ws, z0, z1) in local coords, optional"""
        s.add(key,fn,b=s.gb(*bounds) if bounds else None)
    # ---- hoods (ports) ----
    def hoods(s,fam,which=('in','out')):
        lw=s.lane_w(); top,side,rim=fam['htop'],fam['hface'],fam['rim']
        def mouth(cv,r,f):
            x0,y0,x1,y1=r; cv.r(x0+2,y0+3,x1-2,y1,C('#0d0d10'))
            for x in range(int(x0)+2,int(x1)-2,2): cv.r(x,y0+3,x+1,y1-1,C('#2a2b31'))
            cv.r(x0,y0,x1,y0+1,rim)
        def sidef(cv,r,f):
            x0,y0,x1,y1=r; cv.r(x0,y0,x1,y0+1,rim)
        if 'in' in which:
            s.box(0,6,lw-11,lw+11,0,12,top,side,faces={'u-':mouth,'w+':sidef,'w-':sidef})
        if 'out' in which:
            s.box(s.L-6,s.L,lw-11,lw+11,0,12,top,side,faces={'u+':mouth,'w+':sidef,'w-':sidef})
    # ---- render ----
    def render(s,f):
        s.cv=Cv(s.FW*32+2*PAD,s.FH*32+2*PAD)
        if s.shadow: s.cv.shadow(PAD+s.FW*16+2,PAD+s.FH*32-2,s.FW*15,3,70)
        def ov(a0,a1,b0,b1): return a0<b1-0.01 and b0<a1-0.01
        INF=1e8
        def rel(p,q):
            """-1: p before q, 1: q before p"""
            (ax0,ax1,ay0,ay1,az0,az1),ai,_=p; (bx0,bx1,by0,by1,bz0,bz1),bi,_=q
            xo=ov(ax0,ax1,bx0,bx1) or abs(ax1-ax0)>INF or abs(bx1-bx0)>INF or ax0==ax1 or bx0==bx1
            yo=ov(ay0,ay1,by0,by1) or (ay0==ay1 and by0<=ay0<=by1) or (by0==by1 and ay0<=by0<=ay1)
            if xo and yo:
                if az1<=bz0+0.5 and not bz1<=az0+0.5: return -1
                if bz1<=az0+0.5 and not az1<=bz0+0.5: return 1
            if ay1<=by0 and not by1<=ay0: return -1
            if by1<=ay0 and not ay1<=by0: return 1
            return -1 if (ay1,az0,ai)<(by1,bz0,bi) else 1
        def sbox(p):
            (x0,x1,y0,y1,z0,z1),i,_=p
            if abs(x1-x0)>INF: x0,x1=-INF,INF
            return (x0,x1,y0-z1-2,y1-z0+2)
        parts=s.parts; n=len(parts); boxes=[sbox(p) for p in parts]
        succ=[set() for _ in range(n)]; indeg=[0]*n
        for i in range(n):
            for j in range(i+1,n):
                A,B=boxes[i],boxes[j]
                if ov(A[0],A[1],B[0],B[1]) and ov(A[2],A[3],B[2],B[3]):
                    pa,pb=parts[i][0],parts[j][0]
                    loose=abs(A[1]-A[0])>INF or abs(B[1]-B[0])>INF
                    if loose:   # a part without x bounds only gets an edge when it really sits on / against the other
                        yo=ov(pa[2],pa[3],pb[2],pb[3]) or (pa[2]==pa[3] and pb[2]<=pa[2]<=pb[3]) or (pb[2]==pb[3] and pa[2]<=pb[2]<=pa[3])
                        if not yo: continue
                    if rel(parts[i],parts[j])<0: succ[i].add(j)
                    else: succ[j].add(i)
        for i in range(n):
            for j in succ[i]: indeg[j]+=1
        import heapq
        dkey=lambda i:(parts[i][0][3],parts[i][0][4],i)
        heap=[(dkey(i),i) for i in range(n) if indeg[i]==0]; heapq.heapify(heap); order=[]
        while heap:
            _,i=heapq.heappop(heap); order.append(i)
            for j in succ[i]:
                indeg[j]-=1
                if indeg[j]==0: heapq.heappush(heap,(dkey(j),j))
        if len(order)<n:   # a cycle: fall back to the default key for what is left
            order+=sorted([i for i in range(n) if i not in order],key=dkey)
        for i in order: parts[i][2](f)

        s.cv.outline()
        return s.cv.im
def finish(obj,frames):
    """crop all frames to their union bbox; return frames + origin of the footprint top-left"""
    bb=None
    for im in frames:
        b=im.getbbox()
        if b: bb=b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
    x0=min(bb[0],PAD); y0=bb[1]; x1=max(bb[2],PAD+obj.FW*32); y1=max(bb[3],PAD+obj.FH*32)
    return [im.crop((x0,y0,x1,y1)) for im in frames],(PAD-x0,PAD-y0)
def build(make,n=4):
    """make(o) -> Obj with parts. returns {o:(frames,origin,footprint)}"""
    res={}
    for o in ORI:
        ob=make(o); frames=[ob.render(f) for f in range(n)]
        fr,org=finish(ob,frames); res[o]=(fr,org,(ob.FW,ob.FH))
    return res
