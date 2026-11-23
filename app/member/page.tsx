"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mic, Play, CalendarClock, ChevronRight, RefreshCw, Check, Apple } from "lucide-react";
import { useStore } from "@/lib/store";
import { agoLabel } from "@/lib/calendar";
import { isWelcomeBack } from "@/lib/dailyPlan";
import { CategoryIcon, ConsistencyBand } from "@/components/ui";
import PulseCard from "@/components/PulseCard";
import ReminderPrompt from "@/components/ReminderPrompt";
import QuickDone from "@/components/QuickDone";
import DayHistory from "@/components/DayHistory";
import { lastDays } from "@/lib/dayView";
import { DEMO_MEMBER_ID } from "@/lib/session-client";
import type { DailyAction, EffortLevel } from "@/lib/types";

/**
 * Time of day, from her phone's clock.
 *
 * The greeting used to say "Good morning" at eleven at night. Everything else
 * in this prototype runs on dayOffset from a fixed seeded "today", which is
 * what keeps the sample history coherent — but the time of day is the one
 * thing that has to come from the real clock in her hand, because she is the
 * one reading it.
 */
function partOfDay(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Greeting adapts to what the last few days actually looked like. */
function greetingFor(
  energy: number | null,
  poorSleep: boolean,
  name: string,
  hour: number | null,
  welcomeBack: boolean,
  doneToday: number
) {
  // Null until the clock has been read on the client. Rendering a time-based
  // greeting on the server would bake the server's hour into the HTML and
  // then visibly swap it a moment later.
  const hi = hour === null ? `Hello, ${name}.` : `${partOfDay(hour)}, ${name}.`;

  // Deepika's own words for a return (notification template n-4). Never how
  // long she was away — see isWelcomeBack.
  if (welcomeBack)
    return { hi, line: "Good to see you back. Nothing reset — we are continuing." };
  // Once anything is done, say so. One thing at its minimum is the whole ask,
  // and the screen should stop sounding as if it is still waiting.
  if (doneToday > 0)
    return { hi, line: "That's a full day already. Anything more is a bonus." };
  if (poorSleep)
    return {
      hi,
      line: "Your sleep was more disrupted than usual last night. We've made today lighter.",
    };
  if (energy !== null && energy >= 4)
    return { hi, line: "You have had a good run. Today can be a bigger one if you want it." };
  return { hi, line: "One thing done today keeps the week intact." };
}

/**
 * A single glanceable status — and the thing she taps to say "done". It reads
 * as a checkbox because that is what it is; the size she did is chosen in the
 * sheet it opens, and shown here by the colour it fills with.
 */
const DONE_FILL: Record<EffortLevel, string> = {
  minimum: "bg-effort-min text-effort-stretch",
  target: "bg-effort-target text-white",
  stretch: "bg-effort-stretch text-white",
};
function FocusStatus({ level, rest }: { level: EffortLevel | null; rest?: boolean }) {
  if (rest) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-rest">
        <span className="h-0.5 w-2.5 rounded-full bg-rest" />
      </span>
    );
  }
  if (!level) {
    return <span className="h-7 w-7 rounded-full border-2 border-ink-faint/50 transition-colors group-hover:border-effort-target" />;
  }
  return (
    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${DONE_FILL[level]}`}>
      <Check size={15} strokeWidth={3} />
    </span>
  );
}

export default function Today() {
  // Read after mount, not during render: the server has no idea what time it
  // is where she is.
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);

  const {
    activeMember: m,
    actions,
    pulses,
    messages,
    sessions,
    modules,
    foodEntries,
    workoutLogs,
    replayOnboarding,
    session,
  } = useStore();
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [quick, setQuick] = useState<DailyAction | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const first = m.name.split(" ")[0];
  const todays = actions.filter((a) => a.memberId === m.id && a.dayOffset === 0);
  const doneCount = todays.filter((a) => a.completed && a.completed !== "rest").length;
  const recent = pulses
    .filter((p) => p.memberId === m.id && p.dayOffset >= -3)
    .sort((a, b) => b.dayOffset - a.dayOffset);
  const poorSleep = recent.filter((p) => p.sleep <= 2).length >= 2;
  const welcomeBack = isWelcomeBack(m.id, actions, pulses, messages, foodEntries);
  const greeting = greetingFor(recent[0]?.energy ?? null, poorSleep, first, hour, welcomeBack, doneCount);

  const voiceNote = messages.find(
    (x) => x.memberId === m.id && x.from === "coach" && x.kind === "voice" && x.dayOffset >= -1
  );
  const nextSession = sessions
    .filter((s) => s.memberId === m.id && s.status === "scheduled" && s.dayOffset >= 0)
    .sort((a, b) => a.dayOffset - b.dayOffset)[0];

  // Progress cue — a count, deliberately not a streak.
  const last14days = lastDays(m.id, 14, { actions, pulses, foodEntries, messages, workoutLogs });
  const activeDays = last14days.filter((d) => d.done.length > 0).length;
  // Until she has marked anything at all, say how — once.
  const neverMarked = !actions.some((a) => a.memberId === m.id && a.completed);

  const proteinTarget = m.proteinTargetG;
  const proteinToday = foodEntries
    .filter((e) => e.memberId === m.id && e.dayOffset === 0)
    .reduce((s, e) => s + e.protein, 0);

  return (
    <div className="animate-rise px-5 pt-6">
      {/* 1 — Contextual greeting. Kept as the one serif "hero" moment on the
          whole screen — every other heading here is plain sans-serif. The
          profile control is the only chrome, and it is how you leave: no
          "viewing as" banner anywhere in the member surface. */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[1.55rem] leading-tight">{greeting.hi}</h1>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{greeting.line}</p>
        </div>
        {/* An initial in a circle means "profile" in every other app on her
            phone, so as a sign-out button it was invisible — someone looking
            at this screen asked where the sign-out was while it was on it.
            The word does the work now; the initial keeps it hers. */}
        <form action="/api/auth/logout" method="post" className="shrink-0">
          <button
            type="submit"
            title="Sign out"
            className="tap flex items-center gap-1.5 rounded-full bg-paper-sunk pl-1 pr-3 text-[12px] text-ink-soft transition-colors hover:bg-ink-line hover:text-ink"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-effort-tint font-medium text-effort-stretch">
              {first.charAt(0)}
            </span>
            Sign out
          </button>
        </form>
      </div>

      {/* 2 — Plan adjusted. Compact by default; the full reason is one tap
          away, not printed in full every single day. */}
      {m.lastPlanChange && (
        <div className="mt-4 rounded-2xl bg-effort-tint/50 p-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-effort-tint text-effort-stretch">
              <RefreshCw size={12} />
            </span>
            <p className="text-[13px] font-medium text-effort-stretch">Plan adjusted</p>
            <span className="ml-auto font-mono text-[10px] text-ink-faint">{agoLabel(m.lastPlanChange.at, m.anchorDate)}</span>
          </div>
          <p
            className={`mt-1.5 text-[13px] leading-relaxed text-ink-soft ${
              planExpanded ? "" : "line-clamp-1"
            }`}
          >
            {m.lastPlanChange.rationale}
          </p>
          {!planExpanded && (
            <button
              onClick={() => setPlanExpanded(true)}
              className="mt-0.5 text-[12px] font-medium text-effort-stretch"
            >
              Why?
            </button>
          )}
        </div>
      )}

      {/* 3 — Deepika's note. Marigold appears nowhere else in the member app. */}
      {voiceNote && (
        <div className="mt-3 rounded-2xl border border-marigold/25 bg-marigold-tint/70 p-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marigold text-white">
              <Mic size={12} />
            </span>
            <p className="text-[13px] font-medium">A note from Deepika</p>
            <span className="ml-auto font-mono text-[10px] text-marigold-deep">
              {voiceNote.seconds}s
            </span>
          </div>

          <button
            onClick={() => setPlaying((v) => !v)}
            className="tap mt-2.5 flex w-full items-center gap-2.5 rounded-xl bg-white/70 px-2.5 text-left"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marigold-deep text-white">
              <Play size={12} fill="currentColor" />
            </span>
            <span className="flex flex-1 items-center gap-[3px] py-2.5">
              {Array.from({ length: 22 }).map((_, i) => (
                <span
                  key={i}
                  className="w-full rounded-full bg-marigold/50"
                  style={{ height: `${Math.round(5 + Math.abs(Math.sin(i * 1.7)) * 12)}px` }}
                />
              ))}
            </span>
          </button>

          {playing ? (
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">
              &ldquo;{voiceNote.body}&rdquo;
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-marigold-deep/70">Tap to read the transcript</p>
          )}
        </div>
      )}

      {/* 4 — One-tap mood, above the day's actions per the Aug 2026 design
          review: how she's feeling should register before what's being asked
          of her. */}
      <div className="mt-3">
        <PulseCard memberId={m.id} />
      </div>
      {session?.role === "member" && (
        <ReminderPrompt
          checkedInToday={pulses.some((p) => p.memberId === m.id && p.dayOffset === 0)}
          preferred={m.checkInPreference}
        />
      )}

      {/* 5 — Focus today. Compact rows, full text always, never an ellipsis
          on the one thing that actually matters: what the minimum is. */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <p className="label">{welcomeBack ? "Today, just the minimum" : "Your focus today"}</p>
          {todays.length > 0 && (
            <span className="font-mono text-[11px] text-ink-faint">
              {doneCount} of {todays.length}
            </span>
          )}
        </div>
        {welcomeBack && todays.length > 0 && doneCount === 0 && (
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            Any one of these, at its minimum, is a full day.
          </p>
        )}
        {!welcomeBack && neverMarked && todays.length > 0 && (
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            Tap a circle when you&rsquo;ve done one. Any size counts.
          </p>
        )}
        <div className="mt-2.5 space-y-2">
          {todays.length === 0 && (
            <div className="card p-4 text-center">
              <p className="text-sm text-ink-soft">Nothing scheduled today. That is intentional.</p>
            </div>
          )}
          {todays.map((a) => {
            const mod = modules.find((x) => x.id === a.moduleId);
            const level = a.completed === "rest" ? null : (a.completed as EffortLevel | null);
            const secondary =
              a.completed === "rest"
                ? `Not today${a.skipReason ? ` · ${a.skipReason.toLowerCase()}` : ""}`
                : a.completed
                ? `${{ minimum: "Minimum", target: "Target", stretch: "Stretch" }[a.completed]} · ${a[a.completed].label}`
                : a.minimum.minutes > 0 && !welcomeBack
                ? `Minimum ${a.minimum.minutes} min · Target ${a.target.minutes} min`
                : `Minimum: ${a.minimum.label}`;
            return (
              /* Two targets side by side, not one inside the other: the circle
                 marks it done, the rest of the row opens what it is. */
              <div key={a.id} className="card flex items-stretch transition-shadow hover:shadow-lift">
                <button
                  onClick={() => setQuick(a)}
                  aria-label={
                    a.completed === "rest"
                      ? `${a.title}: marked not today. Change`
                      : level
                      ? `${a.title}: done. Change`
                      : `Mark ${a.title} done`
                  }
                  className="tap group flex w-[3.4rem] shrink-0 items-center justify-center rounded-l-2xl"
                >
                  <FocusStatus level={level} rest={a.completed === "rest"} />
                </button>
                <Link
                  href={`/member/action/${a.id}`}
                  className="flex min-w-0 flex-1 items-center gap-2 py-3.5 pr-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{a.title}</p>
                    <p className="mt-0.5 flex items-start gap-1.5 text-[13px] leading-snug text-ink-faint">
                      {mod && <CategoryIcon category={mod.category} size={13} className="mt-[3px] shrink-0 text-ink-faint" />}
                      <span>{secondary}</span>
                    </p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-ink-faint" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6 — Protein. One number, tappable, never a scoreboard. */}
      <Link
        href="/member/food"
        className="card mt-4 flex items-center gap-3 p-3.5 transition-shadow hover:shadow-lift"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-sunk">
          <Apple size={16} className="text-ink-faint" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium leading-snug">
            Protein today
            {proteinTarget ? (
              <span className="ml-1.5 font-mono text-[12px] font-normal text-ink-soft">
                {proteinToday}g of {proteinTarget}
              </span>
            ) : (
              <span className="ml-1.5 font-mono text-[12px] font-normal text-ink-soft">
                {proteinToday}g
              </span>
            )}
          </p>
          {proteinTarget ? (
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-paper-sunk">
              <span
                className="block h-full rounded-full bg-effort-target transition-all duration-500"
                style={{ width: `${Math.min(100, (proteinToday / proteinTarget) * 100)}%` }}
              />
            </span>
          ) : (
            <p className="text-[12px] text-ink-faint">Log what you ate</p>
          )}
        </div>
        <ChevronRight size={16} className="shrink-0 text-ink-faint" />
      </Link>

      {/* 7 — Next human touchpoint */}
      {nextSession && (
        <Link
          href="/member/coach"
          className="card mt-4 flex items-center gap-3 p-3.5 transition-shadow hover:shadow-lift"
        >
          <CalendarClock size={16} className="shrink-0 text-ink-soft" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium">
              {nextSession.type} {nextSession.dayOffset === 0 ? "today" : "tomorrow"},{" "}
              {nextSession.time}
            </p>
            <p className="text-[12px] text-ink-faint">Add a question for Deepika</p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-ink-faint" />
        </Link>
      )}

      {/* 7 — One progress cue. A count, never a streak. In week one there is
          nothing to count yet, so it says what it is for instead of showing
          fourteen empty squares and reading as a scoreboard she is losing. */}
      {welcomeBack || activeDays === 0 ? (
        <div className="mt-4 rounded-2xl bg-effort-tint px-4 py-3">
          <p className="text-[13px] leading-relaxed text-effort-stretch">
            {welcomeBack
              ? // The band would draw the gap. On the day she comes back, it
                // does not need drawing.
                "Nothing to catch up on. Today counts the same as any other day."
              : "This is where your consistency will show — any day with at least one healthy action counts. Nothing to catch up on yet."}
          </p>
        </div>
      ) : (
        /* The whole band opens the days behind it. Fourteen squares are too
           narrow to be fourteen targets, so it is one. */
        <button
          onClick={() => setHistoryOpen(true)}
          className="press mt-4 block w-full rounded-2xl bg-effort-tint px-4 py-3 text-left"
        >
          <p className="text-[13px] leading-relaxed text-effort-stretch">
            You&rsquo;re building consistency —{" "}
            <span className="font-medium">{activeDays} of the last 14 days</span> included
            at least one healthy action.
          </p>
          <div className="mt-2.5">
            <ConsistencyBand days={last14days} showDayLetters />
          </div>
          <p className="mt-2 flex items-center gap-0.5 text-[12px] font-medium text-effort-stretch">
            See each day <ChevronRight size={13} />
          </p>
        </button>
      )}

      {/* Demo control, only on the seeded account. Lets the welcome flow be
          walked again for someone watching, without resetting the five weeks
          of history that make the rest of the app worth looking at. */}
      {m.id === DEMO_MEMBER_ID && (
        <button
          onClick={() => {
            replayOnboarding(m.id);
            router.push("/onboarding");
          }}
          className="tap mt-5 w-full rounded-xl border border-dashed border-ink-line text-[12px] text-ink-faint hover:bg-paper-sunk hover:text-ink"
        >
          Replay the welcome flow (demo only — keeps your history)
        </button>
      )}

      {/* Account, privacy and deletion. Required to be reachable in-app by the
          Play Store, and the right place for it regardless — the alternative is
          a member who wants her data gone having to ask someone for it. */}
      <Link
        href="/member/account"
        className="tap mt-5 flex items-center justify-between rounded-xl border border-ink-line bg-paper-card px-4 text-[13px] text-ink-soft hover:bg-paper-sunk/50"
      >
        Your account &amp; privacy
        <ChevronRight size={15} className="text-ink-faint" />
      </Link>

      <div className="h-6" />

      <QuickDone action={quick} onClose={() => setQuick(null)} />
      <DayHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onMark={(a) => {
          setHistoryOpen(false);
          setQuick(a);
        }}
      />
    </div>
  );
}
