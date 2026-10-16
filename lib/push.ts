/**
 * Sending check-in reminders through the browser's push service.
 *
 * Standard Web Push: the app signs each request with a VAPID key pair, and the
 * message itself is encrypted to the device, so Google, Apple or Mozilla carry
 * it without being able to read it. The key pair is made on first use and kept
 * in the database (or supplied as VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY), so
 * there is nothing for anyone to configure before reminders work.
 *
 * Server only — the private key must never reach a browser.
 */

import webpush from "web-push";
import { readMeta, writeMetaOnce } from "./db";
import { SUPPORT_EMAIL } from "./support";

const META_KEY = "vapid_keys";

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

let cached: VapidKeys | null = null;

export async function vapidKeys(): Promise<VapidKeys> {
  if (cached) return cached;
  const fromEnv = {
    publicKey: process.env.VAPID_PUBLIC_KEY?.trim() ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY?.trim() ?? "",
  };
  if (fromEnv.publicKey && fromEnv.privateKey) return (cached = fromEnv);

  const stored = await readMeta(META_KEY);
  const json = stored ?? (await writeMetaOnce(META_KEY, JSON.stringify(webpush.generateVAPIDKeys())));
  const keys = JSON.parse(json) as VapidKeys;
  return (cached = keys);
}

/**
 * Who push services should contact about these messages. A mailto when the
 * practice has a support address, otherwise the app's own address.
 */
function subject(origin: string): string {
  if (process.env.VAPID_SUBJECT?.trim()) return process.env.VAPID_SUBJECT.trim();
  if (SUPPORT_EMAIL) return `mailto:${SUPPORT_EMAIL}`;
  return origin;
}

export type SendOutcome = "sent" | "gone" | "failed";

/** The one function that touches the network — swapped out in tests. */
export type Sender = (
  sub: { endpoint: string; p256dh: string; auth: string },
  message: { title: string; body: string; url: string }
) => Promise<SendOutcome>;

export function webPushSender(keys: VapidKeys, origin: string): Sender {
  return async (sub, message) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(message),
        {
          vapidDetails: { subject: subject(origin), publicKey: keys.publicKey, privateKey: keys.privateKey },
          // A morning reminder delivered at lunchtime is noise, so it expires.
          TTL: 3 * 60 * 60,
          // A newer reminder replaces one still waiting on a switched-off phone.
          topic: "check-in",
          urgency: "normal",
        }
      );
      return "sent";
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // The browser unsubscribed, or the app was uninstalled.
      if (status === 404 || status === 410) return "gone";
      console.error("[push] send failed", status ?? err);
      return "failed";
    }
  };
}
