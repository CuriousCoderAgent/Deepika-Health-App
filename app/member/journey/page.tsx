"use client";

import Link from "next/link";
import { ChevronRight, CalendarClock } from "lucide-react";
import { useStore } from "@/lib/store";
import { ProgressRing, CategoryIcon } from "@/components/ui";

const PHASES = ["Stabilise", "Build", "Consolidate"] as const;

const CATEGORY_COPY: Record<string, string> = {
  movement: "Movement",
  nutrition: "Nutrition",
  sleep: "Sleep & lifestyle",
  hormonal: "Understanding your body",
  behaviour: "Habits",
};

export default function Journey() {
  const { activeMember: m, modules, sessions } = useStore();
  const active = modules.filter((x) => m.activeModuleIds.includes(x.id));
  const nextReview = sessions
    .filter((s) => s.memberId === m.id && s.type === "1:1 coaching" && s.status === "scheduled")
    .sort((a, b) => a.dayOffset - b.dayOffset)[0];
  const upcoming = sessions
    .filter((s) => s.memberId === m.id && s.status === "scheduled" && s.dayOffset >= 0)
    .sort((a, b) => a.dayOffset - b.dayOffset)
    .slice(0, 2);
  const pct = Math.min(1, m.week / 12);

  const grouped = active.reduce<Record<string, typeof active>>((acc, mod) => {
    (acc[mod.category] ||= []).push(mod);
    return acc;
  }, {});

  return (
    <div className="animate-rise px-5 pt-8">
      <p className="label">Week {m.week}</p>
      <h1 className="mt-2 font-display text-[1.7rem] leading-tight">Your journey</h1>

      {/* 12-week orientation — where you are, not how well you are doing */}
      <div className="card mt-5 flex items-center gap-4 p-4">
        <ProgressRing value={pct} label={`${Math.round(pct * 100)}%`} />
        <div className="min-w-0">
          <p className="font-medium leading-snug">12-week foundation journey</p>
          <p className="mt-0.5 text-[13px] text-ink-soft">Week {m.week} of 12</p>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="mt-4">
          <p className="label mb-2">Upcoming milestones</p>
          <div className="space-y-2">
            {upcoming.map((s) => (
              <div key={s.id} className="card flex items-center gap-3 p-3.5">
                <CalendarClock size={16} className="shrink-0 text-ink-soft" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium leading-snug">{s.type}</p>
                  <p className="text-[13px] text-ink-faint">
                    {s.dayOffset === 0 ? "Today" : s.dayOffset === 1 ? "Tomorrow" : `In ${s.dayOffset} days`} ·{" "}
                    {s.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase ribbon — order carries real information here, so it is numbered */}
      <div className="mt-6 flex gap-1.5">
        {PHASES.map((p, i) => {
          const current = p === m.phase;
          const past = PHASES.indexOf(m.phase) > i;
          return (
            <div key={p} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  current ? "bg-effort-target" : past ? "bg-effort-min" : "bg-paper-sunk"
                }`}
              />
              <p
                className={`mt-1.5 text-[11px] ${
                  current ? "font-medium text-ink" : "text-ink-faint"
                }`}
              >
                {p}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
        {m.phase === "Stabilise"
          ? "Right now we are making things steady, not hard. Intensity comes later and only when the habit holds."
          : m.phase === "Build"
          ? "The habit is holding, so we are adding load and complexity."
          : "Consolidating what you have built so it survives without constant attention."}
      </p>

      {/* Weekly focus */}
      <div className="mt-7 rounded-2xl bg-effort-tint p-4">
        <p className="label">This week</p>
        <ul className="mt-2 space-y-1.5">
          {m.weeklyFocus.map((f, i) => (
            <li key={i} className="text-[15px] leading-snug text-effort-stretch">
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Goals */}
      <div className="mt-6">
        <p className="label">What you said you wanted</p>
        <ul className="mt-2.5 space-y-2">
          {m.goals.map((g, i) => (
            <li key={i} className="card p-3.5 text-[15px] leading-snug">
              {g}
            </li>
          ))}
        </ul>
      </div>

      {m.wontDo && (
        <div className="mt-4 rounded-2xl border border-dashed border-ink-line p-4">
          <p className="label">And what you said you would not do</p>
          <p className="mt-1.5 text-[14px] italic leading-relaxed text-ink-soft">
            &ldquo;{m.wontDo}&rdquo;
          </p>
          <p className="mt-2 text-[12px] text-ink-faint">
            Deepika builds around this. It is not a problem to be solved.
          </p>
        </div>
      )}

      {/* Active modules */}
      <div className="mt-7">
        <p className="label">What you are working on</p>
        <div className="mt-3 space-y-5">
          {Object.entries(grouped).map(([cat, mods]) => (
            <div key={cat}>
              <p className="mb-2 text-[13px] font-medium text-ink-soft">
                {CATEGORY_COPY[cat] ?? cat}
              </p>
              <div className="space-y-2">
                {mods.map((mod) => (
                  <Link
                    key={mod.id}
                    href={`/member/module/${mod.id}`}
                    className="card flex items-center gap-3 p-3.5 transition-shadow hover:shadow-lift"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-sunk">
                      <CategoryIcon category={mod.category} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{mod.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-faint">
                        {mod.betterLooksLike}
                      </p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-ink-faint" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {nextReview && (
        <Link
          href="/member/reflection"
          className="card mt-7 block p-4 transition-shadow hover:shadow-lift"
        >
          <p className="label">Before your next review</p>
          <p className="mt-1.5 text-[15px] font-medium">
            Five questions, about two minutes
          </p>
          <p className="mt-1 text-[13px] text-ink-soft">
            It means Deepika spends the session helping rather than asking. You can
            also leave it and do it together.
          </p>
        </Link>
      )}

      <div className="h-8" />
    </div>
  );
}
