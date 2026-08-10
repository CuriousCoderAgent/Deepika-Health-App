/**
 * Authentication for the pilot.
 *
 * Deliberately small: two accounts, a signed session cookie, no external
 * auth service. That is the right size for a closed pilot and it keeps the
 * app deployable with nothing but environment variables.
 *
 * How credentials work:
 *   - Set AUTH_SECRET, COACH_PASSWORD and MEMBER_PASSWORD in the environment
 *     (Vercel → Settings → Environment Variables) and those are used.
 *   - Set none of them and the app falls back to the documented demo
 *     credentials below, so a preview deployment still opens.
 *
 * The fallback exists because this build currently holds only fictional
 * data. Before a real member signs in, set the environment variables — a
 * password committed to a public repo is not a password. `sessionsAreSecure`
 * reports which mode is live so the UI can say so honestly.
 */

const SESSION_COOKIE = "dw_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — this cohort should not be re-typing passwords

export type Role = "coach" | "member";

export interface SessionUser {
  /** Matches a Member.id in lib/seed.ts for members; "deepika" for the coach. */
  sub: string;
  role: Role;
  name: string;
}

interface Account extends SessionUser {
  username: string;
  password: string;
}

/** Demo passwords. Only ever used when the environment sets nothing. */
const DEMO_COACH_PASSWORD = "deepika2026";
const DEMO_MEMBER_PASSWORD = "radhika2026";

export function sessionsAreSecure(): boolean {
  return Boolean(
    process.env.AUTH_SECRET && process.env.COACH_PASSWORD && process.env.MEMBER_PASSWORD
  );
}

export const demoCredentials = {
  coach: { username: "deepika", password: DEMO_COACH_PASSWORD },
  member: { username: "radhika", password: DEMO_MEMBER_PASSWORD },
};

function accounts(): Account[] {
  return [
    {
      sub: "deepika",
      role: "coach",
      name: "Deepika",
      username: "deepika",
      password: process.env.COACH_PASSWORD || DEMO_COACH_PASSWORD,
    },
    {
      sub: "radhika",
      role: "member",
      name: "Radhika",
      username: "radhika",
      password: process.env.MEMBER_PASSWORD || DEMO_MEMBER_PASSWORD,
    },
  ];
}

function secret(): string {
  // A stable fallback keeps preview deployments working; it is not a secret,
  // which is exactly why sessionsAreSecure() reports false without the env var.
  return process.env.AUTH_SECRET || "dev-only-unsafe-secret-set-AUTH_SECRET";
}

/* ------------------------------------------------------------------ */
/* Signing — Web Crypto, so this works in both the Edge middleware and  */
/* Node route handlers without a polyfill.                              */
/* ------------------------------------------------------------------ */

function b64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig));
}

/** Constant-time-ish comparison. Both inputs are already fixed-length digests. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const body = { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE };
  const payload = b64url(new TextEncoder().encode(JSON.stringify(body)));
  return `${payload}.${await hmac(payload)}`;
}

export async function readSessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!safeEqual(sig, await hmac(payload))) return null;
  try {
    const body = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (typeof body.exp !== "number" || body.exp * 1000 < Date.now()) return null;
    return { sub: body.sub, role: body.role, name: body.name };
  } catch {
    return null;
  }
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<SessionUser | null> {
  const account = accounts().find(
    (a) => a.username.toLowerCase() === username.trim().toLowerCase()
  );
  if (!account) return null;
  if (!safeEqual(account.password, password)) return null;
  return { sub: account.sub, role: account.role, name: account.name };
}

export const sessionCookieName = SESSION_COOKIE;
export const sessionMaxAge = SESSION_MAX_AGE;
