/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#D4621A',
          cream: '#F8F3F0',
          dark: '#101318',
        },
        primary: {
          DEFAULT: '#D4621A',
          hover: '#bf5312',
          light: '#F8F3F0',
        },
        surface: '#F8F3F0',
        card: '#FFFFFF',
        divider: 'rgba(212, 98, 26, 0.15)',
      },
      fontFamily: {
        sans: ['"Forum"', 'serif'],
        heading: ['"Forum"', 'serif'],
      },
    },
  },
  plugins: [],
};
