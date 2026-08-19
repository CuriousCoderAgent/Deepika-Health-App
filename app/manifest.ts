import type { MetadataRoute } from "next";

/**
 * The web app manifest, which is what makes this installable — and what the
 * Play Store wrapper reads to decide the app's name, colours and launch
 * behaviour.
 *
 * `display: "standalone"` is the one that matters for the Android build: it
 * drops the browser chrome so the Trusted Web Activity opens looking like an
 * app rather than a tab. `id` is fixed and must never change, or Chrome treats
 * a later deploy as a different app and people end up with two icons.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Deepika Wellness",
    // What sits under the launcher icon. Anything longer than about 12
    // characters gets truncated on an Android home screen.
    short_name: "Deepika",
    description:
      "Strength, energy and steadiness — built around your actual life, with someone who actually knows you.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F4EE",
    theme_color: "#F7F6F3",
    categories: ["health", "fitness", "lifestyle"],
    lang: "en-IN",
    dir: "ltr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Maskable icons keep their content inside the safe circle, so a launcher
      // that crops to a circle, squircle or rounded square never clips the mark.
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
