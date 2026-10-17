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
          orange: '#EA580C',
          hover: '#C2410C',
          highlight: '#F97316',
          tint: '#FFEDD5',
          cream: '#F8F3F0',
          dark: '#101318',
        },
        primary: {
          DEFAULT: '#EA580C',
          hover: '#C2410C',
          light: '#FFEDD5',
        },
        surface: '#F8F3F0',
        card: '#FFFFFF',
        divider: 'rgba(234, 88, 12, 0.2)',
      },
      fontFamily: {
        sans: ['"Forum"', 'serif'],
        heading: ['"Forum"', 'serif'],
      },
    },
  },
  plugins: [],
};
