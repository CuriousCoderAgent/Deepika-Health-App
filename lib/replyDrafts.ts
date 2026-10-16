/**
 * Starting points for Deepika's messages.
 *
 * Most of what the Radar asks of her is "write to her": a hello, a
 * low-pressure check-in, a welcome back. Typing each from nothing, twenty
 * times a week, is the kind of cost that turns a good habit into a skipped
 * one. These are drafts in her register, filled with the member's name, that
 * she edits before anything is sent — nothing here sends itself, and none of
 * it is generated.
 *
 * Written to the same rules as the rest of the app's copy: no guilt, nothing
 * about how long someone was away, the minimum always counts in full.
 */

export interface ReplyDraft {
  id: string;
  label: string;
  /** Radar rules this answers. When one is open for her, it is suggested first. */
  ruleIds: string[];
  text: (firstName: string) => string;
}

export const REPLY_DRAFTS: ReplyDraft[] = [
  {
    id: "hello",
    label: "Hello",
    ruleIds: ["R11"],
    text: (n) =>
      `Hi ${n}, it's Deepika. I'm so glad you're here. There's nothing to get right this week — try the first thing on your Today screen when you have a moment, and tell me how it went.`,
  },
  {
    id: "check-in",
    label: "Gentle check-in",
    ruleIds: ["R01"],
    text: (n) =>
      `Hi ${n}, just checking in — no need to catch up on anything. If the week has been full, the minimum is plenty. How are you doing?`,
  },
  {
    id: "welcome-back",
    label: "Welcome back",
    ruleIds: ["R08"],
    text: (n) => `Good to see you back, ${n}. Nothing reset — we are continuing from here.`,
  },
  {
    id: "quiet-progress",
    label: "Quiet progress",
    ruleIds: ["R09"],
    text: (n) =>
      `${n}, I've noticed you keep showing up, including on the minimum days. That kind of steadiness is exactly what builds strength. Well done.`,
  },
  {
    id: "go-lighter",
    label: "Go lighter",
    ruleIds: ["R03", "R04"],
    text: (n) =>
      `${n}, I can see the last few days have been tiring. Let's keep things light for now — the minimum version counts in full. Is anything in particular making it harder?`,
  },
  {
    id: "sessions",
    label: "Sessions",
    ruleIds: ["R02"],
    text: (n) =>
      `${n}, how have the sessions been feeling? If the timing isn't working, tell me and we'll move them — or do the short version, which counts just the same.`,
  },
  {
    id: "before-1-1",
    label: "Before your 1:1",
    ruleIds: ["R07"],
    text: (n) =>
      `Looking forward to our session, ${n}. If there's something you'd like to talk about, add it as a question in the app and I'll have it in front of me.`,
  },
];

/** Every draft, with the ones that answer her open Radar flags first. */
export function draftsFor(openRuleIds: string[]): { draft: ReplyDraft; suggested: boolean }[] {
  const open = new Set(openRuleIds);
  const all = REPLY_DRAFTS.map((draft) => ({
    draft,
    suggested: draft.ruleIds.some((r) => open.has(r)),
  }));
  return [...all.filter((d) => d.suggested), ...all.filter((d) => !d.suggested)];
}

/** The one to offer from a Radar card, if any. */
export function draftForRules(ruleIds: string[]): ReplyDraft | null {
  return draftsFor(ruleIds).find((d) => d.suggested)?.draft ?? null;
}
