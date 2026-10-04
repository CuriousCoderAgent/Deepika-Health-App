/**
 * Turning a plan into days.
 *
 * Until this existed, a real member's Today screen was empty for ever: nothing
 * in the app created a daily action, and "today" never moved — every record is
 * stored as `dayOffset` from a fixed day. Both were fine for a prototype run on
 * a seeded cohort frozen at one date, and both are fatal for a woman who opens
 * the app on Tuesday after logging on Monday.
 *
 * Two jobs, both pure functions so they can be tested without a browser:
 *
 *   ROLL FORWARD   Each member document carries `member.anchorDate`, the date
 *                  that offset 0 means. Loading it on a later day shifts every
 *                  offset by the days that passed, so yesterday's today becomes
 *                  -1. Idempotent: running it twice in one day changes nothing.
 *
 *   BUILD THE DAY  From her current week's modules, make today's actions — at
 *                  most three, because the product's promise is "three small
 *                  things", not a task list.
 *
 * The seeded sample cohort is deliberately exempt (`isSampleMember`). Their
 * histories are frozen at one date so the Radar always has something to show,
 * and rolling them would quietly empty it.
 */

import { members as seedMembers } from "./seed";
import { addDays, daysBetween, weekdayOf } from "./calendar";
import { phaseForWeek, weekPlansFor } from "./plan";
import { starterWeekPlans } from "./starterPlan";
import type {
  CoachModule,
  DailyAction,
  EngagementState,
  FoodEntry,
  Member,
  Message,
  PulseEntry,
  Report,
  Session,
  WorkoutLog,
} from "./types";

const SAMPLE_IDS = new Set(seedMembers.map((m) => m.id));

/** True for the six fictional members. Their time is frozen; never roll them. */
export const isSampleMember = (id: string) => SAMPLE_IDS.has(id);

export const MAX_DAILY_ACTIONS = 3;

/** Categories that are naturally a daily habit. Hormonal modules are reading,
 *  not actions, so they never become something to tick off. */
const DAILY_CATEGORIES = new Set(["movement", "nutrition", "sleep"]);
const STRENGTH_DAYS = new Set([2, 5]); // Tuesday, Friday
const BEHAVIOUR_DAY = 3; // Wednesday — these are weekly in nature

const WORKOUT_FOR_MODULE: Record<string, string> = {
  "mv-strength-a": "wk-strength-a",
  "mv-strength-b": "wk-strength-b",
};

/** Why-lines in the app's voice, not Deepika's: marigold and her name are kept
 *  for things she actually said. */
const WHY: Record<string, string> = {
  "mv-walk-base": "Everyday movement comes first. Strength builds on top of it.",
  "mv-mobility-10": "A floor that is always doable — even on the worst days.",
  "mv-strength-a": "Technique before load. Short and steady beats heavy.",
  "mv-strength-b": "Balance and carrying — the strength you use in real life.",
  "nu-protein": "Protein at the meals you already eat. No counting, no scales.",
  "nu-plate": "Build a meal by eye. Nothing to measure.",
  "sl-reset": "A steady wake time is the first lever on sleep.",
  "sl-winddown": "A small signal to your body that the day is over.",
  "bh-minimum-day": "Decide now what you will do on the days nothing else happens.",
  "bh-if-then": "Tie the habit to a cue, so you are not deciding in the moment.",
  "bh-comeback": "Coming back is part of the plan, not a failure of it.",
};

/** The sleep module is written as a weekly measure ("same wake time, five
 *  days"), which reads oddly on a daily screen. Daily wording, taken from the
 *  seeded plan Deepika wrote. */
const DAILY_WORDING: Record<string, Pick<DailyAction, "minimum" | "target" | "stretch">> = {
  "sl-reset": {
    minimum: { label: "Within 45 minutes of your wake time", minutes: 0 },
    target: { label: "On your wake time", minutes: 0 },
    stretch: { label: "On your wake time, plus 10 minutes of morning light", minutes: 10 },
  },
};

/** A stable integer per calendar day, for rotating through extra modules. */
const dayIndex = (key: string) => daysBetween("2026-01-01", key);

