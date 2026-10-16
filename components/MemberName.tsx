"use client";

import { Eye, EyeOff } from "lucide-react";
import type { Member } from "@/lib/types";
import { initialsOf, shortName } from "@/lib/display";
import { usePrivacyScreen } from "@/lib/privacyScreen";

/** A member's name in the console — or her initials, behind the privacy screen. */
export default function MemberName({
  member,
  full = false,
  className = "",
}: {
  member: Member;
  /** The whole name, for her own page; otherwise "Meera N.". */
  full?: boolean;
  className?: string;
}) {
  const [hidden] = usePrivacyScreen();
  if (hidden) {
    return (
      <span className={`font-mono tracking-wide ${className}`} title="Privacy screen is on">
        {initialsOf(member)}
      </span>
    );
  }
  return <span className={className}>{full ? member.name : shortName(member)}</span>;
}

/** The switch, for the console's sidebar and its phone header. */
export function PrivacyScreenSwitch({ compact = false }: { compact?: boolean }) {
  const [on, set] = usePrivacyScreen();
  const Icon = on ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      aria-pressed={on}
      title={
        on
          ? "Privacy screen on: initials instead of names in lists and headers. Tap to show names."
          : "Showing names. Turn on the privacy screen when someone can see your screen."
      }
      className={
        compact
          ? "tap inline-flex items-center justify-center rounded-xl px-2.5 text-ink-soft hover:bg-paper-sunk hover:text-ink"
          : "inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink"
      }
    >
      <Icon size={compact ? 16 : 13} />
      {compact ? <span className="sr-only">Privacy screen</span> : on ? "Privacy screen on" : "Privacy screen"}
    </button>
  );
}
