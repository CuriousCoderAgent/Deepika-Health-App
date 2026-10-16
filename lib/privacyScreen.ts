"use client";

import { useSyncExternalStore } from "react";

/**
 * The coach console's privacy screen: initials instead of names, for when
 * Deepika is working somewhere her screen can be seen.
 *
 * Kept per device in localStorage, not in her account, because it is about the
 * place she is sitting rather than about her: on in the café on her phone,
 * off at her desk. Every component reading it updates together, and other
 * tabs follow through the storage event.
 */
const KEY = "coach-privacy-screen";
const EVENT = "coach-privacy-screen-change";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function usePrivacyScreen(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => false);
  const set = (next: boolean) => {
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* storage blocked — the switch just will not persist */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [on, set];
}
