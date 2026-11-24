import type { EngagementState, Member } from "./types";

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

/**
 * How the console refers to one member inside a sentence.
 *
 * It used to say "her" about everyone. That is true of the six sample members
 * and of most of the people Deepika coaches — but onboarding asks, a member
 * can answer "man" or prefer not to say, and "Save on her behalf" is then
 * wrong about a real person, on the one screen that is about him.
 *
 * Taken from that answer and from nothing else; never guessed from a name.
 * Anyone who preferred not to say, and anyone who was never asked (the sample
 * cohort, and members from before the question existed), is "they".
 *
 * Two things to hold to when writing console copy with it:
 *
 *  - The sentence that needs no pronoun is usually the better one. "Last 7
 *    days" is shorter than "Her last 7 days" and cannot be wrong about anyone.
 *  - "They" takes a different verb: she sees, they see. So `subject` only goes
 *    in front of a verb that does not change — will, can, a past tense. `object`
 *    and `possessive` are safe anywhere.
 */
export interface Pronouns {
  subject: "she" | "he" | "they";
  object: "her" | "him" | "them";
  possessive: "her" | "his" | "their";
}

const SHE: Pronouns = { subject: "she", object: "her", possessive: "her" };
const HE: Pronouns = { subject: "he", object: "him", possessive: "his" };
const THEY: Pronouns = { subject: "they", object: "them", possessive: "their" };

/** Accepts a missing member, so a caller holding only an id need not check. */
export function pronouns(m?: Pick<Member, "gender"> | null): Pronouns {
  // `default` is doing real work: this is read from a stored document, which
  // can hold something other than the three values the type allows.
  switch (m?.gender) {
    case "woman":
      return SHE;
    case "man":
      return HE;
    default:
      return THEY;
  }
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
