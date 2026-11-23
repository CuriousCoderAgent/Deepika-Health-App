"use client";

import { useStore } from "@/lib/store";
import { dateKey } from "@/lib/calendar";
import { dayName, hasAnything, lastDays, moodOf, type DayLevel } from "@/lib/dayView";
import BottomSheet from "./BottomSheet";
import type { DailyAction } from "@/lib/types";

export const LEVEL_FILL: Record<Exclude<DayLevel, null> | "none", string> = {
  stretch: "bg-effort-stretch",
  target: "bg-effort-target",
  minimum: "bg-effort-min",
  rest: "bg-rest-tint",
  none: "bg-paper-sunk",
};

const SIZE_NAME = { minimum: "Minimum", target: "Target", stretch: "Stretch" } as const;

/**
 * Her last fourteen days, one line each.
 *
 * The consistency band says how many days; this says which, and what was in
 * them. It is a record to read, not a list to clear: an empty day is just
 * "nothing logged", in the same grey as the square it came from.
 *
 * Yesterday can still be marked. Forgetting to tap is not the same as not
 * doing it, and Deepika plans from what actually happened. Only yesterday —
 * further back, memory is a worse record than a blank.
 */
export default function DayHistory({
  open,
  onClose,
  onMark,
}: {
  open: boolean;
  onClose: () => void;
  /** She did one of yesterday's actions and wants to say so. */
  onMark: (action: DailyAction) => void;
}) {
  const { activeMember: m, actions, pulses, foodEntries, messages, workoutLogs } = useStore();
  const today = dateKey();
  const days = lastDays(m.id, 14, { actions, pulses, foodEntries, messages, workoutLogs }).reverse();

  return (
    <BottomSheet open={open} onClose={onClose} title="Your last 14 days">
      <ul className="divide-y divide-ink-line">
        {days.map((d) => {
          const unmarked = d.dayOffset === -1 ? d.actions.filter((a) => a.completed === null) : [];
          const rested = d.actions.filter((a) => a.completed === "rest");
          const mood = d.pulse ? moodOf(d.pulse) : null;
          return (
            <li key={d.dayOffset} className="flex gap-3 py-3">
              <span
                className={`mt-0.5 h-5 w-5 shrink-0 rounded-[5px] ${LEVEL_FILL[d.level ?? "none"]}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium leading-snug">{dayName(d.dayOffset, today)}</p>

                {d.done.map((a) => (
                  <p key={a.id} className="mt-0.5 text-[13px] leading-snug text-ink-soft">
                    {a.title}
                    <span className="text-ink-faint"> · {SIZE_NAME[a.completed as keyof typeof SIZE_NAME]}</span>
                  </p>
                ))}
                {rested.map((a) => (
                  <p key={a.id} className="mt-0.5 text-[13px] leading-snug text-ink-faint">
                    {a.title} · not today{a.skipReason ? ` (${a.skipReason.toLowerCase()})` : ""}
                  </p>
                ))}

                {(d.pulse || d.foodCount > 0) && (
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-faint">
                    {[
                      d.pulse &&
                        `${mood ? `Felt ${mood.label.toLowerCase()}` : "Checked in"} · energy ${d.pulse.energy}${
                          d.pulse.sleep ? ` · sleep ${d.pulse.sleep}` : ""
                        } · calm ${d.pulse.stress}`,
                      d.foodCount > 0 && `${d.protein}g protein`,
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                )}

                {!hasAnything(d) && <p className="mt-0.5 text-[13px] text-ink-faint">Nothing logged</p>}

                {unmarked.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[12px] text-ink-soft">Did one of these and didn&rsquo;t tap it?</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {unmarked.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => onMark(a)}
                          className="min-h-[40px] rounded-full border border-ink-line bg-paper-card px-3.5 text-[13px] text-ink hover:border-effort-target"
                        >
                          {a.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
        A record, not a scoreboard. Deepika sees the same days you do.
      </p>
    </BottomSheet>
  );
}
