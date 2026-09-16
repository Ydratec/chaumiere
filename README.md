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

Copier `.env.example` vers `.env.local` lorsque Supabase sera configuré.

Ne jamais committer `.env.local` ni des clés secrètes.
