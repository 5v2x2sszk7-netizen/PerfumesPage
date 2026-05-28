import type { Config } from "tailwindcss"

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a"
        },
        antiqueGold: "#b89b5e",
        antiqueGoldDark: "#a88952",
        antiqueGoldMuted: "#e6dcc6",
        goldSoft: "#bfa37a",
        paperBorder: "#d7d2c9",
        paper: {
          50: "#fdfbf7",
          100: "#f7f5f1"
        },
        sage: {
          50: "#eef7f1"
        },
        inkModal: "#0a0d12",
        whiteA: {
          4: "rgba(255,255,255,0.04)"
        }
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"]
      },
      letterSpacing: {
        luxe: "0.12em"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(184, 155, 94, 0.18), 0 12px 40px rgba(0,0,0,0.35)",
        card: "0 12px 50px rgba(0,0,0,0.03)",
        "card-lg": "0 18px 70px rgba(0,0,0,0.03)",
        sheet: "0 26px 70px rgba(0,0,0,0.08)"
      },
      borderRadius: {
        luxe: "2.25rem",
        "luxe-lg": "2.5rem",
        "luxe-xl": "2.75rem",
        "luxe-md": "2rem",
        "luxe-dialog": "2.125rem"
      },
      backgroundImage: {
        "zoom-overlay":
          "radial-gradient(340%_260%_at_50%_42%,rgba(14,22,46,0.58),rgba(10,13,18,0.20)_58%,rgba(6,7,9,0.94)_100%),radial-gradient(250%_185%_at_50%_62%,rgba(28,44,86,0.12),transparent_80%),linear-gradient(180deg,transparent_48%,rgba(0,0,0,0.48)_100%)",
        "zoom-glow-1": "radial-gradient(circle,rgba(55,105,220,0.10),transparent_72%)",
        "zoom-glow-2": "radial-gradient(circle,rgba(16,28,64,0.22),transparent_70%)",
        "zoom-vignette-1": "radial-gradient(125%_92%_at_50%_44%,transparent_58%,rgba(0,0,0,0.55)_100%)",
        "zoom-vignette-2": "radial-gradient(88%_70%_at_50%_44%,transparent_62%,rgba(0,0,0,0.22)_100%)",
        "zoom-nav-left": "linear-gradient(90deg,rgba(255,255,255,0.06),transparent_80%)",
        "zoom-nav-right": "linear-gradient(270deg,rgba(255,255,255,0.06),transparent_80%)",
        "zoom-meta-fade": "linear-gradient(180deg,transparent,rgba(0,0,0,0.72))"
      },
      transitionProperty: {
        luxe: "transform, box-shadow, background-color",
        "luxe-wide": "transform, box-shadow, background-color, color",
        "luxe-media": "transform, opacity",
        "luxe-header": "background-color, box-shadow, border-color, backdrop-filter"
      },
      transitionDuration: {
        luxe: "900ms",
        "luxe-fast": "650ms",
        "luxe-slow": "1200ms"
      },
      transitionTimingFunction: {
        luxe: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    }
  },
  plugins: []
} satisfies Config
