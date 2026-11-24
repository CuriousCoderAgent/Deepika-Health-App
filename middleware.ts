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
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Nothing in this app is submitted to a page: every save, sign-in and
  // sign-out goes to an address under /api. Next hands a POST to any page
  // address to its form-action reader all the same, whether or not the app
  // has form actions — and that reader is where most of the serious
  // advisories against Next 14 are. So a request like that stops here,
  // before anything reads it. (app/api/[...missing] does the same job for a
  // mistyped /api address, which would otherwise fall through to a page.)
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
    // Everywhere else, only the requests Next would treat as a form action:
    // it decides that from these two headers (see
    // next/dist/server/lib/server-action-request-meta.js), so an ordinary
    // page view or file download never comes through here at all.
    //
    // /_next/image is left out because Next answers that address itself,
    // ahead of this file; next.config.mjs deals with it.
    { source: "/((?!api/|_next/image).*)", has: [{ type: "header", key: "next-action" }] },
    { source: "/((?!api/|_next/image).*)", has: [{ type: "header", key: "content-type" }] },
  ],
};
