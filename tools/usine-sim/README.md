# Simulation d'équilibrage — Usine de Noël

Outils Python (numpy) qui servent à régler les chiffres du jeu.

| Fichier | Rôle |
|---|---|
| `balance.json` | Toutes les valeurs réglables : recettes, prix, étapes, énergie, portes, terrain, `tuning` |
| `chains.py` | Solveur en régime stable : machines, cases, kW, chaudières et matières pour un débit donné. `python3 chains.py` affiche le besoin de chaque porte |
| `season2.py` | Saison Monte-Carlo heure par heure, 9 joueurs (2 tryhards, 4 réguliers, 3 occasionnels) sur 20 jours |
| `calibrate.py` | Coûts des machines à partir des objectifs de rentabilité, puis portes calées par dichotomie sur l'arrivée du régulier médian. `python3 calibrate.py 12` |
| `evaluate.py` | 200 saisons : arrivées par étape, étoiles par source, probabilités de victoire |
| `sweep.py` | Sensibilité, un réglage à la fois. `python3 sweep.py 40` écrit `sweep.json` |

`final_metrics.json` et `sweep.json` sont les résultats repris dans le document de game design (section « Simulation et équilibrage »).

Réglage clé : `tuning.contract_alpha` (0 = contrat commun calé sur le régulier médian, 1 = contrat à la taille du joueur ; retenu 0,5).
Limite connue : la qualité (porte 8, sapins Beaux) n'est pas modélisée.
