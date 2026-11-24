"use client";

import { useStore } from "@/lib/store";
import { dateKey } from "@/lib/calendar";
import { dayName, lastDays, moodOf, type DayView } from "@/lib/dayView";
import { pronouns } from "@/lib/display";
import { ConsistencyBand, ProvenanceChip } from "./ui";
import { LEVEL_FILL } from "./DayHistory";

const SIZE_NAME = { minimum: "Minimum", target: "Target", stretch: "Stretch" } as const;

/** The Radar's own line: a 2 or below is what its energy and sleep rules count. */
const LOW = 2;

function Rating({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-ink-faint">{label} </span>
      {value === null ? (
        <span className="text-ink-faint">–</span>
      ) : (
        <span className={value <= LOW ? "font-semibold text-attention" : "font-medium text-ink"}>{value}</span>
      )}
    </span>
  );
}

function DayRow({ d, today }: { d: DayView; today: string }) {
  const rested = d.actions.filter((a) => a.completed === "rest");
  const mood = d.pulse ? moodOf(d.pulse) : null;
  const nothing = d.done.length === 0 && rested.length === 0;
  return (
    <li className="py-3">
      {/* The day and how she rated it on one line; what happened underneath.
          Side-by-side columns left the middle one a word wide in this card. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5">
        <div className="flex items-center gap-2">
          <span className={`h-3.5 w-3.5 shrink-0 rounded-[3px] ${LEVEL_FILL[d.level ?? "none"]}`} aria-hidden="true" />
          <p className="text-[14px] font-medium leading-snug">{dayName(d.dayOffset, today)}</p>
        </div>
        {/* ml-auto keeps it on the right when a long line (a check-in Deepika
            entered, with its chip) wraps under the day instead of beside it. */}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-0.5 text-[13px]">
          {d.pulse ? (
            <>
              {mood && <span className="text-ink-soft">{mood.label}</span>}
              <Rating label="E" value={d.pulse.energy} />
              <Rating label="S" value={d.pulse.sleep >= 1 ? d.pulse.sleep : null} />
              <Rating label="C" value={d.pulse.stress} />
              {d.pulse.provenance.source === "coach_on_behalf" && <ProvenanceChip p={d.pulse.provenance} />}
            </>
          ) : (
            <span className="text-ink-faint">No check-in</span>
          )}
          <span className="whitespace-nowrap">
            {d.foodCount > 0 ? (
              <>
                <span className="font-medium text-ink">{d.protein}g</span>
                <span className="text-ink-faint"> protein</span>
              </>
            ) : (
              <span className="text-ink-faint">No food logged</span>
            )}
          </span>
        </div>
      </div>

      <div className="mt-1 pl-[1.375rem]">
        {d.done.map((a) => (
          <p key={a.id} className="text-[14px] leading-snug">
            {a.title}
            <span className="text-ink-faint"> · {SIZE_NAME[a.completed as keyof typeof SIZE_NAME]}</span>
            {a.provenance?.source === "coach_on_behalf" && (
              <span className="ml-1.5 align-middle">
                <ProvenanceChip p={a.provenance} />
              </span>
            )}
          </p>
        ))}
        {rested.map((a) => (
          <p key={a.id} className="text-[14px] leading-snug text-ink-soft">
            {a.title} — not today
            {a.skipReason && <span className="text-ink-faint"> · &ldquo;{a.skipReason}&rdquo;</span>}
          </p>
        ))}
        {nothing && (
          <p className="text-[14px] leading-snug text-ink-faint">
            {d.dayOffset === 0 && d.actions.length > 0 ? "Nothing marked yet" : "Nothing marked"}
          </p>
        )}
        {d.workouts.map((w) => (
          <p key={w.id} className="mt-0.5 text-[13px] leading-snug text-ink-soft">
            Session effort <span className="font-medium text-ink">{w.rpe}</span>/10
            {w.feltLike ? ` · “${w.feltLike}”` : ""}
            {w.painFlag && <span className="ml-1.5 font-medium text-attention">flagged pain</span>}
          </p>
        ))}
        {d.pulse && d.pulse.symptoms.length > 0 && (
          <p className="mt-1 flex flex-wrap gap-1">
            {d.pulse.symptoms.map((s) => (
              <span key={s} className="rounded-full bg-attention-tint px-2 py-0.5 text-[12px] text-attention">
                {s}
              </span>
            ))}
          </p>
        )}
        {d.pulse?.note && (
          <p className="mt-1 text-[13px] italic leading-snug text-ink-soft">&ldquo;{d.pulse.note}&rdquo;</p>
        )}
      </div>
    </li>
  );
}

/**
 * Her last seven days, a row each — what Deepika reads before she writes or
 * calls.
 *
 * This replaced two small charts: a band of fourteen squares and a pair of
 * unlabelled lines for energy and sleep. They said that something had happened
 * and roughly which way it was going; they did not say what she did on
 * Thursday, what she wrote that night, or that she flagged pain on Saturday —
 * which are the things a conversation is actually built from.
 *
 * Nothing is interpreted. A rating of 2 or below is set in the attention
 * colour because that is the line the Radar's own rules use, and the legend
 * says so.
 */
export default function HerWeek({ memberId }: { memberId: string }) {
  const { members, actions, pulses, foodEntries, messages, workoutLogs } = useStore();
  const { possessive: their } = pronouns(members.find((m) => m.id === memberId));
  const today = dateKey();
  const data = { actions, pulses, foodEntries, messages, workoutLogs };
  const fortnight = lastDays(memberId, 14, data);
  const week = fortnight.slice(7).reverse();
  const active = fortnight.filter((d) => d.done.length > 0).length;

  return (
    <div className="card p-5 md:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="label">Last 7 days</p>
        <p className="text-[13px] text-ink-soft">
          Active on <span className="font-medium text-ink">{active} of the last 14</span>
        </p>
      </div>
      <div className="mt-3">
        <ConsistencyBand days={fortnight} showDayLetters />
      </div>

      <ul className="mt-2 divide-y divide-ink-line">
        {week.map((d) => (
          <DayRow key={d.dayOffset} d={d} today={today} />
        ))}
      </ul>

      <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
        E, S and C are {their} own ratings out of 5 for energy, sleep and calm. A 2 or below is
        marked — the same line the Radar uses. Nothing here is interpreted.
      </p>
    </div>
  );
}
