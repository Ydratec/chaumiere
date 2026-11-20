"""Ajoute voisins, population, PIB à countries.json et génère world.json (un tracé par pays + lieux)."""
import json, math, sys
import numpy as np
SRC = sys.argv[1]
MERGE = {'SOL': ['SO'], 'CYN': ['CY'], 'CNM': ['CY'], 'ESB': ['CY'], 'WSB': ['CY'],
         'USG': ['CU'], 'SPI': ['CL', 'AR'], 'KAB': ['KZ'], 'BRI': ['BR']}
SKIP = {'AQ', 'KAS', 'BRT', 'PGA', 'BJN', 'SER', 'SCR'}
src = json.load(open(SRC))
groups, props = {}, {}
for f in src['features']:
    p = f['properties']; a3 = p['ADM0_A3']
    if a3 in MERGE: targets = MERGE[a3]
    else:
        iso = p['ISO_A2_EH'] if p['ISO_A2_EH'] != '-99' else p['ISO_A2']
        if iso == '-99': iso = 'XK' if a3 == 'KOS' else None
        if not iso or iso in SKIP: continue
        targets = [iso]
        if p['TYPE'] not in ('Dependency', 'Lease', 'Indeterminate') or iso not in props: props[iso] = p
    g = f['geometry']; polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    for t in targets: groups.setdefault(t, []).extend(polys)

# --- voisins : sommets partagés
keys = {}
for iso, polys in groups.items():
    ks = set()
    for poly in polys:
        for ring in poly:
            for lon, lat in ring: ks.add((round(lon, 3), round(lat, 3)))
    keys[iso] = ks
owner = {}
for iso, ks in keys.items():
    for k in ks: owner.setdefault(k, set()).add(iso)
pair = {}
for k, os_ in owner.items():
    if len(os_) > 1:
        for a in os_:
            for b in os_:
                if a < b: pair[(a, b)] = pair.get((a, b), 0) + 1
nb = {}
for (a, b), n in pair.items():
    if n >= 3: nb.setdefault(a, set()).add(b); nb.setdefault(b, set()).add(a)

d = json.load(open('countries.json'))
for r in d:
    p = props.get(r['id'])
    r['nb'] = sorted(nb.get(r['id'], []))
    if p:
        r['pop'] = int(p['POP_EST'] or 0); r['gdp'] = int(p['GDP_MD'] or 0)
with open('countries.json', 'w') as fo:
    fo.write('[\n' + ',\n'.join(json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in d) + '\n]\n')
show = {r['id']: r for r in d}
for t in ['FR', 'DE', 'CN', 'RU', 'ES', 'CL', 'IN', 'US', 'GB', 'CY', 'SO']:
    print(t, show[t]['nb'], show[t].get('pop'), show[t].get('gdp'), show[t].get('z'))

# --- carte du monde (Miller), un tracé par pays
W = 2000; LATMIN, LATMAX = -57.0, 83.0; K = W / 360.0; U = K * 180 / math.pi
miller = lambda lat: 1.25 * np.log(np.tan(np.pi / 4 + 0.4 * np.radians(lat)))
YMAX = float(miller(LATMAX)); H = (YMAX - float(miller(LATMIN))) * U
def proj(lon, lat):
    lat = np.clip(lat, LATMIN, LATMAX)
    return np.stack([(lon + 180) * K, (YMAX - miller(lat)) * U], -1)
def area(r):
    x, y = r[:, 0], r[:, 1]; return abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1))) / 2
def dp(pts, tol):
    n = len(pts)
    if n < 4: return pts
    keep = np.zeros(n, bool); keep[0] = keep[-1] = True; st = [(0, n - 1)]
    while st:
        a, b = st.pop()
        if b <= a + 1: continue
        seg = pts[b] - pts[a]; L = math.hypot(*seg); sub = pts[a + 1:b] - pts[a]
        dd = np.abs(seg[0] * sub[:, 1] - seg[1] * sub[:, 0]) / L if L > 0 else np.hypot(sub[:, 0], sub[:, 1])
        i = int(np.argmax(dd))
        if dd[i] > tol: m = a + 1 + i; keep[m] = True; st += [(a, m), (m, b)]
    return pts[keep]
cpaths = {}
for iso, polys in groups.items():
    parts = []
    for poly in polys:
        for j, ring in enumerate(poly):
            r = np.array(ring)
            if r[:, 1].max() < LATMIN: break
            q = proj(r[:, 0], r[:, 1])
            if area(q) < 0.5:
                if j == 0: break
                continue
            q = dp(q, 0.35)
            if len(q) >= 4:
                q = np.round(q, 1)
                parts.append(f'M{q[0,0]:g} {q[0,1]:g}L' + ' '.join(f'{x:g} {y:g}' for x, y in q[1:]) + 'z')
    if parts: cpaths[iso] = ''.join(parts)
items = []
for line in open('places.txt').read().strip().splitlines():
    n, c, l, r, pts = line.split('|')
    items.append([n, c, int(l), float(r), [[float(a) for a in p.split(',')] for p in pts.split(';')]])
out = {'vb': f'0 0 {W} {round(H)}', 'P': {'k': K, 'u': U, 'ymax': YMAX, 'latmin': LATMIN, 'latmax': LATMAX}, 'c': cpaths, 'items': items}
json.dump(out, open('world.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(cpaths), 'pays sur la carte', len(items), 'lieux', round(sum(map(len, cpaths.values())) / 1000), 'k')
