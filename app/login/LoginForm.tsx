"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * One form for everyone. The account decides which surface you land on, so
 * nobody has to classify themselves before signing in.
 */
export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Something went wrong. Try again.");
        setBusy(false);
        return;
      }
      const { role } = await res.json();
      // Full navigation so the middleware and the server layout both see the
      // new cookie — the store is namespaced by account and has to be built
      // from the right session.
      window.location.assign(role === "coach" ? "/coach" : "/member");
    } catch {
      setError("Could not reach the server. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="username" className="label">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="tap mt-1.5 w-full rounded-xl border border-ink-line bg-paper-card px-3.5 text-[16px] focus:border-effort-target focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="tap mt-1.5 w-full rounded-xl border border-ink-line bg-paper-card px-3.5 text-[16px] focus:border-effort-target focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-tint px-3 py-2.5 text-[13px] text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !username.trim() || !password}
        className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-effort-stretch text-sm font-medium text-white transition-opacity disabled:opacity-40"
      >
        {busy && <Loader2 size={15} className="animate-spin" />}
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
