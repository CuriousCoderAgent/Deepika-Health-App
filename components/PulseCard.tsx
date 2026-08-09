"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { ProvenanceChip } from "./ui";

const SCALES = [
  { key: "energy", label: "Energy", low: "Empty", high: "Good" },
  { key: "sleep", label: "Sleep", low: "Broken", high: "Solid" },
  { key: "stress", label: "Mental load", low: "Light", high: "Heavy" },
] as const;

/**
 * One-tap mood — a lower-friction first rung than three separate 1–5 taps.
 * It only ever pre-fills energy and stress. Sleep is deliberately left for
 * the full Pulse below: R03/R04 need energy and sleep recorded separately,
 * so a mood tap can never stand in for a sleep rating.
 */
const MOODS = [
  { key: "good", label: "Good", energy: 4, stress: 2, cls: "bg-effort-tint text-effort-stretch" },
  { key: "okay", label: "Okay", energy: 3, stress: 3, cls: "bg-paper-sunk text-ink-soft" },
  { key: "tired", label: "Tired", energy: 2, stress: 3, cls: "bg-rest-tint text-ink-soft" },
  { key: "stressed", label: "Stressed", energy: 2, stress: 4, cls: "bg-attention-tint text-attention" },
] as const;

const SYMPTOMS = ["Hot flush", "Night waking", "Bloating", "Joint aches", "Low mood", "Cramping"];

/**
 * Acceptance test from §17.3: completable in under 20 seconds without typing.
 * Three taps submits. The free-text field is optional and last.
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
          <span>Load {existing.stress}/5</span>
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

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">How is today?</p>
        <span className="font-mono text-[10px] text-ink-faint">ABOUT 15 SECONDS</span>
      </div>

      <div className="mt-4">
        <p className="text-[13px] text-ink-soft">How are you feeling?</p>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          {MOODS.map((mo) => (
            <button
              key={mo.key}
              onClick={() => {
                setMood(mo.key);
                setV((p) => ({ ...p, energy: mo.energy, stress: mo.stress }));
              }}
              className={`tap flex h-11 items-center justify-center rounded-xl text-[13px] font-medium transition-all ${
                mood === mo.key ? mo.cls : "bg-paper-sunk text-ink-faint hover:bg-ink-line"
              }`}
            >
              {mo.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-ink-faint">
          {mood ? "Good start — just add sleep below to finish." : "Or answer all three below."}
        </p>
      </div>

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
    </div>
  );
}
