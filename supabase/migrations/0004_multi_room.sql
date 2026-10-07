-- Un compte par personne (pseudo de connexion + PIN), plusieurs salles, un pseudo d'affichage par salle
-- (room_members.username, déjà unique par salle). Le schéma gère déjà plusieurs salles par utilisateur.

-- Repartir de zéro : supprime les anciens comptes « un compte par salle » (email pseudo.<id-salle>@…),
-- et en cascade leurs appartenances, réponses et messages. Les nouveaux emails sont pseudo@chaumiere.local.
delete from auth.users where email like '%.%@chaumiere.local';
