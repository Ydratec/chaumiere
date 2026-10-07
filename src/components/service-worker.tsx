"use client";

import { useEffect } from "react";

/** Enregistre le service worker (notifications) dès l'ouverture de l'app. */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
