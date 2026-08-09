"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { EffortRamp } from "@/components/ui";

export default function Home() {
  const { reset, members } = useStore();

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-14 sm:py-20">
      <p className="label">Vision prototype · V0 · August 2026</p>

      <h1 className="mt-6 max-w-3xl font-display text-[2.6rem] leading-[1.08] sm:text-6xl">
        A ten-minute session
        <br />
        <span className="text-effort-stretch">counts as a good day.</span>
      </h1>

      <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-soft">
        Everything in this prototype follows from that one sentence. Effort is
        recorded on a ramp — Minimum, Target, Stretch — and reaching the minimum
        fills a real colour, not a grey placeholder.
      </p>

      <div className="mt-8 flex items-center gap-4">
        <EffortRamp level="minimum" size="lg" />
        <span className="text-sm text-ink-soft">Minimum</span>
        <EffortRamp level="target" size="lg" />
        <span className="text-sm text-ink-soft">Target</span>
        <EffortRamp level="stretch" size="lg" />
        <span className="text-sm text-ink-soft">Stretch</span>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        <Link
          href="/member"
          className="group card animate-rise p-7 transition-shadow hover:shadow-lift"
        >
          <p className="label">Surface one</p>
          <h2 className="mt-3 font-display text-2xl">The member app</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            What one of the twenty women opens in the morning. Today, Journey,
            Movement, Progress and Coach. Six personas to switch between.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-effort-stretch">
            Open as Radhika
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/coach"
          className="group card animate-rise p-7 transition-shadow hover:shadow-lift [animation-delay:80ms]"
        >
          <p className="label">Surface two</p>
          <h2 className="mt-3 font-display text-2xl">Deepika&rsquo;s console</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Radar, Member 360, Journey Builder, Session Prep and the Module
            Library. Edit a plan here and it changes what the member sees.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-effort-stretch">
            Open the console
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>

      <div className="mt-12 border-t border-ink-line pt-8">
        <p className="label">Where to start</p>
        <ol className="mt-3 max-w-2xl space-y-2 text-sm leading-relaxed text-ink-soft">
          <li>
            <span className="font-mono text-xs text-ink-faint">01</span> &nbsp;Open the member app as
            Radhika. She has had a bad week — read what the app says to her about it.
          </li>
          <li>
            <span className="font-mono text-xs text-ink-faint">02</span> &nbsp;Go to the console.
            Radar should already know who needs you, and why.
          </li>
          <li>
            <span className="font-mono text-xs text-ink-faint">03</span> &nbsp;Open Radhika&rsquo;s
            Journey Builder, change her week, publish it with a reason.
          </li>
          <li>
            <span className="font-mono text-xs text-ink-faint">04</span> &nbsp;Go back to the member
            app. Your change is there, with your reason attached.
          </li>
        </ol>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-ink-line pt-6">
        <p className="max-w-md text-xs leading-relaxed text-ink-faint">
          {members.length} fictional members. No real health data. Nothing here diagnoses,
          prescribes, or interprets a lab result — every screen holds the
          Observe / Coach / Refer boundary.
        </p>
        <button
          onClick={reset}
          className="tap inline-flex items-center gap-2 rounded-xl px-3 text-xs text-ink-faint transition-colors hover:bg-paper-sunk hover:text-ink"
        >
          <RotateCcw size={13} />
          Reset demo data
        </button>
      </div>
    </main>
  );
}
