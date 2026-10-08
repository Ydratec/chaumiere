// Secrets cachés dans le chapitre. Si vous voulez les trouver vous-même, n'ouvrez pas ce fichier !
// (L'application ne dit que combien on en a trouvé, jamais lesquels restent à trouver.)

export type Secret = { id: string; title: string; coins: number };

export const SECRETS: Secret[] = [
  { id: "chat", title: "Ami des chats", coins: 40 },
  { id: "minuit", title: "Oiseau de nuit", coins: 60 },
  { id: "coin", title: "Pot de coin", coins: 25 },
  { id: "fantome", title: "Chatouilleur de fantômes", coins: 50 },
  { id: "grain", title: "Petit joueur", coins: 15 },
];
export const isSecret = (id: string) => SECRETS.some((s) => s.id === id);
