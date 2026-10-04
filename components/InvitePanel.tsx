"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, UserPlus } from "lucide-react";
import { BRAND } from "@/lib/brand";

/**
 * How Deepika brings a member in.
 *
 * The whole reason sign-up exists is that she should not have to mint twenty
 * usernames by hand. This gives her the one thing she actually does — a message
 * she can send — already written, with the link and the join code in it, and a
 * button that opens it straight in WhatsApp.
 */
export default function InvitePanel({ startOpen }: { startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [info, setInfo] = useState<{ signupOpen: boolean; code: string | null } | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/coach/invite", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setInfo(b))
      .catch(() => {});
  }, []);

  const message =
    `Hi! I'd like you to join ${BRAND}, the app I coach through. ` +
    `Open ${origin} and tap "Create your account".` +
    (info?.code ? ` The join code is ${info.code}.` : "") +
    ` Choose a username and a password, then answer a few questions about you.`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the text is on screen to select by hand */
    }
  }

  return (
    <div className="card mt-6 p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap flex w-full items-center gap-2 text-left text-[15px] font-medium"
      >
        <UserPlus size={16} className="text-effort-stretch" />
        Invite someone
        <span className="ml-auto text-[13px] font-normal text-ink-faint">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-3">
          {info && !info.signupOpen ? (
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Sign-up isn&rsquo;t available on this deployment, because there is nowhere to store a
              new account. Members would have to be added by whoever runs it.
            </p>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-ink-soft">
                Send this to a member. She creates her own account, so nobody has to type a password
                into WhatsApp.
              </p>
              <p className="mt-3 select-all rounded-xl bg-paper-sunk p-3 text-[14px] leading-relaxed">
                {message}
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
              {info && !info.code && (
                <p className="mt-3 rounded-xl bg-attention-tint p-3 text-[12px] leading-relaxed text-ink-soft">
                  <span className="font-medium text-attention">Sign-up is open to anyone with the link.</span>{" "}
                  To limit it to people you invite, set a join code (<span className="font-mono">SIGNUP_CODE</span>)
                  in the deployment settings, and it will appear in this message automatically.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
