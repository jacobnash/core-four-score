/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'brand-orange': '#FF6700',
        'forest-green': '#013220',
        'cream': '#F5F5DC',
      },
    },
  },
  plugins: [],
}

