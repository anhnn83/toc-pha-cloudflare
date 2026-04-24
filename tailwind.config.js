/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sepia': '#704214', // Màu nâu cổ điển cho gia phả
      }
    },
  },
  plugins: [],
}