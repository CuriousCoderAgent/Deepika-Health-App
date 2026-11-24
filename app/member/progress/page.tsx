"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Clock, FileText, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { matchArticles } from "@/lib/articles";
import { dateKey } from "@/lib/calendar";
import {
  dayLetter,
  dayName,
  lastDays,
  shortDate,
  spanStats,
  weekBuckets,
  weeksOfHistory,
} from "@/lib/dayView";
import { CategoryIcon, ConsistencyBand, ProvenanceChip, ScopeNotice } from "@/components/ui";
import { Columns, DataTable, StatTile, TrendRows, type XPoint } from "@/components/charts";
import DayHistory from "@/components/DayHistory";
import QuickDone from "@/components/QuickDone";
import type { DailyAction } from "@/lib/types";

/**
 * Insights — Progress, Health Data and For You.
 *
 * "Progress" was too narrow a name for what this tab has to hold: adherence,
 * reports, body composition and the reading list all belong to the same
 * question ("how is this actually going?") and none of them justified a sixth
 * tab. Renamed per the Aug 2026 design review, and the URL stays /progress so
 * nothing already bookmarked breaks.
 */
const TABS = ["Progress", "Health Data", "For You"] as const;
type Tab = (typeof TABS)[number];

/** Two ways to look back: day by day, or week by week across the journey. */
const RANGES = [
  { key: "days", label: "2 weeks" },
  { key: "weeks", label: "Journey" },
] as const;
type Range = (typeof RANGES)[number]["key"];

const SIZE = { minimum: "Minimum", target: "Target", stretch: "Stretch", rest: "Not today" } as const;
const dash = (v: number | null | undefined, unit = "") => (v === null || v === undefined ? "–" : `${v}${unit}`);

