/**
 * "Continue with Google" — the way back.
 *
 * Google sends her browser here with a code. Everything that decides whether
 * she is let in happens in this file, in this order, and any step that fails
 * ends with her back on a page of ours and a plain sentence — never an error
 * page, and never a reason more specific than she needs:
 *
 *   1. The attempt in the cookie must be ours, unedited and under ten minutes
 *      old, and the `state` Google returned must be the one in it. That is what
 *      stops a link sent by someone else from finishing a sign-in in her
 *      browser.
 *   2. The code is swapped for an ID token, server to server (lib/google.ts).
 *   3. The token must be Google's, for this app, for this attempt, in date,
 *      and for an address Google has verified.
 *   4. Only then: who is this, here?
 *
 * The cookie is cleared whatever happens. An attempt is used once.
 *
 * She is never told which step said no. The server log is: every refusal
 * writes one line there (`[google] sign-in refused: …`), with nothing of hers
 * in it — no address, no code, no state. The checks in step 1 used to refuse
 * in silence, and the first real sign-in on the live site failed once that
 * way: nothing was left to say which check it had been.
 */

import { NextResponse, type NextRequest } from "next/server";
import { authSecret, readSessionToken, sessionCookieName, type SessionUser } from "@/lib/auth";
import { createGoogleAccount } from "@/lib/accounts";
import { isConfigured, linkGoogle, readAccountByGoogle } from "@/lib/db";
import {
  appOrigin,
  exchangeCode,
  FLOW_COOKIE,
  googleConfig,
  openFlow,
  personFrom,
  readIdToken,
  sameString,
  type GoogleConfig,
  type GoogleFlow,
  type GooglePerson,
} from "@/lib/google";
import { startSession } from "@/lib/sessionCookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Where she lands, with what to tell her. Never more than one of a short list. */
type Outcome =
  | { to: "/coach" | "/member"; session: SessionUser }
  | { to: string };

export async function GET(req: NextRequest) {
  const config = googleConfig();
  if (!config) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const origin = appOrigin(req.url);
  const sealed = req.cookies.get(FLOW_COOKIE)?.value;
  const flow = openFlow(sealed, authSecret());
  if (!flow && cameFromSomewhere(req)) {
    refused(
      sealed
        ? "the attempt cookie was out of date, or not one of ours"
        : "it came back with no attempt cookie — started in another browser, or more than ten minutes before"
    );
  }

  let outcome: Outcome;
  try {
    outcome = flow ? await decide(req, config, flow, origin) : { to: "/?google=failed" };
  } catch (err) {
    console.error("[google] sign-in failed", err);
    outcome = { to: sorry(flow, "failed") };
  }

  const res = NextResponse.redirect(new URL(outcome.to, origin), { status: 303 });
  res.cookies.set(FLOW_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
  if ("session" in outcome) await startSession(res, outcome.session);
  return res;
}

/** One line in the server log saying which check turned an attempt away. */
function refused(why: string) {
  console.warn(`[google] sign-in refused: ${why}`);
}

/** Whether this looks like a return from Google at all. A bare request to
 *  this address — a scanner, a bookmark — is not worth a line in the log. */
function cameFromSomewhere(req: NextRequest): boolean {
  const params = new URL(req.url).searchParams;
  return params.has("state") || params.has("code") || params.has("error");
}

/** The page to go back to when it did not work, and which sentence to show. */
function sorry(flow: GoogleFlow | null, notice: string): string {
  if (flow?.intent === "link") return `/member/account?google=${notice}`;
  return `/?google=${notice}${flow?.intent === "create" ? "&mode=create" : ""}`;
}

async function decide(req: NextRequest, config: GoogleConfig, flow: GoogleFlow, origin: string): Promise<Outcome> {
  const params = new URL(req.url).searchParams;

  if (!sameString(params.get("state") ?? "", flow.state)) {
    refused(
      "the state that came back is not this attempt's — a newer attempt was started in the same browser before this one returned, or the link did not come from Google"
    );
    return { to: sorry(flow, "failed") };
  }
  // She pressed Cancel on Google's page, or Google declined.
  const error = params.get("error");
  if (error) {
    // Cancelling is her choice, not a refusal.
    if (error === "access_denied") return { to: sorry(flow, "cancelled") };
    // Google's own word for it, and only if it looks like one of Google's:
    // anybody can type anything after "error=".
    refused(`Google answered with an error: ${/^[a-z_]{1,40}$/.test(error) ? error : "one that is not a word of Google's"}`);
    return { to: sorry(flow, "failed") };
  }
  const code = params.get("code");
  if (!code) {
    refused("Google sent back neither a code nor an error");
    return { to: sorry(flow, "failed") };
  }

  const idToken = await exchangeCode(config, {
    code,
    verifier: flow.verifier,
    redirectUri: `${origin}/api/auth/google/callback`,
  });
  const read = personFrom(readIdToken(idToken), {
    clientId: config.clientId,
    issuers: config.issuers,
    nonce: flow.nonce,
  });
  if (!read.ok) {
    if (idToken) console.error(`[google] the ID token was refused: ${read.problem}`);
    return { to: sorry(flow, read.problem === "unverified" ? "unverified" : "failed") };
  }
  const person = read.person;
  const isDeepika = config.coachEmail !== null && person.email.toLowerCase() === config.coachEmail;

  if (flow.intent === "link") return connect(req, flow, person, isDeepika);

  // Deepika, if she has said which Google address is hers (COACH_GOOGLE_EMAIL).
  if (isDeepika) return { to: "/coach", session: { sub: "deepika", role: "coach", name: "Deepika" } };

  if (!isConfigured()) return { to: "/?google=no-account" };

  const account = await readAccountByGoogle(person.sub);
  if (account) return { to: "/member", session: { sub: account.userId, role: "member", name: account.name } };

  // No account is connected to this Google account. Signing in never makes
  // one: someone who already has an account would end up with a second, empty
  // one and conclude everything she had logged was gone.
  if (flow.intent !== "create") return { to: "/?google=no-account" };

  const created = await createGoogleAccount(person);
  if (created) return { to: "/member", session: created };

  // Two taps at once: the other one made the account. Sign her in to it.
  const raced = await readAccountByGoogle(person.sub);
  if (raced) return { to: "/member", session: { sub: raced.userId, role: "member", name: raced.name } };
  refused("no account could be made — none of the usernames tried for the name was free");
  return { to: sorry(flow, "failed") };
}

/** Connecting Google to the account she is signed in to. */
async function connect(req: NextRequest, flow: GoogleFlow, person: GooglePerson, isDeepika: boolean): Promise<Outcome> {
  const session = await readSessionToken(req.cookies.get(sessionCookieName)?.value);
  // Still her, still signed in — the attempt was started for one account and
  // finishes for that one or not at all.
  if (!session || session.role !== "member" || session.sub !== flow.user) {
    refused("connecting Google: no longer signed in as the member who started it");
    return { to: "/?google=failed" };
  }
  // Deepika's own address opens the console. It cannot also open a member's account.
  if (isDeepika) return { to: "/member/account?google=in-use" };

  const linked = await linkGoogle(session.sub, person.sub, person.email);
  if (linked === "ok") return { to: "/member/account?google=connected" };
  return { to: `/member/account?google=${linked === "in-use" ? "in-use" : "unavailable"}` };
}
