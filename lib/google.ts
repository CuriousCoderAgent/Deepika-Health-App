/**
 * Signing in with Google.
 *
 * Off until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set: with neither,
 * nothing on any screen mentions Google and the routes answer 404.
 *
 * How it works, in the order it happens:
 *
 *   1. She taps "Continue with Google". Our server makes three random values
 *      — a state, a nonce and a code verifier — keeps them in a short-lived
 *      signed cookie, and sends her browser to Google.
 *   2. Google asks her which account, and sends her back to us with a code.
 *   3. Our server checks the state against the cookie, then swaps the code for
 *      an ID token by calling Google directly, proving who we are with the
 *      client secret and who she is with the code verifier.
 *   4. The ID token says who she is. We check it was issued for this app, for
 *      this very attempt (the nonce), is still in date, and that Google has
 *      verified the email address.
 *
 * No Google script runs on any page — it is redirects and one server call — so
 * Google learns that she signed in here and nothing about what she does after.
 *
 * The token's signature is not checked, deliberately. It never passes through
 * her browser: we fetch it ourselves from Google over TLS, and for exactly that
 * case OpenID Connect says the connection may stand as the proof (Core
 * §3.1.3.7, step 6). Checking it would mean fetching and caching Google's keys
 * — a second call and a second thing to get wrong — to learn something the
 * first call already established. If the token ever arrives any other way,
 * this stops being true and the signature must be checked.
 *
 * The two addresses and the methods used (S256, the secret sent in the body)
 * are the ones Google publishes at
 * https://accounts.google.com/.well-known/openid-configuration.
 *
 * What we keep from Google is its id for her account, her email address and,
 * if the account is being created, her name. See the privacy page.
 *
 * Everything here is plain functions with no Next.js in them, so the rules
 * can be tested without a browser (tests/logic.test.mjs). Server only: it
 * reads the client secret.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import http from "http";
import https from "https";

/* ---------------------------------------------------------------- settings */

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  /** Who the ID token must say issued it. */
  issuers: string[];
  authUrl: string;
  tokenUrl: string;
  /** Deepika's own Google address, lower-cased, if she signs in with it. */
  coachEmail: string | null;
}

const GOOGLE = {
  issuers: ["https://accounts.google.com", "accounts.google.com"],
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
};

/**
 * For the end-to-end checks only: a stand-in for Google running on this
 * machine. Anything that is not a plain-http loopback address is ignored, so
 * this setting cannot be used to send anyone's sign-in somewhere else.
 */
function standIn(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    return url.protocol === "http:" && loopback ? url.origin : null;
  } catch {
    return null;
  }
}

/** The settings, or null when Google sign-in is not switched on. */
export function googleConfig(env: Record<string, string | undefined> = process.env): GoogleConfig | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const coachEmail = env.COACH_GOOGLE_EMAIL?.trim().toLowerCase() || null;
  const test = standIn(env.GOOGLE_TEST_ISSUER);
  if (test) {
    return { clientId, clientSecret, coachEmail, issuers: [test], authUrl: `${test}/o/oauth2/v2/auth`, tokenUrl: `${test}/token` };
  }
  return { clientId, clientSecret, coachEmail, ...GOOGLE };
}

/**
 * The address this app is being reached at, which is where Google has to send
 * her back to — and it has to be one of the addresses registered for the
 * client in Google's console, or Google refuses before she sees anything.
 *
 * Normally that is simply the address of the request. APP_ORIGIN pins it for a
 * server that sits behind a proxy and cannot see its own public address.
 */
