"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Check, SlidersHorizontal, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { bucketMeta } from "@/lib/radar";
import { memberCode } from "@/lib/display";
import { Sparkline } from "@/components/ui";
import type { DailyAction, Member, PulseEntry, RadarBucket, RadarEvent } from "@/lib/types";

const ORDER: RadarBucket[] = ["attention", "prepare", "celebrate", "admin"];

/**
 * The evidence behind a flag, drawn from the same data the rule evaluated —
 * not a fresh chart. Only meaningful for buckets where a trend is the point;
 * Prepare and Administrative are single facts, not trends, so they get none.
 */
function sparkFor(
  ruleId: string,
  mine: DailyAction[],
  myPulses: PulseEntry[]
): { values: number[]; min: number; max: number; color: string } | null {
  if (ruleId === "R03" || ruleId === "R04") {
    const key = ruleId === "R03" ? "energy" : "sleep";
    const vals = myPulses
      .filter((p) => p.dayOffset >= -6)
      .sort((a, b) => a.dayOffset - b.dayOffset)
      .map((p) => p[key as "energy" | "sleep"]);
    return vals.length >= 2 ? { values: vals, min: 1, max: 5, color: "#B4674A" } : null;
  }
  if (ruleId === "R01" || ruleId === "R02" || ruleId === "R08" || ruleId === "R09") {
    const offs = Array.from({ length: 14 }, (_, i) => i - 13);
    const vals = offs.map((o) =>
      mine.some((a) => a.dayOffset === o && a.completed && a.completed !== "rest") ? 1 : 0
    );
    const color = ruleId === "R08" || ruleId === "R09" ? "#3F6B57" : "#B4674A";
    return { values: vals, min: 0, max: 1, color };
  }
  return null;
}

