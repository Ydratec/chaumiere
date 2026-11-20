# Données du Géo Quiz (public/quiz)

Scripts qui fabriquent les fichiers JSON du jeu à partir de Natural Earth 1:10m (domaine public),
fichier `ne_10m_admin_0_countries.geojson` (https://github.com/nvkelso/natural-earth-vector, dossier geojson).

Ordre (Python 3 + numpy), lancé depuis ce dossier, sorties copiées ensuite dans `public/quiz/` :

1. `python3 build.py <geojson> countries.json` : silhouettes des pays (projection centrée sur chaque pays).
2. `python3 augment.py` : capitales, micro-États.
3. `python3 build_extra.py <geojson>` : voisins, population et PIB (2019), carte du monde `world.json` (+ `places.txt`).
4. `python3 trivia.py` : monnaies, langues, indicatifs, domaines.
5. `python3 build_france.py <geojson>` : carte de France et villes (`france.json`).
6. `python3 build_history.py` : évènements historiques (`history.json`).

Capitales, monnaies, langues, lieux et dates sont écrits à la main dans les scripts : c'est là qu'on les corrige.
