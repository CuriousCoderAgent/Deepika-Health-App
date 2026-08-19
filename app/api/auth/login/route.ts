import { NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieName,
  sessionMaxAge,
  verifyCredentials,
} from "@/lib/auth";
import { normaliseUsername, verifyAccount } from "@/lib/accounts";
import { isConfigured, isDeletedAccount } from "@/lib/db";
import { encodeUserCookie, USER_COOKIE } from "@/lib/session-client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}) as any);

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Missing credentials." }, { status: 400 });
  }

  // A deleted account stays deleted, including one whose credential lives in
  // the MEMBERS environment variable and therefore still technically matches.
  // Without this, "delete my account" would empty someone's data and let her
  // sign straight back into a fresh one, which is not a deletion.
  if (isConfigured()) {
    try {
      if (await isDeletedAccount(normaliseUsername(username))) {
        return NextResponse.json(
          { error: "That username and password don't match." },
          { status: 401 }
        );
      }
    } catch (err) {
      console.error("[login] tombstone check failed", err);
    }
  }

  // Accounts come from two places: the environment, which holds Deepika's
  // login and anything handed out by hand, and the database, which holds the
  // accounts members created for themselves. Environment first — it is the
  // one that works with no infrastructure at all.
  let user = await verifyCredentials(username, password);
  if (!user && isConfigured()) {
    try {
      user = await verifyAccount(username, password);
    } catch (err) {
      console.error("[login] account lookup failed", err);
    }
  }
  if (!user) {
    // One message for both wrong-user and wrong-password, so this can't be
    // used to discover which accounts exist.
    return NextResponse.json(
      { error: "That username and password don't match." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ role: user.role });
  res.cookies.set(sessionCookieName, await createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge,
  });
  // Readable companion cookie — identity only, never a credential. See
  // lib/session-client.ts for why the two are separate.
  res.cookies.set(USER_COOKIE, encodeUserCookie(user), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge,
  });
  return res;
}
