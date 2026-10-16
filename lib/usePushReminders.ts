"use client";

import { useEffect, useState } from "react";
import type { Slot } from "./reminders";

/**
 * Turning check-in reminders on and off on this device.
 *
 * "unavailable" means this deployment has nowhere to keep a subscription
 * (no database), so the option is simply not shown. "install-first" is an
 * iPhone in Safari: Apple only allows web notifications once the app has been
 * added to the Home Screen.
 */
export type PushSupport =
  | "checking"
  | "unavailable"
  | "unsupported"
  | "install-first"
  | "blocked"
  | "ready";

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url + "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export function usePushReminders() {
  const [support, setSupport] = useState<PushSupport>("checking");
  const [enabled, setEnabled] = useState(false);
  const [slot, setSlot] = useState<Slot>("evening");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const capable = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!capable) {
        setSupport(isIOS() && !isStandalone() ? "install-first" : "unsupported");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      const q = sub ? `?endpoint=${encodeURIComponent(sub.endpoint)}` : "";
      const res = await fetch(`/api/push${q}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok || !body.available) {
        setSupport("unavailable");
        return;
      }
      setPublicKey(body.publicKey);
      if (body.slot === "morning" || body.slot === "evening") setSlot(body.slot);
      setEnabled(Boolean(sub && body.thisDevice));
      setSupport(Notification.permission === "denied" ? "blocked" : "ready");
    })().catch(() => {
      if (!cancelled) setSupport("unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** On, or on at a different time. Asks the browser's permission first. */
  async function enable(chosen: Slot) {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") setSupport("blocked");
        return;
      }
      const reg = await withTimeout(navigator.serviceWorker.ready, 10_000);
      const key = keyBytes(publicKey);
      let sub = await reg.pushManager.getSubscription();
      if (sub && !sameKey(sub.options.applicationServerKey, key)) {
        await sub.unsubscribe();
        sub = null;
      }
      sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const json = sub.toJSON();
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, slot: chosen }),
      });
      if (!res.ok) throw new Error("save failed");
      setSlot(chosen);
      setEnabled(true);
    } catch {
      setError("Reminders couldn't be turned on here. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      const res = await fetch("/api/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub?.endpoint }),
      });
      if (!res.ok) throw new Error("delete failed");
      await sub?.unsubscribe().catch(() => {});
      setEnabled(false);
    } catch {
      setError("Reminders couldn't be turned off just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return { support, enabled, slot, busy, error, enable, disable };
}
