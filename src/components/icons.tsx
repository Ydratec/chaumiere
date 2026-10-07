// Icônes en trait, 24×24, couleur = currentColor ; thème chat (oreilles, patte, museau).
const PATHS = {
  home: "M4 4l4.5 3.2a9 9 0 0 1 7 0L20 4v9a8 8 0 0 1-16 0z",
  chat: "M4 11a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-7l-4 3v-3H6a2 2 0 0 1-2-2zM6 9V4.5l3 2.2M18 9V4.5l-3 2.2",
  cards: "M12 20c-3 0-5.5-1.7-5.5-4 0-2.2 3-5 5.5-5s5.5 2.8 5.5 5c0 2.3-2.5 4-5.5 4zM5 11.5a1.6 1.6 0 1 0 0-.01M9 6.8a1.6 1.6 0 1 0 0-.01M15 6.8a1.6 1.6 0 1 0 0-.01M19 11.5a1.6 1.6 0 1 0 0-.01",
  users: "M2.5 6l3.5 2.5a7 7 0 0 1 5.5 0L15 6v7a6.5 6.5 0 0 1-12.5 0zM16 5l2.5 1.8a5 5 0 0 1 3.5 0V12M22 12a5 5 0 0 1-4 4.9",
  user: "M7 4.5l2.5 1.8a5.5 5.5 0 0 1 5 0L17 4.5V10a5 5 0 0 1-10 0zM4.5 21c0-3.5 3.4-5.5 7.5-5.5s7.5 2 7.5 5.5",
  farm: "M12 21v-8M12 13c0-4-3-7-7-7 0 4 3 7 7 7zM12 13c0-4 3-7 7-7 0 4-3 7-7 7zM5 21h14",
  swap: "M4 8h14m-4-4 4 4-4 4M20 16H6m4-4-4 4 4 4",
  smile: "M4 4l4.5 3.2a9 9 0 0 1 7 0L20 4v9a8 8 0 0 1-16 0zM9.5 11h.01M14.5 11h.01M10 15q2 2.5 4 0",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  back: "M19 12H5m5-5-5 5 5 5",
  camera: "M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
