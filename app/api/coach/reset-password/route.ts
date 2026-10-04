/**
 * Deepika sets a member a temporary password.
 *
 * Coach only, and the member is named in the request because Deepika is acting
 * on someone else's account — the one place in the app where the id does come
 * from the body. That is why the role check comes first and is on the signed
 * cookie, never on anything the caller sends.
 *
 * The temporary password is returned once and never stored in the clear.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, sessionCookieName } from "@/lib/auth";
import { issueTemporaryPassword } from "@/lib/accounts";
import { isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(req: Request) {
  const user = await readSessionToken(cookies().get(sessionCookieName)?.value);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "coach") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Accounts aren't stored on a server in this deployment, so there is nothing to reset." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const username = typeof body.username === "string" ? body.username : "";
  if (!username.trim()) return NextResponse.json({ error: "Which member?" }, { status: 400 });

  const result = await issueTemporaryPassword(username);
  if (!result.ok) {
    const message =
      result.reason === "sample"
        ? "That is a sample member, not a real account."
        : result.reason === "env"
          ? "Her password is set in the deployment settings (the MEMBERS variable), so it can't be reset here."
          : "There is no account with that username.";
    return NextResponse.json({ error: message }, { status: result.reason === "none" ? 404 : 409, headers: NO_STORE });
  }
  return NextResponse.json({ password: result.password, name: result.name }, { headers: NO_STORE });
}
