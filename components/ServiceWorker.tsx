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

  return null;
}
