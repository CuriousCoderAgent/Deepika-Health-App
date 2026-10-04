"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, MessageCircle } from "lucide-react";
import { BRAND } from "@/lib/brand";

/**
 * Deepika setting a member a temporary password.
 *
 * There is no email service, so a forgotten password is fixed by the person who
 * already knows her. The password is shown once, here, and Deepika passes it on;
 * the member then changes it from her own account page.
 */
export default function ResetPassword({ username, firstName }: { username: string; firstName: string }) {
  const [stage, setStage] = useState<"idle" | "confirm" | "busy" | "done">("idle");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function reset() {
    setStage("busy");
    setError(null);
    try {
      const res = await fetch("/api/coach/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not reset it. Nothing was changed.");
        setStage("idle");
        return;
      }
      setPassword(body.password);
      setStage("done");
    } catch {
      setError("Could not reach the server. Nothing was changed.");
      setStage("idle");
    }
  }

  const message =
    `Hi ${firstName}, here is a temporary ${BRAND} password: ${password}\n` +
    `Sign in with it, then change it from "Your account".`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  if (stage === "done") {
    return (
      <div className="card mt-4 p-4">
        <p className="label">Temporary password — shown once</p>
        <p className="mt-1.5 font-mono text-[20px] tracking-wide">{password}</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-faint">
          Her old password no longer works. This one stops mattering the moment she changes it.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={copy}
            className="tap inline-flex items-center gap-1.5 rounded-xl bg-paper-sunk px-3 text-[13px] hover:bg-ink-line"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy message"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tap inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 text-[13px] font-medium text-white"
          >
            <MessageCircle size={14} /> Send on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {stage === "confirm" ? (
        <div className="card p-4">
          <p className="text-[14px] leading-relaxed">
            Set a new temporary password for <span className="font-mono">{username}</span>? Her
            current one will stop working straight away.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={reset}
              className="tap rounded-xl bg-ink px-4 text-[13px] font-medium text-white"
            >
              Yes, reset it
            </button>
            <button
              onClick={() => setStage("idle")}
              className="tap rounded-xl bg-paper-sunk px-4 text-[13px] text-ink-soft hover:bg-ink-line"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setStage("confirm")}
          disabled={stage === "busy"}
          className="tap inline-flex items-center gap-1.5 rounded-xl bg-paper-sunk px-3 text-[13px] text-ink-soft hover:bg-ink-line hover:text-ink disabled:opacity-40"
        >
          <KeyRound size={14} /> {stage === "busy" ? "Resetting…" : "Reset her password"}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[13px] leading-relaxed text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
