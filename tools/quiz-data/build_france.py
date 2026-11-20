"""Carte de France (métropole + Corse) et pays voisins pour le mode « Placer », depuis Natural Earth 1:10m.
La projection (azimutale équivalente de Lambert, centre 2.5°E 46.5°N) est exportée pour être refaite en JS."""
import json, math, sys
import numpy as np

SRC = sys.argv[1]
R = 6371.0
LON0, LAT0 = 2.5, 46.5
BOX = 1000

def laea(lon, lat):
    lo, la = np.radians(lon) - math.radians(LON0), np.radians(lat)
    p0 = math.radians(LAT0)
    k = np.sqrt(2 / (1 + math.sin(p0) * np.sin(la) + math.cos(p0) * np.cos(la) * np.cos(lo)))
    return np.stack([R * k * np.cos(la) * np.sin(lo), -R * k * (math.cos(p0) * np.sin(la) - math.sin(p0) * np.cos(la) * np.cos(lo))], -1)

def area(r):
    x, y = r[:, 0], r[:, 1]
    return abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1))) / 2

def dp(pts, tol):
    n = len(pts)
    if n < 4: return pts
    keep = np.zeros(n, bool); keep[0] = keep[-1] = True
    st = [(0, n - 1)]
    while st:
        a, b = st.pop()
        if b <= a + 1: continue
        seg = pts[b] - pts[a]; L = math.hypot(*seg); sub = pts[a + 1:b] - pts[a]
        d = np.abs(seg[0] * sub[:, 1] - seg[1] * sub[:, 0]) / L if L > 0 else np.hypot(sub[:, 0], sub[:, 1])
        i = int(np.argmax(d))
        if d[i] > tol:
            m = a + 1 + i; keep[m] = True; st += [(a, m), (m, b)]
    return pts[keep]

def path(rings):
    out = []
    for q in rings:
        q = np.round(q, 1)
        s = f'M{q[0,0]:g} {q[0,1]:g}' + 'L' + ' '.join(f'{x:g} {y:g}' for x, y in q[1:]) + 'z'
        out.append(s)
    return ''.join(out)

src = json.load(open(SRC))
fr, nb = [], []
NB = {'BE', 'LU', 'DE', 'CH', 'IT', 'ES', 'AD', 'MC', 'GB', 'NL', 'SM', 'VA', 'LI', 'AT', 'PT', 'JE', 'GG', 'IM', 'IE'}
for f in src['features']:
    p = f['properties']; iso = p['ISO_A2_EH']
    g = f['geometry']; polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    for poly in polys:
        r = np.array(poly[0]); lon, lat = r[:, 0].mean(), r[:, 1].mean()
        if iso == 'FR' and p['ADM0_A3'] == 'FRA' and -6 < lon < 10 and 41 < lat < 52:
            fr.append([np.array(x) for x in poly])
        elif iso in NB and -12 < lon < 18 and 36 < lat < 56:
            nb.append([np.array(x) for x in poly])

proj_fr = [[laea(r[:, 0], r[:, 1]) for r in poly] for poly in fr]
allp = np.concatenate([r for p in proj_fr for r in p])
x0, y0 = allp.min(0); x1, y1 = allp.max(0)
s = BOX / max(x1 - x0, y1 - y0)
tf = lambda q: (q - [x0, y0]) * s

def rings_of(polys, tol, min_a):
    out = []
    for poly in polys:
        for j, r in enumerate(poly):
            q = tf(laea(r[:, 0], r[:, 1]))
            if area(q) < min_a:
                if j == 0: break
                continue
            q = dp(q, tol)
            if len(q) >= 4: out.append(q)
    return out

fr_rings = rings_of(fr, 0.3, 0.8)
nb_rings = rings_of(nb, 0.7, 3)
pad = 30
w, h = (x1 - x0) * s, (y1 - y0) * s

