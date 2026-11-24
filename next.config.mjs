/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Without this, `next dev` writes an AGENTS.md of Next's own into the
  // repository whenever it sees a coding agent running it — which is how most
  // of the work here is done. What an agent working here should know is in
  // CLAUDE.md, including where Next 16's own docs are.
  agentRules: false,

  // No screen here uses next/image, but Next serves its image-resizing address
  // (/_next/image) wherever the app runs under `next start`, used or not —
  // and it has been behind eight advisories against Next 16 alone, two of
  // them remote code execution. So it is switched off, three times over:
  //
  //  - `unoptimized` is the documented switch. With it Next's own resizer
  //    resizes nothing — but Next still answers the address, by drawing the
  //    app's "page not found" screen.
  //  - the rewrite below therefore hands the address to /api instead, where
  //    app/api/[...missing] answers a plain 404 and no page is drawn at all.
  //  - neither of those stops Vercel, which has a resizer of its own at the
  //    same address and answers ahead of the rewrite. proxy.ts runs before
  //    it, and is what actually answers 404 there.
  //
  // See "The Next.js version" in docs/DEPLOYMENT.md before changing any of
  // them — and after a deploy, open /_next/image?url=%2Ficons%2Ficon-192.png&w=64&q=75
  // on the live address. It must answer 404, not a picture.
  images: { unoptimized: true },
  async rewrites() {
    return {
      beforeFiles: [{ source: "/_next/image:rest(.*)", destination: "/api/image-resizing-is-off" }],
    };
  },
};
export default nextConfig;
