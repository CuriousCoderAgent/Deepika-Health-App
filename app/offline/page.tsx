import { CloudOff } from "lucide-react";

export const metadata = { title: "Offline — Deepika Wellness" };

/**
 * What the service worker shows when the network is unreachable.
 *
 * Deliberately not a cached copy of the app. Showing the real screens without
 * being able to load or save anything would be worse than saying so plainly —
 * she would log something, believe it was recorded, and lose it.
 */
export default function Offline() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-8 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-paper-sunk text-ink-faint">
        <CloudOff size={22} strokeWidth={1.8} />
      </span>
      <h1 className="mt-5 font-display text-[1.6rem] leading-tight">You are offline</h1>
      <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-ink-soft">
        Nothing is lost. Open this again once you have signal and everything
        will be where you left it.
      </p>
    </main>
  );
}
