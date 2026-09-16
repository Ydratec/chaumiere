# Architecture de Daily Friends

## Principes

- Monolithe modulaire avec Next.js et TypeScript.
- PostgreSQL comme base de données.
- Supabase pour les services de base de données et le temps réel.
- La logique métier est séparée de l'interface.
- Le serveur vérifie les permissions.
- Les données de chaque salle sont isolées.

## Modules

- Auth : identité, PIN et sessions.
- Users : profils.
- Rooms : salles, membres et rôles.
- Questions : questions quotidiennes et réponses.
- Codenames : parties et règles du jeu.
- Chat : messages de groupe.
- Notifications : notifications futures.

## Sécurité

- Ne jamais stocker les PIN en clair.
- Ne jamais exposer les clés secrètes au navigateur.
- Vérifier les autorisations côté serveur.
- Utiliser des migrations versionnées pour la base.