export function appOrigin(requestUrl: string, env: Record<string, string | undefined> = process.env): string {
  const pinned = env.APP_ORIGIN?.trim();
  if (pinned) {
    try {
      const url = new URL(pinned);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch {
      /* not an address; fall through to the request's own */
    }
  }
  return new URL(requestUrl).origin;
}

/* ------------------------------------------------------- one sign-in attempt */

/** What she set out to do. Decided by our server when it starts the attempt. */
export type GoogleIntent = "signin" | "create" | "link";

export interface GoogleFlow {
  state: string;
  nonce: string;
  verifier: string;
  intent: GoogleIntent;
  /** For "link": whose account. The way back refuses if that has changed. */
  user?: string;
  /** When this attempt stops being valid, in seconds since 1970. */
  exp: number;
}

/** Ten minutes: long enough to pick an account and type a Google password. */
export const FLOW_SECONDS = 600;
export const FLOW_COOKIE = "dw_google";

const random = () => randomBytes(32).toString("base64url");

export function newFlow(intent: GoogleIntent, user?: string, now: number = Date.now()): GoogleFlow {
  return {
    state: random(),
    nonce: random(),
    verifier: random(),
    intent,
    ...(user ? { user } : {}),
    exp: Math.floor(now / 1000) + FLOW_SECONDS,
  };
}

/** PKCE: Google is given this; only whoever holds the verifier can finish. */
export function challengeFor(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/* The attempt travels in a cookie, signed so it cannot be edited — "create"
   is only ever written there after the join code was checked. The label makes
   the signature useless as anything else: the session cookie is signed with
   the same secret and must never accept one of these. */
function seal(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`dw-google-flow.${payload}`).digest("base64url");
}

/** Same length and same characters, compared without stopping early. */
export function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function sealFlow(flow: GoogleFlow, secret: string): string {
  const payload = Buffer.from(JSON.stringify(flow)).toString("base64url");
  return `${payload}.${seal(payload, secret)}`;
}

/** The attempt from its cookie — or null if it is missing, edited or too old. */
export function openFlow(sealed: string | undefined, secret: string, now: number = Date.now()): GoogleFlow | null {
  if (!sealed) return null;
  const [payload, signature, ...rest] = sealed.split(".");
  if (!payload || !signature || rest.length) return null;
  if (!sameString(signature, seal(payload, secret))) return null;
  try {
    const flow = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleFlow;
    const whole =
      typeof flow.state === "string" && flow.state.length >= 20 &&
      typeof flow.nonce === "string" && flow.nonce.length >= 20 &&
      typeof flow.verifier === "string" && flow.verifier.length >= 43 &&
      (flow.intent === "signin" || flow.intent === "create" || flow.intent === "link") &&
      typeof flow.exp === "number";
    if (!whole || flow.exp * 1000 < now) return null;
    if (flow.intent === "link" && !flow.user) return null;
    return flow;
  } catch {
    return null;
  }
}

/** Where her browser is sent to choose an account. */
export function authorizationUrl(config: GoogleConfig, flow: GoogleFlow, redirectUri: string): string {
  const url = new URL(config.authUrl);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    // Who she is, her address, her name. Nothing else is asked for.
    scope: "openid email profile",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: challengeFor(flow.verifier),
    code_challenge_method: "S256",
    // Always ask which account. On a shared phone the one already signed in to
    // Google is not necessarily hers.
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/* ------------------------------------------------------------ the ID token */

export interface GooglePerson {
  /** Google's own id for the account. Never changes, unlike an address. */
  sub: string;
  email: string;
  name: string;
}

export type TokenProblem = "malformed" | "issuer" | "audience" | "expired" | "nonce" | "unverified";

/** The claims inside an ID token. Decoded, not trusted — personFrom() decides. */
export function readIdToken(idToken: unknown): Record<string, unknown> | null {
  if (typeof idToken !== "string") return null;
  const parts = idToken.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return claims && typeof claims === "object" && !Array.isArray(claims) ? claims : null;
  } catch {
    return null;
  }
}

const tidy = (text: string, max: number) =>
  text.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Who the token says she is — if, and only if, it was issued by Google, for
 * this app, for this attempt, is still in date, and names a verified address.
 */
export function personFrom(
  claims: Record<string, unknown> | null,
  expect: { clientId: string; issuers: string[]; nonce: string; now?: number }
): { ok: true; person: GooglePerson } | { ok: false; problem: TokenProblem } {
  const no = (problem: TokenProblem) => ({ ok: false as const, problem });
  if (!claims) return no("malformed");

  if (typeof claims.iss !== "string" || !expect.issuers.includes(claims.iss)) return no("issuer");

  // Issued for us. A token Google gave some other app, replayed here, stops at
  // this line.
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(expect.clientId)) return no("audience");
  if (audiences.length > 1 && claims.azp !== expect.clientId) return no("audience");

  const now = expect.now ?? Date.now();
  if (typeof claims.exp !== "number" || claims.exp * 1000 < now - 60_000) return no("expired");

  // Issued for this attempt, not an earlier one of hers or somebody else's.
  if (typeof claims.nonce !== "string" || !sameString(claims.nonce, expect.nonce)) return no("nonce");

  if (typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 255) return no("malformed");
  if (typeof claims.email !== "string" || !/^[^@\s]+@[^@\s]+$/.test(claims.email) || claims.email.length > 320) {
    return no("malformed");
  }
  // An address Google has not confirmed proves nothing about who is typing.
  if (claims.email_verified !== true && claims.email_verified !== "true") return no("unverified");

  const given = [claims.given_name, claims.family_name].filter((part) => typeof part === "string").join(" ");
  const name =
    tidy(typeof claims.name === "string" ? claims.name : "", 80) ||
    tidy(given, 80) ||
    tidy(claims.email.split("@")[0], 80);

  return { ok: true, person: { sub: claims.sub, email: claims.email, name } };
}