/**
 * Which modules show up as actions on a given day.
 *
 * Strength sessions are placed first and are never rotated out. If more than
 * three things are still scheduled, the rest take turns rather than the
 * overflow being silently dropped for ever.
 */
export function modulesForDay(
  moduleIds: string[],
  modules: CoachModule[],
  today: string
): CoachModule[] {
  const weekday = weekdayOf(today);
  const scheduled = moduleIds
    .map((id) => modules.find((m) => m.id === id))
    .filter((m): m is CoachModule => Boolean(m) && m!.status !== "retired")
    .filter((m) => {
      if (m.id.startsWith("mv-strength")) return STRENGTH_DAYS.has(weekday);
      if (m.category === "behaviour") return weekday === BEHAVIOUR_DAY;
      return DAILY_CATEGORIES.has(m.category);
    });

  if (scheduled.length <= MAX_DAILY_ACTIONS) return scheduled;

  const fixed = scheduled.filter((m) => m.id.startsWith("mv-strength"));
  const rest = scheduled.filter((m) => !m.id.startsWith("mv-strength"));
  const slots = Math.max(0, MAX_DAILY_ACTIONS - fixed.length);
  const start = ((dayIndex(today) % rest.length) + rest.length) % rest.length;
  const picked = Array.from({ length: Math.min(slots, rest.length) }, (_, i) => rest[(start + i) % rest.length]);
  // Keep the plan's own ordering rather than the rotation's.
  const chosen = new Set([...fixed, ...picked].map((m) => m.id));
  return scheduled.filter((m) => chosen.has(m.id));
}

export function actionFromModule(mod: CoachModule, memberId: string, today: string): DailyAction {
  const wording = DAILY_WORDING[mod.id] ?? {
    minimum: { ...mod.minimum },
    target: { ...mod.target },
    stretch: { ...mod.stretch },
  };
  const workoutId = WORKOUT_FOR_MODULE[mod.id];
  return {
    id: `a-${memberId}-${today}-${mod.id}`,
    memberId,
    dayOffset: 0,
    moduleId: mod.id,
    title: mod.name,
    why: WHY[mod.id] ?? mod.purpose,
    ...wording,
    completed: null,
    ...(workoutId ? { workoutId } : {}),
  };
}

/**
 * Bring one member's actions for today into line with her current plan.
 *
 * Anything she has already touched is kept exactly as it is — a completed
 * action is a fact, whatever the plan says now. Anything untouched whose module
 * has left the plan is dropped, and modules that have joined it are added. An
 * untouched action Deepika has edited for a module still in the plan is left
 * alone, so her edits are never overwritten by a regeneration.
 */
export function reconcileToday(
  memberActions: DailyAction[],
  member: Member,
  today: string,
  modules: CoachModule[]
): DailyAction[] {
  const desired = modulesForDay(member.activeModuleIds, modules, today);
  const desiredIds = new Set(desired.map((m) => m.id));
  const kept = memberActions.filter(
    (a) => a.dayOffset !== 0 || a.completed !== null || desiredIds.has(a.moduleId)
  );
  const have = new Set(kept.filter((a) => a.dayOffset === 0).map((a) => a.moduleId));
  const added = desired
    .filter((m) => !have.has(m.id))
    .map((m) => actionFromModule(m, member.id, today));
  return [...kept, ...added];
}

/**
 * Put a member on the starter plan, at the right week for her start date.
 * Used when she finishes onboarding, and to rescue anyone who finished it
 * before the plan existed and has been looking at an empty Today since.
 */
export function startPlan(member: Member, today: string): Member {
  const start = member.onboardedAt ?? today;
  const week = Math.min(12, Math.max(1, Math.floor(daysBetween(start, today) / 7) + 1));
  const plans = starterWeekPlans();
  const current = plans.find((p) => p.week === week) ?? plans[0];
  return {
    ...member,
    week,
    phase: phaseForWeek(week),
    weekPlans: plans,
    draftWeekPlans: plans,
    activeModuleIds: current.moduleIds,
    weeklyFocus: current.focus,
  };
}

type Rollable = {
  member: Member;
  actions: DailyAction[];
  pulses: PulseEntry[];
  workoutLogs: WorkoutLog[];
  messages: Message[];
  sessions: Session[];
  reports: Report[];
  foodEntries: FoodEntry[];
};

