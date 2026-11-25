# Module notifications

Notifications push (web-push) : abonnements par appareil, préférences de chacun, anti-spam.

- `push.ts` : `notify(qui, type, message, options)` ; `sendDigests()` (cron, le matin) ; `touchPresence()`.
- `policy.ts` (pur, testé) : les règles anti-spam.
  - « pour toi » (par défaut) : passe toujours ; la nuit (22 h – 8 h), gardé pour le résumé du matin ;
    `skipIfActive` : rien si la personne est dans l'appli (vue il y a moins de 2 min).
  - « salle » (`level: "room"`) : jamais la nuit ; une par personne qui envoie toutes les 30 min ; 4 par heure,
    12 par jour ; une seule invitation au quiz. Revenir sur l'appli remet ces compteurs à zéro (`<Presence />`).
- `prefs.ts` : un interrupteur par type, plus « salle » et « heures calmes ».
