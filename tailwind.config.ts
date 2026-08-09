import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Structure — deep indigo-slate. Reads as evening, not corporate black.
        ink: {
          DEFAULT: "#1C2B3A",
          soft: "#4A5D70",
          faint: "#8595A5",
          line: "#E2E0DA",
        },
        paper: {
          DEFAULT: "#F7F6F3",
          card: "#FFFFFF",
          sunk: "#EFEDE8",
        },
        // The effort ramp. Minimum is a real, filled, valid colour — never grey.
        effort: {
          min: "#A8C2B4",
          minInk: "#4F7060",
          target: "#6E8F73",
          stretch: "#3F6B57",
          tint: "#E9F0EA",
        },
        // Reserved exclusively for Deepika's human voice.
        marigold: {
          DEFAULT: "#D99A2B",
          deep: "#A9741A",
          tint: "#FBF1DC",
        },
        // Rest / not-today. Deliberately neutral. Never red.
        rest: {
          DEFAULT: "#B9B6AE",
          tint: "#F0EEE9",
        },
        attention: {
          DEFAULT: "#B4674A",
          tint: "#F8EDE8",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Base bumped for the 40+ audience.
        base: ["1.0625rem", { lineHeight: "1.6" }],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,43,58,0.04), 0 8px 24px -12px rgba(28,43,58,0.12)",
        lift: "0 2px 4px rgba(28,43,58,0.06), 0 20px 40px -20px rgba(28,43,58,0.22)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fill: {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        rise: "rise .5s cubic-bezier(.16,.84,.44,1) both",
        fill: "fill .6s cubic-bezier(.16,.84,.44,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
