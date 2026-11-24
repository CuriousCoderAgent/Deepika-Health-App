/**
 * "Continue with Google" — the way out to Google, and disconnecting it.
 *
 * A form on the sign-in page or the account page posts here. This decides
 * whether the attempt may start at all, writes it down in a short-lived signed
 * cookie, and sends her browser to Google. The way back is ./callback.
 *
 * Three things can be asked for, and each is decided here, on the server,
 * before anything leaves:
 *
 *   signin  nothing to check; whether an account exists is settled on return.
 *   create  only where accounts can be stored, and only with the join code if
 *           one is set. The cookie cannot be edited, so "create" in it on the
 *           way back means this check was passed.
 *   link    only for a signed-in member, and only with her current password —
 *           the same rule as changing it. Without that, a phone left unlocked
 *           on a table would be enough for someone to connect their own
 *           Google account to hers and keep a way in.
 *
 * With Google sign-in not switched on (lib/google.ts) this answers 404.
 */

import { NextResponse, type NextRequest } from "next/server";
import { authSecret, readSessionToken, sessionCookieName } from "@/lib/auth";
import { signInSummary, verifyAccount } from "@/lib/accounts";
import { isConfigured, unlinkGoogle } from "@/lib/db";
import {
  appOrigin,
  authorizationUrl,
  FLOW_COOKIE,
  FLOW_SECONDS,
  googleConfig,
  newFlow,
  sealFlow,
  type GoogleIntent,
} from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404 });

export async function POST(req: NextRequest) {
  const config = googleConfig();
  if (!config) return notFound();

  // Our own pages post here. A form on someone else's site has no business
  // starting a sign-in for whoever happens to be looking at it.
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Start from the sign-in page." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const field = (name: string) => {
    const value = form?.get(name);
    return typeof value === "string" ? value : "";
  };
  const asked = field("intent");
  const intent: GoogleIntent = asked === "create" || asked === "link" ? asked : "signin";

  const origin = appOrigin(req.url);
  const back = (path: string) => NextResponse.redirect(new URL(path, origin), { status: 303 });

  let user: string | undefined;
  try {
    if (intent === "create") {
      if (!isConfigured()) return back("/?google=closed");
      const required = process.env.SIGNUP_CODE?.trim();
      if (required && field("code").trim() !== required) return back("/?google=code&mode=create");
    }

    if (intent === "link") {
      const session = await readSessionToken(req.cookies.get(sessionCookieName)?.value);
      if (!session) return back("/");
      if (session.role !== "member" || !isConfigured()) return back("/member/account?google=unavailable");
      if (!(await verifyAccount(session.sub, field("password")))) return back("/member/account?google=password");
      user = session.sub;
    }
  } catch (err) {
    console.error("[google] could not start", err);
    return back(intent === "link" ? "/member/account?google=failed" : "/?google=failed");
  }

  const flow = newFlow(intent, user);
  const res = NextResponse.redirect(authorizationUrl(config, flow, `${origin}/api/auth/google/callback`), {
    status: 303,
  });
  res.cookies.set(FLOW_COOKIE, sealFlow(flow, authSecret()), {
    httpOnly: true,
    // Lax, not strict: it has to come back with her from Google's page.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: FLOW_SECONDS,
  });
  return res;
}

/** Disconnecting Google from her account. Whose account comes from the session. */
export async function DELETE(req: NextRequest) {
  const session = await readSessionToken(req.cookies.get(sessionCookieName)?.value);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.role !== "member" || !isConfigured()) return notFound();

  try {
    const summary = await signInSummary(session.sub);
    if (!summary || summary.googleEmail === null) return NextResponse.json({ ok: true });
    if (!summary.hasPassword) {
      // It is her only way in. Removing it would be losing the account.
      return NextResponse.json(
        {
          error:
            "Google is the only way into this account, so it can't be disconnected. Ask Deepika for a temporary password first.",
        },
        { status: 409 }
      );
    }
    await unlinkGoogle(session.sub);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[google] could not disconnect", err);
    return NextResponse.json({ error: "Could not disconnect it. Nothing was changed." }, { status: 503 });
  }
}
