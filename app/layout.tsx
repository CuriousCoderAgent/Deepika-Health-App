import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "Deepika Wellness — V0 Vision Prototype",
  description:
    "Coaching software for women in midlife. The coach provides the intelligence and the relationship; the product provides memory, structure and continuity.",
};

export const viewport: Viewport = {
  themeColor: "#F7F6F3",
  width: "device-width",
  initialScale: 1,
};

/**
 * Fonts load at runtime rather than through next/font.
 * next/font fetches from Google at build time, which turns a transient network
 * blip on the build server into a failed deploy. For a prototype that will be
 * redeployed often, a <link> is the more forgiving choice.
 */
const FONT_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Fraunces:opsz,wght,SOFT,WONK@9..144,300..700,0..100,0..1" +
  "&family=Inter:wght@400;500;600" +
  "&family=IBM+Plex+Mono:wght@400;500" +
  "&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
