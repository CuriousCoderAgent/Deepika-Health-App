import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

/**
 * These two strings are the only copy that leaves the app.
 *
 * The title is what a saved home-screen shortcut is called, and the
 * description is what renders in the link preview when Deepika pastes the URL
 * into WhatsApp — so they are read by people who have not opened the app yet,
 * and they should say the same thing the landing page says. "V0 Vision
 * Prototype" was a note to ourselves, and "for women in midlife" is the framing
 * the visible copy deliberately moved away from.
 */
export const metadata: Metadata = {
  title: "Deepika Wellness",
  description:
    "Strength, energy and steadiness — built around your actual life, with someone who actually knows you.",
};

/**
 * Viewport behaviour is locked; physical size is not.
 *
 * `viewportFit: "cover"` lets the layout paint into the notch/home-indicator
 * area and then reclaim it deliberately via env(safe-area-inset-*), which is
 * what keeps the bottom navigation anchored correctly on a modern iPhone.
 *
 * Deliberately absent: `maximumScale: 1` / `userScalable: false`. The zoom
 * this prototype actually suffers from is iOS auto-zooming on focus of a
 * sub-16px input, which is fixed properly in globals.css. Locking scale would
 * not have fixed it — iOS Safari has ignored those two directives since iOS
 * 10, precisely so that people who need to magnify text still can. Doing it
 * anyway would only take pinch-zoom away from Android users, in a product
 * built for 38–50 year olds. One line here if that trade is ever wanted.
 */
export const viewport: Viewport = {
  themeColor: "#F7F6F3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
