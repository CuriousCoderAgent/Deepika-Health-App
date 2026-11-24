/**
 * One day of one member, read the same way everywhere.
 *
 * "What did she do on Tuesday" was being worked out separately on Today, on
 * Insights, on Deepika's member page and in her members list — four copies of
 * the same loop, each a chance to disagree. This is the one reading: Today's
 * history, the Insights charts and Deepika's week view all take it from here.
 *
 * Descriptive only. It counts and lists what was logged; it never says what
 * any of it means.
 *
 * Pure, so it can be tested without a browser.
 */

import { addDays, weekdayOf } from "./calendar";
import type {
  DailyAction,
  EffortLevel,
  FoodEntry,
  Message,
  PulseEntry,
  WorkoutLog,
} from "./types";

export type DayLevel = EffortLevel | "rest" | null;

/**
 * The biggest thing done that day — what colours its square. "Rest" is a day
 * she said "not today" and did nothing else; null is a day with no word at all.
 */
export function levelForDay(actions: DailyAction[]): DayLevel {
  for (const level of ["stretch", "target", "minimum", "rest"] as const) {
    if (actions.some((a) => a.completed === level)) return level;
  }
  return null;
}

export interface DayData {
  actions: DailyAction[];
  pulses: PulseEntry[];
  foodEntries: FoodEntry[];
  messages: Message[];
  workoutLogs: WorkoutLog[];
}

export interface DayView {
  dayOffset: number;
  level: DayLevel;
  /** Everything planned for that day, in plan order. */
  actions: DailyAction[];
  /** Those done at any size. A "not today" is not in here. */
  done: DailyAction[];
  pulse: PulseEntry | null;
  /** Grams of protein logged, by anyone. */
  protein: number;
  foodCount: number;
  /** Messages she sent that day. */
  wrote: number;
  workouts: WorkoutLog[];
}

export function dayView(memberId: string, dayOffset: number, data: DayData): DayView {
  const actions = data.actions.filter((a) => a.memberId === memberId && a.dayOffset === dayOffset);
  const food = data.foodEntries.filter((e) => e.memberId === memberId && e.dayOffset === dayOffset);
  return {
    dayOffset,
    level: levelForDay(actions),
    actions,
    done: actions.filter((a) => a.completed && a.completed !== "rest"),
    pulse: data.pulses.find((p) => p.memberId === memberId && p.dayOffset === dayOffset) ?? null,
    protein: food.reduce((sum, e) => sum + e.protein, 0),
    foodCount: food.length,
    wrote: data.messages.filter(
      (m) => m.memberId === memberId && m.dayOffset === dayOffset && m.from === "member"
    ).length,
    workouts: data.workoutLogs.filter((l) => l.memberId === memberId && l.dayOffset === dayOffset),
  };
}

/** The last `n` days ending today, oldest first. */
export function lastDays(memberId: string, n: number, data: DayData): DayView[] {
  return Array.from({ length: n }, (_, i) => dayView(memberId, i - (n - 1), data));
}

/** True when the day holds anything of hers at all. */
export function hasAnything(d: DayView): boolean {
  return d.level !== null || d.pulse !== null || d.foodCount > 0 || d.wrote > 0 || d.workouts.length > 0;
}

export interface SpanStats {
  days: number;
  /** Days with at least one action done, at any size. */
  activeDays: number;
  checkIns: number;
  /** Days on which any food was logged. */
  foodDays: number;
  /** Average protein over the days she logged food — not over days she did not. */
  proteinAvg: number | null;
  sessions: number;
}

/** Counts over a run of days. Nothing here is a score. */
export function spanStats(days: DayView[]): SpanStats {
  const fed = days.filter((d) => d.foodCount > 0);
  return {
    days: days.length,
    activeDays: days.filter((d) => d.done.length > 0).length,
    checkIns: days.filter((d) => d.pulse).length,
    foodDays: fed.length,
    proteinAvg: fed.length ? Math.round(fed.reduce((s, d) => s + d.protein, 0) / fed.length) : null,
    sessions: days.reduce((s, d) => s + d.workouts.length, 0),
  };
}

/* ------------------------------------------------------------------ weeks */

export interface WeekBucket {
  /** 0 is the seven days ending today, 1 the seven before, and so on. */
  weeksAgo: number;
  fromOffset: number;
  toOffset: number;
  activeDays: number;
  checkIns: number;
  /** Averages of what she rated that week, to one decimal; null when she rated nothing. */
  energy: number | null;
  sleep: number | null;
  calm: number | null;
  /** Average over the days she logged food. */
  protein: number | null;
}

const mean1 = (xs: number[]) =>
  xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;

/**
 * The last `weeks` runs of seven days, oldest first.
 *
 * Rolling weeks that end today, rather than Monday-to-Sunday: every bucket is
 * a full seven days, so the current one is never a part-week that looks worse
 * than it is.
 */
