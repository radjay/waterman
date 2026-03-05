/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        newsprint: "#f4f1ea",
        ink: "#1a1a1a",
        "faded-ink": "#4a4a4a",
        "red-accent": "#8b0000",
        "muted-yellow": "#fef3c7",
        "ink-hover": "#2a2a2a",
        "warm-highlight": "#f0ece3",
      },
      fontFamily: {
        headline: ["Playfair Display", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        data: ["Courier Prime", "monospace"],
      },
      borderRadius: {
        ui: "6px",
        card: "10px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        "card-hover":
          "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        elevated:
          "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
        focus: "0 0 0 2px #f4f1ea, 0 0 0 4px rgba(26,26,26,0.3)",
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
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      });
    },
  ],
};
