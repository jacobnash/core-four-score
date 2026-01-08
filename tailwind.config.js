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
        'pine': '#0B3B2E',
        'moss': '#1F5D44',
        'gold': '#F4C95D',
        'rust': '#C04A0C',
        'charcoal': '#0D0F0E',
      },
      fontFamily: {
        display: ['SpaceMono', 'System'],
        sans: ['System'],
        mono: ['SpaceMono', 'System'],
      },
      borderRadius: {
        card: '20px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 10px 30px rgba(0, 0, 0, 0.25)',
        'card-strong': '0 15px 40px rgba(0, 0, 0, 0.35)',
        button: '0 6px 18px rgba(0, 0, 0, 0.28)',
      },
      backgroundImage: {
        'lodge-gradient': 'linear-gradient(180deg, #0D0F0E 0%, #013220 40%, #0B3B2E 100%)',
      },
      opacity: {
        6: '0.06',
        8: '0.08',
        12: '0.12',
        15: '0.15',
      },
    },
  },
  plugins: [],
}

