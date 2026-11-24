/**
 * Requests the app never makes, and must turn away.
 *
 * Two things this app does not use but Next leaves switched on — the
 * image-resizing address, and POSTs to a page (form actions) — are where
 * the worst Next.js advisories have come through, in 16 as in 14.
 * next.config.mjs, proxy.ts and app/api/[...missing] close them; this is the
 * check that they stay closed — and that the requests the app does make are
 * not caught in the same net.
 *
 * No browser and no database: these are plain requests, the kind a scanner
 * sends.
 */
import { check } from "./harness.mjs";

const ACTION = { "Next-Action": "0".repeat(40), "Content-Type": "text/plain;charset=UTF-8" };

export default async function refused({ base, serverLog }) {
  const send = async (path, init = {}) => {
    const res = await fetch(base + path, { redirect: "manual", ...init });
    return { status: res.status, type: res.headers.get("content-type") ?? "", body: await res.text() };
  };
  /** A form, as a browser would post one. */
  const form = () => {
    const data = new FormData();
    data.append("1_$ACTION_ID_" + "0".repeat(40), "");
    data.append("0", '["$K1"]');
    return data;
  };
  const urlEncoded = { headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "a=1" };
  const saw = (list) => list.map(([what, r]) => `${what} → ${r.status}`).join(", ");

  // ---- the image-resizing address -------------------------------------------
  const image = "/_next/image?url=%2Ficons%2Ficon-192.png&w=64&q=75";
  const resized = await send(image);
  check(
    "R1 the image-resizing address resizes nothing — it answers 404, and as JSON, so no page was drawn either",
    resized.status === 404 && resized.type.includes("json"),
    `${resized.status} ${resized.type}`
  );

  const spelt = [];
  for (const path of [image, "/_next/imagefoo", "/_next/image/x"]) {
    spelt.push([`form to ${path.split("?")[0]}`, await send(path, { method: "POST", body: form() })]);
    spelt.push([`action to ${path.split("?")[0]}`, await send(path, { method: "POST", headers: ACTION, body: "[]" })]);
  }
  check(
    "R2 a POST to that address, or anything spelt like it, gets the same plain 404",
    spelt.every(([, r]) => r.status === 404 && r.type.includes("json")),
    saw(spelt)
  );

  // ---- POSTs to a page --------------------------------------------------------
  // Real pages, a page behind sign-in, an address that does not exist, a
  // missing file, a real file, and /api itself, which is not a route.
  const pages = ["/", "/privacy", "/member", "/coach", "/onboarding", "/no-such-page", "/_next/static/nope.js", "/icons/icon-192.png", "/api"];

  const withHeader = [];
  for (const path of pages) withHeader.push([path, await send(path, { method: "POST", headers: ACTION, body: "[]" })]);
  check(
    "R3 a POST to a page address carrying a form-action header is refused with 405, wherever it is aimed",
    withHeader.every(([, r]) => r.status === 405 && r.body === ""),
    saw(withHeader)
  );

  const asForm = [];
  for (const path of pages) {
    asForm.push([`multipart ${path}`, await send(path, { method: "POST", body: form() })]);
    asForm.push([`url-encoded ${path}`, await send(path, { method: "POST", ...urlEncoded })]);
  }
  check(
    "R4 …and so is one sent the way a browser posts a form",
    asForm.every(([, r]) => r.status === 405 && r.body === ""),
    saw(asForm)
  );

  const otherVerbs = [];
  for (const method of ["PUT", "PATCH", "DELETE"]) otherVerbs.push([method, await send("/", { method, body: form() })]);
  check("R5 PUT, PATCH and DELETE to a page are refused the same way", otherVerbs.every(([, r]) => r.status === 405), saw(otherVerbs));

  // ---- /api addresses that do not exist ---------------------------------------
  const missing = [
    ["GET", await send("/api/no-such-thing")],
    ["form", await send("/api/no-such-thing", { method: "POST", body: form() })],
    ["action", await send("/api/no-such/thing/at-all", { method: "POST", headers: ACTION, body: "[]" })],
  ];
  check(
    "R6 a mistyped /api address answers 404 as JSON whatever is sent — it never falls through to a page",
    missing.every(([, r]) => r.status === 404 && r.type.includes("json")),
    saw(missing)
  );

  // ---- did any of it get through? ----------------------------------------------
  // When a form action does reach Next and names nothing it knows, Next logs
  // "Failed to find Server Action". So does every other suite's traffic, had it
  // strayed there — this reads the whole run's log, not only the lines above.
  const logged = serverLog().split("\n").filter((line) => /server action/i.test(line));
  check("R7 nothing in the whole run reached Next's form-action reader (the server log says so)", logged.length === 0, logged.slice(0, 2).join(" | "));

  // ---- and what the app really sends is untouched ------------------------------
  const signIn = await send("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "nobody-at-all", password: "not-a-real-password" }),
  });
  check("R8 signing in still gets an answer from the app: a wrong password is told so, in JSON", signIn.status === 401 && signIn.type.includes("json"), `${signIn.status} ${signIn.body.slice(0, 80)}`);

  const signOut = await send("/api/auth/logout", { method: "POST", ...urlEncoded, body: "" });
  check("R9 the sign-out button — a real form, posted to /api — still redirects", signOut.status === 303, String(signOut.status));

  const ordinary = [
    ["the first page", await send("/")],
    ["the first page, from a client that sends a Content-Type on a GET", await send("/", { headers: { "Content-Type": "application/json" } })],
    ["the privacy page", await send("/privacy")],
    ["an icon", await send("/icons/icon-192.png")],
    ["the service worker", await send("/sw.js")],
  ];
  check("R10 pages and files load as before", ordinary.every(([, r]) => r.status === 200), saw(ordinary));

  const health = await send("/api/health");
  check(
    "R11 the address to open after a deploy says the app can reach its database, and nothing else",
    health.status === 200 && health.body === '{"ok":true,"storage":"database"}',
    `${health.status} ${health.body.slice(0, 80)}`
  );
}
