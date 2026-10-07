import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.17.186.41", "192.168.1.101"],
  experimental: { serverActions: { bodySizeLimit: "3mb" } }, // photos de profil/salle (2 Mo max)
};

export default nextConfig;
