// Médaille de podium : un petit autocollant rond (or, argent, bronze) avec le rang, à la place des emoji.
const COLORS = ["#FFC93C", "#D5DCE3", "#E2A070"];

export function Medal({ rank, size = 22 }: { rank: number; size?: number }) {
  if (rank > 2) return null;
  return (
    <span
      aria-label={`${rank + 1}${rank ? "e" : "er"}`}
      style={{ width: size, height: size, background: COLORS[rank], fontSize: size * 0.55 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink align-middle font-display font-extrabold leading-none text-ink"
    >
      {rank + 1}
    </span>
  );
}
