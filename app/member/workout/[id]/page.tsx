"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, AlertTriangle, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { dateKey } from "@/lib/calendar";
import { workoutLogFor } from "@/lib/workoutLog";
import ExerciseFigure from "@/components/ExerciseFigure";
import ExerciseSheet from "@/components/ExerciseSheet";
import type { EffortLevel, ExerciseSet } from "@/lib/types";

const SIZE_NAME = { minimum: "Minimum", target: "Target", stretch: "Stretch" } as const;

/** What she is told once a session is saved. The first is a promise, kept by
 *  Radar rule R12 — so it reads the same wherever her log is shown. */
const SAVED = {
  hurt: "You flagged discomfort, so Deepika will see this before anything else today. Do not do the next session until she has replied.",
  fine: "Deepika will see your effort rating when she plans next week.",
};

export default function WorkoutDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { day?: string };
}) {
  const { workouts, workoutLogs, activeMember, logWorkout, actions, completeAction } = useStore();
  const w = workouts.find((x) => x.id === params.id);

  const [openExercise, setOpenExercise] = useState<ExerciseSet | null>(null);
  const [stage, setStage] = useState<"view" | "finish" | "done">("view");
  // What the form was last opened on: a log she has saved, or "new" for none.
  const [formFor, setFormFor] = useState("new");
  const [level, setLevel] = useState<EffortLevel>("target");
  const [rpe, setRpe] = useState(6);
  const [pain, setPain] = useState(false);
  const [felt, setFelt] = useState("");

  if (!w) {
    return (
      <div className="px-5 pt-10">
        <p className="text-sm text-ink-soft">That session is not on your plan.</p>
      </div>
    );
  }

  /* Reached from "Did one of these and didn't tap it?", the session was
     yesterday's — and logging it against today would leave yesterday blank and
     put a session on a day she did not train. Only yesterday, and only when
     the session really was on her plan then; anything else is today. */
  const on = (day: number) =>
    actions.find((a) => a.memberId === activeMember.id && a.dayOffset === day && a.workoutId === w.id);
  const yesterdays = searchParams?.day === "-1" ? on(-1) : undefined;
  const day = yesterdays ? -1 : 0;
  const linked = yesterdays ?? on(0);

  /* A session is logged once a day (lib/workoutLog.ts). When it has been, this
     page says so where "I have finished" was, and Change opens the form on what
     she logged — never blank, and never on something she tapped and backed out
     of, where one more "Save it" would quietly write "nothing hurt" over a pain
     flag Deepika had not read yet.

     A form for a session not yet logged is left as she had it, so going Back to
     look at a move does not lose what she had tapped. */
  const logged = workoutLogFor(workoutLogs, activeMember.id, w.id, day);
  const formNow = logged?.id ?? "new";
  const openForm = () => {
    if (logged || formFor !== formNow) {
      setLevel(logged?.completedLevel ?? "target");
      setRpe(logged?.rpe ?? 6);
      setPain(logged?.painFlag ?? false);
      setFelt(logged?.feltLike ?? "");
      setFormFor(formNow);
    }
    setStage("finish");
  };

  if (stage === "done") {
    return (
      <div className="animate-rise px-5 pt-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-effort-target text-white">
          <Check size={28} strokeWidth={2.5} />
        </div>
        <h1 className="mt-6 font-display text-2xl">{day === -1 ? "Logged for yesterday." : "Logged."}</h1>
        <p className="mx-auto mt-2 max-w-[17rem] text-[15px] leading-relaxed text-ink-soft">
          {pain ? SAVED.hurt : SAVED.fine}
        </p>
        <Link
          href="/member"
          className="tap mt-8 inline-flex items-center rounded-xl bg-ink px-5 text-sm font-medium text-white"
        >
          Back to Today
        </Link>
      </div>
    );
  }

  /* Only while the form still belongs to what is logged. If that changes under
     it — her record arriving after the page did, or the day turning over —
     she is shown the session again, and the button there opens the right form. */
  if (stage === "finish" && formFor === formNow) {
    return (
      <div className="animate-rise px-5 pt-6">
        <button
          onClick={() => setStage("view")}
          className="tap -ml-2 inline-flex items-center gap-1 rounded-lg px-2 text-sm text-ink-faint hover:text-ink"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <h1 className="mt-4 font-display text-2xl">
          {day === -1 ? "How did it go yesterday?" : "How did that go?"}
        </h1>

        <div className="mt-6">
          <p className="label">What did you get through?</p>
          <div className="mt-2.5 space-y-2">
            {(["minimum", "target", "stretch"] as EffortLevel[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`tap flex w-full items-center gap-3 rounded-xl p-3.5 text-left transition-colors ${
                  level === l ? "bg-ink text-white" : "bg-paper-card shadow-card"
                }`}
              >
                <span
                  className={`h-8 w-1.5 rounded-full ${
                    l === "minimum"
                      ? "bg-effort-min"
                      : l === "target"
                      ? "bg-effort-target"
                      : "bg-effort-stretch"
                  }`}
                />
                <span className="flex-1">
                  <span className="block text-[15px] font-medium capitalize">{l}</span>
                  <span
                    className={`block text-[13px] ${
                      level === l ? "text-white/70" : "text-ink-soft"
                    }`}
                  >
                    {w[l].label}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <p className="label">How hard did it feel?</p>
            <span className="font-mono text-[11px] text-ink-soft">{rpe} / 10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            className="mt-3 w-full accent-[#3F6B57]"
            aria-label="Perceived effort"
          />
          <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
            <span>Easy</span>
            <span>Could not do one more</span>
          </div>
        </div>

        <button
          onClick={() => setPain((p) => !p)}
          className={`tap mt-6 flex w-full items-center gap-3 rounded-xl p-3.5 text-left transition-colors ${
            pain ? "bg-attention-tint ring-1 ring-attention/30" : "bg-paper-card shadow-card"
          }`}
        >
          <AlertTriangle size={17} className={pain ? "text-attention" : "text-ink-faint"} />
          <span className="flex-1 text-[14px]">
            Something hurt — not just hard, actually hurt
          </span>
          <span
            className={`h-5 w-5 rounded-md border ${
              pain ? "border-attention bg-attention" : "border-ink-line"
            }`}
          />
        </button>

        <textarea
          value={felt}
          onChange={(e) => setFelt(e.target.value)}
          placeholder="Anything you want to say about it? (optional)"
          rows={2}
          className="mt-4 w-full resize-none rounded-xl border border-ink-line bg-paper px-3 py-2.5 text-[14px] placeholder:text-ink-faint focus:border-effort-target focus:outline-none"
        />

        <button
          onClick={() => {
            logWorkout({
              memberId: activeMember.id,
              workoutId: w.id,
              dayOffset: day,
              completedLevel: level,
              rpe,
              painFlag: pain,
              feltLike: felt || undefined,
              provenance: {
                source: "member_manual",
                enteredBy: activeMember.name.split(" ")[0],
                at: dateKey(),
              },
            });
            if (linked) completeAction(linked.id, level);
            setStage("done");
          }}
          className="tap mt-5 w-full rounded-xl bg-ink text-sm font-medium text-white"
        >
          Save it
        </button>

        <div className="h-8" />
      </div>
    );
  }

  return (
    <div className="animate-rise px-5 pt-6">
      <Link
        href={day === -1 ? "/member" : "/member/movement"}
        className="tap -ml-2 inline-flex items-center gap-1 rounded-lg px-2 text-sm text-ink-faint hover:text-ink"
      >
        <ChevronLeft size={16} /> {day === -1 ? "Today" : "Movement"}
      </Link>

      <h1 className="mt-3 font-display text-[1.55rem] leading-tight">{w.name}</h1>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{w.intent}</p>

      {day === -1 && !logged && (
        <p className="mt-3 rounded-xl bg-paper-sunk/70 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-soft">
          You&rsquo;re logging this for <span className="font-medium text-ink">yesterday</span>.
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        {(["minimum", "target", "stretch"] as EffortLevel[]).map((l) => (
          <div key={l} className="rounded-xl bg-paper-sunk/70 p-2.5">
            <span
              className={`block h-1 w-6 rounded-full ${
                l === "minimum"
                  ? "bg-effort-min"
                  : l === "target"
                  ? "bg-effort-target"
                  : "bg-effort-stretch"
              }`}
            />
            <p className="mt-1.5 text-[11px] capitalize text-ink-soft">{l}</p>
            <p className="font-mono text-[13px]">{w[l].minutes} min</p>
          </div>
        ))}
      </div>

      {w.warmup.length > 0 && (
        <div className="mt-5">
          <p className="label">Warm up</p>
          <ul className="mt-1.5 space-y-1">
            {w.warmup.map((x, i) => (
              <li key={i} className="text-[13px] text-ink-soft">
                {x}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <p className="label">The session</p>
          <span className="text-[11px] text-ink-faint">Tap any move to see how</span>
        </div>
        <div className="mt-2.5 space-y-2">
          {w.exercises.map((e, i) => (
            <button
              key={i}
              onClick={() => setOpenExercise(e)}
              className="card flex w-full items-center gap-3 px-3.5 py-3 text-left transition-shadow hover:shadow-lift"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-paper-sunk/70">
                <ExerciseFigure figure={e.figure} size={46} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-medium leading-snug">{e.name}</span>
                  <span className="shrink-0 font-mono text-[12px] text-ink-soft">
                    {e.prescription}
                  </span>
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-faint">
                  {e.cue}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <ExerciseSheet exercise={openExercise} onClose={() => setOpenExercise(null)} />

      <div className="mt-6 rounded-2xl border border-attention/25 bg-attention-tint/60 p-4">
        <p className="label mb-1">When to stop</p>
        <p className="text-[13px] leading-relaxed text-ink-soft">{w.stopGuidance}</p>
      </div>

      {logged ? (
        /* The same folded line the check-in becomes once it is answered. */
        <>
          <div className="card mt-6 flex items-center gap-3 py-2.5 pl-4 pr-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-effort-tint text-effort-stretch">
              <Check size={17} strokeWidth={2.1} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium leading-snug">
                {day === -1 ? "Logged for yesterday" : "Logged today"}
              </p>
              <p className="text-[12px] leading-snug text-ink-soft">
                {SIZE_NAME[logged.completedLevel]} · Effort {logged.rpe}/10
              </p>
            </div>
            <button
              onClick={openForm}
              className="tap shrink-0 rounded-xl px-3 text-[13px] text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Change
            </button>
          </div>
          {logged.painFlag && (
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">{SAVED.hurt}</p>
          )}
        </>
      ) : (
        <button
          onClick={openForm}
          className="tap mt-6 w-full rounded-xl bg-ink text-sm font-medium text-white"
        >
          {day === -1 ? "I did this yesterday" : "I have finished"}
        </button>
      )}

      <div className="h-8" />
    </div>
  );
}
