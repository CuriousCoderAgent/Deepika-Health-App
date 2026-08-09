"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Check, SlidersHorizontal, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { bucketMeta } from "@/lib/radar";
import type { RadarBucket } from "@/lib/types";

const ORDER: RadarBucket[] = ["attention", "prepare", "celebrate", "admin"];

export default function RadarPage() {
  const { radar, members, rules, toggleRule, resolveRadar } = useStore();
  const [showRules, setShowRules] = useState(false);

  const byBucket = (b: RadarBucket) => radar.filter((r) => r.bucket === b && !r.resolved);
  const memberOf = (id: string) => members.find((m) => m.id === id)!;
  const openCount = radar.filter((r) => !r.resolved).length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label">Sunday, 9 August</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">Radar</h1>
          <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-soft">
            Twenty women, {openCount} things worth your attention. Not an
            alphabetical list of everyone.
          </p>
        </div>
        <button
          onClick={() => setShowRules((v) => !v)}
          className="tap inline-flex items-center gap-2 rounded-xl bg-paper-sunk px-3 text-sm text-ink-soft hover:bg-ink-line hover:text-ink"
        >
          <SlidersHorizontal size={15} />
          {showRules ? "Hide rules" : "Show the rules"}
        </button>
      </div>

      {/* Rule transparency. The whole point: Deepika can read why anything fired. */}
      {showRules && (
        <div className="mt-6 card animate-rise p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Every rule, in one sentence</p>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-soft">
                There is no risk score here and no model. If something appeared on
                your Radar, one of these sentences became true. Switch any of them
                off and it stops firing immediately.
              </p>
            </div>
            <button
              onClick={() => setShowRules(false)}
              className="tap -mr-2 -mt-2 rounded-lg px-2 text-ink-faint hover:text-ink"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-4 divide-y divide-ink-line">
            {rules.map((r) => (
              <div key={r.id} className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 font-mono text-[11px] text-ink-faint">{r.id}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{r.name}</p>
                  <p className="text-[13px] text-ink-faint">{r.trigger}</p>
                </div>
                <span
                  className={`chip shrink-0 ${
                    bucketMeta[r.bucket].dot === "bg-attention"
                      ? "bg-attention-tint text-attention"
                      : "bg-paper-sunk text-ink-soft"
                  }`}
                >
                  {bucketMeta[r.bucket].label}
                </span>
                <button
                  onClick={() => toggleRule(r.id)}
                  role="switch"
                  aria-checked={r.enabled}
                  aria-label={`${r.name} rule`}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    r.enabled ? "bg-effort-target" : "bg-ink-line"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      r.enabled ? "translate-x-[18px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-9 space-y-9">
        {ORDER.map((bucket) => {
          const items = byBucket(bucket);
          const meta = bucketMeta[bucket];
          if (items.length === 0) return null;

          return (
            <section key={bucket}>
              <div className="flex items-baseline gap-3">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                <h2 className="font-display text-xl">{meta.label}</h2>
                <span className="font-mono text-[11px] text-ink-faint">
                  {items.length}
                </span>
              </div>
              <p className="ml-5 mt-0.5 text-[13px] text-ink-faint">{meta.blurb}</p>

              <div className="ml-5 mt-4 space-y-2.5">
                {items.map((r) => {
                  const m = memberOf(r.memberId);
                  return (
                    <div
                      key={r.id}
                      className="card group flex items-start gap-4 p-4 transition-shadow hover:shadow-lift"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-medium ${
                          bucket === "celebrate"
                            ? "bg-effort-tint text-effort-stretch"
                            : bucket === "attention"
                            ? "bg-attention-tint text-attention"
                            : "bg-paper-sunk text-ink-soft"
                        }`}
                      >
                        {m.initials}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <Link
                            href={`/coach/members/${m.id}`}
                            className="font-medium hover:underline"
                          >
                            {m.name}
                          </Link>
                          <span className="text-[13px] text-ink-faint">
                            Week {m.week} · {m.phase}
                          </span>
                          <span className="chip ml-auto bg-paper-sunk text-ink-faint">
                            {r.ruleId}
                          </span>
                        </div>

                        <p className="mt-1 text-[15px] leading-snug">{r.detail}</p>

                        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                          <span className="text-ink-faint">Because: </span>
                          {r.trigger}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <p className="flex-1 text-[13px] leading-relaxed text-effort-stretch">
                            {r.suggestedAction}
                          </p>
                          <button
                            onClick={() => resolveRadar(r.id)}
                            className="tap inline-flex items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-ink-faint hover:bg-paper-sunk hover:text-ink"
                          >
                            <Check size={14} /> Handled
                          </button>
                          <Link
                            href={`/coach/members/${m.id}`}
                            className="tap inline-flex items-center gap-1 rounded-lg bg-paper-sunk px-2.5 text-[13px] text-ink hover:bg-ink-line"
                          >
                            Open <ChevronRight size={13} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {openCount === 0 && (
          <div className="card p-10 text-center">
            <p className="font-display text-xl">Nothing needs you right now.</p>
            <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">
              That is a real state, not an empty one. Everyone is either on plan or
              already handled.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
