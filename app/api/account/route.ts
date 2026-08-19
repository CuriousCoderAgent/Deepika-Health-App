/**
 * Deleting your own account.
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
import { deleteMemberAccount, isConfigured } from "@/lib/db";
import { USER_COOKIE } from "@/lib/session-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
