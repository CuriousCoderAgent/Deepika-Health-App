"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { BRAND } from "@/lib/brand";

/**
 * A member passing the app on to someone she knows.
 *
 * Deliberately plain: it opens her phone's own share sheet with a sentence and
 * a link, and nothing else. No referral codes, no rewards, nothing tracking who
 * she sent it to — a recommendation from a friend is worth something precisely
 * because it was not incentivised.
 */
export default function ShareApp() {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.origin;
    const text = `I've been using ${BRAND} for my health coaching and thought of you.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: BRAND, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* she closed the share sheet — nothing to do */
    }
  }

  return (
    <button
      onClick={share}
      className="tap mt-3 flex w-full items-center gap-3 rounded-2xl border border-ink-line bg-paper-card px-4 text-left text-[14px] hover:bg-paper-sunk/50"
    >
      {copied ? <Check size={17} className="shrink-0 text-effort-stretch" /> : <Share2 size={17} className="shrink-0 text-effort-stretch" />}
      <span>
        {copied ? "Link copied" : `Share ${BRAND} with a friend`}
        <span className="block text-[12px] text-ink-faint">Sends a link to the app, and nothing else</span>
      </span>
    </button>
  );
}
