/**
 * What a member's browser may hold of her own document.
 *
 * Her record is one JSON document, and it also carries things that are
 * Deepika's, not hers: her private coach notes, her private notes on each
 * session, and unpublished plan drafts. The interface hides them — "she never
 * sees this" — but hiding a field in the UI while sending it over the wire is
 * not privacy: it is in the network response of anyone who opens developer
 * tools. So the server enforces it.
 *
 *   forMember        what she is sent
 *   acceptFromMember what is kept when she saves
 *
 * The second matters as much as the first. She never receives these fields, so
 * her next save arrives without them — and a naive write would delete
 * Deepika's notes. Anything coach-private is therefore taken only from what is
 * already stored, never from what a member sends.
 *
 * Pure and dependency-free so it can be tested on its own.
 */

import type { MemberDoc } from "./persist";

export function forMember(doc: MemberDoc): MemberDoc {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { notes, draftWeekPlans, ...member } = doc.member;
  return {
    ...doc,
    member,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sessions: (doc.sessions ?? []).map(({ privateNotes, ...session }) => session),
  };
}

export function acceptFromMember(incoming: MemberDoc, existing: MemberDoc | null): MemberDoc {
  const member = { ...incoming.member };
  // Whatever she sent for these is ignored outright.
  delete member.notes;
  delete member.draftWeekPlans;
  if (existing?.member.notes) member.notes = existing.member.notes;
  if (existing?.member.draftWeekPlans) member.draftWeekPlans = existing.member.draftWeekPlans;

  const stored = new Map((existing?.sessions ?? []).map((s) => [s.id, s]));
  const sessions = (incoming.sessions ?? []).map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { privateNotes, ...rest } = s;
    const kept = stored.get(s.id)?.privateNotes;
    return kept ? { ...rest, privateNotes: kept } : rest;
  });

  return { ...incoming, member, sessions };
}
