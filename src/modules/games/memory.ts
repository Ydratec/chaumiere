// Règles du Memory à deux : fonctions pures, appelées par les server actions (le plateau reste côté serveur).

export type MemoryState = {
  cards: (string | null)[]; // face visible (null = cachée)
  matched: boolean[];
  flipped: number[]; // cartes retournées du coup en cours ; 2 = une paire ratée, masquée au prochain clic
  turn: string;
  scores: Record<string, number>;
  winner: string | "draw" | null;
};

const SYMBOLS = ["0", "1", "2", "3", "4", "5", "6", "7"]; // index de robe de chat (voir components/cat.tsx)

export function newGame(a: string, b: string, rand = Math.random) {
  const deck = [...SYMBOLS, ...SYMBOLS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1)); // Fisher-Yates
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const state: MemoryState = {
    cards: deck.map(() => null),
    matched: deck.map(() => false),
    flipped: [],
    turn: rand() < 0.5 ? a : b,
    scores: { [a]: 0, [b]: 0 },
    winner: null,
  };
  return { deck, state };
}

/** Retourne le nouvel état, ou null si le coup est illégal. */
export function flip(state: MemoryState, deck: string[], i: number, player: string): MemoryState | null {
  if (state.winner || state.turn !== player || !(i >= 0 && i < deck.length) || state.matched[i]) return null;
  const s: MemoryState = { ...state, cards: [...state.cards], matched: [...state.matched], flipped: [...state.flipped], scores: { ...state.scores } };
  if (s.flipped.length === 2) {
    s.flipped.forEach((j) => (s.cards[j] = null)); // la paire ratée est masquée
    s.flipped = [];
  }
  if (s.flipped.includes(i)) return null;
  s.cards[i] = deck[i];
  s.flipped.push(i);
  if (s.flipped.length < 2) return s;

  const [a, b] = s.flipped;
  if (deck[a] === deck[b]) {
    s.matched[a] = s.matched[b] = true;
    s.scores[player]++;
    s.flipped = [];
    if (s.matched.every(Boolean)) {
      const [p, q] = Object.keys(s.scores);
      s.winner = s.scores[p] === s.scores[q] ? "draw" : s.scores[p] > s.scores[q] ? p : q;
    }
  } else {
    s.turn = Object.keys(s.scores).find((k) => k !== player)!;
  }
  return s;
}
