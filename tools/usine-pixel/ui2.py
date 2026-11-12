"""Interface en pixel art de l'Usine de Noël : cadres 9-slice, boutons, onglets, cases, barres, icônes 16x16
et une police bitmap (exportée en TTF) avec les accents du français. Même palette et même contour que les machines."""
import math, json, os
from lib import *

# ---------------------------------------------------------------- cadres et boutons
def snow(cv, x0, x1, y=0, seed=0):
    for x in range(x0, x1):
        h = 1 + ((x * 7 + seed) % 5 == 0) + ((x * 3 + seed) % 7 == 0)
        cv.r(x, y, x + 1, y + h, P['s0']); cv.p(x, y + h, P['s2'])

def frame(snowy=True):
    """cadre principal, 24x24, tranches de 8 : bois clair, rebord sombre, clous dorés, neige sur le haut"""
    cv = Cv(24, 24)
    cv.r(0, 0, 24, 24, P['w3']); cv.r(2, 2, 22, 22, P['w2']); cv.r(3, 3, 21, 21, P['w1'])
    cv.r(3, 3, 21, 4, P['w0']); cv.r(3, 20, 21, 21, P['w2'])
    for y in (8, 14): cv.r(3, y, 21, y + 1, P['w2'])
    for (x, y) in ((3, 4), (19, 4), (3, 19), (19, 19)):
        cv.r(x, y, x + 2, y + 2, P['y1']); cv.p(x, y, P['y0']); cv.p(x + 1, y + 1, P['y2'])
    if snowy: snow(cv, 1, 23)
    cv.outline(); return cv.im

def card(kind='sombre'):
    """carte en creux, 12x12, tranches de 4"""
    cv = Cv(12, 12)
    base = {'sombre': P['w3'], 'clair': P['w1'], 'or': P['y2']}[kind]
    cv.r(0, 0, 12, 12, P['w4']); cv.r(1, 1, 11, 11, base)
    cv.r(1, 1, 11, 2, dk(base, .35)); cv.r(1, 1, 2, 11, dk(base, .25)); cv.r(1, 10, 11, 11, lt(base, .15))
    return cv.im

BTN = {'bois': (P['w1'], P['w3']), 'or': (P['y1'], P['y3']), 'rouge': (P['r1'], P['r2']), 'vert': (P['g1'], P['g3'])}
def button(var, state):
    """bouton 24x20, tranches de 6 ; états : normal, survol, appuyé, désactivé"""
    face, edge = BTN[var]
    if state == 'survol': face = lt(face, .15)
    if state == 'désactivé': face, edge = mix(face, P['m1'], .7), P['m2']
    cv = Cv(24, 20); dy = 2 if state == 'appuyé' else 0
    cv.r(0, 2, 24, 20, edge)                      # épaisseur
    cv.r(0, dy, 24, 16 + dy, face)
    cv.r(1, dy, 23, 1 + dy, lt(face, .4)); cv.r(0, 1 + dy, 1, 15 + dy, lt(face, .2))
    cv.r(1, 14 + dy, 23, 16 + dy, dk(face, .18)); cv.r(23, 1 + dy, 24, 16 + dy, dk(face, .15))
    if var == 'bois' and state != 'désactivé':
        for y in (5 + dy, 10 + dy): cv.r(2, y, 22, y + 1, dk(face, .12))
    cv.outline(); return cv.im

def tab(active):
    """onglet 24x18, tranches de 6 (haut arrondi, ouvert en bas)"""
    cv = Cv(24, 18); face = P['w1'] if active else P['w3']
    cv.r(2, 0, 22, 18, face); cv.r(0, 2, 24, 18, face)
    cv.r(2, 0, 22, 1, lt(face, .35)); cv.r(0, 2, 1, 18, lt(face, .15))
    if active:
        snow(cv, 2, 22, 0, 3); cv.r(0, 17, 24, 18, P['w1'])
    else: cv.r(0, 16, 24, 18, P['w4'])
    cv.outline(); return cv.im

