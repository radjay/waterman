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
        newsprint: "#F5F2ED", // Updated to match design spec
        ink: "#1a1a1a",
        "faded-ink": "#4a4a4a",
        "red-accent": "#8b0000",
        "muted-yellow": "#fef3c7",
        "racing-green": "#004225", // Deep green for top conditions
        "safety-yellow": "#FFD700", // Alert/warning color
        "international-orange": "#FF6600", // Alert color
      },
      fontFamily: {
        headline: ["Playfair Display", "serif"],
        body: ["Courier Prime", "monospace"],
        mono: ["JetBrains Mono", "monospace"], // For data display
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
