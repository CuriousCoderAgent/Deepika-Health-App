"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { usePushReminders } from "@/lib/usePushReminders";
import InstallPrompt from "@/components/InstallPrompt";

const DISMISSED = "reminder-prompt-dismissed";

/**
 * A one-time offer of reminders, made on Today after she has checked in —
 * the moment she has just seen what a check-in is, rather than on first
 * launch, when a permission prompt is the fastest way to be refused forever.
 * "Not now" means not again; the setting stays on her account page.
 */
export default function ReminderPrompt({
  checkedInToday,
  preferred,
}: {
  checkedInToday: boolean;
  /** The time of day she chose for checking in when she joined. */
  preferred?: "morning" | "evening";
}) {
  const { support, enabled, busy, error, enable } = usePushReminders();
  const [hidden, setHidden] = useState(true);
  const [done, setDone] = useState(false);
  // Said "no thanks" just now: offering something else in the same breath
  // would be asking again. The Home Screen can wait for another visit.
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(DISMISSED) === "1");
    } catch {
      setHidden(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      /* fine — it just may ask again */
    }
    setHidden(true);
  };

  if (declined) return null;
  if (done) {
    return (
      <p role="status" className="mt-3 rounded-2xl bg-effort-tint px-4 py-3 text-[13px] text-effort-stretch">
        Done. You can change or stop reminders from your account page.
      </p>
    );
  }
  if (!checkedInToday || support === "checking") return null;
  // One offer at a time. When reminders are not the thing to offer — already
  // on, already answered, or not possible until the app is on the Home
  // Screen — the Home Screen is.
  if (
    hidden ||
    enabled ||
    support !== "ready" ||
    typeof Notification === "undefined" ||
    Notification.permission !== "default"
  ) {
    return <InstallPrompt />;
  }

  return (
    <div className="card mt-3 p-4">
      <div className="flex items-start gap-3">
        <Bell size={17} className="mt-0.5 shrink-0 text-effort-stretch" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">Would a reminder help?</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">
            One gentle nudge a day to check in — never once you already have.
            {preferred && ` You said ${preferred}s suit you best.`}
          </p>
        </div>
        <button
          onClick={() => {
            dismiss();
            setDeclined(true);
          }}
          aria-label="No thanks"
          className="tap -mr-2 -mt-2 flex shrink-0 items-center justify-center rounded-lg text-ink-faint hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(preferred === "evening" ? (["evening", "morning"] as const) : (["morning", "evening"] as const)).map((s, i) => (
          <button
            key={s}
            disabled={busy}
            onClick={async () => {
              await enable(s);
              if (Notification.permission === "granted") {
                dismiss();
                setDone(true);
              }
            }}
            className={`tap rounded-xl text-[14px] font-medium disabled:opacity-60 ${
              i === 0 && preferred
                ? "bg-effort-stretch text-white"
                : "bg-paper-sunk text-ink hover:bg-ink-line"
            }`}
          >
            {s === "morning" ? "Mornings" : "Evenings"}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
