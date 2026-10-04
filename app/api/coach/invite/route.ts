/**
 * What Deepika needs to bring a member in: whether sign-up is open, and the
 * join code if there is one.
 *
 * Coach only. The code is the one thing standing between "Deepika's cohort" and
 * "anyone with the link", so it is shown to her and nobody else.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, sessionCookieName } from "@/lib/auth";
import { isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await readSessionToken(cookies().get(sessionCookieName)?.value);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "coach") return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const code = process.env.SIGNUP_CODE?.trim() || null;
  return NextResponse.json(
    { signupOpen: isConfigured(), code },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
