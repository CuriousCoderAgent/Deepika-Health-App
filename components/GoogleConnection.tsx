"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import GoogleMark from "@/components/GoogleMark";

/** How she signs in, as GET /api/account reports it. */
export interface SignInInfo {
  /** False when this is not an account that can be changed from here. */
  stored: boolean;
  hasPassword: boolean;
  google: {
    /** Whether Google sign-in is switched on for this deployment. */
    available: boolean;
    /** The Google account connected to hers, or null. */
    email: string | null;
  };
}

/** What to say after coming back from Google. One of a fixed list — see
 *  app/api/auth/google/callback. */
const NOTICES: Record<string, { text: string; problem: boolean }> = {
  connected: { text: "Google is connected. You can sign in with it from now on.", problem: false },
  "in-use": {
    text: "That Google account already opens a different account here, so it wasn’t connected. Nothing was changed.",
    problem: true,
  },
  password: { text: "That isn’t your current password. Nothing was changed.", problem: true },
  cancelled: { text: "Cancelled. Nothing was changed.", problem: false },
  unverified: {
    text: "Google hasn’t confirmed that email address yet, so it can’t be connected. Nothing was changed.",
    problem: true,
  },
  failed: { text: "That didn’t go through. Nothing was changed.", problem: true },
  unavailable: { text: "Google can’t be connected to this account. Nothing was changed.", problem: true },
};

/**
 * Signing in with Google, on her account screen.
 *
 * Connecting asks for her current password first, for the same reason
 * changing it does: a phone left unlocked on a table must not be enough for
 * someone to connect their own Google account to hers and keep a way in.
 *
 * Disconnecting is only offered when she has a password to fall back on.
 * Otherwise Google is the only way into the account, and taking it away would
 * be losing the account.
 */
export default function GoogleConnection({
  info,
  notice,
  onChanged,
}: {
  info: SignInInfo;
  /** The word after ?google= in the address, if she has just come back. */
  notice: string | null;
  onChanged: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!info.stored) return null;
  const connected = info.google.email !== null;
  if (!connected && !info.google.available) return null;

  const said = notice && Object.hasOwn(NOTICES, notice) ? NOTICES[notice] : null;

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/google", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Could not disconnect it. Nothing was changed.");
      } else {
        onChanged();
      }
    } catch {
      setError("Could not reach the server. Nothing was changed.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-3 rounded-2xl border border-ink-line bg-paper-card p-4">
      <p className="flex items-center gap-2 text-[15px] font-medium">
        <GoogleMark size={16} /> Sign in with Google
      </p>

      {said && (
        <p
          role={said.problem ? "alert" : "status"}
          className={`mt-3 rounded-xl px-3 py-2.5 text-[13px] leading-relaxed ${
            said.problem ? "bg-danger-tint text-danger" : "bg-effort-tint text-effort-stretch"
          }`}
        >
          {said.text}
        </p>
      )}

      {connected ? (
        <>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            Connected to <span className="break-all font-medium text-ink">{info.google.email || "your Google account"}</span>.{" "}
            {info.hasPassword
              ? "You can sign in with Google, or with your username and password."
              : "This is how you sign in — there is no password on this account. If you ever can’t use that Google account, Deepika can set you a temporary password."}
          </p>
          {info.hasPassword && (
            <button
              type="button"
              onClick={disconnect}
              disabled={busy}
              className="tap mt-3 inline-flex items-center gap-2 rounded-xl border border-ink-line px-3.5 text-[13px] font-medium text-ink-soft hover:bg-paper-sunk/50 disabled:opacity-40"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Disconnect Google
            </button>
          )}
        </>
      ) : (
        <form method="post" action="/api/auth/google">
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            Connect your Google account and you can sign in without typing your password. Google
            tells us your name and email address, and nothing else — and we tell Google nothing
            about what you log here.
          </p>
          <input type="hidden" name="intent" value="link" />
          <label htmlFor="google-password" className="label mt-3 block">
            Your password, so we know it&rsquo;s you
          </label>
          <input
            id="google-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="tap mt-1.5 w-full rounded-xl border border-ink-line bg-paper-card px-3.5 text-[16px] focus:border-effort-target focus:outline-none"
          />
          <button
            type="submit"
            disabled={!password}
            className="tap mt-3 flex w-full items-center justify-center gap-2.5 rounded-xl border border-ink-line bg-white text-sm font-medium text-ink transition-opacity hover:bg-paper-sunk/40 disabled:opacity-40"
          >
            <GoogleMark />
            Continue with Google
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2.5 text-[13px] leading-relaxed text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
