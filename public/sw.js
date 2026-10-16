/*
 * Service worker.
 *
 * Deliberately cautious about what it caches, because this app is auth-gated
 * and personal. Three rules, and the reasoning matters more than the code:
 *
 *   1. API requests are never cached, ever. A stale /api/state would show one
 *      member data that is no longer hers, or hand back a response recorded
 *      while a different account was signed in.
 *   2. Page navigations go to the network first. Serving a cached HTML page
 *      would let someone who has signed out still see the shell of the app,
 *      and would let a signed-in member see a page rendered for whoever used
 *      the phone before her. The cache is only a fallback for being offline,
 *      and what it falls back to says "you are offline" rather than pretending
 *      to be the app.
 *   3. Only fingerprinted build assets and icons are cached aggressively.
 *      Those filenames change whenever their contents change, so a cached copy
 *      is either current or unreachable — it can never be stale.
 *
 * The net effect: the app opens instantly on a bad connection because the
 * JavaScript and CSS are local, but nothing personal is ever read from disk.
 */

const VERSION = "v2";
const ASSETS = `assets-${VERSION}`;
const SHELL = `shell-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== ASSETS && k !== SHELL)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

const isBuildAsset = (url) =>
  url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Rule 1 — anything that carries someone's data goes straight to the network
  // and is never written to a cache.
  if (url.pathname.startsWith("/api/")) return;

  // Rule 3 — immutable, fingerprinted files.
  if (isBuildAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(ASSETS).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Rule 2 — pages. Network first; the offline page only when the network is
  // genuinely unreachable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (hit) =>
            hit ||
            new Response("You are offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
        )
      )
    );
  }
});

/*
 * Check-in reminders (lib/reminders.ts). The server sends only a title, a
 * line of text and where to open — never anything about her health — and
 * that is all that is shown. Opening one brings the app forward if it is
 * already open, rather than stacking a second copy.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" ? data.title : "Check-in";
  const body = typeof data.body === "string" ? data.body : "";
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/member";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      tag: "check-in",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/member";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          return w.navigate(url).then((nav) => (nav || w).focus()).catch(() => w.focus());
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
