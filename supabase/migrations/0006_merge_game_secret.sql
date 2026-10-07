-- Fusion atomique dans le secret d'une partie (ex. Orapa : chaque joueur pose sa grille,
-- parfois au même moment ; un « lire puis réécrire » perdrait l'une des deux).
-- Appelée uniquement par le serveur (service role).

create function merge_game_secret(g uuid, patch jsonb) returns void
  language sql as
$$ update game_secrets set deck = deck || patch where game_id = g $$;

revoke execute on function merge_game_secret(uuid, jsonb) from public, anon, authenticated;
