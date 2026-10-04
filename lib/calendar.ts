/**
 * Dates, in India time.
 *
 * The practice and everyone in it are in India, so "today" means today in
 * Asia/Kolkata no matter what a phone's clock or a server's zone says. Using
 * the viewer's own zone would let Deepika and a member disagree about which day
 * it is for a few hours either side of midnight, and a day boundary that
 * differs between two people looking at the same record is exactly the kind of
 * bug that only shows up for someone travelling.
 *
 * Everything here works on plain "YYYY-MM-DD" keys. Differences are computed on
 * UTC midnights, so daylight-saving rules can never add or drop an hour from a
 * day count.
 */

export const TIME_ZONE = "Asia/Kolkata";

const keyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const clockFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Today's date as YYYY-MM-DD, in India. */
export function dateKey(at: Date = new Date()): string {
  return keyFormat.format(at);
}

function parts(key: string): [number, number, number] {
  const [y, m, d] = key.split("-").map(Number);
  return [y, m, d];
}

const utcMidnight = (key: string) => {
  const [y, m, d] = parts(key);
  return Date.UTC(y, m - 1, d);
};

/** Whole days from `from` to `to`. Positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcMidnight(to) - utcMidnight(from)) / 86_400_000);
}

export function addDays(key: string, n: number): string {
  return new Date(utcMidnight(key) + n * 86_400_000).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(key: string): number {
  return new Date(utcMidnight(key)).getUTCDay();
}

/** "Sunday, 4 October" */
export function longDate(key: string): string {
  const [, m, d] = parts(key);
  return `${WEEKDAYS[weekdayOf(key)]}, ${d} ${MONTHS[m - 1]}`;
}

/** "7:12 pm", in India time — the same style the seeded messages use. */
export function clockLabel(at: Date = new Date()): string {
  return clockFormat.format(at).toLowerCase();
}

export function isDateKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * A message's time, with the day when it is not today.
 *
 * Messages used to show only a clock time ("7:12 pm"), which was fine when the
 * whole sample thread happened on one day and is meaningless once a
 * conversation runs across a week.
 */
export function whenLabel(dayOffset: number, time: string): string {
  if (dayOffset >= 0) return time;
  if (dayOffset === -1) return `Yesterday, ${time}`;
  return `${Math.abs(dayOffset)} days ago`;
}

/** "today", "yesterday" or "N days ago", from two date keys. Anything that is
 *  not a date key (the seeded "2 days ago" strings) is returned untouched. */
export function agoLabel(at: string, todayKey?: string): string {
  if (!isDateKey(at) || !todayKey) return at;
  const n = daysBetween(at, todayKey);
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  return `${n} days ago`;
}
