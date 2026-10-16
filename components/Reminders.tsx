"use client";

import { Bell, Loader2 } from "lucide-react";
import { usePushReminders } from "@/lib/usePushReminders";
import type { Slot } from "@/lib/reminders";

const CHOICES: { value: Slot | "off"; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "morning", label: "Mornings" },
  { value: "evening", label: "Evenings" },
];

/** Her reminder setting, on the account page. Off until she turns it on. */
export default function Reminders() {
  const { support, enabled, slot, busy, error, enable, disable } = usePushReminders();
  if (support === "checking" || support === "unavailable") return null;

  const current: Slot | "off" = enabled ? slot : "off";

  return (
    <section className="mt-3 rounded-2xl border border-ink-line bg-paper-card p-4" aria-labelledby="reminders-title">
      <div className="flex items-start gap-3">
        <Bell size={17} className="mt-0.5 shrink-0 text-effort-stretch" />
        <div className="min-w-0 flex-1">
          <p id="reminders-title" className="text-[15px] font-medium">
            Check-in reminders
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">
            One gentle nudge a day at most — never on a day you&rsquo;ve already
            checked in, and fewer if you go quiet for a while.
          </p>
        </div>
      </div>

      {support === "ready" && (
        <div role="group" aria-label="When to remind you" className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-paper-sunk p-1">
          {CHOICES.map((c) => (
            <button
              key={c.value}
              disabled={busy}
              aria-pressed={current === c.value}
              onClick={() => (c.value === "off" ? disable() : enable(c.value))}
              className={`tap rounded-lg text-[14px] transition-colors disabled:opacity-60 ${
                current === c.value ? "bg-paper-card font-medium text-ink shadow-card" : "text-ink-soft hover:text-ink"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      {busy && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-faint" role="status">
          <Loader2 size={13} className="animate-spin" /> Saving…
        </p>
      )}

      {support === "install-first" && (
        <p className="mt-3 rounded-xl bg-paper-sunk/70 p-3 text-[13px] leading-relaxed text-ink-soft">
          On an iPhone, add the app to your Home Screen first — tap Safari&rsquo;s
          Share button (the square with an arrow), then &ldquo;Add to Home
          Screen&rdquo; — and turn reminders on from there.
        </p>
      )}
      {support === "blocked" && (
        <p className="mt-3 rounded-xl bg-paper-sunk/70 p-3 text-[13px] leading-relaxed text-ink-soft">
          Notifications are switched off for this app in your phone&rsquo;s
          settings. Allow them there, then come back to choose a time.
        </p>
      )}
      {support === "unsupported" && (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-faint">
          This browser can&rsquo;t show reminders. The app installed on your
          phone can.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {error}
        </p>
      )}

      {support === "ready" && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-ink-faint">
          Mornings arrive around 7:30, evenings around 7:30 pm. The message
          never mentions anything about your health, because anyone can see a
          lock screen.
        </p>
      )}
    </section>
  );
}