const shift = <T extends { dayOffset: number }>(rows: T[], by: number): T[] =>
  rows.map((r) => ({ ...r, dayOffset: r.dayOffset - by }));

/**
 * One member's document, brought up to date for `today`.
 *
 * Returns the same object when nothing needed doing, so callers can cheaply
 * tell. Never throws on odd data: a document from before any of this existed
 * (no anchor, no plan) is adopted as it stands rather than rejected.
 */
export function rollDoc<D extends Rollable>(doc: D, today: string, modules: CoachModule[]): D {
  if (isSampleMember(doc.member.id)) return doc;

  let d: D = doc;

  // 1. Anchor, and shift history if days have passed.
  const anchor = d.member.anchorDate;
  if (!anchor) {
    d = { ...d, member: { ...d.member, anchorDate: today } };
  } else {
    const passed = daysBetween(anchor, today);
    if (passed > 0) {
      d = {
        ...d,
        member: { ...d.member, anchorDate: today },
        actions: shift(d.actions, passed),
        pulses: shift(d.pulses, passed),
        workoutLogs: shift(d.workoutLogs, passed),
        messages: shift(d.messages, passed),
        sessions: shift(d.sessions, passed),
        foodEntries: shift(d.foodEntries, passed),
      };
    }
  }

  // Not through onboarding yet: there is no plan to build a day from.
  if (!d.member.onboardedAt) return d;

  // 2. A plan, for anyone who onboarded before there was one.
  if (!d.member.weekPlans?.length && d.member.activeModuleIds.length === 0) {
    d = { ...d, member: startPlan(d.member, today) };
  }

  // 3. The week moves on by itself, along with its modules and focus.
  const weekNow = Math.min(
    12,
    Math.max(1, Math.floor(daysBetween(d.member.onboardedAt!, today) / 7) + 1)
  );
  if (weekNow > d.member.week) {
    const plan = weekPlansFor(d.member).find((w) => w.week === weekNow);
    d = {
      ...d,
      member: {
        ...d.member,
        week: weekNow,
        phase: phaseForWeek(weekNow),
        activeModuleIds: plan?.moduleIds ?? d.member.activeModuleIds,
        weeklyFocus: plan?.focus ?? d.member.weeklyFocus,
      },
    };
  }

  // 4. Today's actions — but only when there are none. If any exist, someone
  //    (her, or Deepika) has already shaped the day and it is left alone.
  if (!d.actions.some((a) => a.dayOffset === 0)) {
    d = { ...d, actions: reconcileToday(d.actions, d.member, today, modules) };
  }

  return d;
}

/**
 * Engagement, worked out from what she has actually done rather than stored.
 *
 * It used to be a field set by hand in the seed, which meant every real member
 * showed as "Steady" for ever and the Quiet-progress rule could never fire for
 * anyone. Derived here so it is always current and always explainable.
 */
export function engagementFor(
  member: Member,
  actions: DailyAction[],
  pulses: PulseEntry[],
  messages: Message[]
): EngagementState {
  if (isSampleMember(member.id) || !member.onboardedAt || !member.anchorDate) {
    return member.engagement;
  }
  const mine = actions.filter((a) => a.memberId === member.id);
  const done = mine.filter((a) => a.completed && a.completed !== "rest");
  const touched = [
    ...done.map((a) => a.dayOffset),
    ...pulses.filter((p) => p.memberId === member.id).map((p) => p.dayOffset),
    ...messages.filter((x) => x.memberId === member.id && x.from === "member").map((x) => x.dayOffset),
  ];
  const joinedDays = daysBetween(member.onboardedAt, member.anchorDate);
  const last = touched.length ? Math.max(...touched) : null;

  if (last === null) return joinedDays >= 3 ? "quiet" : "steady";
  if (last <= -4) return "quiet";

  const past = mine.filter((a) => a.dayOffset >= -6 && a.dayOffset <= -1);
  const doneWeek = done.filter((a) => a.dayOffset >= -6);
  if (past.length >= 4) {
    const rate = doneWeek.length / Math.max(past.length, 1);
    if (rate >= 0.8) return "strong";
    if (rate < 0.4) return "slipping";
  }
  return "steady";
}

export { addDays };
