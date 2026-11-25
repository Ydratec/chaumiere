// Icônes en trait, 24×24, couleur = currentColor (interface « autocollants » : formes simples, trait épais).
const PATHS = {
  home: "M4 11l8-7 8 7v9h-5v-6H9v6H4z",
  chat: "M5 5h14v10H10l-5 4z",
  cards: "M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zM8.5 8.5h.01M15.5 15.5h.01M12 12h.01",
  users: "M2.5 6l3.5 2.5a7 7 0 0 1 5.5 0L15 6v7a6.5 6.5 0 0 1-12.5 0zM16 5l2.5 1.8a5 5 0 0 1 3.5 0V12M22 12a5 5 0 0 1-4 4.9",
  user: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1-4 4-6 8-6s7 2 8 6",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  farm: "M3 21V10l5 3V10l5 3V6h5l3 15z",
  swap: "M4 8h14m-4-4 4 4-4 4M20 16H6m4-4-4 4 4 4",
  smile: "M4 4l4.5 3.2a9 9 0 0 1 7 0L20 4v9a8 8 0 0 1-16 0zM9.5 11h.01M14.5 11h.01M10 15q2 2.5 4 0",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  back: "M19 12H5m5-5-5 5 5 5",
  deck: "M7.5 3h9A2.5 2.5 0 0 1 19 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5v-13A2.5 2.5 0 0 1 7.5 3zM12 8l2.2 4L12 16l-2.2-4z",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7l-1-3h-5z",
  scroll: "M7 4h11a2 2 0 0 1 2 2v1h-4M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7M7 4a2 2 0 0 1 2 2v12M12 10h3M12 14h3",
  camera: "M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
