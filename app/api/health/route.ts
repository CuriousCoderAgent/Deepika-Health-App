/**
 * Is the app up, and can it reach its database?
 *
 * For whoever has just deployed. The tables are made, and any change to them
 * applied, the first time something needs the database (lib/db.ts) — which
 * would otherwise be the first member to open the app after a release. Opening
 * this address does that first and says whether it worked.
 *
 * It says nothing about anyone: `ok`, and whether records are kept in a
 * database or only in each browser.
 */

import { NextResponse } from "next/server";
import { ensureReady, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (body: { ok: boolean; storage: "database" | "browser" }, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  if (!isConfigured()) return reply({ ok: true, storage: "browser" });
  try {
    await ensureReady();
    return reply({ ok: true, storage: "database" });
  } catch (err) {
    console.error("[health] the database is not ready", err);
    return reply({ ok: false, storage: "database" }, 503);
  }
}
