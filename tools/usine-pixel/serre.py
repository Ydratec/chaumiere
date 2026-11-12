"""Petite serre de l'usine (étape 1) : un bac en bois sous une serre en verre, en 4 états = 4 images
(0 terre semée, 1 pousses, 2 plantes, 3 fleurs). Le jeu choisit l'image selon la pousse ; elle ne tourne pas.
Écrit public/usine/etape-1/serre_fleurs.png et ajoute l'objet à etape-1/etape.json (sans tout regénérer).
    cd tools/usine-pixel && python3 serre.py ../../public/usine && node ../usine-proto/build-meta.mjs   (depuis la racine pour build-meta)"""
import json, os, sys
from m3d import Obj, PAD, finish
from cat3d import d_planks
from kit2 import *

SOIL, SOIL_D = C('#5a3a26'), C('#3f2718')
GLASS, ROOF = C('#cfeeff', 40), C('#bfe6ff', 70)
BLOOMS = [P['r0'], P['y1'], C('#ff8fc8'), C('#b07ae8'), P['s0'], P['b0'], C('#ff6fb4'), P['f2'], C('#ffd1e8'), P['r1']]
PLANTS = [(u, w) for w in (13, 22) for u in (11, 22, 33, 44, 55)]   # 2 rangées de 5, dans le bac


def serre(o='e'):
    ob = Obj(2, 1, o); L, D = ob.L, ob.D
    # le bac : planches sur les côtés, terre dessus
    ob.box(2, L - 2, 6, D - 3, 0, 9, SOIL, P['w2'], faces={'w+': d_planks(P['w2']), 'u+': d_planks(P['w2']), 'u-': d_planks(P['w2'])})

    def plants(f):
        cv = ob.cv
        for i, (u, w) in enumerate(PLANTS):
            X, Y = ob.P(u, w, 9)
            if f == 0:   # terre semée : petits sillons et graines
                cv.r(X - 3, Y, X + 3, Y + 1, SOIL_D); cv.p(X, Y - 1, P['w0'])
                continue
            h = (3, 8, 10)[f - 1]
            cv.r(X, Y - h, X + 1, Y, P['g2'])                        # tige
            if f == 1:                                               # pousse : deux petites feuilles
                cv.r(X - 2, Y - 3, X, Y - 2, P['g0']); cv.r(X + 1, Y - 3, X + 3, Y - 2, P['g0'])
            else:                                                    # plante : deux étages de feuilles
                cv.r(X - 3, Y - 4, X, Y - 2, P['g1']); cv.r(X + 1, Y - 5, X + 4, Y - 3, P['g1'])
                cv.r(X - 2, Y - 7, X, Y - 6, P['g0']); cv.r(X + 1, Y - 8, X + 3, Y - 7, P['g0'])
            if f == 3:                                               # fleur : 3 × 3, cœur jaune
                c = BLOOMS[i % len(BLOOMS)]; cy = Y - h - 1
                cv.r(X - 1, cy - 1, X + 2, cy + 2, c); cv.p(X - 1, cy - 1, lt(c, .5))
                cv.p(X - 2, cy, dk(c, .15)); cv.p(X + 2, cy, dk(c, .15)); cv.p(X, cy - 2, lt(c, .3))
                cv.p(X, cy, P['y1'] if c != P['y1'] else P['f2'])
    ob.custom(None, plants, bounds=((2, L - 2), (6, D - 3), 9, 24))

    def glass(f):
        """la serre en verre, dessinée par-dessus (les plantes se voient au travers)"""
        cv = ob.cv
        X0, X1 = PAD + 2, PAD + L - 2
        eave_f, eave_b, ridge = PAD + (D - 3) - 22, PAD + 6 - 22, PAD + 17 - 32      # Y à l'écran (e : Y = w - z)
        floor_f = PAD + (D - 3) - 9
        cv.r(X0, eave_f, X1, floor_f, GLASS)                                            # vitre de façade
        for y in range(ridge, eave_f):                                                  # pan de toit avant
            cv.r(X0, y, X1, y + 1, ROOF)
        for y in range(eave_b, ridge):                                                  # pan arrière (à peine visible)
            cv.r(X0 + 1, y, X1 - 1, y + 1, dk(ROOF, .08))
        wood, wood_d = P['w1'], P['w2']
        for x in (X0, X1 - 2):                                                          # montants d'angle
            cv.r(x, eave_f, x + 2, floor_f, wood); cv.r(x + 1, eave_f, x + 2, floor_f, wood_d)
        for x in (X0, (X0 + X1) // 2, X1 - 2):                                          # chevrons du toit
            cv.r(x, ridge, x + 2, eave_f, wood)
        cv.r(X0, eave_f - 1, X1, eave_f + 1, wood)                                      # sablière
        cv.r(X0, ridge - 1, X1, ridge + 1, wood_d)                                      # faîtage
        cv.r(X0, ridge + 1, X1, ridge + 2, C('#ffffff', 120))                           # lumière sur le toit
        for x in (X0 + 6, X1 - 18):                                                     # reflets
            for t in range(5): cv.p(x + t, eave_f + 2 + t, C('#ffffff', 130))
            for t in range(3): cv.p(x + 4 + t, ridge + 3 + t, C('#ffffff', 120))
    ob.custom(None, glass, bounds=((0, L), (0, D), 40, 60))                                # tout en dernier
    return ob


if __name__ == '__main__':
    OUT = sys.argv[1]
    ob = serre()
    frames, origin = finish(ob, [ob.render(f) for f in range(4)])
    W, H = frames[0].size
    strip = Image.new('RGBA', (W * 4, H))
    for i, f in enumerate(frames): strip.paste(f, (i * W, 0))
    strip.save(f'{OUT}/etape-1/serre_fleurs.png', optimize=True)
    meta_path = f'{OUT}/etape-1/etape.json'
    meta = json.load(open(meta_path))
    meta['objects']['serre_fleurs'] = {'file': 'serre_fleurs.png', 'frame': [W, H], 'frames': 4, 'footprint': [2, 1], 'origin': list(origin),
                                       'states': ['semée', 'pousses', 'plantes', 'fleurs'], 'role': 'petite serre : fleurs pour la salle'}
    json.dump(meta, open(meta_path, 'w'), indent=2, ensure_ascii=False)
    print('serre_fleurs', W, 'x', H, 'origine', origin)
