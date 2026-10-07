import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { NoZoom } from "@/src/components/no-zoom";
import { ServiceWorker } from "@/src/components/service-worker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chaumière",
  description: "Une question par jour entre amis",
  appleWebApp: { capable: true, title: "Chaumière", statusBarStyle: "default" },
};

// Une app, pas une page web : pas de zoom (pincement ou double tap).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f6f6fb",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const hue = Number((await cookies()).get("hue")?.value);
  const style = (hue >= 0 && hue <= 360 ? { "--h": hue } : {}) as CSSProperties;
  return (
    <html
      lang="fr"
      style={style}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NoZoom />
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
