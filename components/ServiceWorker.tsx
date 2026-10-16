"use client";

import { useEffect } from "react";

/**
 * Registers the service worker, which is what makes the app installable and
 * what lets the Android build open instantly on a poor connection.
 *
 * Registration is deferred until after load so it never competes with the
 * first paint for bandwidth on the 3G-ish connections this audience is often
 * on. Failure is silent on purpose: a browser that refuses to register one
 * still has a working app, and there is nothing a member could do about it.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* unsupported, blocked by policy, or private browsing */
      });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  // The browser offers to install the app exactly once per page load, often
  // before Today has even rendered. Held here, at the root, so the offer is
  // still there when components/InstallPrompt.tsx decides it is a good moment
  // — rather than as a banner on first launch, when it means nothing yet.
  useEffect(() => {
    const hold = (e: Event) => {
      e.preventDefault();
      (window as Window & { __installOffer?: Event }).__installOffer = e;
      window.dispatchEvent(new Event("install-offer"));
    };
    window.addEventListener("beforeinstallprompt", hold);
    return () => window.removeEventListener("beforeinstallprompt", hold);
  }, []);

  return null;
}
