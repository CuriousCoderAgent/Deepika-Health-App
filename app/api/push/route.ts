/**
 * Her check-in reminders, on this device.
 *
 * GET    whether reminders are available here, the public key a browser needs
 *        to subscribe, and whether this device and her account have them on.
 * POST   turns them on for this device, at the part of the day she chose.
 * DELETE turns them off — for this device, or for all of hers.
 *
 * Members only, and always about the signed-in account: whose reminders these
 * are comes from the session cookie, never from the request.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionToken, sessionCookieName } from "@/lib/auth";
import {
  deletePushSubscriptions,
  hasPushEndpoint,
  isConfigured,
  pushStatusFor,
  savePushSubscription,
} from "@/lib/db";
import { vapidKeys } from "@/lib/push";
import { isPushEndpoint, isPushKey, isSlot } from "@/lib/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function member() {
  const user = await readSessionToken(cookies().get(sessionCookieName)?.value);
  return user && user.role === "member" ? user : null;
}

export async function GET(req: Request) {
  const user = await member();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  // Reminders need somewhere to keep the subscription between visits.
  if (!isConfigured()) return NextResponse.json({ available: false });

  try {
    const [keys, status] = await Promise.all([vapidKeys(), pushStatusFor(user.sub)]);
    const endpoint = new URL(req.url).searchParams.get("endpoint");
    const thisDevice = Boolean(endpoint && status.devices > 0 && (await hasPushEndpoint(user.sub, endpoint)));
    return NextResponse.json({
      available: true,
      publicKey: keys.publicKey,
      devices: status.devices,
      slot: status.slot,
      thisDevice,
    });
  } catch (err) {
    console.error("[push] status failed", err);
    return NextResponse.json({ available: false }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const user = await member();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "Reminders are not available here." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  const slot = body?.slot;
  if (!isPushEndpoint(endpoint) || !isPushKey(p256dh, 80, 100) || !isPushKey(auth, 16, 32) || !isSlot(slot)) {
    return NextResponse.json({ error: "That subscription doesn't look right." }, { status: 400 });
  }

  try {
    await savePushSubscription(user.sub, { endpoint, p256dh, auth }, slot);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push] save failed", err);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 503 });
  }
}

export async function DELETE(req: Request) {
  const user = await member();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : undefined;
  try {
    await deletePushSubscriptions(user.sub, endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push] delete failed", err);
    return NextResponse.json({ error: "Couldn't turn that off. Try again." }, { status: 503 });
  }
}
