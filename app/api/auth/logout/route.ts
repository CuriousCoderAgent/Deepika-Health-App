import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, sessionCookieName } from "@/lib/auth";
import { deletePushSubscriptions, isConfigured } from "@/lib/db";
import { USER_COOKIE } from "@/lib/session-client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Signing out also stops her reminders. A reminder arriving on a phone she
  // has signed out of — perhaps handed on, perhaps shared — would be hers on
  // someone else's screen. She turns them back on from her account page.
  const user = await readSessionToken(cookies().get(sessionCookieName)?.value);
  if (user?.role === "member" && isConfigured()) {
    await deletePushSubscriptions(user.sub).catch((err) => {
      console.error("[logout] could not clear reminders", err);
    });
  }

  const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });
  res.cookies.set(sessionCookieName, "", { path: "/", maxAge: 0 });
  res.cookies.set(USER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