def slot(state):
    """case d'inventaire 20x20 : normale, choisie, vide-verrouillée"""
    cv = Cv(20, 20)
    edge = {'normale': P['w4'], 'choisie': P['y1'], 'verrou': P['m2']}[state]
    cv.r(0, 0, 20, 20, edge); cv.r(1, 1, 19, 19, P['w3'] if state != 'verrou' else P['m3'])
    cv.r(1, 1, 19, 3, dk(P['w3'], .4)); cv.r(1, 1, 3, 19, dk(P['w3'], .3))
    if state == 'choisie':
        cv.r(1, 1, 19, 2, P['y0']);
        for (x, y) in ((1, 1), (17, 1), (1, 17), (17, 17)): cv.r(x, y, x + 2, y + 2, P['y0'])
    return cv.im

def bar_frame():
    """cadre de jauge 16x10, tranches de 3"""
    cv = Cv(16, 10); cv.r(0, 0, 16, 10, P['w4']); cv.r(1, 1, 15, 9, dk(P['w4'], .3))
    cv.r(1, 1, 15, 2, (0, 0, 0, 255)); return cv.im

def bar_fill(col):
    """remplissage de jauge 4x8, répété en largeur"""
    c = {'vert': P['g1'], 'or': P['y1'], 'rouge': P['r1'], 'bleu': P['b1']}[col]
    cv = Cv(4, 8); cv.r(0, 0, 4, 8, c); cv.r(0, 0, 4, 2, lt(c, .35)); cv.r(0, 6, 4, 8, dk(c, .25)); cv.p(0, 1, lt(c, .6))
    return cv.im

def bubble():
    """bulle d'info 12x12, tranches de 4 (parchemin)"""
    cv = Cv(12, 12); cv.r(0, 0, 12, 12, P['w3']); cv.r(1, 1, 11, 11, C('#f3e3c3'))
    cv.r(1, 10, 11, 11, C('#d9c39a')); cv.r(1, 1, 11, 2, s := C('#fff6e0')); return cv.im

# ---------------------------------------------------------------- icônes 16x16
def _ic(): return Cv(16, 16)
def ic_coin():
    cv = _ic(); cv.ell(8, 8, 6.5, 6.5, lambda a, b, d, x, y: P['y2'] if d > .8 else (P['y0'] if a + b < -.6 else P['y1']))
    cv.r(7, 4, 9, 12, P['y2']); cv.r(6, 5, 10, 6, P['y2']); cv.r(6, 10, 10, 11, P['y2']); cv.p(5, 5, P['s0'])
    cv.outline(); return cv.im
def ic_star():
    cv = _ic(); pts = []
    for k in range(10):
        r = 7 if k % 2 == 0 else 3; a = -math.pi / 2 + k * math.pi / 5; pts.append((8 + math.cos(a) * r, 8.5 + math.sin(a) * r))
    for y in range(16):
        for x in range(16):
            px, py = x + .5, y + .5; ins = False; j = len(pts) - 1
            for i in range(len(pts)):
                xi, yi = pts[i]; xj, yj = pts[j]
                if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi: ins = not ins
                j = i
            if ins: cv.p(x, y, P['y0'] if x + y < 13 else P['y1'] if x + y < 19 else P['y2'])
    cv.outline(); return cv.im
def ic_hand():
    cv = _ic()
    for x in (4, 6, 8, 10): cv.r(x, 3 + (x == 4) * 2 - (x == 8), x + 2, 10, P['k0'])
    cv.r(4, 8, 12, 14, P['k0']); cv.r(12, 7, 14, 10, P['k0']); cv.r(12, 9, 13, 12, P['k0'])
    for x in (6, 8, 10): cv.r(x, 4, x + 1, 9, P['k1'])
    cv.r(4, 13, 12, 14, P['k1']); cv.outline(); return cv.im
def ic_hammer():
    cv = _ic()
    for k in range(9): cv.r(4 + k, 12 - k, 6 + k, 14 - k, P['w1'] if k % 2 else P['w2'])
    cv.r(8, 1, 15, 6, P['m1']); cv.r(8, 1, 15, 2, P['m0']); cv.r(8, 5, 15, 6, P['m2']); cv.r(7, 2, 8, 5, P['m2'])
    cv.outline(); return cv.im
