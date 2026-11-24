/**
 * Your own account: how you sign in to it, and deleting it.
 *
 * Deleting it —
 *
 * Required by Google Play for any app that lets people create accounts, and
 * required of us anyway: this holds health data about identifiable people, and
 * being able to take it back is not a feature, it is the deal.
 *
 * Whose account is deleted comes from the signed session cookie, never from
 * the request body. There is no id to tamper with.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, sessionCookieName } from "@/lib/auth";
import { signInSummary } from "@/lib/accounts";
import { deleteMemberAccount, isConfigured } from "@/lib/db";
import { googleConfig } from "@/lib/google";
import { USER_COOKIE } from "@/lib/session-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * How she signs in, for her account screen: whether she has a password, and
 * which Google account is connected, if one is. Her own, from the session —
 * there is no id to ask about anyone else's with.
 *
 * `stored` is false for an account this cannot say anything about: Deepika
 * looking at a member's app, a login that lives in the deployment's settings,
 * or a deployment with no database.
 */
export async function GET() {
  const user = await readSessionToken(cookies().get(sessionCookieName)?.value);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const none = { stored: false, hasPassword: true, google: { available: false, email: null } };
  if (user.role !== "member" || !isConfigured()) return NextResponse.json(none);
  try {
    const summary = await signInSummary(user.sub);
    if (!summary) return NextResponse.json(none);
    return NextResponse.json({
      stored: true,
      hasPassword: summary.hasPassword,
      google: { available: Boolean(googleConfig()), email: summary.googleEmail },
    });
  } catch (err) {
    console.error("[account] could not read how she signs in", err);
    return NextResponse.json(none);
  }
}

export async function DELETE() {
  const user = await readSessionToken(cookies().get(sessionCookieName)?.value);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Deepika's login is the practice, not a personal account, and deleting it
  // would take the console down for everyone. It is removed by changing the
  // deployment, which is the level that decision belongs at.
  if (user.role === "coach") {
    return NextResponse.json(
      { error: "The coach account can't be deleted from here." },
      { status: 403 }
    );
  }

  if (!isConfigured()) {
    // Browser-storage mode: there is nothing on a server to delete. The client
    // clears its own storage and signs out, which genuinely is all of it.
    return NextResponse.json({ ok: true, storage: "local" });
  }

  try {
    await deleteMemberAccount(user.sub);
  } catch (err) {
    console.error("[account] delete failed", err);
    return NextResponse.json(
      { error: "Could not delete the account. Nothing was removed — try again." },
      { status: 503 }
    );
  }

  // Sign out in the same response. Leaving a valid session cookie pointing at
  // a deleted account would put her in an app with no record behind it.
  const res = NextResponse.json({ ok: true, storage: "server" });
  for (const name of [sessionCookieName, USER_COOKIE]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return res;
}
