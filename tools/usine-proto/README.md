# Prototype jouable — Usine de Noël (étapes 1 à 3)

Page autonome qui sert à tester le gameplay avant l'intégration dans Chaumière (à la place de la serre).

- `game.js` : logique (sac, tas et marché, machines, tapis à deux voies, jonctions, manivelles, commandes), rendu canvas et interface.
- `index.html` : interface en pixel art (cadres, boutons, onglets, police `public/usine/ui`).

Pour le lancer : copier `public/usine` dans un dossier `usine/` à côté de ces fichiers, générer `meta.js`
(`window.USINE_META = {1: etape-1/etape.json, 2: …, 3: …}`), puis servir le dossier en HTTP.