def ic_loupe():
    cv = _ic(); cv.ell(6.5, 6.5, 5, 5, lambda a, b, d, x, y: P['m1'] if d > .65 else (P['b0'] if a + b < -.3 else P['b1']))
    for k in range(5): cv.r(9 + k, 9 + k, 12 + k, 12 + k, P['w2'])
    cv.outline(); return cv.im
def ic_trash():
    cv = _ic(); cv.r(3, 3, 13, 5, P['m1']); cv.r(6, 1, 10, 3, P['m1']); cv.r(4, 5, 12, 15, P['m2'])
    for x in (6, 8, 10): cv.r(x, 6, x + 1, 14, P['m3'])
    cv.r(3, 3, 13, 4, P['m0']); cv.outline(); return cv.im
def ic_rotate():
    cv = _ic()
    for a in range(30, 330, 6):
        t = math.radians(a); cv.r(8 + math.cos(t) * 5 - .5, 8 + math.sin(t) * 5 - .5, 8 + math.cos(t) * 5 + 1.5, 8 + math.sin(t) * 5 + 1.5, P['g1'])
    cv.r(11, 1, 15, 3, P['g1']); cv.r(13, 1, 15, 6, P['g1']); cv.outline(); return cv.im
def ic_plus():
    cv = _ic(); cv.r(7, 3, 10, 14, P['s1']); cv.r(3, 7, 14, 10, P['s1']); cv.outline(); return cv.im
def ic_minus():
    cv = _ic(); cv.r(3, 7, 14, 10, P['s1']); cv.outline(); return cv.im
def ic_bag():
    cv = _ic(); cv.ell(8, 10, 6, 5, lambda a, b, d, x, y: P['c1'] if a > .3 or b > .5 else P['c0'])
    cv.r(5, 3, 11, 6, P['c1']); cv.r(6, 2, 10, 3, P['c2']); cv.r(5, 5, 11, 6, P['y1']); cv.outline(); return cv.im
def ic_market():
    cv = _ic(); cv.r(2, 4, 14, 6, P['r1']); cv.r(2, 4, 14, 5, P['r0'])
    for x in range(2, 14, 4): cv.r(x, 6, x + 2, 8, P['r1']); cv.r(x + 2, 6, x + 4, 8, P['s0'])
    cv.r(3, 8, 13, 14, P['w1']); cv.r(6, 10, 10, 14, P['w3']); cv.r(3, 2, 4, 4, P['w2']); cv.r(12, 2, 13, 4, P['w2'])
    cv.outline(); return cv.im
def ic_clock():
    cv = _ic(); cv.ell(8, 8, 6.5, 6.5, lambda a, b, d, x, y: P['m1'] if d > .8 else C('#f3e3c3'))
    cv.r(7, 3, 9, 9, P['m3']); cv.r(8, 7, 12, 9, P['m3']); cv.outline(); return cv.im
def ic_bolt():
    cv = _ic()
    for (y, x0, x1) in ((1, 8, 12), (2, 7, 11), (3, 7, 10), (4, 6, 10), (5, 6, 9), (6, 5, 12), (7, 6, 11), (8, 7, 10), (9, 7, 9), (10, 6, 8), (11, 6, 8), (12, 5, 7), (13, 5, 6), (14, 4, 6)):
        cv.r(x0, y, x1, y + 1, P['y1'])
    cv.p(8, 2, P['y0']); cv.outline(); return cv.im
def ic_lock():
    cv = _ic()
    for a in range(180, 361, 10):
        t = math.radians(a); cv.r(8 + math.cos(t) * 3.5 - 1, 7 + math.sin(t) * 4 - 1, 8 + math.cos(t) * 3.5 + 1, 7 + math.sin(t) * 4 + 1, P['m1'])
    cv.r(3, 7, 13, 15, P['y1']); cv.r(3, 7, 13, 8, P['y0']); cv.r(7, 10, 9, 13, P['y3']); cv.outline(); return cv.im
def ic_check():
    cv = _ic()
    for k in range(4): cv.r(3 + k, 8 + k, 5 + k, 10 + k, P['g0'])
    for k in range(7): cv.r(6 + k, 10 - k, 8 + k, 12 - k, P['g0'])
    cv.outline(); return cv.im
