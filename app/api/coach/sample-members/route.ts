/**
 * Removing the six fictional sample members, from Deepika's console.
 *
 * Before real members arrive she should not be looking at made-up women in the
 * same list. This used to take a hand-written SQL delete; it is one button now.
 * Coach only, and limited to the seeded ids, so it cannot reach a real member.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, sessionCookieName } from "@/lib/auth";
import { deleteSampleMembers, isConfigured } from "@/lib/db";
import { RESERVED_USERNAMES } from "@/lib/persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  const user = await readSessionToken(cookies().get(sessionCookieName)?.value);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (user.role !== "coach") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  if (!isConfigured()) return NextResponse.json({ removed: 0, storage: "local" });

  try {
    const removed = await deleteSampleMembers(RESERVED_USERNAMES);
    return NextResponse.json({ removed, storage: "server" });
  } catch (err) {
    console.error("[sample-members] delete failed", err);
    return NextResponse.json(
      { error: "Could not remove them. Nothing was changed — try again." },
      { status: 503 }
    );
  }
}
