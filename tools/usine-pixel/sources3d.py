from m3d import *
from cat3d import STEEL, STEELF, d_hazard, I
import props
from items2 import PIG
def pile(kind):
    if kind=='sable': return props.sand_pile()
    if kind=='branche': return props.branch_bundle()
    from catalog import wood_pile
    if kind=='bois': return wood_pile()
    cv=Cv(32,40); cv.shadow(16,36,13,3,80)
    if kind=='fil':
        for i,(x,y) in enumerate(((5,24),(15,24),(10,14))):
            cv.r(x,y,x+12,y+11,P['w1']); cv.r(x,y,x+12,y+1,P['w2'])
            for yy in range(y+2,y+10): cv.r(x+1,yy,x+11,yy+1,C('#9aa0a8') if yy%2 else C('#c9ced8'))
    elif kind=='sapin':
        for k,x in enumerate((6,14,22)):
            for y in range(10+k%2*3,34):
                w=(y-(10+k%2*3))*.22
                for xx in range(int(x-w),int(x+w)+1): cv.p(xx,y,C('#3a7a4a') if xx<x else P['g2'])
        cv.r(3,32,29,35,P['w2'])
    elif kind.startswith('pigment_'):
        c=PIG[kind[8:]]
        cv.r(4,20,28,36,P['w2']); cv.r(4,20,28,22,P['w1'])
        cv.ell(16,20,11,6,lambda a,b,d,x,y: lt(c,.25) if b<0 else c if y<=22 else None)
    cv.outline(); return cv.im
def extractor(kind):
    """étape 5+ : silo-extracteur, couleur de la ressource"""
    col={'sable':C('#e2c27a'),'bois':P['w1'],'branche':P['g1'],'fil':C('#c9ced8'),'sapin':P['g2']}.get(kind) or PIG[kind[8:]]
    def make(o):
        ob=Obj(1,1,o)
        ob.box(2,30,2,30,0,6,STEEL,STEELF,faces={k:(lambda cv,r,f: d_hazard(cv,(r[0]+1,r[1]+1,r[2]-1,r[3]-1))) for k in ('w+','w-','u+','u-')})
        ob.cylz(16,16,12,6,44,C('#c9ced8'))
        def band(f): X,Y=ob.P(16,16,30); ob.cv.r(X-12,Y-3,X+12,Y+2,col); ob.cv.r(X-12,Y-3,X+12,Y-2,lt(col,.3))
        ob.custom((30,ob.g(16,16)[1]+12),band)
        def lamp(f): X,Y=ob.P(16,16,44); ob.cv.r(X-2,Y-3,X+2,Y,P['g0'] if f%2 else C('#1f5c30'))
        ob.custom((44,ob.g(16,16)[1]+12),lamp)
        return ob
    return make
SOURCES=['sable','bois','branche','fil','sapin','pigment_rouge','pigment_vert','pigment_or','pigment_bleu']
