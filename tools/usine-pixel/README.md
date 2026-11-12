# Usine de Noël : générateurs pixel art

Scripts Python (Pillow) qui dessinent **tous** les assets de l'usine dans `public/usine/`.

```sh
cd tools/usine-pixel
python3 build_all.py ../../public/usine
```

## Règles communes

- **Grille de 32**, vue 3/4.
- **Projection** : un objet de hauteur Z sur une emprise de W × H tuiles est dessiné dans une case
  W*32 × (H*32 + Z + marge). Le bas de la case = le bas de l'emprise ; on ancre en bas et on trie par bas d'emprise.
  Les tapis suivent la même règle (hauteur 5), donc les ports des machines tombent pile sur les tapis.
- **Deux orientations par machine** : `_h` (vue de face, tapis ouest → est sur la rangée du bas) et
  `_v` (vue de côté, tapis nord → sud sur la colonne `(W-1)//2`).
- **Une famille de machines par époque** : `art` (bois/argile, étapes 1-3), `vap` (fonte/cuivre, étape 4),
  `elec` (acier, bandes jaunes, étapes 5-8), `robot` (blanc/bleu, étape 6). Pas de mélange dans une même étape.
- **Personnages en 32 × 48**, pieds en (16, 46).

## Contenu

| Dossier | Contenu |
|---|---|
| `personnages/`, `accessoires/` | 14 espèces (8 couleurs pour les espèces de base), lutin, lutin assistant, 8 accessoires en calques |
| `tapis/` | `bois` (étape 3), `fonte` (étape 4), `metal` (étapes 5-8), 12 tuiles × 4 images |
| `commun/` | objets 16×16, boutons, panneau, barre de progression, icônes |
| `etape-1` … `etape-8` | machines (`_h` / `_v`), sols, murs, sources, décor, véhicules (4 directions), bâtiments, et un `etape.json` |

| Script | Rôle |
|---|---|
| `mach.py` | moteur commun : boîte 3/4, capots d'entrée/sortie, familles |
| `catalog.py` | toutes les machines de production, par famille |
| `beltparts.py` | tapis, tunnel de contrôle qualité, bras robot, séparateur |
| `vehicles.py` | camion et chariot élévateur dans les 4 directions |
| `animals.py`, `accessories.py`, `elf.py` | personnages |
| `props.py`, `items.py`, `ui.py`, `stage23.py`, `stage45.py`, `stage678.py` | décor, objets, interface, bâtiments |
| `build_all.py` | génère tout + les fichiers JSON |
