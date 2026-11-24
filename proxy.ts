import { NextResponse, type NextRequest } from "next/server";
import { readSessionToken, sessionCookieName } from "@/lib/auth";

/** The screens that hold someone's health data. */
const SIGNED_IN_ONLY = /^\/(?:member|coach)(?:\/|$)|^\/onboarding\/?$/;

/**
 * Route protection, enforced on the server.
 *
 * A client-side redirect is decoration — anyone can skip it. This runs
 * before the page does, so an unauthenticated request never reaches a
 * screen holding someone's health data.
 *
 * Next 16 calls this the proxy; it was middleware.ts. It now runs on Node,
 * but all it needs is the cookie's signature, checked by lib/auth.ts. It
 * never imports lib/accounts.ts, which reaches the database.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The image-resizing address. No screen uses it and next.config.mjs
  // switches it off — but that turned out not to be enough everywhere. On
  // Vercel the platform has a resizer of its own at /_next/image, and on the
  // first Next 16 build there it answered ahead of the rewrite that is meant
  // to turn the address away, `unoptimized` or not: it resized an icon on
  // request. The proxy runs before either, on Vercel and under `next start`
  // alike, so the answer is given here. The rewrite stays as the second lock.
  // The header says who turned the request away, which the rewrite's answer
  // does not carry: tests/e2e/refused.mjs reads it, so taking this block out
  // fails a check here rather than passing quietly and reopening on Vercel.
  if (pathname.startsWith("/_next/image")) {
    return NextResponse.json({ error: "Not found." }, { status: 404, headers: { "x-refused-by": "proxy" } });
  }

  // Nothing in this app is submitted to a page: every save, sign-in and
  // sign-out goes to an address under /api. Next hands a POST to any page
  // address to its form-action reader all the same, whether or not the app
  // has form actions — and that reader has been behind some of the worst
  // Next.js advisories, in 16 as in 14 (docs/DEPLOYMENT.md, "The Next.js
  // version"). So a request like that stops here, before anything reads it.
  // (app/api/[...missing] does the same job for a mistyped /api address,
  // which would otherwise fall through to a page.)
  if (!pathname.startsWith("/api/") && req.method !== "GET" && req.method !== "HEAD") {
    return new NextResponse(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  if (!SIGNED_IN_ONLY.test(pathname)) return NextResponse.next();

  const session = await readSessionToken(req.cookies.get(sessionCookieName)?.value);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // The coach can open a member's app — that's the "See her app" flow, and
  // she needs it. A member can never reach the console.
  if (pathname.startsWith("/coach") && session.role !== "coach") {
    return NextResponse.redirect(new URL("/member", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/member/:path*",
    "/coach/:path*",
    "/onboarding",
    // The image-resizing address and anything spelt like it, whatever the
    // method — answered 404 above.
    "/_next/image:rest(.*)",
    // Everywhere else, only the requests Next would treat as a form action:
    // it decides that from these two headers (see
    // next/dist/server/lib/server-action-request-meta.js), so an ordinary
    // page view or file download never comes through here at all.
    { source: "/((?!api/|_next/image).*)", has: [{ type: "header", key: "next-action" }] },
    { source: "/((?!api/|_next/image).*)", has: [{ type: "header", key: "content-type" }] },
  ],
};