export default function Insights() {
  const {
    activeMember: m,
    actions,
    pulses,
    workoutLogs,
    workouts,
    reports,
    articles,
    foodEntries,
    messages,
  } = useStore();
  const [tab, setTab] = useState<Tab>("Progress");
  const [range, setRange] = useState<Range>("days");
  // Which day or week is being read. Null means "the latest", so it follows
  // today without an effect having to chase it.
  const [picked, setPicked] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [quick, setQuick] = useState<DailyAction | null>(null);

  const myReports = reports
    .filter((r) => r.memberId === m.id)
    .sort((a, b) => b.collectedOn.localeCompare(a.collectedOn));

  const today = dateKey();
  const data = { actions, pulses, foodEntries, messages, workoutLogs };
  const days = lastDays(m.id, 14, data);
  const activeDays = days.filter((d) => d.done.length > 0).length;
  const thisWeek = spanStats(days.slice(7));
  const lastWeek = spanStats(days.slice(0, 7));

  const weeksBack = weeksOfHistory(m.id, data);
  const weeks = weekBuckets(m.id, Math.max(weeksBack, 1), data);
  const journey = spanStats(lastDays(m.id, Math.max(weeksBack, 1) * 7, data));

  const count = range === "days" ? days.length : weeks.length;

  const x: XPoint[] =
    range === "days"
      ? days.map((d) => ({
          short: dayLetter(d.dayOffset, today),
          long: dayName(d.dayOffset, today),
          now: d.dayOffset === 0,
        }))
      : weeks.map((w, i) => ({
          // A date at each end and the middle is enough to place the rest.
          short:
            i === weeks.length - 1
              ? "now"
              : i === 0 || (weeks.length > 5 && i === Math.floor((weeks.length - 1) / 2))
              ? shortDate(w.toOffset, today)
              : "",
          long: w.weeksAgo === 0 ? "The last 7 days" : `${shortDate(w.fromOffset, today)} – ${shortDate(w.toOffset, today)}`,
          now: w.weeksAgo === 0,
        }));

  const felt =
    range === "days"
      ? [
          { key: "energy", title: "Energy", values: days.map((d) => d.pulse?.energy ?? null) },
          // A one-tap mood leaves sleep unrecorded (0). Charting that as a
          // zero would draw a cliff that never happened.
          { key: "sleep", title: "Sleep", values: days.map((d) => (d.pulse && d.pulse.sleep >= 1 ? d.pulse.sleep : null)) },
          { key: "calm", title: "Calm", values: days.map((d) => d.pulse?.stress ?? null) },
        ]
      : [
          { key: "energy", title: "Energy", values: weeks.map((w) => w.energy) },
          { key: "sleep", title: "Sleep", values: weeks.map((w) => w.sleep) },
          { key: "calm", title: "Calm", values: weeks.map((w) => w.calm) },
        ];
  const anyFelt = felt.some((r) => r.values.some((v) => v !== null));
  // Open on the most recent point she actually rated, so the first thing she
  // reads is a number rather than a row of dashes for a day not yet rated.
  const latestRated = (() => {
    for (let i = count - 1; i >= 0; i--) if (felt.some((r) => r.values[i] !== null)) return i;
    return count - 1;
  })();
  const selected = Math.min(picked ?? latestRated, count - 1);

  const protein =
    range === "days" ? days.map((d) => (d.foodCount > 0 ? d.protein : null)) : weeks.map((w) => w.protein);
  const anyProtein = protein.some((v) => v !== null);

  const comebacks = (() => {
    const done = actions
      .filter((a) => a.memberId === m.id && a.completed && a.completed !== "rest")
      .map((a) => a.dayOffset)
      .sort((a, b) => a - b);
    let n = 0;
    for (let i = 1; i < done.length; i++) if (done[i] - done[i - 1] >= 3) n++;
    return n;
  })();

  const logs = workoutLogs
    .filter((l) => l.memberId === m.id)
    .sort((a, b) => b.dayOffset - a.dayOffset);
  const reads = matchArticles(m, articles);

  const pick = (r: Range) => {
    setRange(r);
    setPicked(null);
  };

  return (
    <div className="animate-rise px-5 pt-6">
      <h1 className="font-display text-[1.55rem] leading-tight">Insights</h1>

      <div className="scroll-hide mt-4 flex gap-1 border-b border-ink-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-[14px] transition-colors ${
              tab === t
                ? "border-effort-stretch font-medium text-ink"
                : "border-transparent text-ink-faint hover:text-ink-soft"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ---------------- Progress ---------------- */}
      {tab === "Progress" && (
        <div className="mt-4">
          {/* One control, above everything it changes. */}
          <div role="group" aria-label="How far back" className="grid grid-cols-2 gap-1 rounded-xl bg-paper-sunk p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                aria-pressed={range === r.key}
                onClick={() => pick(r.key)}
                className={`tap rounded-lg text-[14px] transition-colors ${
                  range === r.key ? "bg-paper-card font-medium text-ink shadow-card" : "text-ink-soft hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {range === "weeks" && weeksBack < 2 ? (
            <div className="card mt-3 p-5 text-center">
              <p className="text-[14px] leading-relaxed text-ink-soft">
                This view fills in a week at a time. It will have something to
                show once you are into your second week.
              </p>
            </div>
          ) : (
            <>
              {/* Counts, not scores. */}
              <div className="card mt-3 p-4">
                <p className="label">{range === "days" ? "The last 7 days" : `Your ${weeks.length} weeks so far`}</p>
                <div className="mt-2.5 grid grid-cols-3 gap-3">
                  {range === "days" ? (
                    <>
                      <StatTile label="Active days" value={`${thisWeek.activeDays} of 7`} note={`${lastWeek.activeDays} the week before`} />
                      <StatTile label="Check-ins" value={String(thisWeek.checkIns)} note={`${lastWeek.checkIns} the week before`} />
                      <StatTile
                        label="Protein a day"
                        value={dash(thisWeek.proteinAvg, "g")}
                        note={thisWeek.proteinAvg === null ? "nothing logged" : `over ${thisWeek.foodDays} day${thisWeek.foodDays > 1 ? "s" : ""} logged`}
                      />
                    </>
                  ) : (
                    <>
                      <StatTile label="Active days" value={`${journey.activeDays} of ${journey.days}`} />
                      <StatTile label="Check-ins" value={String(journey.checkIns)} />
                      <StatTile
                        label="Protein a day"
                        value={dash(journey.proteinAvg, "g")}
                        note={journey.proteinAvg === null ? "nothing logged" : `over ${journey.foodDays} day${journey.foodDays > 1 ? "s" : ""} logged`}
                      />
                    </>
                  )}
                </div>
              </div>

              {range === "days" ? (
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="card press mt-3 block w-full p-4 text-left transition-shadow hover:shadow-lift"
                >
                  <p className="label">Consistency</p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
                    You did something on{" "}
                    <span className="font-semibold text-ink">{activeDays} of the last 14 days</span>.
                  </p>
                  <div className="mt-3">
                    <ConsistencyBand days={days} showDayLetters />
                  </div>
                  <p className="mt-2.5 flex items-center gap-0.5 text-[13px] font-medium text-effort-stretch">
                    See each day <ChevronRight size={14} />
                  </p>
                </button>
              ) : (
                <div className="card mt-3 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="label">Active days each week</p>
                    <p className="text-[12px] text-ink-soft">{x[selected]?.long}</p>
                  </div>
                  <div className="mt-2">
                    <Columns
                      x={x}
                      values={weeks.map((w) => w.activeDays)}
                      selected={selected}
                      onSelect={setPicked}
                      fixedMax={7}
                      label="Days with at least one action done, week by week"
                      height={128}
                    />
                  </div>
                </div>
              )}

              {comebacks > 0 && (
                <div className="mt-3 rounded-2xl bg-effort-tint p-4">
                  <p className="label">Comebacks</p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-effort-stretch">
                    You came back after a gap {comebacks} time{comebacks > 1 ? "s" : ""}. That is
                    the single best predictor that this will still be happening next year.
                  </p>
                </div>
              )}

              <div className="card mt-3 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="label">How you&rsquo;ve felt</p>
                  <p className="text-[12px] text-ink-soft">{x[selected]?.long}</p>
                </div>
                {anyFelt ? (
                  <>
                    <div className="mt-2.5">
                      <TrendRows
                        rows={felt}
                        x={x}
                        selected={selected}
                        onSelect={setPicked}
                        format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))}
                        label={
                          range === "days"
                            ? "Energy, sleep and calm, each rated 1 to 5, over the last 14 days"
                            : "Energy, sleep and calm as weekly averages, each on a scale of 1 to 5"
                        }
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                      {range === "days"
                        ? "Your own ratings, 1 to 5 — higher is better on all three. Tap or drag across to read a day; a gap is a day you didn't rate."
                        : "Each point is the average of what you rated that week, 1 to 5. Tap or drag across to read a week."}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                    Nothing rated in this stretch yet. A check-in on Today is one tap.
                  </p>
                )}
              </div>

              {(anyProtein || m.proteinTargetG) && (
                <div className="card mt-3 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="label">{range === "days" ? "Protein each day" : "Protein a day, by week"}</p>
                    <p className="text-[12px] text-ink-soft">{x[selected]?.long}</p>
                  </div>
                  {anyProtein ? (
                    <div className="mt-2">
                      <Columns
                        x={x}
                        values={protein}
                        selected={selected}
                        onSelect={setPicked}
                        unit="g"
                        target={m.proteinTargetG}
                        label={range === "days" ? "Grams of protein logged each day" : "Average grams of protein on the days logged, week by week"}
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">Nothing logged in this stretch.</p>
                  )}
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                    {m.proteinTargetG ? `The dashed line is the ${m.proteinTargetG}g Deepika set for you. ` : ""}
                    A day with no bar is a day nothing was logged — not a day without protein.
                  </p>
                  <Link href="/member/food" className="tap mt-1 inline-flex items-center gap-0.5 text-[13px] font-medium text-effort-stretch">
                    Log what you ate <ChevronRight size={14} />
                  </Link>
                </div>
              )}

              {logs.length > 0 && (
                <div className="card mt-3 p-4">
                  <p className="label">Strength sessions</p>
                  <div className="mt-2 divide-y divide-ink-line">
                    {logs.slice(0, 4).map((l) => (
                      <div key={l.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="text-[14px] leading-snug">
                            {workouts.find((w) => w.id === l.workoutId)?.name ?? "Session"}
                            <span className="text-ink-faint"> · {SIZE[l.completedLevel]}</span>
                          </p>
                          <p className="text-[12px] leading-snug text-ink-faint">
                            {dayName(l.dayOffset, today)}
                            {l.feltLike ? ` · “${l.feltLike}”` : ""}
                          </p>
                        </div>
                        <p className="shrink-0 text-[13px] text-ink-soft">
                          Effort <span className="font-semibold text-ink">{l.rpe}</span>/10
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-faint">
                    As sessions start to feel easier at the same load, Deepika adds weight.
                    That is what progress looks like here.
                  </p>
                </div>
              )}

              {/* The same numbers without the drawing. */}
              <button
                onClick={() => setAsTable((v) => !v)}
                aria-expanded={asTable}
                className="tap mt-2 text-[13px] text-ink-soft underline underline-offset-2 hover:text-ink"
              >
                {asTable ? "Hide the table" : "Show these numbers as a table"}
              </button>
              {asTable && (
                <div className="card mt-1 p-4">
                  {range === "days" ? (
                    <DataTable
                      caption="The last 14 days"
                      head={["Day", "Did", "Energy", "Sleep", "Calm", "Protein"]}
                      rows={[...days].reverse().map((d) => [
                        dayName(d.dayOffset, today),
                        d.level ? SIZE[d.level] : "–",
                        dash(d.pulse?.energy),
                        dash(d.pulse && d.pulse.sleep >= 1 ? d.pulse.sleep : null),
                        dash(d.pulse?.stress),
                        d.foodCount > 0 ? `${d.protein}g` : "–",
                      ])}
                    />
                  ) : (
                    <DataTable
                      caption="Week by week"
                      head={["Week", "Active", "Energy", "Sleep", "Calm", "Protein"]}
                      rows={[...weeks].reverse().map((w) => [
                        w.weeksAgo === 0 ? "Last 7 days" : `to ${shortDate(w.toOffset, today)}`,
                        `${w.activeDays}/7`,
                        dash(w.energy),
                        dash(w.sleep),
                        dash(w.calm),
                        dash(w.protein, "g"),
                      ])}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ---------------- Health Data ---------------- */}
      {tab === "Health Data" && (
        <div className="mt-5">
          <Link
            href="/member/reports"
            className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-effort-stretch text-sm font-medium text-white"
          >
            <Plus size={16} /> Upload a report
          </Link>

          <div className="mt-4">
            <p className="label mb-2">Your reports ({myReports.length})</p>
            {myReports.length === 0 ? (
              <div className="card p-5 text-center">
                <p className="text-[14px] text-ink-soft">
                  Nothing here yet. Add your blood work or a body-composition scan.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {myReports.slice(0, 4).map((r) => (
                  <Link
                    key={r.id}
                    href="/member/reports"
                    className="card flex items-center gap-3 p-3.5 transition-shadow hover:shadow-lift"
                  >
                    <FileText size={16} className="shrink-0 text-ink-faint" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium leading-snug">{r.title}</p>
                      <p className="text-[12px] text-ink-faint">
                        {r.collectedOn} · {r.values.length} values
                      </p>
                    </div>
                    <ChevronRight size={15} className="shrink-0 text-ink-faint" />
                  </Link>
                ))}
                {myReports.length > 4 && (
                  <Link
                    href="/member/reports"
                    className="block px-1 py-1 text-[13px] font-medium text-effort-stretch"
                  >
                    See all {myReports.length}
                  </Link>
                )}
              </div>
            )}
          </div>

          {m.bodyComp && m.bodyComp.length > 0 && (
            <div className="card mt-4 p-4">
              <p className="label">Body composition</p>
              <div className="mt-2.5 space-y-2.5">
                {m.bodyComp.map((b, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px]">{b.label}</p>
                      <p className="text-[12px] text-ink-faint">{b.at}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[14px]">{b.value}</span>
                      <ProvenanceChip p={b.provenance} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
                Measured every four to six weeks, not daily. Day-to-day movement in
                these numbers is noise, and watching it does nothing useful.
              </p>
            </div>
          )}

          <div className="mt-4">
            <ScopeNotice>
              Your numbers are stored and trended here, never interpreted. What a
              value means for you is a conversation for your doctor — Deepika will
              help you arrive with the right questions.
            </ScopeNotice>
          </div>
        </div>
      )}

      {/* ---------------- For You ---------------- */}
      {tab === "For You" && (
        <div className="mt-5">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Chosen for your stage, your goals and how you actually live. Each one
            says why it is here.
          </p>

          <div className="mt-3.5 space-y-2.5">
            {reads.map(({ article: a, reason }) => (
              <Link
                key={a.id}
                href={`/member/reading/${a.id}`}
                className="card block p-3.5 transition-shadow hover:shadow-lift"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-sunk">
                    <CategoryIcon category={a.category} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium leading-snug">{a.title}</p>
                    <p className="mt-1 text-[13px] leading-snug text-ink-soft">{a.standfirst}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-faint">
                      <Clock size={12} />
                      {a.readMinutes} min read
                    </div>
                  </div>
                  <ChevronRight size={15} className="mt-0.5 shrink-0 text-ink-faint" />
                </div>
                <p className="mt-2.5 border-t border-ink-line pt-2 text-[12px] leading-relaxed text-effort-stretch">
                  {reason}
                </p>
              </Link>
            ))}
          </div>

          <Link
            href="/member/reading"
            className="tap mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-paper-sunk text-sm font-medium text-ink hover:bg-ink-line"
          >
            Browse everything <ChevronRight size={15} />
          </Link>

          <p className="mt-4 px-1 text-[11px] leading-relaxed text-ink-faint">
            These are chosen by a short list of readable rules, not by a machine
            deciding what you should think about your own body.
          </p>
        </div>
      )}

      <div className="h-8" />

      <DayHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onMark={(a) => {
          setHistoryOpen(false);
          setQuick(a);
        }}
      />
      <QuickDone action={quick} onClose={() => setQuick(null)} />
    </div>
  );
}
