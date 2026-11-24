/**
 * Accounts people create for themselves.
 *
 * The env-var cohort in lib/auth.ts stays as it is — Deepika's login and any
 * account handed out by hand. This is the other half: a woman who gets the
 * link from Deepika, picks her own username and password, and is in. At the
 * size this is meant for, one person minting credentials for twenty others
 * and passing them around on WhatsApp is worse for everyone, including for
 * the passwords.
 *
 * Passwords here are hashed, not compared. The env-var ones are plain because
 * they are typed by whoever runs the deployment and are already visible to
 * them; these belong to the members themselves, so they are stored as scrypt
 * hashes with a per-account salt and nothing can read them back — including
 * Deepika, and including anyone who gets a copy of the database.
 *
 * Server only. Node's crypto is not available in the Edge middleware, which is
 * exactly why the middleware imports from lib/auth.ts and never from here.
 */

import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import {
  isDeletedAccount,
  readAccount,
  readAccountByGoogle,
  updateAccountHash,
  writeAccount,
  writeMemberDoc,
} from "./db";
import { newMember } from "./emptyState";
import { usernameCandidates, usernameFrom, type GooglePerson } from "./google";
import { RESERVED_USERNAMES } from "./persist";
import type { SessionUser } from "./auth";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const KEYLEN = 64;

