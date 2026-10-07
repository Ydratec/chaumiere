-- À lancer UNE fois dans le SQL Editor de Supabase, après avoir remplacé les deux valeurs :
--   VOTRE-APP   → l'adresse de l'app sur Vercel (ex. chaumiere-abc.vercel.app)
--   VOTRE_SECRET → la valeur de CRON_SECRET (dans .env.local et dans Vercel)
-- Toutes les 5 minutes, Supabase appelle l'app, qui envoie les notifications programmées
-- (question du jour à 9 h, récoltes prêtes).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'chaumiere-notifications',
  '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://VOTRE-APP/api/cron/tick',
       headers := jsonb_build_object('Authorization', 'Bearer VOTRE_SECRET')
     ) $$
);

-- Pour arrêter : select cron.unschedule('chaumiere-notifications');
