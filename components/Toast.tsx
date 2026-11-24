"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A short confirmation that something was saved, with a way to take it back.
 *
 * One at a time, near the thumb, gone in a few seconds. It exists because
 * marking an action done no longer leaves the Today screen — so the "that was
 * recorded" moment, and the chance to undo a mis-tap, have to come to her.
 */
type Shown = { id: number; text: string; action?: { label: string; run: () => void } };

const EVENT = "app-toast";

export function toast(text: string, action?: { label: string; run: () => void }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { text, action } }));
}

/**
 * `console` is for Deepika's side, which has no phone shell to sit inside: it
 * is pinned to the window, above the bottom bar on a phone and clear of the
 * sidebar on a desktop.
 */
export default function Toaster({ console: inConsole = false }: { console?: boolean }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const show = (e: Event) => {
      const { text, action } = (e as CustomEvent).detail as Omit<Shown, "id">;
      window.clearTimeout(timer.current);
      setShown({ id: Date.now(), text, action });
      // Longer when there is something to press.
      timer.current = window.setTimeout(() => setShown(null), action ? 6500 : 3500);
    };
    window.addEventListener(EVENT, show);
    return () => {
      window.removeEventListener(EVENT, show);
      window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      role="status"
      className={`pointer-events-none inset-x-0 z-40 flex justify-center px-4 ${
        inConsole
          ? "fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:bottom-6 lg:left-60"
          : "absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"
      }`}
    >
      {shown && (
        <div
          key={shown.id}
          className="pointer-events-auto flex max-w-full animate-rise items-center gap-1 rounded-2xl bg-ink py-1 pl-4 pr-1.5 text-[14px] text-white shadow-lift"
        >
          <span className="min-w-0 py-2 leading-snug">{shown.text}</span>
          {shown.action ? (
            <button
              onClick={() => {
                shown.action!.run();
                window.clearTimeout(timer.current);
                setShown(null);
              }}
              className="tap shrink-0 rounded-xl px-3 font-medium text-effort-min underline underline-offset-2"
            >
              {shown.action.label}
            </button>
          ) : (
            <span className="w-2.5" />
          )}
        </div>
      )}
    </div>
  );
}
