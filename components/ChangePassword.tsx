"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

/** A member changing her own password. Needs the current one. */
export default function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const field =
    "tap mt-1.5 w-full rounded-xl border border-ink-line bg-paper-card px-3.5 text-[16px] focus:border-effort-target focus:outline-none";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next !== again) {
      // Checked here because a typo is exactly how someone ends up locked out.
      setError("Those two new passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not change it. Nothing was changed.");
      } else {
        setDone(true);
        setCurrent("");
        setNext("");
        setAgain("");
      }
    } catch {
      setError("Could not reach the server. Nothing was changed.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-2xl border border-ink-line bg-paper-card p-4">
      <p className="flex items-center gap-2 text-[15px] font-medium">
        <KeyRound size={16} className="text-effort-stretch" /> Change your password
      </p>
      <label htmlFor="pw-current" className="label mt-3 block">Current password</label>
      <input id="pw-current" type="password" autoComplete="current-password" value={current}
        onChange={(e) => setCurrent(e.target.value)} className={field} />
      <label htmlFor="pw-next" className="label mt-3 block">New password</label>
      <input id="pw-next" type="password" autoComplete="new-password" value={next}
        onChange={(e) => setNext(e.target.value)} className={field} />
      <label htmlFor="pw-again" className="label mt-3 block">New password, again</label>
      <input id="pw-again" type="password" autoComplete="new-password" value={again}
        onChange={(e) => setAgain(e.target.value)} className={field} />
      {error && <p role="alert" className="mt-2.5 text-[13px] leading-relaxed text-danger">{error}</p>}
      {done && <p role="status" className="mt-2.5 text-[13px] leading-relaxed text-effort-stretch">Password changed.</p>}
      <button
        type="submit"
        disabled={busy || !current || next.length < 8 || !again}
        className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-medium text-white transition-opacity disabled:opacity-30"
      >
        {busy && <Loader2 size={15} className="animate-spin" />}
        Change password
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
        At least 8 characters. If you forget it, Deepika can set you a temporary one.
      </p>
    </form>
  );
}