/* --------------------------------------------------------------- a username */

/**
 * A username for someone who did not have to choose one.
 *
 * The username is also the key her record is stored under, so it has to obey
 * the same rules as one typed at sign-up (lib/accounts.ts): 3 to 24 of a-z,
 * 0-9, dot, dash and underscore, starting with a letter or digit. From her
 * name where it can be written that way, else from the first part of her
 * address. Kept to 20 so there is room for "-2" if the name is taken.
 */
export function usernameFrom(name: string, email: string): string {
  const slug = (text: string) =>
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20)
      .replace(/-+$/, "");
  const fromName = slug(name);
  if (fromName.length >= 3) return fromName;
  const fromEmail = slug(email.split("@")[0] ?? "");
  if (fromEmail.length >= 3) return fromEmail;
  return "member";
}

/** The names to try, in order: meera-nair, meera-nair-2 … -9, then random tails. */
export function usernameCandidates(base: string, tail: () => string = () => randomBytes(3).toString("hex").slice(0, 4)): string[] {
  const numbered = Array.from({ length: 8 }, (_, i) => `${base}-${i + 2}`);
  const random = Array.from({ length: 4 }, () => `${base.slice(0, 19)}-${tail()}`);
  return [base, ...numbered, ...random];
}

/* ------------------------------------------------------ the one server call */

/**
 * Swaps the code Google sent back for an ID token. Returns null on any
 * failure; the reason goes to the server log, never to her screen.
 *
 * Node's own https, not fetch: Next 14 wraps fetch in a cache this app has no
 * use for, and several of the advisories open against it are in that wrapper
 * (docs/DEPLOYMENT.md, "The Next.js version").
 */
export function exchangeCode(
  config: GoogleConfig,
  given: { code: string; verifier: string; redirectUri: string }
): Promise<string | null> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: given.code,
    code_verifier: given.verifier,
    redirect_uri: given.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  }).toString();

  return new Promise((resolve) => {
    let settled = false;
    const done = (idToken: string | null, why?: string) => {
      if (settled) return;
      settled = true;
      if (why) console.error(`[google] code exchange failed: ${why}`);
      resolve(idToken);
    };

    const url = new URL(config.tokenUrl);
    const request = (url.protocol === "http:" ? http : https).request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          Accept: "application/json",
        },
        timeout: 8000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          // A token reply is a couple of kilobytes. Anything vast is not one.
          if (size > 64 * 1024) {
            request.destroy();
            done(null, "the reply was too large");
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          let reply: Record<string, unknown> = {};
          try {
            reply = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {
            return done(null, `status ${response.statusCode}, and the reply was not JSON`);
          }
          if (response.statusCode !== 200 || typeof reply.id_token !== "string") {
            // Google's error code (invalid_client, redirect_uri_mismatch, …) is
            // what whoever set this up needs. It is not a secret.
            const code = typeof reply.error === "string" ? reply.error.slice(0, 60) : "no id_token in the reply";
            return done(null, `status ${response.statusCode}, ${code}`);
          }
          done(reply.id_token);
        });
        response.on("error", (error) => done(null, error.message));
      }
    );
    request.on("timeout", () => {
      request.destroy();
      done(null, "no answer within 8 seconds");
    });
    request.on("error", (error) => done(null, error.message));
    request.end(body);
  });
}
