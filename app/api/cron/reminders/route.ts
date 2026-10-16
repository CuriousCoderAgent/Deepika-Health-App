/**
 * The scheduled run that sends check-in reminders.
 *
 * Called by Vercel's scheduler (vercel.json) once in the morning and once in
 * the evening, India time. All the rules — once a day, not if she has already
 * checked in, fewer when she has gone quiet, never outside sensible hours —
 * live in lib/reminders.ts.
 *
 * When CRON_SECRET is set, Vercel sends it and anything without it is refused.
 * Without it the route still works, and the worst a stranger could do by
 * calling it is send each opted-in member the reminder she would have had
 * anyway, a little early: the window, the once-a-day rule and the
 * already-checked-in rule all still apply. The reply is counts, never names.
 */

import { NextResponse } from "next/server";
import { dateKey, hourOf } from "@/lib/calendar";
import {
  dropPushEndpoint,
  isConfigured,
  markPushSent,
  pushSubscriptionsFor,
  readMemberDoc,
} from "@/lib/db";
import { vapidKeys, webPushSender } from "@/lib/push";
import { isSlot, runReminders } from "@/lib/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const url = new URL(req.url);
  const slot = url.searchParams.get("slot");
  if (!isSlot(slot)) return NextResponse.json({ error: "slot must be morning or evening" }, { status: 400 });
  if (!isConfigured()) return NextResponse.json({ configured: false });

  try {
    const keys = await vapidKeys();
    const send = webPushSender(keys, url.origin);
    const summary = await runReminders(slot, dateKey(), hourOf(), {
      devices: pushSubscriptionsFor,
      readDoc: readMemberDoc,
      markSent: markPushSent,
      drop: dropPushEndpoint,
      send: (device, message) => send(device, message),
    });
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[reminders] run failed", err);
    return NextResponse.json({ error: "Run failed" }, { status: 500 });
  }
}
