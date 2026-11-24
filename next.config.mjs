/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Without this, `next dev` writes an AGENTS.md of Next's own into the
  // repository whenever it sees a coding agent running it — which is how most
  // of the work here is done. What an agent working here should know is in
  // CLAUDE.md, including where Next 16's own docs are.
  agentRules: false,

  // No screen here uses next/image, but the image-resizing address
  // (/_next/image) is answered wherever the app runs, used or not. Who
  // answers it depends on where that is, so it is switched off twice.
  //
  // Under `next start` — Railway, a laptop — Next answers it, with the
  // resizer that has been behind eight advisories against Next 16 alone, two
  // of them remote code execution:
  //
  //  - `unoptimized` is the documented switch. With it Next resizes nothing,
  //    but still answers the address, by drawing the app's "page not found".
  //  - so the rewrite below hands the address to /api instead, where
  //    app/api/[...missing] answers a plain 404 and no page is drawn at all.
  //
  // On Vercel, Next never sees the address. Vercel answers it with an image
  // service of its own, ahead of the app, so no rewrite or proxy here can get
  // in first. What that service will resize is the allow-list in this file.
  // Vercel's older builder left the service out when `unoptimized` was set,
  // which is why the address answered 404 while the app was on Next 14. From
  // Next 16.2 it builds through an adapter that does not read `unoptimized`,
  // and the first Next 16 build there resized an icon for anyone who asked.
  // Hence:
  //
  //  - `localPatterns: []` — no file of this app's may be resized. (Next adds
  //    the folders for pictures imported into code; there are none.) No
  //    remote patterns or domains are set, so nothing from elsewhere may be
  //    either. Vercel's service then refuses every request with 400.
  //
  // See "The Next.js version" in docs/DEPLOYMENT.md before changing any of
  // this — and after a deploy, open
  // /_next/image?url=%2Ficons%2Ficon-192.png&w=64&q=75 on the live address.
  // It must answer an error (400 on Vercel, 404 anywhere else), not a picture.
  images: { unoptimized: true, localPatterns: [] },
  async rewrites() {
    return {
      beforeFiles: [{ source: "/_next/image:rest(.*)", destination: "/api/image-resizing-is-off" }],
    };
  },
};
export default nextConfig;
