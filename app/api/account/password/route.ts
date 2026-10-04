/**
 * A member changing her own password.
 *
 * Whose password is taken from the signed cookie, never the body, and the
 * current password is required: a phone left unlocked on a table must not be
 * enough to take an account over.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, sessionCookieName } from "@/lib/auth";
import { changePassword } from "@/lib/accounts";
import { isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await readSessionToken(cookies().get(sessionCookieName)?.value);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role === "coach") {
    return NextResponse.json(
      { error: "Deepika's password is set in the deployment settings." },
      { status: 403 }
    );
  }
  if (!isConfigured()) {
    return NextResponse.json({ error: "Accounts aren't stored on a server here." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";

  const result = await changePassword(user.sub, current, next);
  if (!result.ok) {
    const status = result.reason === "wrong" ? 403 : result.reason === "weak" ? 400 : 409;
    return NextResponse.json({ error: result.message }, { status });
  }
  return NextResponse.json({ ok: true });
}
