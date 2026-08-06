"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    const productionHost =
      window.location.hostname === "akipasa.com" ||
      window.location.hostname === "www.akipasa.com";
    if ("serviceWorker" in navigator && productionHost)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
