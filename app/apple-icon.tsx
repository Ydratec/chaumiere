import { ImageResponse } from "next/og";

// Icône de l'écran d'accueil iOS (PNG obligatoire) : le logo chat, comme app/icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <svg width="140" height="140" viewBox="0 0 48 48">
          <path d="M7 24 8 5l12 7zM41 24 40 5 28 12z" fill="#4f46e5" stroke="#4f46e5" strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="24" cy="28" rx="17" ry="15" fill="#4f46e5" />
          <circle cx="17" cy="26" r="2.6" fill="#fff" />
          <circle cx="31" cy="26" r="2.6" fill="#fff" />
          <path d="M22 31h4l-2 2.4z" fill="#fff" />
        </svg>
      </div>
    ),
    size,
  );
}