export default function RadarPage() {
  const { radar, members, actions, pulses, rules, toggleRule, resolveRadar } = useStore();
  const [showRules, setShowRules] = useState(false);
  /* Below lg the four buckets are tabs rather than columns. Stacked, they ran
     to about nine screens of scrolling for a normal day's flags, which is not
     a thing anyone does on a phone between clients. */
  const [openBucket, setOpenBucket] = useState<RadarBucket>("attention");

  const byBucket = (b: RadarBucket) => radar.filter((r) => r.bucket === b && !r.resolved);
  const memberOf = (id: string) => members.find((m) => m.id === id)!;
  const openCount = radar.filter((r) => !r.resolved).length;

  /**
   * Flags gathered per person, in the order the Radar already ranked them.
   *
   * One woman can trip four rules in a bad week, and as one card per rule she
   * filled half the column and was read four separate times. Deepika works a
   * person at a time — she opens Radhika, not R02 — so the card is the person
   * and the flags are what is inside it. Ordering follows first appearance, so
   * whoever the evaluator put at the top of the bucket stays at the top.
   */
  const groupsFor = (b: RadarBucket): { member: Member; items: RadarEvent[] }[] => {
    const order: string[] = [];
    const byMember = new Map<string, RadarEvent[]>();
    for (const item of byBucket(b)) {
      if (!byMember.has(item.memberId)) {
        byMember.set(item.memberId, []);
        order.push(item.memberId);
      }
      byMember.get(item.memberId)!.push(item);
    }
    return order.map((id) => ({ member: memberOf(id), items: byMember.get(id)! }));
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label">Sunday, 9 August</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">Radar</h1>
          <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-soft">
            {members.length} {members.length === 1 ? "woman" : "women"},{" "}
            {openCount} things worth your attention. Not an alphabetical list
            of everyone.
          </p>
        </div>
        <button
          onClick={() => setShowRules((v) => !v)}
          className="tap inline-flex items-center gap-2 rounded-xl bg-paper-sunk px-3 text-sm text-ink-soft hover:bg-ink-line hover:text-ink"
        >
          <SlidersHorizontal size={15} />
          {showRules ? "Hide rules" : "Show the rules"}
        </button>
      </div>

      {/* Rule transparency. The whole point: Deepika can read why anything fired. */}
      {showRules && (
        <div className="mt-6 card animate-rise p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Every rule, in one sentence</p>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-soft">
                There is no risk score here and no model. If something appeared on
                your Radar, one of these sentences became true. Switch any of them
                off and it stops firing immediately.
              </p>
            </div>
            <button
              onClick={() => setShowRules(false)}
              className="tap -mr-2 -mt-2 rounded-lg px-2 text-ink-faint hover:text-ink"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-4 divide-y divide-ink-line">
            {rules.map((r) => (
              <div key={r.id} className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 font-mono text-[11px] text-ink-faint">{r.id}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{r.name}</p>
                  <p className="text-[13px] text-ink-faint">{r.trigger}</p>
                </div>
                <span
                  className={`chip shrink-0 ${
                    bucketMeta[r.bucket].dot === "bg-attention"
                      ? "bg-attention-tint text-attention"
                      : "bg-paper-sunk text-ink-soft"
                  }`}
                >
                  {bucketMeta[r.bucket].label}
                </span>
                <button
                  onClick={() => toggleRule(r.id)}
                  role="switch"
                  aria-checked={r.enabled}
                  aria-label={`${r.name} rule`}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    r.enabled ? "bg-effort-target" : "bg-ink-line"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      r.enabled ? "translate-x-[18px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bucket picker, phones only. On a desktop all four columns are visible
          at once and this would be a control that hides three quarters of a
          screen she can already see. */}
      <div className="mt-7 grid grid-cols-2 gap-1.5 lg:hidden">
        {ORDER.map((bucket) => {
          const meta = bucketMeta[bucket];
          const count = byBucket(bucket).length;
          const on = bucket === openBucket;
          return (
            <button
              key={bucket}
              onClick={() => setOpenBucket(bucket)}
              aria-pressed={on}
              className={`tap flex items-center gap-1.5 rounded-xl px-3 text-left text-[13px] transition-colors ${
                on ? "bg-ink text-white" : "bg-paper-sunk text-ink-soft hover:text-ink"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${on ? "bg-white/70" : meta.dot}`}
              />
              <span className="truncate">{meta.label}</span>
              <span
                className={`ml-auto font-mono text-[11px] ${
                  on ? "text-white/70" : "text-ink-faint"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Four columns, equal weight — Celebrate is not a footnote to Needs attention. */}
      <div className="mt-4 grid gap-6 lg:mt-9 lg:grid-cols-4">
        {ORDER.map((bucket) => {
          const groups = groupsFor(bucket);
          const flagCount = byBucket(bucket).length;
          const meta = bucketMeta[bucket];

          return (
            <section
              key={bucket}
              className={`min-w-0 ${bucket === openBucket ? "" : "hidden lg:block"}`}
            >
              {/* The heading repeats what the phone's tab strip already says,
                  so it only earns its place on a desktop. */}
              <div className="hidden items-baseline gap-2 lg:flex">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                <h2 className="font-display text-lg">{meta.label}</h2>
                <span className="font-mono text-[11px] text-ink-faint">{flagCount}</span>
              </div>
              <p className="text-[12px] leading-snug text-ink-faint lg:mt-0.5">{meta.blurb}</p>

              <div className="mt-3.5 space-y-2.5">
                {groups.map(({ member: m, items }) => (
                  <div key={m.id} className="card p-3.5 transition-shadow hover:shadow-lift">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-medium ${
                          bucket === "celebrate"
                            ? "bg-effort-tint text-effort-stretch"
                            : bucket === "attention"
                            ? "bg-attention-tint text-attention"
                            : "bg-paper-sunk text-ink-soft"
                        }`}
                      >
                        {m.initials}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
                        <Link
                          href={`/coach/members/${m.id}`}
                          className="font-mono text-[13px] font-medium hover:underline"
                        >
                          {memberCode(m)}
                        </Link>
                        <span className="text-[11px] text-ink-faint">Wk {m.week}</span>
                        {items.length > 1 && (
                          <span className="ml-auto shrink-0 rounded-full bg-paper-sunk px-1.5 font-mono text-[10px] text-ink-soft">
                            {items.length}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 divide-y divide-ink-line">
                      {items.map((r) => {
                        const mine = actions.filter((a) => a.memberId === m.id);
                        const myPulses = pulses.filter((p) => p.memberId === m.id);
                        const spark = sparkFor(r.ruleId, mine, myPulses);

                        return (
                          <div key={r.id} className="pt-2.5 first:pt-0">
                            <div className="flex items-start gap-1.5">
                              <p className="min-w-0 flex-1 text-[13px] leading-snug">
                                {r.detail}
                              </p>
                              <span
                                className="shrink-0 font-mono text-[10px] text-ink-faint"
                                title={r.trigger}
                              >
                                {r.ruleId}
                              </span>
                            </div>

                            {spark && (
                              <div className="mt-2">
                                <Sparkline
                                  values={spark.values}
                                  min={spark.min}
                                  max={spark.max}
                                  color={spark.color}
                                  height={22}
                                />
                              </div>
                            )}

                            <p className="mt-1.5 text-[12px] leading-relaxed text-effort-stretch">
                              {r.suggestedAction}
                            </p>
                            {items.length > 1 && (
                              <button
                                onClick={() => resolveRadar(r.id)}
                                className="tap -ml-2 mt-0.5 inline-flex items-center gap-1 rounded-lg px-2 text-[12px] text-ink-faint hover:bg-paper-sunk hover:text-ink"
                              >
                                <Check size={12} /> Handled
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => items.forEach((i) => resolveRadar(i.id))}
                        className="tap -ml-2 inline-flex items-center gap-1 rounded-lg px-2 text-[12px] text-ink-faint hover:bg-paper-sunk hover:text-ink"
                      >
                        <Check size={12} />
                        {items.length > 1 ? `All ${items.length} handled` : "Handled"}
                      </button>
                      <Link
                        href={`/coach/members/${m.id}`}
                        className="tap ml-auto inline-flex items-center gap-1 rounded-lg bg-paper-sunk px-2 text-[12px] text-ink hover:bg-ink-line"
                      >
                        Open <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                ))}

                {groups.length === 0 && (
                  <div className="card p-4">
                    <p className="text-[13px] text-ink-faint">
                      {bucket === "attention"
                        ? "Nobody needs you here right now."
                        : bucket === "celebrate"
                        ? "Nothing to celebrate yet today."
                        : bucket === "prepare"
                        ? "Nothing coming up in the next day."
                        : "No housekeeping waiting."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {openCount === 0 && (
        <div className="card mt-9 p-10 text-center">
          <p className="font-display text-xl">Nothing needs you right now.</p>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">
            That is a real state, not an empty one. Everyone is either on plan or
            already handled.
          </p>
        </div>
      )}
    </div>
  );
}
