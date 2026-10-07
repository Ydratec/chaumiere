// Types de jeux et contrat commun (sans dépendance : importable côté client comme serveur).

export const GAME_TYPES = {
  memory: { label: "Memory", desc: "Retrouve les paires de chats." },
  battleship: { label: "Bataille navale", desc: "Coule la flotte adverse." },
  orapa: { label: "Orapa Mine", desc: "Envoie des ondes et déduis où sont cachées les gemmes." },
} as const;
export type GameType = keyof typeof GAME_TYPES;
export const isGameType = (t: string): t is GameType => t in GAME_TYPES;

/** Champs communs à l'état public de tous les jeux. */
export type Base = { turn: string; winner: string | null }; // winner : id du gagnant, "draw" ou null
export type GameState = Base & Record<string, unknown>;

export type BoardProps = {
  gameId: string;
  state: GameState;
  userId: string;
  myTurn: boolean;
  name: (id: string) => string;
  play: (move: unknown) => Promise<void>;
  priv: unknown; // données que seul ce joueur voit (ex. sa flotte)
};
