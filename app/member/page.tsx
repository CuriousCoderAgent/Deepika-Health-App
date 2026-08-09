"use client";

import Link from "next/link";
import { useState } from "react";
import { Mic, Play, CalendarClock, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { EffortRamp, EffortLabel, ConsistencyBand, CategoryIcon } from "@/components/ui";
import PulseCard from "@/components/PulseCard";

/** Greeting adapts to what the last few days actually looked like. */
function greetingFor(energy: number | null, poorSleep: boolean, name: string) {
  if (poorSleep) return { hi: `Good morning, ${name}.`, line: "You slept badly. Today is allowed to be a lighter day." };
  if (energy !== null && energy >= 4) return { hi: `Good morning, ${name}.`, line: "You have had a good run. Today can be a bigger one if you want it." };
  return { hi: `Good morning, ${name}.`, line: "One thing done today keeps the week intact." };
}

export default function Today() {
  const { activeMember: m, actions, pulses, messages, sessions, modules } = useStore();
  const [playing, setPlaying] = useState(false);

  const first = m.name.split(" ")[0];
  const todays = actions.filter((a) => a.memberId === m.id && a.dayOffset === 0);
  const recent = pulses
    .filter((p) => p.memberId === m.id && p.dayOffset >= -3)
    .sort((a, b) => b.dayOffset - a.dayOffset);
  const poorSleep = recent.filter((p) => p.sleep <= 2).length >= 2;
  const greeting = greetingFor(recent[0]?.energy ?? null, poorSleep, first);

  const voiceNote = messages.find(
    (x) => x.memberId === m.id && x.from === "coach" && x.kind === "voice" && x.dayOffset >= -1
  );
  const nextSession = sessions
    .filter((s) => s.memberId === m.id && s.status === "scheduled" && s.dayOffset >= 0)
    .sort((a, b) => a.dayOffset - b.dayOffset)[0];

  // Progress cue — a count, deliberately not a streak.
  const last14days = Array.from({ length: 14 }).map((_, i) => {
    const off = i - 13;
    const day = actions.filter((a) => a.memberId === m.id && a.dayOffset === off);
    const level = day.find((a) => a.completed === "stretch")
      ? "stretch"
      : day.find((a) => a.completed === "target")
      ? "target"
      : day.find((a) => a.completed === "minimum")
      ? "minimum"
      : day.find((a) => a.completed === "rest")
      ? "rest"
      : null;
    return { level: level as any, dayOffset: off };
  });
  const activeDays = last14days.filter((d) => d.level && d.level !== "rest").length;

  return (
    <div className="animate-rise px-5 pt-8">
      {/* 1 — Contextual greeting */}
      <h1 className="font-display text-[1.7rem] leading-tight">{greeting.hi}</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{greeting.line}</p>

      {/* 2 — Deepika's note. Marigold appears nowhere else in the member app. */}
      {voiceNote && (
        <div className="mt-6 rounded-2xl border border-marigold/25 bg-marigold-tint/70 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-marigold text-white">
              <Mic size={13} />
            </span>
            <p className="text-sm font-medium">A note from Deepika</p>
            <span className="ml-auto font-mono text-[10px] text-marigold-deep">
              {voiceNote.seconds}s
            </span>
          </div>

          <button
            onClick={() => setPlaying((v) => !v)}
            className="tap mt-3 flex w-full items-center gap-3 rounded-xl bg-white/70 px-3 text-left"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marigold-deep text-white">
              <Play size={13} fill="currentColor" />
            </span>
            <span className="flex flex-1 items-center gap-[3px] py-3">
              {Array.from({ length: 26 }).map((_, i) => (
                <span
                  key={i}
                  className="w-full rounded-full bg-marigold/50"
                  style={{ height: `${6 + Math.abs(Math.sin(i * 1.7)) * 16}px` }}
                />
              ))}
            </span>
          </button>

          {playing && (
            <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
              &ldquo;{voiceNote.body}&rdquo;
            </p>
          )}
          {!playing && (
            <p className="mt-2 text-[11px] text-marigold-deep/70">Tap to read the transcript</p>
          )}
        </div>
      )}

      {/* Plan-change explanation — never let a plan change feel arbitrary */}
      {m.lastPlanChange && (
        <div className="mt-4 rounded-2xl border border-ink-line bg-paper-card p-4">
          <p className="label">Your week changed · {m.lastPlanChange.at}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            {m.lastPlanChange.rationale}
          </p>
        </div>
      )}

      {/* 3 — Focus today */}
      <div className="mt-7">
        <p className="label">Your focus today</p>
        <div className="mt-3 space-y-2.5">
          {todays.length === 0 && (
            <div className="card p-5 text-center">
              <p className="text-sm text-ink-soft">Nothing scheduled today. That is intentional.</p>
            </div>
          )}
          {todays.map((a) => {
            const mod = modules.find((x) => x.id === a.moduleId);
            return (
            <Link
              key={a.id}
              href={`/member/action/${a.id}`}
              className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-lift"
            >
              {mod && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-sunk">
                  <CategoryIcon category={mod.category} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{a.title}</p>
                <p className="mt-0.5 truncate text-[13px] text-ink-faint">
                  {a.completed && a.completed !== "rest"
                    ? a.completed === "minimum"
                      ? a.minimum.label
                      : a.completed === "target"
                      ? a.target.label
                      : a.stretch.label
                    : a.minimum.minutes > 0
                    ? `Minimum ${a.minimum.minutes} min · Target ${a.target.minutes} min`
                    : `Minimum: ${a.minimum.label}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <EffortRamp
                  level={a.completed === "rest" ? null : (a.completed as any)}
                  rest={a.completed === "rest"}
                />
                <EffortLabel
                  level={a.completed === "rest" ? null : (a.completed as any)}
                  rest={a.completed === "rest"}
                />
              </div>
              <ChevronRight size={16} className="shrink-0 text-ink-faint" />
            </Link>
            );
          })}
        </div>
      </div>

      {/* 4 — Daily Pulse */}
      <div className="mt-6">
        <PulseCard memberId={m.id} />
      </div>

      {/* 5 — Next human touchpoint */}
      {nextSession && (
        <Link
          href="/member/coach"
          className="card mt-5 flex items-center gap-3 p-4 transition-shadow hover:shadow-lift"
        >
          <CalendarClock size={17} className="shrink-0 text-ink-soft" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {nextSession.type} {nextSession.dayOffset === 0 ? "today" : "tomorrow"},{" "}
              {nextSession.time}
            </p>
            <p className="text-[13px] text-ink-faint">Add a question for Deepika</p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-ink-faint" />
        </Link>
      )}

      {/* 6 — One progress cue. A count, never a streak. */}
      <div className="mt-5 rounded-2xl bg-effort-tint px-4 py-3.5">
        <p className="text-[13px] leading-relaxed text-effort-stretch">
          You&rsquo;re building consistency — {" "}
          <span className="font-medium">{activeDays} of the last 14 days</span> included
          at least one healthy action.
        </p>
        <div className="mt-3">
          <ConsistencyBand days={last14days} showDayLetters />
        </div>
      </div>

      <p className="mt-6 px-1 text-[11px] leading-relaxed text-ink-faint">
        Deepika is a health coach and personal trainer. She does not diagnose
        conditions or advise on medication. Anything medical goes to your doctor —
        she will help you prepare the questions.
      </p>

      <div className="h-6" />
    </div>
  );
}
