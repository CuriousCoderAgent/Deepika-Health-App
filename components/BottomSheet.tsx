"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Bottom sheet.
 *
 * Portals into `#sheet-root`, which lives inside the phone shell — so on a
 * desktop the sheet stays inside the phone frame instead of covering the
 * whole browser window, and on a real phone it fills the screen the way a
 * native sheet does.
 *
 * Behaviour it needs to get right, per the design review: dismissable by
 * backdrop tap, by the grab handle, by Escape; it traps nothing it shouldn't
 * but does return focus; and it honours prefers-reduced-motion, which the
 * global stylesheet already enforces on the transition.
 *
 * Two things here are easy to undo by accident, and both broke the Today
 * screen once it had two sheets:
 *
 *  - Focus moves with `preventScroll`. The panel is focused while it is still
 *    sliding up from below the frame, and a browser asked to focus something
 *    off-screen scrolls its ancestors to show it — including the phone frame,
 *    which is `overflow: hidden` and so can be scrolled by code but never
 *    scrolled back by a finger. The whole screen jumped up and stayed there.
 *  - A closed sheet is `invisible`, not merely transparent. Transparent
 *    buttons can still be reached with Tab, and focusing one does the same.
 *    It turns invisible only after the slide-down has finished, and turns
 *    visible at once on opening — not as a transition, because an element
 *    whose visibility is still at the start of one cannot take focus yet.
 *  - The effect that moves focus depends on `open` alone. `onClose` is nearly
 *    always an inline function, so depending on it re-ran the effect on every
 *    render of the page behind — handing focus back to that page and taking
 *    it again 30ms later, out of whatever she was typing in.
 *
 * The frame itself is `overflow: clip` as well (app/member/layout.tsx), which
 * cannot be scrolled by anything.
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setHost(document.getElementById("sheet-root"));
  }, []);

  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    returnFocusTo.current = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKey);
    // Give the sheet focus so screen readers and keyboards land inside it.
    const t = window.setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      returnFocusTo.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!host) return null;

  return createPortal(
    <div
      className={`absolute inset-0 z-50 flex flex-col justify-end ${
        open
          ? "pointer-events-auto visible opacity-100 transition-opacity duration-200"
          : "pointer-events-none invisible opacity-0 [transition:opacity_200ms,visibility_0s_linear_300ms]"
      }`}
      aria-hidden={!open}
    >
      <button
        aria-label="Close"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`safe-bottom relative max-h-[88%] overflow-y-auto overscroll-contain rounded-t-[1.5rem] bg-paper-card shadow-lift outline-none transition-transform duration-300 ease-[cubic-bezier(.16,.84,.44,1)] ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Grab handle — the affordance people reach for before they look for
            a close button. Tapping it dismisses too. */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="sticky top-0 z-10 flex w-full justify-center bg-paper-card/95 pb-1 pt-2.5 backdrop-blur"
        >
          <span className="h-1 w-9 rounded-full bg-ink-line" />
        </button>

        <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-1">
          <h2 className="text-[17px] font-semibold leading-snug">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="tap -mr-2 -mt-1.5 flex items-center justify-center rounded-lg text-ink-faint hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>,
    host
  );
}
