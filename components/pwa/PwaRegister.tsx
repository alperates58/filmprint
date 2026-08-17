"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let registrationRef: ServiceWorkerRegistration | null = null;

    const handleLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          registrationRef = registration;
          console.log("[PWA] ServiceWorker registered with scope:", registration.scope);

          // Check for immediate update on page load
          registration.update().catch(() => {});

          // Handle new service worker installation
          registration.onupdatefound = () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.onstatechange = () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[PWA] New content available; triggering skipWaiting.");
                  newWorker.postMessage("SKIP_WAITING");
                }
              };
            }
          };
        })
        .catch((error) => {
          console.error("[PWA] ServiceWorker registration failed:", error);
        });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && registrationRef) {
        registrationRef.update().catch(() => {});
      }
    };

    window.addEventListener("load", handleLoad);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("load", handleLoad);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
