from lib import *
# Elf: 32x32 frame, feet at y=30. dirs: down, up, left, right. anims: idle(2) walk(4) work(4) carry(4)
def elf(dir='down',anim='walk',f=0):
    cv=char_canvas()
    walk = anim in ('walk','carry')
    bob = [0,-1,0,-1][f] if walk else ([0,0,-1,-1][f] if anim=='idle' else 0)
    legA = [0,-2,0,0][f] if walk else 0   # left leg lift
    legB = [0,0,0,-2][f] if walk else 0
    sw   = [0,2,0,-2][f] if walk else 0   # arm swing
    cv.shadow(16,30,7,2,80)
    y0=bob
    side = dir in ('left','right')
    tun,tunL,tunD=P['g1'],P['g0'],P['g2']
    # legs + boots
    if side:
        for lx,ll in ((14,legA),(17,legB)):
            cv.r(lx,24+y0,lx+3,28+y0+ll,P['r2']); cv.r(lx-1 if dir=='left' else lx,27+y0+ll,lx+4 if dir=='right' else lx+3,30+ll+y0,P['w4'])
    else:
        for lx,ll in ((12,legA),(17,legB)):
            cv.r(lx,24+y0,lx+3,28+y0+ll,P['r2']); cv.r(lx,27+y0+ll,lx+4 if lx==17 else lx+3,30+ll+y0,P['w4'])
            if lx==12: cv.p(lx-1,29+ll+y0,P['w4'])
    # body tunic
    bx0,bx1=(11,21) if not side else (12,20)
    cv.r(bx0,15+y0,bx1,25+y0,tun)
    cv.r(bx0,15+y0,bx0+2,25+y0,tunL); cv.r(bx1-2,15+y0,bx1,25+y0,tunD)
    cv.r(bx0-1,23+y0,bx1+1,25+y0,P['s1']); cv.r(bx0-1,24+y0,bx1+1,25+y0,P['s2'])
    cv.r(bx0,21+y0,bx1,22+y0,P['w3'])
    if dir=='down': cv.r(15,21+y0,17,22+y0,P['y1'])
    if dir=='down':  # collar buttons
        cv.p(16,17+y0,P['y1']); cv.p(16,19+y0,P['y1'])
    # arms
    def arm(ax,dy,front=True):
        cv.r(ax,16+y0+dy,ax+2,21+y0+dy,tunD if front else tun)
        cv.r(ax,21+y0+dy,ax+2,23+y0+dy,P['k1'])
    if anim=='work':
        k=[0,-3,-5,-2][f]
        if dir=='up':
            cv.r(9,14+y0+k,11,20+y0,tun); cv.r(21,14+y0+k,23,20+y0,tun)
            cv.r(9,12+y0+k,11,14+y0+k,P['k1']); cv.r(21,12+y0+k,23,14+y0+k,P['k1'])
        else:
            arm(9,k); arm(21,-k-3 if k else 0)
    elif anim=='carry':
        if dir=='up':
            cv.r(9,12+y0,11,19+y0,tun); cv.r(21,12+y0,23,19+y0,tun)
        else:
            cv.r(9,11+y0,11,18+y0,tun); cv.r(21,11+y0,23,18+y0,tun)
            cv.r(9,9+y0,11,11+y0,P['k1']); cv.r(21,9+y0,23,11+y0,P['k1'])
    else:
        if side:
            arm(15+ (sw//2) ,0)
        else:
            arm(9,sw//2); arm(21,-sw//2)
    # head
    hy=6+y0
    cv.ell(16,hy+5,5.5,5,lambda u,v,d,x,y: P['k0'] if (u+v)<.5 else P['k1'])
    # ears
    if dir in ('down','up'):
        for ex,s in ((10,-1),(22,1)):
            cv.p(ex,hy+5,P['k1']); cv.p(ex+s,hy+4,P['k1']); cv.p(ex,hy+4,P['k0'])
    elif dir=='left': cv.p(20,hy+4,P['k1']); cv.p(21,hy+3,P['k1']); cv.p(20,hy+5,P['k0'])
    else: cv.p(12,hy+4,P['k1']); cv.p(11,hy+3,P['k1']); cv.p(12,hy+5,P['k0'])
    # face
    if dir=='down':
        cv.p(14,hy+6,OUT); cv.p(18,hy+6,OUT); cv.p(14,hy+5,OUT); cv.p(18,hy+5,OUT)
        cv.p(13,hy+8,P['r0']); cv.p(19,hy+8,P['r0']); cv.p(16,hy+8,P['k2']); cv.p(15,hy+9,P['k2']); cv.p(17,hy+9,P['k2'])
    elif dir=='left':
        cv.p(13,hy+5,OUT); cv.p(13,hy+6,OUT); cv.p(11,hy+7,P['k1']); cv.p(14,hy+8,P['r0'])
    elif dir=='right':
        cv.p(19,hy+5,OUT); cv.p(19,hy+6,OUT); cv.p(21,hy+7,P['k1']); cv.p(18,hy+8,P['r0'])
    else:
        cv.r(11,hy+3,22,hy+7,P['w2']); cv.r(12,hy+7,21,hy+8,P['w3'])
    # hair fringe
    if dir!='up': cv.r(11,hy+2,22,hy+4,P['w2']); cv.p(11,hy+4,P['w2']); cv.p(21,hy+4,P['w2'])
    # hat: brim + cone flopping to the side
    cv.r(10,hy+1,23,hy+3,P['s1']); cv.r(10,hy+2,23,hy+3,P['s2'])
    flop = -1 if dir=='left' else 1
    for i in range(7):
        w=6-i
        cx=16+flop*(i*0.9)
        cv.r(cx-w,hy-i,cx+w+1,hy+1-i,P['r1'] if i%3 else lt(P['r1'],.12))
        cv.p(cx+w,hy-i,P['r2'])
    tx=16+flop*7; ty=hy-6
    cv.r(tx,ty,tx+2*flop if flop>0 else tx+1,ty+1,P['r1'])
    cv.ell(tx+flop*2.5,ty+1.5,2,2,lambda u,v,d,x,y: P['s0'] if u+v<.3 else P['s2'])
    cv.outline()
    return cv.im

DIRS=['down','left','right','up']
ANIMS=['idle','walk','work','carry']
def sheet():
    S=Image.new('RGBA',(32*4,32*len(DIRS)*len(ANIMS)))
    rows=[]
    for a in ANIMS:
        for d in DIRS:
            r=len(rows); rows.append(f'{a}_{d}')
            for f in range(4): S.paste(elf(d,a,f),(f*32,r*32))
    return S,rows
if __name__=='__main__':
    S,rows=sheet(); S.save('elf.png'); print(rows)
    bg=Image.new('RGBA',S.size,(200,170,130,255)); bg.alpha_composite(S); bg.resize((S.width*4,S.height*4),Image.NEAREST).crop((0,0,512,1024)).save('elf_big.png')
