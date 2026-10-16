"use client";

import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";

const DISMISSED = "install-prompt-dismissed";

type Offer = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Held = Window & { __installOffer?: Offer };

const standalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Safari on an iPhone or iPad — the one place "Add to Home Screen" lives in
 *  the Share menu. In-app browsers (WhatsApp, Instagram) cannot do it, and
 *  their user agents leave out "Safari/", so they are not told to try. */
const iosSafari = () => {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
};

/**
 * "Keep it on your Home Screen", offered once she has checked in, never on
 * first launch. On Android the browser's own install dialog does the work; on
 * an iPhone there is no such dialog, so it says where the button is — and that
 * matters more there, because an iPhone only allows reminders for apps on the
 * Home Screen. Not shown at all inside the installed app.
 */
export default function InstallPrompt() {
  const [mode, setMode] = useState<"none" | "offer" | "ios">("none");

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED) === "1") return;
    } catch {
      return;
    }
    if (standalone()) return;
    const check = () => {
      if ((window as Held).__installOffer) setMode("offer");
    };
    check();
    if (iosSafari()) setMode("ios");
    window.addEventListener("install-offer", check);
    return () => window.removeEventListener("install-offer", check);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      /* fine — it may ask once more */
    }
    setMode("none");
  };

  if (mode === "none") return null;

  return (
    <div className="card mt-3 p-4">
      <div className="flex items-start gap-3">
        <Smartphone size={17} className="mt-0.5 shrink-0 text-effort-stretch" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">Keep it on your Home Screen</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">
            {mode === "ios" ? (
              <>
                Tap Safari&rsquo;s Share button (the square with an arrow), then
                &ldquo;Add to Home Screen&rdquo;. It opens like any other app, and
                reminders can be turned on from there.
              </>
            ) : (
              <>It opens like any other app — one tap, no browser tabs.</>
            )}
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Not now"
          className="tap -mr-2 -mt-2 flex shrink-0 items-center justify-center rounded-lg text-ink-faint hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
      {mode === "offer" && (
        <button
          onClick={async () => {
            const offer = (window as Held).__installOffer;
            if (!offer) return dismiss();
            await offer.prompt();
            await offer.userChoice.catch(() => null);
            (window as Held).__installOffer = undefined;
            dismiss();
          }}
          className="tap mt-3 w-full rounded-xl bg-paper-sunk text-[14px] font-medium text-ink hover:bg-ink-line"
        >
          Add to Home Screen
        </button>
      )}
    </div>
  );
}
