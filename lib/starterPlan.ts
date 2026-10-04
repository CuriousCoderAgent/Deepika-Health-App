import type { WeekPlan } from "./types";

/**
 * The plan a new member starts on, until Deepika has looked at her answers and
 * made it hers.
 *
 * This is Deepika's own progression from the seeded cohort — walk and sleep
 * first, protein at week 3, strength from week 5, load from week 7 — with the
 * wording made general: the original mentions travel nights, which are one
 * woman's constraint, and a perimenopause module, which is not everyone's.
 *
 * It exists because without it a new member opens Today and finds nothing to
 * do. A first week that is deliberately gentle is a better thing to arrive at
 * than an empty screen, and Deepika adjusts it from her console as usual.
 */
export const STARTER_WEEK_PLANS: WeekPlan[] = [
  { week: 1, phase: "Stabilise", focus: ["Show up, however small", "Protect your sleep where you can"], moduleIds: ["mv-walk-base", "sl-reset", "bh-minimum-day"] },
  { week: 2, phase: "Stabilise", focus: ["Show up, however small", "Protect your sleep where you can"], moduleIds: ["mv-walk-base", "sl-reset", "bh-minimum-day"] },
  { week: 3, phase: "Stabilise", focus: ["Add protein to one meal a day", "Protect your sleep where you can"], moduleIds: ["mv-walk-base", "sl-reset", "nu-protein", "bh-minimum-day"] },
  { week: 4, phase: "Stabilise", focus: ["Add protein to one meal a day", "Protect your sleep where you can"], moduleIds: ["mv-walk-base", "sl-reset", "nu-protein", "bh-minimum-day"] },
  { week: 5, phase: "Build", focus: ["Two strength sessions, any length", "Protect your sleep where you can"], moduleIds: ["mv-strength-a", "sl-reset", "nu-protein", "bh-minimum-day"] },
  { week: 6, phase: "Build", focus: ["Two strength sessions, any length", "Protein at two meals a day"], moduleIds: ["mv-strength-a", "sl-reset", "nu-protein", "bh-minimum-day"] },
  { week: 7, phase: "Build", focus: ["Add load — Balance & Carry", "Protein at two meals a day"], moduleIds: ["mv-strength-b", "sl-reset", "nu-protein", "bh-if-then"] },
  { week: 8, phase: "Build", focus: ["Add load — Balance & Carry", "Understand why we are lifting"], moduleIds: ["mv-strength-b", "sl-reset", "nu-protein", "hr-bone-muscle"] },
  { week: 9, phase: "Consolidate", focus: ["Consolidate the habits that held", "Build the plate, not just the protein"], moduleIds: ["mv-strength-b", "nu-plate", "sl-reset", "hr-bone-muscle"] },
  { week: 10, phase: "Consolidate", focus: ["Consolidate the habits that held", "Write down what you want to ask your doctor"], moduleIds: ["mv-strength-b", "nu-plate", "hr-doctor-questions", "bh-if-then"] },
  { week: 11, phase: "Consolidate", focus: ["Hold the plan through a disrupted week", "If-then plan for missed sessions"], moduleIds: ["mv-strength-b", "nu-plate", "bh-if-then"] },
  { week: 12, phase: "Consolidate", focus: ["Review what held without daily coaching"], moduleIds: ["mv-strength-b", "nu-plate", "sl-reset", "bh-if-then"] },
];

/** A fresh copy, so one member's edits can never reach another's plan. */
export function starterWeekPlans(): WeekPlan[] {
  return STARTER_WEEK_PLANS.map((w) => ({ ...w, focus: [...w.focus], moduleIds: [...w.moduleIds] }));
}
