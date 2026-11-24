/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // No screen here uses next/image, but Next serves its image-resizing address
  // (/_next/image) wherever the app runs under `next start`, used or not —
  // and several of the security advisories still open against Next 14 are in
  // it. So it is switched off, twice over, and both halves are needed:
  //
  //  - `unoptimized` is the documented switch. With it the address resizes
  //    nothing — but Next answers by drawing the app's "page not found"
  //    screen, and it does that before middleware.ts gets a look.
  //  - the rewrite below therefore hands the address to /api instead, where
  //    app/api/[...missing] answers a plain 404 and no page is drawn at all.
  //
  // See "The Next.js version" in docs/DEPLOYMENT.md before changing either.
  images: { unoptimized: true },
  async rewrites() {
    return {
      beforeFiles: [{ source: "/_next/image:rest(.*)", destination: "/api/image-resizing-is-off" }],
    };
  },
};
export default nextConfig;
