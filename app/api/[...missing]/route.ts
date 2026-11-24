import { NextResponse } from "next/server";

/**
 * Any address under /api that is not one of the routes beside this folder.
 *
 * Without this, a wrong /api address falls through to the app's "page not
 * found" screen — which is a page, and a POST to a page is exactly what
 * proxy.ts exists to turn away. Answering here keeps every /api
 * address, real or mistyped, away from the page renderer, and gives whoever
 * called it JSON rather than a web page.
 *
 * The real routes are more specific than this one, so they always win.
 */
function notFound() {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}

export {
  notFound as GET,
  notFound as HEAD,
  notFound as POST,
  notFound as PUT,
  notFound as PATCH,
  notFound as DELETE,
  notFound as OPTIONS,
};
