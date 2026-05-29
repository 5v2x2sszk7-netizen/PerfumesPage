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
        inkWarm: "#60523e",
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
      opacity: {
        "ink-8": "0.08",
        "ink-14": "0.14"
      },
      lineHeight: {
        display: "0.95",
        body: "1.85"
      },
      height: {
        "home-hero": "420px",
        "home-hero-sm": "520px",
        "home-hero-lg": "680px",
        "review-carousel": "340px",
        "zoom-dialog": "86vh",
        "zoom-dialog-sm": "88vh",
        "zoom-glow-1": "640px",
        "zoom-glow-1-sm": "820px",
        "zoom-glow-2": "760px",
        "zoom-glow-2-sm": "960px"
      },
      width: {
        thumb: "160px",
        "thumb-sm": "172px",
        "qty-input": "120px",
        "perfume-shadow": "72%",
        "zoom-glow-1": "640px",
        "zoom-glow-1-sm": "820px",
        "zoom-glow-2": "760px",
        "zoom-glow-2-sm": "960px"
      },
      inset: {
        "zoom-glow-1": "60%",
        "zoom-glow-2": "68%"
      },
      minWidth: {
        thumb: "160px"
      },
      maxHeight: {
        "review-media": "260px",
        "review-media-sm": "300px",
        "modal-sheet": "90vh"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"]
      },
      letterSpacing: {
        luxe: "0.12em",
        ui: "0.18em",
        kicker: "0.22em",
        section: "0.25em",
        brand: "0.32em",
        brandSm: "0.30em",
        descriptor: "0.52em",
        descriptorFooter: "0.45em",
        counter: "0.16em",
        meta: "0.21em",
        product: "0.06em"
      },
      zIndex: {
        sticky: "30",
        header: "50",
        modal: "100",
        zoom: "500"
      },
      fontSize: {
        "ui-2xs": ["10px", { lineHeight: "1rem" }],
        "ui-xs": ["11px", { lineHeight: "1rem" }],
        "ui-sm": ["12.5px", { lineHeight: "1.15rem" }],
        "ui-md": ["13px", { lineHeight: "1.2rem" }],
        "ui-lg": ["13.5px", { lineHeight: "1.25rem" }],
        "ui-body": ["15px", { lineHeight: "1.85" }],
        "ui-rating": ["17px", { lineHeight: "1" }],
        logo: ["1.14rem", { lineHeight: "1" }],
        "logo-sm": ["1.34rem", { lineHeight: "1" }]
      },
      maxWidth: {
        "footer-copy": "320px",
        "featured-card": "360px",
        "delivery-single": "400px",
        "catalog-filters": "420px",
        "catalog-filters-sm": "460px",
        "home-intro": "480px",
        "home-hero": "560px",
        "catalog-grid": "940px",
        prose: "72ch",
        "review-copy": "44ch",
        "review-media": "300px",
        skeleton: "220px",
        page: "1120px"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(184, 155, 94, 0.18), 0 12px 40px rgba(0,0,0,0.35)",
        card: "0 12px 50px rgba(0,0,0,0.03)",
        "card-lg": "0 18px 70px rgba(0,0,0,0.03)",
        sheet: "0 26px 70px rgba(0,0,0,0.08)",
        modal: "0 30px 90px rgba(0,0,0,0.30)",
        "modal-soft": "0 30px 90px rgba(0,0,0,0.25)",
        "soft-hover": "0 10px 30px rgba(0,0,0,0.08)",
        "cta-hover": "0 14px 34px rgba(0,0,0,0.18)",
        "sticky-soft": "0 10px 30px rgba(0,0,0,0.06)",
        "sticky-soft-up": "0 -10px 30px rgba(0,0,0,0.06)",
        panel: "0 26px 80px rgba(0,0,0,0.05)",
        "panel-lg": "0 34px 110px rgba(0,0,0,0.06)",
        "media-xl": "0 34px 120px rgba(0,0,0,0.08)",
        "cta-soft": "0 18px 55px rgba(0,0,0,0.16)",
        "pill-active": "0 18px 55px rgba(0,0,0,0.06)",
        header: "0 12px 46px rgba(0,0,0,0.032)",
        "header-cta": "0 10px 26px rgba(0,0,0,0.10)",
        "header-cta-hover": "0 16px 44px rgba(0,0,0,0.12)",
        "zoom-modal": "0 70px 240px rgba(0,0,0,0.42)",
        "zoom-nav-hover": "0 0 0 1px rgba(255,255,255,0.16),0 0 28px rgba(255,255,255,0.06),0 18px 55px rgba(0,0,0,0.40)",
        "home-featured-hover": "0 0 0 1px rgba(184,155,94,0.12),0 34px 120px rgba(0,0,0,0.10)",
        "home-soft-hover": "0 16px 44px rgba(0,0,0,0.06)",
        "review-hover": "0 22px 55px rgba(0,0,0,0.08)",
        "thumb-hover": "0 18px 55px rgba(0,0,0,0.14)",
        "review-media": "0 18px 50px rgba(0,0,0,0.10)",
        "review-media-hover": "0 28px 75px rgba(0,0,0,0.14)",
        "perfume-hover": "0 0 0 1px rgba(191,163,122,0.10),0 44px 170px rgba(0,0,0,0.085)",
        "inset-soft": "inset 0 0 70px rgba(0,0,0,0.06)",
        "inset-xl": "inset 0 0 140px rgba(0,0,0,0.08)",
        "zoom-inset": "inset 0 0 84px rgba(0,0,0,0.18)"
      },
      borderRadius: {
        ui: "1rem",
        control: "0.75rem",
        luxe: "2.25rem",
        "luxe-lg": "2.5rem",
        "luxe-xl": "2.75rem",
        "luxe-md": "2rem",
        "luxe-dialog": "2.125rem"
      },
      blur: {
        "zoom-1": "140px",
        "zoom-2": "160px"
      },
      backgroundImage: {
        "home-hero-overlay-1":
          "radial-gradient(140%_110%_at_50%_38%,rgba(16,24,52,0.14),rgba(0,0,0,0.40)_62%,rgba(0,0,0,0.66)_100%)",
        "home-hero-overlay-2": "radial-gradient(88%_70%_at_50%_46%,rgba(255,255,255,0.06),transparent_62%)",
        "home-hero-overlay-3": "radial-gradient(70%_55%_at_58%_56%,rgba(184,155,94,0.10),transparent_62%)",
        "home-hero-overlay-4": "linear-gradient(180deg,rgba(255,255,255,0.00)_54%,rgba(255,255,255,0.06)_100%)",
        "home-hero-overlay-5": "radial-gradient(92%_72%_at_50%_44%,transparent_64%,rgba(0,0,0,0.26)_100%)",
        "home-featured-hover-glow": "radial-gradient(70%_60%_at_50%_0%,rgba(184,155,94,0.10),transparent_60%)",
        "home-featured-media-glow": "radial-gradient(65%_55%_at_50%_30%,rgba(184,155,94,0.16),transparent_70%)",
        "home-section-bottom-fade": "linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(247,245,241,1)_100%)",
        "home-reviews-surface":
          "radial-gradient(70%_70%_at_50%_18%,rgba(184,155,94,0.10),transparent_62%),linear-gradient(180deg,rgba(10,10,10,0.02),transparent_40%)",
        "review-media-shine": "linear-gradient(135deg,rgba(255,255,255,0.55),transparent_42%)",
        "perfume-hover-gold": "radial-gradient(90%_70%_at_50%_6%,rgba(191,163,122,0.10),transparent_60%)",
        "perfume-hover-white": "radial-gradient(70%_60%_at_50%_0%,rgba(255,255,255,0.16),transparent_62%)",
        "perfume-media-glow": "radial-gradient(65%_55%_at_50%_20%,rgba(191,163,122,0.18),transparent_72%)",
        "perfume-media-highlight": "linear-gradient(180deg,rgba(255,255,255,0.10),transparent_55%)",
        "perfume-detail-card-glow":
          "radial-gradient(70%_70%_at_50%_18%,rgba(184,155,94,0.14),transparent_62%),radial-gradient(110%_90%_at_50%_52%,rgba(16,24,52,0.06),transparent_64%)",
        "perfume-detail-card-shine": "radial-gradient(65%_55%_at_50%_18%,rgba(255,255,255,0.18),transparent_65%)",
        "perfume-consult-underline":
          "linear-gradient(90deg,rgba(191,163,122,0.0),rgba(191,163,122,0.28),rgba(191,163,122,0.0))",
        "glass-header-scrolled": "linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.72))",
        "glass-header-top": "linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.78))",
        "catalog-empty-overlay-1":
          "radial-gradient(120%_90%_at_50%_30%,rgba(18,28,58,0.10),rgba(255,255,255,0.92)_60%,rgba(255,255,255,0.98)_100%)",
        "catalog-empty-overlay-2": "radial-gradient(88%_70%_at_50%_44%,transparent_62%,rgba(0,0,0,0.06)_100%)",
        "zoom-overlay":
          "radial-gradient(340%_260%_at_50%_42%,rgba(14,22,46,0.58),rgba(10,13,18,0.20)_58%,rgba(6,7,9,0.94)_100%),radial-gradient(250%_185%_at_50%_62%,rgba(28,44,86,0.12),transparent_80%),linear-gradient(180deg,transparent_48%,rgba(0,0,0,0.48)_100%)",
        "zoom-glow-1": "radial-gradient(circle,rgba(55,105,220,0.10),transparent_72%)",
        "zoom-glow-2": "radial-gradient(circle,rgba(16,28,64,0.22),transparent_70%)",
        "zoom-dynamic-glow": "radial-gradient(240%_170%_at_50%_46%,rgb(var(--glow-rgb)/0.12),transparent_74%)",
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
