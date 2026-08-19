import { NextResponse } from "next/server";

/**
 * Digital Asset Links — how Android verifies that this website and the Play
 * Store app are the same product.
 *
 * Without a matching fingerprint here, the Android app still runs but Chrome
 * keeps a URL bar pinned across the top of it, which is the giveaway that a
 * "Play Store app" is a wrapped website. With it, the app opens clean.
 *
 * The fingerprint comes from the key Google signs the app with, which only
 * exists after the first upload to the Play Console — so this reads it from an
 * environment variable rather than being hardcoded. That means enabling the
 * Android app is a variable and a redeploy, not a code change.
 *
 * Play Console → Test and release → Setup → App signing → "App signing key
 * certificate" → SHA-256 certificate fingerprint. Not the upload key; the app
 * signing key. Getting those two the wrong way round is the usual reason the
 * URL bar never goes away.
 */
export const dynamic = "force-dynamic";

const PACKAGE = process.env.ANDROID_PACKAGE_NAME || "app.vercel.deepika_health_app.twa";

export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 || "")
    .split(/[\s,]+/)
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));

  // An empty array is the honest answer before the app exists: it says "no
  // Android app is authorised for this domain" rather than claiming one is and
  // failing verification with a malformed entry.
  const body = fingerprints.map((fp) => ({
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: PACKAGE,
      sha256_cert_fingerprints: [fp],
    },
  }));

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      // Chrome re-checks this; a long cache would strand a fingerprint change.
      "Cache-Control": "public, max-age=300",
    },
  });
}
