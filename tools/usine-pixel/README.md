# Usine de Noël : générateurs pixel art

Scripts Python (Pillow) qui dessinent tous les assets de l'usine dans `public/usine/`, en vue 3/4 sur une grille de 32×32.

| Script | Produit |
|---|---|
| `build_animals.py <dossier>` | Personnages des joueurs : `personnages/` (14 espèces, 8 couleurs pour les espèces de base) et calques `accessoires/` |
| `build.py` | Kit de l'étape 1 (atelier du lutin) dans `out/` : lutin, sols, murs, postes, objets 16×16, UI |
| `conveyors.py` | Tapis roulants (12 tuiles × 4 images) |
| `machines.py` | Four, assembleur, coffre (avec ports d'entrée/sortie) |

Régénérer les personnages :

```sh
cd tools/usine-pixel
python3 build_animals.py ../../public/usine
```

Format des planches de personnages : 4 colonnes (images) × 16 lignes, dans l'ordre
`idle`, `walk`, `work`, `carry` × `down`, `left`, `right`, `up`. Les pieds sont en (16, 30).
Voir `public/usine/personnages.json` et `src/modules/usine/sprites.ts`.
