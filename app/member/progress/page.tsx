"use client";

import { useStore } from "@/lib/store";
import { ConsistencyBand, ProvenanceChip, Sparkline } from "@/components/ui";

export default function Progress() {
  const { activeMember: m, actions, pulses, workoutLogs } = useStore();

  const mine = actions.filter((a) => a.memberId === m.id);
  const days = Array.from({ length: 14 }).map((_, i) => {
    const offset = i - 13;
    const day = mine.filter((a) => a.dayOffset === offset);
    const best = day.find((a) => a.completed === "stretch")
      ? "stretch"
      : day.find((a) => a.completed === "target")
      ? "target"
      : day.find((a) => a.completed === "minimum")
      ? "minimum"
      : day.find((a) => a.completed === "rest")
      ? "rest"
      : null;
    return { level: best as any, dayOffset: offset };
  });
  const activeDays = days.filter((d) => d.level && d.level !== "rest").length;

  const p = pulses
    .filter((x) => x.memberId === m.id)
    .sort((a, b) => a.dayOffset - b.dayOffset);
  const energy = p.map((x) => x.energy);
  const sleep = p.map((x) => x.sleep);

  const comebacks = (() => {
    const done = mine
      .filter((a) => a.completed && a.completed !== "rest")
      .map((a) => a.dayOffset)
      .sort((a, b) => a - b);
    let n = 0;
    for (let i = 1; i < done.length; i++) if (done[i] - done[i - 1] >= 3) n++;
    return n;
  })();

  const logs = workoutLogs.filter((l) => l.memberId === m.id);

  return (
    <div className="animate-rise px-5 pt-8">
      <h1 className="font-display text-[1.7rem] leading-tight">Progress</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
        Weight is on this page, but it is not the headline and it never will be.
      </p>

      {/* The headline metric is consistency. Deliberately. */}
      <div className="mt-7 card p-5">
        <p className="label">Consistency</p>
        <p className="mt-2 font-display text-[2rem] leading-none">
          {activeDays}
          <span className="text-lg text-ink-faint"> of 14 days</span>
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          You did something on {activeDays} of the last fourteen days.
        </p>
        <div className="mt-4">
          <ConsistencyBand days={days} showDayLetters />
        </div>
      </div>

      {comebacks > 0 && (
        <div className="mt-4 rounded-2xl bg-effort-tint p-4">
          <p className="label">Comebacks</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-effort-stretch">
            You came back after a gap {comebacks} time{comebacks > 1 ? "s" : ""}. That is
            the single best predictor that this will still be happening next year.
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="label">Energy</p>
          <div className="mt-2">
            <Sparkline values={energy} color="#6E8F73" />
          </div>
          <p className="mt-1 text-[12px] text-ink-faint">Last {energy.length} check-ins</p>
        </div>
        <div className="card p-4">
          <p className="label">Sleep</p>
          <div className="mt-2">
            <Sparkline values={sleep} color="#8FA9C4" />
          </div>
          <p className="mt-1 text-[12px] text-ink-faint">Last {sleep.length} check-ins</p>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="mt-6 card p-5">
          <p className="label">Strength</p>
          <div className="mt-3 space-y-2.5">
            {logs.slice(0, 3).map((l) => (
              <div key={l.id} className="flex items-baseline justify-between">
                <p className="text-[14px]">Session effort</p>
                <p className="font-mono text-[13px] text-ink-soft">{l.rpe}/10</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">
            As sessions start to feel easier at the same load, Deepika adds weight.
            That is what progress looks like here.
          </p>
        </div>
      )}

      {m.bodyComp && m.bodyComp.length > 0 && (
        <div className="mt-6 card p-5">
          <p className="label">Measurements</p>
          <div className="mt-3 space-y-3">
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
          <p className="mt-4 text-[12px] leading-relaxed text-ink-faint">
            Measured every four to six weeks, not daily. Day-to-day movement in
            these numbers is noise, and watching it does nothing useful.
          </p>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
