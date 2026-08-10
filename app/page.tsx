"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw, Sprout } from "lucide-react";
import { useStore } from "@/lib/store";

/**
 * The way in.
 *
 * Two doors, nothing else. Deliberately reads as a real product's profile
 * chooser rather than a prototype index — the people being shown this need
 * to walk the journey a member actually walks, not read a description of it.
 *
 * Colour carries the same meaning it does everywhere else in the product:
 * marigold is Deepika, green is the member's own progress.
 */
export default function Home() {
  const { reset, setActiveMember } = useStore();

  return (
    <main className="relative min-h-dvh overflow-hidden bg-paper">
      {/* Soft warmth. Abstract blooms rather than the thin-line botanical
          illustration that every wellness app currently ships. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-40 h-96 w-96 rounded-full bg-marigold/[0.10] blur-3xl" />
        <div className="absolute -right-28 top-24 h-[26rem] w-[26rem] rounded-full bg-effort-min/25 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-marigold/[0.07] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-14">
        <header className="animate-rise text-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-effort-tint text-effort-stretch">
            <Sprout size={21} strokeWidth={1.8} />
          </span>
          <h1 className="mt-5 font-display text-[2.1rem] leading-[1.1] tracking-tight">
            Deepika Wellness
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-ink-soft">
            Strength, energy and steadiness through your forties and beyond —
            with someone who actually knows you.
          </p>
        </header>

        <p className="label mt-10 text-center">Who&rsquo;s signing in?</p>

        <div className="mt-4 space-y-3">
          {/* Deepika — marigold, because marigold is her voice everywhere else too. */}
          <Link
            href="/coach"
            className="group flex animate-rise items-center gap-4 rounded-2xl border border-marigold/25 bg-marigold-tint/60 p-4 transition-shadow hover:shadow-lift"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-marigold font-display text-xl text-white">
              D
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-medium leading-snug">Deepika</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
                Coach · your practice
              </span>
            </span>
            <ArrowRight
              size={18}
              className="shrink-0 text-marigold-deep transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          {/* Radhika — the member surface, entered exactly as she would enter it. */}
          <Link
            href="/member"
            onClick={() => setActiveMember("radhika")}
            className="group flex animate-rise items-center gap-4 rounded-2xl border border-effort-target/25 bg-effort-tint/60 p-4 transition-shadow hover:shadow-lift [animation-delay:80ms]"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-effort-stretch font-display text-xl text-white">
              R
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-medium leading-snug">Radhika</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
                Member · your plan for today
              </span>
            </span>
            <ArrowRight
              size={18}
              className="shrink-0 text-effort-stretch transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <footer className="mt-14 text-center">
          <p className="text-[11px] leading-relaxed text-ink-faint">
            Preview build. Sample data, not real health records.
          </p>
          <button
            onClick={reset}
            className="tap mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 text-[11px] text-ink-faint/80 transition-colors hover:bg-paper-sunk hover:text-ink"
          >
            <RotateCcw size={11} />
            Start the demo over
          </button>
        </footer>
      </div>
    </main>
  );
}
