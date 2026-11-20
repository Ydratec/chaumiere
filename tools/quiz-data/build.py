"""Prépare les silhouettes de pays à partir de Natural Earth 1:10m.
Sortie : countries.json (un tableau, un pays par ligne)."""
import json, math, sys
import numpy as np

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'countries.json'
R = 6371.0
BOX = 1000           # taille de la boîte de dessin
TOL = 0.45           # tolérance de simplification, en unités de la boîte (≈ < 1/2 pixel)
MIN_RING = 1.5       # aire mini d'un anneau gardé, en unités² de la boîte
NEAR = 1.6           # parties gardées si à moins de NEAR × rayon du territoire principal
MIN_COUNTRY_KM2 = 100

# Morceaux à rattacher à un pays (zones tampons, bases, enclaves non-ISO)
MERGE = {'SOL': ['SO'], 'CYN': ['CY'], 'CNM': ['CY'], 'ESB': ['CY'], 'WSB': ['CY'],
         'USG': ['CU'], 'SPI': ['CL', 'AR'], 'KAB': ['KZ'], 'BRI': ['BR']}
RENAME = {'CN': 'Chine', 'KP': 'Corée du Nord', 'KR': 'Corée du Sud', 'CD': 'RD Congo', 'CF': 'Centrafrique'}
SKIP = {'AQ', 'KAS', 'BRT', 'PGA', 'BJN', 'SER', 'SCR'}
# Parties lointaines à garder malgré la distance
FAR_KEEP = {'US': 0.15}   # Alaska
BIG = 0.10                # une partie ≥ 10 % du territoire principal est gardée si pas trop loin (FAR × rayon)
FAR = 4.0
# Parties à retirer explicitement (lon, lat du centre de la partie)
DROP = {'NO': lambda lon, lat: lat > 74 or lon < 0}   # Svalbard, Jan Mayen

def polys_of(g):
    if g['type'] == 'Polygon':
        return [g['coordinates']]
    if g['type'] == 'MultiPolygon':
        return g['coordinates']
    return []

src = json.load(open(SRC))
groups, meta = {}, {}
for f in src['features']:
    p = f['properties']
    a3 = p['ADM0_A3']
    if a3 in MERGE:
        targets = MERGE[a3]
    else:
        iso = p['ISO_A2_EH'] if p['ISO_A2_EH'] != '-99' else p['ISO_A2']
        if iso == '-99':
            iso = 'XK' if a3 == 'KOS' else None
        if not iso or iso in SKIP:
            continue
        targets = [iso]
        # la fiche « principale » donne nom et continent (pas les dépendances homonymes)
        main = p['TYPE'] not in ('Dependency', 'Lease', 'Indeterminate')
        if iso not in meta or main:
            meta[iso] = {'n': RENAME.get(iso, p['NAME_FR'] or p['NAME']), 'k': p['CONTINENT'], 'r': p['SUBREGION'],
                         't': 1 if (p['TYPE'] in ('Sovereign country', 'Country', 'Disputed', 'Sovereignty') or iso == 'PS') else 0}
    for t in targets:
        groups.setdefault(t, []).extend(polys_of(f['geometry']))

def to_xyz(lon, lat):
    lo, la = np.radians(lon), np.radians(lat)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], -1)

def laea(lon, lat, lon0, lat0):
    """Projection azimutale équivalente de Lambert centrée sur (lon0, lat0), en km."""
    lo, la = np.radians(lon) - math.radians(lon0), np.radians(lat)
    p0 = math.radians(lat0)
    k = np.sqrt(2 / np.maximum(1e-12, 1 + math.sin(p0) * np.sin(la) + math.cos(p0) * np.cos(la) * np.cos(lo)))
    x = R * k * np.cos(la) * np.sin(lo)
    y = R * k * (math.cos(p0) * np.sin(la) - math.sin(p0) * np.cos(la) * np.cos(lo))
    return np.stack([x, -y], -1)   # y vers le bas pour le SVG

def area(r):
    x, y = r[:, 0], r[:, 1]
    return abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1))) / 2

