from mach import *
def fp(base,o): return base if o=='h' else (base[1],base[0])
def cx(r): return int((r[0]+r[2])//2)
def cy(r): return int((r[1]+r[3])//2)
def planks(cv,r,c,step=4,vertical=False):
    x0,y0,x1,y1=r
    for y in range(y0+1,y1-1):
        for x in range(x0+1,x1-1):
            k=(x-x0) if vertical else (y-y0)
            if k%step==0: cv.p(x,y,dk(c,.22))
            elif (x*7+y*3)%17==0: cv.p(x,y,lt(c,.1))
def vents(cv,r,n=4,col=C('#1a1b20'),lit=None):
    x0,y0,x1,y1=r
    for i in range(n):
        y=y0+i*3
        if y+2>y1: break
        cv.r(x0,y,x1,y+2,col)
        if lit: cv.r(x0+1,y+1,x1-1,y+2,lit)
def screen(cv,r,f,col=C('#4dff9a')):
    x0,y0,x1,y1=[int(v) for v in r]; cv.r(x0-1,y0-1,x1+1,y1+1,OUT); cv.r(x0,y0,x1,y1,C("#0f2a1c"))
    for i in range(x0+1,x1-1,3):
        h=1+int((math.sin(i*.9+f*1.6)+1)*(y1-y0-2)/2.5)
        cv.r(i,y1-1-h,i+2,y1-1,col)
def lights(cv,x,y,f,n=2):
    cols=[P['g0'],P['y1'],P['r1']]
    for i in range(n):
        on=(f+i)%2==0
        cv.r(x+i*5,y,x+i*5+4,y+4,OUT); cv.r(x+i*5+1,y+1,x+i*5+3,y+3,cols[i] if on else dk(cols[i],.55))
def face_inner(m,pad=3):
    x0,y0,x1,y1=m.face; return (x0+pad,y0+pad,x1-pad,y1-pad)
def top_inner(m,pad=3):
    x0,y0,x1,y1=m.top; return (x0+pad,y0+pad,x1-pad,y1-pad)
def fire(cv,r,f,seed=0):
    rnd=random.Random(f*13+seed); x0,y0,x1,y1=r
    for y in range(int(y0),int(y1)):
        for x in range(int(x0),int(x1)):
            h=(y1-y)/(y1-y0)+rnd.uniform(0,.35)-math.sin(x*.9+f*2)*.1
            cv.p(x,y,[P['f0'],P['f1'],P['f2'],P['f3'],P['f4']][min(4,max(0,int(h*3.5)))])
def chimney(cv,x,ytop,ybot,c,f,w=8,smoke=True):
    cyl_v(cv,x,x+w,ytop,ybot,c)
    cv.r(x+2,ytop-1,x+w-2,ytop+1,C('#1c1412'))
    if smoke: puff(cv,x+w/2,ytop-1,f,2,rise=min(10,ytop),drift=3)
def table_legs(m,col=P['w3']):
    # visible legs under the front face corners
    pass
# ======================= ARTISANAL =======================
def a_kiln(f,o='h',ports=False,bellows=False):
    W,H=fp((2,1),o); m=M('art',W,H,34,o,ports); cv=m.cv
    stone=C('#8a909c')
    m.body(top=C('#9aa0a8'),face=stone)
    x0,y0,x1,y1=m.face
    for y in range(y0+1,y1-2):
        for x in range(x0+1,x1-1):
            row=(y-y0)//5; off=0 if row%2 else 4
            if (y-y0)%5==4 or (x+off)%8==0: cv.p(x,y,C('#5f6470'))
    # clay dome sitting on the stone base (top surface)
    tx0,ty0,tx1,ty1=m.top; dcx=cx(m.top); rx=(tx1-tx0)/2-2; ry=min(26,(ty1-ty0)/2+14)
    base_y=ty1-2
    cv.ell(dcx,base_y,rx,ry,lambda u,v,d,x,y: (sphere(P['c1'],u,v,d,False) if y<=base_y else None))
    for y in range(int(base_y-ry),int(base_y)):
        for x in range(int(dcx-rx),int(dcx+rx)):
            c=cv.g(x,y)
            if c[3] and c[:3]==P['c1'][:3] and (x*3+y*5)%13==0: cv.p(x,y,P['c2'])
    # mouth with fire facing the viewer
    mw=min(9,rx*.45)
    cv.ell(dcx,base_y,mw+2,mw+3,lambda u,v,d,x,y: C('#3a1a10') if y<=base_y else None)
    cv.ell(dcx,base_y,mw,mw+1,lambda u,v,d,x,y: None)
    fire(cv,(dcx-mw+1,base_y-mw,dcx+mw-1,base_y+1),f)
    for y in range(int(base_y-mw),int(base_y)+1):
        for x in range(int(dcx-mw-3),int(dcx+mw+3)):
            u=(x+.5-dcx)/(mw+.5); v=(y+.5-base_y)/(mw+1.5)
            if u*u+v*v>1 and u*u+v*v<1.6 and cv.g(x,y)[3]: cv.p(x,y,C('#3a1a10'))
    chimney(cv,int(dcx+rx*.35),max(6,int(base_y-ry-8)),int(base_y-ry*.55),P['c2'],f,6)
    if bellows:
        sq=[0,2,4,2][f]; bx=x0+2; by=y0+4
        cv.r(bx,by+sq//2,bx+12,by+9,P['w2']); cv.r(bx,by+sq//2,bx+12,by+1+sq//2,P['w0'])
        for xx in range(bx+1,bx+12,3): cv.r(xx,by+1+sq//2,xx+1,by+9,P['w3'])
    return m.done()
def a_table(m,ytop_h=14):
    """draws a wooden work table as the machine body (legs visible on the face)"""
    cv=m.cv; x0,y0,x1,y1=m.top; fx0,fy0,fx1,fy1=m.face
    for lx in (fx0+1,fx1-5): cv.r(lx,fy0,lx+4,fy1,P['w2']); cv.r(lx,fy0,lx+1,fy1,P['w1']); cv.r(lx+3,fy0,lx+4,fy1,P['w3'])
    cv.r(fx0,fy0,fx1,fy0+5,P['w2']); cv.r(fx0,fy0+4,fx1,fy0+5,P['w3'])
    cv.r(x0,y0,x1,y1,P['w1']); planks(cv,(x0,y0,x1,y1),P['w1'],4,vertical=(m.o=='v'))
    cv.r(x0,y0,x1,y0+1,P['w0']); cv.r(x0,y1-1,x1,y1,P['w0'])
    for x in range(x0-1,x1+1): cv.p(x,y0-1,OUT)
    for y in range(y0,fy0+5): cv.p(x0-1,y,OUT); cv.p(x1,y,OUT)
def back_board(m,h=28,col=P['w2']):
    """pegboard / rack standing on the back edge of the top"""
    cv=m.cv; x0,y0,x1,y1=m.top
    bx0,bx1=x0+3,x1-3; by1=y0+3; by0=max(0,by1-h)
    cv.r(bx0,by0,bx1,by1,col); cv.r(bx0,by0,bx1,by0+1,lt(col,.2))
    return (bx0,by0,bx1,by1)
def a_paint_table(f,o='h',ports=False):
    W,H=fp((2,1),o); m=M('art',W,H,14,o,ports); cv=m.cv
    if ports: m.body()
    b=back_board(m,26,P['w3'])
    n=max(2,int((b[2]-b[0])//10)); sw=[0,1,0,-1][f]
    for i in range(n):
        x=b[0]+6+i*((b[2]-b[0]-12)/max(1,n-1)); c=[P['r1'],P['g1'],P['y1'],P['b1']][i%4]
        cv.r(x,b[1]+2,x+1,b[1]+8,P['s2'])
        cv.ell(x+.5+(sw if i%2 else -sw),b[1]+11,3.5,3.5,lambda u,v,d,xx,yy,c=c: sphere(c,u,v,d))
    a_table(m)
    x0,y0,x1,y1=m.top
    k=0
    for c in (P['r1'],P['g1'],P['y1'],P['b1']):
        px=x0+3+k*7
        if px+6>x1-12: break
        cv.r(px,y0+2,px+6,y0+8,P['m1']); cv.r(px,y0+2,px+1,y0+8,P['m0']); cv.ell(px+3,y0+2.5,3,1.4,lambda u,v,d,xx,yy,c=c: c); k+=1
    cv.ell(x1-7,cy(m.top)-1,4,4,lambda u,v,d,x,y: sphere(P['s1'] if f<2 else P['r1'],u,v,d))
    return m.done()
def a_wreath_table(f,o='h',ports=False):
    from props import wreath
    W,H=fp((2,1),o); m=M('art',W,H,14,o,ports); cv=m.cv
    if ports: m.body()
    b=back_board(m,28,P['w2'])
    for y in range(b[1]+3,b[3]-1,5):
        for x in range(b[0]+3,b[2]-2,5): cv.p(x,y,P['w3'])
    n=max(1,int((b[2]-b[0])//22))
    for i in range(n): wreath(cv,b[0]+11+i*22,b[1]+13,7)
    a_table(m)
    x0,y0,x1,y1=m.top
    wreath(cv,cx(m.top),cy(m.top),5.5,bow=f>=2)
    for k in range(6): cv.p(x0+3+k,y0+3+k%2,P['g1']); cv.p(x0+4+k,y0+4,P['g2'])
    cv.r(x1-9,y0+2,x1-3,y0+7,P['r1'])
    return m.done()
def a_lathe(f,o='h',ports=False):
    W,H=fp((2,1),o); m=M('art',W,H,16,o,ports); cv=m.cv
    if ports: m.body()
    a_table(m)
    x0,y0,x1,y1=m.top; fx0,fy0,fx1,fy1=m.face
    # flywheel under the table + treadle
    a=f*math.pi/8; wx=fx0+10; wy=fy1-6
    cv.ell(wx,wy,5,5,lambda u,v,d,x,y: P['m2'] if d>.6 else None)
    for k in range(4):
        t=a+k*math.pi/4
        for r in range(1,5): cv.p(wx+math.cos(t)*r,wy+math.sin(t)*r,P['m1'])
    # spinning wood between head and tail stock, along the long axis
    if o=='h':
        cv.r(x0+3,y0-6,x0+9,y1-2,P['m2']); cv.r(x1-9,y0-4,x1-3,y1-2,P['m2'])
        for x in range(x0+9,x1-9): cv.r(x,cy(m.top)-4,x+1,cy(m.top)+1,P['w0'] if (x+f*2)%6<3 else P['w1'])
    else:
        cv.r(x0+3,y0-4,x1-3,y0+3,P['m2']); cv.r(x0+3,y1-9,x1-3,y1-3,P['m2'])
        for y in range(y0+3,y1-9): cv.r(cx(m.top)-3,y,cx(m.top)+3,y+1,P['w0'] if (y+f*2)%6<3 else P['w1'])
    cv.paste(item('wood_star'),x1-16,y1-14)
    return m.done()
def a_tree_bench(f,o='h',ports=False):
    W,H=fp((2,1),o); m=M('art',W,H,14,o,ports); cv=m.cv
    if ports: m.body()
    a_table(m)
    x0,y0,x1,y1=m.top
    # small fir being decorated + ornament box
    tx=cx(m.top)-4; ty=y1-2
    for y in range(int(ty-20),int(ty)):
        w=(y-(ty-20))*.35
        for x in range(int(tx-w),int(tx+w)+1): cv.p(x,y,P['g1'] if x<tx else P['g2'])
    cv.r(tx-1,ty-1,tx+2,ty+1,P['w3'])
    for k,(dx,dy) in enumerate(((-3,-6),(2,-10),(-1,-14))):
        if k<=f: cv.p(tx+dx,ty+dy,[P['r1'],P['y1'],P['b1']][k])
    cv.p(tx,ty-21,P['y1'])
    cv.r(x1-12,y0+2,x1-3,y0+8,P['w3']); cv.r(x1-11,y0+3,x1-4,y0+7,P['r2'])
    for k in range(3): cv.p(x1-10+k*2,y0+4,[P['r1'],P['y1'],P['b1']][k])
    return m.done()
def a_star_press(f,o='h',ports=True):
    W,H=fp((2,1),o); m=M('art',W,H,20,o,ports); cv=m.cv
    m.body()
    planks(cv,m.top,P['w1']); planks(cv,m.face,P['w2'],5)
    x0,y0,x1,y1=m.top
    # iron frame + screw press, crank on top
    px0,px1=cx(m.top)-12,cx(m.top)+12
    cv.r(px0,y0-18,px0+4,y1-2,P['m2']); cv.r(px1-4,y0-18,px1,y1-2,P['m2']); cv.r(px0-2,y0-20,px1+2,y0-15,P['m1'])
    k=[0,2,4,2][f]
    cv.r(cx(m.top)-2,y0-15,cx(m.top)+2,y0-6+k,P['m0'])
    cv.r(px0+4,y0-6+k,px1-4,y0-2+k,P['m1'])
    a=f*math.pi/2; hx=cx(m.top)+math.cos(a)*9
    cv.r(px0,y0-22,px1,y0-20,P['r1']); cv.r(hx-1,y0-26,hx+2,y0-21,P['w0'])
    if f>=2: cv.paste(item('wood_star'),cx(m.top)-8,y1-14)
    return m.done()
def a_loom(f,o='h',ports=True):
    W,H=fp((2,1),o); m=M('art',W,H,16,o,ports); cv=m.cv
    m.body(); planks(cv,m.top,P['w1']); planks(cv,m.face,P['w2'],5)
    x0,y0,x1,y1=m.top
    s0,s1=x0+8,x1-8
    for sx in (s0,s1): cv.r(sx-2,y0-16,sx+2,y0+4,P['w2'])
    a=f*math.pi/4
    for sx in (s0,s1):
        cv.ell(sx,y0-14,5,5,lambda u,v,d,x,y: P['g1'] if d<.75 else P['g2'])
        for k in range(3): t=a+k*2.1; cv.p(sx+math.cos(t)*3,y0-14+math.sin(t)*3,P['g0'])
    for x in range(int(s0+4),int(s1-4)):
        y=y0-14+math.sin((x-s0-4)/max(1,(s1-s0-8))*math.pi)*9
        cv.p(x,y,P['g2']); cv.p(x,y-1,P['g1'])
        if (x+f*2)%5==0: cv.r(x,y+1,x+2,y+3,[P['r1'],P['y1'],P['b1']][(x//5)%3])
    for i,c in enumerate((P['r1'],P['y1'],P['b1'])):
        bx=x0+4+i*9
        if bx+7>x1-3: break
        cv.r(bx,y1-8,bx+7,y1-3,P['w3']); cv.r(bx+1,y1-7,bx+6,y1-4,c)
    return m.done()
# ======================= VAPEUR =======================
def rivets(cv,r,step=6):
    x0,y0,x1,y1=r
    for x in range(int(x0)+2,int(x1)-2,step): cv.p(x,y0+1,P['c0']); cv.p(x,y1-2,P['c0'])
def v_base(m):
    m.body(); cv=m.cv
    cv.r(m.top[0],m.top[1]+2,m.top[2],m.top[1]+3,P['c1']); cv.r(m.face[0],m.face[1]+3,m.face[2],m.face[1]+4,P['c1'])
    rivets(cv,m.face)
def v_furnace(f,o='h',ports=True):
    W,H=fp((2,1),o); m=M('vap',W,H,24,o,ports); cv=m.cv; v_base(m)
    fx0,fy0,fx1,fy1=m.face; mx=cx(m.face)
    cv.r(mx-8,fy0+6,mx+8,fy1-3,C('#22262a')); fire(cv,(mx-6,fy0+8,mx+6,fy1-4),f)
    cv.r(mx-9,fy0+5,mx+9,fy0+7,P['c1'])
    gauge(cv,fx1-8,fy0+9,f,2.6)
    x0,y0,x1,y1=m.top
    cv.r(x0+4,y0+4,x0+16,y1-3,C('#2a2d32'))
    for x in range(x0+5,x0+16,3): cv.r(x,y0+5,x+1,y1-4,P['f2'] if (x+f)%2 else P['f3'])
    chimney(cv,x1-14,max(3,y0-16),y0+8,C('#3e4a45'),f)
    return m.done()
def v_sprayer(f,o='h',ports=True):
    W,H=fp((2,1),o); m=M('vap',W,H,22,o,ports); cv=m.cv; v_base(m)
    x0,y0,x1,y1=m.top; cols=[P['r1'],P['g1'],P['y1'],P['b1']]
    # paint tank (copper cylinder) + spray hood
    cyl_v(cv,x0+4,x0+14,y0-10,y1-2,P['c1'])
    cv.r(x0+16,y0+2,x1-4,y1-2,C('#22262a'))
    c=cols[f]
    for k in range(10):
        for j in range(-k//3,k//3+1): cv.p(cx((x0+16,0,x1-4,0))+j,y0+3+k,(c[0],c[1],c[2],140-k*12))
    cv.ell(cx((x0+16,0,x1-4,0)),y1-6,4,4,lambda u,v,d,xx,yy: sphere(c,u,v,d))
    fx0,fy0,fx1,fy1=m.face; gauge(cv,fx0+8,fy0+10,f,2.6)
    for i,cc in enumerate(cols): cv.r(fx0+16+i*5,fy0+7,fx0+19+i*5,fy0+11,cc if i==f else dk(cc,.5))
    puff(cv,x0+9,y0-11,f,1,rise=8)
    return m.done()
def v_press(f,o='h',ports=True):
    W,H=fp((2,1),o); m=M('vap',W,H,18,o,ports); cv=m.cv; v_base(m)
    x0,y0,x1,y1=m.top; mx=cx(m.top)
    for x in (mx-14,mx+10): cv.r(x,y0-22,x+4,y1-2,C('#3e4a45')); cv.r(x,y0-22,x+1,y1-2,C('#6a7872'))
    cv.r(mx-16,y0-24,mx+16,y0-19,C('#3e4a45')); cv.r(mx-16,y0-24,mx+16,y0-23,C('#6a7872'))
    k=[0,5,9,4][f]
    cyl_v(cv,mx-4,mx+4,y0-19,y0-12+k,C('#c9ced8'),cap=False)
    cv.r(mx-10,y0-12+k,mx+10,y0-8+k,P['c1']); cv.r(mx-10,y0-12+k,mx+10,y0-11+k,P['c0'])
    cv.paste(item('star') if f>=2 else item('wood_star'),mx-8,y1-15)
    gauge(cv,m.face[2]-8,m.face[1]+9,f,2.6)
    if f==2: puff(cv,mx+16,y0-18,1,2,rise=6,drift=4)
    return m.done()
def v_loom(f,o='h',ports=True):
    W,H=fp((2,1),o); m=M('vap',W,H,18,o,ports); cv=m.cv; v_base(m)
    x0,y0,x1,y1=m.top; a=f*math.pi/4
    s0,s1=x0+9,x1-9
    for sx in (s0,s1):
        cv.r(sx-2,y0-14,sx+2,y0+4,C('#3e4a45'))
        gear2d(cv,sx,y0-12,4,6,8,a if sx==s0 else -a,P['c1'])
    for x in range(int(s0+6),int(s1-6)):
        y=y0-12+math.sin((x-s0-6)/max(1,(s1-s0-12))*math.pi)*7
        cv.p(x,y,P['g2']); cv.p(x,y-1,P['g1'])
        if (x+f*2)%5==0: cv.r(x,y+1,x+2,y+3,[P['r1'],P['y1'],P['b1']][(x//5)%3])
    gauge(cv,m.face[0]+8,m.face[1]+9,f,2.6); puff(cv,x1-6,y0-2,f,1,rise=8)
    return m.done()
def v_wreath_press(f,o='h',ports=True):
    from props import wreath
    W,H=fp((2,1),o); m=M('vap',W,H,18,o,ports); cv=m.cv; v_base(m)
    x0,y0,x1,y1=m.top; mx,my=cx(m.top),cy(m.top)
    cv.ell(mx,my,10,6,lambda u,v,d,x,y: C('#22262a') if d>.35 else None)
    wreath(cv,mx,my,6.5,bow=f>=2)
    k=[0,3,5,2][f]
    cv.r(mx-12,y0-14+k,mx+12,y0-10+k,P['c1']); cv.r(mx-1,y0-22,mx+1,y0-14+k,C('#c9ced8'))
    cv.r(mx-14,y0-24,mx+14,y0-21,C('#3e4a45'))
    for x in (mx-14,mx+11): cv.r(x,y0-24,x+3,my,C('#3e4a45'))
    gauge(cv,m.face[2]-8,m.face[1]+9,f,2.6)
    return m.done()
def v_boiler(f,o='h',ports=False):
    W,H=fp((2,2),o); m=M('vap',W,H,26,o,False); cv=m.cv
    m.body(top=C('#6b6660'),face=C('#9a4a36'))
    fx0,fy0,fx1,fy1=m.face
    for y in range(fy0+1,fy1-2):
        for x in range(fx0+1,fx1-1):
            if y%4==0 or (x+(y//4)*4)%9==0: cv.p(x,y,C('#5e3a2e'))
    cv.r(fx0+6,fy0+6,fx0+18,fy1-3,C('#22262a')); fire(cv,(fx0+7,fy0+8,fx0+17,fy1-4),f)
    gauge(cv,fx1-10,fy0+10,f)
    x0,y0,x1,y1=m.top
    if o=='h': cyl_h(cv,x0+3,x1-6,cy(m.top),min(13,(y1-y0)/2),P['c1'])
    else: cyl_v(cv,x0+5,x1-5,y0-6,y1-4,P['c1'])
    chimney(cv,x1-16,max(4,y0-20),y0+6,C('#3e4a45'),f,9)
    cv.r(x0+8,y0-4,x0+11,y0+2,P['m1']); puff(cv,x0+9,y0-5,(f+2)%4,1,rise=8,drift=-3)
    return m.done()
# ======================= ELECTRIQUE =======================
def e_base(m,frame=True):
    m.body(); cv=m.cv
    x0,y0,x1,y1=m.top
    if frame:
        for y in range(y0,y1):
            for x in range(x0,x1):
                if x<x0+3 or x>=x1-3 or y<y0+3 or y>=y1-3:
                    cv.p(x,y,P['y1'] if ((x+y)//3)%2==0 else C('#24252c'))
    fx0,fy0,fx1,fy1=m.face
    hazard(cv,fx0+1,fy1-5,fx1-1,fy1-2,3)
    bolt(cv,fx0+2,fy0+2); bolt(cv,fx1-4,fy0+2)
def e_furnace(f,o='h',ports=True):
    W,H=fp((2,1),o); m=M('elec',W,H,24,o,ports); cv=m.cv; e_base(m)
    x0,y0,x1,y1=m.top; mx,my=cx(m.top),cy(m.top)
    # induction crucible seen through a round port on top, glowing
    glow=[.7,.9,.8,1][f]
    cv.ell(mx,my,9,6,lambda u,v,d,x,y: C('#2a2d36') if d>.6 else mix(P['f3'],P['f0'],glow*(1-d)))
    for a in range(0,360,30):
        t=math.radians(a); cv.p(mx+math.cos(t)*10.5,my+math.sin(t)*7,P['c1'])
    fx0,fy0,fx1,fy1=m.face
    vents(cv,(fx0+6,fy0+5,fx0+22,fy1-6),4,lit=mix(C('#7a2a10'),C('#ff9a3a'),glow))
    screen(cv,(fx1-22,fy0+5,fx1-6,fy0+13),f,C('#ffb02a'))
    return m.done()
def e_paint_booth(f,o='h',ports=True):
    W,H=fp((2,2),o); m=M('elec',W,H,28,o,ports); cv=m.cv; e_base(m,frame=False)
    x0,y0,x1,y1=m.top; cols=[P['r1'],P['g1'],P['y1'],P['b1']]; c=cols[f]
    gx0,gy0,gx1,gy1=x0+4,y0+4,x1-4,y1-4
    for y in range(gy0,gy1):
        for x in range(gx0,gx1): cv.p(x,y,mix(C('#33405a'),C('#4a5a78'),(y-gy0)/max(1,gy1-gy0)))
    for x in range(gx0,gx1): cv.p(x,gy0,(255,255,255,90))
    n=max(2,int((gx1-gx0)//14))
    for i in range(n):
        nx=gx0+8+i*((gx1-gx0-16)/max(1,n-1))
        cv.r(nx-1,gy0,nx+2,gy0+3,C('#8a909c'))
        for k in range(10):
            for j in range(-k//3,k//3+1): cv.p(nx+j,gy0+3+k,(c[0],c[1],c[2],120-k*10))
    cv.ell(cx(m.top),gy1-7,5,5,lambda u,v,d,xx,yy: sphere(c,u,v,d))
    fx0,fy0,fx1,fy1=m.face
    for i,col in enumerate(cols): cv.r(fx0+6+i*6,fy0+6,fx0+10+i*6,fy0+10,OUT); cv.r(fx0+7+i*6,fy0+7,fx0+9+i*6,fy0+9,col if i==f else dk(col,.5))
    if fx1-fx0>44: screen(cv,(fx1-22,fy0+5,fx1-6,fy0+15),f)
    return m.done()
def e_assembler(f,o='h',ports=True):
    W,H=fp((2,2),o); m=M('elec',W,H,26,o,ports); cv=m.cv; e_base(m)
    x0,y0,x1,y1=m.top
    bx0,by0,bx1,by1=x0+6,y0+6,x1-6,y1-6
    cv.r(bx0,by0,bx1,by1,C('#2c303a')); cv.r(bx0,by0,bx1,by0+2,C('#1a1c22')); cv.r(bx0,by1,bx1,by1+1,C('#b7bdca'))
    a=f*(2*math.pi/10)/4
    r=min(10,(bx1-bx0)/4,(by1-by0)/2.6)
    gear2d(cv,bx0+r+3,cy((0,by0,0,by1)),r*.8,r,10,a,C('#c3c8d2'))
    gear2d(cv,bx0+2*r+6,by0+r*.7+2,r*.4,r*.55,6,-a*1.7,P['y1'])
    if bx1-bx0>40: cv.paste(item('star'),bx1-18,by1-16)
    fx0,fy0,fx1,fy1=m.face
    screen(cv,(cx(m.face)-9,fy0+5,cx(m.face)+9,fy0+15),f); lights(cv,fx1-14,fy0+6,f)
    vents(cv,(fx0+6,fy0+5,fx0+16,fy1-7),4,lit=C('#ff9a3a'))
    return m.done()
def e_loom(f,o='h',ports=True):
    W,H=fp((2,1),o); m=M('elec',W,H,22,o,ports); cv=m.cv; e_base(m)
    x0,y0,x1,y1=m.top; a=f*math.pi/4
    s0,s1=x0+10,x1-10
    for sx in (s0,s1):
        cv.ell(sx,cy(m.top),6,5,lambda u,v,d,x,y: C('#2a2d36') if d>.7 else P['g1'])
        for k in range(3): t=a*(1 if sx==s0 else -1)+k*2.1; cv.p(sx+math.cos(t)*3,cy(m.top)+math.sin(t)*2.5,P['g0'])
    for x in range(int(s0+6),int(s1-6)):
        y=cy(m.top)
        cv.p(x,y,P['g2']); cv.p(x,y-1,P['g1'])
        if (x+f*2)%5==0: cv.r(x,y+1,x+2,y+3,[P['r1'],P['y1'],P['b1']][(x//5)%3])
    fx0,fy0,fx1,fy1=m.face; lights(cv,fx0+6,fy0+6,f); screen(cv,(fx1-20,fy0+5,fx1-6,fy0+12),f)
    return m.done()
def e_wreath(f,o='h',ports=True):
    from props import wreath
    W,H=fp((2,1),o); m=M('elec',W,H,22,o,ports); cv=m.cv; e_base(m)
    x0,y0,x1,y1=m.top; mx,my=cx(m.top),cy(m.top)
    cv.ell(mx,my,9,6,lambda u,v,d,x,y: C('#2c303a') if d>.3 else None)
    wreath(cv,mx,my,6,bow=f>=2)
    a=f*math.pi/2
    cv.r(mx+math.cos(a)*8-1,my+math.sin(a)*5-6,mx+math.cos(a)*8+2,my+math.sin(a)*5,C('#c3c8d2'))
    fx0,fy0,fx1,fy1=m.face; lights(cv,fx0+6,fy0+6,f,3)
    return m.done()
def e_tree(f,o='h',ports=True):
    W,H=fp((2,2),o); m=M('elec',W,H,26,o,ports); cv=m.cv; e_base(m)
    x0,y0,x1,y1=m.top; tx=cx(m.top); ty=y1-6
    cv.ell(tx,ty,9,4,lambda u,v,d,x,y: C('#2c303a') if d>.6 else C('#8a909c'))
    for y in range(int(ty-24),int(ty)):
        w=(y-(ty-24))*.38
        for x in range(int(tx-w),int(tx+w)+1): cv.p(x,y,P['g1'] if x<tx else P['g2'])
    for k,(dx,dy) in enumerate(((-4,-5),(3,-9),(-2,-14),(1,-18))):
        if k<=f: cv.r(tx+dx,ty+dy,tx+dx+2,ty+dy+2,[P['r1'],P['y1'],P['b1'],P['r1']][k])
    cv.p(tx,ty-25,P['y1'])
    # two small arms placing ornaments
    for sx,dirx in ((x0+8,1),(x1-8,-1)):
        k=[0,2,4,2][f]
        cv.r(sx-2,y0+4,sx+2,y0+8,C('#3c404b')); cv.r(sx,y0+6-k,sx+dirx*8,y0+8-k,P['y1'])
    fx0,fy0,fx1,fy1=m.face; screen(cv,(cx(m.face)-9,fy0+5,cx(m.face)+9,fy0+14),f); lights(cv,fx1-14,fy0+6,f)
    return m.done()
def e_generator(f,o='h',ports=False):
    W,H=fp((2,2),o); m=M('elec',W,H,26,o,False); cv=m.cv; e_base(m,frame=False)
    x0,y0,x1,y1=m.top; a=f*math.pi/8
    if o=='h':
        cyl_h(cv,x0+3,x1-16,cy(m.top),min(11,(y1-y0)/2-2),C('#3c8b5a'))
        wx,wy=x1-10,cy(m.top)
    else:
        cyl_v(cv,x0+6,x1-6,y0,y1-16,C('#3c8b5a')); wx,wy=cx(m.top),y1-9
    cv.ell(wx,wy,7,7,lambda u,v,d,x,y: C('#2a2d36') if d>.8 else (C('#8a909c') if d>.2 else C('#c9ced8')))
    for k in range(3):
        t=a+k*2.094
        for r in range(2,6): cv.p(wx+math.cos(t)*r,wy+math.sin(t)*r,C('#2a2d36'))
    for i in range(3):
        ix=x0+6+i*10
        cv.r(ix,y0-8,ix+4,y0+2,C('#e9e3d4')); cv.r(ix,y0-5,ix+4,y0-4,C('#b4aa94'))
    if f%2==0:
        pts=[(x0+8,y0-8),(x0+11,y0-12),(x0+15,y0-8),(x0+18,y0-12),(x0+22,y0-8)]
        for (a0,b0),(a1,b1) in zip(pts,pts[1:]):
            for t in range(6): cv.p(a0+(a1-a0)*t/6,b0+(b1-b0)*t/6,C('#bfe6ff'))
    fx0,fy0,fx1,fy1=m.face
    cv.r(fx0+6,fy0+5,fx0+16,fy1-7,P['y1'])
    for k in range(4): cv.p(fx0+12-k,fy0+7+k,OUT); cv.p(fx0+9+k,fy0+11+k//2,OUT)
    screen(cv,(fx1-24,fy0+5,fx1-6,fy0+14),f)
    return m.done()
def e_silo(f,o='h',ports=True):
    """raw material extractor/silo (source) : output only"""
    W,H=fp((1,1),o); m=M('elec',W,H,40,o,False); cv=m.cv; e_base(m,frame=False)
    x0,y0,x1,y1=m.top
    cyl_v(cv,x0+2,x1-2,y0-2,y1+10,C('#c9ced8'))
    cv.r(x0+5,y0+10,x1-5,y0+14,P['y1'])
    fx0,fy0,fx1,fy1=m.face; lights(cv,fx0+4,fy1-12,f,2)
    return m.done()
def e_chest(f,o='h',ports=False):
    W,H=1,1; m=M('elec',W,H,14,o,False); cv=m.cv; e_base(m,frame=False)
    x0,y0,x1,y1=m.top
    cv.r(x0,y1-2,x1,y1,C('#4e5361'))
    for x in (x0+4,x1-6): cv.r(x,y0,x+2,y1,C('#5e6475'))
    cv.r(cx(m.face)-2,m.face[1]+3,cx(m.face)+2,m.face[1]+8,P['y1'])
    return m.done()
# ======================= ROBOT (étape 6) =======================
def r_paint(f,o='h',ports=True):
    W,H=fp((2,2),o); m=M('robot',W,H,16,o,ports); cv=m.cv; m.body()
    x0,y0,x1,y1=m.top; cols=[P['r1'],P['g1'],P['y1'],P['b1']]; c=cols[f]
    hazard(cv,x0+2,y1-4,x1-2,y1-2,3)
    tx,ty=x0+(x1-x0)*.32,cy(m.top)+4
    cv.ell(tx,ty,9,5,lambda u,v,d,x,y: C('#2a2d36') if d>.7 else C('#8a909c'))
    cv.ell(tx,ty-5,5.5,5.5,lambda u,v,d,x,y: sphere(c,u,v,d))
    bx,by=x0+(x1-x0)*.72,cy(m.top)+2
    sw=[-.3,0,.3,0][f]
    j=(bx+math.cos(-math.pi/2-0.7+sw)*14, by+math.sin(-math.pi/2-0.7+sw)*14)
    tip=(j[0]-9,j[1]+5)
    def seg(p,q,w,ch):
        n=int(max(abs(q[0]-p[0]),abs(q[1]-p[1]))*2)+1
        for i in range(n+1):
            s=i/n; x=p[0]+(q[0]-p[0])*s; y=p[1]+(q[1]-p[1])*s; cv.r(x-w,y-w,x+w+1,y+w+1,OUT)
        for i in range(n+1):
            s=i/n; x=p[0]+(q[0]-p[0])*s; y=p[1]+(q[1]-p[1])*s; cv.r(x-w+1,y-w+1,x+w,y+w,ch)
    cv.ell(bx,by+2,6,4,lambda u,v,d,x,y: C('#2a2d36') if d>.6 else C('#cfd6e0'))
    seg((bx,by),j,3,P['b1']); seg(j,tip,2,C('#e8ecf2'))
    for k in range(7):
        for jj in range(-k//3,k//3+1): cv.p(tip[0]-k*.7+jj*.3,tip[1]+k*.5+jj,(c[0],c[1],c[2],140-k*16))
    fx0,fy0,fx1,fy1=m.face; lights(cv,fx0+6,fy0+5,f,3)
    return m.done()
def r_assembly(f,o='h',ports=True):
    W,H=fp((2,2),o); m=M('robot',W,H,16,o,ports); cv=m.cv; m.body()
    x0,y0,x1,y1=m.top
    hazard(cv,x0+2,y1-4,x1-2,y1-2,3)
    # glass dome with two arms assembling a star + garland
    mx,my=cx(m.top),cy(m.top)
    for sx,dirx in ((x0+10,1),(x1-10,-1)):
        k=[0,.3,.6,.3][f]*dirx
        cv.ell(sx,my,4,3,lambda u,v,d,x,y: C('#2a2d36') if d>.5 else C('#cfd6e0'))
        ex,ey=sx+dirx*10*math.cos(k),my-10
        for t in range(12): cv.r(sx+(ex-sx)*t/12-1,my+(ey-my)*t/12-1,sx+(ex-sx)*t/12+2,my+(ey-my)*t/12+2,P['b1'])
    cv.paste(item(['star','garland','tree','wreath'][f]),mx-8,my-10)
    cv.ell(mx,my-4,16,13,lambda u,v,d,x,y: (200,230,255,40) if d<.92 else (255,255,255,120))
    fx0,fy0,fx1,fy1=m.face; screen(cv,(cx(m.face)-9,fy0+4,cx(m.face)+9,fy1-4),f); lights(cv,fx1-14,fy0+5,f)
    return m.done()
CATALOG={
 # name: (fn, base footprint (W,H) in 'h', family, stage, role)
 'kiln':(lambda f,o:a_kiln(f,o,False),(2,1),'art',1,'sable -> boule transparente'),
 'paint_table':(lambda f,o:a_paint_table(f,o),(2,1),'art',1,'boule transparente + peinture -> boule peinte'),
 'wreath_table':(lambda f,o:a_wreath_table(f,o),(2,1),'art',1,'branche + ruban -> couronne'),
 'kiln_bellows':(lambda f,o:a_kiln(f,o,False,True),(2,1),'art',2,'sable -> boule transparente (x2)'),
 'lathe':(lambda f,o:a_lathe(f,o),(2,1),'art',2,'bois -> étoile en bois'),
 'tree_bench':(lambda f,o:a_tree_bench(f,o),(2,1),'art',2,'sapin + boules -> sapin décoré'),
 'kiln_belt':(lambda f,o:a_kiln(f,o,True,True),(2,1),'art',3,'sable -> boule transparente (tapis)'),
 'star_press':(lambda f,o:a_star_press(f,o),(2,1),'art',3,'bois -> étoile (tapis)'),
 'loom':(lambda f,o:a_loom(f,o),(2,1),'art',3,'branche + boules -> guirlande (tapis)'),
 'paint_table_belt':(lambda f,o:a_paint_table(f,o,True),(2,1),'art',3,'boule -> boule peinte (tapis)'),
 'wreath_table_belt':(lambda f,o:a_wreath_table(f,o,True),(2,1),'art',3,'branche -> couronne (tapis)'),
 'steam_furnace':(v_furnace,(2,1),'vap',4,'sable -> boule transparente'),
 'steam_sprayer':(v_sprayer,(2,1),'vap',4,'boule -> boule peinte'),
 'steam_press':(v_press,(2,1),'vap',4,'bois -> étoile'),
 'steam_loom':(v_loom,(2,1),'vap',4,'branche + boules -> guirlande'),
 'steam_wreath':(v_wreath_press,(2,1),'vap',4,'branche + ruban -> couronne'),
 'boiler':(v_boiler,(2,2),'vap',4,'énergie (vapeur)'),
 'elec_furnace':(e_furnace,(2,1),'elec',5,'sable -> boule transparente'),
 'paint_booth':(e_paint_booth,(2,2),'elec',5,'boule -> boule peinte'),
 'assembler':(e_assembler,(2,2),'elec',5,'bois + peinture -> étoile'),
 'elec_loom':(e_loom,(2,1),'elec',5,'branche + boules -> guirlande'),
 'elec_wreath':(e_wreath,(2,1),'elec',5,'branche + ruban -> couronne'),
 'tree_decorator':(e_tree,(2,2),'elec',5,'sapin + boules + étoile -> sapin décoré'),
 'generator':(e_generator,(2,2),'elec',5,'énergie (électricité)'),
 'silo':(e_silo,(1,1),'elec',5,'source de matière première'),
 'metal_chest':(e_chest,(1,1),'elec',5,'stockage'),
 'paint_robot':(r_paint,(2,2),'robot',6,'boule -> boule peinte (rapide)'),
 'assembly_robot':(r_assembly,(2,2),'robot',6,'assemble étoiles, guirlandes, sapins, couronnes'),
}
def v_tree(f,o='h',ports=True):
    W,H=fp((2,2),o); m=M('vap',W,H,22,o,ports); cv=m.cv; v_base(m)
    x0,y0,x1,y1=m.top; tx=cx(m.top); ty=y1-6
    cv.ell(tx,ty,9,4,lambda u,v,d,x,y: C('#22262a') if d>.6 else P['c1'])
    for y in range(int(ty-24),int(ty)):
        w=(y-(ty-24))*.38
        for x in range(int(tx-w),int(tx+w)+1): cv.p(x,y,P['g1'] if x<tx else P['g2'])
    for k,(dx,dy) in enumerate(((-4,-5),(3,-9),(-2,-14),(1,-18))):
        if k<=f: cv.r(tx+dx,ty+dy,tx+dx+2,ty+dy+2,[P['r1'],P['y1'],P['b1'],P['r1']][k])
    cv.p(tx,ty-25,P['y1'])
    gear2d(cv,x0+9,y0+8,3,5,8,f*.5,P['c1']); gear2d(cv,x1-9,y0+8,3,5,8,-f*.5,P['c1'])
    gauge(cv,m.face[2]-8,m.face[1]+9,f,2.6); puff(cv,x1-6,y0,f,1,rise=8)
    return m.done()
CATALOG['steam_tree']=(v_tree,(2,2),'vap',4,'sapin + boules + étoile -> sapin décoré')
def wood_pile():
    cv=Cv(32,32); cv.shadow(16,28,13,3,80)
    for i,(y,x0,x1) in enumerate(((20,4,28),(15,7,25),(10,10,22))):
        cv.r(x0,y,x1,y+6,P['w1']); cv.r(x0,y,x1,y+1,P['w0'])
        for lx in range(x0,x1,6):
            cv.ell(lx+3,y+3,2.6,2.6,lambda u,v,d,x,yy: P['w0'] if d<.35 else P['c0'] if d<.7 else P['w2'])
    for x in range(10,22): cv.p(x,10,P['s0'])
    cv.outline(); return cv.im
