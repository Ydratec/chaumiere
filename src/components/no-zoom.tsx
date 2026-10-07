"use client";

import { useEffect } from "react";

/** Safari iOS ignore `user-scalable=no` : on bloque nous-mêmes le geste de pincement. */
export function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop);
    return () => document.removeEventListener("gesturestart", stop);
  }, []);
  return null;
}