def dp(pts, tol):
    """Douglas-Peucker itératif."""
    n = len(pts)
    if n < 4:
        return pts
    keep = np.zeros(n, bool); keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        seg = pts[b] - pts[a]
        L = math.hypot(*seg)
        sub = pts[a + 1:b] - pts[a]
        d = np.abs(seg[0] * sub[:, 1] - seg[1] * sub[:, 0]) / L if L > 0 else np.hypot(sub[:, 0], sub[:, 1])
        i = int(np.argmax(d))
        if d[i] > tol:
            m = a + 1 + i
            keep[m] = True
            stack += [(a, m), (m, b)]
    return pts[keep]

def path(rings):
    out = []
    for r in rings:
        q = np.round(r).astype(int)
        # supprime les doublons consécutifs après arrondi
        q = q[np.r_[True, np.any(np.diff(q, axis=0) != 0, axis=1)]]
        if len(q) < 3:
            continue
        nums = np.diff(q, axis=0).ravel().tolist()
        body = ''.join((str(n) if (n < 0 or i == 0) else ' ' + str(n)) for i, n in enumerate(nums))
        out.append(f'M{q[0,0]} {q[0,1]}l{body}z')
    return ''.join(out)

records = []
for iso, polys in groups.items():
    if iso not in meta:
        continue
    polys = [[np.array(r, float) for r in poly] for poly in polys if poly and len(poly[0]) >= 4]
    if not polys:
        continue
    # polygone principal (aire approx. sur la sphère)
    def approx(poly):
        r = poly[0]; return area(np.c_[np.radians(r[:, 0]) * np.cos(np.radians(r[:, 1].mean())), np.radians(r[:, 1])])
    # gestion de l'antiméridien pour l'aire approchée : on recentre chaque anneau
    main = max(polys, key=approx)
    v = to_xyz(main[0][:, 0], main[0][:, 1]).mean(0); v /= np.linalg.norm(v)
    lon0, lat0 = math.degrees(math.atan2(v[1], v[0])), math.degrees(math.asin(v[2]))
    proj = [[laea(r[:, 0], r[:, 1], lon0, lat0) for r in poly] for poly in polys]
    areas = [area(p[0]) for p in proj]
    mi = int(np.argmax(areas)); ma = areas[mi]
    mc = proj[mi][0].mean(0)
    rad = np.max(np.hypot(*(proj[mi][0] - mc).T))
    kept = []
    for p, a, poly in zip(proj, areas, polys):
        c = p[0].mean(0); d = math.hypot(*(c - mc))
        if a < ma * 0.999 and iso in DROP and DROP[iso](*poly[0].mean(0)):
            continue
        if a >= ma * 0.999 or d <= NEAR * rad + 30 or (a >= BIG * ma and d <= FAR * rad):
            kept.append(p)
        elif iso in FAR_KEEP and a >= FAR_KEEP[iso] * ma:
            kept.append(p)
    allp = np.concatenate([r for p in kept for r in p])
    x0, y0 = allp.min(0); x1, y1 = allp.max(0)
    s = BOX / max(x1 - x0, y1 - y0)
    rings = []
    for p in kept:
        for j, r in enumerate(p):
            q = (r - [x0, y0]) * s
            if area(q) < MIN_RING:
                if j == 0:
                    break      # anneau extérieur invisible → on saute le polygone
                continue
            q = dp(q, TOL)
            if len(q) >= 4:
                rings.append(q)
    km2 = sum(area(p[0]) - sum(area(h) for h in p[1:]) for p in kept)
    if km2 < MIN_COUNTRY_KM2 or not rings:
        continue
    w, h = (x1 - x0) * s, (y1 - y0) * s
    pad = 18
    records.append({'z': round(float(max(x1 - x0, y1 - y0))), 'id': iso, 'n': meta[iso]['n'], 'k': meta[iso]['k'], 'r': meta[iso]['r'], 't': meta[iso]['t'],
                    'c': [round(lon0, 2), round(lat0, 2)], 'a': int(km2),
                    'vb': f'{-pad} {-pad} {round(w) + 2*pad} {round(h) + 2*pad}', 'd': path(rings)})

records.sort(key=lambda r: r['n'])
with open(OUT, 'w') as fo:
    fo.write('[\n' + ',\n'.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in records) + '\n]\n')
print(len(records), 'pays')
