"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import ChangePassword from "@/components/ChangePassword";
import GoogleConnection, { type SignInInfo } from "@/components/GoogleConnection";
import ShareApp from "@/components/ShareApp";
import DownloadData from "@/components/DownloadData";
import Reminders from "@/components/Reminders";

/**
 * Her account, and the one screen where she can take it all back.
 *
 * The deletion flow asks her to type her username rather than tapping a second
 * "are you sure". There is no undo and no backup she can ask us for, so the
 * confirmation should cost a moment of attention, not a reflex.
 */
export default function Account() {
  const { activeMember: m, session } = useStore();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const username = session?.sub ?? m.id;
  const canDelete = confirm.trim().toLowerCase() === username.toLowerCase();

  /* How she signs in — a password, Google, or both. Asked of the server
     rather than kept in her record: it is about the account, not her health,
     and Deepika has no use for it. Nothing is shown until it has answered. */
  const [signIn, setSignIn] = useState<SignInInfo | null>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const loadSignIn = useCallback(() => {
    // If it cannot be asked — offline, say — the page falls back to what it
    // showed before any of this existed: the password form, and no Google.
    const unknown: SignInInfo = { stored: false, hasPassword: true, google: { available: false, email: null } };
    fetch("/api/account", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : unknown))
      .then((info: SignInInfo) => setSignIn(info))
      .catch(() => setSignIn(unknown));
  }, []);
  useEffect(() => {
    loadSignIn();
    // Back from Google: say what happened, once, then take it out of the
    // address so a reload or a shared screenshot does not say it again.
    const params = new URLSearchParams(window.location.search);
    const word = params.get("google");
    if (word) {
      setGoogleNotice(word);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [loadSignIn]);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Could not delete the account. Nothing was removed.");
        setBusy(false);
        return;
      }
      // Clear the local mirror too, or the next person to open this browser
      // would find her data sitting in it after the server copy is gone.
      try {
        window.localStorage.clear();
      } catch {
        /* storage blocked; the server copy is already gone */
      }
      // A full page load, not router.push: it is what throws away the store
      // still holding her data in this tab.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/account-deleted");
    } catch {
      setError("Could not reach the server. Nothing was removed.");
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pb-10 pt-6">
      <Link
        href="/member"
        className="tap -ml-1 inline-flex items-center gap-1.5 text-[13px] text-ink-soft"
      >
        <ArrowLeft size={15} /> Today
      </Link>

      <h1 className="mt-4 font-display text-[1.6rem] leading-tight">Your account</h1>

      <div className="mt-5 rounded-2xl border border-ink-line bg-paper-card p-4">
        <p className="label">Signed in as</p>
        <p className="mt-1 text-[15px] font-medium">{m.name}</p>
        <p className="mt-0.5 font-mono text-[13px] text-ink-soft">{username}</p>
      </div>

      <Link
        href="/privacy"
        className="tap mt-3 flex items-center gap-3 rounded-2xl border border-ink-line bg-paper-card px-4 text-[14px] hover:bg-paper-sunk/50"
      >
        <ShieldCheck size={17} className="shrink-0 text-effort-stretch" />
        <span>
          What we store, and why
          <span className="block text-[12px] text-ink-faint">Privacy policy</span>
        </span>
      </Link>

      <Reminders />

      <DownloadData signIn={signIn} />

      <ShareApp />

      {signIn && (
        <GoogleConnection
          info={signIn}
          notice={googleNotice}
          onChanged={() => {
            setGoogleNotice(null);
            loadSignIn();
          }}
        />
      )}

      {!signIn ? null : signIn.stored && !signIn.hasPassword ? (
        <div className="mt-3 rounded-2xl border border-ink-line bg-paper-card p-4">
          <p className="flex items-center gap-2 text-[15px] font-medium">
            <KeyRound size={16} className="text-effort-stretch" /> Password
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            You sign in with Google, so there is no password on this account to change.
          </p>
        </div>
      ) : (
        <ChangePassword />
      )}

      <div className="mt-8 rounded-2xl border border-danger/25 bg-danger-tint/40 p-4">
        <p className="flex items-center gap-2 text-[15px] font-medium text-danger">
          <Trash2 size={16} /> Delete your account
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          This removes your account and everything in it — what you have logged,
          your check-ins, your messages with Deepika, and any reports you
          uploaded. It happens straight away and it cannot be undone. Deepika
          keeps no separate copy.
        </p>

        <label htmlFor="confirm-delete" className="label mt-4 block">
          Type <span className="font-mono normal-case text-ink">{username}</span> to confirm
        </label>
        <input
          id="confirm-delete"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          className="tap mt-1.5 w-full rounded-xl border border-ink-line bg-paper-card px-3.5 text-[16px] focus:border-danger focus:outline-none"
        />

        {error && (
          <p role="alert" className="mt-2.5 text-[13px] leading-relaxed text-danger">
            {error}
          </p>
        )}

        <button
          onClick={remove}
          disabled={!canDelete || busy}
          className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-danger text-sm font-medium text-white transition-opacity disabled:opacity-30"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          {busy ? "Deleting…" : "Delete my account and all my data"}
        </button>
      </div>

      <p className="mt-5 text-[12px] leading-relaxed text-ink-faint">
        Changed your mind about the app but not about the coaching? Talk to
        Deepika first — she can pause your plan without any of this being lost.
      </p>
    </div>
  );
}