export function weekBuckets(memberId: string, weeks: number, data: DayData): WeekBucket[] {
  return Array.from({ length: weeks }, (_, i) => {
    const weeksAgo = weeks - 1 - i;
    const toOffset = 0 - 7 * weeksAgo; // 0, never -0
    const days = Array.from({ length: 7 }, (_, d) => dayView(memberId, toOffset - 6 + d, data));
    const rated = days.map((d) => d.pulse).filter((p): p is PulseEntry => p !== null);
    const stats = spanStats(days);
    return {
      weeksAgo,
      fromOffset: toOffset - 6,
      toOffset,
      activeDays: stats.activeDays,
      checkIns: stats.checkIns,
      energy: mean1(rated.map((p) => p.energy)),
      // A one-tap mood leaves sleep at 0, "not recorded" — never an average of zeros.
      sleep: mean1(rated.filter((p) => p.sleep >= 1).map((p) => p.sleep)),
      calm: mean1(rated.map((p) => p.stress)),
      protein: stats.proteinAvg,
    };
  });
}

/** How many weeks back her record goes, counting this one — at most twelve. */
export function weeksOfHistory(memberId: string, data: DayData): number {
  const offsets = [
    ...data.actions.filter((a) => a.memberId === memberId && a.completed).map((a) => a.dayOffset),
    ...data.pulses.filter((p) => p.memberId === memberId).map((p) => p.dayOffset),
    ...data.foodEntries.filter((e) => e.memberId === memberId).map((e) => e.dayOffset),
    ...data.workoutLogs.filter((l) => l.memberId === memberId).map((l) => l.dayOffset),
  ].filter((d) => d <= 0);
  if (!offsets.length) return 0;
  return Math.min(12, Math.ceil((-Math.min(...offsets) + 1) / 7));
}

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Today", "Yesterday", or "Sat 21 Nov". */
export function dayName(dayOffset: number, todayKey: string): string {
  if (dayOffset === 0) return "Today";
  if (dayOffset === -1) return "Yesterday";
  const key = addDays(todayKey, dayOffset);
  const [, m, d] = key.split("-").map(Number);
  return `${SHORT_DAYS[weekdayOf(key)]} ${d} ${SHORT_MONTHS[m - 1]}`;
}

/** "4 Oct" — a date without its weekday, for a range or an axis. */
export function shortDate(dayOffset: number, todayKey: string): string {
  const [, m, d] = addDays(todayKey, dayOffset).split("-").map(Number);
  return `${d} ${SHORT_MONTHS[m - 1]}`;
}

/** "S", "M", "T"… for a chart axis. */
export function dayLetter(dayOffset: number, todayKey: string): string {
  return SHORT_DAYS[weekdayOf(addDays(todayKey, dayOffset))].charAt(0);
}

/** The day of the month, for a chart axis. */
export function dayOfMonth(dayOffset: number, todayKey: string): number {
  return Number(addDays(todayKey, dayOffset).split("-")[2]);
}

/**
 * How she said she felt, as the one-tap mood it matches — or null when her
 * numbers came from the detailed form and match none of the four.
 */
export const MOODS = [
  { key: "good", label: "Good", energy: 4, stress: 4 },
  { key: "okay", label: "Okay", energy: 3, stress: 3 },
  { key: "tired", label: "Tired", energy: 2, stress: 3 },
  { key: "stressed", label: "Stressed", energy: 2, stress: 2 },
] as const;
export type MoodKey = (typeof MOODS)[number]["key"];

/**
 * How many of these check-ins rated sleep 2 or below.
 *
 * A sleep of 0 is "not rated" — the one-tap mood leaves it there. It is not a
 * bad night, and counting it as one told every member who checked in by mood
 * two days running that her sleep had been disrupted.
 */
export function lowSleepNights(pulses: Pick<PulseEntry, "sleep">[]): number {
  return pulses.filter((p) => p.sleep >= 1 && p.sleep <= 2).length;
}

export function moodOf(pulse: Pick<PulseEntry, "energy" | "stress">): (typeof MOODS)[number] | null {
  return MOODS.find((m) => m.energy === pulse.energy && m.stress === pulse.stress) ?? null;
}

/**
 * When she was last here, in words Deepika can read at a glance.
 * Anything of hers counts — an action marked (a "not today" included), a
 * check-in, a message, food — which is the member-side idea of "being here"
 * (see isWelcomeBack in lib/dailyPlan.ts).
 */
export function lastSeen(memberId: string, data: DayData): number | null {
  const days = [
    ...data.actions.filter((a) => a.memberId === memberId && a.completed).map((a) => a.dayOffset),
    ...data.pulses.filter((p) => p.memberId === memberId).map((p) => p.dayOffset),
    ...data.messages.filter((m) => m.memberId === memberId && m.from === "member").map((m) => m.dayOffset),
    ...data.foodEntries
      .filter((e) => e.memberId === memberId && e.provenance.source !== "coach_on_behalf")
      .map((e) => e.dayOffset),
  ].filter((d) => d <= 0);
  return days.length ? Math.max(...days) : null;
}

export function lastSeenLabel(dayOffset: number | null): string {
  if (dayOffset === null) return "Nothing logged yet";
  if (dayOffset === 0) return "Here today";
  if (dayOffset === -1) return "Here yesterday";
  return `Last here ${-dayOffset} days ago`;
}
