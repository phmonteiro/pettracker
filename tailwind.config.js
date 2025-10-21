/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#EE2429', // Fidelidade Red - Pantone 185 C (R238 G36 B41)
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        fidelidade: {
          red: '#EE2429',      // Vermelho Fidelidade - Pantone 185 C (Primary)
          crimson: '#C71013',  // ORACAL 016 Crimson (Darker variant)
          lightRed: '#F56565', // Lighter tint for hover states
          darkRed: '#C10A0F',  // Darker shade for active states
        },
      },
    },
  },
  plugins: [],
}
