/** @type {import('tailwindcss').Config} */

/**
 * Colours are driven by CSS custom properties defined in app/theme.css so the
 * Nightglass/Dayglass switch can happen at runtime (sunrise/sunset).
 *
 * Tokens come in two shapes:
 *   - channel triples, wrapped here in rgb(... / <alpha-value>) so Tailwind
 *     opacity modifiers keep working (`border-ink/10`, `bg-ink/[0.04]`);
 *   - composite values with baked-in alpha, which cannot take a modifier.
 *
 * Legacy class names (newsprint, ink, faded-ink, ...) are deliberately retained
 * and repointed rather than renamed — 57 files reference them, and pairs like
 * `bg-ink text-newsprint` stay correct in both themes because both flip.
 */
const channel = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // -- Legacy names, repointed. Opacity-modifier capable. --
        newsprint: channel("--wm-page"),
        ink: channel("--wm-ink"),

        // -- Legacy names, repointed. Composite (no opacity modifier). --
        "faded-ink": "var(--wm-muted)",
        "warm-highlight": "var(--wm-surface)",
        "ink-hover": "var(--wm-hover)",
        // `red-accent` was the danger/destructive colour (Button danger variant).
        // In both new themes that role is the accent-2 hue.
        "red-accent": channel("--wm-marginal"),
        // `muted-yellow` tinted 60-74 scores as a warning. That role is now the
        // accent-2 hue, reading as "marginal, look closer" rather than "warning".
        "muted-yellow": channel("--wm-marginal"),

        // -- New semantic names --
        page: channel("--wm-page"),
        accent: channel("--wm-accent"),
        marginal: channel("--wm-marginal"),

        surface: "var(--wm-surface)",
        dim: "var(--wm-dim)",
        muted: "var(--wm-muted)",

        "accent-tint": "var(--wm-accent-tint-nav)",
        "accent-tint-card": "var(--wm-accent-tint-card)",
        "accent-border": "var(--wm-accent-border)",
        "accent-mid": "var(--wm-accent-mid)",
        "accent-low": "var(--wm-accent-low)",
        "accent-faint": "var(--wm-accent-faint)",
        "marginal-low": "var(--wm-marginal-low)",

        track: "var(--wm-track)",
        "nav-bg": "var(--wm-nav-bg)",
        "nav-border": "var(--wm-nav-border)",
        "offline-bg": "var(--wm-offline-bg)",
        knob: "var(--wm-knob)",
        now: "var(--wm-now)",
        "sport-pill": "var(--wm-sport-pill-bg)",
        "sport-pill-text": "var(--wm-sport-pill-text)",
      },
      borderColor: {
        card: "var(--wm-border)",
        rule: "var(--wm-rule)",
        btn: "var(--wm-btn-border)",
      },
      fontFamily: {
        // Families are injected by next/font in app/layout.js.
        headline: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        data: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        ui: "8px", // small icon buttons: 7-8px
        card: "16px", // cards: 14-18px (was 10px)
        "card-sm": "14px",
        "card-lg": "18px",
        "card-xl": "20px", // verdict card
        pill: "999px",
      },
      boxShadow: {
        // Cards carry no shadow in either theme — separation is by border and fill.
        card: "none",
        "card-hover": "none",
        elevated: "none",
        nav: "var(--wm-shadow-nav)",
        focus: "0 0 0 2px rgb(var(--wm-page)), 0 0 0 4px rgb(var(--wm-accent) / 0.6)",
      },
      letterSpacing: {
        // Mono label treatment: 9-11px uppercase at .16em-.22em.
        label: "0.16em",
        "label-wide": "0.22em",
        // Display type tightens as it grows.
        display: "-0.025em",
        "display-tight": "-0.035em",
        "display-tighter": "-0.045em",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "300ms",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
    },
  },
  plugins: [
    function ({ addVariant, addUtilities }) {
      addVariant("portrait", "@media (orientation: portrait)");
      addVariant("landscape", "@media (orientation: landscape)");

      // Hide scrollbars while keeping scroll functionality
      addUtilities({
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      });
    },
  ],
};
