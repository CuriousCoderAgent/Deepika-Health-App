/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Nothing here uses next/image, so the image optimizer behind /_next/image
  // has no work to do — but it answers requests anyway unless told not to.
  // It was behind seven Next.js advisories up to October 2026, two of them
  // remote code execution, so it stays off: Vercel then sets up no image
  // optimization for the deployment, and under `next start` the route returns
  // 404. Switch it back on only together with a real use of next/image.
  images: { unoptimized: true },
};
export default nextConfig;
