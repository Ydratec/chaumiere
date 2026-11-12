# Usine de Noël — jeu (prototype intégré)

Le jeu est servi par l'app depuis `public/usine/jeu/` et s'affiche dans l'onglet **Usine** (à la place de la serre),
dans un cadre plein écran (`app/r/[roomId]/farm/page.tsx`).

- `public/usine/jeu/game.js` : logique (sac, tas et marché, machines, tapis à deux voies, jonctions, manivelles, commandes), rendu canvas et interface.
- `public/usine/jeu/index.html` : interface en pixel art (cadres, boutons, onglets, police `public/usine/ui`). `<base href="/">` : les chemins `usine/…` partent de la racine.
- `public/usine/jeu/meta.js` : fiches des étapes, **générées** : après avoir changé un `public/usine/etape-N/etape.json`, relancer
  `node tools/usine-proto/build-meta.mjs`.

La partie est sauvegardée dans le navigateur (localStorage).
