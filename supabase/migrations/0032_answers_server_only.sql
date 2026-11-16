-- Réponses aux questions : écrites seulement par le serveur.
--
-- ATTENTION, exception à la règle habituelle : à lancer APRÈS la mise en ligne du code qui va avec
-- (app/actions.ts écrit désormais les réponses avec la clé serveur). Lancée avant, l'ancien code ne pourrait plus
-- enregistrer de réponse. Lancée après, rien ne change pour les joueurs.
--
-- Pourquoi : ces deux règles laissaient un membre écrire directement dans la table (avec l'API Supabase, sans passer
-- par l'app), donc changer un vote « définitif » ou enregistrer une réponse qui ne respecte pas le format de la question.
-- La lecture ne change pas (règle « lire » : on voit les réponses des autres après avoir répondu).
drop policy if exists "écrire" on answers;
drop policy if exists "modifier" on answers;