def ic_cross():
    cv = _ic()
    for k in range(10): cv.r(3 + k, 3 + k, 5 + k, 5 + k, P['r0']); cv.r(11 - k, 3 + k, 13 - k, 5 + k, P['r0'])
    cv.outline(); return cv.im
def ic_gear():
    cv = _ic()
    for y in range(16):
        for x in range(16):
            dx, dy = x - 7.5, y - 7.5; r = math.hypot(dx, dy); a = math.atan2(dy, dx)
            R = 5 + (1.6 if math.cos(a * 8) > .2 else 0)
            if r <= R and r > 2: cv.p(x, y, P['m0'] if dx + dy < 0 else P['m1'])
    cv.outline(); return cv.im
def ic_scroll():
    cv = _ic(); cv.r(3, 2, 13, 14, C('#f3e3c3')); cv.r(2, 1, 14, 3, C('#d9c39a')); cv.r(2, 13, 14, 15, C('#d9c39a'))
    for y in (5, 7, 9, 11): cv.r(5, y, 11 - (y == 11) * 3, y + 1, P['w3'])
    cv.outline(); return cv.im
def ic_flag():
    cv = _ic(); cv.r(3, 1, 5, 15, P['w2'])
    for y in range(2, 9): cv.r(5, y, 13 - abs(y - 5), y + 1, P['r1'])
    cv.r(5, 2, 11, 3, P['r0']); cv.outline(); return cv.im
