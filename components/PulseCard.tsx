"use client";

import { useState } from "react";
import { Check, Smile, Meh, Moon, Frown } from "lucide-react";
import { useStore } from "@/lib/store";
import { ProvenanceChip } from "./ui";

// All three scales run the same direction: 1 is the hard end, 5 is good.
// (An earlier version had Mental load running backwards — Light→Heavy, so 1
// was "good" here but "bad" on the other two scales. Design review caught it.)
const SCALES = [
  { key: "energy", label: "Energy", low: "Drained", high: "Energised" },
  { key: "sleep", label: "Sleep", low: "Poor", high: "Restorative" },
  { key: "stress", label: "Mental state", low: "Overwhelmed", high: "Calm" },
] as const;

/**
 * One-tap mood — a lower-friction first rung than three separate 1–5 taps.
 * It only ever pre-fills energy and stress. Sleep is deliberately left for
 * the full Pulse below: R03/R04 need energy and sleep recorded separately,
 * so a mood tap can never stand in for a sleep rating.
 *
 * Icons, not emoji faces — one icon family throughout, per the design
 * review. Colour comes from the existing token set: no true red (that's
 * reserved for genuine system errors, not a self-reported feeling) and no
 * lavender (that stays unused until there's a real AI feature to attach it
 * to). "Tired" gets its own cool, calm tone rather than reusing marigold or
 * attention, both of which already mean something specific elsewhere.
 */
const MOODS = [
  { key: "good", label: "Good", energy: 4, stress: 4, icon: Smile, cls: "bg-effort-tint text-effort-stretch" },
  { key: "okay", label: "Okay", energy: 3, stress: 3, icon: Meh, cls: "bg-paper-sunk text-ink-soft" },
  { key: "tired", label: "Tired", energy: 2, stress: 3, icon: Moon, cls: "bg-calm-tint text-calm" },
  { key: "stressed", label: "Stressed", energy: 2, stress: 2, icon: Frown, cls: "bg-attention-tint text-attention" },
] as const;

const SYMPTOMS = ["Hot flush", "Night waking", "Bloating", "Joint aches", "Low mood", "Cramping"];

/**
 * Acceptance test from §17.3: completable in under 20 seconds without typing.
 * Three taps submits. The free-text field is optional and last.
 *
 * Progressive disclosure: only the mood row shows at first. Tapping a mood,
 * or "+ Add details", reveals the full three-scale form in place. This isn't
 * yet the true bottom sheet the Aug 2026 design review asks for — that's next
 * sprint — but it gets the same result today: nobody sees five form fields
 * before they've made one tap.
 */
export default function PulseCard({
  memberId,
  asCoach = false,
}: {
  memberId: string;
  asCoach?: boolean;
}) {
  const { pulses, submitPulse } = useStore();
  const existing = pulses.find((p) => p.memberId === memberId && p.dayOffset === 0);

  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ energy: 0, sleep: 0, stress: 0 });
  const [mood, setMood] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const ready = v.energy > 0 && v.sleep > 0 && v.stress > 0;

  if (existing && !open) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-effort-tint text-effort-stretch">
            <Check size={13} strokeWidth={3} />
          </span>
          <p className="text-sm font-medium">Today&rsquo;s check-in is done</p>
          <span className="ml-auto">
            <ProvenanceChip p={existing.provenance} />
          </span>
        </div>
        <div className="mt-3 flex gap-4 text-[13px] text-ink-soft">
          <span>Energy {existing.energy}/5</span>
          <span>Sleep {existing.sleep}/5</span>
          <span>Calm {existing.stress}/5</span>
        </div>
        {existing.symptoms.length > 0 && (
          <p className="mt-2 text-[13px] text-ink-faint">{existing.symptoms.join(" · ")}</p>
        )}
        <button
          onClick={() => setOpen(true)}
          className="mt-3 text-[13px] text-ink-faint underline underline-offset-2 hover:text-ink"
        >
          Change it
        </button>
      </div>
    );
  }

  const showDetails = detailsOpen || mood !== null;

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">How are you feeling?</p>
        {!showDetails && (
          <span className="font-mono text-[10px] text-ink-faint">ONE TAP</span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {MOODS.map((mo) => {
          const Icon = mo.icon;
          const on = mood === mo.key;
          return (
            <button
              key={mo.key}
              onClick={() => {
                setMood(mo.key);
                setV((p) => ({ ...p, energy: mo.energy, stress: mo.stress }));
              }}
              className="tap flex flex-col items-center gap-1.5"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                  on ? mo.cls : "bg-paper-sunk text-ink-faint hover:bg-ink-line"
                }`}
              >
                <Icon size={19} strokeWidth={on ? 2.2 : 1.7} />
              </span>
              <span className={`text-[11px] ${on ? "font-medium text-ink" : "text-ink-faint"}`}>
                {mo.label}
              </span>
            </button>
          );
        })}
      </div>

      {!showDetails && (
        <button
          onClick={() => setDetailsOpen(true)}
          className="tap mt-3 text-[13px] font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline"
        >
          + Add details
        </button>
      )}

      {showDetails && (
        <>
          {mood && (
            <p className="mt-3 text-[12px] text-ink-faint">
              Sleep isn&rsquo;t part of a mood tap — add it below so tonight&rsquo;s plan can
              actually account for it.
            </p>
          )}
          <div className="mt-4 space-y-4">
            {SCALES.map((s) => (
              <div key={s.key}>
                <div className="flex items-baseline justify-between">
                  <p className="text-[13px] text-ink-soft">{s.label}</p>
                  <p className="font-mono text-[10px] text-ink-faint">
                    {s.low} → {s.high}
                  </p>
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const on = v[s.key] === n;
                    return (
                      <button
                        key={n}
                        onClick={() => setV((p) => ({ ...p, [s.key]: n }))}
                        aria-label={`${s.label} ${n} out of 5`}
                        className={`tap h-11 flex-1 rounded-xl text-sm font-medium transition-all ${
                          on
                            ? "bg-effort-target text-white"
                            : "bg-paper-sunk text-ink-faint hover:bg-ink-line"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-[13px] text-ink-soft">Anything today? (optional)</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SYMPTOMS.map((s) => {
                const on = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() =>
                      setSymptoms((p) => (on ? p.filter((x) => x !== s) : [...p, s]))
                    }
                    className={`rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                      on ? "bg-ink text-white" : "bg-paper-sunk text-ink-soft hover:bg-ink-line"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything Deepika should know? (optional)"
            rows={2}
            className="mt-3 w-full resize-none rounded-xl border border-ink-line bg-paper px-3 py-2.5 text-[13px] placeholder:text-ink-faint focus:border-effort-target focus:outline-none"
          />

          <button
            disabled={!ready}
            onClick={() => {
              submitPulse(memberId, { ...v, symptoms, note: note || undefined }, asCoach);
              setOpen(false);
              setMood(null);
              setDetailsOpen(false);
            }}
            className="tap mt-3 w-full rounded-xl bg-ink text-sm font-medium text-white transition-opacity disabled:opacity-30"
          >
            {asCoach ? "Save on her behalf" : "Done"}
          </button>

          {asCoach && (
            <p className="mt-2 text-[11px] text-marigold-deep">
              This will be recorded as coach-entered, not member-entered.
            </p>
          )}
        </>
      )}
    </div>
  );
}
