/**
 * One log per session per day.
 *
 * Saving a session used to add a log every time, and the session page offered
 * its form again to anyone who came back to it after "Logged." — so a second
 * "Save it" made a second log. A pain flag is raised per log (Radar rule R12),
 * which showed Deepika the same flag twice.
 *
 * There is now one log per member, session and day, and saving again replaces
 * it — the way a second check-in replaces the first. The session page shows
 * the log in place of "I have finished", with Change.
 *
 * Pure, so it can be tested without a browser.
 */

import type { WorkoutLog } from "./types";

/** What she logged for this session on this day, if anything. */
export function workoutLogFor(
  logs: WorkoutLog[],
  memberId: string,
  workoutId: string,
  dayOffset: number
): WorkoutLog | undefined {
  return logs.find((l) => l.memberId === memberId && l.workoutId === workoutId && l.dayOffset === dayOffset);
}

/**
 * Her logs with this one saved, newest first.
 *
 * A replaced log keeps its id, because the Radar flag and Deepika's "Handled"
 * are keyed on it: the same thing saved twice, or with a different size, is
 * still the flag she has already dealt with.
 *
 * A pain flag that is new, or says something different, is the exception and
 * takes `newId`. Her screen has just told her Deepika will see it — and under
 * an id Deepika had already handled, she would not.
 *
 * The day is a `dayOffset`, so "the same day" moves on with her record:
 * Tuesday's log is at −3 by Friday and does not stand in for Friday's.
 */
export function withWorkoutLog(
  logs: WorkoutLog[],
  log: Omit<WorkoutLog, "id">,
  newId: string
): WorkoutLog[] {
  const old = workoutLogFor(logs, log.memberId, log.workoutId, log.dayOffset);
  if (!old) return [{ ...log, id: newId }, ...logs];
  const newToDeepika = log.painFlag && (!old.painFlag || (old.feltLike ?? "") !== (log.feltLike ?? ""));
  const saved: WorkoutLog = { ...log, id: newToDeepika ? newId : old.id };
  return logs.map((l) => (l === old ? saved : l));
}
