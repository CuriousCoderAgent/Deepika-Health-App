"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import MemberName from "@/components/MemberName";
import { ENGAGEMENT, matchesMember } from "@/lib/display";
import { isSampleMember } from "@/lib/dailyPlan";
import { daysBetween } from "@/lib/calendar";
import { lastDays, lastSeen, lastSeenLabel } from "@/lib/dayView";
import InvitePanel from "@/components/InvitePanel";
import { ConsistencyBand } from "@/components/ui";
import type { Member } from "@/lib/types";

const WHEN = (o: number) =>
  o === 0 ? "today" : o === 1 ? "tomorrow" : `in ${o} days`;

const FILTERS = ["all", "attention", "quiet", "new"] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL: Record<Filter, string> = {
  all: "Everyone",
  attention: "Needs attention",
  quiet: "Quiet",
  new: "New this week",
};

/**
 * The roster.
 *
 * The Radar is the list ordered by who needs her; this is the list in name
 * order, for when she already knows who she is looking for — so the people
 * come first on the page, with inviting and the sample-data notice around
 * them rather than above them. Each row says when she was last here in words,
 * because "Week 5 · Stabilise" does not tell Deepika whether to worry.
 */
export default function MembersPage() {
  const {
    members,
    actions,
    pulses,
    messages,
    foodEntries,
    workoutLogs,
    radar,
    sessions,
    removeSampleMembers,
  } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const real = members.filter((m) => !isSampleMember(m.id)).length;
  const sample = members.length - real;

  // Arriving from a Radar tile ("Gone quiet") opens on that filter.
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("filter");
    if (FILTERS.includes(f as Filter)) setFilter(f as Filter);
  }, []);

  const data = { actions, pulses, messages, foodEntries, workoutLogs };
  const attentionFlags = (id: string) =>
    radar.filter((r) => r.memberId === id && !r.resolved && r.bucket === "attention").length;
  const isNew = (m: Member) =>
    Boolean(m.onboardedAt && m.anchorDate && daysBetween(m.onboardedAt, m.anchorDate) < 7);

  const inFilter: Record<Filter, (m: Member) => boolean> = {
    all: () => true,
    attention: (m) => attentionFlags(m.id) > 0,
    quiet: (m) => m.engagement === "quiet",
    new: isNew,
  };

  const shown = members
    .filter((m) => matchesMember(m, q) && inFilter[filter](m))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl leading-tight">Members</h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        {real === 0
          ? sample > 0
            ? "No members of your own yet — the ones below are samples."
            : "No members yet. Invite the first one below."
          : real <= 20
            ? `The first cohort. ${real} of twenty places filled.`
            : `${real} members.`}
      </p>

      <InvitePanel startOpen={members.length === 0} />

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find by name"
            aria-label="Find by name"
            className="tap w-full rounded-xl border border-ink-line bg-paper-card pl-9 pr-3 text-sm placeholder:text-ink-faint focus:border-effort-target focus:outline-none"
          />
        </div>
        <div role="group" aria-label="Show" className="scroll-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => {
            const n = members.filter(inFilter[f]).length;
            return (
              <button
                key={f}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`min-h-[40px] shrink-0 rounded-full px-3.5 text-[13px] transition-colors ${
                  filter === f ? "bg-ink text-white" : "bg-paper-sunk text-ink-soft hover:bg-ink-line hover:text-ink"
                }`}
              >
                {FILTER_LABEL[f]}
                <span className={`ml-1.5 font-mono text-[11px] ${filter === f ? "text-white/70" : "text-ink-faint"}`}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {shown.length === 0 && (
          <div className="card p-6 text-center">
            <p className="text-[14px] text-ink-soft">
              {members.length === 0
                ? "Nobody here yet."
                : q.trim()
                ? "Nobody by that name here."
                : filter === "quiet"
                ? "Nobody has gone quiet."
                : filter === "attention"
                ? "Nobody needs attention right now."
                : "Nobody joined in the last week."}
            </p>
            {(q.trim() || filter !== "all") && members.length > 0 && (
              <button
                onClick={() => {
                  setQ("");
                  setFilter("all");
                }}
                className="tap mt-1 text-[13px] text-effort-stretch underline underline-offset-2"
              >
                Show everyone
              </button>
            )}
          </div>
        )}

        {shown.map((m) => {
          const flags = radar.filter((r) => r.memberId === m.id && !r.resolved);
          const next = sessions
            .filter((s) => s.memberId === m.id && s.status === "scheduled" && s.dayOffset >= 0)
            .sort((a, b) => a.dayOffset - b.dayOffset)[0];
          const e = ENGAGEMENT[m.engagement];
          const seen = lastSeen(m.id, data);

          return (
            <Link
              key={m.id}
              href={`/coach/members/${m.id}`}
              className="card press block p-4 transition-shadow hover:shadow-lift"
            >
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-sm font-medium text-ink-soft">
                  {m.initials}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[15px] font-medium leading-snug">
                      <MemberName member={m} />
                    </p>
                    <span className={`chip ${e.cls}`}>{e.label}</span>
                    {isNew(m) && <span className="chip bg-effort-tint text-effort-stretch">New</span>}
                    {flags.length > 0 && (
                      <span className="chip bg-paper-sunk text-ink-soft">
                        {flags.length} on Radar
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] leading-snug text-ink-soft">
                    <span className={seen !== null && seen <= -3 ? "text-attention" : ""}>{lastSeenLabel(seen)}</span>
                    <span className="text-ink-faint">
                      {" "}
                      · Week {m.week} · {m.phase}
                      {m.city ? ` · ${m.city}` : ""}
                    </span>
                  </p>
                  {next && (
                    <p className="text-[13px] leading-snug text-ink-faint">
                      {next.type} {WHEN(next.dayOffset)}
                    </p>
                  )}
                </div>

                {/* Her fortnight at a glance: one square a day, today on the right. */}
                <div className="hidden w-40 shrink-0 md:block" title="Her last 14 days, today on the right">
                  <ConsistencyBand days={lastDays(m.id, 14, data)} compact />
                  <p className="mt-1 text-right font-mono text-[9px] uppercase tracking-wider text-ink-faint">14 days</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-faint" />
              </div>

              <div className="mt-3 pl-[3.4rem] md:hidden">
                <ConsistencyBand days={lastDays(m.id, 14, data)} compact />
              </div>
            </Link>
          );
        })}
      </div>

      {sample > 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-ink-line p-4">
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
    </div>
  );
}
