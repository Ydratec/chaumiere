# Usine de Noël : générateurs pixel art

Scripts Python (Pillow) qui dessinent **tous** les assets de l'usine dans `public/usine/`.

```sh
cd tools/usine-pixel
python3 build3.py ../../public/usine
```

## Moteur 3D (`m3d.py`)

Chaque machine, bras, séparateur, tuyau ou véhicule est décrit **en volumes**, dans son repère local :
`u` le long du flux (entrée en u = 0, sortie en u = L), `w` en travers (w = 0 côté service, w = D côté opérateur), `z` la hauteur.
Le moteur le projette dans les 4 orientations, et chaque orientation montre **la vraie face** de l'objet :

| Orientation | Flux à l'écran | Face visible |
|---|---|---|
| `_e` | ouest → est | façade (commandes, écrans) |
| `_s` | nord → sud | bout de sortie |
| `_w` | est → ouest | arrière (tuyaux, câbles, trappes) |
| `_n` | sud → nord | bout d'entrée |

Les éléments posés dessus (cheminées, cuves, roues, bras) tournent avec la machine ; une roue vue de face
dans une orientation est vue par la tranche dans une autre.

## Règles communes

- **Grille de 32**, vue 3/4. Chaque sprite donne `origin` = position, dans sa case, du coin haut-gauche de son emprise :
  dessiner à `(tx*32 - origin.x, ty*32 - origin.y)`, trier par bas d'emprise.
- **Tapis** : hauteur 5 ; horizontal centré à y = 14, vertical à x = 16 ; deux voies. Les ports des machines sont calculés
  sur cette géométrie, et `etape.json` donne pour chaque orientation la tuile et le côté de l'entrée et de la sortie.
- **Une famille par époque** : `art` (bois/argile, étapes 1-3), `vap` (fonte/cuivre, 4), `elec` (acier, 5-8), `robot` (6).
- **Personnages** en 32 × 48, pieds en (16, 46).

## Fichiers

| Script | Rôle |
|---|---|
| `m3d.py` | moteur 3D : boîtes, cylindres debout et couchés, disques, sphères, capots de ports, projection, recadrage |
| `cat3d.py` | toutes les machines de production et d'énergie, face par face |
| `logi3d.py` | tapis souterrains, séparateurs, tunnel de contrôle, 4 bras, tuyaux, manivelle, poteaux, accumulateur |
| `sources3d.py`, `veh3d.py`, `items2.py` | sources, véhicules, objets 16 × 16 |
| `animals.py`, `accessories.py`, `elf.py` | personnages |
| `props.py`, `ui.py`, `stage45.py`, `stage678.py` | sols, murs, décor, bâtiments, interface |
| `build3.py` | génère tout + `etapes.json` et un `etape.json` par étape |
