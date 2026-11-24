import type { WorkoutLog } from "./types";

/** The record of this session on this day, if she has already saved one. */
export function sessionLogOn(
  logs: WorkoutLog[],
  memberId: string,
  workoutId: string,
  dayOffset: number
): WorkoutLog | undefined {
  return logs.find((l) => l.memberId === memberId && l.workoutId === workoutId && l.dayOffset === dayOffset);
}

/**
 * Save what she said about a session: one record per member, session and day.
 *
 * Saving the same session again on the same day corrects that record. It used
 * to add a second one — so a second pain flag on Deepika's Radar for a single
 * session, and the session twice in her own history.
 *
 * The record keeps its id, because that is what "Handled" is remembered
 * against (lib/radar.ts). The exception is pain. If this save says something
 * hurt, and the record did not already say exactly that, it gets a new id:
 * she has just been told again that Deepika will see it, so a flag Deepika
 * marked handled before she wrote this has to come back.
 */
export function withSessionLog(logs: WorkoutLog[], log: Omit<WorkoutLog, "id">, newId: string): WorkoutLog[] {
  const before = sessionLogOn(logs, log.memberId, log.workoutId, log.dayOffset);
  if (!before) return [{ ...log, id: newId }, ...logs];

  const saidAlready = before.painFlag && (before.feltLike ?? "") === (log.feltLike ?? "");
  const saved: WorkoutLog = { ...log, id: log.painFlag && !saidAlready ? newId : before.id };
  return logs.map((l) => (l === before ? saved : l));
}
