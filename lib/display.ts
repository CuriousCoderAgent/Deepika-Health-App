import type { Member } from "./types";

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

/** Search matches a name, a first name, or the username. */
export function matchesMember(m: Member, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
}
