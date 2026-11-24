/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Without this, `next dev` writes an AGENTS.md of Next's own into the
  // repository. What an agent working here should know is in CLAUDE.md,
  // including where Next 16's own docs are.
  agentRules: false,

  // No screen here uses next/image, but Next serves its image-resizing address
  // (/_next/image) wherever the app runs under `next start`, used or not —
  // and it has been behind eight advisories against Next 16 alone, two of
  // them remote code execution. So it is switched off, twice over, and both
  // halves are needed:
  //
  //  - `unoptimized` is the documented switch. With it the address resizes
  //    nothing — but Next still answers it, by drawing the app's "page not
  //    found" screen.
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