export interface StoredAccount {
  userId: string;
  name: string;
  /** Null for an account made by signing in with Google: there is no password. */
  hash: string | null;
  /** Google's id for her Google account, when one is connected. */
  googleSub?: string | null;
  /** The address of that Google account — shown to her, and to nobody else. */
  email?: string | null;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

async function passwordMatches(password: string, stored: string | null): Promise<boolean> {
  // No password on record — an account that signs in with Google — matches
  // nothing, including the empty string.
  if (!stored) return false;
  const [scheme, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Usernames are lowercased and restricted, because this one string is also the
 * key her data is stored under and the id every record of hers carries. Let it
 * be free-form and a stray capital or trailing space becomes a second, empty
 * account she cannot get out of.
 */
export function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

export function usernameProblem(username: string): string | null {
  if (username.length < 3) return "Usernames need at least 3 characters.";
  if (username.length > 24) return "Usernames can be at most 24 characters.";
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(username)) {
    return "Use letters, numbers, dots, dashes or underscores.";
  }
  return null;
}

export function passwordProblem(password: string): string | null {
  // Length only. Symbol-and-capital rules do not make passwords better, they
  // make them written on paper — and there is no reset flow here to rescue
  // anyone who forgets.
  if (password.length < 8) return "Passwords need at least 8 characters.";
  if (password.length > 200) return "That password is too long.";
  return null;
}

/** Names already spoken for, whoever holds them. */
export function isTaken(username: string): boolean {
  if (username === "deepika") return true;
  if (RESERVED_USERNAMES.includes(username)) return true;
  const members = process.env.MEMBERS ?? "";
  return members
    .split(/[\n,]+/)
    .map((line) => line.trim().split(":")[0]?.trim().toLowerCase())
    .filter(Boolean)
    .includes(username);
}

/**
 * Creates the account and her (empty) member record in one go, so she shows up
 * in Deepika's console the moment she signs up rather than only once she has
 * logged something. Returns null if the username went to someone else.
 */
export async function createAccount(
  username: string,
  password: string,
  displayName: string
): Promise<SessionUser | null> {
  if (isTaken(username)) return null;
  if (await readAccount(username)) return null;
  // A username someone deleted is not handed to the next person: her old
  // messages and her coach's notes refer to it, and a stranger inheriting that
  // name would inherit those references.
  if (await isDeletedAccount(username)) return null;

  const name = displayName.trim() || username;
  const created = await writeAccount({
    userId: username,
    name,
    hash: await hashPassword(password),
  });
  // A second signup that raced this one loses here rather than overwriting.
  if (!created) return null;

  await writeEmptyRecord(username, name);
  return { sub: username, role: "member", name };
}

function writeEmptyRecord(username: string, name: string): Promise<void> {
  return writeMemberDoc(username, {
    member: newMember(username, name),
    actions: [],
    pulses: [],
    workoutLogs: [],
    messages: [],
    sessions: [],
    reports: [],
    foodEntries: [],
  });
}

/**
 * An account for someone who arrived by "Continue with Google" and has none.
 *
 * She typed nothing, so the username is made from her name (lib/google.ts) and
 * numbered if it is taken. There is no password: Google is how she gets in,
 * and if she ever cannot, Deepika can set her a temporary one the usual way.
 *
 * Returns null only if no username could be found, or if the same Google
 * account was given an account by another request in the same instant.
 */
export async function createGoogleAccount(person: GooglePerson): Promise<SessionUser | null> {
  const name = person.name.trim() || person.email.split("@")[0];
  for (const username of usernameCandidates(usernameFrom(name, person.email))) {
    if (usernameProblem(username) || isTaken(username)) continue;
    if (await readAccount(username)) continue;
    if (await isDeletedAccount(username)) continue;

    const created = await writeAccount({ userId: username, name, hash: null, googleSub: person.sub, email: person.email });
    if (created) {
      await writeEmptyRecord(username, name);
      return { sub: username, role: "member", name };
    }
    // Not written: either someone took that username this instant, or this
    // Google account now has an account. Only the first is worth another try.
    if (await readAccountByGoogle(person.sub)) return null;
  }
  return null;
}

/** What her account screen needs to know about how she signs in. */
export async function signInSummary(
  userId: string
): Promise<{ hasPassword: boolean; googleEmail: string | null } | null> {
  const account = await readAccount(userId);
  if (!account) return null;
  return { hasPassword: Boolean(account.hash), googleEmail: account.googleSub ? account.email ?? "" : null };
}

export async function verifyAccount(
  username: string,
  password: string
): Promise<SessionUser | null> {
  const account = await readAccount(normaliseUsername(username));
  if (!account) return null;
  if (!(await passwordMatches(password, account.hash))) return null;
  return { sub: account.userId, role: "member", name: account.name };
}

/** Letters and digits with the look-alikes taken out (no 0/o, 1/l/i). A
 *  temporary password is read off a phone and typed in by hand. */
const READABLE = "abcdefghjkmnpqrstuvwxyz23456789";

/** Three groups of four, like "k7mq-x3pa-9wzn". Twelve characters from a
 *  31-symbol alphabet is roughly 59 bits, and it is only ever valid until the
 *  member replaces it. */
function temporaryPassword(): string {
  const group = () => Array.from({ length: 4 }, () => READABLE[randomInt(READABLE.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

export type ResetOutcome =
  | { ok: true; name: string; password: string }
  | { ok: false; reason: "sample" | "env" | "none" };

/**
 * Deepika sets a member a temporary password.
 *
 * There is no email service to send a reset link through, so recovery is
 * mediated by the person who already knows her — which for a coached cohort is
 * a reasonable answer rather than a stopgap. The plaintext is returned once, to
 * Deepika, to pass on; only the hash is stored.
 *
 * Only accounts held in the database can be reset. One whose login lives in the
 * MEMBERS environment variable belongs to whoever runs the deployment.
 */
export async function issueTemporaryPassword(rawUsername: string): Promise<ResetOutcome> {
  const username = normaliseUsername(rawUsername);
  if (RESERVED_USERNAMES.includes(username)) return { ok: false, reason: "sample" };
  const account = await readAccount(username);
  if (!account) {
    return { ok: false, reason: isTaken(username) ? "env" : "none" };
  }
  const password = temporaryPassword();
  const updated = await updateAccountHash(username, await hashPassword(password));
  if (!updated) return { ok: false, reason: "none" };
  return { ok: true, name: account.name, password };
}

export type ChangeOutcome = { ok: true } | { ok: false; reason: "wrong" | "weak" | "env" | "google"; message: string };

/** A member changing her own password. Needs the current one, so a phone left
 *  signed in on a table cannot be used to lock her out. */
export async function changePassword(
  userId: string,
  current: string,
  next: string
): Promise<ChangeOutcome> {
  const account = await readAccount(userId);
  if (!account) {
    return {
      ok: false,
      reason: "env",
      message: "Your password is set by whoever runs this deployment, so it can't be changed here.",
    };
  }
  if (!account.hash) {
    return {
      ok: false,
      reason: "google",
      message: "You sign in with Google, so there is no password to change.",
    };
  }
  if (!(await passwordMatches(current, account.hash))) {
    return { ok: false, reason: "wrong", message: "That isn't your current password." };
  }
  const weak = passwordProblem(next);
  if (weak) return { ok: false, reason: "weak", message: weak };
  await updateAccountHash(userId, await hashPassword(next));
  return { ok: true };
}
