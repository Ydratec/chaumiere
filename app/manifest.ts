import type { MetadataRoute } from "next";

// Rend l'app installable. `scope: "/"` : sur l'écran d'accueil, toutes les pages restent dans l'app
// (sinon iOS ouvre les pages « hors périmètre » dans une fenêtre Safari par-dessus).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chaumière",
    short_name: "Chaumière",
    description: "Une question par jour entre amis",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f6fb",
    theme_color: "#f6f6fb",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
