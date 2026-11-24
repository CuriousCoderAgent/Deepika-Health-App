import type { NextResponse } from "next/server";
import { createSessionToken, sessionCookieName, sessionMaxAge, type SessionUser } from "./auth";
import { encodeUserCookie, USER_COOKIE } from "./session-client";

/**
 * Signs someone in on this response.
 *
 * Two cookies, set together and only here, so that every way in — a password,
 * a new account, Google — ends in exactly the same session:
 *
 *   dw_session  the credential. Signed, httpOnly, never readable by a script.
 *   dw_user     who it is, readable. Not a credential — see lib/session-client.ts.
 */
export async function startSession(res: NextResponse, user: SessionUser): Promise<void> {
  const cookie = {
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge,
  };
  res.cookies.set(sessionCookieName, await createSessionToken(user), { ...cookie, httpOnly: true });
  res.cookies.set(USER_COOKIE, encodeUserCookie(user), { ...cookie, httpOnly: false });
}
