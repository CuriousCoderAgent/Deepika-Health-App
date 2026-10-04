"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { memberCode } from "@/lib/display";
import { isSampleMember } from "@/lib/dailyPlan";
import InvitePanel from "@/components/InvitePanel";
import { EffortRamp } from "@/components/ui";
import type { EngagementState } from "@/lib/types";

/** Descriptive, never stigmatising. "Needs attention", not "Non-compliant". */
const ENGAGEMENT: Record<EngagementState, { label: string; cls: string }> = {
  strong: { label: "On plan", cls: "bg-effort-tint text-effort-stretch" },
  steady: { label: "Steady", cls: "bg-paper-sunk text-ink-soft" },
  slipping: { label: "Needs attention", cls: "bg-attention-tint text-attention" },
  quiet: { label: "Quiet lately", cls: "bg-attention-tint text-attention" },
};

const WHEN = (o: number) =>
  o === 0 ? "today" : o === 1 ? "tomorrow" : `in ${o} days`;

export default function MembersPage() {
  const { members, actions, radar, sessions, removeSampleMembers } = useStore();
  const [q, setQ] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const real = members.filter((m) => !isSampleMember(m.id)).length;
  const sample = members.length - real;

  const filtered = members.filter((m) =>
    memberCode(m).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-4xl leading-tight">Members</h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        {real === 0
          ? "No members yet. Invite the first one below."
          : real <= 20
            ? `The first cohort. ${real} of twenty places filled.`
            : `${real} members.`}
      </p>

      <InvitePanel startOpen={real === 0} />

      {sample > 0 && (
        <div className="card mt-4 border border-dashed border-ink-line p-4">
          <p className="text-[14px] font-medium">
            {sample === 1 ? "1 member here is" : `${sample} members here are`} sample data
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            They are fictional, kept so the console is not empty while you wait for real members.
            Remove them once your own cohort starts — it will not bring them back.
          </p>
          {confirmRemove ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  setRemoveError(null);
                  try {
                    await removeSampleMembers();
                    setConfirmRemove(false);
                  } catch (e) {
                    setRemoveError(e instanceof Error ? e.message : "Could not remove them.");
                  }
                }}
                className="tap rounded-xl bg-ink px-4 text-[13px] font-medium text-white"
              >
                Yes, remove the sample members
              </button>
              <button
                onClick={() => setConfirmRemove(false)}
                className="tap rounded-xl bg-paper-sunk px-4 text-[13px] text-ink-soft hover:bg-ink-line"
              >
                Keep them
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRemove(true)}
              className="tap mt-3 rounded-xl bg-paper-sunk px-3 text-[13px] text-ink-soft hover:bg-ink-line hover:text-ink"
            >
              Remove sample members
            </button>
          )}
          {removeError && (
            <p role="alert" className="mt-2 text-[13px] text-danger">
              {removeError}
            </p>
          )}
        </div>
      )}

      <div className="relative mt-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find by member ID"
          className="tap w-full rounded-xl border border-ink-line bg-paper-card pl-9 pr-3 text-sm placeholder:text-ink-faint focus:border-effort-target focus:outline-none"
        />
      </div>

      <div className="mt-6 space-y-2.5">
        {filtered.map((m) => {
          const mine = actions.filter((a) => a.memberId === m.id);
          const last7 = Array.from({ length: 7 }).map((_, i) => {
            const off = i - 6;
            const day = mine.filter((a) => a.dayOffset === off);
            return day.find((a) => a.completed === "stretch")
              ? "stretch"
              : day.find((a) => a.completed === "target")
              ? "target"
              : day.find((a) => a.completed === "minimum")
              ? "minimum"
              : null;
          });
          const flags = radar.filter((r) => r.memberId === m.id && !r.resolved);
          const next = sessions
            .filter((s) => s.memberId === m.id && s.status === "scheduled")
            .sort((a, b) => a.dayOffset - b.dayOffset)[0];
          const e = ENGAGEMENT[m.engagement];

          const chips = (
            <>
              {flags.length > 0 && (
                <span className="chip bg-paper-sunk text-ink-faint">
                  {flags.length} flag{flags.length > 1 ? "s" : ""}
                </span>
              )}
              <span className={`chip ${e.cls}`}>{e.label}</span>
            </>
          );

          return (
            <Link
              key={m.id}
              href={`/coach/members/${m.id}`}
              className="card block p-4 transition-shadow hover:shadow-lift"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-sm font-medium text-ink-soft">
                  {m.initials}
                </span>

                {/* Two short lines, each of which fits on a phone. This used to
                    be one sentence ("Week 5 · Stabilise · 1:1 coaching in 1d")
                    sharing a row with the chips, so on a 390px screen it was
                    squeezed to about 80px and broke one word to a line. */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="font-mono text-[15px] font-medium">{memberCode(m)}</p>
                    <span className="text-[13px] text-ink-faint">
                      {[m.age || null, m.city || null].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-ink-soft">
                    Week {m.week} · {m.phase}
                  </p>
                  {next && (
                    <p className="text-[13px] text-ink-faint">
                      {next.type} {WHEN(next.dayOffset)}
                    </p>
                  )}
                </div>

                <div className="hidden shrink-0 items-center gap-1 md:flex">
                  {last7.map((l, i) => (
                    <EffortRamp key={i} level={l as any} size="sm" />
                  ))}
                </div>

                <div className="hidden shrink-0 items-center gap-2 sm:flex">{chips}</div>
                <ChevronRight size={16} className="shrink-0 text-ink-faint" />
              </div>

              {/* Below sm the chips drop under the name instead of fighting it
                  for width. */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-14 sm:hidden">
                {chips}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
