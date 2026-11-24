import type { EngagementState, Member } from "./types";
import { members as sampleMembers } from "./seed";

/**
 * How a member is named in the coach console.
 *
 * By name. The console used to show an ID instead, so that real women's names
 * never sat next to symptom logs on a screen someone could read over Deepika's
 * shoulder. But she thinks of her members by name, not by the username each one
 * picked at sign-up — and that username is often the name anyway, so the ID
 * hid less than it seemed to. The shoulder-surfing concern is still real, so it
 * is now a switch she controls: the privacy screen (lib/privacyScreen.ts and
 * components/MemberName.tsx) shows initials instead, on that device.
 *
 * The member's own app greets her by name either way.
 */
export function memberCode(m: Member): string {
  return m.id.toUpperCase();
}

/** "Meera Nair" → "Meera N." — how she is listed. */
export function shortName(m: Member): string {
  const parts = m.name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return memberCode(m);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

/** What the privacy screen shows instead of her name. */
export function initialsOf(m: Member): string {
  if (m.initials?.trim()) return m.initials.trim().toUpperCase();
  return m.name
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() || memberCode(m).slice(0, 2);
}

/**
 * The words the console uses for a member when it is not using a name.
 *
 * Every line of the console used to say "her". Most members are women — but
 * onboarding asks, and offers "Man" and "Other", so the console was calling
 * some members something they had just told it they were not. Nobody is
 * assumed: someone who has not said, which includes everyone who joined before
 * the question was asked, is "they".
 *
 * Use it for a sentence about one member: `What ${they.subject} ${they.is}
 * trying to get to`. Copy about members in general does not need it — write
 * "a member", "members".
 */
export interface Pronouns {
  /** she · he · they */
  subject: string;
  /** her · him · them */
  object: string;
  /** her · his · their — in front of a noun */
  possessive: string;
  /** herself · himself · themselves */
  reflexive: string;
  /** She · He · They, to start a sentence */
  Subject: string;
  /** Her · His · Their, to start a sentence */
  Possessive: string;
  /** "s" after she and he, nothing after they: `${subject} see${s} this` */
  s: string;
  /** is · are */
  is: string;
}

const SHE: Pronouns = { subject: "she", object: "her", possessive: "her", reflexive: "herself", Subject: "She", Possessive: "Her", s: "s", is: "is" };
const HE: Pronouns = { subject: "he", object: "him", possessive: "his", reflexive: "himself", Subject: "He", Possessive: "His", s: "s", is: "is" };
const THEY: Pronouns = { subject: "they", object: "them", possessive: "their", reflexive: "themselves", Subject: "They", Possessive: "Their", s: "", is: "are" };

/* The six sample members are written as women. A copy of one that was stored
   before the question existed has no answer on it, and reads as the seed says. */
const SAMPLE_GENDER = new Map(sampleMembers.map((m) => [m.id, m.gender]));

export function pronouns(member?: Pick<Member, "id" | "gender"> | null): Pronouns {
  const gender = member?.gender ?? (member ? SAMPLE_GENDER.get(member.id) : undefined);
  if (gender === "woman") return SHE;
  if (gender === "man") return HE;
  return THEY;
}

/** Search matches a name, a first name, or the username. */
export function matchesMember(m: Member, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
}

/**
 * How a member is doing, in a word. Descriptive, never stigmatising:
 * "Needs attention", not "Non-compliant".
 */
export const ENGAGEMENT: Record<EngagementState, { label: string; cls: string }> = {
  strong: { label: "On plan", cls: "bg-effort-tint text-effort-stretch" },
  steady: { label: "Steady", cls: "bg-paper-sunk text-ink-soft" },
  slipping: { label: "Needs attention", cls: "bg-attention-tint text-attention" },
  quiet: { label: "Quiet lately", cls: "bg-attention-tint text-attention" },
};