# Villes : nom, lat, lon, niveau (1 = classique, 2 = expert seulement)
CITIES = """Paris,48.857,2.352,1|Marseille,43.296,5.370,1|Lyon,45.764,4.836,1|Toulouse,43.605,1.444,1|Nice,43.710,7.262,1|Nantes,47.218,-1.554,1|Strasbourg,48.573,7.752,1|Montpellier,43.611,3.877,1|Bordeaux,44.838,-0.579,1|Lille,50.629,3.057,1|Rennes,48.117,-1.678,1|Reims,49.258,4.032,1|Le Havre,49.494,0.108,1|Saint-Étienne,45.440,4.387,1|Toulon,43.124,5.928,1|Grenoble,45.188,5.724,1|Dijon,47.322,5.041,1|Angers,47.478,-0.563,1|Nîmes,43.837,4.360,1|Clermont-Ferrand,45.778,3.087,1|Le Mans,48.006,0.199,1|Brest,48.390,-4.486,1|Tours,47.394,0.685,1|Amiens,49.894,2.296,1|Limoges,45.834,1.262,1|Annecy,45.899,6.129,1|Perpignan,42.699,2.895,1|Metz,49.120,6.176,1|Besançon,47.238,6.024,1|Orléans,47.903,1.909,1|Rouen,49.443,1.099,1|Caen,49.183,-0.370,1|Nancy,48.692,6.184,1|Avignon,43.949,4.806,1|Poitiers,46.580,0.340,1|La Rochelle,46.160,-1.151,1|Pau,43.295,-0.370,1|Bayonne,43.493,-1.475,1|Ajaccio,41.919,8.739,1|Bastia,42.697,9.450,1|Calais,50.951,1.858,1|Biarritz,43.483,-1.559,1|Carcassonne,43.213,2.351,1|Chamonix,45.924,6.869,1|Cannes,43.552,7.017,1|Dunkerque,51.034,2.377,1|Saint-Malo,48.649,-2.026,1|Lourdes,43.095,-0.046,1|Mulhouse,47.750,7.336,1|Aix-en-Provence,43.530,5.447,1|"""
CITIES += """Cherbourg,49.640,-1.616,2|Quimper,47.996,-4.102,2|Lorient,47.748,-3.370,2|Vannes,47.658,-2.760,2|Chambéry,45.564,5.918,2|Valence,44.933,4.892,2|Troyes,48.297,4.074,2|Chartres,48.446,1.489,2|Bourges,47.081,2.398,2|Nevers,46.990,3.159,2|Auxerre,47.798,3.567,2|Albi,43.929,2.148,2|Rodez,44.350,2.575,2|Aurillac,44.926,2.440,2|Le Puy-en-Velay,45.043,3.885,2|Mende,44.518,3.500,2|Gap,44.559,6.079,2|Digne-les-Bains,44.092,6.236,2|Cahors,44.448,1.441,2|Agen,44.203,0.616,2|Périgueux,45.184,0.721,2|Angoulême,45.649,0.156,2|Niort,46.323,-0.465,2|Laval,48.073,-0.770,2|Alençon,48.432,0.091,2|Évreux,49.024,1.151,2|Beauvais,49.430,2.081,2|Arras,50.291,2.778,2|Charleville-Mézières,49.773,4.720,2|Épinal,48.173,6.450,2|Colmar,48.079,7.358,2|Belfort,47.638,6.863,2|Lons-le-Saunier,46.675,5.556,2|Mâcon,46.307,4.828,2|Bourg-en-Bresse,46.205,5.226,2|Moulins,46.566,3.333,2|Châteauroux,46.811,1.691,2|Guéret,46.171,1.871,2|Tulle,45.267,1.770,2|Montauban,44.018,1.355,2|Foix,42.965,1.607,2|Tarbes,43.233,0.078,2|Auch,43.646,0.586,2|Mont-de-Marsan,43.890,-0.500,2|Privas,44.735,4.599,2|Saint-Brieuc,48.514,-2.765,2|Blois,47.586,1.335,2|Vesoul,47.622,6.155,2|Bar-le-Duc,48.773,5.160,2|Chaumont,48.111,5.139,2|Châlons-en-Champagne,48.957,4.363,2|Laon,49.564,3.620,2|Saint-Lô,49.116,-1.091,2|La Roche-sur-Yon,46.670,-1.426,2|Melun,48.540,2.660,2|Versailles,48.805,2.120,2|Arcachon,44.658,-1.168,2|Deauville,49.357,0.070,2|Saint-Tropez,43.273,6.640,2|Vichy,46.128,3.426,2|Cognac,45.696,-0.329,2|Boulogne-sur-Mer,50.726,1.614,2|Sète,43.403,3.697,2|Béziers,43.344,3.216,2|Narbonne,43.184,3.004,2|Arles,43.677,4.630,2|Briançon,44.899,6.643,2|Évian-les-Bains,46.401,6.590,2|Verdun,49.160,5.384,2|Épernay,49.040,3.960,2|Saumur,47.260,-0.077,2"""
cities = [[n, float(la), float(lo), int(l)] for n, la, lo, l in (c.split(',') for c in CITIES.split('|'))]

out = {'vb': f'{-pad} {-pad} {round(w) + 2*pad} {round(h) + 2*pad}',
       'P': {'lon0': LON0, 'lat0': LAT0, 'x0': round(float(x0), 4), 'y0': round(float(y0), 4), 's': round(float(s), 6), 'R': R},
       'fr': path(fr_rings), 'nb': path(nb_rings), 'cities': cities}
json.dump(out, open('france.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(cities), 'villes', len(out['fr']) // 1000, 'k fr', len(out['nb']) // 1000, 'k voisins')
