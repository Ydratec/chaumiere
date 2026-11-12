from kit2 import *
import elf as E, props
# ---------- STAGE 2 : atelier équipé ----------
def kiln_bellows(f):
    """bigger kiln + foot bellows, 64x64 footprint 2x1"""
    cv=Cv(64,64); base=props.kiln(f); cv.paste(base,0,0)
    # bellows on the left (squash animation)
    sq=[0,2,4,2][f]
    bx,by=2,48
    cv.r(bx,by+sq//2,bx+12,by+8,P['w2']); cv.r(bx,by+sq//2,bx+12,by+1+sq//2,P['w1'])
    for x in range(bx+1,bx+12,3): cv.r(x,by+1+sq//2,x+1,by+8,P['w3'])
    cv.r(bx,by+8,bx+12,by+10,P['w3']); cv.r(bx+12,by+4,bx+16,by+6,P['m2'])
    cv.r(bx+3,by-4+sq,bx+9,by-2+sq,P['w1'])  # pedal
    cv.outline(); return cv.im
def lathe(f):
    """foot-powered wood lathe (tour à pédale) making wooden stars, 64x64 fp 2x1"""
    cv=Cv(64,64); cv.shadow(32,61,29,3,90)
    yt2,ya,yl=table(cv,4,60,36,10,5,9)
    # flywheel under the table, spinning
    a=f*math.pi/8
    cv.ell(16,52,7,7,lambda u,v,d,x,y: None if .45<d<.75 else (P['m2'] if d>=.75 else None))
    for k in range(4):
        t=a+k*math.pi/4
        for r in range(1,6): cv.p(16+math.cos(t)*r,52+math.sin(t)*r,P['m1'])
    cv.ell(16,52,7,7,lambda u,v,d,x,y: P['m2'] if d>.72 else None)
    cv.r(30,57,44,59,P['w2']); cv.r(30+[0,1,2,1][f],55,34+[0,1,2,1][f],57,P['w3'])  # treadle
    # headstock + tailstock + spinning wood
    cv.r(8,26,16,40,P['m2']); cv.r(8,26,16,28,P['m1']); cv.r(48,28,56,40,P['m2']); cv.r(48,28,56,30,P['m1'])
    for x in range(16,48):
        c=P['w0'] if (x+f*2)%6<3 else P['w1']
        cv.r(x,31,x+1,36,c)
    cv.r(16,30,48,31,P['w2'])
    # wood shavings + finished star
    for i in range(5): cv.p(22+i*5+f%2,41+(i%2),P['w0'])
    from items import item
    cv.paste(item('wood_star'),40,38)
    cv.outline(); return cv.im
def storage_shelf():
    cv=Cv(32,64); cv.shadow(16,61,14,2.5,90)
    cv.r(3,8,29,61,P['w3']); cv.r(5,10,27,59,P['w4'])
    from items import item
    for i,sy in enumerate((22,38,54)):
        cv.r(3,sy,29,sy+3,P['w1']); cv.r(3,sy,29,sy+1,P['w0'])
        names=[('ball_red','ball_gold'),('wreath','branch'),('wood_star','sand')][i]
        for k,n in enumerate(names):
            ic=item(n); cv.paste(ic,5+k*11,sy-14)
    cv.r(3,8,29,9,P['w1']); cv.outline(); return cv.im
def tool_rack():
    cv=Cv(32,64)
    cv.r(2,14,30,40,P['w2']); cv.r(2,14,30,15,P['w1'])
    for y in range(18,38,5):
        for x in range(5,29,5): cv.p(x,y,P['w3'])
    cv.r(6,17,8,32,P['w1']); cv.r(4,17,10,20,P['m1'])          # hammer
    cv.r(13,17,15,34,P['m1']); cv.r(12,32,16,36,P['r1'])        # screwdriver
    cv.r(20,18,26,24,P['m1']); cv.r(22,24,24,34,P['w1'])        # saw-ish
    for x in range(20,26,2): cv.p(x,24,P['m2'])
    cv.outline(); return cv.im
def assistant_elf():
    S,rows=E.sheet()
    m={P['g1'][:3]:P['b1'][:3],P['g0'][:3]:P['b0'][:3],P['g2'][:3]:P['b2'][:3]}
    return recolor(S,m),rows
# ---------- STAGE 3 : petite fabrique ----------
def wood_belt():
    """reuse conveyor geometry with wood palette (rollers + crank-driven)"""
    import importlib.util,sys
    spec=importlib.util.spec_from_file_location('cg',__import__('os').path.join(__import__('os').path.dirname(__file__),'conveyors.py'))
    src=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'conveyors.py')).read()
    src=src.replace("belt=C('#3b3d47'); belt_e=C('#2c2e36'); rid_h=C('#62667a'); rid_d=C('#202128')",
                    "belt=C('#a8743f'); belt_e=C('#8a5a2e'); rid_h=C('#d9a066'); rid_d=C('#5e3620')")
    src=src.replace("rail_o=C('#f2bd3e'); rail_i=C('#a86f18')","rail_o=C('#c48f55'); rail_i=C('#6b4223')")
    src=src.replace("face=[C('#d49a2a'),C('#94631a'),C('#4f5462'),C('#4a4f5c'),C('#30333c')]",
                    "face=[C('#b77a45'),C('#8c5530'),C('#6b4223'),C('#5e3620'),C('#3d2216')]")
    src=src.replace("rivet=C('#8d93a2')","rivet=C('#c9a46a')")
    src=src.replace("sheet.save('conveyor_32x32_3-4_sheet.png')","sheet.save(OUTF)")
    src=src.replace("import pickle; pickle.dump({k:v.tobytes() for k,v in frames.items()},open('fr.pkl','wb'))","WFR=frames")
    g={'OUTF':'/tmp/wood_belt.png'}
    exec(src.split("print([n")[0],g)
    return Image.open('/tmp/wood_belt.png'),g['WFR']
