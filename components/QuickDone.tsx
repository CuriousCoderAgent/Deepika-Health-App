"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import BottomSheet from "./BottomSheet";
import { toast } from "./Toast";
import type { DailyAction, EffortLevel } from "@/lib/types";

const LEVELS: { key: EffortLevel; name: string; bar: string }[] = [
  { key: "minimum", name: "Minimum", bar: "bg-effort-min" },
  { key: "target", name: "Target", bar: "bg-effort-target" },
  { key: "stretch", name: "Stretch", bar: "bg-effort-stretch" },
];

export const REST_REASONS = ["Ran out of time", "Too tired", "Not feeling well", "Family came first", "Travelling"];

/** The same reinforcement the action page gives — the behaviour, not her worth. */
const SAID: Record<EffortLevel | "rest", string> = {
  minimum: "Recorded. That is a complete day.",
  target: "Recorded. Exactly what the plan asked for.",
  stretch: "Recorded. More than the plan asked for.",
  rest: "Noted — not today. Nothing is behind.",
};

/** A short tick under the thumb on phones that can — never for someone who
 *  has asked their device for less motion. */
function buzz() {
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate?.(12);
  } catch {
    /* not supported, or blocked — the toast still says it was saved */
  }
}

/**
 * Marking an action done without leaving Today.
 *
 * The full action page — why this, what is in it — is still one tap away, but
 * it is no longer a toll on the way to saying "I did it". Tapping the circle
 * opens this: three sizes presented as equals, "not today" with its reason,
 * and an Undo afterwards for the mis-tap.
 *
 * A strength session is the exception. It is logged from the session page,
 * because that is where she rates the effort and flags anything that hurt —
 * the two things Deepika plans the next week from.
 */
export default function QuickDone({
  action: a,
  onClose,
}: {
  action: DailyAction | null;
  onClose: () => void;
}) {
  const { completeAction, updateAction } = useStore();
  const [restOpen, setRestOpen] = useState(false);
  // The last action shown, so the sheet does not blank out mid-slide as it closes.
  const [last, setLast] = useState<DailyAction | null>(null);

  useEffect(() => {
    if (a) {
      setLast(a);
      setRestOpen(false);
    }
  }, [a]);

  const shown = a ?? last;
  // Opened from the history, for something she did yesterday and did not tap.
  const past = shown ? shown.dayOffset < 0 : false;

  const record = (level: EffortLevel | "rest", reason?: string) => {
    if (!shown) return;
    const before = { completed: shown.completed, skipReason: shown.skipReason, provenance: shown.provenance };
    completeAction(shown.id, level, reason);
    buzz();
    onClose();
    const said = !past ? SAID[level] : level === "rest" ? "Noted. Nothing is behind." : "Recorded for yesterday.";
    toast(said, { label: "Undo", run: () => updateAction(shown.id, before) });
  };

  const clear = () => {
    if (!shown) return;
    updateAction(shown.id, { completed: null, skipReason: undefined });
    onClose();
  };

  return (
    <BottomSheet open={Boolean(a)} onClose={onClose} title={shown?.title ?? ""}>
      {shown && (
        <div>
          {shown.workoutId ? (
            <>
              <p className="text-[14px] leading-relaxed text-ink-soft">
                This one is a strength session. Log it from the session itself, so
                you can say how hard it felt and flag anything that hurt.
              </p>
              <Link
                href={`/member/workout/${shown.workoutId}${past ? "?day=-1" : ""}`}
                onClick={onClose}
                className="tap mt-3 flex w-full items-center justify-between gap-2 rounded-xl bg-effort-stretch px-4 text-[15px] font-medium text-white"
              >
                Open the session
                <ChevronRight size={17} />
              </Link>
            </>
          ) : (
            <>
              <p className="label">How much of it did you do{past ? " yesterday" : ""}?</p>
              <div className="mt-2.5 space-y-2">
                {LEVELS.map((l) => {
                  const spec = shown[l.key];
                  const on = shown.completed === l.key;
                  return (
                    <button
                      key={l.key}
                      onClick={() => record(l.key)}
                      aria-pressed={on}
                      className={`tap press flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition-colors ${
                        on ? "bg-effort-tint ring-1 ring-effort-target/40" : "bg-paper-sunk/60 hover:bg-paper-sunk"
                      }`}
                    >
                      <span className={`h-10 w-1.5 shrink-0 rounded-full ${l.bar}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="text-[15px] font-medium">{l.name}</span>
                          {spec.minutes > 0 && (
                            <span className="font-mono text-[10px] text-ink-faint">{spec.minutes} MIN</span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{spec.label}</span>
                      </span>
                      {on && <Check size={17} strokeWidth={2.6} className="shrink-0 text-effort-stretch" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[12px] leading-relaxed text-ink-faint">
                All three count. The minimum is the version made for days like the hard ones.
              </p>
            </>
          )}

          {/* Rest — neutral, never a failure state, with a reason Deepika can learn from. */}
          <div className="mt-4 border-t border-ink-line pt-3">
            {!restOpen ? (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <button
                  onClick={() => setRestOpen(true)}
                  className="tap text-[14px] text-ink-soft underline underline-offset-2 hover:text-ink"
                >
                  {past ? "Didn\u2019t get to it" : "Not today"}
                </button>
                {shown.completed && (
                  <button
                    onClick={clear}
                    className="tap text-[14px] text-ink-soft underline underline-offset-2 hover:text-ink"
                  >
                    Clear what I marked
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p className="text-[14px]">What got in the way?</p>
                <p className="mt-0.5 text-[12px] text-ink-faint">
                  Not a confession — it tells Deepika what to change.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {[...REST_REASONS, "Rather not say"].map((r) => (
                    <button
                      key={r}
                      onClick={() => record("rest", r === "Rather not say" ? undefined : r)}
                      className="min-h-[40px] rounded-full bg-paper-sunk px-3.5 text-[13px] text-ink-soft transition-colors hover:bg-ink-line"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* The page behind this link is written about today. */}
          {!past && (
            <Link
              href={`/member/action/${shown.id}`}
              onClick={onClose}
              className="tap mt-1 inline-flex items-center gap-1 text-[13px] text-effort-stretch"
            >
              What&rsquo;s in it, and why today <ChevronRight size={14} />
            </Link>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
