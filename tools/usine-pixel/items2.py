from items import item as base_item, ITEMS as BASE
from lib import *
PIG={'rouge':P['r1'],'vert':P['g1'],'or':P['y1'],'bleu':P['b1']}
def item(n):
    cv=Cv(16,16); sh=lambda: cv.shadow(8,14.5,5,1.3,60)
    if n=='verre':
        sh(); cv.r(3,6,13,13,C('#bfe6ff')); cv.r(3,6,13,7,C('#ffffff')); cv.r(11,7,13,13,C('#8ac0e8')); cv.r(5,8,7,10,(255,255,255,200))
    elif n=='perles':
        sh()
        for i,(x,y) in enumerate(((4,9),(8,8),(12,9),(6,12),(10,12))): cv.ell(x,y,1.8,1.8,lambda a,b,d,xx,yy,i=i: sphere([P['r1'],P['y1'],P['b1'],P['g1'],P['s1']][i],a,b,d))
    elif n=='fil':
        sh(); cv.r(4,4,12,13,P['w1']); cv.r(3,4,13,5,P['w2']); cv.r(3,12,13,13,P['w2'])
        for y in range(5,12): cv.r(4,y,12,y+1,C('#9aa0a8') if y%2 else C('#c9ced8'))
    elif n=='crochet':
        for k in range(5): cv.p(8,4+k,C('#c9ced8'))
        cv.p(7,9,C('#c9ced8')); cv.p(6,8,C('#c9ced8')); cv.p(6,7,C('#c9ced8')); cv.r(7,2,10,4,P['y2'])
    elif n=='planche':
        sh(); cv.r(2,8,14,12,P['w0']); cv.r(2,11,14,12,P['w2']); cv.p(5,9,P['w2']); cv.p(10,10,P['w2'])
    elif n=='sciure':
        sh(); cv.ell(8,11,5.5,3,lambda a,b,d,x,y: C('#e2c27a') if (x+y)%3 else C('#c9a46a'))
    elif n=='eclats':
        sh()
        for x,y in ((4,10),(8,8),(11,11),(6,12)): cv.r(x,y,x+2,y+2,C('#bfe6ff')); cv.p(x,y,C('#ffffff'))
    elif n.startswith('pigment_'):
        c=PIG[n[8:]]; sh(); cv.ell(8,11,5.5,3.5,lambda a,b,d,x,y: lt(c,.2) if b<0 else dk(c,.2))
    elif n.startswith('peinture_'):
        c=PIG[n[9:]]; sh(); cv.r(4,5,12,14,P['m1']); cv.r(4,5,5,14,P['m0']); cv.r(11,5,12,14,P['m2'])
        cv.ell(8,5.5,4,1.6,lambda a,b,d,x,y: c); cv.r(5,7,8,10,c)
    elif n.startswith('boule_finie_'):
        col={'rouge':'ball_red','vert':'ball_green','or':'ball_gold','bleu':'ball_blue'}[n[12:]]
        cv.paste(base_item(col),0,0); cv.r(7,0,9,2,C('#c9ced8'))
        return cv.im
    elif n=='sapin_brut':
        sh(); cv.r(7,12,9,15,P['w2'])
        for y in range(3,13):
            w=(y-2)*.5
            for x in range(int(8-w),int(8+w)+1): cv.p(x,y,P['g2'] if x>8 else C('#3a7a4a'))
    else:
        return None
    cv.outline(); return cv.im
MAP={'sable':'sand','bois':'wood','branche':'branch','boule_transparente':'ball_clear','boule_rouge':'ball_red','boule_verte':'ball_green',
     'boule_or':'ball_gold','boule_bleue':'ball_blue','ruban':'ribbon','couronne':'wreath','etoile_bois':'wood_star','etoile_doree':'star',
     'guirlande':'garland','sapin_decore':'tree','cadeau':'gift','piece':'coin','verre_fondu':'glass'}
ORDER=['sable','bois','branche','fil','sapin_brut','pigment_rouge','pigment_vert','pigment_or','pigment_bleu',
       'verre_fondu','verre','perles','eclats','planche','sciure','crochet',
       'peinture_rouge','peinture_vert','peinture_or','peinture_bleu',
       'boule_transparente','boule_rouge','boule_verte','boule_or','boule_bleue',
       'boule_finie_rouge','boule_finie_vert','boule_finie_or','boule_finie_bleu',
       'etoile_bois','etoile_doree','ruban','guirlande','couronne','sapin_decore','cadeau','piece']
def get(n):
    if n in MAP: return base_item(MAP[n])
    return item(n)
