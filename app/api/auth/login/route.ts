import { NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieName,
  sessionMaxAge,
  verifyCredentials,
} from "@/lib/auth";
import { encodeUserCookie, USER_COOKIE } from "@/lib/session-client";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}) as any);

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Missing credentials." }, { status: 400 });
  }

  const user = await verifyCredentials(username, password);
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
