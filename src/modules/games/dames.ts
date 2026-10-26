// Jeu de dames (règles internationales, plateau 10 × 10) : fonctions pures, testées dans tests/unit/dames.test.ts.
// - Les pions avancent en diagonale d'une case ; ils prennent en avant comme en arrière.
// - La prise est obligatoire, et il faut prendre le plus de pièces possible (une dame compte comme un pion).
// - Les pièces prises ne sont retirées qu'à la fin de la rafle : on ne saute jamais deux fois la même.
// - Un pion qui finit son coup sur la dernière rangée devient dame ; la dame se déplace et prend à longue distance.
// - On perd quand on n'a plus de coup possible ; 25 coups de dames chacun sans prise ni coup de pion : partie nulle.

export const N = 10;
export type Piece = "" | "w" | "b" | "W" | "B"; // minuscule : pion ; majuscule : dame
export type Color = "w" | "b";
export type DamesState = {
  board: Piece[]; // 100 cases, index = ligne × 10 + colonne ; les blancs partent du bas (lignes 6 à 9)
  colors: Record<string, Color>;
  turn: string;
  winner: string | "draw" | null;
  last: number[] | null; // dernier coup (cases traversées), pour le mettre en valeur
  taken: Record<string, number>; // pièces prises par chacun
  quiet: number; // demi-coups de suite sans prise ni coup de pion
};
/** Un coup : la case de départ puis chaque case d'arrivée (plusieurs pour une rafle). */
export type Move = { path: number[]; captured: number[] };

const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const;
const rc = (i: number) => [Math.floor(i / N), i % N] as const;
const at = (r: number, c: number) => (r >= 0 && r < N && c >= 0 && c < N ? r * N + c : -1);
export const isDark = (i: number) => { const [r, c] = rc(i); return (r + c) % 2 === 1; };
const colorOf = (p: Piece): Color | null => (p ? (p.toLowerCase() as Color) : null);
const isKing = (p: Piece) => p === "W" || p === "B";

export function initialBoard(): Piece[] {
  return Array.from({ length: N * N }, (_, i) => {
    const [r] = rc(i);
    if (!isDark(i)) return "";
    return r <= 3 ? "b" : r >= 6 ? "w" : "";
  });
}

export function start(a: string, b: string, rand = Math.random): { state: DamesState; secret: Record<string, never> } {
  const [white, black] = rand() < 0.5 ? [a, b] : [b, a];
  return {
    state: { board: initialBoard(), colors: { [white]: "w", [black]: "b" }, turn: white, winner: null, last: null, taken: { [a]: 0, [b]: 0 }, quiet: 0 },
    secret: {}, // rien de caché aux dames
  };
}

/** Rafles possibles depuis `from` (toutes, même les plus courtes). */
function captures(board: Piece[], from: number, piece: Piece): Move[] {
  const me = colorOf(piece)!;
  const king = isKing(piece);
  const out: Move[] = [];
  const empty = (i: number) => i !== -1 && (board[i] === "" || i === from); // la case de départ est libérée pendant la rafle
  const walk = (pos: number, path: number[], captured: number[]) => {
    let extended = false;
    const [r, c] = rc(pos);
    for (const [dr, dc] of DIRS) {
      let k = 1;
      // la dame glisse sur les cases vides jusqu'à la pièce à prendre ; le pion ne regarde que la case voisine
      while (king && empty(at(r + dr * k, c + dc * k))) k++;
      const over = at(r + dr * k, c + dc * k);
      if (over === -1 || !board[over] || colorOf(board[over]) === me || captured.includes(over)) continue;
      // cases où l'on peut se poser derrière : une seule pour le pion, toutes les cases vides pour la dame
      for (let j = k + 1; ; j++) {
        const land = at(r + dr * j, c + dc * j);
        if (!empty(land)) break;
        extended = true;
        walk(land, [...path, land], [...captured, over]);
        if (!king) break;
      }
    }
    if (!extended && captured.length) out.push({ path, captured });
  };
  walk(from, [from], []);
  return out;
}

/** Déplacements simples (sans prise) depuis `from`. */
function steps(board: Piece[], from: number, piece: Piece): Move[] {
  const [r, c] = rc(from);
  const forward = piece === "w" ? -1 : 1;
  const out: Move[] = [];
  for (const [dr, dc] of DIRS) {
    if (!isKing(piece) && dr !== forward) continue;
    for (let k = 1; ; k++) {
      const to = at(r + dr * k, c + dc * k);
      if (to === -1 || board[to] !== "") break;
      out.push({ path: [from, to], captured: [] });
      if (!isKing(piece)) break;
    }
  }
  return out;
}

/** Tous les coups permis à cette couleur (prise obligatoire et maximale). */
export function legalMoves(board: Piece[], color: Color): Move[] {
  const mine = board.flatMap((p, i) => (colorOf(p) === color ? [i] : []));
  const caps = mine.flatMap((i) => captures(board, i, board[i]));
  if (caps.length) {
    const most = Math.max(...caps.map((m) => m.captured.length));
    return caps.filter((m) => m.captured.length === most);
  }
  return mine.flatMap((i) => steps(board, i, board[i]));
}

/** Joue le coup : retire les pièces prises, promeut le pion arrivé au bout. */
export function applyMove(board: Piece[], m: Move): Piece[] {
  const b = [...board];
  const from = m.path[0], to = m.path.at(-1)!;
  let piece = b[from];
  b[from] = "";
  for (const x of m.captured) b[x] = "";
  const [r] = rc(to);
  if (piece === "w" && r === 0) piece = "W";
  if (piece === "b" && r === N - 1) piece = "B";
  b[to] = piece;
  return b;
}

const samePath = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Nouvel état, ou null si le coup n'est pas permis. `move` : { path: [départ, arrivée, …] }. */
export function play(state: DamesState, move: unknown, player: string): DamesState | null {
  if (state.winner || state.turn !== player) return null;
  const path = (move as { path?: unknown } | null)?.path;
  if (!Array.isArray(path) || path.length < 2 || !path.every((x) => Number.isInteger(x))) return null;
  const color = state.colors[player];
  const m = legalMoves(state.board, color).find((x) => samePath(x.path, path as number[]));
  if (!m) return null;
  const other = Object.keys(state.colors).find((p) => p !== player)!;
  const board = applyMove(state.board, m);
  const pawnMoved = !isKing(state.board[m.path[0]]);
  const quiet = m.captured.length || pawnMoved ? 0 : state.quiet + 1;
  const s: DamesState = {
    ...state, board, turn: other, last: m.path, quiet,
    taken: { ...state.taken, [player]: (state.taken[player] ?? 0) + m.captured.length },
  };
  if (!legalMoves(board, state.colors[other]).length) s.winner = player; // l'adversaire est bloqué ou n'a plus de pièces
  else if (quiet >= 50) s.winner = "draw";
  return s;
}
