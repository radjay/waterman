/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        newsprint: '#f4f1ea',
        ink: '#1a1a1a',
        'faded-ink': '#4a4a4a',
        'red-accent': '#8b0000',
        'muted-yellow': '#fef3c7',
      },
      fontFamily: {
        headline: ['Playfair Display', 'serif'],
        body: ['Courier Prime', 'monospace'],
      },
    },
  },
  plugins: [],
}

