"use client";

import { Download } from "lucide-react";
import { useStore } from "@/lib/store";
import { dateKey } from "@/lib/calendar";
import { BRAND } from "@/lib/brand";

/**
 * A copy of her own data, as a file she keeps.
 *
 * The consent screen tells her she can ask for a copy; this means she does not
 * have to ask anyone. It is built in her browser from what the app already
 * holds for her, so nothing extra is fetched and nothing leaves her phone. It
 * deliberately contains only what she entered or received — not Deepika's
 * private notes, which the server never sends her (see lib/privacy.ts).
 */
export default function DownloadData() {
  const s = useStore();
  const id = s.activeMember?.id;

  function download() {
    if (!id) return;
    const mine = <T extends { memberId: string }>(rows: T[]) => rows.filter((r) => r.memberId === id);
    const data = {
      exportedOn: dateKey(),
      from: BRAND,
      profile: s.activeMember,
      actions: mine(s.actions),
      checkIns: mine(s.pulses),
      workouts: mine(s.workoutLogs),
      messages: mine(s.messages),
      sessions: mine(s.sessions),
      reports: mine(s.reports),
      food: mine(s.foodEntries),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${BRAND.toLowerCase()}-my-data-${data.exportedOn}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <button
      onClick={download}
      className="tap mt-3 flex w-full items-center gap-3 rounded-2xl border border-ink-line bg-paper-card px-4 text-left text-[14px] hover:bg-paper-sunk/50"
    >
      <Download size={17} className="shrink-0 text-effort-stretch" />
      <span>
        Download a copy of my data
        <span className="block text-[12px] text-ink-faint">Everything you have logged, as a file</span>
      </span>
    </button>
  );
}
