/**
 * When a check-in reminder goes out, and what it says.
 *
 * Opt-in, and written to the notification rules on Deepika's console
 * (app/coach/notifications): at most one nudge a day, none on a day she has
 * already shown up, no guilt in the wording, and escalation by silence runs
 * the other way — the quieter someone goes, the fewer reminders she gets, and
 * after a month they stop. Bringing someone back from a long silence is a
 * human conversation, which is Deepika's to have, not a notification's.
 *
 * What shows on a lock screen can be read by anyone holding the phone, so the
 * wording never carries a health detail: no symptoms, no numbers, no plan.
 *
 * Pure, so the rules can be tested without a push service.
 */

import { BRAND } from "./brand";
import { daysBetween } from "./calendar";
import type { MemberDoc } from "./persist";

export type Slot = "morning" | "evening";
export const SLOTS: Slot[] = ["morning", "evening"];

/**
 * The hours, in India, when each reminder may go out — [from, until).
 * Vercel's scheduler runs a daily job somewhere inside its hour, so the cron
 * schedule aims at 07:30 and 19:30 and these windows refuse anything that
 * arrives at a time nobody wants a notification.
 */
export const SLOT_HOURS: Record<Slot, [number, number]> = {
  morning: [6, 11],
  evening: [17, 22],
};

export function isSlot(v: unknown): v is Slot {
  return v === "morning" || v === "evening";
}

export function inSlotWindow(slot: Slot, hourInIndia: number): boolean {
  const [from, until] = SLOT_HOURS[slot];
  return hourInIndia >= from && hourInIndia < until;
}

export type ReminderDecision =
  | { send: false; reason: string }
  | { send: true; title: string; body: string };

/** Days since anything of hers, and whether that includes today. */
export function quietness(doc: MemberDoc, today: string): { quietDays: number | null; hereToday: boolean } {
  // Records are stored relative to the day the document was last rolled
  // forward; shift them to today's frame.
  const shift = doc.member.anchorDate ? Math.max(0, daysBetween(doc.member.anchorDate, today)) : 0;
  const days = [
    ...doc.actions.filter((a) => a.completed).map((a) => a.dayOffset),
    ...doc.pulses.map((p) => p.dayOffset),
    ...doc.messages.filter((m) => m.from === "member").map((m) => m.dayOffset),
    ...doc.foodEntries
      .filter((e) => e.provenance.source !== "coach_on_behalf")
      .map((e) => e.dayOffset),
  ].map((d) => d - shift);

  const hereToday = days.some((d) => d >= 0);
  if (days.length) return { quietDays: Math.max(0, -Math.max(...days)), hereToday };
  // Nothing yet: quiet since she joined.
  if (doc.member.onboardedAt) return { quietDays: Math.max(0, daysBetween(doc.member.onboardedAt, today)), hereToday };
  return { quietDays: null, hereToday };
}

const COPY: Record<Slot, string> = {
  morning: "Good morning. One small thing today is enough — the minimum counts.",
  evening: "How did today go? A one-tap check-in is all it takes.",
};
const AFTER_A_GAP = "No catching up needed. Whenever you're ready, we carry on from here.";

export function decideReminder(
  slot: Slot,
  doc: MemberDoc | null,
  lastSentOn: string | null,
  today: string
): ReminderDecision {
  if (lastSentOn === today) return { send: false, reason: "already sent today" };
  if (!doc) return { send: false, reason: "no record yet" };

  const { quietDays, hereToday } = quietness(doc, today);
  if (hereToday) return { send: false, reason: "already here today" };
  if (quietDays === null) return { send: false, reason: "not started" };

  const sinceLast = lastSentOn ? daysBetween(lastSentOn, today) : Infinity;
  if (quietDays >= 30) return { send: false, reason: "quiet for a month — Deepika's call, not the app's" };
  if (quietDays >= 10 && sinceLast < 7) return { send: false, reason: "quiet: weekly at most" };
  if (quietDays >= 4 && sinceLast < 2) return { send: false, reason: "quiet: every other day at most" };

  return { send: true, title: BRAND, body: quietDays >= 4 ? AFTER_A_GAP : COPY[slot] };
}

/**
 * Push services a subscription may point at. The server sends a request to
 * whatever URL a subscription names, so it only accepts the real ones —
 * otherwise a signed-in account could aim the server at any address it liked.
 */
export function isPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 1024) return false;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port) return false;
  const host = url.hostname;
  return (
    host === "fcm.googleapis.com" ||
    host === "android.googleapis.com" ||
    host === "updates.push.services.mozilla.com" ||
    host === "web.push.apple.com" ||
    /^[a-z0-9-]+\.notify\.windows\.com$/.test(host)
  );
}

/** The two keys a browser hands over with a subscription: base64url, sane length. */
export function isPushKey(v: unknown, min: number, max: number): v is string {
  return typeof v === "string" && v.length >= min && v.length <= max && /^[A-Za-z0-9_-]+=*$/.test(v);
}

/* -------------------------------------------------------------- the run */

export interface DeviceRow {
  endpoint: string;
  userId: string;
  p256dh: string;
  auth: string;
  lastSentOn: string | null;
}

export interface ReminderDeps {
  devices: (slot: Slot) => Promise<DeviceRow[]>;
  readDoc: (userId: string) => Promise<MemberDoc | null>;
  markSent: (userId: string, day: string) => Promise<void>;
  drop: (endpoint: string) => Promise<void>;
  send: (
    device: DeviceRow,
    message: { title: string; body: string; url: string }
  ) => Promise<"sent" | "gone" | "failed">;
}

/** Counts only — never who. The response of the scheduled route is this. */
export interface RunSummary {
  slot: Slot;
  inWindow: boolean;
  members: number;
  sent: number;
  skipped: Record<string, number>;
  gone: number;
  failed: number;
}

/**
 * One scheduled run: every member who chose this part of the day, decided
 * once per member and sent to each of her devices.
 */
export async function runReminders(
  slot: Slot,
  today: string,
  hourInIndia: number,
  deps: ReminderDeps
): Promise<RunSummary> {
  const summary: RunSummary = { slot, inWindow: inSlotWindow(slot, hourInIndia), members: 0, sent: 0, skipped: {}, gone: 0, failed: 0 };
  if (!summary.inWindow) return summary;

  const byMember = new Map<string, DeviceRow[]>();
  for (const d of await deps.devices(slot)) byMember.set(d.userId, [...(byMember.get(d.userId) ?? []), d]);
  summary.members = byMember.size;

  for (const [userId, devices] of Array.from(byMember)) {
    const lastSentOn = devices.map((d) => d.lastSentOn).filter((d): d is string => Boolean(d)).sort().pop() ?? null;
    const decision = decideReminder(slot, await deps.readDoc(userId), lastSentOn, today);
    if ("reason" in decision) {
      summary.skipped[decision.reason] = (summary.skipped[decision.reason] ?? 0) + 1;
      continue;
    }
    let delivered = false;
    for (const device of devices) {
      const outcome = await deps.send(device, { title: decision.title, body: decision.body, url: "/member" });
      if (outcome === "sent") delivered = true;
      else if (outcome === "gone") {
        summary.gone += 1;
        await deps.drop(device.endpoint);
      } else summary.failed += 1;
    }
    if (delivered) {
      summary.sent += 1;
      await deps.markSent(userId, today);
    }
  }
  return summary;
}