def star_press(f):
    """hand-crank star press 2x2 (64x64)"""
    cv=Cv(64,64)
    ft=box(cv,8,24,56,60,14,P['w1'],P['w2'])
    for y in range(26,ft-1,4): cv.r(9,y,55,y+1,P['w2'])
    # frame + screw
    cv.r(14,4,18,ft,P['m2']); cv.r(46,4,50,ft,P['m2']); cv.r(12,2,52,7,P['m1']); cv.r(12,2,52,3,P['m0'])
    k=[0,2,4,2][f]
    cv.r(30,7,34,18+k,P['m0']); 
    for y in range(8,18+k,2): cv.p(30,y,P['m2'])
    cv.r(24,18+k,40,22+k,P['m1']); cv.r(24,21+k,40,22+k,P['m2'])
    # crank wheel on top
    a=f*math.pi/2
    cv.r(22,0,42,2,P['r1'])
    hx,hy=32+math.cos(a)*9,1+math.sin(a)*1.5
    cv.r(hx-1,hy-3,hx+2,hy+1,P['w0'])
    # star mould + stars
    from items import item
    cv.paste(item('wood_star'),24,ft-14) if f>=2 else None
    cv.r(22,ft-3,42,ft-1,P['m2'])
    cv.paste(item('star'),44,ft+0); cv.paste(item('star'),10,ft+0)
    cv.outline(); return cv.im
def garland_loom(f):
    """garland winding loom 2x2"""
    cv=Cv(64,64)
    ft=box(cv,6,30,58,60,12,P['w1'],P['w2'])
    # two uprights + spools
    for x in (10,50): cv.r(x,8,x+4,ft,P['w2']); cv.r(x,8,x+1,ft,P['w1'])
    a=f*math.pi/4
    for sx in (16,40):
        cv.ell(sx+4,14,6,6,lambda u,v,d,x,y: P['g1'] if d<.75 else P['g2'])
        for k in range(3):
            t=a+k*2.1; cv.p(sx+4+math.cos(t)*4,14+math.sin(t)*4,P['g0'])
        cv.r(sx+3,13,sx+6,16,P['w3'])
    # garland strand between spools, sagging, with moving beads
    for x in range(20,46):
        y=14+math.sin((x-20)/26*math.pi)*10
        cv.p(x,y,P['g2']); cv.p(x,y-1,P['g1'])
        if (x+f*2)%5==0:
            c=[P['r1'],P['y1'],P['b1']][(x//5)%3]; cv.r(x,y+1,x+2,y+3,c)
    # bead bins on the table
    for i,c in enumerate((P['r1'],P['y1'],P['b1'],P['s1'])):
        bx=12+i*11; cv.r(bx,34,bx+8,40,P['w3']); cv.r(bx+1,35,bx+7,39,c)
        for k in range(3): cv.p(bx+2+k*2,36+(k%2),lt(c,.5))
    cv.outline(); return cv.im
def crank_station(f):
    """hand crank that drives a wood belt (1x1)"""
    cv=Cv(32,32); cv.shadow(16,29,10,2.5,80)
    box(cv,8,14,24,29,8,P['w1'],P['w2'])
    a=f*math.pi/2
    gear2d(cv,16,12,4,6,6,a,P['m1'])
    cx,cy=16+math.cos(a)*6,12+math.sin(a)*4
    cv.r(cx-1,cy-1,cx+2,cy+2,P['r1'])
    return cv.im