def ic_fast():
    cv = _ic()
    for x0 in (2, 8):
        for k in range(6): cv.r(x0 + k // 1 - k // 2, 2 + k, x0 + 2 + k - k // 2, 3 + k, P['s1']); cv.r(x0 + k - k // 2, 13 - k, x0 + 2 + k - k // 2, 14 - k, P['s1'])
    cv.outline(); return cv.im
def ic_belt():
    cv = _ic(); cv.r(1, 5, 15, 12, P['m3']); cv.r(1, 5, 15, 6, P['m1']); cv.r(1, 11, 15, 12, P['y2'])
    for x in range(2, 15, 4): cv.r(x, 7, x + 2, 10, P['m2'])
    cv.outline(); return cv.im
def ic_info():
    cv = _ic(); cv.ell(8, 8, 6.5, 6.5, lambda a, b, d, x, y: P['b2'] if d > .85 else P['b1'])
    cv.r(7, 4, 9, 6, P['s0']); cv.r(7, 7, 9, 12, P['s0']); cv.outline(); return cv.im
def ic_house():
    cv = _ic()
    for k in range(7): cv.r(8 - k - 1, 1 + k, 8 + k + 1, 2 + k, P['r1'])
    cv.r(3, 8, 13, 15, P['w1']); cv.r(7, 10, 10, 15, P['w3']); cv.outline(); return cv.im
ICONS = [('piece', ic_coin), ('etoile', ic_star), ('main', ic_hand), ('marteau', ic_hammer), ('loupe', ic_loupe),
         ('poubelle', ic_trash), ('tourner', ic_rotate), ('plus', ic_plus), ('moins', ic_minus), ('sac', ic_bag),
         ('marche', ic_market), ('horloge', ic_clock), ('eclair', ic_bolt), ('cadenas', ic_lock), ('ok', ic_check),
         ('non', ic_cross), ('reglages', ic_gear), ('commandes', ic_scroll), ('progression', ic_flag), ('accelerer', ic_fast),
         ('tapis', ic_belt), ('info', ic_info), ('maison', ic_house)]

# ---------------------------------------------------------------- police bitmap « Chaumière Pixel »
# 7 rangées au-dessus de la ligne de base (capitales), 2 au-dessus pour les accents des capitales, 2 de jambage.
U = {
 'A': ".###.|#...#|#...#|#####|#...#|#...#|#...#", 'B': "####.|#...#|#...#|####.|#...#|#...#|####.",
 'C': ".###.|#...#|#....|#....|#....|#...#|.###.", 'D': "####.|#...#|#...#|#...#|#...#|#...#|####.",
 'E': "#####|#....|#....|####.|#....|#....|#####", 'F': "#####|#....|#....|####.|#....|#....|#....",
 'G': ".###.|#...#|#....|#.###|#...#|#...#|.####", 'H': "#...#|#...#|#...#|#####|#...#|#...#|#...#",
 'I': "###|.#.|.#.|.#.|.#.|.#.|###", 'J': "..###|...#.|...#.|...#.|#..#.|#..#.|.##..",
 'K': "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#", 'L': "#....|#....|#....|#....|#....|#....|#####",
 'M': "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#", 'N': "#...#|##..#|#.#.#|#..##|#...#|#...#|#...#",
 'O': ".###.|#...#|#...#|#...#|#...#|#...#|.###.", 'P': "####.|#...#|#...#|####.|#....|#....|#....",
 'Q': ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#", 'R': "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
 'S': ".####|#....|#....|.###.|....#|....#|####.", 'T': "#####|..#..|..#..|..#..|..#..|..#..|..#..",
 'U': "#...#|#...#|#...#|#...#|#...#|#...#|.###.", 'V': "#...#|#...#|#...#|#...#|.#.#.|.#.#.|..#..",
 'W': "#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#", 'X': "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
 'Y': "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..", 'Z': "#####|....#|...#.|..#..|.#...|#....|#####",
 'a': "....|....|.##.|...#|.###|#..#|.###", 'b': "#...|#...|###.|#..#|#..#|#..#|###.",
 'c': "....|....|.###|#...|#...|#...|.###", 'd': "...#|...#|.###|#..#|#..#|#..#|.###",
 'e': "....|....|.##.|#..#|####|#...|.###", 'f': "..##|.#..|.#..|###.|.#..|.#..|.#..",
 'g': "....|....|.###|#..#|#..#|#..#|.###|...#|.##.", 'h': "#...|#...|###.|#..#|#..#|#..#|#..#",
 'i': "#|.|#|#|#|#|#", 'j': "..#|...|..#|..#|..#|..#|..#|..#|##.",
 'k': "#...|#...|#..#|#.#.|##..|#.#.|#..#", 'l': "#.|#.|#.|#.|#.|#.|.#",
 'm': ".....|.....|##.#.|#.#.#|#.#.#|#.#.#|#.#.#", 'n': "....|....|###.|#..#|#..#|#..#|#..#",
 'o': "....|....|.##.|#..#|#..#|#..#|.##.", 'p': "....|....|###.|#..#|#..#|#..#|###.|#...|#...",
 'q': "....|....|.###|#..#|#..#|#..#|.###|...#|...#", 'r': "...|...|#.#|##.|#..|#..|#..",
 's': "....|....|.###|#...|.##.|...#|###.", 't': ".#..|.#..|###.|.#..|.#..|.#..|..##",
 'u': "....|....|#..#|#..#|#..#|#..#|.###", 'v': ".....|.....|#...#|#...#|.#.#.|.#.#.|..#..",
 'w': ".....|.....|#...#|#.#.#|#.#.#|#.#.#|.#.#.", 'x': "....|....|#..#|#..#|.##.|#..#|#..#",
 'y': "....|....|#..#|#..#|#..#|#..#|.###|...#|.##.", 'z': "....|....|####|..#.|.#..|#...|####",
 '0': ".##.|#..#|#.##|##.#|#..#|#..#|.##.", '1': ".#.|##.|.#.|.#.|.#.|.#.|###",
 '2': ".##.|#..#|...#|..#.|.#..|#...|####", '3': "###.|...#|...#|.##.|...#|...#|###.",
 '4': "#..#|#..#|#..#|####|...#|...#|...#", '5': "####|#...|###.|...#|...#|#..#|.##.",
 '6': ".##.|#...|#...|###.|#..#|#..#|.##.", '7': "####|...#|..#.|.#..|.#..|.#..|.#..",
 '8': ".##.|#..#|#..#|.##.|#..#|#..#|.##.", '9': ".##.|#..#|#..#|.###|...#|...#|.##.",
 '.': ".|.|.|.|.|.|#", ',': ".|.|.|.|.|.|#|#", ':': ".|.|#|.|.|.|#", ';': ".|.|#|.|.|.|#|#",
 '!': "#|#|#|#|#|.|#", '?': ".##.|#..#|...#|..#.|.#..|....|.#..", "'": "#|#|.|.|.|.|.", '’': "#|#|.|.|.|.|.",
 '"': "#.#|#.#|...|...|...|...|...", '-': "...|...|...|###|...|...|...", '+': "...|...|.#.|###|.#.|...|...",
 '=': "...|...|###|...|###|...|...", '(': ".#|#.|#.|#.|#.|#.|.#", ')': "#.|.#|.#|.#|.#|.#|#.",
 '[': "##|#.|#.|#.|#.|#.|##", ']': "##|.#|.#|.#|.#|.#|##", '/': "...#|...#|..#.|.##.|.#..|#...|#...",
 '%': "#...#|#..#.|...#.|..#..|.#...|.#..#|#...#", '×': "...|...|#.#|.#.|#.#|...|...",
 '«': "....|....|.#.#|#.#.|.#.#|....|....", '»': "....|....|#.#.|.#.#|#.#.|....|....",
 '·': ".|.|.|#|.|.|.", '–': "....|....|....|####|....|....|....", '—': ".....|.....|.....|#####|.....|.....|.....",
 '…': ".....|.....|.....|.....|.....|.....|#.#.#", '<': "..#|.#.|#..|.#.|..#|...|...", '>': "#..|.#.|..#|.#.|#..|...|...",
 '_': "....|....|....|....|....|....|####", '°': ".#.|#.#|.#.|...|...|...|...", '*': "...|#.#|.#.|#.#|...|...|...",
 '&': ".##..|#..#.|.##..|.#...|#.#.#|#..#.|.##.#", '€': "..###|.#...|####.|.#...|####.|.#...|..###",
 '★': "...#...|..###..|#######|.#####.|..###..|.##.##.|.#...#.", '→': ".....|..#..|...#.|#####|...#.|..#..|.....",
 '←': ".....|..#..|.#...|#####|.#...|..#..|.....", '↑': "..#..|.###.|#.#.#|..#..|..#..|..#..|.....", '↓': ".....|..#..|..#..|..#..|#.#.#|.###.|..#..",
 '#': ".#.#.|#####|.#.#.|.#.#.|#####|.#.#.|.....", '@': ".###.|#...#|#.###|#.#.#|#.##.|#....|.###.",
 '|': "#|#|#|#|#|#|#", '~': ".....|.....|.#..#|#.##.|.....|.....|.....", '^': ".#.|#.#|...|...|...|...|...",
}
MARK = {'aigu': ["..#", ".#."], 'grave': ["#..", ".#."], 'circ': [".#.", "#.#"], 'trema': ["...", "#.#"]}
ACC = {'é': ('e', 'aigu'), 'è': ('e', 'grave'), 'ê': ('e', 'circ'), 'ë': ('e', 'trema'), 'à': ('a', 'grave'), 'â': ('a', 'circ'),
       'ä': ('a', 'trema'), 'î': ('ı', 'circ'), 'ï': ('ı', 'trema'), 'ô': ('o', 'circ'), 'ö': ('o', 'trema'), 'ù': ('u', 'grave'),
       'û': ('u', 'circ'), 'ü': ('u', 'trema'), 'ÿ': ('y', 'trema'), 'É': ('E', 'aigu'), 'È': ('E', 'grave'), 'Ê': ('E', 'circ'),
       'Ë': ('E', 'trema'), 'À': ('A', 'grave'), 'Â': ('A', 'circ'), 'Î': ('I', 'circ'), 'Ï': ('I', 'trema'), 'Ô': ('O', 'circ'),
       'Ù': ('U', 'grave'), 'Û': ('U', 'circ'), 'Ü': ('U', 'trema')}
U['$'] = "..#..|.####|#.#..|.###.|..#.#|####.|..#.."
U['\\'] = "#...|#...|.#..|.##.|..#.|...#|...#"
U['`'] = "#.|.#|..|..|..|..|.."
U['{'] = "..#|.#.|.#.|#..|.#.|.#.|..#"
U['}'] = "#..|.#.|.#.|..#|.#.|.#.|#.."
U['ı'] = ".|.|#|#|#|#|#"
U['œ'] = "........|........|.##.##.|#..#..#|#..####|#..#...|.##.###"
U['Œ'] = ".######|#..#...|#..#...|#..####|#..#...|#..#...|.######"
U['æ'] = ".......|.......|.##.##.|...#..#|.######|#..#...|.##.###"
U['ß'] = ".##.|#..#|#.#.|#..#|#..#|#..#|#.#."

def glyph_rows(ch):
    """11 rangées (2 accent + 7 corps + 2 jambage) et largeur"""
    if ch == ' ': return [''] * 11, 3
    if ch in ACC:
        base, m = ACC[ch]; rows, w = glyph_rows(base); mk = MARK[m]
        off = max(0, (w - 3) // 2); ww = max(w, 3); pad = (ww - w) // 2
        rows = [('.' * pad + r).ljust(ww, '.') for r in rows]
        def put(i, s):
            r = list(rows[i]); [r.__setitem__(off + k, '#') for k, c in enumerate(s) if c == '#' and off + k < ww]; rows[i] = ''.join(r)
        if base.isupper(): put(0, mk[0]); put(1, mk[1])
        else: put(1, mk[0]); put(2, mk[1])
        return rows, ww
    if ch == 'ç' or ch == 'Ç':
        rows, w = glyph_rows('c' if ch == 'ç' else 'C'); rows = [r.ljust(w, '.') for r in rows]
        rows[9] = ('.#' + '.' * w)[:w]; rows[10] = ('#.' + '.' * w)[:w]; return rows, w
    src = U[ch].split('|'); w = max(len(r) for r in src)
    body = src[:7]; desc = src[7:9]
    rows = ['.' * w, '.' * w] + [r.ljust(w, '.') for r in body] + [r.ljust(w, '.') for r in desc] + ['.' * w] * (2 - len(desc))
    return rows, w

CHARS = [chr(c) for c in range(32, 127)] + list("éèêëàâäîïôöùûüÿçÉÈÊËÀÂÎÏÔÙÛÜÇœŒæß«»·–—…×€★→←↑↓°’")
def font_sheet():
    """aperçu de la police (8 px de corps, 11 px de ligne)"""
    text = ["Usine de Noël — 12 345 pièces ★ 230", "Étape 4 · Manufacture à vapeur", "Boule peinte (toutes) : 18 / 28",
            "àâäçéèêëîïôöùûüÿ ÀÂÇÉÈÊÎÔÙÛ œŒ « » …", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz 0123456789",
            "! ? . , ; : ' \" - + = ( ) [ ] / % × € → ← ↑ ↓"]
    W = 260; cv = Cv(W, len(text) * 13 + 4)
    for li, t in enumerate(text):
        x = 2
        for ch in t:
            if ch not in CHARS: continue
            rows, w = glyph_rows(ch)
            for y, r in enumerate(rows):
                for xx, c in enumerate(r):
                    if c == '#': cv.p(x + xx, 2 + li * 13 + y, C('#f3e3c3'))
            x += w + 1
    return cv.im

def build_ttf(path):
    from fontTools.fontBuilder import FontBuilder
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    PX = 125                      # 8 px de corps = 1000 unités
    fb = FontBuilder(1000, isTTF=True)
    names = ['.notdef'] + ['u%04X' % ord(c) for c in CHARS]
    fb.setupGlyphOrder(names)
    fb.setupCharacterMap({ord(c): 'u%04X' % ord(c) for c in CHARS})
    glyphs, metrics = {}, {}
    pen = TTGlyphPen(None); glyphs['.notdef'] = pen.glyph(); metrics['.notdef'] = (4 * PX, 0)
    for c in CHARS:
        rows, w = glyph_rows(c); pen = TTGlyphPen(None)
        for i, r in enumerate(rows):
            ytop = (9 - i) * PX              # rangée 0 = 9 px au-dessus de la base
            x = 0
            while x < len(r):
                if r[x] == '#':
                    x1 = x
                    while x1 < len(r) and r[x1] == '#': x1 += 1
                    pen.moveTo((x * PX, ytop)); pen.lineTo((x1 * PX, ytop)); pen.lineTo((x1 * PX, ytop - PX)); pen.lineTo((x * PX, ytop - PX)); pen.closePath()
                    x = x1
                else: x += 1
        name = 'u%04X' % ord(c); glyphs[name] = pen.glyph(); metrics[name] = ((w + 1) * PX, 0)
    fb.setupGlyf(glyphs); fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=9 * PX, descent=-2 * PX)
    fb.setupNameTable({'familyName': 'Chaumiere Pixel', 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=9 * PX, sTypoDescender=-2 * PX, usWinAscent=9 * PX, usWinDescent=2 * PX)
    fb.setupPost(); fb.save(path)

def build(out):
    os.makedirs(out, exist_ok=True)
    def save(n, im): im.save(f'{out}/{n}', optimize=True)
    save('cadre.png', frame()); save('cadre_sans_neige.png', frame(False))
    for k in ('sombre', 'clair', 'or'): save(f'carte_{k}.png', card(k))
    states = ('normal', 'survol', 'appuyé', 'désactivé')
    for v in BTN:
        S = Image.new('RGBA', (24 * 4, 20))
        for i, s in enumerate(states): S.paste(button(v, s), (i * 24, 0))
        save(f'bouton_{v}.png', S)
    S = Image.new('RGBA', (48, 18)); S.paste(tab(False), (0, 0)); S.paste(tab(True), (24, 0)); save('onglet.png', S)
    S = Image.new('RGBA', (60, 20))
    for i, s in enumerate(('normale', 'choisie', 'verrou')): S.paste(slot(s), (i * 20, 0))
    save('case.png', S)
    save('jauge.png', bar_frame())
    S = Image.new('RGBA', (16, 8))
    for i, c in enumerate(('vert', 'or', 'rouge', 'bleu')): S.paste(bar_fill(c), (i * 4, 0))
    save('jauge_remplie.png', S); save('bulle.png', bubble())
    S = Image.new('RGBA', (16 * len(ICONS), 16))
    for i, (n, fn) in enumerate(ICONS): S.paste(fn(), (i * 16, 0))
    save('icones.png', S)
    # découpes à l'unité, pour border-image en CSS
    for v in BTN:
        for s_ in states: save(f"bouton_{v}_{s_.replace('é', 'e')}.png", button(v, s_))
    save('onglet_inactif.png', tab(False)); save('onglet_actif.png', tab(True))
    for s_ in ('normale', 'choisie', 'verrou'): save(f'case_{s_}.png', slot(s_))
    for c in ('vert', 'or', 'rouge', 'bleu'): save(f'jauge_{c}.png', bar_fill(c))
    save('police_apercu.png', font_sheet()); build_ttf(f'{out}/chaumiere-pixel.ttf')
    json.dump({
        'cadre.png': {'size': [24, 24], 'nineSlice': 8, 'note': 'panneau principal ; neige sur le bord haut'},
        'cadre_sans_neige.png': {'size': [24, 24], 'nineSlice': 8},
        'carte_*.png': {'size': [12, 12], 'nineSlice': 4, 'variants': ['sombre', 'clair', 'or']},
        'bouton_*.png': {'frame': [24, 20], 'nineSlice': [6, 6, 8, 6], 'states': list(states), 'variants': list(BTN), 'note': "l'état « appuyé » descend de 2 px"},
        'onglet.png': {'frame': [24, 18], 'nineSlice': 6, 'states': ['inactif', 'actif']},
        'case.png': {'frame': [20, 20], 'states': ['normale', 'choisie', 'verrou'], 'note': "case d'inventaire, objet 16x16 au centre"},
        'jauge.png': {'size': [16, 10], 'nineSlice': 3}, 'jauge_remplie.png': {'frame': [4, 8], 'colors': ['vert', 'or', 'rouge', 'bleu']},
        'bulle.png': {'size': [12, 12], 'nineSlice': 4},
        'icones.png': {'frame': [16, 16], 'order': [n for n, _ in ICONS]},
        'découpes': 'bouton_<couleur>_<normal|survol|appuye|desactive>.png, onglet_<actif|inactif>.png, case_<état>.png, jauge_<couleur>.png : les mêmes, une image par état (border-image)',
        'chaumiere-pixel.ttf': {'note': 'police bitmap : 1 pixel = 1/8 du corps ; nette à 8, 16, 24 px', 'chars': ''.join(CHARS)},
    }, open(f'{out}/ui.json', 'w'), indent=2, ensure_ascii=False)

if __name__ == '__main__':
    import sys; build(sys.argv[1] if len(sys.argv) > 1 else '../../public/usine/ui')
