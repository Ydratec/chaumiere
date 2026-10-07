import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.17.186.41", "192.168.1.101"],
  experimental: { serverActions: { bodySizeLimit: "3mb" } }, // photos de profil/salle (2 Mo max)
  // Le service worker doit toujours être relu (sinon une ancienne version peut rester en cache).
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
};

export default nextConfig;
