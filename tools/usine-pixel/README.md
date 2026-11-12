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

## Étapes 2 à 8

```sh
cd tools/usine-pixel
python3 build_stages.py ../../public/usine
```

Produit `public/usine/etape-2/` … `etape-8/`, chacun avec un `etape.json` (taille des cases, nombre d'images,
emprise au sol, ce que fabrique chaque poste), et l'index `public/usine/etapes.json`.

| Étape | Nom | Contenu |
|---|---|---|
| 2 | Atelier équipé | four à soufflet, tour à pédale, étagère, râtelier d'outils, lutin assistant |
| 3 | Petite fabrique | tapis en bois, manivelle, presse à étoiles, métier à guirlandes |
| 4 | Manufacture à vapeur | sol pierre, mur brique, tuyaux, vanne, chaudière, presse à vapeur, lampadaire |
| 5 | Usine électrique | sol béton, mur métal, cabine de peinture, générateur (+ tapis et machines métal) |
| 6 | Usine automatisée | bras robot, portique de contrôle, séparateur, robot peintre, terminal |
| 7 | Complexe industriel | asphalte, neige, entrepôt, quai de chargement, camion, chariot élévateur |
| 8 | Multinationale | eau, quai, conteneurs, porte-conteneurs, grue portuaire, avion cargo, siège social, globe |
