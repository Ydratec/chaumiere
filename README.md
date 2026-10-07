# Daily Friends

Application privée entre amis : questions quotidiennes, salles,
chat de groupe et jeux en temps réel.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase / PostgreSQL
- pnpm

## Développement

```bash
pnpm dev
```

Ouvrir http://localhost:3000.

## Architecture

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Configuration

Copier `.env.example` vers `.env.local` et le remplir.

Ne jamais committer `.env.local` ni des clés secrètes.

## Déploiement (Vercel)

1. Lancer dans Supabase (SQL Editor) les migrations de `supabase/migrations/` dans l'ordre,
   puis les questions de `supabase/seed/`. **Toujours migrer avant de pousser le code qui en dépend.**
2. Importer le dépôt GitHub dans Vercel et renseigner les variables de `.env.example`
   (mêmes valeurs qu'en local ; ne jamais changer `AUTH_PEPPER`, sinon les PIN existants ne marchent plus).
3. Chaque `git push` sur `main` redéploie automatiquement.
